'use client';

import { type FormEvent, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';

export function LakishaHUD() {
  const { sendVoiceCommand, connected } = useBifrost();
  const [input, setInput] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    sendVoiceCommand(cmd);
    setInput('');
  };

  return (
    <form
      onSubmit={submit}
      className="fixed inset-x-0 bottom-0 border-gold/20 border-t bg-smoke-900/80 px-8 py-4 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <span className="font-display text-gold-light text-sm">Lakisha</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Speak a command… e.g. add transaction 15000"
          className="flex-1 rounded-lg border border-white/10 bg-obsidian px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet focus:shadow-glow focus:outline-none"
        />
        <button
          type="submit"
          disabled={!connected}
          className="rounded-lg bg-violet px-5 py-2.5 text-sm text-white shadow-glow transition-opacity disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </form>
  );
}
