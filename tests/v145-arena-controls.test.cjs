'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const source=fs.readFileSync(path.resolve(__dirname,'../public/v140-net-mode.js'),'utf8');
assert.match(html,/<title>Night Watch v149 — Noćna Straža<\/title>/);
assert.match(html,/v140-net-mode\.js\?v=149/);
assert.match(source,/const resetStick=\(\)=>/);
assert.match(source,/canvas\.addEventListener\('pointerdown'/);
assert.match(source,/pad\.style\.left=e\.clientX\+'px'/);
assert.match(source,/pad\.style\.top=e\.clientY\+'px'/);
assert.match(source,/canvas\.setPointerCapture\(e\.pointerId\)/);
assert.match(source,/function updateHeroMotion\(p,dt\)/);
assert.match(source,/walking:motion\.walking/);
assert.doesNotMatch(source,/frame:now\/110,walking:true,visualSide:1/);
assert.match(source,/me\.attackAngle=Math\.atan2\(target\.y-me\.y,target\.x-me\.x\)/);
assert.match(source,/function drawTargetedSlash\(g,p,m\)/);
assert.match(source,/g\.arc\(0,0,53,from,to\)/);
assert.doesNotMatch(source,/g\.arc\(p\.x,p\.y,54,-\.8,\.7\)/);
assert.doesNotMatch(source,/coopXP|awardMP|localStorage\.setItem/);
new Function(source);
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 assert.ok(bin,'Chrome required for mobile touch test');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [w,h] of [[360,844],[412,844],[832,394]]){
   const page=await browser.newPage({viewport:{width:w,height:h},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;height:100vh"></body></html>');
   await page.evaluate(()=>{
    window.__draws=[];
    window.__NS110_BRIDGE={currentProfileLevel:()=>7,NET:{role:'',phase:'idle'},drawVillageHero:(g,x,y,o)=>{
     window.__draws.push({walking:o.walking,side:o.visualSide,frame:o.frame});
     g.fillRect(x-5,y-10,10,20);
    }};
   });
   await page.addScriptTag({path:path.resolve(__dirname,'../public/v140-net-mode.js')});
   const out=await page.evaluate(()=>{
    const api=window.NS140_ARENA;
    if(!api.startSolo())throw Error('solo arena could not start');
    const canvas=document.getElementById('ns140Canvas');
    const pad=document.getElementById('ns140Pad');
    const ev=(node,name,id,x,y,pointerType='touch')=>node.dispatchEvent(new PointerEvent(name,{
     bubbles:true,cancelable:true,pointerId:id,pointerType,clientX:x,clientY:y,isPrimary:id===21
    }));
    const started={visible:!pad.classList.contains('active'),display:getComputedStyle(pad).display};
    api.frame(1000);api.frame(1017); // idle before player input
    const idle=window.__draws.at(-1);
    const px=Math.round(innerWidth*.29),py=Math.round(innerHeight*.49);
    ev(canvas,'pointerdown',21,px,py);
    const down={active:api.diagnostics.joystickActive,left:pad.style.left,top:pad.style.top,
      display:getComputedStyle(pad).display};
    ev(canvas,'pointermove',21,px+80,py+9);
    const moved={x:api.diagnostics.stickX,y:api.diagnostics.stickY,
      knob:document.getElementById('ns140Knob').style.transform};
    api.frame(1052);api.frame(1086);
    const walking={x:api.diagnostics.playerX,flag:api.diagnostics.walking,render:window.__draws.at(-1),autoHit:api.diagnostics.soloGoblinHp.some(h=>h<35),auto:api.diagnostics.autoAttack,angle:api.diagnostics.attackAngle};
    ev(canvas,'pointerup',21,px+80,py+9);
    api.frame(1102);
    const release={active:api.diagnostics.joystickActive,flag:api.diagnostics.walking,render:window.__draws.at(-1),
      display:getComputedStyle(pad).display};
    // A second gesture at an unrelated position must anchor a new pad.
    const x2=Math.round(innerWidth*.62),y2=Math.round(innerHeight*.72);
    ev(canvas,'pointerdown',23,x2,y2);
    const respawn={left:pad.style.left,top:pad.style.top,active:api.diagnostics.joystickActive};
    ev(canvas,'pointermove',23,x2-75,y2);
    api.frame(1136);api.frame(1170);
    const left={direction:api.diagnostics.stickX,side:window.__draws.at(-1).side};
    ev(canvas,'pointerup',23,x2-75,y2);
    // Auto-attack is always enabled near goblins; there is NO Attack control.
    const attack={buttonAbsent:!document.getElementById('ns140Hit'),
      automatic:api.diagnostics.autoAttack,
      angle:api.diagnostics.attackAngle};
    // Mouse click cannot start an attack or create the touch joystick.
    ev(canvas,'pointerdown',77,55,240,'mouse');
    const mouse={joystick:api.diagnostics.joystickActive,buttonAbsent:!document.getElementById('ns140Hit')};
    ev(canvas,'pointerup',77,55,240,'mouse');
    api.stop();
    const stopped={active:api.diagnostics.joystickActive,padVisible:pad.classList.contains('active')};
    return {started,idle,down,moved,walking,release,respawn,left,attack,mouse,stopped,draws:window.__draws.length};
   });
   console.log('V145_ARENA_TOUCH',w,h,JSON.stringify(out));
   assert.equal(out.started.display,'none','no fixed joystick at idle');
   assert.equal(out.idle.walking,false,'hero must NOT animate walking while idle');
   assert.equal(out.down.active,true,'touch must activate pad');
   assert.equal(out.down.left,Math.round(w*.29)+'px','pad starts at touch location');
   assert.equal(out.down.top,Math.round(h*.49)+'px','pad y follows touch');
   assert.notEqual(out.down.display,'none','active pad visible');
   assert.ok(out.moved.x>.85&&Math.abs(out.moved.y)<.3,'joystick analog input');
   assert.ok(out.walking.x>130&&out.walking.flag&&out.walking.render.walking,'walking phase only while moving');
   assert.equal(out.release.active,false,'stick clears when released');
   assert.equal(out.release.display,'none','stick hides on release');
   assert.equal(out.release.render.walking,false,'idle animation returns immediately');
   assert.equal(out.respawn.left,Math.round(w*.62)+'px','next gesture reanchors pad anywhere on arena');
   assert.ok(out.left.direction<-.85&&out.left.side===-1,'walking left flips the character');
   assert.ok(out.walking.auto&&out.walking.autoHit&&Number.isFinite(out.walking.angle),'moving near goblins automatically attacks and aims at them');
   assert.ok(out.attack.buttonAbsent&&out.attack.automatic,'New Zone has no Attack button');
   assert.ok(!out.mouse.joystick&&out.mouse.buttonAbsent,'desktop has automatic attack and no click controls');
   assert.equal(out.stopped.padVisible,false,'cleanup removes floating joystick');
   assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[],'no runtime exceptions');
   await page.close();
  }
 }finally{await browser.close()}
 console.log('PASS V149: floating joystick, idle/walk, auto goblin hits without Attack button, targeted slash, 3 viewports.');
})().catch(e=>{console.error(e);process.exit(1)});
