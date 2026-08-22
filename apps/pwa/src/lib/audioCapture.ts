// HYBRID_VOICE_ASSISTANT_vMAX · offline //INGEST substrate
// Captures raw mic PCM into a single Float32Array resampled to 16kHz mono —
// the input format expected by the Moonshine ASR sidecar. Only used by the
// local-ASR fallback path (useLakishaVoice.ts); the online Web Speech path
// never touches this. Pure Web Audio API — no external dependencies, so it
// was unaffected by the Phase 3 webpack/onnxruntime-web bundling issue.

const TARGET_SAMPLE_RATE = 16000;

export interface AudioRecorder {
  stop: () => Promise<Float32Array>;
}

/**
 * Start recording raw PCM from an already-open mic MediaStream. Returns a
 * handle whose stop() resolves with the recorded audio resampled to 16kHz
 * mono Float32Array, ready to hand to the ASR sidecar.
 */
export function startRecording(stream: MediaStream): AudioRecorder {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessorNode is deprecated but has universal support; AudioWorklet
  // would need a separate module file served to the browser, not worth the
  // complexity for this short-lived, low-frequency recording use case.
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];

  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  // ScriptProcessorNode only fires onaudioprocess once connected downstream
  // to a destination. Route through a silent gain so the mic isn't audibly
  // looped back to speakers (feedback risk otherwise).
  const silentGain = ctx.createGain();
  silentGain.gain.value = 0;
  processor.connect(silentGain);
  silentGain.connect(ctx.destination);

  const stop = async (): Promise<Float32Array> => {
    processor.disconnect();
    source.disconnect();
    const nativeRate = ctx.sampleRate;
    await ctx.close();

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    if (nativeRate === TARGET_SAMPLE_RATE || total === 0) return merged;
    return resample(merged, nativeRate, TARGET_SAMPLE_RATE);
  };

  return { stop };
}

// Offline resample via OfflineAudioContext — the standard browser technique,
// independent of any specific ASR library's version/API.
async function resample(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Promise<Float32Array> {
  const OfflineCtor =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const outLength = Math.ceil((input.length * toRate) / fromRate);
  const offlineCtx = new OfflineCtor(1, outLength, toRate);

  const inputBuffer = offlineCtx.createBuffer(1, input.length, fromRate);
  // Fresh copy guarantees a plain-ArrayBuffer-backed Float32Array, matching
  // copyToChannel's stricter modern-lib type (vs. the looser ArrayBufferLike
  // the merged recording buffer is typed as).
  inputBuffer.copyToChannel(new Float32Array(input), 0);

  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = inputBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start();

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}
