// Offline ASR sidecar — Moonshine (MIT, Useful Sensors) via Transformers.js,
// loaded from a CDN at runtime. Lives in /public so Next.js/webpack never
// parses it (that's what broke Phase 3's first attempt — see
// AGENTS.md / PROVENANCE notes on the 2026-07-02 rearchitecture spike).
//
// Must be a MODULE worker (see how this file is constructed:
// `new Worker(url, { type: 'module' })`) — transformers.min.js contains
// `import.meta`, which only parses inside an ES module; classic
// importScripts() fails on it with a generic "NetworkError".
//
// dtype MUST be 'fp32'. The default (auto-selected 4-bit quantized decoder)
// hits a real onnxruntime-web bug: "Missing required scale:
// model.decoder.embed_tokens.weight_merged_0_scale" — confirmed via a real
// spike run, not assumed.

let transcriberPromise = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline } = await import(
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js'
      );
      return pipeline('automatic-speech-recognition', 'onnx-community/moonshine-tiny-ONNX', {
        dtype: 'fp32',
        progress_callback: (detail) => self.postMessage({ type: 'progress', detail }),
      });
    })();
  }
  return transcriberPromise;
}

self.onmessage = async (event) => {
  const { id, command, audio } = event.data;
  if (command !== 'transcribe') return;

  try {
    const transcriber = await getTranscriber();
    const output = await transcriber(audio);
    const result = Array.isArray(output) ? output[0] : output;
    self.postMessage({ id, type: 'result', text: result?.text?.trim() ?? '' });
  } catch (err) {
    self.postMessage({ id, type: 'error', message: String(err) });
  }
};
