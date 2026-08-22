import { describe, expect, it } from 'vitest';
import { renderCmsTemplate } from './cms';

describe('renderCmsTemplate', () => {
  it('renders the welcome template with sovereign context', () => {
    const rendered = renderCmsTemplate('tpl_welcome_01', {
      contact_email: 'owner@kickbox.audio',
      contact_name: 'Owner',
      intent: 'Launch the sovereign campaign',
    });

    expect(rendered.subject).toContain('Owner');
    expect(rendered.html).toContain('Launch the sovereign campaign');
    expect(rendered.text).toContain('queued for HITL approval');
  });

  it('escapes HTML input before rendering', () => {
    const rendered = renderCmsTemplate('tpl_followup_01', {
      contact_name: '<script>alert(1)</script>',
    });

    expect(rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.html).not.toContain('<script>');
  });
});
