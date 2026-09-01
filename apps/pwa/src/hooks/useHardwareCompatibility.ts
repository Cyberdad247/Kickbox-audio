'use client';

import { useEffect, useState, useCallback } from 'react';

export type DeviceCategory = 'mobile' | 'tablet' | 'pc';

export interface HardwareProfile {
  isMobile: boolean;
  isTablet: boolean;
  isPC: boolean;
  deviceCategory: DeviceCategory;
  isTouch: boolean;
  touchPoints: number;
  isLowPowerDevice: boolean;
  isEmbedded: boolean;
  isStandalonePWA: boolean;
  cpuCores: number;
  deviceMemoryGB: number;
  gpuRenderer: string;
  hasWebRTC: boolean;
  hasAudioContext: boolean;
  viewportWidth: number;
  viewportHeight: number;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  colorDepth: number;
  aspectRatio: string;
  pointerType: 'touch' | 'mouse' | 'fine';
  orientation: 'portrait' | 'landscape';
  tier: 'edge-mobile' | 'compact-tablet' | 'desktop-sovereign';
  hardwareReportString: string;
}

export function useHardwareCompatibility(): HardwareProfile {
  const [profile, setProfile] = useState<HardwareProfile>(() => {
    const isClient = typeof window !== 'undefined';
    const width = isClient ? window.innerWidth : 1280;
    const height = isClient ? window.innerHeight : 800;
    const isEmbedded = isClient ? window.self !== window.top : false;

    return {
      isMobile: false,
      isTablet: false,
      isPC: true,
      deviceCategory: 'pc',
      isTouch: false,
      touchPoints: 0,
      isLowPowerDevice: false,
      isEmbedded,
      isStandalonePWA: false,
      cpuCores: 4,
      deviceMemoryGB: 8,
      gpuRenderer: 'Standard Core',
      hasWebRTC: true,
      hasAudioContext: true,
      viewportWidth: width,
      viewportHeight: height,
      screenWidth: isClient && window.screen ? window.screen.width : 1920,
      screenHeight: isClient && window.screen ? window.screen.height : 1080,
      pixelRatio: isClient ? window.devicePixelRatio || 1 : 1,
      colorDepth: isClient && window.screen ? window.screen.colorDepth || 24 : 24,
      aspectRatio: '16:9',
      pointerType: 'fine',
      orientation: 'landscape',
      tier: 'desktop-sovereign',
      hardwareReportString: 'PC [1280x800] 1.0x DPR',
    };
  });

  useEffect(() => {
    const evaluateHardware = () => {
      if (typeof window === 'undefined') return;

      const vWidth = window.innerWidth;
      const vHeight = window.innerHeight;
      const sWidth = window.screen ? window.screen.width : vWidth;
      const sHeight = window.screen ? window.screen.height : vHeight;
      const dpr = window.devicePixelRatio || 1;
      const colorDepth = window.screen ? window.screen.colorDepth || 24 : 24;

      // Touch & Pointer Capabilities
      const touchPoints = navigator.maxTouchPoints || 0;
      const isTouch = 'ontouchstart' in window || touchPoints > 0;
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      const pointerType: 'touch' | 'mouse' | 'fine' = isTouch && !hasFinePointer ? 'touch' : hasFinePointer ? 'fine' : 'mouse';

      // Embedding & PWA standalone status
      let isEmbedded = false;
      try {
        isEmbedded = window.self !== window.top;
      } catch {
        isEmbedded = true;
      }

      const isStandalonePWA =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      // Hardware Device Category Classification:
      // Mobile: viewport width < 768px OR (touch device with portrait width < 900)
      // Tablet: viewport width >= 768px & < 1024px OR (touch device with width >= 768 && width <= 1366 in tablet touch modes)
      // PC: viewport width >= 1024px with fine pointer / desktop resolution
      let deviceCategory: DeviceCategory = 'pc';
      let isMobile = false;
      let isTablet = false;
      let isPC = false;

      if (vWidth < 768 || (isTouch && vWidth < 900 && vHeight > vWidth)) {
        deviceCategory = 'mobile';
        isMobile = true;
      } else if ((vWidth >= 768 && vWidth < 1024) || (isTouch && vWidth >= 768 && vWidth <= 1280)) {
        deviceCategory = 'tablet';
        isTablet = true;
      } else {
        deviceCategory = 'pc';
        isPC = true;
      }

      const orientation: 'portrait' | 'landscape' = vHeight > vWidth ? 'portrait' : 'landscape';

      // Aspect Ratio calculation
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(Math.round(vWidth), Math.round(vHeight));
      const aspectW = Math.round(vWidth / g);
      const aspectH = Math.round(vHeight / g);
      const aspectRatio =
        aspectW > 20 || aspectH > 20
          ? `${(vWidth / vHeight).toFixed(2)}:1`
          : `${aspectW}:${aspectH}`;

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

      const hardwareReportString = `${deviceCategory.toUpperCase()} [${vWidth}×${vHeight}] (${dpr.toFixed(1)}x DPR, Screen ${sWidth}×${sHeight})`;

      setProfile({
        isMobile,
        isTablet,
        isPC,
        deviceCategory,
        isTouch,
        touchPoints,
        isLowPowerDevice,
        isEmbedded,
        isStandalonePWA,
        cpuCores,
        deviceMemoryGB,
        gpuRenderer,
        hasWebRTC,
        hasAudioContext,
        viewportWidth: vWidth,
        viewportHeight: vHeight,
        screenWidth: sWidth,
        screenHeight: sHeight,
        pixelRatio: dpr,
        colorDepth,
        aspectRatio,
        pointerType,
        orientation,
        tier,
        hardwareReportString,
      });

      // Notify parent iframe container of viewport and hardware status if embedded
      if (isEmbedded && window.parent) {
        try {
          window.parent.postMessage(
            {
              type: 'CAMELOT_EMBED_VIEWPORT_SYNC',
              payload: {
                deviceCategory,
                viewportWidth: vWidth,
                viewportHeight: vHeight,
                dpr,
                orientation,
                timestamp: Date.now(),
              },
            },
            '*'
          );
        } catch {
          // ignore postMessage boundary errors
        }
      }
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
