'use client';

import { useCallback, useEffect, useState } from 'react';

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  groupId?: string;
  isDefault?: boolean;
}

const STORAGE_KEY = 'camelot_preferred_audio_device';

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Initialize selected device from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSelectedDeviceId(saved);
      }
    }
  }, []);

  const refreshDevices = useCallback(async (requestPermission = false) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return [];
    }

    setIsScanning(true);
    try {
      if (requestPermission) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          for (const track of tempStream.getTracks()) {
            track.stop();
          }
          setHasPermission(true);
        } catch (err) {
          console.warn('Microphone permission request failed or denied:', err);
        }
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');

      const formatted: AudioInputDevice[] = audioInputs.map((d, index) => {
        let label = d.label;
        if (!label) {
          label = index === 0 ? 'Primary Microphone' : `Microphone ${index + 1}`;
        }
        return {
          deviceId: d.deviceId,
          label,
          groupId: d.groupId,
          isDefault: d.deviceId === 'default' || index === 0,
        };
      });

      // Deduplicate devices by deviceId
      const unique = formatted.filter(
        (dev, idx, self) => idx === self.findIndex((t) => t.deviceId === dev.deviceId),
      );

      const finalDevices =
        unique.length > 0
          ? unique
          : [{ deviceId: 'default', label: 'Default System Microphone', isDefault: true }];

      setDevices(finalDevices);

      // Verify selectedDeviceId is valid, else fallback
      if (selectedDeviceId && selectedDeviceId !== 'default') {
        const found = finalDevices.some((d) => d.deviceId === selectedDeviceId);
        if (!found && finalDevices.length > 0) {
          setSelectedDeviceId('default');
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, 'default');
          }
        }
      }

      return finalDevices;
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [selectedDeviceId]);

  const selectDevice = useCallback(
    (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, deviceId);
        const selected = devices.find((d) => d.deviceId === deviceId);
        window.dispatchEvent(
          new CustomEvent('camelot:audio-device-changed', {
            detail: {
              deviceId,
              label: selected?.label || 'Default Microphone',
            },
          }),
        );
      }
    },
    [devices],
  );

  // Initial scan and device change listener
  useEffect(() => {
    refreshDevices();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      const handleDeviceChange = () => {
        refreshDevices();
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [refreshDevices]);

  const selectedDevice =
    devices.find((d) => d.deviceId === selectedDeviceId) ||
    devices[0] || {
      deviceId: 'default',
      label: 'Default Microphone',
      isDefault: true,
    };

  return {
    devices,
    selectedDeviceId,
    selectedDevice,
    selectDevice,
    refreshDevices,
    hasPermission,
    isScanning,
    hasMultipleDevices: devices.length > 1,
  };
}
