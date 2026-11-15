'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'v140-net-mode.js'),'utf8');
const audio=fs.readFileSync(path.join(root,'v152-arena-audio.js'),'utf8');
const scene=fs.readFileSync(path.join(root,'v157-arena-scenery.js'),'utf8');
const sprites=fs.readFileSync(path.join(root,'v154-goblin-renderer.js'),'utf8');
assert.match(html,/<title>Night Watch v166 — Noćna Straža<\/title>/);
for(const file of ['v140-net-mode.js','v152-arena-audio.js','v154-goblin-renderer.js','v157-arena-scenery.js'])
 assert.ok(html.includes(file+'?v='+(file==='v140-net-mode.js'?163:file==='v157-arena-scenery.js'?158:157)),'versioned asset missing '+file);
assert.ok(html.indexOf('v157-arena-scenery.js')<html.indexOf('v140-net-mode.js'));
for(const code of [client,audio,scene,sprites])new Function(code);
assert.match(client,/m\.t==='event'/);
assert.match(client,/m\.t==='waveStart'/);
assert.match(client,/toggleArenaPause/);
assert.match(client,/NS157_SCENERY\?\.generate\(N\.world\)/);
assert.match(client,/N\.paused\?500:50/);
assert.match(audio,/function weaponFamily/);
assert.match(audio,/function weaponBuffer/);
assert.match(sprites,/footY=16-Math\.max\(0,phase\*side\)\*3/,'visible articulated goblin legs');
// Solo preview exactly mirrors distant server horde, not random on-screen creation.
const start=client.indexOf('function soloHordePoints(){'),end=client.indexOf('function soloWaveDone(){',start);
assert.ok(start>=0&&end>start);
const obstacles=[
 {x:275,y:140,w:95,h:92},{x:585,y:330,w:102,h:94},{x:435,y:245,w:75,h:84},
 {x:165,y:350,w:87,h:58},{x:790,y:170,w:126,h:104},{x:1120,y:275,w:106,h:110},
 {x:1230,y:650,w:140,h:110},{x:720,y:730,w:116,h:100},{x:1005,y:875,w:120,h:90},
 {x:395,y:785,w:100,h:105},{x:1460,y:410,w:110,h:104},{x:1020,y:485,w:94,h:94}
];
const hero={id:'p1',x:130,y:250,hp:100,knocked:false};
const solo={LAB:{customCount:null},labDefaultCount:w=>Math.min(80,60+Math.max(0,w-1)*10),N:{world:{w:1680,h:1080,decorSeed:157,obstacles},
 players:new Map([['p1',hero]]),soloSpawnCache:null},Math,
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
vm.createContext(solo);vm.runInContext(client.slice(start,end),solo,{timeout:1000});
for(const [wave,n]of [[1,60],[2,70],[3,80]]){
 const mobs=solo.buildSoloWave(wave);
 assert.equal(mobs.length,n);
 assert.equal(new Set(mobs.map(m=>m.x+':'+m.y)).size,n,'no stacked spawn positions');
 assert.ok(mobs.every(m=>m.spawnDistance>=380),'goblins must arrive from far away');
}
hero.x=800;hero.y=520;
assert.ok(solo.buildSoloWave(3).every(m=>m.spawnDistance>=330),'wave 3 respects current position');
// Pausing online sends only local control state; solo timers are frozen too.
const pauseStart=client.indexOf('function announceArena(message){'),
 pauseEnd=client.indexOf('function renderPresence(){',pauseStart);
assert.ok(pauseStart>=0&&pauseEnd>pauseStart);
let now=1000;const packets=[];
const N={phase:'running',paused:false,solo:false,ws:{readyState:1,send:x=>packets.push(JSON.parse(x))},
 delta:{x:0,y:0},pending:[1,2],keys:new Set(['w']),stick:{x:1,y:0,ptr:3}};
const ui={N,LAB_AUTO_PAUSE:false,window:{NS160_LAB:{active:false}},closeArenaMenu:()=>{},el:()=>null,Date:{now:()=>now},setTimeout:()=>1,Math};
vm.createContext(ui);vm.runInContext(client.slice(pauseStart,pauseEnd)+';this.pause=toggleArenaPause;',ui);
ui.pause();assert.equal(N.paused,true);assert.equal(N.pending.length,0);
assert.deepEqual(packets[0],{t:'pause',paused:true});
ui.pause(false);assert.deepEqual(packets[1],{t:'pause',paused:false});
N.solo=true;N.ws=null;N.soloChoice={until:10000};N.soloState='between';N.soloBetweenUntil=12000;
ui.pause(true);now+=1000;ui.pause(false);
assert.equal(N.soloChoice.until,11000,'solo chest countdown freezes during pause');
assert.equal(N.soloBetweenUntil,13000,'solo wave timer freezes during pause');
// Cached weapon samples remain distinct after changing equipped gear.
let samples=[],at=10000;
class AC{
 constructor(){this.state='running';this.currentTime=1;this.sampleRate=11025;this.destination={}}
 createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createOscillator(){return{frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}}}
 createBuffer(c,n){const b={samples:new Float32Array(n),getChannelData(){return this.samples}};samples.push(b);return b}
 createBufferSource(){return{playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){}}}
 createBiquadFilter(){return{frequency:{value:0},connect(){},disconnect(){}}}
 resume(){return Promise.resolve()}suspend(){return Promise.resolve()}
}
const ctx={window:{AudioContext:AC},document:{hidden:false},localStorage:{getItem:()=>null,setItem(){}},
 Math,Number,Float32Array,performance:{now:()=>at},setInterval:()=>1,clearInterval:()=>{}};
vm.createContext(ctx);vm.runInContext(audio,ctx,{timeout:1000});
const player=ctx.window.NS152_AUDIO;player.unlock();
assert.equal(player.weaponFamily('warhammer'),'blunt');
assert.equal(player.weaponFamily('greataxe'),'axe');
assert.equal(player.weaponFamily('spear'),'polearm');
assert.equal(player.weaponFamily('rapier'),'lightblade');
assert.equal(player.weaponFamily('longsword'),'blade');
assert.equal(player.play('swing',{weapon:'longsword',sourceId:'p1'}),true);
assert.equal(player.play('swing',{weapon:'greataxe',sourceId:'p2'}),true);
assert.equal(player.cachedWeaponBuffers,2);
const a=samples.at(-2).samples,b=samples.at(-1).samples;
assert.ok(a.some(v=>v!==0)&&b.some(v=>v!==0));
assert.notEqual(a[100],b[100],'swapping weapon changes actual audio waveform');
at+=200;assert.equal(player.play('hit',{weapon:'greataxe',variant:7}),true);
assert.equal(player.cachedWeaponBuffers,3);
at+=200;assert.equal(player.play('hit',{weapon:'longsword',variant:9}),true);
assert.equal(player.cachedWeaponBuffers,4);
const {chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:360,height:780},{width:832,height:394}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
   await page.setContent('<html><body></body></html>');
   await page.addScriptTag({path:path.join(root,'v157-arena-scenery.js')});
   const result=await page.evaluate(obstacles=>{
    const S=window.NS157_SCENERY,world={w:1680,h:1080,decorSeed:157,obstacles};
    const decorations=S.generate(world),second=S.generate(world);
    const c=document.createElement('canvas');c.width=700;c.height=300;
    const g=c.getContext('2d',{willReadFrequently:true});
    for(let i=0;i<5;i++)S.drawOne(g,{type:i,x:80+i*130,y:165});
    const pixels=g.getImageData(0,0,700,300).data;
    let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visible++;
    return{n:decorations.length,same:decorations===second,
      unique:new Set(decorations.map(d=>d.x+','+d.y)).size,
      trees:decorations.filter(d=>d.type<3).length,
      rocks:decorations.filter(d=>d.type>=3).length,visible};
   },obstacles);
   assert.ok(result.same&&result.n>=45&&result.trees>=25&&result.rocks>=20);
   assert.equal(result.unique,result.n);
   assert.ok(result.visible>1500,'drawn tree crowns, trunks and rocks must have real shapes');
   await page.close();
  }
  console.log('V157 CLIENT PASS: variable weapon PCM, protected solo/MP pause, 80 distant goblins, 5 cached tree/rock sprites and mobile scenery');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
