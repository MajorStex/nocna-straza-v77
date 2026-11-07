'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chrome/Chromium unavailable in CI');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const gamePage=await context.newPage(),runtimeErrors=[];
   gamePage.on('pageerror',e=>runtimeErrors.push(e.message));
   const res=await gamePage.goto('https://majorstex.github.io/nocna-straza-v92/',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(res?.status(),200,'public v92 loads');
   await gamePage.waitForFunction(()=>!!window.__nightWatch&&!!window.__NS91&&!!window.__NS92_DIR&&!!window.__NS92_CHALLENGES,{timeout:25000});
   assert.match(await gamePage.title(),/Night Watch v92/);
   const result=await gamePage.evaluate(()=>{
    const game=window.__nightWatch,ach=window.__NS91,daily=window.__NS92_CHALLENGES;
    game.startGame({specialMode:'normal'});
    if(game.G.mode!=='play')return {error:'SP did not start'};
    const hero=game.G.players[0];game.G.kills=99;
    const mob=game.addMob('crawler',hero.x+90,hero.y+90);mob.hp=1;
    game.killMob(mob,hero);
    const gear=game.NSX.armory.inventory.find(item=>item.uid?.endsWith('_k100'));
    const baseline={mode:game.G.mode,kills:game.G.kills,firstBadge:ach.owned('k100'),firstGear:gear?.rarity};
    const challenges=daily.list();
    for(const c of challenges){
      if(c.kind==='kills')game.G.kills=Math.max(game.G.kills,c.goal);
      if(c.kind==='wave')game.G.wave=c.goal;
      if(c.kind==='chests')game.G.chestsOpened=c.goal;
      if(c.kind==='worms')for(let i=0;i<c.goal;i++)daily.onKill({type:'worm'});
      if(c.kind==='trolls')for(let i=0;i<c.goal;i++)daily.onKill({type:'troll'});
      daily.evaluate();
    }
    const weekly=game.NSX.armory.inventory.find(i=>i.source==='weekly_challenge');
    const achievements=daily.list(),firstTeam=game.G.players.length;
    let mp=null;
    if(innerWidth>=400){
      const received=[],net=game.NET;
      for(let i=2;i<=6;i++){
       const id='p'+i;game.G.players.push({...hero,id,x:hero.x+i*20,y:hero.y+i*15,perks:{},perkTimers:{},dead:false});
       net.clients.set(id,{open:true,bufferSize:0,peer:'sim-'+i,send(packet){if(packet?.t==='snapshot')received.push({id,packet})}});
      }
      net.role='host';net.phase='playing';net.localId='p1';net.round=1;
      game.sendSnapshot();
      mp={sent:received.length,players:received.map(x=>x.packet.p.length),dailyWeeklyBits:received.map(x=>x.packet.c92?.b),bytes:received.map(x=>JSON.stringify(x.packet).length)};
    }
    return {...baseline,firstTeam,achievements:achievements.map(x=>({id:x.id,owned:x.owned})),weekly:weekly?.rarity,mask:ach.getMask(),mp};
   });
   assert.equal(result.mode,'play','SP starts');
   assert.equal(result.firstBadge,true,'100 kills unlocks');
   assert.equal(result.firstGear,'common','achievement item is Common');
   assert.equal(result.firstTeam,1,'SP starts with one hero');
   assert.deepEqual(result.achievements.map(x=>x.owned),[true,true],'daily & weekly complete');
   assert.equal(result.weekly,'common','weekly equipment Common');
   if(width>=400){
    assert.equal(result.mp.sent,5,'host transmitted five snapshots');
    assert.deepEqual(result.mp.players,[6,6,6,6,6],'six people in all peer snapshots');
    assert.deepEqual(result.mp.dailyWeeklyBits,[3,3,3,3,3],'daily and weekly masks share to all guests');
    assert.ok(result.mp.bytes.every(n=>n>100&&n<150000),'bounded snapshot payload');
   }
   // Isolated browser UI exercise. The directory endpoint is mocked so it works
   // even before the separate Cloudflare Worker deployment is authorized.
   const lobbyPage=await context.newPage();lobbyPage.on('pageerror',e=>runtimeErrors.push(e.message));
   await lobbyPage.route('**/api/lobbies',route=>route.fulfill({status:200,contentType:'application/json',
    headers:{'access-control-allow-origin':'*'},
    body:JSON.stringify({ok:true,version:2,rooms:[
     {code:'ABCD23',name:'Open Game',players:2,maxPlayers:6,locked:false,status:'waiting',mode:'normal',difficulty:'normal'},
     {code:'K7P3RX',name:'Locked Game',players:3,maxPlayers:4,locked:true,status:'waiting',mode:'night',difficulty:'hard'},
     {code:'R7T5WS',name:'Full Game',players:6,maxPlayers:6,locked:false,status:'waiting',mode:'normal',difficulty:'normal'}
    ]})}));
   await lobbyPage.goto('https://majorstex.github.io/nocna-straza-v92/',{waitUntil:'domcontentloaded',timeout:30000});
   await lobbyPage.waitForFunction(()=>!!window.__NS92_DIR);
   await lobbyPage.evaluate(()=>document.getElementById('coopBtn').click());
   await lobbyPage.waitForFunction(()=>document.querySelectorAll('.ns92Room').length===2,{timeout:15000});
   assert.equal(await lobbyPage.locator('#ns92Public').isChecked(),true,'public by default');
   assert.equal(await lobbyPage.locator('#ns92Locked').isChecked(),false,'unlocked by default');
   assert.equal(await lobbyPage.locator('#ns92Max').inputValue(),'6','six slots by default');
   await lobbyPage.locator('.ns92Room').nth(1).locator('button').click();
   assert.equal(await lobbyPage.locator('#joinCode').inputValue(),'K7P3RX','listing and code share the same join field');
   assert.equal(await lobbyPage.locator('#ns92JoinPass').count(),1,'password input exists for code joins');
   const errs=runtimeErrors.filter(x=>/ReferenceError|SyntaxError|is not defined|Cannot read properties of undefined|NS92_/i.test(x));
   assert.deepEqual(errs,[],'no runtime exceptions '+errs.join(' | '));
   console.log('PASS mobile Chromium '+width+'px: SP, 100-kill Common, daily/weekly claims, public room UI'+(width>=400?', five MP snapshots/6 players':''));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
