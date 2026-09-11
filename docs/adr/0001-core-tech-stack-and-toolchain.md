# ADR 0001: Core Technology Stack and Toolchain Selection

## Status
Accepted

## Context & Problem Statement
We need to select a modern, robust, and cost-efficient technology stack to build `wakabyte`, a deterministic 2D arcade simulation engine modeled after classic 1980s maze mechanics. 

The primary goals of the project are:
1. Showcase senior-level software engineering practices, clean architecture, and decoupled design.
2. Adhere strictly to Test-Driven Development (TDD) with rapid, millisecond feedback loops.
3. Ensure zero runtime dependencies and zero external infrastructure costs.
4. Maintain deterministic simulation math and state machines isolated from browser rendering contexts.

## Decision Drivers
- **Deterministic TDD:** Fast, native ESM unit test runner capable of executing pure math and state machine tests without DOM dependencies.
- **Type Safety & Maintainability:** Strict type contracts (`strict: true`, `noImplicitAny: true`) to prevent coordinate, vector, and state transition errors at compile time.
- **Developer Experience (DX):** Instant Hot Module Replacement (HMR), minimal configuration overhead, and seamless build tooling.
- **Zero Runtime Overhead:** Lean bundle size with zero third-party game framework bloat.
- **Permanent Zero-Cost Hosting:** Compatibility with static edge CDN deployment (Cloudflare Pages, Vercel, GitHub Pages).

## Considered Options
1. **Option 1: Vanilla JavaScript (ES6+) + Jest + Webpack**
   - *Pros:* Native browser language, widely understood.
   - *Cons:* Lacks compile-time type safety; Jest has slower startup overhead with ESM modules compared to native Vite-based runners; Webpack requires extensive configuration.
2. **Option 2: 2D Game Engine (Phaser 3 / PixiJS) + Webpack/Vite**
   - *Pros:* Built-in physics, tilemap loaders, and sprite managers.
   - *Cons:* High abstraction level obscures core algorithmic design (pathfinding, grid transforms, collision math); adds third-party dependencies; couples logic to engine-specific scene lifecycles making headless TDD more complex.
3. **Option 3: TypeScript 5.x + Vite + Vitest + HTML5 Canvas (Chosen)**
   - *Pros:* Modern, zero-dependency browser-native stack; strict compile-time types; unified Vite/Vitest pipeline with sub-millisecond headless test execution.
   - *Cons:* Requires writing game loop, vector math, and grid collision logic manually from scratch (which directly aligns with the project's educational and portfolio goals).

## Decision Outcome
Chosen option: **Option 3: TypeScript 5.x + Vite + Vitest + HTML5 Canvas**.

### Architectural Rationale
- **TypeScript 5.x:** Enforces strict types across domain models, discriminated unions for state machine transitions (Chase, Scatter, Frightened, Eaten), and explicit vector/coordinate contracts.
- **Vite:** Delivers instant dev-server boot, native ES module handling, and optimized production tree-shaking with Rollup.
- **Vitest:** Shares Vite's configuration and module resolution, running test suites in parallel worker threads in pure Node.js without requiring DOM simulation libraries (`jsdom` / `happy-dom`) for domain tests.
- **HTML5 Canvas 2D Context:** Direct rasterization with zero third-party runtime overhead, keeping the engine lightweight and portable.

## Consequences

### Positive Consequences
- **Instant TDD Feedback Loops:** Unit tests execute in milliseconds, facilitating continuous Red-Green-Refactor cycles.
- **Zero Runtime Dependencies:** No risk of external library deprecations, breaking API changes, or security vulnerabilities.
- **Architectural Purity:** Decouples core simulation math from presentation, making the engine testable and easily adaptable to different rendering layers (Canvas, WebGL, or terminal).
- **Portfolio Value:** Highlights core algorithmic mastery, math fundamentals, and design patterns rather than framework-specific API familiarity.

### Negative Consequences & Trade-offs
- **Custom Engine Boilerplate:** Physics, grid alignment, input buffering, and delta-time loop mechanics must be implemented manually.
  - *Mitigation:* Building these core components from first principles is an intentional project goal, thoroughly verified with automated unit tests.
