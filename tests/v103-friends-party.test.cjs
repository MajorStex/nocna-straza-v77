'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium required for mobile multiplayer test');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const url='file://'+path.resolve(__dirname,'../public/index.html');
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__nightWatch?.NS103_PARTY,{timeout:20000});
   await page.evaluate(()=>{
    const p=JSON.parse(localStorage.getItem('ns_player_profiles_v28')||'null');
    const active=p?.profiles?.find(x=>x.id===p.activeId);
    if(!active)throw Error('Missing original stored profile for v103 persistence test');
    active.friendId='ABCD2345';
    // Simulate importing a saved existing profile on a device without an anchor.
    localStorage.removeItem('ns82_stable_friend_v103_'+active.id);
    localStorage.setItem('ns_player_profiles_v28',JSON.stringify(p));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__nightWatch?.NS103_PARTY,{timeout:20000});
   const first=await page.evaluate(()=>({id:window.__nightWatch.socialId,saved:JSON.parse(localStorage.getItem('ns_player_profiles_v28')).profiles[0].friendId}));
   assert.equal(first.id,'ABCD2345','original Friend ID must survive hard reload');
   assert.equal(first.saved,'ABCD2345','identity must remain persisted in player account');
   await page.evaluate(()=>{
    const p=JSON.parse(localStorage.getItem('ns_player_profiles_v28'));
    p.profiles.find(x=>x.id===p.activeId).friendId='WRNG2345';
    localStorage.setItem('ns_player_profiles_v28',JSON.stringify(p));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__nightWatch?.NS103_PARTY,{timeout:20000});
   assert.equal(await page.evaluate(()=>window.__nightWatch.socialId),'ABCD2345','Friend ID must survive multiple reloads');
   const result=await page.evaluate(async()=>{
    const g=window.__nightWatch,social=g.SOCIAL,party=g.NS103_PARTY;
    g.showFriends();
    social.db.friends={
     FRAA2345:{name:'ŠTRBI',level:1,phase:'menu',seen:10},
     FRBB2345:{name:'ŠTRBI',level:3,phase:'menu',seen:30},
     FRCC2345:{name:'ŠTRBI',level:4,phase:'menu',seen:20},
     FRDD2345:{name:'MILICA',level:2,phase:'menu',seen:40}
    };
    social.db.chats={FRAA2345:[{me:true,text:'Keep chat history',date:1}]};
    const out=[];
    for(const id of ['FRBB2345','FRDD2345']){
     const conn={open:true,outgoing:true,send:o=>out.push({id,t:o.t,room:o.room})};
     social.conns.set(id,conn);
    }
    g.renderFriends();
    const root=document.getElementById('friendsList');
    const compactRows=root.querySelectorAll('.friendRow').length;
    const oldIdsHint=root.querySelector('.ns103Aliases')?.textContent||'';
    root.querySelector('.ns103Aliases button')?.click();
    const expandedRows=root.querySelectorAll('.friendRow').length;
    root.querySelector('.ns103Aliases button')?.click();
    const rowButton=[...root.querySelectorAll('.ns103StartOne')].find(b=>!b.disabled);
    party.select('FRBB2345',true);party.select('FRDD2345',true);
    const batchButton=document.getElementById('ns103StartSelected');
    const batchText=batchButton.textContent,batchEnabled=!batchButton.disabled;
    let hostClicked=0;
    const host=document.getElementById('hostBtn'),originalHost=host.onclick;
    host.onclick=()=>{hostClicked++};
    const originalInvite=window.__NS96_INVITES.invite;
    const invitations=[];
    window.__NS96_INVITES.invite=id=>{invitations.push(id);return true};
    const startResult=party.start(['FRBB2345','FRDD2345','FRBB2345','FRAA2345']);
    g.NET.role='host';g.NET.phase='lobby';g.NET.code='ABCD23';
    party.onLobbyReady();
    const queueCount=party.pending.size;
    g.NET.role='';g.NET.phase='idle';
    const popupBefore=document.getElementById('friendActionAlert').classList.contains('hidden');
    g.socialHandlePacket('FRBB2345',{t:'invite',id:'FRBB2345',name:'ŠTRBI',level:3,room:'ABCD23',locked:false},social.conns.get('FRBB2345'));
    const popupVisible=!document.getElementById('friendActionAlert').classList.contains('hidden');
    g.acceptSocialAction(false);
    const declined=out.some(e=>e.id==='FRBB2345'&&e.t==='inviteReject'&&e.room==='ABCD23');
    window.__NS96_INVITES.invite=originalInvite;host.onclick=originalHost;
    return {compactRows,oldIdsHint,expandedRows,rowButtonEnabled:!!rowButton,batchText,batchEnabled,
     startResult,hostClicked,invitations,queueCount,popupBefore,popupVisible,declined,
     chatPreserved:social.db.chats.FRAA2345[0].text,idsPreserved:Object.keys(social.db.friends).length};
   });
   assert.equal(result.compactRows,2,'older IDs of the same name should be collapsed, not deleted');
   assert.equal(result.expandedRows,4,'historic IDs must be inspectable and removable individually');
   assert.ok(result.oldIdsHint.includes('2'),'show duplicate count');
   assert.ok(result.rowButtonEnabled,'one-click Start Game With enabled for online friend');
   assert.equal(result.batchEnabled,true);
   assert.ok(result.batchText.includes('(2/5)'),'two selected friends');
   assert.equal(result.startResult,true);
   assert.equal(result.hostClicked,1,'create exactly one multiplayer room');
   assert.deepEqual(result.invitations.sort(),['FRBB2345','FRDD2345'],'auto invite unique online selected friends only');
   assert.equal(result.queueCount,0,'clear invitation queue after successful sends');
   assert.equal(result.popupBefore,true);assert.equal(result.popupVisible,true,'invite requires recipient accept or decline');
   assert.equal(result.declined,true,'invite decline is acknowledged');
   assert.equal(result.chatPreserved,'Keep chat history','old chat history retained');
   assert.equal(result.idsPreserved,4,'never delete old friend IDs silently');
   assert.deepEqual(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/.test(e)),[],errors.join(' | '));
   console.log('PASS V103 '+width+'px: reload-stable identity, duplicate history, one-room batch invites, manual invite consent, older chats');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
