'use client';

// Ambassador Lakisha — an animated living-presence avatar. No video asset yet, so
// this is an audio-reactive SVG/CSS presence that pulses violet while speaking and
// holds a calm gold glow at rest. Drop a <video> in later behind the same frame.
export function LakishaAvatar({ speaking, connected }: { speaking: boolean; connected: boolean }) {
  return (
    <div className="w-56 border border-gold/50 bg-smoke-900/85 backdrop-blur-md shadow-gold">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-smoke-800 to-obsidian">
        {/* concentric presence rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          {speaking && (
            <>
              <span className="absolute h-24 w-24 animate-ping rounded-full border border-violet/40" />
              <span className="absolute h-32 w-32 animate-pulse rounded-full border border-violet/20" />
            </>
          )}
          {/* the orb */}
          <div
            className={`h-20 w-20 rounded-full transition-all duration-300 ${
              speaking
                ? 'bg-violet/40 shadow-[0_0_40px_rgba(157,78,221,0.8)]'
                : connected
                  ? 'bg-gold/20 shadow-gold'
                  : 'bg-white/5'
            }`}
            style={{
              background: speaking
                ? 'radial-gradient(circle at 35% 30%, #e0b6ff, #9D4EDD 55%, transparent 75%)'
                : 'radial-gradient(circle at 35% 30%, #FFD700, #D4AF37 55%, transparent 78%)',
            }}
          />
          {/* abstract eyes */}
          <div className="absolute flex gap-3" style={{ transform: 'translateY(-2px)' }}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${speaking ? 'bg-white' : 'bg-obsidian/70'}`}
            />
            <span
              className={`h-1.5 w-1.5 rounded-full ${speaking ? 'bg-white' : 'bg-obsidian/70'}`}
            />
          </div>
        </div>
        {/* scanline sheen */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.18)_4px)] opacity-40" />
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="leading-tight">
          <p className="font-display text-gold-royal text-sm tracking-minted">Lakisha</p>
          <p className="text-[9px] text-white/35 uppercase tracking-[0.18em]">Ambassador</p>
        </div>
        <span
          className={`h-2 w-2 rounded-full ${speaking ? 'bg-violet shadow-glow' : connected ? 'bg-gold-royal' : 'bg-white/25'}`}
        />
      </div>
    </div>
  );
}
