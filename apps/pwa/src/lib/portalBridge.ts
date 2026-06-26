'use client';

// Forward-compatibility bridge for the Lakisha portal stack.
// Each helper is no-op-safe so today's build succeeds without external deps.
// Once `@copilotkit/react-core` and a real Gaussian-splat loader land, replace
// the local shims by editing `apps/pwa/package.json` and re-pointing imports.

// ─── Kinetic / Gaussian-splat readiness shell ────────────────────────────────
// Today `KineticCanvas.tsx` is a CSS gradient shell. Once a real loader is
// added, these helpers enforce the audit gates the Anya Ω triage surfaced:
//   - SH-truncation at point of load (order ≤ 1)
//   - Vertex cap (<150,000) before GPU upload
//   - LOD downscale triggered when JS heap exceeds threshold
export const SH_MAX_ORDER = 1;
export const KINETIC_MAX_VERTICES = 150_000;
// Verification.md declares RSS <256MB total; per-loader threshold is not yet
// signed-off. 180 MB is a candidate (75% of RSS budget); pending HELIO_PATCH
// re-audit after a real Three.js Gaussian-splat loader lands.
export const KINETIC_HEAP_THRESHOLD_MB_CANDIDATE = 180;

export function truncateSHOrder<T extends { shOrder?: number }>(
  loaderData: T,
  maxOrder: number = SH_MAX_ORDER,
): T {
  if (loaderData.shOrder == null) return loaderData;
  return { ...loaderData, shOrder: Math.min(loaderData.shOrder, maxOrder) };
}

export function capVertexCount<T extends { vertexCount?: number }>(
  loaderData: T,
  maxVertices: number = KINETIC_MAX_VERTICES,
): T {
  if (loaderData.vertexCount == null) return loaderData;
  if (loaderData.vertexCount <= maxVertices) return loaderData;
  return { ...loaderData, vertexCount: maxVertices, downscaled: true };
}

export function shouldDownscaleOnMemoryPressure(): boolean {
  // `performance.memory` is Chrome-only. Treat absent as "no pressure".
  const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } })
    .memory;
  if (!perfMem) return false;
  const usedMB = perfMem.usedJSHeapSize / (1024 * 1024);
  return usedMB >= KINETIC_HEAP_THRESHOLD_MB_CANDIDATE;
}

// ─── CopilotKit shim ─────────────────────────────────────────────────────────
// Local `useCopilotReadable` stand-in until `@copilotkit/react-core` lands.
// The PortalSettings surface stays API-stable; the dependency swap is mechanical.
export function useCopilotReadable(_key: string, _value: unknown): void {
  // intentional no-op; replacement:
  //   import { useCopilotReadable } from '@copilotkit/react-core';
}

// ─── memory.md reader / local-state deleter ──────────────────────────────────
// Browser fetches the file via fetch('/memory.md'). The DELETE-via-API route is
// not implemented; deletion mutates local component state only. The stub is
// honest about this rather than running a shell-out from the browser.
export type MemoryEntry = { line: number; text: string };

export async function loadMemoryEntries(
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<MemoryEntry[]> {
  const res = await fetcher('/memory.md', { signal });
  if (!res.ok) return [];
  const body = await res.text();
  return body
    .split('\n')
    .map((text, idx) => ({ line: idx + 1, text }))
    .filter((e) => e.text.trim().startsWith('- ['));
}

export async function deleteMemoryEntry(_line: number): Promise<boolean> {
  // Server-side delete is gated on a future route. Returns false so the
  // curator can render a graceful "local-only" state.
  return false;
}
