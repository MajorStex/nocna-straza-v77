## Odluka 13.11.2026 — ISTI NOVI MOD U SINGLEPLAYER I MULTIPLAYER
- Pristup iz iste glavne igre, preko CHOOSE MODE / IZABERI REŽIM, uz opšti **nivo naloga 7**.
- U režimu NOVA ZONA prikazati **dve jasne opcije:** `SINGLEPLAYER — NOVA ZONA (OFFLINE)` i `MULTIPLAYER — NOVA ZONA (DO 6 IGRAČA)`. Ne podrazumevati da je izabrana zona automatski samo MP.
- **Solo** počinje bez lobija, WebSocketa, Cloudflare zahteva ili naknade. Simulacija je lokalna i koristi isti raspored arene/prepreka i isti izgled heroja kao nova MP zona. Izlaz vraća u CHOOSE MODE.
- **MP** koristi postojeći lobby / kod sobe / Ready, a na početku meča prelazi na potpuno odvojen autorizovan server; stari Classic i druge režime ne menjati.
- **Krajnji cilj:** isti sadržaj, neprijatelji, mape, boss talasi i mehanike u Singleplayer i Multiplayer varijanti Nove zone. Razlika je samo u lokaciji računanja stanja (lokalno ili autoritativni server).
- **Faza 1, privremeno:** offline solo ima testnu arenu, prepreke, mobilne/PC kontrole, napade i gobline; bez XP-a, nagrada ili cloud progresa. MP faza 1 još testira odvojeni server bez mobova. Obe faze nisu završene kao pun režim; ne predstavljati ih kao kompletnu igru.
- **Objavljivanje:** promene samo na posebnoj razvojnoj grani sve dok nova backend infrastruktura i test dva klijenta ne prođu; produkcioni Cloudflare URL ne menjati pre toga.

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

## Agreed architecture: keep the old lobby, switch networks ONLY when new mode starts
- **Yes: use existing Create Game / Join Game / invite friends / Ready controls unchanged** until mode V140 is launched. Everyone initially joins through `/room/<code>` using the old relay; matchmaking stays compatible.
- `startLobbyMatch()` currently does `NET.phase='playing'`, `startGame(...)` and broadcasts `{t:'start'}`. For V140, **intercept at the start of `startLobbyMatch()`** *before* `NET.phase='playing'` or `startGame()`. Do not instantiate the old G simulation for V140.
- Host presses Start -> sends one `arenaPrepare` request to new authoritative Durable Object `/arena/<new_match_id>` (server creates a short-lived room; the host is just player P1). Server returns unique match ID and cryptographically unpredictable, expiring **per-seat** tickets. Validate intended roster/seat IDs. Never trust the room code alone to authorize an arena seat.
- Host sends `arenaOffer` (version, new match id, per-recipient single-use ticket, seat id, expected server protocol) to each guest over the **existing lobby control connection**; never leak the whole ticket map to all players. Old lobby stays active **for control only**, not for simulation.
- Every browser opens a **second, isolated** `wss://…/arena/<match_id>` connection itself; clients handshake `arenaHello(ticket, build, seat)`, server validates one-time ticket and marks member `connected`. Server replies `arenaWelcome` with authoritative initial state + server tick.
- Keep old lobby connected until all expected seats have `arenaReady`, or until a bounded timeout. On failure return everyone to the existing lobby with a clear retry indicator (NO automatic downgrade to legacy combat). If 1 of 4 is disconnected or old client version, do not silently run a 3-person different match. Allow host to cancel or explicitly retry.
- Once all seats are ready, the new server emits `arenaStartAt(tick)`; only then switch render/input from old lobby to V140 simulation. Both host and guests route controls to the new WebSocket; **old `NET.remoteInputs` / `sendSnapshot` / `ns132SendMotion` / `NS95_CAGE` are never used for the arena**.
- During V140 play, old lobby connection is kept low-rate/idle strictly for social/room restoration, or shut down after migration if measurements show it causes congestion (in that case rebuild the lobby when the arena ends). Never stream two separate game-state pipelines.
- When the match ends, everyone receives `arenaGameOver`, V140 sockets close and clients return to the same social lobby. Restore same players/Ready if possible; if old room expired, show a one-tap rejoin by retained code instead of pretending restoration succeeded.
- Duplicate `arenaOffer` / repeated Start / reconnections are idempotent per `match_id`. A stale callback must not turn on the old game. Guest version mismatch -> explicit error, no silent fallback. Host disconnect must **not** terminate server simulation while guests remain (server is authority). Handle room empty TTL.
- Keep a **separate** code path for V140, feature flag, protocol version and safety switch. No changes to existing Classic/Night Flame/Siege network code beyond the small conditional `startLobbyMatch()` intercept and V140 lobby selector.
- Multiplayer quality cannot be guaranteed perfect on every network. Require controlled tests with throttling plus two real Android devices before declaring playable.

## Concrete old code integration points (verified)
- `public/index.html`: `renderPreRun()` defines modes (classic level 1, night level 3, rush level 8, future disabled); new V140 mode belongs between night and rush with unlock at account/general level 7 if user confirms.
- `startLobbyMatch()` is the host initiation point. It currently changes `NET.phase`, calls `startGame`, and sends `t:'start'`; the intercept **must be before this** for V140.
- Guest receives `t:'start'` inside `setupConnection().on('data')`, where it calls `startGame()`; V140 uses a separate `t:'arenaOffer'` and must never call this legacy branch.
- Existing lobby WebSocket is `wss://nocna-straza-relay.stefanstevic1996.workers.dev/room/<code>` and can remain as just a low-rate control channel; separate V140 URL `/arena/<match_id>` must only become available once new backend has been deployed.
- `MajorStex/nocna-straza-relay` currently only exposes `/room/`; add a new Durable Object class + binding and new route in a separate release, preserving the legacy GameRoom schema.

## Potvrđene odluke korisnika (13.11.2026)
- **Otključavanje:** opšti nivo **naloga 7**, ne nivo pojedinačnog heroja. Novi mod odmah važi za sve heroje jednog naloga.
- **Testiranje:** pristup **A**. Prvo 2 igrača: kretanje, promena smera, sudari i napadi; zatim 15–25 goblina; tek nakon stabilnosti 4–6 igrača i veće horde.
- **Trošak:** strogo **0 EUR mesečno**, bez prelaska na paid plan, bez 24/7 servera ili automatske naplate. Rad samo u okviru Cloudflare Workers Free / SQLite-backed Durable Objects, sa budžetom zahteva i obračunskog vremena po sesiji i automatskim zaustavljanjem kada se budžet primakne limitu.
- **Prebacivanje:** ostaje stari lobby/pozivi/Ready, ali pokretanje ovog moda prebacuje sve u nezavisan, server-autoritativan multiplayer; nema automatskog fallback-a na stari netcode.
- **Trenutni sledeći korak:** potvrditi raspoloživost **dva fizička telefona na različitim mrežama**, jer simulacija jittera ne može zameniti realni 4G/5G test.
- Nije potvrđeno da je nova implementacija izvršena ili objavljena; ovo je još plan i ne sme se prikazivati kao live igra.

### Operativni test plan pod uslovom 0 €
1. Server iza nove `/arena/` putanje, odvojen od Classic i Night Flame; eksplicitno koristi SQLite-backed Durable Object.
2. Prvo instrumentacija: frame time, host/guest RTT, ack age, correction distance, snapshot age, outbound buffer, server tick duration, naplativi zahtevi.
3. Probe sa **2 klijenta** bez neprijatelja: 60 sekundi mirovanja, 60 sekundi promena pravca, sudari sa zgradama, brzi napadi, skok kašnjenja 100/250/400 ms i prekid do 2 s; stanje HP i pozicija mora ostati usaglašeno.
4. Dodaj 15, pa 25 goblina uz zajedničko polje putanja; testiraj potrošnju po neprijatelju. Ako klijent zaostaje, smanji količinu replikovanih podataka, ne lokalni responsiveness.
5. Povećaj broj igrača 2→4→6 i broj neprijatelja 25→40→60. Beleži procentile 95/99, ne samo prosečni FPS.
6. Server radi samo dok je makar jedan igrač aktivno u partiji; prazna soba završava simulaciju i oslobađa resurse. Idle WebSocket hibernation gde je moguća, ali ne očekivati hibernaciju tokom aktivnih tick-ova.
7. Pri približavanju Free limitima sprečiti start novih partija i dati razumljivu poruku, umesto da igra pukne usred sesije; nikad ne preći na plaćeni plan.
8. Tek posle kontrolisanog browser testa, obavezan pravi test dva telefona (jedan Wi-Fi, drugi mobilni internet), pa multiplayer sa šest.
Cloudflare izvori (provereno 13.11.2026):
https://developers.cloudflare.com/durable-objects/platform/pricing/
https://developers.cloudflare.com/durable-objects/best-practices/websockets/

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
