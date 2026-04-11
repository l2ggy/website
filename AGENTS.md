# Contribution & Code Guidelines

This repository prioritizes **clarity, consistency, and minimalism**. These rules apply to both human contributors and AI agents.

## 1) Code quality: clean + minimal
- Keep code as small and readable as possible.
- Avoid duplication; extract and reuse shared logic.
- Prefer small, composable functions over large, multi-purpose blocks.
- Remove dead code, unused variables, and unnecessary abstractions.
- Introduce dependencies only when clearly justified.

## 2) Styling philosophy: beautiful + extremely consistent
- Treat visual consistency as a core requirement.
- Reuse shared style primitives (variables, utility classes, base components) instead of creating one-off styles.
- Keep spacing, typography, sizing, color usage, and interaction states systematic and predictable.
- Use a small design vocabulary and apply it everywhere.
- If a new style pattern appears more than once, promote it to a reusable class/component.

## 3) Project structure: clean + minimal
- Use a simple, obvious folder/file structure.
- Group code by purpose and avoid deep nesting without clear value.
- Co-locate related files when it improves maintainability.
- Keep naming clear and consistent.
- Prefer conventions over custom patterns.

## 4) Visual change proof for AI agent contributions
- Any AI agent contribution that has a visual impact **must include a screenshot in its chat response**.
- If screenshot tooling is unavailable or fails, explicitly state that and why.

## 5) Contribution checklist (all contributors)
Before finalizing a change, verify:
- [ ] Code is minimal, readable, and non-redundant.
- [ ] Styling changes follow existing reusable patterns and preserve consistency.
- [ ] Project/file structure remains simple.
- [ ] For visual changes (AI agents): screenshot attached in chat response.
