/* V140 independent lobby -> authoritative arena test. Zero rewards. */
(()=>{
'use strict';
if(window.NS140_ARENA)return;
const B=()=>window.__NS110_BRIDGE||{},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const N={phase:'idle',ws:null,match:'',id:'',world:{w:960,h:600,r:14,speed:156,obstacles:[]},
 players:new Map(),me:null,seq:0,ack:0,pending:[],delta:{x:0,y:0},tick:-1,
 lastInput:0,lastState:0,lastFrame:0,lastPing:0,ping:0,fps:0,fpsAt:0,frames:0,
 correction:0,serverMs:0,keys:new Set(),stick:{x:0,y:0,ptr:null,startX:0,startY:0,radius:47,deadZone:7},attack:false,timeout:null,ticket:'',retry:0,
 solo:false,soloMobs:[],soloTick:0,soloAcc:0,soloKills:0,soloSwing:-100,soloInvul:0};
const el=id=>document.getElementById(id);
function ui(){
 if(el('ns140Root'))return;
 const style=document.createElement('style');
 style.textContent='#ns140Root{position:fixed;inset:0;z-index:100000;background:#142c26;color:#f5e6ba;font-family:system-ui;touch-action:none}'+
 '#ns140Root[hidden]{display:none!important}#ns140Canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}'+
 '#ns140Bar{position:absolute;top:max(9px,env(safe-area-inset-top));left:9px;right:9px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;background:#122922e9;border:1px solid #96b8a2;border-radius:10px;padding:9px;font-size:12px}'+
 '#ns140Stats{font:10px monospace;color:#b8d5c6}#ns140Close{background:#714837;color:white;border:1px solid #e9b69a;padding:7px;border-radius:7px}'+
 '#ns140Pad{position:fixed;left:0;top:0;width:112px;height:112px;display:none;transform:translate(-50%,-50%);pointer-events:none;touch-action:none;z-index:4;border:2px solid #d9eee096;background:radial-gradient(circle,#9bccaa26,#1a413e77);border-radius:50%;box-shadow:inset 0 0 23px #061a2188}'+
 '#ns140Pad.active{display:block}'+
 '#ns140Knob{position:absolute;left:27px;top:27px;width:54px;height:54px;border:2px solid #c3e2d1b8;background:radial-gradient(circle at 34% 27%,#c1e4cfb5,#547c77bd);border-radius:50%;box-shadow:0 4px 11px #081c1a9a;will-change:transform}'+
 '#ns140Hit{position:absolute;right:20px;bottom:57px;width:90px;height:90px;border-radius:50%;border:2px solid #edce9a;background:#76523e;color:#fff6cf;font-size:27px;touch-action:none}'+
 '#ns140Hit small{font-size:10px;display:block}';
 const root=document.createElement('section');root.id='ns140Root';root.hidden=true;
 root.innerHTML='<canvas id="ns140Canvas"></canvas><div id="ns140Bar"><b id="ns140Status">V145 NOVA ZONA</b><span id="ns140Stats"></span><button type="button" id="ns140Close">← LOBBY</button></div>'+
 '<div id="ns140Pad" aria-hidden="true"><span id="ns140Knob"></span></div><button type="button" id="ns140Hit">⚔<small>ATTACK</small></button>';
 document.body.append(style,root);
 el('ns140Close').onclick=()=>stop(true);
 // Same free-position pointer joystick as the normal game: it appears
 // where the player touches the arena, not in a fixed bottom-left spot.
 const pad=el('ns140Pad'),knob=el('ns140Knob'),canvas=el('ns140Canvas');
 const resetStick=()=>{
  N.stick.ptr=null;N.stick.x=0;N.stick.y=0;
  pad.classList.remove('active');knob.style.transform='translate(0px,0px)';
 };
 const moveStick=e=>{
  const dx=e.clientX-N.stick.startX,dy=e.clientY-N.stick.startY,dist=Math.hypot(dx,dy);
  if(dist<N.stick.deadZone){N.stick.x=N.stick.y=0}
  else{
   const power=Math.min(1,(dist-N.stick.deadZone)/(N.stick.radius-N.stick.deadZone));
   N.stick.x=dx/dist*power;N.stick.y=dy/dist*power;
  }
  knob.style.transform='translate('+(N.stick.x*39).toFixed(1)+'px,'+(N.stick.y*39).toFixed(1)+'px)';
 };
 canvas.addEventListener('pointerdown',e=>{
  if(N.phase!=='running'||N.stick.ptr!==null)return;
  if(e.pointerType==='mouse'){
   if(e.button===0){e.preventDefault();N.attack=true}
   return; // PC matches normal mode: click = attack, WASD = move.
  }
  e.preventDefault();N.stick.ptr=e.pointerId;
  N.stick.startX=e.clientX;N.stick.startY=e.clientY;
  pad.style.left=e.clientX+'px';pad.style.top=e.clientY+'px';
  pad.classList.add('active');knob.style.transform='translate(0px,0px)';
  try{canvas.setPointerCapture(e.pointerId)}catch{}
 });
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerId===N.stick.ptr){e.preventDefault();moveStick(e)}
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])
  canvas.addEventListener(type,e=>{if(e.pointerId===N.stick.ptr)resetStick()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetStick()});
 window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')N.attack=false});
 const hit=el('ns140Hit');hit.onpointerdown=e=>{e.preventDefault();N.attack=true;hit.setPointerCapture(e.pointerId)};
 hit.onpointerup=hit.onpointercancel=hit.onlostpointercapture=()=>{N.attack=false};
 window.addEventListener('keydown',e=>{if(N.phase!=='running'||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
 const k=e.key.toLowerCase();N.keys.add(k);if(k.startsWith('arrow'))e.preventDefault()});
 window.addEventListener('keyup',e=>N.keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{N.keys.clear();resetStick();N.attack=false});
}
function status(note){ui();el('ns140Root').hidden=false;el('ns140Status').textContent=note}
function stop(notify=false){
 const wasSolo=N.solo;
 if(notify&&N.id==='p1'&&N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'end'}))}catch{}
 if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
 const ws=N.ws;N.ws=null;if(ws){ws.onopen=ws.onmessage=ws.onclose=ws.onerror=null;try{ws.close()}catch{}}
 N.phase='idle';N.solo=false;N.soloMobs=[];N.ticket='';N.retry=0;N.players.clear();N.me=null;N.pending.length=0;N.keys.clear();N.stick.x=N.stick.y=0;N.stick.ptr=null;N.attack=false;
 if(el('ns140Pad')){el('ns140Pad').classList.remove('active');el('ns140Knob').style.transform='translate(0px,0px)'};
 if(el('ns140Root'))el('ns140Root').hidden=true;
 if(wasSolo)try{window.__nightWatch?.showPreRun?.()}catch{}
 else if(B().NET?.phase==='lobby')try{B().renderLobby?.()}catch{}
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

/* Local-only entry for the SAME V140 arena. Never creates a lobby, WebSocket or
   a Cloudflare request. Practice goblins are temporary test content (0 XP). */
function startSolo(){
 if(B().currentProfileLevel?.()<7||B().NET?.role||!['idle','error'].includes(N.phase))return false;
 if(N.ws){try{N.ws.close()}catch{}N.ws=null}
 N.solo=true;N.phase='running';N.id='p1';N.match='offline';N.ticket='';
 N.world={w:960,h:600,r:14,speed:156,obstacles:[
  {x:275,y:140,w:95,h:92},{x:585,y:330,w:102,h:94},
  {x:435,y:245,w:75,h:84},{x:165,y:350,w:87,h:58}
 ]};
 N.seq=N.ack=N.soloTick=N.soloKills=0;N.tick=-1;
 N.soloAcc=0;N.soloSwing=-100;N.soloInvul=0;
 N.lastFrame=N.lastState=N.lastPing=N.lastInput=0;N.fpsAt=0;N.frames=0;
 N.delta={x:0,y:0};N.pending=[];N.players.clear();N.stick.ptr=null;N.stick.x=N.stick.y=0;
 if(el('ns140Pad'))el('ns140Pad').classList.remove('active');
 N.me={id:'p1',x:130,y:250,tx:130,ty:250,hp:100,attackTick:-100,online:true,knocked:false};
 N.players.set('p1',N.me);
 N.soloMobs=Array.from({length:12},(_,i)=>({
  id:i,x:180+(i%4)*185,y:75+Math.floor(i/4)*225,
  sx:180+(i%4)*185,sy:75+Math.floor(i/4)*225,
  hp:35,attackAt:0,deadUntil:0
 }));
 status('V145 · SINGLEPLAYER · OFFLINE · TEST GOBLINI · 0 XP');
 el('ns140Hit').disabled=false;
 return true;
}
function stepSolo(dt,attackHeld){
 if(!N.solo||!N.me)return;
 N.soloAcc=Math.min(.15,N.soloAcc+dt);
 let iterations=0;
 while(N.soloAcc>=1/30&&iterations++<5){
  N.soloAcc-=1/30;N.soloTick++;N.tick=N.soloTick;
  const me=N.me;
  if(me.hp<=0){N.phase='solo_ended';status('STRAŽAR JE PAO · SOLO TEST ZAVRŠEN · NAZAD ZA PONOVNO');break}
  for(const mob of N.soloMobs){
   if(mob.hp<=0){
    if(N.soloTick>=mob.deadUntil){mob.hp=35;mob.x=mob.sx;mob.y=mob.sy}
    continue;
   }
   const dx=me.x-mob.x,dy=me.y-mob.y,d=Math.hypot(dx,dy)||1;
   if(d>28)moveLocal(mob,dx/d*55/30,dy/d*55/30);
   else if(N.soloTick>mob.attackAt&&N.soloTick>N.soloInvul){
    me.hp=Math.max(0,me.hp-7);mob.attackAt=N.soloTick+43;N.soloInvul=N.soloTick+28;
   }
  }
  if(attackHeld&&N.soloTick-N.soloSwing>=19){
   N.soloSwing=N.soloTick;me.attackTick=N.soloTick;
   let target=null,dist=83;
   for(const mob of N.soloMobs){
    if(mob.hp<=0)continue;
    const d=Math.hypot(mob.x-me.x,mob.y-me.y);
    if(d<dist){target=mob;dist=d}
   }
   // Lock slash direction onto the actual nearest goblin being hit.
   // When nothing is in striking range, point toward the closest visible
   // target (visual only — it never extends the authoritative 83px hitbox).
   let visualTarget=target,visualDist=155;
   if(!visualTarget)for(const mob of N.soloMobs){
    if(mob.hp<=0)continue;
    const d=Math.hypot(mob.x-me.x,mob.y-me.y);
    if(d<visualDist){visualTarget=mob;visualDist=d}
   }
   if(visualTarget){
    me.attackAngle=Math.atan2(visualTarget.y-me.y,visualTarget.x-me.x);
    me.facingAngle=me.attackAngle;
   }else me.attackAngle=Number.isFinite(me.facingAngle)?me.facingAngle:0;
   if(target){
    target.hitTick=N.soloTick;
    target.hp=Math.max(0,target.hp-22);
    if(target.hp===0){target.deadUntil=N.soloTick+105;N.soloKills++}
   }
  }
 }
}
function drawSoloMobs(g,now){
 for(const mob of N.soloMobs){
  if(mob.hp<=0)continue;
  const pulse=Math.sin(now/250+mob.id)*1.4;
  g.save();g.translate(mob.x,mob.y+pulse);
  g.fillStyle=N.soloTick-(mob.hitTick||-100)>0&&N.soloTick-(mob.hitTick||-100)<6?'#506b39':'#2c3e29';g.beginPath();g.ellipse(0,6,17,13,0,0,Math.PI*2);g.fill();
  g.fillStyle='#6a8954';g.beginPath();g.moveTo(-13,0);g.lineTo(-15,-13);g.lineTo(-6,-8);
  g.quadraticCurveTo(0,-22,8,-8);g.lineTo(15,-14);g.lineTo(12,0);
  g.quadraticCurveTo(0,14,-13,0);g.fill();
  g.fillStyle='#efc269';g.fillRect(-7,-6,4,3);g.fillRect(5,-6,4,3);
  g.fillStyle='#473a2a';g.fillRect(-16,-29,32,4);
  g.fillStyle='#a6d49a';g.fillRect(-15,-28,30*(mob.hp/35),2);
  g.restore();
 }
}

function connect(match,id,ticket){
 if(N.phase!=='idle')return false;
 if(B().currentProfileLevel?.()<7){status('NOVA ZONA zahteva OPŠTI NIVO 7');return false}
 N.match=match;N.id=id;N.ticket=ticket;N.seq=N.ack=0;N.tick=-1;N.delta={x:0,y:0};N.pending=[];N.players.clear();N.me=null;
 N.phase='connecting';status('V145 · POVEZIVANJE NA NOVI SERVER...');
 let ws;
 try{ws=new WebSocket('wss://nocna-straza-relay.stefanstevic1996.workers.dev/arena/'+match)}
 catch{N.phase='error';status('Server novog moda nije dostupan');return false}
 N.ws=ws;
 N.timeout=setTimeout(()=>{if(N.phase==='connecting'){N.phase='error';status('Novi server nije odgovorio. Vrati se u lobby.');try{ws.close()}catch{}}},24000);
 ws.onopen=()=>{if(N.ws===ws)ws.send(JSON.stringify({t:'hello',id,ticket,protocol:140}))};
 ws.onmessage=e=>{
  if(N.ws!==ws)return;let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.t==='welcome'){if(m.protocol!==140){N.phase='error';status('Nepodudarne MP verzije');return}
   N.world=m.world||N.world;status('V145 · POVEZAN · ČEKAM IGRAČE');return}
  if(m.t==='roster'){status('V145 · NOVI SERVER: '+m.ready.length+'/'+m.total+' IGRAČA');return}
  if(m.t==='start'){N.phase='running';N.retry=0;if(N.timeout)clearTimeout(N.timeout);N.timeout=null;N.lastFrame=0;status('V145 · IGRIVO · SERVER AUTORITET · 0 XP');return}
  if(m.t==='s'){snapshot(m);return}
  if(m.t==='pong'&&Number.isFinite(m.sent))N.ping=Math.max(0,performance.now()-m.sent);
  if(m.t==='end'){status('TEST ZAVRŠEN: '+String(m.reason||'kraj'));setTimeout(()=>{if(N.ws===ws)stop()},1200)}
 };
 ws.onclose=()=>{
  if(N.ws!==ws||N.phase==='idle')return;
  if(N.timeout){clearTimeout(N.timeout);N.timeout=null}
  if(N.phase==='running'&&N.retry<3){
   N.retry++;
   const retry=N.retry,match=N.match,id=N.id,ticket=N.ticket;
   N.phase='reconnecting';status('V145 · PONOVNO POVEZIVANJE '+retry+'/3');
   setTimeout(()=>{
    if(N.ws!==ws||N.phase!=='reconnecting')return;
    N.ws=null;N.phase='idle';connect(match,id,ticket);
   },Math.min(3500,retry*1100));
  }else{N.phase='error';status('NOVI SERVER JE PREKINUO VEZU · VRATI SE U LOBBY')}
 };
 ws.onerror=()=>{if(N.ws===ws)status('V145 SERVER JOŠ NIJE OBJAVLJEN ILI JE NEDOSTUPAN')};
 return true;
}
async function startHost(){
 const b=B(),net=b.NET,roster=b.currentLobbyRoster?.()||[];
 if(net?.role!=='host'||net.phase!=='lobby'||N.phase!=='idle')return false;
 if(roster.length<2||roster.length>6||roster.some(p=>Number(p.level)<7)){
  status('SVI IGRAČI MORAJU IMATI OPŠTI NIVO 7');N.phase='error';return false}
 N.phase='preparing';status('V145 · PRIPREMAM ZASEBAN MP SERVER...');
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
 }catch(err){N.phase='error';status('V145 SERVER NIJE SPREMAN: '+String(err?.message||err).slice(0,70));return false}
}
function acceptOffer(d){
 const b=B(),net=b.NET;if(net?.role!=='guest'||net.phase!=='lobby'||d?.protocol!==140||
 !/^[a-f0-9]{24}$/.test(d.match)||d.id!==net.localId||typeof d.ticket!=='string')return false;
 if(N.phase!=='idle')return N.match===d.match;
 return connect(d.match,d.id,d.ticket);
}
// V145: movement phase is frozen when idle; a light breathing bob remains.
// This avoids the old permanently-walking character pose in the test arena.
function updateHeroMotion(p,dt){
 if(!p.motion)p.motion={lastX:p.x,lastY:p.y,phase:0,side:1,angle:0,walking:false};
 const m=p.motion,dx=p.x-m.lastX,dy=p.y-m.lastY,speed=Math.hypot(dx,dy);
 m.walking=speed>.22;
 if(m.walking){
  m.phase+=Math.min(dt,.05)*8.5;
  if(Math.abs(dx)>.12)m.side=dx<0?-1:1;
  m.angle=Math.atan2(dy,dx);
  p.facingAngle=m.angle;
 }
 m.lastX=p.x;m.lastY=p.y;
 return m;
}
function slashHeading(p,m){
 if(Number.isFinite(p.attackAngle))return p.attackAngle;
 const candidates=N.solo?N.soloMobs.filter(q=>q.hp>0):[...N.players.values()].filter(q=>q.id!==p.id&&q.hp>0);
 let angle=Number.isFinite(p.facingAngle)?p.facingAngle:(m?.angle||0),nearest=115;
 for(const q of candidates){
  const d=Math.hypot(q.x-p.x,q.y-p.y);
  if(d<nearest){nearest=d;angle=Math.atan2(q.y-p.y,q.x-p.x)}
 }
 return angle;
}
function drawTargetedSlash(g,p,m){
 if(!Number.isFinite(p.attackTick))return;
 const age=N.tick-p.attackTick;if(age<0||age>11)return;
 const t=clamp(age/11,0,1),alpha=Math.pow(1-t,1.25),a=slashHeading(p,m);
 const from=a-1.03+t*.52,to=from+.34+t*1.35;
 g.save();g.translate(p.x,p.y);g.globalAlpha*=alpha;
 // Oriented crescent and sharp leading edge, never a fixed right-facing ring.
 g.strokeStyle='#f5df9c';g.lineWidth=4.5;g.lineCap='round';
 g.beginPath();g.arc(0,0,53,from,to);g.stroke();
 g.strokeStyle='#fff8db';g.lineWidth=2;
 g.beginPath();g.arc(0,0,58,to-.29,to+.08);g.stroke();
 const sx=Math.cos(to)*56,sy=Math.sin(to)*56;
 g.strokeStyle='#f7c775';g.lineWidth=1.5;
 g.beginPath();g.moveTo(sx-Math.cos(a)*13,sy-Math.sin(a)*13);g.lineTo(sx+Math.cos(a)*7,sy+Math.sin(a)*7);g.stroke();
 g.restore();
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
  if(N.solo){stepSolo(dt,v.attack)}
  else {N.delta.x+=N.me.x-oldX;N.delta.y+=N.me.y-oldY;}
  const away=Math.hypot(N.me.x-N.me.tx,N.me.y-N.me.ty);
  if(!N.solo&&away>105){N.me.x=N.me.tx+(N.me.x-N.me.tx)*105/away;N.me.y=N.me.ty+(N.me.y-N.me.ty)*105/away}
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
 if(N.solo)drawSoloMobs(g,now);
 for(const p of N.players.values()){
  if(!p.online)continue;
  if(p.id!==N.id){const k=clamp(dt*10,0,1);p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k}
  g.save();if(p.hp<=0)g.globalAlpha=.38;
  const motion=updateHeroMotion(p,dt);
  const b=B();if(typeof b.drawVillageHero==='function'){
   if(!motion.walking)g.translate(0,Math.sin(now/900+(p.id==='p1'?0:1))*.85);
   b.drawVillageHero(g,p.x,p.y,{id:p.id,
    look:b.getVillageHeroLook?.(p.id)||b.heroStyle,frame:motion.phase,walking:motion.walking,
    visualSide:motion.side});
  }
  else{g.fillStyle=p.id===N.id?'#b2ddb6':'#d5b591';g.beginPath();g.arc(p.x,p.y,17,0,7);g.fill()}
  g.fillStyle='#17251c';g.fillRect(p.x-23,p.y-65,46,5);g.fillStyle='#a8e2a6';g.fillRect(p.x-22,p.y-64,44*clamp(p.hp/100,0,1),3);
  g.fillStyle='#f0dfb6';g.font='bold 11px sans-serif';g.textAlign='center';g.fillText(p.id===N.id?'TI':p.id,p.x,p.y-72);
  drawTargetedSlash(g,p,motion);
  g.restore();
 }
 g.setTransform(dpr,0,0,dpr,0,0);
 el('ns140Stats').textContent=N.solo?('FPS '+N.fps+' | OFFLINE · HP '+N.me.hp+' | KILOVI '+N.soloKills+' | 0 XP'):
  'FPS '+N.fps+' | '+Math.round(N.ping)+'ms | ACK '+N.ack+'/'+N.seq+
  ' | korekcija '+Math.round(N.correction)+'px | stanje '+Math.round(now-N.lastState)+'ms | CPU '+N.serverMs+'ms';
}
window.NS140_ARENA={startHost,startSolo,acceptOffer,frame,stop,get active(){return N.phase==='running'},
 get busy(){return N.phase!=='idle'},get diagnostics(){return {phase:N.phase,mode:N.solo?'solo':'multiplayer',seq:N.seq,ack:N.ack,correction:N.correction,fps:N.fps,ping:N.ping,serverMs:N.serverMs,soloMobCount:N.soloMobs.filter(m=>m.hp>0).length,soloKills:N.soloKills,soloHp:N.solo?N.me?.hp:null,
 joystickActive:N.stick.ptr!==null,stickX:N.stick.x,stickY:N.stick.y,attackHeld:N.attack,
 playerX:N.me?.x,playerY:N.me?.y,walking:!!N.me?.motion?.walking,
 facing:N.me?.motion?.side||1,attackAngle:N.me?.attackAngle??null}}};
})();
