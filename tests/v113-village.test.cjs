'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const src=fs.readFileSync(path.resolve(__dirname,'../public/v113/index.html'),'utf8');
const village=fs.readFileSync(path.resolve(__dirname,'../public/v111-village.js'),'utf8');
const inline=[...src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/\bsrc=|type=["']module/i.test(m[1]));
for(const [i,m] of inline.entries())new Function(m[2]);
new Function(village);
for(const x of ['ns110GateSeal','worldSend.acked','index+4','if(data.index>=0','slow?14:light?20:26','ns110VillageHome','canVisit','ns109Village','ns111VisualProps','ns111PreloadWorld'])assert.ok((src+village).includes(x),x);
assert.ok(!src.includes('VERZIJA V109 · SELO PREVIEW'));
console.log('V113 static syntax, map window, gate seam and scene: OK');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
 for(const [width,height] of [[360,844],[412,844],[780,650]]){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>{errors.push(String(e.stack||e));console.log('BROWSER ERROR',String(e).slice(0,500))});
  page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
  await page.goto('file://'+path.resolve(__dirname,'../public/v113/index.html'),{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1200);
  const state=await page.evaluate(()=>({api:!!window.NS109_VILLAGE,night:!!window.__nightWatch,auth:document.getElementById('ns82-auth')?.hidden,button:!!document.getElementById('ns110VillageHome'),phase:window.__nightWatch?.NET?.phase,mode:window.__nightWatch?.G?.mode}));
  console.log('BROWSER STATE',width,height,state,errors.slice(0,4));
  assert.ok(state.api&&state.night&&state.button,'V113 village must initialize '+JSON.stringify(state)+' '+errors.join(' | '));
  const result=await page.evaluate(()=>{
    const api=window.NS109_VILLAGE,game=window.__nightWatch;
    game.NET.role='';game.NET.phase='idle';game.G.mode='menu';
    const solo=api.open(),visible=!document.getElementById('ns109Village').classList.contains('ns109Hidden');
    const hasSeven=api.test.buildings.length===7,notEarned=api.test.spartaClaim(299)===false,earned=api.test.spartaClaim(300)===true;
    api.enter('shop');const originalShop=!document.getElementById('nsShopPanel').classList.contains('hidden');
    document.getElementById('nsShopClose').click();
    api.close();const restored=document.getElementById('ns109Village').classList.contains('ns109Hidden');
    return {solo,visible,hasSeven,notEarned,earned,originalShop,restored};
  });
  console.log('BROWSER TEST',width,height,result);
  assert.ok(Object.values(result).every(Boolean),'V113 scene regression '+JSON.stringify(result));
  await ctx.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
