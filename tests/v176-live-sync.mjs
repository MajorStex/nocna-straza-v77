import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const base='https://nocna-straza-relay.stefanstevic1996.workers.dev';
const h=await(await fetch(base+'/health')).json();assert(h.arenaBuild>=168,JSON.stringify(h));
const seats=Array.from({length:6},(_,i)=>'p'+(i+1));
const code=crypto.randomBytes(6).toString('hex').slice(0,6).toUpperCase();
const resp=await fetch(base+'/arena/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,seats})});const room=await resp.json();assert.equal(resp.status,200,JSON.stringify(room));
const peers=[],timers=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function connect(id,seq=0){const ws=new WebSocket(room.ws),p={ws,id,seq,started:false,snaps:[],times:[],sizes:[],closed:false};peers.push(p);
ws.addEventListener('open',()=>ws.send(JSON.stringify({t:'hello',id,protocol:140,ticket:room.tickets[id]})));
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.t==='start')p.started=true;if(m.t==='s'){p.snaps.push(m);p.times.push(Date.now());p.sizes.push(Buffer.byteLength(e.data))}});
ws.addEventListener('close',()=>p.closed=true);return p}
async function until(fn,label,limit=18000){const start=Date.now();while(Date.now()-start<limit){if(fn())return;await sleep(70)}throw Error(label+' '+JSON.stringify(peers.map(p=>[p.id,p.started,p.snaps.length,p.closed])))}
function move(p,i){timers.push(setInterval(()=>{if(p.ws.readyState===1)p.ws.send(JSON.stringify({t:'i',seq:++p.seq,ax:i%2?50:-50,ay:i%3?15:-15,attack:1}))},50))}
const world=s=>JSON.stringify({players:s.players,mobs:s.mobs,drops:s.drops,chests:s.chests,wave:s.wave,choice:s.choice});
try{
for(const id of seats)connect(id);const initial=peers.slice();
await until(()=>initial.every(p=>p.started&&p.snaps.some(s=>s.totalMobs===60&&s.mobs.length===60)),'6 seats + 60 enemies');
initial.forEach(move);await sleep(4500);
const maps=initial.map(p=>new Map(p.snaps.map(s=>[s.tick,s])));const common=[...maps[0].keys()].filter(t=>maps.every(m=>m.has(t)));assert(common.length>=10,'common ticks '+common.length);
let mismatches=0;for(const t of common){const canonical=world(maps[0].get(t));if(maps.some(m=>world(m.get(t))!==canonical))mismatches++}assert.equal(mismatches,0,'world differs at same tick');
for(const p of initial){assert(!p.closed);assert(p.snaps.every((s,i,a)=>i===0||s.tick>a[i-1].tick));assert(p.snaps.at(-1).ack>0)}
const gaps=initial.flatMap(p=>p.times.slice(1).map((t,i)=>t-p.times[i])).sort((a,b)=>a-b),p95=gaps[Math.floor(gaps.length*.95)];const sizes=initial.flatMap(p=>p.sizes);const avg=Math.round(sizes.reduce((a,b)=>a+b,0)/sizes.length);
assert(p95<300,'snapshot p95 '+p95);const old=initial[0],guest=initial[1],last=guest.snaps.at(-1).tick;old.ws.close();
await until(()=>guest.snaps.at(-1).tick>last+15,'remaining peers keep running');
const next=connect(old.id,old.seq);await until(()=>next.started&&next.snaps.length>=3,'same seat reconnect');move(next,0);
await until(()=>next.snaps.at(-1).ack>old.seq,'reconnected input acknowledged');
const after=guest.snaps.at(-1).tick;next.ws.send(JSON.stringify({t:'leave'}));await until(()=>guest.snaps.at(-1).tick>after+15,'room independent of creator');
console.log('V176 LIVE SYNC PASS',JSON.stringify({serverBuild:h.arenaBuild,clients:6,mobs:60,commonTicks:common.length,mismatches,p95SnapshotGapMs:p95,avgSnapshotBytes:avg,counts:initial.map(p=>p.snaps.length),reconnect:true,hostless:true}));
}finally{for(const t of timers)clearInterval(t);for(const p of peers)try{p.ws.close()}catch{}}
