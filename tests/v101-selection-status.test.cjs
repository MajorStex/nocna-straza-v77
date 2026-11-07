'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
 for(const width of [360,412]){
  const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'../public/index.html'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__nightWatch&&!!window.__NS99_TEAM,{timeout:25000});
  await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
  const r=await page.evaluate(()=>{
   const game=window.__nightWatch,net=game.NET,team=window.__NS99_TEAM,packets=[];
   net.role='host';net.phase='playing';net.localId='p1';net.round=101;
   net.clients.set('p2',{open:true,bufferSize:0,send:p=>packets.push(p)});
   net.profiles.set('p2',{spec:{...game.FACTORY_HERO},ranks:{},heroBranches:{},spells:{},equipment:{},name:'Milan',heroName:'Lovkinja'});
   game.startGame({specialMode:'normal'});
   const me=game.G.players.find(p=>p.id==='p1'),other=game.G.players.find(p=>p.id==='p2');
   game.coopXP(me,me.xpNeed+1);
   const myLevel=document.getElementById('ns99PauseBanner').textContent;
   team.select('p1','damage');
   game.coopXP(other,other.xpNeed+1);
   const guestLevel=document.getElementById('ns99PauseBanner').textContent;
   team.select('p2','damage');
   const dummyChest={seed:101001,opened:false};
   game.showLootChoice(me,dummyChest);
   const ownChest=document.getElementById('ns99PauseBanner').textContent,
     ownFrozen=team.frozen(),ownChestOffer=team.state().c,
     chestButton=document.querySelector('#chestCards button');
   if(chestButton)chestButton.click();
   const afterOwnChest={frozen:team.frozen(),banner:document.getElementById('ns99PauseBanner').textContent};
   net.pendingOffers.set('p2',{type:'chest',deadline:game.G.time+7,items:[{id:'heart'}],chestSeed:101002});
   const started=team.beginChest('p2',7),remoteChest=document.getElementById('ns99PauseBanner').textContent,
     packetChest=packets.some(p=>p.t==='ns99State'&&p.state.c?.id==='p2');
   team.currentChest.deadline=Date.now()-5;team.tick();
   const afterTimeout={frozen:team.frozen(),pending:net.pendingOffers.has('p2')};
   team.reset();net.role='guest';net.localId='p3';net.roster=[{id:'p2',name:'Milan'},{id:'p3',name:'Nina'}];
   const accepted=team.receive({v:1,seq:101,m:0,h:0,l:null,c:{id:'p2',at:Date.now()+7000},b:null});
   const guestChest=document.getElementById('ns99PauseBanner').textContent;
   team.receive({v:1,seq:102,m:0,h:0,l:null,c:null,b:null});
   const guestCleared=document.getElementById('ns99PauseBanner').classList.contains('hidden');
   return{myLevel,guestLevel,ownChest,ownFrozen,ownChestOffer,ownChestButton:!!chestButton,afterOwnChest,started,remoteChest,packetChest,afterTimeout,accepted,guestChest,guestCleared};
  });
  assert.match(r.myLevel,/choosing|biraš/i);
  assert.match(r.guestLevel,/Milan.*(choosing|bira)/i);
  assert.equal(r.ownFrozen,true);assert.equal(r.ownChestOffer.id,'p1');assert.ok(r.ownChestButton);
  assert.match(r.ownChest,/chest|sanduka/i);
  assert.equal(r.afterOwnChest.frozen,false);
  assert.equal(r.started,true);assert.match(r.remoteChest,/Milan.*(chest|sanduka)/i);
  assert.equal(r.packetChest,true);
  assert.equal(r.afterTimeout.frozen,false);assert.equal(r.afterTimeout.pending,false);
  assert.equal(r.accepted,true);assert.match(r.guestChest,/Milan.*(chest|sanduka)/i);
  assert.equal(r.guestCleared,true);
  assert.deepEqual(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/i.test(e)),[],errors.join(' | '));
  console.log('PASS v101 '+width+'px: player names, level pause, chest pause, host/guest, timeout and release');
  await context.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
