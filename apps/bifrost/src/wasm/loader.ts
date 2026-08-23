// WASM Loader for zero-copy memory slabs
import fs from 'fs';
import path from 'path';

let wasmInstance: WebAssembly.Instance | null = null;

export async function getWasmInstance() {
  if (wasmInstance) return wasmInstance;
  const wasmBuffer = fs.readFileSync(path.join(__dirname, 'ooda_telemetry.wasm'));
  const module = await WebAssembly.instantiate(wasmBuffer, {
    env: {
      memory: new WebAssembly.Memory({ initial: 256, maximum: 256, shared: true }),
    }
  });
  wasmInstance = module.instance;
  return wasmInstance;
}
