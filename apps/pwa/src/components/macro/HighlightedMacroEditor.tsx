'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface HighlightedMacroEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}

// Known System Commands & Functions in Macro Runtime
const SYSTEM_COMMANDS = new Set([
  'speak',
  'navigateTab',
  'sendVoiceCommand',
  'dispatchKey',
  'dispatchEvent',
  'CustomEvent',
  'window',
  'document',
  'executeMacro',
  'matchMacro',
]);

// Known Command Step Types & System Actions
const COMMAND_TYPES = new Set([
  'voice_announcement',
  'custom_script',
  'key_combination',
  'system_command',
  'app_launch',
  'navigate_tab',
  'hitl_confirm',
  'auto',
]);

// Known Property Keys in Macro JSON DSL
const JSON_KEYS = new Set([
  'type',
  'label',
  'payload',
  'scriptCode',
  'delayMs',
  'phrase',
  'name',
  'description',
  'steps',
  'category',
  'safetyTier',
  'enabled',
  'id',
  'createdAt',
  'updatedAt',
]);

/**
 * Tokenize and highlight a single line of Macro Code / DSL
 */
function highlightLine(line: string, keyIndex: number): React.ReactNode {
  if (!line) {
    return <span key={keyIndex}>&#8203;</span>;
  }

  // Handle single-line comments // ...
  const commentIdx = line.indexOf('//');
  if (commentIdx !== -1) {
    const codePart = line.substring(0, commentIdx);
    const commentPart = line.substring(commentIdx);
    return (
      <span key={keyIndex}>
        {highlightCodeTokens(codePart)}
        <span className="text-white/40 italic font-normal">{commentPart}</span>
      </span>
    );
  }

  return <span key={keyIndex}>{highlightCodeTokens(line)}</span>;
}

/**
 * Tokenize code tokens inside a line
 */
function highlightCodeTokens(code: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenizer regex matching strings, numbers, identifiers, symbols, colons
  const regex =
    /("[^"]*"|'[^']*'|`[^`]*`|\b\d+\b|\b(?:true|false|null)\b|\b[a-zA-Z_]\w*\b|[{}[\],:();=])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let nodeKey = 0;

  while ((match = regex.exec(code)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`text-${nodeKey++}`} className="text-white/70">
          {code.substring(lastIndex, match.index)}
        </span>,
      );
    }

    const token = match[0];
    const isString =
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'")) ||
      (token.startsWith('`') && token.endsWith('`'));

    if (isString) {
      const rawContent = token.slice(1, -1).trim();
      // Check if string is preceded by a colon or if it's a JSON property key
      const restAfter = code.substring(match.index + token.length);
      const isKey = /^\s*:/.test(restAfter) || JSON_KEYS.has(rawContent);

      if (isKey) {
        // Property Key
        nodes.push(
          <span key={`key-${nodeKey++}`} className="text-gold-light font-semibold">
            {token}
          </span>,
        );
      } else if (COMMAND_TYPES.has(rawContent.toLowerCase())) {
        // System Command / Step Type Value
        nodes.push(
          <span
            key={`cmdtype-${nodeKey++}`}
            className="text-cyan-300 font-bold bg-cyan-950/50 px-1 rounded border border-cyan-500/30"
            title="System Command / Action Type"
          >
            {token}
          </span>,
        );
      } else {
        // Argument / Parameter Value
        nodes.push(
          <span
            key={`arg-${nodeKey++}`}
            className="text-emerald-300 bg-emerald-950/25 px-0.5 rounded"
            title="Command Argument / String Parameter"
          >
            {token}
          </span>,
        );
      }
    } else if (/^\d+$/.test(token)) {
      // Number / Delay
      nodes.push(
        <span
          key={`num-${nodeKey++}`}
          className="text-amber-400 font-bold"
          title="Delay / Numeric Argument"
        >
          {token}
        </span>,
      );
    } else if (token === 'true' || token === 'false' || token === 'null') {
      // Boolean / Null
      nodes.push(
        <span key={`bool-${nodeKey++}`} className="text-pink-400 font-bold">
          {token}
        </span>,
      );
    } else if (SYSTEM_COMMANDS.has(token)) {
      // JS System Command Function
      nodes.push(
        <span
          key={`sysfunc-${nodeKey++}`}
          className="text-cyan-300 font-bold underline decoration-cyan-400/60"
          title="System Command Function"
        >
          {token}
        </span>,
      );
    } else if ('{}[]():,;='.includes(token)) {
      // Delimiters & Punctuation
      nodes.push(
        <span key={`punc-${nodeKey++}`} className="text-white/50 font-normal">
          {token}
        </span>,
      );
    } else {
      // General Identifiers / Words
      nodes.push(
        <span key={`ident-${nodeKey++}`} className="text-white/90">
          {token}
        </span>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing text
  if (lastIndex < code.length) {
    nodes.push(
      <span key={`text-tail`} className="text-white/70">
        {code.substring(lastIndex)}
      </span>,
    );
  }

  return nodes;
}

export function HighlightedMacroEditor({
  value,
  onChange,
  rows = 16,
  className = '',
  placeholder = 'Type macro JSON or DSL script code here...',
}: HighlightedMacroEditorProps) {
  const [highlightingEnabled, setHighlightingEnabled] = useState<boolean>(true);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Synchronize scroll between textarea, backdrop, and line numbers
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const top = textareaRef.current.scrollTop;
    const left = textareaRef.current.scrollLeft;

    if (backdropRef.current) {
      backdropRef.current.scrollTop = top;
      backdropRef.current.scrollLeft = left;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = top;
    }
  };

  // Split lines for rendering
  const lines = useMemo(() => value.split('\n'), [value]);

  return (
    <div
      className={`flex flex-col border border-gold/40 bg-black/90 rounded shadow-inner font-mono text-xs ${className}`}
    >
      {/* SYNTAX HIGHLIGHTING TOOLBAR & LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 bg-black/80 px-3 py-1.5 text-[10px] text-white/70">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setHighlightingEnabled(!highlightingEnabled)}
            className={`px-2 py-0.5 rounded font-mono uppercase transition-colors ${
              highlightingEnabled
                ? 'bg-gold/20 border border-gold text-gold-royal font-bold'
                : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'
            }`}
            title="Toggle Live Syntax Highlighting"
          >
            {highlightingEnabled ? '✨ Syntax Highlight: ON' : '⚪ Syntax Highlight: OFF'}
          </button>

          <button
            type="button"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`px-2 py-0.5 rounded font-mono uppercase transition-colors ${
              showLineNumbers
                ? 'bg-white/10 border border-white/20 text-white'
                : 'bg-white/5 border border-white/10 text-white/40'
            }`}
            title="Toggle Line Numbers Column"
          >
            # Line Numbers
          </button>
        </div>

        {/* Legend Badges */}
        {highlightingEnabled && (
          <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono">
            <span className="flex items-center gap-1 text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
              <span>⚙️</span> System Commands
            </span>
            <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/30">
              <span>📝</span> Arguments
            </span>
            <span className="flex items-center gap-1 text-gold-light font-semibold">
              <span>🔑</span> Keys
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <span>🔢</span> Delays
            </span>
          </div>
        )}
      </div>

      {/* EDITOR WORKSPACE WITH LINE NUMBERS AND OVERLAY */}
      <div className="relative flex min-h-[300px] flex-1 overflow-hidden">
        {/* Line Numbers Column */}
        {showLineNumbers && (
          <div
            ref={lineNumbersRef}
            className="w-10 shrink-0 select-none overflow-hidden border-r border-white/10 bg-black/60 py-4 text-right font-mono text-[11px] leading-relaxed text-white/30 pr-2.5"
          >
            {lines.map((_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>
        )}

        {/* Main Code Workspace Container */}
        <div className="relative flex-1 overflow-hidden">
          {/* Highlighted Syntax Backdrop */}
          {highlightingEnabled && (
            <div
              ref={backdropRef}
              aria-hidden="true"
              className="absolute inset-0 overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre pointer-events-none text-white/90"
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              }}
            >
              {lines.map((line, idx) => (
                <div key={idx} className="min-h-[1.25rem]">
                  {highlightLine(line, idx)}
                </div>
              ))}
            </div>
          )}

          {/* Transparent Input Textarea Overlay */}
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={placeholder}
            spellCheck={false}
            className={`w-full h-full p-4 font-mono text-xs leading-relaxed bg-transparent focus:outline-none resize-none whitespace-pre overflow-auto leading-relaxed ${
              highlightingEnabled
                ? 'text-transparent caret-gold selection:bg-gold/30 selection:text-white'
                : 'text-gold-light caret-white'
            }`}
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
          />
        </div>
      </div>
    </div>
  );
}
