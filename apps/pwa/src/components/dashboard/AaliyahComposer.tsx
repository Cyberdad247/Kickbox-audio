'use client';

import { useMemo, useState } from 'react';

interface RenderResponse {
  html: string;
  subject: string;
  templateId: string;
  text: string;
}

interface DraftResponse {
  draft_id: string;
  status: string;
}

export function AaliyahComposer() {
  const [recipientName, setRecipientName] = useState('Andre');
  const [recipientEmail, setRecipientEmail] = useState('owner@kickbox.audio');
  const [intent, setIntent] = useState('Launch the sovereign Lakisha outreach sequence');
  const [approver, setApprover] = useState('Sovereign');
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [rendered, setRendered] = useState<RenderResponse | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => recipientEmail.trim().length > 3 && intent.trim().length > 0,
    [intent, recipientEmail],
  );

  const renderDraft = async () => {
    setStatus('rendering');
    setError(null);
    try {
      const response = await fetch('/api/cms/template/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_context: {
            contact_email: recipientEmail,
            contact_name: recipientName,
            intent,
          },
          template_id: 'tpl_welcome_01',
        }),
      });

      if (!response.ok) throw new Error(`Render failed: ${response.status}`);
      setRendered((await response.json()) as RenderResponse);
      setStatus('rendered');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown render failure');
      setStatus('error');
    }
  };

  const createDraft = async () => {
    if (!rendered) return;
    setStatus('drafting');
    setError(null);
    try {
      const response = await fetch('/api/cms/content/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: {
            email: recipientEmail,
            name: recipientName,
          },
          html: rendered.html,
          metadata: {
            initiated_by: 'AALIYAH_PWA_HOME',
            intent,
          },
          status: 'pending_approval',
          subject: rendered.subject,
          template_id: rendered.templateId,
          text: rendered.text,
        }),
      });

      if (!response.ok) throw new Error(`Draft creation failed: ${response.status}`);
      const draft = (await response.json()) as DraftResponse;
      setDraftId(draft.draft_id);
      setStatus('drafted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown draft failure');
      setStatus('error');
    }
  };

  const publishDraft = async () => {
    if (!rendered || !draftId) return;
    setStatus('publishing');
    setError(null);
    try {
      const response = await fetch('/api/cms/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftId,
          html: rendered.html,
          approval: {
            approved_by: approver,
            confirmed: approvalConfirmed,
          },
          subject: rendered.subject,
          text: rendered.text,
          to: {
            email: recipientEmail,
            name: recipientName,
          },
        }),
      });

      if (!response.ok) throw new Error(`Publish failed: ${response.status}`);
      setStatus('published');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown publish failure');
      setStatus('error');
    }
  };

  return (
    <div className="mt-4 border border-violet/20 bg-[#050505]/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xs uppercase tracking-[0.16em] text-violet-light">
            Aaliyah Sovereign Composer
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
            Render template, queue HITL draft, publish to local relay
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-gold-light">
          {status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
            Recipient
          </span>
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="w-full border border-white/10 bg-[#050505] px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet/60"
          />
        </label>
        <label className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
            Email
          </span>
          <input
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full border border-white/10 bg-[#050505] px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet/60"
          />
        </label>
      </div>

      <label className="mt-3 block space-y-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
          Intent
        </span>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={3}
          className="w-full resize-none border border-white/10 bg-[#050505] px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet/60"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
            HITL Approver
          </span>
          <input
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            className="w-full border border-white/10 bg-[#050505] px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet/60"
          />
        </label>

        <label className="flex items-end gap-2 border border-white/10 bg-[#050505] px-3 py-2">
          <input
            type="checkbox"
            checked={approvalConfirmed}
            onChange={(e) => setApprovalConfirmed(e.target.checked)}
            className="accent-violet"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">
            HITL Approved
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={renderDraft}
          className="border border-gold/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-light transition-colors hover:border-violet hover:text-violet-light disabled:opacity-40"
        >
          Render
        </button>
        <button
          type="button"
          disabled={!rendered}
          onClick={createDraft}
          className="border border-gold/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-light transition-colors hover:border-violet hover:text-violet-light disabled:opacity-40"
        >
          Queue Draft
        </button>
        <button
          type="button"
          disabled={!draftId || !approvalConfirmed || !approver.trim()}
          onClick={publishDraft}
          className="border border-violet/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-violet-light transition-colors hover:border-gold-royal hover:text-gold-light disabled:opacity-40"
        >
          Publish
        </button>
      </div>

      {rendered && (
        <div className="mt-4 border border-white/5 bg-[#050505] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">Subject</p>
          <p className="mt-1 font-mono text-xs text-white/80">{rendered.subject}</p>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
            Draft Preview
          </p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-white/70">{rendered.text}</p>
          {draftId && (
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-gold-light">
              Draft ID {draftId}
            </p>
          )}
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
            Publish stays locked until a named approver confirms HITL approval.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
