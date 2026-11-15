/* Noćna Straža V159 experimental — LIVE player-to-player voice.
 * WebRTC audio mesh: max five audio connections/phone in six-seat rooms.
 * Cloudflare WebSocket carries SMALL, seat-authenticated ICE/SDP signaling ONLY;
 * no audio frames, blobs or microphone PCM travel over the game socket.
 * Tap-to-talk latching switch: off stops capture. No render-loop audio work.
 */
(()=>{
'use strict';
if(window.NS159_LIVE)return;
const SEAT=/^p[1-6]$/,MAX_PEERS=5,POLL_MS=400;
const STUN=[{urls:'stun:stun.l.google.com:19302'}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const attenuation=distance=>.11+.89*Math.exp(-Math.max(0,distance)/490);
const safeGet=()=>{try{return localStorage.getItem('ns159_live_listen')!=='false'}catch{return true}};
let listening=safeGet(),ws=null,seat='',allowed=[],getPosition=()=>null,onStatus=()=>{};
let micStream=null,micTrack=null,talking=false,busy=false,ctx=null,timer=null,epoch=0;
let sessionId='',lastError='',rtcAvailable=!!window.RTCPeerConnection,connections=new Map(),captureGen=0;
const stats={offers:0,answers:0,ice:0,sentAudioBytesViaGameSocket:0,micStarts:0,micStops:0,signalDrops:0};
function status(){
 const connected=[...connections.values()].filter(p=>p.pc.connectionState==='connected').length;
 return {talking,connecting:busy,listen:listening,connected,peers:connections.size,
  possible:allowed.filter(x=>x!==seat).length,available:rtcAvailable,
  micCaptured:!!micTrack,error:lastError,session:!!ws};
}
function publish(){try{onStatus(status())}catch{}}
function ensureAudio(){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return null;
 if(!ctx){try{ctx=new AC({latencyHint:'interactive'})}catch{return null}}
 if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 return ctx;
}
function send(message){
 if(!ws||ws.readyState!==1||ws.bufferedAmount>24000)return false;
 try{ws.send(JSON.stringify(message));return true}
 catch{stats.signalDrops++;return false}
}
function signal(to,kind,payload={}){
 if(!SEAT.test(to)||to===seat||!allowed.includes(to))return false;
 const packet={t:'rtc',to,kind,sid:sessionId,...payload};
 if(!send(packet)){stats.signalDrops++;return false}
 return true;
}
function dropPeer(id){
 const current=connections.get(id);if(!current)return;
 connections.delete(id);
 if(current.audio){try{current.audio.pause();current.audio.srcObject=null;current.audio.remove()}catch{}}
 for(const n of current.nodes)try{n.disconnect()}catch{}
 try{current.pc.ontrack=current.pc.onicecandidate=current.pc.onconnectionstatechange=null;current.pc.close()}catch{}
 publish();
}
function spatial(peer){
 const a=getPosition(seat),b=getPosition(peer.id),distance=a&&b?
  Math.hypot(a.x-b.x,a.y-b.y):1200;
 const volume=listening&&window.NS152_AUDIO?.sound!==false?
  attenuation(distance)*.8:0;
 const pan=a&&b?clamp((b.x-a.x)/790,-.45,.45):0;
 if(peer.gain&&ctx?.state==='running')peer.gain.gain.setTargetAtTime(volume,ctx.currentTime,.08);
 if(peer.pan)peer.pan.pan.setTargetAtTime(pan,ctx.currentTime,.08);
 if(peer.audio)peer.audio.volume=clamp(volume,0,1);
 return volume;
}
function attachRemote(peer,stream){
 if(!stream||peer.stream===stream)return;
 peer.stream=stream;
 if(peer.audio){try{peer.audio.pause();peer.audio.srcObject=null;peer.audio.remove()}catch{}peer.audio=null}
 for(const n of peer.nodes)try{n.disconnect()}catch{}
 peer.nodes=[];peer.gain=null;peer.pan=null;
 const audioCtx=ensureAudio();
 if(audioCtx?.createMediaStreamSource){
  try{
   const source=audioCtx.createMediaStreamSource(stream),gain=audioCtx.createGain();
   const pan=audioCtx.createStereoPanner?.();
   source.connect(gain);
   if(pan){gain.connect(pan);pan.connect(audioCtx.destination)}
   else gain.connect(audioCtx.destination);
   peer.nodes=pan?[source,gain,pan]:[source,gain];peer.gain=gain;peer.pan=pan;
   spatial(peer);
   return;
  }catch{}
 }
 const audio=document.createElement('audio');
 audio.autoplay=true;audio.playsInline=true;audio.srcObject=stream;
 audio.style.display='none';document.body.append(audio);peer.audio=audio;
 spatial(peer);
 audio.play().catch(()=>{lastError='Za slušanje dodirni dugme 🎤 ili meni';publish()});
}
function peerFor(id){
 if(!SEAT.test(id)||id===seat||!allowed.includes(id))return null;
 let peer=connections.get(id);
 if(peer)return peer;
 if(connections.size>=MAX_PEERS||!window.RTCPeerConnection)return null;
 const pc=new RTCPeerConnection({iceServers:STUN,bundlePolicy:'max-bundle'});
 peer={id,pc,transceiver:null,nodes:[],stream:null,audio:null,gain:null,pan:null,
  remoteSession:'',pending:[],busy:false,negotiated:false,offerSent:false,retries:0};
 connections.set(id,peer);
 try{
  peer.transceiver=pc.addTransceiver('audio',{direction:'sendrecv'});
  const codecs=window.RTCRtpReceiver?.getCapabilities?.('audio')?.codecs||[];
  const opus=codecs.filter(c=>c.mimeType?.toLowerCase()==='audio/opus');
  if(opus.length&&peer.transceiver.setCodecPreferences)peer.transceiver.setCodecPreferences(opus);
  if(micTrack)peer.transceiver.sender.replaceTrack(micTrack).catch(()=>{});
  // Best-effort 24 kbps/peer Opus cap for up to 5 uplink audio streams.
  const sender=peer.transceiver.sender,params=sender.getParameters?.();
  if(params?.encodings?.length){
   params.encodings[0].maxBitrate=24000;
   sender.setParameters(params).catch(()=>{});
  }
 }catch{dropPeer(id);return null}
 pc.onicecandidate=e=>{
  if(e.candidate&&connections.get(id)===peer){
   stats.ice++;signal(id,'ice',{candidate:e.candidate.toJSON?.()||e.candidate});
  }
 };
 pc.onconnectionstatechange=()=>{
  if(connections.get(id)!==peer)return;
  if(pc.connectionState==='failed'){
   lastError='Direktna audio veza nije uspela (moguće je da je potreban TURN na 4G/5G).';
  }
  if(pc.connectionState==='closed')dropPeer(id);
  publish();
 };
 pc.ontrack=e=>{if(connections.get(id)!==peer)return;
  attachRemote(peer,e.streams?.[0]||new MediaStream([e.track]));
 };
 publish();
 return peer;
}
async function offer(id){
 const peer=peerFor(id);
 if(!peer||peer.busy||peer.pc.signalingState!=='stable')return false;
 peer.busy=true;
 try{
  const desc=await peer.pc.createOffer();
  await peer.pc.setLocalDescription(desc);
  stats.offers++;peer.offerSent=true;
  return signal(id,'offer',{sdp:peer.pc.localDescription?.sdp||desc.sdp});
 }catch{stats.signalDrops++;return false}
 finally{peer.busy=false}
}
async function drain(peer){
 if(!peer.pc.remoteDescription)return;
 for(const candidate of peer.pending.splice(0)){
  try{await peer.pc.addIceCandidate(candidate)}catch{}
 }
}
async function handleRtc(msg){
 if(!msg||msg.t!=='rtc')return false;
 const from=msg.from;
 if(!SEAT.test(from)||from===seat||!allowed.includes(from))return true;
 if(typeof msg.sid!=='string'||msg.sid.length>48||!/^[a-zA-Z0-9_-]+$/.test(msg.sid))return true;
 if(msg.kind==='ready'){
  const old=connections.get(from);
  if(old&&old.remoteSession===msg.sid)return true;
  if(old)dropPeer(from);
  const p=peerFor(from);if(!p)return true;
  p.remoteSession=msg.sid;
  if(seat<from)void offer(from);
  else signal(from,'ready'); // remote reconnect completes the same mesh safely
  return true;
 }
 let peer=connections.get(from);
 if(peer?.remoteSession&&peer.remoteSession!==msg.sid){
  // A reconnect replaces old DTLS/ICE keys. Never accept stale answer/ICE.
  if(msg.kind!=='offer')return true;
  dropPeer(from);peer=null;
 }
 peer=peer||peerFor(from);
 if(!peer)return true;
 if(!peer.remoteSession)peer.remoteSession=msg.sid;
 if(msg.kind==='offer'){
  if(typeof msg.sdp!=='string'||msg.sdp.length>12000||peer.pc.signalingState==='closed')return true;
  try{
   // Deterministic negotiation: lower-numbered seat initiates every pair,
   // eliminating simultaneous-offer collisions and keeping one peer/seat.
   if(from>seat)return true;
   await peer.pc.setRemoteDescription({type:'offer',sdp:msg.sdp});
   await peer.pc.setLocalDescription(await peer.pc.createAnswer());
   stats.answers++;
   signal(from,'answer',{sdp:peer.pc.localDescription.sdp});
   await drain(peer);
  }catch{stats.signalDrops++}
 }else if(msg.kind==='answer'){
  if(typeof msg.sdp!=='string'||msg.sdp.length>12000)return true;
  if(seat>from||peer.pc.signalingState!=='have-local-offer')return true;
  try{await peer.pc.setRemoteDescription({type:'answer',sdp:msg.sdp});await drain(peer)}
  catch{stats.signalDrops++}
 }else if(msg.kind==='ice'){
  const candidate=msg.candidate;
  if(!candidate||typeof candidate.candidate!=='string'||candidate.candidate.length>1800)return true;
  if(peer.pc.remoteDescription){try{await peer.pc.addIceCandidate(candidate)}catch{}}
  else if(peer.pending.length<80)peer.pending.push(candidate);
 }
 publish();
 return true;
}
function receive(msg){
 if(!msg||msg.t!=='rtc')return false;
 void handleRtc(msg).catch(()=>{stats.signalDrops++});
 return true;
}
function announce(){signalAll('ready')}
function signalAll(kind){for(const id of allowed)if(id!==seat)signal(id,kind)}
function syncOnline(ids){
 if(!ws||!Array.isArray(ids))return;
 const next=new Set(ids.filter(x=>SEAT.test(x)&&allowed.includes(x)&&x!==seat));
 for(const id of connections.keys())if(!next.has(id))dropPeer(id);
 // A lower-seat participant only starts the call after receiving 'ready'.
 // Sending ready on roster refresh also recovers signals lost during a join.
 for(const id of next)signal(id,'ready');
}
function stopCapture(){
 captureGen++;
 if(micTrack){try{micTrack.enabled=false} catch{}}
 const track=micTrack;micTrack=null;
 for(const peer of connections.values())
  peer.transceiver?.sender.replaceTrack(null).catch(()=>{});
 if(micStream){try{micStream.getTracks().forEach(t=>t.stop())}catch{}micStream=null}
 if(track)stats.micStops++;
 talking=false;busy=false;publish();
}
async function toggle(){
 if(!ws||!seat||!rtcAvailable){lastError='Glasovni chat je dostupan samo u aktivnom multiplayeru sa WebRTC podrškom';publish();return false}
 if(talking||busy){stopCapture();return false}
 if(!navigator.mediaDevices?.getUserMedia){lastError='Za mikrofon otvori igru preko HTTPS-a i omogući pristup mikrofonu';publish();return false}
 lastError='';busy=true;publish();
 const capturedEpoch=epoch,capturedGen=captureGen;
 // getUserMedia is called directly from the user click, before first await.
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{
   echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:{ideal:1}},video:false});
  if(capturedEpoch!==epoch||capturedGen!==captureGen||!ws){stream.getTracks().forEach(t=>t.stop());return false}
  const track=stream.getAudioTracks()[0];if(!track)throw Error('Nije pronađen audio track');
  track.contentHint='speech';track.enabled=true;track.onended=()=>stopCapture();
  micStream=stream;micTrack=track;
  await Promise.all([...connections.values()].map(p=>p.transceiver.sender.replaceTrack(track).catch(()=>{})));
  if(capturedEpoch!==epoch||capturedGen!==captureGen){stopCapture();return false}
  ensureAudio();talking=true;stats.micStarts++;
  return true;
 }catch(err){
  lastError=err?.name==='NotAllowedError'?'Dozvola za mikrofon je odbijena':
   'Mikrofon nije dostupan: '+String(err?.name||'greška');
  stopCapture();return false;
 }finally{busy=false;publish()}
}
function setListening(v){
 listening=!!v;
 try{localStorage.setItem('ns159_live_listen',String(listening))}catch{}
 if(listening)ensureAudio();
 for(const peer of connections.values())spatial(peer);
 publish();return listening;
}
function attach(socket,id,seats,position,statusCallback){
 stop();
 if(!socket||!SEAT.test(id)||!Array.isArray(seats)||seats.length<2||seats.length>6)return false;
 ws=socket;seat=id;allowed=[...new Set(seats.filter(x=>SEAT.test(x)))];
 if(!allowed.includes(seat)){ws=null;seat='';return false}
 getPosition=typeof position==='function'?position:()=>null;
 onStatus=typeof statusCallback==='function'?statusCallback:()=>{};
 epoch++;sessionId='s'+Math.random().toString(36).slice(2,13);
 lastError='';rtcAvailable=!!window.RTCPeerConnection;
 if(!rtcAvailable)lastError='WebRTC nije dostupan u ovom pregledaču';
 timer=setInterval(()=>{
  if(document.hidden||!listening)return;
  for(const peer of connections.values())spatial(peer);
 },POLL_MS);
 // Do not request microphone without a user gesture, ever.
 announce();publish();return true;
}
function unlock(){ensureAudio()}
function stop(){
 epoch++;stopCapture();
 if(timer)clearInterval(timer);timer=null;
 for(const id of [...connections.keys()])dropPeer(id);
 ws=null;seat='';allowed=[];sessionId='';getPosition=()=>null;
 publish();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCapture()});
window.NS159_LIVE=Object.freeze({attach,receive,syncOnline,toggle,stop,unlock,setListening,attenuation,status,
 get stats(){return {...stats,connected:status().connected,peers:connections.size,remoteStreams:[...connections.values()].filter(p=>!!p.stream).length}},
 get active(){return talking}});
})();
