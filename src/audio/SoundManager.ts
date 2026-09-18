/**
 * Sound effect classifications in Wakabyte engine.
 */
export enum SoundType {
  PELLET = 'PELLET',
  ENERGIZER = 'ENERGIZER',
  GHOST_EATEN = 'GHOST_EATEN',
  DEATH = 'DEATH',
  LEVEL_CLEAR = 'LEVEL_CLEAR',
  GAME_START = 'GAME_START',
  EXTRA_LIFE = 'EXTRA_LIFE',
}

/**
 * Continuous background ambient sound modes.
 */
export enum AmbientMode {
  NONE = 'NONE',
  SIREN = 'SIREN',
  FRIGHTENED = 'FRIGHTENED',
  EYES = 'EYES',
}

export interface SoundManagerOptions {
  context?: AudioContext | null;
  masterVolume?: number;
  sfxVolume?: number;
  ambientVolume?: number;
  muted?: boolean;
}

export interface AmbientStateQuery {
  isFrightened: boolean;
  hasEatenGhosts: boolean;
  isPaused: boolean;
  isGameOver: boolean;
}

export interface WakaFrequencies {
  toneA: number;
  toneB: number;
}

/**
 * Procedural Web Audio Synthesizer for Wakabyte 2D Arcade Engine.
 * Generates authentic 8-bit retro sound effects and ambient sirens with zero external audio assets.
 */
export class SoundManager {
  private readonly context: AudioContext | null;
  private readonly masterGain: GainNode | null = null;
  private readonly sfxGain: GainNode | null = null;
  private readonly ambientGain: GainNode | null = null;

  private masterVolume: number;
  private sfxVolume: number;
  private ambientVolume: number;
  private muted: boolean;

  private readonly wakaToneA = 330;
  private readonly wakaToneB = 490;
  private isWakaToneA = true;

  private currentAmbientMode: AmbientMode = AmbientMode.NONE;
  private activeAmbientOsc: OscillatorNode | null = null;
  private activeAmbientLfo: OscillatorNode | null = null;
  private activeAmbientGain: GainNode | null = null;

  constructor(options: SoundManagerOptions = {}) {
    this.masterVolume = this.clampVolume(options.masterVolume ?? 1.0);
    this.sfxVolume = this.clampVolume(options.sfxVolume ?? 1.0);
    this.ambientVolume = this.clampVolume(options.ambientVolume ?? 0.5);
    this.muted = options.muted ?? false;

    if (options.context !== undefined) {
      this.context = options.context;
    } else if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioCtxClass();
    } else {
      this.context = null;
    }

    if (this.context) {
      try {
        this.masterGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        this.ambientGain = this.context.createGain();

        this.sfxGain.connect(this.masterGain);
        this.ambientGain.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);

        this.updateGainNodes();
      } catch {
        // Fallback for mocked contexts missing connections
      }
    }
  }

  /**
   * Unlocks and resumes audio context on user gesture (click/keydown).
   */
  public async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  public isInitialized(): boolean {
    return this.context !== null;
  }

  public getContext(): AudioContext | null {
    return this.context;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = this.clampVolume(volume);
    this.updateGainNodes();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = this.clampVolume(volume);
    this.updateGainNodes();
  }

  public getAmbientVolume(): number {
    return this.ambientVolume;
  }

  public setAmbientVolume(volume: number): void {
    this.ambientVolume = this.clampVolume(volume);
    this.updateGainNodes();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateGainNodes();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public getWakaFrequencies(): WakaFrequencies {
    return { toneA: this.wakaToneA, toneB: this.wakaToneB };
  }

  public resetWaka(): void {
    this.isWakaToneA = true;
  }

  public getAmbientMode(): AmbientMode {
    return this.currentAmbientMode;
  }

  /**
   * Synthesizes alternating rhythmic chomp ("waka-waka") for pellet consumption.
   */
  public playPellet(): void {
    if (!this.context || !this.sfxGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const duration = 0.08;
    const frequency = this.isWakaToneA ? this.wakaToneA : this.wakaToneB;
    this.isWakaToneA = !this.isWakaToneA;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.linearRampToValueAtTime(frequency * 0.8, now + duration);

    this.playSfxTone(osc, now, duration, 1.0);
  }

  /**
   * Synthesizes energizer collection chime.
   */
  public playEnergizer(): void {
    if (!this.context || !this.sfxGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const duration = 0.18;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + duration * 0.7);
    osc.frequency.exponentialRampToValueAtTime(660, now + duration);

    this.playSfxTone(osc, now, duration, 1.0);
  }

  /**
   * Synthesizes rapid ascending arpeggio when a frightened ghost is eaten.
   */
  public playGhostEaten(): void {
    if (!this.context || !this.sfxGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const notes = [440, 587, 659, 880];
    const noteDuration = 0.05;

    notes.forEach((freq, index) => {
      const startTime = now + index * noteDuration;
      const osc = ctx.createOscillator();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      this.playSfxTone(osc, startTime, noteDuration, 0.8);
    });
  }

  /**
   * Synthesizes authentic descending stepped chirps when Pacman dies.
   */
  public playDeath(): void {
    this.stopAmbient();

    if (!this.context || !this.sfxGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const steps = [784, 740, 698, 659, 622, 587, 523, 494, 440, 392, 349, 261, 130];
    const stepDuration = 0.07;

    steps.forEach((freq, index) => {
      const startTime = now + index * stepDuration;
      const osc = ctx.createOscillator();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.linearRampToValueAtTime(freq * 0.85, startTime + stepDuration);

      this.playSfxTone(osc, startTime, stepDuration, 0.9);
    });
  }

  /**
   * Synthesizes game start opening melody.
   */
  public playGameStart(): void {
    if (!this.context || !this.sfxGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const melody = [523, 1046, 784, 659, 1046, 784, 659];
    const noteDuration = 0.12;

    melody.forEach((freq, index) => {
      const startTime = now + index * noteDuration;
      const osc = ctx.createOscillator();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      this.playSfxTone(osc, startTime, noteDuration, 0.7);
    });
  }

  /**
   * Synthesizes level clear fanfare.
   */
  public playLevelClear(): void {
    if (!this.context || !this.sfxGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const fanfare = [523, 659, 784, 1046];
    const noteDuration = 0.15;

    fanfare.forEach((freq, index) => {
      const startTime = now + index * noteDuration;
      const osc = ctx.createOscillator();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      this.playSfxTone(osc, startTime, noteDuration, 0.8);
    });
  }

  /**
   * Synthesizes extra life award sound.
   */
  public playExtraLife(): void {
    if (!this.context || !this.sfxGain) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const notes = [880, 1320];
    const noteDuration = 0.1;

    notes.forEach((freq, index) => {
      const startTime = now + index * noteDuration;
      const osc = ctx.createOscillator();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      this.playSfxTone(osc, startTime, noteDuration, 0.9);
    });
  }

  /**
   * Updates continuous ambient siren/hum based on current gameplay state.
   */
  public updateAmbient(mode: AmbientMode): void {
    if (this.currentAmbientMode === mode) return;

    this.stopAmbient();
    this.currentAmbientMode = mode;

    if (mode === AmbientMode.NONE || !this.context || !this.ambientGain) {
      return;
    }

    const ctx = this.context;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const toneGain = ctx.createGain();

    switch (mode) {
      case AmbientMode.SIREN: {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);

        // Low frequency oscillator (LFO) for siren pitch modulation
        try {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(3, now); // 3Hz modulation
          lfoGain.gain.setValueAtTime(80, now); // +/- 80Hz

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency as any);
          lfo.start(now);
          this.activeAmbientLfo = lfo;
        } catch {
          // Fallback if AudioParam connection unsupported
        }

        toneGain.gain.setValueAtTime(0.4, now);
        break;
      }

      case AmbientMode.FRIGHTENED: {
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);

        try {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(6, now);
          lfoGain.gain.setValueAtTime(40, now);

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency as any);
          lfo.start(now);
          this.activeAmbientLfo = lfo;
        } catch {
          // Fallback
        }

        toneGain.gain.setValueAtTime(0.35, now);
        break;
      }

      case AmbientMode.EYES: {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);

        try {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(10, now);
          lfoGain.gain.setValueAtTime(150, now);

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency as any);
          lfo.start(now);
          this.activeAmbientLfo = lfo;
        } catch {
          // Fallback
        }

        toneGain.gain.setValueAtTime(0.45, now);
        break;
      }
    }

    osc.connect(toneGain);
    toneGain.connect(this.ambientGain);

    osc.start(now);
    this.activeAmbientOsc = osc;
    this.activeAmbientGain = toneGain;
  }

  /**
   * Stops active ambient sound nodes.
   */
  public stopAmbient(): void {
    if (this.activeAmbientOsc) {
      try {
        this.activeAmbientOsc.stop();
        this.activeAmbientOsc.disconnect();
      } catch {}
      this.activeAmbientOsc = null;
    }

    if (this.activeAmbientLfo) {
      try {
        this.activeAmbientLfo.stop();
        this.activeAmbientLfo.disconnect();
      } catch {}
      this.activeAmbientLfo = null;
    }

    if (this.activeAmbientGain) {
      try {
        this.activeAmbientGain.disconnect();
      } catch {}
      this.activeAmbientGain = null;
    }

    this.currentAmbientMode = AmbientMode.NONE;
  }

  /**
   * Stops all ambient and resets sound synthesis.
   */
  public stopAll(): void {
    this.stopAmbient();
  }

  /**
   * Determines appropriate ambient mode from game state.
   */
  public static resolveAmbientMode(state: AmbientStateQuery): AmbientMode {
    if (state.isPaused || state.isGameOver) {
      return AmbientMode.NONE;
    }

    if (state.hasEatenGhosts) {
      return AmbientMode.EYES;
    }

    if (state.isFrightened) {
      return AmbientMode.FRIGHTENED;
    }

    return AmbientMode.SIREN;
  }

  private playSfxTone(
    osc: OscillatorNode,
    startTime: number,
    duration: number,
    peakGain = 1.0,
    targetGain: GainNode = this.sfxGain!
  ): GainNode {
    const ctx = this.context!;
    const noteGain = ctx.createGain();

    noteGain.gain.setValueAtTime(peakGain, startTime);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(noteGain);
    noteGain.connect(targetGain);

    osc.start(startTime);
    osc.stop(startTime + duration);

    return noteGain;
  }

  private clampVolume(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  private updateGainNodes(): void {
    if (!this.masterGain || !this.sfxGain || !this.ambientGain || !this.context) return;

    const now = this.context.currentTime;
    const effectiveMaster = this.muted ? 0 : this.masterVolume;

    try {
      this.masterGain.gain.setValueAtTime(effectiveMaster, now);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, now);
    } catch {
      this.masterGain.gain.value = effectiveMaster;
      this.sfxGain.gain.value = this.sfxVolume;
      this.ambientGain.gain.value = this.ambientVolume;
    }
  }
}
