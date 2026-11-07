'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 const file='file://'+path.resolve(__dirname,'../public/index.html');
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(file,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__nightWatch&&!!window.__NS97_POST,{timeout:20000});
   await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
   const setup=await page.evaluate(()=>{
    const g=window.__nightWatch,n=g.NET;
    n.role='host';n.phase='lobby';n.localId='p1';n.hostId='p1';n.code='ACD234';n.round=5;n.sessionToken='test-v97';
    n.clients.set('p2',{open:true,send(packet){window.__ns97Packets.push(packet)}});
    n.profiles.set('p2',{name:'Milan',heroName:'Lovkinja',friendId:'A2B3C4D5',level:2,heroLevel:1,ranksTotal:0,avatarId:'guardian'});
    n.worldReadyPlayers.set('p2',true);
    n.readyPlayers.set('p2',false);window.__ns97Packets=[];
    // Existing default player nickname is independent from chosen character.
    g.activeAccount.name='STRAŽAR';
    g.startGame({specialMode:'normal'});
    n.phase='playing';g.G.time=88;g.G.wave=5;g.G.kills=14;
    g.G.players[0].runKills=8;g.G.players[0].runRevives=1;g.G.players[0].runKnockdowns=2;g.G.players[0].runWeaponDamage=165;g.G.players[0].runShards=2;
    g.G.players[1].runKills=6;g.G.players[1].runRevives=0;g.G.players[1].runKnockdowns=1;g.G.players[1].runWeaponDamage=88;
    const ok=g.finishNetworkRound(false),r=n.ns97Results;
    return {ok,phase:n.phase,round:n.round,result:r,hasInvite:!!document.getElementById('ns96InviteToggle'),visible:!document.getElementById('ns97Results').classList.contains('hidden'),packets:window.__ns97Packets.filter(x=>x.t==='roundOver'||x.t==='lobby')};
   });
   assert.equal(setup.ok,true,'host ends round');
   assert.equal(setup.phase,'lobby');
   assert.equal(setup.visible,true,'scoreboard visible in the same lobby');
   assert.equal(setup.hasInvite,true,'existing friends-invite UI remains');
   assert.equal(setup.result.players.length,2);
   assert.equal(setup.result.players[0].name,'STRAŽAR 1','default nickname does not become hunter character name');
   assert.equal(setup.result.players[1].name,'Milan','guest nickname preserved');
   assert.deepEqual(setup.result.players.map(p=>p.kills),[8,6]);
   assert.deepEqual(setup.result.players.map(p=>p.revives),[1,0]);
   assert.deepEqual(setup.result.players.map(p=>p.downs),[2,1]);
   assert.equal(setup.result.players[0].weaponDamage,165);
   assert.ok(setup.packets.some(x=>x.post?.players.length===2),'host includes stats in round-end/lobby messages');
   assert.match(await page.locator('#ns97Scoreboard').innerText(),/Milan/);
   assert.match(await page.locator('#ns97Scoreboard').innerText(),/Lovkinja/);
   assert.match(await page.locator('#ns97Scoreboard').innerText(),/165/);
   assert.match(await page.locator('#ns97VoteProgress').innerText(),/0\/2/);
   const voted=await page.evaluate(()=>{
    const g=window.__nightWatch,post=window.__NS97_POST;
    assert: 1;
    post.vote('yes');
    post.receiveVote('p2',{round:g.NET.round,choice:'no'});
    const blocked=g.NET.phase==='lobby'&&!g.NET.ns97Results.startAt;
    post.receiveVote('p2',{round:g.NET.round,choice:'yes'});
    return {blocked,yes:g.NET.ns97Results?.votes,scheduled:!!g.NET.ns97Results?.startAt,
      oldReadyHidden:document.getElementById('lobbyReadyBtn').classList.contains('hidden'),
      oldForceHidden:document.getElementById('lobbyForceBtn').classList.contains('hidden')};
   });
   assert.equal(voted.blocked,true,'one NO prevents replay');
   assert.equal(voted.yes.p1,'yes');assert.equal(voted.yes.p2,'yes');
   assert.equal(voted.scheduled,true,'unanimous yes schedules rematch');
   assert.equal(voted.oldReadyHidden,true,'old ready button hidden while voting');
   assert.equal(voted.oldForceHidden,true,'host force-start hidden while voting');
   await page.waitForFunction(()=>window.__nightWatch.NET.phase==='playing'&&window.__nightWatch.NET.round===6,{timeout:9500});
   assert.equal(await page.locator('#ns97Results').evaluate(el=>el.classList.contains('hidden')),true,'results clear on new round');
   assert.deepEqual(errors.filter(x=>/ReferenceError|TypeError|SyntaxError|is not defined/i.test(x)),[],'no browser runtime exceptions '+errors.join(' | '));
   await context.close();
  }
  // Guest receives host-owned results and can only submit vote, not start a round.
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await context.newPage();await p.goto(file,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.__NS97_POST&&window.__nightWatch);
  const guest=await p.evaluate(()=>{
   const g=window.__nightWatch,n=g.NET;n.role='guest';n.phase='lobby';n.round=2;n.localId='p2';n.hostId='p1';n.code='ACD234';n.roster=[
     {id:'p1',name:'Igrac',ready:false,heroName:'Lovkinja'},
     {id:'p2',name:'Milan',ready:false,heroName:'Ratnik'}];
   const sends=[];n.conn={open:true,send:x=>sends.push(x)};
   const sample={version:1,round:2,win:false,seconds:68,wave:4,kills:12,votes:{p1:'yes'},players:[
      {id:'p1',name:'Igrac',hero:'Lovkinja',kills:9,level:4,weaponDamage:230},
      {id:'p2',name:'Milan',hero:'Ratnik',kills:3,level:2,weaponDamage:40}
   ]};
   const accepted=window.__NS97_POST.receive(sample);g.showLobbyUI();
   const voted=window.__NS97_POST.vote('yes');
   return {accepted,voted,sends,phase:n.phase,visible:!document.getElementById('ns97Results').classList.contains('hidden')};
  });
  assert.equal(guest.accepted,true);assert.equal(guest.visible,true);assert.equal(guest.phase,'lobby');
  assert.deepEqual(guest.sends,[{t:'ns97Vote',round:2,choice:'yes'}],'guest submits just an authenticated vote request');
  await context.close();
  console.log('PASS v97: nickname/hero split, post-match stats, veto, unanimous auto-replay, guest voting, both phone sizes.');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
