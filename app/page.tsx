"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Bot,
  Cloud,
  CloudRain,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Gamepad2,
  HardDrive,
  Moon,
  RefreshCw,
  Send,
  Server,
  Settings2,
  Sun,
  Thermometer,
  Wifi,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AppSidebar } from "@/components/app-sidebar";
import {
  MessageBubble,
  MessageBubbleContent,
  MessageBubbleGroup,
} from "@/components/agents/message-bubble";
import { ReasoningText } from "@/components/agents/loading-states/reasoning-text";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { mockHouseSnapshot, type HouseSnapshot, type MinecraftStatus, type SystemStatus } from "@/lib/modules";

type ChatMessage = { role: "user" | "assistant"; text: string };
type ComputeSample = {
  time: string;
  uptimePercent: number;
  cpuTemperatureC: number | null;
  gpuTemperatureC: number | null;
};

const uptimeChartConfig = {
  uptimePercent: { label: "Availability (%)", color: "var(--chart-1)" },
} satisfies ChartConfig;

const temperatureChartConfig = {
  cpuTemperatureC: { label: "CPU temp (°C)", color: "var(--chart-2)" },
  gpuTemperatureC: { label: "GPU temp (°C)", color: "var(--chart-3)" },
} satisfies ChartConfig;

const suggestions = ["Who's online?", "What happened while I was gone?", "Is anything offline?"];

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days} days` : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function formatMinecraftTime(ticks: number) {
  const totalMinutes = Math.floor((ticks / 1000) * 60) + 360;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getAssistantResponse(input: string, snapshot: HouseSnapshot) {
  const normalized = input.toLowerCase();
  if (normalized.includes("who's online") || normalized.includes("who is online") || normalized.includes("playing")) {
    const players = snapshot.minecraft.players.map((player) => player.name).join(", ");
    return snapshot.minecraft.online ? `${snapshot.minecraft.playerCount} players are online in ${snapshot.minecraft.world}: ${players || "nobody yet"}.` : "The Minecraft server is offline, so nobody is currently playing.";
  }
  if (normalized.includes("what happened") || normalized.includes("while i was gone") || normalized.includes("since i left")) {
    const events = snapshot.minecraft.recentEvents.length ? snapshot.minecraft.recentEvents.slice(0, 3).map((event) => event.text.toLowerCase()).join(", ") : "no recent Minecraft events were recorded";
    return `While you were gone: ${events}. The server has been up for ${formatDuration(snapshot.minecraft.uptimeSeconds)}.`;
  }
  if (normalized.includes("minecraft") || normalized.includes("world")) {
    return snapshot.minecraft.online ? `Minecraft is online with ${snapshot.minecraft.playerCount} players in ${snapshot.minecraft.world}.` : "The Minecraft server is offline right now.";
  }
  if (normalized.includes("weather") || normalized.includes("outside") || normalized.includes("temperature")) {
    return `It is ${snapshot.weather.temperatureC}°C outside with ${snapshot.weather.condition.toLowerCase()} skies. Today’s range is ${snapshot.weather.lowC}° to ${snapshot.weather.highC}°.`;
  }
  if (normalized.includes("server") || normalized.includes("cpu") || normalized.includes("memory") || normalized.includes("disk")) {
    return `The host looks healthy: CPU is at ${snapshot.system.cpuPercent}%, memory at ${snapshot.system.memoryPercent}%, disk at ${snapshot.system.diskPercent}%.`;
  }
  if (normalized.includes("internet") || normalized.includes("offline") || normalized.includes("ping")) {
    return `Internet is ${snapshot.internet.online ? "online" : "offline"} with ${snapshot.internet.latencyMs} ms latency.`;
  }
  return `The house looks good. Internet is ${snapshot.internet.online ? "online" : "offline"}, the server is healthy, and Minecraft is ${snapshot.minecraft.online ? "online" : "offline"}.`;
}

function StatusDot({ tone = "good" }: { tone?: "good" | "muted" | "warn" }) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />;
}

function HealthRow({ icon: Icon, label, detail, value }: { icon: LucideIcon; label: string; detail: string; value: number }) {
  return (
    <div className="health-row">
      <span className="health-icon"><Icon aria-hidden="true" /></span>
      <div><strong>{label}</strong><small>{detail}</small></div>
      <Progress className="health-progress" value={value} aria-label={`${label} usage`} />
    </div>
  );
}

export default function Home() {
  const baseline = mockHouseSnapshot;
  const [now, setNow] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWifiOpen, setIsWifiOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<"checking" | "ready" | "offline">("checking");
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [minecraft, setMinecraft] = useState<MinecraftStatus>(baseline.minecraft);
  const [minecraftTelemetry, setMinecraftTelemetry] = useState<"checking" | "live" | "offline">("checking");
  const [minecraftTicks, setMinecraftTicks] = useState(baseline.minecraft.timeOfDay);
  const [joinCopied, setJoinCopied] = useState(false);
  const [serverDraft, setServerDraft] = useState("");
  const [serverChatStatus, setServerChatStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [wakeState, setWakeState] = useState<"idle" | "waking" | "error">("idle");
  const [system, setSystem] = useState(baseline.system);
  const [computeHistory, setComputeHistory] = useState<ComputeSample[]>([]);
  const [weather, setWeather] = useState(baseline.weather);
  const snapshot: HouseSnapshot = { ...baseline, minecraft, system, weather };
  const hasTemperatureData = computeHistory.some(
    (sample) => sample.cpuTemperatureC !== null || sample.gpuTemperatureC !== null,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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
      setMinecraft((current) => ({ ...current, online: false, playerCount: 0, players: [], recentEvents: [{ time: "--:--", text: "RCON telemetry unavailable", tone: "warn" }] }));
    }
  }

  async function refreshSystemData() {
    try {
      const response = await fetch("/api/system", { cache: "no-store" });
      if (!response.ok) throw new Error("System telemetry unavailable");
      const nextSystem = await response.json() as SystemStatus;
      setSystem(nextSystem);
      setComputeHistory((current) => [
        ...current,
        {
          time: formatTime(new Date()),
          uptimePercent: 100,
          cpuTemperatureC: nextSystem.cpuTemperatureC,
          gpuTemperatureC: nextSystem.gpuTemperatureC,
        },
      ].slice(-12));
    } catch {
      setComputeHistory((current) => [
        ...current,
        {
          time: formatTime(new Date()),
          uptimePercent: 0,
          cpuTemperatureC: null,
          gpuTemperatureC: null,
        },
      ].slice(-12));
    }
  }

  async function refreshWeatherData() {
    try { const response = await fetch("/api/weather", { cache: "no-store" }); if (response.ok) setWeather(await response.json()); } catch { /* keep the last known snapshot */ }
  }

  useEffect(() => {
    void refreshMinecraft();
    void refreshSystemData();
    void refreshWeatherData();
    const minecraftTimer = window.setInterval(() => void refreshMinecraft(), 10000);
    const systemTimer = window.setInterval(() => void refreshSystemData(), 10000);
    const weatherTimer = window.setInterval(() => void refreshWeatherData(), 300000);
    return () => { window.clearInterval(minecraftTimer); window.clearInterval(systemTimer); window.clearInterval(weatherTimer); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (minecraft.online) setMinecraftTicks((current) => (current + 20) % 24000);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [minecraft.online]);

  useEffect(() => {
    fetch("/api/ai", { cache: "no-store" }).then((response) => setAiStatus(response.ok ? "ready" : "offline")).catch(() => setAiStatus("offline"));
  }, []);

  const statusSummary = useMemo(() => {
    if (isRefreshing) return "Checking systems";
    if (minecraftTelemetry === "checking") return "Connecting to Minecraft";
    if (minecraftTelemetry === "offline") return "Minecraft telemetry offline";
    return "All systems normal";
  }, [isRefreshing, minecraftTelemetry]);

  function refreshTelemetry() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    void Promise.all([refreshMinecraft(), refreshSystemData(), refreshWeatherData()]);
    window.setTimeout(() => setIsRefreshing(false), 700);
  }

  async function submitQuestion(question = draft) {
    const trimmed = question.trim();
    if (!trimmed || isAskingAI) return;
    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setDraft("");
    setIsAskingAI(true);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed, history, snapshot }) });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error || "Ollama is unavailable");
      setMessages((current) => [...current, { role: "assistant", text: data.answer! }]);
      setAiStatus("ready");
    } catch {
      setAiStatus("offline");
      setMessages((current) => [...current, { role: "assistant", text: `Ollama is unavailable right now. ${getAssistantResponse(trimmed, snapshot)}` }]);
    } finally { setIsAskingAI(false); }
  }

  async function sendMessageToServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = serverDraft.trim();
    if (!message || serverChatStatus === "sending") return;
    setServerChatStatus("sending");
    try {
      const response = await fetch("/api/minecraft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
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

  async function wakeMinecraft() {
    if (wakeState === "waking") return;
    setWakeState("waking");
    try {
      const response = await fetch("/api/minecraft/wake", { method: "POST" });
      if (!response.ok) throw new Error("Unable to wake server");
      window.setTimeout(() => void refreshMinecraft(), 2500);
      window.setTimeout(() => setWakeState("idle"), 15000);
    } catch {
      setWakeState("error");
      window.setTimeout(() => setWakeState("idle"), 2800);
    }
  }

  async function copyJoinAddress() {
    try {
      await navigator.clipboard.writeText(minecraft.joinAddress);
      setJoinCopied(true);
      window.setTimeout(() => setJoinCopied(false), 1800);
    } catch { setJoinCopied(false); }
  }

  const minecraftIsNight = minecraftTicks >= 13000 && minecraftTicks < 23000;
  const minecraftJoinUri = `minecraft://?addExternalServer=LocalHouse%20SMP|${minecraft.joinAddress}`;

  return (
    <SidebarProvider>
      <div className="app-shell">
        <AppSidebar />
        <SidebarInset className="main-area-shell">
          <div className="main-area">
        <header className="page-header">
          <div className="header-leading">
            <SidebarTrigger className="sidebar-trigger" aria-label="Toggle sidebar" />
            <div>
            <h1>Overview</h1>
            <p className="system-status"><StatusDot tone={minecraftTelemetry === "offline" ? "warn" : "good"} />{statusSummary.toUpperCase()}</p>
            </div>
          </div>
          <div className="header-actions">
            <time dateTime={now.toISOString()}>{formatTime(now)}</time>
            <Button className="chrome-button" variant="outline" size="icon-sm" onClick={refreshTelemetry} disabled={isRefreshing} aria-label="Refresh telemetry" title="Refresh telemetry"><RefreshCw aria-hidden="true" className={isRefreshing ? "spin" : ""} /></Button>
            <Button className="chrome-button" variant="outline" size="icon-sm" aria-label="Notifications"><Bell aria-hidden="true" /></Button>
            <Button className="chrome-button" variant="outline" size="icon-sm" render={<Link href="/settings" aria-label="Open settings" />}><Settings2 aria-hidden="true" /></Button>
          </div>
        </header>

        <section className={`dashboard-grid ${isRefreshing ? "is-refreshing" : ""}`} aria-label="House overview">
          <div className="left-column">
            <Card className="dashboard-card weather-card">
              <CardHeader className="dashboard-card-header"><CardTitle className="metric-card-title">Weather</CardTitle></CardHeader>
              <CardContent className="weather-content">
                <div><span className="location-label">{weather.location.replace(", ON", "")}</span><div className="temperature"><data value={weather.temperatureC}>{weather.temperatureC}</data><span>°C</span></div><em>{weather.condition.charAt(0) + weather.condition.slice(1).toLowerCase()}</em></div>
                <span className="weather-orb">{weather.condition.toLowerCase().includes("rain") ? <CloudRain aria-hidden="true" /> : <Cloud aria-hidden="true" />}</span>
              </CardContent>
            </Card>

            <Card className="dashboard-card health-card">
              <CardHeader className="dashboard-card-header"><CardTitle className="metric-card-title">System Health</CardTitle></CardHeader>
              <CardContent className="health-list">
                <HealthRow icon={Cpu} label="CPU Load" detail={`${system.cpuPercent}% active`} value={system.cpuPercent} />
                <HealthRow icon={Database} label="Memory" detail={`${formatBytes(system.totalMemoryBytes - system.freeMemoryBytes)} / ${formatBytes(system.totalMemoryBytes)}`} value={system.memoryPercent} />
                <HealthRow icon={HardDrive} label="Storage" detail={`${formatBytes(system.totalDiskBytes - system.freeDiskBytes)} / ${formatBytes(system.totalDiskBytes)}`} value={system.diskPercent} />
                <HealthRow icon={Activity} label="Network" detail={`${snapshot.internet.latencyMs} ms latency`} value={Math.min(100, snapshot.internet.latencyMs)} />
              </CardContent>
            </Card>

            <Card className="dashboard-card compute-card">
              <CardHeader className="dashboard-card-header"><CardTitle className="metric-card-title">Compute</CardTitle></CardHeader>
              <CardContent className="compute-chart-content">
                <section className="compute-chart-panel" aria-label="Uptime history">
                  <span className="compute-chart-label">UPTIME</span>
                  <ChartContainer config={uptimeChartConfig} className="compute-chart">
                    <LineChart accessibilityLayer data={computeHistory} margin={{ top: 6, right: 12, bottom: 0, left: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} allowDataOverflow tickFormatter={(value) => `${value}%`} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                      <Line dataKey="uptimePercent" type="linear" stroke="var(--color-uptimePercent)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-uptimePercent)" }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </section>
                <section className="compute-chart-panel compute-chart-panel--temperature" aria-label="Temperature history">
                  <div className="compute-chart-heading">
                    <span className="compute-chart-label">TEMPERATURE</span>
                    <span className="compute-chart-readings" aria-label="Current temperatures">
                      CPU {system.cpuTemperatureC === null ? "unavailable" : `${system.cpuTemperatureC}°`} · GPU {system.gpuTemperatureC === null ? "unavailable" : `${system.gpuTemperatureC}°`}
                    </span>
                  </div>
                  <div className="compute-chart-frame">
                    <ChartContainer config={temperatureChartConfig} className="compute-chart">
                    <LineChart accessibilityLayer data={computeHistory} margin={{ top: 6, right: 12, bottom: 0, left: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} width={34} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}°`} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                      <ChartLegend content={<ChartLegendContent className="compute-chart-legend" />} />
                      <Line dataKey="cpuTemperatureC" type="monotone" stroke="var(--color-cpuTemperatureC)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-cpuTemperatureC)" }} activeDot={{ r: 4 }} connectNulls />
                      <Line dataKey="gpuTemperatureC" type="monotone" stroke="var(--color-gpuTemperatureC)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-gpuTemperatureC)" }} activeDot={{ r: 4 }} connectNulls />
                    </LineChart>
                    </ChartContainer>
                    {!hasTemperatureData ? <span className="compute-chart-empty">Waiting for temperature sensors…</span> : null}
                  </div>
                </section>
              </CardContent>
            </Card>
          </div>

          <div className="right-column">
            <Card className="dashboard-card server-card">
              <CardHeader className="server-heading"><CardTitle>Minecraft Server</CardTitle><Badge className={`status-badge ${minecraft.online ? "" : "is-offline"}`} variant="secondary"><StatusDot tone={minecraft.online ? "good" : "warn"} />{minecraft.online ? "Online" : "Offline"}</Badge></CardHeader>
              <CardContent className="server-overview">
                <div className="server-primary-stat"><span className="server-stat-label">PLAYERS ONLINE</span><strong>{minecraft.playerCount}<small> / {minecraft.maxPlayers}</small></strong><div className="player-stack">{minecraft.players.length ? minecraft.players.slice(0, 3).map((player) => <span key={player.name}>{player.name.slice(0, 1)}</span>) : <><span>A</span><span>J</span><span>M</span></>}</div></div>
                <div className="server-facts"><div><Server aria-hidden="true" /><span>WORLD</span><strong>{minecraft.world}</strong></div><div><Gamepad2 aria-hidden="true" /><span>DAY</span><strong>{minecraft.day}</strong></div><div><Thermometer aria-hidden="true" /><span>WEATHER</span><strong>{minecraft.weather}</strong></div></div>
                <div className={`server-clock ${minecraftIsNight ? "is-night" : ""}`}><span className="clock-icon">{minecraftIsNight ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</span><strong>{formatMinecraftTime(minecraftTicks)}</strong><small>{minecraftIsNight ? "NIGHT" : "DAYLIGHT"} / IN-GAME</small></div>
              </CardContent>
              {!minecraft.online ? <CardFooter className="server-action-row"><Button variant="outline" size="sm" onClick={wakeMinecraft} disabled={minecraftTelemetry === "checking" || wakeState === "waking"}>{wakeState === "waking" ? "Waking server…" : wakeState === "error" ? "Try again" : "Wake server"}</Button><span className="server-action-note">RCON telemetry unavailable</span></CardFooter> : null}
              <CardFooter className="server-footer"><div className="join-address"><span>JOIN ADDRESS</span><strong>{minecraft.joinAddress}</strong></div><div className="join-actions"><Button variant="ghost" size="xs" onClick={copyJoinAddress}><Copy aria-hidden="true" />{joinCopied ? "Copied" : "Copy IP"}</Button><Button variant="ghost" size="xs" render={<a href={minecraftJoinUri} />}><ExternalLink aria-hidden="true" />Join</Button></div></CardFooter>
              <form className="server-chat-form" onSubmit={sendMessageToServer}><span>SERVER CHAT</span><Input value={serverDraft} onChange={(event) => setServerDraft(event.target.value)} maxLength={240} disabled={!minecraft.online || serverChatStatus === "sending"} placeholder={minecraft.online ? "Say something to the server…" : "Server is offline"} aria-label="Say something to the Minecraft server" /><Button type="submit" size="sm" disabled={!minecraft.online || !serverDraft.trim() || serverChatStatus === "sending"}>{serverChatStatus === "sending" ? "Sending…" : "Send"}</Button></form>
            </Card>

            <Card className="dashboard-card ai-card">
              <CardHeader className="dashboard-card-header"><div className="ai-title"><span className="ai-icon"><Bot aria-hidden="true" /></span><CardTitle>House AI</CardTitle></div><Badge className="status-badge" variant="outline"><StatusDot tone={aiStatus === "offline" ? "warn" : "good"} />{aiStatus === "offline" ? "Fallback" : "Ready"}</Badge></CardHeader>
              <CardContent className="chat-transcript" aria-live="polite">
                <MessageBubbleGroup spacing="default">
                  {messages.map((message, index) => (
                    <MessageBubble
                      align={message.role === "user" ? "end" : "start"}
                      animateIn
                      key={`${message.text}-${index}`}
                      variant={message.role === "user" ? "solid" : "soft"}
                    >
                      <MessageBubbleContent>{message.text}</MessageBubbleContent>
                    </MessageBubble>
                  ))}
                  {isAskingAI ? (
                    <MessageBubble align="start" animateIn variant="ghost">
                      <MessageBubbleContent>
                        <ReasoningText variant="swap" />
                      </MessageBubbleContent>
                    </MessageBubble>
                  ) : null}
                </MessageBubbleGroup>
              </CardContent>
              <CardFooter className="chat-footer">
                <form className="chat-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submitQuestion(); }}>
                  <Input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={isAskingAI} placeholder="Ask House AI anything..." aria-label="Ask House AI anything" />
                  <Button type="submit" className="send-button" size="icon-sm" disabled={isAskingAI || !draft.trim()} aria-label="Send question"><Send aria-hidden="true" /></Button>
                </form>
                <div className="suggestions" aria-label="Suggested questions">{suggestions.map((suggestion) => <Button className="suggestion-button" variant="ghost" size="xs" type="button" key={suggestion} onClick={() => void submitQuestion(suggestion)} disabled={isAskingAI}>{suggestion}</Button>)}</div>
              </CardFooter>
            </Card>
          </div>
        </section>

        <footer className="app-footer"><Dialog open={isWifiOpen} onOpenChange={setIsWifiOpen}><DialogTrigger render={<Button variant="ghost" size="sm" className="wifi-trigger" />}><Wifi aria-hidden="true" />Wi-Fi access</DialogTrigger><DialogContent className="wifi-dialog"><DialogHeader><p className="dialog-kicker">Guest network</p><DialogTitle>Join the house Wi-Fi.</DialogTitle><DialogDescription>Scan this code with your phone camera. No typing required.</DialogDescription></DialogHeader><div className="qr-frame"><QRCodeSVG value="WIFI:T:WPA;S:LocalHouse-Guest;P:welcome-home-01;;" size={208} bgColor="transparent" fgColor="currentColor" includeMargin /></div><div className="network-details"><span>Network</span><strong>LocalHouse-Guest</strong><span>Password</span><strong>welcome-home-01</strong></div><DialogFooter><DialogClose render={<Button variant="outline" className="dialog-close" />}><X aria-hidden="true" />Close window</DialogClose></DialogFooter></DialogContent></Dialog></footer>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
