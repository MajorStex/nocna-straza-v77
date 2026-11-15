'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const client=fs.readFileSync(path.resolve(__dirname,'../public/v140-net-mode.js'),'utf8');
const audio=fs.readFileSync(path.resolve(__dirname,'../public/v152-arena-audio.js'),'utf8');
assert.match(html,/<title>Night Watch v160 — Noćna Straža<\/title>/);
assert.match(html,/v152-arena-audio\.js\?v=157/);
assert.match(html,/v140-net-mode\.js\?v=160/);
assert.ok(html.indexOf('v152-arena-audio.js')<html.indexOf('v140-net-mode.js'),
 'audio must load before New Zone client');
assert.doesNotMatch(client,/arena\.stop\(\);selectedMode='normal'/,
 'never silently send players back to old multiplayer');
assert.ok(client.includes("t:'leave'"),'leaving creator closes only their own arena seat');
assert.ok(client.includes('ns152Hud')&&client.includes('ns152Choice')&&client.includes('ns152Hurt'),
 'wave HUD, 3-choice chest and screen-hit feedback exist');
assert.ok(client.includes("t:'chestPick'"),'chest choices are transmitted to server');
assert.ok(client.includes('function buildSoloWave(wave)'),'solo practice has the same growing waves');
assert.ok(client.includes('function resolveSoloChest(option)'),'solo preview honors reward choices');
assert.ok(audio.includes('const CHORDS=')&&audio.includes('const MELODY='),
 'reuse original regular-mode sparse ambient theme');
assert.ok(audio.includes("function play(kind,options={})")&&audio.includes("kind==='step'")&&audio.includes("kind==='hurt'"),
 'local procedural footsteps/hit/weapon sounds are rate limited');
assert.ok(client.includes('A()?.play(\'swing\'')&&client.includes('A()?.play(\'hurt\''),
 'sound events follow authoritative attacks and HP changes');
new Function(client);new Function(audio);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:
 ['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
 args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [w,h] of [[360,844],[412,844],[832,394]]){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
   await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>');
   await page.evaluate(()=>{window.__NS110_BRIDGE={currentProfileLevel:()=>7,NET:{role:'',phase:'idle'},
    drawVillageHero:(g,x,y)=>{g.fillRect(x-3,y-8,6,16)},heroStyle:{weapon:'sword'}}});
   await page.addScriptTag({path:path.resolve(__dirname,'../public/v152-arena-audio.js')});
   await page.addScriptTag({path:path.resolve(__dirname,'../public/v140-net-mode.js')});
   const result=await page.evaluate(()=>{
    const api=window.NS140_ARENA;
    if(!api.startSolo())throw Error('solo did not start');
    api.frame(1000);api.frame(1034);
    const wave=document.getElementById('ns152Wave').textContent;
    const music=document.getElementById('ns152Music'),sound=document.getElementById('ns152Sound');
    const choice=document.getElementById('ns152Choice');
    const pre=window.NS152_AUDIO.music;
    music.click();const toggled=window.NS152_AUDIO.music!==pre;music.click();
    sound.click();const muted=!window.NS152_AUDIO.sound;sound.click();
    const viewport=document.querySelector('#ns140Root').getBoundingClientRect();
    const out={wave,muted,toggled,hasChoice:!!choice,choiceHidden:choice.hidden,
      music:!!music,sound:!!sound,w:viewport.width,h:viewport.height,
      mapW:api.diagnostics.playerX>=0,stepInput:true};
    api.stop();return out;
   });
   assert.equal(result.wave,'TALAS 1','wave is visible in practice mode');
   assert.ok(result.muted&&result.toggled&&result.hasChoice&&result.choiceHidden);
   assert.ok(result.music&&result.sound&&result.w>=w-2,'mobile layout fills game window');
   assert.deepEqual(errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)),[]);
   await page.close();
  }
 }finally{await browser.close()}
 console.log('V152 MOBILE PASS: expanded solo wave HUD, chest modal, audio/music toggles, no exceptions, 3 viewports');
})().catch(e=>{console.error(e);process.exit(1)});
