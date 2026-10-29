import { GhostState } from './ai';
import { SoundManager } from './audio';
import { TouchController } from './controls';
import { Direction, GameLoop } from './core';
import { CanvasRenderer, Fireworks, type RenderableGhost, type RenderableHUD } from './render';
import { HALLOWEEN_EDITION, isHalloweenActive } from './themes';
import { createToggleButtonView } from './ui';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error('Canvas element #game-canvas not found in DOM.');
}

const SCALE = 2;
const TILE_SIZE = 8;

const soundManager = new SoundManager();
// Seasonal edition (undefined = regular arcade look). Halloween: 24 Oct - 5 Nov 2026, or ?halloween=1/0
const edition = isHalloweenActive(new Date(), window.location.search)
  ? HALLOWEEN_EDITION
  : undefined;

const renderer = new CanvasRenderer({
  canvas,
  scale: SCALE,
  tileSize: TILE_SIZE,
  theme: edition?.theme,
  sprites: edition?.sprites,
});

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
const fireworks = new Fireworks({
  width: grid.width * TILE_SIZE,
  height: grid.height * TILE_SIZE,
  colors: edition?.fireworksColors,
});

// Unlock Web Audio context on first user interaction to comply with browser autoplay policies
const unlockAudio = (): void => {
  soundManager.resume().catch((error: unknown) => {
    // The browser may refuse to resume audio; the game stays playable and the button stays on UNMUTE
    console.warn('Unable to resume audio context', error);
  });
};

// Audio that is not running yet (not loaded or suspended by autoplay policy) is silent,
// so the first mute press turns sound on instead of muting
const toggleSound = (): void => {
  if (soundManager.isAudible()) {
    soundManager.setMuted(true);
    return;
  }
  soundManager.setMuted(false);
  unlockAudio();
};

// A finished run (win or game over) can be restarted with Enter or a tap on the canvas
const restartIfFinished = (): void => {
  if (gameLoop.isGameOver() || gameLoop.isLevelCleared()) {
    gameLoop.restartGame();
  }
};

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
      toggleSound();
      event.preventDefault();
      break;
    case 'Enter':
      restartIfFinished();
      event.preventDefault();
      break;
    default:
      break;
  }
});

// Registered after the keyboard handler so the first 'M' press is handled before audio is unlocked
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('click', unlockAudio, { once: true });
window.addEventListener('touchstart', unlockAudio, { once: true });
window.addEventListener('pointerdown', unlockAudio, { once: true });

// The browser may suspend or interrupt audio while the tab is hidden or the device is locked;
// try to recover when the player comes back (the button label follows the real audio state)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && soundManager.isInitialized()) {
    unlockAudio();
  }
});

canvas.addEventListener('click', restartIfFinished);

const pauseButton = document.getElementById('btn-pause');
const muteButton = document.getElementById('btn-mute');

// Touch and virtual on-screen gamepad controller for mobile and touch-enabled devices
new TouchController({
  dpadElement: document.getElementById('dpad'),
  dpadUp: document.getElementById('btn-up'),
  dpadDown: document.getElementById('btn-down'),
  dpadLeft: document.getElementById('btn-left'),
  dpadRight: document.getElementById('btn-right'),
  pauseButton,
  muteButton,
  swipeElement: canvas,
  onDirection: (direction) => pacman.requestDirection(direction),
  onPauseToggle: () => gameLoop.togglePause(),
  onMuteToggle: toggleSound,
  onInteraction: unlockAudio,
});

const WIN_TEXT = edition?.winText ?? 'YOU WIN!';
const CELEBRATION_COLORS = edition?.celebrationColors ?? [
  '#FFFF00',
  '#FF0000',
  '#FFB8FF',
  '#00FFFF',
  '#FFB852',
];
const CELEBRATION_WALL_COLORS = edition?.celebrationWallColors ?? ['#2121DE', '#FFFFFF'];

function resolveStatus(
  isGameOver: boolean,
  isLevelCleared: boolean,
  isPaused: boolean,
  pacmanDirection: Direction,
  animationTick: number,
): Pick<RenderableHUD, 'statusText' | 'statusTextColor' | 'statusSubText'> {
  if (isGameOver) {
    return { statusText: 'GAME OVER', statusSubText: 'ENTER / TAP TO PLAY AGAIN' };
  }
  if (isLevelCleared) {
    return {
      statusText: WIN_TEXT,
      statusTextColor: CELEBRATION_COLORS[animationTick % CELEBRATION_COLORS.length],
      statusSubText: 'ENTER / TAP TO PLAY AGAIN',
    };
  }
  if (isPaused) {
    return { statusText: 'PAUSED' };
  }
  if (pacmanDirection === Direction.NONE) {
    return { statusText: 'READY!' };
  }
  return {};
}

const pauseButtonView = createToggleButtonView(
  pauseButton,
  { icon: '⏸', label: 'PAUSE' },
  { icon: '▶', label: 'PLAY' },
);
// "Toggled" means silent for the mute button: audio that is not running yet counts as muted
const muteButtonView = createToggleButtonView(
  muteButton,
  { icon: '🔊', label: 'MUTE' },
  { icon: '🔇', label: 'UNMUTE' },
);

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
    isGameOver: collisionManager.isGameOver() || gameLoop.isLevelCleared(),
  });
  soundManager.updateAmbient(ambientMode);

  // 2b. Reflect pause/mute state in the action buttons
  pauseButtonView.setToggled(gameLoop.isPaused());
  muteButtonView.setToggled(!soundManager.isAudible());

  // 2c. Win celebration: fireworks keep going until the player restarts
  const isCelebrating = gameLoop.isLevelCleared();
  if (isCelebrating) {
    fireworks.update(deltaSeconds);
  } else {
    fireworks.reset();
  }

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
  const animationTick = Math.floor(currentTimestamp / 120);
  renderer.render({
    grid,
    pacman: {
      position: pacman.getPosition(),
      direction: pacman.getDirection(),
      isMoving: pacman.isMoving(),
    },
    // Ghosts leave the stage for the celebration
    ghosts: isCelebrating ? [] : renderableGhosts,
    wallColor: isCelebrating
      ? CELEBRATION_WALL_COLORS[Math.floor(animationTick / 3) % CELEBRATION_WALL_COLORS.length]
      : undefined,
    particles: isCelebrating ? fireworks.getParticles() : undefined,
    hud: {
      score: scoreManager.getScore(),
      highScore: scoreManager.getHighScore(),
      lives: collisionManager.getLives(),
      ...resolveStatus(
        collisionManager.isGameOver(),
        gameLoop.isLevelCleared(),
        gameLoop.isPaused(),
        pacman.getDirection(),
        animationTick,
      ),
    },
    energizerVisible: Math.floor(currentTimestamp / 250) % 2 === 0,
    animationTick,
  });

  requestAnimationFrame(frameStep);
}

requestAnimationFrame(frameStep);

console.log('Wakabyte engine initialized with procedural Web Audio synthesizer.');
