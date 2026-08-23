/**
 * Sovereign QR Handshake Payload Helpers
 */

export interface QRAuthPayload {
  protocol: 'CAMELOT_AUTH_V1';
  tenantId: string;
  tenantHandle: string;
  sessionId?: string;
  code: string;
  timestamp: number;
}

export function generateQRAuthPayload(
  tenantId: string,
  tenantHandle: string,
  code: string,
  sessionId?: string,
): string {
  return JSON.stringify({
    protocol: 'CAMELOT_AUTH_V1',
    tenantId,
    tenantHandle,
    sessionId: sessionId || `hs_qr_${Date.now()}`,
    code,
    timestamp: Date.now(),
  });
}

export function parseQRAuthPayload(raw: string): {
  code: string;
  tenantHandle?: string;
  tenantId?: string;
} {
  try {
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (parsed.code) {
        return {
          code: String(parsed.code),
          tenantHandle: parsed.tenantHandle,
          tenantId: parsed.tenantId,
        };
      }
    }

    if (raw.includes('code=')) {
      const urlParams = new URLSearchParams(raw.includes('?') ? raw.split('?')[1] : raw);
      const code = urlParams.get('code');
      if (code) {
        return {
          code,
          tenantHandle: urlParams.get('tenantHandle') || undefined,
          tenantId: urlParams.get('tenantId') || undefined,
        };
      }
    }

    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 4 && digitsOnly.length <= 8) {
      return { code: digitsOnly };
    }

    return { code: raw.slice(0, 16) };
  } catch {
    return { code: raw.replace(/\D/g, '').slice(0, 8) };
  }
}
