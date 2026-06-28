'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import type { Knight } from '../lib/realm-data';

interface LogLine {
  id: number;
  kind: 'sys' | 'out' | 'ack';
  text: string;
  t: string;
}

const stamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const dotClass: Record<Knight['status'], string> = {
  active: 'bg-violet shadow-glow',
  busy: 'bg-gold-royal',
  idle: 'bg-white/30',
};

export function KnightConsole({ knight, onClose }: { knight: Knight; onClose: () => void }) {
  const { sendVoiceCommand, connected } = useBifrost();
  const [input, setInput] = useState('');
  const idRef = useRef(3);
  const endRef = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState<LogLine[]>(() => [
    {
      id: 1,
      kind: 'sys',
      text: `${knight.name} online — ${knight.title} · ${knight.domain}`,
      t: stamp(),
    },
    { id: 2, kind: 'sys', text: knight.task, t: stamp() },
  ]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dispatch = (e: FormEvent) => {
    e.preventDefault();
    const directive = input.trim();
    if (!directive) return;
    const id = idRef.current;
    idRef.current += 2;
    sendVoiceCommand(`dispatch ${knight.id} ${directive}`);
    setLog((l) => [
      ...l,
      { id, kind: 'out', text: directive, t: stamp() },
      {
        id: id + 1,
        kind: 'ack',
        text: `${knight.name} acknowledged — routing through Bifrost.`,
        t: stamp(),
      },
    ]);
    setInput('');
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close console"
        onClick={onClose}
        className="absolute inset-0 bg-obsidian/70 backdrop-blur-sm"
      />
      <div className="relative w-[min(94vw,40rem)] border border-gold/60 bg-smoke-900/95 shadow-glow-lg">
        <div className="flex items-start justify-between border-gold/20 border-b px-6 py-4">
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-[0.2em]">Knight Console</p>
            <p className="mt-0.5 font-display text-2xl text-gold-royal tracking-minted">
              {knight.name}
            </p>
            <p className="text-[11px] text-white/40 uppercase tracking-[0.16em]">
              {knight.title} · {knight.domain}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-[10px] text-white/45 uppercase tracking-widest">
              <span className={`h-2 w-2 rounded-full ${dotClass[knight.status]}`} />
              {knight.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-white/40 text-xl leading-none transition-colors hover:text-white"
            >
              ×
            </button>
          </div>
        </div>

        <div className="h-72 overflow-y-auto px-6 py-4 text-sm">
          {log.map((line) => (
            <div key={line.id} className="flex gap-3 py-1">
              <span className="shrink-0 text-[11px] text-white/25 tabular-nums">{line.t}</span>
              <span
                className={
                  line.kind === 'out'
                    ? 'text-violet-light'
                    : line.kind === 'ack'
                      ? 'text-gold-light'
                      : 'text-white/55'
                }
              >
                {line.kind === 'out' ? '▸ ' : line.kind === 'ack' ? '✓ ' : '· '}
                {line.text}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={dispatch} className="flex gap-3 border-gold/20 border-t px-6 py-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Issue a directive to ${knight.name}…`}
            className="flex-1 rounded-sm border border-white/10 bg-obsidian px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet focus:outline-none"
          />
          <button
            type="submit"
            disabled={!connected}
            className="bg-violet px-5 py-2.5 text-sm text-white uppercase tracking-widest shadow-glow transition-opacity disabled:opacity-40"
          >
            Dispatch
          </button>
        </form>
      </div>
    </div>
  );
}
