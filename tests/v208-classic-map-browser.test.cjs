'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);assert(executablePath);const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});try{
 const page=await browser.newPage({viewport:{width:412,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const input=fs.readFileSync('public/index.html','utf8'),mark='window.__nightWatch={';
 assert(input.includes(mark));const fixture=path.resolve('public/.v208-map-fixture-'+process.pid+'.html');
 const hook="window.__ns208Test={prepare(){startGame();G.paused=true;document.getElementById('ns208ZoomFit').click();draw();return {scale:worldScale(),v:viewSize(),w:WORLD.w,h:WORLD.h,fences:props.filter(p=>p.type==='fence').length,gate:props.some(p=>p.type==='gate'),camera:{...G.camera}}},reset(){document.getElementById('ns208ZoomReset').click();return worldScale()}};";
 fs.writeFileSync(fixture,input.replace(mark,hook+mark));
 try{
 await page.goto('file://'+fixture+'?v208-map-test=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.__ns208Test?.prepare==='function');
 const state=await page.evaluate(()=>window.__ns208Test.prepare());
 assert(state.fences>=20&&state.gate);assert(state.v.w>=state.w-1&&state.v.h>=state.h-1);assert(Math.abs(state.camera.x-state.w/2)<1&&Math.abs(state.camera.y-state.h/2)<1);
 fs.mkdirSync('qa-artifacts',{recursive:true});
 const dl=page.waitForEvent('download');await page.evaluate(()=>document.getElementById('ns208MapPNG').click());const png=await dl;await png.saveAs('qa-artifacts/classic-full-map.png');const buf=fs.readFileSync('qa-artifacts/classic-full-map.png');assert.equal(buf.readUInt32BE(16),2400);assert.equal(buf.readUInt32BE(20),2400);
 const jl=page.waitForEvent('download');await page.evaluate(()=>document.getElementById('ns208MapJSON').click());await (await jl).saveAs('qa-artifacts/classic-layout.json');const layout=JSON.parse(fs.readFileSync('qa-artifacts/classic-layout.json'));assert.equal(layout.w,4200);assert(layout.props.some(p=>p.type==='gate'));assert(layout.props.filter(p=>p.type==='fence').length>=20);
 const reset=await page.evaluate(()=>window.__ns208Test.reset());assert.equal(reset,.9);
 const critical=errors.filter(e=>/ns208|ReferenceError|TypeError/.test(e));assert.deepEqual(critical,[]);console.log('V208 CLASSIC ZOOM & ACTUAL MAP PNG/JSON PASS',state.fences,layout.props.length,buf.length);
 await page.close();
 }finally{fs.rmSync(fixture,{force:true})}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
