import net from 'node:net';

export interface LocalMtaDispatchInput {
  bodyHtml: string;
  bodyText: string;
  fromAddress: string;
  subject: string;
  toAddress: string;
}

export interface LocalMtaDispatchResult {
  dryRun: boolean;
  relay: string;
  recipient: string;
}

interface RelayEnv {
  AALIYAH_MTA_DRY_RUN?: string;
  AALIYAH_MTA_FROM?: string;
  AALIYAH_MTA_HOST?: string;
  AALIYAH_MTA_PORT?: string;
  NODE_ENV?: string;
}

function stripCrlf(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim();
}

/**
 * Escape an SMTP message body for safe DATA transmission. Two protections:
 *
 *   1. CR/LF collapse — RFC 5322 line endings inside body text are rewritten
 *      so an opportunistic `\r\n` injection cannot break out of the
 *      multipart structure and inject another SMTP command line.
 *   2. Dot-stuffing — RFC 5321 §4.5.2 requires any leading `.` in a body line
 *      to be doubled; an attacker who slips `\r\n.\r\nRCPT TO:<evil@…>` into
 *      `bodyText` would otherwise terminate the DATA block early and inject
 *      arbitrary SMTP commands on the same socket.
 *
 * Exported so callers (and tests) can verify the escape in isolation without
 * rebuilding the entire RFC822 envelope.
 */
export function escapeSmtpBody(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
}

export function buildRfc822Message(input: LocalMtaDispatchInput): string {
  const boundary = 'kickbox-aaliyah-boundary';
  return [
    `To: ${stripCrlf(input.toAddress)}`,
    `From: ${stripCrlf(input.fromAddress)}`,
    `Subject: ${stripCrlf(input.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    escapeSmtpBody(input.bodyText),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    escapeSmtpBody(input.bodyHtml),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

async function waitForCode(socket: net.Socket, expectedPrefix: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onData = (buffer: Buffer) => {
      const text = buffer.toString('utf8');
      if (text.startsWith(expectedPrefix)) {
        cleanup();
        resolve();
        return;
      }
      cleanup();
      reject(new Error(`SMTP relay expected ${expectedPrefix}, received: ${text.trim()}`));
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
    };

    socket.on('data', onData);
    socket.on('error', onError);
  });
}

function writeLine(socket: net.Socket, line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(`${line}\r\n`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function dispatchToLocalMta(
  input: Omit<LocalMtaDispatchInput, 'fromAddress'> & { fromAddress?: string },
  env: RelayEnv = process.env as RelayEnv,
): Promise<LocalMtaDispatchResult> {
  const host = env.AALIYAH_MTA_HOST?.trim() || '127.0.0.1';
  const port = Number(env.AALIYAH_MTA_PORT?.trim() || '25');
  const fromAddress =
    input.fromAddress?.trim() || env.AALIYAH_MTA_FROM?.trim() || 'lakisha@kickbox.audio';
  const relay = `${host}:${port}`;
  // Safe-by-default: only real SMTP sends when AALIYAH_MTA_DRY_RUN explicitly
  // opts OUT of dry-run. Anything else ('1', 'true', '', unset, whitespace,
  // even in production) returns the dry-run envelope without touching the
  // network. Parsing is trim+lowercase so a typo like "0 " silently keeps you
  // safe — opt-out must be unambiguous.
  const dryRunFlag = env.AALIYAH_MTA_DRY_RUN?.trim().toLowerCase();
  const dryRun = !(dryRunFlag === '0' || dryRunFlag === 'false');

  if (dryRun) {
    return { dryRun: true, relay, recipient: input.toAddress };
  }

  const socket = net.createConnection({ host, port });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('error', reject);
  });

  try {
    const message = buildRfc822Message({
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText,
      fromAddress,
      subject: input.subject,
      toAddress: input.toAddress,
    });

    await waitForCode(socket, '220');
    await writeLine(socket, 'HELO localhost');
    await waitForCode(socket, '250');
    await writeLine(socket, `MAIL FROM:<${fromAddress}>`);
    await waitForCode(socket, '250');
    await writeLine(socket, `RCPT TO:<${input.toAddress}>`);
    await waitForCode(socket, '250');
    await writeLine(socket, 'DATA');
    await waitForCode(socket, '354');
    await writeLine(socket, `${message}\r\n.`);
    await waitForCode(socket, '250');
    await writeLine(socket, 'QUIT');

    return { dryRun: false, relay, recipient: input.toAddress };
  } finally {
    socket.end();
  }
}
