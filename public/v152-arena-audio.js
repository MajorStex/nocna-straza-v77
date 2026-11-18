/* Noćna Straža: standalone New Zone audio. No samples, streaming or network packets.
   Uses the game's original sparse procedural D-minor score in a tiny Web Audio
   scheduler. All combat sound events are derived from authoritative snapshots. */
(()=>{
'use strict';
if(window.NS152_AUDIO)return;
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null,fxBus=null,musicBus=null,noise=null,timer=null,nextAt=0,index=0,activeFx=0,sessionActive=false,nextPrune=0;
const CHORDS=[[146.83,174.61,220],[130.81,164.81,196],[116.54,146.83,174.61],[110,164.81,220]];
const MELODY=[0,null,null,2,null,1,null,null,1,null,0,null,2,null,null,1];
const last=new Map(),weaponSamples=new Map();
// V217: constant cooldown table; discard only timestamps older than every cooldown.
const cool={step:250,swing:170,hurt:240,enemy:380,goblinStep:620,hit:135,chest:600,wave:900,choose:200,xp:165,level:700};
function pruneCooldowns(now){if(now<nextPrune)return;nextPrune=now+10000;for(const [key,at] of last)if(now-at>10000)last.delete(key)}
const safeBool=(key,fallback)=>{try{const v=localStorage.getItem(key);return v===null?fallback:v==='true'}catch{return fallback}};
let soundOn=safeBool('ns152_sound',true),musicOn=safeBool('ns152_music',true);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function build(){
 if(!AC||ctx)return !!ctx;
 try{
  ctx=new AC({latencyHint:'interactive'});
  master=ctx.createGain();master.gain.value=.58;master.connect(ctx.destination);
  fxBus=ctx.createGain();fxBus.gain.value=.65;fxBus.connect(master);
  musicBus=ctx.createGain();musicBus.gain.value=.13;musicBus.connect(master);
  // One shared noise sample, generated once (no decoding/downloads).
  noise=ctx.createBuffer(1,Math.round(ctx.sampleRate*.35),ctx.sampleRate);
  const data=noise.getChannelData(0);
  let seed=143;
  for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=((seed>>>8)/8388608-1)*(.5-i/data.length*.25)}
  return true;
 }catch{return false}
}
function syncMusicTimer(){
 const wanted=!!ctx&&sessionActive&&musicOn&&!document.hidden;
 if(wanted&&timer===null){if(nextAt<ctx.currentTime-.2)nextAt=ctx.currentTime+.05;timer=setInterval(musicTick,180)}
 else if(!wanted&&timer!==null){clearInterval(timer);timer=null}
}
function unlock(){
 if(!build())return;
 if(!sessionActive)nextAt=ctx.currentTime+.1;
 sessionActive=true;
 if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 syncMusicTimer();
}
document.addEventListener('visibilitychange',syncMusicTimer);
function tone(frequency,at,duration,volume,shape,bus,slide=1){
 if(!ctx||ctx.state!=='running'||!Number.isFinite(frequency))return;
 // Cap simultaneously sounding one-shot oscillators, not the ambient music.
 const isFx=bus===fxBus;if(isFx&&activeFx>=12)return;
 const osc=ctx.createOscillator(),amp=ctx.createGain();
 if(isFx)activeFx++;
 osc.onended=()=>{if(isFx)activeFx=Math.max(0,activeFx-1);try{osc.disconnect();amp.disconnect()}catch{}};
 osc.type=shape;osc.frequency.setValueAtTime(Math.max(28,frequency),at);
 if(slide!==1)osc.frequency.exponentialRampToValueAtTime(Math.max(28,frequency*slide),at+duration);
 amp.gain.setValueAtTime(.0001,at);
 amp.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.012);
 amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
 osc.connect(amp);amp.connect(bus);osc.start(at);osc.stop(at+duration+.03);
}
function hiss(at,duration,volume,frequency=1800){
 if(!noise||!ctx||ctx.state!=='running'||activeFx>=12)return;
 const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();
 activeFx++;src.onended=()=>{activeFx=Math.max(0,activeFx-1);try{src.disconnect();filter.disconnect();amp.disconnect()}catch{}};
 src.buffer=noise;filter.type='lowpass';filter.frequency.value=frequency;
 amp.gain.setValueAtTime(Math.max(.0001,volume),at);
 amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
 src.connect(filter);filter.connect(amp);amp.connect(fxBus);src.start(at);src.stop(at+duration);
}
// V157 layered one-shot Foley sounds. Cached PCM AudioBuffers are created ONCE
// per weapon family and event, reused across every swing and impact.
// This sounds less like an oscillator beep: rapid low-frequency thuds,
// filtered grit, metal partials, and a tapered air/steel swish.
function weaponFamily(value){
 const name=String(value||'sword').toLowerCase();
 if(/troll|club|mace|hammer|morningstar|flail/.test(name))return 'blunt';
 if(/axe/.test(name))return 'axe';
 if(/spear|halberd|glaive/.test(name))return 'polearm';
 if(/dagger|rapier/.test(name))return 'lightblade';
 return 'blade';
}
const WEAPON_TONE={
 blade:{metal:1,wood:.18,fund:480,dur:.28},lightblade:{metal:.9,wood:.06,fund:720,dur:.21},
 axe:{metal:.65,wood:.55,fund:290,dur:.29},polearm:{metal:.48,wood:.52,fund:380,dur:.27},
 blunt:{metal:.23,wood:1,fund:155,dur:.31}
};
function weaponBuffer(weapon,kind){
 if(!ctx)return null;
 const group=weaponFamily(weapon),key=group+':'+kind;
 if(weaponSamples.has(key))return weaponSamples.get(key);
 const p=WEAPON_TONE[group],dur=kind==='swing'?.19:p.dur;
 const rate=ctx.sampleRate||44100;
 const buffer=ctx.createBuffer(1,Math.ceil(rate*dur),rate);
 const data=buffer.getChannelData(0);let seed=1977+key.length*997,prevNoise=0,lp=0;
 const angular=2*Math.PI;
 for(let i=0;i<data.length;i++){
  const t=i/rate,u=t/dur;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const rand=((seed>>>8)/8388608-1);
  const filtered=rand-prevNoise*.72;prevNoise=rand;
  const swoosh=Math.pow(Math.sin(Math.PI*Math.min(1,u)),1.4);
  const grain=Math.exp(-t*(kind==='swing'?16:32))*(.7*rand+.3*filtered);
  const ring=(Math.sin(angular*p.fund*t)*Math.exp(-t*21)+
   .46*Math.sin(angular*p.fund*2.37*t)*Math.exp(-t*32)+
   .21*Math.sin(angular*p.fund*3.8*t)*Math.exp(-t*46));
  const thud=Math.sin(angular*(p.fund*.37)*t)*Math.exp(-t*33);
  const scrape=Math.sin(angular*(780-470*u)*t);
  const sample=kind==='swing'?
   swoosh*(.45*filtered+.24*scrape+.13*p.metal*ring+.15*p.wood*thud):
   (grain*(.43*p.wood+.20)+ring*.35*p.metal+thud*.52*p.wood);
  // Simple single-pole lowpass removes brittle digital white-noise edges.
  lp=lp*.19+sample*.81;
  const ramp=Math.min(1,t/.008,(dur-t)/.018);
  data[i]=Math.max(-.9,Math.min(.9,lp*.52*Math.max(0,ramp)));
 }
 weaponSamples.set(key,buffer);return buffer;
}
function weaponShot(weapon,kind,at,volume,variant=0){
 if(!ctx||activeFx>=12)return false;
 const buffer=weaponBuffer(weapon,kind);if(!buffer)return false;
 const source=ctx.createBufferSource(),amp=ctx.createGain();
 activeFx++;
 source.buffer=buffer;
 if(source.playbackRate)source.playbackRate.value=clamp(1+((variant%5)-2)*.035,.90,1.11);
 amp.gain.value=clamp(volume,0,.35);
 source.connect(amp);amp.connect(fxBus);
 source.onended=()=>{activeFx=Math.max(0,activeFx-1);try{source.disconnect();amp.disconnect()}catch{}};
 source.start(at);return true;
}
function musicTick(){
 if(!ctx||ctx.state!=='running'||!musicOn||document.hidden)return;
 if(nextAt<ctx.currentTime-.2)nextAt=ctx.currentTime+.05;
 const step=.32;let guard=0;
 while(nextAt<ctx.currentTime+.22&&guard++<3){
  const beat=index%16,bar=Math.floor(index/16)%4,chord=CHORDS[bar];
  if(beat===0||beat===8){
   tone(chord[0]/2,nextAt,2.1,.11,'sine',musicBus);
   for(const f of chord)tone(f,nextAt,2.4,.024,'triangle',musicBus);
  }
  const key=MELODY[beat];
  if(key!==null&&beat%2===0)tone(chord[key]*2,nextAt,.44,.021,'sine',musicBus);
  index++;nextAt+=step;
 }
}
function play(kind,options={}){
 if(!soundOn||!ctx||ctx.state!=='running'||document.hidden)return false;
 // Most sounds are entirely local. No network streams, MP audio packets or
 // per-goblin looping voices: one shared near-horde tread per 620 ms.
 const d=Number.isFinite(options.x)&&Number.isFinite(options.y)&&
  Number.isFinite(options.listenerX)&&Number.isFinite(options.listenerY)?
  Math.hypot(options.x-options.listenerX,options.y-options.listenerY):0;
 const spatial=clamp(1-d/430,0,1);
 if(spatial<=.015)return false;
 const gain=spatial*clamp(options.gain??1,0,1);
 if(gain<.018)return false;
 const now=performance.now();pruneCooldowns(now);
 const key=['enemy','hit','goblinStep'].includes(kind)?kind:kind+(options.sourceId??'');
 if(now-(last.get(key)||-100000)<(cool[kind]||180))return false;
 // Don't create any new voices once the small FX pool is occupied.
 if(activeFx>=12)return false;
 last.set(key,now);
 const at=ctx.currentTime+.003,weapon=String(options.weapon||'sword');
 if(kind==='step'){hiss(at,.04,.080*gain,570);tone(78,at,.06,.04*gain,'sine',fxBus,.73)}
 else if(kind==='goblinStep'){hiss(at,.052,.034*gain,430);tone(63,at,.1,.034*gain,'sine',fxBus,.68)}
 else if(kind==='swing'){
  weaponShot(weapon,'swing',at,.30*gain,Number(options.variant)||0);
 }
 else if(kind==='hit'){
  weaponShot(weapon,'hit',at,.32*gain,Number(options.variant)||0);
 }
 else if(kind==='hurt'){
  hiss(at,.18,.18*gain,1200);tone(145,at,.22,.18*gain,'triangle',fxBus,.52);
 }
 else if(kind==='enemy')tone(95,at,.11,.075*gain,'sawtooth',fxBus,.65);
 else if(kind==='chest'){tone(392,at,.17,.16*gain,'triangle',fxBus);tone(587.3,at+.10,.27,.13*gain,'sine',fxBus)}
 else if(kind==='wave'){tone(220,at,.21,.13*gain,'triangle',fxBus);tone(293.66,at+.12,.3,.10*gain,'sine',fxBus)}
 else if(kind==='choose'){tone(494,at,.13,.12*gain,'triangle',fxBus);tone(659.25,at+.07,.21,.07*gain,'sine',fxBus)}
  // Cached WebAudio synthesis only: no sound download, socket traffic or per-crystal voices.
  else if(kind==='xp'){tone(784,at,.075,.075*gain,'sine',fxBus,1.16);tone(1174.66,at+.037,.11,.042*gain,'triangle',fxBus,1.05)}
  else if(kind==='level'){tone(392,at,.15,.10*gain,'triangle',fxBus);tone(523.25,at+.11,.18,.10*gain,'sine',fxBus);tone(784,at+.21,.27,.09*gain,'sine',fxBus)}
 else return false;
 return true;
}

function stop(){
 sessionActive=false;syncMusicTimer();
 last.clear();nextPrune=0;
 if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});
}
function set(kind,on){
 if(kind==='music')musicOn=!!on;else if(kind==='sound')soundOn=!!on;
 try{localStorage.setItem('ns152_'+kind,String(!!on))}catch{}
 if(ctx&&ctx.state==='running'&&kind==='music'){nextAt=ctx.currentTime+.05;}
 syncMusicTimer();
}
window.NS152_AUDIO={unlock,play,stop,set,weaponFamily,get cachedWeaponBuffers(){return weaponSamples.size},get diagnostics(){return {cooldowns:last.size,musicTimer:timer!==null,activeFx}},get music(){return musicOn},get sound(){return soundOn},
 get running(){return !!ctx&&ctx.state==='running'}};
})();
