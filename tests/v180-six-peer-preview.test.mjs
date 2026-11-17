import assert from 'node:assert/strict';
// Explicit preview only: never stress the permanent production Worker.
const base=process.env.NS_STRESS_PREVIEW||'https://feature-v168-large-world-xp-crystals-nocna-straza-relay.stefanstevic1996.workers.dev';
assert(!/^https:\/\/nocna-straza-relay\./.test(base),'preview only');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const seats=Array.from({length:6},(_,i)=>'p'+(i+1));
const response=await fetch(base+'/arena/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:'ST8RQA',seats}),signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200,await response.clone().text());const room=await response.json();assert(room.ok);
const peers=[];
function connect(id){
 const p={id,ws:new WebSocket(base.replace(/^http/,'ws')+'/arena/'+room.match),received:0,dropped:0,welcome:false,start:false,ticks:[],seq:0};
 peers.push(p);
 p.ws.addEventListener('open',()=>p.ws.send(JSON.stringify({t:'hello',id,protocol:140,ticket:room.tickets[id]})));
 p.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.t==='welcome')p.welcome=true;if(m.t==='start')p.start=true;
  if(m.t==='s'){p.received++;const loss=Number(id.slice(1))*3;if((p.received*17)%100<loss){p.dropped++;return}
   // Application snapshot discard, not TCP/network packet loss. Bounded queue.
   p.ticks.push(m.tick);if(p.ticks.length>100)p.ticks.shift();p.latest=m;
  }
 });
 return p;
}
async function until(fn,ms=20000){const t=Date.now();while(Date.now()-t<ms){if(fn())return;await sleep(70)}throw Error('preview stress timeout')}
try{
 const six=seats.map(connect);
 await until(()=>six.every(p=>p.welcome&&p.start&&p.latest?.players?.length===6));
 const begin=Date.now();
 // Stagger inputs by 50–300ms; no claim of actual network RTT injection.
 while(Date.now()-begin<4000){
  await Promise.all(six.map(async(p,i)=>{await sleep((i+1)*50);if(p.ws.readyState===1)p.ws.send(JSON.stringify({t:'i',seq:++p.seq,ax:i%2?30:-30,ay:0,attack:0}))}));
 }
 const old=six[5],oldTick=old.latest.tick;old.ws.close();await sleep(900);
 const returned=connect(old.id);await until(()=>returned.welcome&&returned.start&&returned.latest?.tick>oldTick);
 assert(returned.latest.players.some(row=>row[0]===old.id),'same seat restored');
 for(const p of [...six.slice(0,5),returned]){assert(p.ticks.every((t,i)=>i===0||t>p.ticks[i-1]),'monotonic server ticks');assert(p.latest.players.length===6)}
 console.log('V180 PREVIEW SIX PEERS',JSON.stringify({players:6,serverMobCount:returned.latest.mobs?.length,delayedInputMs:[50,100,150,200,250,300],applicationDiscard:six.map(p=>[p.id,p.dropped,p.received]),sameSeatReconnect:true,tickAfterReconnect:returned.latest.tick}));
}finally{for(const p of peers)try{p.ws.close()}catch{}}
