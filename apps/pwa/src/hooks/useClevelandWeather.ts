'use client';

import { useEffect, useState } from 'react';

// KINETIC SUBSTRATE — real-time weather/time-of-day for Cleveland, OH (Eastern).
// Live conditions come from the server route /api/weather, which holds the
// OpenWeatherMap key server-side. No API key ever reaches the client bundle.

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

export function useClevelandWeather(): ClevelandWeather {
  const [weather, setWeather] = useState<ClevelandWeather>(() => ({
    temp: 72,
    condition: 'rain',
    isDay: true, // SSR-stable seed; corrected on mount
  }));

  useEffect(() => {
    setWeather((w) => ({ ...w, isDay: clevelandIsDay() }));

    const controller = new AbortController();
    fetch('/api/weather', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ClevelandWeather) => {
        setWeather({ temp: d.temp, condition: d.condition, isDay: d.isDay });
      })
      .catch(() => {
        /* keep the mocked baseline */
      });

    return () => controller.abort();
  }, []);

  return weather;
}
