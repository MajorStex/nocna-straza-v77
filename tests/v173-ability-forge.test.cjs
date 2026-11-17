'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../public'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),forge=read('v173-ability-forge.js'),creator=read('v171-character-creator.js'),voice=read('v172-character-voices.js'),html=read('index.html');
for(const code of [forge,creator,voice])new Function(code);
assert.match(html,/name="ns-release" content="173"/);assert.match(html,/v173-ability-forge\.js\?v=173/);
assert(html.indexOf('v173-ability-forge.js')<html.indexOf('v171-character-creator.js'));
assert(!/fetch\(|setInterval\(|requestAnimationFrame\(|new WebSocket/.test(forge));
const w={};vm.runInNewContext(forge,{window:w});const A=w.NS173_ABILITIES;
const models=creator.slice(creator.indexOf('const clamp='),creator.indexOf('const key='));
const mechanics=creator.slice(creator.indexOf('const W=780'),creator.indexOf('function dimensions()'));
function cases(){
 function setup(hero,enemy,lv=1){sim={p:entity(hero,lv,390,250),enemy:clean(enemy),mobs:[],drops:[],wave:lv,xp:0,kills:0,time:0,paused:false,cleared:0,voiceQueue:[],voiceClock:0,waveVoice:true,voicesReady:false,fx:[],damageDone:0,damageTaken:0};}
 const report={};
 setup({...base,abilities:[{type:'fireball',power:100,mana:25,range:230,unlock:5}]},{...base,role:'enemy',hp:40},4);
 let p=sim.p;sim.mobs=[entity(sim.enemy,1,p.x+180,p.y)];const locked=castPlayer(0);p.s=effective(p.c,5);const cast=castPlayer(0),second=castPlayer(0);report.fire={locked,cast,second,kill:sim.kills,drops:sim.drops.length,mana:p.mana,fx:sim.fx.length};
 setup({...base,abilities:[{type:'heal',power:35,mana:30},{type:'shield',power:50,mana:25,duration:4}]},{...base,role:'enemy',damage:40});p=sim.p;
 let m=entity(sim.enemy,1,p.x+10,p.y);p.hp=40;const healed=castPlayer(0),hpHeal=p.hp;const shield=castPlayer(1),before=p.hp;dealDamage(m,p,40);report.defense={healed,hpHeal,shield,damage:before-p.hp,mana:p.mana};A0.tick(p,4.1);report.defense.shieldExpired=p.shield===0;report.defense.regenerated=p.mana>45;
 setup({...base,abilities:[{type:'frost',power:20,range:150,mana:20,duration:3}]},{...base,role:'enemy',hp:260});p=sim.p;sim.mobs=[entity(sim.enemy,1,p.x+60,p.y),entity(sim.enemy,1,p.x+100,p.y),entity(sim.enemy,1,p.x+220,p.y)];const froze=castPlayer(0);report.frost={froze,slows:sim.mobs.map(x=>x.slow),hp:sim.mobs.map(x=>x.hp)};
 setup(base,{...base,role:'enemy',weapon:'sword',behavior:'ranged'});sim.mobs=[entity(sim.enemy,1,sim.p.x+130,sim.p.y)];step(1/60);report.sword={hp:sim.p.hp,range:sim.mobs[0].s.range};
 setup(base,{...base,role:'enemy',damage:65});sim.p.hp=1;sim.p.cd=1;sim.mobs=[entity(sim.enemy,1,sim.p.x+10,sim.p.y)];sim.drops=[{x:sim.p.x,y:sim.p.y,value:45}];step(1/60);report.dead={hp:sim.p.hp,level:sim.p.s.level,xp:sim.xp,drops:sim.drops.length};resetWave();report.dead.afterReset=sim.p.hp;
 setup(base,{...base,role:'enemy'});sim.drops=[{x:30,y:30,value:12}];for(let i=0;i<435;i++)step(1/60);report.wave={wave:sim.wave,drops:sim.drops.length};
 setup(base,{...base,role:'enemy',abilities:[{type:'fireball',range:230,power:30,mana:25}]});sim.mobs=[entity(sim.enemy,1,sim.p.x+160,sim.p.y)];step(1/60);report.ai={heroHp:sim.p.hp,mana:sim.mobs[0].mana,cd:sim.mobs[0].abilityCd[0]};
 setup(base,{...base,role:'enemy',hp:40});sim.mobs=[entity(sim.enemy,1,sim.p.x+20,sim.p.y)];labInvulnerable=true;const immune=dealDamage(sim.mobs[0],sim.p,10000);report.lab={immune,heroHp:sim.p.hp};labInvulnerable=false;
 return report;
}
const run=new Function('A0',models+'\nconst A=()=>A0,V=()=>null,$=()=>null,resetStick=()=>{},gaitStep=(c,d)=>d/Math.max(16,37*c.leg*c.size)*Math.PI*2;\nlet sim=null,stick={vx:0,vy:0},keys=new Set(),level=1,draft=base,selectedHero="",selectedEnemy="",testTier="auto",all=[],notice="",labInvulnerable=false,lastAbilityHud=0;\n'+mechanics+'\nreturn ('+cases.toString()+')()');
const logic=run(A);
assert.equal(logic.fire.locked,false);assert.equal(logic.fire.cast,true);assert.equal(logic.fire.second,false);assert.equal(logic.fire.kill,1);assert.equal(logic.fire.drops,1);
assert.equal(logic.defense.hpHeal,75);assert.equal(logic.defense.damage,19);assert(logic.defense.shieldExpired&&logic.defense.regenerated);
assert.deepEqual(logic.frost.slows,[3,3,0]);assert.equal(logic.sword.hp,100);assert.equal(logic.sword.range,65);
assert.equal(logic.dead.hp,0);assert.equal(logic.dead.level,1);assert.equal(logic.dead.afterReset,0);assert.equal(logic.dead.drops,1);
assert.equal(logic.wave.wave,2);assert.equal(logic.wave.drops,1);assert(logic.ai.heroHp<100&&logic.ai.cd>0);assert.equal(logic.lab.heroHp,100);
const safe=A.cleanOne({type:'shield',power:99999,cooldown:-1,mana:-30,unlock:200,duration:200});assert.equal(safe.power,65);assert.equal(safe.cooldown,2);assert.equal(safe.mana,5);assert.equal(safe.unlock,100);assert.equal(safe.duration,6);
console.log('V173 COMBAT LOGIC PASS',JSON.stringify(logic));
const defs=voice.slice(voice.indexOf('const EVENTS='),voice.indexOf('const scope='));
const mixer=voice.slice(voice.indexOf('let context=null'),voice.indexOf('let panel=')).replace('const clock=()=>performance.now()/1000;','const clock=()=>t;');
async function audioCases(){
 const node=()=>({connect(){},disconnect(){},gain:{value:0},pan:{value:0},start(){},stop(){this.onended?.()}});
 context={state:'running',createBufferSource:node,createGain:node,createStereoPanner:node};master=node();
 const id='cc-test',events=new Map();for(const event of Object.keys(EVENTS)){const clip={key:id+'|'+event,slot:0};events.set(event,[clip]);decoded.set(clip.key,{duration:5})}bank.set(id,events);
 const e=emitter(),f=emitter(),flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve()};
 const offer=(actor,event)=>dispatch([candidate(actor,id,event,20,0,t,()=>0)]);
 const first=offer(e,'attack');await flush();t=2;const overlapping=offer(e,'hurt');await flush();const activeAfter=active.length;
 const other=offer(f,'hurt');await flush();const peak=active.length;
 t=2.5;const death=offer(e,'death');await flush();const actors=new Set(active.map(v=>v.actor)).size,priorities=active.map(v=>v.priority);silence();
 return {first,overlapping,activeAfter,other,peak,death,actors,priorities,after:active.length,pending};
}
const simulateVoice=new Function(defs+'\nlet t=0;\n'+mixer+'\nreturn ('+audioCases.toString()+')()');
(async()=>{
 const audio=await simulateVoice();assert(audio.first&&!audio.overlapping&&audio.other&&audio.death);assert.equal(audio.activeAfter,1);assert.equal(audio.peak,2);assert.equal(audio.actors,2);assert(audio.priorities.includes(9));assert.equal(audio.after,0);assert.equal(audio.pending,0);console.log('V173 VOICE MIXER PASS',JSON.stringify(audio));
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);if(!bin)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{
 for(const [width,height] of [[320,700],[412,915],[832,600]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.join(root,'index.html')+'?creator-test=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.NS173_ABILITIES&&!!window.NS171_CREATOR);
 await page.evaluate(()=>{document.querySelector('#ns82-auth')?.remove();document.querySelector('#ns50MenuCreate').open=true});
 await page.locator('#ns171HeroBtn').click();await page.locator('[data-field=name]').fill('Arcane test');await page.locator('[data-tab=abilities]').click();
 await page.locator('[data-ability-field=type]').selectOption('fireball');
 await page.evaluate(()=>{const e=document.querySelector('[data-ability-field=unlock]');e.value='5';e.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('[data-ability-field=name]').fill('Ember');await page.locator('[data-ability-slot="1"]').click();await page.locator('[data-ability-field=type]').selectOption('shield');
 await page.locator('[data-action=save]').click();
 const saved=await page.evaluate(()=>window.NS171_CREATOR.test.draft);assert.equal(saved.abilities[0].type,'fireball');assert.equal(saved.abilities[0].unlock,5);assert.equal(saved.abilities[0].name,'Ember');assert.equal(saved.abilities[1].type,'shield');
 const layout=await page.evaluate(()=>{const f=document.getElementById('ns171Fields'),r=document.getElementById('ns171Creator').getBoundingClientRect();return {w:r.width,h:r.height,overflow:f.scrollWidth>f.clientWidth+2,tabs:document.querySelectorAll('#ns171Creator [data-tab]').length}});
 assert(!layout.overflow&&layout.w<=width+1&&layout.h<=height+1&&layout.tabs===6);
 await page.locator('[data-action=asHero]').click();
 await page.waitForFunction(()=>window.NS171_CREATOR.test.simulation?.abilities[1].type==='shield');
 assert.equal(await page.locator('[data-cast="0"]').isDisabled(),true);assert.equal(await page.locator('[data-cast="1"]').isDisabled(),false);
 const before=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);
 await page.locator('[data-cast="1"]').click();await page.waitForFunction(()=>window.NS171_CREATOR.test.simulation?.abilityCd[1]>0);
 const after=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);assert(after.mana<before.mana-15);assert(after.abilityCd[1]>0);assert(after.fx>0);
 await page.evaluate(()=>{const l=document.getElementById('ns171Level');l.value='6';l.dispatchEvent(new Event('input',{bubbles:true}))});await page.locator('[data-action=restart]').click();
 await page.waitForFunction(()=>window.NS171_CREATOR.test.simulation?.level===6);
 assert.equal(await page.locator('[data-cast="0"]').isDisabled(),false);
 await page.locator('[data-action=close]').click();await page.locator('#ns171CharacterBtn').click();await page.locator('#ns171Saved').selectOption(saved.id);await page.locator('[data-tab=abilities]').click();
 assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.draft.abilities[0].name),'Ember');
 assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[]);console.log('V173 ABILITY UI PASS',width+'x'+height,JSON.stringify({layout,slots:saved.abilities,spent:before.mana-after.mana,level:6}));
 await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
