'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('Chromium is required for mobile lobby regression');
 const browser=await chromium.launch({headless:true,executablePath:bin,
  args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const width of [320,360,393,412]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
   try{
    await page.goto('file://'+path.join(__dirname,'../public/index.html')+'?lang=sr',
     {waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{
     document.querySelector('#coopPanel').classList.remove('hidden');
     document.querySelector('#coopSetup').classList.add('hidden');
     document.querySelector('#lobbyArea').classList.remove('hidden');
     window.NS165_CLASSIC_VOICE?.install?.();
     const modes=document.querySelector('#ns142MpModes');
     modes.replaceChildren();
     for(const label of ['KLASIČNI','NIGHT FLAME · LEVEL 3','NOVA ZONA · LEVEL 0+',
      'OPSADA · LEVEL 8','TAJNA KAPELA · USKORO']){
      const btn=document.createElement('button');btn.textContent=label;modes.append(btn);
     }
     const voice=document.querySelector('#ns165LobbyVoice');
     if(voice)voice.hidden=false;
     const hero=document.querySelector('#lobbyHeroSelect');
     hero.replaceChildren();const option=document.createElement('option');
     option.textContent='LOVKINJA · HERO NIVO 100';hero.append(option);
    });
    const sizes=await page.evaluate(()=>{
     const ids=['#coopPanel .lobbyBox','#lobbyArea','#lobbyHeroRow','#lobbyHeroSelect',
      '#lobbyModeRow','#lobbyModeSelect','#ns142MpModes','#ns165LobbyVoice'];
     const nodes=ids.flatMap(css=>[...document.querySelectorAll(css)]);
     nodes.push(...document.querySelectorAll('#ns142MpModes button,#ns165LobbyVoice button'));
     return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      nodes:nodes.filter(e=>!e.hidden).map(e=>{
       const r=e.getBoundingClientRect();
       return {id:e.id||e.textContent.slice(0,28),left:r.left,right:r.right,width:r.width};
      })};
    });
    assert(sizes.nodes.some(x=>x.id==='ns165LobbyVoice'),'voice card must exist');
    for(const p of sizes.nodes){
     assert(p.width>0&&p.right<=sizes.viewport+1&&p.left>=-1,
      'overflow at '+width+'px: '+JSON.stringify(p)+'; viewport '+sizes.viewport);
    }
    assert(sizes.scrollWidth<=sizes.viewport+1,'document must not overflow the horizontal viewport');
    console.log('V166 LOBBY MOBILE BROWSER PASS',width+'px',sizes.nodes.length+' measured elements');
   }finally{await page.close()}
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
