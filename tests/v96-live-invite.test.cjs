'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium missing');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const contexts=[],errors=[],url='https://majorstex.github.io/nocna-straza-v96/';
 async function makePhone(){
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  contexts.push(c);const page=await c.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const result=await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  assert.equal(result?.status(),200,'v96 is live');
  await page.waitForFunction(()=>!!window.__NS96_INVITES&&!!window.__nightWatch,{timeout:25000});
  await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
  await page.evaluate(()=>document.getElementById('friendsBtn').click());
  await page.waitForFunction(()=>/^[A-Z2-9]{8}$/.test(document.getElementById('friendsMyId').textContent),{timeout:12000});
  return page;
 }
 try{
  const host=await makePhone(),guest=await makePhone();
  const hostId=await host.locator('#friendsMyId').textContent(),guestId=await guest.locator('#friendsMyId').textContent();
  assert.notEqual(hostId,guestId,'unique identities');
  console.log('FRIEND_IDS_CREATED=yes');
  await host.evaluate(id=>{document.getElementById('friendIdInput').value=id;document.getElementById('addFriendBtn').click()},guestId);
  await guest.waitForFunction(()=>!document.getElementById('friendActionAlert').classList.contains('hidden')&&document.getElementById('friendActionTitle').textContent.includes('PRIJATELJSTVO'),{timeout:35000});
  await guest.evaluate(()=>document.getElementById('acceptFriendAction').click());
  await host.waitForFunction(()=>document.querySelectorAll('#friendsList .friendRow').length===1,{timeout:25000});
  console.log('LIVE_FRIEND_REQUEST_ACCEPTED=yes');
  await host.evaluate(()=>document.getElementById('friendsBack').click());
  await guest.evaluate(()=>document.getElementById('friendsBack').click());
  await host.evaluate(()=>{document.getElementById('coopBtn').click();document.getElementById('hostBtn').click()});
  await host.waitForFunction(()=>window.__nightWatch.NET.role==='host'&&window.__nightWatch.NET.phase==='lobby',{timeout:25000});
  const code=await host.evaluate(()=>window.__nightWatch.NET.code);
  assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  console.log('LIVE_ROOM_CREATED=yes');
  await host.evaluate(()=>document.getElementById('ns96InviteToggle').click());
  await host.waitForFunction(()=>{const b=document.querySelector('#ns96InviteList .ns96InviteFriend button');return b&&!b.disabled&&b.textContent.includes('INVITE')},{timeout:35000});
  assert.equal(await host.locator('#ns96InviteList .ns96InviteFriend').count(),1);
  await host.evaluate(()=>document.querySelector('#ns96InviteList .ns96InviteFriend button').click());
  console.log('LIVE_FRIEND_INVITED=yes');
  await guest.waitForFunction(()=>!document.getElementById('friendActionAlert').classList.contains('hidden')&&document.getElementById('friendActionTitle').textContent.includes('POZIV'),{timeout:20000});
  console.log('LIVE_INVITE_RECEIVED=yes');
  await guest.evaluate(()=>document.getElementById('acceptFriendAction').click());
  await guest.waitForFunction(()=>window.__nightWatch.NET.role==='guest'&&window.__nightWatch.NET.phase==='lobby'&&window.__nightWatch.NET.worldReady,{timeout:30000});
  await host.waitForFunction(()=>window.__nightWatch.NET.clients.size===1&&window.__nightWatch.NET.phase==='lobby',{timeout:15000});
  assert.equal(await guest.evaluate(()=>window.__nightWatch.NET.code),code);
  console.log('LIVE_INVITE_ACCEPTED_JOINED=yes');
  assert.deepEqual(errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)),[],'no runtime errors');
  console.log('PASS v96 real relay and two mobile Chromium browsers: add friend -> accept -> in-lobby invite -> accept -> same room');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
