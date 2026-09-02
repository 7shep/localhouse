import { NextResponse } from "next/server";
import type { WeatherStatus } from "../../../lib/modules";

export const dynamic = "force-dynamic";

const weatherLabels: Record<number, string> = {
  0: "CLEAR",
  1: "MAINLY CLEAR",
  2: "PARTLY CLOUDY",
  3: "OVERCAST",
  45: "FOG",
  48: "RIME FOG",
  51: "LIGHT DRIZZLE",
  53: "DRIZZLE",
  55: "HEAVY DRIZZLE",
  61: "LIGHT RAIN",
  63: "RAIN",
  65: "HEAVY RAIN",
  71: "LIGHT SNOW",
  73: "SNOW",
  75: "HEAVY SNOW",
  80: "RAIN SHOWERS",
  81: "RAIN SHOWERS",
  82: "HEAVY RAIN SHOWERS",
  95: "THUNDERSTORM",
  96: "THUNDERSTORM / HAIL",
  99: "THUNDERSTORM / HAIL",
};

export async function GET() {
  const latitude = process.env.WEATHER_LATITUDE ?? "43.6532";
  const longitude = process.env.WEATHER_LONGITUDE ?? "-79.3832";
  const location = process.env.WEATHER_LOCATION ?? "TORONTO, ON";

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude,
      longitude,
      current: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min",
      timezone: process.env.WEATHER_TIMEZONE ?? "America/Toronto",
      forecast_days: "1",
    }).toString();
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new Error(`Weather provider returned ${response.status}`);
    const data = await response.json();
    const weatherCode = Number(data.current.weather_code);
    const updatedAt = new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.WEATHER_TIMEZONE ?? "America/Toronto",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());

    return NextResponse.json(
      {
        location,
        temperatureC: Math.round(Number(data.current.temperature_2m)),
        condition: weatherLabels[weatherCode] ?? "UNKNOWN",
        highC: Math.round(Number(data.daily.temperature_2m_max[0])),
        lowC: Math.round(Number(data.daily.temperature_2m_min[0])),
        updatedAt,
      } satisfies WeatherStatus,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Weather telemetry unavailable";
    return NextResponse.json(
      { error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
