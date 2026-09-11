---
name: yagni
description: Prevents premature abstraction, eliminates speculative complexity, and enforces minimalist, pragmatic software design principles.
---

### YAGNI (You Aren't Gonna Need It) Skill

#### When to Use
- **TRIGGER when:**
  - Reviewing code proposals, PRs, or architecture designs for over-engineering.
  - Pruning speculative features, premature abstractions, or unused configuration options.
  - Simplifying complex classes or modules down to their minimum viable implementation.
  - Questioning whether a proposed pattern, generic type, or interface is strictly necessary for current requirements.
- **DO NOT TRIGGER when:**
  - Writing standard unit tests or implementing verified roadmap features (use `tdd` or `unit-testing`).
  - Restructuring existing code to improve clarity without altering behavior (use `refactoring`).
  - Performance optimization where complexity is justified by measured bottlenecks.

---

#### Core Principles & Heuristics

1. **Maximize Net Value by Minimizing Waste:**
   - Implement only the logic strictly necessary to satisfy the current failing test or active requirement.
   - Avoid speculative hook points, plugin systems, and generic wrapper layers that consume maintenance effort without producing immediate utility.

2. **The Rule of Three for Abstractions:**
   - Write concrete implementations first.
   - Extract an interface or abstract base class ONLY when three distinct components share identical behavior.
   - Prefer localized duplication over the friction and cognitive cost of an incorrect abstraction.

3. **Prune Speculative Parameters:**
   - Functions and constructors should take only the arguments actively required for execution.
   - Eliminate generic option bags (`options?: Record<string, unknown>`) when strongly typed, explicit parameters deliver the exact functionality needed.

4. **Lean Value Objects over Generic Engines:**
   - Keep domain primitives like `Vector2D` and `Grid` focused on concrete arcade coordinates rather than building a generic N-dimensional physics engine.

---

#### YAGNI Checklist for Code Reviews

- [ ] Does this code solve an immediate, proven requirement or a speculative future one?
- [ ] Is there an interface with only one concrete implementation that could be simplified into a single concrete class?
- [ ] Are there unused methods, dead getters/setters, or unused configuration flags?
- [ ] Could this logic be written in fewer lines of code while improving readability and reducing cognitive load?

---

#### Verification Command

```bash
# Verify tests and types remain green after pruning complexity
npm run test:run && npm run typecheck
```
