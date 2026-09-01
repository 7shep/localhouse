"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { mockHouseSnapshot, type HouseSnapshot, type MinecraftStatus } from "../lib/modules";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: "user",
    text: "how's everything doing?",
  },
  {
    role: "assistant",
    text: "Everything is nominal. Internet is online at 14 ms and the local services are reachable.",
  },
];

const suggestions = ["Who's online?", "What happened while I was gone?", "Is anything offline?"];

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMinecraftTime(ticks: number) {
  const totalMinutes = Math.floor((ticks / 1000) * 60) + 360;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function getAssistantResponse(input: string, snapshot: HouseSnapshot) {
  const normalized = input.toLowerCase();

  if (normalized.includes("who's online") || normalized.includes("who is online") || normalized.includes("who online") || normalized.includes("playing")) {
    const players = snapshot.minecraft.players.map((player) => player.name).join(", ");
    return snapshot.minecraft.online
      ? `${snapshot.minecraft.playerCount} players are online in ${snapshot.minecraft.world}: ${players}.`
      : "The Minecraft server is offline, so nobody is currently playing.";
  }

  if (normalized.includes("what happened") || normalized.includes("while i was gone") || normalized.includes("since i left")) {
    const events = snapshot.minecraft.recentEvents.length
      ? snapshot.minecraft.recentEvents.slice(0, 3).map((event) => event.text.toLowerCase()).join(", ")
      : "no recent Minecraft events were recorded";
    return `While you were gone: ${events}. The server has been up for ${formatDuration(snapshot.minecraft.uptimeSeconds)}.`;
  }

  if (normalized.includes("minecraft") || normalized.includes("world")) {
    return snapshot.minecraft.online
      ? `Minecraft is online with ${snapshot.minecraft.playerCount} players in ${snapshot.minecraft.world}. The world is on day ${snapshot.minecraft.day} with ${snapshot.minecraft.weather.toLowerCase()} weather.`
      : "The Minecraft server is offline right now.";
  }

  if (normalized.includes("weather") || normalized.includes("outside") || normalized.includes("temperature")) {
    return `It is ${snapshot.weather.temperatureC}°C outside with ${snapshot.weather.condition.toLowerCase()} skies. Today’s range is ${snapshot.weather.lowC}° to ${snapshot.weather.highC}°.`;
  }

  if (normalized.includes("server") || normalized.includes("cpu") || normalized.includes("memory") || normalized.includes("disk")) {
    return `The server looks healthy: CPU is at ${snapshot.system.cpuPercent}%, memory at ${snapshot.system.memoryPercent}%, disk at ${snapshot.system.diskPercent}%, with 7 hours 14 minutes of uptime.`;
  }

  if (normalized.includes("alex") || normalized.includes("home") || normalized.includes("presence")) {
    return `${snapshot.presence.name} is ${snapshot.presence.state}. The registered ${snapshot.presence.device.toLowerCase()} is visible on the local network.`;
  }

  if (normalized.includes("internet") || normalized.includes("offline") || normalized.includes("ping")) {
    return `Internet is ${snapshot.internet.online ? "online" : "offline"} with ${snapshot.internet.latencyMs} ms latency. The last outage was 3 days ago and lasted 2 minutes.`;
  }

    return `The house looks good. Internet is ${snapshot.internet.online ? "online" : "offline"}, the server is healthy, and the Minecraft server is ${snapshot.minecraft.online ? "online" : "offline"}.`;
}

function StatusLight({ tone = "good" }: { tone?: "good" | "muted" | "warn" }) {
  return <span className={`status-light status-light--${tone}`} aria-hidden="true" />;
}

function CardHeader({ index, label, meta }: { index: string; label: string; meta?: string }) {
  return (
    <div className="card-header">
      <div className="card-index">{index}</div>
      <h2>{label}</h2>
      {meta ? <div className="card-meta">{meta}</div> : null}
    </div>
  );
}

export default function Home() {
  const snapshot = mockHouseSnapshot;
  const [now, setNow] = useState(() => new Date());
  const [lastRefresh, setLastRefresh] = useState("09:42:18");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWifiOpen, setIsWifiOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [minecraft, setMinecraft] = useState<MinecraftStatus>(snapshot.minecraft);
  const [minecraftTelemetry, setMinecraftTelemetry] = useState<"checking" | "live" | "offline">("checking");
  const [minecraftTicks, setMinecraftTicks] = useState(snapshot.minecraft.timeOfDay);
  const [joinCopied, setJoinCopied] = useState(false);
  const [serverDraft, setServerDraft] = useState("");
  const [serverChatStatus, setServerChatStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (minecraft.online) {
        setMinecraftTicks((current) => (current + 20) % 24000);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [minecraft.online]);

  async function refreshMinecraft() {
    try {
      const response = await fetch("/api/minecraft", { cache: "no-store" });
      if (!response.ok) throw new Error("Minecraft telemetry unavailable");
      const nextMinecraft = await response.json() as MinecraftStatus;
      setMinecraft(nextMinecraft);
      setMinecraftTicks(nextMinecraft.timeOfDay);
      setMinecraftTelemetry("live");
    } catch {
      setMinecraftTelemetry("offline");
      setMinecraft((current) => ({
        ...current,
        online: false,
        playerCount: 0,
        players: [],
        recentEvents: [{ time: "--:--", text: "RCON telemetry unavailable", tone: "warn" }],
      }));
    }
  }

  useEffect(() => {
    void refreshMinecraft();
    const timer = window.setInterval(() => void refreshMinecraft(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const statusSummary = useMemo(() => {
    if (isRefreshing) return "checking systems";
    if (minecraftTelemetry === "checking") return "connecting to minecraft";
    if (minecraftTelemetry === "offline") return "minecraft telemetry offline";
    return "everything looks good";
  }, [isRefreshing, minecraftTelemetry]);

  function refreshTelemetry() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    void refreshMinecraft();
    window.setTimeout(() => {
      setLastRefresh(formatTime(new Date()));
      setIsRefreshing(false);
    }, 700);
  }

  function submitQuestion(question = draft) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: getAssistantResponse(trimmed, { ...snapshot, minecraft }) },
    ]);
    setDraft("");
  }

  async function sendMessageToServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = serverDraft.trim();
    if (!message || serverChatStatus === "sending") return;
    setServerChatStatus("sending");
    try {
      const response = await fetch("/api/minecraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error("Message was not delivered");
      setServerDraft("");
      setServerChatStatus("sent");
      void refreshMinecraft();
      window.setTimeout(() => setServerChatStatus("idle"), 2200);
    } catch {
      setServerChatStatus("error");
      window.setTimeout(() => setServerChatStatus("idle"), 2800);
    }
  }

  async function copyJoinAddress() {
    try {
      await navigator.clipboard.writeText(minecraft.joinAddress);
      setJoinCopied(true);
      window.setTimeout(() => setJoinCopied(false), 1800);
    } catch {
      setJoinCopied(false);
    }
  }

  const minecraftIsNight = minecraftTicks >= 13000 && minecraftTicks < 23000;
  const minecraftJoinUri = `minecraft://?addExternalServer=LocalHouse%20SMP|${minecraft.joinAddress}`;

  return (
    <main className="shell">
      <div className="scanlines" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">LH</div>
          <div>
            <div className="brand-name">localhouse<span>_</span></div>
            <div className="brand-subtitle">HOME OPERATIONS / UNIT 01</div>
          </div>
        </div>

        <div className="topbar-center" aria-live="polite">
          <StatusLight />
          <span>{statusSummary}</span>
        </div>

        <div className="topbar-actions">
          <div className="clock-block">
            <span className="label">LOCAL TIME</span>
            <time>{formatTime(now)}</time>
          </div>
          <button className="icon-button" onClick={refreshTelemetry} aria-label="Refresh telemetry" title="Refresh telemetry">
            <span className={isRefreshing ? "refresh-glyph is-spinning" : "refresh-glyph"}>↻</span>
          </button>
          <button className="wifi-button" onClick={() => setIsWifiOpen(true)}>
            <span className="wifi-glyph" aria-hidden="true">▦</span>
            <span>WIFI ACCESS</span>
          </button>
        </div>
      </header>

      <section className="intro-row">
        <div>
          <p className="eyebrow">[ LIVE HOUSE STATUS ]</p>
          <h1>Good morning,<br /><span>Alex.</span></h1>
        </div>
        <div className="intro-note">
          <span className="note-rule" />
          <p>One place to see what is running,<br />what is reachable, and who is home.</p>
          <span className="system-id">SYNC / {lastRefresh}</span>
        </div>
      </section>

      <section className={`telemetry-grid ${isRefreshing ? "is-refreshing" : ""}`} aria-label="House telemetry">
        <article className="telemetry-card internet-card">
          <CardHeader index="01" label="Internet" meta="WAN / MONITOR" />
          <div className="internet-status">
            <div className="status-word"><StatusLight tone={snapshot.internet.online ? "good" : "warn"} /> <strong>{snapshot.internet.online ? "ONLINE" : "OFFLINE"}</strong></div>
            <div className="latency"><data value={snapshot.internet.latencyMs}>{snapshot.internet.latencyMs}</data><span>ms</span></div>
          </div>
          <div className="card-footer-row">
            <span>LAST OUTAGE</span>
            <span>{snapshot.internet.lastOutage}</span>
          </div>
        </article>

        <article className="telemetry-card weather-card">
          <CardHeader index="02" label="Weather" meta={snapshot.weather.location} />
          <div className="weather-main">
            <div className="weather-temp"><data value={snapshot.weather.temperatureC}>{snapshot.weather.temperatureC}</data><span>°C</span></div>
            <div className="weather-condition"><span className="weather-glyph" aria-hidden="true">◒</span><span>PARTLY<br />CLOUDY</span></div>
          </div>
          <div className="high-low"><span><b>H</b> {snapshot.weather.highC}°</span><span><b>L</b> {snapshot.weather.lowC}°</span><span className="weather-updated">UPDATED {snapshot.weather.updatedAt}</span></div>
        </article>

        <article className="telemetry-card server-card">
          <CardHeader index="03" label="This PC / Server" meta="LOCAL NODE / ONLINE" />
          <dl className="metrics-list">
            <div><dt>CPU</dt><dd><span className="metric-value">{snapshot.system.cpuPercent}</span><span className="metric-unit">%</span><span className="metric-bar"><i style={{ width: `${snapshot.system.cpuPercent}%` }} /></span></dd></div>
            <div><dt>MEMORY</dt><dd><span className="metric-value">{snapshot.system.memoryPercent}</span><span className="metric-unit">%</span><span className="metric-bar"><i style={{ width: `${snapshot.system.memoryPercent}%` }} /></span></dd></div>
            <div><dt>DISK</dt><dd><span className="metric-value">{snapshot.system.diskPercent}</span><span className="metric-unit">%</span><span className="metric-bar"><i style={{ width: `${snapshot.system.diskPercent}%` }} /></span></dd></div>
          </dl>
          <div className="uptime-row"><span>UPTIME</span><strong>07h 14m 32s</strong></div>
        </article>

        <article className="telemetry-card presence-card">
          <CardHeader index="04" label="Home" meta="LAN PRESENCE" />
          <div className="presence-person">
            <div className="avatar">A</div>
            <div><strong>{snapshot.presence.name}</strong><span><StatusLight /> {snapshot.presence.state.toUpperCase()} · {snapshot.presence.device}</span></div>
          </div>
          <div className="presence-detail"><span>SEEN ON NETWORK</span><strong>{snapshot.presence.lastSeen}</strong></div>
          <div className="presence-signal" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </article>

        <article className="telemetry-card minecraft-card">
          <CardHeader index="05" label="Minecraft" meta={`${minecraftTelemetry === "live" ? (minecraft.online ? "SERVER ONLINE" : "SERVER OFFLINE") : minecraftTelemetry === "checking" ? "CONNECTING" : "RCON OFFLINE"} / SMP`} />
          <div className="minecraft-layout">
            <div className="minecraft-overview">
              <div className="minecraft-state">
                <StatusLight tone={minecraft.online ? "good" : "warn"} />
                <strong>{minecraft.online ? "ONLINE" : "OFFLINE"}</strong>
              </div>
              <div className="minecraft-count"><data value={minecraft.playerCount}>{minecraft.playerCount}</data><span>/ {minecraft.maxPlayers} PLAYERS</span></div>
              <div className="minecraft-world-name">{minecraft.world}</div>
              <div className="minecraft-facts">
                <span><b>DAY</b> {minecraft.day}</span>
                <span><b>WEATHER</b> {minecraft.weather}</span>
              </div>
            </div>

            <div className="minecraft-players">
              <div className="minecraft-section-label">PLAYING NOW / {minecraft.playerCount}</div>
              <ul>
                {minecraft.players.map((player) => (
                  <li key={player.name}>
                    <span className={`player-chip player-chip--${player.skinTone}`} aria-hidden="true">{player.name.slice(0, 1)}</span>
                    <span><strong>{player.name}</strong><small>{player.activity}</small></span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="minecraft-world-state">
              <div className={`sky-clock ${minecraftIsNight ? "is-night" : ""}`}>
                <span className="sky-orb" aria-hidden="true">{minecraftIsNight ? "☾" : "☼"}</span>
                <span><strong>{formatMinecraftTime(minecraftTicks)}</strong><small>{minecraftIsNight ? "NIGHT" : "DAYLIGHT"} / IN-GAME</small></span>
              </div>
              <div className="minecraft-weather"><span className="weather-pixel" aria-hidden="true">{minecraft.weather === "CLEAR" ? "✦" : "≋"}</span><span><b>{minecraft.weather}</b><small>OVERWORLD WEATHER</small></span></div>
              <div className="minecraft-uptime"><span>SERVER UPTIME</span><strong>{formatDuration(minecraft.uptimeSeconds)}</strong></div>
            </div>
          </div>

          <div className="minecraft-bottom">
            <div className="minecraft-events">
              <div className="minecraft-section-label">RECENT EVENTS</div>
              {minecraft.recentEvents.map((event) => (
                <div className="minecraft-event" key={`${event.time}-${event.text}`}><span className="event-time">{event.time}</span><StatusLight tone={event.tone} /><span>{event.text}</span></div>
              ))}
            </div>
            <div className="minecraft-join">
              <div className="minecraft-qr"><QRCodeSVG value={minecraftJoinUri} size={74} bgColor="#f2f2ed" fgColor="#111310" includeMargin /></div>
              <div className="join-copy"><span className="minecraft-section-label">INSTANT JOIN</span><strong>{minecraft.joinAddress}</strong><small>SCAN IN MINECRAFT OR</small><div className="join-actions"><a href={minecraftJoinUri} className="join-button">JOIN NOW ↗</a><button type="button" onClick={copyJoinAddress}>{joinCopied ? "COPIED" : "COPY IP"}</button></div></div>
            </div>
          </div>

          <form className="minecraft-chat" onSubmit={sendMessageToServer}>
            <div className="minecraft-chat-copy"><span className="minecraft-section-label">SERVER CHAT</span><strong>Say something to the server</strong></div>
            <input value={serverDraft} onChange={(event) => setServerDraft(event.target.value)} maxLength={240} disabled={!minecraft.online || serverChatStatus === "sending"} placeholder={minecraft.online ? "Type a message for everyone..." : "Server is offline"} aria-label="Say something to the Minecraft server" />
            <button type="submit" disabled={!minecraft.online || !serverDraft.trim() || serverChatStatus === "sending"}>{serverChatStatus === "sending" ? "SENDING..." : "SEND ↗"}</button>
            <span className={`minecraft-chat-status is-${serverChatStatus}`} aria-live="polite">{serverChatStatus === "sent" ? "DELIVERED" : serverChatStatus === "error" ? "NOT DELIVERED" : "MAX 240 CHARS"}</span>
          </form>
        </article>

        <article className="telemetry-card ai-card">
          <CardHeader index="06" label="House AI" meta="OLLAMA / READY" />
          <div className="ai-body">
            <div className="ai-transcript" aria-live="polite">
              {messages.slice(-4).map((message, index) => (
                <div className={`chat-line chat-line--${message.role}`} key={`${message.text}-${index}`}>
                  <span className="chat-prefix">{message.role === "user" ? ">" : "LH"}</span>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
            <div className="suggestions">
              {suggestions.map((suggestion) => <button key={suggestion} onClick={() => submitQuestion(suggestion)}>{suggestion}</button>)}
            </div>
            <form className="ask-form" onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}>
              <span className="input-prefix">&gt;</span>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask something about the house..." aria-label="Ask House AI something" />
              <button type="submit" aria-label="Send question">↵</button>
            </form>
          </div>
        </article>
      </section>

      <footer className="footerbar">
        <div className="footer-status"><StatusLight /> <span>LOCALHOUSE</span></div>
        <div className="footer-services"><span><StatusLight /> INTERNET</span><span><StatusLight /> OLLAMA</span><button onClick={() => setIsWifiOpen(true)}><span className="wifi-glyph" aria-hidden="true">▦</span> WIFI</button></div>
        <div className="footer-build">{minecraftTelemetry === "live" ? "RCON TELEMETRY / LIVE" : "RCON TELEMETRY / WAITING"}</div>
      </footer>

      {isWifiOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsWifiOpen(false); }}>
          <section className="wifi-modal" role="dialog" aria-modal="true" aria-labelledby="wifi-title">
            <div className="modal-topline"><span>UTILITY / 01</span><button onClick={() => setIsWifiOpen(false)} aria-label="Close Wi-Fi access dialog">×</button></div>
            <p className="eyebrow">[ GUEST NETWORK ]</p>
            <h2 id="wifi-title">Join the house Wi-Fi.</h2>
            <p className="modal-copy">Scan this code with your phone camera. No typing required.</p>
            <div className="qr-frame"><QRCodeSVG value="WIFI:T:WPA;S:LocalHouse-Guest;P:welcome-home-01;;" size={208} bgColor="#f2f2ed" fgColor="#111310" includeMargin /></div>
            <div className="network-details"><span>NETWORK</span><strong>LocalHouse-Guest</strong><span>PASSWORD</span><strong>welcome-home-01</strong></div>
            <button className="modal-close" onClick={() => setIsWifiOpen(false)}>CLOSE WINDOW <span>ESC</span></button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
