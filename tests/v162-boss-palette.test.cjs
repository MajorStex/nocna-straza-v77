'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../public');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const client=read('v140-net-mode.js'),palette=read('v162-sandbox.js'),
 bossArt=read('v162-troll.js'),html=read('index.html');
for(const js of [client,palette,bossArt])new Function(js);
assert.match(html,/<title>Night Watch v163/);
assert.match(html,/v162-troll\.js\?v=162/);
assert.match(html,/v140-net-mode\.js\?v=163/);
assert(html.indexOf('v162-troll.js')<html.indexOf('v140-net-mode.js'));
assert.match(client,/script\.src='\.\/v162-sandbox\.js\?v=162'/);
assert.match(client,/if\(wave===10&&spawnList\.length\)/);
assert.match(client,/kind:'troll',hp:900,maxHp:900/);
assert.match(client,/const bosses=mobs\.filter\(m=>m\.kind==='troll'/);
assert.match(client,/window\.NS162_TROLL\?\.drawOne/);
assert.match(client,/kind=q\[8\]===1\?'troll':'goblin'/);
assert.match(palette,/data-preview="troll"/);
assert.match(palette,/data-preview="goblin"/);
assert.match(palette,/get blocksInput\(\)\{return false\}/);
assert.match(palette,/#ns162Lab\{position:fixed;inset:0;z-index:100020;pointer-events:none/);
assert.match(palette,/id="ns162Expand"/);
assert.match(palette,/id="ns162MiniSpawn"/);
assert.doesNotMatch(palette,/localStorage|sessionStorage|indexedDB|awardMP|coopXP/);
const start=client.indexOf('function soloHordePoints(){'),end=client.indexOf('// Test-only actions:',start);
assert(start>=0&&end>start);
const env={N:{world:{obstacles:[]},soloSpawnCache:null,
 players:new Map([['p1',{id:'p1',x:130,y:250,hp:100,knocked:false}]])},
 LAB:{customCount:null},labDefaultCount:w=>Math.min(80,60+Math.max(0,w-1)*10),
 Math,clamp:(x,min,max)=>Math.max(min,Math.min(max,x))};
vm.createContext(env);vm.runInContext(client.slice(start,end),env,{timeout:1000});
assert.equal(env.buildSoloWave(9).filter(m=>m.kind==='troll').length,0);
const ten=env.buildSoloWave(10);
assert.equal(ten.length,80);
assert.equal(ten.filter(m=>m.kind==='troll').length,1);
assert.equal(ten.find(m=>m.kind==='troll').hp,900);
env.LAB.customCount=3;
assert.equal(env.buildSoloWave(10).length,3);
assert.equal(env.buildSoloWave(10).filter(m=>m.kind==='troll').length,1);
env.LAB.customCount=1;
assert.equal(env.buildSoloWave(10)[0].kind,'troll');
console.log('V162 STATIC PASS: original boss wave, troll preview icon, non-blocking dock and safe asset order');
if(process.env.NO_BROWSER==='1')process.exit(0);
const {chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:360,height:780},{width:832,height:394}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>');
   await page.evaluate(()=>window.__NS110_BRIDGE={currentProfileLevel:()=>7,NET:{role:'',phase:'idle'},
     drawVillageHero:(g,x,y)=>{g.fillRect(x-4,y-12,8,24)},heroStyle:{weapon:'sword'}});
   for(const file of ['v154-goblin-renderer.js','v157-arena-scenery.js','v162-troll.js','v140-net-mode.js','v162-sandbox.js'])
    await page.addScriptTag({path:path.join(root,file)});
   assert.equal(await page.evaluate(()=>window.NS140_ARENA.startSolo()),true);
   await page.locator('#ns158MenuBtn').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).paused,true);
   await page.locator('#ns160Open').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).paused,false);
   assert.equal(await page.locator('#ns162Lab').isVisible(),true);
   const iconCount=await page.evaluate(()=>{
    const cvs=[...document.querySelectorAll('canvas[data-preview]')];
    return cvs.filter(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
     return d.some((x,i)=>i%4===3&&x>0)}).length;
   });
   assert.equal(iconCount,2,'both mini icons render without downloading textures');
   await page.locator('[data-tab="waves"]').click();
   await page.locator('#ns162wave').fill('10');
   await page.locator('[data-cmd="wave"]').click();
   let d=await page.evaluate(()=>window.NS140_ARENA.diagnostics);
   assert.equal(d.soloBossCount,1);
   assert.equal(d.soloBossHp,900);
   await page.locator('#ns162Expand').click();
   assert.equal(await page.locator('#ns162Lab').evaluate(el=>el.classList.contains('mini')),true);
   d=await page.evaluate(()=>window.NS140_ARENA.diagnostics);
   assert.equal(d.paused,false,'minimized palette does not pause player');
   const moved=await page.evaluate(()=>{
    const api=window.NS140_ARENA,initial=api.diagnostics.playerY;
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',bubbles:true}));
    api.frame(1000);api.frame(1033);api.frame(1066);api.frame(1099);
    window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',bubbles:true}));
    return api.diagnostics.playerY<initial;
   });
   assert.equal(moved,true,'player movement still works with minimized palette');
   await page.locator('#ns162Expand').click();
   await page.locator('[data-tab="mobs"]').click();
   await page.locator('[data-enemy="troll"]').click();
   await page.locator('[data-cmd="clearMobs"]').click();
   await page.locator('[data-cmd="spawnMob"]').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).soloBossCount,1);
   assert.deepEqual(errors,[]);
   await page.close();
  }
 }finally{await browser.close()}
 console.log('V162 MOBILE PASS: portrait+landscape icons, live movement, minibutton, real boss and no canvas crashes');
})().catch(e=>{console.error(e);process.exitCode=1});
