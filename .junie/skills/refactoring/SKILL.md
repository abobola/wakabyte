---
name: refactoring
description: Guides safe code refactoring, code smell eradication, structural cleanups, and design pattern improvements while preserving behavior and keeping test suites green.
---

### Refactoring Skill

#### When to Use
- **TRIGGER when:**
  - The user requests to refactor, restructure, simplify, or clean up existing code.
  - Eliminating code smells, duplication (DRY), or dead code in `src/`.
  - Extracting functions, classes, strategies, or modules to improve cohesion and decouple components.
  - Applying design patterns (State machine, Strategy, Ports-and-Adapters) or refining TypeScript types.
  - Optimizing performance or memory usage without altering external functionality.
- **DO NOT TRIGGER when:**
  - Adding new gameplay features, modifying game rules, or changing external API contracts.
  - Writing new unit tests from scratch (use `unit-testing` or `tdd`).
  - Setting up build/CI tools or editing documentation.

---

#### Core Refactoring Workflow

Follow a disciplined, safe transformation workflow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 🔍 PRE-CHECK: Baseline Verification                      │
│    Run test suite to verify everything passes before edits. │
│    Command: `npm run test:run && npm run typecheck`         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ✂️ ATOMIC TRANSFORMATIONS: Incremental Edits              │
│    - Apply small, targeted refactoring steps one at a time. │
│    - Preserve public method signatures and return types.    │
│    - Do NOT mix refactoring with new feature additions.     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 🧪 POST-CHECK: Continuous Verification                   │
│    Verify tests still pass and types are valid after edits. │
│    Command: `npm run test:run && npm run typecheck`         │
└──────────────────────────────┬──────────────────────────────┘
```

---

#### Refactoring Rules & Principles

1. **Preserve External Behavior:**
   - Existing unit tests MUST pass without modification unless a public API was intentionally redesigned.
   - If tests fail after a refactor, fix the implementation—never modify or weaken tests to fit broken code.

2. **Clean Architecture & Separation of Concerns:**
   - Keep simulation core (`src/core/`, `src/entities/`, `src/ai/`) strictly decoupled from browser/DOM APIs.
   - Extract discrete value objects (e.g., `Vector2D`, `Direction`) and specialized strategies rather than building monolithic god classes.

3. **Strict Type Safety:**
   - Leverage TypeScript's type system (discriminated unions, `readonly` modifiers, strict null checks).
   - Avoid `any`, type assertions (`as unknown as ...`), or non-null assertions (`!`) wherever possible.

4. **Zero Dead Code:**
   - Remove unused imports, dead branches, and commented-out legacy code.

---

#### Verification Commands

Always run after refactoring:

```bash
# Verify all existing tests remain green
npm run test:run

# Verify strict TypeScript compliance
npm run typecheck
```
