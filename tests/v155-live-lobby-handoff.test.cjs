'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {chromium}=require('playwright-core');
 const browser=await chromium.launch({headless:true,
   executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
   args:['--no-sandbox','--disable-dev-shm-usage']});
 const pages=[];
 const url='https://nocna-straza-v77.stefanstevic1996.workers.dev/?v155-live-lobby='+Date.now();
 const mk=async(name)=>{
  const context=await browser.newContext({viewport:{width:380,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();pages.push({page,context});
  page.on('pageerror',e=>console.error('PAGE',name,e.message.slice(0,200)));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.__NS110_BRIDGE?.NET&&!!window.NSRelayPeer,{timeout:15000});
  await page.evaluate(name=>{const input=document.getElementById('mpNameInput');if(input)input.value=name},name);
  return page;
 };
 const until=async(page,fn,label,timeout=45000)=>{
  try{return await page.waitForFunction(fn,{polling:100,timeout})}
  catch(e){
   const diagnostics=await page.evaluate(()=>({net:{
    role:window.__NS110_BRIDGE?.NET?.role,
    phase:window.__NS110_BRIDGE?.NET?.phase,
    code:window.__NS110_BRIDGE?.NET?.code,
    localId:window.__NS110_BRIDGE?.NET?.localId,
    hostId:window.__NS110_BRIDGE?.NET?.hostId,
    worldReady:window.__NS110_BRIDGE?.NET?.worldReady,
    clients:[...(window.__NS110_BRIDGE?.NET?.clients?.keys()||[])],
    roster:window.__NS110_BRIDGE?.NET?.roster?.map(p=>p.id)
   },status:document.getElementById('netStatus')?.textContent})).catch(()=>null);
   throw Error(label+' '+JSON.stringify(diagnostics)+' '+String(e.message).slice(0,100));
  }
 };
 try{
  const host=await mk('HOST');
  await host.evaluate(()=>document.getElementById('hostBtn').click());
  await until(host,()=>window.__NS110_BRIDGE.NET.role==='host'&&window.__NS110_BRIDGE.NET.phase==='lobby',
   'initial host room ready');
  const code=await host.evaluate(()=>window.__NS110_BRIDGE.NET.code);
  assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  console.log('V155 LIVE LOBBY: host p1 opened code',code);
  const guest=await mk('GUEST P2');
  await guest.evaluate(code=>{document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},code);
  await until(guest,()=>window.__NS110_BRIDGE.NET.role==='guest'&&
    window.__NS110_BRIDGE.NET.phase==='lobby'&&window.__NS110_BRIDGE.NET.worldReady,
    'guest p2 fully joined and loaded map');
  const guestIds=[await guest.evaluate(()=>window.__NS110_BRIDGE.NET.localId)];
  assert.deepEqual(guestIds,['p2'],'preserve stable guest seat');
  console.log('V155 LIVE LOBBY: two phones connected',guestIds);
  await host.evaluate(()=>document.getElementById('lobbyExitBtn').click());
  await until(guest,()=>window.__NS110_BRIDGE.NET.role==='host'&&
    window.__NS110_BRIDGE.NET.phase==='lobby'&&window.__NS110_BRIDGE.NET.hostId==='p2',
    'p2 promoted to owner of same lobby');
  assert.equal(await guest.evaluate(()=>window.__NS110_BRIDGE.NET.code),code);
  console.log('V155 LIVE LOBBY PASS: p1 left, p2 took SAME code');
  // Start-button eligibility must work after promotion, not just text saying HOST.
  const button=await guest.evaluate(()=>({visible:!document.getElementById('lobbyStartBtn')?.classList.contains('hidden'),
    role:window.__NS110_BRIDGE.NET.role,id:window.__NS110_BRIDGE.NET.localId,
    clients:[...window.__NS110_BRIDGE.NET.clients.keys()]}));
  assert.equal(button.visible,true,'successor has Start Match controls');
  assert.equal(button.role,'host');
  console.log('V155 LIVE LOBBY START CONTROL PASS:',JSON.stringify(button));
 }finally{for(const {page,context} of pages){try{await page.close()}catch{}try{await context.close()}catch{}}await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
