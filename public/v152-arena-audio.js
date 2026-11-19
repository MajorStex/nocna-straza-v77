/* Noćna Straža: standalone New Zone audio. Three bundled original guard clips; no streaming or network packets.
   Uses the game's original sparse procedural D-minor score in a tiny Web Audio
   scheduler. All combat sound events are derived from authoritative snapshots. */
(()=>{
'use strict';
if(window.NS152_AUDIO)return;
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null,fxBus=null,musicBus=null,noise=null,timer=null,nextAt=0,index=0,activeFx=0;
// V237: exact original user-exported guard audio, public and independent of account.
const GUARD_VOICE_DATA=Object.freeze({"attack":"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","death":"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","hurt":"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"});
const guardBuffers=new Map(),guardCooldown=Object.create(null);
let guardLoading=null,guardActive=null;
function warmGuardVoice(){
 if(guardLoading||!ctx||typeof ctx.decodeAudioData!=='function')return;
 guardLoading=Promise.all(Object.entries(GUARD_VOICE_DATA).map(async ([kind,b64])=>{
  try{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const buffer=await ctx.decodeAudioData(bytes.buffer);if(buffer)guardBuffers.set(kind,buffer)}catch{}
 }));
}
function stopGuardVoice(reset=false){
 const old=guardActive;guardActive=null;
 if(old){try{old.source.stop()}catch{}try{old.source.disconnect();old.gain.disconnect();old.pan?.disconnect()}catch{}}
 if(reset)for(const key of Object.keys(guardCooldown))delete guardCooldown[key];
}
function playGuardVoice(kind,distance,dx){
 const buffer=guardBuffers.get(kind),pref=window.__NS110_BRIDGE?.arenaGuardVoicePrefs?.();
 if(!buffer||!ctx||ctx.state!=='running'||!soundOn||document.hidden||pref?.enabled===false||!Number.isFinite(distance)||distance>700)return false;
 const volume=clamp(pref?.volume??.7,0,1);if(!volume)return false;
 const now=ctx.currentTime,cool={attack:3.8,hurt:4.5,death:30}[kind];
 if(now-(guardCooldown[kind]??-Infinity)<cool)return false;
 const priority={attack:1,hurt:2,death:3}[kind];
 if(guardActive){if(priority<=guardActive.priority||kind!=='death')return false;stopGuardVoice()}
 try{
  const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.();
  source.buffer=buffer;gain.gain.value=volume*.95*({attack:8,death:1.35,hurt:1}[kind]||1)/(1+Math.pow(Math.max(0,distance)/170,1.55));source.connect(gain);
  if(pan){pan.pan.value=clamp((Number(dx)||0)/270,-.85,.85);gain.connect(pan);pan.connect(master)}else gain.connect(master);
  const voice={source,gain,pan,priority};guardActive=voice;
  source.onended=()=>{if(guardActive===voice)guardActive=null;try{source.disconnect();gain.disconnect();pan?.disconnect()}catch{}};
  source.start();guardCooldown[kind]=now;return true;
 }catch{stopGuardVoice();return false}
}
const CHORDS=[[146.83,174.61,220],[130.81,164.81,196],[116.54,146.83,174.61],[110,164.81,220]];
const MELODY=[0,null,null,2,null,1,null,null,1,null,0,null,2,null,null,1];
const last=new Map(),weaponSamples=new Map();
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
function unlock(){
 if(!build())return;
 warmGuardVoice();
 if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 if(!timer){nextAt=ctx.currentTime+.1;timer=setInterval(musicTick,180)}
}
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
 const now=performance.now(),cool={step:250,swing:170,hurt:240,enemy:380,
  goblinStep:620,hit:135,chest:600,wave:900,choose:200,xp:165,level:700};
 const key=['enemy','hit','goblinStep'].includes(kind)?kind:kind+(options.sourceId??'');
 if(now-(last.get(key)||-100000)<(cool[kind]||180))return false;
 // Don't create any new voices once the small FX pool is occupied.
 if(activeFx>=12)return false;
 last.set(key,now);
 const at=ctx.currentTime+.003,weapon=String(options.weapon||'sword');
 const classic=window.__NS110_BRIDGE?.arenaClassicSfx;
 const classicName=kind==='swing'?(['axe','halberd','warhammer','mace','flail'].includes(weapon)?'axe':['spear','dagger'].includes(weapon)?'spear':'attack'):({hit:'hit',hurt:'enemyHit',enemy:'goblinAttack',kill:'kill',boss:'boss',xp:'xp',level:'level',chest:'chest',step:'step',goblinStep:'step'})[kind];
 if(classic&&classicName){classic(classicName,gain);return true}
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
 stopGuardVoice(true);
 if(timer){clearInterval(timer);timer=null}
 last.clear();
 if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});
}
function set(kind,on){
 if(kind==='music')musicOn=!!on;else if(kind==='sound'){soundOn=!!on;if(!soundOn)stopGuardVoice()}
 try{localStorage.setItem('ns152_'+kind,String(!!on))}catch{}
 if(ctx&&ctx.state==='running'&&kind==='music'){nextAt=ctx.currentTime+.05;}
}
window.NS152_AUDIO={unlock,play,stop,set,weaponFamily,playGuardVoice,stopGuardVoice,get cachedWeaponBuffers(){return weaponSamples.size},get music(){return musicOn},get sound(){return soundOn},
 get running(){return !!ctx&&ctx.state==='running'}};
})();
