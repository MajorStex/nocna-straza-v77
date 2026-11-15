/* Noćna Straža: standalone New Zone audio. No samples, streaming or network packets.
   Uses the game's original sparse procedural D-minor score in a tiny Web Audio
   scheduler. All combat sound events are derived from authoritative snapshots. */
(()=>{
'use strict';
if(window.NS152_AUDIO)return;
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null,fxBus=null,musicBus=null,noise=null,timer=null,nextAt=0,index=0;
const CHORDS=[[146.83,174.61,220],[130.81,164.81,196],[116.54,146.83,174.61],[110,164.81,220]];
const MELODY=[0,null,null,2,null,1,null,null,1,null,0,null,2,null,null,1];
const last=new Map();
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
 if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 if(!timer){nextAt=ctx.currentTime+.1;timer=setInterval(musicTick,180)}
}
function tone(frequency,at,duration,volume,shape,bus,slide=1){
 if(!ctx||ctx.state!=='running'||!Number.isFinite(frequency))return;
 const osc=ctx.createOscillator(),amp=ctx.createGain();
 osc.type=shape;osc.frequency.setValueAtTime(Math.max(28,frequency),at);
 if(slide!==1)osc.frequency.exponentialRampToValueAtTime(Math.max(28,frequency*slide),at+duration);
 amp.gain.setValueAtTime(.0001,at);
 amp.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.012);
 amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
 osc.connect(amp);amp.connect(bus);osc.start(at);osc.stop(at+duration+.03);
}
function hiss(at,duration,volume,frequency=1800){
 if(!noise||!ctx||ctx.state!=='running')return;
 const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();
 src.buffer=noise;filter.type='lowpass';filter.frequency.value=frequency;
 amp.gain.setValueAtTime(Math.max(.0001,volume),at);
 amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
 src.connect(filter);filter.connect(amp);amp.connect(fxBus);src.start(at);src.stop(at+duration);
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
 const now=performance.now(),cool={step:250,swing:150,hurt:190,enemy:210,chest:600,wave:900,choose:200,click:160};
 const key=kind+(options.sourceId??'');
 if(now-(last.get(key)||-100000)<(cool[kind]||180))return false;
 last.set(key,now);
 // Distance attenuation is LOCAL, never a WebSocket/audio stream.
 const d=Number.isFinite(options.x)&&Number.isFinite(options.listenerX)?
  Math.hypot(options.x-options.listenerX,options.y-options.listenerY):0;
 const spatial=clamp(1-d/430,0,1);
 if(spatial<=.015)return false;
 const g=spatial*clamp(options.gain??1,0,1);
 const at=ctx.currentTime+.003;
 const weapon=String(options.weapon||'sword');
 if(kind==='step'){hiss(at,.042,.085*g,620);tone(75,at,.065,.05*g,'sine',fxBus,.7)}
 else if(kind==='swing'){
  const f=weapon.includes('axe')?145:weapon.includes('spear')?275:weapon.includes('mace')?115:225;
  hiss(at,.11,.17*g,weapon.includes('axe')?1000:2800);
  tone(f,at,.16,.15*g,'sawtooth',fxBus,.52);
 }
 else if(kind==='hurt'){
  hiss(at,.18,.20*g,1200);tone(145,at,.25,.2*g,'triangle',fxBus,.52);
 }
 else if(kind==='enemy'){tone(95,at,.11,.08*g,'sawtooth',fxBus,.65)}
 else if(kind==='chest'){tone(392,at,.17,.16*g,'triangle',fxBus);tone(587.3,at+.10,.27,.13*g,'sine',fxBus)}
 else if(kind==='wave'){tone(220,at,.21,.13*g,'triangle',fxBus);tone(293.66,at+.12,.3,.10*g,'sine',fxBus)}
 else if(kind==='choose'){tone(494,at,.13,.12*g,'triangle',fxBus);tone(659.25,at+.07,.21,.07*g,'sine',fxBus)}
 else return false;
 return true;
}
function stop(){
 if(timer){clearInterval(timer);timer=null}
 last.clear();
 if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});
}
function set(kind,on){
 if(kind==='music')musicOn=!!on;else if(kind==='sound')soundOn=!!on;
 try{localStorage.setItem('ns152_'+kind,String(!!on))}catch{}
 if(ctx&&ctx.state==='running'&&kind==='music'){nextAt=ctx.currentTime+.05;}
}
window.NS152_AUDIO={unlock,play,stop,set,get music(){return musicOn},get sound(){return soundOn},
 get running(){return !!ctx&&ctx.state==='running'}};
})();
