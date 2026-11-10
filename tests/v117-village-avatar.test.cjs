'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const game=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const village=fs.readFileSync(path.join(__dirname,'../public/v115-village.js'),'utf8');
const preview=fs.readFileSync(path.join(__dirname,'../public/village-test/index.html'),'utf8');
for(const text of ['ns117DrawVillageHero','drawUprightHero({','finally{ctx=original}','getVillageHeroLook:ns117VillageLook'])assert.ok(game.includes(text),text);
for(const text of ['drawVillageHero(g,x,y','function moveStick(e)','function blockedVillage','if(tapOnly)tap(e)','window.__VILLAGE_PREVIEW_STATUS','const keyX='])assert.ok(village.includes(text),text);
assert.ok(preview.includes("location.replace('../?village-test=1"),'Preview uses actual game, not demo sprite');
for(const m of game.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/\bsrc=/.test(m[1]))new Function(m[2]);
new Function(village);console.log('V117 static syntax and integration PASS');
(async()=>{
 const {chromium}=require('playwright-core');
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Boolean(window.__VILLAGE_PREVIEW_STATUS),{timeout:12000});
   const status=await page.evaluate(()=>window.__VILLAGE_PREVIEW_STATUS);
   assert.ok(status.open&&status.authenticHero&&status.buildings===8&&status.sheep===4,'Real engine Village opened '+JSON.stringify(status));
   const result=await page.evaluate(()=>{
    const bridge=window.__NS110_BRIDGE,api=window.NS109_VILLAGE,scene=document.querySelector('#ns109Scene'),b=scene.getBoundingClientRect();
    const canvas=document.createElement('canvas');canvas.width=110;canvas.height=135;const ctx=canvas.getContext('2d');
    const render=()=>{ctx.clearRect(0,0,110,135);return bridge.drawVillageHero(ctx,55,88,{id:'p1',look:bridge.getVillageHeroLook('p1'),walking:true,frame:2,visualSide:1})};
    const rendered=render(),a=ctx.getImageData(0,0,110,135).data;
    const style=bridge.heroStyle,old=style.wardrobe.topColor;style.wardrobe.topColor='#f000ee';
    render();const newer=ctx.getImageData(0,0,110,135).data;style.wardrobe.topColor=old;
    let differences=0;for(let i=0;i<a.length;i+=4)if(a[i]!==newer[i]||a[i+1]!==newer[i+1]||a[i+2]!==newer[i+2])differences++;
    const before=api.test.position;
    const cx=b.left+b.width*.45,cy=b.top+b.height*.55;
    scene.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:22,clientX:cx,clientY:cy,pointerType:'touch'}));
    scene.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:22,clientX:cx+66,clientY:cy,pointerType:'touch'}));
    return {rendered,differences,before,stickVisible:!document.getElementById('ns117Stick').classList.contains('ns109Hidden')};
   });
   await page.waitForTimeout(380);
   const after=await page.evaluate(()=>window.NS109_VILLAGE.test.position);
   assert.ok(result.rendered&&result.differences>15,'Hero gear must affect actual sprite '+JSON.stringify(result));
   assert.ok(result.stickVisible&&after.x>result.before.x+5,'Touch joystick should move hero '+JSON.stringify({result,after}));
   assert.equal(errors.length,0,'Runtime error '+errors.join(' | '));
   console.log('V117 mobile PASS',width,JSON.stringify({pixels:result.differences,deltaX:after.x-result.before.x}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
