'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../public');
const voiceSource=fs.readFileSync(path.join(root,'v159-voice.js'),'utf8');
const gameSource=fs.readFileSync(path.join(root,'v140-net-mode.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new Function(voiceSource);new Function(gameSource);
assert.match(html,/<title>Night Watch v163/);
assert.match(html,/v140-net-mode\.js\?v=163/);
for(const id of ['ns163VoiceMode','ns163VoiceMic','ns163VoiceOff','ns163VoiceHint'])
 assert(gameSource.includes('id="'+id+'"'),'missing actual in-menu microphone setting: '+id);
assert.match(gameSource,/voiceScript\.src='\.\/v159-voice\.js\?v=163'/);
assert.match(gameSource,/drawArenaVoiceBadge\(g,p\.id,p\.x\+38,labelY-2\)/);
assert.match(voiceSource,/let mode='ptt'/);
assert.match(voiceSource,/if\(!transmitting\(\)\|\|!ready/);
assert.match(voiceSource,/setTrackEnabled\(false\)/);
assert.match(voiceSource,/event\.code!=='KeyV'/);
assert.doesNotMatch(voiceSource,/sendSnapshot|performAttack|coopXP|awardMP|localStorage/);
const docEvents={},winEvents={},created=[];
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.id='';this.handlers={};this.dataset={};this.style={};this.attrs={};this.isConnected=true;this.children=[]}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn)}
 fire(type,event={}){for(const fn of this.handlers[type]||[])fn({type,button:0,pointerId:3,preventDefault(){},...event})}
 append(...children){this.children.push(...children)}
 remove(){this.isConnected=false}
 setAttribute(k,v){this.attrs[k]=v}
 setPointerCapture(){}
}
const rootElement=new Element('section');rootElement.id='ns140Root';
const document={
 hidden:false,
 addEventListener:(type,fn)=>(docEvents[type]??=[]).push(fn),
 getElementById:id=>id==='ns140Root'?rootElement:created.find(el=>el.id===id&&el.isConnected)||null,
 createElement:tag=>{const el=new Element(tag);created.push(el);return el}
};
const win={addEventListener:(type,fn)=>(winEvents[type]??=[]).push(fn),dispatchEvent(){}};
let processor=null,clock=1000,opens=0;
class AudioContext{
 constructor(){this.sampleRate=48000;this.currentTime=0;this.state='running';this.destination={}}
 createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}}}
 createDynamicsCompressor(){return {threshold:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},connect(){},disconnect(){}}}
 createMediaStreamSource(){return {connect(){},disconnect(){}}}
 createBiquadFilter(){return {frequency:{value:0},type:'',connect(){},disconnect(){}}}
 createScriptProcessor(){processor={onaudioprocess:null,connect(){},disconnect(){}};return processor}
 resume(){return Promise.resolve()}
}
win.AudioContext=AudioContext;
class WebSocket{
 static OPEN=1;
 static instances=[];
 constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];WebSocket.instances.push(this)}
 send(data){this.sent.push(data)}
 close(){this.readyState=3}
}
let track={enabled:true,stop(){this.stopped=true}};
const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
const navigator={mediaDevices:{getUserMedia:async()=>{opens++;return stream}}};
vm.runInNewContext(voiceSource,{window:win,document,navigator,WebSocket,Event:class{constructor(type){this.type=type}},
 performance:{now:()=>clock},console,setTimeout:()=>1,clearTimeout(){}},{timeout:1000});
const voice=win.NS159_VOICE;
assert.equal(voice.mode,'ptt','Push-to-Talk must be default and opt-in via hold');
voice.mount({match:'a'.repeat(24),id:'p1',ticket:'b'.repeat(48),position:()=>null});
const ws=WebSocket.instances[0];ws.readyState=1;ws.onopen();
ws.onmessage({data:JSON.stringify({t:'ready',seat:'p1',codec:'log8'})});
assert.equal(voice.connected,true);
const hud=created.find(el=>el.id==='ns159Mic');assert(hud);
async function settle(){for(let i=0;i<8;i++)await Promise.resolve()}
const micSignals=()=>ws.sent.filter(v=>typeof v==='string').map(v=>JSON.parse(v)).filter(x=>x.t==='mic');
(async()=>{
 hud.fire('pointerdown',{pointerId:13});await settle();
 assert.equal(voice.transmitting,true,'holding mobile button opens mic');
 assert.equal(track.enabled,true,'track enabled while PTT held');
 assert(micSignals().some(m=>m.on===true),'authenticated room gets mic-on');
 assert.equal(voice.badgeState('p1'),1,'local speaker visible when hold starts');
 assert(processor?.onaudioprocess,'browser audio pipeline ready');
 processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4096).fill(.18)}});
 assert.equal(voice.badgeState('p1'),2,'speaker glows on actual speaking audio');
 assert(ws.sent.some(v=>v instanceof Uint8Array),'real encoded frames sent on voice-only socket');
 hud.fire('pointerup',{pointerId:13});
 assert.equal(voice.transmitting,false);
 assert.equal(track.enabled,false);
 assert.equal(voice.badgeState('p1'),0);
 assert.equal(micSignals().at(-1).on,false);
 assert.equal(micSignals().length,2,'one toggle on and one toggle off; no per-frame status spam');
 const opened=opens;
 const menuButton=new Element('button');voice.bindControl(menuButton);
 menuButton.fire('pointerdown',{pointerId:15});await settle();
 assert.equal(voice.transmitting,true);
 assert.equal(opens,opened,'PTT reuses capture pipeline without reprompting on every press');
 menuButton.fire('pointercancel',{pointerId:15});
 assert.equal(voice.transmitting,false,'finger cancel must mute');
 voice.setMode('toggle');
 assert.equal(voice.mode,'toggle');
 menuButton.fire('click');await settle();
 assert.equal(voice.transmitting,true,'toggle mode first click turns on mic');
 menuButton.fire('click');
 assert.equal(voice.transmitting,false,'toggle mode next click stops mic');
 voice.setMode('ptt');
 for(const fn of docEvents.keydown||[])fn({code:'KeyV',repeat:false,target:{tagName:'BODY'},preventDefault(){}});
 await settle();
 assert.equal(voice.transmitting,true,'desktop V holds voice');
 for(const fn of winEvents.keyup||[])fn({code:'KeyV'});
 assert.equal(voice.transmitting,false,'desktop V release mutes voice');
 voice.disableMic();assert.equal(voice.transmitting,false);
 document.hidden=true;
 for(const fn of docEvents.visibilitychange||[])fn();
 assert.equal(voice.transmitting,false,'background must never transmit');
 voice.stop();
 assert.equal(voice.badgeState('p1'),0);
 console.log('V163 PTT PASS: phone hold/release, menu hold/cancel, PC V, toggle, speaker VAD, no-game-socket and safe background');
})().catch(err=>{console.error(err);process.exitCode=1});
