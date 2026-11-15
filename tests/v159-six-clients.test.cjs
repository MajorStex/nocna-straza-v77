'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../public');
const match='0123456789abcdef01234567',seats=['p1','p2','p3','p4','p5','p6'];
const world={w:1680,h:1080,r:14,speed:156,decorSeed:157,obstacles:[
{x:275,y:140,w:95,h:92},{x:585,y:330,w:102,h:94},
{x:435,y:245,w:75,h:84},{x:165,y:350,w:87,h:58},
{x:790,y:170,w:126,h:104},{x:1120,y:275,w:106,h:110},
{x:1230,y:650,w:140,h:110},{x:720,y:730,w:116,h:100},
{x:1005,y:875,w:120,h:90},{x:395,y:785,w:100,h:105},
{x:1460,y:410,w:110,h:104},{x:1020,y:485,w:94,h:94}
]};
const mobs=Array.from({length:80},(_,i)=>[i,(i===0?690:115+(i%14)*105)*10,
 (i===0?490:90+Math.floor(i/14)*135)*10,
 i===0?335:115,80,i===0?96:-100,i===0?335:115,i===0?1:0]);
const players=seats.map((id,i)=>[id,(140+i*120)*10,(245+i*20)*10,100,
 -100,1,0,0,-1,100,0]);
const payload={t:'s',tick:100,players,mobs,wave:10,serverNow:Date.now(),
 waveState:'play',totalMobs:80,ms:1.25,ack:0};
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const metrics=[];
  for(const [i,id] of seats.entries()){
   const page=await browser.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<html><body></body></html>');
   await page.evaluate(id=>{
    window.__NS110_BRIDGE={currentProfileLevel:()=>7,NET:{role:'guest',phase:'lobby',localId:id},
      getVillageHeroLook:seat=>({name:seat,visualSize:.8,weapon:'sword'})};
    window.__fakeSockets=[];
    window.WebSocket=class FakeWebSocket{
     constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];window.__fakeSockets.push(this)}
     send(raw){this.sent.push(JSON.parse(raw))}
     close(){this.readyState=3;this.onclose?.({code:1000})}
     open(){this.readyState=1;this.onopen?.()}
     inject(msg){this.onmessage?.({data:JSON.stringify(msg)})}
    };
    window.NS152_AUDIO={music:false,sound:false,play(){},unlock(){},set(){},stop(){}};
   },id);
   for(const name of ['v157-arena-scenery.js','v154-goblin-renderer.js',
     'v159-troll-renderer.js','v140-net-mode.js'])await page.addScriptTag({path:path.join(root,name)});
   const data=await page.evaluate(({id,match,world,payload})=>{
    world.obstacles.push(...window.NS157_SCENERY.colliders(world));
    const started=window.NS140_ARENA.acceptOffer({id,match,protocol:140,ticket:'test-seat'});
    const ws=window.__fakeSockets[0];ws.open();
    ws.inject({t:'welcome',protocol:140,world,serverBuild:159,looks:[]});
    ws.inject({t:'start'});ws.inject(payload);
    const costs=[];for(let j=0;j<95;j++){
     const start=performance.now();
     window.NS140_ARENA.frame(performance.now()+j*16.67);
     costs.push(performance.now()-start);
    }
    costs.sort((a,b)=>a-b);
    const d=window.NS140_ARENA.diagnostics;
    return {started,phase:d.phase,type:d.soloTrollCount,atlas:d.legacyTrollAtlasBuilds,
     grid:d.collisionGridCells,checks:d.collisionChecks,calls:d.collisionCalls,
     p95:costs[Math.floor(costs.length*.95)],
     playerVisible:d.playerX!=null,bodyCount:d.mode,
     mobCount:payload.mobs.length,boss:payload.mobs.filter(m=>m[7]===1).length};
   },{id,match,world:structuredClone(world),payload});
   assert.equal(data.started,true,'seat accepts multiplayer offer '+id);
   assert.equal(data.phase,'running','seat '+id+' running');
   assert.equal(data.atlas,1,'seat '+id+' original troll atlas built once');
   assert.ok(data.grid>=70,'seat '+id+' uses accelerated tree and house collision grid');
   assert.equal(data.mobCount,80);
   assert.equal(data.boss,1);
   assert.ok(data.p95<65,'seat '+id+' single-frame budget pathological: '+data.p95);
   assert.equal(data.playerVisible,true);
   assert.deepEqual(errors,[],'no javascript exceptions seat '+id);
   metrics.push({id,p95:Math.round(data.p95*100)/100,grid:data.grid,atlas:data.atlas});
   await page.close();
  }
  console.log('V159 SIX CLIENT BROWSER PASS: six distinct seats, 80 typed monsters, original troll atlas, indexed geometry and 95 frames per seat');
  console.log('V159 SIX CLIENT FRAMES '+JSON.stringify(metrics));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
