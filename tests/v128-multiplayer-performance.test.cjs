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


// V133 guest motion QA: position freshness, local control grace and bandwidth
// priority, using isolated actual game functions (no mock gameplay implementation).
{
 const senderStart=html.indexOf('function ns132SendMotion(){');
 const senderEnd=html.indexOf('/* V132: newest movement sample',senderStart);
 const correctStart=html.indexOf('function ns133ReconcileLocal(');
 const correctEnd=html.indexOf('/* v79: estimate velocity',correctStart);
 const reconcileStart=html.indexOf('function reconcilePositions(');
 const reconcileEnd=html.indexOf('/* v79: one inexpensive render-target',reconcileStart);
 const smoothStart=html.indexOf('function ns79SmoothRemote(');
 const smoothEnd=html.indexOf('const NS79STATS=',smoothStart);
 assert.ok([senderStart,senderEnd,correctStart,correctEnd,reconcileStart,reconcileEnd,smoothStart,smoothEnd].every(i=>i>0),
   'V133 multiplayer functions found');
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const currentTime={now:()=>1000};
 const source=html.slice(senderStart,senderEnd)+html.slice(correctStart,correctEnd)
    +html.slice(reconcileStart,reconcileEnd)+html.slice(smoothStart,smoothEnd);
 const make=(NET,G,NETLAB)=>new Function('NET','G','NETLAB','performance','clamp',source+
  ';return {send:ns132SendMotion,local:ns133ReconcileLocal,reconcile:reconcilePositions,smooth:ns79SmoothRemote}')(
  NET,G,NETLAB,currentTime,clamp);
 const id='p2',packets=[];
 const g={time:0,players:[{id:'p1',x:100,y:100,frame:0,walking:false},
  {id,x:120,y:100,frame:0,walking:true}],
  mobs:[{id:1,x:150,y:120,type:'goblin',frame:1,angle:0,attackT:0,dead:false},
        {id:2,x:650,y:120,type:'goblin',frame:1,angle:0,attackT:0,dead:false},
        {id:3,x:640,y:125,type:'boss',frame:1,angle:0,attackT:0,dead:false}]};
 const net={role:'host',phase:'playing',round:2,clients:new Map([[id,{open:true,bufferSize:0}]]),
   ns132MobIds:new Map([[id,[1,2,3]]]),ns132SentAt:new Map(),ns132LastSend:0};
 const fn=make(net,g,{gameSend(_conn,data){packets.push(data);return true}});
 for(let i=1;i<=9;i++){g.time=i*.06;fn.send()}
 assert.equal(packets.length,9,'all nearby movement ticks keep their original rate');
 assert.ok(packets.every(p=>p.m.some(m=>m[0]===1)&&p.m.some(m=>m[0]===3)),
   'nearby enemies and bosses are updated at every tick');
 assert.equal(packets.filter(p=>p.m.some(m=>m[0]===2)).length,3,
   'distant ordinary enemies use one out of three small movement packets');
 assert.equal(net.ns133MotionTicks.get(id),9);
 const old={id:1,x:135,y:120,netAuthX:150,netAuthY:120,ns132HostTime:1.5,
   netAuthAt:900,netAge:.09,netVx:40,netVy:0,frame:6,walking:true,
   facing:1,angle:1.3,attackT:.8,hp:30};
 const older=fn.reconcile([old],[{id:1,x:143,y:120,frame:2,walking:false,facing:0,
   angle:.2,attackT:0,hp:19}],.1,1.4)[0];
 assert.equal(older.netAuthX,150,'old full state cannot undo newer movement');
 assert.equal(older.frame,6,'older frame cannot rewind animation');
 assert.equal(older.angle,1.3,'older mob facing cannot rewind');
 assert.equal(older.netAuthAt,900,'older full state cannot restart animation prediction age');
 assert.equal(older.netAge,.09);
 assert.equal(older.hp,19,'health from full host snapshot still updates');
 const fresh=fn.reconcile([older],[{id:1,x:154,y:120,frame:7,walking:false,
   facing:0,angle:.1,attackT:0,hp:15}],.1,1.6)[0];
 assert.equal(fresh.netAuthX,154,'new authoritative host state updates coordinates');
 assert.equal(fresh.hp,15);
 assert.equal(fresh.walking,false,'new movement state updates from the latest full snapshot');
 const predicted={x:200,y:100,netAuthX:160,netAuthY:100,speed:180};
 fn.local(predicted,{x:0,y:0},150,50);
 assert.equal(predicted.x,200,'release-of-stick grace prevents immediate rubber-band');
 fn.local(predicted,{x:0,y:0},150,310);
 assert.ok(predicted.x<200&&predicted.x>190,'settled client reconciles toward host');
 predicted.x=500;
 fn.local(predicted,{x:0,y:0},150,30);
 assert.equal(predicted.x,160,'major host collision correction still overrides prediction');
 const moving={x:0,y:0,netAuthX:100,netAuthY:0,netVx:0,netVy:0,netAge:0};
 fn.smooth(moving,.016,.21);
 assert.ok(moving.x>35&&moving.x<50,'remote movement smoothing has bounded faster response');
 assert.match(html,/MOTION \$\{mov\.hz\|\|0\}/,'connection diagnostics include compact movement frequency');
 assert.match(html,/NET\.ns133InputChangeAt=performance\.now\(\)/,'input direction changes are timestamped');
}
console.log('V133 guest motion QA PASS: near/far priority, stale animation, local movement grace, host correction');
