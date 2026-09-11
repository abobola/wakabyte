---
name: tdd
description: Enforces strict Red-Green-Refactor TDD cycles, headless Vitest simulation testing, and strict TypeScript verification for the Wakabyte arcade engine.
---

### Test-Driven Development (TDD) Skill

#### When to Use
- **TRIGGER when:**
  - Implementing new features, mechanics, or algorithms from scratch using test-first Red-Green-Refactor methodology.
  - Advancing milestones on the TDD implementation roadmap (`docs/ROADMAP.md`).
- **DO NOT TRIGGER when:**
  - Pure refactoring of existing code without adding new features or changing behavior (use `refactoring` skill directly).
  - Adding, maintaining, or debugging standalone unit tests for existing features (use `unit-testing` skill directly).
  - Reviewing code for over-engineering or pruning speculative complexity (use `yagni` skill directly).
  - Editing static documentation (`README.md`, `docs/`) or CSS styles in `index.html`.
  - Working purely on presentation adapters (Canvas rendering, UI overlays) where automated math tests do not apply.

---

#### Architectural Constraints & Rules

1. **Zero DOM Dependencies in Simulation Core:**
   - All modules in `src/core/`, `src/entities/`, and `src/ai/` must remain pure TypeScript.
   - Never import or reference browser globals (`window`, `document`, `HTMLCanvasElement`, `AudioContext`) in the simulation core.
   - Core unit tests must run headlessly in pure Node.js via Vitest with sub-millisecond execution times.

2. **Strict Typing Standards:**
   - Always adhere to strict TypeScript settings (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).
   - Use strongly-typed enums, discriminated unions, and value objects (e.g., `Vector2D`, `Direction`) instead of raw primitive tuples or magic numbers.

3. **Discrete vs. Continuous Coordinate Discipline:**
   - Clearly distinguish between discrete grid tile coordinates (e.g., `(col, row)`) and continuous sub-pixel coordinates (e.g., `(x, y)`).
   - Use `Vector2D.toTile(tileSize)` and `Vector2D.fromTile(tileX, tileY, tileSize)` for explicit, deterministic conversions.

---

#### Core TDD Workflow & Skill Orchestration

Follow the strict **Red $\rightarrow$ Green $\rightarrow$ Refactor** cycle for every feature, chaining specialized skills at each stage:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 🔴 RED: Trigger `unit-testing` Skill                     │
│    Author failing unit test in `tests/`.                    │
│    Define strict behavioral contracts & edge cases.         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 🟢 GREEN: Trigger `yagni` Skill                          │
│    Implement minimal production logic in `src/`.            │
│    Eliminate speculative complexity & premature code.       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 🔵 REFACTOR: Trigger `refactoring` Skill                 │
│    Clean up structure, enforce types, eliminate duplication.│
│    Verify: `npm run test:run && npm run typecheck`.         │
└─────────────────────────────────────────────────────────────┘
```

##### Step 1: 🔴 RED (Delegate to `unit-testing` Skill)
- Author focused Vitest unit tests in `tests/` defining expected contracts and edge cases.
- Run `npm run test:run` to confirm the test fails for the expected reason (and not due to syntax/import errors).

##### Step 2: 🟢 GREEN (Delegate to `yagni` Skill)
- Implement only the minimal production logic in `src/` to make the failing test pass.
- Resist speculative abstractions, premature generalizations, or unused helper parameters.
- Adhere to the Rule of Three: do not extract generic abstractions without multiple concrete use cases.

##### Step 3: 🔵 REFACTOR (Delegate to `refactoring` Skill)
- Clean up code structure, enforce strict typing, and eliminate duplication while keeping all tests green.
- Never weaken or alter test assertions during refactoring.
- Execute full verification: `npm run test:run && npm run typecheck`.

---

#### Verification Commands

Before completing any task, execute:

```bash
# 1. Run all Vitest unit tests in headless mode
npm run test:run

# 2. Run TypeScript strict type verification
npm run typecheck
```

---

#### Git Commit Conventions

When committing changes produced by TDD cycles:
- Use **Conventional Commits** (e.g., `feat(core):`, `test(ai):`, `refactor(grid):`, `chore:`).
- Always include the co-authored trailer:
  `--trailer "Co-authored-by: Junie <junie@jetbrains.com>"`
