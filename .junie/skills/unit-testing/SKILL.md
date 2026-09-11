---
name: unit-testing
description: Guides authoring, expanding, and running fast headless unit tests with Vitest for the simulation engine, grid math, and entity logic.
---

### Unit Testing Skill

#### When to Use
- **TRIGGER when:**
  - The user requests to write, add, expand, or fix unit tests.
  - Adding test coverage for core simulation logic, boundary conditions, or edge cases in `tests/`.
  - Diagnosing test failures or debugging broken assertions.
  - Creating mock-free, deterministic unit tests for math, grids, collisions, or AI strategies.
- **DO NOT TRIGGER when:**
  - Implementing full features via test-first methodology from scratch (use `tdd`).
  - Refactoring code without modifying or adding tests (use `refactoring`).
  - Modifying build toolchain or documentation.

---

#### Testing Philosophy & Guidelines

1. **Pure Headless Execution:**
   - All simulation tests must run in headless Node.js via Vitest with sub-millisecond execution times.
   - Do NOT introduce DOM polyfills (`jsdom`, `happy-dom`) into domain unit tests unless testing browser adapters.

2. **Deterministic & Isolated Tests:**
   - No shared mutable state between tests.
   - Use explicit values and deterministic coordinates rather than random generators.
   - Follow the **AAA Pattern** (Arrange, Act, Assert).

3. **Descriptive Test Structure:**
   - Group related behaviors with `describe()` blocks.
   - Use clear, intention-revealing test names (`it('wraps around horizontally when exiting left tunnel', ...)`).

---

#### Core Testing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 🎯 IDENTIFY: Target Behavior & Edge Cases                │
│    Determine the exact domain logic or edge case to test.   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ✍️ AUTHOR: Write Focused Vitest Suite in `tests/`         │
│    - Set up clean fixtures in `beforeEach` if needed.       │
│    - Test both happy paths and boundary/negative cases.     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 🚀 EXECUTE & VERIFY: Run Test Suite                       │
│    Command: `npm run test:run`                              │
│    Ensure fast execution and zero regression.               │
└──────────────────────────────┬──────────────────────────────┘
```

---

#### Common Assertion Patterns in Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { Vector2D } from '../src/core/Vector2D';

describe('Vector2D', () => {
  it('calculates Manhattan distance correctly', () => {
    // Arrange
    const a = new Vector2D(1, 2);
    const b = new Vector2D(4, 6);

    // Act
    const distance = a.manhattanDistanceTo(b);

    // Assert
    expect(distance).toBe(7);
  });
});
```

---

#### Verification Commands

```bash
# Run all unit tests
npm run test:run

# Run a specific test file
npx vitest run tests/Vector2D.test.ts

# Run tests in watch mode during development
npx vitest
```
