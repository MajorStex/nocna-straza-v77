'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');const src=fs.readFileSync('public/v140-net-mode.js','utf8'),classic=fs.readFileSync('public/index.html','utf8');const a=src.indexOf('// BEGIN V189 SPELL MECHANICS'),b=src.indexOf('// END V189 SPELL MECHANICS');assert(a>0&&b>a);const M=new Function(src.slice(a,b)+'\nreturn {ARENA_SPELLS,arenaSpellInit,arenaSpellTick,arenaSpellState,arenaSpellCast,arenaSpellExpire,arenaSpellEvents};')();const i=classic.indexOf('const spells=[',classic.indexOf('const NS93_MAGIC=')),j=classic.indexOf('\n ];',i);const original=new Function(classic.slice(i,j+3)+';return spells')();assert.deepEqual(M.ARENA_SPELLS,original,'same eight classic spell definitions');
const world={w:4200,h:4200},players=new Map();for(let i=1;i<=6;i++){const id='p'+i;players.set(id,{id,online:true,hp:100,maxHp:100,x:1000+i*12,y:1000})}const p=players.get('p1');let mobs=Array.from({length:15},(_,i)=>({id:i,hp:120,x:1100+i,y:1000})),kills=0;const cast=(slot,tick,x=1100,y=1000,actor=p)=>M.arenaSpellCast({p:actor,players,mobs,world,tick,cls:'mage',slot,x,y,kill:()=>kills++});assert.equal(M.ARENA_SPELLS.length,8);M.arenaSpellInit(p,'mage');assert.equal(p.spellMana,102);assert(cast(1,30));assert.equal(p.spellMana,76);assert.equal(mobs.filter(m=>m.hp<120).length,5);assert.equal(cast(1,31),false);assert.equal(cast(0,40,4000,4000),false);assert.equal(p.spellMana,76);mobs=[{id:80,hp:300,kind:'troll',x:1100,y:1000}];assert(cast(3,230));assert.equal(mobs[0].spellSlowFactor,.69);M.arenaSpellExpire(mobs,302);assert.equal(mobs[0].spellSlowFactor,0);assert(mobs[0].hp>275);p.hp=40;players.get('p2').hp=30;players.get('p3').knocked=1;players.get('p3').hp=0;p.spellMana=102;assert(cast(6,500,1000,1000));assert.equal(p.hp,68);assert.equal(players.get('p2').hp,58);assert.equal(players.get('p3').hp,0);for(let i=0;i<30;i++)M.arenaSpellTick(p,'mage');assert(Math.abs(p.spellMana-70.3)<.001);mobs=[{id:81,hp:1,x:1100,y:1000}];p.spellMana=102;assert(cast(0,700));assert.equal(kills,1);assert.equal(cast(0,701),false);const events=[];for(const a of players.values()){a.spellMana=102;a.spellCd=Array(8).fill(0);a.hp=100;a.knocked=0;events.push(cast(2,900,1100,1000,a))}assert.equal(new Set(events.map(e=>e[0])).size,6);assert.equal(M.arenaSpellEvents(events,925).length,0);console.log('V189 MAGIC LOGIC PASS',JSON.stringify({spells:8,players:6,uniqueEffects:true,cap:true,cooldown:true,mana:true,range:true,frost:true,bossResistance:true,heal:true,xpKillOnce:true}));

;(()=>{
 const start=src.indexOf('// BEGIN V193 PASSIVES AND EVOLUTIONS'),end=src.indexOf('// END V193 PASSIVES AND EVOLUTIONS',start);
 const cs=src.indexOf('function arenaAcidClear('),ce=src.indexOf('\nfunction stepArenaWorms',cs);
 assert(start>=0&&end>start&&cs>=0&&ce>cs);
 const E=new Function(src.slice(cs,ce)+'\n'+src.slice(start,end)+'\nreturn {arenaCombatExtras,arenaEvolutionStrike,arenaEvolutionUnlock,arenaExtraDamage,arenaThorns}')();
 const world={w:4200,h:4200,obstacles:[]},discard=()=>{},kills=[];
 const kill=m=>kills.push(m.id);
 let p={id:'p1',x:1000,y:1000,hp:100,level:4,damage:100,activeWeapon:'sword',perks:{aura:1}};
 let mobs=Array.from({length:10},(_,i)=>({id:i,x:1050,y:1000+i,hp:100})),target=mobs[0];
 assert(!E.arenaEvolutionStrike(p,target,mobs,10,kill,discard),'minimum level');
 p.level=5;assert(!E.arenaEvolutionStrike(p,target,mobs,11,kill,discard),'unlock delay');
 assert(E.arenaEvolutionStrike(p,target,mobs,23,kill,discard)&&mobs.filter(m=>m.hp===44).length===8,'moon cap');
 assert(!E.arenaEvolutionStrike(p,target,mobs,24,kill,discard),'cooldown');
 assert(E.arenaEvolutionStrike(p,target,mobs,143,kill,discard)&&kills.length===8,'next attack');
 for(const [weapon,perk,cap] of [['spear','shock',4],['axe','bombs',6],['dagger','shuriken',5]]){
  const q={id:'p3',x:1000,y:1000,hp:100,level:5,damage:100,activeWeapon:weapon,perks:{[perk]:1}};
  const ms=Array.from({length:10},(_,i)=>({id:30+i,x:1050+i,y:1000,hp:100}));
  E.arenaEvolutionUnlock(q,1,discard);assert(E.arenaEvolutionStrike(q,ms[0],ms,13,kill,discard)&&ms.filter(m=>m.hp<100).length===cap,weapon);
 }
 p={id:'p2',x:1000,y:1000,hp:100,level:1,activeWeapon:'axe',perks:{aura:1,bombs:1,shock:1,shuriken:1,frost:1,thorns:1}};
 mobs=Array.from({length:6},(_,i)=>({id:20+i,x:1080,y:1000+i,hp:200}));
 const fx=[],emit=v=>fx.push(v);const step=t=>E.arenaCombatExtras(p,mobs,world,t,kill,emit);
 step(0);assert(mobs.every(m=>m.hp===200)&&fx.length===0,'initial cooldown');
 step(48);assert.equal(mobs.filter(m=>m.hp===196).length,4,'aura cap');
 step(90);assert(p.arenaShuriken);step(91);assert(p.arenaShuriken?.x>1020);
 for(let t=92;t<=99;t++)step(t);
 assert(!p.arenaShuriken&&mobs.some(m=>m.hp<=180),'shuriken hit');
 step(150);assert.equal(p.arenaBomb?.at,174);step(174);assert(!p.arenaBomb,'bomb resolved');
 step(270);assert.equal(p.arenaExtraAt.shock,540);step(360);
 assert(mobs.some(m=>m.spellSlowUntil===411&&m.spellSlowFactor===.69),'frost');
 const hp=mobs[0].hp;E.arenaThorns(p,mobs[0],361,kill,emit);assert.equal(mobs[0].hp,Math.max(0,hp-7));
 assert.equal(new Set(fx.map(e=>e[0])).size,fx.length,'duplicate FX');
 const dead={id:99,x:1050,y:1000,hp:3};E.arenaExtraDamage(dead,p,400,4,kill);E.arenaExtraDamage(dead,p,401,4,kill);assert.equal(kills.filter(id=>id===99).length,1,'single kill attribution');
 console.log('V193 PASSIVES + 4 WEAPON EVOLUTIONS: all deterministic combat assertions passed');
})();

;(()=>{
 const start=src.indexOf('// BEGIN V194 BREAKABLES'),end=src.indexOf('// END V194 BREAKABLES',start);
 const cs=src.indexOf('function arenaAcidClear('),ce=src.indexOf('\nfunction stepArenaWorms',cs);
 assert(start>=0&&end>start&&cs>=0&&ce>cs);
 const A=new Function(src.slice(cs,ce)+'\n'+src.slice(start,end)+'\nreturn {arenaBreakInit,arenaBreakPacket,arenaBreakRestore,arenaBreakHit,arenaFieldKits}')();
 const o={kind:'barrel',x:90,y:90,w:20,h:20},solid={kind:'tree',x:222,y:222,w:30,h:30};
 const base={w:4200,h:4200,obstacles:[o,solid],classicProps:[{type:'barrel',x:100,y:100,r:18,seed:0},{type:'tree',x:237,y:237,r:20,seed:3}]};
 const w={...base},b=A.arenaBreakInit(base),p={id:'p1',x:55,y:100,hp:40,maxHp:100,online:true};
 assert.equal(b.items[0].hp,72);assert.equal(A.arenaBreakHit(b,w,p,1,1,22,83).hp,50);assert.equal(w.obstacles.length,2);
 for(let t=2;t<=4;t++)A.arenaBreakHit(b,w,p,t,1,22,83);
 assert.equal(b.items[0].hp,0);assert.equal(w.obstacles.length,1);assert.equal(w.classicProps.length,1);assert(b.removed.has(o));
 assert.equal(base.obstacles.length,2);assert.equal(base.classicProps.length,2);assert.equal(A.arenaBreakHit(b,w,p,5,1,22,83),null);
 const w2={...base},b2=A.arenaBreakInit(base);assert(A.arenaBreakRestore(b2,w2,A.arenaBreakPacket(b)));assert.equal(b2.items[0].hp,0);assert.equal(w2.obstacles.length,1);
 const wall={kind:'house',x:70,y:85,w:6,h:30},w3={...base,obstacles:[o,solid,wall]},b3=A.arenaBreakInit(w3);
 assert.equal(A.arenaBreakHit(b3,w3,p,1,1,100,83),null);p.x=10;assert.equal(A.arenaBreakHit(b3,w3,p,1,1,100,20),null);
 p.x=100;p.y=100;b.kits=[{id:0,x:100,y:100}];const p2={id:'p2',x:100,y:100,hp:40,maxHp:100,online:true},team=new Map([['p2',p2],['p1',p]]);
 let events=0;A.arenaFieldKits(b,team,100,()=>events++);assert.equal(p.hp,52);assert.equal(p2.hp,40);assert.equal(p.fieldRushUntil,340);assert.equal(b.kits.length,0);A.arenaFieldKits(b,team,101,()=>events++);assert.equal(events,1);
 console.log('V194 breakables, collision, room isolation, checkpoint and single-owner field kits PASS');
})();
