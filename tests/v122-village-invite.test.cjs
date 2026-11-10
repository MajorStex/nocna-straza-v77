'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const game=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const village=fs.readFileSync(path.join(__dirname,'../public/v115-village.js'),'utf8');
for(const item of ['V129 · BUILD WATERMARK','NS103_PARTY,NS96_INVITES,SOCIAL','expectJoin?.(code)','document.body.append(alert)','alert.style.zIndex=\'180\''])assert.ok(game.includes(item),'Missing game integration '+item);
for(const item of ["{id:'invite'","function showInviteHouse()","function startVillageInvites(","function onVillageLobbyReady()","expectJoin:expectVillageJoin","onLobbyUI:onVillageLobbyReady","NS96_INVITES?.invite(id)","NS103_PARTY.start(online)","'ns122Start'"])assert.ok(village.includes(item),'Missing village integration '+item);
for(const s of game.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/\bsrc=/.test(s[1]))new Function(s[2]);
new Function(village);console.log('V124 syntax and reuse of existing room protocol PASS');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 const errors=[];
 try{
  const host=await browser.newPage({viewport:{width:360,height:844},isMobile:true,hasTouch:true});
  host.on('pageerror',e=>errors.push('HOST '+e.message));
  await host.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1&village-fps=1',{waitUntil:'domcontentloaded'});
  await host.waitForFunction(()=>window.__VILLAGE_PREVIEW_STATUS?.open===true,{timeout:15000});
  assert.equal(await host.evaluate(()=>window.NS109_VILLAGE.test.buildings.length),8,'New Invite Hall is the eighth building');
  const enter=await host.evaluate(()=>window.NS109_VILLAGE.test.visit('invite'));
  assert.ok(enter,'Invite Hall must be reachable from the map');
  await host.waitForFunction(()=>!document.querySelector('#ns109Pane')?.classList.contains('ns109Hidden'),{timeout:12000});
  assert.match(await host.locator('#ns109Pane').innerText(),/INVITATION HALL/);
  const first=await host.evaluate(()=>{
   const b=window.__NS110_BRIDGE,NET=b.NET,party=b.NS103_PARTY,social=b.SOCIAL;
   const id='ABCD2345';social.db={friends:{[id]:{name:'Test Guardian',level:3}}};
   social.conns.set(id,{open:true,send:()=>{}});
   window.NS109_VILLAGE.openInvites();
   const orig=party.start;let calls=0,selected=[];
   party.start=ids=>{calls++;selected=ids;NET.role='host';NET.phase='lobby';NET.code='ABCD56';window.NS109_VILLAGE.onLobbyUI();return true};
   document.querySelector('#ns122Friends button').click();
   const state={calls,selected,role:NET.role,phase:NET.phase,room:NET.code,
    opened:window.NS109_VILLAGE.opened,shown:!window.NS109_VILLAGE.test.scene.classList.contains('ns109Hidden'),
    roomLink:location.origin+location.pathname+'?join='+NET.code};
   party.start=orig;return state;
  });
  assert.ok(first.calls===1&&first.selected[0]==='ABCD2345'&&first.role==='host'&&first.phase==='lobby'&&first.shown,'Exactly one existing host room, Village returns '+JSON.stringify(first));
  const second=await host.evaluate(()=>{
   const b=window.__NS110_BRIDGE;let calls=0;
   const original=b.NS96_INVITES.invite;b.NS96_INVITES.invite=id=>{calls++;return id==='ABCD2345'};
   window.NS109_VILLAGE.openInvites();
   document.querySelector('#ns122Friends button').click();
   b.NS96_INVITES.invite=original;
   return {calls,room:b.NET.code,host:b.NET.role,roomCodeButton:!!document.querySelector('#ns122RoomCode'),
     shareButton:!!document.querySelector('#ns122ShareLink'),startButton:!!document.querySelector('#ns122Start')};
  });
  assert.ok(second.calls===1&&second.room===first.room&&second.host==='host'&&second.roomCodeButton&&second.shareButton&&second.startButton,
   'Invites from existing lobby must reuse room and offer ready/start '+JSON.stringify(second));
  // A recipient accepts from a different browser; use the REAL accept and room join handlers,
  // but stub only the network dialer so CI never claims an actual remote relay handshake.
  const guest=await browser.newPage({viewport:{width:412,height:844},isMobile:true,hasTouch:true});
  guest.on('pageerror',e=>errors.push('GUEST '+e.message));
  await guest.goto('file://'+path.resolve(__dirname,'../public/index.html'),{waitUntil:'domcontentloaded'});
  await guest.waitForFunction(()=>!!window.NS109_VILLAGE&&!!window.__NS110_BRIDGE,{timeout:15000});
  const accepted=await guest.evaluate(()=>{
   const b=window.__NS110_BRIDGE;const outgoing=[];
   b.SOCIAL.db={friends:{ABCD2345:{name:'Inviter',level:2}}};
   b.SOCIAL.conns.set('ABCD2345',{open:true,send:msg=>outgoing.push(msg)});
   const join=document.querySelector('#joinBtn'),old=join.onclick;let joinCalls=0;
   join.onclick=()=>{joinCalls++;b.NET.role='guest';b.NET.phase='connecting';b.NET.code=document.querySelector('#joinCode').value};
   b.SOCIAL.action={type:'invite',id:'ABCD2345',name:'Inviter',room:'ABCD56',locked:false,level:2};
   document.querySelector('#acceptFriendAction').click();
   const joined={joinCalls,phase:b.NET.phase,room:b.NET.code,reply:outgoing.find(x=>x.t==='inviteAccepted')?.room,pending:window.NS109_VILLAGE.test.debug.pendingAutoRoom};
   b.NET.phase='lobby';window.NS109_VILLAGE.onLobbyUI();join.onclick=old;
   return {...joined,opened:window.NS109_VILLAGE.opened,
    shown:!window.NS109_VILLAGE.test.scene.classList.contains('ns109Hidden'),
    pendingAfter:window.NS109_VILLAGE.test.debug.pendingAutoRoom};
  });
  assert.ok(accepted.joinCalls===1&&accepted.phase==='connecting'&&accepted.reply==='ABCD56'&&accepted.room==='ABCD56'&&
    accepted.opened&&accepted.shown&&accepted.pendingAfter==='', 'Accepted invite opens same room in Village after lobby connection '+JSON.stringify(accepted));
  const dupe=await guest.evaluate(()=>{
   const b=window.__NS110_BRIDGE,existing=window.NS109_VILLAGE.test.scene;
   window.NS109_VILLAGE.expectJoin(b.NET.code);window.NS109_VILLAGE.onLobbyUI();
   return {nodes:document.querySelectorAll('#ns109Village').length,room:b.NET.code,same:existing===window.NS109_VILLAGE.test.scene,opened:window.NS109_VILLAGE.opened};
  });
  assert.ok(dupe.nodes===1&&dupe.same&&dupe.opened&&dupe.room===first.room,'Duplicate acceptance must not create another lobby '+JSON.stringify(dupe));
  assert.equal(errors.length,0,'JS exceptions '+errors.join(' | '));
  console.log('V124 TWO-BROWSER INVITE STATE PASS',JSON.stringify({host:first,repeat:second,guest:accepted,dupe}));
  await guest.close();await host.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
