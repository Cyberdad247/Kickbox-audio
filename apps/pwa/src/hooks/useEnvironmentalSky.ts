import { useEffect, useState } from 'react';

export type WeatherCondition = 'clear' | 'rain' | 'snow' | 'fog' | 'cloudy';

export interface EnvironmentalSkyState {
  skyGradient: string;
  timePeriod: 'dawn' | 'day' | 'excalibur_glow' | 'night';
  weatherOverlay: WeatherCondition;
  temperature: number;
  locationName: string;
  hour: number;
  minute: number;
  refreshWeather: () => void;
}

export const useEnvironmentalSky = (): EnvironmentalSkyState => {
  const [skyGradient, setSkyGradient] = useState<string>(
    'linear-gradient(to bottom, #0A0A16, #001224)',
  );
  const [timePeriod, setTimePeriod] = useState<'dawn' | 'day' | 'excalibur_glow' | 'night'>(
    'night',
  );
  const [weatherOverlay, setWeatherOverlay] = useState<WeatherCondition>('clear');
  const [temperature, setTemperature] = useState<number>(21);
  const [locationName, setLocationName] = useState<string>('Citadel Prime');
  const [timeState, setTimeState] = useState<{ hour: number; minute: number }>({
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
  });

  const updateSky = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    setTimeState({ hour, minute });

    // Stage 6.1: Time-of-Day Sync
    if (hour >= 5 && hour < 8) {
      // Dawn (05:00-07:59): Deep magenta/pink sunrise
      setTimePeriod('dawn');
      setSkyGradient('linear-gradient(180deg, #1A0B2E 0%, #4A00E0 35%, #9D4EDD 70%, #FF007F 100%)');
    } else if (hour >= 8 && hour < 16) {
      // Day (08:00-15:59): High-cyan azure sky with floating neon clouds
      setTimePeriod('day');
      setSkyGradient('linear-gradient(180deg, #021B38 0%, #004D80 40%, #00A3B0 80%, #00F0FF 100%)');
    } else if (hour >= 16 && hour < 20) {
      // Golden Hour (16:00-19:59): Burnt orange/golden hour (The Excalibur Glow)
      setTimePeriod('excalibur_glow');
      setSkyGradient('linear-gradient(180deg, #1A090D 0%, #4D1A00 35%, #B8860B 75%, #FFD700 100%)');
    } else {
      // Night (20:00-04:59): Deep indigo void with moving neon stars
      setTimePeriod('night');
      setSkyGradient('linear-gradient(180deg, #05050A 0%, #0A0A18 45%, #120D22 80%, #0A0A0A 100%)');
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) throw new Error('Weather API unreachable');
      const data = await res.json();
      const current = data.current_weather;
      if (current) {
        setTemperature(Math.round(current.temperature));
        const code = current.weathercode;
        if (code >= 51 && code <= 67) {
          setWeatherOverlay('rain');
        } else if (code >= 71 && code <= 77) {
          setWeatherOverlay('snow');
        } else if (code >= 45 && code <= 48) {
          setWeatherOverlay('fog');
        } else if (code >= 1 && code <= 3) {
          setWeatherOverlay('cloudy');
        } else if (code >= 80 && code <= 99) {
          setWeatherOverlay('rain');
        } else {
          setWeatherOverlay('clear');
        }
      }
    } catch {
      // Graceful fallback to default clear/local
      setWeatherOverlay('clear');
    }
  };

  const requestWeather = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocationName(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°W`);
          fetchWeather(latitude, longitude);
        },
        () => {
          // Default to London / Camelot coordinates on rejection
          fetchWeather(51.5074, -0.1278);
        },
        { timeout: 5000 },
      );
    }
  };

  useEffect(() => {
    updateSky();
    requestWeather();
    const interval = setInterval(updateSky, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    skyGradient,
    timePeriod,
    weatherOverlay,
    temperature,
    locationName,
    hour: timeState.hour,
    minute: timeState.minute,
    refreshWeather: requestWeather,
  };
};
