'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('public/index.html','utf8');
let n=0;const yes=(a,m)=>{assert.ok(a,m);n++};const eq=(a,b,m)=>{assert.equal(a,b,m);n++};
const scriptTags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!m[1].includes('src='));
eq(scriptTags.length,4,'four original inline scripts');
for(const part of scriptTags){new vm.Script(part[2]);n++}
yes(html.includes("\x3ctitle>Night Watch v102 — Rotfiend Waves 20 and 30 (Night Watch v99 gameplay)</title>"),'v94 title');
yes(html.includes("if(assigned&&data.t==='ns93Cast')"),'host receives validated spells');
yes(html.includes("if(data.t==='ns93CastAck')"),'guest gets authoritative ack');
yes(html.includes("NS93_MAGIC.soundAt(e.value?.id,e.x,e.y)"),'guest audio from synchronized FX');
yes(html.includes("p.ns93ManaRegen||2.5,p.ns93Cooldown||{}"),'host sends mana state and cooldowns');
yes(html.includes("NS93_MAGIC.tick(dt)"),'mana host regen');
yes(html.includes("const life=type==='ns93Magic'?.78"),'bounded FX lifetime');
yes(html.includes("ns93Mana:Number(p[43])||0"),'guest reconstructs mana');
yes(html.includes("data.v!==102"),'protocol version');
yes(html.includes("NS93_MAGIC.initPlayer(p,p.ns93Spells||mpProgress.spells)"),'all classes gain mana');
const begin=html.indexOf('const NS93_MAGIC=(()=>{'),end=html.indexOf('window.__NS93_MAGIC=NS93_MAGIC;',begin);
yes(begin>0&&end>begin,'magic module embedded in game scope');
const source=html.slice(begin,end+'window.__NS93_MAGIC=NS93_MAGIC;'.length);
const events=[];
const G={mode:'play',paused:false,time:10,players:[],mobs:[],effects:[],fxSeq:0};
const NET={role:'host',phase:'playing',round:5,clients:new Map()};
const mpProgress={coins:60,spells:{}};
const sound={sfx:false,sfxVolume:.5};
const ctx=vm.createContext({
 G,NET,mpProgress,NS94_ECON:{pay(cost){if(!Number.isSafeInteger(cost)||cost<1||mpProgress.coins<cost)return false;mpProgress.coins-=cost;return true;}},window:{__gameLanguage:{value:'en'},addEventListener(){}},
 WORLD:{w:4200,h:4200},cfgSettings:sound,
 '$':()=>null,
 effect:(type,x,y,value)=>{events.push({type,x,y,value});G.effects.push({id:++G.fxSeq,type,x,y,value})},
 lightAt:()=>true,
 killMob:m=>{m.dead=true;G.kills=(G.kills||0)+1},
 toast:()=>{},
 saveMP:()=>{},
 Math,Number,JSON,Date
});
vm.runInContext(source,ctx);
const api=ctx.window.__NS93_MAGIC;
eq(api.spells.length,8,'8 original spells');
eq(new Set(api.spells.map(x=>x.id)).size,8,'no duplicate ids');
for(const s of api.spells){yes(s.cost>=12&&s.cd>=3,'each spell pays mana and cooldown');yes(s.cap<=9&&s.radius<=160,'bounded AoE cost')}
const p={id:'p1',x:2100,y:2100,hp:110,maxHp:110,nsCombatClass:'mage'};
G.players.push(p);
api.initPlayer(p,{lightning:1,comet:1,frost:1,heal:1});
eq(p.ns93MaxMana,102,'mage has higher mana');
eq(p.ns93Mana,102,'spawn with full mana');
const first=api.cast(p,'lightning',2190,2098);
yes(first.ok,'unlocked lightning casts');eq(first.hits,0,'no ghost hits');eq(events.length,1,'one FX event per cast');
eq(p.ns93Mana,76,'mana deducted once');
yes(!api.cast(p,'lightning',2190,2098).ok,'repeat cast rejected');
yes(!api.cast(p,'unknown',2190,2098).ok,'unknown spell rejected');
G.time+=.2;
yes(!api.cast(p,'lightning',2190,2098).ok,'cooldown prevents spam');
yes(!api.cast(p,'comet',3500,2100).ok,'range verified server-side');
eq(p.ns93Mana,76,'rejected spells cost no mana');
G.time+=7;
G.mobs=[
 {id:1,type:'goblin',x:2170,y:2120,r:13,hp:100,maxHp:100,speed:90,dead:false},
 {id:2,type:'boss',x:2192,y:2096,r:35,hp:320,maxHp:320,speed:55,dead:false}
];
const hit=api.cast(p,'lightning',2175,2110);
yes(hit.ok&&hit.hits===2,'host damages radius and boss');
yes(G.mobs[0].hp<G.mobs[0].maxHp,'normal enemy damaged');
yes(G.mobs[1].hp<G.mobs[1].maxHp,'boss damaged');
yes(G.mobs[1].hp>G.mobs[0].hp,'boss resists magic');
G.time+=8;
p.ns93Mana=25;
let before=p.ns93Mana;
const denied=api.cast(p,'comet',2120,2100);yes(!denied.ok,'insufficient mana blocks expensive comet');
eq(p.ns93Mana,before,'no mana spent on rejected comet');
api.tick(3);yes(p.ns93Mana>before,'mana regenerates when host advances');
const fighter={id:'p2',x:2100,y:2100,hp:120,maxHp:120,nsCombatClass:'warrior'};api.initPlayer(fighter,{});
eq(fighter.ns93MaxMana,64,'other class keeps health and less mana');
eq(fighter.maxHp,120,'magic does not alter warrior HP');
G.players.push(fighter);
let reply=null;NET.clients.set('p2',{open:true,send:d=>reply=d});
api.guestRequest('p2',{t:'ns93Cast',id:'comet',x:2140,y:2140,round:5});
eq(reply.ok,false,'forged guest-unlocked ability rejected by host');
eq(reply.round,5,'ack scoped to current round');
G.mode='menu';NET.phase='idle';yes(api.purchase('comet'),'unlock paid by existing honor coins');
eq(mpProgress.coins,43,'unlock deducts cost once');
yes(!api.purchase('comet'),'cannot buy twice');
NET.phase='playing';G.mode='play';
const owner={id:'p3',x:2100,y:2100,hp:88,maxHp:88,nsCombatClass:'warrior'};
api.initPlayer(owner,{comet:1});
eq(owner.ns93MaxMana,64,'non-mage still has capped mana');
G.players.push(owner);
G.time+=30;const req=api.cast(owner,'comet',2220,2110);
yes(req.ok,'non-mage purchased comet usable');
eq(owner.ns93Mana,16,'comet has substantial mana cost');
yes(!api.cast(owner,'comet',2220,2110).ok,'comet cannot spam');
G.time+=1;
const healing={id:'healer',x:2100,y:2100,hp:50,maxHp:90,nsCombatClass:'mage'};
api.initPlayer(healing,{heal:1});G.players.push(healing);
const a=api.cast(healing,'heal',2100,2100);
yes(a.ok,'healing circle casts');yes(healing.hp>50,'healing restores allies');
console.log('PASS '+n+' v94 gameplay and security checks: syntax, 8 spells, mana, bounds, boss resistance, host authority, unlock economy, all classes, co-op healing.');
