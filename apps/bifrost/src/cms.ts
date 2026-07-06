export interface CmsContactContext {
  contact_email?: string;
  contact_name?: string;
  intent?: string;
}

export interface RenderedTemplate {
  html: string;
  metadata: {
    contactEmail: string | null;
    contactName: string | null;
    intent: string | null;
    renderedAt: string;
    templateId: CmsTemplateId;
  };
  subject: string;
  templateId: CmsTemplateId;
  text: string;
}

export type CmsTemplateId = 'tpl_followup_01' | 'tpl_welcome_01';

interface TemplateDefinition {
  html: (ctx: CmsContactContext) => string;
  subject: (ctx: CmsContactContext) => string;
  text: (ctx: CmsContactContext) => string;
}

const TEMPLATE_REGISTRY: Record<CmsTemplateId, TemplateDefinition> = {
  tpl_followup_01: {
    subject: (ctx) => `Lakisha follow-up for ${fallbackName(ctx)}`,
    html: (ctx) => {
      const name = fallbackName(ctx);
      const intent = fallbackIntent(ctx);
      return [
        `<h1>Following up for ${escapeHtml(name)}</h1>`,
        '<p>Ambassador Lakisha has reviewed your prior request and prepared the next sovereign action.</p>',
        `<p><strong>Current intent:</strong> ${escapeHtml(intent)}</p>`,
        '<p>Reply directly to this message to keep the thread in the Bifrost comms ledger.</p>',
      ].join('');
    },
    text: (ctx) =>
      `Following up for ${fallbackName(ctx)}. Current intent: ${fallbackIntent(ctx)}. Reply directly to continue the thread.`,
  },
  tpl_welcome_01: {
    subject: (ctx) => `Welcome to the Lakisha sovereign comms loop, ${fallbackName(ctx)}`,
    html: (ctx) => {
      const name = fallbackName(ctx);
      const intent = fallbackIntent(ctx);
      return [
        `<h1>Welcome, ${escapeHtml(name)}</h1>`,
        '<p>Ambassador Lakisha has opened a sovereign draft channel for your request.</p>',
        `<p><strong>Intent:</strong> ${escapeHtml(intent)}</p>`,
        '<p>This draft is queued for HITL approval before any external dispatch.</p>',
      ].join('');
    },
    text: (ctx) =>
      `Welcome, ${fallbackName(ctx)}. Intent: ${fallbackIntent(ctx)}. This draft is queued for HITL approval before any external dispatch.`,
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fallbackIntent(ctx: CmsContactContext): string {
  return ctx.intent?.trim() || 'General sovereign onboarding';
}

function fallbackName(ctx: CmsContactContext): string {
  return ctx.contact_name?.trim() || ctx.contact_email?.trim() || 'Sovereign Contact';
}

export function renderCmsTemplate(
  templateId: CmsTemplateId,
  contactContext: CmsContactContext,
): RenderedTemplate {
  const template = TEMPLATE_REGISTRY[templateId];
  if (!template) throw new Error(`Unknown CMS template: ${templateId}`);

  return {
    html: template.html(contactContext),
    metadata: {
      contactEmail: contactContext.contact_email?.trim() || null,
      contactName: contactContext.contact_name?.trim() || null,
      intent: contactContext.intent?.trim() || null,
      renderedAt: new Date().toISOString(),
      templateId,
    },
    subject: template.subject(contactContext),
    templateId,
    text: template.text(contactContext),
  };
}
