import { execFile } from "node:child_process";
import { statfsSync } from "node:fs";
import os from "node:os";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { cpuTemperature, graphics } from "systeminformation";
import type { SystemStatus } from "../../../lib/modules";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

function cpuTotals() {
  return os.cpus().reduce(
    (total, cpu) => {
      const times = cpu.times;
      return {
        idle: total.idle + times.idle,
        total:
          total.total +
          Object.values(times).reduce((sum, value) => sum + value, 0),
      };
    },
    { idle: 0, total: 0 },
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeTemperature(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

async function readNvidiaTemperature() {
  try {
    const executable = process.platform === "win32"
      ? `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\nvidia-smi.exe`
      : "nvidia-smi";
    const { stdout } = await execFileAsync(
      executable,
      ["--query-gpu=temperature.gpu", "--format=csv,noheader,nounits"],
      { timeout: 2000, windowsHide: true },
    );
    const temperatures = stdout
      .trim()
      .split(/\r?\n/)
      .map((value) => normalizeTemperature(Number.parseFloat(value)))
      .filter((value): value is number => value !== null);

    return temperatures.length > 0 ? Math.max(...temperatures) : null;
  } catch {
    return null;
  }
}

async function readTemperatures() {
  const cpuSensor = cpuTemperature()
    .then((cpu) => normalizeTemperature(cpu.main))
    .catch(() => null);
  const systemGpuSensor = graphics()
    .then((gpu) => {
      const temperatures = gpu.controllers
        .map((controller) => normalizeTemperature(controller.temperatureGpu))
        .filter((value): value is number => value !== null);
      return temperatures.length > 0 ? Math.max(...temperatures) : null;
    })
    .catch(() => null);

  const [cpuTemperatureC, systemGpuTemperatureC, nvidiaTemperatureC] =
    await Promise.all([
      Promise.race([cpuSensor, wait(1500).then(() => null)]),
      Promise.race([systemGpuSensor, wait(1500).then(() => null)]),
      readNvidiaTemperature(),
    ]);

  return {
    cpuTemperatureC,
    gpuTemperatureC: nvidiaTemperatureC ?? systemGpuTemperatureC,
  };
}

async function readSystemUsage(): Promise<SystemStatus> {
  const temperaturePromise = readTemperatures();
  const before = cpuTotals();
  await wait(350);
  const after = cpuTotals();
  const totalDelta = after.total - before.total;
  const idleDelta = after.idle - before.idle;
  const cpuPercent =
    totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0;
  const cpus = os.cpus();
  const cpuSpeedMhz =
    cpus.length > 0
      ? Math.round(
          cpus.reduce((total, cpu) => total + cpu.speed, 0) / cpus.length,
        )
      : 0;
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const memoryPercent =
    totalMemoryBytes > 0
      ? Math.round((1 - freeMemoryBytes / totalMemoryBytes) * 100)
      : 0;
  const disk = statfsSync(process.env.MINECRAFT_DIR ?? process.cwd());
  const totalDiskBytes = Number(disk.blocks) * Number(disk.bsize);
  const freeDiskBytes = Number(disk.bavail) * Number(disk.bsize);
  const diskPercent =
    totalDiskBytes > 0
      ? Math.round((1 - freeDiskBytes / totalDiskBytes) * 100)
      : 0;
  const temperatures = await temperaturePromise;

  return {
    cpuPercent,
    cpuLogicalCores: cpus.length,
    cpuSpeedMhz,
    cpuTemperatureC: temperatures.cpuTemperatureC,
    gpuTemperatureC: temperatures.gpuTemperatureC,
    memoryPercent,
    totalMemoryBytes,
    freeMemoryBytes,
    diskPercent,
    totalDiskBytes,
    freeDiskBytes,
    uptimeSeconds: Math.floor(os.uptime()),
  };
}

export async function GET() {
  try {
    return NextResponse.json(await readSystemUsage(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "System telemetry unavailable";
    return NextResponse.json(
      { error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
