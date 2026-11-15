/* Noćna Straža V159 experimental — Hero Editor voice clips in New Zone.
 * No microphone streaming, no per-frame audio logic or remote speech synthesis.
 * Only audio specifically recorded by a player and opted into sharing is relayed.
 * Transfer a bounded clip once on demand; subsequent event cues are tiny packets.
 */
(()=>{
'use strict';
if(window.NS159_VOICES)return;
const KINDS=new Set(['preview','start','wave','boss','kill','level','hurt','dead','stage','victory','dash']);
const LIMIT=180*1024,CHUNK=4096,MAX_PARTS=45,MAX_CACHE=24;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const stats={sentBytes:0,receivedBytes:0,cuesSent:0,cuesPlayed:0,retransmits:0,rejected:0};
let ws=null,seat='',session=0,ctx=null,playing=0,latestCueAt=0;
const outbound=new Map(),incoming=new Map(),cache=new Map(),asked=new Map(),cooldowns=new Map();
const B=()=>window.__NS110_BRIDGE||{};
let positions=()=>null;
const settings=()=>B().getHeroVoicePreference?.()||{share:false,hear:false,volume:.52};
const enabled=()=>window.NS152_AUDIO?.sound!==false&&!document.hidden;
const volume=()=>{const n=Number(settings().volume);return clamp(Number.isFinite(n)?n:.52,0,1)};
const attenuation=distance=>.11+.89*Math.exp(-Math.max(0,distance)/490);
function sourcePosition(id){return positions(id)||null}
function gainFrom(source){
 const me=sourcePosition(seat),other=sourcePosition(source);
 const d=me&&other?Math.hypot(other.x-me.x,other.y-me.y):1200;
 return {gain:attenuation(d)*volume()*.86,
  pan:me&&other?clamp((other.x-me.x)/780,-.55,.55):0};
}
function unlock(){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!ctx&&AC)ctx=new AC({latencyHint:'interactive'});
  if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
 }catch{}
}
const now=()=>performance.now();
const valid=id=>typeof id==='string'&&/^[a-z0-9_-]{8,54}$/i.test(id);
function send(packet){
 if(!ws||ws.readyState!==1||ws.bufferedAmount>23000)return false;
 try{ws.send(JSON.stringify(packet));return true}catch{return false}
}
function stateKey(owner,id){return owner+':'+id}
function clearOld(){
 const at=now();
 for(const [key,v] of incoming)if(at-v.since>16000)incoming.delete(key);
 for(const [key,t] of asked)if(at-t>30000)asked.delete(key);
}
async function decode(state){
 if(state.buffer||state.decoding)return state.decoding||state.buffer;
 state.decoding=(async()=>{
  unlock();
  if(ctx){
   try{
    const audio=await ctx.decodeAudioData(state.bytes.buffer.slice(0));
    if(audio.duration>16)throw Error('voice too long');
    state.buffer=audio;
   }catch{/* Some Android formats need HTMLAudioElement fallback. */}
  }
  return state.buffer||null;
 })();
 return state.decoding;
}
function cachePut(key,state){
 if(cache.has(key))cache.delete(key);
 cache.set(key,state);while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
}
async function play(state,source){
 if(!enabled()||playing>=3)return false;
 const self=source===seat;
 if(!self&&!settings().hear)return false;
 const {gain,pan}=self?{gain:volume()*.86,pan:0}:gainFrom(source);
 if(gain<.001)return false;
 const media=await decode(state);
 if(!enabled()||(!self&&!settings().hear)||playing>=3)return false;
 if(ctx&&ctx.state==='suspended')await ctx.resume().catch(()=>{});
 if(media&&ctx?.state==='running'){
  try{
   const sourceNode=ctx.createBufferSource(),volume=ctx.createGain(),panner=ctx.createStereoPanner?.();
   sourceNode.buffer=media;volume.gain.value=clamp(gain,0,.95);
   sourceNode.connect(volume);
   if(panner){panner.pan.value=pan;volume.connect(panner);panner.connect(ctx.destination)}
   else volume.connect(ctx.destination);
   playing++;
   sourceNode.onended=()=>{playing=Math.max(0,playing-1);try{sourceNode.disconnect();volume.disconnect();panner?.disconnect()}catch{}};
   sourceNode.start();stats.cuesPlayed++;return true;
  }catch{}
 }
 // Browser audio decoder unavailable: use the original recording as HTML audio.
 try{
  const url=URL.createObjectURL(new Blob([state.bytes],{type:state.mime||'audio/webm'}));
  const audio=new Audio(url);audio.volume=clamp(gain,0,1);
  if('preservesPitch' in audio)audio.preservesPitch=true;
  playing++;
  const release=()=>{playing=Math.max(0,playing-1);URL.revokeObjectURL(url)};
  audio.onended=release;audio.onerror=release;
  await audio.play();stats.cuesPlayed++;return true;
 }catch{playing=Math.max(0,playing-1);stats.rejected++;return false}
}
function ready(key,state,owner){
 cachePut(key,state);
 if(state.queuedAt&&now()-state.queuedAt<4500)void play(state,owner);
}
function onPart(msg){
 if(!settings().hear||!valid(msg.id)||!KINDS.has(msg.kind)||
  !/^p[1-6]$/.test(msg.from)||msg.from===seat||
  !Number.isInteger(msg.part)||!Number.isInteger(msg.total)||msg.total<1||
  msg.total>MAX_PARTS||msg.part<0||msg.part>=msg.total||
  typeof msg.data!=='string'||msg.data.length>5600||
  !/^[A-Za-z0-9+/]*={0,2}$/.test(msg.data)||
  typeof msg.mime!=='string'||!/^audio\/[\w.+-]+(?:;\s*codecs=[\w.,+-]+)?$/i.test(msg.mime))return;
 clearOld();
 const key=stateKey(msg.from,msg.id);
 if(cache.has(key))return;
 let state=incoming.get(key);
 if(!state){
  if(incoming.size>=10){stats.rejected++;return}
  state={owner:msg.from,kind:msg.kind,mime:msg.mime,total:msg.total,
   parts:new Array(msg.total),count:0,bytes:0,since:now(),queuedAt:0};
  incoming.set(key,state);
 }
 if(state.kind!==msg.kind||state.mime!==msg.mime||state.total!==msg.total)return;
 if(state.parts[msg.part]!==undefined)return;
 let bytes;
 try{const raw=atob(msg.data);bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 }catch{stats.rejected++;return}
 if(bytes.length>CHUNK||state.bytes+bytes.length>LIMIT){incoming.delete(key);stats.rejected++;return}
 state.parts[msg.part]=bytes;state.count++;state.bytes+=bytes.length;stats.receivedBytes+=bytes.length;
 if(state.count===state.total){
  const joined=new Uint8Array(state.bytes);let offset=0;
  for(const part of state.parts){joined.set(part,offset);offset+=part.length}
  state.bytes=joined;delete state.parts;
  incoming.delete(key);ready(key,state,msg.from);
 }
}
function onCue(msg){
 if(!settings().hear||!KINDS.has(msg.kind)||!valid(msg.id)||
   !/^p[1-6]$/.test(msg.from)||msg.from===seat)return;
 const key=stateKey(msg.from,msg.id),clip=cache.get(key);
 if(clip){void play(clip,msg.from);return}
 const inflight=incoming.get(key);
 if(inflight){
  inflight.queuedAt=now();
  // Missing UDP-like behavior isn't assumed: WebSocket is ordered, but a
  // mobile reconnect can interrupt chunk transfer. Request the full cached
  // clip again only when one-time transfer remained incomplete after 900 ms.
  const want=session;
  setTimeout(()=>{
   if(want!==session||cache.has(key)||!incoming.has(key)||!settings().hear)return;
   if(now()-(asked.get(key)||-100000)<4800)return;
   asked.set(key,now());send({t:'vn',owner:msg.from,id:msg.id,kind:msg.kind});
  },900);
  return;
 }
 if(now()-(asked.get(key)||-100000)<4800)return;
 asked.set(key,now());
 send({t:'vn',owner:msg.from,id:msg.id,kind:msg.kind});
 // If the original upload is lost, request a targeted retransmission.
}
async function sendClip(state,target=''){
 const ticket=session,which=state.id,bytes=state.bytes,total=Math.ceil(bytes.length/CHUNK);
 if(total<1||total>MAX_PARTS)return false;
 for(let i=0;i<total;i++){
  if(session!==ticket||!ws||ws.readyState!==1||!settings().share)return false;
  for(let attempt=0;attempt<45&&ws.bufferedAmount>15500;attempt++)
   await new Promise(done=>setTimeout(done,50));
  if(ws.bufferedAmount>18000)return false;
  const part=bytes.subarray(i*CHUNK,(i+1)*CHUNK);
  // Small allocation only during a new/retransmitted clip, never in animation.
  let binary='';for(let k=0;k<part.length;k++)binary+=String.fromCharCode(part[k]);
  if(!send({t:'vp',id:which,kind:state.kind,part:i,total,mime:state.mime,
    data:btoa(binary),...(target?{to:target}:{})}))return false;
  stats.sentBytes+=part.length;
  await new Promise(done=>setTimeout(done,42)); // Keep gameplay traffic responsive.
 }
 return true;
}
async function getOwned(kind){
 const get=B().getHeroVoiceClip;
 const blob=get?.(kind)||get?.('preview');
 if(!(blob instanceof Blob)||!blob.size)return null;
 const old=outbound.get(kind);
 if(old&&old.original===blob)return old;
 let prepared=blob;
 try{if(blob.size>LIMIT)prepared=await B().prepareHeroVoiceClip?.(blob)||null}catch{return null}
 if(!(prepared instanceof Blob)||prepared.size>LIMIT||prepared.size===0)return null;
 const bytes=new Uint8Array(await prepared.arrayBuffer());
 if(bytes.length>LIMIT)return null;
 const state={original:blob,bytes,kind,mime:prepared.type||'audio/webm',
  id:'v159_'+seat+'_'+(Math.floor(now())>>>0).toString(36)+'_'+Math.random().toString(36).slice(2,8),
  uploaded:false};
 outbound.set(kind,state);
 return state;
}
async function emit(kind){
 if(!ws||ws.readyState!==1||!KINDS.has(kind)||!enabled())return false;
 const at=now();
 if(at-latestCueAt<3300||at-(cooldowns.get(kind)||-100000)<7600)return false;
 const token=session;
 const clip=await getOwned(kind);
 if(!clip||token!==session)return false;
 latestCueAt=now();cooldowns.set(kind,now());
 void play(clip,seat);
 if(!settings().share)return true;
 if(!clip.uploaded){
  if(!await sendClip(clip)||token!==session)return false;
  clip.uploaded=true;
 }
 if(send({t:'vc',id:clip.id,kind})){stats.cuesSent++;return true}
 return false;
}
async function onNeed(msg){
 if(!settings().share||msg.owner!==seat||!/^p[1-6]$/.test(msg.from)||
   !valid(msg.id)||!KINDS.has(msg.kind))return;
 const clip=outbound.get(msg.kind);
 if(!clip||clip.id!==msg.id)return;
 stats.retransmits++;
 await sendClip(clip,msg.from);
}
function receive(msg){
 if(!msg||!['vp','vc','vn'].includes(msg.t))return false;
 if(msg.t==='vp')onPart(msg);
 else if(msg.t==='vc')onCue(msg);
 else void onNeed(msg);
 return true;
}
function attach(socket,id,getPosition){
 session++;ws=socket;seat=id;positions=typeof getPosition==='function'?getPosition:()=>null;
 outbound.clear();incoming.clear();cache.clear();asked.clear();cooldowns.clear();
 playing=0;latestCueAt=-100000;
 unlock();return true;
}
function stop(){
 session++;ws=null;seat='';incoming.clear();cache.clear();outbound.clear();asked.clear();
 cooldowns.clear();playing=0;
}
window.NS159_VOICES=Object.freeze({attach,stop,receive,emit,unlock,attenuation,settings,
 get stats(){return {...stats,cache:cache.size,pending:incoming.size}},
 get attached(){return !!ws},get events(){return [...KINDS]}});
})();
