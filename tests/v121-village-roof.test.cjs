'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const village=fs.readFileSync(path.join(__dirname,'../public/v115-village.js'),'utf8');
assert.ok(html.includes('VERZIJA V121 · VILLAGE DEPTH'));
for(const tag of ['function villageHouseSprite(','function drawDepthHouse(','depthItems.sort(','depthOrder:lastDepthOrder.slice()','const layer=villageStaticLayer()']){
 assert.ok(village.includes(tag),'Missing depth fix '+tag);
}
new Function(village);
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1010,height:760},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1&village-fps=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:14000});
  const pixel=async(x,y)=>page.evaluate(({x,y})=>{
   const scene=document.querySelector('#ns109Scene'),r=scene.getBoundingClientRect();
   const scale=r.height>r.width*1.28?Math.min(r.height/540,r.width/320):Math.min(r.width/960,r.height/540);
   const ox=(r.width-960*scale)/2,oy=(r.height-540*scale)/2;
   const ix=Math.round((ox+x*scale)*scene.width/r.width),iy=Math.round((oy+y*scale)*scene.height/r.height);
   return [...scene.getContext('2d').getImageData(ix,iy,1,1).data];
  },{x,y});
  await page.waitForTimeout(250);
  const baseline=await pixel(454,70);
  const behind=await page.evaluate(()=>window.NS109_VILLAGE.test.testMove(454,75));
  assert.ok(behind,'Test position behind roof should be walkable');
  await page.waitForTimeout(180);
  const behindDebug=await page.evaluate(()=>window.NS109_VILLAGE.test.debug);
  const behindPixel=await pixel(454,70);
  assert.ok(behindDebug.depthOrder.indexOf('hero:p1')<behindDebug.depthOrder.indexOf('house:guardian'),
   'Character behind house must render BEFORE its roof '+JSON.stringify(behindDebug.depthOrder));
  assert.deepEqual(behindPixel,baseline,'The roof must hide the hero at the center roof pixel');
  const front=await page.evaluate(()=>window.NS109_VILLAGE.test.testMove(454,242));
  assert.ok(front,'Test position in front of door should be walkable');
  await page.waitForTimeout(200);
  const frontDebug=await page.evaluate(()=>window.NS109_VILLAGE.test.debug);
  assert.ok(frontDebug.depthOrder.indexOf('house:guardian')<frontDebug.depthOrder.indexOf('hero:p1'),
   'Character in front must render AFTER the building '+JSON.stringify(frontDebug.depthOrder));
  assert.equal(frontDebug.cachedHouses,7,'Only seven compact house sprites should be cached');
  assert.ok(frontDebug.staticBuilds===1,'Terrain still cached once');
  assert.ok(errors.length===0,'Browser JS exceptions: '+errors.join(' | '));
  console.log('V121 ROOF OCCLUSION PASS',JSON.stringify({baseline,behindPixel,back:behindDebug.depthOrder,front:frontDebug.depthOrder,houseSprites:frontDebug.cachedHouses}));
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
