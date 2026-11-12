'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
assert.match(html,/id="ns129VersionBadge"/,'current build watermark retained');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(x=>!/\bsrc=/.test(x[1]));
for(const m of scripts)new Function(m[2]);
const start=html.indexOf('const NS128_SIM_STEP=1/60;'),end=html.indexOf('function loop(ts){',start);
assert.ok(start>0&&end>start,'60Hz simulation scheduler found');
function clock(){return new Function(html.slice(start,end)+';return ns128SimulationStep;')()}
for(const hz of [30,45,60,90,120,144]){
 const next=clock();let ticks=0,seconds=0;
 for(let i=0;i<hz*10;i++){const dt=Math.min(.035,1/hz),v=next(dt);if(v>0){ticks++;seconds+=v}}
 assert.ok(Math.abs(seconds-10)<.065,'simulation time drift at '+hz+'Hz: '+seconds);
 assert.ok(ticks<=Math.min(60,hz)*10+1,'too much CPU simulation at '+hz+'Hz');
 assert.ok(ticks>=Math.min(60,hz)*10-1,'sim clock slowed at '+hz+'Hz');
}
assert.match(html,/ns77GetPropIndex\(true\)/,'prewarm collision grid before guest READY');
assert.match(html,/ns111PreloadWorld\(\);NET\.worldReady=true/,'world should prewarm before readiness');
const transferStart=html.indexOf('const sendWorldPart=()=>{'),transferEnd=html.indexOf('const beginWorldTransfer=()=>',transferStart);
const transfer=html.slice(transferStart,transferEnd);
assert.ok(transfer.includes('if(backlog>14000)return'),'congestion guard during map transfer');
assert.ok(transfer.includes('backlog>6500?1:2'),'bounded in-flight map chunks');
assert.ok(html.includes('roster.slice(1).some(p=>!NET.worldReadyPlayers.get(p.id))'),'no premature start before all guests load world');
assert.ok(html.includes("NET.ns67LastSnapshot.get(id)"),'existing per-guest snapshot pacing retained');
assert.ok(html.includes('ns79SmoothRemote(m,dt,.21)'), 'guest mob smoothing retained');
console.log('V128 performance QA PASS: 30/45/60/90/120/144Hz simulation, map preload, congestion guard, lobby readiness, interpolation');


// V132 guest latency: exercise the real isolated movement transport functions.
// No external relay, browser network or flaky timing assumptions.
{
 const sendStart=html.indexOf('function ns132SendMotion(){');
 const sendEnd=html.indexOf('/* V132: newest movement sample',sendStart);
 const recvStart=html.indexOf('function ns132ReceiveMotion(d){');
 const recvEnd=html.indexOf('/* v79: estimate velocity',recvStart);
 const recStart=html.indexOf('function reconcilePositions(');
 const recEnd=html.indexOf('/* v79: one inexpensive render-target',recStart);
 assert.ok(sendStart>0&&sendEnd>sendStart&&recvStart>0&&recvEnd>recvStart&&recStart>0&&recEnd>recStart);
 const src=html.slice(sendStart,sendEnd)+'\n'+html.slice(recvStart,recvEnd)+'\n'+html.slice(recStart,recEnd);
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
 const fakeTime={now:()=>1000};
 const create=(net,g,transport)=>new Function('NET','G','NETLAB','performance','clamp',
   src+';return {send:ns132SendMotion,receive:ns132ReceiveMotion,reconcile:reconcilePositions}')(
   net,g,transport,fakeTime,clamp);
 for(const guests of [1,3,5]){
  const messages=[],connections=new Map();
  const roster=Array.from({length:guests},(_,i)=>'p'+(i+2));
  for(const id of roster)connections.set(id,{open:true,bufferSize:0});
  const net={role:'host',phase:'playing',round:9,clients:connections,ns132MobIds:new Map(),
    ns132SentAt:new Map(),ns132LastSend:0};
  const players=[{id:'p1',x:100,y:120,frame:1,facing:0,walking:true}].concat(
    roster.map((id,i)=>({id,x:130+i*20,y:120,frame:1,facing:0,walking:true})));
  const g={time:0,players,mobs:Array.from({length:26},(_,i)=>({
    id:100+i,x:80+i*9,y:120,frame:0,angle:0,attackT:0,dead:false}))};
  for(const id of roster)net.ns132MobIds.set(id,g.mobs.map(m=>m.id));
  const f=create(net,g,{gameSend(_conn,packet,id){messages.push({id,packet});return true}});
  for(let t=0;t<240;t++){g.time=(t+1)/60;f.send()}
  const per=messages.length/guests/4;
  assert.ok(per>9&&per<21,'bounded compact movement frequency for '+guests+' guests: '+per);
  assert.ok(messages.every(x=>x.packet.t==='ns132Motion'&&x.packet.p.length===guests+1 &&
   !('hp' in x.packet)&&!('drops' in x.packet)), 'movement contains only compact coordinates');
  // The Cloudflare room accepts at most 260 host messages in a 2s window.
  // Budget for full authoritative snapshots and small control/room packets as well.
  assert.ok(per*guests+9.3*guests<125,'stay below relay budget for '+guests+' guests');
  const before=messages.filter(x=>x.id===roster[0]).length;
  connections.get(roster[0]).bufferSize=9000;
  for(let t=240;t<300;t++){g.time=(t+1)/60;f.send()}
  assert.equal(messages.filter(x=>x.id===roster[0]).length,before,'one congested client does not get more motion');
  if(guests>1)assert.ok(messages.some(x=>x.id===roster.at(-1)&&x.packet.time>4),
    'healthy recipients keep updating when another peer is congested');
 }
 const net={role:'guest',phase:'playing',localId:'p2',round:5,ns132MotionStats:null};
 const g={players:[{id:'p2',x:100,y:100,netAuthX:100,netAuthY:100,ns132HostTime:1}],
  mobs:[{id:7,x:120,y:120,netAuthX:120,netAuthY:120,ns132HostTime:1}]};
 const f=create(net,g,{});
 f.receive({t:'ns132Motion',round:5,time:1.1,p:[['p2',114,100,2,1,1,0,0,0]],
  m:[[7,137,125,1,0,0]]});
 assert.equal(g.players[0].x,100,'local optimistic movement is never overridden by modest motion correction');
 assert.equal(g.players[0].netAuthX,114,'new authoritative position retained');
 assert.equal(g.mobs[0].netAuthX,137);
 assert.equal(g.mobs[0].ns132HostTime,1.1);
 const stale=f.reconcile(g.mobs,[{id:7,x:126,y:122,frame:2}],.1,1.05);
 assert.equal(stale[0].netAuthX,137,'old full snapshot cannot rewind newer enemy movement');
 assert.equal(stale[0].netAuthY,125);
 const newer=f.reconcile(stale,[{id:7,x:142,y:126,frame:4}],.1,1.2);
 assert.equal(newer[0].netAuthX,142,'new full snapshot correctly takes precedence');
 g.mobs=newer;
 f.receive({t:'ns132Motion',round:5,time:1.11,p:[],m:[[7,110,120,5,0,0]]});
 assert.equal(g.mobs[0].netAuthX,142,'late movement frame cannot rewind full snapshot');
 f.receive({t:'ns132Motion',round:4,time:1.9,p:[],m:[[7,200,200,5,0,0]]});
 assert.equal(g.mobs[0].netAuthX,142,'foreign multiplayer round ignored');
 assert.match(html,/frame\.snapshot.*frame\.motion|frame\.motion.*frame\.snapshot/s,
  'relay decoder must retain both full and compact states in the same render frame');
 assert.match(html,/relayActive\(\)\?\.043:\.047/,'guest input sends more promptly');
}
console.log('V132 guest latency QA PASS: 2/4/6 players, congestion, stale movement, old rounds, input pacing');
