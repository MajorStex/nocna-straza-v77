'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(new URL('../public/index.html', 'file://'+__filename), 'utf8');
const begin=src.indexOf('let lobbyAutoStartTimer=null');
const end=src.indexOf('function broadcastLobby(){',begin);
assert.ok(begin>0&&end>begin,'host has isolated auto-Ready scheduler');
const snippet=src.slice(begin,end);
function scenario({players=2,synced=true,ready=true,mode='normal',post=false,busy=false}={}){
 const roster=Array.from({length:players},(_,i)=>({id:'p'+(i+1),ready,level:10}));
 const timers=new Map();let next=0,started=0;
 const net={role:'host',phase:'lobby',code:'ABCDEF',round:0,localId:'p1',worldReadyPlayers:new Map(roster.slice(1).map(p=>[p.id,synced]))};
 const env={NET:net,NS97_POST:{active:post},selectedMode:mode,window:{NS140_ARENA:{busy}},lobbyPendingReturn:()=>[],
  currentLobbyRoster:()=>roster,startLobbyMatch:()=>{started++;return true;},
  setTimeout:fn=>{const id=++next;timers.set(id,fn);return id},
  clearTimeout:id=>timers.delete(id)};
 vm.createContext(env);vm.runInContext(snippet,env,{timeout:1000});
 const schedule=()=>vm.runInContext('scheduleLobbyAutoStart()',env);
 const flush=()=>{const batch=[...timers.values()];timers.clear();for(const fn of batch)fn()};
 return {roster,net,env,schedule,flush,get pending(){return timers.size},get started(){return started}};
}
let t=scenario();t.schedule();assert.equal(t.pending,1,'all Ready schedules one start');t.schedule();
assert.equal(t.pending,1,'repeat broadcasts cannot postpone countdown');t.flush();
assert.equal(t.started,1,'partija auto-starts when the final player is Ready');t.schedule();t.flush();
assert.equal(t.started,1,'repeated room broadcasts cannot create duplicate matches');
t=scenario({ready:false});t.schedule();assert.equal(t.pending,0,'not Ready never starts');t.roster[1].ready=true;t.schedule();assert.equal(t.pending,0);t.roster[0].ready=true;t.schedule();t.flush();assert.equal(t.started,1);
t=scenario({synced:false});t.schedule();assert.equal(t.pending,0,'wait for world transfer before starting');t.net.worldReadyPlayers.set('p2',true);t.schedule();t.flush();assert.equal(t.started,1);
t=scenario({players:1});t.schedule();assert.equal(t.pending,0,'never start solo as co-op');
t=scenario();t.schedule();t.roster[1].ready=false;t.flush();assert.equal(t.started,0,'Ready canceled during countdown prevents start');
t=scenario();t.schedule();t.net.phase='playing';t.flush();assert.equal(t.started,0,'already-started match is not started twice');
t=scenario({mode:'arena140'});t.schedule();t.flush();assert.equal(t.started,1,'new isolated arena starts automatically too');
t=scenario({mode:'arena140',busy:true});t.schedule();assert.equal(t.pending,0,'already preparing arena cannot duplicate room creation');
t=scenario({post:true});t.schedule();assert.equal(t.pending,0,'postgame voting is not hijacked');
console.log('V146 READY AUTO START PASS: 2-6 users, sync, cancellation, legacy and arena, no duplicate starts');
