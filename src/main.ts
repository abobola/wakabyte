import { Direction, GameLoop } from './core';
import { GhostState } from './ai';
import { CanvasRenderer, RenderableGhost } from './render';
import { SoundManager } from './audio';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error('Canvas element #game-canvas not found in DOM.');
}

const SCALE = 2;
const TILE_SIZE = 8;

const soundManager = new SoundManager();
const renderer = new CanvasRenderer({ canvas, scale: SCALE, tileSize: TILE_SIZE });

const gameLoop = GameLoop.createDefault({
  tileSize: TILE_SIZE,
  highScore: 10000,
  onPelletEaten: () => soundManager.playPellet(),
  onEnergizerEaten: () => soundManager.playEnergizer(),
  onGhostEaten: () => soundManager.playGhostEaten(),
  onPacmanDeath: () => soundManager.playDeath(),
  onLevelCleared: () => soundManager.playLevelClear(),
});

const pacman = gameLoop.getPacman();
const ghosts = gameLoop.getGhosts();
const grid = gameLoop.getGrid();
const waveTimer = gameLoop.getWaveTimer();
const scoreManager = gameLoop.getScoreManager();
const collisionManager = gameLoop.getCollisionManager();

// Unlock Web Audio context on first user interaction to comply with browser autoplay policies
const unlockAudio = (): void => {
  void soundManager.resume();
};
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('click', unlockAudio, { once: true });
window.addEventListener('touchstart', unlockAudio, { once: true });
window.addEventListener('pointerdown', unlockAudio, { once: true });

// Keyboard input binding for responsive player controls
window.addEventListener('keydown', (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      pacman.requestDirection(Direction.UP);
      event.preventDefault();
      break;
    case 'ArrowDown':
    case 'KeyS':
      pacman.requestDirection(Direction.DOWN);
      event.preventDefault();
      break;
    case 'ArrowLeft':
    case 'KeyA':
      pacman.requestDirection(Direction.LEFT);
      event.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      pacman.requestDirection(Direction.RIGHT);
      event.preventDefault();
      break;
    case 'KeyP':
    case 'Space':
      gameLoop.togglePause();
      event.preventDefault();
      break;
    case 'KeyM':
      soundManager.toggleMute();
      event.preventDefault();
      break;
    default:
      break;
  }
});

let lastTimestamp = performance.now();

function frameStep(currentTimestamp: number): void {
  const deltaSeconds = (currentTimestamp - lastTimestamp) / 1000;
  lastTimestamp = currentTimestamp;

  // 1. Advance simulation step
  gameLoop.update(deltaSeconds);

  // 2. Manage continuous ambient procedural audio state
  const isFrightened = waveTimer.isFrightened();
  const hasEatenGhosts = ghosts.some((g) => g.getState() === GhostState.EATEN);
  const ambientMode = SoundManager.resolveAmbientMode({
    isFrightened,
    hasEatenGhosts,
    isPaused: gameLoop.isPaused(),
    isGameOver: collisionManager.isGameOver(),
  });
  soundManager.updateAmbient(ambientMode);

  // 3. Map renderable ghost visual states
  const isFlashing = waveTimer.isFrightenedFlashing();
  const renderableGhosts: RenderableGhost[] = ghosts.map((ghost) => ({
    type: ghost.getType(),
    position: ghost.getPosition(),
    direction: ghost.getDirection(),
    state: ghost.getState(),
    isFlashing,
  }));

  // 4. Render composite frame
  renderer.render({
    grid,
    pacman: {
      position: pacman.getPosition(),
      direction: pacman.getDirection(),
      isMoving: pacman.isMoving(),
    },
    ghosts: renderableGhosts,
    hud: {
      score: scoreManager.getScore(),
      highScore: scoreManager.getHighScore(),
      lives: collisionManager.getLives(),
      statusText: collisionManager.isGameOver()
        ? 'GAME OVER'
        : gameLoop.isPaused()
        ? 'PAUSED'
        : pacman.getDirection() === Direction.NONE
        ? 'READY!'
        : undefined,
    },
    energizerVisible: Math.floor(currentTimestamp / 250) % 2 === 0,
    animationTick: Math.floor(currentTimestamp / 120),
  });

  requestAnimationFrame(frameStep);
}

requestAnimationFrame(frameStep);

console.log('Wakabyte engine initialized with procedural Web Audio synthesizer.');
