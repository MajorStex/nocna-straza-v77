'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../public');
const client=fs.readFileSync(path.join(base,'v140-net-mode.js'),'utf8');
const sprite=fs.readFileSync(path.join(base,'v154-goblin-renderer.js'),'utf8');
const audio=fs.readFileSync(path.join(base,'v152-arena-audio.js'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
assert.match(html,/<title>Night Watch v160 — Noćna Straža<\/title>/);
for(const asset of ['v140-net-mode.js','v154-goblin-renderer.js','v152-arena-audio.js'])
 assert.ok(html.includes(asset+'?v='+(asset==='v140-net-mode.js'?158:157)),'mobile PWA must refresh '+asset);
assert.match(sprite,/function prepare\(mobs,opt\)/);
assert.match(sprite,/function drawOne\(g,entry,opt\)/);
assert.match(client,/jobs\.sort\(\(a,b\)=>a\.depth-b\.depth\|\|a\.kind-b\.kind/);
assert.match(client,/drawArenaPlayerLabel\(g,p\)/);
assert.match(client,/A\(\)\?\.play\('goblinStep'/);
assert.match(client,/A\(\)\?\.play\('hit'/);
assert.match(audio,/activeFx>=12/,'audio voice budget is capped');
assert.match(audio,/kind==='hit'/);
assert.match(audio,/kind==='goblinStep'/);
new Function(client);new Function(sprite);new Function(audio);
const start=client.indexOf('function drawArenaPlayerBody(g,p,now,dt){'),end=client.indexOf('function frame(now){',start);
assert.ok(start>=0&&end>start,'depth painter source code extractable');
const trace=[];
const p={id:'p1',x:120,y:205,tx:120,ty:205,hp:100,maxHp:100,online:true};
const behind={id:0,x:120,y:188,hp:35,maxHp:35},front={id:1,x:120,y:223,hp:35,maxHp:35};
const ctx={
 N:{world:{obstacles:[{x:110,y:100,w:60,h:70}]},players:new Map([['p1',p]]),
    looks:new Map([['p1',{look:{name:'RATNIK',visualSize:.79}}]]),
    me:p,id:'p1',solo:true,soloMobs:[behind,front],soloChests:[{id:1,x:140,y:190,opened:false}],
    soloTick:10,soloAcc:0,lastState:0,visibleMobs:0},
 window:{NS154_GOBLINS:{
   prepare:(mobs)=>mobs.map(mob=>({mob,x:mob.x,y:mob.y,depth:mob.y+13})),
   drawOne:(g,item)=>trace.push('mob'+item.mob.id)}},
 B:()=>({drawVillageHero:(g,x,y,options)=>trace.push('hero'+options.id),heroStyle:{}}),
 updateHeroMotion:()=>({walking:true,phase:0,side:1}),
 swordAge:()=>-100,
 drawTargetedSlash:()=>{},
 cottageSprite:()=>({house:true}),
 drawArenaChests:(g,chests)=>trace.push('chest'),
 drawArenaBuildings:()=>trace.push('fallback-building'),
 drawArenaMobs:()=>trace.push('fallback-goblins'),
 sampleOnlineMobs:()=>{},
 localArenaLook:()=>({visualSize:.79}),
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
 Math,Number,
};
const g={
 save(){},restore(){},translate(){},beginPath(){},arc(){},fill(){},
 fillRect(){},drawImage(){trace.push('house')},fillText(){trace.push('label')}
};
vm.createContext(ctx);
vm.runInContext(client.slice(start,end)+';this.render=drawDepthSortedWorld;',ctx,{timeout:1000});
const visible={left:0,right:500,top:0,bottom:600};
ctx.render(g,1000,1/60,visible);
assert.deepEqual(trace,['house','mob0','chest','herop1','mob1','label'],
 'rear enemy must be UNDER the hero, front enemy must cover their body');
assert.equal(ctx.N.visibleMobs,2);
trace.length=0;p.y=245;
ctx.render(g,1016,1/60,visible);
assert.ok(trace.indexOf('mob1')<trace.indexOf('herop1'),
 'hero below the goblins on map renders in front of them');
trace.length=0;p.y=172;
ctx.render(g,1032,1/60,visible);
assert.ok(trace.indexOf('herop1')<trace.indexOf('mob0'),
 'hero above the goblins on map is visually behind them');
// The music and sound effects are generated locally and have a fixed voice cap.
let now=10000,oscCount=0;
class FakeAC{
 constructor(){this.state='running';this.currentTime=1;this.sampleRate=44100;this.destination={}}
 createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createOscillator(){oscCount++;return{frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
  connect(){},disconnect(){},start(){},stop(){},onended:null}}
 createBuffer(){return{getChannelData:()=>new Float32Array(4000)}}
 createBufferSource(){return{connect(){},disconnect(){},start(){},stop(){},onended:null}}
 createBiquadFilter(){return{frequency:{value:0},connect(){},disconnect(){}}}
 suspend(){this.state='suspended';return Promise.resolve()}
 resume(){this.state='running';return Promise.resolve()}
}
const sandbox={window:{AudioContext:FakeAC},document:{hidden:false},
 localStorage:{getItem:()=>null,setItem(){}},Math,Number,
 performance:{now:()=>now},setInterval:()=>1,clearInterval:()=>{},Float32Array};
vm.createContext(sandbox);vm.runInContext(audio,sandbox,{timeout:1000});
const playerAudio=sandbox.window.NS152_AUDIO;playerAudio.unlock();
assert.equal(playerAudio.play('enemy',{x:1000,y:0,listenerX:0,listenerY:0}),false,
 'offscreen distant goblins never suppress nearby sounds');
assert.equal(playerAudio.play('enemy',{x:30,y:0,listenerX:0,listenerY:0}),true);
for(let i=0;i<80;i++)playerAudio.play('enemy',{sourceId:i,x:50,y:0,listenerX:0,listenerY:0});
assert.equal(oscCount,1,'80 goblins share the same grouped enemy cue');
now+=800;
assert.equal(playerAudio.play('goblinStep',{gain:.3,x:50,y:0,listenerX:0,listenerY:0}),true);
assert.equal(playerAudio.play('hit',{gain:.5,x:50,y:0,listenerX:0,listenerY:0}),true);
for(let i=0;i<80;i++){now+=200;playerAudio.play('hit',{gain:.8,x:50,y:0,listenerX:0,listenerY:0})}
assert.ok(oscCount<=12,'SFX oscillator budget cannot grow without bound');
console.log('V156 DEPTH + AUDIO PASS: hero occluded correctly by front goblins, house/chest layering, visible nameplates, 80-creep bounded sounds');
