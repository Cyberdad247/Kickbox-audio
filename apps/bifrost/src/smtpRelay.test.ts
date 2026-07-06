import { describe, expect, it } from 'vitest';
import { buildRfc822Message, dispatchToLocalMta } from './smtpRelay';

describe('buildRfc822Message', () => {
  it('builds a multipart RFC822 payload', () => {
    const msg = buildRfc822Message({
      bodyHtml: '<p>Hello</p>',
      bodyText: 'Hello',
      fromAddress: 'lakisha@kickbox.audio',
      subject: 'Welcome',
      toAddress: 'owner@kickbox.audio',
    });

    expect(msg).toContain('Content-Type: multipart/alternative');
    expect(msg).toContain('Subject: Welcome');
    expect(msg).toContain('<p>Hello</p>');
    expect(msg).toContain('Hello');
  });
});

const sampleDispatch = {
  bodyHtml: '<p>Hello</p>',
  bodyText: 'Hello',
  subject: 'Hello',
  toAddress: 'owner@kickbox.audio',
};

describe('dispatchToLocalMta — dry-run safety', () => {
  it('dry-runs when AALIYAH_MTA_DRY_RUN is unset, even in production', async () => {
    const result = await dispatchToLocalMta(sampleDispatch, {
      // deliberately no AALIYAH_MTA_DRY_RUN
      NODE_ENV: 'production',
    });

    expect(result).toEqual({
      dryRun: true,
      relay: '127.0.0.1:25',
      recipient: 'owner@kickbox.audio',
    });
  });

  it('dry-runs when AALIYAH_MTA_DRY_RUN is "1"', async () => {
    const result = await dispatchToLocalMta(sampleDispatch, {
      AALIYAH_MTA_DRY_RUN: '1',
    });

    expect(result.dryRun).toBe(true);
  });

  it('dry-runs when AALIYAH_MTA_DRY_RUN is an unparseable truthy value', async () => {
    const result = await dispatchToLocalMta(sampleDispatch, {
      AALIYAH_MTA_DRY_RUN: 'yes',
      NODE_ENV: 'production',
    });

    expect(result.dryRun).toBe(true);
  });

  it('parses whitespace/case variants ("0 ", " FALSE") equivalent to "0"/"false" (network reject)', async () => {
    await expect(
      dispatchToLocalMta(sampleDispatch, {
        AALIYAH_MTA_DRY_RUN: '0 ',
        AALIYAH_MTA_HOST: '127.0.0.1',
        AALIYAH_MTA_PORT: '1',
        NODE_ENV: 'production',
      }),
    ).rejects.toThrow(/ECONNREFUSED|ENOTFOUND|ECONN|ETIMEDOUT|connect/);

    await expect(
      dispatchToLocalMta(sampleDispatch, {
        AALIYAH_MTA_DRY_RUN: ' FALSE',
        AALIYAH_MTA_HOST: '127.0.0.1',
        AALIYAH_MTA_PORT: '1',
      }),
    ).rejects.toThrow(/ECONNREFUSED|ENOTFOUND|ECONN|ETIMEDOUT|connect/);
  }, 5_000);

  it('opts INTO real SMTP when AALIYAH_MTA_DRY_RUN is "0" (rejects on network)', async () => {
    await expect(
      dispatchToLocalMta(sampleDispatch, {
        AALIYAH_MTA_DRY_RUN: '0',
        AALIYAH_MTA_HOST: '127.0.0.1',
        AALIYAH_MTA_PORT: '1',
        NODE_ENV: 'production',
      }),
    ).rejects.toThrow(/ECONNREFUSED|ENOTFOUND|ECONN|ETIMEDOUT|connect/);
  }, 5_000);

  it('opts INTO real SMTP when AALIYAH_MTA_DRY_RUN is "false" (rejects on network)', async () => {
    await expect(
      dispatchToLocalMta(sampleDispatch, {
        AALIYAH_MTA_DRY_RUN: 'false',
        AALIYAH_MTA_HOST: '127.0.0.1',
        AALIYAH_MTA_PORT: '1',
      }),
    ).rejects.toThrow(/ECONNREFUSED|ENOTFOUND|ECONN|ETIMEDOUT|connect/);
  }, 5_000);

  it('wires host/port overrides into the relay descriptor', async () => {
    const result = await dispatchToLocalMta(sampleDispatch, {
      AALIYAH_MTA_HOST: 'mta.local',
      AALIYAH_MTA_PORT: '2525',
    });

    expect(result.relay).toBe('mta.local:2525');
  });
});
