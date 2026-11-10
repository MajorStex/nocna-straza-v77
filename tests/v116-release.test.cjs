'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../',p),'utf8');
const game=read('public/index.html'),snapshot=read('public/v115/index.html');
const village=read('public/v115-village.js'),preview=read('public/village-test/index.html');
assert.match(game,/VERZIJA V122 · INVITE HOUSE/,'main site is current');
assert.match(game,/<title>Night Watch v122/,'new browser title');
assert.match(game,/src="\.\/v115-village\.js\?v=121"/,'correct live-root village asset');
assert.match(game,/src="\.\/firebase-config\.js\?v=92"/,'correct root Firebase asset');
assert.match(game,/src="\.\/auth-v82\.js\?v=92"/,'correct root auth asset');
assert.ok(!game.includes('nocna-straza-igra.pages.dev/v115/v114/'),'canonical stays on root');
assert.ok(game.includes('function ns114CornerGateBlocked('),'real collision fixes carried into release');
assert.ok(game.includes("if(e.type==='elephant'){drawArmoredGoblin(e);return;}"),'old elephant uses the goblin animation');
assert.ok(game.includes("elephant:{color:'#99546d',size:1.16"),'armored goblin is now goblin-sized');
assert.ok(game.includes('function caveSecretRewardTick(){'),'secret room physical reward shipped');
assert.ok(game.includes('function startCaveTest(){'),'direct safe cave test shipped');
assert.ok(game.includes('get(\'cave-test\')'),'Cave test query recognized');
assert.ok(game.includes('/* V116: calm, legible game canvas'),'compact mobile HUD present');
assert.ok(snapshot.includes('function generateCaveProps(seed=1){'),'V115 snapshot remains intact');
assert.ok(village.includes('get sheepCount(){return NPCS.length}'),'sheep available');
assert.ok(village.includes('function showVillage(){'),'village open bridge');
assert.ok(preview.includes('window.NS109_VILLAGE?.open()'),'isolated village opens without signup');
for(const match of game.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
 if(!/\bsrc=/.test(match[1]))new Function(match[2]);
}
new Function(village);
console.log('V117 PASS: current root, protected old snapshot, goblin, gate collision, phone HUD, secret cave, Village sheep and preview syntax');
