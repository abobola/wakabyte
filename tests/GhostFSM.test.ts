import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_FRIGHTENED_DURATION,
  DEFAULT_WAVE_SCHEDULE,
  GhostFSM,
  GhostState,
  GlobalWaveTimer,
  type WavePhase,
} from '../src/ai';

describe('Ghost State & Global Wave Timer (Phase 4.1)', () => {
  describe('GlobalWaveTimer - Wave Scheduling & Timed Transitions', () => {
    let timer: GlobalWaveTimer;

    beforeEach(() => {
      timer = new GlobalWaveTimer();
    });

    it('exports authentic default 8-phase arcade wave schedule', () => {
      expect(DEFAULT_WAVE_SCHEDULE).toHaveLength(8);
      expect(DEFAULT_WAVE_SCHEDULE[0]).toEqual({ mode: GhostState.SCATTER, duration: 7 });
      expect(DEFAULT_WAVE_SCHEDULE[1]).toEqual({ mode: GhostState.CHASE, duration: 20 });
      expect(DEFAULT_WAVE_SCHEDULE[7]).toEqual({ mode: GhostState.CHASE, duration: Infinity });
    });

    it('initializes in SCATTER mode at Wave 0', () => {
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(0);
      expect(timer.getTimeInCurrentPhase()).toBe(0);
      expect(timer.isFrightened()).toBe(false);
    });

    it('transitions from SCATTER to CHASE after 7 seconds (Wave 0 -> Wave 1)', () => {
      // Step 6.9 seconds -> still in SCATTER
      timer.update(6.9);
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(0);

      // Step additional 0.2s (total 7.1s) -> transitions to CHASE
      timer.update(0.2);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(1);
      expect(timer.getTimeInCurrentPhase()).toBeCloseTo(0.1, 5);
    });

    it('transitions from CHASE to SCATTER after 20 seconds (Wave 1 -> Wave 2)', () => {
      // Advance past Wave 0 (7s)
      timer.update(7.0);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(1);

      // Advance 19.9s into Wave 1 -> still CHASE
      timer.update(19.9);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);

      // Advance 0.2s (total 20.1s in Wave 1) -> transitions to Wave 2 (SCATTER)
      timer.update(0.2);
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(2);
    });

    it('progresses through the full standard 4-wave schedule and remains in infinite CHASE at the end', () => {
      // Wave 0: SCATTER 7s
      timer.update(7.0);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(1);

      // Wave 1: CHASE 20s
      timer.update(20.0);
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(2);

      // Wave 2: SCATTER 7s
      timer.update(7.0);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(3);

      // Wave 3: CHASE 20s
      timer.update(20.0);
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(4);

      // Wave 4: SCATTER 5s
      timer.update(5.0);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(5);

      // Wave 5: CHASE 20s
      timer.update(20.0);
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(6);

      // Wave 6: SCATTER 5s
      timer.update(5.0);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(7);

      // Wave 7: Permanent CHASE (Infinity)
      timer.update(10000.0);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(7);
    });

    it('supports custom wave schedules', () => {
      const customSchedule: WavePhase[] = [
        { mode: GhostState.SCATTER, duration: 3 },
        { mode: GhostState.CHASE, duration: 5 },
      ];
      const customTimer = new GlobalWaveTimer({ schedule: customSchedule });

      expect(customTimer.getGlobalState()).toBe(GhostState.SCATTER);
      customTimer.update(3.0);
      expect(customTimer.getGlobalState()).toBe(GhostState.CHASE);
      customTimer.update(5.0);
      expect(customTimer.getGlobalState()).toBe(GhostState.CHASE); // Last phase remains active
    });

    it('resets wave schedule and timers on reset()', () => {
      timer.update(15.0);
      expect(timer.getCurrentWaveIndex()).toBe(1);

      timer.reset();
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(0);
      expect(timer.getTimeInCurrentPhase()).toBe(0);
      expect(timer.isFrightened()).toBe(false);
    });
  });

  describe('GlobalWaveTimer - Frightened Mode & Timer Pausing', () => {
    let timer: GlobalWaveTimer;

    beforeEach(() => {
      timer = new GlobalWaveTimer({ frightenedDuration: 6.0 });
    });

    it('triggers frightened mode upon energizer pickup and pauses the underlying wave timer', () => {
      // Advance 4s into Wave 0 (SCATTER, 7s total)
      timer.update(4.0);
      expect(timer.getTimeInCurrentPhase()).toBeCloseTo(4.0, 5);

      // Trigger Frightened mode
      timer.triggerFrightened();
      expect(timer.getGlobalState()).toBe(GhostState.FRIGHTENED);
      expect(timer.isFrightened()).toBe(true);
      expect(timer.getFrightenedTimeRemaining()).toBe(6.0);

      // Advance 3s while frightened
      timer.update(3.0);
      expect(timer.getGlobalState()).toBe(GhostState.FRIGHTENED);
      expect(timer.getFrightenedTimeRemaining()).toBeCloseTo(3.0, 5);
      // Underlying wave phase timer must NOT have advanced
      expect(timer.getTimeInCurrentPhase()).toBeCloseTo(4.0, 5);
    });

    it('resumes the unpaused wave phase after frightened mode expires', () => {
      // 4s into Wave 0 (SCATTER)
      timer.update(4.0);
      timer.triggerFrightened(6.0);

      // Elapse full frightened duration (6.1s)
      timer.update(6.1);
      expect(timer.isFrightened()).toBe(false);
      expect(timer.getGlobalState()).toBe(GhostState.SCATTER);
      expect(timer.getCurrentWaveIndex()).toBe(0);

      // Remaining 3.0s of Wave 0 completes
      timer.update(3.0);
      expect(timer.getGlobalState()).toBe(GhostState.CHASE);
      expect(timer.getCurrentWaveIndex()).toBe(1);
    });

    it('resets the frightened timer when another energizer is consumed while already frightened', () => {
      timer.triggerFrightened(6.0);
      timer.update(4.0);
      expect(timer.getFrightenedTimeRemaining()).toBeCloseTo(2.0, 5);

      // Consume another energizer
      timer.triggerFrightened(6.0);
      expect(timer.getFrightenedTimeRemaining()).toBe(6.0);
      expect(timer.isFrightened()).toBe(true);
    });

    it('identifies flashing state when frightened time is below warning threshold', () => {
      timer.triggerFrightened(6.0);
      expect(timer.isFrightenedFlashing()).toBe(false);

      timer.update(4.1); // 1.9s remaining (< 2.0s threshold)
      expect(timer.isFrightenedFlashing()).toBe(true);

      timer.update(2.0); // expired
      expect(timer.isFrightenedFlashing()).toBe(false);
    });
  });

  describe('GhostFSM - Individual Ghost State & Global Synchronization', () => {
    let waveTimer: GlobalWaveTimer;
    let ghostFsm: GhostFSM;

    beforeEach(() => {
      waveTimer = new GlobalWaveTimer({ frightenedDuration: 6.0 });
      ghostFsm = new GhostFSM({ waveTimer });
    });

    it('mirrors global wave timer state initially', () => {
      expect(ghostFsm.getState()).toBe(GhostState.SCATTER);
      expect(ghostFsm.isScatter()).toBe(true);
      expect(ghostFsm.isChase()).toBe(false);
      expect(ghostFsm.isFrightened()).toBe(false);
      expect(ghostFsm.isEaten()).toBe(false);
    });

    it('updates state dynamically as wave timer progresses', () => {
      waveTimer.update(7.1);
      ghostFsm.update(0);
      expect(ghostFsm.getState()).toBe(GhostState.CHASE);
      expect(ghostFsm.isChase()).toBe(true);
    });

    it('can run with internal default wave timer if none provided in constructor', () => {
      const standaloneFsm = new GhostFSM();
      expect(standaloneFsm.getState()).toBe(GhostState.SCATTER);
      standaloneFsm.update(7.1);
      expect(standaloneFsm.getState()).toBe(GhostState.CHASE);
    });

    it('transitions to EATEN when eaten by Pacman during Frightened mode', () => {
      waveTimer.triggerFrightened();
      ghostFsm.update(0);
      expect(ghostFsm.getState()).toBe(GhostState.FRIGHTENED);
      expect(ghostFsm.isFrightened()).toBe(true);

      // Pacman consumes ghost
      ghostFsm.eat();
      expect(ghostFsm.getState()).toBe(GhostState.EATEN);
      expect(ghostFsm.isEaten()).toBe(true);
      expect(ghostFsm.isFrightened()).toBe(false);
    });

    it('remains in EATEN state even if another energizer is eaten', () => {
      waveTimer.triggerFrightened();
      ghostFsm.eat();
      expect(ghostFsm.getState()).toBe(GhostState.EATEN);

      // Another energizer is consumed
      waveTimer.triggerFrightened();
      ghostFsm.update(0);
      expect(ghostFsm.getState()).toBe(GhostState.EATEN);
      expect(ghostFsm.isEaten()).toBe(true);
    });

    it('revives from EATEN state when reaching ghost house, restoring current global state', () => {
      waveTimer.triggerFrightened(6.0);
      ghostFsm.eat();
      expect(ghostFsm.getState()).toBe(GhostState.EATEN);

      // Reach house while still frightened (2s elapsed)
      waveTimer.update(2.0);
      ghostFsm.revive();
      expect(ghostFsm.getState()).toBe(GhostState.FRIGHTENED);
      expect(ghostFsm.isFrightened()).toBe(true);

      // Now eat again and reach house after frightened expired
      ghostFsm.eat();
      waveTimer.update(5.0); // Frightened expires -> SCATTER resumes
      ghostFsm.revive();
      expect(ghostFsm.getState()).toBe(GhostState.SCATTER);
      expect(ghostFsm.isScatter()).toBe(true);
    });
  });

  describe('GhostFSM - Direction Reversal Signaling', () => {
    let waveTimer: GlobalWaveTimer;
    let ghostFsm: GhostFSM;

    beforeEach(() => {
      waveTimer = new GlobalWaveTimer();
      ghostFsm = new GhostFSM({ waveTimer });
    });

    it('signals direction reversal on SCATTER -> CHASE transition and allows single-use consumption', () => {
      expect(ghostFsm.consumeReverseRequest()).toBe(false);

      // Advance wave from SCATTER to CHASE
      waveTimer.update(7.1);
      ghostFsm.update(0);

      // Must signal reversal
      expect(ghostFsm.shouldReverse()).toBe(true);
      expect(ghostFsm.consumeReverseRequest()).toBe(true);

      // Consumed flag must now be false
      expect(ghostFsm.shouldReverse()).toBe(false);
      expect(ghostFsm.consumeReverseRequest()).toBe(false);
    });

    it('signals direction reversal on CHASE -> SCATTER transition', () => {
      waveTimer.update(7.1);
      ghostFsm.update(0);
      ghostFsm.consumeReverseRequest(); // Clear first reversal

      // Advance from CHASE to SCATTER (Wave 1 -> Wave 2: 20s)
      waveTimer.update(20.1);
      ghostFsm.update(0);

      expect(ghostFsm.consumeReverseRequest()).toBe(true);
      expect(ghostFsm.consumeReverseRequest()).toBe(false);
    });

    it('signals direction reversal when entering FRIGHTENED mode', () => {
      waveTimer.triggerFrightened();
      ghostFsm.update(0);

      expect(ghostFsm.consumeReverseRequest()).toBe(true);
      expect(ghostFsm.consumeReverseRequest()).toBe(false);
    });

    it('does NOT signal direction reversal when exiting FRIGHTENED mode (authentic arcade rule)', () => {
      waveTimer.triggerFrightened(6.0);
      ghostFsm.update(0);
      ghostFsm.consumeReverseRequest(); // Clear enter-frightened reversal

      // Expire frightened mode
      waveTimer.update(6.1);
      ghostFsm.update(0);

      expect(ghostFsm.getState()).toBe(GhostState.SCATTER);
      expect(ghostFsm.consumeReverseRequest()).toBe(false);
    });

    it('does NOT signal direction reversal for an EATEN ghost', () => {
      waveTimer.triggerFrightened();
      ghostFsm.update(0);
      ghostFsm.eat();
      ghostFsm.consumeReverseRequest();

      // Wave changes while eaten
      waveTimer.update(10.0);
      ghostFsm.update(0);

      expect(ghostFsm.consumeReverseRequest()).toBe(false);
    });

    it('triggers registered onReverse callback when a reversal occurs', () => {
      let callCount = 0;
      const callbackFsm = new GhostFSM({
        waveTimer,
        onReverse: () => {
          callCount++;
        },
      });

      waveTimer.update(7.1);
      callbackFsm.update(0);

      expect(callCount).toBe(1);
    });
  });

  describe('Multi-Ghost Synchronization with Shared Wave Timer', () => {
    it('synchronizes all 4 ghosts to the same wave transitions while preserving independent eaten states', () => {
      const waveTimer = new GlobalWaveTimer();
      const blinky = new GhostFSM({ waveTimer });
      const pinky = new GhostFSM({ waveTimer });
      const inky = new GhostFSM({ waveTimer });
      const clyde = new GhostFSM({ waveTimer });

      // All start in SCATTER
      expect(blinky.getState()).toBe(GhostState.SCATTER);
      expect(pinky.getState()).toBe(GhostState.SCATTER);
      expect(inky.getState()).toBe(GhostState.SCATTER);
      expect(clyde.getState()).toBe(GhostState.SCATTER);

      // Energizer eaten -> all become FRIGHTENED and receive reverse signal
      waveTimer.triggerFrightened();
      [blinky, pinky, inky, clyde].forEach((ghost) => {
        ghost.update(0);
      });

      expect(blinky.getState()).toBe(GhostState.FRIGHTENED);
      expect(pinky.getState()).toBe(GhostState.FRIGHTENED);
      expect(blinky.consumeReverseRequest()).toBe(true);
      expect(pinky.consumeReverseRequest()).toBe(true);

      // Pacman eats Blinky only
      blinky.eat();
      expect(blinky.getState()).toBe(GhostState.EATEN);
      expect(pinky.getState()).toBe(GhostState.FRIGHTENED);
      expect(inky.getState()).toBe(GhostState.FRIGHTENED);
      expect(clyde.getState()).toBe(GhostState.FRIGHTENED);

      // Frightened expires
      waveTimer.update(DEFAULT_FRIGHTENED_DURATION + 0.1);
      [blinky, pinky, inky, clyde].forEach((ghost) => {
        ghost.update(0);
      });

      // Blinky is still returning to house (EATEN); others return to SCATTER
      expect(blinky.getState()).toBe(GhostState.EATEN);
      expect(pinky.getState()).toBe(GhostState.SCATTER);
      expect(inky.getState()).toBe(GhostState.SCATTER);
      expect(clyde.getState()).toBe(GhostState.SCATTER);

      // Blinky reaches house and revives into current wave
      blinky.revive();
      expect(blinky.getState()).toBe(GhostState.SCATTER);
    });
  });
});
