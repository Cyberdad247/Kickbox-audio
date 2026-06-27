# [KOA REALM]: DEPLOYMENT GATES

1. Continuity Gate: the Lakeisha video avatar must not flash, pause, or reload when switching between Property, Streaming, and Coffee tabs.
2. Autoplay Gate: the video initializes muted with `autoPlay`; "Tap to Connect" unmutes and initializes browser `AudioContext`.
3. Bifrost Security Gate: client actions must not expose database credentials. Agent-native actions must run behind Bifrost or `/api/bifrost` when implemented.
4. Performance Gate: the 3D background must reduce animation work on low-power devices and keep browser memory bounded.
5. Build Gate: `npm run typecheck --workspace=pwa` and `npm run build --workspace=pwa` must pass before release.
