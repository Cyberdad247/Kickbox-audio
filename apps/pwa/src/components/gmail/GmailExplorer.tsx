'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useGmail } from '../../context/GmailContext';
import { type GmailMessage, fetchRecentEmails, sendEmail } from '../../lib/gmailService';

export function GmailExplorer() {
  const { user: currentUser, accessToken, signIn, signOut } = useGmail();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const recent = await fetchRecentEmails(accessToken, 15);
      setMessages(recent);
    } catch (err: any) {
      console.error('Failed to load Gmail messages:', err);
      setError(err.message || 'Failed to communicate with Gmail API.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [accessToken, loadMessages]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setIsSending(true);
    setError(null);
    try {
      await sendEmail(accessToken, composeTo, composeSubject, composeBody);
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      // Refresh to see if it shows up (though usually it's in Sent, not INBOX)
    } catch (err: any) {
      console.error('Failed to send email:', err);
      setError(err.message || 'Failed to dispatch email.');
    } finally {
      setIsSending(false);
    }
  };

  const getHeader = (msg: GmailMessage, name: string) => {
    const header = msg.payload.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  if (!currentUser || !accessToken) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 bg-black">
        <div className="flex max-w-md flex-col items-center justify-center text-center p-8 rounded-3xl border border-red-500/20 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent opacity-20 pointer-events-none" />
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <span className="text-4xl">📧</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Gmail Enclave</h2>
          <p className="font-mono text-xs text-white/50 mb-8 leading-relaxed">
            The Sovereign OS requires localized authorization to interface with your Google Mail
            matrix. Connect to decrypt incoming transmissions and deploy outbound dispatches.
          </p>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-red-500/50 bg-red-600/10 px-6 py-4 font-mono text-sm font-bold text-red-400 hover:bg-red-500/20 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:opacity-50"
          >
            <span>{isSigningIn ? 'CONNECTING...' : 'AUTHORIZE GMAIL INTEGRATION'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-2 space-y-4 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/20 bg-smoke-900/90 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 text-xl shadow-[0_0_12px_rgba(239,68,68,0.3)] overflow-hidden">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="User" className="h-full w-full object-cover" />
            ) : (
              <span>📧</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-white">
                {currentUser.displayName || 'Gmail User'}
              </h3>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                CONNECTED
              </span>
            </div>
            <p className="font-mono text-[10px] text-white/50">{currentUser.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMessages}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] text-white/70 hover:bg-white/10 transition-colors"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-3 py-1.5 font-mono text-[10px] font-bold text-gold hover:bg-gold/20 hover:shadow-[0_0_10px_rgba(212,175,55,0.3)] transition-all"
          >
            <span>✏️</span>
            <span>Compose</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[10px] text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {messages.length === 0 && !isLoading && !error && (
            <div className="text-center p-8 text-white/40 font-mono text-xs">
              No recent dispatches found.
            </div>
          )}

          {messages.map((msg) => {
            const subject = getHeader(msg, 'Subject') || '(No Subject)';
            const from = getHeader(msg, 'From');
            const date = getHeader(msg, 'Date');
            return (
              <div
                key={msg.id}
                className="group relative flex flex-col gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05] hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="font-mono text-xs text-gold truncate">{from}</div>
                  <div className="font-mono text-[9px] text-white/40 shrink-0">
                    {new Date(date).toLocaleString()}
                  </div>
                </div>
                <div className="font-display text-sm text-white truncate">{subject}</div>
                <div className="font-mono text-[10px] text-white/50 line-clamp-2 mt-1">
                  {msg.snippet}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSendEmail}
            className="w-full max-w-2xl rounded-2xl border border-gold/30 bg-smoke-900 p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)]"
          >
            <h3 className="font-display text-lg font-bold text-white mb-6">Compose Dispatch</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block font-mono text-[10px] text-white/50 mb-1">TO:</label>
                <input
                  type="email"
                  required
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-white/50 mb-1">SUBJECT:</label>
                <input
                  type="text"
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
                  placeholder="Subject line..."
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-white/50 mb-1">PAYLOAD:</label>
                <textarea
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-white/20 bg-black/60 p-3 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
                  placeholder="Enter transmission payload here..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="rounded-xl border border-white/20 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || !composeTo || !composeSubject || !composeBody}
                className="rounded-xl border border-gold bg-gold px-4 py-2 font-mono text-xs font-bold text-black hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Transmit Payload'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
