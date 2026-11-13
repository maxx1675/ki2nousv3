---
name: Realtime Multiplayer
description: Trace or change room creation, player presence, SSE events, host handoff, reconnects, snapshots, scores, or the Hono relay.
---

# Workflow — réseau et synchronisation

1. Read the relevant parts of `public/shared/net.js`, `api/routes/rooms.ts`, `api/lib/relay.ts`, and `api/lib/relay.test.ts` before proposing a change.
2. Trace the whole contract: browser request/event -> Hono route -> `Relay` method -> SSE/event response -> browser handler. Check host and guest paths separately.
3. Preserve idempotency, connection identity, duplicate-event handling, reconnect/resume behavior, host promotion, snapshot recovery, room cleanup, and score authorization where applicable.
4. Do not move game rules into the server casually. The current architecture lets the host browser run the game while the server relays messages and keeps room/session metadata.
5. Add or update focused Vitest tests for server-side behavior and regressions. Include edge cases such as disconnect/reconnect, duplicate messages, stale connections and non-host requests where relevant.
6. Check compatibility with every game using the shared network layer; don't assume one game is the only consumer.
7. Run `npm test`, `npm run check`, and `npm run build` as appropriate. Clearly distinguish automated checks from manual multi-device testing.
8. Update `PROJECT_STATUS.md` with protocol changes, test results and known limitations.

Never claim that an in-memory room survives a server restart. Do not make deployment or scaling assumptions without checking the actual hosting configuration.
