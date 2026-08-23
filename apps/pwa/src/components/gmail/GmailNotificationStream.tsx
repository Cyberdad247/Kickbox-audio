'use client';

import React from 'react';
import { useGmail } from '../../context/GmailContext';
import type { GmailMessage } from '../../lib/gmailService';

export function GmailNotificationStream() {
  const { accessToken, unreadEmails, signIn } = useGmail();

  const getHeader = (msg: GmailMessage, name: string) => {
    const header = msg.payload.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  if (!accessToken) {
    return (
      <div className="fixed top-24 right-6 z-40">
        <button
          onClick={signIn}
          className="pointer-events-auto rounded-xl border border-red-500/40 bg-black/80 backdrop-blur-md px-3 py-1.5 shadow-[0_4px_20px_rgba(239,68,68,0.2)] font-mono text-[10px] text-red-400 hover:bg-red-500/20 transition-colors"
        >
          CONNECT GMAIL ENCLAVE
        </button>
      </div>
    );
  }

  if (unreadEmails.length === 0) return null;

  return (
    <div className="fixed top-24 right-6 z-40 flex flex-col gap-3 w-72 pointer-events-none">
      {unreadEmails.map((msg) => {
        const from = getHeader(msg, 'From').split('<')[0].trim();
        const subject = getHeader(msg, 'Subject') || '(No Subject)';
        return (
          <div
            key={msg.id}
            className="pointer-events-auto rounded-xl border border-red-500/40 bg-black/80 backdrop-blur-md p-3 shadow-[0_4px_20px_rgba(239,68,68,0.2)] animate-in fade-in slide-in-from-right-4 duration-500"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] text-red-400 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                📧
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-red-400 font-bold truncate flex-1">
                {from}
              </span>
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[8px] font-bold text-red-300">
                NEW
              </span>
            </div>
            <div className="font-display text-xs text-white line-clamp-2 leading-relaxed">
              {subject}
            </div>
          </div>
        );
      })}
    </div>
  );
}
