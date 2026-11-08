# Noćna Straža V109 — Global leaderboard security plan

## Current state
V109 has read-only global leaderboard presentation, per-account locally/cloud-synced personal results, refresh limited to five minutes (manual request once per minute). The existing Cloudflare relay does not have verified global scores or a ranking database. DO NOT call the leaderboard live or accept raw client-posted kills.

## Trusted architecture
1. Verify Firebase ID tokens inside an authenticated Cloudflare Worker. Bind account to immutable verified UID. Never trust incoming UID, level, kills or game duration from browser.
2. Cloudflare D1 tables: players keyed by verified UID; matches keyed by random server-issued match ID; player match results with unique (match ID, UID). Index verified totals and best wave, keep audit events.
3. Server issues match ID and a short-lived room session bound to verified roster and mode before playing. Reconnect and host migration preserve same match ID.
4. Client-host-authoritative gameplay is not fraud-proof: a modified host can fabricate enemy kills. Competitive verified statistics require server validation of actual enemy spawn, health/damage, kill attribution and wave timing, ideally with server-authoritative simulation. Until then, any casual host-submitted ranking MUST be visibly labeled as unverified, never presented as verified.
5. Accept finalized results only once per player and match, with D1 uniqueness and transactional aggregate update. Reject replays, impossible rates, invalid timing, test/editor rounds and forged identities. Returning existing receipt on retry prevents duplicate totals.
6. GET /api/leaderboard?period=all returns at most 50 sanitized public profiles, verified flag, server totals, account level and best wave; cache response on server 300 seconds. Client loads only on leaderboard opening; cache five minutes; throttle manual refresh to one minute. Limit endpoint request/IP/account and set CORS for official domain.
7. Player display names only; no email, IP, access tokens or private account IDs in ranking responses. Offer opt-out/privacy settings and moderation.
8. Add six-client abuse tests: forged accounts, replay events, disconnected sessions, host migration, impossible kills, room flood and repeated submission.
9. Deploy new D1 Worker with verified credentials and migrations separately. Do not alter classic P2P combat until the ranking service is proven.

## Compatibility
V109 village is isolated in /public/v109/, with V108 unchanged. Buildings reuse old purchases, upgrade state and lobby chat. Sparta 300 personal kills changes only wardrobe colors/appearance, no stats; its current client-side cosmetics are not cryptographically tamperproof and must not become a paid or economically valuable entitlement until verified server-side.
