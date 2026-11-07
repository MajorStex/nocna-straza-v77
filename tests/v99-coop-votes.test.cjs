'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
(async()=>{
 const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!executablePath)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 try{
  for(const width of [360,412]){
   const context=await browser.newContext({viewport:{width,height:820},isMobile:true,hasTouch:true});
   const page=await context.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html'),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__nightWatch&&!!window.__NS99_TEAM,{timeout:25000});
   await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
   const initial=await page.evaluate(()=>{
    const game=window.__nightWatch,net=game.NET,team=window.__NS99_TEAM;
    const packets=[];window.__ns99TestPackets=packets;
    net.role='host';net.phase='playing';net.localId='p1';net.round=8;net.code='ACD234';
    net.clients.set('p2',{open:true,bufferSize:0,send:p=>packets.push(p)});
    net.profiles.set('p2',{spec:{...game.FACTORY_HERO},ranks:{},heroBranches:{},spells:{},equipment:{},name:'Milan',heroName:'Lovkinja'});
    game.startGame({specialMode:'normal'});
    const p1=game.G.players.find(p=>p.id==='p1');
    const p2=game.G.players.find(p=>p.id==='p2');
    if(!p1||!p2)throw Error('two players not created');
    const epoch=net.round,oldTime=game.G.time;
    game.coopXP(p1,p1.xpNeed+20);
    return {stage:game.G.mode,paused:team.frozen(),levelOwner:team.currentLevel?.id,score:game.G.level,pauseButton:!document.getElementById('ns99PauseOpen').classList.contains('hidden'),levelCounter:document.getElementById('quickChoiceClock').textContent,hasMessage:packets.some(p=>p.t==='ns99State'&&p.round===epoch),time:oldTime};
   });
   assert.equal(initial.stage,'play');assert.equal(initial.paused,true,'all paused on host level-up');
   assert.equal(initial.levelOwner,'p1');assert.equal(initial.levelCounter,'3');
   assert.equal(initial.hasMessage,true);
   await page.waitForTimeout(480);
   const froze=await page.evaluate(()=>({frozen:window.__NS99_TEAM.frozen(),time:window.__nightWatch.G.time}));
   assert.equal(froze.frozen,true);
   assert.equal(froze.time,initial.time,'host authoritative time frozen during selection');
   await page.evaluate(()=>document.querySelector('#quickChoiceItems button')?.click());
   const afterPick=await page.evaluate(()=>{
     const game=window.__nightWatch,team=window.__NS99_TEAM;
     return{paused:team.frozen(),ownLevel:game.G.players[0].level,visible:!document.getElementById('quickChoicePanel').classList.contains('hidden')};
   });
   assert.equal(afterPick.paused,false,'host selects, all continue');
   assert.equal(afterPick.ownLevel,2);assert.equal(afterPick.visible,false);
   const remote=await page.evaluate(()=>{
     const g=window.__nightWatch,t=window.__NS99_TEAM,p=g.G.players.find(q=>q.id==='p2');
     g.coopXP(p,p.xpNeed+40);
     return{frozen:t.frozen(),owner:t.currentLevel?.id,offer:window.__ns99TestPackets.filter(x=>x.t==='powerOffer').at(-1)};
   });
   assert.equal(remote.frozen,true);assert.equal(remote.owner,'p2');
   assert.equal(remote.offer.ms,3000);
   // Host chooses default when phone does not respond within three seconds.
   await page.waitForTimeout(3300);
   const defaulted=await page.evaluate(()=>{
    const g=window.__nightWatch,t=window.__NS99_TEAM;
    return{frozen:t.frozen(),power:g.G.players.find(p=>p.id==='p2').damage,offer:t.currentLevel,controlsHidden:document.getElementById('controls').classList.contains('hidden')};
   });
   assert.equal(defaulted.frozen,false,'automatic selection releases all players');
   assert.equal(defaulted.offer,null);
   assert.ok(defaulted.power>0);
   const pause=await page.evaluate(()=>{
    const team=window.__NS99_TEAM;
    const started=team.request('pause','p1'),before=team.frozen();
    team.castVote('pause','p2','yes');
    const after=team.frozen(),manual=team.manualPaused;
    return{started,before,after,manual};
   });
   assert.equal(pause.started,true);assert.equal(pause.before,false,'request alone never pauses the room');
   assert.equal(pause.after,true);assert.equal(pause.manual,true,'all players voted YES');
   const resume=await page.evaluate(()=>{
    const team=window.__NS99_TEAM;
    const started=team.request('resume','p1'),before=team.frozen();
    team.castVote('resume','p2','yes');
    return {started,before,after:team.frozen(),manual:team.manualPaused};
   });
   assert.equal(resume.started,true);assert.equal(resume.before,true);
   assert.equal(resume.after,false);assert.equal(resume.manual,false);
   const veto=await page.evaluate(()=>{
    const team=window.__NS99_TEAM;team.reset();const started=team.request('pause','p1');
    team.castVote('pause','p2','no');
    return{started,paused:team.frozen(),ballot:team.ballot};
   });
   assert.equal(veto.started,true);assert.equal(veto.paused,false);assert.equal(veto.ballot,null);
   const disconnect=await page.evaluate(()=>{
     const g=window.__nightWatch,team=window.__NS99_TEAM;
     team.reset();
     // After disconnect, the only connected player may confirm pause/resume.
     g.NET.clients.delete('p2');
     const started=team.request('pause','p1');
     const frozen=team.frozen();
     team.peerLeft('p2');
     const resumed=team.request('resume','p1');
     return{started,frozen,resumed,finalFrozen:team.frozen(),ghostTracked:g.G.players.some(p=>p.id==='p2')};
   });
   assert.equal(disconnect.started,true);assert.equal(disconnect.frozen,true);
   assert.equal(disconnect.resumed,true);assert.equal(disconnect.finalFrozen,false);
   assert.equal(disconnect.ghostTracked,true);
   const sleep=await page.evaluate(()=>{
    const g=window.__nightWatch,team=window.__NS99_TEAM;
    team.visibility(true);const h=team.frozen();
    team.visibility(false);return{h,awake:team.frozen(),stillPlaying:g.NET.phase==='playing'};
   });
   assert.equal(sleep.h,true);assert.equal(sleep.awake,false);assert.equal(sleep.stillPlaying,true);
   assert.deepEqual(errs.filter(e=>/TypeError|ReferenceError|SyntaxError/i.test(e)),[],errs.join(' | '));
   console.log('PASS v99 '+width+'px: 3s host power, timeout, all-player freeze, unanimous pause/resume, veto, disconnect vote, background recovery.');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
