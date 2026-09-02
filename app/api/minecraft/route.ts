import { promises as fs } from "node:fs";
import { createConnection, type Socket } from "node:net";
import { NextResponse } from "next/server";
import type {
  MinecraftEvent,
  MinecraftPlayer,
  MinecraftStatus,
} from "../../../lib/modules";

export const dynamic = "force-dynamic";

const RCON_LOGIN = 3;
const RCON_COMMAND = 2;
const minecraftDirectory =
  process.env.MINECRAFT_DIR ?? "D:\\localhouse\\minecraft";

type RconPacket = { id: number; type: number; body: string };

function packet(id: number, type: number, body: string) {
  const payload = Buffer.from(body, "utf8");
  const buffer = Buffer.alloc(14 + payload.length);
  buffer.writeInt32LE(payload.length + 10, 0);
  buffer.writeInt32LE(id, 4);
  buffer.writeInt32LE(type, 8);
  payload.copy(buffer, 12);
  buffer.writeInt16LE(0, 12 + payload.length);
  return buffer;
}

function readPacket(socket: Socket, timeoutMs = 2500): Promise<RconPacket> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(
      () => finish(new Error("RCON request timed out")),
      timeoutMs,
    );

    function finish(error?: Error, result?: RconPacket) {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
      if (error) reject(error);
      else if (result) resolve(result);
    }

    function onError(error: Error) {
      finish(error);
    }
    function onClose() {
      finish(new Error("RCON connection closed"));
    }
    function onData(chunk: Buffer) {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 4) return;
      const length = buffer.readInt32LE(0);
      if (buffer.length < length + 4) return;
      finish(undefined, {
        id: buffer.readInt32LE(4),
        type: buffer.readInt32LE(8),
        body: buffer.subarray(12, 4 + length - 2).toString("utf8"),
      });
    }

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function rconCommand(socket: Socket, id: number, command: string) {
  socket.write(packet(id, RCON_COMMAND, command));
  const response = await readPacket(socket);
  if (response.id === -1) throw new Error("RCON authentication failed");
  return response.body;
}

async function queryMinecraft() {
  const host = process.env.MINECRAFT_RCON_HOST ?? "127.0.0.1";
  const port = Number(process.env.MINECRAFT_RCON_PORT ?? 25575);
  const socket = await connectRcon(host, port);

  try {
    const list = await rconCommand(socket, 2, "list");
    const day = await rconCommand(socket, 3, "time query day");
    const timeOfDay = await rconCommand(socket, 4, "time query daytime");
    const weather = await rconCommand(socket, 5, "weather query");

    const countMatch = list.match(
      /There are (\d+) of a max of (\d+) players online/,
    );
    const playersText = list.split(":").slice(1).join(":").trim();
    const playerNames =
      playersText && playersText !== "-"
        ? playersText
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        : [];
    const players: MinecraftPlayer[] = playerNames.map((name, index) => ({
      name,
      skinTone: (["lime", "orange", "blue"] as const)[index % 3],
      activity: "online now",
    }));
    const dayNumber = Number(day.match(/-?\d+/)?.[0] ?? 0);
    const timeNumber = Number(timeOfDay.match(/-?\d+/)?.[0] ?? 0) % 24000;
    const weatherName = weather.toLowerCase().includes("thunder")
      ? "THUNDER"
      : weather.toLowerCase().includes("rain")
        ? "RAIN"
        : "CLEAR";
    const events = await readRecentEvents();

    return {
      online: true,
      playerCount: Number(countMatch?.[1] ?? players.length),
      maxPlayers: Number(countMatch?.[2] ?? 20),
      players,
      world: await readServerProperty(
        "level-name",
        process.env.MINECRAFT_WORLD ?? "world",
      ),
      day: dayNumber,
      timeOfDay: timeNumber,
      weather: weatherName,
      uptimeSeconds: await estimateUptimeSeconds(),
      joinAddress: process.env.MINECRAFT_JOIN_ADDRESS ?? "localhost:25565",
      recentEvents: events,
    } satisfies MinecraftStatus;
  } finally {
    socket.end();
  }
}

async function connectRcon(host: string, port: number) {
  const password = process.env.MINECRAFT_RCON_PASSWORD;
  if (!password) throw new Error("MINECRAFT_RCON_PASSWORD is not configured");

  const socket = await new Promise<Socket>((resolve, reject) => {
    const connection = createConnection({ host, port });
    const timer = setTimeout(() => {
      connection.destroy();
      reject(new Error("Unable to connect to Minecraft RCON"));
    }, 2500);
    connection.once("connect", () => {
      clearTimeout(timer);
      resolve(connection);
    });
    connection.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  socket.write(packet(1, RCON_LOGIN, password));
  const login = await readPacket(socket);
  if (login.id === -1) {
    socket.end();
    throw new Error("RCON authentication failed");
  }
  return socket;
}

async function sendServerMessage(message: string) {
  const host = process.env.MINECRAFT_RCON_HOST ?? "127.0.0.1";
  const port = Number(process.env.MINECRAFT_RCON_PORT ?? 25575);
  const socket = await connectRcon(host, port);
  try {
    await rconCommand(socket, 2, `say ${message}`);
  } finally {
    socket.end();
  }
}

async function readRecentEvents(): Promise<MinecraftEvent[]> {
  try {
    const log = await fs.readFile(
      `${minecraftDirectory}\\logs\\latest.log`,
      "utf8",
    );
    const lines = log
      .split(/\r?\n/)
      .filter((line) =>
        /joined the game|left the game|was slain|has made the advancement|completed the challenge|was blown up|fell from a high place/i.test(
          line,
        ),
      );
    return lines
      .slice(-4)
      .reverse()
      .map((line) => {
        const time =
          line.match(/^\[(\d{2}:\d{2}:\d{2})\]/)?.[1]?.slice(0, 5) ?? "--:--";
        const text = line.replace(/^\[[^\]]+\]\s*\[[^\]]+\]:\s*/, "");
        return {
          time,
          text,
          tone: /slain|blown up|fell from/i.test(text)
            ? "warn"
            : /joined|advancement|challenge/i.test(text)
              ? "good"
              : "muted",
        };
      });
  } catch {
    return [];
  }
}

async function readServerProperty(key: string, fallback: string) {
  try {
    const properties = await fs.readFile(
      `${minecraftDirectory}\\server.properties`,
      "utf8",
    );
    const value = properties
      .match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]
      ?.trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

async function estimateUptimeSeconds() {
  try {
    const log = await fs.readFile(
      `${minecraftDirectory}\\logs\\latest.log`,
      "utf8",
    );
    const firstTimestamp = log.match(/^\[(\d{2}):(\d{2}):(\d{2})\]/m);
    if (!firstTimestamp) return 0;
    const started = new Date();
    started.setHours(
      Number(firstTimestamp[1]),
      Number(firstTimestamp[2]),
      Number(firstTimestamp[3]),
      0,
    );
    if (started.getTime() > Date.now()) started.setDate(started.getDate() - 1);
    return Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000));
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    return NextResponse.json(await queryMinecraft(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Minecraft telemetry unavailable";
    return NextResponse.json(
      { error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    const message =
      typeof body.message === "string"
        ? body.message
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .trim()
            .slice(0, 240)
        : "";
    if (!message)
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 },
      );

    await sendServerMessage(message);
    return NextResponse.json(
      { ok: true, message },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send message to Minecraft";
    return NextResponse.json(
      { error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
