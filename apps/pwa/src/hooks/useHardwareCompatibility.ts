'use client';

import { useEffect, useState } from 'react';

export interface HardwareProfile {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  isLowPowerDevice: boolean;
  cpuCores: number;
  deviceMemoryGB: number;
  gpuRenderer: string;
  hasWebRTC: boolean;
  hasAudioContext: boolean;
  viewportWidth: number;
  viewportHeight: number;
  orientation: 'portrait' | 'landscape';
  tier: 'edge-mobile' | 'compact-tablet' | 'desktop-sovereign';
}

export function useHardwareCompatibility(): HardwareProfile {
  const [profile, setProfile] = useState<HardwareProfile>(() => {
    return {
      isMobile: false,
      isTablet: false,
      isTouch: false,
      isLowPowerDevice: false,
      cpuCores: 4,
      deviceMemoryGB: 8,
      gpuRenderer: 'Standard Core',
      hasWebRTC: true,
      hasAudioContext: true,
      viewportWidth: 1280,
      viewportHeight: 800,
      orientation: 'landscape',
      tier: 'desktop-sovereign',
    };
  });

  useEffect(() => {
    const evaluateHardware = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobile = width < 768 || (isTouch && width < 900 && height > width);
      const isTablet = (width >= 768 && width < 1024) || (isTouch && width >= 900);
      const orientation = height > width ? 'portrait' : 'landscape';

      // Concurrency & Memory detection
      const cpuCores = navigator.hardwareConcurrency || 4;
      const deviceMemoryGB =
        (navigator as unknown as { deviceMemory?: number }).deviceMemory || (isMobile ? 4 : 8);

      // Low power heuristic
      const isLowPowerDevice = isMobile || cpuCores <= 4 || deviceMemoryGB < 6;

      // WebGL Renderer check for GPU capability
      let gpuRenderer = 'Hardware Accelerated';
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            gpuRenderer =
              (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ||
              'WebGL Standard';
          }
        }
      } catch {
        gpuRenderer = 'Software Fallback';
      }

      // Audio & WebRTC capability check
      const hasAudioContext =
        typeof window !== 'undefined' &&
        ('AudioContext' in window || 'webkitAudioContext' in window);
      const hasWebRTC = typeof window !== 'undefined' && 'RTCPeerConnection' in window;

      let tier: 'edge-mobile' | 'compact-tablet' | 'desktop-sovereign' = 'desktop-sovereign';
      if (isMobile) {
        tier = 'edge-mobile';
      } else if (isTablet) {
        tier = 'compact-tablet';
      }

      setProfile({
        isMobile,
        isTablet,
        isTouch,
        isLowPowerDevice,
        cpuCores,
        deviceMemoryGB,
        gpuRenderer,
        hasWebRTC,
        hasAudioContext,
        viewportWidth: width,
        viewportHeight: height,
        orientation,
        tier,
      });
    };

    evaluateHardware();
    window.addEventListener('resize', evaluateHardware);
    window.addEventListener('orientationchange', evaluateHardware);

    return () => {
      window.removeEventListener('resize', evaluateHardware);
      window.removeEventListener('orientationchange', evaluateHardware);
    };
  }, []);

  return profile;
}
