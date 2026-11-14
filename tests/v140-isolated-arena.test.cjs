'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'../public/v140-net-mode.js'),'utf8');
for(const m of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(x=>!/\bsrc=/.test(x[1])))
 new Function(m[2]);
new Function(client);
assert.match(html,/\['arena140','NOVA ZONA[^]*?,7\]/,'mode must be level 7 in choose mode');
assert.match(html,/<option value="arena140">/,'host can select mode in lobby');
assert.match(html,/if\(selectedMode==='arena140'\)[\s\S]{0,450}NS140_ARENA\.startHost\(/,
 'new arena branches before legacy startGame call');
assert.match(html,/data\.t==='arena140Offer'/,'guests receive transfer over old lobby');
assert.match(html,/window\.NS140_ARENA\?\.active/,'single shared requestAnimationFrame loop');
assert.match(html,/src="\.\/v140-net-mode\.js\?v=140"/,'V140 module must be served by frontend');
assert.match(client,/\/arena\/create/,'host reserves independent server');
assert.match(client,/\/arena\/'\+match/,'new WebSocket endpoint is not the old room path');
assert.doesNotMatch(client,/sendSnapshot|ns132SendMotion|performAttack|coopXP|awardMP|localStorage\.setItem/,
 'arena client cannot accidentally use legacy combat/netcode or award saved XP');
assert.match(client,/N\.pending=N\.pending\.filter\(e=>e\.seq>ack\)/,'ACK-based input reconciliation');
assert.match(client,/if\(N\.ws\?\.readyState===1&&now-N\.lastInput>=50/,'bounded client input rate');
assert.match(client,/Math\.hypot\(N\.me\.x-N\.me\.tx,N\.me\.y-N\.me\.ty\)/,'max prediction drift guard');
assert.match(html,/id="ns140ModeMultiplayer"/,'separate multiplayer button available on mode chooser');
assert.match(html,/SINGLEPLAYER — NOVA ZONA \(OFFLINE\)/,'new mode has visible solo button');
assert.match(html,/NS140_ARENA\?\.startSolo\?\.\(\)/,'solo starts from the mode selector');
assert.match(client,/function startSolo\(\)/,'client provides independent solo entry');
const soloSource=client.slice(client.indexOf('function startSolo()'),client.indexOf('function stepSolo('));
assert.ok(!/fetch\(|new WebSocket|\.send\(/.test(soloSource),'solo must not connect to Cloudflare or send remote commands');
assert.match(client,/function stepSolo\(dt,attackHeld\)/,'offline movement and combat have a local simulation');
assert.match(client,/if\(wasSolo\).*showPreRun/,'back to solo choose-mode, not multiplayer lobby');
console.log('V140 frontend + solo QA PASS: account-level 7 gate, isolated lobby handoff, no old gameplay, syntax and input bounds');
