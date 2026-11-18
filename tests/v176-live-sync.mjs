import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const base='https://v189-arena-abilities-nocna-straza-relay.stefanstevic1996.workers.dev';
// Client-only releases can advance while the explicitly pinned compatible relay stays unchanged.
const release=Number(fs.readFileSync('.github/workflows/v205-native-deployment-verify.yml','utf8').match(/EXPECTED_RELAY_RELEASE: '(\d+)'/)[1]);
const pinned=fs.readFileSync('.github/workflows/v180-stress.yml','utf8').match(/NS_EXPECTED_RELAY_SHA: '([a-f0-9]{40})'/)[1];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let h,last;
for(let attempt=0;attempt<24;attempt++){
 try{last=await fetch(base+'/health?qa='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>r.json());
 if(last.ok&&last.arenaRelease===release&&last.arenaQa?.ok&&last.arenaQa?.suites===13&&last.arenaQa?.commit===pinned){h=last;break}}catch(e){last=String(e)}
 await sleep(3000)
}
assert(h,'wrong preview build: '+JSON.stringify(last));
const seats=Array.from({length:6},(_,i)=>'p'+(i+1));
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code=Array.from({length:6},()=>alphabet[crypto.randomInt(alphabet.length)]).join('');
assert(/^[A-HJ-NP-Z2-9]{6}$/.test(code),'test room must follow relay code contract');
const resp=await fetch(base+'/arena/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,seats})});const room=await resp.json();assert.equal(resp.status,200,JSON.stringify(room));
const peers=[],timers=[];
function connect(id,seq=0){const ws=new WebSocket(base.replace(/^http/,'ws')+'/arena/'+room.match),p={ws,id,seq,started:false,snaps:[],times:[],sizes:[],closed:false};peers.push(p);
ws.addEventListener('open',()=>ws.send(JSON.stringify({t:'hello',id,protocol:140,ticket:room.tickets[id],startAck:1})));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.t==='start'){p.started=true;ws.send(JSON.stringify({t:'startAck'}))}if(m.t==='s'){p.snaps.push(m);p.times.push(Date.now());p.sizes.push(Buffer.byteLength(e.data))}});
ws.addEventListener('close',()=>p.closed=true);return p}
async function until(fn,label,limit=18000){const start=Date.now();while(Date.now()-start<limit){if(fn())return;await sleep(70)}throw Error(label+' '+JSON.stringify(peers.map(p=>[p.id,p.started,p.snaps.length,p.closed])))}
function move(p,i){timers.push(setInterval(()=>{if(p.ws.readyState===1)p.ws.send(JSON.stringify({t:'i',seq:++p.seq,ax:i%2?50:-50,ay:i%3?15:-15,attack:1,rev:p.snaps.at(-1)?.expedition?.[1]||0}))},50))}
const world=s=>JSON.stringify({players:s.players,mobs:s.mobs,chests:s.chests,wave:s.wave,waveTotal:s.waveTotal,waveReserve:s.waveReserve,waveBatch:s.waveBatch,choice:s.choice,breakables:s.breakables,expedition:s.expedition});
try{
for(const id of seats)connect(id);const initial=peers.slice();
await until(()=>initial.every(p=>p.started&&p.snaps.some(s=>s.ingress===1&&s.waveTotal===24&&s.players.length===6&&s.mobs.length>=3&&s.mobs.length<=12)),'6 seats + staged wave');
initial.forEach(move);await sleep(4500);
const maps=initial.map(p=>new Map(p.snaps.map(s=>[s.tick,s])));const common=[...maps[0].keys()].filter(t=>maps.every(m=>m.has(t)));assert(common.length>=10,'common ticks '+common.length);
let mismatches=0;for(const t of common){const canonical=world(maps[0].get(t));if(maps.some(m=>world(m.get(t))!==canonical))mismatches++}assert.equal(mismatches,0,'shared world differs at same tick');assert(initial.every(p=>p.snaps.some(s=>s.waveBatch>0)),'all peers observe reinforcements');
// Drops are deliberately spatially filtered per seat; shared IDs must still match exactly.
for(const t of common){const seen=new Map();for(const m of maps)for(const d of m.get(t).drops||[]){if(seen.has(d[0]))assert.deepEqual(d,seen.get(d[0]),'shared loot mismatch');else seen.set(d[0],d)}}
for(const p of initial){assert(!p.closed);assert(p.snaps.every((s,i,a)=>i===0||s.tick>a[i-1].tick));assert(p.snaps.at(-1).ack>0)}
const gaps=initial.flatMap(p=>p.times.slice(1).map((t,i)=>t-p.times[i])).sort((a,b)=>a-b),p95=gaps[Math.floor(gaps.length*.95)];const sizes=initial.flatMap(p=>p.sizes);const avg=Math.round(sizes.reduce((a,b)=>a+b,0)/sizes.length);
assert(p95<300,'snapshot p95 '+p95);const old=initial[0],guest=initial[1],last=guest.snaps.at(-1).tick;old.ws.close();
await until(()=>guest.snaps.at(-1).tick>last+15,'remaining peers keep running');
const next=connect(old.id,old.seq);await until(()=>next.started&&next.snaps.length>=3,'same seat reconnect');move(next,0);
await until(()=>next.snaps.at(-1).ack>old.seq,'reconnected input acknowledged');
const after=guest.snaps.at(-1).tick;next.ws.send(JSON.stringify({t:'leave'}));await until(()=>guest.snaps.at(-1).tick>after+15,'room independent of creator');
console.log('V176 LIVE SYNC PASS',JSON.stringify({release,relay:pinned,serverBuild:h.arenaBuild,clients:6,mobs:initial[0].snaps.at(-1).mobs.length,commonTicks:common.length,mismatches,p95SnapshotGapMs:p95,avgSnapshotBytes:avg,counts:initial.map(p=>p.snaps.length),reconnect:true,hostless:true}));
}finally{for(const t of timers)clearInterval(t);for(const p of peers)try{p.ws.close()}catch{}}
