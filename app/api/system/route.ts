import { statfsSync } from "node:fs";
import os from "node:os";
import { NextResponse } from "next/server";
import type { SystemStatus } from "../../../lib/modules";

export const dynamic = "force-dynamic";

function cpuTotals() {
  return os.cpus().reduce((total, cpu) => {
    const times = cpu.times;
    return { idle: total.idle + times.idle, total: total.total + Object.values(times).reduce((sum, value) => sum + value, 0) };
  }, { idle: 0, total: 0 });
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readSystemUsage(): Promise<SystemStatus> {
  const before = cpuTotals();
  await wait(350);
  const after = cpuTotals();
  const totalDelta = after.total - before.total;
  const idleDelta = after.idle - before.idle;
  const cpuPercent = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0;
  const memoryPercent = Math.round((1 - os.freemem() / os.totalmem()) * 100);
  const disk = statfsSync(process.env.MINECRAFT_DIR ?? process.cwd());
  const diskPercent = disk.blocks > 0 ? Math.round((1 - Number(disk.bfree) / Number(disk.blocks)) * 100) : 0;

  return { cpuPercent, memoryPercent, diskPercent, uptimeSeconds: Math.floor(os.uptime()) };
}

export async function GET() {
  try {
    return NextResponse.json(await readSystemUsage(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "System telemetry unavailable";
    return NextResponse.json({ error: message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
