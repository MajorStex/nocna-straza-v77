/* Noćna Straža V159 — optional server-relayed microphone chat for the authoritative New Zone.
 * Voice never uses the game socket, game ticks, player input queues or saved recordings.
 * Browser input -> 12kHz mono log-companded 8-bit frames -> private server relay -> Web Audio.
 * Microphone OFF by default; consent required. No server-side recordings or persistence.
 */
(()=>{
'use strict';
if(window.NS159_VOICE)return;
const RELAY='wss://nocna-straza-relay.stefanstevic1996.workers.dev/voice/';
const RATE=12000,LOG=Math.log(256),MAX_BUFFER=.35;
let session=null,socket=null,ready=false,context=null,master=null,limiter=null;
let mic=null,source=null,filter=null,processor=null,silence=null,micOn=false,micPending=false;
let mode='ptt',pttKeyHeld=false,lastHeldPointer=null,requestEpoch=0;
const pttPointers=new Set();
const transmitting=()=>micOn&&(mode==='toggle'||pttKeyHeld||pttPointers.size>0);
const emitVoiceChange=()=>window.dispatchEvent(new Event('nsVoiceChanged'));
function setTrackEnabled(value){
 if(mic)for(const track of mic.getAudioTracks())track.enabled=!!value;
}
function endPTT(){
 const was=transmitting();
 pttKeyHeld=false;pttPointers.clear();lastHeldPointer=null;
 if(was&&!transmitting())signalMic(false);
 if(mode==='ptt')setTrackEnabled(false);
 lastLocalVoice=0;redraw();
}
function beginPTT(){
 if(mode!=='ptt'||document.hidden)return;
 const was=transmitting();pttKeyHeld=true;
 if(micOn){setTrackEnabled(true);if(!was)signalMic(true)}
 else if(!micPending)startMic();
 redraw();
}
function setMode(next){
 if(next!=='ptt'&&next!=='toggle')return;
 if(mode===next)return;
 endPTT();stopMic();
 mode=next;redraw();
 notice(next==='ptt'?'Push-to-Talk: drži 🎙 ili V na tastaturi.':'Toggle: jednim dodirom uključi ili isključi mikrofon.');
}
function toggleMic(){
 if(mode!=='toggle')return;
 if(micOn)stopMic();else startMic();
}
let reconnectTimer=null,attempts=0,button=null,info=null,lastPacketAt=0;
// Small room-only state: 6 peers, one transition packet per toggle.
const speakers=new Map(),remoteMics=new Set(),lastVoice=new Map();
let lastLocalVoice=0;
function signalMic(on){
 if(socket?.readyState===WebSocket.OPEN&&ready&&session)
  try{socket.send(JSON.stringify({t:'mic',on:!!on}))}catch{}
}
function badgeState(id,now=performance.now()){
 if(!session||!ready||!testSeat(id)||document.hidden)return 0;
 const enabled=id===session.id?transmitting():remoteMics.has(id);
 if(!enabled)return 0;
 const speaking=id===session.id?now-lastLocalVoice<850:now-(lastVoice.get(id)||-1e8)<1000;
 return speaking?2:1;
}
const testSeat=x=>/^p[1-6]$/.test(String(x||''));
const encode=x=>{const a=Math.min(1,Math.abs(x)),c=Math.log(1+255*a)/LOG;return Math.max(0,Math.min(255,Math.round((Math.sign(x)*c+1)*127.5)))};
const decode=x=>{const v=(x/255)*2-1;return Math.sign(v)*(Math.pow(256,Math.abs(v))-1)/255};
function audio(){
 if(context)return context;
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return null;
 try{
  context=new AC({latencyHint:'interactive'});
  master=context.createGain();master.gain.value=.52;
  limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-18;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;
  master.connect(limiter);limiter.connect(context.destination);
  return context;
 }catch{return null}
}
function notice(message){if(info)info.textContent=message}
function redraw(){
 const active=transmitting();
 if(button){
  button.textContent=mode==='ptt'?(active?'🟢 GOVORIŠ — PUSTI':'🎙 DRŽI ZA PRIČU (V)'):
   micOn?'🎙 MIC UKLJUČEN — UGASI':'🎙 UKLJUČI MIKROFON';
  button.style.background=active?'#246c50':'#263f3c';
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',mode==='ptt'?'Drži za razgovor; pustiti za utišavanje':'Uključi ili isključi mikrofon');
 }
 emitVoiceChange();
}
function stopMic(){
 requestEpoch++;
 if(transmitting())signalMic(false);
 pttKeyHeld=false;pttPointers.clear();lastHeldPointer=null;
 micOn=false;lastLocalVoice=0;
 if(processor){processor.onaudioprocess=null;try{processor.disconnect()}catch{}processor=null}
 for(const n of [filter,source,silence])if(n)try{n.disconnect()}catch{}
 filter=source=silence=null;
 if(mic){for(const track of mic.getTracks())track.stop();mic=null}
 redraw();
}
function distanceGain(id){
 const get=session?.position;
 if(typeof get!=='function')return .48;
 const a=get(session.id),b=get(id);
 if(!a||!b||!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(b.x)||!Number.isFinite(b.y))return .48;
 const d=Math.hypot(a.x-b.x,a.y-b.y);
 return .16+.84*Math.pow(Math.max(0,1-Math.min(1500,d)/1500),1.5);
}
function playback(packet){
 if(!session||document.hidden||!ready||packet.length<121)return;
 const seat='p'+String.fromCharCode(packet[0]);if(!testSeat(seat)||seat===session.id)return;
 // A received audio frame drives the icon; it does not touch game snapshots.
 lastVoice.set(seat,performance.now());
 const ctx=audio();if(!ctx||ctx.state!=='running')return;
 let p=speakers.get(seat);
 if(!p){const gain=ctx.createGain();gain.gain.value=distanceGain(seat);gain.connect(master);p={gain,next:0};speakers.set(seat,p)}
 p.gain.gain.setTargetAtTime(distanceGain(seat),ctx.currentTime,.05);
 const n=packet.length-1,buffer=ctx.createBuffer(1,n,RATE),samples=buffer.getChannelData(0);
 for(let i=0;i<n;i++)samples[i]=decode(packet[i+1]);
 const now=ctx.currentTime;
 // Late/mobile packets never build an unbounded backlog or stall game rendering.
 if(p.next<now||p.next>now+MAX_BUFFER)p.next=now+.12;
 const sound=ctx.createBufferSource();sound.buffer=buffer;sound.connect(p.gain);
 sound.onended=()=>{try{sound.disconnect()}catch{}};
 sound.start(p.next);p.next+=n/RATE;
}
function capture(event){
 if(!transmitting()||!ready||document.hidden||socket?.readyState!==WebSocket.OPEN||socket.bufferedAmount>6000)return;
 const d=event.inputBuffer.getChannelData(0),sr=context.sampleRate;
 const count=Math.floor(d.length*RATE/sr);
 if(count<120||count>1700)return;
 const bytes=new Uint8Array(count),ratio=sr/RATE;
 let sum=0;
 for(let i=0;i<count;i++){
  const k=Math.floor(i*ratio),end=Math.min(d.length,Math.max(k+1,Math.floor((i+1)*ratio)));
  let v=0;for(let j=k;j<end;j++)v+=d[j];
  v/=(end-k);sum+=v*v;bytes[i]=encode(v);
 }
 const rms=Math.sqrt(sum/count),now=performance.now();
 // Voice activity detection avoids streaming background hiss and saves Worker budget.
 if(rms<.012&&now-lastPacketAt>240)return;
 if(rms>=.012){lastPacketAt=now;lastLocalVoice=now}
 try{socket.send(bytes)}catch{}
}
async function startMic(){
 if(micOn||micPending)return;
 if(!session||!ready||socket?.readyState!==WebSocket.OPEN){notice('Glasovni server još nije povezan.');return}
 const ctx=audio();
 if(!ctx||!navigator.mediaDevices?.getUserMedia||!ctx.createScriptProcessor){notice('Mikrofon nije podržan u ovom pregledaču.');return}
 micPending=true;const epoch=++requestEpoch;
 try{
  await ctx.resume();
  const stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1
  },video:false});
  if(!session||!ready||epoch!==requestEpoch){stream.getTracks().forEach(t=>t.stop());return}
  mic=stream;source=ctx.createMediaStreamSource(stream);filter=ctx.createBiquadFilter();
  filter.type='highpass';filter.frequency.value=125;
  processor=ctx.createScriptProcessor(4096,1,1);silence=ctx.createGain();silence.gain.value=0;
  source.connect(filter);filter.connect(processor);processor.connect(silence);silence.connect(ctx.destination);
  micOn=true;processor.onaudioprocess=capture;
  setTrackEnabled(transmitting());
  if(transmitting())signalMic(true);
  for(const track of stream.getTracks())track.onended=stopMic;
  redraw();notice(mode==='ptt'?'PTT spreman. Drži dugme ili slovo V da pričaš.':'Mikrofon uključen — dodirni ponovo za gašenje.');
 }catch{stopMic();notice('Mikrofon nije dozvoljen ili nije dostupan.')}
 finally{micPending=false}
}
function closeSocket(){
 if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null}
 const ws=socket;socket=null;ready=false;remoteMics.clear();lastVoice.clear();
 if(ws){ws.onopen=ws.onclose=ws.onmessage=ws.onerror=null;try{ws.close()}catch{}}
}
function connect(){
 if(!session||document.hidden||socket)return;
 const current=session;
 let ws;try{ws=new WebSocket(RELAY+current.match)}catch{notice('Glasovni server nije dostupan.');return}
 socket=ws;ready=false;ws.binaryType='arraybuffer';
 notice('Povezujem glasovni kanal…');
 ws.onopen=()=>{if(socket===ws&&session===current)ws.send(JSON.stringify({t:'hello',id:current.id,ticket:current.ticket}))};
 ws.onmessage=e=>{
  if(socket!==ws||session!==current)return;
  if(e.data instanceof ArrayBuffer){playback(new Uint8Array(e.data));return}
  let msg;try{msg=JSON.parse(e.data)}catch{return}
  if(msg.t==='ready'&&msg.seat===current.id&&msg.codec==='log8'){
   ready=true;attempts=0;remoteMics.clear();lastVoice.clear();notice('Glas povezan · mikrofon je podrazumevano isključen.');
   audio()?.resume().catch(()=>{});
  }
  if(msg.t==='mic'&&testSeat(msg.seat)&&msg.seat!==current.id&&typeof msg.on==='boolean'){
   if(msg.on)remoteMics.add(msg.seat);
   else {remoteMics.delete(msg.seat);lastVoice.delete(msg.seat)}
  }
  if(msg.t==='micState'&&Array.isArray(msg.seats)){
   remoteMics.clear();
   for(const seat of msg.seats.slice(0,6))if(testSeat(seat)&&seat!==current.id)remoteMics.add(seat);
  }
 };
 ws.onclose=()=>{
  if(socket!==ws)return;
  socket=null;ready=false;stopMic();
  if(!session||session!==current||document.hidden)return;
  if(++attempts>5){notice('Glas nije dostupan; igra nastavlja bez njega.');return}
  notice('Glas se ponovo povezuje; igra radi normalno…');
  reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect()},Math.min(6000,1000+attempts*800));
 };
 ws.onerror=()=>{if(socket===ws)notice('Privremena greška glasovnog servera.')};
}
function bindControl(target){
 if(!target||target.dataset.nsPttBound)return;
 target.dataset.nsPttBound='1';
 target.addEventListener('pointerdown',event=>{
  if(mode!=='ptt'||event.button>0)return;
  event.preventDefault();pttPointers.add(event.pointerId);lastHeldPointer=event.pointerId;
  try{target.setPointerCapture(event.pointerId)}catch{}
  if(micOn){setTrackEnabled(true);signalMic(true)}else if(!micPending)startMic();
  redraw();
 });
 const release=event=>{
  if(mode!=='ptt'||!pttPointers.has(event.pointerId))return;
  pttPointers.delete(event.pointerId);
  if(!transmitting()){setTrackEnabled(false);signalMic(false);lastLocalVoice=0}
  redraw();
 };
 target.addEventListener('pointerup',release);
 target.addEventListener('pointercancel',release);
 target.addEventListener('lostpointercapture',release);
 target.addEventListener('click',event=>{
  if(mode==='toggle'){event.preventDefault();toggleMic()}
 });
}
function installUI(){
 const root=document.getElementById('ns140Root');if(!root)return;
 if(button&&button.isConnected)return;
 const wrap=document.createElement('div');wrap.id='ns159Voice';
 wrap.style.cssText='position:absolute;z-index:18;right:11px;bottom:calc(18px + env(safe-area-inset-bottom));display:grid;gap:4px;max-width:min(210px,52vw);padding:6px;background:#102620dc;border:1px solid #7f9b8c;border-radius:10px;pointer-events:auto';
 button=document.createElement('button');button.type='button';button.id='ns159Mic';
 button.style.cssText='font:700 11px system-ui;min-height:40px;border-radius:8px;border:1px solid #a8bfb0;color:#f4ebcf;padding:7px';
 bindControl(button);
 info=document.createElement('small');info.id='ns159VoiceInfo';
 info.style.cssText='font:10px/1.3 system-ui;color:#cbd9cc;pointer-events:none';
 info.textContent='Glas nije povezan';
 wrap.append(button,info);root.append(wrap);redraw();
}
function mount(config){
 if(!config||!testSeat(config.id)||!(/^[a-f0-9]{24}$/).test(config.match)||typeof config.ticket!=='string'||config.ticket.length!==48)return;
 if(session?.match===config.match&&session?.id===config.id){session.position=config.position;installUI();if(!socket)connect();return}
 stop();session={...config};attempts=0;installUI();connect();
}
function stop(){
 stopMic();closeSocket();session=null;attempts=0;remoteMics.clear();lastVoice.clear();lastLocalVoice=0;
 for(const p of speakers.values())try{p.gain.disconnect()}catch{}
 speakers.clear();
 const wrap=document.getElementById('ns159Voice');if(wrap)wrap.remove();button=null;info=null;
}
// Mobile browsers allow audible playback only after a real user gesture.
document.addEventListener('pointerdown',()=>{if(session)audio()?.resume().catch(()=>{})},{passive:true});
document.addEventListener('keydown',()=>{if(session)audio()?.resume().catch(()=>{})});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){stopMic();closeSocket()}else if(session)connect();
});
window.addEventListener('pagehide',()=>{stopMic();closeSocket()});
window.addEventListener('blur',endPTT);
window.addEventListener('keyup',event=>{
 if(event.code!=='KeyV')return;
 pttKeyHeld=false;if(mode==='ptt'){
  if(!transmitting()){setTrackEnabled(false);signalMic(false)}
  redraw();
 }
});
document.addEventListener('keydown',event=>{
 if(mode!=='ptt'||event.code!=='KeyV'||event.repeat||
   ['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName))return;
 event.preventDefault();beginPTT();
});
window.addEventListener('pageshow',()=>{if(session&&!socket&&!document.hidden)connect()});
window.NS159_VOICE={mount,stop,badgeState,setMode,toggleMic,beginPTT,endPTT,bindControl,disableMic:stopMic,
 get connected(){return ready},get microphoneOn(){return micOn},get transmitting(){return transmitting()},get mode(){return mode}};
window.dispatchEvent(new Event('ns159VoiceReady'));
})();