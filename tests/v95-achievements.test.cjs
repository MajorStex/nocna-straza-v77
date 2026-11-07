'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('public/index.html','utf8');
let checked=0;
const ok=(condition,message)=>{assert.ok(condition,message);checked++;};
const eq=(a,b,message)=>{assert.equal(a,b,message);checked++;};
const source=(a)=>ok(html.includes(a),'Expected source text: '+a);
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!m[1].includes('src='));
eq(scripts.length,4,'HTML script blocks');
for(const m of scripts){new vm.Script(m[2]);checked++}
source('<title>Night Watch v95 — The Prisoner's Guard</title>');
source('const NS92_DIR=(()=>{');
source('const NS92_CHALLENGES=(()=>{');
source('NS92_CHALLENGES.receive(d.c92)');
source('NS92_CHALLENGES.onKill(m)');
source('NS92_CHALLENGES.onChest()');
source('state.c92=NS92_CHALLENGES.saveRun()');
source('data.v!==95');source('required:95');source("t:'hello',v:95");
source('function ns90DrawHp(m,focus)');source('function drawTroll(e,model)');
source('NS91.onKill(m)');source('NS91.onWave()');source('NS91.onChest()');source('NS91.onRevive()');
source('a91:NS91.getMask()');source('NS91.receiveMask(d.a91)');
source('NS91.resume(d)');source('NS91.resume(s.a91)');
source('achChests:G.chestsOpened||0,...NS91.save()');
source('state.a91=NS91.save()');
source("item=makeArmoryItem(template,'common')");
source("item.uid=uid;item.source='achievement'");
const itemsStart=html.indexOf('const itemTemplates=[');
const itemsEnd=html.indexOf('];',itemsStart)+2;
ok(itemsStart>0&&itemsEnd>itemsStart,'armory item templates');
const items=vm.runInNewContext(html.slice(itemsStart,itemsEnd)+'\nitemTemplates');
const start=html.indexOf('// v91: fixed twelve');
const end=html.indexOf('\nfunction killMob(m,killer=null){',start);
ok(start>0&&end>start,'isolated NS91 logic');
const logic=html.slice(start,end);
const defs=vm.runInNewContext(logic+'\nNS91_ACHIEVEMENTS.map(x=>({...x}))',{
  G:{mode:'menu'},NET:{role:'guest'},localStorage:{getItem(){return null}},getActiveAccount(){return{id:'test'}},
  NSX:{grantAchievementGear(){return{}}},toast(){},lang:(en,sr)=>sr,window:{}
});
eq(defs.length,12,'12 achievement definitions');
eq(new Set(defs.map(d=>d.id)).size,12,'unique achievement IDs');
for(const a of defs){ok(items.some(i=>i.id===a.item),'valid common reward item for '+a.id);checked++}
const byId=id=>defs.find(x=>x.id===id);
const killTargets=[100,200,350,500,750,1000];
eq(defs.filter(x=>x.kind==='kills').map(x=>x.goal).join(','),killTargets.join(','),'kill milestone ladder');
function newPlayer(role,account,storage=new Map()){
 const gear=new Map(),alerts=[];
 const G={mode:'play',runType:role==='guest'?'network':'default',debugRun:false,kills:0,wave:1,chestsOpened:0};
 const NET={role,phase:'playing'};
 const memory={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))};
 const NSX={grantAchievementGear:(id,template)=>{
  const key=account+'_'+id;
  if(gear.has(key))return gear.get(key);
  const item={uid:key,template,rarity:'common'};gear.set(key,item);return item;
 }};
 const window={};
 const ctx=vm.createContext({G,NET,localStorage:memory,NSX,window,
  getActiveAccount:()=>({id:account}),toast:s=>alerts.push(String(s)),lang:(en,sr)=>sr});
 vm.runInContext(logic,ctx);
 return {G,NET,api:window.__NS91,gear,alerts,storage};
}
// Solo: precise boundaries, no duplicate rewards on repeated events or reload.
const solo=newPlayer('','solo');
solo.G.kills=99;solo.api.onKill({type:'crawler'});eq(solo.api.getMask(),0,'99 not enough');
solo.G.kills=100;solo.api.onKill({type:'crawler'});eq(solo.api.getMask(),1,'100 reached');
eq(solo.gear.size,1,'one reward at 100');
solo.api.onKill({type:'crawler'});eq(solo.gear.size,1,'no double award for duplicate kill callback');
solo.G.kills=200;solo.api.onKill({type:'crawler'});eq(solo.api.getMask(),3,'200 reached');
eq(solo.gear.size,2,'two one-time common gear rewards');
for(const reward of solo.gear.values())eq(reward.rarity,'common','common, never rare');
const soloSaved=solo.api.save();solo.api.reset();solo.api.resume(soloSaved);
eq(solo.api.getMask(),3,'resume restores mask');
eq(solo.gear.size,2,'resume does not duplicate');
solo.G.debugRun=true;solo.G.kills=1000;solo.api.onKill({type:'troll'});
eq(solo.api.getMask(),3,'debug runs cannot earn rewards');
// All 12 host-achievements, six-peer authorization and resilience to repeats.
const host=newPlayer('host','p1');
host.G.kills=1000;host.api.onKill({type:'troll'}); // six kill goals + troll
for(let i=0;i<10;i++)host.api.onKill({type:'worm'});
host.G.wave=20;host.api.onWave();
host.G.chestsOpened=5;host.api.onChest();
host.api.onRevive();
eq(host.api.getMask(),(1<<12)-1,'all 12 achievements earned');
eq(host.gear.size,12,'host has 12 common items');
const team=[host];
for(let i=2;i<=6;i++)team.push(newPlayer('guest','p'+i));
const proof={round:1,a91:host.api.getMask()};
for(const guest of team.slice(1)){
 guest.api.onKill({type:'troll'});eq(guest.api.getMask(),0,'guest cannot award itself');
 guest.api.receiveMask(proof.a91);
 eq(guest.api.getMask(),4095,'guest receives host badge mask');
 eq(guest.gear.size,12,'each guest has 12 unique rewards');
 guest.api.receiveMask(proof.a91);guest.api.receiveMask(proof.a91);
 eq(guest.gear.size,12,'no duplicate after resend / reconnect');
 for(const item of guest.gear.values())eq(item.rarity,'common','only common gear online');
 guest.api.receiveMask(8192);eq(guest.gear.size,12,'reject forged out-of-range mask');
}
eq(team.length,6,'six player team: 1 host + 5 guests');
// Backup host migration preserves award mask and counters.
const b=host.api.save(),newHost=team[1];
newHost.NET.role='host';newHost.G.runType='default';
newHost.G.kills=1000;newHost.G.wave=20;newHost.G.chestsOpened=5;
newHost.api.resume(b);eq(newHost.api.getMask(),4095,'backup-host migration preserves earned badges');
newHost.api.onKill({type:'worm'});eq(newHost.gear.size,12,'migration cannot farm duplicate gear');
// Account isolation: same browser store, different profiles.
const sharedStore=new Map(),first=newPlayer('','profile_a',sharedStore),second=newPlayer('','profile_b',sharedStore);
first.G.kills=100;first.api.onKill({type:'goblin'});
second.G.kills=100;second.api.onKill({type:'goblin'});
eq(first.gear.size,1,'first local profile receives gear');
eq(second.gear.size,1,'second local profile independently receives gear');
ok([...sharedStore.keys()].some(k=>k.endsWith('profile_a')),'profile a uses separate key');
ok([...sharedStore.keys()].some(k=>k.endsWith('profile_b')),'profile b uses separate key');
console.log('PASS '+checked+' checks: SP kill thresholds, per-account common gear, all 12 achievements, 6 simulated MP players, snapshot-mask idempotency, host migration, resume and JavaScript syntax.');
