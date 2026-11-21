'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const binary=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!binary)throw Error('Chromium needed for V246 mobile swipe test');
 const browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 let checks=0;
 try{
  for(const [width,height] of [[393,844],[844,393]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
   try{
    await page.goto('file://'+path.join(__dirname,'../public/index.html'),{waitUntil:'domcontentloaded'});
    for(const count of [1,2,6]){
     await page.evaluate(count=>{
      document.querySelector('#coopPanel').classList.remove('hidden');
      document.querySelector('#coopSetup').classList.add('hidden');
      document.querySelector('#lobbyArea').classList.remove('hidden');
      const roster=document.querySelector('#lobbyRoster');roster.replaceChildren();
      for(let i=1;i<=count;i++){
       const row=document.createElement('div');row.className='lobbyPlayer'+(i===1?' you':'');
       const face=document.createElement('span');face.className='ns72AvatarFace';face.textContent='🛡';
       const who=document.createElement('span');who.className='lobbyPerson';
       const name=document.createElement('strong');name.textContent='⚔ GUARDIAN '+i;
       const rank=document.createElement('small');rank.textContent='PLAYER '+i+' · ACCOUNT LEVEL 10 · HERO LOVKINJA';
       const state=document.createElement('span');state.className='lobbyState ready';state.textContent='✓ READY';
       who.append(name,rank);row.append(face,who,state);
       if(i>1){const friend=document.createElement('button');friend.className='ns74-lobby-friend';friend.textContent='+ PRIJATELJ';friend.addEventListener('click',()=>{window.__rosterTap=(window.__rosterTap||0)+1});row.append(friend);}
       if(i>1){const kick=document.createElement('button');kick.className='ns106KickBtn';kick.textContent='IZBACI';row.append(kick);}
       roster.append(row);
      }
     },count);
     const cs=await page.evaluate(()=>{
      const x=document.querySelector('#lobbyRoster'),panel=document.querySelector('#coopPanel .lobbyBox');
      return {maxHeight:getComputedStyle(x).maxHeight,overflow:getComputedStyle(x).overflowY,touch:getComputedStyle(x).touchAction,
       rows:x.children.length,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight};
     });
     assert.equal(cs.rows,count,'roster has exactly '+count+' players');
     assert.equal(cs.maxHeight,'none','roster must not have a max-height');
     assert.equal(cs.overflow,'visible','roster must never trap scroll on '+count+' players');
     assert.equal(cs.touch,'pan-y','roster accepts vertical gestures');
     assert(cs.scrollHeight>cs.clientHeight+50,'whole lobby must overflow naturally');
     checks+=5;
     for(const targetKind of ['avatar','name',...(count>1?['friend','kick']:[])]){
      await page.evaluate(()=>{
       const panel=document.querySelector('#coopPanel .lobbyBox'),roster=document.querySelector('#lobbyRoster');
       panel.scrollTop=0;
       panel.scrollTop+=roster.getBoundingClientRect().top-panel.getBoundingClientRect().top-75;
      });
      const css=targetKind==='avatar'?'#lobbyRoster .ns72AvatarFace':targetKind==='name'?'#lobbyRoster .lobbyPerson':targetKind==='friend'?'#lobbyRoster .ns74-lobby-friend':'#lobbyRoster .ns106KickBtn';
      const box=await page.locator(css).first().boundingBox();
      assert(box,'target exists: '+targetKind);
      const sc=page.locator('#coopPanel .lobbyBox');
      const before=await sc.evaluate(el=>el.scrollTop);
      // CDP dispatches real touchscreen gestures; a mouse drag would not test touch-action.
      const cdp=await page.context().newCDPSession(page);
      const x=Math.round(box.x+box.width*.55),y=Math.round(box.y+box.height*.5);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let j=1;j<=8;j++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-j*19}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForTimeout(120);
      const after=await sc.evaluate(el=>el.scrollTop);
      assert(after>before+12,width+'x'+height+': '+count+' players, swipe over '+targetKind+' must scroll lobby ('+before+' -> '+after+')');
      checks++;
      await cdp.detach();
     }
    }
   }finally{await page.close()}
  }
 }finally{await browser.close()}
 console.log('V246 MOBILE CHROMIUM ROSTER SWIPE PASS',JSON.stringify({checks,players:[1,2,6],viewports:['393x844','844x393']}));
})().catch(e=>{console.error(e);process.exitCode=1});
