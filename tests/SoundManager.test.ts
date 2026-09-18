import { describe, it, expect, beforeEach } from 'vitest';
import { SoundManager, AmbientMode } from '../src/audio';

/**
 * Mock AudioParam tracking automation curves and value changes.
 */
export class MockAudioParam {
  public value: number;
  public defaultValue: number;
  public minValue: number;
  public maxValue: number;
  public events: { type: string; value: number; time: number }[] = [];

  constructor(defaultValue = 1) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
    this.minValue = -3.4e38;
    this.maxValue = 3.4e38;
  }

  public setValueAtTime(value: number, startTime: number): MockAudioParam {
    this.value = value;
    this.events.push({ type: 'setValueAtTime', value, time: startTime });
    return this;
  }

  public linearRampToValueAtTime(value: number, endTime: number): MockAudioParam {
    this.value = value;
    this.events.push({ type: 'linearRampToValueAtTime', value, time: endTime });
    return this;
  }

  public exponentialRampToValueAtTime(value: number, endTime: number): MockAudioParam {
    this.value = value;
    this.events.push({ type: 'exponentialRampToValueAtTime', value, time: endTime });
    return this;
  }

  public setTargetAtTime(target: number, startTime: number, _timeConstant: number): MockAudioParam {
    this.value = target;
    this.events.push({ type: 'setTargetAtTime', value: target, time: startTime });
    return this;
  }

  public cancelScheduledValues(cancelTime: number): MockAudioParam {
    this.events.push({ type: 'cancelScheduledValues', value: 0, time: cancelTime });
    return this;
  }
}

/**
 * Mock AudioNode base class for signal graph tracking.
 */
export class MockAudioNode {
  public context: MockAudioContext;
  public connectedTo: (MockAudioNode | MockAudioParam)[] = [];

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  public connect(destination: any): any {
    this.connectedTo.push(destination);
    return destination;
  }

  public disconnect(destination?: any): void {
    if (destination) {
      this.connectedTo = this.connectedTo.filter((dest) => dest !== destination);
    } else {
      this.connectedTo = [];
    }
  }
}

/**
 * Mock GainNode tracking volume scaling.
 */
export class MockGainNode extends MockAudioNode {
  public gain: MockAudioParam;

  constructor(context: MockAudioContext, initialGain = 1) {
    super(context);
    this.gain = new MockAudioParam(initialGain);
  }
}

/**
 * Mock OscillatorNode tracking waveform synthesis.
 */
export class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency: MockAudioParam;
  public detune: MockAudioParam;
  public started: boolean = false;
  public stopped: boolean = false;
  public startTime: number | null = null;
  public stopTime: number | null = null;
  public onended: (() => void) | null = null;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(440);
    this.detune = new MockAudioParam(0);
  }

  public start(when = 0): void {
    this.started = true;
    this.startTime = when;
  }

  public stop(when = 0): void {
    this.stopped = true;
    this.stopTime = when;
    if (this.onended) {
      this.onended();
    }
  }
}

/**
 * Comprehensive Mock AudioContext for headless Web Audio testing.
 */
export class MockAudioContext {
  public state: AudioContextState = 'running';
  public currentTime: number = 0;
  public sampleRate: number = 44100;
  public destination: MockGainNode;
  public createdOscillators: MockOscillatorNode[] = [];
  public createdGainNodes: MockGainNode[] = [];

  constructor(initialState: AudioContextState = 'running') {
    this.state = initialState;
    this.destination = new MockGainNode(this, 1);
  }

  public createOscillator(): MockOscillatorNode {
    const osc = new MockOscillatorNode(this);
    this.createdOscillators.push(osc);
    return osc;
  }

  public createGain(): MockGainNode {
    const gain = new MockGainNode(this, 1);
    this.createdGainNodes.push(gain);
    return gain;
  }

  public async resume(): Promise<void> {
    this.state = 'running';
  }

  public async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  public async close(): Promise<void> {
    this.state = 'closed';
  }

  public advanceTime(seconds: number): void {
    this.currentTime += seconds;
  }
}

describe('Procedural Web Audio Synthesizer (Phase 6.2)', () => {
  let mockContext: MockAudioContext;
  let soundManager: SoundManager;

  beforeEach(() => {
    mockContext = new MockAudioContext('running');
    soundManager = new SoundManager({
      context: mockContext as unknown as AudioContext,
    });
  });

  describe('Initialization & AudioContext Lifecycle', () => {
    it('initializes with default volume and unmuted status', () => {
      expect(soundManager.getMasterVolume()).toBe(1);
      expect(soundManager.getSfxVolume()).toBe(1);
      expect(soundManager.getAmbientVolume()).toBe(0.5);
      expect(soundManager.isMuted()).toBe(false);
      expect(soundManager.isInitialized()).toBe(true);
    });

    it('initializes with custom volumes', () => {
      const customManager = new SoundManager({
        context: mockContext as unknown as AudioContext,
        masterVolume: 0.8,
        sfxVolume: 0.9,
        ambientVolume: 0.3,
        muted: true,
      });

      expect(customManager.getMasterVolume()).toBe(0.8);
      expect(customManager.getSfxVolume()).toBe(0.9);
      expect(customManager.getAmbientVolume()).toBe(0.3);
      expect(customManager.isMuted()).toBe(true);
    });

    it('resumes suspended audio context upon unlock or resume call', async () => {
      const suspendedContext = new MockAudioContext('suspended');
      const manager = new SoundManager({
        context: suspendedContext as unknown as AudioContext,
      });

      expect(suspendedContext.state).toBe('suspended');
      await manager.resume();
      expect(suspendedContext.state).toBe('running');
    });

    it('gracefully handles null audio context without throwing errors', () => {
      const headlessManager = new SoundManager({
        context: null as unknown as AudioContext,
      });

      expect(headlessManager.isInitialized()).toBe(false);
      expect(() => headlessManager.playPellet()).not.toThrow();
      expect(() => headlessManager.playEnergizer()).not.toThrow();
      expect(() => headlessManager.playGhostEaten()).not.toThrow();
      expect(() => headlessManager.playDeath()).not.toThrow();
      expect(() => headlessManager.updateAmbient(AmbientMode.SIREN)).not.toThrow();
      expect(() => headlessManager.stopAll()).not.toThrow();
    });
  });

  describe('Volume & Mute Controls', () => {
    it('clamps volume values within [0, 1] range', () => {
      soundManager.setMasterVolume(1.5);
      expect(soundManager.getMasterVolume()).toBe(1);

      soundManager.setMasterVolume(-0.5);
      expect(soundManager.getMasterVolume()).toBe(0);

      soundManager.setSfxVolume(2.0);
      expect(soundManager.getSfxVolume()).toBe(1);

      soundManager.setAmbientVolume(-1.0);
      expect(soundManager.getAmbientVolume()).toBe(0);
    });

    it('toggles mute state and updates master gain node', () => {
      expect(soundManager.isMuted()).toBe(false);
      const isMutedNow = soundManager.toggleMute();
      expect(isMutedNow).toBe(true);
      expect(soundManager.isMuted()).toBe(true);

      const unmutedAgain = soundManager.toggleMute();
      expect(unmutedAgain).toBe(false);
      expect(soundManager.isMuted()).toBe(false);
    });

    it('sets mute explicitly', () => {
      soundManager.setMuted(true);
      expect(soundManager.isMuted()).toBe(true);

      soundManager.setMuted(false);
      expect(soundManager.isMuted()).toBe(false);
    });
  });

  describe('Pellet & Chomp (Waka-Waka) Sound Effect', () => {
    it('synthesizes alternating chomp tones on consecutive calls', () => {
      const initialOscCount = mockContext.createdOscillators.length;

      // First chomp (Tone A)
      soundManager.playPellet();
      expect(mockContext.createdOscillators.length).toBe(initialOscCount + 1);
      const oscA = mockContext.createdOscillators[initialOscCount];
      expect(oscA.started).toBe(true);
      expect(oscA.stopped).toBe(true);
      const freqA = oscA.frequency.events[0]?.value ?? oscA.frequency.value;

      // Second chomp (Tone B)
      soundManager.playPellet();
      expect(mockContext.createdOscillators.length).toBe(initialOscCount + 2);
      const oscB = mockContext.createdOscillators[initialOscCount + 1];
      expect(oscB.started).toBe(true);
      expect(oscB.stopped).toBe(true);
      const freqB = oscB.frequency.events[0]?.value ?? oscB.frequency.value;

      // Frequencies should alternate for the iconic waka-waka effect
      expect(freqA).not.toBe(freqB);
    });

    it('applies gain envelope decay for chomp sound', () => {
      const initialGains = mockContext.createdGainNodes.length;
      soundManager.playPellet();

      const chompGain = mockContext.createdGainNodes[initialGains];
      expect(chompGain).toBeDefined();
      expect(chompGain.gain.events.length).toBeGreaterThanOrEqual(2);
      expect(chompGain.gain.events.some((e) => e.type.includes('Ramp') || e.type === 'setValueAtTime')).toBe(true);
    });

    it('resets waka alternation state on resetWaka()', () => {
      soundManager.playPellet(); // tone A
      soundManager.resetWaka();

      const oscCount = mockContext.createdOscillators.length;
      soundManager.playPellet(); // should start with tone A again
      const osc = mockContext.createdOscillators[oscCount];
      const startFreq = osc.frequency.events[0]?.value ?? osc.frequency.value;
      expect(startFreq).toBe(soundManager.getWakaFrequencies().toneA);
    });
  });

  describe('Energizer Sound Effect', () => {
    it('synthesizes energizer collection chime with modulation', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      soundManager.playEnergizer();

      expect(mockContext.createdOscillators.length).toBeGreaterThan(initialOscCount);
      const osc = mockContext.createdOscillators[initialOscCount];
      expect(osc.started).toBe(true);
    });
  });

  describe('Ghost Eaten Jingle', () => {
    it('synthesizes fast ascending arpeggio notes when a ghost is eaten', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      soundManager.playGhostEaten();

      // Ghost eaten jingle consists of a rapid multi-note arpeggio (e.g. 4 notes)
      const oscsAdded = mockContext.createdOscillators.length - initialOscCount;
      expect(oscsAdded).toBeGreaterThanOrEqual(3);

      const createdOscs = mockContext.createdOscillators.slice(initialOscCount);
      for (const osc of createdOscs) {
        expect(osc.started).toBe(true);
        expect(osc.stopped).toBe(true);
      }

      // Check ascending pitch frequencies
      const frequencies = createdOscs.map((o) => o.frequency.value);
      for (let i = 1; i < frequencies.length; i++) {
        expect(frequencies[i]).toBeGreaterThan(frequencies[i - 1]);
      }
    });
  });

  describe('Pacman Death Sound Effect', () => {
    it('synthesizes descending chirp sequence when Pacman dies', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      soundManager.playDeath();

      const oscsAdded = mockContext.createdOscillators.length - initialOscCount;
      expect(oscsAdded).toBeGreaterThanOrEqual(8);

      const createdOscs = mockContext.createdOscillators.slice(initialOscCount);
      const frequencies = createdOscs.map((o) => o.frequency.value);

      // Verify descending frequency trend
      expect(frequencies[0]).toBeGreaterThan(frequencies[frequencies.length - 1]);
    });

    it('stops ambient background sirens immediately upon Pacman death', () => {
      soundManager.updateAmbient(AmbientMode.SIREN);
      expect(soundManager.getAmbientMode()).toBe(AmbientMode.SIREN);

      soundManager.playDeath();
      expect(soundManager.getAmbientMode()).toBe(AmbientMode.NONE);
    });
  });

  describe('Bonus & Game State Jingles', () => {
    it('synthesizes level clear victory jingle', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      soundManager.playLevelClear();

      expect(mockContext.createdOscillators.length).toBeGreaterThan(initialOscCount);
    });

    it('synthesizes game start jingle', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      soundManager.playGameStart();

      expect(mockContext.createdOscillators.length).toBeGreaterThan(initialOscCount);
    });

    it('synthesizes extra life reward sound', () => {
      const initialOscCount = mockContext.createdOscillators.length;
      soundManager.playExtraLife();

      expect(mockContext.createdOscillators.length).toBeGreaterThan(initialOscCount);
    });
  });

  describe('Ambient Siren & Ghost State Audio Management', () => {
    it('starts normal siren ambient sound in SIREN mode', () => {
      expect(soundManager.getAmbientMode()).toBe(AmbientMode.NONE);
      soundManager.updateAmbient(AmbientMode.SIREN);

      expect(soundManager.getAmbientMode()).toBe(AmbientMode.SIREN);
      expect(mockContext.createdOscillators.some((o) => o.started && !o.stopped)).toBe(true);
    });

    it('transitions to frightened hum when ghosts are frightened', () => {
      soundManager.updateAmbient(AmbientMode.SIREN);
      soundManager.updateAmbient(AmbientMode.FRIGHTENED);

      expect(soundManager.getAmbientMode()).toBe(AmbientMode.FRIGHTENED);
    });

    it('transitions to eyes return siren when eaten ghost eyes are returning', () => {
      soundManager.updateAmbient(AmbientMode.FRIGHTENED);
      soundManager.updateAmbient(AmbientMode.EYES);

      expect(soundManager.getAmbientMode()).toBe(AmbientMode.EYES);
    });

    it('stops ambient sound when mode is set to NONE or stopAll() is called', () => {
      soundManager.updateAmbient(AmbientMode.SIREN);
      expect(soundManager.getAmbientMode()).toBe(AmbientMode.SIREN);

      soundManager.updateAmbient(AmbientMode.NONE);
      expect(soundManager.getAmbientMode()).toBe(AmbientMode.NONE);

      soundManager.updateAmbient(AmbientMode.SIREN);
      soundManager.stopAll();
      expect(soundManager.getAmbientMode()).toBe(AmbientMode.NONE);
    });

    it('does not restart oscillator if the same ambient mode is re-applied', () => {
      soundManager.updateAmbient(AmbientMode.SIREN);
      const oscCount = mockContext.createdOscillators.length;

      soundManager.updateAmbient(AmbientMode.SIREN);
      expect(mockContext.createdOscillators).toHaveLength(oscCount);
    });

    it('determines appropriate ambient mode automatically from game state', () => {
      // Normal state -> SIREN
      expect(
        SoundManager.resolveAmbientMode({
          isFrightened: false,
          hasEatenGhosts: false,
          isPaused: false,
          isGameOver: false,
        })
      ).toBe(AmbientMode.SIREN);

      // Frightened state -> FRIGHTENED
      expect(
        SoundManager.resolveAmbientMode({
          isFrightened: true,
          hasEatenGhosts: false,
          isPaused: false,
          isGameOver: false,
        })
      ).toBe(AmbientMode.FRIGHTENED);

      // Eaten eyes active overrides frightened -> EYES
      expect(
        SoundManager.resolveAmbientMode({
          isFrightened: true,
          hasEatenGhosts: true,
          isPaused: false,
          isGameOver: false,
        })
      ).toBe(AmbientMode.EYES);

      // Paused or Game Over -> NONE
      expect(
        SoundManager.resolveAmbientMode({
          isFrightened: false,
          hasEatenGhosts: false,
          isPaused: true,
          isGameOver: false,
        })
      ).toBe(AmbientMode.NONE);

      expect(
        SoundManager.resolveAmbientMode({
          isFrightened: false,
          hasEatenGhosts: false,
          isPaused: false,
          isGameOver: true,
        })
      ).toBe(AmbientMode.NONE);
    });
  });
});
