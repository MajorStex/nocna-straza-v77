'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const commit='b9ed2047ffe3e8eb29b6f7c5c8ff2a59641db39f';
const url='https://rawcdn.githack.com/MajorStex/nocna-straza-v77/'+commit+'/public/v159-troll-lab.html';
(async()=>{
 const response=await fetch(url,{headers:{'accept':'text/html','user-agent':'NightWatch-V159-Test/1.0'}});
 assert.equal(response.status,200,'preview CDN must return HTTP 200');
 const type=response.headers.get('content-type')||'';
 assert.ok(type.includes('text/html'),'preview CDN must serve playable HTML, got '+type);
 const remote=await response.text();
 const local=fs.readFileSync(path.resolve(__dirname,'../public/v159-troll-lab.html'),'utf8');
 assert.equal(remote,local,'immutable preview link must serve EXACT tested V159 HTML');
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:360,height:780},isMobile:true,hasTouch:true});
  await context.addCookies([{name:'__Http-phish',value:'1',url:'https://rawcdn.githack.com/',
   secure:true,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const nav=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(nav.status(),200);
  await page.waitForFunction(()=>document.querySelector('#stats')?.textContent.includes('FPS'),
   {timeout:15000});
  assert.deepEqual(errors,[],'CDN preview must run without JS errors');
  assert.ok((await page.title()).includes('v159'),'expected v159 title');
  await page.locator('#area').click();
  assert.equal(await page.evaluate(()=>window.__NS159_LAB_TEST.area),'legacy','original map toggle on CDN');
  assert.equal(await page.evaluate(()=>window.__NS159_LAB_TEST.clearAt(548,960)),false,'locked gate CDN');
  await page.locator('#gate').click();
  assert.equal(await page.evaluate(()=>window.__NS159_LAB_TEST.clearAt(548,960)),true,'opened gate CDN');

  console.log('V159 PREVIEW LINK PASS: '+url);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
