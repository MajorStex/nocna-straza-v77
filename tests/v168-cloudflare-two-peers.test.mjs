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

assert.equal(h.arenaBuild,168);assert.deepEqual(h.arenaWorld,{w:4200,h:4200});assert.equal(h.arenaXp,true);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',code=Array.from({length:6},()=>alphabet[crypto.randomInt(alphabet.length)]).join('');
const response=await fetch(base+'/arena/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,seats:['p1','p2']}),signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200,await response.clone().text());const room=await response.json();assert(room.ok&&room.tickets.p1&&room.tickets.p2);
const peers=['p1','p2'].map(id=>{const ws=new WebSocket(base.replace(/^http/,'ws')+'/arena/'+room.match),p={id,ws,welcome:null,started:false,snaps:new Map(),latest:null,seq:0,lab:null};
 ws.addEventListener('open',()=>ws.send(JSON.stringify({t:'hello',id,protocol:140,ticket:room.tickets[id],startAck:1})));
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.t==='welcome')p.welcome=m;
 if(m.t==='start'){p.started=true;ws.send(JSON.stringify({t:'startAck'}))}
 if(m.t==='labState')p.lab=m;
 if(m.t==='s'){p.latest=m;p.snaps.set(m.tick,m);if(p.snaps.size>240)p.snaps.delete(p.snaps.keys().next().value)}});
 return p;
});
const send=(p,m)=>{if(p.ws.readyState===1)p.ws.send(JSON.stringify(m))};
async function until(label,condition,timeout=18000){const start=Date.now();while(Date.now()-start<timeout){const r=condition();if(r)return r;await sleep(60)}throw Error(label+' '+JSON.stringify(peers.map(p=>({id:p.id,start:p.started,tick:p.latest?.tick,players:p.latest?.players,alive:p.latest?.alive,lab:p.lab?.enabled})) ))}
function shared(test){for(const [tick,a] of [...peers[0].snaps].reverse()){const b=peers[1].snaps.get(tick);if(b&&test(a)&&test(b))return [a,b]}return null}
const amount=m=>m.players.map(r=>[r[0],r[12],r[14]]);
const timer=setInterval(()=>{for(const p of peers)if(p.started)send(p,{t:'i',seq:++p.seq,ax:0,ay:0,attack:1,rev:p.latest?.expedition?.[1]||0})},200);
try{
 await until('both acknowledged start',()=>peers.every(p=>p.welcome&&p.started&&p.latest?.players.length===2&&p.latest.ingress===1));
 for(const p of peers){assert.deepEqual([p.welcome.world.w,p.welcome.world.h],[4200,4200]);assert.equal(p.latest.waveTotal,24);assert(p.latest.mobs.length<=12)}
 assert.deepEqual(peers[0].welcome.world,peers[1].welcome.world);
 const start=await until('common first wave tick',()=>shared(m=>m.wave===1&&m.players.every(r=>r[11]===1&&r[12]===0&&r[13]===160&&r[14]===0)));
 assert.deepEqual(start[0].mobs,start[1].mobs,'same enemies at same tick');
 // Isolate one combat drop in authenticated test room. Preserve server collision and damage logic.
 const host=peers[0],rev=host.latest.expedition?.[1]||0;send(host,{t:'lab',action:'clearMobs',rev});
 await until('isolated empty arena',()=>peers.every(p=>p.latest?.mobs.length===0));
 // The authoritative lab rejects consecutive commands within 190 ms.
 await sleep(260);
 const clearedRev=host.lab?.rev||0;
 const row=host.latest.players.find(r=>r[0]==='p1'),x=row[1]/10,y=row[2]/10,world=host.welcome.world;
 let pos;for(let k=0;k<16&&!pos;k++){const a=k*Math.PI/8,xx=Math.round(x+Math.cos(a)*58),yy=Math.round(y+Math.sin(a)*58);
 if(xx<40||yy<40||xx>4160||yy>4160)continue;
 if(world.obstacles.some(o=>{const dx=xx-Math.max(o.x,Math.min(xx,o.x+o.w)),dy=yy-Math.max(o.y,Math.min(yy,o.y+o.h));return dx*dx+dy*dy<36**2}))continue;
 pos=[xx,yy]}
 assert(pos,'safe spawn near hero');
 send(host,{t:'lab',action:'spawnMob',kind:'goblin',quantity:1,hp:1,x:pos[0]+52,y:pos[1]+32,rev});
 await until('server accepted the sandbox spawn',()=>peers.every(p=>(p.lab?.rev||0)>clearedRev));
 const pair=await until('one shared combat XP award',()=>shared(m=>m.players.reduce((n,r)=>n+r[14],0)>=1),15000);
 const amounts=amount(pair[0]);assert.deepEqual(amounts,amount(pair[1]));assert.equal(amounts.reduce((n,r)=>n+r[1],0),7);assert.equal(amounts.reduce((n,r)=>n+r[2],0),1);
 await sleep(900);assert.deepEqual(amount(peers[0].latest),amounts,'no XP replay');assert.deepEqual(amount(peers[1].latest),amounts);
 console.log('V168 TWO REAL WEBSOCKETS PASS',JSON.stringify({release,relay:pinned,peerXp:amounts,tick:pair[0].tick}));
}finally{clearInterval(timer);for(const p of peers)p.ws.close()}
