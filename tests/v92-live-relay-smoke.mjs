import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';

const base = 'https://nocna-straza-relay.stefanstevic1996.workers.dev';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');
const password = 'test-' + randomUUID().slice(0,10);
const sockets = [];
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

function waitMessage(ws, test, timeout=9000) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{clean();reject(new Error('Timed out waiting for relay message'))},timeout);
    const handler=e=>{
      let data;
      try { data=JSON.parse(e.data); } catch { return; }
      if(test(data)){clean();resolve(data);}
    };
    const closed=()=>{clean();reject(new Error('WebSocket closed before expected message'))};
    function clean(){clearTimeout(timer);ws.removeEventListener('message',handler);ws.removeEventListener('close',closed);}
    ws.addEventListener('message',handler);
    ws.addEventListener('close',closed,{once:true});
  });
}
async function connect(id,pass){
  const ws=new WebSocket(base.replace(/^http/,'ws')+'/room/'+code);
  sockets.push(ws);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Opening websocket timed out')),9000);
    ws.addEventListener('open',()=>{clearTimeout(timer);resolve()},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket handshake error'))},{once:true});
  });
  const wait=waitMessage(ws,m=>m.t==='OPEN'||m.t==='ERROR');
  ws.send(JSON.stringify({t:'HELLO',id,password:pass}));
  return {ws,result:await wait};
}
async function list(){
 const r=await fetch(base+'/api/lobbies');
 assert.equal(r.status,200,'Directory must return HTTP 200');
 const d=await r.json();assert.equal(d.version,2);
 return d.rooms.find(x=>x.code===code);
}
try{
  const host=await connect('ns30-'+code.toLowerCase(),'');
  assert.equal(host.result.t,'OPEN','Host must be accepted');
  host.ws.send(JSON.stringify({
    t:'ROOM_STATUS',name:'NS v92 smoke test',maxPlayers:2,public:true,
    password,mode:'normal',difficulty:'normal',status:'waiting'
  }));
  await sleep(800);
  let entry=await list();
  assert.ok(entry,'New public room must appear');
  assert.equal(entry.locked,true);
  assert.equal(entry.players,1);
  console.log('LIVE_ROOM_LIST=ok',code);
  const bad=await connect('bad_'+randomUUID().slice(0,10),'wrong-password');
  assert.equal(bad.result.t,'ERROR','Invalid password must not register a player');
  assert.match(bad.result.reason,/password/i);
  console.log('LIVE_PASSWORD_REJECTION=ok');
  const guest=await connect('good_'+randomUUID().slice(0,10),password);
  assert.equal(guest.result.t,'OPEN','Correct password must join');
  await sleep(800);
  entry=await list();
  assert.equal(entry?.players,2,'Two players must appear in public lobby list');
  console.log('LIVE_PASSWORD_JOIN=ok');
  console.log('LIVE_ROOM_PLAYERS=2/2');
}finally{
  for(const ws of sockets)if(ws.readyState===WebSocket.OPEN||ws.readyState===WebSocket.CONNECTING)ws.close();
}
