'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../public');
const game=fs.readFileSync(path.join(root,'v140-net-mode.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'v162-sandbox.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new Function(game);new Function(lab);
assert.match(html,/<title>Night Watch v164/);
assert.match(html,/VERZIJA V164/);
assert(html.includes('v140-net-mode.js?v=164'));
for(const token of ['ns160Open','ns160LabScript','v162-sandbox.js?v=162','function soloLabAction(m)','function stepSoloAllies()','function sandboxState()','function drawLabThings('])
 assert(game.includes(token.replace('ns160-sandbox','ns160')),'Missing client lab integration '+token);
assert.match(game,/if\(opening&&N\.solo&&!N\.paused\)\{\s*toggleArenaPause\(true\)/,
 'open menu must pause solo on same click');
assert.match(game,/if\(this\.tickNo|N\.soloTick/);
assert.match(game,/if\(!LAB\.freezeAI\)/);
assert.match(game,/if\(!LAB\.godMode/);
assert.match(game,/LAB_SUPPORTED=LAB_SERVER_BUILD>=160/);
assert.match(game,/m\.t==='labState'/);
assert.match(game,/m\.t==='pauseState'/);
assert.match(game,/globalPaused:LAB_PAUSE\.paused/);
assert.match(game,/N\.soloWave=int\(m\.value,1,99,1\)/);
assert.match(game,/LAB\.customCount===null\?labDefaultCount\(wave\):LAB\.customCount/);
assert.match(game,/if\(!LAB\.enabled&&N\.soloState==='play'/);
assert.match(lab,/DEFAULT · talas/);
assert.match(lab,/Talas 1: 60/);
assert.match(lab,/data-tab/);
assert.match(lab,/data-cmd/);
assert.match(lab,/spawnAlly/);
assert.match(lab,/removeMob/);
assert.match(lab,/setMob/);
assert.match(lab,/window\.NS160_LAB=/);
assert.doesNotMatch(lab,/localStorage|indexedDB|coopXP|awardMP/,'sandbox must not persist progress');
console.log('V160 static PASS: SOLO auto pause, server-only MP edit, default waves, NPC inspector, allies, props, renderer and safe modal syntax');
if(process.env.NO_BROWSER==='1')process.exit(0);
const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:
  ['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:360,height:780},{width:832,height:394}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
   await page.setContent('<html><body></body></html>');
   await page.addScriptTag({path:path.join(root,'v157-arena-scenery.js')});
   await page.addScriptTag({content:'window.__NS110_BRIDGE={currentProfileLevel:()=>7,NET:null};'});
   await page.addScriptTag({path:path.join(root,'v162-troll.js')});
   await page.addScriptTag({path:path.join(root,'v140-net-mode.js')});
   await page.addScriptTag({path:path.join(root,'v162-sandbox.js')});
   assert.equal(await page.evaluate(()=>window.NS140_ARENA.startSolo()),true);
   await page.locator('#ns158MenuBtn').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).paused,true,'one click must pause SOLO');
   assert.equal(await page.locator('#ns157PauseOverlay').isVisible(),false,'pause overlay must not obscure menu');
   await page.locator('#ns160Open').click();
   assert.equal(await page.locator('#ns162Lab').isVisible(),true);
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).paused,false,
    'Sandbox resumes live solo gameplay immediately');
   await page.locator('[data-tab="waves"]').click();
   assert.match(await page.locator('#ns162Content').innerText(),/DEFAULT · talas 1/);
   await page.locator('#ns162wave').fill('2');
   await page.locator('[data-cmd="wave"]').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).soloWave,2);
   await page.locator('#ns162count').fill('3');
   await page.locator('[data-cmd="count"]').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).soloMobCount,3);
   await page.locator('[data-cmd="resetCount"]').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).soloMobCount,70,'restore default for current wave');
   await page.locator('[data-tab="mobs"]').click();
   await page.locator('[data-cmd="clearMobs"]').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).soloMobCount,0);
   await page.locator('#ns162quantity').fill('2');
   await page.locator('[data-cmd="spawnMob"]').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).soloMobCount,2);
   await page.locator('[data-tab="allies"]').click();
   await page.locator('[data-cmd="spawnAlly"]').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).labAllies,1);
   await page.locator('#ns162Close').click();
   assert.equal(await page.locator('#ns158Menu').isVisible(),false);
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).paused,false);
   await page.locator('#ns158MenuBtn').click();
   assert.equal((await page.evaluate(()=>window.NS140_ARENA.diagnostics)).paused,true);
   await page.close();
  }
  console.log('V160 CHROMIUM PASS: two mobile orientations, instant solo menu pause/resume, sandbox wave default/override, clear/spawn mobs and ally');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
