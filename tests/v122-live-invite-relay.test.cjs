'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright-core');
const url='https://nocna-straza-v77.stefanstevic1996.workers.dev/?v=123&online-invite-qa=1';
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[];
 try{
  const a=await browser.newContext({viewport:{width:360,height:844},isMobile:true,hasTouch:true});
  const b=await browser.newContext({viewport:{width:412,height:844},isMobile:true,hasTouch:true});
  const host=await a.newPage(),guest=await b.newPage();
  for(const [name,page] of [['HOST',host],['GUEST',guest]]){page.on('pageerror',e=>errors.push(name+':'+e.message));page.on('console',m=>{if(m.type()==='error')errors.push(name+':'+m.text().slice(0,150))})}
  await Promise.all([host.goto(url,{waitUntil:'domcontentloaded',timeout:35000}),guest.goto(url,{waitUntil:'domcontentloaded',timeout:35000})]);
  await Promise.all([host.waitForFunction(()=>!!window.NS109_VILLAGE&&!!window.__NS110_BRIDGE,{timeout:18000}),guest.waitForFunction(()=>!!window.NS109_VILLAGE&&!!window.__NS110_BRIDGE,{timeout:18000})]);
  const [hostId,guestId]=await Promise.all([host.evaluate(()=>window.__NS110_BRIDGE.ensureSocialIdentity()),guest.evaluate(()=>window.__NS110_BRIDGE.ensureSocialIdentity())]);
  assert.ok(hostId!==guestId,'Friend identity must be unique per browser');
  const addFriend=(page,id,name)=>page.evaluate(({id,name})=>{
   const bridge=window.__NS110_BRIDGE,s=bridge.SOCIAL;
   if(!s.db)s.db={friends:{},chats:{}};
   s.db.friends[id]={name,level:1,phase:'menu',room:null,seen:Date.now()};
   bridge.startSocial();
   if(s.connected)bridge.socialCheckFriends();
  },{id,name});
  await Promise.all([addFriend(host,guestId,'Guest Test'),addFriend(guest,hostId,'Host Test')]);
  await Promise.all([
   host.waitForFunction(id=>window.__NS110_BRIDGE.SOCIAL.conns.get(id)?.open===true,guestId,{timeout:27000}),
   guest.waitForFunction(id=>window.__NS110_BRIDGE.SOCIAL.conns.get(id)?.open===true,hostId,{timeout:27000})
  ]);
  console.log('LIVE SOCIAL P2P CONNECTED',JSON.stringify({hostId,guestId}));
  await host.evaluate(()=>{window.NS109_VILLAGE.open();window.NS109_VILLAGE.openInvites();});
  assert.equal(await host.locator('#ns122Friends button').count(),1,'One online friend available');
  await host.evaluate(()=>document.querySelector('#ns122Friends button').click());
  await host.waitForFunction(()=>{const n=window.__NS110_BRIDGE.NET;return n.role==='host'&&n.phase==='lobby'&&n.code.length===6},{timeout:30000});
  const room=await host.evaluate(()=>window.__NS110_BRIDGE.NET.code);
  console.log('LIVE EXISTING LOBBY HOSTED',room);
  await guest.waitForFunction(()=>window.__NS110_BRIDGE.SOCIAL.action?.type==='invite'&&!document.getElementById('friendActionAlert').classList.contains('hidden'),{timeout:23000});
  await guest.evaluate(()=>document.getElementById('acceptFriendAction').click());
  await guest.waitForFunction(code=>{const n=window.__NS110_BRIDGE.NET;return n.role==='guest'&&n.phase==='lobby'&&n.code===code&&window.NS109_VILLAGE.opened},room,{timeout:30000});
  await host.waitForFunction(()=>window.__NS110_BRIDGE.currentLobbyRoster().length===2,{timeout:15000});
  const [hostState,guestState]=await Promise.all([host.evaluate(()=>{const b=window.__NS110_BRIDGE;return {role:b.NET.role,phase:b.NET.phase,code:b.NET.code,players:b.currentLobbyRoster().length,village:window.NS109_VILLAGE.opened}}),guest.evaluate(()=>{const b=window.__NS110_BRIDGE;return {role:b.NET.role,phase:b.NET.phase,code:b.NET.code,players:b.currentLobbyRoster().length,village:window.NS109_VILLAGE.opened}})]);
  assert.ok(hostState.village&&guestState.village&&hostState.code===guestState.code&&hostState.players===2,'Both browsers joined same real room '+JSON.stringify({hostState,guestState}));
  await guest.evaluate(()=>document.getElementById('lobbyReadyBtn').click());
  await host.waitForFunction(()=>window.__NS110_BRIDGE.currentLobbyRoster().some(p=>p.id!=='p1'&&p.ready),{timeout:10000});
  console.log('LIVE V123 RELAY INVITE ACCEPT + VILLAGE + READY PASS',JSON.stringify({room,hostState,guestState,errors:errors.slice(0,4)}));
  // The normal host-authoritative START path must transition this SAME room into
  // the existing gameplay engine. No new room, ID, or relay is created.
  await host.waitForFunction(()=>{const b=document.getElementById('lobbyStartBtn');return b&&!b.disabled},{timeout:18000});
  const startInfo=await host.evaluate(()=>{
    window.NS109_VILLAGE.openInvites();
    const btn=document.getElementById('ns122Start');
    if(!btn)return {error:'Missing start button'};
    btn.click();
    const n=window.__NS110_BRIDGE.NET;
    return {room:n.code,phase:n.phase,button:btn.textContent};
  });
  assert.ok(!startInfo.error&&startInfo.room===room,'START must reuse original room '+JSON.stringify(startInfo));
  await Promise.all([
   host.waitForFunction(()=>window.__NS110_BRIDGE.NET.phase==='playing',{timeout:18000}),
   guest.waitForFunction(()=>window.__NS110_BRIDGE.NET.phase==='playing',{timeout:18000})
  ]);
  const playing=await Promise.all([host.evaluate(()=>({code:window.__NS110_BRIDGE.NET.code,village:window.NS109_VILLAGE.opened,mode:window.__NS110_BRIDGE.G.mode})),guest.evaluate(()=>({code:window.__NS110_BRIDGE.NET.code,village:window.NS109_VILLAGE.opened,mode:window.__NS110_BRIDGE.G.mode}))]);
  assert.ok(playing.every(p=>p.code===room&&p.mode==='play'&&!p.village),'Both browsers must enter the same normal game '+JSON.stringify(playing));
  console.log('LIVE V123 SAME ROOM -> NORMAL GAME PASS',JSON.stringify({room,playing}));
  await Promise.all([host.close(),guest.close(),a.close(),b.close()]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
