'use client';

/**
 * Camelot-OS UI Embedding & Hardware Verification Protocol
 * Provides bidirectional communication between parent container / iframe host
 * and Camelot OS, alongside device viewport verification.
 */

export interface EmbedHostMessage<T = unknown> {
  type: string;
  source?: 'camelot_parent' | 'camelot_client';
  payload?: T;
  timestamp?: number;
}

export interface EmbedConfig {
  allowCamera?: boolean;
  allowMicrophone?: boolean;
  allowFullscreen?: boolean;
  theme?: 'gothic-dark' | 'obsidian-cyber' | 'sovereign-gold';
  embeddedWidth?: string | number;
  embeddedHeight?: string | number;
}

/**
 * Generates an HTML iframe snippet for embedding Camelot OS into any web surface,
 * Notion document, external admin dashboard, or portal.
 */
export function generateEmbedSnippet(options: {
  originUrl?: string;
  width?: string;
  height?: string;
  theme?: string;
  compactMode?: boolean;
}): string {
  const origin =
    options.originUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://camelot-os.app');
  const w = options.width || '100%';
  const h = options.height || '720px';
  const embedUrl = `${origin}?embed=true${options.compactMode ? '&compact=true' : ''}`;

  return `<!-- Camelot OS Sovereign Voice & WebRTC Embed -->
<iframe
  src="${embedUrl}"
  width="${w}"
  height="${h}"
  title="Camelot OS Sovereign Node"
  frameborder="0"
  allow="camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen"
  allowfullscreen="true"
  style="border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 16px; box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); background: #05030A; overflow: hidden;"
></iframe>`;
}

/**
 * Helper to dispatch structured events to parent container if inside iframe
 */
export function sendEmbedEvent(type: string, payload?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.self !== window.top && window.parent) {
      window.parent.postMessage(
        {
          source: 'camelot_client',
          type,
          payload,
          timestamp: Date.now(),
        },
        '*'
      );
    }
  } catch (err) {
    console.debug('[UI Embedding] postMessage suppressed:', err);
  }
}

/**
 * Initializes listeners for incoming parent embedding commands
 */
export function setupUIEmbeddingBridge(onCommand?: (msg: EmbedHostMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (event: MessageEvent) => {
    try {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'CAMELOT_PARENT_EMBED_INIT' || data.type === 'CAMELOT_EMBED_PING') {
        sendEmbedEvent('CAMELOT_EMBED_PONG', {
          status: 'ready',
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1,
          },
        });
      }

      if (onCommand) {
        onCommand(data as EmbedHostMessage);
      }
    } catch {
      // Ignore cross-origin format anomalies
    }
  };

  window.addEventListener('message', handleMessage);

  // Send initial ready signal
  sendEmbedEvent('CAMELOT_EMBED_MOUNTED', {
    url: window.location.href,
    userAgent: navigator.userAgent,
    time: Date.now(),
  });

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
