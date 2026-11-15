'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const client=fs.readFileSync(path.resolve(__dirname,'../public/v140-net-mode.js'),'utf8');
assert.match(client,/netArena:true/,'all arena hero draws must explicitly opt out of local cosmetics');
assert.match(client,/t:'presence',state:'background'/,'minimized phone reports background instead of quit');
assert.match(client,/state==='disconnected'\?'DISCONNECTED'/,'only explicit server presence displays disconnect');
assert.match(html,/nsArenaPortrait:options.netArena===true/);
assert.match(html,/id:\/\^p\[1-6\]\$\/\.test\(String\(options.id\|\|''\)\)\?options.id:'p1'/,
 'shared hero renderer must use real seat ID, not constant p1');
assert.match(html,/e\.nsArenaPortrait\?\(gameLook\.ns109Sparta\?/,
 'network characters do not inherit this phone equipped Sparta skin');
const drawA=html.indexOf('function ns117DrawVillageHero('),drawB=html.indexOf('const ns117VillageLook',drawA);
assert.ok(drawA>=0&&drawB>drawA);
const blue={name:'PLAVI',skin:'#3366cc',wardrobe:{topColor:'#1122cc',torso:'#1111ff'},weapon:'sword',visualSize:.7};
const red={name:'CRVENI',skin:'#ee5511',wardrobe:{topColor:'#ff0000',torso:'#aa2222'},weapon:'sword',visualSize:1.1};
const seen=[],renderContext={ctx:null,heroStyle:blue,NET:{role:'host',localId:'p1',heroLooks:new Map()},
 networkHeroStyle:l=>l,MEDIEVAL_WEAPONS:{sword:{}},drawUprightHero:e=>seen.push(e),Math};
vm.createContext(renderContext);
vm.runInContext(html.slice(drawA,drawB)+';this.drawHero=ns117DrawVillageHero;',renderContext);
const canvas={save(){}};
assert.equal(renderContext.drawHero(canvas,0,0,{id:'p2',netArena:true,look:red}),true);
assert.equal(renderContext.drawHero(canvas,0,0,{id:'p1',netArena:true,look:blue}),true);
assert.equal(seen[0].id,'p2');assert.equal(seen[0].look.skin,'#ee5511');
assert.equal(seen[0].look.wardrobe.torso,'#aa2222');
assert.equal(seen[1].id,'p1');assert.equal(seen[1].look.wardrobe.topColor,'#1122cc');
assert.equal(seen[0].nsArenaPortrait,true);
// Exercise the existing pre-game host transition, not just the transfer packet.
const start=html.indexOf('const NS155_LOBBY='),end=html.indexOf('function leaveLobby(){',start);
assert.ok(start>=0&&end>start,'lobby ownership transfer module is present');
const mk=(net,more={})=>{
 const timers=[],messages=[],events={},notes=[],registered=[];
 const oldPeer={destroy(){registered.push('old destroyed')}},oldConn={close(){registered.push('old closed')}};
 const state={NET:{peer:oldPeer,conn:oldConn,readyPlayers:new Map(),worldReadyPlayers:new Map(),
  clients:new Map(),profiles:new Map(),remoteInputs:new Map(),roster:[],lobbyWaiting:[],
  startAcks:new Map(),pendingOffers:new Map(),...net},
  currentLobbyRoster:()=>net.roster||[],selectedMode:'arena140',NSX:{opt:{difficulty:2}},
  NETLAB:{clear(){}},NS92_DIR:{publish(){registered.push('publish')}},
  netStatus:v=>notes.push(v),showLobbyUI:()=>registered.push('UI'),
  broadcastLobby:()=>registered.push('broadcast'),closeNet:()=>registered.push('closeNet'),
  newGamePeer:id=>{const p={id,handlers:{},on(k,fn){this.handlers[k]=fn},destroy(){}};registered.push(p);return p;},
  setupConnection:()=>registered.push('connection'),
  setTimeout:cb=>{timers.push(cb);return timers.length;},clearTimeout:()=>{},
  $:()=>({value:'',click(){}}),...more};
 vm.createContext(state);
 vm.runInContext(html.slice(start,end)+';this.TRANSFER=NS155_LOBBY;',state);
 return {state,tm:state.TRANSFER,timers,messages,notes,registered};
};
const outgoing=[],host=mk({role:'host',phase:'lobby',hostId:'p1',localId:'p1',code:'GABZ27',
 roster:[{id:'p1'},{id:'p2'},{id:'p3'}],clients:new Map([
 ['p2',{open:true,send:x=>outgoing.push(x)}],['p3',{open:true,send:x=>outgoing.push(x)}]
 ])});
assert.equal(host.tm.prepareLeave(),true,'host can transfer on real Leave action');
assert.equal(outgoing.length,2);
assert.equal(outgoing[0].next,'p2');
assert.equal(outgoing[0].code,'GABZ27');
assert.equal(host.registered.includes('closeNet'),false,'host flushes transfer before closing relay');
host.timers[0]();assert.equal(host.registered.includes('closeNet'),true);
const guest=mk({role:'guest',phase:'lobby',hostId:'p1',localId:'p2',code:'GABZ27',
 roster:[{id:'p1'},{id:'p2'},{id:'p3'}]});
assert.equal(guest.tm.receive(outgoing[0]),true);
assert.equal(guest.timers.length,1);
guest.timers[0]();
assert.equal(guest.state.NET.role,'host','surviving seat becomes authoritative lobby owner');
assert.equal(guest.state.NET.localId,'p2','seat ID remains unchanged');
assert.equal(guest.state.NET.hostId,'p2');
assert.equal(guest.state.NET.phase,'connecting');
const peer=guest.registered.find(v=>v?.id==='ns30-gabz27');assert.ok(peer,'same room code is retained');
peer.handlers.open();
assert.equal(guest.state.NET.phase,'lobby');
assert.ok(guest.registered.includes('publish'));
assert.ok(guest.registered.includes('broadcast'));
const background=mk({role:'guest',phase:'lobby',hostId:'p1',localId:'p2',code:'GABZ27',
 roster:[{id:'p1'},{id:'p2'}]});
background.tm.lostHost();
assert.equal(background.timers.length,1);
assert.equal(background.state.NET.role,'guest','temporary socket loss is not immediate handoff');
assert.match(background.notes.at(-1),/privremeno/i);
console.log('V155 PASS: remote colors by player ID, background status, host handoff with same room and 45s grace');
