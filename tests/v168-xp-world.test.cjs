'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/v140-net-mode.js'),'utf8');
const scene=fs.readFileSync(path.join(__dirname,'../public/v157-arena-scenery.js'),'utf8');
const sound=fs.readFileSync(path.join(__dirname,'../public/v152-arena-audio.js'),'utf8');
new Function(source);new Function(scene);new Function(sound);
for(const required of ['w:4200,h:4200','function spawnSoloXpCrystal','function stepSoloXpCrystals',
 'stepSoloXpCrystals();','function drawArenaXpCrystals','drawArenaXpCrystals(g,now,visible)',
 'ns168XpHud','ns168XpFill','XP_CAP=160','dist<120','xpNeeded','serverBuild','LAB_SERVER_BUILD>=168'])
 assert(source.includes(required),'missing expanded world/XP UI '+required);
for(const required of ["kind==='xp'","kind==='level'","xp:165","level:700"])
 assert(sound.includes(required),'missing mobile-rate-limited sound '+required);
assert(scene.includes('world.w>=4000?124:53'));
assert(source.includes('for(let row=0;row<24;row++)for(let col=0;col<24;col++)'));
assert(source.includes('Math.abs(a.dist-740)'));
console.log('V168 STATIC PASS: 4200² map, Classic blue EXP + leveling, solo/server parity, audio cooldowns');
