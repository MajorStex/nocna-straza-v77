'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright-core');
const file=path.resolve(__dirname,'../public/v159-troll-lab.html');
const html=fs.readFileSync(file,'utf8');
assert.match(html,/vizuelni test trola/);
assert.match(html,/function drawTroll\(e,model\)/);
assert.match(html,/window\.NS154_GOBLINS=/);
assert.match(html,/window\.NS159_TROLL=/);
assert.ok(!/fetch\(|new WebSocket\(|\.send\(JSON/.test(html),
 'standalone lab must have no remote game traffic');
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:360,height:780},{width:832,height:394}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
   const issues=[];page.on('pageerror',err=>issues.push(err.message));
   await page.goto(pathToFileURL(file).href);
   await page.waitForFunction(()=>document.querySelector('#stats').textContent.includes('FPS'),{timeout:10000});
   let status=await page.locator('#stats').textContent();
   assert.ok(status.includes('80'),'all 80 mobs available for test');
   assert.ok(status.includes('trol-atlas 1×'),'no repeated atlas rebuild');
   await page.locator('#amount').click();
   await page.waitForFunction(()=>document.querySelector('#stats').textContent.includes('/20'),{timeout:5000});
   await page.locator('#pause').click();
   assert.match(await page.locator('#pause').textContent(),/▶/);
   await page.locator('#pause').click();
   assert.match(await page.locator('#pause').textContent(),/⏸/);
   // The old corner compound is transferred geometrically and visually,
   // with the historical gate solid while locked and passable when opened.
   await page.locator('#area').click();
   assert.equal(await page.evaluate(()=>window.__NS159_LAB_TEST.area),'legacy');
   assert.equal(await page.evaluate(()=>window.__NS159_LAB_TEST.gateOpen),false);
   const closed=await page.evaluate(()=>{
    const lab=window.__NS159_LAB_TEST;
    for(let i=0;i<48;i++)lab.move(0,4);
    return {x:lab.playerPosition.x,y:lab.playerPosition.y,
     blocked:lab.clearAt(548,960),builds:lab.originalArtBuilds};
   });
   assert.equal(closed.blocked,false,'historical gate blocks center while locked');
   assert.ok(closed.y<=934,'character cannot walk through locked historic gate: '+closed.y);
   assert.ok(closed.builds>0,'legacy props rendered onto cached sprites');
   await page.locator('#gate').click();
   assert.equal(await page.evaluate(()=>window.__NS159_LAB_TEST.gateOpen),true);
   const opened=await page.evaluate(()=>{
    const lab=window.__NS159_LAB_TEST;
    for(let i=0;i<32;i++)lab.move(0,4);
    return {y:lab.playerPosition.y,clear:lab.clearAt(548,960),builds:lab.originalArtBuilds};
   });
   assert.equal(opened.clear,true,'open historical gate has no fake invisible collider');
   assert.ok(opened.y>975,'character passes through opened original gate: '+opened.y);
   assert.ok(opened.builds<=20,'map artwork variants are cached, not redrawn for 60 FPS');
   await page.locator('#area').click();
   assert.equal(await page.evaluate(()=>window.__NS159_LAB_TEST.area),'new');
   const target=page.locator('canvas');
   const dims=await target.boundingBox();
   assert.ok(dims.width>=350&&dims.height>=380,'responsive full phone canvas');
   await target.tap({position:{x:Math.floor(dims.width*.42),y:Math.floor(dims.height*.55)}});
   assert.deepEqual(issues,[],'no browser exceptions');
   status=await page.locator('#stats').textContent();
   console.log('V159 OFFLINE LAB '+viewport.width+'x'+viewport.height+' PASS: '+status);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
