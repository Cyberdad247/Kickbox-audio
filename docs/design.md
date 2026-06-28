# [KOA REALM]: LIVING BRUTALISM & SPATIAL UI (v2.0)

## 1. The Dynamic Substrate

- Engine: Three.js / `@react-three/fiber`.
- Logic: the background is an interactive, transparent 3D layer bound to Cleveland, OH weather and local time.
- Day/Clear: volumetric gold light and high-intensity directional lighting.
- Night/Rain: deep obsidian void with Electric Violet `#9D4EDD` particle rain.
- Rule: visible UI components must use `bg-[#16161E]/70` with `backdrop-blur-xl` so the 3D environment remains visible through the application.

## 2. Lakeisha's Persistence

- Position: fixed `bottom-8 right-8`, `z-50`.
- Media: native HTML5 `<video>` using `/assets/lakisha_avatar.mp4`.
- State: mounted through `<KoARealmProvider>` at the root. She must persist across tab and route changes.
- Autoplay: initializes muted with `autoPlay`; "Tap to Connect" unmutes and initializes browser `AudioContext`.

## 3. The Visual Plan

- Knight proposals render as dynamic floating UI cards rather than raw JSON.
- Visual Plan cards use `border-gold/50 shadow-[0_0_15px_#FFD700]`.
- Multiplayer cursor/status indicators use live dots when a Knight is modifying a field.
