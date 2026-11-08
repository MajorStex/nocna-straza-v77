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
   await page.waitForFunction(()=>!!window.__nightWatch?.NS93_MAGIC&&!!window.__nightWatch?.startGame,{timeout:25000});
   await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
   const result=await page.evaluate(()=>{
    const game=window.__nightWatch;
    const dock=document.getElementById('ns93SpellDock'),mana=document.getElementById('ns93ManaValue'),
      pause=document.getElementById('pausePanel'),target=document.getElementById('ns93Target'),
      list=document.getElementById('ns93SpellList');
    const displayed=el=>!!el&&getComputedStyle(el).display!=='none'&&el.getClientRects().length>0;
    const state=()=>({game:game.G.mode,paused:game.G.paused,spell:displayed(dock),mana:displayed(mana),button:displayed(list.firstElementChild),
      pause:displayed(pause),hidden:dock.classList.contains('hidden'),target:target.style.display});
    game.NET.role='';game.NET.phase='idle';
    game.startGame({specialMode:'normal'});
    game.NS93_MAGIC.renderHud();
    const initial=state();
    document.getElementById('pauseBtn').click();
    const paused=state();
    // World update returns early during pause; UI must still be correct NOW.
    game.update(.025);
    const stillPaused=state();
    document.getElementById('resumeBtn').click();
    const resumed=state();
    // Simulate casting target left on screen and moving to editor while in play.
    target.style.display='block';
    document.getElementById('editDuringBtn').click();
    const editor=state();
    document.getElementById('exitEditor').click();
    const afterEditor=state();
    document.getElementById('pauseBtn').click();
    const again=state();
    document.getElementById('mainMenuBtn').click();
    const home=state();
    return {initial,paused,stillPaused,resumed,editor,afterEditor,again,home,
      versions:[document.getElementById('ns102MenuVersion').textContent,
       document.querySelector('#pausePanel .ns102Version').textContent,document.querySelector('#coopPanel .ns102Version').textContent],
      pageTitle:document.title};
   });
   assert.match(result.pageTitle,/Night Watch v104/);
   assert.ok(result.versions.every(s=>s.includes('V104')),'V104 in main/pause/co-op menus');
   assert.equal(result.initial.game,'play');assert.equal(result.initial.spell,true,'spell visible when actually playing');
   assert.equal(result.initial.mana,true,'mana visible when actually playing');
   for(const x of [result.paused,result.stillPaused,result.again]){
    assert.equal(x.paused,true,'real paused state');assert.equal(x.pause,true,'pause menu visible');
    assert.equal(x.spell,false,'spell icon fully hidden over pause menu');
    assert.equal(x.mana,false,'mana bar fully hidden over pause menu');
    assert.equal(x.button,false,'magic button fully hidden over pause menu');
    assert.equal(x.hidden,true,'spell dock explicitly hidden without waiting for frame update');
    assert.equal(x.target,'none','spell targeting ring dismissed on pause');
   }
   assert.equal(result.resumed.paused,false);
   assert.equal(result.resumed.spell,true,'spell visible immediately after resume');
   assert.equal(result.resumed.mana,true,'mana visible immediately after resume');
   assert.equal(result.editor.spell,false,'spell hidden while editing');
   assert.equal(result.editor.mana,false,'mana hidden while editing');
   assert.equal(result.editor.target,'none','spell aiming dismissed on editor entry');
   assert.equal(result.afterEditor.spell,true,'spell restored after returning from editor');
   assert.equal(result.afterEditor.mana,true,'mana restored after returning from editor');
   assert.equal(result.home.spell,false,'spell hidden on home menu');
   assert.equal(result.home.mana,false,'mana hidden on home menu');
   assert.deepEqual(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/i.test(e)),[],errors.join(' | '));
   console.log('PASS V104 '+width+'px: spell/mana hidden instantly on pause and editor, visible after resume, absent from main menu');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
