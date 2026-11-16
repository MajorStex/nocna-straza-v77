import assert from 'node:assert/strict';
const base=process.env.V168_RELAY_PREVIEW||
 'https://feature-v168-large-world-xp-crystals-nocna-straza-relay.stefanstevic1996.workers.dev';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const health=await fetch(base+'/health?verify=v168-'+Date.now(),{signal:AbortSignal.timeout(20000)});
assert.equal(health.status,200,'preview Worker health');
const status=await health.json();
assert.equal(status.arenaBuild,168,'server must be V168, not old V162');
assert.deepEqual(status.arenaWorld,{w:4200,h:4200});
assert.equal(status.arenaXp,true);
console.log('V168 PREVIEW HEALTH PASS',JSON.stringify({build:status.arenaBuild,world:status.arenaWorld}));
const response=await fetch(base+'/arena/create',{method:'POST',headers:{'content-type':'application/json'},
 body:JSON.stringify({code:'XP8NQA',seats:['p1','p2']}),signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200,await response.clone().text());
const room=await response.json();
assert(room.ok&&/^[a-f0-9]{24}$/.test(room.match)&&room.tickets.p1&&room.tickets.p2,'room creation');
const openPeer=id=>{
 const messages=[],url=base.replace(/^http/,'ws')+'/arena/'+room.match;
 const ws=new WebSocket(url);
 ws.addEventListener('open',()=>ws.send(JSON.stringify({t:'hello',id,protocol:140,ticket:room.tickets[id]})));
 ws.addEventListener('message',event=>{
  try{messages.push(JSON.parse(event.data));if(messages.length>240)messages.shift()}catch{}
 });
 return {id,ws,messages,send:m=>ws.readyState===1&&ws.send(JSON.stringify(m))};
};
const peers=[openPeer('p1'),openPeer('p2')];
async function until(condition,timeout=14000){
 const beginning=Date.now();
 while(Date.now()-beginning<timeout){
  const value=condition();if(value)return value;
  await sleep(60);
 }
 throw new Error('Network two-peer timeout; state '+JSON.stringify(peers.map(p=>p.messages.slice(-2).map(m=>m.t))));
}
const latest=p=>p.messages.filter(m=>m.t==='s').at(-1);
try{
 await until(()=>peers.every(p=>p.messages.some(m=>m.t==='welcome')&&p.messages.some(m=>m.t==='start')&&latest(p)));
 const welcome=peers.map(p=>p.messages.find(m=>m.t==='welcome'));
 for(const w of welcome){
  assert.equal(w.serverBuild,168);
  assert.deepEqual([w.world.w,w.world.h],[4200,4200]);
 }
 const first=peers.map(latest);
 assert(first.every(m=>m.players.length===2&&m.mobs.length===60),'same server world/horde to two guests');
 assert.deepEqual(first[0].mobs.map(m=>m[0]),first[1].mobs.map(m=>m[0]));
 assert(first.every(m=>m.players.every(p=>p[11]===1&&p[12]===0&&p[13]===160&&p[14]===0)));
 const p1row=first[0].players.find(p=>p[0]==='p1');
 const x=p1row[1]/10,y=p1row[2]/10;
 // Spawn an authenticated sandbox test mob at 75px from p1. The host cannot
 // write damage, XP or gems: only server auto-attack produces a single drop.
 peers[0].send({t:'lab',action:'spawnMob',kind:'goblin',quantity:1,hp:1,x:x+127,y:y+32});
 await until(()=>peers.every(p=>latest(p)?.players.some(row=>row[14]>=1)),13000);
 const one=peers.map(latest);
 const amounts=one.map(m=>m.players.map(row=>[row[0],row[12],row[14]]));
 assert.deepEqual(amounts[0],amounts[1],'both clients must receive same XP ownership');
 assert.equal(amounts[0].reduce((sum,row)=>sum+row[1],0),7,'a single XP crystal gives exactly 7 EXP');
 assert.equal(amounts[0].reduce((sum,row)=>sum+row[2],0),1,'exactly one of two clients picks it up');
 await sleep(900);
 const repeat=latest(peers[0]).players.map(row=>[row[0],row[12],row[14]]);
 assert.deepEqual(repeat,amounts[0],'no XP replay after next snapshots');
 console.log('V168 TWO REAL WEBSOCKETS PASS',JSON.stringify({world:status.arenaWorld,peerXp:amounts[0],ticks:one.map(m=>m.tick)}));
}finally{for(const peer of peers)peer.ws.close()}
