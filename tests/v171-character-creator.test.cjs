'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../public'),source=fs.readFileSync(path.join(ROOT,'v171-character-creator.js'),'utf8'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
new Function(source);
assert.match(html,/v171-character-creator\.js\?v=17[12345678]/);
assert(Number(html.match(/name="ns-release" content="(\d+)"/)?.[1])>=171,'release must not regress below V171');
assert.match(html,/v115-village\.js\?v=166&amp;ui=17[078]/);
assert(Number(html.match(/v140-net-mode\.js\?v=(\d+)/)?.[1])>=168,'arena asset version must not regress');
assert(!/new WebSocket|fetch\(|XMLHttpRequest|new Audio\(|https?:\/\//.test(source),'isolated, no remote requests or network traffic');
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
  for(const [width,height] of [[360,844],[412,915],[832,600]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.join(ROOT,'index.html')+'?creator-test=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof window.NS171_CREATOR?.open==='function');
   await page.evaluate(()=>{document.querySelector('#ns82-auth')?.remove();document.querySelector('#ns50MenuCreate').open=true});
   const menu=await page.locator('#ns171HeroBtn').count();assert.equal(menu,1);
   await page.locator('#ns171HeroBtn').click({timeout:8000});
   await page.waitForFunction(()=>window.NS171_CREATOR.opened&&!!document.querySelector('#ns171Canvas')?.width);
   const layout=await page.evaluate(()=>{
    const r=document.getElementById('ns171Creator').getBoundingClientRect(),c=document.getElementById('ns171Canvas').getBoundingClientRect();
    return {w:r.width,h:r.height,preview:c.height,overflow:document.getElementById('ns171Fields').scrollWidth>document.getElementById('ns171Fields').clientWidth+2};
   });
   assert(layout.w<=width+1&&layout.h<=height+1&&!layout.overflow&&layout.preview>=145,'responsive creator '+JSON.stringify(layout));
   const logic=await page.evaluate(()=>{
    const a=window.NS171_CREATOR,c=a.clean({role:'hero',hp:100,growth:9,leg:1,size:1,damage:24});
    const levels=[a.effective(c,1),a.effective(c,20),a.effective(c,100)];
    return {levels,boss:a.effective({...c,role:'boss'},1),mini:a.effective({...c,role:'mini'},1),short:a.gaitStep({...c,leg:.7},100),long:a.gaitStep({...c,leg:1.4},100),clamp:a.clean({hp:999999,role:'evil',skin:'<img>'})};
   });
   assert(logic.levels[0].hp<logic.levels[1].hp&&logic.levels[1].hp<logic.levels[2].hp,'health scales');
   assert(logic.levels[0].damage<logic.levels[1].damage&&logic.levels[0].speed<logic.levels[1].speed,'power and speed scale');
   assert(logic.boss.hp>logic.mini.hp&&logic.mini.hp>logic.levels[0].hp,'tier curves');
   assert(logic.short>logic.long,'short legs take more steps at same distance');
   assert.equal(logic.clamp.hp,260);assert.equal(logic.clamp.role,'hero');
   await page.locator('[data-field=name]').fill('Test čuvar');
   await page.locator('[data-field=helmet]').selectOption('horned');
   await page.locator('[data-field=weapon]').selectOption('hammer');
   await page.locator('[data-action=save]').click();
   assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.saved.length),1);
   await page.locator('[data-tab=stats]').click();
   await page.evaluate(()=>{const x=document.querySelector('[data-field=leg]');x.value='1.4';x.dispatchEvent(new Event('input',{bubbles:true}));const l=document.getElementById('ns171Level');l.value='20';l.dispatchEvent(new Event('input',{bubbles:true}))});
   assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.draft.leg),1.4);
   assert.match(await page.locator('#ns171Computed').textContent(),/(?:Nivo|Level) 20/);
   await page.locator('[data-action=save]').click();
   await page.locator('[data-tab=motion]').click();
   await page.locator('[data-field=gait]').selectOption('heavy');
   await page.locator('[data-pose=walk]').click();
   const img0=await page.locator('#ns171Canvas').evaluate(c=>c.toDataURL());
   await page.waitForTimeout(180);
   const img1=await page.locator('#ns171Canvas').evaluate(c=>c.toDataURL());
   assert.notEqual(img0,img1,'animated model preview');
   await page.locator('[data-action=save]').click();
   await page.locator('[data-action=close]').click();
   assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.raf),false,'frame stops when hidden');
   await page.locator('#ns171CharacterBtn').click();
   await page.locator('[data-field=name]').fill('Test boss');
   await page.locator('[data-field=role]').selectOption('boss');
   await page.locator('[data-field=race]').selectOption('troll');
   await page.locator('[data-field=helmet]').selectOption('crown');
   await page.locator('[data-action=save]').click();
   assert.deepEqual(await page.evaluate(()=>window.NS171_CREATOR.test.saved.map(x=>x.role)),['hero','boss']);
   await page.locator('[data-action=test]').click();
   const id=await page.evaluate(()=>window.NS171_CREATOR.test.saved.find(x=>x.role==='hero').id);
   await page.locator('#ns171TestHero').selectOption(id);
   await page.locator('[data-action=restart]').click();
   const first=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);
   assert.equal(first.hero,'Test čuvar');assert.equal(first.mobs.length,1);assert.equal(first.mobs[0].role,'boss');
   const rect=await page.locator('#ns171Canvas').boundingBox();
   await page.mouse.move(rect.x+rect.width*.45,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.45+55,rect.y+rect.height*.5);await page.waitForTimeout(250);await page.mouse.up();
   const moved=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);
   assert(moved.x>first.x+1,'dynamic joystick moves player');
   await page.locator('[data-action=pause]').click();
   assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.simulation.paused),true);
   await page.locator('[data-action=next]').click();
   const next=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);
   assert(next.wave>first.wave&&next.mobs[0].hp>first.mobs[0].hp,'enemy stats grow with next wave');
   for(let j=0;j<15;j++)await page.locator('[data-action=spawn]').click();
   assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.simulation.mobs.length),12,'bounded entity count');
   await page.locator('[data-action=close]').click();
   await page.locator('#ns171HeroBtn').click();
   assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.saved.length),2,'both character types persisted');
   await page.locator('#ns171Saved').selectOption(id);
   assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.draft.leg),1.4);
   await page.locator('[data-tab=look]').click();
   for(const kind of ['elephant','rotfiend','worm']){
    await page.locator('#ns171Preset').selectOption(kind);
    assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.draft.classicModel),kind);
   }
   const art=await page.evaluate(()=>{
    const a=window.NS171_CREATOR,b=window.__NS110_BRIDGE,out={};
    for(const kind of ['elephant','rotfiend','worm']){
     const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
     const c=a.clean(a.presets[kind]);a.draw(g,c,128,128,{phase:2,moving:true,attack:.4,side:1});
     const painted=g.getImageData(0,0,256,256).data.some((v,i)=>i%4===3&&v>0);
     out[kind]=painted&&c.classicModel===kind&&typeof b.arenaClassicEnemy==='function';
    }return out;
   });
   assert.deepEqual(art,{elephant:true,rotfiend:true,worm:true});
   await page.locator('[data-action=test]').click();
   await page.locator('#ns171Enemy').selectOption('@rotfiend');
   await page.locator('[data-action=restart]').click();
   assert(await page.evaluate(()=>window.NS171_CREATOR.test.simulation.mobs.some(m=>m.name.includes('Truležni kolos'))),'original enemy available in live editor combat');
   await page.locator('[data-action=close]').click();
   assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[],'browser JavaScript errors');
   console.log('V171 CREATOR PASS',width+'x'+height,JSON.stringify({layout,levels:logic.levels.map(x=>[x.level,x.hp,x.damage,x.speed]),boss:logic.boss.hp,gait:[logic.short,logic.long],saved:2,joystick:moved.x-first.x,mobCap:12}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
