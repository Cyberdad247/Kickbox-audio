'use client';

import { useState } from 'react';

interface EmailMessage {
  id: string;
  sender: string;
  subject: string;
  time: string;
  unread: boolean;
}

interface CameraFeed {
  id: string;
  name: string;
  status: 'ONLINE' | 'STANDBY' | 'MOTION_ALERT';
  fps: number;
}

interface LightControl {
  id: string;
  name: string;
  active: boolean;
  brightness: number;
}

interface ConflictItem {
  id: string;
  title: string;
  description: string;
  resolved: boolean;
  actionTaken?: string;
}

export function HomeTab() {
  // 1. Daily Aspects Checklist State
  const [aspects, setAspects] = useState([
    { id: 'asp-1', text: 'Secure Bifrost bridge heartbeat verified', checked: true },
    { id: 'asp-2', text: 'Cleveland weather parameters synced to WebGL terrain', checked: true },
    { id: 'asp-3', text: '10 micro-pills health checked by Sir Coda', checked: false },
    { id: 'asp-4', text: 'Stripe balance reconciled with Sophia Ledger Stone', checked: false },
  ]);

  // 2. Mock Email Inbox State (Aiden / Aaliyah dispatch)
  const [emails, setEmails] = useState<EmailMessage[]>([
    {
      id: 'msg-1',
      sender: 'Marcus Vance (Asset Guard)',
      subject: 'Sandusky renovation invoice verification required',
      time: '09:42 AM',
      unread: true,
    },
    {
      id: 'msg-2',
      sender: 'Isaiah Sterling (Streaming Watch)',
      subject: 'Decibel drift alert in Cleveland Heights listening room',
      time: '08:15 AM',
      unread: true,
    },
    {
      id: 'msg-3',
      sender: 'Elijah Sterling (Coffee Venture)',
      subject: 'Roasting yield forecasts for summer festival complete',
      time: 'Yesterday',
      unread: false,
    },
  ]);

  // 3. Home Lights State
  const [lights, setLights] = useState<LightControl[]>([
    { id: 'lt-1', name: 'Sovereign Office Downlights', active: true, brightness: 80 },
    { id: 'lt-2', name: 'Library Sconces', active: false, brightness: 50 },
    { id: 'lt-3', name: 'Foyer Chandelier', active: true, brightness: 90 },
  ]);

  // 4. Home Cameras State
  const [cameras] = useState<CameraFeed[]>([
    { id: 'cam-1', name: 'Driveway North Perimeter', status: 'ONLINE', fps: 30 },
    { id: 'cam-2', name: 'Sovereign Vault Entry', status: 'ONLINE', fps: 24 },
    { id: 'cam-3', name: 'Courtyard East Sconces', status: 'MOTION_ALERT', fps: 30 },
  ]);

  // 5. Research Search Widget State
  const [searchQuery, setSearchQuery] = useState('');
  const [researchResults, setResearchResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  // 6. Ticket Resolution State
  const [conflicts, setConflicts] = useState<ConflictItem[]>([
    {
      id: 'cf-1',
      title: 'Plumbing Repair late fee dispute',
      description: 'Gold Quarter Unit 4 tenant claims late fee was assessed during plumbing downtime.',
      resolved: false,
    },
  ]);

  const toggleAspect = (id: string) => {
    setAspects((prev) =>
      prev.map((asp) => (asp.id === id ? { ...asp, checked: !asp.checked } : asp))
    );
  };

  const markEmailRead = (id: string) => {
    setEmails((prev) =>
      prev.map((email) => (email.id === id ? { ...email, unread: false } : email))
    );
  };

  const toggleLight = (id: string) => {
    setLights((prev) =>
      prev.map((lt) => (lt.id === id ? { ...lt, active: !lt.active } : lt))
    );
  };

  const adjustBrightness = (id: string, val: number) => {
    setLights((prev) =>
      prev.map((lt) => (lt.id === id ? { ...lt, brightness: val } : lt))
    );
  };

  const handleResearchSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    // Simulating deep research search retrieval
    setTimeout(() => {
      setResearchResults([
        `[RESEARCH BRIEF] Cleveland Heights power grid load peaks at 14:00. Advise Jalen to shift heavy backup operations to 02:00.`,
        `[RESEARCH BRIEF] Sandusky city council proposed 1.5% tax incentive for local restoration projects. Nia should apply for Obsidian tower units.`,
      ]);
      setSearching(false);
    }, 800);
  };

  const addResearchToBriefings = async (text: string) => {
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      alert('Insight added to daily memory vault briefs!');
    } catch (err) {
      console.error(err);
    }
  };

  const resolveConflict = (id: string, action: string) => {
    setConflicts((prev) =>
      prev.map((cf) => (cf.id === id ? { ...cf, resolved: true, actionTaken: action } : cf))
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Row: Daily Aspects & Emails ──────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Aspects Checklist */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Daily Aspects Checklist
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Key operational tasks for Mr. & Ms. Clark
          </p>

          <ul className="mt-4 space-y-3">
            {aspects.map((asp) => (
              <li
                key={asp.id}
                onClick={() => toggleAspect(asp.id)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                    asp.checked
                      ? 'border-gold-royal bg-gold-royal text-[#050507]'
                      : 'border-gold/30 group-hover:border-violet'
                  }`}
                >
                  {asp.checked && <span className="text-[10px] font-bold">✓</span>}
                </div>
                <span
                  className={`font-mono text-xs transition-colors ${
                    asp.checked ? 'text-white/40 line-through' : 'text-white/80 group-hover:text-white'
                  }`}
                >
                  {asp.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Email Dispatcher (Aiden Raven Cross) */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Inbox Dispatcher
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Aiden Raven Cross triage loop
          </p>

          <ul className="mt-4 space-y-3">
            {emails.map((email) => (
              <li
                key={email.id}
                className={`p-3 border transition-colors flex justify-between items-start gap-4 ${
                  email.unread ? 'border-violet/40 bg-violet/5' : 'border-white/5 bg-[#050505]/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs text-white font-medium">{email.sender}</span>
                    <span className="font-mono text-[9px] text-white/40">{email.time}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-white/70">{email.subject}</p>
                </div>
                {email.unread && (
                  <button
                    type="button"
                    onClick={() => markEmailRead(email.id)}
                    className="border border-gold/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold-light hover:bg-violet/10 hover:text-violet-light"
                  >
                    Read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── Middle Row: Lights & Cameras ─────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Lights Automation */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Sovereign Lights
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Everyday lighting controls and dimming arrays
          </p>

          <div className="mt-4 space-y-4">
            {lights.map((lt) => (
              <div key={lt.id} className="flex flex-col gap-2 p-3 border border-white/5 bg-[#050505]/40">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-white/80">{lt.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleLight(lt.id)}
                    className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      lt.active
                        ? 'border-gold-royal bg-gold-royal text-[#050507]'
                        : 'border-white/20 text-white/40 hover:border-gold/40'
                    }`}
                  >
                    {lt.active ? 'ACTIVE' : 'MUTED'}
                  </button>
                </div>

                {lt.active && (
                  <div className="flex items-center gap-4 mt-2">
                    <span className="font-mono text-[9px] uppercase text-white/45">Brightness</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={lt.brightness}
                      onChange={(e) => adjustBrightness(lt.id, Number(e.target.value))}
                      className="flex-1 accent-gold-royal"
                    />
                    <span className="font-mono text-[10px] text-gold-light">{lt.brightness}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Security Cameras */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Security Camera Matrix
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Perimeter feeds and motion telemetry
          </p>

          <div className="mt-4 grid gap-4 grid-cols-3">
            {cameras.map((cam) => (
              <div key={cam.id} className="border border-white/5 bg-[#050505]/80 p-3 flex flex-col justify-between aspect-video relative overflow-hidden">
                {/* Visual Camera Scanline Decal */}
                <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(rgba(0,0,0,0.1)_0px,rgba(0,0,0,0.1)_1px,transparent_1px,transparent_2px)]" />

                <div className="flex justify-between items-start">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-white/45 truncate max-w-[80%]">
                    {cam.name}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>

                <div className="mt-4 flex justify-between items-end font-mono text-[8px]">
                  <span className={cam.status === 'MOTION_ALERT' ? 'text-violet-light font-bold' : 'text-white/40'}>
                    {cam.status}
                  </span>
                  <span className="text-white/45">{cam.fps} FPS</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Bottom Row: Research & Conflict Resolution ───────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Automatic Search Research Engine */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Research Engine
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Query deep intelligence to include in daily briefings
          </p>

          <form onSubmit={handleResearchSearch} className="mt-4 flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Cleveland Heights property tax incentives..."
              disabled={searching}
              className="flex-1 border border-gold/20 bg-[#050505] px-4 py-2 font-mono text-xs text-white placeholder-white/20 outline-none focus:border-violet/60"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="border border-gold/40 bg-[#050505]/75 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-gold-light hover:border-violet hover:text-violet-light disabled:opacity-40"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {researchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {researchResults.map((res, idx) => (
                <div key={idx} className="border border-white/5 bg-[#050505] p-3 flex justify-between items-start gap-4">
                  <p className="font-mono text-xs text-white/80 leading-relaxed">{res}</p>
                  <button
                    type="button"
                    onClick={() => addResearchToBriefings(res)}
                    className="shrink-0 border border-gold/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold-light hover:bg-gold-royal hover:text-[#050507]"
                  >
                    Add Brief
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ticket / Conflict Resolution Widget */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Conflict Resolution
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Resolve structural disputes in property & billing
          </p>

          <div className="mt-4 space-y-4">
            {conflicts.map((cf) => (
              <div key={cf.id} className="border border-white/5 bg-[#050505]/60 p-4">
                <span className="font-mono text-[9px] uppercase text-violet-light font-bold">
                  PENDING RESOLUTION
                </span>
                <h4 className="font-display text-sm text-white mt-1">{cf.title}</h4>
                <p className="mt-2 font-mono text-xs text-white/70 leading-relaxed">
                  {cf.description}
                </p>

                {cf.resolved ? (
                  <div className="mt-4 border border-gold/30 bg-gold/5 p-2 font-mono text-[10px] text-gold-light">
                    ✓ Resolved Strategy: {cf.actionTaken}
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => resolveConflict(cf.id, 'Waive Late Fee')}
                      className="border border-gold/30 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-gold-light hover:border-gold-royal hover:text-white"
                    >
                      Waive Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveConflict(cf.id, 'Enforce Contract Policy')}
                      className="border border-violet/30 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-violet-light hover:border-violet hover:text-white"
                    >
                      Enforce Policy
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
