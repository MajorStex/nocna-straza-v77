'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../public'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const code=read('v174-independent-ai.js'),creator=read('v171-character-creator.js'),html=read('index.html');
for(const s of [code,creator])new Function(s);
assert.match(html,/name="ns-release" content="17[456]"/);assert.match(html,/v174-independent-ai\.js\?v=17[45]/);assert(html.indexOf('v174-independent-ai.js')<html.indexOf('v171-character-creator.js'));
assert(!/requestAnimationFrame\(|setInterval\(|setTimeout\(|fetch\(|new WebSocket/.test(code),'AI has no separate loops or network');
const w={};new Function('window',code)(w);const I=w.NS174_AI;
const bounds={minX:0,maxX:1000,minY:0,maxY:1000};
function actor(id,x,y,faction,ai={},boss={},role='enemy',points=[]){const o={c:{id,ai,boss,role,behavior:'melee'},s:{hp:100,speed:100,range:65,level:1},hp:100,x,y,slow:0,moving:false};return I.attach(o,I.cleanPlacement({x,y,faction,points},o.c,bounds),13)}
function step(a,actors,now,dt=.05){const q=I.decide(a,actors,now,dt),oldX=a.x,oldY=a.y,p=I.boundMove(a,a.x+q.vx*dt,a.y+q.vy*dt);a.x=p.x;a.y=p.y;a.moving=Math.hypot(a.x-oldX,a.y-oldY)>.01;return q}
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const player=actor('player',700,500,'ally',{mode:'still'}),guard=actor('same',300,500,'enemy',{mode:'guard',radius:100,leash:120,vision:150}),patrol=actor('same',300,250,'neutral',{mode:'patrol',radius:80,leash:80,vision:200,reaction:'passive',wait:.3}),roam=actor('same',600,250,'neutral',{mode:'roam',radius:60,leash:60,reaction:'passive',wait:.1}),still=actor('same',450,150,'neutral',{mode:'still',reaction:'passive'});
let maxPatrol=0,maxRoam=0,minPatrol=Infinity,states=new Set();
for(let i=0;i<2400;i++){const now=i*.05;const q=step(patrol,[player,guard,roam,still],now);states.add(q.state);step(roam,[player,guard,patrol],now);step(still,[player,guard,patrol],now);maxPatrol=Math.max(maxPatrol,d(patrol,patrol.placement));minPatrol=Math.min(minPatrol,d(patrol,patrol.placement));maxRoam=Math.max(maxRoam,d(roam,roam.placement));assert(maxPatrol<=80.001&&maxRoam<=60.001);assert(!q.target)}
assert(maxPatrol>60&&maxRoam>20&&states.has('patrol'));assert.equal(d(still,still.placement),0);
assert.equal(step(guard,[player],0).state,'guard');player.x=410;let sawTarget=false;for(let i=0;i<50;i++){let q=step(guard,[player],i*.05);sawTarget||=q.target===player;assert(d(guard,guard.placement)<=120.01)}assert(sawTarget&&d(guard,guard.placement)>10);player.x=900;
let returned=false;for(let i=0;i<130;i++){const q=step(guard,[player],3+i*.05);returned||=q.state==='return'}assert(returned&&d(guard,guard.placement)<6);
const ally=actor('same',100,100,'ally',{mode:'hunt'}),enemy=actor('same',180,100,'enemy',{mode:'hunt'}),neutral=actor('same',105,100,'neutral',{mode:'still',reaction:'defend'});
assert(I.hostile(ally,enemy)&&!I.hostile(ally,neutral));assert.equal(step(ally,[neutral,enemy,player],0).target,enemy);assert.equal(step(neutral,[enemy],0).target,null);I.markHit(enemy,neutral);assert.equal(step(neutral,[enemy],1).target,enemy);
const forced=I.cleanPlacement({x:20,y:30,faction:'neutral',ai:{mode:'patrol'},points:[{x:10000,y:10000}]},{id:'same',ai:{mode:'hunt',radius:50,leash:650,vision:650}},bounds);
assert.equal(forced.ai.leash,50);assert(d(forced.points[0],{x:0,y:0})<=50.001);
const boss=actor('same',500,500,'enemy',{mode:'still',vision:320},{enabled:true,phase2:70,phase3:35,special:'slam',windup:1,cooldown:4,radius:70,power:30},'boss');
const victim=actor('target',550,500,'ally',{mode:'still'}),friendly=actor('friend',550,500,'enemy',{mode:'still'});let hit=0,phase=[];
const callbacks={damage:(a,b,n)=>{hit++;b.hp-=n},phase:(a,n)=>phase.push(n)};
boss.hp=65;assert(I.bossTick(boss,[victim,friendly],victim,2.1,callbacks));assert.equal(boss.boss.stage,2);assert.equal(boss.boss.cast.x,550);victim.x=700;I.bossTick(boss,[victim,friendly],victim,1.01,callbacks);assert.equal(hit,0);assert.equal(victim.hp,100);assert.equal(friendly.hp,100);
boss.hp=30;victim.x=550;assert(I.bossTick(boss,[victim,friendly],victim,4.1,callbacks));assert.equal(boss.boss.stage,3);assert(I.phaseBuff(boss).damage>1);I.bossTick(boss,[victim,friendly],victim,1.1,callbacks);assert.equal(hit,1);assert(victim.hp<100);assert.equal(friendly.hp,100);assert.deepEqual(phase,[2,3]);
console.log('V174 AI LOGIC PASS',JSON.stringify({maxPatrol,maxRoam,returned,guardRadius:d(guard,guard.placement),sameCharacterDifferentSides:true,bossPhases:phase,dodge:true,friendlyFire:false,damage:100-victim.hp}));
(async()=>{
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);if(!bin)throw Error('Chromium required');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
 try{for(const [width,height] of [[320,700],[412,915],[832,600]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.join(root,'index.html')+'?creator-test=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.NS174_AI&&!!window.NS171_CREATOR);
 await page.evaluate(()=>{document.querySelector('#ns82-auth')?.remove();document.querySelector('#ns50MenuCreate').open=true});
 await page.locator('#ns171CharacterBtn').click();await page.locator('[data-field=name]').fill('Patrol test');await page.locator('[data-tab=ai]').click();
 await page.locator('[data-ai-group=ai][data-ai-field=mode]').selectOption('patrol');await page.locator('[data-ai-group=ai][data-ai-field=reaction]').selectOption('passive');
 await page.evaluate(()=>{const e=document.querySelector('[data-ai-group=ai][data-ai-field=radius]');e.value='80';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))});
 await page.locator('[data-ai-group=boss][data-ai-field=enabled]').check();
 await page.locator('[data-ai-group=boss][data-ai-field=special]').selectOption('frost');await page.locator('[data-action=save]').click();
 const c=await page.evaluate(()=>window.NS171_CREATOR.test.draft);assert.equal(c.ai.mode,'patrol');assert.equal(c.ai.reaction,'passive');assert.equal(c.ai.radius,80);assert.equal(c.boss.special,'frost');
 const layout=await page.evaluate(()=>{const f=document.getElementById('ns171Fields'),r=document.getElementById('ns171Creator').getBoundingClientRect();return {w:r.width,h:r.height,overflow:f.scrollWidth>f.clientWidth+2,tabs:document.querySelectorAll('#ns171Creator [data-tab]').length}});
 assert(!layout.overflow&&layout.w<=width+1&&layout.h<=height+1&&layout.tabs===7);
 await page.locator('[data-action=asEnemy]').click();await page.waitForFunction(()=>window.NS171_CREATOR.test.simulation?.mobs.length>0);
 const start=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);assert(start.mobs.every(m=>m.ai.mode==='patrol'&&m.ai.reaction==='passive'));
 await page.locator('#ns174PlacePanel summary').click();await page.locator('#ns174Faction').selectOption('neutral');await page.locator('#ns174PlaceMode').selectOption('still');await page.locator('[data-action=placeActor]').click();
 const canvas=page.locator('#ns171Canvas');const b=await canvas.boundingBox();assert(b);const scale=Math.min(b.width/780,b.height/500);const x=(b.width-780*scale)/2+120*scale,y=(b.height-500*scale)/2+170*scale;
 await canvas.click({position:{x,y}});await page.waitForFunction(()=>window.NS171_CREATOR.test.simulation?.mobs.some(m=>m.faction==='neutral'));
 const placed=await page.evaluate(()=>window.NS171_CREATOR.test.simulation.mobs.find(m=>m.faction==='neutral'));assert.equal(placed.ai.mode,'still');
 await page.waitForTimeout(450);const end=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);const n=end.mobs.find(m=>m.faction==='neutral');assert.equal(n.x,placed.x);assert.equal(n.y,placed.y);assert(end.mobs.filter(m=>m.faction==='enemy').every(m=>Math.hypot(m.x-m.homeX,m.y-m.homeY)<=m.ai.leash+1));assert.equal(end.hp,end.maxHp);
 await page.locator('[data-action=close]').click();assert.deepEqual(errors.filter(e=>/ReferenceError|SyntaxError|TypeError/.test(e)),[]);
 console.log('V174 AI UI PASS',width+'x'+height,JSON.stringify({layout,placed:n,enemyCount:end.mobs.filter(m=>m.faction==='enemy').length,heroHp:end.hp}));await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
