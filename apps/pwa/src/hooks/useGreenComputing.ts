'use client';

import { useEffect, useState } from 'react';

export interface BatteryAndVisibilityState {
  isTabVisible: boolean;
  batteryLevel: number | null;
  isLowPowerMode: boolean;
  targetFps: number;
}

export function useGreenComputing(): BatteryAndVisibilityState {
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(true);

  // Monitor visibility state
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Monitor battery API
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as unknown as { getBattery: () => Promise<BatteryManager> })
        .getBattery()
        .then((battery) => {
          setBatteryLevel(battery.level);
          setIsCharging(battery.charging);

          battery.addEventListener('levelchange', () => setBatteryLevel(battery.level));
          battery.addEventListener('chargingchange', () => setIsCharging(battery.charging));
        })
        .catch(() => {});
    }
  }, []);

  const isLowPowerMode =
    (!isCharging && batteryLevel !== null && batteryLevel < 0.2) || !isTabVisible;
  const targetFps = !isTabVisible ? 10 : isLowPowerMode ? 24 : 60;

  return {
    isTabVisible,
    batteryLevel,
    isLowPowerMode,
    targetFps,
  };
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}
