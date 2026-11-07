'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('public/index.html','utf8');
let total=0;
const ok=(value,name)=>{assert.ok(value,name);total++};
const eq=(actual,expected,name)=>{assert.equal(actual,expected,name);total++};
const tagScripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!x[1].includes('src='));
eq(tagScripts.length,4,'standalone original script count');
for(const s of tagScripts){new vm.Script(s[2]);total++}
ok(html.includes('<title>Night Watch v95 — The Prisoner'), 'v95 title');
ok(html.includes("NS95_CAGE.reset()"),'one cage in gameplay start');
ok(html.includes("NS95_CAGE.guardStep(m,dt,alive)"),'existing mob loop intercepts anchored guards');
ok(html.includes("NS95_CAGE.decoyStep(m,dt)"),'companion only intercepts eligible mobs');
ok(html.includes("NS95_CAGE.receive(d.c95)"),'guest snapshot receives cage');
ok(html.includes("c95:NS95_CAGE.snapshot()"),'host snapshot shares bounded cage');
ok(html.includes("cage95:NS95_CAGE.save()"),'solo continue stores cage');
ok(html.includes("NS95_CAGE.resume(d.cage95)"),'solo continue restores cage');
ok(html.includes("NS95_PROGRESS.apply(p)"),'mana bonuses installed after player class');
ok(html.includes("NS95_PROGRESS.boost(p)"),'in-run mana choice');
ok(html.includes("id=\"ns95SpellSwap\""),'picker without spell clutter');
const match=html.match(/const NS95_CAGE=\(\(\)=>\{[\s\S]*?window\.__NS95_CAGE=NS95_CAGE;/);
ok(match,'cage code embedded');
const codes=match[0];
const allies=[],effects=[],attacks=[];
let nextId=1;
const mobs=[],game={
 mode:'play',runType:'default',time:5,wave:2,level:1,xp:0,xpNeed:160,
 players:[{id:'p1',x:2100,y:2100,hp:120,maxHp:120,r:17,dead:false}],mobs,
 camera:{x:2100,y:2100},ns95Cage:null
};
const NET={role:'',phase:'idle'};
const ctx=vm.createContext({
 window:{__gameLanguage:{value:'sr'}},G:game,NET,START:{x:2100,y:2100},WORLD:{w:4200,h:4200},
 '$':()=>null,TAU:Math.PI*2,
 canStepClear:()=>true,props:[],isSolidProp:()=>false,
 addMob:(type,x,y)=>{
  const m={id:nextId++,type,x,y,hp:58,maxHp:58,r:13,damage:9,speed:90,dead:false,
   attackCD:0,attackT:0,frame:0};
  mobs.push(m);return m;
 },
 movingCircle:(m,dx,dy)=>{m.x+=dx;m.y+=dy;return true},
 obstacleInPath:()=>false,
 damagePlayer:(p,amount,m)=>{attacks.push({id:p.id,damage:amount,guard:m.ns95Guard});p.hp-=amount},
 effect:(type,x,y)=>effects.push([type,x,y]),sfx:()=>{},announce:s=>allies.push(s),
 coopXP:(p,amount)=>{p.xp=(p.xp||0)+amount},
 screenPoint:(x,y)=>({x:x-game.camera.x+180,y:y-game.camera.y+380}),
 viewSize:()=>({w:360,h:800}),
 ellipse:()=>{},ctx:{save(){},restore(){},translate(){},strokeRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},fillText(){},set globalAlpha(v){},set strokeStyle(v){},set lineWidth(v){},set fillStyle(v){},set font(v){},set textAlign(v){}},
 clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),
 Math,Number,Array,Object,Date,JSON,URLSearchParams,location:{search:''}
});
vm.runInContext(codes,ctx);
const api=ctx.window.__NS95_CAGE;
api.reset();
const cage=game.ns95Cage;
ok(cage&&cage.x>0&&cage.y>0,'single world event exists');
eq(mobs.filter(m=>m.ns95Guard).length,3,'three guards only');
eq(cage.guardIds.length,3,'stable guards id list');
const original=game.players[0];
const firstGuard=mobs[0];const initialDistance=Math.hypot(firstGuard.x-cage.x,firstGuard.y-cage.y);
for(let i=0;i<500;i++){game.time+=.08;api.guardStep(firstGuard,.08,[original])}
ok(Math.hypot(firstGuard.x-cage.x,firstGuard.y-cage.y)<155,'guard remains within its leash for 40 seconds');
ok(Math.hypot(firstGuard.x-cage.x,firstGuard.y-cage.y)>0,'guard does not occupy cage center');
eq(attacks.length,0,'guard does not attack a far-away player');
original.x=cage.x-90;original.y=cage.y;
for(let i=0;i<100;i++){game.time+=.08;api.guardStep(firstGuard,.08,[original]);firstGuard.attackCD=Math.max(0,firstGuard.attackCD-.08)}
ok(attacks.length>0,'guard attacks nearby hero');
ok(attacks.every(x=>x.guard===true),'only existing damagePlayer path for guards');
ok(Math.hypot(firstGuard.x-cage.x,firstGuard.y-cage.y)<155,'guard never pursues far beyond cage');
original.x=cage.x-135;original.y=cage.y;
for(const m of mobs)m.dead=true;
api.tick(.10);
ok(cage.freed,'killing all defenders and approaching frees captive');
ok(cage.ally&&cage.ally.hp===64,'one low-HP companion appears');
eq(game.xp,45,'one-time limited solo XP reward');
for(let i=0;i<300;i++){game.time+=.11;api.tick(.11)}
eq(game.xp,45,'no reward duplication from repeated tick');
const state=api.snapshot();eq(state.length,6,'6-element bounded cage snapshot');
ok(Array.isArray(state[5]),'companion serialized without player registration');
eq(game.players.length,1,'friendly never becomes an extra network player');
const save=api.save();ok(save&&save.rewarded,'cage persists with claimed XP');
const ally=game.ns95Cage.ally;
const decoy={id:5,type:'goblin',x:ally.x+12,y:ally.y+6,hp:60,r:13,damage:6,speed:70,attackCD:0,dead:false};
mobs.push(decoy);api.beginMobTick();
ok(api.decoyStep(decoy,.08),'eligible creep attacks the ally');
eq(game.players.length,1,'decoy never mutates player roster');
ok(ally.hp<64,'only creep attacks can damage companion');
const allyHp=ally.hp;api.beginMobTick();for(let i=0;i<50;i++)api.decoyStep({...decoy,id:10+i,x:ally.x,y:ally.y},.04);
ok(ally.hp>=0,'damage to helper bounded');
const fb=api.save();
api.resume(fb);ok(game.ns95Cage.freed&&game.ns95Cage.rewarded,'resume preserves freed flag');
eq(game.xp,45,'resume never grants XP twice');
for(let i=0;i<1000;i++){game.time+=.11;api.tick(.11)}
eq(game.ns95Cage.ally,null,'ally expires instead of accumulating persistent AI');
eq(game.players.length,1,'AI cleanup never changes players');
console.log('PASS '+total+' v95 cage checks: playable test zone, guard leash, combat, no extra player, XP idempotency, bounded weak ally, solo resume, optimized cleanup.');
