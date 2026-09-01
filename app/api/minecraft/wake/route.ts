import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const minecraftDirectory = process.env.MINECRAFT_DIR ?? "D:\\localhouse\\minecraft";

function isMinecraftListening() {
  const host = process.env.MINECRAFT_HOST ?? "127.0.0.1";
  const port = Number(process.env.MINECRAFT_PORT ?? 25565);
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => finish(false), 800);
    function finish(isOpen: boolean) {
      clearTimeout(timer);
      socket.destroy();
      resolve(isOpen);
    }
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

function startMinecraft() {
  const javaPath = process.env.MINECRAFT_JAVA_PATH ?? "java";
  return new Promise<void>((resolve, reject) => {
    const child = spawn(javaPath, ["-Xms1G", "-Xmx2G", "-jar", "paper.jar", "--nogui"], {
      cwd: minecraftDirectory,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
    child.once("error", reject);
  });
}

export async function POST() {
  try {
    if (await isMinecraftListening()) {
      return NextResponse.json({ ok: true, status: "already-online" });
    }

    await fs.access(`${minecraftDirectory}\\paper.jar`);
    await startMinecraft();
    return NextResponse.json({ ok: true, status: "starting" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to wake Minecraft";
    return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
