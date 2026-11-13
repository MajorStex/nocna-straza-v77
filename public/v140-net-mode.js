/* V140 independent lobby -> authoritative arena test. Zero rewards. */
(()=>{
'use strict';
if(window.NS140_ARENA)return;
const B=()=>window.__NS110_BRIDGE||{},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const N={phase:'idle',ws:null,match:'',id:'',world:{w:960,h:600,r:14,speed:156,obstacles:[]},
 players:new Map(),me:null,seq:0,ack:0,pending:[],delta:{x:0,y:0},tick:-1,
 lastInput:0,lastState:0,lastFrame:0,lastPing:0,ping:0,fps:0,fpsAt:0,frames:0,
 correction:0,serverMs:0,keys:new Set(),stick:{x:0,y:0,ptr:null},attack:false,timeout:null};
const el=id=>document.getElementById(id);
function ui(){
 if(el('ns140Root'))return;
 const style=document.createElement('style');
 style.textContent='#ns140Root{position:fixed;inset:0;z-index:100000;background:#142c26;color:#f5e6ba;font-family:system-ui;touch-action:none}'+
 '#ns140Root[hidden]{display:none!important}#ns140Canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}'+
 '#ns140Bar{position:absolute;top:max(9px,env(safe-area-inset-top));left:9px;right:9px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;background:#122922e9;border:1px solid #96b8a2;border-radius:10px;padding:9px;font-size:12px}'+
 '#ns140Stats{font:10px monospace;color:#b8d5c6}#ns140Close{background:#714837;color:white;border:1px solid #e9b69a;padding:7px;border-radius:7px}'+
 '#ns140Pad{position:absolute;left:15px;bottom:36px;width:128px;height:128px;border:2px solid #c1d0bb88;background:#587d6d66;border-radius:50%;touch-action:none}'+
 '#ns140Pad:after{content:"●";position:absolute;left:42px;top:42px;display:grid;place-items:center;width:44px;height:44px;background:#aac9beaa;border-radius:50%;font-size:28px}'+
 '#ns140Hit{position:absolute;right:20px;bottom:57px;width:90px;height:90px;border-radius:50%;border:2px solid #edce9a;background:#76523e;color:#fff6cf;font-size:27px;touch-action:none}'+
 '#ns140Hit small{font-size:10px;display:block}';
 const root=document.createElement('section');root.id='ns140Root';root.hidden=true;
 root.innerHTML='<canvas id="ns140Canvas"></canvas><div id="ns140Bar"><b id="ns140Status">V140 NOVA MREŽA</b><span id="ns140Stats"></span><button type="button" id="ns140Close">← LOBBY</button></div>'+
 '<div id="ns140Pad" aria-label="Kontrola kretanja"></div><button type="button" id="ns140Hit">⚔<small>ATTACK</small></button>';
 document.body.append(style,root);
 el('ns140Close').onclick=()=>stop(true);
 const pad=el('ns140Pad');
 const move=e=>{const r=pad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.35),dy=(e.clientY-r.top-r.height/2)/(r.height*.35),d=Math.hypot(dx,dy);
  N.stick.x=clamp(dx/(d>1?d:1),-1,1);N.stick.y=clamp(dy/(d>1?d:1),-1,1)};
 pad.onpointerdown=e=>{e.preventDefault();N.stick.ptr=e.pointerId;pad.setPointerCapture(e.pointerId);move(e)};
 pad.onpointermove=e=>{if(e.pointerId===N.stick.ptr)move(e)};
 const release=e=>{if(e.pointerId===N.stick.ptr){N.stick.ptr=null;N.stick.x=N.stick.y=0}};
 pad.onpointerup=release;pad.onpointercancel=release;pad.onlostpointercapture=release;
 const hit=el('ns140Hit');hit.onpointerdown=e=>{e.preventDefault();N.attack=true;hit.setPointerCapture(e.pointerId)};
 hit.onpointerup=hit.onpointercancel=hit.onlostpointercapture=()=>{N.attack=false};
 window.addEventListener('keydown',e=>{if(N.phase!=='running'||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
 const k=e.key.toLowerCase();N.keys.add(k);if(k.startsWith('arrow'))e.preventDefault()});
 window.addEventListener('keyup',e=>N.keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{N.keys.clear();N.stick.x=N.stick.y=0;N.attack=false});
}
function status(note){ui();el('ns140Root').hidden=false;el('ns140Status').textContent=note}
function stop(notify=false){
 if(notify&&N.id==='p1'&&N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'end'}))}catch{}
 if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
 const ws=N.ws;N.ws=null;if(ws){ws.onopen=ws.onmessage=ws.onclose=ws.onerror=null;try{ws.close()}catch{}}
 N.phase='idle';N.players.clear();N.me=null;N.pending.length=0;N.keys.clear();N.stick.x=N.stick.y=0;N.attack=false;
 if(el('ns140Root'))el('ns140Root').hidden=true;
 if(B().NET?.phase==='lobby')try{B().renderLobby?.()}catch{}
 return true;
}
function input(){
 const k=N.keys;let x=N.stick.x+(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0);
 let y=N.stick.y+(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0);
 const d=Math.hypot(x,y);if(d>1){x/=d;y/=d}
 return {x,y,attack:N.attack||k.has('j')||k.has('f')};
}
function moveLocal(p,dx,dy){
 const w=N.world,r=w.r||14,free=(x,y)=>(w.obstacles||[]).every(o=>{
  const qx=clamp(x,o.x,o.x+o.w),qy=clamp(y,o.y,o.y+o.h);
  return (x-qx)**2+(y-qy)**2>=r*r;
 });
 const x=clamp(p.x+dx,r,w.w-r);if(free(x,p.y))p.x=x;
 const y=clamp(p.y+dy,r,w.h-r);if(free(p.x,y))p.y=y;
}
function snapshot(m){
 if(!Number.isInteger(m.tick)||m.tick<=N.tick||!Array.isArray(m.players))return;
 N.tick=m.tick;N.lastState=performance.now();N.serverMs=Number(m.ms)||0;
 for(const row of m.players){
  if(!Array.isArray(row)||!/^p[1-6]$/.test(row[0]))continue;
  const [id,xx,yy,hp,attackTick,online,knocked]=row;
  if(!Number.isFinite(xx)||!Number.isFinite(yy))continue;
  const x=xx/10,y=yy/10;let p=N.players.get(id);
  if(!p){p={id,x,y,tx:x,ty:y};N.players.set(id,p)}
  p.tx=x;p.ty=y;p.hp=hp;p.attackTick=attackTick;p.online=!!online;p.knocked=!!knocked;
  if(id===N.id){
   N.me=p;const ack=Number(m.ack)||0;
   if(ack>N.ack){N.ack=ack;N.pending=N.pending.filter(e=>e.seq>ack)}
   let dx=N.delta.x,dy=N.delta.y;for(const item of N.pending){dx+=item.dx;dy+=item.dy}
   const n=Math.hypot(dx,dy);if(n>105){dx*=105/n;dy*=105/n}
   const targetX=x+dx,targetY=y+dy,err=Math.hypot(targetX-p.x,targetY-p.y);N.correction=err;
   if(err>170){p.x=targetX;p.y=targetY}
   else if(err>3){const t=clamp(err/135,.07,.24);p.x+=(targetX-p.x)*t;p.y+=(targetY-p.y)*t}
  }
 }
}
function connect(match,id,ticket){
 if(N.phase!=='idle')return false;
 if(B().currentProfileLevel?.()<7){status('V140 zahteva OPŠTI NIVO 7');return false}
 N.match=match;N.id=id;N.seq=N.ack=0;N.tick=-1;N.delta={x:0,y:0};N.pending=[];N.players.clear();N.me=null;
 N.phase='connecting';status('V140 · POVEZIVANJE NA NOVI SERVER...');
 let ws;
 try{ws=new WebSocket('wss://nocna-straza-relay.stefanstevic1996.workers.dev/arena/'+match)}
 catch{N.phase='error';status('Server novog moda nije dostupan');return false}
 N.ws=ws;
 N.timeout=setTimeout(()=>{if(N.phase==='connecting'){N.phase='error';status('Novi server nije odgovorio. Vrati se u lobby.');try{ws.close()}catch{}}},24000);
 ws.onopen=()=>{if(N.ws===ws)ws.send(JSON.stringify({t:'hello',id,ticket,protocol:140}))};
 ws.onmessage=e=>{
  if(N.ws!==ws)return;let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.t==='welcome'){if(m.protocol!==140){N.phase='error';status('Nepodudarne MP verzije');return}
   N.world=m.world||N.world;status('V140 · POVEZAN · ČEKAM IGRAČE');return}
  if(m.t==='roster'){status('V140 · NOVI SERVER: '+m.ready.length+'/'+m.total+' IGRAČA');return}
  if(m.t==='start'){N.phase='running';if(N.timeout)clearTimeout(N.timeout);N.timeout=null;N.lastFrame=0;status('V140 · IGRIVO · SERVER AUTORITET · 0 XP');return}
  if(m.t==='s'){snapshot(m);return}
  if(m.t==='pong'&&Number.isFinite(m.sent))N.ping=Math.max(0,performance.now()-m.sent);
  if(m.t==='end'){status('TEST ZAVRŠEN: '+String(m.reason||'kraj'));setTimeout(()=>{if(N.ws===ws)stop()},1200)}
 };
 ws.onclose=()=>{if(N.ws===ws&&N.phase!=='idle'){N.phase='error';status('NOVI SERVER JE PREKINUO VEZU · VRATI SE U LOBBY')}};
 ws.onerror=()=>{if(N.ws===ws)status('V140 SERVER JOŠ NIJE OBJAVLJEN ILI JE NEDOSTUPAN')};
 return true;
}
async function startHost(){
 const b=B(),net=b.NET,roster=b.currentLobbyRoster?.()||[];
 if(net?.role!=='host'||net.phase!=='lobby'||N.phase!=='idle')return false;
 if(roster.length<2||roster.length>6||roster.some(p=>Number(p.level)<7)){
  status('SVI IGRAČI MORAJU IMATI OPŠTI NIVO 7');N.phase='error';return false}
 N.phase='preparing';status('V140 · PRIPREMAM ZASEBAN MP SERVER...');
 try{
  const req=await fetch('https://nocna-straza-relay.stefanstevic1996.workers.dev/arena/create',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({code:net.code,seats:roster.map(p=>p.id)})});
  const data=await req.json().catch(()=>null);
  if(!req.ok||data?.protocol!==140||!data.ok||!data.tickets)throw Error(data?.error||'server_not_deployed');
  for(const peer of roster){
   if(peer.id===net.localId)continue;
   const c=net.clients.get(peer.id);
   if(!c?.open)throw Error('guest_disconnected');
   c.send({t:'arena140Offer',match:data.match,id:peer.id,ticket:data.tickets[peer.id],protocol:140});
  }
  N.phase='idle';return connect(data.match,net.localId,data.tickets[net.localId]);
 }catch(err){N.phase='error';status('V140 SERVER NIJE SPREMAN: '+String(err?.message||err).slice(0,70));return false}
}
function acceptOffer(d){
 const b=B(),net=b.NET;if(net?.role!=='guest'||net.phase!=='lobby'||d?.protocol!==140||
 !/^[a-f0-9]{24}$/.test(d.match)||d.id!==net.localId||typeof d.ticket!=='string')return false;
 if(N.phase!=='idle')return N.match===d.match;
 return connect(d.match,d.id,d.ticket);
}
function frame(now){
 if(N.phase!=='running'||document.hidden)return;
 const canvas=el('ns140Canvas'),g=canvas?.getContext('2d');if(!g)return;
 const dt=clamp((now-(N.lastFrame||now))/1000,0,.035);N.lastFrame=now;
 N.frames++;if(!N.fpsAt)N.fpsAt=now;if(now-N.fpsAt>1000){N.fps=Math.round(N.frames*1000/(now-N.fpsAt));N.frames=0;N.fpsAt=now}
 const v=input();
 if(N.me&&N.me.hp>0){
  const oldX=N.me.x,oldY=N.me.y;
  moveLocal(N.me,v.x*N.world.speed*dt,v.y*N.world.speed*dt);
  N.delta.x+=N.me.x-oldX;N.delta.y+=N.me.y-oldY;
  const away=Math.hypot(N.me.x-N.me.tx,N.me.y-N.me.ty);
  if(away>105){N.me.x=N.me.tx+(N.me.x-N.me.tx)*105/away;N.me.y=N.me.ty+(N.me.y-N.me.ty)*105/away}
 }
 if(N.ws?.readyState===1&&now-N.lastInput>=50&&N.ws.bufferedAmount<4000){
  const seq=++N.seq;N.pending.push({seq,dx:N.delta.x,dy:N.delta.y});
  if(N.pending.length>26)N.pending.shift();
  N.delta={x:0,y:0};N.lastInput=now;
  N.ws.send(JSON.stringify({t:'i',seq,ax:Math.round(v.x*127),ay:Math.round(v.y*127),attack:v.attack?1:0}));
 }
 if(N.ws?.readyState===1&&now-N.lastPing>2000){N.lastPing=now;N.ws.send(JSON.stringify({t:'ping',sent:now}))}
 const r=canvas.getBoundingClientRect(),dpr=Math.min(1.5,devicePixelRatio||1);
 const ww=Math.round(r.width*dpr),hh=Math.round(r.height*dpr);if(canvas.width!==ww||canvas.height!==hh){canvas.width=ww;canvas.height=hh}
 g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#192e29';g.fillRect(0,0,r.width,r.height);
 const zoom=clamp(Math.max(r.width/750,r.height/760),.7,1.45),me=N.me||{x:N.world.w/2,y:N.world.h/2};
 g.setTransform(dpr*zoom,0,0,dpr*zoom,dpr*(r.width/2-me.x*zoom),dpr*(r.height/2-me.y*zoom));
 g.fillStyle='#395443';g.fillRect(0,0,N.world.w,N.world.h);
 g.strokeStyle='#536b55';for(let x=0;x<N.world.w;x+=55){g.beginPath();g.moveTo(x,0);g.lineTo(x,N.world.h);g.stroke()}
 for(let y=0;y<N.world.h;y+=55){g.beginPath();g.moveTo(0,y);g.lineTo(N.world.w,y);g.stroke()}
 for(const o of N.world.obstacles){g.fillStyle='#7c6b52';g.fillRect(o.x,o.y,o.w,o.h);g.strokeStyle='#bfa17b';g.lineWidth=2;g.strokeRect(o.x,o.y,o.w,o.h)}
 for(const p of N.players.values()){
  if(!p.online)continue;
  if(p.id!==N.id){const k=clamp(dt*10,0,1);p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k}
  g.save();if(p.hp<=0)g.globalAlpha=.38;
  const b=B();if(typeof b.drawVillageHero==='function')b.drawVillageHero(g,p.x,p.y,{id:p.id,
    look:b.getVillageHeroLook?.(p.id)||b.heroStyle,frame:now/110,walking:true,visualSide:1});
  else{g.fillStyle=p.id===N.id?'#b2ddb6':'#d5b591';g.beginPath();g.arc(p.x,p.y,17,0,7);g.fill()}
  g.fillStyle='#17251c';g.fillRect(p.x-23,p.y-65,46,5);g.fillStyle='#a8e2a6';g.fillRect(p.x-22,p.y-64,44*clamp(p.hp/100,0,1),3);
  g.fillStyle='#f0dfb6';g.font='bold 11px sans-serif';g.textAlign='center';g.fillText(p.id===N.id?'TI':p.id,p.x,p.y-72);
  if(p.attackTick&&N.tick-p.attackTick<11){g.strokeStyle='#f4cb8f';g.lineWidth=4;g.beginPath();g.arc(p.x,p.y,54,-.8,.7);g.stroke()}
  g.restore();
 }
 g.setTransform(dpr,0,0,dpr,0,0);
 el('ns140Stats').textContent='FPS '+N.fps+' | '+Math.round(N.ping)+'ms | ACK '+N.ack+'/'+N.seq+
  ' | korekcija '+Math.round(N.correction)+'px | stanje '+Math.round(now-N.lastState)+'ms | CPU '+N.serverMs+'ms';
}
window.NS140_ARENA={startHost,acceptOffer,frame,stop,get active(){return N.phase==='running'},
 get busy(){return N.phase!=='idle'},get diagnostics(){return {phase:N.phase,seq:N.seq,ack:N.ack,correction:N.correction,fps:N.fps,ping:N.ping,serverMs:N.serverMs}}};
})();
