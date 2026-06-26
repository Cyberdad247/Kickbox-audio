'use client';

import { useEffect, useState } from 'react';

// KINETIC SUBSTRATE — real-time weather/time-of-day for Cleveland, OH (Eastern).
// Conditions are mocked today; drop an OpenWeatherMap key into NEXT_PUBLIC_OWM_KEY
// and the fetch path below activates with zero call-site changes.

export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'snow';

export interface ClevelandWeather {
  temp: number;
  condition: WeatherCondition;
  isDay: boolean;
}

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

const CLEVELAND = { lat: 41.4993, lon: -81.6944 };

export function useClevelandWeather(): ClevelandWeather {
  const [weather, setWeather] = useState<ClevelandWeather>(() => ({
    temp: 72,
    condition: 'rain',
    isDay: true, // SSR-stable seed; corrected on mount
  }));

  useEffect(() => {
    setWeather((w) => ({ ...w, isDay: clevelandIsDay() }));

    const key = process.env.NEXT_PUBLIC_OWM_KEY;
    if (!key) return;

    const url =
      `https://api.openweathermap.org/data/2.5/weather?lat=${CLEVELAND.lat}` +
      `&lon=${CLEVELAND.lon}&units=imperial&appid=${key}`;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { main?: { temp: number }; weather?: Array<{ main: string }> }) => {
        const main = d.weather?.[0]?.main?.toLowerCase() ?? 'rain';
        const condition: WeatherCondition = main.includes('snow')
          ? 'snow'
          : main.includes('rain') || main.includes('drizzle')
            ? 'rain'
            : main.includes('cloud')
              ? 'clouds'
              : 'clear';
        setWeather({ temp: Math.round(d.main?.temp ?? 72), condition, isDay: clevelandIsDay() });
      })
      .catch(() => {
        /* keep the mocked baseline */
      });

    return () => controller.abort();
  }, []);

  return weather;
}
