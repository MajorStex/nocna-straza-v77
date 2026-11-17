'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');const root=path.resolve(__dirname,'../public'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const code=read('v175-faction-relations.js'),ai=read('v174-independent-ai.js'),html=read('index.html');
const w={};new Function('window',code)(w);new Function('window',ai)(w);const F=w.NS175_FACTIONS,I=w.NS174_AI;
assert.match(html,/name="ns-release" content="17[5678]"/);assert(html.indexOf('v175-faction-relations.js')<html.indexOf('v174-independent-ai.js'));assert(!/fetch\(|setInterval\(|requestAnimationFrame\(|new WebSocket/.test(code));
let matrix={};assert.equal(F.relation(matrix,'enemy','player'),'hostile');assert.equal(F.relation(matrix,'enemy','enemy'),'friendly');assert.equal(F.relation(matrix,'red','blue'),'neutral');
matrix=F.set(matrix,'red','blue','hostile');assert.equal(F.relation(matrix,'blue','red'),'hostile');assert.equal(F.relation({},'blue','red'),'neutral');assert.deepEqual(F.set(matrix,'blue','red','neutral'),{});
function actor(faction,x,mat){const a={c:{id:'same',role:'enemy',ai:{mode:'hunt'},behavior:'melee'},s:{hp:100,speed:100,range:65,level:1},hp:100,x,y:200};I.attach(a,{x,y:200,faction});if(mat)F.bind(a,mat);return a}
const p=actor('player',100,matrix),red=actor('red',120,matrix),blue=actor('blue',160,matrix);
assert.equal(I.decide(red,[p,blue],0,.05).target,blue);assert(!I.hostile(red,p));assert.equal(I.decide(blue,[p,red],0,.05).target,red);
assert(I.hostile(actor('enemy',100,{}),actor('player',120,{})));assert(!I.hostile(actor('red',100,{}),actor('blue',120,{})));
const ally=F.set(matrix,'red','blue','friendly');F.bind(red,ally);F.bind(blue,ally);assert.equal(I.decide(red,[p,blue],1,.05).target,null);
console.log('V175 FACTION LOGIC PASS');
(async()=>{
const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);if(!bin)throw Error('Chromium required');
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
try{for(const [width,height] of [[320,700],[412,915],[832,600]]){
const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+path.join(root,'index.html')+'?creator-test=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.NS175_FACTIONS&&!!window.NS171_CREATOR);
await page.evaluate(()=>{document.querySelector('#ns82-auth')?.remove();document.querySelector('#ns50MenuCreate').open=true});
await page.locator('#ns171CharacterBtn').click();await page.locator('[data-tab=test]').click();await page.locator('[data-action=restart]').click();
await page.waitForFunction(()=>window.NS171_CREATOR.test.simulation?.mobs.length===3);const initial=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);assert.equal(initial.mode,'wave');assert.deepEqual(initial.relations,{});assert(initial.mobs.every(m=>m.faction==='enemy'));
await page.locator('#ns175LabMode').selectOption('scene');await page.locator('[data-action=restart]').click();assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.simulation.mobs.length),0);
await page.locator('#ns175Relations summary').click();const pair=page.locator('[data-relation-a=red][data-relation-b=blue]');await pair.selectOption('hostile');assert.equal(await page.evaluate(()=>window.NS171_CREATOR.test.simulation.relations['blue|red']),'hostile');
assert(await page.evaluate(()=>{const f=document.getElementById('ns171Fields');return f.scrollWidth<=f.clientWidth+2}));
await page.locator('#ns174PlacePanel summary').click();await page.locator('#ns174PlaceMode').selectOption('hunt');
const canvas=page.locator('#ns171Canvas');const b=await canvas.boundingBox(),sc=Math.min(b.width/780,b.height/500);
async function place(faction,x,y){await page.locator('#ns174Faction').selectOption(faction);await page.locator('[data-action=placeActor]').click();await canvas.click({position:{x:(b.width-780*sc)/2+x*sc,y:(b.height-500*sc)/2+y*sc}})}
await place('red',230,250);await place('blue',275,250);
await page.waitForFunction(()=>{const s=window.NS171_CREATOR.test.simulation;return s.mobs.some(m=>m.hp<100)},{timeout:5000});
const battle=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);assert.equal(battle.hp,battle.maxHp);assert.equal(battle.mode,'scene');assert.equal(battle.damageDone,0);
await pair.selectOption('friendly');const before=await page.evaluate(()=>window.NS171_CREATOR.test.simulation.mobs.map(m=>m.hp));await page.waitForTimeout(1000);assert.deepEqual(await page.evaluate(()=>window.NS171_CREATOR.test.simulation.mobs.map(m=>m.hp)),before);
await page.locator('[data-action=factionsDefault]').click();assert.deepEqual(await page.evaluate(()=>window.NS171_CREATOR.test.simulation.relations),{});
await page.locator('[data-action=close]').click();await page.locator('#ns171HeroBtn').click();await page.locator('[data-tab=test]').click();await page.locator('[data-action=restart]').click();
const again=await page.evaluate(()=>window.NS171_CREATOR.test.simulation);assert.equal(again.mode,'wave');assert.deepEqual(again.relations,{});
await page.locator('[data-action=close]').click();assert.deepEqual(errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)),[]);
console.log('V175 UI PASS',width,height,JSON.stringify({defaultMode:again.mode,battle:before,heroHp:battle.hp,relationsReset:true}));await page.close();
}}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
