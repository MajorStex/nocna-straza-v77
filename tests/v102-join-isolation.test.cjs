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
   await page.waitForFunction(()=>!!window.__nightWatch&&!!window.__NS92_DIR,{timeout:25000});
   await page.evaluate(()=>document.getElementById('ns82-guest')?.click());
   const result=await page.evaluate(async()=>{
    const game=window.__nightWatch,net=game.NET,dir=window.__NS92_DIR;
    const versions=[document.getElementById('ns102MenuVersion').textContent,document.querySelector('#pausePanel .ns102Version').textContent,document.querySelector('#coopPanel .ns102Version').textContent];
    const code='ABCD23',button=document.createElement('button'),join=document.getElementById('joinBtn');
    let joinCount=0;join.onclick=()=>{joinCount++};
    const originalFetch=window.fetch;
    const room={code,name:'test',players:1,maxPlayers:6,locked:false,status:'waiting'};
    window.fetch=async u=>{
     if(String(u).endsWith('/api/lobbies/'+code))return{ok:true,json:async()=>({version:3,code,joinable:true,players:1,maxPlayers:6,locked:false,status:'waiting'})};
     return{ok:false,status:404};
    };
    const live=await dir.joinListedRoom(room,button),afterLive=joinCount,input=document.getElementById('joinCode').value;
    window.fetch=async u=>{
     if(String(u).endsWith('/api/lobbies/'+code))return{ok:true,json:async()=>({version:3,code,joinable:false,players:1,maxPlayers:6,locked:false,status:'waiting'})};
     return{ok:false,status:404};
    };
    const stale=await dir.joinListedRoom(room,button),afterStale=joinCount,buttonFreed=!button.disabled;
    window.fetch=async u=>{
     if(String(u).endsWith('/api/lobbies/'+code))return{ok:false,status:404};
     return{ok:true,json:async()=>({version:2,rooms:[room]})};
    };
    const legacy=await dir.joinListedRoom(room,button),afterLegacy=joinCount;
    window.fetch=originalFetch;
    // A slow remote client must not decrease packet frequency for a healthy one.
    net.role='host';net.phase='playing';net.localId='p1';net.round=102;
    const outgoing={p2:[],p3:[]};
    for(const id of ['p2','p3']){
     net.clients.set(id,{open:true,bufferSize:0,send:p=>{if(p.t==='snapshot')outgoing[id].push(p)}});
     net.profiles.set(id,{spec:{...game.FACTORY_HERO},ranks:{},heroBranches:{},spells:{},equipment:{},name:id==='p2'?'Slow':'Fast',heroName:'Lovkinja'});
    }
    game.startGame({specialMode:'normal'});
    game.NETLAB.peer('p2').rtt=1250;game.NETLAB.peer('p2').lastPong=performance.now();
    game.NETLAB.peer('p3').rtt=55;game.NETLAB.peer('p3').lastPong=performance.now();
    for(let i=0;i<25;i++){game.G.time+=.11;game.sendSnapshot()}
    net.remoteInputs.set('p2',{x:1,y:0,attack:true,dash:false});
    net.ns102InputAt=new Map([['p2',performance.now()-1400]]);
    game.update(.02);
    return{versions,live,stale,legacy,joinCount,afterLive,afterStale,afterLegacy,input,buttonFreed,slowPackets:outgoing.p2.length,fastPackets:outgoing.p3.length,staleInput:net.remoteInputs.get('p2'),time:game.G.time};
   });
   assert.ok(result.versions.every(x=>x.includes('V103')),'version visible in all menus');
   assert.equal(result.live,true);assert.equal(result.input,'ABCD23');assert.equal(result.afterLive,1);
   assert.equal(result.stale,false);assert.equal(result.afterStale,1,'offline room must not open code connection');assert.equal(result.buttonFreed,true,'retry never stuck disabled');
   assert.equal(result.legacy,true);assert.equal(result.afterLegacy,2,'old relay fallback uses exact existing code join');
   assert.ok(result.fastPackets>=14,'healthy player should receive normal update cadence');
   assert.ok(result.slowPackets>=3&&result.slowPackets<result.fastPackets/2,'slow phone receives fewer snapshots');
   assert.equal(result.staleInput.x,0,'old input never keeps moving the disconnected guest');
   assert.ok(result.time>0);
   assert.deepEqual(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/i.test(e)),[],errors.join(' | '));
   console.log('PASS V103 '+width+'px: live/legacy public join, stale host rejection, permanent version, independent 2-peer snapshot cadence and stale input');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
