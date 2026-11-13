---
name: Game Page Development
description: Modify or add one of the standalone browser games in public/, while preserving the shared game APIs and mobile experience.
---

# Workflow — page de jeu

1. Identify the exact game page in `public/<game>/index.html` and read it before editing. Check `src/pages/Home.tsx` if the game is launched from the hub.
2. Search for every use of the shared APIs involved (`Net`, `Profile`, `Party`, `Gages`, QR utilities) before changing a shared file. These pages may depend on globals and script order.
3. Keep the game self-contained unless the change clearly belongs in `public/shared/` or `public/themes/`.
4. Preserve existing game state, reconnect behavior, host/guest behavior, score reporting, and navigation back to the evening room unless the requested feature explicitly changes them.
5. Design for phones first: narrow viewport, touch targets, safe areas, reduced motion where relevant, and no hover-only controls.
6. Keep existing age gates and other restrictions intact. Do not move age-gated content into another game or weaken the gates.
7. Run the relevant checks. The build may not detect runtime errors in inline JavaScript, so inspect the changed code and state what browser/device testing remains.
8. Update `PROJECT_STATUS.md` after a substantial feature or behavior change.

Do not rewrite an entire game page just to make a small change. Avoid changing question packs or game content unless explicitly requested.
