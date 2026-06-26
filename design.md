# [KICKBOX AUDIO] — LUXURY MINIMALIST BRUTALISM

Source-of-Truth design law for the Sovereign System. **Additive** governance doc
(sidecar to `blueprint.md`, `task.md`, `verification.md`, and `HELIO_PATCH.json`).
Mirrors the palette extensions in `apps/pwa/tailwind.config.ts` and is consistent
with the architectural doctrine in `blueprint.md §2` (Metallic Design System).

## 1. COLOR TOKENS

| Token            | Hex       | Tailwind class                       | Use                                                                  |
| ---------------- | --------- | ------------------------------------ | -------------------------------------------------------------------- |
| Void             | `#050505` | `bg-void-950` / `text-void-950`      | Base layer; pure matte black (`apps/pwa/src/app/globals.css` driver). No `bg-obsidian` token exists in `apps/pwa/tailwind.config.ts` — if a surface-on-light alias is needed, extend the palette via a separate PR. |
| Plate (Smoked Glass) | `#16161E` | `bg-plate-900`                       | Cards / frames; 80% opacity + `backdrop-blur-md` is the default      |
| Filigree         | `#D4AF37` | `border-filigree-500`                | Metallic borders @ 20% opacity, 1px frames                           |
| Royal Gold       | `#FFD700` | `text-gold-royal` / `bg-gold-royal`  | Active emphasis, numerics, glow shadows                              |
| Gold             | `#D4AF37` | `text-gold` / `border-gold`          | Default gold; primary CTA borders                                    |
| Gold-Light       | `#FFD700` | `text-gold-light`                    | Lighter reading on small UI                                          |
| Electric Violet  | `#9D4EDD` | `bg-violet` / `text-violet`          | Active-state accent @ `shadow-glow` (12px external halation)         |
| Kinetic Violet   | `#9D4EDD` | `bg-kinetic-500`                     | Same Violet, semantic alias for kinetic-flow contexts                |

## 2. TYPOGRAPHY

| Role                                | Family                            | Tailwind / CSS                                       | Notes                                                                                |
| ----------------------------------- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Display / titles / numerics         | **Source Serif 4**                | `font-serif` (CSS var `--font-source-serif`)        | Negative letter-spacing (`-0.02em`) on financial values; `tracking-executive` (0.1em) on small  |
| Body / UI                           | **Inter**                         | `font-sans` (CSS var `--font-inter`)                 | Tracking increase on small fineprint for legibility against Obsidian                |
| Code / HUD telemetry                | `font-mono`                       | implicit (browser fallback)                          | All caps + `tracking-widest` on `text-[10px]` badges (`TELEMETRY_HUD` style)         |

## 3. LAYOUT

- **Grid**: 12-column fixed; no auto-fit, no auto-fill
- **Corner radius**: `0px` on all data cards (`tailwind.config.ts borderRadius.none`).
  Rounded-sm only on HUD chrome / overlays.
- **Card borderweight**: 1px gold frame @ 20% opacity (`border-gold/20` / `border-filigree-500/20`)
- **Surface opacity**: 80% with `backdrop-blur: 12px` (`tailwind.config.ts backdropBlur.plate`)
- **Z-axis layering**:
  - Below all content: `KineticCanvas` at `-z-10` (background layer; WebGL weather wallpaper)
  - Mid-stack: HUD navigation pane (Lakisha sidebar, Dashboard aside)
  - Top: Lakisha HUD overlay (z-50)

## 4. HUD CHROME

- **Anchor**: Bottom-right anchored Lakisha HUD (`.fixed bottom-8 right-8`)
  — until autoplay-gate is dismissed, the gate occupies this slot and full HUD hangs at the bottom-center (per `page.tsx`)
- **Backdrop**: `bg-plate-900/85 backdrop-blur-md` (smoked glass)
- **Stroke**: 1px gold (`border-gold/40` → `border-gold/70` when actively listening)
- **Elevation**:
  - Listening → `border-violet/40 shadow-[0_0_12px_#9D4EDD]`
  - Speaking  → `border-gold-royal/70 shadow-gold`
  - Idle      → `border-gold/40 shadow-gold`
- **Active dot**: violet (`bg-violet`) when listening+voiced, gold when budget breach

## 5. WHAT THIS DOC IS NOT

- **Not a replacement** for `blueprint.md` (architectural doctrine, data models, monorepo structure)
- **Not a replacement** for `verification.md` (release-criteria checklist: RSS <256MB, bundle <150KB, `connection_limit=5`, Playwright harness)
- **Not a replacement** for `task.md` (PHASE 1-4 work matrix, deployment milestones)
- **Not a replacement** for `HELIO_PATCH.json` (generated audit artifact; re-run after design-system changes)

If you change a token, update `apps/pwa/tailwind.config.ts` first, then mirror here. If
you change a release threshold, update `verification.md` (signed-off evidence) and
re-append a `[HELIO_AUDIT_RE_RUN]` provenance-ledger entry.

## 6. CONSUMERS

- `apps/pwa/tailwind.config.ts` (palette extensions)
- `apps/pwa/src/app/globals.css` (root var registration)
- `apps/pwa/src/components/*` (Tailwind class composition)
- `audit-kickbox-audio/blueprint.md §2` (overlapping design intent — kept in sync by hand)
- Automated conformance scan: `audit-kickbox-audio/HELIO_PATCH.json` (re-run on demand)
