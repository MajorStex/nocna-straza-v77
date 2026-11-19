const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const audio=fs.readFileSync('public/v152-arena-audio.js','utf8'),arena=fs.readFileSync('public/v140-net-mode.js','utf8');
const data=JSON.parse(audio.match(/const GUARD_VOICE_DATA=Object\.freeze\((\{[^\n]+\})\);/)[1]);
const hashes={attack:'a794f17a2365488ff92c0915ea74bc7144c37568b3eeea913ec27f019a003cdf',death:'a3c40479d7e6252802d179f4b97e4e65b894c10af1bb78965b0dad1ff590a58a',hurt:'94c436f2a2481c4bf65167ba4b1fd80df16cdb7741413be82ce08f94cb118bff'};
assert.deepEqual(Object.keys(data).sort(),Object.keys(hashes).sort());
for(const [kind,b64] of Object.entries(data))assert.equal(crypto.createHash('sha256').update(Buffer.from(b64,'base64')).digest('hex'),hashes[kind]);
new vm.Script(audio);new vm.Script(arena);
const cue=vm.runInNewContext(arena.match(/function guardVoiceCue\(old,next\)\{[\s\S]*?\n\}/)[0]+';guardVoiceCue');
const state=(phase,hp,attackTick,tick)=>({phase,hp,attackTick,tick});
const cases=[
 [null,state(2,140,-100,30),null],
 [state(1,140,-100,30),state(2,140,-100,33),'release'],
 [state(2,140,-100,33),state(2,140,45,45),'attack'],
 [state(2,140,45,45),state(2,140,45,46),null],
 [state(2,140,45,45),state(2,132,48,48),'hurt'],
 [state(2,8,45,60),state(4,0,45,63),'death'],
 [state(4,0,45,63),state(4,0,45,64),null],
 [state(2,140,45,45),state(3,140,45,46),null],
 [state(3,140,45,46),state(3,132,45,60),'hurt'],
 [state(3,140,45,46),state(3,140,60,80),null],
 [state(3,140,45,46),state(3,140,60,44),null],
 [state(1,140,-100,30),state(1,132,-100,33),null]];
for(const [old,next,expected] of cases)assert.equal(cue(old,next),expected);
assert.match(arena,/arenaHeroVoicePulse\(\);\s*arenaGuardVoicePulse\(now\);/);
assert.match(arena,/playGuardVoice\?\.\(cue,distance,dx\)/);
let ctx,started=0,stopped=0,decoded=0,lastGain=0;
let prefs={enabled:true,volume:.7};
const node=()=>({connect(){},disconnect(){}});
class FakeAudioContext{
 constructor(){ctx=this;this.state='running';this.currentTime=10;this.sampleRate=8000;this.destination=node()}
 createGain(){return {...node(),gain:{value:1}}}
 createStereoPanner(){return {...node(),pan:{value:0}}}
 createBuffer(_n,length){return{getChannelData:()=>new Float32Array(length)}}
 async decodeAudioData(bytes){assert.ok(bytes.byteLength>3000);decoded++;return{duration:1}}
 createBufferSource(){const o={...node(),start(){started++},stop(){stopped++;o.onended?.()}};return o}
 suspend(){this.state='suspended';return Promise.resolve()}
 resume(){this.state='running';return Promise.resolve()}
}
const window={AudioContext:FakeAudioContext,__NS110_BRIDGE:{arenaGuardVoicePrefs:()=>prefs}};
const doc={hidden:false};
vm.runInNewContext(audio,{window,document:doc,localStorage:{getItem:()=>null,setItem(){}},setInterval:()=>1,clearInterval(){},atob:s=>Buffer.from(s,'base64').toString('binary')});
(async()=>{
 const A=window.NS152_AUDIO;A.unlock();await new Promise(r=>setImmediate(r));assert.equal(decoded,3);
 A.unlock();assert.equal(decoded,3);
 assert.equal(A.playGuardVoice('attack',30,0),true);
 assert.equal(A.playGuardVoice('attack',30,0),false);
 assert.equal(A.playGuardVoice('hurt',30,0),false); // no overlapping guard lines
 assert.equal(A.playGuardVoice('death',30,0),true);assert.equal(stopped,1);
 A.stopGuardVoice(true);
 assert.equal(A.playGuardVoice('attack',701,0),false);
 assert.equal(A.playGuardVoice('attack',NaN,0),false);
 A.set('sound',false);assert.equal(A.playGuardVoice('attack',30,0),false);
 A.set('sound',true);prefs.enabled=false;assert.equal(A.playGuardVoice('attack',30,0),false);
 prefs.enabled=true;prefs.volume=0;assert.equal(A.playGuardVoice('attack',30,0),false);
 prefs.volume=.7;doc.hidden=true;assert.equal(A.playGuardVoice('attack',30,0),false);
 doc.hidden=false;assert.equal(A.playGuardVoice('hurt',30,0),true);A.stop();assert.equal(ctx.state,'suspended');
 assert.equal(started,3);console.log('PASS V237: 3 exact audio hashes, 12 authoritative cue transitions, bounded playback, sound/voice mute, distance, reset and one-time decode (simulated WebAudio)');
})().catch(e=>{console.error(e);process.exitCode=1});
