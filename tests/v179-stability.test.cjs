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

test('adaptive quality uses hysteresis, never exceeds device bounds',()=>{
 const begin=source.indexOf('function newRenderBudget('),end=source.indexOf('let RENDER_Q=',begin);
 assert.ok(begin>=0&&end>begin);
 const c=vm.createContext({});vm.runInContext(source.slice(begin,end),c);
 const q=c.newRenderBudget(3);
 assert.equal(q.dpr,1.5);
 c.tuneRenderBudget(q,48,26,16);assert.equal(q.dpr,1.5);
 c.tuneRenderBudget(q,48,26,16);assert.equal(q.dpr,1.35);
 for(let i=0;i<30;i++)c.tuneRenderBudget(q,45,30,18);
 assert.equal(q.dpr,.8);
 for(let i=0;i<4;i++)c.tuneRenderBudget(q,60,17,8);
 assert.equal(q.dpr,.8);
 c.tuneRenderBudget(q,60,17,8);assert.equal(q.dpr,.9);
 for(let i=0;i<60;i++)c.tuneRenderBudget(q,60,17,8);
 assert.equal(q.dpr,1.5);
 const low=c.newRenderBudget(.75);for(let i=0;i<10;i++)c.tuneRenderBudget(low,30,34,20);
 assert.equal(low.dpr,.75);
});
