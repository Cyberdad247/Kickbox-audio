'use client';

import React from 'react';
import { useMacros } from '../../context/MacroContext';

export function MacroQuickBar() {
  const { macros, executeMacro, openMacroModal, activeExecution } = useMacros();
  const enabledMacros = macros.filter((m) => m.enabled).slice(0, 4);

  if (enabledMacros.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      <span className="flex items-center gap-1 font-mono text-[9px] text-gold uppercase tracking-widest px-1">
        <span>⚡</span> Voice Shortcuts:
      </span>
      {enabledMacros.map((m) => {
        const isRunning = activeExecution?.macro.id === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => executeMacro(m, 'shortcut')}
            disabled={isRunning}
            title={`Voice phrase: "${m.phrase}" — ${m.description}`}
            className={`group flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all whitespace-nowrap ${
              isRunning
                ? 'border-gold bg-gold/20 text-gold-light animate-pulse'
                : 'border-white/10 bg-smoke-900/80 text-white/70 hover:border-gold/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-gold/80 text-[9px]">🎙️</span>
            <span className="text-gold-light font-bold">"{m.phrase}"</span>
            <span className="text-white/30 text-[9px]">→ {m.name}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => openMacroModal(null)}
        className="border border-gold/30 bg-gold/5 px-2 py-1 text-[10px] font-mono uppercase text-gold hover:bg-gold/15"
      >
        + Studio
      </button>
    </div>
  );
}
