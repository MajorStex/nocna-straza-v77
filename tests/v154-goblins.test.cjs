'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../public'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'v140-net-mode.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'v154-goblin-renderer.js'),'utf8');
assert.match(html,/<title>Night Watch v155 — Noćna Straža<\/title>/);
assert.ok(html.indexOf('v154-goblin-renderer.js')<html.indexOf('v140-net-mode.js'));
assert.match(client,/q\[0\]<96/,'all 80 goblins are accepted from server');
assert.match(client,/NS154_GOBLINS\.draw/,'cached renderer is actually used');
assert.match(client,/drawArenaMobs\(g,now,dt,visible\)/,'viewport bounds passed to renderer');
assert.match(client,/N\.hordeTotal/,'stress population visible in HUD');
assert.match(renderer,/spriteAtlas\(\)/,'pre-rendered animation frames');
assert.match(renderer,/mob\.movingUntil/,'walking phases follow displacement');
assert.match(renderer,/if\(x<visible\.left/,'offscreen enemies skipped');
new Function(client);new Function(renderer);
// Extract isolated offline spawn code (no browser/window/WebSocket required).
const start=client.indexOf('function soloHordePoints(){'),end=client.indexOf('function soloWaveDone(){',start);
assert.ok(start>=0&&end>start);
const obstacles=[
 {x:275,y:140,w:95,h:92},{x:585,y:330,w:102,h:94},{x:435,y:245,w:75,h:84},
 {x:165,y:350,w:87,h:58},{x:790,y:170,w:126,h:104},{x:1120,y:275,w:106,h:110},
 {x:1230,y:650,w:140,h:110},{x:720,y:730,w:116,h:100},{x:1005,y:875,w:120,h:90},
 {x:395,y:785,w:100,h:105},{x:1460,y:410,w:110,h:104},{x:1020,y:485,w:94,h:94}
];
const ctx={N:{world:{obstacles},soloSpawnCache:null},Math,
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
vm.createContext(ctx);vm.runInContext(client.slice(start,end),ctx,{timeout:1000});
for(const [wave,n] of [[1,60],[2,70],[3,80],[6,80]]){
 const mobs=ctx.buildSoloWave(wave);
 assert.equal(mobs.length,n,'solo mode wave '+wave+' mirrors multiplayer');
 assert.equal(new Set(mobs.map(m=>m.x+','+m.y)).size,n,'each goblin spawns at a distinct point');
}
(async()=>{
 const {chromium}=require('playwright-core');
 const browser=await chromium.launch({headless:true,executablePath:
  ['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [w,h] of [[360,780],[832,394]]){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<html><body></body></html>');
   await page.addScriptTag({path:path.join(root,'v154-goblin-renderer.js')});
   const out=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=832;c.height=600;
    const g=c.getContext('2d'),R=window.NS154_GOBLINS;
    const mobs=Array.from({length:80},(_,id)=>({id,x:24+(id%10)*72,y:50+Math.floor(id/10)*67,
      hp:35,maxHp:35,attackTick:-100,hitTick:-100,facing:1}));
    const bounds={left:0,right:360,top:0,bottom:400};
    const draw=(now)=>R.draw(g,mobs,{solo:false,tick:20,now,lastState:now,alpha:1,visible:bounds});
    const visible=draw(1000),ready=R.atlasReady;
    for(let i=0;i<30;i++){for(const m of mobs)m.x+=.7;draw(1016+i*16)}
    const walking=mobs.some(m=>m.movingUntil>0&&m.animDistance>0);
    const full=R.draw(g,mobs,{solo:false,tick:40,now:1500,lastState:1500,alpha:1,
      visible:{left:0,right:900,top:0,bottom:700}});
    return {visible,full,ready,walking};
   });
   assert.ok(out.ready&&out.walking&&out.visible>0&&out.visible<80,'offscreen culling with animated walking');
   assert.equal(out.full,80,'all 80 goblins drawable when camera sees entire arena');
   assert.deepEqual(errors,[],'browser should not report animation exceptions');
   await page.close();
  }
  console.log('V154 GOBLIN RENDER PASS: 60/70/80 solo, cached sprites, animated walking, mobile culling and 80-creep draw');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
