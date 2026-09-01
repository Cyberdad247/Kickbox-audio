'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAudioDevices, type AudioInputDevice } from '../../hooks/useAudioDevices';

export interface MicrophoneSelectDropdownProps {
  className?: string;
  compact?: boolean;
}

export function MicrophoneSelectDropdown({
  className = '',
  compact = false,
}: MicrophoneSelectDropdownProps) {
  const {
    devices,
    selectedDeviceId,
    selectedDevice,
    selectDevice,
    refreshDevices,
    isScanning,
    hasMultipleDevices,
  } = useAudioDevices();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleDeviceSelect = (device: AudioInputDevice) => {
    selectDevice(device.deviceId);
    setIsOpen(false);
  };

  const handleRescan = (e: React.MouseEvent) => {
    e.stopPropagation();
    void refreshDevices(true);
  };

  // Truncate device name cleanly for header display
  const cleanLabel = (raw: string) => {
    return raw
      .replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)/g, '')
      .replace(/Default - /i, '')
      .trim();
  };

  const currentDisplayName = cleanLabel(selectedDevice?.label || 'Default Microphone');

  return (
    <div
      ref={dropdownRef}
      id="microphone-select-dropdown-root"
      className={`relative inline-flex items-center select-none ${className}`}
    >
      {/* Dropdown Toggle Button */}
      <button
        type="button"
        id="microphone-select-toggle-button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Audio Input: ${currentDisplayName} (${devices.length} available)`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group relative flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition-all duration-200 ${
          isOpen
            ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
            : hasMultipleDevices
              ? 'border-white/20 bg-white/5 text-white/80 hover:border-[#00F0FF]/60 hover:bg-[#00F0FF]/10 hover:text-white'
              : 'border-white/10 bg-black/40 text-white/60 hover:border-white/25 hover:text-white/80'
        }`}
      >
        <span className="text-xs shrink-0">🎤</span>

        {!compact && (
          <span className="font-mono text-[10px] tracking-tight max-w-[110px] sm:max-w-[140px] truncate text-left">
            {currentDisplayName}
          </span>
        )}

        {/* Multi-mic Badge */}
        {devices.length > 1 && (
          <span
            id="multi-microphone-badge"
            className="flex items-center justify-center rounded-full bg-[#00F0FF]/20 px-1 py-0.2 font-mono text-[8px] font-bold text-[#00F0FF] border border-[#00F0FF]/30"
          >
            {devices.length}
          </span>
        )}

        {/* Chevron Indicator */}
        <span
          className={`text-[9px] text-white/40 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#00F0FF]' : 'group-hover:text-white/70'
          }`}
        >
          ▼
        </span>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          id="microphone-select-menu"
          role="listbox"
          aria-label="Microphone input selection"
          className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-white/15 bg-[#0D091A]/95 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(0,240,255,0.15)] backdrop-blur-2xl animate-snap-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🎙️</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/70">
                Microphone Input
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[8px] text-[#00F0FF]">
                {devices.length} {devices.length === 1 ? 'device' : 'devices'}
              </span>
            </div>

            <button
              type="button"
              id="rescan-microphones-button"
              onClick={handleRescan}
              disabled={isScanning}
              title="Rescan audio devices and verify permissions"
              className="flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/60 hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/15 hover:text-[#00F0FF] transition-all"
            >
              <span className={isScanning ? 'animate-spin' : ''}>🔄</span>
              <span>{isScanning ? 'Scanning...' : 'Rescan'}</span>
            </button>
          </div>

          {/* Device list */}
          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-white/20">
            {devices.map((device, idx) => {
              const isSelected =
                device.deviceId === selectedDeviceId ||
                (selectedDeviceId === 'default' && device.isDefault);

              const formattedName = cleanLabel(device.label);

              return (
                <button
                  key={device.deviceId || `mic-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  id={`mic-option-${device.deviceId || idx}`}
                  onClick={() => handleDeviceSelect(device)}
                  className={`w-full group flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all duration-150 ${
                    isSelected
                      ? 'border border-[#00F0FF]/50 bg-[#00F0FF]/15 text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'border border-transparent bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]'
                          : 'bg-white/20 group-hover:bg-white/40'
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`font-mono text-[11px] truncate leading-tight ${
                          isSelected ? 'font-semibold text-[#00F0FF]' : 'text-white/80'
                        }`}
                      >
                        {formattedName}
                      </span>
                      <span className="font-mono text-[8px] text-white/40 leading-none mt-0.5">
                        {device.isDefault
                          ? 'System Default Device'
                          : idx === 0
                            ? 'Primary Input Device'
                            : `Hardware Audio Stream #${idx + 1}`}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="shrink-0 font-mono text-xs font-bold text-[#00F0FF]">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Helper Note */}
          <div className="mt-2.5 border-t border-white/5 pt-2 px-1 flex items-center justify-between text-[9px] font-mono text-white/40">
            <span>⚡ Instant switch: no reload required</span>
            <span className="text-[#00F0FF]/70">Auto-saved</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MicrophoneSelectDropdown;
