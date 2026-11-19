'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/v140-net-mode.js'),'utf8');
const scene=fs.readFileSync(path.join(__dirname,'../public/v157-arena-scenery.js'),'utf8');
const sound=fs.readFileSync(path.join(__dirname,'../public/v152-arena-audio.js'),'utf8');
new Function(source);new Function(scene);new Function(sound);
for(const required of ['w:4200,h:4200','function spawnSoloXpCrystal','function stepSoloXpCrystals',
 'stepSoloXpCrystals();','function drawArenaXpCrystals','drawArenaXpCrystals(g,now,visible)',
 'ns168XpHud','ns168XpFill','XP_CAP=160','const attract=120+(p.perks?.magnet?60:0)','xpNeeded','serverBuild','LAB_SERVER_BUILD>=168'])
 assert(source.includes(required),'missing expanded world/XP UI '+required);
for(const required of ["kind==='xp'","kind==='level'","xp:165","level:700"])
 assert(sound.includes(required),'missing mobile-rate-limited sound '+required);
assert(scene.includes('world.w>=4000?124:53'));
assert(source.includes('for(let row=0;row<24;row++)for(let col=0;col<24;col++)'));
assert(source.includes('Math.abs(a.dist-740)'));
console.log('V168 STATIC PASS: 4200² map, Classic blue EXP + leveling, solo/server parity, audio cooldowns');

// New magnet perk preserves classic 120px limit without the perk and 180px with it.
const start=source.indexOf('function stepSoloXpCrystals(){'),end=source.indexOf('\nfunction stepSolo(dt)',start);
assert(start>0&&end>start);
const extract=source.slice(start,end);
function pull(perk){const N={me:{x:1000,y:1000,perks:{magnet:perk},queuedUpgrades:0},soloDrops:[{x:850,y:1000,expires:900,value:7}],soloTick:1};new Function('N','addSoloRunXp','A',extract+'\nstepSoloXpCrystals()')(N,()=>{},()=>null);return N.soloDrops[0].x;}
assert.equal(pull(0),850,'no magnet outside 120px');
assert(pull(1)>850,'magnet pulls at 150px');
console.log('V193 MAGNET: 120px normal / 180px perk');

;(()=>{
 const a=source.indexOf('function arenaCombatBefore('),b=source.indexOf('function drawArenaCombatFx(',a);
 assert(a>=0&&b>a);
 const N={me:{x:0,y:0}},sounds=[];
 const f=new Function('N','A',source.slice(a,b)+';return {arenaCombatBefore,arenaCombatEvents,clearArenaCombatFx,showArenaCombatEvents}') (N,()=>({play:(...v)=>sounds.push(v)}));
 f.clearArenaCombatFx();const m={x:4,y:5,hp:22,kind:'goblin'};
 const before=f.arenaCombatBefore([m],new Map());m.hp=0;
 const events=f.arenaCombatEvents([],before,1);
 assert.deepEqual(events,[[1024,4,5,22,1]]);
 for(let i=0;i<20;i++)f.showArenaCombatEvents(events,100);
 assert.equal(N.combatFx.length,1);assert.equal(sounds.length,2);
 assert.equal(f.arenaCombatEvents(events,[],11).length,0);
 assert(source.includes('drawArenaCombatFx(g,now,visible)'));
 console.log('V223 combat visual event: lethal damage, dedupe, expiry PASS');
})();
