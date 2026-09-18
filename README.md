# Wakabyte

> **Deterministic 2D arcade engine & authentic Ghost AI state machine built in TypeScript and HTML5 Canvas using Test-Driven Development (TDD).**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-729B1B.svg?style=flat-square&logo=vitest)](https://vitest.dev/)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20Decoupled-success.svg?style=flat-square)](#architecture--design-principles)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 🕹️ Overview

**Wakabyte** is a modern, zero-dependency 2D arcade engine modeled after the classic 1980s maze mechanics. Designed as a showcase of senior-level software engineering practices, it emphasizes clean separation of concerns, strict type safety, deterministic simulation math, and authentic artificial intelligence behavior.

Unlike typical tutorial clones that tightly couple game logic with browser Canvas APIs, Wakabyte isolates its **core domain rules, coordinate math, collision systems, and AI state machines** into pure, zero-DOM TypeScript modules that are 100% unit-tested via **TDD (Test-Driven Development)**.

---

## ✨ Key Highlights

- 🎯 **Test-Driven Architecture (TDD):** 100% unit-tested domain models (vectors, grid matrices, input buffers, collision rules, AI target calculations) with zero browser dependencies.
- 👻 **Authentic Ghost AI & FSM:** Accurate implementation of the original arcade targeting behaviors for all 4 ghosts:
  - **Blinky (Shadow):** Direct pursuit targeting Pacman's current tile.
  - **Pinky (Speedy):** Predictive ambush targeting 4 tiles ahead in Pacman's facing vector.
  - **Inky (Bashful):** Dual-vector reflection using Blinky's coordinates and an offset ahead of Pacman.
  - **Clyde (Pokey):** Proximity-based heuristic (chases when distance > 8 tiles, retreats to scatter corner when $\le$ 8 tiles).
- ⏱️ **Global Wave State Machine:** Dynamic timed cycles between **Scatter** and **Chase** modes, plus **Frightened** (energizer) and **Eaten** (eyes returning to ghost house) states.
- 🎮 **Grid Movement & Input Buffering:** Sub-pixel continuous movement with strict tile alignment, responsive cornering via input pre-buffering, and seamless tunnel wrap-around.
- 🔊 **Synthesized Audio Pipeline:** Web Audio API sound generator creating authentic 8-bit arcade tones without external audio asset dependencies.
- 🚀 **Zero-Cost Cloud Architecture:** Optimized for instantaneous static edge hosting (Cloudflare Pages, Vercel, GitHub Pages) with automated GitHub Actions CI/CD pipelines.

---

## 📐 Architecture & Design Principles

Wakabyte adopts a decoupled architecture separating the pure simulation engine from browser-specific I/O adapters:

```
┌──────────────────────────────────────────────────────────┐
│                   Presentation / Driver                  │
│  • HTML5 Canvas 2D Renderer (Sprites, HUD, Interpolation)│
│  • Web Audio API Synthesizer                             │
│  • Keyboard & Touch / Virtual D-Pad Event Handlers       │
└─────────────────────────────▲────────────────────────────┘
                              │
                    Observes & Dispatches
                              │
┌──────────────────────────────────────────────────────────┐
│                 Core Simulation Engine                   │
│  • Fixed-Timestep / Delta Game Loop                      │
│  • Vector2D & Coordinate System (Screen ↔ Tile)          │
│  • Grid Tilemap & Boundary Collision Engine              │
│  • Input Buffer Queue & Movement Controllers             │
│  • Ghost Finite State Machine (Chase / Scatter / Fright) │
│  • Scorekeeper & Game Rules State                        │
└─────────────────────────────▲────────────────────────────┘
                              │
                     Drives & Validates
                              │
┌──────────────────────────────────────────────────────────┐
│                 TDD Test Suite (Vitest)                  │
│  • Unit tests for all pure math & decision algorithms    │
│  • Zero DOM / Headless execution                         │
└──────────────────────────────────────────────────────────┘
```

---

## 🧠 Authentic Ghost AI Mechanics

Each ghost operates on a distinct targeting strategy determined by global and local state machines:

| Ghost | Character | Nickname | Targeting Strategy |
| :--- | :--- | :--- | :--- |
| 🔴 **Blinky** | Shadow | *Oikake* | Directly targets Pacman's current tile position. |
| 🌸 **Pinky** | Speedy | *Machibuse* | Targets **4 tiles ahead** of Pacman's current direction vector. |
| 🩵 **Inky** | Bashful | *Kimagure* | Calculates an offset vector 2 tiles ahead of Pacman, then doubles the vector from Blinky to that offset. |
| 🟠 **Clyde** | Pokey | *Otoboke* | If Euclidean distance to Pacman is $> 8$ tiles, pursues Pacman; if $\le 8$ tiles, retreats to bottom-left scatter corner. |

### Global Wave Timing
- **Scatter Mode:** Ghosts disengage and pathfind toward their respective home corners.
- **Chase Mode:** Ghosts actively track Pacman according to their unique targeting rules.
- **Frightened Mode:** Triggered by Energizers; ghosts turn blue, reduce speed, and make pseudo-random turn choices at intersections.
- **Eaten State:** Eyes return to the ghost house to respawn.

---

## 📂 Project Structure

```
wakabyte/
├── src/
│   ├── core/                  # Pure math & deterministic game logic (zero DOM dependencies)
│   │   ├── Vector2D.ts        # 2D vector arithmetic & Manhattan distance
│   │   ├── Direction.ts       # Cardinal directions & rotation utilities
│   │   ├── Grid.ts            # Tilemap parsing, coordinate transforms & boundaries
│   │   ├── InputBuffer.ts     # Queued direction buffer with TTL & cornering
│   │   ├── ScoreManager.ts    # Score tracking, ghost multipliers & high score persistence
│   │   ├── Collision.ts       # Proximity checks, life tracking & interaction resolution
│   │   ├── GameLoop.ts        # Deterministic simulation coordinator & game loop
│   │   └── index.ts           # Core domain barrel export
│   ├── entities/              # Game actors & kinematics
│   │   ├── Pacman.ts          # Player controller & continuous grid movement
│   │   ├── Ghost.ts           # Ghost movement, AI steering & house revival
│   │   ├── movement.ts        # Shared 1D tile lane geometry & position resolution
│   │   └── index.ts           # Entities barrel export
│   ├── ai/                    # Ghost targeting algorithms & state machines
│   │   ├── GhostFSM.ts        # Timed Scatter/Chase wave cycles & Frightened/Eaten states
│   │   ├── GhostStrategy.ts   # Base targeting strategy contracts
│   │   ├── BlinkyStrategy.ts  # Direct pursuit
│   │   ├── PinkyStrategy.ts   # 4-tile ambush offset
│   │   ├── InkyStrategy.ts    # Dual-vector reflection
│   │   ├── ClydeStrategy.ts   # Proximity-based retreat
│   │   └── index.ts           # AI barrel export
│   ├── render/                # HTML5 Canvas presentation layer
│   │   ├── CanvasRenderer.ts  # Tilemap rasterization, sprite rendering & arcade HUD
│   │   └── index.ts           # Render barrel export
│   ├── config/                # Map definitions & constants
│   │   └── mapData.ts         # Authentic 28x36 arcade tile matrix
│   └── main.ts                # Application entrypoint & browser render loop
├── tests/                     # 13 automated Vitest test suites (287 passing tests)
│   ├── Vector2D.test.ts
│   ├── Direction.test.ts
│   ├── Grid.test.ts
│   ├── InputBuffer.test.ts
│   ├── ScoreManager.test.ts
│   ├── Collision.test.ts
│   ├── Pacman.test.ts
│   ├── Ghost.test.ts
│   ├── GhostFSM.test.ts
│   ├── GhostAI.test.ts
│   ├── movement.test.ts
│   ├── GameLoop.test.ts
│   └── CanvasRenderer.test.ts
├── docs/                      # Architecture Decision Records & Roadmaps
│   ├── ROADMAP.md
│   └── adr/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Package Manager**: `npm`, `pnpm`, or `yarn`

### Installation
```bash
# Clone repository
git clone git@github.com:<your-username>/wakabyte.git
cd wakabyte

# Install dependencies
npm install
```

### Development & Testing
```bash
# Start local development server (with hot module reload)
npm run dev

# Run Vitest unit test suite (watch mode)
npm run test

# Run tests with coverage report
npm run test:coverage

# Perform TypeScript type-checking
npm run typecheck

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🧪 Testing Strategy

Wakabyte strictly follows a **Test-Driven Development (TDD)** workflow:
1. **Red:** Write a failing unit test defining expected behavior (e.g. Inky target vector calculation when Pacman is facing Up).
2. **Green:** Implement the minimal code required to pass the test.
3. **Refactor:** Clean up, optimize, and enforce strict type contracts without altering behavior.

---

## 🚢 Deployment

Wakabyte is designed to deploy seamlessly to modern Edge CDN platforms with zero ongoing server costs:

- **Cloudflare Pages:** Connect the repository for automatic preview builds and edge deployment.
- **Vercel / Netlify:** Import the Git repo; framework preset auto-detects `Vite`.
- **GitHub Pages:** Automated deployment via GitHub Actions on every push to `main`.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
