---
name: Verification and Handoff
description: Validate a code change, inspect the final diff, and leave concise durable project notes for the next OpenCode session.
---

# Workflow — vérification et passation

1. Inspect `git status --short` and `git diff --stat` so pre-existing user changes are not confused with the current task.
2. Choose checks based on the changed areas:
   - TypeScript: `npm run check`.
   - Relay/backend logic: `npm test`.
   - Multi-layer changes or release readiness: `npm run check`, `npm test`, `npm run build`.
   - Inline game HTML/JavaScript: inspect the full changed block and identify any browser/mobile checks that cannot be automated by the existing test suite.
3. Fix failures introduced by the change. Do not hide a failing check, weaken a test just to obtain green output, or report a command as passed if it was not run.
4. Review the final diff for unrelated edits, accidental generated files, secrets, debug output and broken links/paths.
5. Update `PROJECT_STATUS.md` after a substantial task: date, goal, modified areas, decisions, real test results, known limitations, next concrete step.
6. Change `ARCHITECTURE.md` only when durable system structure or contracts actually changed. Keep `AGENTS.md` short and stable.
7. Final response should briefly state: what changed, important files, checks and results, manual tests still needed, and whether project memory was updated.
