'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright-core');
const folder=path.join(__dirname,'../public');
const match='0123456789abcdef01234567';
const players=[['p1',5480,8950,100,-100,1,0,0,-1,100,0],
 ['p2',5400,8700,100,-100,1,0,0,-1,100,0]];
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(require('node:fs').existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const pages=[];
  for(const id of ['p1','p2']){
   const page=await browser.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
   await page.setContent('<html><body></body></html>');
   await page.evaluate(id=>{
    window.__NS110_BRIDGE={currentProfileLevel:()=>7,NET:{role:'guest',phase:'lobby',localId:id},
      getVillageHeroLook:()=>({name:id,weapon:'sword'})};
    window.NS152_AUDIO={music:false,sound:false,play(){},unlock(){},set(){},stop(){}};
    window.__fakeSockets=[];
    window.WebSocket=class FakeWebSocket{
     constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];
      window.__fakeSockets.push(this)}
     open(){this.readyState=1;this.onopen?.()}
     send(raw){this.sent.push(JSON.parse(raw))}
     inject(data){this.onmessage?.({data:JSON.stringify(data)})}
     close(code){this.readyState=3;this.onclose?.({code:code||1000})}
    };
   },id);
   for(const file of ['v157-arena-scenery.js','v154-goblin-renderer.js',
     'v159-troll-renderer.js','v159-legacy-compound.js','v140-net-mode.js'])
    await page.addScriptTag({path:path.join(folder,file)});
   const initial=await page.evaluate(({id,match,players})=>{
    const art=window.NS159_LEGACY_COMPOUND;
    const legacyItems=art.create(false),obstacles=art.colliders(legacyItems);
    const world={w:1680,h:1400,r:14,speed:156,decorSeed:157,
     legacyMode:true,legacyGateOpen:false,legacyItems,obstacles};
    window.__testLegacy=world;
    const accepted=window.NS140_ARENA.acceptOffer({id,match,protocol:140,ticket:'seat-test'});
    const ws=window.__fakeSockets[0];ws.open();
    ws.inject({t:'welcome',protocol:140,serverBuild:159,world,looks:[]});
    ws.inject({t:'start'});
    ws.inject({t:'s',tick:100,players,mobs:[],totalMobs:0,wave:1,serverNow:Date.now()});
    const d=window.NS140_ARENA.diagnostics;
    return {accepted,phase:d.phase,legacyMode:d.legacyMode,legacyProps:d.legacyProps,
     closed:d.legacyGateOpen,grid:d.collisionGridCells,
     connection:ws.url,artCache:art.variants};
   },{id,match,players});
   assert.equal(initial.accepted,true);
   assert.equal(initial.phase,'running');
   assert.equal(initial.legacyMode,true);
   assert.equal(initial.legacyProps,67);
   assert.equal(initial.closed,false);
   assert.equal(initial.grid,48,'original corner obstacles occupy exactly 48 indexed cells');
   assert.match(initial.connection,/nocna-straza-relay-v159-test/,'must not contact stable Worker');
   assert.ok(initial.artCache>0,'old hand-drawn props prewarmed');
   pages.push(page);
  }
  await pages[0].locator('#ns158MenuBtn').click();
  assert.equal(await pages[0].locator('#ns159GateOpen').isVisible(),true,'gate control visible in legacy area');
  await pages[0].locator('#ns159GateOpen').click();
  const before=await Promise.all(pages.map(page=>page.evaluate(()=>{
   const d=window.NS140_ARENA.diagnostics,ws=window.__fakeSockets.at(-1);
   return {gate:d.legacyGateOpen,sent:ws.sent.filter(e=>e.t==='gateOpen').length};
  })));
  assert.equal(before[0].sent,1,'only nearby player requests opening');
  assert.equal(before[1].sent,0,'other player does not auto-request opening');
  assert.equal(before[0].gate,false,'local tap never unlocks without server');
  assert.equal(before[1].gate,false,'remote peer remains locked until authority');
  await pages[0].evaluate(()=>{
   const art=window.NS159_LEGACY_COMPOUND;
   const legacyItems=art.create(true);
   const world={...window.__testLegacy,legacyItems,legacyGateOpen:true,
    obstacles:art.colliders(legacyItems)};
   window.__fakeSockets[0].inject({t:'gate',open:true,by:'p1',world});
  });
  const first=await pages[0].evaluate(()=>window.NS140_ARENA.diagnostics);
  assert.equal(first.legacyGateOpen,true,'initiator sees authoritative world');
  await pages[1].evaluate(players=>{
   // Simulate a dropped one-time event; the next 15Hz server snapshot repairs the gate.
   const ws=window.__fakeSockets[0];
   ws.inject({t:'s',tick:102,players,mobs:[],totalMobs:0,wave:1,
    serverNow:Date.now(),gateOpen:true});
  },players);
  const second=await pages[1].evaluate(()=>window.NS140_ARENA.diagnostics);
  assert.equal(second.legacyGateOpen,true,'peer heals missed gate broadcast from server snapshot');
  assert.equal(second.legacyProps,67);
  await pages[0].locator('#ns158MenuBtn').click();
  assert.equal(await pages[0].locator('#ns159GateOpen').isVisible(),false,'opened gate menu command removed');
  console.log('V159 CLASSIC MULTIPLAYER UI PASS: separate test Worker URL, two 360px phones, exact old props, server-only gate, 15Hz recovery and no duplicate unlock');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
