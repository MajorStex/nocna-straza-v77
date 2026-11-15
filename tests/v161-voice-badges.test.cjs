'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../public');
const voice=fs.readFileSync(path.join(root,'v159-voice.js'),'utf8');
const game=fs.readFileSync(path.join(root,'v140-net-mode.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new Function(voice);new Function(game);
assert.match(html,/<title>Night Watch v162/);
assert.match(html,/v140-net-mode\.js\?v=162/);
assert.match(game,/voiceScript\.src='\.\/v159-voice\.js\?v=161'/);
assert.match(game,/function drawArenaVoiceBadge\(g,id,x,y\)/);
assert.match(game,/drawArenaVoiceBadge\(g,p\.id,p\.x\+38,labelY-2\)/);
assert.match(game,/window\.NS159_VOICE\?\.badgeState\?\.\(id\)/);
assert.match(voice,/signalMic\(true\)/);
assert.match(voice,/signalMic\(false\)/);
assert.doesNotMatch(voice,/sendSnapshot|performAttack|coopXP|awardMP|localStorage/);
let clock=1000;
class Socket {
 static OPEN=1;
 constructor(url){this.url=url;this.readyState=1;this.sent=[];this.bufferedAmount=0;this.binaryType='';sockets.push(this)}
 send(s){this.sent.push(s)}
 close(){this.readyState=3}
}
const sockets=[];
const window={addEventListener(){},dispatchEvent(){}};
const document={hidden:false,addEventListener(){},getElementById(){return null}};
const ctx=vm.createContext({window,document,WebSocket:Socket,performance:{now:()=>clock},
 navigator:{},setTimeout(){return 1},clearTimeout(){},console,Math,Event:class {constructor(type){this.type=type}}});
vm.runInContext(voice,ctx,{timeout:1000});
const api=window.NS159_VOICE;
assert(api&&typeof api.badgeState==='function');
api.mount({match:'a'.repeat(24),ticket:'b'.repeat(48),id:'p1',position:()=>null});
const ws=sockets.at(-1);assert(ws&&ws.url.includes('/voice/'));
ws.onopen();
assert.equal(JSON.parse(ws.sent[0]).t,'hello');
ws.onmessage({data:JSON.stringify({t:'ready',seat:'p1',codec:'log8'})});
assert.equal(api.badgeState('p2'),0,'a silent unmuted seat has no icon');
ws.onmessage({data:JSON.stringify({t:'mic',seat:'p2',on:true})});
assert.equal(api.badgeState('p2'),1,'toggle on: small standby speaker');
window.__socket=ws;
vm.runInContext("const sample=new Uint8Array(128);sample[0]=50;window.__socket.onmessage({data:sample.buffer})",ctx);
assert.equal(api.badgeState('p2'),2,'actual received audio: green speaking icon');
clock+=1500;
assert.equal(api.badgeState('p2'),1,'speaking indicator goes quiet after 1.5 seconds');
ws.onmessage({data:JSON.stringify({t:'mic',seat:'p2',on:false})});
assert.equal(api.badgeState('p2'),0,'toggle off must remove icon');
api.stop();
assert.equal(api.badgeState('p2'),0,'room cleanup must erase voice state');
console.log('V161 VOICE BADGES PASS: room-authenticated mic toggle, active remote speech, silence expiry, mute, cleanup, canvas-only render');
