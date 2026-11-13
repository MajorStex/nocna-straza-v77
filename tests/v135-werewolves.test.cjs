'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
assert.match(html,/<title>Night Watch v135 — Noćna Straža<\/title>/);
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
 if(!/\bsrc=/.test(m[1]))new vm.Script(m[2]);
}
const cut=(a,b)=>{const start=html.indexOf(a),end=html.indexOf(b,start);
 assert.ok(start>=0&&end>start,'slice '+a);return html.slice(start,end)};
const wolfSource=cut('function ns135SpawnWolfPack(){','function spawnBoss(forceLevel){');
const bossSource=cut('function bossStartCast(m,p){','function updateBossPhases(){');
const make=env=>{const box=vm.createContext(env);vm.runInContext(wolfSource+bossSource,box);
 return {spawn:box.ns135SpawnWolfPack,summon:box.ns135SummonPups,claw:box.ns135ClawCanHit,
  cast:box.bossStartCast,resolve:box.bossResolveCast};};
const config={werewolf:{size:1.08},werewolfAlpha:{size:1.94}};
function setup(wave=40,role=''){
 const target={id:'p1',x:2100,y:2100,r:17,hp:250,maxHp:250,dead:false,ns135SlowUntil:0};
 const g={mode:'play',caveMode:false,wave,time:1,players:[target],
  mobs:[],nextId:1,ns135WolfSpawned:false};
 const audio=[],effects=[],msgs=[];
 const env={Math,G:g,NET:{role},WORLD:{w:4200,h:4200},configs:config,
  TAU:Math.PI*2,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  rnd:()=>.5,nextSpawnTarget:()=>target,canStepClear:()=>true,
  ns126LockedGateSpawn:()=>false,obstacleInPath:()=>false,
  addMob:(type,x,y)=>{const m={id:g.nextId++,type,x,y,r:type==='werewolfAlpha'?66:18,
   dead:false,maxHp:type==='werewolfAlpha'?1120:250,hp:type==='werewolfAlpha'?1120:250,
   angle:0,bossPhase:1,bossCast:null,bossCastCount:0};g.mobs.push(m);return m},
  bossPhaseOf:()=>1,
  sfx:name=>audio.push(name),effect:(...args)=>effects.push(args),
  announce:msg=>msgs.push(msg)};
 return {g,target,audio,effects,msgs,env,fn:make(env)};
}
for(const wave of [1,10,20,30,39,41,50,60,90]){
 const t=setup(wave);assert.equal(t.fn.spawn(),false,'no special wolf boss at wave '+wave);
 assert.equal(t.g.mobs.length,0);
}
{
 const t=setup(40,'guest');assert.equal(t.fn.spawn(),false,'guest must never spawn world enemies');
}
{
 const t=setup();assert.equal(t.fn.spawn(),true,'wave-40 alpha starts');
 assert.equal(t.g.ns135WolfSpawned,true,'one-time pack flag');
 assert.equal(t.g.mobs.filter(m=>m.type==='werewolfAlpha').length,1);
 assert.ok(t.g.mobs.filter(m=>m.type==='werewolf').length>=2,'smaller wolf pack accompanies boss');
 const previous=t.g.mobs.length;assert.equal(t.fn.spawn(),false);
 assert.equal(t.g.mobs.length,previous,'no duplicates after reconnect / repeated game ticks');
 const alpha=t.g.mobs.find(m=>m.type==='werewolfAlpha');
 t.g.time=4;t.fn.cast(alpha,t.target);
 assert.equal(alpha.bossCast.kind,'howlSlow','wolf howl warns before the effect');
 assert.ok(alpha.bossCast.end-alpha.bossCast.start>=1.1,'dodge opportunity');
 assert.equal(alpha.bossCast.x,t.target.x,'circle locks target position, does not track the hero');
 assert.ok(alpha.bossCast.radius>=120);
 t.target.x+=240;t.g.time=alpha.bossCast.end;
 const hp=t.target.hp;t.fn.resolve(alpha);
 assert.equal(t.target.ns135SlowUntil,0,'dodging out prevents slow entirely');
 assert.equal(t.target.hp,hp,'howl never causes damage');
 assert.equal(alpha.bossCast,null,'cast ends cleanly');
 t.g.time+=8;t.target.x-=240;t.fn.cast(alpha,t.target);
 t.g.time=alpha.bossCast.end;t.fn.resolve(alpha);
 assert.ok(t.target.ns135SlowUntil>t.g.time+2.3,'only players inside are slowed');
 assert.equal(t.target.hp,hp,'howl still deals zero HP damage');
 assert.ok(t.effects.some(([type])=>type==='wolfPulse'),'distinct teal pulse FX');
 assert.equal(t.fn.claw({x:0,y:0,r:20,angle:0,type:'werewolf'},
  {x:34,y:0,r:17}),true,'claws work in front of the wolf');
 assert.equal(t.fn.claw({x:0,y:0,r:20,angle:0,type:'werewolf'},
  {x:-34,y:0,r:17}),false,'claws cannot hit behind');
 assert.equal(t.fn.claw({x:0,y:0,r:20,angle:0,type:'werewolf'},
  {x:180,y:0,r:17}),false,'claws are short-range');
}
const required=[
 /const BOSS_TYPES=new Set\(\['boss','rotfiend','werewolfAlpha'\]\)/,
 /function drawWerewolf\(e\)/,/drawWerewolf\(e\);return;/,
 /if\(c\.kind==='howlSlow'\)/,
 /ns135SlowUntil:Number\(p\[47\]\)\|\|0/,
 /p\.ns135SlowUntil\|\|0/,
 /ns135HowlUntil:Number\(m\[22\]\)\|\|0/,
 /m\.ns135HowlUntil\|\|0,m\.ns135RageUntil\|\|0/,
 /ns135WolfSpawned','ns75BrokenIds/,
 /m\.type==='werewolfAlpha'\|\|m\.nsCaveSpider/,
 /wolfHowl:\[\.86,70,420,\.40,'howl'\]/,
 /type==='wolfPulse'\?\.68/,
 /G\.time<\(p\.ns135SlowUntil\|\|0\)\?\.56:1/,
 /G\.time<\(own\.ns135SlowUntil\|\|0\)\?\.56:1/
];
for(const re of required)assert.match(html,re,'V135 critical runtime and multiplayer integration');
const spawnArea=cut('function ns135SpawnWolfPack(){','function spawnBoss(forceLevel){');
assert.ok(spawnArea.length<5600,'wolf spawn remains bounded / lightweight');
console.log('V135 WEREWOLF QA PASS: wave 40 one-time spawn; pack; no ghost on other waves; server-only AoE slow; safe dodge; claw arc; multiplayer state; animations');
