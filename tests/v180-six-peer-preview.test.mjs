import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
// Exact isolated branch; never stress the permanent production Worker.
const base=process.env.NS_STRESS_PREVIEW||'https://v189-arena-abilities-nocna-straza-relay.stefanstevic1996.workers.dev';
const expected=process.env.NS_EXPECTED_RELAY_SHA;
assert.match(new URL(base).hostname,/^v189-arena-abilities-nocna-straza-relay\.stefanstevic1996\.workers\.dev$/,'explicit preview only');
assert.match(expected||'',/^[a-f0-9]{40}$/,'pin exact authoritative server commit');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const seats=Array.from({length:6},(_,i)=>'p'+(i+1));
let health,lastHealth;
for(let i=0;i<24;i++){
 try{const h=await fetch(base+'/health?qa='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(5000)});lastHealth=await h.json();
 if(lastHealth.ok&&lastHealth.arenaRelease===210&&lastHealth.arenaQa?.ok&&lastHealth.arenaQa?.suites===13&&lastHealth.arenaQa?.commit===expected){health=lastHealth;break}}
 catch(e){lastHealth=String(e)} await sleep(3000);
}
assert(health,'preview release/QA mismatch: '+JSON.stringify(lastHealth));
const response=await fetch(base+'/arena/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:randomBytes(3).toString('hex').toUpperCase(),seats}),signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200,await response.clone().text());const room=await response.json();assert(room.ok);
const peers=[],active=new Map();
function connect(id,seq=0){
 const p={id,ws:new WebSocket(base.replace(/^http/,'ws')+'/arena/'+room.match),received:0,dropped:0,welcome:false,start:false,ticks:[],seq,roster:[],close:null,err:null,regressions:0,lastTick:-1};
 peers.push(p);active.set(id,p);
 p.ws.addEventListener('open',()=>p.ws.send(JSON.stringify({t:'hello',id,protocol:140,ticket:room.tickets[id]})));
 p.ws.addEventListener('close',e=>{p.close=[e.code,e.reason]});
 p.ws.addEventListener('error',()=>{p.err='websocket error'});
 p.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.t==='welcome'){p.welcome=true;p.world=m.world;p.seats=m.seats}
  if(m.t==='start')p.start=true;
  if(m.t==='roster')p.roster=m.ready;
  if(m.t==='s'){p.received++;if(m.tick<=p.lastTick)p.regressions++;p.lastTick=m.tick;const loss=Number(id.slice(1))*3;if((p.received*17)%100<loss){p.dropped++;return}
   p.ticks.push(m.tick);if(p.ticks.length>100)p.ticks.shift();p.latest=m;
  }
 });
 return p;
}
const diag=()=>JSON.stringify(peers.map(p=>({id:p.id,readyState:p.ws.readyState,welcome:p.welcome,start:p.start,roster:p.roster,received:p.received,tick:p.latest?.tick,ack:p.latest?.ack,seq:p.seq,close:p.close,error:p.err})));
async function until(label,fn,ms=25000){const t=Date.now();while(Date.now()-t<ms){if(fn())return;await sleep(70)}throw Error(label+' timed out: '+diag())}
function input(p,ax=0){if(p.ws.readyState===1&&p.start)p.ws.send(JSON.stringify({t:'i',seq:++p.seq,ax,ay:0,attack:0,rev:p.latest?.expedition?.[1]||0}))}
const ready=p=>p.welcome&&p.start&&p.latest?.players?.length===6;
const online=(p,id)=>p.latest?.players?.some(row=>row[0]===id&&row[5]===1);
let timer;
try{
 const six=seats.map(id=>connect(id));
 await until('six-seat handshake and first authoritative snapshot',()=>six.every(p=>ready(p)&&seats.every(id=>online(p,id))));
 for(const p of six){assert.equal(p.world.w,4200);assert.equal(p.world.h,4200);assert.deepEqual(p.seats,seats);assert.deepEqual(p.world,six[0].world)}
 const begin=Date.now();
 // Stagger action inputs by 50–300ms and discard application snapshots (not real network loss).
 while(Date.now()-begin<4000)await Promise.all(six.map(async(p,i)=>{await sleep((i+1)*50);input(p,i%2?30:-30)}));
 await until('all six inputs acknowledged',()=>six.every(p=>p.latest?.ack>=p.seq));
 timer=setInterval(()=>{for(const p of active.values())input(p)},200);
 const host=six[0],guest=six[1],hostTick=guest.latest.tick;active.delete(host.id);host.ws.close();
 await until('server continuity after original host disconnect',()=>guest.latest?.tick>=hostTick+25&&!online(guest,host.id));
 assert.equal(guest.latest.players.length,6);
 const rehost=connect(host.id,host.seq);const restoreSeq=host.seq;
 await until('host same-seat reconnect and fresh input ACK',()=>ready(rehost)&&rehost.latest.tick>hostTick&&online(rehost,host.id)&&rehost.latest.ack>restoreSeq);
 const old=six[5],oldTick=old.latest.tick;active.delete(old.id);old.ws.close();
 await until('guest disconnect visible to others',()=>!online(guest,old.id));
 const returned=connect(old.id,old.seq);const guestSeq=old.seq;
 await until('guest same-seat reconnect and fresh input ACK',()=>ready(returned)&&returned.latest.tick>oldTick&&online(returned,old.id)&&returned.latest.ack>guestSeq);
 for(const p of [rehost,...six.slice(1,5),returned]){assert.equal(p.regressions,0,'monotonic server snapshots');assert.equal(p.latest.players.length,6);assert(seats.every(id=>online(p,id))||p!==returned)}
 console.log('V210 PREVIEW SIX PEERS PASS',JSON.stringify({release:health.arenaRelease,relayCommit:expected,players:6,serverMobCount:returned.latest.mobs?.length,delayedInputMs:[50,100,150,200,250,300],applicationDiscard:six.map(p=>[p.id,p.dropped,p.received]),sameSeatReconnect:true,hostContinuity:true,hostSeatRestored:true,freshInputsAcknowledged:true,tickAfterReconnect:returned.latest.tick}));
}finally{clearInterval(timer);for(const p of peers)try{p.ws.close()}catch{}}
