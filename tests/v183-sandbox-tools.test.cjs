'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8'),source=fs.readFileSync(path.resolve(__dirname,'../public/v177-workshop.js'),'utf8');
new Function(source);assert.match(html,/ns177|NS177_WORKSHOP/);assert.match(html,/v177-workshop\.js\?v=17[78]/);assert(!/new WebSocket|fetch\(|getUserMedia\(/.test(source));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--allow-file-access-from-files','--disable-dev-shm-usage']});
const pages=[],errors=[],packets=[];let forwarding=true;
try{
 for(const [id,width] of [['p1',412],['p2',360]]){const p=await browser.newPage({viewport:{width,height:915},isMobile:true,hasTouch:true});pages.push(p);p.on('pageerror',e=>errors.push(id+': '+e.message));await p.goto('file://'+path.resolve(__dirname,'../public/index.html')+'?village-test=1&lang=sr',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.NS177_WORKSHOP&&window.NS171_CREATOR&&window.NS109_VILLAGE?.opened)}
 const [host,guest]=pages;
 for(let i=0;i<2;i++){const p=pages[i],other=pages[1-i],id='p'+(i+1);await p.exposeFunction('deliver177',m=>{if(!forwarding||!m?.t?.startsWith('ns177Workshop'))return;packets.push({id,t:m.t,bytes:JSON.stringify(m).length});setTimeout(()=>other.evaluate(({m,id})=>window.NS177_WORKSHOP.receive(m,id),{m,id}).catch(()=>{}),20)});await p.evaluate(id=>{document.querySelector('#ns82-auth')?.remove();const b=window.__NS110_BRIDGE,n=b.NET;window.NS109_VILLAGE.close();n.role=id==='p1'?'host':'guest';n.phase='lobby';n.code='QA177';n.localId=id;n.hostId='p1';n.worldReady=true;n.localReady=false;n.clients.clear();const conn={open:true,bufferSize:0,send(m){void window.deliver177(m);return true}};if(id==='p1'){n.clients.set('p2',conn);n.profiles.set('p2',{name:'GOST'});n.worldReadyPlayers.set('p2',true)}else{n.conn=conn;n.roster=[{id:'p1',name:'HOST'},{id:'p2',name:'GOST'}]}window.NS109_VILLAGE.open();const hut=window.NS109_VILLAGE.test.buildings.find(b=>b.id==='workshop');if(!hut)throw Error('No workshop house');if(!window.NS109_VILLAGE.test.testMove(hut.x,hut.y+hut.h/2+26))throw Error('Blocked workshop door');},id);await p.waitForFunction(()=>window.NS109_VILLAGE.test.debug.nearDoor==='workshop');await p.locator('#ns120Door').click();await p.waitForFunction(()=>window.NS177_WORKSHOP.active)}
 await host.waitForFunction(()=>NS177_WORKSHOP.diagnostics.guests===1);await guest.waitForFunction(()=>NS177_WORKSHOP.diagnostics.players===2&&NS177_WORKSHOP.diagnostics.remoteSeq>0);
 assert.equal(await host.evaluate(()=>NS177_WORKSHOP.blocksStart),true);
 const before=await host.evaluate(()=>NS177_WORKSHOP.position('p2'));await guest.keyboard.down('d');await guest.waitForTimeout(850);await guest.keyboard.up('d');await host.waitForFunction(x=>NS177_WORKSHOP.position('p2').x>x+55,before.x);
 await guest.locator('[data-w=propose]').click();await host.waitForFunction(()=>NS177_WORKSHOP.diagnostics.proposals===1);await host.locator('#ns177Proposal').click();
 await guest.waitForFunction(()=>NS177_WORKSHOP.diagnostics.rows===1);assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.mobs.length),1);
 await guest.locator('[data-w=save]').click();const saved=await guest.evaluate(()=>NS176_SCENES.list(NS171_CREATOR.clean,NS174_AI,NS175_FACTIONS));assert.equal(saved.length,1);assert.equal(saved[0].actors.length,1);

 // Explicit PvE starts from observer mode. Host remains the authority.
 assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.sceneBattle),false);
 const beforeCanvas=await host.locator('#ns171Canvas').boundingBox();
 const guestCanvas=await guest.locator('#ns177Canvas').boundingBox();
 await host.locator('[data-action=immersive]').click();
 assert(!await host.locator('#ns171Fields').isVisible());
 assert((await host.locator('#ns171Canvas').boundingBox()).height>beforeCanvas.height);
 await host.locator('[data-action=zoom]').click();
 assert.match(await host.locator('[data-action=zoom]').innerText(),/1\.35/);
 await guest.locator('[data-w=immersive]').click();
 assert(!await guest.locator('.ns177Controls').isVisible());
 assert((await guest.locator('#ns177Canvas').boundingBox()).height>guestCanvas.height);
 await guest.locator('[data-w=zoom]').click();
 await host.locator('[data-action=immersive]').click();
 assert(await host.locator('#ns171Fields').isVisible());
 assert(!await guest.locator('.ns177Controls').isVisible(),'host layout is not broadcast');
 await guest.locator('[data-w=immersive]').click();
 assert(await guest.locator('.ns177Controls').isVisible());
 // Add a strong enemy near p2, but beyond the host. Clear observer immunity
 // via explicit command, verify HP from the same host packet reaches guest.
 await host.evaluate(()=>{const pos=NS177_WORKSHOP.position('p2');const c=NS171_CREATOR.clean({...NS171_CREATOR.presets.orc,name:'Combat QA',hp:600,damage:35});if(!NS171_CREATOR.workshopAdd(c,pos.x+20,pos.y,'enemy','still'))throw Error('fixture placement')});
 await host.locator('[data-action=attackPlayers]').click();
 await host.waitForFunction(()=>NS171_CREATOR.test.simulation.sceneBattle);
 await host.waitForFunction(()=>{const d=NS171_CREATOR.workshopVisitorState('p2');return d&&d.hp<d.maxHp},undefined,{timeout:12000});
 await guest.waitForFunction(()=>document.querySelector('#ns177Status')?.textContent.includes('BORBA')&&document.querySelector('#ns177Status')?.textContent.includes('HP'),undefined,{timeout:6000});
 const combat=await host.evaluate(()=>NS171_CREATOR.workshopVisitorState('p2'));
 assert(combat.hp<combat.maxHp);
 await host.locator('[data-action=observe]').click();
 const healed=await host.evaluate(()=>NS171_CREATOR.workshopVisitorState('p2'));
 assert.equal(healed,null);
 assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.sceneBattle),false);
 console.log('V182 WORKSHOP BATTLE AND IMMERSIVE PASS',JSON.stringify({twoBrowsers:true,hostGuestLayoutsIndependent:true,hostOwnsDamage:true,guestHp:combat.hp,guestMaxHp:combat.maxHp,observe:true}));
 // World editor: selected targeting, static props, copied/deleted layout, undo/redo, reset.
 await host.locator('#ns183Sandbox summary').click();
 await host.locator('[data-action=resetCombat]').click();
 await host.locator('#ns183Selection').selectOption('a0');
 await host.locator('#ns183Targets').selectOption('p2');
 await host.locator('[data-action=attack]').click();
 assert(await host.evaluate(()=>NS171_CREATOR.test.simulation.mobs.some(m=>m.target==='p2')));
 await host.locator('[data-action=stop]').click();
 assert(await host.evaluate(()=>NS171_CREATOR.test.simulation.mobs.some(m=>m.ai.reaction==='passive'&&m.ai.mode==='still')));
 await host.locator('[data-action=observe]').click();
 // Observe renders controls afresh, and zoom remains local.
 await host.locator('#ns183Sandbox summary').click();
 for(let n=0;n<3;n++){if((await host.locator('[data-action=zoom]').innerText()).includes('1.00'))break;await host.locator('[data-action=zoomout]').click()}
 const arena=host.locator('#ns171Canvas');
 const bb=await arena.boundingBox(),sc=Math.min(bb.width/780,bb.height/500);
 const point=(x,y)=>({x:(bb.width-780*sc)/2+x*sc,y:(bb.height-500*sc)/2+y*sc});
 await host.locator('#ns183Prop').selectOption('rock');await host.locator('[data-action=placeProp]').click();await arena.click({position:point(105,390)});
 assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.props.length),1);
 await guest.waitForFunction(()=>NS177_WORKSHOP.diagnostics.props===1);
 await host.locator('[data-action=copyItem]').click();await arena.click({position:point(205,390)});
 assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.props.length),2);
 await host.locator('[data-action=undo]').click();
 assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.props.length),1);
 await host.locator('[data-action=redo]').click();
 assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.props.length),2);
 await host.locator('[data-action=resetCombat]').click();
 assert.equal(await host.evaluate(()=>NS171_CREATOR.test.simulation.props.length),2);
 const collision=await host.evaluate(()=>{const s=NS171_CREATOR.test.simulation.props[0];const p=NS171_CREATOR.workshopMove(s.x-50,s.y,s.x,s.y);return p.x!==s.x});
 assert(collision,'host collision rejects obstacle center');
 await guest.waitForFunction(()=>NS177_WORKSHOP.diagnostics.props===2);
 await guest.locator('[data-w=save]').click();
 await guest.waitForFunction(()=>NS176_SCENES.list(NS171_CREATOR.clean,NS174_AI,NS175_FACTIONS).some(s=>s.props?.length===2));
 console.log('V183 EDITOR PASS',JSON.stringify({targeted:true,stop:true,undoRedo:true,props:2,guestSave:true,collision:true}));

 const previous=await guest.evaluate(()=>NS177_WORKSHOP.diagnostics.remoteSeq);await guest.evaluate(()=>NS177_WORKSHOP.receive({t:'ns177WorkshopState',room:'QA177',epoch:NS177_WORKSHOP.diagnostics.epoch,rev:0,seq:-1,rows:[],players:[]},'p1'));assert((await guest.evaluate(()=>NS177_WORKSHOP.diagnostics.remoteSeq))>=previous);
 await guest.locator('[data-w=exit]').click();await host.waitForFunction(()=>NS177_WORKSHOP.diagnostics.guests===0);assert(await guest.locator('#ns109Village').isVisible());await host.locator('#ns171Creator [data-action=close]').click();assert(await host.locator('#ns109Village').isVisible());
 const state=packets.filter(p=>p.t==='ns177WorkshopState');assert(state.length>5);const avg=Math.round(state.reduce((n,p)=>n+p.bytes,0)/state.length);assert(avg<3000);
 assert(!errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)).length,errors.join('\n'));console.log('V183 WORKSHOP PASS',JSON.stringify({twoBrowsers:true,physicalDoor:true,movement:true,proposal:true,saveCopy:true,staleRejected:true,returnVillage:true,averageSnapshotBytes:avg,packets:packets.length}));
 // Clean isolated mock lobby and verify solo entry without a connection.
 await host.evaluate(()=>{NS109_VILLAGE.close();const n=window.__NS110_BRIDGE.NET;n.role='';n.phase='idle';n.clients.clear();n.code='';NS109_VILLAGE.open();const b=NS109_VILLAGE.test.buildings.find(b=>b.id==='workshop');NS109_VILLAGE.test.testMove(b.x,b.y+b.h/2+26)});await host.waitForFunction(()=>NS109_VILLAGE.test.debug.nearDoor==='workshop');await host.locator('#ns120Door').click();await host.waitForFunction(()=>NS177_WORKSHOP.mode==='solo'&&NS171_CREATOR.opened);await host.locator('#ns171Creator [data-action=close]').click();assert(await host.locator('#ns109Village').isVisible());console.log('V182 SOLO DOOR PASS');
 }finally{forwarding=false;await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
