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

test('V199 fixed visual quality under all measured loads',()=>{
 const begin=source.indexOf('function newRenderBudget('),end=source.indexOf('let RENDER_Q=',begin);
 assert.ok(begin>=0&&end>begin);
 const c=vm.createContext({});vm.runInContext(source.slice(begin,end),c);
 for(const cap of [3,1.5,.75]){const q=c.newRenderBudget(cap),dpr=q.dpr;
 for(let i=0;i<1000;i++){c.tuneRenderBudget(q,i%2?30:60,i%2?34:16,i%2?25:2);assert.equal(q.dpr,dpr);assert.equal(q.fxLevel,2);assert.equal(q.changes,0)}
 assert.equal(q.windows,1000)}
 assert.match(source,/characterQualityLocked:true/);
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


test('V213 resume only reconnects original room when stale, never opens duplicate sockets',()=>{
 const a=source.indexOf('function arenaResumeAction('),b=source.indexOf('function arenaResumeNetwork(',a),c=vm.createContext({});vm.runInContext(source.slice(a,b),c);const resume=c.arenaResumeAction;
 assert.equal(resume('running',1,0,false,0),'');assert.equal(resume('running',1,7999,false,0),'');assert.equal(resume('running',1,8000,false,0),'refresh');assert.equal(resume('running',1,9000,true,0),'');assert.equal(resume('reconnecting',null,0,false,119999),'retry');assert.equal(resume('reconnecting',null,0,false,120000),'');for(const state of [0,1,2,3])assert.equal(resume('reconnecting',state,0,false,0),'');assert.equal(resume('idle',null,100000,false,0),'');assert.match(source,/window.addEventListener\('online',arenaResumeNetwork\)/);assert.match(source,/connect\(N.match,N.id,N.ticket,true\)/);
});

test('V214 clears held movement, revive and spell aim on loss of focus or network',()=>{
 const a=source.indexOf('function arenaClearHeldControls('),b=source.indexOf('// V213:',a);
 assert(a>=0&&b>a);
 const N={keys:new Set(['w','arrowright']),stick:{x:.8,y:.2,ptr:7},reviveHeld:'p2'};
 let releaseCalls=0;
 const c=vm.createContext({N,spellAim:{x:10,y:10},resetStick(){N.stick={x:0,y:0,ptr:null}},releaseArenaRevive(){releaseCalls++;N.reviveHeld=''}});
 vm.runInContext(source.slice(a,b),c);
 c.arenaClearHeldControls();
 assert.equal(N.keys.size,0);
 assert.deepEqual(N.stick,{x:0,y:0,ptr:null});
 assert.equal(N.reviveHeld,'');
 assert.equal(c.spellAim,null);
 c.arenaClearHeldControls();
 assert.equal(N.keys.size,0);
 assert.equal(releaseCalls,2);
 assert.match(source,/resetRenderSamples\(\);arenaClearHeldControls\(\);/);
 assert.match(source,/window\.addEventListener\('blur',arenaClearHeldControls\)/);
 assert.match(source,/window\.addEventListener\('offline',\(\)=>\{\s*if\(N\.solo\|\|N\.phase!=='running'\)return;\s*arenaClearHeldControls\(\)/);
 assert.match(source,/if\(action==='retry'\)\{\s*arenaClearHeldControls\(\)/);
 assert.match(source,/else if\(action==='refresh'\)\{\s*arenaClearHeldControls\(\)/);
 assert.match(source,/N\.netStalled=true;N\.pending=\[\];N\.delta=\{x:0,y:0\};arenaClearHeldControls\(\)/);
});

test('V214 direct transport close releases stale input before scheduling same-seat retry',()=>{
 const a=source.indexOf('ws.onclose=e=>{'),b=source.indexOf('ws.onerror=',a);
 assert(a>=0&&b>a);
 const ws={},N={ws,phase:'running',keys:new Set(['w']),pending:[{seq:6}],delta:{x:9,y:4},lostSince:0,retry:0};
 const callbacks=[],c=vm.createContext({N,ws,match:'room',id:'p1',ticket:'test-ticket',window:{},document:{hidden:false},Date:{now:()=>100},arenaClearHeldControls(){N.keys.clear()},status(){},clearTimeout(){},setTimeout(fn){callbacks.push(fn);return 1},connect(...args){callbacks.push(args)}});
 vm.runInContext(source.slice(a,b),c);
 ws.onclose({code:1006});
 assert.equal(N.ws,null);assert.equal(N.phase,'reconnecting');assert.equal(N.keys.size,0);assert.equal(N.pending.length,0);assert.equal(N.delta.x,0);assert.equal(N.delta.y,0);assert.equal(N.rejoinCorrection,true);assert.equal(callbacks.length,1);
 callbacks[0]();assert.deepEqual(Array.from(callbacks[1]),['room','p1','test-ticket',true]);
 assert.match(source,/arenaClearHeldControls\(\);N\.netStalled=true;N\.pending=\[\]/);
 assert.match(source,/N\.paused\|\|\(!N\.solo&&N\.netStalled\)\|\|N\.stick\.ptr!==null/);
 assert.match(source,/if\(N\.paused\|\|\(!N\.solo&&N\.netStalled\)\)return/);
});

test('V215 pooled painter preserves every draw job, stable depth ordering and bounded reference lifetime',()=>{
 const a=source.indexOf('function createArenaDrawScratch('),b=source.indexOf('const arenaDrawScratch=',a);
 assert(a>=0&&b>a);
 const c=vm.createContext({});vm.runInContext(source.slice(a,b),c);
 const scratch=c.createArenaDrawScratch(64);let previous=null;
 for(let frame=0;frame<1000;frame++){
  const plain=[],count=(frame*17)%240;
  for(let i=0;i<count;i++){
   const ref={id:i,frame},depth=(i*13+frame*7)%31,kind=i%9,id=i%22;
   plain.push({depth,kind,id,ref});scratch.add(depth,kind,id,ref);
  }
  if(count>0){if(previous)assert.equal(scratch.jobs[0],previous,'reuse first painter record');previous=scratch.jobs[0]}
  const compare=(a,b)=>a.depth-b.depth||a.kind-b.kind||a.id-b.id;
  plain.sort(compare);scratch.jobs.sort(c.arenaDepthOrder);
  assert.equal(scratch.jobs.length,count,'overflow must never drop a visible entity');
  for(let i=0;i<count;i++){const x=plain[i],y=scratch.jobs[i];assert.equal(y.depth,x.depth);assert.equal(y.kind,x.kind);assert.equal(y.id,x.id);assert.equal(y.ref,x.ref)}
  const retained=Array.from(scratch.jobs);scratch.clear();
  assert.equal(scratch.jobs.length,0);assert(retained.every(x=>x.ref===null));assert(scratch.poolSize<=64);
 }
 assert.equal(scratch.poolSize,64);
 assert.match(source,/jobs\.sort\(arenaDepthOrder\)/);
 assert.match(source,/finally\{scratch\.clear\(\)\}/);
});

test('V217 audio scheduler sleeps when hidden or muted, and cooldown expiry preserves every audible event',()=>{
 const audioSource=fs.readFileSync('public/v152-arena-audio.js','utf8');
 const timers=new Map(),listeners=new Map();let nextTimer=0,now=1000;
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.()}});
 class Context{
  constructor(){this.state='running';this.sampleRate=8000;this.destination={};this.currentTime=0}
  createGain(){return node()}createOscillator(){return node()}createBiquadFilter(){return node()}createBufferSource(){return node()}
  createBuffer(ch,n){const data=new Float32Array(n);return {getChannelData:()=>data}}
  resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}
 }
 const document={hidden:false,addEventListener(name,fn){listeners.set(name,fn)}};
 const window={AudioContext:Context};
 new Function('window','document','localStorage','performance','setInterval','clearInterval',audioSource)(window,document,{getItem:()=>null,setItem(){}},{now:()=>now},fn=>{const id=++nextTimer;timers.set(id,fn);return id},id=>timers.delete(id));
 const a=window.NS152_AUDIO;const hide=value=>{document.hidden=value;listeners.get('visibilitychange')()};
 a.unlock();a.unlock();assert.equal(timers.size,1);
 a.set('music',false);assert.equal(timers.size,0);hide(true);a.set('music',true);assert.equal(timers.size,0);
 hide(false);assert.equal(timers.size,1);hide(true);assert.equal(timers.size,0);hide(false);assert.equal(timers.size,1);
 const reference=new Map();let accepted=0;
 for(let i=0;i<4000;i++){
  now+=40+(i%3)*10;const id=i%5===0?'shared':i;
  const prev=reference.get(id)??-100000;
  const expected=now-prev>=250;
  assert.equal(a.play('step',{sourceId:id}),expected);
  if(expected){reference.set(id,now);accepted++}
  assert(a.diagnostics.cooldowns<=500,'expired IDs cannot accumulate over a long session');
 }
 assert(accepted>3000);assert.equal(a.diagnostics.activeFx,0);
 a.stop();assert.equal(timers.size,0);assert.equal(a.diagnostics.cooldowns,0);hide(true);hide(false);assert.equal(timers.size,0);
 a.unlock();assert.equal(timers.size,1);a.stop();
});
test('V217 all 256 voice codewords produce identical float32 PCM; no network or distance change',()=>{
 const voice=fs.readFileSync('public/v159-voice.js','utf8');
 const a=voice.indexOf('const decode=x=>'),b=voice.indexOf('function audio()',a);
 assert(a>=0&&b>a);const f=new Function(voice.slice(a,b)+'return {decode,decodeTable}')();
 for(let i=0;i<256;i++){assert.equal(f.decodeTable[i],f.decode(i));assert.equal(Math.fround(f.decodeTable[i]),Math.fround(f.decode(i)))}
 assert.match(voice,/samples\[i\]=decodeTable\[packet\[i\+1\]\]/);
 assert.match(voice,/const RATE=12000,LOG=Math.log\(256\),MAX_BUFFER=\.35/);
 assert.match(voice,/return \.16\+\.84/);
});
