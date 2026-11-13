# Noćna Straža — Level 7: NEW multiplayer mode, separate netcode (V140 design)

Status: architecture proposal only; **not yet selectable or live**. Created on a separate branch from v138 main. Do not merge/deploy until user settles progression gate and first test scope.

## Verified current layout (2026-11-13)
- CHOOSE MODE: normal = general level 1, night/Night Flame = level 3, rush/Siege = level 8. Proposed new mode between night and rush, unlock level 7.
- Game frontend: `public/index.html`; current authoritative simulation runs on host phone; clients send movement inputs to host via Cloudflare WebSocket relay.
- Relay: private repo `MajorStex/nocna-straza-relay`, `GameRoom` Durable Object currently **forwards** HELLO/CONNECT/DATA; it does not simulate game. Do not change existing room protocol for other modes.
- Existing guest code predicts locally and corrects using a lead based on CURRENT joystick direction and RTT; this can visibly pull the player toward old host coordinates. Compact motion/large snapshots share reliable WebSocket, which can queue old updates. A rescued ally replaces its position with data from each snapshot.
- Important: the worker URL provided by the user is the canonical frontend address for them. No successful v140 live deployment is confirmed.

## Proposal: V140 isolated co-op arena prototype
- Keep existing hero/wardrobe/joystick/WASD/control semantics and 60 FPS client drawing; **do not copy existing networking, mob AI or world update** into V140.
- Small separate frontend module `public/v140-net-mode.js` + tiny integration in CHOOSE MODE, isolated namespace and no mutations to classic/night/rush, achievements, saved games or XP.
- Dedicated backend module and new Durable Object class `ArenaRoomV140` under the existing relay project; separate `/arena/<code>` route, isolated from existing `/room/<code>` to avoid disrupting friends playing old modes.
- Room owner chooses Start, but is *not* the authoritative simulator: server owns physics, positions, HP, enemy spawns, attacks, death and respawn. Host and guests use identical inputs/ack/reconciliation. Do not trust client positions/damage.
- Fixed timestep target: 30 Hz server sim, 12 Hz network snapshots, 60 FPS visual updates, 20 Hz input packets, all provisional and adjustable after measured Android/4G tests. Avoid timer-per-entity; one tick per active room.
- Input schema (initial compact JSON, binary later only if measured necessary):
  `["i",seq,buttons,ax,ay]` where axes quantized to [-127,127]. 20 updates/s/device. Client stores input history for deterministic local movement only. Server acknowledges `lastProcessedInputSeq` on each snapshot for that player.
- State schema:
  `["s",serverTick,ackSeq,playerRows,nearbyMobRows,eventIds]`.
  Player row = id, quantized x/y, hp, pose, facing, flags.
  Mob row = entity id, type, quantized x/y, hp, animation flags.
  Server publishes ONLY nearby/visible moving entities + important bosses.
  Initial budget **target**, NOT measured: ~0.5–1.5 KB per snapshot/client at 12 Hz (6–18 KB/s per player). Keyframes on join and periodically; no full-world inventory/AI graph every tick.
- Event messages (spawn/death/hits/loot later) carry monotonic ids and are deduplicated; they never rely on the delivery of a disposable position update.
- Client's own avatar: predict movement immediately with exactly same simple static-collision code, rewind to acknowledged server state and replay pending input sequence numbers; smooth only small residual visuals; never use current joystick multiplied by RTT as a position fix.
- Other players/mobs/ally: buffer a few timestamped updates and interpolate ~100–150ms behind; bound extrapolation; drop stale state, never replay old snapshots after newer data. Ally combat is an entity in the same pipeline, not special legacy snapshot logic.
- Network: single compact WebSocket per client for MVP. If measured TCP head-of-line queueing remains unacceptable, evaluate separate low-latency partial-reliability WebRTC motion lane, retaining reliable server events. Do not introduce dual-network complexity without evidence.
- Enemy AI: coarse shared flow field / distance grid updated only on topology changes or when target-group cell changes; basic steering/local separation at a lower rate; group near players, no individual per-entity A* each frame. Start with 15–25 simple creeps, then 40 and 60 if profile passes. Avoid network transmission of path nodes; only positions/animations matter.
- Separate render budget, reusable arrays/object pools, no DOM HUD rebuild per frame, distance culling and bounded particles.
- New mode test has NO permanent XP/coins/achievement awards until server architecture is verified and the user explicitly approves progression rules. No purchases.

## Staged QA / release gates
1. Pure movement sandbox on two clients: walking, sprint/dodge, turn rapidly and collide with walls; show **real-time** FPS, ping, snapshot Hz, byte rates, correction pixels, server tick cost and connection queue.
2. Mobile browser E2E at 360/412 px, one test server + 2 clients; simulators add 100/250/400ms RTT, 20–100ms jitter, temporary 0.5–2s pauses and 5% application-level drops; actual WebSocket TCP is reliable.
3. Add 15, 25, 40, then up to 60 creeps; instrument CPU/pathfinding timings. Add attack, hit feedback, death and relogin.
4. Stress at 2, 4 and 6 clients and throttled Android emulation; then verify on real different phones including Wi‑Fi vs 4G/5G (CI cannot certify real internet performance).
5. Operational success targets (provisional): solo/multiplayer host and guests >=45 FPS on target Android device with 60 FPS ideal; no sustained rubber-band under 150ms RTT + moderate jitter, stale state properly discarded; no unbounded queues, duplicate damage, or divergent HP.
6. Run under limited-duration free-tier test rooms; monitor billing and quotas. Cloudflare Durable Objects free-tier and pricing must be rechecked at deployment. Server tick loop prevents hibernation while active and consumes duration; free does **not** mean unlimited. For 6 clients at 20 input/s each and 20:1 WebSocket request billing ratio, input alone uses ~21,600 billable req/hour, ignoring other billed operations, which could exhaust 100,000/day after several hours.
7. Deploy ONLY after separate backend + frontend CI, using an authenticated Cloudflare deployment and smoke-tested live version. Never confuse a GitHub commit with a live Worker deployment; do not expose tokens in chat. Keep classic v138 and pending v139 work intact.

## Decisions requested
1. Unlock: general/account level 7 or the selected hero level 7? Existing code uses *both* account and hero level in different checks.
2. First test: 2–6 players in one shared arena with 15–25 goblins and identical current hero controls, **zero XP** until stable? Any different first enemy, or yes to this default?
3. Budget: does a free Cloudflare plan with capped daily play time remain mandatory, or can running a dedicated 24/7 authoritative simulator have a small paid monthly allowance? Default: free tier, rooms expire when empty and simulation runs only while a test match is active.

## Sources
- https://gabrielgambetta.com/client-side-prediction-server-reconciliation.html
- https://gabrielgambetta.com/entity-interpolation.html
- https://gafferongames.com/post/snapshot_interpolation/
- https://www.redblobgames.com/pathfinding/tower-defense/index.html
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
