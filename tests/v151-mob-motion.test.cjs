'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../public/v140-net-mode.js'),'utf8');
const start=src.indexOf('function sampleOnlineMobs(now,dt){'),end=src.indexOf('function drawArenaMobs(g,now,dt,visible){',start);
assert.ok(start>0&&end>start,'V151 has dedicated online mob snapshot interpolator');
// V204 routes defense raiders to a second target map without changing the physics cadence.
const soloStart=src.indexOf('function stepSolo(dt){');
assert.ok(soloStart>0,'solo fixed-step loop exists');
const solo=src.slice(soloStart,src.indexOf('function sampleOnlineMobs(now,dt){',soloStart));
assert.match(solo,/while\(N\.soloAcc>=1\/30&&iterations\+\+<5\)\{\s*N\.soloAcc-=1\/30;N\.soloTick\+\+/,'solo physics remains 30Hz and catch-up is bounded');
assert.match(solo,/N\.soloCrowd\.advance\(siege\?siege\.normal:goblins,N\.players\);if\(siege\)N\.soloCrowd\.advance\(siege\.raid,siege\.targets\);/,'both regular enemies and defense raiders advance every physics tick');
assert.match(solo,/if\(N\.soloTick%2===0\)\{N\.soloCrowd\.step\(siege\?siege\.normal:goblins,N\.players,N\.soloTick\);if\(siege\)N\.soloCrowd\.step\(siege\.raid,siege\.targets,N\.soloTick\)\}/,'both groups steer at 15Hz');
assert.match(src,/move\(m,m\.vx\/d\*stride,m\.vy\/d\*stride,1\/30\)/,'movement integrates fixed 30Hz stride');
assert.ok(src.includes('mob.prevX=mob.x;mob.prevY=mob.y'),'solo keeps previous physics positions');
assert.ok(src.includes('N.soloAcc*30'),'solo renders between physics steps at 60/90/120FPS');
assert.ok(!src.includes("const t=1-Math.exp(-Math.min(dt,.05)*17);mob.x+="),
 'do not ease directly to each 15Hz network packet (causes sawtooth stutter)');
const N={mobHistory:[],mobRenderTick:null,mpMobs:[],lastState:0};
const env={N,clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),Math};
vm.createContext(env);vm.runInContext(src.slice(start,end),env,{timeout:1000});
const packets=Array.from({length:53},(_,i)=>{
 const tick=(i+1)*2;return {tick,arrive:tick*(1000/30)+[0,12,-10,18,-9,6][i%6],
  x:100+tick*2};
}).sort((a,b)=>a.arrive-b.arrive);
let n=0,last=null,positive=0,jumps=0,reverse=0,steady=0;
for(let time=0;time<3500;time+=1000/60){
 while(n<packets.length&&packets[n].arrive<=time){
  const packet=packets[n++];N.lastState=packet.arrive;
  N.mobHistory.push({tick:packet.tick,positions:new Map([[1,[packet.x,120]]])});
  if(N.mobHistory.length>6)N.mobHistory.shift();
  if(!N.mpMobs.length)N.mpMobs=[{id:1,x:packet.x,y:120,tx:packet.x,ty:120,hp:35}];
 }
 if(!N.mobHistory.length)continue;
 env.sampleOnlineMobs(time,1000/60/1000);
 const x=N.mpMobs[0].x;
 assert.ok(Number.isFinite(x),'finite online render position');
 if(last!==null&&time>500&&time<3200){
  const d=x-last;
  if(d>.05)positive++;if(d>3.6)jumps++;if(d<-.65)reverse++;
  steady++;
 }
 last=x;
}
assert.equal(jumps,0,'100ms buffered interpolation eliminates 15Hz visible jumps');
assert.equal(reverse,0,'network jitter must not visibly pull enemies backwards');
assert.ok(positive/steady>.66,'most 60Hz frames show actual goblin movement, not 15Hz stalls');
assert.ok(N.mobHistory.length<=6,'bounded buffer does not grow with session duration');
console.log('V151 60FPS network jitter PASS: buffered positions, no large jumps/reverse frames, smooth solo physics');
