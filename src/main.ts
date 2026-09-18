import { Grid, Vector2D, Direction, TileType, ScoreManager } from './core';
import { Pacman } from './entities/Pacman';
import { GhostType, GhostState } from './ai';
import { RAW_MAP_DATA } from './config/mapData';
import { CanvasRenderer, RenderableGhost } from './render';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error('Canvas element #game-canvas not found in DOM.');
}

const SCALE = 2;
const TILE_SIZE = 8;

const grid = Grid.fromStringArray(RAW_MAP_DATA);
const scoreManager = new ScoreManager({ grid, highScore: 10000 });
const renderer = new CanvasRenderer({ canvas, scale: SCALE, tileSize: TILE_SIZE });

// Initialize Pacman at standard arcade start position (tile 13.5, row 26)
const pacman = new Pacman({
  grid,
  tileSize: TILE_SIZE,
  position: new Vector2D(13.5 * TILE_SIZE, 26 * TILE_SIZE + 4),
  direction: Direction.NONE,
  speed: 80,
});

// Initial ghost visual lineup
const ghosts: RenderableGhost[] = [
  {
    type: GhostType.BLINKY,
    position: new Vector2D(13.5 * TILE_SIZE, 14 * TILE_SIZE + 4),
    direction: Direction.LEFT,
    state: GhostState.SCATTER,
  },
  {
    type: GhostType.PINKY,
    position: new Vector2D(13.5 * TILE_SIZE, 17 * TILE_SIZE + 4),
    direction: Direction.UP,
    state: GhostState.SCATTER,
  },
  {
    type: GhostType.INKY,
    position: new Vector2D(11.5 * TILE_SIZE, 17 * TILE_SIZE + 4),
    direction: Direction.UP,
    state: GhostState.SCATTER,
  },
  {
    type: GhostType.CLYDE,
    position: new Vector2D(15.5 * TILE_SIZE, 17 * TILE_SIZE + 4),
    direction: Direction.UP,
    state: GhostState.SCATTER,
  },
];

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
    default:
      break;
  }
});

let lastTimestamp = performance.now();

function gameLoop(currentTimestamp: number): void {
  const deltaSeconds = Math.min((currentTimestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = currentTimestamp;

  // Update simulation
  pacman.update(deltaSeconds);

  // Consume pellets at Pacman's current discrete tile
  const tileCoord = pacman.getTile();
  const currentTile = grid.getTileAt(tileCoord.x, tileCoord.y);
  if (currentTile === TileType.PELLET || currentTile === TileType.ENERGIZER) {
    scoreManager.consumeTile(currentTile);
    grid.setTileAt(tileCoord.x, tileCoord.y, TileType.EMPTY);
  }

  // Render composite frame
  renderer.render({
    grid,
    pacman: {
      position: pacman.getPosition(),
      direction: pacman.getDirection(),
      isMoving: pacman.isMoving(),
    },
    ghosts,
    hud: {
      score: scoreManager.getScore(),
      highScore: scoreManager.getHighScore(),
      lives: 3,
      statusText: pacman.getDirection() === Direction.NONE ? 'READY!' : undefined,
    },
    energizerVisible: Math.floor(currentTimestamp / 250) % 2 === 0,
    animationTick: Math.floor(currentTimestamp / 120),
  });

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

console.log('Wakabyte engine initialized with CanvasRenderer loop.');
