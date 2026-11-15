/* V140 independent lobby -> authoritative arena test. Zero rewards. */
(()=>{
'use strict';
if(window.NS140_ARENA)return;
const B=()=>window.__NS110_BRIDGE||{},A=()=>window.NS152_AUDIO||null,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Shared V152 crowd formula identical to server navigation and 30Hz movement.
// V150: predictable, allocation-bounded movement for New Zone's PvE mobs.
// Only the server decides positions. Each player destination gets one cached
// navigation field; 48px spatial buckets bound nearby separation work.
function createArenaCrowdSteering(world,move){
 const CELL=32,COLS=Math.ceil(world.w/CELL),ROWS=Math.ceil(world.h/CELL),COUNT=COLS*ROWS,INF=65535;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const walkable=(x,y)=>{
  if(x<world.r||y<world.r||x>world.w-world.r||y>world.h-world.r)return false;
  return world.obstacles.every(o=>{
   const px=clamp(x,o.x,o.x+o.w),py=clamp(y,o.y,o.y+o.h);
   return (x-px)**2+(y-py)**2>=(world.r+3)**2;
  });
 };
 const open=Uint8Array.from({length:COUNT},(_,i)=>
  walkable((i%COLS+.5)*CELL,(Math.floor(i/COLS)+.5)*CELL)?1:0);
 const grid=(x,y)=>clamp(Math.floor(y/CELL),0,ROWS-1)*COLS+clamp(Math.floor(x/CELL),0,COLS-1);
 const flows=new Map();
 function nearestOpen(x,y){
  const col=clamp(Math.floor(x/CELL),0,COLS-1),row=clamp(Math.floor(y/CELL),0,ROWS-1);
  let index=row*COLS+col;if(open[index])return index;
  let cost=Infinity,best=-1;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const nx=col+dx,ny=row+dy;if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;
   index=ny*COLS+nx;if(!open[index])continue;
   const d=dx*dx+dy*dy;if(d<cost){best=index;cost=d}
  }
  return best;
 }
 function field(x,y){
  const goal=nearestOpen(x,y);if(goal<0)return null;
  if(flows.has(goal))return flows.get(goal);
  if(flows.size>=8)flows.clear();
  const distance=new Uint16Array(COUNT);distance.fill(INF);
  const q=new Uint16Array(COUNT);let head=0,tail=0;
  q[tail++]=goal;distance[goal]=0;
  while(head<tail){
   const i=q[head++],cx=i%COLS,cy=Math.floor(i/COLS);
   for(const [dx,dy] of dirs){
    const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;
    const n=ny*COLS+nx;if(!open[n]||distance[n]!==INF)continue;
    if(dx&&dy&&(!open[cy*COLS+nx]||!open[ny*COLS+cx]))continue;
    distance[n]=distance[i]+1;q[tail++]=n;
   }
  }
  flows.set(goal,distance);return distance;
 }
 function clearPath(x1,y1,x2,y2){
  for(const o of world.obstacles){
   const lx=o.x-world.r-2,rx=o.x+o.w+world.r+2;
   const ly=o.y-world.r-2,ry=o.y+o.h+world.r+2;
   const dx=x2-x1,dy=y2-y1;
   let low=0,high=1;
   for(const [p,q] of [[-dx,x1-lx],[dx,rx-x1],[-dy,y1-ly],[dy,ry-y1]]){
    if(Math.abs(p)<1e-9){if(q<0){low=2;break}continue}
    const value=q/p;
    if(p<0)low=Math.max(low,value);else high=Math.min(high,value);
   }
   if(low<=high)return false;
  }
  return true;
 }
 function bucketsFor(mobs){
  const buckets=new Map();
  for(const m of mobs)if(m.hp>0){
   const key=Math.floor(m.x/48)+','+Math.floor(m.y/48);
   if(!buckets.has(key))buckets.set(key,[]);
   buckets.get(key).push(m);
  }
  return buckets;
 }
 function step(mobs,players,tick){
  // Steering only at 15Hz. Physics is advanced in 30Hz fixed steps below.
  // Never teleport a creep by two ticks' worth in a single steering frame.
  const buckets=bucketsFor(mobs),pressure=new Map();
  for(const m of mobs){
   if(m.hp<=0)continue;
   let target=players.get(m.targetId);
   if(!target?.online||target.knocked||target.hp<=0||tick>=(m.retargetAt||0)){
    target=null;let score=Infinity;
    for(const p of players.values()){
     if(!p.online||p.knocked||p.hp<=0)continue;
     const d=Math.hypot(p.x-m.x,p.y-m.y);
     const cost=d+(pressure.get(p.id)||0)*18+(p.id===m.targetId?-24:0)+
      ((m.id*7+Number(p.id.slice(1))*11)%5)*3;
     if(cost<score){score=cost;target=p}
    }
    m.targetId=target?.id||'';
    m.retargetAt=tick+24+(m.id%4)*7; // stagger expensive aggro selection
   }
   if(!target)continue;
   pressure.set(target.id,(pressure.get(target.id)||0)+1);
   const range=Math.hypot(target.x-m.x,target.y-m.y);
   const slotAngle=m.id*2.399963229728653; // stable different flanking approach
   const slot=range<145?28:0;
   const gx=clamp(target.x+Math.cos(slotAngle)*slot,world.r,world.w-world.r);
   const gy=clamp(target.y+Math.sin(slotAngle)*slot,world.r,world.h-world.r);
   let dx=gx-m.x,dy=gy-m.y;
   if(!clearPath(m.x,m.y,gx,gy)){
    const distances=field(target.x,target.y),pos=grid(m.x,m.y);
    if(distances&&distances[pos]<INF){
     const cx=pos%COLS,cy=Math.floor(pos/COLS);
     let best=pos,cost=distances[pos];
     for(const [ox,oy] of dirs){
      const nx=cx+ox,ny=cy+oy;
      if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;
      const n=ny*COLS+nx;if(distances[n]>=cost)continue;
      if(ox&&oy&&(!open[cy*COLS+nx]||!open[ny*COLS+cx]))continue;
      best=n;cost=distances[n];
     }
     if(best!==pos){dx=(best%COLS+.5)*CELL-m.x;dy=(Math.floor(best/COLS)+.5)*CELL-m.y}
    }
   }
   let mag=Math.hypot(dx,dy)||1;dx/=mag;dy/=mag;
   let sx=0,sy=0,neighbours=0;
   const bx=Math.floor(m.x/48),by=Math.floor(m.y/48);
   for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){
    const list=buckets.get((bx+xx)+','+(by+yy));if(!list)continue;
    for(const other of list){
     if(other===m)continue;
     const ox=m.x-other.x,oy=m.y-other.y,d2=ox*ox+oy*oy;
     if(d2>=46*46)continue;
     if(++neighbours>16)break; // hard cap to prevent pathological crowds
     if(d2<.01){sx+=(m.id>other.id?1:-1)*.5;continue}
     const d=Math.sqrt(d2),w=(46-d)/46;sx+=ox/d*w;sy+=oy/d*w;
    }
   }
   const strafe=range<65?.04:Math.sin(tick*.041+m.id*2.73)*.12*(m.id%2?1:-1);
   const oldX=dx,oldY=dy;
   dx=oldX+sx*.92-oldY*strafe;
   dy=oldY+sy*.92+oldX*strafe;
   mag=Math.hypot(dx,dy)||1;dx/=mag;dy/=mag;
   m.vx=(m.vx||0)*.54+dx*.46;m.vy=(m.vy||0)*.54+dy*.46;
   mag=Math.hypot(m.vx,m.vy)||1;
  }
 }
 function advance(mobs,players){
  // Fixed 30Hz movement: no 66ms position jumps, even while retargeting.
  for(const m of mobs){
   if(m.hp<=0||!m.targetId)continue;
   const target=players.get(m.targetId);
   if(!target?.online||target.knocked||target.hp<=0)continue;
   const d=Math.hypot(m.vx||0,m.vy||0);
   if(d<.001)continue;
   const stride=(m.type==='troll'?39:49+(m.id%5)*3.25)/world.speed;
   move(m,m.vx/d*stride,m.vy/d*stride,1/30);
  }
 }
 return {step,advance,field,nearestOpen,walkable,get cachedFields(){return flows.size},clear(){flows.clear()}};
}

// V159: static arena geometry is indexed ONCE. Look up only grid cells
// overlapping the 14px collision circle; retain exact circle/AABB physics.
function createArenaCollisionGrid(world){
 const CELL=96,items=world.obstacles||[],buckets=new Map();
 for(let i=0;i<items.length;i++){
  const o=items[i];if(!o||!Number.isFinite(o.x)||!Number.isFinite(o.y)||
   !Number.isFinite(o.w)||!Number.isFinite(o.h)||o.w<0||o.h<0)continue;
  const lx=Math.floor(o.x/CELL),rx=Math.floor((o.x+o.w)/CELL);
  const ty=Math.floor(o.y/CELL),by=Math.floor((o.y+o.h)/CELL);
  for(let cy=ty;cy<=by;cy++)for(let cx=lx;cx<=rx;cx++){
   const key=cx+','+cy;
   let bucket=buckets.get(key);if(!bucket){bucket=[];buckets.set(key,bucket)}
   bucket.push(i);
  }
 }
 const marks=new Uint32Array(items.length);let serial=0;
 const counts={calls:0,candidates:0};
 function free(x,y,r){
  if(++serial===0xffffffff){marks.fill(0);serial=1}
  const lx=Math.floor((x-r)/CELL),rx=Math.floor((x+r)/CELL);
  const ty=Math.floor((y-r)/CELL),by=Math.floor((y+r)/CELL);
  counts.calls++;
  for(let cy=ty;cy<=by;cy++)for(let cx=lx;cx<=rx;cx++){
   const bucket=buckets.get(cx+','+cy);if(!bucket)continue;
   for(let k=0;k<bucket.length;k++){
    const index=bucket[k];if(marks[index]===serial)continue;
    marks[index]=serial;counts.candidates++;
    const o=items[index];
    if(x+r<o.x||x-r>o.x+o.w||y+r<o.y||y-r>o.y+o.h)continue;
    const nx=Math.max(o.x,Math.min(x,o.x+o.w));
    const ny=Math.max(o.y,Math.min(y,o.y+o.h));
    if((x-nx)**2+(y-ny)**2<r*r)return false;
   }
  }
  return true;
 }
 return {world,count:items.length,free,counts,get cells(){return buckets.size}};
}

const N={phase:'idle',ws:null,match:'',id:'',world:{w:960,h:600,r:14,speed:156,obstacles:[]},
 players:new Map(),looks:new Map(),lastLookSignature:'',lastLookCheck:0,lookSyncEnabled:false,me:null,seq:0,ack:0,pending:[],delta:{x:0,y:0},tick:-1,
 lastInput:0,lastState:0,lastFrame:0,lastPing:0,ping:0,fps:0,fpsAt:0,frames:0,
 correction:0,serverMs:0,keys:new Set(),stick:{x:0,y:0,ptr:null,startX:0,startY:0,radius:47,deadZone:7},timeout:null,ticket:'',retry:0,
 wave:1,waveState:'play',waveAt:0,chests:[],choice:null,serverNow:0,lastMyHp:null,hurtUntil:0,hitMarkers:new Map(),lastStepSound:0,hordeStepAt:0,uiAt:0,choiceUiId:'',paused:false,pausedAt:0,
 soloWave:1,soloState:'play',soloChoice:null,soloBetweenUntil:0,soloChests:[],soloChestSeq:0,
 solo:false,soloCrowd:null,collisionGrid:null,soloMobs:[],presence:new Map(),presenceAt:0,mpMobs:[],mobHistory:[],mobRenderTick:null,visibleMobs:0,hordeTotal:60,soloSpawnCache:null,statsAt:0,soloTick:0,soloAcc:0,soloKills:0,soloSwing:-100,soloInvul:0,errorCode:'',retryTimer:null,lostSince:0};
const el=id=>document.getElementById(id);
function ui(){
 if(el('ns140Root'))return;
 const style=document.createElement('style');
 style.textContent='#ns140Root{position:fixed;inset:0;z-index:100000;background:#142c26;color:#f5e6ba;font-family:system-ui;touch-action:none}'+
 '#ns140Root[hidden]{display:none!important}#ns140Canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}'+
 '#ns140Bar{position:absolute;top:max(9px,env(safe-area-inset-top));left:9px;right:9px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;background:#122922e9;border:1px solid #96b8a2;border-radius:10px;padding:9px;font-size:12px}'+
 '#ns140Stats{font:10px monospace;color:#b8d5c6}#ns140Close{background:#714837;color:white;border:1px solid #e9b69a;padding:7px;border-radius:7px}'+
 '#ns140Retry{background:#446447;color:#fff3d9;border:1px solid #d5bf83;border-radius:7px;padding:7px;font-weight:800}#ns140Retry[hidden]{display:none!important}'+
 '#ns140Pad{position:fixed;left:0;top:0;width:112px;height:112px;display:none;transform:translate(-50%,-50%);pointer-events:none;touch-action:none;z-index:4;border:2px solid #d9eee096;background:radial-gradient(circle,#9bccaa26,#1a413e77);border-radius:50%;box-shadow:inset 0 0 23px #061a2188}'+
 '#ns152Hud{position:absolute;right:12px;top:108px;background:#122b25de;border:1px solid #7d9c84;border-radius:11px;padding:9px 12px;text-align:right;pointer-events:none;min-width:106px}'+
 '#ns152Hud strong{font-size:14px;display:block;color:#fce7a9}#ns152Hud small{display:block;color:#c9dccc;font-size:10px}'+
 '#ns152Choice[hidden]{display:none!important}#ns152Choice{position:absolute;inset:0;background:#071c19b0;display:flex;align-items:center;justify-content:center;padding:18px;pointer-events:auto}'+
 '#ns152ChoiceCard{max-width:360px;width:100%;border:2px solid #ab9068;border-radius:14px;background:#1e352b;box-shadow:0 12px 32px #06100da0;padding:17px;text-align:center}'+
 '#ns152ChoiceCard h3{font-size:17px;margin:6px 0;color:#ffe0a0}#ns152ChoiceCard p{font-size:13px;color:#e5dfce;line-height:1.4}'+
 '#ns152Choices{display:grid;gap:9px;margin:12px 0}#ns152Choices button{padding:11px;border:1px solid #a9ae88;background:#38594b;color:#fff7d9;border-radius:9px;font-weight:800}'+
 '#ns152Choices button[hidden]{display:none}#ns152Timer{font-weight:900;color:#f6dc94;font-size:18px}'+
 '#ns152Hurt{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 50%,transparent 43%,#d5202970 100%);z-index:3}'+
 '#ns152Music,#ns152Sound{padding:5px;background:#304d40;border:1px solid #a4bb9b;color:#fff6d7;border-radius:7px}'+
 '#ns155Presence{position:absolute;left:10px;right:10px;top:clamp(95px,17vh,160px);display:flex;gap:6px;flex-wrap:wrap;z-index:2;pointer-events:none}'+
 '#ns155Presence:empty{display:none}#ns155Presence span{font:600 11px system-ui;color:#e6e8d5;background:#283d38db;border:1px solid #65766a;border-radius:10px;padding:3px 8px}'+
 '#ns155Presence .disconnected{color:#ffcfbd;border-color:#b66d55}'+
 '#ns155Presence .background{color:#dfd9af}'+
 '#ns157Events{position:absolute;top:clamp(140px,22vh,200px);left:10px;max-width:75vw;display:grid;gap:5px;z-index:5;pointer-events:none}'+
 '#ns157Events:empty{display:none}#ns157Events .event{font:600 12px system-ui;color:#ffebbe;background:#132d25e8;border-left:3px solid #94b38b;border-radius:7px;padding:7px 10px;max-width:320px}'+
 '#ns157Pause{padding:5px 9px;background:#395349;color:#fff4d0;border:1px solid #a4bb9b;border-radius:7px;font-weight:800}'+
 '#ns157PauseOverlay[hidden]{display:none!important}#ns157PauseOverlay{position:absolute;inset:0;z-index:14;background:#061710c9;display:flex;align-items:center;justify-content:center;padding:18px}'+
 '#ns157PauseCard{max-width:340px;width:100%;border:1px solid #c7b482;border-radius:14px;padding:18px;background:#1e382e;text-align:center}'+
 '#ns157PauseCard h2{margin:0 0 8px;font:800 22px system-ui;color:#f9e6b0}#ns157PauseCard p{font:13px/1.45 system-ui;color:#d2dfd0}'+
 '#ns157PauseCard button{display:block;width:100%;margin-top:12px;padding:12px;background:#426a56;color:white;border:1px solid #a9bf9d;border-radius:10px;font-weight:800}'+
 '#ns157PauseLeave{background:#6c473c!important}'+
 '#ns158MenuBtn{background:#42634e;border:1px solid #a6c5a2;color:#fff5ce;border-radius:8px;padding:7px 12px;font-weight:900;white-space:nowrap;min-height:36px}'+
 '#ns158Menu[hidden]{display:none!important}#ns158Menu{position:absolute;z-index:13;right:9px;top:calc(max(9px,env(safe-area-inset-top)) + 57px);display:grid;gap:7px;width:min(250px,calc(100vw - 18px));padding:12px;background:#142f28f5;border:1px solid #abc39d;border-radius:13px;box-shadow:0 12px 30px #0009}'+
 '#ns158Menu button{padding:11px;border-radius:9px;border:1px solid #8da993;background:#2b4b3e;color:#fff4ce;text-align:left;font-weight:800;min-height:42px}#ns158Menu .danger{background:#6c453b;border-color:#c88d79}'+
 '#ns158Menu p{font:11px/1.4 system-ui;color:#c3d4ca;margin:2px 0 1px}'+
 '@media(max-width:780px){#ns140Bar{flex-wrap:nowrap;min-height:47px;padding:5px 8px}#ns140Status{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}#ns140Stats{max-width:30vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#ns152Music,#ns152Sound,#ns157Pause,#ns140Close{display:none}}'+
 '#ns140Pad.active{display:block}'+
 '#ns140Knob{position:absolute;left:27px;top:27px;width:54px;height:54px;border:2px solid #c3e2d1b8;background:radial-gradient(circle at 34% 27%,#c1e4cfb5,#547c77bd);border-radius:50%;box-shadow:0 4px 11px #081c1a9a;will-change:transform}'+
 '';
 const root=document.createElement('section');root.id='ns140Root';root.hidden=true;
 root.innerHTML='<canvas id="ns140Canvas"></canvas><div id="ns140Bar"><b id="ns140Status">V158 NOVA ZONA</b><span id="ns140Stats"></span><button type="button" id="ns152Music" title="Muzika">♫</button><button type="button" id="ns152Sound" title="Efekti">🔊</button><button type="button" id="ns157Pause" aria-label="Pauza">⏸</button><button type="button" id="ns140Retry" hidden>↻ POKUŠAJ PONOVO</button><button type="button" id="ns140Close">← LOBBY</button><button type="button" id="ns158MenuBtn" aria-controls="ns158Menu" aria-expanded="false">☰ MENI</button></div>'+
 '<div id="ns158Menu" hidden role="group" aria-label="Meni tokom igre"><button id="ns158MenuPause" type="button">⏸ PAUZIRAJ</button><button id="ns158MenuMusic" type="button">♫ MUZIKA</button><button id="ns158MenuSound" type="button">🔊 EFEKTI</button><button id="ns158MenuLeave" class="danger" type="button">← NAPUSTI PARTIJU</button><p>U multiplayeru pauza važi samo za tebe — ostali nastavljaju.</p></div>'+
 '<div id="ns155Presence" aria-live="polite"></div><div id="ns157Events" aria-live="polite"></div><div id="ns152Hud"><strong id="ns152Wave">TALAS 1</strong><small id="ns152Remaining">GOBLINI</small></div>'+
 '<div id="ns152Hurt" aria-hidden="true"></div>'+
 '<div id="ns157PauseOverlay" hidden><div id="ns157PauseCard"><h2>⏸ PAUZA</h2><p id="ns157PauseText">Solo je zaustavljen. Pritisni NASTAVI kada želiš.</p><button type="button" id="ns157Resume">▶ NASTAVI</button><button type="button" id="ns157PauseLeave">← NAPUSTI PARTIJU</button></div></div>'+
 '<div id="ns140Pad" aria-hidden="true"><span id="ns140Knob"></span></div>'+
 '<div id="ns152Choice" hidden><div id="ns152ChoiceCard"><h3 id="ns152ChoiceTitle">OTVOREN SANDUK</h3><p id="ns152ChoiceText"></p><div id="ns152Choices"><button data-pick="edge">⚔ OŠTRIJA OŠTRICA · +20% ŠTETE</button><button data-pick="heart">♥ ČUVAROVO SRCE · +25 HP</button><button data-pick="boots">➤ BRŽE ČIZME · +10% BRZINE</button></div><span id="ns152Timer">7 s</span></div></div>';
 document.body.append(style,root);
 el('ns140Close').onclick=()=>stop(true);
 el('ns157Pause').onclick=()=>toggleArenaPause();
 el('ns157Resume').onclick=()=>toggleArenaPause(false);
 el('ns157PauseLeave').onclick=()=>stop(true);
 const menuButton=el('ns158MenuBtn'),menuPanel=el('ns158Menu');
 menuButton.onclick=()=>{
  menuPanel.hidden=!menuPanel.hidden;menuButton.setAttribute('aria-expanded',String(!menuPanel.hidden));
  el('ns158MenuPause').textContent=N.paused?'▶ NASTAVI':'⏸ PAUZIRAJ';
 };
 el('ns158MenuPause').onclick=()=>{closeArenaMenu();toggleArenaPause()};
 el('ns158MenuLeave').onclick=()=>{closeArenaMenu();stop(true)};
 const musicButton=el('ns152Music'),soundButton=el('ns152Sound');
 function refreshAudioButtons(){
  musicButton.textContent=A()?.music?'♫':'♫̸';
  soundButton.textContent=A()?.sound?'🔊':'🔇';
  musicButton.setAttribute('aria-label',A()?.music?'Isključi muziku':'Uključi muziku');
  soundButton.setAttribute('aria-label',A()?.sound?'Isključi efekte':'Uključi efekte');
  el('ns158MenuMusic').textContent=A()?.music?'♫ ISKLJUČI MUZIKU':'♫ UKLJUČI MUZIKU';
  el('ns158MenuSound').textContent=A()?.sound?'🔊 ISKLJUČI EFEKTE':'🔇 UKLJUČI EFEKTE';
 }
 musicButton.onclick=()=>{A()?.unlock();A()?.set('music',!A()?.music);refreshAudioButtons()};
 soundButton.onclick=()=>{A()?.unlock();A()?.set('sound',!A()?.sound);refreshAudioButtons()};
 el('ns158MenuMusic').onclick=()=>{A()?.unlock();A()?.set('music',!A()?.music);refreshAudioButtons()};
 el('ns158MenuSound').onclick=()=>{A()?.unlock();A()?.set('sound',!A()?.sound);refreshAudioButtons()};
 refreshAudioButtons();
 for(const btn of root.querySelectorAll('[data-pick]')){
  btn.onclick=()=>{
   A()?.unlock();
   const option=btn.dataset.pick;
   if(N.solo){resolveSoloChest(option);return}
   if(N.choice?.owner!==N.id||N.ws?.readyState!==1)return;
   N.ws.send(JSON.stringify({t:'chestPick',option}));
   btn.disabled=true;
  };
 }
 el('ns140Retry').onclick=()=>{
  if(B().NET?.role!=='host'||B().NET?.phase!=='lobby')return;
  stop();B().startLobbyMatch?.(); // retry SAME new arena, never legacy
 };
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
  if(!el('ns158Menu')?.hidden){closeArenaMenu();return}
  if(N.phase!=='running'||N.paused||N.stick.ptr!==null)return;
  if(e.pointerType==='mouse')return; // Desktop steers with WASD; auto-attack never needs clicks.
  e.preventDefault();A()?.unlock();N.stick.ptr=e.pointerId;
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
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
   resetStick();
   if(N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'presence',state:'background'}))}catch{}
   return;
  }
  if(N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'presence',state:'active'}))}catch{}
  if(N.phase==='reconnecting'&&N.match&&N.ticket){
   if(N.retryTimer){clearTimeout(N.retryTimer);N.retryTimer=null}
   if(N.ws?.readyState!==1)connect(N.match,N.id,N.ticket,true);
  }
 });
 window.addEventListener('keydown',e=>{
  if(N.phase!=='running'||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
  const k=e.key.toLowerCase();
  if(k==='escape'&&!el('ns158Menu')?.hidden){e.preventDefault();closeArenaMenu();return}
  if((k==='escape'||k==='p')&&!e.repeat){e.preventDefault();e.stopImmediatePropagation?.();toggleArenaPause();return}
  if(N.paused)return;
  A()?.unlock();N.keys.add(k);if(k.startsWith('arrow'))e.preventDefault();
 });
 window.addEventListener('keyup',e=>N.keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{N.keys.clear();resetStick()});
}
function closeArenaMenu(){
 if(el('ns158Menu'))el('ns158Menu').hidden=true;
 el('ns158MenuBtn')?.setAttribute('aria-expanded','false');
}
function announceArena(message){
 const container=el('ns157Events');if(!container||!message)return;
 const chip=document.createElement('span');chip.className='event';
 chip.textContent=String(message).slice(0,110);container.append(chip);
 while(container.children.length>2)container.firstElementChild?.remove();
 setTimeout(()=>chip.remove(),3600);
}
function toggleArenaPause(force){
 if(N.phase!=='running')return false;
 const paused=typeof force==='boolean'?force:!N.paused;
 if(N.paused===paused)return paused;
 if(N.solo&&N.paused&&!paused){
  const spent=Date.now()-(N.pausedAt||Date.now());
  if(N.soloChoice)N.soloChoice.until+=spent;
  if(N.soloState==='between')N.soloBetweenUntil+=spent;
 }
 // Keep isolated pause tests independent of menu-UI helpers.
 if(el('ns158Menu'))el('ns158Menu').hidden=true;
 el('ns158MenuBtn')?.setAttribute?.('aria-expanded','false');
 N.paused=paused;N.pausedAt=paused?Date.now():0;N.delta={x:0,y:0};N.pending.length=0;
 N.keys.clear();N.stick.x=N.stick.y=0;N.stick.ptr=null;
 el('ns140Pad')?.classList.remove('active');
 if(el('ns140Knob'))el('ns140Knob').style.transform='translate(0px,0px)';
 if(el('ns157PauseOverlay'))el('ns157PauseOverlay').hidden=!paused;
 if(el('ns157Pause'))el('ns157Pause').textContent=paused?'▶':'⏸';
 if(el('ns157PauseText'))el('ns157PauseText').textContent=N.solo?
  'Solo je zaustavljen. Talas i vreme se nastavljaju tek kada pritisneš NASTAVI.':
  'Pauza važi samo za tebe. Ostali nastavljaju, a tvoj stražar ostaje na mapi i može da primi štetu.';
 if(!N.solo&&N.ws?.readyState===1)N.ws.send(JSON.stringify({t:'pause',paused}));
 return paused;
}
function renderPresence(){
 const root=el('ns155Presence');if(!root)return;
 root.replaceChildren();
 if(N.solo)return;
 for(const [id,state] of N.presence){
  if(id===N.id||state==='online')continue;
  const look=N.looks.get(id)?.look;
  const name=String(look?.name||id.toUpperCase()).slice(0,17);
  const label=state==='paused'?'PAUZA':state==='disconnected'?'DISCONNECTED':state==='background'?'U POZADINI':
   state==='reconnecting'?'VRAĆA SE':'ČEKA';
  const chip=document.createElement('span');chip.className=state;
  chip.textContent=name+' · '+label;root.append(chip);
 }
}
function status(note){
 ui();el('ns140Root').hidden=false;el('ns140Status').textContent=note;
 el('ns140Retry').hidden=!(N.phase==='error'&&B().NET?.role==='host'&&B().NET?.phase==='lobby');
}
function stop(notify=false){
 const wasSolo=N.solo;
 if(notify&&N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'leave'}))}catch{}
 if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
 const ws=N.ws;N.ws=null;if(ws){ws.onopen=ws.onmessage=ws.onclose=ws.onerror=null;try{ws.close()}catch{}}
 if(N.retryTimer)clearTimeout(N.retryTimer);N.retryTimer=null;N.lostSince=0;
 A()?.stop();closeArenaMenu();N.paused=false;N.pausedAt=0;if(el('ns157PauseOverlay'))el('ns157PauseOverlay').hidden=true;
 if(el('ns157Events'))el('ns157Events').replaceChildren();
 N.choice=null;N.soloChoice=null;N.hurtUntil=0;N.hitMarkers.clear();N.chests=[];N.soloChests=[];
 N.phase='idle';N.solo=false;N.soloCrowd=null;N.collisionGrid=null;N.soloMobs=[];N.mpMobs=[];N.mobHistory=[];N.mobRenderTick=null;N.ticket='';N.retry=0;N.players.clear();N.looks.clear();N.presence.clear();N.lastLookSignature='';N.lastLookCheck=0;N.lookSyncEnabled=false;N.me=null;N.pending.length=0;N.keys.clear();N.stick.x=N.stick.y=0;N.stick.ptr=null;
 if(el('ns140Pad')){el('ns140Pad').classList.remove('active');el('ns140Knob').style.transform='translate(0px,0px)'};
 if(el('ns140Root'))el('ns140Root').hidden=true;
 if(wasSolo)try{window.__nightWatch?.showPreRun?.()}catch{}
 else if(B().NET?.phase==='lobby')try{B().renderLobby?.()}catch{}
 return true;
}
// V153: cosmetics are rare reliable metadata, not frame-by-frame movement packets.
function localArenaLook(){
 const game=window.__nightWatch;
 return game?.networkHeroStyle?.(game.heroStyle) || B().getVillageHeroLook?.(B().NET?.localId) || B().heroStyle || {};
}
function rememberLook(id,revision,look){
 if(!/^p[1-6]$/.test(id)||!look||typeof look!=='object'||Array.isArray(look)||
  !Number.isSafeInteger(revision)||revision<0)return false;
 const old=N.looks.get(id);if(old&&revision<old.revision)return false;
 N.looks.set(id,{revision,look});return true;
}
function input(){
 const k=N.keys;let x=N.stick.x+(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0);
 let y=N.stick.y+(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0);
 const d=Math.hypot(x,y);if(d>1){x/=d;y/=d}
 return {x,y};
}
function moveLocal(p,dx,dy){
 const w=N.world,r=w.r||14,grid=N.collisionGrid;
 const free=(x,y)=>grid?.world===w&&grid.count===(w.obstacles||[]).length?
  grid.free(x,y,r):(w.obstacles||[]).every(o=>{
  if(x+r<o.x||x-r>o.x+o.w||y+r<o.y||y-r>o.y+o.h)return true;
  const qx=clamp(x,o.x,o.x+o.w),qy=clamp(y,o.y,o.y+o.h);
  return (x-qx)**2+(y-qy)**2>=r*r;
 });
 const x=clamp(p.x+dx,r,w.w-r);if(free(x,p.y))p.x=x;
 const y=clamp(p.y+dy,r,w.h-r);if(free(p.x,y))p.y=y;
}
function snapshot(m){
 if(!Number.isInteger(m.tick)||m.tick<=N.tick||!Array.isArray(m.players))return;
 N.tick=m.tick;N.lastState=performance.now();N.serverMs=Number(m.ms)||0;
 if(Number.isFinite(m.serverNow))N.serverNow=m.serverNow;
 const priorWave=N.wave,priorChoice=N.choice?.seq;
 const weaponHits=new Map();
 for(const row of m.players){
  if(Array.isArray(row)&&/^p[1-6]$/.test(row[0])&&Number.isInteger(row[8])&&row[8]>=0)
   weaponHits.set(row[8],row[0]===N.id?localArenaLook().weapon:
    N.looks.get(row[0])?.look?.weapon||'sword');
 }
 if(Number.isInteger(m.wave)&&m.wave>0&&m.wave<1000)N.wave=m.wave;
 if(m.waveState==='play'||m.waveState==='between')N.waveState=m.waveState;
 if(Number.isFinite(m.waveAt))N.waveAt=m.waveAt;
 N.choice=m.choice&&Number.isInteger(m.choice.seq)&&typeof m.choice.owner==='string'?
  {id:m.choice.id,owner:m.choice.owner,options:['edge','heart','boots'],seq:m.choice.seq,until:m.choice.until}:null;
 if(Array.isArray(m.chests))N.chests=m.chests.slice(0,16)
  .filter(c=>Array.isArray(c)&&Number.isInteger(c[0])&&Number.isFinite(c[1])&&Number.isFinite(c[2]))
  .map(c=>({id:c[0],x:c[1],y:c[2],opened:!!c[3]}));
 if(N.wave>priorWave)A()?.play('wave');
 if(N.choice&&N.choice.seq!==priorChoice){A()?.play('chest');N.choiceUiId=''}
 if(!N.choice&&priorChoice!==undefined)A()?.play('choose');
 if(Number.isInteger(m.totalMobs)&&m.totalMobs>=12&&m.totalMobs<=80)N.hordeTotal=m.totalMobs;
 if(Array.isArray(m.mobs)){
  const previous=new Map(N.mpMobs.map(q=>[q.id,q]));
  N.mpMobs=m.mobs.filter(q=>Array.isArray(q)&&Number.isInteger(q[0])&&q[0]>=0&&q[0]<96&&
   Number.isFinite(q[1])&&Number.isFinite(q[2])&&Number.isFinite(q[3])).map(q=>{
   const prev=previous.get(q[0]),x=q[1]/10,y=q[2]/10,attackTick=Number(q[5])||-100;
   if(prev&&attackTick>0&&attackTick!==prev.attackTick)
    A()?.play('enemy',{sourceId:q[0],x,y,listenerX:N.me?.x??x,listenerY:N.me?.y??y,gain:.4});
   const hitTick=Number(q[4])||0;
   if(prev&&hitTick>0&&hitTick!==prev.hitTick)
    A()?.play('hit',{weapon:weaponHits.get(q[0])||'sword',variant:hitTick,x,y,listenerX:N.me?.x??x,listenerY:N.me?.y??y,gain:.48});
   const mob=prev||{id:q[0],x,y,animDistance:0,animX:x,animY:y,facing:1,movingUntil:0};
   mob.tx=x;mob.ty=y;mob.hp=q[3];mob.maxHp=Number(q[6])||35;
   mob.hitTick=Number(q[4])||0;mob.attackTick=attackTick;
   mob.type=q[7]===1?'troll':'goblin'; // trailing server type flag; backwards compatible
   return mob;
  });
  // Fixed-size position history: up to 80 goblins, six small network snapshots.
  // Render two network frames behind to hide 15Hz arrivals and mild jitter.
  N.mobHistory.push({tick:m.tick,positions:new Map(N.mpMobs.map(q=>[q.id,[q.tx,q.ty]]))});
  if(N.mobHistory.length>6)N.mobHistory.shift();
 }
 for(const row of m.players){
  if(!Array.isArray(row)||!/^p[1-6]$/.test(row[0]))continue;
  const [id,xx,yy,hp,attackTick,online,knocked,attackDir,attackTarget]=row;
  if(!Number.isFinite(xx)||!Number.isFinite(yy))continue;
  const x=xx/10,y=yy/10;let p=N.players.get(id);
  if(!p){p={id,x,y,tx:x,ty:y};N.players.set(id,p)}
  const previousAttack=p.attackTick;
  p.tx=x;p.ty=y;p.hp=hp;p.maxHp=Number(row[9])||100;p.kills=Number(row[10])||0;
  p.attackTick=attackTick;p.online=!!online;p.knocked=!!knocked;
  if(Number.isInteger(attackTick)&&attackTick>0&&previousAttack!==undefined&&previousAttack!==attackTick){
   const myPosition=N.me||N.players.get(N.id)||p;
   A()?.play('swing',{weapon:id===N.id?localArenaLook().weapon:N.looks.get(id)?.look?.weapon||B().getVillageHeroLook?.(id)?.weapon||'sword',variant:attackTick,
    x,y,listenerX:myPosition.x,listenerY:myPosition.y,sourceId:id,gain:id===N.id?1:.36});
  }
  if(id===N.id){
   if(N.lastMyHp!==null&&hp<N.lastMyHp){
    N.hurtUntil=performance.now()+290;
    A()?.play('hurt',{gain:1});
   }
   N.lastMyHp=hp;
  }
  // Quantized angle and attack start tick come ONLY from the server.
  // No independent "nearest enemy" target choices per phone.
  if(Number.isInteger(attackDir)&&attackDir>=0&&attackDir<=255){
   p.attackAngle=attackDir/255*2*Math.PI-Math.PI;
   p.attackTarget=Number.isInteger(attackTarget)?attackTarget:-1;
  }
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
// V154 solo stress-preview uses the SAME seed, safe grid and 60-80 creeps as server.
// V157 mirror the server's safe spawn grid and distance ranking.
function soloHordePoints(){
 if(N.soloSpawnCache)return N.soloSpawnCache;
 const points=[],inside=(x,y,r)=>N.world.obstacles.some(o=>{
  const px=clamp(x,o.x,o.x+o.w),py=clamp(y,o.y,o.y+o.h);
  return (x-px)**2+(y-py)**2<r*r;
 });
 for(let row=0;row<11;row++)for(let col=0;col<15;col++){
  const x=64+col*108,y=46+row*97;
  if(inside(x,y,33)||(x<355&&y>145&&y<420)||
   [[530,465],[960,580],[1470,820]].some(([cx,cy])=>(cx-x)**2+(cy-y)**2<70**2))continue;
  points.push([x,y]);
 }
 let seed=1572026;
 for(let i=points.length-1;i>0;i--){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1);[points[i],points[j]]=[points[j],points[i]];
 }
 return N.soloSpawnCache=points;
}
function buildSoloWave(wave){
 const points=soloHordePoints(),count=Math.min(80,60+Math.max(0,wave-1)*10,points.length);
 const alive=[...N.players.values()].filter(p=>p.hp>0&&!p.knocked);
 const shift=Math.max(1,wave)*17%points.length;
 const ranked=points.map((pt,i)=>({
  pt,i,dist:alive.length?Math.min(...alive.map(p=>Math.hypot(pt[0]-p.x,pt[1]-p.y))):9999
 }));
 ranked.sort((a,b)=>b.dist-a.dist||((a.i+shift)%points.length)-((b.i+shift)%points.length));
 return ranked.slice(0,count).map(({pt,dist},i)=>{
  const troll=wave===10&&i===0;
  const hp=troll?335:Math.min(115,35+(wave-1)*9);
  return {id:i,type:troll?'troll':'goblin',x:pt[0],y:pt[1],sx:pt[0],sy:pt[1],hp,maxHp:hp,
   spawnDistance:Math.round(dist),attackAt:(i%4)*7,attackTick:-100,deadUntil:0,
   hitTick:-100,vx:0,vy:0,targetId:'',retargetAt:0,
   animDistance:0,animX:pt[0],animY:pt[1],facing:1,movingUntil:0};
 });
}

function soloWaveDone(){
 N.soloState='between';const me=N.me;
 const chest={id:100+N.soloWave,x:clamp(me.x+62,35,N.world.w-35),
  y:clamp(me.y+62,35,N.world.h-35),opened:true};
 N.soloChests.push(chest);
 if(N.soloChests.length>12)N.soloChests=N.soloChests.slice(-12);
 N.soloChoice={id:chest.id,seq:++N.soloChestSeq,owner:'p1',until:Date.now()+7000};
 N.choiceUiId='';A()?.play('chest');
}

function startSolo(){
 if(B().currentProfileLevel?.()<7||B().NET?.role||!['idle','error'].includes(N.phase))return false;
 if(N.ws){try{N.ws.close()}catch{}N.ws=null}
 N.solo=true;N.phase='running';N.paused=false;N.id='p1';N.match='offline';N.ticket='';
 N.world={w:1680,h:1080,r:14,speed:156,decorSeed:157,obstacles:[
  {x:275,y:140,w:95,h:92},{x:585,y:330,w:102,h:94},
  {x:435,y:245,w:75,h:84},{x:165,y:350,w:87,h:58},
  {x:790,y:170,w:126,h:104},{x:1120,y:275,w:106,h:110},
  {x:1230,y:650,w:140,h:110},{x:720,y:730,w:116,h:100},
  {x:1005,y:875,w:120,h:90},{x:395,y:785,w:100,h:105},
  {x:1460,y:410,w:110,h:104},{x:1020,y:485,w:94,h:94}
 ]};
 // Solo uses precisely the same seeded trunks/rocks as the multiplayer server.
 N.world.obstacles.push(...(window.NS157_SCENERY?.colliders?.(N.world)||[]));
 N.collisionGrid=createArenaCollisionGrid(N.world);
 N.seq=N.ack=N.soloTick=N.soloKills=0;N.tick=-1;
 N.soloAcc=0;N.soloSwing=-100;N.soloInvul=0;N.mobHistory=[];N.mobRenderTick=null;N.soloSpawnCache=null;N.hordeTotal=60;
 N.soloWave=1;N.soloState='play';N.soloChoice=null;N.soloChestSeq=0;N.soloBetweenUntil=0;
 N.soloChests=[{id:1,x:530,y:465,opened:false},{id:2,x:960,y:580,opened:false},{id:3,x:1470,y:820,opened:false}];
 N.choiceUiId='';N.hurtUntil=0;N.lastMyHp=null;A()?.unlock();
 N.soloCrowd=createArenaCrowdSteering(N.world,(p,x,y,dt)=>moveLocal(p,x*N.world.speed*dt,y*N.world.speed*dt));
 N.lastFrame=N.lastState=N.lastPing=N.lastInput=0;N.fpsAt=0;N.frames=0;
 N.delta={x:0,y:0};N.pending=[];N.players.clear();N.looks.clear();N.presence.clear();N.lastLookSignature='';N.lastLookCheck=0;N.lookSyncEnabled=false;N.stick.ptr=null;N.stick.x=N.stick.y=0;
 if(el('ns140Pad'))el('ns140Pad').classList.remove('active');
 N.me={id:'p1',x:130,y:250,tx:130,ty:250,hp:100,maxHp:100,damage:22,speedMult:1,kills:0,attackTick:-100,online:true,knocked:false};
 N.players.set('p1',N.me);rememberLook('p1',0,localArenaLook());
 N.soloMobs=buildSoloWave(1);
 // Only on this experimental branch: immediate solo artwork/physics test.
 if(new URLSearchParams(location.search).has('v159-troll-preview')&&N.soloMobs[0]){
  N.soloMobs[0].type='troll';N.soloMobs[0].hp=N.soloMobs[0].maxHp=335;
 }
 window.NS154_GOBLINS?.prewarm();window.NS159_TROLL?.prewarm();window.NS157_SCENERY?.prewarm();
 status('V158 · SOLO · TALASI I SANDUCI · 0 XP');
 return true;
}
function stepSolo(dt){
 if(!N.solo||!N.me)return;
 N.soloAcc=Math.min(.15,N.soloAcc+dt);
 let iterations=0;
 while(N.soloAcc>=1/30&&iterations++<5){
  N.soloAcc-=1/30;N.soloTick++;N.tick=N.soloTick;
  const me=N.me;
  if(me.hp<=0){N.phase='solo_ended';status('STRAŽAR JE PAO · SOLO TEST ZAVRŠEN');break}
  if(N.soloChoice){
   if(Date.now()>=N.soloChoice.until)resolveSoloChest('edge');
   continue;
  }
  if(N.soloState==='between'){
   if(Date.now()>=N.soloBetweenUntil){
    N.soloWave++;N.soloMobs=buildSoloWave(N.soloWave);
    N.soloState='play';N.soloCrowd.clear();A()?.play('wave');
   }
   continue;
  }
  // Fixed physics 30Hz, steering only at 15Hz, interpolation at display FPS.
  for(const mob of N.soloMobs){mob.prevX=mob.x;mob.prevY=mob.y}
  if(N.soloTick%2===0)N.soloCrowd.step(N.soloMobs,N.players,N.soloTick);
  N.soloCrowd.advance(N.soloMobs,N.players);
  for(const mob of N.soloMobs){
   if(mob.hp<=0)continue; // no individual respawns during a wave
   const d2=(me.x-mob.x)**2+(me.y-mob.y)**2;
   if(d2<=(mob.type==='troll'?45:34)**2&&N.soloTick>mob.attackAt&&N.soloTick>N.soloInvul){
    me.hp=Math.max(0,me.hp-(mob.type==='troll'?13:7));N.hurtUntil=performance.now()+290;
    A()?.play('hurt');
    mob.attackTick=N.soloTick;mob.attackAt=N.soloTick+(mob.type==='troll'?58:39+(mob.id%5)*4);
    N.soloInvul=N.soloTick+28;
   }
  }
  // Auto-attack the nearest living enemy only when in 83px weapon range.
  if(N.soloTick-N.soloSwing>=19){
   let target=null,distSq=83**2;
   for(const mob of N.soloMobs){
    if(mob.hp<=0)continue;
    const dx=mob.x-me.x,dy=mob.y-me.y,d=dx*dx+dy*dy;
    if(d<distSq){target=mob;distSq=d}
   }
   if(target){
    N.soloSwing=N.soloTick;me.attackTick=N.soloTick;
    me.attackAngle=Math.atan2(target.y-me.y,target.x-me.x);
    me.facingAngle=me.attackAngle;
    target.hitTick=N.soloTick;
    target.hp=Math.max(0,target.hp-(me.damage||22));
    A()?.play('swing',{weapon:localArenaLook().weapon||'sword'});
    A()?.play('hit',{weapon:localArenaLook().weapon||'sword',variant:N.soloTick,gain:.42,x:target.x,y:target.y,listenerX:me.x,listenerY:me.y});
    if(target.hp===0){target.deadUntil=N.soloTick+105;N.soloKills++;me.kills++}
   }
  }
  // As in the regular game, chest proximity opens a timed reward choice.
  if(!N.soloChoice){
   const chest=N.soloChests.find(c=>!c.opened&&(c.x-me.x)**2+(c.y-me.y)**2<=64**2);
   if(chest){
    chest.opened=true;N.soloChoice={id:chest.id,seq:++N.soloChestSeq,owner:'p1',until:Date.now()+7000};
    N.choiceUiId='';A()?.play('chest');
   }
  }
  if(N.soloState==='play'&&N.soloMobs.every(m=>m.hp<=0))soloWaveDone();
 }
}
// V151: interpolate authoritative positions on a stable tick timeline,
// not exponential easing toward each 15Hz packet (which caused visible jolts).
function sampleOnlineMobs(now,dt){
 const history=N.mobHistory;
 if(!history.length)return;
 const latest=history[history.length-1];
 const elapsed=clamp((now-N.lastState)/33.333,0,5);
 const desired=latest.tick-3+elapsed;
 if(N.mobRenderTick===null||Math.abs(N.mobRenderTick-desired)>10){
  N.mobRenderTick=desired;
 }else{
  N.mobRenderTick+=Math.min(dt,.05)*30;
  N.mobRenderTick+=clamp(desired-N.mobRenderTick,-.5,.5)*Math.min(1,dt*6);
 }
 N.mobRenderTick=clamp(N.mobRenderTick,history[0].tick,latest.tick);
 let before=history[0],after=latest;
 for(let i=1;i<history.length;i++){
  if(history[i].tick>=N.mobRenderTick){after=history[i];before=history[i-1];break}
 }
 const fraction=after.tick===before.tick?1:clamp((N.mobRenderTick-before.tick)/(after.tick-before.tick),0,1);
 for(const mob of N.mpMobs){
  const old=before.positions.get(mob.id),next=after.positions.get(mob.id);
  if(!next)continue;
  if(!old||(next[0]-old[0])**2+(next[1]-old[1])**2>90**2){
   mob.x=next[0];mob.y=next[1];continue;
  }
  mob.x=old[0]+(next[0]-old[0])*fraction;
  mob.y=old[1]+(next[1]-old[1])*fraction;
 }
}
function drawArenaMobs(g,now,dt,visible){
 const mobs=N.solo?N.soloMobs:N.mpMobs,tick=N.solo?N.soloTick:N.tick;
 if(!N.solo)sampleOnlineMobs(now,dt);
 // V154: cached sprite sheet + viewport culling; fallback retains old graphics in isolated QA.
 if(window.NS154_GOBLINS){
  N.visibleMobs=window.NS154_GOBLINS.draw(g,mobs,{solo:N.solo,tick,now,
   lastState:N.lastState,alpha:N.solo?clamp(N.soloAcc*30,0,1):1,visible});
  return;
 }
 const alpha=N.solo?clamp(N.soloAcc*30,0,1):1;
 for(const mob of mobs){
  if(mob.hp<=0)continue;
  const drawX=N.solo?(mob.prevX??mob.x)+(mob.x-(mob.prevX??mob.x))*alpha:mob.x;
  const drawY=N.solo?(mob.prevY??mob.y)+(mob.y-(mob.prevY??mob.y))*alpha:mob.y;
  if(drawX<visible.left-35||drawX>visible.right+35||drawY<visible.top-40||drawY>visible.bottom+30)continue;
  const pulse=Math.sin(now/250+mob.id)*1.4;
  const attackAge=(N.tick-mob.attackTick)+(N.solo?0:clamp((now-N.lastState)/33.333,0,2));
  const lunge=attackAge>=0&&attackAge<10?Math.sin(attackAge/10*Math.PI)*2.5:0;
  g.save();g.translate(drawX,drawY+pulse-lunge);
  g.fillStyle=tick-(mob.hitTick||-100)>0&&tick-(mob.hitTick||-100)<6?'#506b39':'#2c3e29';g.beginPath();g.ellipse(0,6,17,13,0,0,Math.PI*2);g.fill();
  g.fillStyle='#6a8954';g.beginPath();g.moveTo(-13,0);g.lineTo(-15,-13);g.lineTo(-6,-8);
  g.quadraticCurveTo(0,-22,8,-8);g.lineTo(15,-14);g.lineTo(12,0);
  g.quadraticCurveTo(0,14,-13,0);g.fill();
  g.fillStyle='#efc269';g.fillRect(-7,-6,4,3);g.fillRect(5,-6,4,3);
  g.fillStyle='#473a2a';g.fillRect(-16,-29,32,4);
  g.fillStyle='#a6d49a';g.fillRect(-15,-28,30*(mob.hp/35),2);
  g.restore();
 }
}

// V152: tiny, cached canvas houses. Same collision rectangles as the
// original plain blocks; artwork is pre-rendered once, not rebuilt at 60 FPS.
const cottageCache=new Map();
function cottageSprite(o,index){
 const key=index+':'+o.w+':'+o.h;
 if(cottageCache.has(key))return cottageCache.get(key);
 const canvas=document.createElement('canvas'),w=o.w,h=o.h;
 canvas.width=Math.ceil(w+26);canvas.height=Math.ceil(h+32);
 const g=canvas.getContext('2d');if(!g)return null;
 g.translate(13,16);
 // Shadows and stone foundations.
 g.fillStyle='#0b1913a0';g.fillRect(-7,9,w+17,h+11);
 g.fillStyle='#a58e71';g.fillRect(0,0,w,h);
 g.fillStyle='#6e5c49';g.fillRect(2,3,w-4,h-6);
 g.fillStyle='#b8a182';g.fillRect(2,h-12,w-4,10);
 for(let x=7;x<w-6;x+=18){g.fillStyle=x%3?'#d0b998':'#887761';g.fillRect(x,h-10,12,2);}
 // A heavy timber door and two tiny windows along the visible wall.
 const doorX=Math.round(w*.56)-9;
 g.fillStyle='#34271e';g.fillRect(doorX,h-15,18,15);
 g.fillStyle='#805a3a';g.fillRect(doorX+2,h-13,14,13);
 g.strokeStyle='#442e22';g.lineWidth=2;g.beginPath();g.moveTo(doorX+9,h-13);g.lineTo(doorX+9,h);g.stroke();
 g.fillStyle='#dbb56e';g.fillRect(doorX+12,h-7,2,2);
 for(const px of [Math.round(w*.15),Math.round(w*.80)]){
  g.fillStyle='#422e25';g.fillRect(px-5,h-15,10,8);
  g.fillStyle='#9eb8ac';g.fillRect(px-3,h-13,6,4);
  g.fillStyle='#d3bc90';g.fillRect(px-1,h-14,2,6);
 }
 // Pitched tiled roof, two distinct slopes and a ridge.
 const roof=index%3===1?['#73513f','#956b4b']:index%3===2?['#64604f','#837a61']:['#70483c','#935a40'];
 g.fillStyle=roof[0];g.beginPath();g.moveTo(-5,-5);g.lineTo(w/2,4);g.lineTo(w/2,h-16);g.lineTo(-5,h-8);g.closePath();g.fill();
 g.fillStyle=roof[1];g.beginPath();g.moveTo(w/2,4);g.lineTo(w+5,-5);g.lineTo(w+5,h-8);g.lineTo(w/2,h-16);g.closePath();g.fill();
 g.strokeStyle='#d0ad7b';g.lineWidth=3;g.beginPath();g.moveTo(w/2,4);g.lineTo(w/2,h-16);g.stroke();
 g.strokeStyle='#b28f68';g.lineWidth=2;g.beginPath();g.moveTo(-5,-5);g.lineTo(w/2,4);g.lineTo(w+5,-5);g.moveTo(-5,h-8);g.lineTo(w/2,h-16);g.lineTo(w+5,h-8);g.stroke();
 // Rows of hand-cut roof tiles and wooden braces.
 g.strokeStyle='#33261f70';g.lineWidth=1;
 for(let y=13;y<h-17;y+=11){
  g.beginPath();g.moveTo(-2,y-6);g.lineTo(w/2-3,y+1);g.moveTo(w/2+3,y+1);g.lineTo(w+2,y-6);g.stroke();
 }
 for(let x=10;x<w-7;x+=17){
  g.beginPath();g.moveTo(x,6);g.lineTo(x+6,h-21);g.stroke();
 }
 // Stone chimney (solid roof ornament).
 const cx=index%2===0?w*.70:w*.23;
 g.fillStyle='#3b372e';g.fillRect(cx-7,9,15,15);
 g.fillStyle='#c8b596';g.fillRect(cx-9,7,18,5);
 g.fillStyle='#272b24';g.fillRect(cx-5,8,10,3);
 // Modest door lamp, rendered onto the wall rather than as a pop-up.
 g.fillStyle='#f8d68b';g.fillRect(doorX+21,h-12,4,4);
 cottageCache.set(key,canvas);return canvas;
}
function drawArenaBuildings(g,obstacles,visible){
 for(let i=0;i<obstacles.length;i++){
  const o=obstacles[i];
  if(o.kind==='tree'||o.kind==='rock')continue;
  if(o.x>visible.right||o.x+o.w<visible.left||o.y>visible.bottom||o.y+o.h<visible.top)continue;
  const sprite=cottageSprite(o,i);
  if(sprite)g.drawImage(sprite,o.x-13,o.y-16);
 }
}

function connect(match,id,ticket,rejoin=false){
 if(rejoin?N.phase!=='reconnecting':N.phase!=='idle')return false;
 if(B().currentProfileLevel?.()<7){N.phase='error';status('NOVA ZONA zahteva OPŠTI NIVO 7');return false}
 if(!rejoin){
  N.seq=N.ack=0;N.tick=-1;N.delta={x:0,y:0};N.pending=[];
  N.players.clear();N.looks.clear();N.presence.clear();N.lastLookSignature='';N.lastLookCheck=0;N.lookSyncEnabled=false;N.mpMobs=[];N.mobHistory=[];N.mobRenderTick=null;N.me=null;N.retry=0;N.lostSince=0;
  N.wave=1;N.waveState='play';N.choice=null;N.choiceUiId='';N.chests=[];N.lastMyHp=null;N.hurtUntil=0;
 }
 N.match=match;N.id=id;N.ticket=ticket;if(!rejoin)N.paused=false;
 N.phase=rejoin?'reconnecting':'connecting';
 status('V158 · '+(rejoin?'VRAĆAM ISTOG IGRAČA':'POVEZIVANJE NA NOVI SERVER')+'...');
 let ws;
 try{ws=new WebSocket('wss://nocna-straza-relay.stefanstevic1996.workers.dev/arena/'+match)}
 catch{N.phase='error';status('Server Nove Zone nije dostupan');return false}
 N.ws=ws;
 if(N.timeout)clearTimeout(N.timeout);
 N.timeout=setTimeout(()=>{
  if(N.ws!==ws||!['connecting','reconnecting'].includes(N.phase))return;
  try{ws.close(4000,'handshake timeout')}catch{}
 },18000);
 ws.onopen=()=>{
  if(N.ws!==ws)return;
  // Legacy V152 rejects >500-byte hello packets. Negotiate before sending looks.
  N.lookSyncEnabled=false;N.lastLookSignature=JSON.stringify(localArenaLook());
  N.lastLookCheck=performance.now();rememberLook(id,0,localArenaLook());
  ws.send(JSON.stringify({t:'hello',id,ticket,protocol:140}));
 };
 ws.onmessage=e=>{
  if(N.ws!==ws)return;let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.t==='welcome'){
   if(m.protocol!==140){N.phase='error';status('Nepodudarne MP verzije');try{ws.close()}catch{}return}
   if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
   N.world=m.world||N.world;N.collisionGrid=createArenaCollisionGrid(N.world);N.phase='waiting';
    window.NS154_GOBLINS?.prewarm();window.NS159_TROLL?.prewarm();window.NS157_SCENERY?.prewarm();
    N.lookSyncEnabled=Number(m.serverBuild)>=153;
    if(Array.isArray(m.looks))for(const item of m.looks){
     if(Array.isArray(item)&&item.length===3)rememberLook(item[0],item[1],item[2]);
    }
    if(N.lookSyncEnabled&&ws.readyState===1){
     const look=localArenaLook();
     N.lastLookSignature=JSON.stringify(look);
     N.lastLookCheck=performance.now();
     // Skin/size metadata is sent once after the server confirms support.
     ws.send(JSON.stringify({t:'look',look}));
    }
   status('V158 · POVEZAN · ČEKAM OSTALE IGRAČE');return;
  }
  if(m.t==='look'){rememberLook(m.id,m.revision,m.look);renderPresence();return}
   if(m.t==='presence'&&Array.isArray(m.players)){
    N.presence.clear();
    for(const row of m.players)if(Array.isArray(row)&&/^p[1-6]$/.test(row[0])&&
       ['online','joining','background','reconnecting','disconnected','paused'].includes(row[1]))
      N.presence.set(row[0],row[1]);
    renderPresence();return;
   }
   if(m.t==='event'&&/^p[1-6]$/.test(m.id)){
    if(m.id!==N.id||m.kind==='returned'){
     const who=String(N.looks.get(m.id)?.look?.name||m.id.toUpperCase()).slice(0,24);
     const words={joined:who+' has joined the game',returned:who+' se vratio u partiju',
      left:who+' has left the game',paused:who+' je na pauzi',resumed:who+' se vratio iz pauze'};
     announceArena(words[m.kind]);
    }
    return;
   }
   if(m.t==='waveStart'){announceArena('TALAS '+m.wave+' — neprijatelji dolaze iz daljine');return}
   if(m.t==='waveEnd'){announceArena('TALAS '+m.wave+' očišćen · pripremi se za novi');return}
   if(m.t==='roster'){
   status('V158 · NOVA ZONA: '+m.ready.length+'/'+m.total+' POVEZANIH');return;
  }
  if(m.t==='start'){
   N.phase='running';N.retry=0;N.lostSince=0;
   if(N.retryTimer)clearTimeout(N.retryTimer);N.retryTimer=null;
   if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
   N.lastFrame=0;
    if(N.paused&&ws.readyState===1)ws.send(JSON.stringify({t:'pause',paused:true}));
    status('V158 · NOVA ZONA · AUTO NAPAD · 0 XP');return;
  }
  if(m.t==='s'){snapshot(m);return}
  if(m.t==='pong'&&Number.isFinite(m.sent))N.ping=Math.max(0,performance.now()-m.sent);
  if(m.t==='end'){
   N.phase='ended';status('TEST ZAVRŠEN: '+String(m.reason||'kraj'));
   setTimeout(()=>{if(N.ws===ws)stop()},1200);
  }
 };
 ws.onclose=e=>{
  if(N.ws!==ws||['idle','ended'].includes(N.phase))return;
  if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
  N.ws=null;
  if(e?.code===1008){N.phase='error';status('NOVA ZONA: nevažeći pristup sobi. Vrati se u lobby.');return}
  if(!N.lostSince)N.lostSince=Date.now();
  if(Date.now()-N.lostSince>=120000){
   N.phase='error';status('V158 · ISKORIŠĆENO 2 MINUTA ZA POVRATAK · LOBBY');return;
  }
  N.retry++;N.phase='reconnecting';
  status('V158 · VRAĆAM ISTOG IGRAČA ('+N.retry+') · NE NAPUŠTAJ SOBU');
  if(N.retryTimer)clearTimeout(N.retryTimer);
  N.retryTimer=setTimeout(()=>{
   N.retryTimer=null;
   if(N.phase==='reconnecting'&&!document.hidden)connect(match,id,ticket,true);
  },Math.min(4000,650+N.retry*380));
 };
 ws.onerror=()=>{
  if(N.ws===ws)status('V158 · MREŽNA GREŠKA · POKUŠAVAM PONOVO');
 };
 return true;
}
async function startHost(){
 const b=B(),net=b.NET,roster=b.currentLobbyRoster?.()||[];
 N.errorCode='';
 if(net?.role!=='host'||net.phase!=='lobby'||N.phase!=='idle')return false;
 if(roster.length<2||roster.length>6||roster.some(p=>Number(p.level)<7)){
  status('SVI IGRAČI MORAJU IMATI OPŠTI NIVO 7');N.phase='error';return false}
 N.phase='preparing';status('V158 · PRIPREMAM ZASEBAN MP SERVER...');
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
 }catch(err){
  N.errorCode=String(err?.message||err);
  // Never redirect players to the legacy MP. Host can retry this room in-place.
  N.phase='error';status('NOVA ZONA NIJE SPREMNA: '+N.errorCode.slice(0,70)+' · POKUŠAJ PONOVO');return false;
 }
}
function acceptOffer(d){
 const b=B(),net=b.NET;if(net?.role!=='guest'||net.phase!=='lobby'||d?.protocol!==140||
 !/^[a-f0-9]{24}$/.test(d.match)||d.id!==net.localId||typeof d.ticket!=='string')return false;
 if(N.phase!=='idle')return N.match===d.match;
 return connect(d.match,d.id,d.ticket);
}
// V152: movement phase is frozen when idle; a light breathing bob remains.
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
 const candidates=(N.solo?N.soloMobs:N.mpMobs).filter(q=>q.hp>0);
 let angle=Number.isFinite(p.facingAngle)?p.facingAngle:(m?.angle||0),nearest=115;
 for(const q of candidates){
  const d=Math.hypot(q.x-p.x,q.y-p.y);
  if(d<nearest){nearest=d;angle=Math.atan2(q.y-p.y,q.x-p.x)}
 }
 return angle;
}
// All clients render the attack pose from the same server attack tick.
function swordAge(p,now){
 if(!Number.isFinite(p.attackTick))return Infinity;
 return N.tick-p.attackTick+(N.solo?0:clamp((now-N.lastState)/33.333,0,2));
}
function drawTargetedSlash(g,p,m,age){
 if(age<0||age>11)return;
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
// Original chest artwork cached once; no sprite downloads or per-frame texture builds.
const chestSprites={};
function drawArenaChests(g,chests,view){
 for(const chest of chests){
  if(view&&(chest.x<view.left-30||chest.x>view.right+30||
    chest.y<view.top-30||chest.y>view.bottom+30))continue;
  const key=chest.opened?'open':'closed';
  let sprite=chestSprites[key];
  if(!sprite){
   sprite=document.createElement('canvas');sprite.width=52;sprite.height=46;
   const c=sprite.getContext('2d');
   if(!c)continue;
   c.fillStyle='#12251f9a';c.beginPath();c.ellipse(26,34,22,7,0,0,Math.PI*2);c.fill();
   c.fillStyle='#78502e';c.fillRect(8,16,36,21);
   c.strokeStyle='#e0be78';c.lineWidth=3;c.strokeRect(8,16,36,21);
   c.fillStyle='#b48246';c.fillRect(10,19,32,3);
   c.fillStyle='#e8d18b';c.fillRect(24,20,5,12);
   if(key==='open'){
    c.save();c.translate(8,16);c.rotate(-.40);c.fillStyle='#4b3028';
    c.fillRect(0,-13,36,13);c.strokeStyle='#e2bc6f';c.strokeRect(0,-13,36,13);c.restore();
   }else{
    c.fillStyle='#5e3627';c.fillRect(7,9,38,12);
    c.strokeStyle='#efcd8a';c.strokeRect(7,9,38,12);
   }
   chestSprites[key]=sprite;
  }
  g.drawImage(sprite,chest.x-26,chest.y-25);
 }
}
function resolveSoloChest(option){
 if(!N.soloChoice||!['edge','heart','boots'].includes(option))return false;
 const me=N.me,pick=option;
 if(pick==='edge')me.damage=Math.min(65,Math.round((me.damage||22)*1.2));
 if(pick==='heart'){me.maxHp=Math.min(240,(me.maxHp||100)+25);me.hp=Math.min(me.maxHp,me.hp+35)}
 if(pick==='boots')me.speedMult=Math.min(1.5,(me.speedMult||1)*1.1);
 N.soloChoice=null;N.choiceUiId='';N.soloBetweenUntil=Date.now()+1750;
 A()?.play('choose');return true;
}
function sessionHud(now){
 const wave=N.solo?N.soloWave:N.wave,state=N.solo?N.soloState:N.waveState;
 const mobs=N.solo?N.soloMobs:N.mpMobs,choice=N.solo?N.soloChoice:N.choice;
 const holder=el('ns152Choice'),hud=el('ns152Wave'),remaining=el('ns152Remaining');
 if(!holder||!hud||!remaining)return;
 if(now-N.uiAt>=140||N.choiceUiId!==(choice?.seq??'')){
  N.uiAt=now;
  hud.textContent='TALAS '+wave;
  const count=mobs.filter(m=>m.hp>0).length;
  remaining.textContent=state==='between'?'ODMOR · NOVI TALAS USKORO':'GOBLINI '+count+'/'+(N.solo?mobs.length:N.hordeTotal);
  const key=choice?(choice.seq+':'+choice.owner):'';
  if(!choice){holder.hidden=true;N.choiceUiId=''}
  else{
   holder.hidden=false;
   const mine=choice.owner===N.id;
   if(N.choiceUiId!==key){
    N.choiceUiId=key;
    el('ns152ChoiceTitle').textContent=mine?'OTVORIO SI SANDUK':'IGRAČ OTVARA SANDUK';
    el('ns152ChoiceText').textContent=mine?
     'Izaberi nadogradnju. Ako ne stigneš, automatski se bira OŠTRICA.':
     'Čeka se '+choice.owner.toUpperCase()+' · izbor se automatski završava.';
    for(const btn of holder.querySelectorAll('[data-pick]')){btn.hidden=!mine;btn.disabled=false}
   }
   const rest=N.solo?choice.until-Date.now():
    (choice.until-N.serverNow)-(now-N.lastState);
   el('ns152Timer').textContent=Math.max(0,Math.ceil(rest/1000))+' s';
  }
 }
 const hit=el('ns152Hurt');
 if(hit)hit.style.opacity=N.hurtUntil>now?String(Math.min(.9,(N.hurtUntil-now)/310*.84)):'0';
}


// V156: the physical feet/shadow determine depth, not sprite drawing order.
// Static buildings, chests, goblins and heroes share ONE painter queue.
function drawArenaPlayerBody(g,p,now,dt){
 g.save();if(p.hp<=0)g.globalAlpha=.38;
 const motion=updateHeroMotion(p,dt),age=swordAge(p,now);
 const b=B(),look=N.looks.get(p.id)?.look||(p.id===N.id?localArenaLook():b.getVillageHeroLook?.(p.id));
 if(typeof b.drawVillageHero==='function'){
  if(!motion.walking)g.translate(0,Math.sin(now/900+(p.id==='p1'?0:1))*.85);
  b.drawVillageHero(g,p.x,p.y,{id:p.id,look:look||b.heroStyle,netArena:true,
   frame:motion.phase,walking:motion.walking,visualSide:motion.side,
   attackT:age>=0&&age<=9?Math.max(.005,.30-age/30):0,
   headFacing:Number.isFinite(p.attackAngle)?p.attackAngle:motion.angle});
 }else{g.fillStyle=p.id===N.id?'#b2ddb6':'#d5b591';g.beginPath();g.arc(p.x,p.y,17,0,7);g.fill()}
 drawTargetedSlash(g,p,motion,age);
 g.restore();
}
function drawArenaPlayerLabel(g,p){
 const look=N.looks.get(p.id)?.look||(p.id===N.id?localArenaLook():B().getVillageHeroLook?.(p.id));
 const visualSize=clamp(Number(look?.visualSize)||.79,.7,1.12),labelY=p.y-72-(visualSize-.79)*35;
 g.save();
 g.fillStyle='#17251c';g.fillRect(p.x-23,labelY+7,46,5);
 g.fillStyle='#a8e2a6';g.fillRect(p.x-22,labelY+8,44*clamp(p.hp/(p.maxHp||100),0,1),3);
 g.fillStyle='#f0dfb6';g.font='bold 11px sans-serif';g.textAlign='center';
 g.fillText(p.id===N.id?'TI':(look?.name||p.id),p.x,labelY);
 g.restore();
}
function drawDepthSortedWorld(g,now,dt,visible){
 const sprites=window.NS154_GOBLINS;
 if(!sprites?.prepare||!sprites?.drawOne){
  drawArenaBuildings(g,N.world.obstacles,visible);
  drawArenaChests(g,N.solo?N.soloChests:N.chests,visible);
  drawArenaMobs(g,now,dt,visible);
  for(const p of N.players.values())if(p.online)drawArenaPlayerBody(g,p,now,dt);
  for(const p of N.players.values())if(p.online)drawArenaPlayerLabel(g,p);
  return;
 }
 if(!N.solo)sampleOnlineMobs(now,dt);
 const mobs=N.solo?N.soloMobs:N.mpMobs;
 const opt={solo:N.solo,tick:N.solo?N.soloTick:N.tick,now,lastState:N.lastState,
  alpha:N.solo?clamp(N.soloAcc*30,0,1):1,visible};
 // Precompute visible goblins in ONE scan. They are never re-animated in sorting.
 const prepared=sprites.prepare(mobs,opt);
 const originalTrolls=window.NS159_TROLL;
 const preparedTrolls=originalTrolls?.prepare(mobs,opt)||[];
 N.visibleMobs=prepared.length+preparedTrolls.length;
 const jobs=[];
 const obs=N.world.obstacles||[];
 for(let i=0;i<obs.length;i++){
  const o=obs[i];
  if(o.kind==='tree'||o.kind==='rock')continue;
  if(o.x>visible.right+14||o.x+o.w<visible.left-14||
     o.y>visible.bottom+17||o.y+o.h<visible.top-17)continue;
  jobs.push({depth:o.y+o.h+12,kind:0,id:i,o});
 }
 const chests=N.solo?N.soloChests:N.chests;
 for(const chest of chests)if(chest.x>=visible.left-35&&chest.x<=visible.right+35&&
   chest.y>=visible.top-35&&chest.y<=visible.bottom+35)
  jobs.push({depth:chest.y+13,kind:1,id:chest.id,chest});
 const decor=window.NS157_SCENERY?.generate(N.world)||[];
 for(const item of decor){
  if(item.x<visible.left-66||item.x>visible.right+66||
     item.y<visible.top-148||item.y>visible.bottom+26)continue;
  jobs.push({depth:item.depth,kind:4,id:item.id,item});
 }
 const people=[];
 for(const p of N.players.values()){
  if(!p.online)continue;
  if(p.id!==N.id){const k=1-Math.exp(-Math.min(dt,.05)*13);p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k}
  if(p.x<visible.left-75||p.x>visible.right+75||
     p.y<visible.top-95||p.y>visible.bottom+50)continue;
  people.push(p);
  jobs.push({depth:p.y+13,kind:2,id:Number(p.id.slice(1)),p});
 }
 for(const entry of prepared)jobs.push({depth:entry.depth,kind:3,id:entry.mob.id,entry});
 for(const entry of preparedTrolls)jobs.push({depth:entry.depth,kind:5,id:entry.mob.id,entry});
 // 80 goblins + ~12 props + six players: deterministic O(n log n),
 // far cheaper than multiple complete canvas render passes.
 jobs.sort((a,b)=>a.depth-b.depth||a.kind-b.kind||a.id-b.id);
 for(const item of jobs){
  if(item.kind===0){const sprite=cottageSprite(item.o,item.id);
   if(sprite)g.drawImage(sprite,item.o.x-13,item.o.y-16)}
  else if(item.kind===1)drawArenaChests(g,[item.chest],visible);
  else if(item.kind===2)drawArenaPlayerBody(g,item.p,now,dt);
  else if(item.kind===4)window.NS157_SCENERY?.drawOne(g,item.item);
  else if(item.kind===5)originalTrolls?.drawOne(g,item.entry,opt);
  else sprites.drawOne(g,item.entry,opt);
 }
 // Names and HP remain legible above a large horde, even when bodies are occluded.
 for(const p of people)drawArenaPlayerLabel(g,p);
}
function frame(now){
 if(N.phase!=='running'||document.hidden)return;
 const canvas=el('ns140Canvas'),g=canvas?.getContext('2d');if(!g)return;
 const dt=clamp((now-(N.lastFrame||now))/1000,0,.035);N.lastFrame=now;
 N.frames++;if(!N.fpsAt)N.fpsAt=now;if(now-N.fpsAt>1000){N.fps=Math.round(N.frames*1000/(now-N.fpsAt));N.frames=0;N.fpsAt=now}
 const v=input();
 const selecting=N.paused||(N.solo?!!N.soloChoice:!!N.choice);
 if(selecting){v.x=0;v.y=0}
 if(N.me&&N.me.hp>0){
  const oldX=N.me.x,oldY=N.me.y;
  moveLocal(N.me,v.x*N.world.speed*dt*(N.me.speedMult||1),v.y*N.world.speed*dt*(N.me.speedMult||1));
  if(N.solo){if(!N.paused)stepSolo(dt)}
  else {N.delta.x+=N.me.x-oldX;N.delta.y+=N.me.y-oldY;}
  const away=Math.hypot(N.me.x-N.me.tx,N.me.y-N.me.ty);
  if(!N.solo&&away>105){N.me.x=N.me.tx+(N.me.x-N.me.tx)*105/away;N.me.y=N.me.ty+(N.me.y-N.me.ty)*105/away}
 }
 if(!selecting&&N.me&&Math.hypot(v.x,v.y)>.25&&now-N.lastStepSound>285){
  N.lastStepSound=now;A()?.play('step',{gain:.8});
 }
 if(!N.solo&&N.lookSyncEnabled&&N.ws?.readyState===1&&now-N.lastLookCheck>=850){
   N.lastLookCheck=now;
   const look=localArenaLook(),signature=JSON.stringify(look);
   if(signature!==N.lastLookSignature&&N.ws.bufferedAmount<4000){
    N.lastLookSignature=signature;
    // Update my own drawing without waiting for the server round-trip.
    rememberLook(N.id,N.looks.get(N.id)?.revision||0,look);
    N.ws.send(JSON.stringify({t:'look',look}));
   }
  }
  if(N.ws?.readyState===1&&now-N.lastInput>=(N.paused?500:50)&&N.ws.bufferedAmount<4000){
  const seq=++N.seq;N.pending.push({seq,dx:N.delta.x,dy:N.delta.y});
  if(N.pending.length>26)N.pending.shift();
  N.delta={x:0,y:0};N.lastInput=now;
  // Compatibility: old arena server also auto-attacks when this flag is set.
  // Server still validates the 83px enemy hitbox; no client damage accepted.
  const autoTarget=N.me&&N.mpMobs.some(m=>m.hp>0&&
   (m.x-N.me.x)**2+(m.y-N.me.y)**2<83**2);
  N.ws.send(JSON.stringify({t:'i',seq,ax:Math.round(v.x*127),ay:Math.round(v.y*127),attack:autoTarget?1:0}));
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
 // Viewport culling keeps the expanded map cheap on mobile GPUs.
 const visible={left:me.x-r.width/2/zoom-90,right:me.x+r.width/2/zoom+90,
  top:me.y-r.height/2/zoom-90,bottom:me.y+r.height/2/zoom+90};
 drawDepthSortedWorld(g,now,dt,visible);
 // Grouped horde steps. One sound per nearby crowd per 720ms, not 80 voices.
 if(N.visibleMobs>1&&N.me&&now-N.hordeStepAt>=720){
  N.hordeStepAt=now;
  let nearest=null,distSq=155*155;
  const nearby=N.solo?N.soloMobs:N.mpMobs;
  for(const mob of nearby){
   if(mob.hp<=0)continue;
   const dx=mob.x-N.me.x,dy=mob.y-N.me.y,d2=dx*dx+dy*dy;
   if(d2<distSq){nearest=mob;distSq=d2}
  }
  if(nearest)A()?.play('goblinStep',{x:nearest.x,y:nearest.y,
   listenerX:N.me.x,listenerY:N.me.y,gain:.38});
 }
 g.setTransform(dpr,0,0,dpr,0,0);
 sessionHud(now);
 // Avoid updating live DOM HUD sixty times per second on mid-range phones.
 if(now-(N.statsAt||0)>=320){
  N.statsAt=now;
  el('ns140Stats').textContent=N.solo?
   ('FPS '+N.fps+' | SOLO · GOBLINI '+N.soloMobs.filter(m=>m.hp>0).length+' | VIDLJIVO '+N.visibleMobs+' | 0 XP'):
   ('FPS '+N.fps+' | '+Math.round(N.ping)+'ms | GOBLINI '+N.mpMobs.length+'/'+N.hordeTotal+
    ' | VIDLJIVO '+N.visibleMobs+' | CPU '+N.serverMs+'ms');
 }
}
window.NS140_ARENA={startHost,startSolo,acceptOffer,frame,stop,get errorCode(){return N.errorCode},get active(){return N.phase==='running'},
 get busy(){return N.phase!=='idle'},get diagnostics(){return {phase:N.phase,legacyTrollAtlasBuilds:window.NS159_TROLL?.builds||0,collisionGridCells:N.collisionGrid?.cells||0,collisionChecks:N.collisionGrid?.counts.candidates||0,collisionCalls:N.collisionGrid?.counts.calls||0,mode:N.solo?'solo':'multiplayer',seq:N.seq,ack:N.ack,correction:N.correction,fps:N.fps,ping:N.ping,serverMs:N.serverMs,soloMobCount:N.soloMobs.filter(m=>m.hp>0).length,soloGoblinHp:N.soloMobs.map(m=>m.hp),soloTrollCount:N.soloMobs.filter(m=>m.type==='troll'&&m.hp>0).length,soloMobsPos:N.soloMobs.map(m=>[m.x,m.y]),mobBufferSize:N.mobHistory.length,mobRenderTick:N.mobRenderTick,crowdFields:N.soloCrowd?.cachedFields||0,soloKills:N.soloKills,soloHp:N.solo?N.me?.hp:null,
 joystickActive:N.stick.ptr!==null,stickX:N.stick.x,stickY:N.stick.y,autoAttack:true,
 treeColliderCount:N.world.obstacles.filter(o=>o.kind==='tree').length,
 rockColliderCount:N.world.obstacles.filter(o=>o.kind==='rock').length,menuVisible:!el('ns158Menu')?.hidden,
 playerX:N.me?.x,playerY:N.me?.y,walking:!!N.me?.motion?.walking,
 facing:N.me?.motion?.side||1,attackAngle:N.me?.attackAngle??null}}};
})();
