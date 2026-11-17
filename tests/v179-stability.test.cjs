const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const source=fs.readFileSync('public/v140-net-mode.js','utf8');
const start=source.indexOf('function arenaRosterIssue('),end=source.indexOf('async function startHost()',start);
assert.ok(start>=0&&end>start);
const ctx=vm.createContext({NS140_TEMP_UNLOCK_LEVEL:0});
vm.runInContext(source.slice(start,end),ctx);
const issue=(ids,code='ABCD23',localId=ids[0],closed=[],level=0)=>ctx.arenaRosterIssue({
 code,localId,clients:new Map(ids.slice(1).map(id=>[id,{open:!closed.includes(id)}]))
},ids.map(id=>({id,level})));
test('two through six level-zero seats pass relay contract',()=>{
 for(let count=2;count<=6;count++)assert.equal(issue(Array.from({length:count},(_,i)=>'p'+(i+1))),'');
 assert.equal(issue(['p3','p1'],'ABCD23','p3'),'');
});
test('invalid room codes and rosters fail before request',()=>{
 assert.equal(issue(['p1']),'roster_count');
 assert.equal(issue(['p1','p2','p3','p4','p5','p6','p7']),'roster_count');
 assert.equal(issue(['p1','p7']),'roster_seat');
 assert.equal(issue(['p1','p1']),'roster_duplicate');
 assert.equal(issue(['p1','p2'],'ABCDI3'),'roster_code');
 assert.equal(issue(['p1','p2'],'ABCDO3'),'roster_code');
 assert.equal(issue(['p1','p2'],'ABCD13'),'roster_code');
 assert.equal(issue(['p1','p2'],'ABCD23','p2'),'roster_host');
 assert.equal(issue(['p1','p2'],'ABCD23','p1',['p2']),'guest_disconnected');
 assert.equal(issue(['p1','p2'],'ABCD23','p1',[],-1),'roster_level');
});
test('rejoin and stale prepare guards present in client',()=>{
 assert.match(source,/N\.phase!=='reconnecting'\|\|!!N\.ws/);
 assert.match(source,/N\.prepareAttempt!==attempt\|\|N\.phase!=='preparing'/);
 assert.match(source,/latest\.some\(\(p,i\)=>p\.id!==seats\[i\]\)/);
});
test('diagnostic UI is opt-in and its report excludes credential fields',()=>{
 const social=fs.readFileSync('public/v178-workshop-social.js','utf8');
 assert.match(social,/get\('diagnostics'\)==='1'/);
 const report=social.slice(social.indexOf('function debugReport()'),social.indexOf('let debugPanel'));
 assert.doesNotMatch(report,/\.ticket|\.code|\.token|\.friendId|\.data\b/);
});

test('V181 preserve character render resolution during every performance adjustment',()=>{
 const begin=source.indexOf('function newRenderBudget('),end=source.indexOf('let RENDER_Q=',begin);
 assert.ok(begin>=0&&end>begin);
 const c=vm.createContext({});vm.runInContext(source.slice(begin,end),c);
 const q=c.newRenderBudget(3);
 assert.equal(q.dpr,1.5);assert.equal(q.fxLevel,2);
 c.tuneRenderBudget(q,48,26,16);assert.equal(q.fxLevel,2);
 c.tuneRenderBudget(q,48,26,16);assert.equal(q.fxLevel,1);
 for(let i=0;i<30;i++){c.tuneRenderBudget(q,45,30,18);assert.equal(q.dpr,1.5);}
 assert.equal(q.fxLevel,0);
 for(let i=0;i<4;i++)c.tuneRenderBudget(q,60,17,8);
 assert.equal(q.fxLevel,0);
 c.tuneRenderBudget(q,60,17,8);assert.equal(q.fxLevel,1);
 for(let i=0;i<60;i++){c.tuneRenderBudget(q,60,17,8);assert.equal(q.dpr,1.5);}
 assert.equal(q.fxLevel,2);
 assert.match(source,/characterQualityLocked:true/);
 const low=c.newRenderBudget(.75);for(let i=0;i<10;i++)c.tuneRenderBudget(low,30,34,20);
 assert.equal(low.dpr,.75);
 const fxUses=[...source.matchAll(/RENDER_Q\.fxLevel/g)];
 assert.equal(fxUses.length,3,'adaptive FX only read by crystal pulse and diagnostics');
});

test('V181 remote hero and enemy share monotonic buffered time even when jitter raises delay',()=>{
 const a=source.indexOf('function sampleOnlineMobs('),b=source.indexOf('function drawArenaMobs(',a);
 assert(a>=0&&b>a);
 const remote={id:'p2',x:0,y:0,online:true},local={id:'p1',x:777,y:777,online:true};
 const mob={id:7,x:0,y:0},N={id:'p1',players:new Map([['p1',local],['p2',remote]]),mpMobs:[mob],mobHistory:[],mobRenderTick:null,lastState:0,interpolationTicks:3};
 const env=vm.createContext({N,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))});vm.runInContext(source.slice(a,b),env);
 let tick=0,previous=-1,frames=0,moving=0;
 for(let i=1;i<=240;i++){
  const now=i*1000/60;
  if(i%4===0&&i%36!==0){tick+=i%36===4&&i>4?4:2;N.lastState=now;N.mobHistory.push({tick,positions:new Map([[7,[tick*2,0]]]),heroes:new Map([['p2',[tick*2,25,true]]])});if(N.mobHistory.length>12)N.mobHistory.shift()}
  if(i===90)N.interpolationTicks=7;if(i===160)N.interpolationTicks=3;
  env.sampleOnlineMobs(now,1/60);
  if(N.mobHistory.length){assert(N.mobRenderTick>=previous,'no render clock reversal');if(previous>=0){frames++;if(N.mobRenderTick>previous)moving++}
   assert(Math.abs(remote.x-mob.x)<1e-8,'hero and goblin same render tick');assert.equal(local.x,777,'no remote interpolation on local hero');previous=N.mobRenderTick;}
 }
 assert(moving/frames>.7,'most frames continue moving despite irregular arrivals');
 assert(N.mobHistory.length<=12);
});
