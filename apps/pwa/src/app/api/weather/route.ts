import { NextResponse } from 'next/server';

// KINETIC SUBSTRATE — server-side weather proxy for Cleveland, OH (Eastern).
// The OpenWeatherMap key lives ONLY on the server (OWM_KEY, never NEXT_PUBLIC_*),
// so it is never inlined into the client bundle. If the key is missing or the
// upstream call fails we return a mocked baseline so the canvas always works.

export const revalidate = 600;

type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'snow';

interface ClevelandWeather {
  temp: number;
  condition: WeatherCondition;
  isDay: boolean;
}

const CLEVELAND = { lat: 41.4993, lon: -81.6944 };

// Cleveland is Eastern Time. Day = 06:00–20:00 local.
function clevelandIsDay(now: Date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  );
  return hour >= 6 && hour < 20;
}

function mapCondition(main: string): WeatherCondition {
  const m = main.toLowerCase();
  if (m.includes('snow')) return 'snow';
  if (m.includes('rain') || m.includes('drizzle')) return 'rain';
  if (m.includes('cloud')) return 'clouds';
  return 'clear';
}

export async function GET(): Promise<NextResponse<ClevelandWeather>> {
  const isDay = clevelandIsDay();
  const baseline: ClevelandWeather = { temp: 72, condition: 'rain', isDay };

  const key = process.env.OWM_KEY;
  if (!key) return NextResponse.json(baseline);

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather?lat=${CLEVELAND.lat}` +
      `&lon=${CLEVELAND.lon}&units=imperial&appid=${key}`;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return NextResponse.json(baseline);

    const data = (await res.json()) as {
      main?: { temp: number };
      weather?: Array<{ main: string }>;
    };
    const condition = mapCondition(data.weather?.[0]?.main ?? 'rain');
    return NextResponse.json({
      temp: Math.round(data.main?.temp ?? 72),
      condition,
      isDay,
    });
  } catch {
    return NextResponse.json(baseline);
  }
}
