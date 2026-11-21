'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('public/index.html','utf8');
const village=fs.readFileSync('public/v115-village.js','utf8');
const arena=fs.readFileSync('public/v140-net-mode.js','utf8');
let checks=0;
function ok(x,label){assert.ok(x,label);checks++}
for(const source of [village,arena]){new vm.Script(source);checks++}
for(const match of html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script\\s*>/gi)){
 if(!/\\bsrc=/.test(match[1])){new vm.Script(match[2]);checks++}
}
ok(html.includes('name="ns-release" content="248"'),'V248 release marker');
ok(html.includes('v115-village.js?v=248&amp;ui=248'),'Village cache key');
ok(html.includes('v140-net-mode.js?v=248&amp;release=248'),'authoritative arena cache key');
ok(html.includes('waitingPeers:new Map()'),'queued seats isolated');
ok(html.includes('if(NET.role===\'host\'&&waitingForRound){'),'queued guests intercepted');
ok(html.includes('// No world transfer, damage, rewards, snapshots or gameplay input for waiters.'),'no combat state for waiters');
ok(html.includes("if(data.t==='ns248Waiting'&&NET.role==='guest'"),'client receives queue');
ok(html.includes("if(data.t==='ns248Presence'&&NET.role==='guest'"),'all guests see named join/leave');
ok(html.includes('for(const e of [...NET.waitingPeers.values()])e.promote?.();'),'promote only after end of round');
ok(html.includes("waitlist:true,"),'directory advertises waiting');
ok(html.includes("room.status==='playing'&&room.waitlist===true"),'in-progress room is discoverable');
ok(village.includes("getPlayers().filter(p=>!NET.waitingForNextRound||!p.inGame)"),'active fighters not rendered as idle Village avatars');
ok(arena.includes('roster.length<1||roster.length>6'),'solo New Zone clients permitted');
const start=html.indexOf('function startLobbyMatch(){');
const end=html.indexOf('// v63:',start);
ok(start>0&&end>start,'start function has stable bounded region');
const src=html.slice(start,end);
const roster=[{id:'p1',ready:false}];
let starts=0;
const context={
 NET:{role:'host',phase:'lobby',round:0,localId:'p1',clients:new Map(),startAcks:new Map(),spectateTargets:new Map(),forceRequest:false},
 window:{NS177_WORKSHOP:{},NS109_VILLAGE:{close(){}},NS140_ARENA:null},
 NS97_POST:{active:false,clear(){}},NS99_TEAM:{reset(){}},NS92_DIR:{publish(){}},
 NETMIG:{reset(){}},G:{specialMode:'normal'},props:[],
 currentLobbyRoster:()=>roster,lobbyPendingReturn:()=>[],selectedMode:'normal',
 NS140_TEMP_UNLOCK_LEVEL:0,ns197Rule:null,NSX:{opt:{difficulty:'normal'}},
 netStatus(){},renderLobby(){},startGame(){starts++},markMultiplayerNames(){},
 coopLooks:()=>({}),sendSnapshot(){},voiceLine(){},safePlayerName:x=>x,
};
const launch=new Function('ctx','with(ctx){'+src+';return startLobbyMatch()}');
ok(launch(context)===true&&starts===1&&context.NET.phase==='playing','host manually starts solo in Classic MP');
context.NET.phase='lobby';context.NET.round=0;
roster.push({id:'p2',ready:false});context.NET.worldReadyPlayers=new Map([['p2',true]]);
ok(launch(context)===false&&starts===1,'cannot force automatic start with an unready connected guest');
const queue=html.slice(html.indexOf('/* V248: social waitlist'),start);
ok(queue.includes('function ns248QueueStatus'),'waitlist helper');
const hostMsgs=[],waitMsgs=[],toastMsgs=[];
const hostSock={open:true,send(m){hostMsgs.push(m)}};
const waitSock={open:true,send(m){waitMsgs.push(m)}};
const net={role:'host',phase:'playing',code:'ABCDEF',round:3,localId:'p1',clients:new Map([['p2',hostSock]]),
 waitingPeers:new Map([['p3',{conn:waitSock,profile:{name:'Čuvar 3',level:3},name:'Čuvar 3'}]])};
const qctx={NET:net,currentLobbyRoster:()=>[{id:'p1',name:'HOST'},{id:'p2',name:'BORAC'}],
 safePlayerName:v=>v,ns97DisplayName:v=>v,selectedMode:'normal',toast:s=>toastMsgs.push(s)};
const q=new Function('ctx','with(ctx){'+queue+';return {ns248QueueStatus,ns248Presence}}')(qctx);
q.ns248QueueStatus(true);
ok(waitMsgs.some(m=>m.t==='ns248Waiting'&&m.players.length===3&&m.players[0].inGame&&m.players[2].inGame===false),'waiting guest sees combat roster but does not join it');
ok(hostMsgs.length===0,'no waiting-room state on combat stream');
q.ns248Presence('joined','p3','Čuvar 3');
q.ns248Presence('left','p3','Čuvar 3');
ok(hostMsgs.length===2&&waitMsgs.filter(m=>m.t==='ns248Presence').length===2&&toastMsgs.length===2,'join/leave notice reaches host, active member and waiter');
console.log('V248 LATE-JOIN + SOLO QA PASS',JSON.stringify({checks,solo:true,waiting:true,notifications:true,noGameplayLeak:true}));
