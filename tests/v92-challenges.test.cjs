'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('public/index.html','utf8');
let checks=0;function eq(a,b,msg){assert.equal(a,b,msg);checks++}function yes(v,msg){assert.ok(v,msg);checks++}
const start=html.indexOf('const NS92_CHALLENGES=(()=>{'),end=html.indexOf('window.__NS92_CHALLENGES=NS92_CHALLENGES;',start);
yes(start>0&&end>start,'find module');
const code=html.slice(start,end+'window.__NS92_CHALLENGES=NS92_CHALLENGES;'.length);
const storage=new Map();
function make(role,id){
 const G={mode:'play',runType:role==='guest'?'network':'default',debugRun:false,kills:0,wave:1,chestsOpened:0,players:[{id:'p1',hp:70,maxHp:100,keys:0}]};
 const NET={role,phase:'playing'};
 const rewards=new Map(),messages=[],meta={points:0,totalEarned:0};
 const nsx={grantWeeklyCommonGear:(week,template)=>{
  const uid=id+'_'+week;
  if(rewards.has(uid))return rewards.get(uid);
  const item={uid,template,rarity:'common'};rewards.set(uid,item);return item;
 }};
 const ctx=vm.createContext({G,NET,NSX:nsx,window:{__gameLanguage:{value:'sr'}},getActiveAccount:()=>({id}),
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
  meta,persistMeta(){},toast:t=>messages.push(t),Intl,Date,Math,Number,JSON});
 vm.runInContext(code,ctx);
 return {G,NET,meta,rewards,messages,api:ctx.window.__NS92_CHALLENGES};
}
function complete(player,d){
 if(d.kind==='kills')player.G.kills=d.goal;
 if(d.kind==='wave')player.G.wave=d.goal;
 if(d.kind==='chests')player.G.chestsOpened=d.goal;
 if(d.kind==='worms'){for(let k=0;k<d.goal;k++){player.G.kills++;player.api.onKill({type:'worm'})}}
 if(d.kind==='trolls'){for(let k=0;k<d.goal;k++){player.G.kills++;player.api.onKill({type:'troll'})}}
 player.api.evaluate();
}
const host=make('host','host');host.api.reset();
const challengeList=host.api.list();eq(challengeList.length,2,'one daily and one weekly challenge');
yes(challengeList[0].ends.length===8,'daily date key');
yes(challengeList[1].ends.length===10,'weekly Monday key');
eq(host.api.snapshot().b,0,'initial team challenge mask');
complete(host,challengeList[0]);
eq(host.meta.points,1,'daily +1 Honor Point');
yes(host.api.list()[0].owned,'daily marked completed');
complete(host,challengeList[1]);
eq(host.rewards.size,1,'weekly exactly one item');
eq([...host.rewards.values()][0].rarity,'common','no rare weekly reward');
eq(host.api.snapshot().b,3,'host-authoritative daily+weekly mask');
const runState=host.api.saveRun();host.api.reset();host.api.resume(runState);
eq(host.meta.points,1,'solo re-entry never repeats daily bonus');
eq(host.rewards.size,1,'solo re-entry never repeats weekly item');
const clients=[];
for(let i=2;i<=6;i++){
 const p=make('guest','guest'+i);p.api.reset();p.api.onKill({type:'worm'});
 eq(p.api.snapshot().b,0,'guest kill cannot self-claim');
 p.api.receive(host.api.snapshot());
 eq(p.meta.points,1,'guest receives first daily point from host snapshot');
 eq(p.rewards.size,1,'guest weekly common gear');
 p.api.receive(host.api.snapshot());p.api.receive(host.api.snapshot());
 eq(p.meta.points,1,'duplicate snapshot cannot farm honor');
 eq(p.rewards.size,1,'duplicate snapshot cannot farm equipment');
 const bad={...host.api.snapshot(),b:99};p.api.receive(bad);
 eq(p.rewards.size,1,'forged mask discarded');
 clients.push(p);
}
eq(clients.length+1,6,'host and five guests');
const nextHost=clients[0];nextHost.NET.role='host';nextHost.G.runType='network';
nextHost.G.kills=host.G.kills;nextHost.G.wave=host.G.wave;nextHost.G.chestsOpened=host.G.chestsOpened;
nextHost.api.resume(runState);
eq(nextHost.api.snapshot().b,3,'backup host retains completed challenges');
eq(nextHost.rewards.size,1,'backup host no duplicate weekly item');
const debug=make('','debug');debug.api.reset();debug.G.debugRun=true;complete(debug,debug.api.list()[0]);complete(debug,debug.api.list()[1]);
eq(debug.meta.points,0,'debug runs never award daily points');eq(debug.rewards.size,0,'debug runs never award weekly items');
console.log('PASS '+checks+' daily/weekly checks: timezone keys, once-per-period claims, six peers, guest sync, backup host, non-rare rewards and debug protections.');
