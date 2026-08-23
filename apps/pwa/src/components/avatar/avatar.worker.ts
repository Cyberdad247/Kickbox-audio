export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type AvatarType = 'Knight_Cyber' | 'Knight_Arcane' | 'Knight_Data';

export interface AvatarWorkerInitMessage {
  type: 'INIT';
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  dpr: number;
  avatarType: AvatarType;
  state: AvatarState;
}

export interface AvatarWorkerStateMessage {
  type: 'UPDATE_STATE';
  state: AvatarState;
  audioClock?: number;
  viseme?: number;
  avatarType?: AvatarType;
}

export interface AvatarWorkerCursorMessage {
  type: 'UPDATE_CURSOR';
  x: number; // -1.0 to 1.0
  y: number; // -1.0 to 1.0
}

export interface AvatarWorkerResizeMessage {
  type: 'RESIZE';
  width: number;
  height: number;
  dpr: number;
}

export interface AvatarWorkerDestroyMessage {
  type: 'DESTROY';
}

export type AvatarWorkerInboundMessage =
  | AvatarWorkerInitMessage
  | AvatarWorkerStateMessage
  | AvatarWorkerCursorMessage
  | AvatarWorkerResizeMessage
  | AvatarWorkerDestroyMessage;

// Palette definitions for Worker Canvas rendering
const THEMES: Record<
  AvatarType,
  {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    bgGradientStart: string;
    bgGradientEnd: string;
    title: string;
  }
> = {
  Knight_Cyber: {
    primary: '#00F0FF',
    secondary: '#FFD700',
    accent: '#0088FF',
    glow: 'rgba(0, 240, 255, 0.4)',
    bgGradientStart: '#050c14',
    bgGradientEnd: '#020508',
    title: 'SIR_CODEX [CYBER]',
  },
  Knight_Arcane: {
    primary: '#FF00FF',
    secondary: '#9D4EDD',
    accent: '#FFD700',
    glow: 'rgba(255, 0, 255, 0.4)',
    bgGradientStart: '#140514',
    bgGradientEnd: '#060208',
    title: 'MERLIN_Ω [ARCANE]',
  },
  Knight_Data: {
    primary: '#10B981',
    secondary: '#F59E0B',
    accent: '#00F0FF',
    glow: 'rgba(16, 185, 129, 0.4)',
    bgGradientStart: '#05140c',
    bgGradientEnd: '#020805',
    title: 'SIR_SENTINEL [DATA]',
  },
};

// State container inside worker
class AvatarRenderer {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private width = 200;
  private height = 200;
  private dpr = 1;

  private avatarType: AvatarType = 'Knight_Cyber';
  private state: AvatarState = 'idle';
  private audioClock = 0;
  private viseme = 0;

  // Eye tracking & kinematics
  private targetCursorX = 0;
  private targetCursorY = 0;
  private currentEyeX = 0;
  private currentEyeY = 0;

  // Animation ticks
  private frameCount = 0;
  private lastTime = 0;
  private blinkTimer = 0;
  private isBlinking = false;
  private thoughtRotation = 0;
  private ripplePhase = 0;
  private animationHandle: number | null = null;

  init(
    canvas: OffscreenCanvas,
    width: number,
    height: number,
    dpr: number,
    avatarType: AvatarType,
    state: AvatarState,
  ) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.avatarType = avatarType;
    this.state = state;

    this.ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    if (this.ctx) {
      this.canvas.width = Math.max(1, width * dpr);
      this.canvas.height = Math.max(1, height * dpr);
    }

    this.startLoop();
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    if (this.canvas) {
      this.canvas.width = Math.max(1, width * dpr);
      this.canvas.height = Math.max(1, height * dpr);
    }
  }

  updateState(state: AvatarState, audioClock?: number, viseme?: number, avatarType?: AvatarType) {
    this.state = state;
    if (audioClock !== undefined) this.audioClock = audioClock;
    if (viseme !== undefined) this.viseme = viseme;
    if (avatarType !== undefined) this.avatarType = avatarType;
  }

  updateCursor(x: number, y: number) {
    this.targetCursorX = Math.max(-1, Math.min(1, x));
    this.targetCursorY = Math.max(-1, Math.min(1, y));
  }

  private startLoop() {
    this.lastTime = performance.now();
    const loop = (timestamp: number) => {
      const delta = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      this.render(delta);
      this.animationHandle = requestAnimationFrame(loop);
    };
    this.animationHandle = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.animationHandle !== null) {
      cancelAnimationFrame(this.animationHandle);
      this.animationHandle = null;
    }
  }

  private render(dt: number) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.width * this.dpr;
    const h = this.height * this.dpr;
    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(w, h);
    const theme = THEMES[this.avatarType] || THEMES.Knight_Cyber;

    this.frameCount++;
    this.thoughtRotation += dt * 1.5;
    this.ripplePhase += dt * 3;

    // Smooth cursor eye interpolation (lerp)
    this.currentEyeX += (this.targetCursorX - this.currentEyeX) * Math.min(1, dt * 8);
    this.currentEyeY += (this.targetCursorY - this.currentEyeY) * Math.min(1, dt * 8);

    // Natural blink interval generator
    this.blinkTimer += dt;
    if (!this.isBlinking && this.blinkTimer > 3.5 + Math.sin(this.frameCount * 0.05) * 1.5) {
      this.isBlinking = true;
      this.blinkTimer = 0;
    }
    if (this.isBlinking && this.blinkTimer > 0.14) {
      this.isBlinking = false;
      this.blinkTimer = 0;
    }

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // 1. Background radial gradient & deep void texture
    const bgGrad = ctx.createRadialGradient(cx, cy, minDim * 0.1, cx, cy, minDim * 0.6);
    bgGrad.addColorStop(0, theme.bgGradientStart);
    bgGrad.addColorStop(1, theme.bgGradientEnd);
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, minDim * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // 2. Subtle geometric grid backdrop
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, minDim * 0.47, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1 * this.dpr;
    const step = 16 * this.dpr;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 3. State-driven outer rings & holograms
    this.renderAuraRings(ctx, cx, cy, minDim, theme, dt);

    // 4. Main Avatar Entity (Helm / Visor / Viseme / Spiral of Thought)
    if (this.state === 'thinking') {
      this.renderThinkingSpiral(ctx, cx, cy, minDim, theme);
    } else {
      this.renderKnightHelm(ctx, cx, cy, minDim, theme, dt);
    }

    // 5. Scanline overlay & Arthuric vignette
    this.renderScanlines(ctx, w, h);
  }

  private renderAuraRings(
    ctx: OffscreenCanvasRenderingContext2D,
    cx: number,
    cy: number,
    minDim: number,
    theme: (typeof THEMES)['Knight_Cyber'],
    dt: number,
  ) {
    const rBase = minDim * 0.42;

    // Outer boundary ring with Arthurian ticks
    ctx.save();
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 8 * this.dpr;

    ctx.beginPath();
    ctx.arc(cx, cy, rBase, 0, Math.PI * 2);
    ctx.stroke();

    // Ticks around the perimeter
    const numTicks = 32;
    for (let i = 0; i < numTicks; i++) {
      const angle =
        (i / numTicks) * Math.PI * 2 + (this.state === 'listening' ? this.ripplePhase * 0.2 : 0);
      const isMajor = i % 4 === 0;
      const tickLen = (isMajor ? 8 : 4) * this.dpr;
      const x1 = cx + Math.cos(angle) * (rBase - tickLen);
      const y1 = cy + Math.sin(angle) * (rBase - tickLen);
      const x2 = cx + Math.cos(angle) * rBase;
      const y2 = cy + Math.sin(angle) * rBase;

      ctx.strokeStyle = isMajor ? theme.secondary : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = (isMajor ? 1.5 : 0.8) * this.dpr;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Dynamic Listening / Speaking Expanding Pulses
    if (this.state === 'listening' || this.state === 'speaking') {
      const numWaves = 3;
      for (let i = 0; i < numWaves; i++) {
        const offset = (this.ripplePhase + i * ((Math.PI * 2) / numWaves)) % (Math.PI * 2);
        const waveRadius = minDim * 0.25 + (offset / (Math.PI * 2)) * (minDim * 0.22);
        const waveAlpha = Math.max(0, 1 - offset / (Math.PI * 2));

        ctx.strokeStyle = this.state === 'speaking' ? theme.primary : theme.secondary;
        ctx.globalAlpha = waveAlpha * 0.5;
        ctx.lineWidth = 2 * this.dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  private renderKnightHelm(
    ctx: OffscreenCanvasRenderingContext2D,
    cx: number,
    cy: number,
    minDim: number,
    theme: (typeof THEMES)['Knight_Cyber'],
    dt: number,
  ) {
    ctx.save();

    // Subtle 4fps breathing oscillation
    const breath = Math.sin(this.frameCount * 0.08) * (2 * this.dpr);
    const helmCy = cy + breath;
    const helmRadius = minDim * 0.24;

    // Helm Crest / Aura
    ctx.fillStyle = 'rgba(10, 20, 30, 0.8)';
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2 * this.dpr;
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 12 * this.dpr;

    // Sacred Cyber Helm Polygon Path
    ctx.beginPath();
    ctx.moveTo(cx, helmCy - helmRadius * 1.25); // Top crest apex
    ctx.lineTo(cx + helmRadius * 0.9, helmCy - helmRadius * 0.4);
    ctx.lineTo(cx + helmRadius * 0.8, helmCy + helmRadius * 0.7);
    ctx.lineTo(cx, helmCy + helmRadius * 1.15); // Chin guard
    ctx.lineTo(cx - helmRadius * 0.8, helmCy + helmRadius * 0.7);
    ctx.lineTo(cx - helmRadius * 0.9, helmCy - helmRadius * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Helm Forehead Heraldic Sigil / Crown Rune
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.beginPath();
    ctx.moveTo(cx, helmCy - helmRadius * 1.1);
    ctx.lineTo(cx - helmRadius * 0.35, helmCy - helmRadius * 0.65);
    ctx.lineTo(cx + helmRadius * 0.35, helmCy - helmRadius * 0.65);
    ctx.closePath();
    ctx.stroke();

    // Center visor slot
    const visorWidth = helmRadius * 1.1;
    const visorHeight = helmRadius * 0.32;
    const visorY = helmCy - visorHeight * 0.3;

    ctx.fillStyle = '#020406';
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 1 * this.dpr;
    ctx.beginPath();
    ctx.roundRect(cx - visorWidth / 2, visorY, visorWidth, visorHeight, 4 * this.dpr);
    ctx.fill();
    ctx.stroke();

    // Eyes / Visor Optics with Gaze Tracking
    if (!this.isBlinking) {
      const maxEyeOffset = 8 * this.dpr;
      const eyeX = cx + this.currentEyeX * maxEyeOffset;
      const eyeY = visorY + visorHeight / 2 + this.currentEyeY * (3 * this.dpr);
      const eyeSpacing = 14 * this.dpr;
      const eyeRadius = 3.5 * this.dpr;

      ctx.fillStyle = theme.primary;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 10 * this.dpr;

      // Left Eye
      ctx.beginPath();
      ctx.arc(eyeX - eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Right Eye
      ctx.beginPath();
      ctx.arc(eyeX + eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Connecting holographic HUD line between optics
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(eyeX - eyeSpacing, eyeY);
      ctx.lineTo(eyeX + eyeSpacing, eyeY);
      ctx.stroke();
    } else {
      // Blinking horizontal slit
      const eyeY = visorY + visorHeight / 2;
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 1 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(cx - 18 * this.dpr, eyeY);
      ctx.lineTo(cx + 18 * this.dpr, eyeY);
      ctx.stroke();
    }

    // Viseme / Mouth Aperture (Speaking 15fps synchronized to audio_clock)
    if (this.state === 'speaking') {
      const mouthY = helmCy + helmRadius * 0.55;
      const clockMod = (this.audioClock % 10) / 10;
      const speechOpen =
        (Math.sin(this.frameCount * 0.4) * 0.5 + 0.5) * (10 * this.dpr) * (this.viseme || 1.0);
      const mouthWidth = (14 + clockMod * 6) * this.dpr;

      ctx.fillStyle = theme.primary;
      ctx.strokeStyle = theme.secondary;
      ctx.lineWidth = 1.5 * this.dpr;

      ctx.beginPath();
      ctx.ellipse(
        cx,
        mouthY,
        mouthWidth / 2,
        Math.max(2 * this.dpr, speechOpen / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();

      // Acoustic energy bar under chin
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(cx - 20 * this.dpr, helmCy + helmRadius * 0.9);
      ctx.lineTo(cx + 20 * this.dpr, helmCy + helmRadius * 0.9);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderThinkingSpiral(
    ctx: OffscreenCanvasRenderingContext2D,
    cx: number,
    cy: number,
    minDim: number,
    theme: (typeof THEMES)['Knight_Cyber'],
  ) {
    ctx.save();
    const spiralRadius = minDim * 0.32;

    // Outer sacred geometry ring
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.shadowColor = theme.secondary;
    ctx.shadowBlur = 15 * this.dpr;

    ctx.beginPath();
    ctx.arc(cx, cy, spiralRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Logarithmic Spiral of Thought
    ctx.translate(cx, cy);
    ctx.rotate(this.thoughtRotation);

    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2 * this.dpr;
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 10 * this.dpr;

    ctx.beginPath();
    const numPoints = 80;
    for (let i = 0; i < numPoints; i++) {
      const angle = 0.15 * i;
      const r = (i / numPoints) * spiralRadius;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Rotating Arthurian Rune Nodes
    const numRunes = 5;
    for (let k = 0; k < numRunes; k++) {
      const rAngle = (k / numRunes) * Math.PI * 2 - this.thoughtRotation * 1.5;
      const rx = Math.cos(rAngle) * (spiralRadius * 0.7);
      const ry = Math.sin(rAngle) * (spiralRadius * 0.7);

      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderScanlines(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    const scanStep = 4 * this.dpr;
    for (let y = 0; y < h; y += scanStep) {
      ctx.fillRect(0, y, w, 1 * this.dpr);
    }
    ctx.restore();
  }
}

// Instantiate worker singleton renderer
const renderer = new AvatarRenderer();

self.onmessage = (evt: MessageEvent<AvatarWorkerInboundMessage>) => {
  const msg = evt.data;
  switch (msg.type) {
    case 'INIT':
      renderer.init(msg.canvas, msg.width, msg.height, msg.dpr, msg.avatarType, msg.state);
      break;
    case 'UPDATE_STATE':
      renderer.updateState(msg.state, msg.audioClock, msg.viseme, msg.avatarType);
      break;
    case 'UPDATE_CURSOR':
      renderer.updateCursor(msg.x, msg.y);
      break;
    case 'RESIZE':
      renderer.resize(msg.width, msg.height, msg.dpr);
      break;
    case 'DESTROY':
      renderer.destroy();
      break;
  }
};
