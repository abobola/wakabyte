# Wakabyte Implementation Roadmap

> **Test-Driven Development (TDD) Roadmap & Engineering Milestones for Wakabyte 2D Arcade Engine.**

---

## 🎯 Engineering Philosophy & TDD Workflow

Wakabyte follows a strict **Test-Driven Development (TDD)** discipline to guarantee deterministic game math, robust state machines, and high maintainability.

Each feature milestone is executed in discrete **Red $\rightarrow$ Green $\rightarrow$ Refactor** cycles:
1. 🔴 **Red:** Author unit tests defining the expected mathematical or behavioral contract (failing test).
2. 🟢 **Green:** Implement the minimal production logic required to satisfy the assertions.
3. 🔵 **Refactor:** Clean up, optimize performance, and enforce strict typing without changing external behavior.

Core simulation math has **zero browser DOM dependencies**, allowing tests to execute in sub-milliseconds inside headless Node.js via Vitest.

---

## 🗺️ Milestone Breakdown

```
Phase 0: Tooling & Scaffolding  [DONE]
   │
   ▼
Phase 1: Math Primitives & Vectors (TDD)
   │
   ▼
Phase 2: Maze Grid & Boundary Engine (TDD)
   │
   ▼
Phase 3: Pacman Movement & Input Buffer (TDD)
   │
   ▼
Phase 4: Authentic Ghost AI & Wave FSM (TDD)
   │
   ▼
Phase 5: Scoring, Collisions & Game State (TDD)
   │
   ▼
Phase 6: HTML5 Canvas Rendering & Web Audio
   │
   ▼
Phase 7: CI/CD Pipeline & Static Edge Hosting
```

---

### Phase 0: Project Scaffolding & Toolchain Setup
- [x] Initialize `package.json` with ESM configuration.
- [x] Configure `tsconfig.json` with strict type-checking (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).
- [x] Setup `vite.config.ts` and `vitest` test runner pipeline.
- [x] Create project `README.md` and initial `docs/adr/0001-core-tech-stack-and-toolchain.md`.
- [x] Configure base HTML5 Canvas viewport (`448x496` native arcade aspect ratio).

---

### Phase 1: Core Math Primitives & Direction Vectors
**Goal:** Establish immutable 2D vector arithmetic and cardinal direction utilities.

- [x] **1.1 `Vector2D` Value Object (`src/core/Vector2D.ts`)**
  - **Tests (`tests/Vector2D.test.ts`):**
    - Vector addition, subtraction, scalar multiplication.
    - Integer tile coordinate conversions (`toTileCoordinate()`, `fromTileCoordinate()`).
    - Distance formulas: Manhattan distance (used by ghost pathfinding) and Euclidean distance (used by Clyde).
    - Immutability and equality checks (`equals()`, `clone()`).
  - **Deliverable:** Fully tested `Vector2D` class.

- [x] **1.2 `Direction` System (`src/core/Direction.ts`)**
  - **Tests (`tests/Direction.test.ts`):**
    - Cardinal directions: `UP`, `DOWN`, `LEFT`, `RIGHT`, `NONE`.
    - Unit vector representations (`UP` $\rightarrow (0, -1)$, `DOWN` $\rightarrow (0, 1)$, etc.).
    - Helper utilities: `getOppositeDirection()`, `isPerpendicular()`.
  - **Deliverable:** Type-safe direction enum and vector mapping helpers.

---

### Phase 2: Maze Grid & Boundary Engine
**Goal:** Parse 2D maze matrix, identify tile classifications, and enforce boundary rules.

- [x] **2.1 Maze Matrix & Tile Types (`src/core/Grid.ts`, `src/config/mapData.ts`)**
  - **Tests (`tests/Grid.test.ts`):**
    - Matrix parsing and tile coordinate lookups (`getTileAt(x, y)`).
    - Tile classifications: `WALL`, `EMPTY`, `PELLET`, `ENERGIZER`, `GHOST_HOUSE`, `GATE`.
    - Intersection detection (tiles where 3+ cardinal directions are walkable).
  - **Deliverable:** `Grid` query engine and authentic 28x36 arcade tilemap layout.

- [ ] **2.2 Tunnel Wrap-Around Mechanics**
  - **Tests (`tests/Grid.test.ts`):**
    - Screen-edge wrapping: exiting left tunnel tile $(0, 17)$ reappears at right $(27, 17)$ seamlessly.
  - **Deliverable:** Deterministic coordinate wrapping logic.

---

### Phase 3: Pacman Movement & Input Buffering
**Goal:** Implement continuous grid-aligned movement with pre-turn buffering.

- [ ] **3.1 Input Buffer Queue (`src/core/InputBuffer.ts`)**
  - **Tests (`tests/InputBuffer.test.ts`):**
    - Storing user directional intent (e.g., pressing `LEFT` while moving `DOWN`).
    - Buffer expiration timeout to prevent stale turns.
  - **Deliverable:** Clean FIFO / single-slot input buffer.

- [ ] **3.2 Pacman Controller (`src/entities/Pacman.ts`)**
  - **Tests (`tests/Pacman.test.ts`):**
    - Smooth continuous sub-pixel movement at configurable tile speeds.
    - Corner snapping: turning exactly when tile center is reached.
    - Wall collision blocking (cannot enter `WALL` tiles).
    - Instant reverse direction without waiting for intersection.
  - **Deliverable:** `Pacman` entity class with responsive controls.

---

### Phase 4: Authentic Ghost AI & State Machine (FSM)
**Goal:** Implement authentic 1980 arcade ghost targeting algorithms and global wave timers.

- [ ] **4.1 Global Wave Timer & Ghost FSM (`src/ai/GhostFSM.ts`)**
  - **Tests (`tests/GhostFSM.test.ts`):**
    - Timed transitions between **Scatter** (e.g., 7s) and **Chase** (e.g., 20s).
    - **Frightened Mode** trigger on energizer pickup (timer override, blue state).
    - **Eaten State** (eyes returning to ghost house spawn coordinates).
    - Reversal of ghost direction on mode transitions.
  - **Deliverable:** Deterministic FSM managing global game phases.

- [ ] **4.2 Ghost Targeting Strategies (`src/ai/*Strategy.ts`)**
  - **Tests (`tests/GhostAI.test.ts`):**
    - **Blinky (Shadow):** Direct Euclidean/Manhattan pursuit targeting Pacman's current tile.
    - **Pinky (Speedy):** Predictive targeting 4 tiles ahead of Pacman (including authentic original arcade Up+Left overflow quirk).
    - **Inky (Bashful):** 2-tile Pacman offset doubled over Blinky's vector.
    - **Clyde (Pokey):** Distance check ($> 8$ tiles: target Pacman; $\le 8$ tiles: retreat to bottom-left corner).
    - Intersection decision-making (evaluating candidate directions minimizing distance to target tile, forbidding 180° immediate reverse turns).
  - **Deliverable:** Strategy-pattern targeting implementations for all 4 ghosts.

---

### Phase 5: Scoring, Collisions & Game State
**Goal:** Tie together gameplay rules, item consumption, life tracking, and win/loss states.

- [ ] **5.1 Pellet & Energizer Consumption (`src/core/ScoreManager.ts`)**
  - **Tests (`tests/ScoreManager.test.ts`):**
    - Normal dot ($10\text{ pts}$) and Energizer ($50\text{ pts}$) collection.
    - Remaining pellet counter tracking and level clear trigger when count reaches 0.
    - Consecutive ghost consumption point streak ($200 \rightarrow 400 \rightarrow 800 \rightarrow 1600\text{ pts}$).
  - **Deliverable:** Centralized score and objective manager.

- [ ] **5.2 Entity Collision System (`src/core/Collision.ts`)**
  - **Tests (`tests/Collision.test.ts`):**
    - Pacman vs. Ghost proximity checks.
    - Normal state collision: Pacman loses a life, resets entity starting positions.
    - Frightened state collision: Ghost is eaten, score awarded, ghost transitions to `EATEN` state.
    - Game Over state when lives reach zero.
  - **Deliverable:** Deterministic collision resolution system.

---

### Phase 6: Presentation Layer & Procedural Audio
**Goal:** Render the deterministic game state onto HTML5 Canvas with low-latency Web Audio sound.

- [ ] **6.1 Canvas 2D Renderer (`src/render/CanvasRenderer.ts`)**
  - Maze tile rasterization (walls, paths, dots, energizers).
  - Sprite rendering and sub-pixel position interpolation.
  - Directional mouth opening/closing animations and ghost eye directions.
  - HUD display (current score, high score, remaining lives counter).

- [ ] **6.2 Procedural Web Audio Synthesizer (`src/audio/SoundManager.ts`)**
  - Oscillator-based 8-bit sound effects (waka-waka chime, siren, energizer hum, ghost eaten jingle, death sound).
  - Zero external MP3/WAV asset dependencies.

---

### Phase 7: Automated CI/CD & Cloud Deployment
**Goal:** Production-grade deployment with automated test verification on every commit.

- [ ] **7.1 GitHub Actions Workflow (`.github/workflows/ci.yml`)**
  - Run type checks (`npm run typecheck`).
  - Run Vitest unit tests in CI (`npm run test:run`).
  - Build static distribution bundle (`npm run build`).

- [ ] **7.2 Zero-Cost Static Edge Deployment**
  - Automated deployment of `dist/` to **Cloudflare Pages** / **Vercel**.
  - Custom domain routing configuration.

---

## 📈 Definition of Done (DoD) per Milestone

For any milestone to be marked complete:
1. 100% of unit tests pass via `npm run test:run`.
2. TypeScript compiles cleanly with zero warnings or errors (`npm run typecheck`).
3. Code strictly adheres to clean architecture (no presentation logic in simulation core).
4. Relevant ADRs are updated if architectural decisions were revised.
