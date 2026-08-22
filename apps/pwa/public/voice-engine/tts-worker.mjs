// Offline TTS sidecar — Kokoro-82M via kokoro-js, loaded from a CDN at
// runtime. Lives in /public so Next.js/webpack never parses it. See
// asr-worker.mjs's header comment for why this must be a module worker.
//
// Loaded from esm.sh, NOT jsdelivr: kokoro-js's own dist/kokoro.js contains
// a bare import specifier (`import ... from '@huggingface/transformers'`),
// which works under Node/webpack module resolution but is not resolvable by
// a browser loading the file directly from a URL with no import map — it
// throws "Failed to resolve module specifier". esm.sh rewrites bare
// specifiers into real resolvable URLs; jsdelivr serves files as-is and
// hits this. Confirmed via a real spike run, not assumed.

let ttsPromise = null;

async function getTts() {
  if (!ttsPromise) {
    ttsPromise = (async () => {
      const { KokoroTTS } = await import('https://esm.sh/kokoro-js@1.2.1');
      return KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8',
        progress_callback: (detail) => self.postMessage({ type: 'progress', detail }),
      });
    })();
  }
  return ttsPromise;
}

self.onmessage = async (event) => {
  const { id, command, text, voice } = event.data;
  if (command !== 'speak') return;

  try {
    const tts = await getTts();
    const audio = await tts.generate(text, { voice: voice ?? 'af_sky' });
    const blob = audio.toBlob();
    self.postMessage({ id, type: 'result', blob });
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err) });
  }
};
