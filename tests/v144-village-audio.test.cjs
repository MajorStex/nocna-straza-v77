'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const code=fs.readFileSync(path.resolve(__dirname,'../public/v115-village.js'),'utf8');
const provenance=fs.readFileSync(path.resolve(__dirname,'../public/THIRD_PARTY_AUDIO.md'),'utf8');
assert.match(html,/<title>Night Watch v(14[4-9]|1[5-9][0-9]|[2-9][0-9]{2}) — Noćna Straža<\/title>/);
assert.match(html,/v115-village\.js\?v=(?:14[4-9]|1[5-9][0-9]|[2-9][0-9]{2})(?:[&"'])/);
assert.match(code,/id="ns144Fx"/);
assert.match(code,/function primeVillageAudio\(\)/);
assert.match(code,/function playAnimalCall\(kind,x,y,hit=false\)/);
assert.match(code,/function playWeaponSwing\(\)/);
assert.match(code,/function playVillageHit\(x,y,target\)/);
assert.match(code,/function tickVillageAnimals\(\)/);
assert.match(code,/animalTicker=setInterval\(tickVillageAnimals,3600\)/);
assert.match(code,/function soundDistance\(x,y,max=540\)/);
assert.match(code,/candidates=NPCS\.filter\(a=>animalAlive/);
assert.match(code,/document\.hidden/);
assert.match(code,/if\(trainingStrike\(now\)\)return true/);
assert.match(code,/primeVillageAudio\(\);playWeaponSwing\(\)/);
assert.match(code,/playVillageHit\(nearest\.x,nearest\.y,'training'\)/);
assert.match(code,/playVillageHit\(v\.x,v\.y,closest\.kind\);playAnimalCall/);
assert.match(code,/NET\.role==='guest'&&\(animal\.hp<oldHp/);
assert.match(code,/ns144_village_music_off/);
assert.match(code,/ns144_village_fx_off/);
assert.match(code,/if\(anima[lL]Ticker\)clearInterval\(animalTicker\)/);
assert.match(code,/CC0_VILLAGE_AUDIO\.music/);
assert.match(code,/animalSamples\.get\(kind\)/);
for(const weapon of ['sword','heavy','bow','magic'])assert.match(code,new RegExp("'"+weapon+"'"));
for(const asset of ['Sheep_bleat.ogg','618483_foleyhaven_piglet-squeal-01.flac','peaceful_ville_2023.mp3']){
 assert.ok(code.includes(asset),'real recorded asset present: '+asset);
 assert.ok(provenance.includes(asset),'license provenance present: '+asset);
}
assert.match(provenance,/CC0 1\.0/);
assert.match(provenance,/OpenGameArt|opengameart.org/);
const ui=code.slice(code.indexOf('function step(time)'));
assert.ok(!ui.slice(0,2500).includes('playAnimalCall('),'no animal audio playback on 60FPS path');
new Function(code);
for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
 if(!/\bsrc=/.test(script[1]))new Function(script[2]);
}
console.log('V144 VILLAGE AUDIO PASS: all three CC0 recordings/theme sources, distinct equipment SFX, spatial gating, FX toggle, single ambient timer, syntax.');
