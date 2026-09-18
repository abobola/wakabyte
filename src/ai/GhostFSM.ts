/**
 * Ghost behavioral modes in authentic arcade simulation.
 */
export enum GhostState {
  SCATTER = 'SCATTER',
  CHASE = 'CHASE',
  FRIGHTENED = 'FRIGHTENED',
  EATEN = 'EATEN',
}

/**
 * Definition of a single timed wave phase in the global schedule.
 */
export interface WavePhase {
  mode: GhostState.SCATTER | GhostState.CHASE;
  duration: number; // in seconds; Infinity for permanent phase
}

/**
 * Authentic Level 1 arcade wave schedule.
 * Scatter (7s) -> Chase (20s) -> Scatter (7s) -> Chase (20s) ->
 * Scatter (5s) -> Chase (20s) -> Scatter (5s) -> Chase (permanent).
 */
export const DEFAULT_WAVE_SCHEDULE: readonly WavePhase[] = [
  { mode: GhostState.SCATTER, duration: 7 },
  { mode: GhostState.CHASE, duration: 20 },
  { mode: GhostState.SCATTER, duration: 7 },
  { mode: GhostState.CHASE, duration: 20 },
  { mode: GhostState.SCATTER, duration: 5 },
  { mode: GhostState.CHASE, duration: 20 },
  { mode: GhostState.SCATTER, duration: 5 },
  { mode: GhostState.CHASE, duration: Infinity },
];

/**
 * Default frightened duration in seconds upon energizer consumption.
 */
export const DEFAULT_FRIGHTENED_DURATION = 6;

/**
 * Time threshold in seconds below which frightened state is considered flashing.
 */
export const DEFAULT_FRIGHTENED_FLASH_THRESHOLD = 2;

export interface GlobalWaveTimerOptions {
  schedule?: readonly WavePhase[];
  frightenedDuration?: number;
  flashThreshold?: number;
}

/**
 * Deterministic global wave timer orchestrating arcade Scatter, Chase, and Frightened cycles.
 * Shared across all active ghosts in the maze.
 */
export class GlobalWaveTimer {
  private readonly schedule: readonly WavePhase[];
  private readonly frightenedDuration: number;
  private readonly flashThreshold: number;

  private currentWaveIndex: number = 0;
  private timeInCurrentPhase: number = 0;
  private isFrightenedActive: boolean = false;
  private frightenedTimeRemaining: number = 0;

  constructor(options: GlobalWaveTimerOptions = {}) {
    this.schedule = options.schedule ?? DEFAULT_WAVE_SCHEDULE;
    this.frightenedDuration = options.frightenedDuration ?? DEFAULT_FRIGHTENED_DURATION;
    this.flashThreshold = options.flashThreshold ?? DEFAULT_FRIGHTENED_FLASH_THRESHOLD;
  }

  /**
   * Advances simulation time by deltaTime (in seconds).
   */
  public update(deltaTime: number): void {
    if (deltaTime <= 0) {
      return;
    }

    if (this.isFrightenedActive) {
      this.frightenedTimeRemaining -= deltaTime;
      if (this.frightenedTimeRemaining <= 0) {
        this.isFrightenedActive = false;
        this.frightenedTimeRemaining = 0;
      }
      return;
    }

    // Normal wave timer progression
    this.timeInCurrentPhase += deltaTime;

    while (this.currentWaveIndex < this.schedule.length - 1) {
      const currentPhase = this.schedule[this.currentWaveIndex];
      if (this.timeInCurrentPhase < currentPhase.duration) {
        break;
      }
      this.timeInCurrentPhase -= currentPhase.duration;
      this.currentWaveIndex++;
    }
  }

  /**
   * Triggers Frightened mode globally for a specified duration, pausing the wave timer.
   */
  public triggerFrightened(duration?: number): void {
    this.isFrightenedActive = true;
    this.frightenedTimeRemaining = duration ?? this.frightenedDuration;
  }

  /**
   * Returns current global state (SCATTER, CHASE, or FRIGHTENED).
   */
  public getGlobalState(): GhostState {
    if (this.isFrightenedActive) {
      return GhostState.FRIGHTENED;
    }
    return this.schedule[this.currentWaveIndex]?.mode ?? GhostState.SCATTER;
  }

  /**
   * Returns active wave index in the schedule (0-based).
   */
  public getCurrentWaveIndex(): number {
    return this.currentWaveIndex;
  }

  /**
   * Returns elapsed time in current wave phase (in seconds).
   */
  public getTimeInCurrentPhase(): number {
    return this.timeInCurrentPhase;
  }

  /**
   * Returns whether Frightened mode is active.
   */
  public isFrightened(): boolean {
    return this.isFrightenedActive;
  }

  /**
   * Returns remaining seconds in Frightened mode.
   */
  public getFrightenedTimeRemaining(): number {
    return this.frightenedTimeRemaining;
  }

  /**
   * Returns whether Frightened mode is in the flashing/warning stage (near expiration).
   */
  public isFrightenedFlashing(): boolean {
    return (
      this.isFrightenedActive &&
      this.frightenedTimeRemaining > 0 &&
      this.frightenedTimeRemaining <= this.flashThreshold
    );
  }

  /**
   * Resets wave timer back to Wave 0 with zero elapsed time.
   */
  public reset(): void {
    this.currentWaveIndex = 0;
    this.timeInCurrentPhase = 0;
    this.isFrightenedActive = false;
    this.frightenedTimeRemaining = 0;
  }
}

export interface GhostFSMOptions {
  waveTimer?: GlobalWaveTimer;
  onReverse?: () => void;
  onStateChange?: (newState: GhostState, oldState: GhostState) => void;
}

/**
 * Individual Ghost Finite State Machine.
 * Tracks per-ghost states (including EATEN) while synchronizing with the global wave timer
 * and signaling 180° direction reversals on mode transitions.
 */
export class GhostFSM {
  private readonly waveTimer: GlobalWaveTimer;
  private readonly isTimerOwner: boolean;
  private individualState: GhostState | null = null;
  private lastObservedGlobalState: GhostState;
  private reverseRequested: boolean = false;
  private readonly onReverse?: () => void;
  private readonly onStateChange?: (newState: GhostState, oldState: GhostState) => void;

  constructor(options: GhostFSMOptions = {}) {
    if (options.waveTimer) {
      this.waveTimer = options.waveTimer;
      this.isTimerOwner = false;
    } else {
      this.waveTimer = new GlobalWaveTimer();
      this.isTimerOwner = true;
    }

    this.lastObservedGlobalState = this.waveTimer.getGlobalState();
    this.onReverse = options.onReverse;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Updates state machine and processes wave transitions.
   */
  public update(deltaTime: number): void {
    if (this.isTimerOwner && deltaTime > 0) {
      this.waveTimer.update(deltaTime);
    }
    this.syncWithGlobalTimer();
  }

  /**
   * Synchronizes local state with global timer and detects mode transitions.
   */
  private syncWithGlobalTimer(): void {
    const currentGlobal = this.waveTimer.getGlobalState();
    if (currentGlobal !== this.lastObservedGlobalState) {
      const previousGlobal = this.lastObservedGlobalState;
      this.lastObservedGlobalState = currentGlobal;

      if (this.individualState !== GhostState.EATEN) {
        // Authentic arcade reversal triggers:
        // 1. SCATTER -> CHASE
        // 2. CHASE -> SCATTER
        // 3. Normal -> FRIGHTENED
        // Note: Exiting FRIGHTENED does NOT trigger a reversal in authentic arcade rules.
        const shouldTriggerReversal =
          (previousGlobal === GhostState.SCATTER && currentGlobal === GhostState.CHASE) ||
          (previousGlobal === GhostState.CHASE && currentGlobal === GhostState.SCATTER) ||
          currentGlobal === GhostState.FRIGHTENED;

        if (shouldTriggerReversal) {
          this.reverseRequested = true;
          this.onReverse?.();
        }
      }

      this.onStateChange?.(this.getState(), previousGlobal);
    }
  }

  /**
   * Returns current effective ghost state (EATEN if returning to house, otherwise global state).
   */
  public getState(): GhostState {
    if (this.individualState === GhostState.EATEN) {
      return GhostState.EATEN;
    }
    return this.waveTimer.getGlobalState();
  }

  /**
   * Triggers global frightened mode.
   */
  public triggerFrightened(duration?: number): void {
    this.waveTimer.triggerFrightened(duration);
    this.syncWithGlobalTimer();
  }

  /**
   * Puts ghost into EATEN state (eyes returning to ghost house).
   */
  public eat(): void {
    const oldState = this.getState();
    this.individualState = GhostState.EATEN;
    this.reverseRequested = false;
    if (oldState !== GhostState.EATEN) {
      this.onStateChange?.(GhostState.EATEN, oldState);
    }
  }

  /**
   * Revives ghost when reaching ghost house spawn, restoring current global wave state.
   */
  public revive(): void {
    if (this.individualState === GhostState.EATEN) {
      this.individualState = null;
      this.lastObservedGlobalState = this.waveTimer.getGlobalState();
      this.onStateChange?.(this.getState(), GhostState.EATEN);
    }
  }

  /**
   * Checks whether a direction reversal is pending.
   */
  public shouldReverse(): boolean {
    return this.reverseRequested;
  }

  /**
   * Consumes and clears any pending direction reversal request.
   */
  public consumeReverseRequest(): boolean {
    const requested = this.reverseRequested;
    this.reverseRequested = false;
    return requested;
  }

  /**
   * State helper queries.
   */
  public isScatter(): boolean {
    return this.getState() === GhostState.SCATTER;
  }

  public isChase(): boolean {
    return this.getState() === GhostState.CHASE;
  }

  public isFrightened(): boolean {
    return this.getState() === GhostState.FRIGHTENED;
  }

  public isEaten(): boolean {
    return this.getState() === GhostState.EATEN;
  }
}
