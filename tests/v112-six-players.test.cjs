'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {WebSocketServer,WebSocket}=require('ws');
const {chromium}=require('playwright-core');
const WAIT=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const connections=new Map(),server=new WebSocketServer({host:'127.0.0.1',port:0});
 await new Promise(r=>server.once('listening',r));const port=server.address().port;
 const rooms=new Map(),stats={data:0,snapshot:0,inputs:0,worldPart:0,dropped:0,bytes:0,snapshotBytes:0};let impaired=false,packets=0;
 const send=(ws,packet)=>{if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(packet))};
 server.on('connection',(ws,req)=>{
  const room=(/^\/room\/([^/?]+)/.exec(req.url)||[])[1]||'NONE';
  let id=null;ws.on('message',raw=>{
   let p;try{p=JSON.parse(String(raw))}catch{return}
   if(!p||typeof p.t!=='string')return;
   if(p.t==='HELLO'){
    const map=rooms.get(room)||new Map();rooms.set(room,map);
    if(map.has(p.id)){send(ws,{t:'ERROR',reason:'ID already in room'});ws.close();return}
    id=p.id;map.set(id,ws);send(ws,{t:'OPEN',id});return;
   }
   if(!id)return;
   if(p.t==='PING'){send(ws,{t:'PONG'});return}
   if(p.t==='ROOM_STATUS')return;
   if(!['CONNECT','ACCEPT','DATA','CLOSE'].includes(p.t))return;
   const to=rooms.get(room)?.get(p.dst);if(!to){send(ws,{t:'ERROR',reason:'Host or peer not connected',cid:p.cid});return}
   if(p.t==='DATA'){
    stats.data++;stats.bytes+=String(raw).length;
    if(p.value?.t==='snapshot'){stats.snapshot++;stats.snapshotBytes+=String(raw).length}
    if(p.value?.t==='input')stats.inputs++;if(p.value?.t==='worldPart')stats.worldPart++;
   }
   const forward={t:p.t,src:id,cid:p.cid,...(p.t==='DATA'?{value:p.value}:{})};
   if(impaired&&p.t==='DATA'&&p.value?.t==='snapshot'){
    packets++;
    if(packets%11===0){stats.dropped++;return}
    setTimeout(()=>send(to,forward),35+(packets%4)*28);
   }else send(to,forward);
  });
  ws.on('close',()=>{
   if(!id)return;rooms.get(room)?.delete(id);
   for(const other of rooms.get(room)?.values()||[])send(other,{t:'PEER_LEFT',src:id});
  });
 });
 const browser=await chromium.launch({headless:true,executablePath:['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync),args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 const contexts=[],logs=[];
 try{
  async function make(label){
   const ctx=await browser.newContext({viewport:{width:412,height:844},isMobile:true,hasTouch:true});
   contexts.push(ctx);
   await ctx.addInitScript(port=>{const Original=window.WebSocket;
     window.WebSocket=class TestRelay extends Original{
      constructor(uri,protocols){super(String(uri).replace(/^wss:\/\/nocna-straza-relay\.stefanstevic1996\.workers\.dev/,'ws://127.0.0.1:'+port),protocols)}
     }
   },port);
   const p=await ctx.newPage();p.on('pageerror',e=>{const x=label+': '+String(e);logs.push(x);console.log('ERROR',x.slice(0,400))});
   await p.goto('file://'+path.resolve(__dirname,'../public/v112/index.html'),{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>!!window.__nightWatch?.NET&&!!window.NS109_VILLAGE,{timeout:12000});
   return p;
  }
  const host=await make('host'),guest=await make('guest'),others=[];
  const inspect=async p=>await p.evaluate(()=>({role:window.__nightWatch.NET.role,phase:window.__nightWatch.NET.phase,round:window.__nightWatch.NET.round,code:window.__nightWatch.NET.code,ready:window.__nightWatch.NET.worldReady,peers:window.__nightWatch.NET.clients.size,snap:window.__nightWatch.NET.lastSnapSeq,localReady:window.__nightWatch.NET.localReady}));
  await host.evaluate(()=>{document.getElementById('coopBtn').click();document.getElementById('hostBtn').click()});
  await host.waitForFunction(()=>window.__nightWatch?.NET?.phase==='lobby'&&window.__nightWatch.NET.code,{timeout:15000});
  const code=(await inspect(host)).code;console.log('ROOM',code);
  await guest.evaluate(code=>{document.getElementById('coopBtn').click();document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},code);
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.worldReady===true,{timeout:26000});
  await host.waitForFunction(()=>window.__nightWatch?.NET?.worldReadyPlayers?.get('p2')===true,{timeout:10000});
  for(let i=0;i<4;i++){
   const page=await make('guest-'+(i+2));others.push(page);
   await page.evaluate(code=>{document.getElementById('coopBtn').click();document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},code);
   await page.waitForFunction(()=>window.__nightWatch?.NET?.worldReady===true,{timeout:26000});
  }
  await host.waitForFunction(()=>window.__nightWatch?.NET?.clients?.size===5&&window.__nightWatch.NET.worldReadyPlayers.size===5,{timeout:15000});
  console.log('SIX-PLAYER LOBBY',await inspect(host),await inspect(guest));
  assert.equal(await host.evaluate(()=>window.__nightWatch.startLobbyMatch()),true,'All six players can start');
  impaired=true;
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.phase==='playing',{timeout:12000});
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.lastSnapSeq>2,{timeout:8000});
  // V112: verify per-guest diagnostics work during an active real-protocol match.
  assert.equal(await guest.evaluate(()=>typeof window.__NS112_MP_DIAG),'function');
  await host.waitForFunction(()=>window.__NS112_MP_DIAG?.().guestReports.some(x=>x.id==='p2'&&x.fps>0),{timeout:10000});
  assert.ok((await guest.evaluate(()=>window.__NS112_MP_DIAG())).snapshot,'Guest snapshot diagnostics exposed');
  console.log('FIRST GAME',await inspect(host),await inspect(guest));
  impaired=false;
  await host.evaluate(()=>window.__nightWatch.finishNetworkRound(false));
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.phase==='lobby',{timeout:8000});
  await guest.evaluate(()=>window.__NS97_POST.vote('yes'));
  for(const page of others)await page.evaluate(()=>window.__NS97_POST.vote('yes'));
  await host.evaluate(()=>window.__NS97_POST.vote('yes'));
  await host.waitForFunction(()=>window.__nightWatch?.NET?.phase==='playing'&&window.__nightWatch.NET.round>=2,{timeout:14000});
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.phase==='playing'&&window.__nightWatch.NET.round>=2,{timeout:12000});
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.lastSnapSeq>2,{timeout:9000});
  console.log('REMATCH SUCCESS',await inspect(host),await inspect(guest));
  await host.evaluate(()=>window.__nightWatch.finishNetworkRound(false));
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.phase==='lobby',{timeout:8000});
  await guest.evaluate(()=>window.__nightWatch.leaveLobby());
  await host.waitForFunction(()=>window.__nightWatch?.NET?.clients?.size===4,{timeout:8000});
  await guest.evaluate(code=>{document.getElementById('coopBtn').click();document.getElementById('joinCode').value=code;document.getElementById('joinBtn').click()},code);
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.worldReady===true,{timeout:28000});
  await host.waitForFunction(()=>window.__nightWatch?.NET?.clients?.size===5&&window.__nightWatch.NET.worldReadyPlayers.get('p2')===true,{timeout:10000});
  console.log('REJOIN SUCCESS',await inspect(host),await inspect(guest));
  assert.equal((await inspect(guest)).round,(await inspect(host)).round,'Rejoining guest round must match host');
  await guest.waitForFunction(()=>window.__NS97_POST.active,{timeout:10000});
  await guest.evaluate(()=>window.__NS97_POST.vote('yes'));
  for(const page of others)await page.evaluate(()=>window.__NS97_POST.vote('yes'));
  await host.evaluate(()=>window.__NS97_POST.vote('yes'));
  await host.waitForFunction(()=>window.__nightWatch?.NET?.phase==='playing'&&window.__nightWatch.NET.round>=3,{timeout:15000});
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.phase==='playing'&&window.__nightWatch.NET.round>=3,{timeout:12000});
  await guest.waitForFunction(()=>window.__nightWatch?.NET?.lastSnapSeq>2,{timeout:10000});
  console.log('THIRD GAME AFTER REJOIN SUCCESS',await inspect(host),await inspect(guest));
  assert.ok(stats.snapshot>15,'Host delivered snapshots to multiple clients');
  assert.ok(stats.dropped>0,'Synthetic packet loss was exercised');
  assert.ok(stats.worldPart>2,'Host pipelined world chunks');
  assert.ok(!logs.some(x=>/ReferenceError|SyntaxError/.test(x)),logs.join('\n'));
  console.log('V112 6-player simulated relay, rematch, rejoin + jitter PASS',stats);
 }finally{
  for(const c of contexts)await c.close().catch(()=>{});
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error('V112 RELAY FAIL:',e.stack||e);process.exitCode=1});
