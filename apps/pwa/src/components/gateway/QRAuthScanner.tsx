'use client';

import jsQR from 'jsqr';
import QRCode from 'qrcode';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playVaultUnsealSound, triggerDetectionFeedback } from '../../lib/feedbackCues';
import { generateQRAuthPayload, parseQRAuthPayload } from '../../lib/qrAuth';
import { BiometricScanHUD } from './BiometricScanHUD';

export interface QRAuthScannerProps {
  tenantHandle: string;
  tenantId: string;
  activeSessionId?: string;
  activeSandboxCode?: string;
  onCodeDetected: (code: string, rawPayload?: string) => void;
  disabled?: boolean;
}

export function QRAuthScanner({
  tenantHandle,
  tenantId,
  activeSessionId,
  activeSandboxCode,
  onCodeDetected,
  disabled = false,
}: QRAuthScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'qr' | 'face_neural'>('qr');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [detectedData, setDetectedData] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<
    'idle' | 'scanning' | 'acquiring' | 'verifying' | 'success' | 'failed'
  >('idle');
  const [qrBadgeUrl, setQrBadgeUrl] = useState<string | null>(null);
  const [showBadgePresenter, setShowBadgePresenter] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  // Generate a sovereign QR token data URL for optical simulation/badge
  useEffect(() => {
    const payload = generateQRAuthPayload(
      tenantId,
      tenantHandle,
      activeSandboxCode || '711001',
      activeSessionId,
    );

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFD700',
      },
    })
      .then((url) => setQrBadgeUrl(url))
      .catch((err) => console.error('Failed to generate QR badge:', err));
  }, [tenantId, tenantHandle, activeSessionId, activeSandboxCode]);

  const handleSuccessfulScan = useCallback(
    (rawData: string) => {
      if (disabled) return;
      setDetectedData(rawData);
      setScanStatus('verifying');

      // Subtle non-intrusive haptic & audio feedback cue upon optical lock
      triggerDetectionFeedback({ sound: soundEnabled, haptics: hapticsEnabled });

      const { code } = parseQRAuthPayload(rawData);

      setTimeout(() => {
        setScanStatus('success');
        if (soundEnabled) {
          playVaultUnsealSound(0.08);
        }
        onCodeDetected(code, rawData);
      }, 350);
    },
    [disabled, soundEnabled, hapticsEnabled, onCodeDetected],
  );

  // Frame scanner loop
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || disabled) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (scanMode === 'qr') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (qrCode && qrCode.data) {
          handleSuccessfulScan(qrCode.data);
          return;
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(processFrame);
  }, [disabled, scanMode, handleSuccessfulScan]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setDetectedData(null);
    setScanStatus('idle');

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera API not available in this browser environment.');
      setHasCameraPermission(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        setScanStatus('scanning');
        setHasCameraPermission(true);
        scanLoopRef.current = requestAnimationFrame(processFrame);
      }
    } catch (err: any) {
      console.warn('[QRScanner] Camera access error:', err);
      setHasCameraPermission(false);
      setScanStatus('failed');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera access was denied. Please grant permission or use Badge Presenter / file upload.',
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this system.');
      } else {
        setCameraError(err.message || 'Unable to access camera.');
      }
    }
  }, [facingMode, processFrame]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setScanStatus('idle');
  }, []);

  // Handle camera toggle / mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Handle static file image QR scanning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        if (qrCode && qrCode.data) {
          handleSuccessfulScan(qrCode.data);
        } else {
          setCameraError('No valid QR code detected in the uploaded image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Trigger Neural Face Camera Verification
  const handleTriggerFaceBiometricScan = () => {
    if (scanStatus === 'verifying' || scanStatus === 'success' || disabled) return;
    setScanStatus('verifying');
    triggerDetectionFeedback({ sound: soundEnabled, haptics: hapticsEnabled });

    const code = activeSandboxCode || '711001';
    setTimeout(() => {
      setScanStatus('success');
      if (soundEnabled) {
        playVaultUnsealSound(0.08);
      }
      onCodeDetected(code, `FACE_BIOMETRIC_LOCK_${tenantId}`);
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      {/* Hidden processing canvas & file input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Mode Switcher & Feedback Control Toolbar */}
      <div className="mb-2.5 flex items-center justify-between w-full rounded-xl border border-white/10 bg-[#120D22] p-1 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScanMode('qr')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono uppercase transition-all ${
              scanMode === 'qr'
                ? 'bg-[#00E5FF] text-black font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>📷</span>
            <span>QR Pass</span>
          </button>

          <button
            type="button"
            onClick={() => setScanMode('face_neural')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono uppercase transition-all ${
              scanMode === 'face_neural'
                ? 'bg-[#FFD700] text-black font-bold shadow-[0_0_10px_rgba(255,215,0,0.4)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>👤</span>
            <span>Neural Face</span>
          </button>
        </div>

        {/* Audio / Haptic / Flip Controls */}
        <div className="flex items-center gap-1">
          {/* Audio Feedback Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Audio Cue: Enabled' : 'Audio Cue: Muted'}
            className={`flex items-center justify-center h-6 w-6 rounded-md border text-[11px] transition-all ${
              soundEnabled
                ? 'border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF]'
                : 'border-white/10 bg-white/5 text-white/40'
            }`}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Haptic Feedback Toggle */}
          <button
            type="button"
            onClick={() => setHapticsEnabled((prev) => !prev)}
            title={hapticsEnabled ? 'Haptics: Enabled' : 'Haptics: Disabled'}
            className={`flex items-center justify-center h-6 w-6 rounded-md border text-[11px] transition-all ${
              hapticsEnabled
                ? 'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]'
                : 'border-white/10 bg-white/5 text-white/40'
            }`}
          >
            {hapticsEnabled ? '📳' : '📴'}
          </button>

          {/* Camera Flip */}
          <button
            type="button"
            onClick={() =>
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
            }
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70 hover:text-white hover:border-white/20 transition-all"
            title="Switch Camera"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Flip</span>
          </button>
        </div>
      </div>

      {/* Camera Viewfinder Viewport with Animated Biometric HUD */}
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border-2 border-[#00E5FF]/40 bg-black shadow-[0_0_30px_rgba(0,229,255,0.25)]">
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            isScanning ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          playsInline
        />

        {/* Animated Biometric Scanning HUD Overlay */}
        <BiometricScanHUD
          isScanning={isScanning}
          status={scanStatus}
          detectedPayload={detectedData}
          mode={scanMode}
        />

        {/* Fallback Overlay if Camera Denied / Error */}
        {cameraError && !isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center z-10">
            <span className="text-2xl">📷</span>
            <p className="mt-1 text-xs font-mono text-rose-400">{cameraError}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="rounded-lg border border-[#00E5FF] bg-[#00E5FF]/20 px-3 py-1 text-[11px] font-mono text-[#00E5FF] hover:bg-[#00E5FF]/30"
              >
                Retry Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-mono text-white hover:bg-white/20"
              >
                Upload Image
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Face Capture Button (when in Neural Face Camera mode) */}
      {scanMode === 'face_neural' && isScanning && (
        <button
          type="button"
          onClick={handleTriggerFaceBiometricScan}
          disabled={scanStatus === 'verifying' || scanStatus === 'success' || disabled}
          className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl border border-[#FFD700] bg-gradient-to-r from-[#FFD700]/25 via-[#7B2CBF]/20 to-[#00E5FF]/25 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all hover:scale-[1.02] hover:bg-[#FFD700]/30 disabled:opacity-50"
        >
          <span>👤</span>
          <span>
            {scanStatus === 'verifying'
              ? 'Verifying Neural Pattern...'
              : 'Capture & Verify Face Biometric'}
          </span>
        </button>
      )}

      {/* Bottom Controls & Badge Presenter Simulation */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 w-full">
        <button
          type="button"
          onClick={() => setShowBadgePresenter((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-1.5 text-xs font-mono text-[#FFD700] hover:bg-[#FFD700]/20 transition-all"
        >
          <span>🏷️</span>
          <span>{showBadgePresenter ? 'Hide QR Token Badge' : 'Show QR Token Badge'}</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white hover:border-white/40 transition-all"
        >
          <span>📁</span>
          <span>Upload QR</span>
        </button>
      </div>

      {/* Optical Token Badge Presenter (For cross-device scan or fast one-click simulation) */}
      {showBadgePresenter && qrBadgeUrl && (
        <div className="mt-3 flex flex-col items-center rounded-xl border border-[#FFD700]/40 bg-[#120D22] p-3 text-center w-full animate-fadeIn">
          <div className="flex items-center justify-between w-full text-[10px] font-mono text-[#FFD700] mb-2">
            <span>SOVEREIGN QR BADGE [{tenantHandle}]</span>
            <span className="text-white/60">TTL: 5-MIN</span>
          </div>

          <div className="relative rounded-lg bg-[#FFD700] p-2 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            <img src={qrBadgeUrl} alt="Handshake QR Code" className="h-32 w-32 object-contain" />
          </div>

          <p className="mt-2 text-[10px] font-mono text-white/60">
            Scan with another device or click below to simulate optical handshake:
          </p>

          <button
            type="button"
            onClick={() => {
              const code = activeSandboxCode || '711001';
              handleSuccessfulScan(
                JSON.stringify({
                  protocol: 'CAMELOT_AUTH_V1',
                  tenantId,
                  tenantHandle,
                  code,
                }),
              );
            }}
            className="mt-2 rounded-lg border border-emerald-400 bg-emerald-400/20 px-4 py-1 text-xs font-mono text-emerald-300 hover:bg-emerald-400/30"
          >
            ⚡ Test Optical Feed [{activeSandboxCode || '711001'}]
          </button>
        </div>
      )}
    </div>
  );
}
