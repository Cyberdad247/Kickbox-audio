'use client';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useLakishaVoice } from '../../hooks/useLakishaVoice';
import { LakishaAvatar } from './LakishaAvatar';

// Ambassador Lakisha — draggable video-avatar presence (bottom-left by default)
// with a short speak-or-text bar attached directly under the video frame. This
// is now the ONLY Lakisha input surface (replaces the old bottom-center HUD):
// toggle-listen recognition + VAD failsafe, or type — client's choice.
export function LakishaEnclave() {
  const { connected } = useBifrost();
  const {
    input,
    setInput,
    listening,
    recognitionSupported,
    speaking,
    toggleListening,
    dispatch,
  } = useLakishaVoice();

  // Draggable HUD state — same pattern as LakeishaVideoHUD, so both widgets move alike.
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('button, input, form');

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isInteractiveTarget(e.target)) return;
    setDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  }, []);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isInteractiveTarget(e.target)) return;
    setDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStartRef.current.x, y: touch.clientY - dragStartRef.current.y });
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(input);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      className="fixed bottom-8 left-8 z-[60] flex flex-col items-start select-none"
    >
      <LakishaAvatar speaking={speaking} connected={connected} />

      {/* Attached speak-or-text bar — same width as the avatar frame, no gap,
          shared top border dropped so the two read as one card. */}
      <form
        onSubmit={submit}
        className="flex w-56 items-center gap-1.5 border border-t-0 border-gold/50 bg-smoke-900/85 px-2.5 py-2 backdrop-blur-md shadow-gold"
      >
        {recognitionSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Speak to Lakisha'}
            className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
              listening
                ? 'border-violet bg-violet/20 text-violet-light'
                : 'border-gold/40 text-gold-light hover:bg-white/5'
            }`}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-violet/30" />}
            <MicIcon className="h-3.5 w-3.5" />
          </button>
        )}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? 'Listening…' : 'Speak or type…'}
          className="w-full min-w-0 rounded-sm border border-white/10 bg-obsidian px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-violet focus:outline-none"
        />

        <button
          type="submit"
          disabled={!connected || !input.trim()}
          aria-label="Send"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet text-white transition-opacity disabled:opacity-40"
        >
          <SendIcon className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12 20 4l-6 16-3-7-7-3Z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
