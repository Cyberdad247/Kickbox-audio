// Client bridge to the offline voice sidecars in public/voice-engine/.
// Those files are plain static assets — Next.js/webpack never parses them,
// which is the whole point (see asr-worker.mjs's header comment for why the
// npm-package approach broke the production build).

interface WorkerRequestClient {
  request<T>(payload: Record<string, unknown>): Promise<T>;
}

function createRequestClient(workerUrl: string): WorkerRequestClient {
  let worker: Worker | null = null;
  let reqCounter = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  function getWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(workerUrl, { type: 'module' });
    worker.onmessage = (event: MessageEvent) => {
      const { id, type, ...rest } = event.data ?? {};
      if (type === 'progress') return; // model-download progress; no UI consumer yet
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (type === 'error') p.reject(new Error(rest.message));
      else p.resolve(rest);
    };
    worker.onerror = (event: ErrorEvent) => {
      for (const p of Array.from(pending.values())) p.reject(new Error(event.message));
      pending.clear();
    };
    return worker;
  }

  function request<T>(payload: Record<string, unknown>): Promise<T> {
    const id = ++reqCounter;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      getWorker().postMessage({ id, ...payload });
    });
  }

  return { request };
}

const asrClient = createRequestClient('/voice-engine/asr-worker.mjs');
const ttsClient = createRequestClient('/voice-engine/tts-worker.mjs');

/** Transcribe a 16kHz mono Float32Array (see audioCapture.ts) fully locally. */
export async function transcribeLocally(audio: Float32Array): Promise<string> {
  if (audio.length === 0) return '';
  const { text } = await asrClient.request<{ text: string }>({ command: 'transcribe', audio });
  return text;
}

export interface LocalSpeakOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

let currentAudio: HTMLAudioElement | null = null;

/** Synthesize and play a line fully locally. Barge-in: stops any in-flight local utterance. */
export async function speakLocally(text: string, opts: LocalSpeakOptions = {}): Promise<void> {
  if (!text) return;
  cancelLocalSpeech();

  const { blob } = await ttsClient.request<{ blob: Blob }>({
    command: 'speak',
    text,
    voice: opts.voice,
  });
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  currentAudio = audio;
  audio.onplay = () => opts.onStart?.();
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
    opts.onEnd?.();
  };
  await audio.play();
}

export function cancelLocalSpeech(): void {
  currentAudio?.pause();
  currentAudio = null;
}
