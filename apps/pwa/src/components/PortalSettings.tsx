'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useCopilotReadable } from '../lib/portalBridge';

// Lakisha System Configuration surface. Reads from CopilotKit context once
// `@copilotkit/react-core` is installed; today it binds to a local shim and
// persists nothing server-side (Camelot privacy rule: API keys NEVER stored as
// actual values, only boolean presence flags in `config.json`).
//
// Currently UNMOUNTED in `apps/pwa/src/app/page.tsx` per the Lakisha-only
// directive; import when ready to wire configuration into the dashboard layer.

type ConfigDraft = {
  twilioSid: string;
  gmailAddress: string;
  videoConference: string;
};

const EMPTY_DRAFT: ConfigDraft = {
  twilioSid: '',
  gmailAddress: '',
  videoConference: '',
};

export function PortalSettings() {
  const [draft, setDraft] = useState<ConfigDraft>(EMPTY_DRAFT);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Expose the current draft to the Copilot context (no-op until CopilotKit lands).
  useCopilotReadable('portal-settings-draft', draft);

  const onChange = (key: keyof ConfigDraft) => (e: ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const onCommit = (e: FormEvent) => {
    e.preventDefault();
    // Privacy rule: never persist credentials; presence-only flags live in `config.json`.
    setSavedAt(new Date().toISOString());
    setDraft(EMPTY_DRAFT);
  };

  return (
    <section className="border border-filigree-500/40 bg-plate-900/95 p-6 text-white backdrop-blur-plate">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-sm tracking-executive text-gold-royal">
          System Configuration
        </h2>
        {savedAt && (
          <time
            dateTime={savedAt}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40"
          >
            committed · {savedAt.slice(11, 19)}Z
          </time>
        )}
      </header>
      <form onSubmit={onCommit} className="space-y-3 font-mono text-sm">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-gold-light">
            Twilio SID
          </span>
          <input
            value={draft.twilioSid}
            onChange={onChange('twilioSid')}
            placeholder="AC…"
            className="mt-1 w-full border border-white/10 bg-void-950 px-3 py-2 text-white placeholder:text-white/25 focus:border-violet focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-gold-light">
            Gmail Auth
          </span>
          <input
            value={draft.gmailAddress}
            onChange={onChange('gmailAddress')}
            placeholder="clark@kickbox.audio"
            className="mt-1 w-full border border-white/10 bg-void-950 px-3 py-2 text-white placeholder:text-white/25 focus:border-violet focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-gold-light">
            Video Bridge
          </span>
          <input
            value={draft.videoConference}
            onChange={onChange('videoConference')}
            placeholder="sfu://kickbox-audio/room"
            className="mt-1 w-full border border-white/10 bg-void-950 px-3 py-2 text-white placeholder:text-white/25 focus:border-violet focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-none border border-gold/60 bg-violet/15 px-4 py-2 font-serif text-sm tracking-executive text-gold-light transition-colors hover:bg-violet/30"
        >
          Commit Changes
        </button>
      </form>
    </section>
  );
}
