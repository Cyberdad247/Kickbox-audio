export class CinematicAudioEngine {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private panner: StereoPannerNode | null = null;

  private currentStage: string = 'stop';
  private isMuted: boolean = false;
  private freqOffset: number = 0;
  private panValue: number = 0;
  private autoplayGateBound: boolean = false;

  private setupAutoplayGate() {
    if (this.autoplayGateBound || typeof window === 'undefined') return;
    this.autoplayGateBound = true;

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          console.log('[CinematicAudio] Autoplay gate unlocked via user gesture');
        }).catch(() => {});
      }
      ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlock);
      });
    };

    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlock, { passive: true, once: true });
    });
  }

  private init() {
    if (this.ctx) return;
    this.setupAutoplayGate();
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0; // start silent
      
      this.lowpass = this.ctx.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = 150; // keep it sub/atmospheric
      this.lowpass.Q.value = 1;

      if (this.ctx.createStereoPanner) {
        this.panner = this.ctx.createStereoPanner();
        this.panner.pan.value = this.panValue;
      }

      this.oscillator = this.ctx.createOscillator();
      this.oscillator.type = 'sine'; // pure low tone
      this.oscillator.frequency.value = 41.2; // E1

      this.oscillator.connect(this.lowpass);
      
      if (this.panner) {
        this.lowpass.connect(this.panner);
        this.panner.connect(this.gainNode);
      } else {
        this.lowpass.connect(this.gainNode);
      }
      
      this.gainNode.connect(this.ctx.destination);
      
      this.oscillator.start();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked', e);
    }
  }

  public setStage(stage: string) {
    this.currentStage = stage;
    this.applyState();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyState();
  }

  public setFrequencyOffset(offset: number) {
    this.freqOffset = offset;
    this.applyState();
  }

  public setPan(pan: number) {
    this.panValue = pan;
    if (this.panner && this.ctx) {
      // Smoothly transition the pan to avoid clicking
      this.panner.pan.setTargetAtTime(pan, this.ctx.currentTime, 0.1);
    }
  }

  private applyState() {
    if (!this.ctx) this.init();
    
    // Attempt to resume if suspended (e.g. requires user interaction)
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.ctx || !this.oscillator || !this.gainNode) return;

    const now = this.ctx.currentTime;
    
    let targetFreq = 41.2;
    let targetVol = 0.15; // Low volume background hum

    switch (this.currentStage) {
      case 'biometric':
        targetFreq = 41.2; // E1 (41.2 Hz) - Deep, anticipatory
        targetVol = 0.1;
        break;
      case 'boot':
        targetFreq = 55.0; // A1 (55.0 Hz) - Awakening / system boot
        targetVol = 0.15;
        break;
      case 'tenant_carousel':
        targetFreq = 65.4; // C2 (65.4 Hz) - Selection / discovery
        targetVol = 0.12;
        break;
      case 'knight_choice':
        targetFreq = 73.4; // D2 (73.4 Hz) - Forge / tension
        targetVol = 0.16;
        break;
      case 'citadel':
        targetFreq = 82.4; // E2 (82.4 Hz) - Arrival / harmonic resolve
        targetVol = 0.2;
        break;
      case 'stop':
      default:
        targetVol = 0;
        break;
    }

    if (this.isMuted) {
      targetVol = 0;
    }

    targetFreq += this.freqOffset;

    // Smoothly transition over 2.5 seconds
    this.oscillator.frequency.setTargetAtTime(Math.max(10, targetFreq), now, 1.0);
    this.gainNode.gain.setTargetAtTime(targetVol, now, 1.5);
  }

  public stop() {
    this.setStage('stop');
  }
}

export const cinematicAudio = new CinematicAudioEngine();
