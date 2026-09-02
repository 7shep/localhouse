export type InternetStatus = {
  online: boolean;
  latencyMs: number;
  lastOutage: string;
};

export type SystemStatus = {
  cpuPercent: number;
  cpuLogicalCores: number;
  cpuSpeedMhz: number;
  cpuTemperatureC: number | null;
  gpuTemperatureC: number | null;
  memoryPercent: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  diskPercent: number;
  totalDiskBytes: number;
  freeDiskBytes: number;
  uptimeSeconds: number;
};

export type WeatherStatus = {
  location: string;
  temperatureC: number;
  condition: string;
  highC: number;
  lowC: number;
  updatedAt: string;
};

export type PresenceStatus = {
  name: string;
  state: "home" | "away";
  device: string;
  lastSeen: string;
};

export type MinecraftPlayer = {
  name: string;
  skinTone: "lime" | "orange" | "blue";
  activity: string;
};

export type MinecraftEvent = {
  time: string;
  text: string;
  tone: "good" | "muted" | "warn";
};

export type MinecraftStatus = {
  online: boolean;
  playerCount: number;
  maxPlayers: number;
  players: MinecraftPlayer[];
  world: string;
  day: number;
  timeOfDay: number;
  weather: "CLEAR" | "RAIN" | "THUNDER";
  uptimeSeconds: number;
  joinAddress: string;
  recentEvents: MinecraftEvent[];
};

export type HouseSnapshot = {
  internet: InternetStatus;
  system: SystemStatus;
  weather: WeatherStatus;
  presence: PresenceStatus;
  minecraft: MinecraftStatus;
};

export interface FeatureModule<T> {
  key: string;
  getSnapshot: () => Promise<T>;
}

export const mockHouseSnapshot: HouseSnapshot = {
  internet: { online: true, latencyMs: 14, lastOutage: "3 DAYS AGO / 02:14" },
  system: {
    cpuPercent: 18,
    cpuLogicalCores: 8,
    cpuSpeedMhz: 3200,
    cpuTemperatureC: null,
    gpuTemperatureC: null,
    memoryPercent: 42,
    totalMemoryBytes: 16 * 1024 ** 3,
    freeMemoryBytes: 9.28 * 1024 ** 3,
    diskPercent: 31,
    totalDiskBytes: 1024 ** 4,
    freeDiskBytes: 0.69 * 1024 ** 4,
    uptimeSeconds: 26072,
  },
  weather: { location: "TORONTO, ON", temperatureC: 21, condition: "PARTLY CLOUDY", highC: 24, lowC: 16, updatedAt: "08:55" },
  presence: { name: "Alex", state: "home", device: "IPHONE", lastSeen: "JUST NOW" },
  minecraft: {
    online: true,
    playerCount: 0,
    maxPlayers: 12,
    players: [],
    world: "world",
    day: 0,
    timeOfDay: 0,
    weather: "CLEAR",
    uptimeSeconds: 0,
    joinAddress: "play.localhouse.lan",
    recentEvents: [],
  },
};

export const featureModules: Record<keyof HouseSnapshot, FeatureModule<unknown>> = {
  internet: { key: "internet-monitor", getSnapshot: async () => mockHouseSnapshot.internet },
  system: { key: "system-metrics", getSnapshot: async () => mockHouseSnapshot.system },
  weather: { key: "weather-provider", getSnapshot: async () => mockHouseSnapshot.weather },
  presence: { key: "lan-presence", getSnapshot: async () => mockHouseSnapshot.presence },
  minecraft: { key: "minecraft-server", getSnapshot: async () => mockHouseSnapshot.minecraft },
};
