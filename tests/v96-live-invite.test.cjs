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
  return page;
 }
 const setupFriend=async (page,id,name)=>page.evaluate(({id,name})=>{
  if(!SOCIAL.db)loadSocialData();
  SOCIAL.db.friends[id]={name,level:1,phase:'menu',room:null,seen:Date.now()};
  saveSocialData();socialDisconnect();startSocial();
 },{id,name});
 try{
  const host=await makePhone();const guest=await makePhone();
  const hostId=await host.evaluate(()=>ensureSocialIdentity()),guestId=await guest.evaluate(()=>ensureSocialIdentity());
  assert.notEqual(hostId,guestId,'two unique social identities');
  await setupFriend(host,guestId,'Guest');
  await setupFriend(guest,hostId,'Host');
  await host.evaluate(()=>{document.getElementById('coopBtn').click();document.getElementById('hostBtn').click()});
  await host.waitForFunction(()=>NET.role==='host'&&NET.phase==='lobby',{timeout:25000});
  const code=await host.evaluate(()=>NET.code);
  assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
  await host.waitForFunction(id=>!!SOCIAL.conns.get(id)?.open,guestId,{timeout:35000});
  await guest.waitForFunction(id=>!!SOCIAL.conns.get(id)?.open,hostId,{timeout:35000});
  console.log('LIVE_FRIENDS_ONLINE=yes');
  await host.evaluate(()=>window.__NS96_INVITES.toggle());
  const ui=await host.evaluate(()=>({button:!!document.querySelector('#ns96InviteToggle'),visible:!document.querySelector('#ns96InvitePanel').classList.contains('hidden'),friends:document.querySelectorAll('.ns96InviteFriend').length}));
  assert.equal(ui.visible,true);assert.equal(ui.friends,1);
  const invited=await host.evaluate(id=>window.__NS96_INVITES.invite(id),guestId);
  assert.equal(invited,true);console.log('LIVE_FRIEND_INVITED=yes');
  await guest.waitForFunction(()=>SOCIAL.action?.type==='invite'&&!document.getElementById('friendActionAlert').classList.contains('hidden'),{timeout:20000});
  const modal=await guest.evaluate(()=>({from:SOCIAL.action.name,room:SOCIAL.action.room,buttons:[!!document.getElementById('acceptFriendAction'),!!document.getElementById('rejectFriendAction')]}));
  assert.equal(modal.room,code);assert.deepEqual(modal.buttons,[true,true]);
  console.log('LIVE_INVITE_RECEIVED=yes');
  await guest.evaluate(()=>document.getElementById('acceptFriendAction').click());
  await guest.waitForFunction(()=>NET.role==='guest'&&NET.phase==='lobby'&&NET.worldReady,{timeout:30000});
  await host.waitForFunction(()=>NET.clients.size===1&&NET.phase==='lobby',{timeout:15000});
  assert.equal(await guest.evaluate(()=>NET.code),code);
  console.log('LIVE_INVITE_ACCEPTED_JOINED=yes');
  assert.deepEqual(errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)),[],'no runtime errors');
  console.log('PASS v96 real relay, two mobile Chromium browsers: known friends -> invite -> accept -> same room');
 }finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
