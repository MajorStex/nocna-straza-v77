/* V140 independent lobby -> authoritative arena test. Zero rewards. */
(()=>{
'use strict';
if(window.NS140_ARENA)return;
// V164 temporary public testing: New Zone solo and co-op are open from account level 0.
const NS140_TEMP_UNLOCK_LEVEL=0;
const B=()=>window.__NS110_BRIDGE||{},A=()=>window.NS152_AUDIO||null,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// BEGIN V189 SPELL MECHANICS
// V189 shared Nova Zone spell mechanics (classic NS93 values, zero permanent rewards).
const ARENA_SPELLS=[
  {id:'spark',icon:'✦',en:'Spark',sr:'Iskra',cost:12,price:0,cd:3.6,radius:57,damage:29,range:355,color:'#a6d9ff',audio:490,cap:4},
  {id:'lightning',icon:'⚡',en:'Lightning',sr:'Grom',cost:26,price:7,cd:6.5,radius:63,damage:61,range:360,color:'#b9b0ff',audio:260,cap:5},
  {id:'fire',icon:'🔥',en:'Fireburst',sr:'Vatrena eksplozija',cost:23,price:6,cd:5.4,radius:86,damage:41,range:350,color:'#ffad6b',audio:160,cap:7},
  {id:'frost',icon:'❄',en:'Glacial Spike',sr:'Ledeni šiljci',cost:28,price:9,cd:8.5,radius:110,damage:31,range:340,color:'#a0e7f7',audio:420,cap:7,slow:2.4},
  {id:'chain',icon:'⌁',en:'Chain Storm',sr:'Lančana oluja',cost:36,price:12,cd:10,radius:112,damage:49,range:365,color:'#dab3ff',audio:320,cap:5},
  {id:'comet',icon:'☄',en:'Comet',sr:'Kometa',cost:48,price:17,cd:12,radius:118,damage:79,range:370,color:'#ffbd8a',audio:125,cap:8},
  {id:'heal',icon:'✚',en:'Healing Circle',sr:'Krug lečenja',cost:36,price:11,cd:15,radius:135,damage:0,heal:28,range:290,color:'#8be3b2',audio:660,cap:6},
  {id:'nova',icon:'✺',en:'Arcane Nova',sr:'Magični talas',cost:61,price:22,cd:19,radius:150,damage:68,range:325,color:'#d2aaff',audio:190,cap:9}
 ];
function arenaSpellInit(p,cls){const mage=cls==='mage',max=mage?102:64;if(!Number.isFinite(p.spellMana)){p.spellMana=max;p.spellCd=Array(8).fill(0)}p.spellMax=max;p.spellMana=Math.min(max,p.spellMana);p.spellRegen=mage?4.3:2.5;if(!Array.isArray(p.spellCd)||p.spellCd.length!==8)p.spellCd=Array(8).fill(0)}
function arenaSpellTick(p,cls){arenaSpellInit(p,cls);p.spellMana=Math.min(p.spellMax,p.spellMana+p.spellRegen/30)}
function arenaSpellState(p,tick){return [Math.round((p.spellMana||0)*10),p.spellMax||64,(p.spellCd||Array(8).fill(0)).map(t=>Math.max(0,t-tick)),p.spellSeq||0]}
function arenaSpellCast({p,players,mobs,world,tick,cls,slot,x,y,kill,damageRule,clearPath}){if(!p||p.hp<=0||p.knocked||!Number.isInteger(slot)||!ARENA_SPELLS[slot]||!Number.isFinite(x)||!Number.isFinite(y))return false;arenaSpellInit(p,cls);const s=ARENA_SPELLS[slot];if(tick<(p.spellTryAt??-100)+5||tick<(p.spellCd[slot]||0)||p.spellMana<s.cost||x<30||y<30||x>world.w-30||y>world.h-30||(p.x-x)**2+(p.y-y)**2>s.range**2||(clearPath&&!clearPath(p,{x,y})))return false;p.spellTryAt=tick;p.spellMana-=s.cost;p.spellCd[slot]=tick+Math.round(s.cd*30);if(s.heal){for(const a of players.values()){if(a.hp<=0||a.knocked||a.online===false||(a.x-x)**2+(a.y-y)**2>=s.radius**2)continue;a.hp=Math.min(a.maxHp||100,a.hp+s.heal)}}else{const victims=[];for(const m of mobs){if(m.hp<=0)continue;const radius=s.radius+(m.bodyRadius||(m.kind==='troll'?34:14)),d=(m.x-x)**2+(m.y-y)**2;if(d<=radius**2&&(!clearPath||clearPath({x,y},m)))victims.push({m,d,radius})}victims.sort((a,b)=>a.d-b.d||a.m.id-b.m.id);for(let i=0;i<Math.min(s.cap,victims.length);i++){const {m,d,radius}=victims[i],damage=Math.max(1,Math.round(s.damage*Math.max(.42,1-Math.sqrt(d)/radius*.5)*(['troll','rotfiend','boss','werewolfAlpha'].includes(m.kind)?.48:1)*(cls==='mage'?1.09:1)));m.hp=Math.max(0,m.hp-Math.max(0,damageRule?damageRule(p,m,damage):damage));m.hitTick=tick;if(s.slow){m.spellSlowUntil=Math.max(m.spellSlowUntil||0,tick+Math.round(s.slow*30));m.spellSlowFactor=.69}if(m.hp===0)kill(m,p)}}return [tick*6+Number(p.id.slice(1))-1,slot,Math.round(x),Math.round(y),tick]}
function arenaSpellExpire(mobs,tick){for(const m of mobs)if(m.spellSlowFactor&&tick>=m.spellSlowUntil){m.spellSlowFactor=0;m.spellSlowUntil=0}}
function arenaSpellEvents(events,tick){return events.filter(e=>tick-e[4]<=24).slice(-18)}
// END V189 SPELL MECHANICS
// Shared V152 crowd formula identical to server navigation and 30Hz movement.
// V150: predictable, allocation-bounded movement for New Zone's PvE mobs.
// Only the server decides positions. Each player destination gets one cached
// navigation field; 48px spatial buckets bound nearby separation work.
function createArenaCrowdSteering(world,move){
 const CELL=56,COLS=Math.ceil(world.w/CELL),ROWS=Math.ceil(world.h/CELL),COUNT=COLS*ROWS,INF=65535;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const BLOCK=128,collisionCells=new Map();let obstacleRef=null;
 function indexObstacles(){
  collisionCells.clear();obstacleRef=world.obstacles;const pad=world.r+3;
  for(const o of world.obstacles){for(let y=Math.floor((o.y-pad)/BLOCK);y<=Math.floor((o.y+o.h+pad)/BLOCK);y++)for(let x=Math.floor((o.x-pad)/BLOCK);x<=Math.floor((o.x+o.w+pad)/BLOCK);x++){
   const k=x+','+y;let list=collisionCells.get(k);if(!list)collisionCells.set(k,list=[]);list.push(o)
  }}
 }
 indexObstacles();
 function nearbyPoint(x,y){if(obstacleRef!==world.obstacles)indexObstacles();return collisionCells.get(Math.floor(x/BLOCK)+','+Math.floor(y/BLOCK))||[]}
 function nearbySegment(minX,minY,maxX,maxY){
  if(obstacleRef!==world.obstacles)indexObstacles();
  const l=Math.floor(minX/BLOCK),r=Math.floor(maxX/BLOCK),t=Math.floor(minY/BLOCK),b=Math.floor(maxY/BLOCK);
  if((r-l+1)*(b-t+1)>96)return world.obstacles;
  const out=new Set();for(let y=t;y<=b;y++)for(let x=l;x<=r;x++)for(const o of collisionCells.get(x+','+y)||[])out.add(o);return out
 }
 const walkable=(x,y)=>{
  if(x<world.r||y<world.r||x>world.w-world.r||y>world.h-world.r)return false;
  return nearbyPoint(x,y).every(o=>{
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
  if(flows.has(goal)){const cached=flows.get(goal);flows.delete(goal);flows.set(goal,cached);return cached}
  if(flows.size>=16)flows.delete(flows.keys().next().value);
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
  const minX=Math.min(x1,x2),maxX=Math.max(x1,x2),minY=Math.min(y1,y2),maxY=Math.max(y1,y2),pad=world.r+2;
  for(const o of nearbySegment(minX,minY,maxX,maxY)){
   if(o.x-pad>maxX||o.x+o.w+pad<minX||o.y-pad>maxY||o.y+o.h+pad<minY)continue;
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
   if(m.hp<=0||m.labFrozen)continue;
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
   if(m.hp<=0||m.labFrozen||!m.targetId||m.wormHold)continue;
   const target=players.get(m.targetId);
   if(!target?.online||target.knocked||target.hp<=0)continue;
   const d=Math.hypot(m.vx||0,m.vy||0);
   if(d<.001)continue;
   const stride=(m.moveSpeed||49+(m.id%5)*3.25)/world.speed;
   move(m,m.vx/d*stride,m.vy/d*stride,1/30);
  }
 }
 function refreshObstacles(changed){
  if(!changed?.length)return;
  // Recompute only grid cells within the released hitbox; never rebuild the 4200² map.
  indexObstacles();const pad=world.r+3;
  for(const o of changed){if(!o)continue;
   const left=Math.max(0,Math.floor((o.x-pad)/CELL)),right=Math.min(COLS-1,Math.floor((o.x+o.w+pad)/CELL)),top=Math.max(0,Math.floor((o.y-pad)/CELL)),bottom=Math.min(ROWS-1,Math.floor((o.y+o.h+pad)/CELL));
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)open[y*COLS+x]=walkable((x+.5)*CELL,(y+.5)*CELL)?1:0;
  }
  flows.clear();
 }
 return {step,advance,field,nearestOpen,walkable,refreshObstacles,get cachedFields(){return flows.size},clear(){flows.clear()}};
}

const N={phase:'idle',ws:null,match:'',id:'',world:{w:4200,h:4200,r:14,speed:156,obstacles:[]},
 players:new Map(),looks:new Map(),lastLookSignature:'',lastLookCheck:0,lookSyncEnabled:false,me:null,seq:0,ack:0,pending:[],delta:{x:0,y:0},tick:-1,
 lastInput:0,lastState:0,lastFrame:0,lastPing:0,ping:0,fps:0,fpsAt:0,frames:0,
 correction:0,serverMs:0,keys:new Set(),stick:{x:0,y:0,ptr:null,startX:0,startY:0,radius:47,deadZone:7},timeout:null,ticket:'',retry:0,
 wave:1,waveState:'play',waveAt:0,chests:[],choice:null,serverNow:0,lastMyHp:null,hurtUntil:0,hitMarkers:new Map(),lastStepSound:0,hordeStepAt:0,uiAt:0,choiceUiId:'',paused:false,pausedAt:0,
 soloWave:1,soloState:'play',soloChoice:null,soloBetweenUntil:0,soloChests:[],soloChestSeq:0,
 soloDrops:[],drops:[],dropSeq:0,soloUpgradeSeq:0,
 solo:false,soloCrowd:null,soloMobs:[],presence:new Map(),presenceAt:0,mpMobs:[],mobHistory:[],mobRenderTick:null,visibleMobs:0,hordeTotal:100,soloSpawnCache:null,statsAt:0,soloTick:0,soloAcc:0,soloKills:0,soloSwing:-100,soloInvul:0,errorCode:'',retryTimer:null,lostSince:0};
// V160 sandbox state lives only in this isolated runtime, never in saved progression.
let LAB={enabled:false,freezeAI:false,godMode:false,customCount:null,allies:[],props:[],rev:0};
let LAB_REMOTE=null,LAB_PAUSE={paused:false,votes:[],needed:1,expires:0},LAB_AUTO_PAUSE=false,LAB_WEAPON=null;
let LAB_SUPPORTED=false,LAB_LOOK=null,LAB_UNDO=null,LAB_SERVER_BUILD=0;
const LAB_WEAPONS=new Set(['sword','longsword','axe','spear','halberd','warhammer','mace','dagger','falchion','flail','rapier','glaive','greataxe','scimitar','morningstar','trollclub','trollmaul']);
// BEGIN V190 ACID WORM — same deterministic rules in solo and authoritative relay.
function arenaWormVariant(m,wave,batch){
 if(m.kind==='troll'||(m.id+batch*3)%10!==3)return m;
 m.kind='worm';m.hp=m.maxHp=Math.min(480,81+Math.max(0,wave-1)*9);
 m.moveSpeed=Math.min(100,72+Math.max(0,wave-1)*2);return m;
}
function arenaAcidClear(world,x,y,tx,ty,r){
 if(tx<r||ty<r||tx>world.w-r||ty>world.h-r)return false;
 const dx=tx-x,dy=ty-y;
 const minX=Math.min(x,tx),maxX=Math.max(x,tx),minY=Math.min(y,ty),maxY=Math.max(y,ty);
 for(const o of world.obstacles||[]){
  if(o.x-r>maxX||o.x+o.w+r<minX||o.y-r>maxY||o.y+o.h+r<minY)continue;
  let a=0,b=1;const bounds=[[x,dx,o.x-r,o.x+o.w+r],[y,dy,o.y-r,o.y+o.h+r]];
  for(const [s,d,lo,hi] of bounds){if(Math.abs(d)<1e-8){if(s<lo||s>hi){a=2;break}}else{const u=(lo-s)/d,v=(hi-s)/d;a=Math.max(a,Math.min(u,v));b=Math.min(b,Math.max(u,v));if(a>b)break}}
  if(a<=b)return false;
 }return true;
}
function stepArenaWorms(mobs,players,world,tick,wave,shots,seq,damage){
 const alive=[...players.values()].filter(p=>p.online&&p.hp>0&&!p.knocked&&!p.finalDead);
 for(const m of mobs){
  if(m.kind!=='worm'||m.hp<=0||m.labFrozen)continue;
  let target=alive.find(p=>p.id===m.targetId);
  if(!target){let best=Infinity;for(const p of alive){const d=(p.x-m.x)**2+(p.y-m.y)**2;if(d<best){target=p;best=d}}}
  m.wormHold=false;if(!target){m.wormWindup=0;continue}
  const dx=target.x-m.x,dy=target.y-m.y,dist=dx*dx+dy*dy;
  const inRange=dist<=190**2&&arenaAcidClear(world,m.x,m.y,target.x,target.y,8);
  if(inRange||m.wormWindup>tick){m.wormHold=true;m.wormAngle=Math.atan2(dy,dx)}
  if(m.wormWindup&&tick>=m.wormWindup){
   m.wormWindup=0;
   if(inRange&&shots.length<60){const a=m.wormAngle;shots.push({id:++seq,x:m.x+Math.cos(a)*18,y:m.y+Math.sin(a)*18,vx:Math.cos(a)*200,vy:Math.sin(a)*200,expires:tick+75,damage:Math.min(40,Math.round(10*(1+.06*(wave-1))))});m.attackTick=tick}
   continue;
  }
  if(inRange&&!m.wormWindup&&(m.wormReady??(tick+96+(m.id%13)*5))<=tick){m.wormWindup=tick+15;m.wormReady=tick+138+(m.id%26)*3}
  if(m.wormReady===undefined)m.wormReady=tick+96+(m.id%13)*5;
 }
 const next=[];
 for(const shot of shots){
  if(tick>=shot.expires)continue;const x=shot.x+shot.vx/30,y=shot.y+shot.vy/30;
  if(!arenaAcidClear(world,shot.x,shot.y,x,y,9))continue;
  const p=alive.find(p=>p.hp>0&&!p.knocked&&(p.x-x)**2+(p.y-y)**2<23**2);
  if(p){damage(p,shot.damage);continue}
  shot.x=x;shot.y=y;next.push(shot);
 }
 return {shots:next,seq};
}
// END V190 ACID WORM

// V192 Classic loadout, weapon attributes and inventory rewards.
const ARENA_CLASSIC_WEAPONS={sword:{range:0,damage:1,arc:1.25},longsword:{range:18,damage:1.13,arc:1.03},axe:{range:8,damage:1.35,arc:1.20},spear:{range:27,damage:.9,arc:.72},halberd:{range:28,damage:1.21,arc:.92},warhammer:{range:4,damage:1.32,arc:.87},mace:{range:1,damage:1.14,arc:1.11},dagger:{range:-24,damage:.91,arc:1.20},falchion:{range:10,damage:1.20,arc:1.31},flail:{range:8,damage:1.16,arc:1.31},rapier:{range:12,damage:1.02,arc:.82},glaive:{range:34,damage:1.18,arc:.84},greataxe:{range:12,damage:1.46,arc:1.08},scimitar:{range:8,damage:1.11,arc:1.38},morningstar:{range:6,damage:1.22,arc:1.18},trollclub:{range:4,damage:1.16,arc:1.06,speed:1.23},trollmaul:{range:0,damage:1.29,arc:.90,speed:1.40}};
const ARENA_CORE_REWARDS=['edge','heart','boots'];
const ARENA_EXTRA_REWARDS=['axe','spear','dagger','rapier','glaive','greataxe','scimitar','morningstar','longsword','halberd','warhammer','mace','falchion','flail','trollclub','trollmaul','regen','leech','crit','armor','swift','haste','aegis','aura','shock','bombs','shuriken','frost','magnet','thorns'];
const arenaWeapon=p=>ARENA_CLASSIC_WEAPONS[p.activeWeapon]||ARENA_CLASSIC_WEAPONS.sword;
function arenaAttackPeriod(p){return Math.max(9,Math.round(19*(arenaWeapon(p).speed||1)*(p.perks?.haste?.93:1)))}
function arenaAttackReach(p,m){return Math.max(30,({werewolfAlpha:125,boss:125,rotfiend:125,elephant:100,troll:95}[m.kind]||83)+arenaWeapon(p).range)}
function arenaAttackDamage(p,tick){const crit=p.perks?.crit&&((tick*37+(Number(p.id?.slice(1))||1)*13)%100<10);return Math.max(1,Math.round((p.damage||22)*arenaWeapon(p).damage*(crit?1.6:1)))}
function arenaRewardOptions(p,seq){
 const pool=ARENA_EXTRA_REWARDS.filter(k=>ARENA_CLASSIC_WEAPONS[k]?k!==p.activeWeapon&&k!==p.secondaryWeapon:!p.perks?.[k]);
 // Always preserve one safe default and one normal upgrade. Third slot is original treasure.
 return ['edge','heart',pool.length?pool[(Math.max(1,seq)-1)%pool.length]:'boots'];
}
function arenaGrantReward(p,pick,tick){
 if(!p)return false;
 if(pick==='edge')p.damage=Math.min(65,Math.round((p.damage||22)*1.2));
 else if(pick==='heart'){p.maxHp=Math.min(240,(p.maxHp||100)+25);p.hp=Math.min(p.maxHp,p.hp+35)}
 else if(pick==='boots')p.speedMult=Math.min(1.5,(p.speedMult||1)*1.1);
 else if(ARENA_CLASSIC_WEAPONS[pick]){if(pick===p.activeWeapon||pick===p.secondaryWeapon)return false;p.secondaryWeapon=pick}
 else if(ARENA_EXTRA_REWARDS.includes(pick)){p.perks??={};if(p.perks[pick])return false;p.perks[pick]=1;
  if(pick==='swift')p.speedMult=Math.min(1.5,(p.speedMult||1)*1.05);
  if(pick==='regen')p.regenAt=tick+360;if(pick==='aegis')p.aegisAt=tick+210;
  if(pick==='leech')p.leechKills=p.kills||0;
  if(ARENA_EXTRA_TIMERS[pick]){p.arenaExtraAt??={};p.arenaExtraAt[pick]=tick+ARENA_EXTRA_TIMERS[pick]}
 }else return false;return true;
}
function arenaSwapWeapon(p,tick){
 if(!p||p.hp<=0||p.knocked||p.finalDead||!ARENA_CLASSIC_WEAPONS[p.secondaryWeapon]||tick<(p.swapReady||0))return false;
 const old=ARENA_CLASSIC_WEAPONS[p.activeWeapon]?p.activeWeapon:'sword';p.activeWeapon=p.secondaryWeapon;p.secondaryWeapon=old;p.swapReady=tick+12;return true;
}
function arenaPerkTick(p,tick){
 if(!p.perks||p.hp<=0||p.knocked)return;
 if(p.perks.regen&&tick>=(p.regenAt||0)){p.hp=Math.min(p.maxHp||100,p.hp+5);p.regenAt=tick+360}
 if(p.perks.aegis&&tick>=(p.aegisAt||0)){p.shield=Math.max(p.shield||0,tick+26);p.aegisAt=tick+210}
 if(p.perks.leech){const n=Math.floor(((p.kills||0)-(p.leechKills||0))/7);if(n>0){p.hp=Math.min(p.maxHp||100,p.hp+n*3);p.leechKills=(p.leechKills||0)+n*7}}
}
function arenaIncoming(p,damage){return Math.max(1,damage-(p.perks?.armor?2:0))}
 // BEGIN V193 PASSIVES AND EVOLUTIONS
// Same deterministic 30Hz mechanics in Solo and the authoritative room.
const ARENA_EXTRA_TIMERS={aura:48,shock:270,bombs:150,shuriken:90,frost:360};
const ARENA_EVOLUTIONS={sword:{id:'moon',perk:'aura',cd:120,cap:8,ratio:.56,fx:7},spear:{id:'storm',perk:'shock',cd:120,cap:4,ratio:.78,fx:1},axe:{id:'ember',perk:'bombs',cd:150,cap:6,ratio:.67,fx:2},dagger:{id:'phantom',perk:'shuriken',cd:114,cap:5,ratio:.53,fx:4}};
function arenaExtraEvent(p,tick,slot,x,y,emit){
 if(p.extraFxTick!==tick){p.extraFxTick=tick;p.extraFxN=0}
 const seat=Number(p.id?.slice(1))||1,n=p.extraFxN||0;if(n>=10)return;
 p.extraFxN=n+1;emit([1000000000+tick*64+(seat-1)*10+n,slot,Math.round(x),Math.round(y),tick]);
}
function arenaExtraDamage(m,p,tick,d,kill,damageRule){
 if(!m||m.hp<=0)return false;const damage=damageRule?damageRule(p,m,d):d;if(!(damage>0))return false;m.hp=Math.max(0,m.hp-Math.max(1,Math.round(damage)));m.hitTick=tick;
 if(m.hp===0)kill(m,p);return true;
}
function arenaExtraNearest(p,mobs,r){
 let best=null,ds=r*r;for(const m of mobs){if(m.hp<=0)continue;const d=(m.x-p.x)**2+(m.y-p.y)**2;if(d<ds){best=m;ds=d}}return best;
}
function arenaEvolutionUnlock(p,tick,emit){
 const e=ARENA_EVOLUTIONS[p.activeWeapon];if(!e||p.hp<=0||p.knocked||(p.level||1)<5||!p.perks?.[e.perk])return null;
 p.arenaEvolved??={};p.arenaEvoReady??={};
 if(!p.arenaEvolved[e.id]){p.arenaEvolved[e.id]=1;p.arenaEvoReady[e.id]=tick+12;arenaExtraEvent(p,tick,e.fx,p.x,p.y,emit)}
 return e;
}
function arenaEvolutionStrike(p,target,mobs,tick,kill,emit,damageRule){
 const e=arenaEvolutionUnlock(p,tick,emit);if(!e||tick<(p.arenaEvoReady[e.id]||0))return false;
 p.arenaEvoReady[e.id]=tick+e.cd;
 const a=Math.atan2(target.y-p.y,target.x-p.x),ux=Math.cos(a),uy=Math.sin(a);
 const x=e.id==='ember'?(target.hp>0?target.x:p.x+ux*85):p.x,y=e.id==='ember'?(target.hp>0?target.y:p.y+uy*85):p.y;
 let hits=0;arenaExtraEvent(p,tick,e.fx,x,y,emit);
 for(const m of mobs){if(m.hp<=0)continue;const dx=m.x-x,dy=m.y-y,r=m.bodyRadius||14,dist=dx*dx+dy*dy;
  let match=false;
  if(e.id==='moon')match=dist<=(132+r*.25)**2;
  else if(e.id==='storm'){const front=dx*ux+dy*uy;match=front>=6&&front<=226&&Math.abs(dx*uy-dy*ux)<=30+r*.35}
  else if(e.id==='ember')match=dist<=(94+r*.2)**2;
  else {const diff=Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a));match=dist<=185**2&&Math.abs(diff)<=.76}
  if(match&&arenaExtraDamage(m,p,tick,(p.damage||22)*e.ratio,kill,damageRule)&&++hits>=e.cap)break;
 }
 return true;
}
function arenaCombatExtras(p,mobs,world,tick,kill,emit,damageRule){
 if(!p||p.hp<=0||p.knocked||p.finalDead||p.paused||p.background||!p.perks)return;
 const t=p.arenaExtraAt??={};arenaEvolutionUnlock(p,tick,emit);
 // One scheduled bomb and one shuriken per player; no per-projectile timers.
 const bomb=p.arenaBomb;
 if(bomb&&tick>=bomb.at){p.arenaBomb=null;let hits=0;for(const m of mobs){if(m.hp<=0||(m.x-bomb.x)**2+(m.y-bomb.y)**2>(64+(m.bodyRadius||14)*.35)**2)continue;
  if(arenaExtraDamage(m,p,tick,22,kill,damageRule)&&++hits>=16)break}arenaExtraEvent(p,tick,2,bomb.x,bomb.y,emit)}
 const shot=p.arenaShuriken;
 if(shot){const x=shot.x+shot.vx/30,y=shot.y+shot.vy/30;if(tick>=shot.end||!arenaAcidClear(world,shot.x,shot.y,x,y,8))p.arenaShuriken=null;
  else {shot.x=x;shot.y=y;for(const m of mobs){if(m.hp<=0||(m.x-x)**2+(m.y-y)**2>((m.bodyRadius||14)+8)**2)continue;
   arenaExtraDamage(m,p,tick,12,kill,damageRule);p.arenaShuriken=null;arenaExtraEvent(p,tick,0,x,y,emit);break}}}
 for(const k of Object.keys(ARENA_EXTRA_TIMERS)){
  if(!p.perks[k])continue;if(!Number.isFinite(t[k])){t[k]=tick+ARENA_EXTRA_TIMERS[k];continue}
  if(tick<t[k])continue;t[k]=tick+ARENA_EXTRA_TIMERS[k];
  if(k==='aura'){let hits=0;for(const m of mobs){if((m.x-p.x)**2+(m.y-p.y)**2>97**2)continue;if(arenaExtraDamage(m,p,tick,4,kill,damageRule)&&++hits>=4)break}arenaExtraEvent(p,tick,7,p.x,p.y,emit)}
  else if(k==='shock'){const m=arenaExtraNearest(p,mobs,235);if(m){arenaExtraDamage(m,p,tick,13,kill,damageRule);arenaExtraEvent(p,tick,1,m.x,m.y,emit)}}
  else if(k==='bombs'){const m=arenaExtraNearest(p,mobs,300);if(m){p.arenaBomb={x:m.x,y:m.y,at:tick+24};arenaExtraEvent(p,tick,2,m.x,m.y,emit)}}
  else if(k==='shuriken'){const m=arenaExtraNearest(p,mobs,300);if(m){const a=Math.atan2(m.y-p.y,m.x-p.x),ux=Math.cos(a),uy=Math.sin(a);p.arenaShuriken={x:p.x+ux*20,y:p.y+uy*20,vx:ux*255,vy:uy*255,end:tick+51};arenaExtraEvent(p,tick,0,p.x,p.y,emit)}}
  else if(k==='frost'){for(const m of mobs){if(m.hp<=0||(m.x-p.x)**2+(m.y-p.y)**2>150**2)continue;m.spellSlowUntil=Math.max(m.spellSlowUntil||0,tick+51);m.spellSlowFactor=Math.min(m.spellSlowFactor||1,.69)}arenaExtraEvent(p,tick,3,p.x,p.y,emit)}
 }
}
function arenaThorns(p,m,tick,kill,emit,damageRule){if(p.perks?.thorns&&arenaExtraDamage(m,p,tick,7,kill,damageRule)){arenaExtraEvent(p,tick,0,m.x,m.y,emit);return true}return false}
// END V193 PASSIVES AND EVOLUTIONS
// BEGIN V194 BREAKABLES
// The map's stable prop indices identify objects; no client may claim damage or loot.
function arenaBreakInit(world){
 const baseObs=world.obstacles||[],baseProps=world.classicProps||[],items=[];
 for(let id=0;id<baseProps.length;id++){const p=baseProps[id];if(p.type!=='barrel'&&p.type!=='crate')continue;
  const maxHp=p.type==='barrel'?72+((p.seed||id)%5)*7:44+((p.seed||id)%4)*6;
  const collider=baseObs.find(o=>o.kind===p.type&&Math.abs(o.x+o.w/2-p.x)<=2&&Math.abs(o.y+o.h/2-p.y)<=2);
  items.push({id,x:p.x,y:p.y,r:p.r||16,kind:p.type,maxHp,hp:maxHp,collider});
 }
 return {baseObs,baseProps,items,removed:new Set(),revision:0,kits:[],kitCount:0,kitWave:0,kitWaveCount:0};
}
function arenaBreakRefresh(b,world){
 const broken=new Set(b.items.filter(i=>i.hp<=0).map(i=>i.id));b.removed.clear();
 for(const i of b.items)if(i.hp<=0&&i.collider)b.removed.add(i.collider);
 world.obstacles=b.baseObs.filter(o=>!b.removed.has(o));world.classicProps=b.baseProps.filter((_,i)=>!broken.has(i));
}
function arenaBreakPacket(b){return b?[b.revision,b.items.filter(i=>i.hp!==i.maxHp).map(i=>[i.id,i.hp]),b.kits.map(k=>[k.id,k.x,k.y]),b.kitCount,b.kitWave,b.kitWaveCount]:null}
function arenaBreakRestore(b,world,packet){
 if(!Array.isArray(packet)||!Number.isSafeInteger(packet[0])||packet[0]<0||!Array.isArray(packet[1])||!Array.isArray(packet[2]))return false;
 const rows=new Map(packet[1].filter(r=>Array.isArray(r)&&Number.isInteger(r[0])&&Number.isFinite(r[1])).slice(0,b.items.length).map(r=>[r[0],r[1]]));
 for(const i of b.items)i.hp=Math.max(0,Math.min(i.maxHp,rows.get(i.id)??i.maxHp));
 b.revision=packet[0];b.kits=packet[2].filter(r=>Array.isArray(r)&&b.items.some(i=>i.id===r[0]&&i.hp===0&&i.x===r[1]&&i.y===r[2])).slice(0,4).map(r=>({id:r[0],x:r[1],y:r[2]}));
 b.kitCount=Math.min(4,Math.max(0,Number(packet[3])||0));b.kitWave=Number(packet[4])||0;b.kitWaveCount=Math.min(2,Math.max(0,Number(packet[5])||0));arenaBreakRefresh(b,world);return true;
}
function arenaBreakHit(b,world,p,tick,wave,damage,reach){
 if(!b||!p||p.hp<=0||p.knocked||p.finalDead||p.background||p.paused)return null;
 let nearest=null,ds=Infinity;
 for(const i of b.items){if(i.hp<=0)continue;const d=(p.x-i.x)**2+(p.y-i.y)**2;if(d>=ds||d>(reach+i.r+10)**2)continue;nearest=i;ds=d}
 if(!nearest)return null;
 // Check the path to the object, excluding only its own collider.
 if(!arenaAcidClear({w:world.w,h:world.h,obstacles:world.obstacles.filter(o=>o!==nearest.collider)},p.x,p.y,nearest.x,nearest.y,4))return null;
 nearest.hp=Math.max(0,nearest.hp-Math.max(1,Math.round(damage)));b.revision++;
 if(nearest.hp===0){
  if(b.kitWave!==wave){b.kitWave=wave;b.kitWaveCount=0}
  const h=(Math.imul(nearest.id+1,1664525)+Math.imul(tick+wave,1013904223))>>>0;
  if(nearest.kind==='barrel'&&b.kitCount<4&&b.kitWaveCount<2&&h%10000<2400){b.kits.push({id:nearest.id,x:nearest.x,y:nearest.y});b.kitCount++;b.kitWaveCount++}
  arenaBreakRefresh(b,world);
 }
 return nearest;
}
function arenaFieldKits(b,players,tick,emit=()=>{}){
 if(!b||!b.kits.length)return;
 for(let i=b.kits.length-1;i>=0;i--){const k=b.kits[i];let best=null,ds=34**2;
  for(const p of players.values()){if(!p.online||p.background||p.paused||p.hp<=0||p.knocked||p.finalDead)continue;const d=(p.x-k.x)**2+(p.y-k.y)**2;if(d<=ds&&(!best||d<ds||p.id<best.id)){best=p;ds=d}}
  if(!best)continue;const hp=best.hp;best.hp=Math.min(best.maxHp||100,best.hp+Math.min(18,Math.max(10,Math.round((best.maxHp||100)*.12))));best.fieldRushUntil=Math.max(best.fieldRushUntil||0,tick+240);
  b.kits.splice(i,1);b.revision++;emit(best,Math.round(best.hp-hp));
 }
}
// END V194 BREAKABLES
// BEGIN V195 EXPLORATION ECONOMY
// Run-local currency and achievements; never grant permanent account items in this arena.
const ARENA_SHOP_ITEMS=[
 ['burger','🍔 BURGER · +28 HP',55,'market'],
 ['ironHeart','♥ KOVANO SRCE · +35 HP',62,'guild'],
 ['sharpEdge','⚔ MAJSTORSKA OŠTRICA · +18% DMG',78,'guild'],
 ['swiftSoles','➤ PUTNIČKE ČIZME · +12%',68,'guild'],
 ['healing','✚ NAPITAK · +55 HP',45,'guild'],
 ['aegis','◈ AMULET ŠTITA',95,'guild'],
 ['blood','KRVAVI ZAVET · +22% DMG / −18 HP',0,'relic'],
 ['harvest','ŽETVENI ZAVET · ključ + čvorište / horda +8%',0,'relic'],
 ['putnik','PUTNIČKI ZAVET · +14% brzine / XP +15%',0,'relic']
];
const ARENA_RUN_ACHIEVEMENTS=[
 ['Prva stotka','kills',100],['Borac protiv horde','kills',200],['Čelična oluja','kills',350],['Veteran noći','kills',500],['Nezaustavljivi','kills',750],['Legenda horde','kills',1000],['Lovac na trolove','trolls',1],['Lovac na pljuvače','worms',10],['Deseti talas','wave',10],['Duga noć','wave',20],['Tragač za blagom','chests',5],['Nikog ne ostavljamo','revives',1]
];
function arenaExploreInit(world){
 const landmarks=(world.classicProps||[]).filter(p=>p.type==='market'||p.type==='guild').map(p=>({type:p.type,x:p.x,y:p.y,r:p.r||60}));
 const ax=world.w/2,ay=world.h/2;
 for(let i=0;i<48;i++){const a=i*2.399963229728653,d=320+(i%8)*65,x=Math.round(ax+Math.cos(a)*d),y=Math.round(ay+Math.sin(a)*d);if(!arenaAcidClear(world,x,y,x,y,34))continue;landmarks.push({type:'relic',x,y,r:28});break}
 return {landmarks,drops:[],seq:0,vow:'',kills:0,trolls:0,worms:0,chests:0,revives:0,wave:1,invalid:false};
}
function arenaExploreRestore(e,data){
 if(!data||typeof data!=='object')return;
 if(['blood','harvest','putnik'].includes(data.vow))e.vow=data.vow;
 for(const k of ['seq','kills','trolls','worms','chests','revives','wave'])e[k]=Math.max(k==='wave'?1:0,Math.min(1000000,Number(data[k])||0));
 e.invalid=!!data.invalid;e.drops=Array.isArray(data.drops)?data.drops.filter(d=>d&&['key','shard'].includes(d.type)&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&Number.isSafeInteger(d.id)).slice(0,24):[];
}
function arenaExplorePacket(e){return e?{vow:e.vow,drops:e.drops.map(d=>[d.id,d.type==='key'?0:1,Math.round(d.x*10),Math.round(d.y*10)]),stats:[e.kills,e.trolls,e.worms,e.chests,e.revives,e.wave,e.invalid?1:0],landmarks:e.landmarks}:null}
function arenaExploreKill(e,p,m,tick,lab=false){
 if(!e||!p||!m||m.exploreCounted)return;
 m.exploreCounted=true;if(lab){e.invalid=true;return}if(e.invalid)return;
 e.kills++;if(m.kind==='caveSpider')p.arenaShards=Math.min(999,(p.arenaShards||0)+2);if(m.kind==='caveThief')p.arenaKeys=Math.min(99,(p.arenaKeys||0)+1);if(m.kind==='troll')e.trolls++;if(m.kind==='worm')e.worms++;
 const add=type=>{if(e.drops.length<24)e.drops.push({type,id:++e.seq,x:Math.round(m.x),y:Math.round(m.y)})};
 if(e.kills%18===0||m.kind==='boss'||m.kind==='werewolfAlpha')add('key');
 const h=(Math.imul(e.kills,1103515245)+Math.imul(tick+1,1664525))>>>0;
 if(h%10000<(e.vow==='harvest'?630:230))add('shard');
 if(e.vow==='putnik'&&e.kills%20===0&&p.hp>0)p.hp=Math.min(p.maxHp||100,p.hp+10);
}
function arenaExplorePickup(e,players){
 if(!e||e.invalid||!e.drops.length)return;
 for(let i=e.drops.length-1;i>=0;i--){const d=e.drops[i];let best=null,ds=32**2;
  for(const p of players.values()){if(!p.online||p.background||p.paused||p.knocked||p.hp<=0||p.finalDead)continue;const v=(p.x-d.x)**2+(p.y-d.y)**2;if(v<=ds&&(!best||v<ds||p.id<best.id)){best=p;ds=v}}
  if(best){if(d.type==='key')best.arenaKeys=Math.min(99,(best.arenaKeys||0)+1);else best.arenaShards=Math.min(999,(best.arenaShards||0)+1);e.drops.splice(i,1)}
 }
}
function arenaTradeNear(e,p,type){
 if(!e||e.invalid||!p||p.hp<=0||p.knocked||p.finalDead||p.background||p.paused)return null;
 return e.landmarks.find(o=>(!type||o.type===type)&&(p.x-o.x)**2+(p.y-o.y)**2<=(o.r+42)**2)||null;
}
function arenaTradeInfo(e,p,id,tick){
 const row=ARENA_SHOP_ITEMS.find(x=>x[0]===id);if(!row||!arenaTradeNear(e,p,row[3]))return false;
 if(row[3]==='relic')return !e.vow;
 if((p.xp||0)<row[2])return false;
 if(id==='burger')return p.hp<(p.maxHp||100)&&tick>=(p.burgerUntil||0);
 const bit=1<<ARENA_SHOP_ITEMS.indexOf(row);
 return !!(p.guildUnlocked||p.arenaKeys>0)&&!((p.guildMask||0)&bit)&&(id!=='aegis'||!p.perks?.aegis);
}
function arenaTrade(e,p,id,tick,players){
 if(!arenaTradeInfo(e,p,id,tick))return false;
 const row=ARENA_SHOP_ITEMS.find(x=>x[0]===id);
 if(row[3]==='relic'){
  if(id==='blood'){p.damage=Math.min(100,Math.round((p.damage||22)*1.22));p.maxHp=Math.max(42,(p.maxHp||100)-18);p.hp=Math.min(p.hp,p.maxHp)}
  else if(id==='harvest'){p.arenaKeys=Math.min(99,(p.arenaKeys||0)+1);p.arenaShards=Math.min(999,(p.arenaShards||0)+1)}
  else {p.speedMult=Math.min(1.5,(p.speedMult||1)*1.14);for(const q of players.values()){if(q.xpTax!==1.15){q.xpTax=1.15;q.xpNeed=Math.ceil((q.xpNeed||160)*1.15)}}}
  e.vow=id;return true;
 }
 p.xp-=row[2];
 if(id==='burger'){p.hp=Math.min(p.maxHp||100,p.hp+28);p.burgerUntil=tick+1800;return true}
 if(!p.guildUnlocked){p.arenaKeys--;p.guildUnlocked=true}
 p.guildMask=(p.guildMask||0)|(1<<ARENA_SHOP_ITEMS.indexOf(row));
 if(id==='ironHeart'){p.maxHp=Math.min(300,(p.maxHp||100)+35);p.hp=Math.min(p.maxHp,p.hp+35)}
 else if(id==='sharpEdge')p.damage=Math.min(100,Math.round((p.damage||22)*1.18));
 else if(id==='swiftSoles')p.speedMult=Math.min(1.5,(p.speedMult||1)*1.12);
 else if(id==='healing')p.hp=Math.min(p.maxHp||100,p.hp+55);
 else if(id==='aegis'){p.perks??={};p.perks.aegis=1;p.aegisAt=tick+210}
 return true;
}
const ARENA_DAILY_QUESTS=[['Dnevno čišćenje','kills',40],['Izdrži napad','wave',6],['Lov na crve','worms',5],['Malo blago','chests',2]];
const ARENA_WEEKLY_QUESTS=[['Nedeljna prethodnica','kills',220],['Noćni maraton','wave',16],['Patrola protiv trolova','trolls',2],['Lovac na riznice','chests',6]];
function arenaQuestPeriod(ms){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
 const number=k=>Number(parts.find(p=>p.type===k)?.value)||1,y=number('year'),m=number('month'),d=number('day'),ordinal=Math.floor(Date.UTC(y,m-1,d)/86400000);
 const monday=new Date(Date.UTC(y,m-1,d));monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
 const wk=Math.floor(monday.getTime()/604800000);
 return [ARENA_DAILY_QUESTS[((ordinal%4)+4)%4],ARENA_WEEKLY_QUESTS[((wk%4)+4)%4]];
}
function arenaRunMask(e){
 if(!e||e.invalid)return 0;let bits=0;
 for(let i=0;i<ARENA_RUN_ACHIEVEMENTS.length;i++){const a=ARENA_RUN_ACHIEVEMENTS[i];if((e[a[1]]||0)>=a[2])bits|=1<<i}
 return bits;
}
// END V195 EXPLORATION ECONOMY
// BEGIN V196 EXPEDITIONS
const EXP_START={x:235,y:225},EXP_EXIT={x:235,y:330};
function expInit(world){
 const portals=[];for(const id of [1,2])for(let j=0;j<96;j++){
  const a=(j+id*19)*2.39996323,d=330+(j%10)*57,x=Math.round(world.w/2+Math.cos(a)*d),y=Math.round(world.h/2+Math.sin(a)*d);
  if(!arenaAcidClear(world,x,y,x,y,48)||portals.some(p=>(p.x-x)**2+(p.y-y)**2<180**2))continue;portals.push({id,x,y});break
 }
 return {id:0,rev:0,done:0,key:false,rope:false,keyDrop:null,portals,saved:null};
}
function expWorld(base,id){
 if(!id)return {...base};
 const obs=[],add=(x,y,w,h)=>obs.push({x,y,w,h,kind:'expWall'}),w=id===1?1500:1320,h=id===1?1150:920;
 add(150,150,w,24);add(150,150+h-24,w,24);add(150,150,24,h);add(150+w-24,150,24,h);
 for(const [x,y,len] of (id===1?[[475,174,470],[805,690,586],[1135,174,510]]:[[440,174,420],[740,610,436],[1030,174,385]]))add(x,y,30,len);
 return {...base,w:150+w,h:150+h,decorSeed:196+id,classicProps:[],obstacles:obs};
}
function expMobs(id,wave,tick){
 const points=id===1?[[370,490],[650,400],[670,830],[970,360],[1030,820],[1310,340],[1400,940]]:[[350,480],[560,365],[615,800],[865,330],[900,825],[1160,390],[1290,830]];
 return points.map(([x,y],i)=>{const kind=id===1?(i===6?'brute':'skeleton'):(i===6?'caveSpider':i===1?'caveThief':i%3===0?'worm':'crawler');
  return {...(arenaHeavyStats(kind,wave)||{kind,hp:55+wave*4,maxHp:55+wave*4,bodyRadius:14,moveSpeed:88}),id:300+i,x,y,sx:x,sy:y,prevX:x,prevY:y,vx:0,vy:0,targetId:'',attackAt:tick+30,attackTick:-100,hitTick:-100,retargetAt:0,heavyNext:tick+90,expSleeping:id===1,labFrozen:id===1};
 });
}
function expNear(p,q,r=100){return !!(p&&q&&(p.x-q.x)**2+(p.y-q.y)**2<=r*r)}
function expParty(players,p,q){if(!p||!p.online||p.hp<=0||p.knocked||p.finalDead||p.background||p.paused||!expNear(p,q))return false;const live=[...players.values()].filter(a=>a.online&&!a.finalDead&&(a.hp>0||a.knocked));return live.length>0&&live.every(a=>a.hp>0&&!a.knocked&&!a.background&&!a.paused&&expNear(a,q,175))}
function expAllowed(z,players,p,id,mobs){if(!z||!Number.isInteger(id)||id<0||id>2||id===z.id)return false;if(z.id)return id===0&&!!(z.done&(1<<z.id))&&expParty(players,p,EXP_EXIT);return !(z.done&(1<<id))&&(id===1?z.key:z.rope)&&expParty(players,p,z.portals.find(q=>q.id===id))}
function expPlace(players,point,tick){let i=0;for(const p of players.values()){const a=i++*Math.PI/3;p.x=point.x+Math.cos(a)*28;p.y=point.y+Math.sin(a)*28;p.tx=p.x;p.ty=p.y;p.ax=p.ay=0;p.attack=false;p.dodgeUntil=0;p.reviveTarget='';p.motion=null;p.shield=Math.max(p.shield||0,tick+30);p.arenaBomb=null;p.arenaShuriken=null}}
function expWake(mobs,players){const living=[...players.values()].filter(p=>p.online&&p.hp>0&&!p.knocked);for(const m of mobs)if(m.expSleeping&&m.hp>0&&living.some(p=>expNear(p,m,190))){m.expSleeping=false;m.labFrozen=false}}
function expDrop(z,m,invalid){if(z&&!z.id&&!z.key&&!z.keyDrop&&!invalid&&m.kind==='troll')z.keyDrop={x:m.x,y:m.y}}
function expCollect(z,players){if(!z||z.id||!z.keyDrop)return false;for(const p of players.values())if(p.online&&p.hp>0&&!p.knocked&&!p.paused&&!p.background&&expNear(p,z.keyDrop,32)){z.key=true;z.keyDrop=null;return true}return false}
function expRope(z,e,p){if(!z||z.id||z.rope||!arenaTradeNear(e,p,'guild')||(p.xp||0)<58||(!p.guildUnlocked&&!(p.arenaKeys>0)))return false;if(!p.guildUnlocked){p.arenaKeys--;p.guildUnlocked=true}p.xp-=58;z.rope=true;return true}
function expReward(z,mobs,players){if(!z?.id||(z.done&(1<<z.id))||mobs.some(m=>m.hp>0))return false;z.done|=1<<z.id;for(const p of players.values())if(p.online&&p.hp>0&&!p.knocked&&!p.finalDead){p.arenaShards=Math.min(999,(p.arenaShards||0)+3);p.hp=Math.min(p.maxHp||100,p.hp+25)}return true}
function expPacket(z){return z?[z.id,z.rev,z.done,z.key?1:0,z.rope?1:0,z.keyDrop?[Math.round(z.keyDrop.x),Math.round(z.keyDrop.y)]:null]:[0,0,0,0,0,null]}
// END V196 EXPEDITIONS
// BEGIN V197 RULESETS
const arenaRuleMode=v=>['night','rush','campaign'].includes(v)?v:'normal';
const ARENA_CAMPAIGN=[['Prva straža',3],['Opsada',6],['Poslednja odbrana',10]];
function arenaRuleInit(world,value){
 const mode=arenaRuleMode(value),towers=[],lights=(world.classicProps||[]).filter(o=>o.type==='torch').map(o=>[o.x,o.y]);
 if(mode==='night')for(let j=0;j<320&&towers.length<3;j++){
  const a=(j+31)*2.39996323,d=620+(j%12)*112,x=Math.round(world.w/2+Math.cos(a)*d),y=Math.round(world.h/2+Math.sin(a)*d);
  if(x<130||y<130||x>world.w-130||y>world.h-130||!arenaAcidClear(world,x,y,x,y,62)||towers.some(t=>(t.x-x)**2+(t.y-y)**2<650**2)||lights.some(t=>(t[0]-x)**2+(t[1]-y)**2<290**2))continue;
  towers.push({id:towers.length+1,x,y,hp:180,kind:'nightTower'});
 }
 return {mode,elapsed:0,victory:false,towers,lights,stage:0,cleared:0};
}
function arenaRuleDark(r){return r?.mode==='night'&&r.elapsed%3600>=2400}
function arenaRuleDamage(r,p,m,d,inside){return inside||!arenaRuleDark(r)||(p.x-m.x)**2+(p.y-m.y)**2<68**2||r.lights.some(t=>(t[0]-m.x)**2+(t[1]-m.y)**2<235**2)?d:1}
function arenaRuleCount(r,n){return r?.mode==='rush'?Math.min(20000,Math.ceil(n*1.28)):n}
function arenaRuleRest(r,n){return r?.mode==='rush'?Math.round(n*.72):n}
function arenaRuleWin(r,players,amount){if(!r||r.victory)return false;r.victory=true;for(const p of players.values())if(p.online&&p.hp>0&&!p.knocked&&!p.finalDead)p.arenaShards=Math.min(999,(p.arenaShards||0)+amount);return true}
function arenaRuleTower(r,world,p,d,reach,players){
 if(r?.mode!=='night'||r.victory||p.hp<=0||p.knocked||p.finalDead||p.paused||p.background)return null;
 let t=null,best=(reach+38)**2;for(const a of r.towers){const dist=(p.x-a.x)**2+(p.y-a.y)**2;if(a.hp>0&&dist<best&&arenaAcidClear(world,p.x,p.y,a.x,a.y,3)){t=a;best=dist}}
 if(!t)return null;t.hp=Math.max(0,t.hp-Math.max(1,Math.round(arenaRuleDamage(r,p,t,d,false))));if(r.towers.length===3&&r.towers.every(a=>a.hp===0))arenaRuleWin(r,players,2);return t
}
function arenaRuleWave(r,wave,players){
 if(r?.mode!=='campaign'||r.victory||wave<=r.cleared)return false;
 r.cleared=wave;while(r.stage<ARENA_CAMPAIGN.length&&wave>=ARENA_CAMPAIGN[r.stage][1])r.stage++;
 return r.stage===ARENA_CAMPAIGN.length&&arenaRuleWin(r,players,5)
}
function arenaRulePacket(r){return r?[r.mode,r.elapsed,r.victory?1:0,r.towers.map(t=>[t.id,t.x,t.y,t.hp]),r.stage,r.cleared]:['normal',0,0,[],0,0]}
function arenaRuleRestore(r,v){if(!r||!v||r.mode!==v.mode)return;r.elapsed=Math.max(0,Math.floor(Number(v.elapsed)||0));r.victory=!!v.victory;r.stage=Math.min(3,Math.max(0,Math.floor(Number(v.stage)||0)));r.cleared=Math.max(0,Math.floor(Number(v.cleared)||0));for(const t of r.towers){const old=v.towers?.find(a=>a.id===t.id);if(old)t.hp=Math.max(0,Math.min(180,Number(old.hp)||0))}}
// END V197 RULESETS
// V199: identical combat rules for melee, spells, passives and evolved weapons.
function arenaCombatDamage(rule,world,inside,p,m,d){
 if(inside&&!arenaAcidClear(world,p.x,p.y,m.x,m.y,3))return 0;
 return arenaRuleDamage(rule,p,m,d,inside)
}

// BEGIN V198 CAVE SPECIALS
function caveSpecialStep(m,p,world,tick){
 if(m.kind==='caveThief'){
  if(!m.escapeAt&&expNear(p,m,520))m.escapeAt=tick+1350;
  if(m.escapeAt&&tick>=m.escapeAt){m.escaped=true;m.hp=0;m.wormHold=true;return true}
  if(!m.escapeAt){m.wormHold=true;return true}
  let a=Math.atan2(m.y-p.y,m.x-p.x),d=(m.moveSpeed||120)*.82*(m.spellSlowFactor||1)/30;
  for(const turn of [0,.55,-.55,1.15,-1.15,2,-2]){const x=m.x+Math.cos(a+turn)*d,y=m.y+Math.sin(a+turn)*d;if(arenaAcidClear(world,m.x,m.y,x,y,m.bodyRadius||14)){m.x=x;m.y=y;m.heavyAngle=a+turn;m.heavyGait=(m.heavyGait||0)+d/9;break}}
  m.wormHold=true;return true
 }
 if(m.kind==='caveSpider'&&!m.heavyCast&&tick>=(m.webAt||0)&&expNear(p,m,155)){
  m.webAt=tick+225;m.heavyCast={kind:2,x:m.x,y:m.y,r:155,start:tick,end:tick+30,phase:1};m.wormHold=true;return true
 }
 return false
}
// END V198 CAVE SPECIALS
// BEGIN V198 ACCOUNT REWARD PACKET
function arenaRewardCalendar(cache,ms){
 if(cache&&ms>=cache.at&&ms-cache.at<45000)return cache;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms)),num=k=>Number(parts.find(p=>p.type===k)?.value)||1,y=num('year'),m=num('month'),d=num('day'),day=String(y)+String(m).padStart(2,'0')+String(d).padStart(2,'0'),mon=new Date(Date.UTC(y,m-1,d));
 mon.setUTCDate(mon.getUTCDate()-(mon.getUTCDay()+6)%7);const [daily,weekly]=arenaQuestPeriod(ms);return {at:ms,day,week:mon.toISOString().slice(0,10),daily,weekly}
}
function arenaAccountPacket(e,calendar){
 if(!e||e.invalid||!calendar)return null;
 const d=(e[calendar.daily[1]]||0)>=calendar.daily[2],w=(e[calendar.weekly[1]]||0)>=calendar.weekly[2];
 return [arenaRunMask(e),(d?1:0)|(w?2:0),calendar.day,calendar.week]
}
// END V198 ACCOUNT REWARD PACKET






// END V192 Loadout
// V192 original weapon drops: bounded world pool, sole owner accepts in reach.
const ARENA_WORLD_WEAPONS=['rapier','glaive','greataxe','scimitar','morningstar','longsword','falchion'];
function arenaMaybeWeaponDrop(drops,m,wave,tick,id){
 if(!m||m.hp>0||m.weaponDropChecked||drops.length>=6)return false;
 m.weaponDropChecked=true;if(m.kind==='caveSpider'||m.kind==='caveThief'){drops.push({id,x:m.x,y:m.y,weapon:m.kind==='caveSpider'?'axe':'sword'});return true}const h=(Math.imul((id+1)^((m.id+1)*313),1664525)+Math.imul(tick+wave,1013904223))>>>0,roll=(h%10000)/10000;
 const boss=m.kind==='boss'||m.kind==='werewolfAlpha',troll=m.kind==='troll',chance=boss?1:troll?.11:wave>=3?(m.kind==='elephant'?.24:.014):0;
 if(roll>=chance)return false;
 const weapon=troll?['trollclub','trollmaul'][(h>>>16)%2]:ARENA_WORLD_WEAPONS[(h>>>16)%ARENA_WORLD_WEAPONS.length];
 drops.push({id,x:m.x,y:m.y,weapon});return true;
}
function arenaTakeWeapon(drops,p,id){
 if(!p||p.hp<=0||p.knocked||p.finalDead||!Number.isSafeInteger(id))return false;
 const i=drops.findIndex(d=>d.id===id);if(i<0)return false;const d=drops[i];
 if(!ARENA_CLASSIC_WEAPONS[d.weapon]||d.weapon===p.activeWeapon||(p.x-d.x)**2+(p.y-d.y)**2>135**2)return false;
 p.secondaryWeapon=ARENA_CLASSIC_WEAPONS[p.activeWeapon]?p.activeWeapon:'sword';p.activeWeapon=d.weapon;drops.splice(i,1);return true;
}
// END V192 Weapon loot
// V192 Classic dodge: fixed ticks, no client-controlled damage or immunity.
function arenaDodge(p,tick,x,y){
 if(!p||p.hp<=0||p.knocked||p.finalDead||p.paused||p.background||tick<(p.dodgeReady||0)||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1)return false;
 const mag=Math.hypot(x,y);if(mag<=.2)return false;
 p.dodgeX=x/mag;p.dodgeY=y/mag;p.dodgeUntil=tick+8;p.dodgeReady=tick+84;p.shield=Math.max(p.shield||0,tick+9);return true;
}
function arenaDodgeVector(p,tick,x,y){
 return tick<(p.dodgeUntil||0)?{x:p.dodgeX||0,y:p.dodgeY||0,speed:3.2}:{x,y,speed:1};
}
// END V192 Dodge
// V191 Classic heavy enemies, shared deterministic solo/relay calendar.
const ARENA_KINDS=['goblin','troll','worm','elephant','rotfiend','crawler','skeleton','brute','boss','werewolf','werewolfAlpha','caveSpider','caveThief'];
const arenaSpecial=m=>ARENA_KINDS.indexOf(m.kind)>=3;
function arenaHeavyStats(kind,wave){
 const n=Math.max(0,wave-1),spec={
 elephant:[240,12,75,1.2,28],rotfiend:[620,45,60,.5,48],
 crawler:[48,7,103,2,15],skeleton:[67,8,95,2,15],brute:[155,12,82,1.5,22],
 boss:[450,38,85,.8,52],werewolf:[130,10,120,1.1,19],werewolfAlpha:[1120,30,95,.7,65],caveSpider:[341,26,67,1.2,27],caveThief:[48,9,121,1.1,14]}[kind];
 if(!spec)return null;const [base,growth,speed,rate,bodyRadius]=spec,hp=base+n*growth;
 return {kind,hp,maxHp:hp,moveSpeed:Math.min(kind==='werewolf'?165:kind==='rotfiend'?90:145,speed+n*rate),bodyRadius};
}
function arenaHeavyWave(mobs,wave,batch,world){
 const clear=(m,r)=>arenaAcidClear(world,m.x,m.y,m.x,m.y,r);
 for(const m of mobs){
  if(m.kind==='troll'||m.kind==='worm')continue;
  const roll=((m.id*37+batch*7)%100);
  const kind=wave>=8&&roll<14?'elephant':wave>=5&&roll<28?'brute':wave>=2&&roll<24?'brute':roll<49?'crawler':roll<72?'skeleton':null;
  const stat=arenaHeavyStats(kind,wave);if(stat&&clear(m,stat.bodyRadius))Object.assign(m,stat);
 }
 const replace=kind=>{const stat=arenaHeavyStats(kind,wave),m=mobs.find(m=>!['troll','rotfiend','boss','werewolfAlpha','werewolf'].includes(m.kind)&&clear(m,stat.bodyRadius));if(m)Object.assign(m,stat);return m};
 if(batch===0&&(wave===20||wave===30))replace('rotfiend');
 if(batch===0&&wave===40){replace('werewolfAlpha');for(let i=0;i<4;i++)replace('werewolf')}
 if(wave>40)for(const m of mobs)if(['crawler','skeleton','goblin'].includes(m.kind)&&(m.id*17+batch)%100<9&&clear(m,19))Object.assign(m,arenaHeavyStats('werewolf',wave));
 return mobs;
}
function stepArenaHeavy(mobs,players,world,tick,wave,damage){
 const alive=[...players.values()].filter(p=>p.online&&p.hp>0&&!p.knocked&&!p.finalDead);
 for(const m of mobs){
  if(!arenaSpecial(m)||m.hp<=0||m.labFrozen)continue;
  let p=alive.find(p=>p.id===m.targetId);if(!p){let d=Infinity;for(const q of alive){let n=(q.x-m.x)**2+(q.y-m.y)**2;if(n<d){p=q;d=n}}}
  m.wormHold=false;if(!p){m.heavyCast=null;continue}if(caveSpecialStep(m,p,world,tick))continue;
  const dx=p.x-m.x,dy=p.y-m.y,d2=dx*dx+dy*dy,boss=['rotfiend','boss','werewolfAlpha'].includes(m.kind),wolf=m.kind==='werewolf'||m.kind==='werewolfAlpha';
  const phase=boss?(m.hp<=m.maxHp*.3?3:m.hp<=m.maxHp*.65?2:1):1;m.heavyPhase=phase;
  if(boss&&phase===3&&!m.heavyEnraged){m.heavyEnraged=true;m.moveSpeed=Math.min(165,m.moveSpeed*1.25)}
  if(m.heavyCast){
   m.wormHold=true;const c=m.heavyCast;if(tick<c.end)continue;
   for(const a of alive){if(a.hp<=0||a.knocked)continue;const x=a.x-c.x,y=a.y-c.y;
    if(c.kind===1){const u=Math.cos(c.angle),v=Math.sin(c.angle),along=x*u+y*v,across=Math.abs(-x*v+y*u);if(along>=0&&along<=c.length&&across<=c.r+3)damage(a,12+5*c.phase)}
    else if(c.kind===2){if(x*x+y*y<=(c.r+3)**2)a.enemySlowUntil=Math.max(a.enemySlowUntil||0,tick+(m.kind==='caveSpider'?48:77))}
    else if(c.kind===3){if(a.id===c.victim&&x*x+y*y<=(c.r+3)**2&&arenaAcidClear(world,c.x,c.y,a.x,a.y,8)){const angle=Math.atan2(y,x)-c.angle;if(Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=1.2)damage(a,Math.round((m.kind==='werewolfAlpha'?19:12)*(1+Math.min(1,wave*.015))))}}
    else if(x*x+y*y<=(c.r+3)**2)damage(a,10+5*c.phase);
   }
   m.heavyCast=null;if(c.kind!==2)m.attackTick=tick;if(c.kind!==3)m.heavyNext=tick+(phase===3?132:phase===2?189:246);continue;
  }
  m.heavyAngle=Math.atan2(dy,dx);
  if(boss&&m.heavyNext===undefined)m.heavyNext=tick+114;
  if(m.kind==='werewolf'&&m.heavyNext===undefined)m.heavyNext=tick+174+(m.id%10)*9;
  if((boss||m.kind==='werewolf')&&tick>=m.heavyNext&&d2<(m.kind==='werewolf'?440:700)**2){
   if(m.kind==='boss')m.heavyCast={kind:1,x:m.x,y:m.y,r:phase===3?56:phase===2?47:39,length:phase===3?475:phase===2?425:380,angle:m.heavyAngle,start:tick,end:tick+(phase===3?33:phase===2?40:47),phase};
   else if(m.kind==='werewolfAlpha')m.heavyCast={kind:2,x:Math.round(p.x),y:Math.round(p.y),r:phase===3?163:phase===2?145:124,start:tick,end:tick+(phase===3?33:phase===2?39:47),phase};
   else if(m.kind==='werewolf'){m.heavyRageUntil=tick+112;m.heavyNext=tick+270+(m.id%9)*13;m.heavyCast={kind:2,x:m.x,y:m.y,r:0,start:tick,end:tick+28,phase:1};}
   else m.heavyCast={kind:0,x:Math.round(p.x),y:Math.round(p.y),r:phase===3?150:phase===2?131:112,start:tick,end:tick+(phase===3?30:phase===2?38:44),phase};
   m.wormHold=true;continue;
  }
  const range={boss:142,rotfiend:100,elephant:78,crawler:66,skeleton:66,brute:91,werewolf:53,werewolfAlpha:110,caveSpider:80}[m.kind]||78;
  if(d2<=range**2&&arenaAcidClear(world,m.x,m.y,p.x,p.y,8)){
   m.wormHold=true;if(tick<(m.attackAt||0))continue;
   m.attackAt=tick+({boss:38,rotfiend:63,brute:41,werewolf:tick<(m.heavyRageUntil||0)?28:41,werewolfAlpha:44}[m.kind]||37);
   m.attackTick=tick;
   if(wolf){m.heavyCast={kind:3,x:m.x,y:m.y,r:range,angle:m.heavyAngle,victim:p.id,start:tick,end:tick+(boss?13:10),phase};continue}
   damage(p,Math.min(60,Math.round(({boss:23,rotfiend:19,elephant:17,brute:15,crawler:8,skeleton:8,caveSpider:14}[m.kind]||8)*(1+.035*(wave-1))*(boss&&phase===3?1.16:1))));
  }
 }
}
// END V191 Classic heavy enemies
// V192 Classic boss summons, one pack per phase, bounded by the active horde cap.
function arenaBossSummons(mobs,players,world,tick,wave){
 let added=0,nextId=Math.max(160,...mobs.filter(m=>m.id<=255).map(m=>m.id),...mobs.map(m=>m.summonMax||0))+1;
 let alive=mobs.filter(m=>m.hp>0).length;
 const bosses=mobs.filter(m=>m.hp>0&&!m.labFrozen&&['boss','rotfiend','werewolfAlpha'].includes(m.kind));
 for(const boss of bosses){
  const phase=boss.hp<=boss.maxHp*.3?3:boss.hp<=boss.maxHp*.65?2:1;
  if(phase>=2&&!((boss.summonBits||0)&(1<<phase))){
   boss.summonBits=(boss.summonBits||0)|(1<<phase);boss.summonPending=(boss.summonPending||0)+(boss.kind==='werewolfAlpha'?(phase===3?3:2):(phase===3?4:3));
  }
  if(!boss.summonPending||alive>=160||nextId>255||tick<(boss.summonRetry||0))continue;
  boss.summonRetry=tick+12;
  for(let attempt=0;attempt<18&&boss.summonPending>0&&alive<160&&nextId<=255;attempt++){
   const k=boss.kind==='werewolfAlpha'?'werewolf':boss.kind==='rotfiend'?(nextId%3===0?'goblin':'crawler'):(nextId%2?'skeleton':'goblin');
   const stat=arenaHeavyStats(k,wave)||{kind:'goblin',hp:Math.min(420,35+(wave-1)*9),maxHp:Math.min(420,35+(wave-1)*9),moveSpeed:Math.min(145,98+(wave-1)*3.4),bodyRadius:14};
   const ang=(attempt+nextId)*2.39996323,dist=112+(attempt%4)*25,x=Math.round(boss.x+Math.cos(ang)*dist),y=Math.round(boss.y+Math.sin(ang)*dist),radius=stat.bodyRadius;
   if(!arenaAcidClear(world,x,y,x,y,radius+2)||mobs.some(m=>m.hp>0&&(m.x-x)**2+(m.y-y)**2<((m.bodyRadius||14)+radius+12)**2)||[...players.values()].some(p=>p.online&&p.hp>0&&(p.x-x)**2+(p.y-y)**2<90**2))continue;
   if(mobs.length>=160){const dead=mobs.findIndex(m=>m.hp<=0);if(dead<0)break;mobs.splice(dead,1)}
   const id=nextId++;boss.summonMax=id;boss.summonPending--;alive++;added++;
   mobs.push({...stat,id,x,y,sx:x,sy:y,prevX:x,prevY:y,vx:0,vy:0,attackAt:tick+24,attackTick:-100,hitTick:-100,targetId:boss.targetId||'',retargetAt:0,deadUntil:0});
  }
 }
 return added;
}
// END V192 Boss summons
// V192 Matriarch is triggered by party character level, not wave number.
function arenaLevelBoss(mobs,players,world,wave,tick,claimed){
 if(tick%15!==0||mobs.some(m=>m.kind==='boss'&&m.hp>0)||mobs.filter(m=>m.hp>0).length>=160)return 0;
 const living=[...players.values()].filter(p=>p.online&&!p.knocked&&!p.finalDead&&p.hp>0);
 if(!living.length)return 0;
 const maxLevel=Math.min(100,Math.max(...living.map(p=>p.level||1))),level=Array.from({length:10},(_,i)=>(i+1)*10).find(v=>v<=maxLevel&&!claimed.includes(v));
 if(!level)return 0;
 const p=living.reduce((a,b)=>(a.level||1)>=(b.level||1)?a:b),stat=arenaHeavyStats('boss',Math.max(level,wave)),radius=stat.bodyRadius;
 for(let i=0;i<56;i++){
  const a=(i+level)*2.39996323,d=480+(i%5)*45,x=Math.round(p.x+Math.cos(a)*d),y=Math.round(p.y+Math.sin(a)*d);
  if(!arenaAcidClear(world,x,y,x,y,radius+2)||living.some(q=>(q.x-x)**2+(q.y-y)**2<380**2)||mobs.some(m=>m.hp>0&&(m.x-x)**2+(m.y-y)**2<((m.bodyRadius||14)+radius+12)**2))continue;
  if(mobs.length>=160){const dead=mobs.findIndex(m=>m.hp<=0);if(dead<0)return 0;mobs.splice(dead,1)}
  mobs.push({...stat,id:256+level/10,x,y,sx:x,sy:y,prevX:x,prevY:y,vx:0,vy:0,attackAt:tick+30,attackTick:-100,hitTick:-100,targetId:p.id,retargetAt:0,deadUntil:0,heavyNext:tick+114,levelBoss:level});
  claimed.push(level);return level;
 }
 return 0;
}
// END V192 Level boss


const labDefaultCount=wave=>100+Math.max(0,wave-1)*20;
const arenaMobSpeed=(wave,id)=>Math.min(145,98+Math.max(0,wave-1)*3.4+(id%5)*4+(id%7===0?12:0));
// Matches Classic slow XP curve. Only RUN EXP is awarded: no account/paid XP.
const xpNeeded=(level)=>{let v=160;for(let n=1;n<Math.min(level,100);n++)v=Math.round(v*1.12+18);return v};
const XP_CAP=160;
const el=id=>document.getElementById(id);
let magicSupported=false,spellSlot=0,spellSeq=0,spellView=null,spellFx=[],spellSeen=new Map(),spellAim=null,spellHudAt=0,spellPendingAt=0;
function resetArenaMagic(){magicSupported=false;spellSeq=0;spellView=null;spellFx=[];spellSeen.clear();spellAim=null;spellHudAt=spellPendingAt=0;if(el('ns189Picker'))el('ns189Picker').hidden=true;if(el('ns189Magic'))el('ns189Magic').hidden=true}
function arenaMagicAvailable(){return N.phase==='running'&&(N.solo||magicSupported)&&N.me?.hp>0&&!N.me.knocked&&!N.paused&&el('ns158Menu')?.hidden!==false&&!LAB_PAUSE.paused&&!(N.solo?N.soloChoice||N.soloState!=='play':N.choice||N.waveState!=='play')}
function magicPoint(clientX,clientY){const r=el('ns140Canvas').getBoundingClientRect(),z=clamp(Math.max(r.width/750,r.height/760),.7,1.45);return{x:N.me.x+(clientX-r.left-r.width/2)/z,y:N.me.y+(clientY-r.top-r.height/2)/z}}
function spellTarget(slot){const s=ARENA_SPELLS[slot],p=N.me;if(s.heal)return{x:p.x,y:p.y};let best=null,dist=Math.min(250,s.range)**2;for(const m of (N.solo?N.soloMobs:N.mpMobs)){if(m.hp<=0)continue;const d=(m.x-p.x)**2+(m.y-p.y)**2;if(d<dist){best=m;dist=d}}const angle=p.facingAngle??p.attackAngle??0;return best?{x:best.x,y:best.y}:{x:p.x+Math.cos(angle)*105,y:p.y+Math.sin(angle)*105}}
function showArenaSpell(event){if(!Array.isArray(event)||event.length!==5||!Number.isSafeInteger(event[0])||spellSeen.has(event[0])||!ARENA_SPELLS[event[1]]||!event.slice(2).every(Number.isFinite))return;spellSeen.set(event[0],event[4]);for(const [id,t] of spellSeen)if(event[4]-t>120)spellSeen.delete(id);spellFx.push({event,at:performance.now()});if(spellFx.length>18)spellFx.shift();const me=N.me;if(me&&(event[2]-me.x)**2+(event[3]-me.y)**2<640**2)B().arenaSpellSound?.(ARENA_SPELLS[event[1]].id,event[2],event[3],me)}
function requestArenaSpell(slot,point){if(!arenaMagicAvailable()||!ARENA_SPELLS[slot])return false;const p=N.me,s=ARENA_SPELLS[slot],state=N.solo?arenaSpellState(p,N.soloTick):spellView;if(!state||state[0]<s.cost*10||state[2][slot]>0)return false;const q=point||spellTarget(slot);if(point&&(q.x<30||q.y<30||q.x>N.world.w-30||q.y>N.world.h-30))return false;const x=Math.round(clamp(q.x,30,N.world.w-30)),y=Math.round(clamp(q.y,30,N.world.h-30));if((x-p.x)**2+(y-p.y)**2>s.range**2)return false;if(N.solo){const e=arenaSpellCast({p,players:N.players,mobs:N.soloMobs,world:N.world,tick:N.soloTick,cls:localArenaLook().heroClass,slot,x,y,damageRule:soloDamageRule,clearPath:N.expedition?.id?(a,b)=>arenaAcidClear(N.world,a.x,a.y,b.x,b.y,3):undefined,kill:m=>{m.deadUntil=N.soloTick+105;N.soloKills++;p.kills++;spawnSoloXpCrystal(m)}});if(e){showArenaSpell(e);spellHudAt=0;return true}return false}if(N.ws?.readyState!==1||N.ws.bufferedAmount>=4000||performance.now()-spellPendingAt<170)return false;spellPendingAt=performance.now();N.ws.send(JSON.stringify({t:'spell',seq:++spellSeq,slot,x,y}));return true}
function refreshMagicHud(now){const dock=el('ns189Magic');if(!dock)return;const enabled=arenaMagicAvailable();if(dock.hidden===enabled)dock.hidden=!enabled;if(!enabled){spellAim=null;el('ns189Picker').hidden=true;return}if(now-spellHudAt<140)return;spellHudAt=now;const p=N.me,state=N.solo?arenaSpellState(p,N.soloTick):spellView;if(!state){el('ns189Cast').disabled=true;return}const s=ARENA_SPELLS[spellSlot],mana=state[0]/10,remaining=state[2][spellSlot]/30,b=el('ns189Cast');el('ns189Mana').textContent=Math.floor(mana)+' / '+state[1]+' MP';el('ns189ManaFill').style.width=Math.min(100,mana/state[1]*100)+'%';b.textContent=s.icon+' '+s.sr+(remaining>0?' · '+Math.ceil(remaining)+'s':' · '+s.cost+' MP');b.disabled=mana<s.cost||remaining>0;b.style.borderColor=s.color;const picker=el('ns189Picker');if(!picker.hidden&&picker.dataset.slot!==String(spellSlot)){picker.dataset.slot=String(spellSlot);picker.querySelectorAll('button').forEach((q,i)=>q.setAttribute('aria-pressed',String(i===spellSlot)))}}
function mountArenaMagic(root,style){style.textContent+='#ns189Magic{position:absolute;left:calc(10px + env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));z-index:5;width:min(205px,42vw);font:700 11px system-ui;color:#e3f4ff;background:#152a35e8;border:1px solid #7196bf;border-radius:11px;padding:5px;touch-action:none}#ns189Magic[hidden],#ns189Picker[hidden]{display:none!important}#ns189Magic button{background:#243d50;color:#e8f6ff;border:1px solid #7698b8;border-radius:7px;min-height:34px;font:700 11px system-ui;touch-action:none}#ns189Magic button:disabled{opacity:.52}#ns189ManaTrack{height:5px;background:#14202f;border-radius:5px;overflow:hidden;margin:3px 0}#ns189ManaFill{height:100%;background:#58abeb}#ns189CastRow{display:flex;gap:4px}#ns189Cast{flex:1}#ns189Picker{position:absolute;bottom:100%;left:0;width:min(280px,75vw);display:grid;grid-template-columns:repeat(2,1fr);gap:4px;padding:6px;background:#142933f5;border:1px solid #83a1bc;border-radius:9px}#ns189Picker button[aria-pressed=true]{border-color:#ffe1a2;background:#3e4b5d}';const dock=document.createElement('div');dock.id='ns189Magic';dock.hidden=true;dock.innerHTML='<span id="ns189Mana">0 MP</span><div id="ns189ManaTrack"><div id="ns189ManaFill"></div></div><div id="ns189CastRow"><button id="ns189Cast" type="button" aria-label="Baci magiju">✦ Iskra</button><button id="ns189Swap" type="button" aria-label="Izaberi magiju">⇄</button></div><div id="ns189Picker" hidden></div>';root.append(dock);const picker=el('ns189Picker');for(const [i,s] of ARENA_SPELLS.entries()){const b=document.createElement('button');b.type='button';b.textContent=s.icon+' '+s.sr+' · '+s.cost+' MP';b.onclick=()=>{spellSlot=i;picker.hidden=true;spellHudAt=0;refreshMagicHud(performance.now())};picker.append(b)}el('ns189Swap').onclick=()=>{picker.hidden=!picker.hidden;spellHudAt=0;refreshMagicHud(performance.now())};const btn=el('ns189Cast');btn.addEventListener('pointerdown',e=>{if(!arenaMagicAvailable()||btn.disabled||e.button>0)return;e.preventDefault();e.stopPropagation();A()?.unlock();B().unlockSound?.();spellAim={id:e.pointerId,slot:spellSlot,x:e.clientX,y:e.clientY,moved:false,point:null};try{btn.setPointerCapture(e.pointerId)}catch{}});btn.addEventListener('pointermove',e=>{if(spellAim?.id!==e.pointerId)return;spellAim.moved=spellAim.moved||Math.hypot(e.clientX-spellAim.x,e.clientY-spellAim.y)>12;if(spellAim.moved)spellAim.point=magicPoint(e.clientX,e.clientY)});btn.addEventListener('pointerup',e=>{if(spellAim?.id!==e.pointerId)return;const a=spellAim;spellAim=null;requestArenaSpell(a.slot,a.moved?magicPoint(e.clientX,e.clientY):null)});for(const name of ['pointercancel','lostpointercapture'])btn.addEventListener(name,()=>{spellAim=null});btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();requestArenaSpell(spellSlot)}})}
function drawArenaMagic(g,now,visible){if(spellAim?.point&&N.me){const p=spellAim.point,s=ARENA_SPELLS[spellAim.slot],valid=(p.x-N.me.x)**2+(p.y-N.me.y)**2<=s.range**2;g.save();g.strokeStyle=valid?s.color:'#f87878';g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,s.radius,0,Math.PI*2);g.stroke();g.restore()}if(!spellFx.length)return;spellFx=spellFx.filter(q=>now-q.at<720);for(const q of spellFx){const [id,slot,x,y]=q.event,s=ARENA_SPELLS[slot];if(x+s.radius<visible.left||x-s.radius>visible.right||y+s.radius<visible.top||y-s.radius>visible.bottom)continue;const life=1-clamp((now-q.at)/720,0,1);g.save();g.translate(x,y);g.globalAlpha=life;const classicDraw=B().arenaSpellDraw;if(classicDraw)classicDraw(g,{id,value:{id:s.id,radius:s.radius}},life);else{g.strokeStyle=s.color;g.lineWidth=2;g.beginPath();g.arc(0,0,s.radius*(1-life*.8),0,Math.PI*2);g.stroke()}g.restore()}}

function ui(){
 if(el('ns140Root'))return;
 const style=document.createElement('style');
 style.textContent='#ns140Root{position:fixed;inset:0;z-index:100000;background:#142c26;color:#f5e6ba;font-family:system-ui;touch-action:none}'+
 '#ns140Root[hidden]{display:none!important}#ns140Canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}'+
 '#ns140Bar{position:absolute;top:max(9px,env(safe-area-inset-top));left:9px;right:9px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;background:#122922e9;border:1px solid #96b8a2;border-radius:10px;padding:9px;font-size:12px}'+
 '#ns140Stats{font:10px monospace;color:#b8d5c6}#ns140Close{background:#714837;color:white;border:1px solid #e9b69a;padding:7px;border-radius:7px}'+
 '#ns140Retry{background:#446447;color:#fff3d9;border:1px solid #d5bf83;border-radius:7px;padding:7px;font-weight:800}#ns140Retry[hidden]{display:none!important}'+
 '#ns140Pad{position:fixed;left:0;top:0;width:112px;height:112px;display:none;transform:translate(-50%,-50%);pointer-events:none;touch-action:none;z-index:4;border:2px solid #d9eee096;background:radial-gradient(circle,#9bccaa26,#1a413e77);border-radius:50%;box-shadow:inset 0 0 23px #061a2188}'+
 '#ns168XpHud{position:absolute;top:57px;left:12px;width:min(235px,53vw);padding:5px 8px;background:#132e30e8;border:1px solid #6cbad0a3;border-radius:10px;pointer-events:none;color:#b9e8fa;font:800 10px system-ui}#ns168XpHud[hidden]{display:none!important}#ns168XpTrack{height:7px;border-radius:8px;margin-top:4px;overflow:hidden;background:#152c3e}#ns168XpFill{height:100%;width:0;background:linear-gradient(90deg,#2388bc,#80e5ff);transition:width .12s linear}'+
 '#ns152Hud{position:absolute;right:12px;top:108px;background:#122b25de;border:1px solid #7d9c84;border-radius:11px;padding:9px 12px;text-align:right;pointer-events:none;min-width:106px}'+
 '#ns152Hud strong{font-size:14px;display:block;color:#fce7a9}#ns152Hud small{display:block;color:#c9dccc;font-size:10px}'+
 '#ns152Choice[hidden]{display:none!important}#ns152Choice{position:absolute;inset:0;background:#071c19b0;display:flex;align-items:center;justify-content:center;padding:18px;pointer-events:auto}'+
 '#ns152ChoiceCard{max-width:360px;width:100%;border:2px solid #ab9068;border-radius:14px;background:#1e352b;box-shadow:0 12px 32px #06100da0;padding:17px;text-align:center}'+
 '#ns152ChoiceCard h3{font-size:17px;margin:6px 0;color:#ffe0a0}#ns152ChoiceCard p{font-size:13px;color:#e5dfce;line-height:1.4}'+
 '#ns152Choices{display:grid;gap:9px;margin:12px 0}#ns152Choices button{padding:11px;border:1px solid #a9ae88;background:#38594b;color:#fff7d9;border-radius:9px;font-weight:800}'+
 '#ns152Choices button[hidden]{display:none}#ns152Timer{font-weight:900;color:#f6dc94;font-size:18px}'+
 '#ns190Revive{position:absolute;z-index:7;right:12px;bottom:calc(105px + env(safe-area-inset-bottom));max-width:65vw;padding:12px 16px;background:#23594a;color:#fff;border:1px solid #b5e5ba;border-radius:11px;touch-action:none;font-weight:800}#ns190Revive[hidden]{display:none!important}'+
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
 '#ns192Dodge{position:absolute;right:calc(12px + env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom));width:74px;height:58px;border-radius:16px;background:#284d46e8;border:1px solid #abc6a6;color:#fff0c9;font:bold 12px system-ui;z-index:6;touch-action:none}#ns192Dodge:disabled{opacity:.55}#ns192Dodge[hidden]{display:none}'+
 '#ns192MapBtn{position:absolute;right:12px;top:172px;z-index:5;width:90px;height:93px;padding:3px;background:#112b25e8;border:1px solid #8da891;border-radius:8px;color:#fff3cb;font:bold 9px system-ui;touch-action:none}#ns192Mini{width:78px;height:72px;display:block;margin:auto}#ns192MapPanel{position:absolute;inset:0;z-index:12;background:#071812eF;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px}#ns192MapPanel[hidden]{display:none!important}#ns192BigMap{width:min(78vw,75dvh);height:min(78vw,75dvh);border:1px solid #94b594;image-rendering:auto}#ns192MapClose{padding:8px 24px;border-radius:8px;border:1px solid #a9c4a4;background:#345d4b;color:white;font-weight:bold}'+
 '#ns192Swap{position:absolute;right:96px;bottom:calc(23px + env(safe-area-inset-bottom));z-index:6;min-height:43px;max-width:132px;background:#294b39e8;border:1px solid #c6b98c;color:#ffeac0;border-radius:9px;font:bold 10px system-ui}#ns192Swap[hidden]{display:none}'+
 '#ns192SOS,#ns192Loot{position:absolute;z-index:8;border:1px solid #bea970;border-radius:9px;background:#503729ee;color:#fff4d1;padding:9px 14px;font:bold 11px system-ui;max-width:72vw}#ns192SOS{left:50%;bottom:25%;transform:translateX(-50%);background:#943f39ee}#ns192Loot{left:50%;bottom:88px;transform:translateX(-50%);white-space:pre-line;text-align:center}#ns192SOS[hidden],#ns192Loot[hidden]{display:none}'+
 '#ns160Open{background:#315b53!important;border-color:#c9d099!important}'+
 '#ns158Menu{max-height:calc(100dvh - 77px);overflow-y:auto;overscroll-behavior:contain}'+
 '#ns163VoiceSettings{display:grid;gap:6px;border:1px solid #5e9d82;padding:8px;border-radius:9px;background:#183b33}'+
 '#ns163VoiceSettings strong{font:800 11px system-ui;color:#c9efcc}'+
 '#ns163VoiceSettings p{margin:0;font:10px/1.3 system-ui;color:#c8dbce}'+
 '#ns163VoiceMic{touch-action:none;user-select:none;-webkit-user-select:none;background:#275a45!important}'+
 '#ns163VoiceMode{font-size:11px}'+
 '@media(max-width:780px){#ns140Bar{flex-wrap:nowrap;min-height:47px;padding:5px 8px}#ns140Status{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}#ns140Stats{max-width:30vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#ns152Music,#ns152Sound,#ns157Pause,#ns140Close{display:none}}'+
 '#ns140Pad.active{display:block}'+
 '#ns140Knob{position:absolute;left:27px;top:27px;width:54px;height:54px;border:2px solid #c3e2d1b8;background:radial-gradient(circle at 34% 27%,#c1e4cfb5,#547c77bd);border-radius:50%;box-shadow:0 4px 11px #081c1a9a;will-change:transform}'+
 '';
 const root=document.createElement('section');root.id='ns140Root';root.hidden=true;
 root.innerHTML='<canvas id="ns140Canvas"></canvas><div id="ns140Bar"><b id="ns140Status">V168 NOVA ZONA</b><span id="ns140Stats"></span><button type="button" id="ns152Music" title="Muzika">♫</button><button type="button" id="ns152Sound" title="Efekti">🔊</button><button type="button" id="ns157Pause" aria-label="Pauza">⏸</button><button type="button" id="ns140Retry" hidden>↻ POKUŠAJ PONOVO</button><button type="button" id="ns140Close">← LOBBY</button><button type="button" id="ns158MenuBtn" aria-controls="ns158Menu" aria-expanded="false">☰ MENI</button></div>'+
 '<div id="ns158Menu" hidden role="group" aria-label="Meni tokom igre"><button id="ns158MenuPause" type="button">⏸ PAUZIRAJ</button><button id="ns158MenuMusic" type="button">♫ MUZIKA</button><button id="ns158MenuSound" type="button">🔊 EFEKTI</button><div id="ns163VoiceSettings"><strong>🎙 GLASOVNI CHAT · MULTIPLAYER</strong><button id="ns163VoiceMode" type="button">🎙 REŽIM: PTT · DRŽI</button><button id="ns163VoiceMic" type="button">🎙 DRŽI DA PRIČAŠ</button><button id="ns163VoiceOff" type="button">🔇 UGASI MIKROFON</button><p id="ns163VoiceHint">Drži dugme ili V · pusti da se utiša. Zvučnik je iznad heroja.</p></div><button id="ns160Open" type="button">🛠 SANDBOX / TEST LAB</button><button id="ns158MenuLeave" class="danger" type="button">← NAPUSTI PARTIJU</button><p>U MP igra teče dok svi povezani igrači ne izglasaju pauzu. Samo host uređuje Sandbox.</p></div>'+
 '<div id="ns155Presence" aria-live="polite"></div><div id="ns157Events" aria-live="polite"></div><div id="ns168XpHud" role="status" aria-label="EXP napredak" hidden><span id="ns168XpText">NIVO 1 · EXP 0/160</span><div id="ns168XpTrack"><div id="ns168XpFill"></div></div></div><div id="ns152Hud"><strong id="ns152Wave">TALAS 1</strong><small id="ns152Remaining">GOBLINI</small></div>'+
 '<button id="ns192MapBtn" type="button" aria-label="Otvori mapu"><canvas id="ns192Mini" width="96" height="96"></canvas>MAPA</button><div id="ns192MapPanel" hidden><canvas id="ns192BigMap" width="420" height="420"></canvas><span style="color:#dbe5cf;font:12px system-ui">Plavo: ti · zeleno: tim · žuto: sanduk · sivo: neistraženo</span><button type="button" id="ns192MapClose">ZATVORI MAPU</button></div>'+
 '<button id="ns192SOS" type="button" hidden>⚑ POŠALJI SOS</button><button id="ns192Loot" type="button" hidden>UZMI ORUŽJE</button>'+
 '<button id="ns192Swap" type="button" hidden>⇄ ORUŽJE</button>'+
 '<button id="ns192Dodge" type="button" hidden>DODGE</button>'+
 '<button id="ns190Revive" type="button" hidden>DRŽI ZA REVIVE</button>'+
 '<div id="ns152Hurt" aria-hidden="true"></div>'+
 '<div id="ns157PauseOverlay" hidden><div id="ns157PauseCard"><h2>⏸ PAUZA</h2><p id="ns157PauseText">Solo je zaustavljen. Pritisni NASTAVI kada želiš.</p><button type="button" id="ns157Resume">▶ NASTAVI</button><button type="button" id="ns157PauseLeave">← NAPUSTI PARTIJU</button></div></div>'+
 '<div id="ns140Pad" aria-hidden="true"><span id="ns140Knob"></span></div>'+
 '<div id="ns152Choice" hidden><div id="ns152ChoiceCard"><h3 id="ns152ChoiceTitle">OTVOREN SANDUK</h3><p id="ns152ChoiceText"></p><div id="ns152Choices"><button data-pick="edge">⚔ OŠTRIJA OŠTRICA · +20% ŠTETE</button><button data-pick="heart">♥ ČUVAROVO SRCE · +25 HP</button><button data-pick="boots">➤ BRŽE ČIZME · +10% BRZINE</button></div><span id="ns152Timer">7 s</span></div></div>';
 document.body.append(style,root);mountArenaMagic(root,style);mountArenaRun(root,style);const eb=document.createElement('button');eb.id='ns196Exp';eb.type='button';eb.hidden=true;eb.style.cssText='position:absolute;z-index:8;left:50%;bottom:75px;transform:translateX(-50%);background:#18352f;color:#ffe9b7;border:1px solid #9dc9ae;border-radius:8px;padding:9px;font:bold 12px system-ui';root.append(eb);
 el('ns192SOS').onclick=()=>{if(N.sosSupported&&N.me?.knocked&&!N.me.sosUsed&&N.ws?.readyState===1){N.ws.send(JSON.stringify({t:'sos'}));el('ns192SOS').disabled=true}};el('ns192Loot').onclick=()=>requestArenaLoot();el('ns192Swap').onclick=()=>requestArenaSwap();el('ns192MapBtn').onclick=()=>setArenaMap(true);el('ns192MapClose').onclick=()=>setArenaMap(false);
 el('ns192Dodge').addEventListener('pointerdown',e=>{e.preventDefault();requestArenaDodge()});
 const reviveButton=el('ns190Revive');
 reviveButton.addEventListener('pointerdown',e=>{const target=nearArenaRevive();if(!target)return;e.preventDefault();N.reviveHeld=target.id;N.reviveAt=0;try{reviveButton.setPointerCapture(e.pointerId)}catch{}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])reviveButton.addEventListener(type,releaseArenaRevive);
 window.addEventListener('blur',releaseArenaRevive);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseArenaRevive()});
 // Lazy-load independent voice client only when entering New Zone.
 if(!window.NS159_VOICE&&!document.getElementById('ns159VoiceScript')){
  const voiceScript=document.createElement('script');voiceScript.id='ns159VoiceScript';
  voiceScript.src='./v159-voice.js?v=166';voiceScript.async=true;
  document.head.append(voiceScript);
 }
 el('ns140Close').onclick=()=>stop(true);
 el('ns157Pause').onclick=()=>toggleArenaPause();
 el('ns157Resume').onclick=()=>toggleArenaPause(false);
 el('ns157PauseLeave').onclick=()=>stop(true);
 const menuButton=el('ns158MenuBtn'),menuPanel=el('ns158Menu');
 menuButton.onclick=()=>{
  if(window.NS160_LAB?.active)window.NS160_LAB.close();
  const opening=menuPanel.hidden;
  if(opening&&N.solo&&!N.paused){
   toggleArenaPause(true);LAB_AUTO_PAUSE=true;
  }else if(!opening&&LAB_AUTO_PAUSE){
   closeArenaMenu();return;
  }
  menuPanel.hidden=!opening;
  menuButton.setAttribute('aria-expanded',String(opening));
  if(opening&&el('ns157PauseOverlay'))el('ns157PauseOverlay').hidden=true;
  el('ns158MenuPause').textContent=N.solo?'▶ NASTAVI':LAB_PAUSE.paused?'▶ NASTAVI SVIMA':'🗳 GLASAJ ZA PAUZU';
  refreshVoiceMenu();
 };
 el('ns158MenuPause').onclick=()=>{
  if(N.solo){closeArenaMenu();if(N.paused)toggleArenaPause(false)}
  else {if(!LAB_SUPPORTED)announceArena('Glasanje zahteva novi V160 relay server');else if(N.ws?.readyState===1)N.ws.send(JSON.stringify({t:LAB_PAUSE.paused?'globalResume':'pauseVote',vote:true}));closeArenaMenu()}
 };
 if(window.NS179_DIAGNOSTICS?.allowed()){
  const diag=document.createElement('button');diag.type='button';diag.textContent='⚙ DEVELOPER DIAGNOSTICS';diag.onclick=()=>window.NS179_DIAGNOSTICS?.open();el('ns158Menu').insertBefore(diag,el('ns158MenuLeave'));
 }
 el('ns160Open').onclick=()=>openSandbox();
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
 const pttMode=el('ns163VoiceMode'),pttMic=el('ns163VoiceMic'),pttOff=el('ns163VoiceOff');
 function refreshVoiceMenu(){
  const voice=window.NS159_VOICE,disabled=N.solo||N.phase==='idle';
  const kind=voice?.mode||'ptt';
  pttMode.textContent=kind==='ptt'?'🎙 REŽIM: PTT · DRŽI':'🎙 REŽIM: TOGGLE · KLIK';
  pttMode.disabled=disabled||!voice;
  pttMic.textContent=kind==='ptt'?(voice?.transmitting?'🟢 GOVORIŠ — PUSTI':'🎙 DRŽI DA PRIČAŠ (V)'):
   (voice?.microphoneOn?'🎙 UGASI MIC':'🎙 UKLJUČI MIC');
  pttMic.disabled=disabled||!voice?.connected;
  pttOff.disabled=disabled||!voice?.microphoneOn;
  el('ns163VoiceHint').textContent=disabled?'Glasovni chat radi u multiplayer Novoj Zoni.':
   !voice?.connected?'Povezujem glasovni server…':
   kind==='ptt'?'Drži na telefonu ili slovo V na PC-ju. Ikonica iznad glave svetli dok govoriš.':
   'Jedan klik uključi mikrofon, sledeći ga isključi. Zvučnik je iznad heroja.';
 }
 pttMode.onclick=()=>{
  const voice=window.NS159_VOICE;if(!voice)return;
  voice.setMode(voice.mode==='ptt'?'toggle':'ptt');refreshVoiceMenu();
 };
 pttOff.onclick=()=>{window.NS159_VOICE?.disableMic();refreshVoiceMenu()};
 window.NS159_VOICE?.bindControl(pttMic);
 window.addEventListener('ns159VoiceReady',()=>{window.NS159_VOICE?.bindControl(pttMic);refreshVoiceMenu()});
 window.addEventListener('nsVoiceChanged',refreshVoiceMenu);
 refreshVoiceMenu();
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
   resetRenderSamples();resetStick();
   if(N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'presence',state:'background'}))}catch{}
   return;
  }
  if(N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'presence',state:'active'}))}catch{}
  if(N.phase==='reconnecting'&&N.match&&N.ticket){
   if(N.retryTimer){clearTimeout(N.retryTimer);N.retryTimer=null}
   if(!N.ws){if(N.lostSince&&Date.now()-N.lostSince>=120000){N.phase='error';status('ISTEKAO ROK ZA POVRATAK · LOBBY')}else connect(N.match,N.id,N.ticket,true)}
  }
 });
 window.addEventListener('keydown',e=>{
  if(N.phase!=='running'||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
  const k=e.key.toLowerCase();
  if(k==='escape'&&!el('ns192MapPanel').hidden){e.preventDefault();setArenaMap(false);return}
  if(k==='escape'&&!el('ns158Menu')?.hidden){e.preventDefault();closeArenaMenu();return}
  if((k==='escape'||k==='p')&&!e.repeat){e.preventDefault();e.stopImmediatePropagation?.();toggleArenaPause();return}
  if(k==='q'&&!e.repeat){e.preventDefault();requestArenaSwap();return}
  if(k==='m'&&!e.repeat){e.preventDefault();setArenaMap(el('ns192MapPanel').hidden);return}
  if(N.paused)return;
  if(k===' '||k==='shift'||k==='k'){e.preventDefault();if(!e.repeat)requestArenaDodge();return}
  if(/^[1-8]$/.test(k)){e.preventDefault();if(!e.repeat){spellSlot=Number(k)-1;spellHudAt=0;requestArenaSpell(spellSlot)}return}
  A()?.unlock();N.keys.add(k);if(k.startsWith('arrow'))e.preventDefault();
 });
 window.addEventListener('keyup',e=>N.keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{N.keys.clear();resetStick()});
}
function sandboxState(){
 const t=N.solo?LAB:LAB_REMOTE||{},mobs=N.solo?N.soloMobs:N.mpMobs;
 return {wave:N.solo?N.soloWave:N.wave,defaultCount:labDefaultCount(N.solo?N.soloWave:N.wave),
  alive:mobs.filter(m=>m.hp>0).length,total:mobs.length,trollAlive:mobs.some(m=>m.kind==='troll'&&m.hp>0),enabled:!!t.enabled,
  freezeAI:!!t.freezeAI,godMode:!!t.godMode,customCount:t.customCount??null,
  allies:t.allies||[],props:t.props||[],globalPaused:N.solo?N.paused:LAB_PAUSE.paused,
  votes:LAB_PAUSE.votes,needed:LAB_PAUSE.needed,damage:N.me?.damage||22,
  weapon:LAB_WEAPON||localArenaLook().weapon||'sword',
  skin:localArenaLook().skin,visualSize:localArenaLook().visualSize,
  heroClass:localArenaLook().heroClass,bodyStyle:localArenaLook().bodyStyle,
  bossAvailable:N.solo||LAB_SERVER_BUILD>=162,rosterAvailable:N.solo||N.rosterSupported};
}
function openSandbox(){
 if(N.phase!=='running')return;
 const activate=()=>{
  if(!window.NS160_LAB){announceArena('Sandbox modul nije dostupan');return}
  closeArenaMenu(false);
  // MENU initially pauses SOLO; entering Test Lab resumes to allow live movement.
  if(N.solo&&N.paused)toggleArenaPause(false);
  LAB_AUTO_PAUSE=false;
  if(el('ns157PauseOverlay'))el('ns157PauseOverlay').hidden=true;
  window.NS160_LAB.open({
   solo:N.solo,host:N.solo||(N.id==='p1'&&LAB_SUPPORTED),
   getState:sandboxState,
   command:packet=>{
    if(N.solo){soloLabAction(packet);return}
    if(LAB_SUPPORTED&&N.id==='p1'&&N.ws?.readyState===1&&N.ws.bufferedAmount<8000){
     if(packet.action==='weapon'&&LAB_WEAPONS.has(packet.value))LAB_WEAPON=packet.value;
     if(packet.action==='heroLook'&&packet.look)LAB_LOOK={...(LAB_LOOK||{}),...packet.look};
     if(packet.action==='resetLab'||packet.action==='undo'){LAB_LOOK=null;LAB_WEAPON=null}
     N.ws.send(JSON.stringify({t:'lab',...packet}));
    }else announceArena('Sandbox zahteva server V160; promena nije poslata');
   },
   vote:()=>{if(LAB_SUPPORTED&&N.ws?.readyState===1)N.ws.send(JSON.stringify({t:'pauseVote',vote:true}));else announceArena('Pauza zahteva server V160')},
   resumeAll:()=>{if(LAB_SUPPORTED&&N.ws?.readyState===1)N.ws.send(JSON.stringify({t:'globalResume'}))},
   onClose:()=>{
    // Closing the Lab returns to live gameplay; MENU still pauses on click.
    if(N.phase==='running')closeArenaMenu(false);
   }
  });
  if(!N.solo&&!LAB_SUPPORTED)announceArena('Čeka se objava V160 servera; izmene nisu dostupne');
 };
 if(window.NS160_LAB){activate();return}
 let script=el('ns160LabScript');
 if(!script){
  script=document.createElement('script');script.id='ns160LabScript';
  script.src='./v162-sandbox.js?v=162&release=190';script.async=true;
  document.head.append(script);
 }
 script.addEventListener('load',activate,{once:true});
 script.addEventListener('error',()=>announceArena('Sandbox modul nije učitan'),{once:true});
}
function closeArenaMenu(resumeAuto=true){
 if(el('ns158Menu'))el('ns158Menu').hidden=true;
 el('ns158MenuBtn')?.setAttribute('aria-expanded','false');
 const auto=LAB_AUTO_PAUSE;LAB_AUTO_PAUSE=false;
 if(auto&&resumeAuto&&N.solo&&N.phase==='running'&&N.paused)toggleArenaPause(false);
 else if(el('ns157PauseOverlay')&&!window.NS160_LAB?.active)
  el('ns157PauseOverlay').hidden=!N.paused;
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
 closeArenaMenu(false);
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
 resetArenaMagic();resetArenaMap();N.prepareAttempt=(N.prepareAttempt||0)+1;
 window.NS179_DIAGNOSTICS?.close();
 window.NS159_VOICE?.stop();
 const wasSolo=N.solo;
 if(notify&&N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'leave'}))}catch{}
 if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
 const ws=N.ws;N.ws=null;if(ws){ws.onopen=ws.onmessage=ws.onclose=ws.onerror=null;try{ws.close()}catch{}}
 if(N.retryTimer)clearTimeout(N.retryTimer);N.retryTimer=null;N.lostSince=0;
 A()?.stop();window.NS160_LAB?.close();LAB_AUTO_PAUSE=false;closeArenaMenu(false);N.paused=false;N.pausedAt=0;if(el('ns157PauseOverlay'))el('ns157PauseOverlay').hidden=true;
 if(el('ns157Events'))el('ns157Events').replaceChildren();
 N.breakState=null;N.breakSupported=false;N.expedition=null;N.expSupported=false;N.rule=null;N.ruleSupported=false;N.accountSupported=false;N.rewardProfile=null;N.rewardPacket=null;N.rewardApplied='';N.expBase=null;N.expOutdoorCrowd=null;N.expOutdoorWorld=null;if(el('ns196Exp'))el('ns196Exp').hidden=true;N.explore=null;N.exploreSupported=false;N.tradeUiKey='';N.runUiKey='';N.questPeriod=null;N.questPeriodAt=0;if(el('ns195Quest'))el('ns195Quest').hidden=true;if(el('ns195Trade'))el('ns195Trade').hidden=true;N.choice=null;N.soloChoice=null;N.hurtUntil=0;N.hitMarkers.clear();N.chests=[];N.soloChests=[];N.drops=[];N.soloDrops=[];N.weaponDrops=[];N.levelBossDone=[];N.dropSeq=0;N.soloUpgradeSeq=0;
 LAB={enabled:false,freezeAI:false,godMode:false,customCount:null,allies:[],props:[],rev:0};LAB_REMOTE=null;LAB_PAUSE={paused:false,votes:[],needed:1,expires:0};LAB_WEAPON=null;LAB_SUPPORTED=false;LAB_LOOK=null;LAB_UNDO=null;LAB_SERVER_BUILD=0;
 N.phase='idle';N.solo=false;N.soloCrowd=null;N.soloMobs=[];N.mpMobs=[];N.mobHistory=[];N.mobRenderTick=null;N.ticket='';N.retry=0;N.players.clear();N.looks.clear();N.presence.clear();N.lastLookSignature='';N.lastLookCheck=0;N.lookSyncEnabled=false;N.me=null;N.pending.length=0;N.keys.clear();N.stick.x=N.stick.y=0;N.stick.ptr=null;
 if(el('ns140Pad')){el('ns140Pad').classList.remove('active');el('ns140Knob').style.transform='translate(0px,0px)'};
 if(el('ns140Root'))el('ns140Root').hidden=true;
 if(wasSolo)try{window.__nightWatch?.showPreRun?.()}catch{}
 else if(B().NET?.phase==='lobby')try{B().renderLobby?.()}catch{}
 return true;
}
// V153: cosmetics are rare reliable metadata, not frame-by-frame movement packets.
function localArenaLook(){
 const game=window.__nightWatch;
 const base=game?.networkHeroStyle?.(game.heroStyle)||B().getVillageHeroLook?.(B().NET?.localId)||B().heroStyle||{};
 return {...base,...(LAB_LOOK||{}),...(LAB_WEAPON?{weapon:LAB_WEAPON}:{})};
}
function rememberLook(id,revision,look){
 if(!/^p[1-6]$/.test(id)||!look||typeof look!=='object'||Array.isArray(look)||
  !Number.isSafeInteger(revision)||revision<0)return false;
 const old=N.looks.get(id);if(old&&revision<old.revision)return false;
 N.looks.set(id,{revision,look});return true;
}
// Local fog-of-war uses a bounded bitset; teammate positions are already replicated.
const ARENA_MAP_CELLS=42;
function revealArenaMap(seen,x,y,w,h,radius=3){
 const cx=Math.floor(x/w*ARENA_MAP_CELLS),cy=Math.floor(y/h*ARENA_MAP_CELLS);
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=cx+dx,yy=cy+dy;if(dx*dx+dy*dy<=radius*radius&&xx>=0&&xx<ARENA_MAP_CELLS&&yy>=0&&yy<ARENA_MAP_CELLS)seen[yy*ARENA_MAP_CELLS+xx]=1}
}
let arenaMapWorld=null,arenaMapSeen=new Uint8Array(ARENA_MAP_CELLS**2),arenaMapBase=null,arenaMapAt=0;
function resetArenaMap(){arenaMapWorld=null;arenaMapSeen.fill(0);arenaMapBase=null;arenaMapAt=0;setArenaMap(false)}
const resetStick=()=>{
 N.stick.ptr=null;N.stick.x=0;N.stick.y=0;
 el('ns140Pad')?.classList.remove('active');const knob=el('ns140Knob');if(knob)knob.style.transform='translate(0px,0px)';
};
function setArenaMap(open){const p=el('ns192MapPanel');if(!p)return;p.hidden=!open;N.keys.clear();resetStick();arenaMapAt=0}
function refreshArenaMap(now){
 if(!N.me||now-arenaMapAt<180)return;arenaMapAt=now;
 const w=N.world;if(arenaMapWorld!==w){arenaMapWorld=w;arenaMapSeen.fill(0);arenaMapBase=null}
 if(!arenaMapBase){const cv=document.createElement('canvas');cv.width=cv.height=420;const g=cv.getContext('2d');if(!g)return;g.fillStyle='#36503b';g.fillRect(0,0,420,420);for(const o of w.obstacles||[]){g.fillStyle=o.kind==='tree'?'#1c342a':o.kind==='pond'?'#416f79':o.kind==='house'||!o.kind?'#ae9470':'#66746a';g.fillRect(o.x/w.w*420,o.y/w.h*420,Math.max(2,o.w/w.w*420),Math.max(2,o.h/w.h*420))}arenaMapBase=cv}
 if(N.me.hp>0)revealArenaMap(arenaMapSeen,N.me.x,N.me.y,w.w,w.h);
 const seen=(x,y)=>arenaMapSeen[Math.floor(y/w.h*ARENA_MAP_CELLS)*ARENA_MAP_CELLS+Math.floor(x/w.w*ARENA_MAP_CELLS)];
 function draw(cv){if(!cv)return;const g=cv.getContext('2d'),s=cv.width,cell=s/ARENA_MAP_CELLS;if(!g)return;g.drawImage(arenaMapBase,0,0,s,s);g.fillStyle='#0b1715ee';
 for(let y=0;y<ARENA_MAP_CELLS;y++)for(let x=0;x<ARENA_MAP_CELLS;x++)if(!arenaMapSeen[y*ARENA_MAP_CELLS+x])g.fillRect(x*cell,y*cell,cell+.25,cell+.25);
 const dot=(x,y,color,r)=>{g.fillStyle=color;g.beginPath();g.arc(x/w.w*s,y/w.h*s,r,0,Math.PI*2);g.fill()};
 for(const c of N.solo?N.soloChests:N.chests)if(!c.opened&&seen(c.x,c.y))dot(c.x,c.y,'#f0c872',s>100?3.6:1.6);
 for(const p of N.players.values())if(p.online&&!p.finalDead)dot(p.x,p.y,p.id===N.id?'#77d9ff':p.knocked?'#ffb25a':'#7ee69c',s>100?5:2.5);
 }
 draw(el('ns192Mini'));if(!el('ns192MapPanel')?.hidden)draw(el('ns192BigMap'));
}
const arenaRewardLabel=k=>({edge:'⚔ OŠTRIJA OŠTRICA · +20% ŠTETE',heart:'♥ ČUVAROVO SRCE · +25 HP',boots:'➤ BRŽE ČIZME · +10% BRZINE',regen:'❤ TRAVARSKI MELEM · 5 HP/12s',leech:'ŽIVOTNI TALISMAN · 3 HP/7 ubistava',crit:'PRECIZAN ZAMAH · 10% kritičnih',armor:'OJAČANI OKLOP · -2 štete',swift:'LAKI KORACI · +5% brzine',haste:'BRŽI NAPADI · -7% cooldown',aegis:'TRENUTAK ČELIKA · zaštita/7s',aura:'OTROVNI OBLAK · 4 DMG/1,6s',shock:'VARNO KOPLJE · 13 DMG/9s',bombs:'NEBESKE BOMBE · 22 DMG/5s',shuriken:'MALI ŠURIKEN · 12 DMG/3s',frost:'LEDENI UDAH · usporavanje/12s',magnet:'MAGNET ZA XP · +60 domet',thorns:'BODLJIKAVI PRSLUK · 7 DMG'}[k]||'⚔ '+k.toUpperCase()+' · DRUGI SLOT');
function nearArenaLoot(){
 if(!(N.solo||N.lootSupported)||!N.me||N.me.hp<=0||N.me.knocked||N.choice||N.soloChoice||N.paused||LAB_PAUSE.paused||!el('ns192MapPanel')?.hidden)return null;
 let best=null,dist=135**2;for(const d of N.weaponDrops||[]){if(d.weapon===N.me.activeWeapon)continue;const n=(d.x-N.me.x)**2+(d.y-N.me.y)**2;if(n<=dist){dist=n;best=d}}return best;
}
function requestArenaLoot(){
 const d=nearArenaLoot();if(!d)return false;
 if(N.solo){if(arenaTakeWeapon(N.weaponDrops,N.me,d.id)){A()?.play('choose');return true}return false}
 if(N.ws?.readyState===1&&N.ws.bufferedAmount<4000){N.ws.send(JSON.stringify({t:'weaponLoot',id:d.id}));return true}return false;
}
function refreshArenaLoot(){
 const b=el('ns192Loot'),d=nearArenaLoot();if(!b)return;b.hidden=!d;if(d){const old=arenaWeapon(N.me),next=ARENA_CLASSIC_WEAPONS[d.weapon],sign=n=>(n>0?'+':'')+n;
 b.textContent='UZMI '+d.weapon.toUpperCase()+' · '+sign(Math.round((next.damage-old.damage)*100))+'% DMG / '+sign(next.range-old.range)+' domet';}
 const sos=el('ns192SOS');if(sos){sos.hidden=N.solo||!N.sosSupported||!N.me?.knocked||N.me.finalDead||N.me.sosUsed;sos.disabled=false}
}
function drawArenaWeaponLoot(g,view){
 for(const d of N.weaponDrops||[]){if(d.x<view.left-20||d.x>view.right+20||d.y<view.top-20||d.y>view.bottom+20)continue;g.save();g.translate(d.x,d.y);g.fillStyle='#ebc164';g.strokeStyle='#4a3721';g.lineWidth=2;g.beginPath();g.moveTo(0,-12);g.lineTo(10,0);g.lineTo(0,12);g.lineTo(-10,0);g.closePath();g.fill();g.stroke();g.font='bold 9px system-ui';g.textAlign='center';g.fillStyle='#ffe3a0';g.fillText(d.weapon,0,-16);g.restore()}
}
function requestArenaSwap(){
 if(!N.me||N.me.hp<=0||N.me.knocked||!N.me.secondaryWeapon||N.phase!=='running'||N.paused||N.choice||N.soloChoice||LAB_PAUSE.paused||!el('ns158Menu')?.hidden)return false;
 if(N.solo)return arenaSwapWeapon(N.me,N.soloTick);
 if(N.loadoutSupported&&N.ws?.readyState===1&&N.ws.bufferedAmount<4000){N.ws.send(JSON.stringify({t:'weaponSwap'}));return true}return false;
}
function requestArenaDodge(){
 if(N.phase!=='running'||!N.me||N.me.hp<=0||N.me.knocked||N.me.finalDead||N.paused||LAB_PAUSE.paused||N.reviveHeld||N.choice||N.soloChoice||el('ns158Menu')?.hidden===false||(N.solo?N.soloState:N.waveState)!=='play')return false;
 const v=input(),tick=N.solo?N.soloTick:N.tick,now=performance.now();if(Math.hypot(v.x,v.y)<=.2||tick<(N.me.dodgeReady||0))return false;
 if(N.solo){if(!arenaDodge(N.me,tick,v.x,v.y))return false;N.soloInvul=Math.max(N.soloInvul,N.me.shield);A()?.play('step',{gain:1});return true}
 if(!N.dodgeSupported||N.ws?.readyState!==1||N.ws.bufferedAmount>=4000||now-(N.lastDashRequest||-1000)<350)return false;
 N.lastDashRequest=now;N.ws.send(JSON.stringify({t:'dodge',x:v.x,y:v.y}));return true;
}
function refreshArenaDodge(){
 const b=el('ns192Dodge');if(!b)return;
 b.hidden=!(N.solo||N.dodgeSupported);const t=N.solo?N.soloTick:N.tick,cd=Math.max(0,(N.me?.dodgeReady||0)-t);
 b.disabled=!N.me||N.me.hp<=0||N.me.knocked||cd>0;b.textContent=cd?'DODGE '+(cd/30).toFixed(1)+'s':'DODGE';
}
function input(){
 const k=N.keys;let x=N.stick.x+(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0);
 let y=N.stick.y+(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0);
 const d=Math.hypot(x,y);if(d>1){x/=d;y/=d}
 return {x,y};
}
// V180: static world collision buckets. The exact circle-vs-rectangle test
// is still applied to every possible collider; no offscreen physics is skipped.
let obstacleGridCache=null;
function nearbyObstacles(world,x,y,r){
 const obstacles=world.obstacles||[],size=128;
 if(!obstacleGridCache||obstacleGridCache.world!==world||obstacleGridCache.source!==obstacles||obstacleGridCache.count!==obstacles.length){
  const cells=new Map();
  for(const o of obstacles){
   for(let cy=Math.floor(o.y/size);cy<=Math.floor((o.y+o.h)/size);cy++)
    for(let cx=Math.floor(o.x/size);cx<=Math.floor((o.x+o.w)/size);cx++){
     const key=cx+','+cy;let list=cells.get(key);if(!list)cells.set(key,list=[]);list.push(o);
    }
  }
  obstacleGridCache={world,source:obstacles,count:obstacles.length,cells};
 }
 const cells=obstacleGridCache.cells,ax=Math.floor((x-r)/size),bx=Math.floor((x+r)/size),ay=Math.floor((y-r)/size),by=Math.floor((y+r)/size);
 if(ax===bx&&ay===by)return cells.get(ax+','+ay)||[];
 const out=[];
 for(let cy=ay;cy<=by;cy++)for(let cx=ax;cx<=bx;cx++){
  const list=cells.get(cx+','+cy);if(list)for(const o of list)if(!out.includes(o))out.push(o);
 }
 return out;
}
function mountArenaRun(root,style){
 style.textContent+='#ns195Run{position:absolute;left:10px;top:116px;z-index:5;background:#182b24e8;color:#ffedc8;border:1px solid #829884;border-radius:8px;padding:5px 8px;font:bold 10px system-ui;max-width:36vw;text-align:left;touch-action:none}#ns195Trade{position:absolute;bottom:calc(114px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:7;width:min(320px,75vw);max-height:45vh;overflow:auto;background:#182922f7;color:#ffe9b7;border:1px solid #9db38e;border-radius:10px;padding:7px;display:grid;gap:4px;touch-action:pan-y}#ns195Trade[hidden],#ns195Run[hidden],#ns195Quest[hidden]{display:none!important}#ns195Trade button,#ns195Quest button{background:#33493a;color:#f7e9c6;border:1px solid #829884;border-radius:6px;font:bold 11px system-ui;padding:7px}#ns195Trade button:disabled{opacity:.45}#ns195Quest{position:absolute;left:10px;top:157px;width:min(255px,78vw);max-height:48vh;overflow:auto;padding:8px;background:#152620f5;color:#f7e9c7;border:1px solid #819980;border-radius:9px;z-index:7;font:11px system-ui;touch-action:pan-y}';
 const run=document.createElement('button'),trade=document.createElement('section'),quest=document.createElement('section');run.type='button';run.id='ns195Run';run.hidden=true;trade.id='ns195Trade';trade.hidden=true;quest.id='ns195Quest';quest.hidden=true;root.append(run,trade,quest);
 run.onclick=()=>{quest.hidden=!quest.hidden;N.runUiKey='';refreshArenaRun()};
}
function captureArenaAccount(){let id=B().getActiveAccount?.()?.id;N.rewardProfile=typeof id==='string'?{id,uid:window.NS82_CLOUD?.user||null}:null;N.rewardApplied='';N.rewardAt=0;N.rewardCalendar=null;N.rewardPacket=null}
function syncArenaAccount(){
 if(N.phase!=='running'||!N.rewardProfile||!N.explore||N.explore.invalid||!N.me||(N.solo?LAB.enabled:!N.accountSupported||LAB_REMOTE?.enabled))return false;
 const id=B().getActiveAccount?.()?.id,uid=window.NS82_CLOUD?.user||null;if(id!==N.rewardProfile.id||uid!==N.rewardProfile.uid)return false;
 const now=Date.now();if(N.solo)N.rewardCalendar=arenaRewardCalendar(N.rewardCalendar,now);
 const p=N.solo?arenaAccountPacket(N.explore,N.rewardCalendar):N.rewardPacket;if(!Array.isArray(p)||p.length!==4||!Number.isInteger(p[0])||p[0]<0||p[0]>4095||!Number.isInteger(p[1])||p[1]<0||p[1]>3||!/^\d{8}$/.test(p[2])||!/^\d{4}-\d{2}-\d{2}$/.test(p[3]))return false;
 const sparta=(N.me.kills||0)>=300,key=p.join('|')+'|'+(sparta?1:0);if(N.rewardApplied===key||now-(N.rewardAt||0)<1500)return false;
 N.rewardAt=now;const applied=B().arenaAccountAward?.(p,sparta,N.rewardProfile.id);
 if(applied!==undefined){N.rewardApplied=key;return !!applied}return false
}

function refreshArenaRun(){
 const run=el('ns195Run'),trade=el('ns195Trade'),quest=el('ns195Quest');if(!run||!trade||!quest)return;
 const e=N.explore,p=N.me,allowed=!!(e&&p&&(N.solo||N.exploreSupported)&&N.phase==='running');
 run.hidden=!allowed;if(!allowed){trade.hidden=true;quest.hidden=true;return}syncArenaAccount();
 run.textContent='🔑 '+(p.arenaKeys||0)+' · ◇ '+(p.arenaShards||0)+' · 🏆 '+(e.invalid?'EDITOR':(arenaRunMask(e).toString(2).match(/1/g)||[]).length+'/12');
 const t=N.solo?N.soloTick:N.tick;
 const near=(!N.expedition?.id&&!N.paused&&!LAB_PAUSE.paused&&!N.choice&&!N.soloChoice&&el('ns158Menu')?.hidden!==false&&el('ns192MapPanel')?.hidden!==false&&(N.solo?!LAB.enabled:!LAB_REMOTE?.enabled))?arenaTradeNear(e,p):null;
 trade.hidden=!near;
 const key=near?near.type+'|'+(p.arenaKeys||0)+'|'+(p.guildMask||0)+'|'+(p.guildUnlocked?1:0)+'|'+(p.xp||0)+'|'+(p.hp||0)+'|'+Math.max(0,Math.ceil(((p.burgerUntil||0)-t)/30))+'|'+e.vow+'|'+(N.expedition?.rope?1:0):'';
 if(key!==N.tradeUiKey){N.tradeUiKey=key;trade.textContent='';if(near){
  const title=document.createElement('b');title.textContent=near.type==='market'?'BURGER BAR · plaćaš XP':near.type==='guild'?'STARA KOVNICA · potreban ključ':'OBELISK · jedan zavet za tim';trade.append(title);
  for(const row of ARENA_SHOP_ITEMS.filter(x=>x[3]===near.type)){const b=document.createElement('button');b.type='button';b.textContent=row[1]+(row[2]?' · '+row[2]+' XP':'');b.disabled=!arenaTradeInfo(e,p,row[0],t);b.onclick=()=>requestArenaTrade(row[0]);trade.append(b)}
  if(near.type==='guild'&&N.expSupported){const b=document.createElement('button');b.type='button';b.textContent=N.expedition?.rope?'KANAP NABAVLJEN':'KANAP ZA PEĆINU · 58 XP';b.disabled=!!N.expedition?.rope||p.xp<58||(!p.guildUnlocked&&!p.arenaKeys);b.onclick=()=>{if(N.solo){if(expRope(N.expedition,e,p)){announceArena('KANAP NABAVLJEN');N.tradeUiKey=''}}else if(N.ws?.readyState===1)N.ws.send(JSON.stringify({t:'arenaTrade',id:'ropeKey'}))};trade.append(b)}
 }}
 const periodAt=N.solo?Date.now():(N.serverNow||Date.now());if(!N.questPeriod||Math.abs(periodAt-(N.questPeriodAt||0))>=45000){N.questPeriod=arenaQuestPeriod(periodAt);N.questPeriodAt=periodAt}
 const qkey=[e.kills,e.trolls,e.worms,e.chests,e.revives,e.wave,e.invalid,p.kills,...N.questPeriod.map(a=>a[0])].join(':');
 if(!quest.hidden&&N.runUiKey!==qkey){N.runUiKey=qkey;quest.textContent='';const h=document.createElement('b');h.textContent=e.invalid?'EDITOR · nema napretka':'ZADACI I DOSTIGNUĆA · ova partija';quest.append(h);
  for(const [i,a] of N.questPeriod.entries()){const d=document.createElement('div'),v=e[a[1]]||0;d.textContent=(i?'NEDELJNI: ':'DNEVNI: ')+a[0]+' · '+Math.min(v,a[2])+'/'+a[2]+(v>=a[2]&&!e.invalid?' ✓':'');d.style.padding='4px 0';quest.append(d)}
  for(const a of ARENA_RUN_ACHIEVEMENTS){const d=document.createElement('div'),v=e[a[1]]||0;d.textContent=(v>=a[2]&&!e.invalid?'✓ ':'')+a[0]+' · '+Math.min(v,a[2])+'/'+a[2];d.style.padding='3px 0';quest.append(d)}
  const sp=document.createElement('div');sp.textContent='SPARTA · '+Math.min(p.kills||0,300)+'/300 · zlatni oklop';quest.append(sp);
 }
}
function requestArenaTrade(id){
 const p=N.me,e=N.explore,t=N.solo?N.soloTick:N.tick;if(!arenaTradeInfo(e,p,id,t)||N.paused||LAB_PAUSE.paused||N.choice||N.soloChoice)return false;
 if(N.solo){if(!arenaTrade(e,p,id,t,N.players))return false;announceArena('RAZMENA USPEŠNA');A()?.play('choose');N.tradeUiKey='';refreshArenaRun();return true}
 if(N.exploreSupported&&N.ws?.readyState===1&&N.ws.bufferedAmount<4000){N.ws.send(JSON.stringify({t:'arenaTrade',id}));return true}return false;
}
function drawArenaExplore(g,view){
 const e=N.explore;if(!e)return;
 for(const land of e.landmarks){if(land.type!=='relic'||land.x<view.left-35||land.x>view.right+35||land.y<view.top-35||land.y>view.bottom+35)continue;g.save();g.translate(land.x,land.y);g.fillStyle='#576461';g.strokeStyle=e.vow?'#73837a':'#dfc477';g.lineWidth=2;g.beginPath();g.moveTo(-13,9);g.lineTo(-9,-26);g.lineTo(0,-39);g.lineTo(9,-26);g.lineTo(13,9);g.closePath();g.fill();g.stroke();g.restore()}
 for(const d of e.drops){if(d.x<view.left||d.x>view.right||d.y<view.top||d.y>view.bottom)continue;g.save();g.translate(d.x,d.y);g.strokeStyle=d.type==='key'?'#ffe0a1':'#9be5ef';g.lineWidth=3;g.beginPath();if(d.type==='key'){g.arc(-4,-3,4,0,Math.PI*2);g.moveTo(0,0);g.lineTo(10,10);g.lineTo(13,7)}else{g.moveTo(0,-9);g.lineTo(7,0);g.lineTo(0,9);g.lineTo(-7,0);g.closePath()}g.stroke();g.restore()}
}
function applyArenaExplorePacket(v){
 if(!N.exploreSupported||!v||!Array.isArray(v.stats)||!Array.isArray(v.drops)||!Array.isArray(v.landmarks))return;
 const [kills,trolls,worms,chests,revives,wave,invalid]=v.stats;
 N.explore={vow:['blood','harvest','putnik'].includes(v.vow)?v.vow:'',kills,trolls,worms,chests,revives,wave,invalid:!!invalid,landmarks:v.landmarks.filter(o=>o&&['guild','market','relic'].includes(o.type)&&[o.x,o.y,o.r].every(Number.isFinite)).slice(0,8),drops:v.drops.filter(d=>Array.isArray(d)&&d.length===4&&d.every(Number.isFinite)).slice(0,24).map(d=>({id:d[0],type:d[1]===0?'key':'shard',x:d[2]/10,y:d[3]/10}))};
}

function applyRule(v){if(!N.ruleSupported||!Array.isArray(v)||!['normal','night','rush','campaign'].includes(v[0])||!Number.isFinite(v[1])||!Array.isArray(v[3]))return;N.rule={mode:v[0],elapsed:v[1],victory:v[2]===1,towers:v[3].filter(t=>Array.isArray(t)&&t.length===4&&t.every(Number.isFinite)).slice(0,3).map(t=>({id:t[0],x:t[1],y:t[2],hp:t[3]})),stage:Math.max(0,Math.min(3,Number(v[4])||0)),cleared:Number(v[5])||0}}
function drawRuleTowers(g,v){if(N.expedition?.id||N.rule?.mode!=='night')return;for(const t of N.rule.towers){if(t.hp<=0||t.x<v.left-60||t.x>v.right+60||t.y<v.top-85||t.y>v.bottom+60)continue;g.save();g.translate(t.x,t.y);g.fillStyle='#48534f';g.fillRect(-28,-25,56,55);g.fillStyle='#737d75';g.beginPath();g.moveTo(-37,-25);g.lineTo(-23,-58);g.lineTo(23,-58);g.lineTo(37,-25);g.closePath();g.fill();g.fillStyle='#202824';g.fillRect(-33,-69,66,7);g.fillStyle='#da7b56';g.fillRect(-33,-69,66*t.hp/180,7);g.restore()}}
let nightCanvas197=null,nightDraw197=0;
function drawRuleNight(g,w,h,zoom,me,now){if(N.expedition?.id||!arenaRuleDark(N.rule))return;
 const scale=Math.min(1,400/Math.max(w,h)),ww=Math.max(1,Math.round(w*scale)),hh=Math.max(1,Math.round(h*scale));
 if(!nightCanvas197)nightCanvas197=document.createElement('canvas');const fresh=nightCanvas197.width!==ww||nightCanvas197.height!==hh;if(fresh){nightCanvas197.width=ww;nightCanvas197.height=hh}
 if(fresh||now-nightDraw197>=70){nightDraw197=now;const z=nightCanvas197.getContext('2d');if(!z)return;z.setTransform(1,0,0,1,0,0);z.globalCompositeOperation='source-over';z.clearRect(0,0,ww,hh);z.fillStyle='rgba(4,9,15,.68)';z.fillRect(0,0,ww,hh);z.globalCompositeOperation='destination-out';
 const lights=[...(N.world.classicProps||[]).filter(o=>o.type==='torch').map(o=>({x:o.x,y:o.y,r:235})),...[...N.players.values()].filter(p=>p.online&&p.hp>0&&!p.knocked).map(p=>({x:p.x,y:p.y,r:68}))];
 for(const a of lights){const x=ww/2+(a.x-me.x)*zoom*scale,y=hh/2+(a.y-me.y)*zoom*scale,r=a.r*zoom*scale;if(x+r<0||y+r<0||x-r>ww||y-r>hh)continue;const gr=z.createRadialGradient(x,y,r*.35,x,y,r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.65,'rgba(0,0,0,.9)');gr.addColorStop(1,'rgba(0,0,0,0)');z.fillStyle=gr;z.beginPath();z.arc(x,y,r,0,Math.PI*2);z.fill()}z.globalCompositeOperation='source-over'}
 g.drawImage(nightCanvas197,0,0,w,h)
}
function ruleTitle(wave){const r=N.rule;if(!r)return 'TALAS '+wave;if(r.victory)return 'POBEDA · '+(r.mode==='campaign'?'KAMPANJA':'TRI KULE');if(r.mode==='rush')return 'TALAS '+wave+' · OPSADA';if(r.mode==='campaign')return 'TALAS '+wave+' · '+(ARENA_CAMPAIGN[r.stage]?.[0]||'KAMPANJA');if(r.mode==='night'){const dark=arenaRuleDark(r),left=Math.ceil(((dark?3600:2400)-r.elapsed%3600)/30);return 'TALAS '+wave+' · '+(dark?'MRAK':'SVETLO')+' '+left+'s · KULE '+r.towers.filter(t=>t.hp<=0).length+'/3'}return 'TALAS '+wave}

function resetExp(base){N.expBase={...base};N.expedition=expInit(base);N.expSupported=false}
function applyExp(v){if(!N.expSupported||!N.expedition||!Array.isArray(v)||![0,1,2].includes(v[0])||!Number.isSafeInteger(v[1]))return;
 const z=N.expedition,changed=z.id!==v[0]||z.rev!==v[1];z.id=v[0];z.rev=v[1];z.done=Number(v[2])||0;z.key=v[3]===1;z.rope=v[4]===1;z.keyDrop=Array.isArray(v[5])?{x:v[5][0],y:v[5][1]}:null;
 if(changed){N.world=expWorld(N.expBase,z.id);resetArenaBreakables(N.world);N.breakSupported=true;N.mobHistory=[];N.mpMobs=[];N.mobRenderTick=null;N.players.clear();N.pending=[];N.delta={x:0,y:0};N.rejoinCorrection=true;resetArenaMap();N.tradeUiKey='';spellFx=[];announceArena(z.id===1?'TEMPLE':z.id===2?'PEĆINA':'POVRATAK NA MAPU')}
}
function soloExp(id){const z=N.expedition,p=N.me;if(LAB.enabled||N.explore?.invalid||N.soloChoice||N.paused||N.soloState!=='play')return false;if(!expAllowed(z,N.players,p,id,N.soloMobs))return false;
 if(id){N.expOutdoorCrowd=N.soloCrowd;N.expOutdoorWorld=N.world;z.saved={mobs:N.soloMobs,chests:N.soloChests,drops:N.soloDrops,weaponDrops:N.weaponDrops,breakables:arenaBreakPacket(N.breakState),exploreDrops:N.explore.drops,total:N.soloTotal,reserve:N.soloReserve,batch:N.soloBatch,at:N.soloTick,portal:z.portals.find(q=>q.id===id)};
  z.id=id;N.world=expWorld(N.expBase,id);resetArenaBreakables(N.world);N.soloMobs=expMobs(id,N.soloWave,N.soloTick);N.soloChests=[];N.soloDrops=[];N.weaponDrops=[];N.explore.drops=[];N.soloTotal=N.soloMobs.length;N.soloReserve=0;N.soloBatch=0;expPlace(N.players,EXP_START,N.soloTick)
 }else{const old=z.saved;if(!old)return false;z.id=0;const base=expWorld(N.expBase,0);N.world=N.expOutdoorWorld||base;Object.assign(N.world,base);N.expOutdoorWorld=null;resetArenaBreakables(N.world);arenaBreakRestore(N.breakState,N.world,old.breakables);N.soloMobs=old.mobs;N.soloChests=old.chests;N.soloDrops=old.drops;N.weaponDrops=old.weaponDrops;N.explore.drops=old.exploreDrops;N.soloTotal=old.total;N.soloReserve=old.reserve;N.soloBatch=old.batch;for(const d of [...N.soloDrops,...N.weaponDrops])if(Number.isFinite(d.expires))d.expires+=N.soloTick-old.at;expPlace(N.players,old.portal,N.soloTick);z.saved=null}
 z.rev++;N.breakSupported=true;N.acidShots=[];spellFx=[];if(!id&&N.expOutdoorCrowd){N.soloCrowd=N.expOutdoorCrowd;N.expOutdoorCrowd=null;N.soloCrowd.clear()}else N.soloCrowd=createArenaCrowdSteering(N.world,(p,x,y,dt)=>moveLocal(p,x*N.world.speed*dt*(p.spellSlowFactor||1),y*N.world.speed*dt*(p.spellSlowFactor||1)));resetArenaMap();N.tradeUiKey='';announceArena(z.id===1?'TEMPLE':z.id===2?'PEĆINA':'POVRATAK NA MAPU');return true
}
function requestExp(id){if(N.solo)return soloExp(id);if(N.expSupported&&N.ws?.readyState===1&&N.ws.bufferedAmount<4000){N.ws.send(JSON.stringify({t:'expedition',id}));return true}return false}
function expHud(){const b=el('ns196Exp'),z=N.expedition,p=N.me;if(!b)return;const point=z?.id?EXP_EXIT:z?.portals.find(o=>expNear(p,o));b.hidden=!(N.phase==='running'&&z&&(N.solo||N.expSupported)&&point&&expNear(p,point)&&p?.hp>0&&!p.knocked&&!N.choice&&!N.soloChoice&&!N.paused&&!LAB_PAUSE.paused&&el('ns158Menu')?.hidden!==false&&(N.solo?!LAB.enabled:!LAB_REMOTE?.enabled));if(b.hidden)return;const id=z.id?0:point.id;b.textContent=z.id?(z.done&(1<<z.id)?'↩ IZLAZ':'POBEDI ČUVARE ZA IZLAZ'):id===1?(z.done&2?'TEMPLE · ZAVRŠEN':z.key?'ULAZ U TEMPLE':'TEMPLE · potreban ključ trola'):(z.done&4?'PEĆINA · ZAVRŠENA':z.rope?'ULAZ U PEĆINU':'PEĆINA · kanap iz kovnice');b.disabled=!!N.explore?.invalid||!expAllowed(z,N.players,p,id,N.solo?N.soloMobs:N.mpMobs);b.onclick=()=>requestExp(id)}
function drawExp(g,view){const z=N.expedition;if(!z||(!N.solo&&!N.expSupported))return;if(z.id){g.fillStyle='#303b40';g.strokeStyle='#87918c';g.lineWidth=2;for(const o of N.world.obstacles){if(o.x>view.right||o.y>view.bottom||o.x+o.w<view.left||o.y+o.h<view.top)continue;g.fillRect(o.x,o.y,o.w,o.h);g.strokeRect(o.x,o.y,o.w,o.h)}}
 const marks=z.id?[{...EXP_EXIT,id:0}]:[...z.portals];if(z.keyDrop&&!z.id)marks.push({...z.keyDrop,id:3});for(const p of marks){if(p.x<view.left-40||p.x>view.right+40||p.y<view.top-40||p.y>view.bottom+40)continue;g.save();g.translate(p.x,p.y);g.fillStyle=p.id===3?'#f7d77e':'#90c9c6';g.strokeStyle='#102725';g.lineWidth=3;g.beginPath();g.arc(0,0,p.id===3?9:24,0,Math.PI*2);g.fill();g.stroke();g.font='bold 11px system-ui';g.textAlign='center';g.fillStyle='#fff1cb';g.fillText(['IZLAZ','TEMPLE','PEĆINA','KLJUČ TROLA'][p.id],0,-30);g.restore()}}

function resetArenaBreakables(world){N.breakState=arenaBreakInit(world);N.breakRevision=-1;N.breakSupported=false}
function applyArenaBreakPacket(packet){if(!N.breakSupported||!N.breakState||!Array.isArray(packet)||packet[0]===N.breakRevision)return;
 if(arenaBreakRestore(N.breakState,N.world,packet)){N.breakRevision=packet[0];arenaMapBase=null}}
function drawArenaFieldKits(g,view){
 for(const k of N.breakState?.kits||[]){if(k.x<view.left||k.x>view.right||k.y<view.top||k.y>view.bottom)continue;
  g.save();g.translate(k.x,k.y);g.fillStyle='#e7dbb9';g.strokeStyle='#57483b';g.lineWidth=2;g.fillRect(-10,-8,20,16);g.strokeRect(-10,-8,20,16);g.fillStyle='#b34b48';g.fillRect(-2,-6,4,12);g.fillRect(-6,-2,12,4);g.restore()}
}
function moveLocal(p,dx,dy){
 if(N.solo&&N.explore?.vow==='harvest'&&typeof p.id==='number'){dx*=1.08;dy*=1.08}
 const oldX=p.x,oldY=p.y,w=N.world,r=p.bodyRadius||w.r||14,free=(x,y)=>nearbyObstacles(w,x,y,r).every(o=>{
  if(x+r<o.x||x-r>o.x+o.w||y+r<o.y||y-r>o.y+o.h)return true;
  const qx=clamp(x,o.x,o.x+o.w),qy=clamp(y,o.y,o.y+o.h);
  return (x-qx)**2+(y-qy)**2>=r*r;
 });
 const steps=Math.max(1,Math.min(40,Math.ceil(Math.hypot(dx,dy)/(w.r*.55))));
 for(let i=0;i<steps;i++){const x=clamp(p.x+dx/steps,r,w.w-r);if(free(x,p.y))p.x=x;const y=clamp(p.y+dy/steps,r,w.h-r);if(free(p.x,y))p.y=y;}
 if(p.bodyRadius)p.heavyGait=(p.heavyGait||0)+Math.hypot(p.x-oldX,p.y-oldY)/9;
}
function snapshot(m){
 if(!Number.isInteger(m.tick)||m.tick<=N.tick||!Array.isArray(m.players))return;
 const arrived=performance.now(),previousTick=N.tick;
 if(previousTick>=0&&N.lastState&&m.tick-previousTick<=30){
  const variation=Math.min(250,Math.abs((arrived-N.lastState)-(m.tick-previousTick)*1000/30));
  N.arrivalJitter=(N.arrivalJitter||0)*.85+variation*.15;
  N.interpolationTicks=clamp(3+Math.ceil(N.arrivalJitter/34),3,7);
 }
 N.tick=m.tick;N.lastState=arrived;if(magicSupported&&Array.isArray(m.spell)&&Number.isFinite(m.spell[0])&&Number.isFinite(m.spell[1])&&Array.isArray(m.spell[2])&&m.spell[2].length===8){spellView=m.spell;spellSeq=Math.max(spellSeq,Number(m.spell[3])||0)}if(magicSupported&&Array.isArray(m.spellFx))for(const event of m.spellFx.slice(-18))showArenaSpell(event);N.serverMs=Number(m.ms)||0;
 if(Number.isFinite(m.serverNow))N.serverNow=m.serverNow;
 if(typeof m.globalPaused==='boolean')LAB_PAUSE.paused=m.globalPaused;
 if(Array.isArray(m.allies))LAB_REMOTE={...(LAB_REMOTE||{}),allies:m.allies.slice(0,3).map(a=>({id:a[0],x:a[1]/10,y:a[2]/10,hp:a[3],lastAttack:a[4]}))};
 N.diagSnapshots=(N.diagSnapshots||0)+1;
 const priorWave=N.wave,priorChoice=N.choice?.seq;
 const weaponHits=new Map();
 for(const row of m.players){
  if(Array.isArray(row)&&/^p[1-6]$/.test(row[0])&&Number.isInteger(row[8])&&row[8]>=0)
   weaponHits.set(row[8],ARENA_CLASSIC_WEAPONS[row[24]]?row[24]:(row[0]===N.id?localArenaLook().weapon:N.looks.get(row[0])?.look?.weapon||'sword'));
 }
 if(Number.isInteger(m.wave)&&m.wave>0&&m.wave<1000)N.wave=m.wave;
 if(m.waveState==='play'||m.waveState==='between')N.waveState=m.waveState;
 if(Number.isFinite(m.waveAt))N.waveAt=m.waveAt;
 N.choice=m.choice&&Number.isInteger(m.choice.seq)&&typeof m.choice.owner==='string'?
  {id:m.choice.id,kind:m.choice.kind==='xp'?'xp':'chest',level:Number(m.choice.level)||1,owner:m.choice.owner,options:Array.isArray(m.choice.options)?m.choice.options.filter(k=>ARENA_CORE_REWARDS.includes(k)||ARENA_EXTRA_REWARDS.includes(k)).slice(0,3):ARENA_CORE_REWARDS,seq:m.choice.seq,until:m.choice.until}:null;
 if(LAB_SERVER_BUILD>=168&&Array.isArray(m.drops))N.drops=m.drops.slice(0,85)
  .filter(d=>Array.isArray(d)&&Number.isInteger(d[0])&&Number.isFinite(d[1])&&Number.isFinite(d[2]))
  .map(d=>({id:d[0],x:d[1]/10,y:d[2]/10,value:Number(d[3])||7}));
 N.rewardPacket=N.accountSupported?m.awards:null;applyExp(m.expedition);applyRule(m.rule);applyArenaBreakPacket(m.breakables);applyArenaExplorePacket(m.arenaExplore);
 N.weaponDrops=Array.isArray(m.weaponDrops)?m.weaponDrops.slice(0,6).filter(d=>Array.isArray(d)&&Number.isSafeInteger(d[0])&&Number.isFinite(d[1])&&Number.isFinite(d[2])&&ARENA_CLASSIC_WEAPONS[d[3]]).map(d=>({id:d[0],x:d[1]/10,y:d[2]/10,weapon:d[3]})):[];
 if(Array.isArray(m.chests))N.chests=m.chests.slice(0,16)
  .filter(c=>Array.isArray(c)&&Number.isInteger(c[0])&&Number.isFinite(c[1])&&Number.isFinite(c[2]))
  .map(c=>({id:c[0],x:c[1],y:c[2],opened:!!c[3],style:c[4]===1?'arena':'classic'}));
 if(N.wave>priorWave)A()?.play('wave');
 if(N.choice&&N.choice.seq!==priorChoice){A()?.play('chest');N.choiceUiId=''}
 if(!N.choice&&priorChoice!==undefined)A()?.play('choose');
 if(Number.isInteger(m.totalMobs)&&m.totalMobs>=0&&m.totalMobs<=160)N.hordeTotal=m.totalMobs;
 N.waveTotal=Number.isInteger(m.waveTotal)&&m.waveTotal>=0&&m.waveTotal<=20100?m.waveTotal:N.hordeTotal;
 const prevAcid=new Set((N.acidShots||[]).map(s=>s.id));N.acidShots=Array.isArray(m.acid)?m.acid.slice(0,60).filter(s=>Array.isArray(s)&&s.length===5&&s.every(Number.isFinite)).map(s=>({id:s[0],x:s[1]/10,y:s[2]/10,vx:s[3],vy:s[4]})):[];if(N.me&&N.acidShots.some(s=>!prevAcid.has(s.id)&&(s.x-N.me.x)**2+(s.y-N.me.y)**2<550**2))B().arenaWormSound?.();
 N.waveReserve=Number.isInteger(m.waveReserve)&&m.waveReserve>=0&&m.waveReserve<=N.waveTotal?m.waveReserve:0;
 const batch=Number.isInteger(m.waveBatch)?m.waveBatch:0,batchChanged=N.waveBatch!==batch;N.waveBatch=batch;
 if(Array.isArray(m.mobs)){
  const waveChanged=N.wave!==priorWave||batchChanged;
  if(waveChanged){N.mobHistory=[];N.mobRenderTick=null;}
  const previous=new Map(waveChanged?[]:N.mpMobs.map(q=>[q.id,q]));
  N.mpMobs=m.mobs.filter(q=>Array.isArray(q)&&Number.isInteger(q[0])&&q[0]>=0&&(q[0]<267||(N.expSupported&&N.expedition?.id&&q[0]>=300&&q[0]<=306))&&
   Number.isFinite(q[1])&&Number.isFinite(q[2])&&Number.isFinite(q[3])).map(q=>{
   const prev=previous.get(q[0]),x=q[1]/10,y=q[2]/10,attackTick=Number(q[5])||-100;
   if(prev&&attackTick>0&&attackTick!==prev.attackTick)
    A()?.play('enemy',{sourceId:q[0],x,y,listenerX:N.me?.x??x,listenerY:N.me?.y??y,gain:.4});
   const hitTick=Number(q[4])||0;
   if(prev&&hitTick>0&&hitTick!==prev.hitTick)
    A()?.play('hit',{weapon:weaponHits.get(q[0])||'sword',variant:hitTick,x,y,listenerX:N.me?.x??x,listenerY:N.me?.y??y,gain:.48});
   const mob=prev||{id:q[0],x,y,animDistance:0,animX:x,animY:y,facing:1,movingUntil:0};
   mob.tx=x;mob.ty=y;mob.hp=q[3];mob.maxHp=Number(q[6])||35;
   mob.hitTick=Number(q[4])||0;mob.attackTick=attackTick;mob.labFrozen=q[7]===1;mob.kind=ARENA_KINDS[q[8]]||'goblin';mob.heavyAngle=(Number(q[10])||0)/100;mob.heavyCast=Array.isArray(q[11])&&q[11].length>=5&&q[11].every(Number.isFinite)?{x:q[11][0],y:q[11][1],r:q[11][2],start:q[11][3],end:q[11][4],kind:q[11][5]||0,angle:q[11][6]||0,length:q[11][7]||0}:null;mob.heavyPhase=Number(q[12])||1;mob.heavyGait=Number.isFinite(q[13])?q[13]/100:0;mob.wormWindup=m.tick+(Number(q[9])||0);mob.wormAngle=(Number(q[10])||0)/100;
   return mob;
  });
  // Fixed-size position history: up to 80 goblins, six small network snapshots.
  // Render two network frames behind to hide 15Hz arrivals and mild jitter.
  N.mobHistory.push({tick:m.tick,positions:new Map(N.mpMobs.map(q=>[q.id,[q.tx,q.ty,q.heavyGait||0,q.heavyAngle||0]])),heroes:new Map(m.players.filter(row=>Array.isArray(row)&&/^p[1-6]$/.test(row[0])&&Number.isFinite(row[1])&&Number.isFinite(row[2])).map(row=>[row[0],[row[1]/10,row[2]/10,!!row[5]]]))});
  if(N.mobHistory.length>12)N.mobHistory.shift();
 }
 for(const row of m.players){
  if(!Array.isArray(row)||!/^p[1-6]$/.test(row[0]))continue;
  const [id,xx,yy,hp,attackTick,online,knocked,attackDir,attackTarget]=row;
  if(!Number.isFinite(xx)||!Number.isFinite(yy))continue;
  const x=xx/10,y=yy/10;let p=N.players.get(id);
  if(!p){p={id,x,y,tx:x,ty:y};N.players.set(id,p)}
  const previousAttack=p.attackTick,previousCollected=p.xpCollected,previousLevel=p.level;
  p.tx=x;p.ty=y;p.hp=hp;p.maxHp=Number(row[9])||100;p.kills=Number(row[10])||0;
  if(LAB_SERVER_BUILD>=168){
   p.level=Math.max(1,Number(row[11])||1);p.xp=Math.max(0,Number(row[12])||0);
   p.xpNeed=Math.max(1,Number(row[13])||160);p.xpCollected=Math.max(0,Number(row[14])||0);
   if(id===N.id&&Number.isInteger(previousCollected)&&p.xpCollected>previousCollected)
    A()?.play('xp',{gain:.6});
   if(id===N.id&&Number.isInteger(previousLevel)&&p.level>previousLevel){
    A()?.play('level',{gain:.7});
    announceArena('✦ NIVO '+p.level+' · IZABERI NADOGRADNJU');
   }
  }
  p.attackTick=attackTick;p.online=!!online;p.knocked=!!knocked;
   p.revivesUsed=Number(row[15])||0;p.reviveProgress=Number(row[16])||0;p.finalDead=row[17]===1;p.downedUntil=Number(row[18])||0;p.enemySlowUntil=Number(row[19])||0;const oldDash=p.dodgeUntil||0;p.dodgeUntil=Number(row[20])||0;p.dodgeReady=Number(row[21])||0;p.dodgeX=(Number(row[22])||0)/1000;p.dodgeY=(Number(row[23])||0)/1000;p.activeWeapon=ARENA_CLASSIC_WEAPONS[row[24]]?row[24]:undefined;p.secondaryWeapon=ARENA_CLASSIC_WEAPONS[row[25]]?row[25]:null;if(Number.isFinite(row[26]))p.speedMult=clamp(row[26],1,1.5);p.sosUsed=row[27]===1;if(Array.isArray(row[28])){const a=row[28];p.arenaKeys=Number(a[0])||0;p.arenaShards=Number(a[1])||0;p.guildMask=Number(a[2])||0;p.guildUnlocked=a[3]===1;p.burgerUntil=Number(a[4])||0;}if(id===N.id&&p.dodgeUntil>oldDash&&p.dodgeUntil>N.tick)A()?.play('step',{gain:1});
  if(Number.isInteger(attackTick)&&attackTick>0&&previousAttack!==undefined&&previousAttack!==attackTick){
   const myPosition=N.me||N.players.get(N.id)||p;
   A()?.play('swing',{weapon:p.activeWeapon||(id===N.id?localArenaLook().weapon:N.looks.get(id)?.look?.weapon)||B().getVillageHeroLook?.(id)?.weapon||'sword',variant:attackTick,
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
   if(N.rejoinCorrection){N.rejoinCorrection=false;N.pending=[];N.delta={x:0,y:0};N.seq=Math.max(N.seq,ack);p.x=x;p.y=y;p.motion=null;}
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
 for(let row=0;row<24;row++)for(let col=0;col<24;col++){
  const x=98+col*174,y=98+row*174;
  if(inside(x,y,33)||
   [[1790,2025],[2220,2140],[2730,2380]].some(([cx,cy])=>(cx-x)**2+(cy-y)**2<70**2))continue;
  points.push([x,y]);
 }
 let seed=1572026;
 for(let i=points.length-1;i>0;i--){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1);[points[i],points[j]]=[points[j],points[i]];
 }
 return N.soloSpawnCache=points;
}
function buildSoloWave(wave,requested=LAB.customCount===null?labDefaultCount(wave):LAB.customCount,batch=0){
 const points=soloHordePoints(),count=Math.min(160,requested,points.length);
 const alive=[...N.players.values()].filter(p=>p.hp>0&&!p.knocked);
 const shift=(Math.max(1,wave)*17+batch*31)%points.length;
 const ranked=points.map((pt,i)=>({
  pt,i,dist:alive.length?Math.min(...alive.map(p=>Math.hypot(pt[0]-p.x,pt[1]-p.y))):9999
 }));
 const safe=ranked.filter(item=>item.dist>=470);
 safe.sort((a,b)=>Math.abs(a.dist-740)-Math.abs(b.dist-740)||
  ((a.i+shift)%points.length)-((b.i+shift)%points.length));
 const spawnList=safe.slice(0,count).map(({pt,dist},i)=>{
  const hp=Math.min(420,35+(wave-1)*9);
  return {id:i>=95?i+1:i,x:pt[0],y:pt[1],sx:pt[0],sy:pt[1],hp,maxHp:hp,
   moveSpeed:arenaMobSpeed(wave,i>=95?i+1:i),spawnDistance:Math.round(dist),attackAt:(i%4)*7,attackTick:-100,deadUntil:0,
   hitTick:-100,vx:0,vy:0,targetId:'',retargetAt:0,
   animDistance:0,animX:pt[0],animY:pt[1],facing:1,movingUntil:0};
 });
 if(batch===0&&wave===10&&spawnList.length){
  const pos=spawnList.pop();
  spawnList.push({...pos,id:95,kind:'troll',hp:900,maxHp:900,moveSpeed:98,
   attackAt:0,attackTick:-100,hitTick:-100,targetId:''});
 }
 return arenaHeavyWave(spawnList.map(m=>arenaWormVariant(m,wave,batch)),wave,batch,N.world);
}

// Test-only actions: use the existing New Zone simulation, not legacy editor logic.
function nearSoloPoint(offset=0){
 const me=N.me||{x:250,y:250},world=N.world;
 const free=(x,y)=>{
  if(x<40||x>world.w-40||y<40||y>world.h-40)return false;
  return (world.obstacles||[]).every(o=>{
   const px=clamp(x,o.x,o.x+o.w),py=clamp(y,o.y,o.y+o.h);
   return (x-px)**2+(y-py)**2>=34*34
  });
 };
 for(let i=0;i<32;i++){
  const a=(i+offset)*2.39996,r=150+Math.floor(i/8)*40;
  const x=Math.round(me.x+Math.cos(a)*r),y=Math.round(me.y+Math.sin(a)*r);
  if(free(x,y))return {x,y};
 }
 return {x:450,y:450};
}
function soloLabAction(m){
 if(N.expedition?.id)return false;
 if(!N.solo||N.phase!=='running')return false;
 const a=m.action,int=(x,min,max,d)=>Number.isFinite(Number(x))?clamp(Math.round(Number(x)),min,max):d;
 const resetWave=()=>{startSoloHorde(N.soloWave);N.soloState='play';N.soloChoice=null;N.soloBetweenUntil=0;N.choiceUiId='';N.soloCrowd.clear()};
 const allowed=new Set(['wave','count','resetCount','resetWave','spawnMob','clearMobs','setMob','removeMob','toggleMobFreeze','freezeAI','godMode','enemyHp','spawnChest','clearChests','spawnAlly','clearAllies','spawnProp','clearProps','heal','damage','weapon','heroLook','undo','resetLab']);
 if(!allowed.has(a))return false;
 if(a==='undo'){
  if(!LAB_UNDO)return false;
  const old=LAB_UNDO;LAB_UNDO=null;
  LAB=old.lab;LAB_WEAPON=old.weapon;LAB_LOOK=old.look;
  N.soloWave=old.wave;N.soloState=old.state;N.soloMobs=old.mobs;N.soloTotal=old.total;N.soloReserve=old.reserve;N.soloBatch=old.batch;
  N.soloChests=old.chests;N.soloChoice=old.choice;N.soloBetweenUntil=old.between;
  N.me.hp=old.hp;N.me.maxHp=old.maxHp;N.me.damage=old.damage;N.me.speedMult=old.speedMult;
  N.soloCrowd.clear();N.soloAcc=0;N.uiAt=0;
  rememberLook('p1',(N.looks.get('p1')?.revision||0)+1,localArenaLook());
  window.NS160_LAB?.refresh();return true;
 }
 const previous=JSON.parse(JSON.stringify({lab:LAB,weapon:LAB_WEAPON,look:LAB_LOOK,
  wave:N.soloWave,state:N.soloState,mobs:N.soloMobs,total:N.soloTotal,reserve:N.soloReserve,batch:N.soloBatch,chests:N.soloChests,choice:N.soloChoice,
  between:N.soloBetweenUntil,hp:N.me.hp,maxHp:N.me.maxHp,damage:N.me.damage,speedMult:N.me.speedMult}));
 if(a==='wave'){N.soloWave=int(m.value,1,99,1);resetWave()}
 else if(a==='count'||a==='resetCount'){LAB.customCount=a==='resetCount'?null:int(m.value,1,80,60);resetWave()}
 else if(a==='resetWave')resetWave();
 else if(a==='spawnMob'){
  const kind=ARENA_KINDS.includes(m.kind)?m.kind:'goblin';
  if(kind==='troll')N.soloMobs=N.soloMobs.filter(m=>!(m.kind==='troll'&&m.hp<=0));
  const qty=kind==='troll'?1:int(m.quantity,1,10,1),ids=new Set(N.soloMobs.map(x=>x.id));
  if(kind==='troll'&&N.soloMobs.some(x=>x.kind==='troll'&&x.hp>0))return false;
  for(let i=0;i<qty&&N.soloMobs.filter(q=>q.hp>0).length<160;i++){
   let id=kind==='troll'?95:0;
   if(kind==='troll'&&ids.has(95))break;
   while(kind!=='troll'&&(ids.has(id)||id===95)&&id<161)id++;
   if(id>=161)break;
   const stat=arenaHeavyStats(kind,N.soloWave),p=nearSoloPoint(i+LAB.rev*7),hp=int(m.hp,1,10000,kind==='troll'?900:stat?.hp||(kind==='worm'?81:35));if(!arenaAcidClear(N.world,p.x,p.y,p.x,p.y,stat?.bodyRadius||20))continue;
   N.soloMobs.push({...stat,id,kind,moveSpeed:stat?.moveSpeed||(kind==='worm'?72:kind==='troll'?98:112),x:p.x,y:p.y,sx:p.x,sy:p.y,prevX:p.x,prevY:p.y,hp,maxHp:hp,
    attackAt:0,attackTick:-100,deadUntil:0,hitTick:-100,vx:0,vy:0,targetId:'',
    retargetAt:0,animDistance:0,animX:p.x,animY:p.y,facing:1,movingUntil:0});
   ids.add(id);
  }
  N.soloState='play';N.soloChoice=null;N.soloCrowd.clear();
 }else if(a==='clearMobs'){N.soloMobs=[];N.soloState='play';N.soloChoice=null;N.soloCrowd.clear()}
 else if(a==='setMob'){const mob=N.soloMobs.find(q=>q.id===int(m.id,0,160,-1));if(mob){mob.hp=mob.maxHp=int(m.hp,1,mob.kind==='troll'?2000:500,35)}}
 else if(a==='removeMob'){const id=int(m.id,0,160,-1);N.soloMobs=N.soloMobs.filter(q=>q.id!==id);N.soloCrowd.clear()}
 else if(a==='toggleMobFreeze'){const mob=N.soloMobs.find(q=>q.id===int(m.id,0,160,-1));if(mob){mob.labFrozen=!mob.labFrozen;mob.vx=mob.vy=0}}
 else if(a==='freezeAI')LAB.freezeAI=!!m.value;
 else if(a==='godMode')LAB.godMode=!!m.value;
 else if(a==='enemyHp'){const hp=int(m.value,1,500,35);for(const mob of N.soloMobs)if(mob.hp>0){mob.hp=hp;mob.maxHp=hp}}
 else if(a==='spawnChest'){
  if(N.soloChests.length>=12)return false;
  const p=nearSoloPoint();N.soloChests.push({id:1000+LAB.rev,x:p.x,y:p.y,opened:false,style:m.style==='arena'?'arena':'classic'});
 }else if(a==='clearChests'){N.soloChests=[];N.soloChoice=null}
 else if(a==='spawnAlly'){
  if(LAB.allies.length>=3)return false;
  const p=nearSoloPoint(LAB.allies.length);LAB.allies.push({id:++LAB.rev,x:p.x,y:p.y,hp:100,maxHp:100,lastAttack:-100});
 }else if(a==='clearAllies')LAB.allies=[];
 else if(a==='spawnProp'){
  if(LAB.props.length>=20||!['torch','banner','target'].includes(m.kind))return false;
  const p=nearSoloPoint(LAB.props.length);LAB.props.push({id:++LAB.rev,x:p.x,y:p.y,kind:m.kind});
 }else if(a==='clearProps')LAB.props=[];
 else if(a==='heal'){N.me.hp=N.me.maxHp}
 else if(a==='damage')N.me.damage=int(m.value,1,250,22);
 else if(a==='weapon'){
  if(!LAB_WEAPONS.has(m.value))return false;
  LAB_WEAPON=m.value;rememberLook('p1',(N.looks.get('p1')?.revision||0)+1,localArenaLook());
 }else if(a==='heroLook'){
  const appearance=m.look||{},skin=/^#[a-fA-F0-9]{6}$/.test(appearance.skin||'')?appearance.skin:'#d7b28f';
  LAB_LOOK={...LAB_LOOK,skin,
   heroClass:['warrior','ranger','mage','support'].includes(appearance.heroClass)?appearance.heroClass:'warrior',
   bodyStyle:['classic','slim','strong'].includes(appearance.bodyStyle)?appearance.bodyStyle:'classic',
   visualSize:clamp(Number(appearance.visualSize)||.79,.7,1.12)};
  rememberLook('p1',(N.looks.get('p1')?.revision||0)+1,localArenaLook());
 }else if(a==='resetLab'){
  LAB={enabled:false,freezeAI:false,godMode:false,customCount:null,allies:[],props:[],rev:LAB.rev+1};
  LAB_WEAPON=null;rememberLook('p1',(N.looks.get('p1')?.revision||0)+1,localArenaLook());resetWave();
 }
 if(a!=='resetLab')LAB.enabled=true;
 LAB_UNDO=previous;LAB.rev++;N.uiAt=0;window.NS160_LAB?.refresh();return true;
}
function stepSoloAllies(){
 for(const ally of LAB.allies){
  let nearest=null,best=380**2;
  for(const mob of N.soloMobs)if(mob.hp>0){
   const d=(mob.x-ally.x)**2+(mob.y-ally.y)**2;
   if(d<best){best=d;nearest=mob}
  }
  const target=nearest||N.me;if(!target)continue;
  const dx=target.x-ally.x,dy=target.y-ally.y,d=Math.hypot(dx,dy);
  if(d>(nearest?65:90))moveLocal(ally,dx/d*2.9,dy/d*2.9);
  if(nearest&&d<85&&N.soloTick-ally.lastAttack>=23){
   ally.lastAttack=N.soloTick;nearest.hitTick=N.soloTick;
   nearest.hp=Math.max(0,nearest.hp-14);
   if(nearest.hp===0)nearest.deadUntil=N.soloTick+105;
  }
 }
}
function startSoloHorde(wave){
 N.acidShots=[];N.soloBatch=0;N.soloMobs=buildSoloWave(wave,LAB.customCount===null?arenaRuleCount(LAB.enabled?null:N.rule,labDefaultCount(wave)):LAB.customCount);N.soloTotal=(LAB.enabled||LAB.customCount!==null)?N.soloMobs.length:arenaRuleCount(N.rule,labDefaultCount(wave));N.soloReserve=Math.max(0,N.soloTotal-N.soloMobs.length);
}
function nextSoloHorde(){
 if(!(N.soloReserve>0))return false;const next=buildSoloWave(N.soloWave,N.soloReserve,(N.soloBatch||0)+1);if(!next.length)return false;N.soloBatch=(N.soloBatch||0)+1;N.soloReserve-=next.length;N.acidShots=[];N.soloMobs=next;N.soloCrowd.clear();announceArena('STIŽE POJAČANJE · '+next.length);return true;
}
function soloWaveDone(){
 if(!LAB.enabled&&!N.explore?.invalid&&arenaRuleWave(N.rule,N.soloWave,N.players)){announceArena('KAMPANJA ZAVRŠENA');return}
 N.soloState='between';const me=N.me;
 const chest={id:100+N.soloWave,x:clamp(me.x+62,35,N.world.w-35),
  y:clamp(me.y+62,35,N.world.h-35),opened:true};
 N.soloChests.push(chest);
 if(N.soloChests.length>12)N.soloChests=N.soloChests.slice(-12);
 N.soloChoice={id:chest.id,kind:'chest',options:arenaRewardOptions(N.me,N.soloChestSeq+1),seq:++N.soloChestSeq,owner:'p1',until:Date.now()+7000};
 N.choiceUiId='';A()?.play('chest');
}

function startSolo(){
 const mode=arenaRuleMode(arguments[0]);
 if(B().currentProfileLevel?.()<NS140_TEMP_UNLOCK_LEVEL||B().NET?.role||!['idle','error'].includes(N.phase))return false;
 if(N.ws){try{N.ws.close()}catch{}N.ws=null}
 LAB={enabled:false,freezeAI:false,godMode:false,customCount:null,allies:[],props:[],rev:0};LAB_WEAPON=null;LAB_LOOK=null;LAB_UNDO=null;LAB_PAUSE={paused:false,votes:[],needed:1,expires:0};
 resetArenaMagic();resetArenaMap();magicSupported=true;N.solo=true;N.phase='running';captureArenaAccount();N.paused=false;N.id='p1';N.match='offline';N.ticket='';
 N.world={"w":4200,"h":4200,"r":14,"speed":156,"decorSeed":168,"classicProps":[{"type":"rock","x":3660,"y":3286,"r":40,"seed":41202},{"type":"rock","x":3938,"y":923,"r":21,"seed":31271},{"type":"rock","x":880,"y":1379,"r":32,"seed":19345},{"type":"tree","x":3496,"y":183,"r":31,"seed":93981},{"type":"tree","x":169,"y":3375,"r":38,"seed":97915},{"type":"tree","x":862,"y":2271,"r":30,"seed":49565},{"type":"rock","x":491,"y":3300,"r":25,"seed":94322},{"type":"tree","x":1612,"y":2949,"r":18,"seed":11729},{"type":"tree","x":3689,"y":2660,"r":23,"seed":35604},{"type":"tree","x":2264,"y":2466,"r":24,"seed":62456},{"type":"tree","x":735,"y":1736,"r":28,"seed":77837},{"type":"rock","x":2458,"y":1332,"r":29,"seed":99574},{"type":"rock","x":3077,"y":3972,"r":39,"seed":90708},{"type":"tree","x":2864,"y":2642,"r":34,"seed":60664},{"type":"tree","x":2124,"y":236,"r":35,"seed":92972},{"type":"tree","x":2768,"y":2324,"r":19,"seed":18890},{"type":"rock","x":1603,"y":1086,"r":42,"seed":56216},{"type":"rock","x":2038,"y":1817,"r":35,"seed":98055},{"type":"tree","x":3206,"y":3066,"r":24,"seed":98791},{"type":"rock","x":757,"y":1396,"r":38,"seed":62833},{"type":"rock","x":3869,"y":3922,"r":33,"seed":32},{"type":"rock","x":3743,"y":2650,"r":24,"seed":12134},{"type":"tree","x":4005,"y":838,"r":23,"seed":58370},{"type":"tree","x":747,"y":1594,"r":24,"seed":95038},{"type":"rock","x":200,"y":1857,"r":32,"seed":26801},{"type":"rock","x":1427,"y":3316,"r":20,"seed":86034},{"type":"rock","x":1255,"y":3489,"r":21,"seed":66679},{"type":"rock","x":3297,"y":2102,"r":30,"seed":55608},{"type":"tree","x":2712,"y":3926,"r":23,"seed":97248},{"type":"rock","x":1849,"y":1896,"r":30,"seed":59828},{"type":"tree","x":2790,"y":501,"r":24,"seed":64896},{"type":"tree","x":2102,"y":2631,"r":28,"seed":4700},{"type":"rock","x":990,"y":3121,"r":21,"seed":44104},{"type":"tree","x":2324,"y":1641,"r":25,"seed":23970},{"type":"rock","x":3615,"y":2246,"r":31,"seed":92711},{"type":"tree","x":2095,"y":794,"r":24,"seed":99020},{"type":"tree","x":2694,"y":1604,"r":37,"seed":48671},{"type":"tree","x":652,"y":2542,"r":33,"seed":52672},{"type":"rock","x":3689,"y":1365,"r":40,"seed":55172},{"type":"rock","x":3987,"y":3480,"r":40,"seed":21540},{"type":"rock","x":1708,"y":609,"r":20,"seed":67105},{"type":"tree","x":1008,"y":714,"r":27,"seed":60037},{"type":"rock","x":184,"y":2238,"r":36,"seed":5657},{"type":"rock","x":2819,"y":4035,"r":42,"seed":9754},{"type":"rock","x":2093,"y":188,"r":22,"seed":20452},{"type":"rock","x":3414,"y":2496,"r":32,"seed":86764},{"type":"rock","x":1096,"y":2301,"r":28,"seed":71510},{"type":"rock","x":2303,"y":2816,"r":22,"seed":52774},{"type":"tree","x":891,"y":339,"r":26,"seed":87532},{"type":"tree","x":487,"y":2608,"r":20,"seed":50223},{"type":"rock","x":2739,"y":1105,"r":38,"seed":73920},{"type":"rock","x":888,"y":1473,"r":27,"seed":52597},{"type":"rock","x":1517,"y":3802,"r":37,"seed":64708},{"type":"tree","x":2263,"y":1513,"r":24,"seed":15729},{"type":"rock","x":3333,"y":838,"r":34,"seed":18604},{"type":"rock","x":3981,"y":3671,"r":38,"seed":69833},{"type":"rock","x":1721,"y":2328,"r":29,"seed":81616},{"type":"tree","x":1638,"y":1591,"r":28,"seed":71814},{"type":"tree","x":1069,"y":2047,"r":35,"seed":58849},{"type":"tree","x":696,"y":1371,"r":18,"seed":99227},{"type":"rock","x":2506,"y":3248,"r":36,"seed":86909},{"type":"tree","x":655,"y":714,"r":39,"seed":17320},{"type":"rock","x":4022,"y":3132,"r":34,"seed":57479},{"type":"rock","x":515,"y":821,"r":22,"seed":45275},{"type":"rock","x":3444,"y":2094,"r":37,"seed":43096},{"type":"tree","x":448,"y":2776,"r":22,"seed":93117},{"type":"tree","x":2230,"y":1497,"r":25,"seed":99316},{"type":"rock","x":3894,"y":3016,"r":40,"seed":93250},{"type":"rock","x":1512,"y":2970,"r":30,"seed":94507},{"type":"rock","x":2926,"y":3325,"r":38,"seed":16267},{"type":"rock","x":1471,"y":2986,"r":34,"seed":30685},{"type":"tree","x":235,"y":2554,"r":34,"seed":95953},{"type":"tree","x":3755,"y":2145,"r":30,"seed":97482},{"type":"rock","x":3035,"y":2995,"r":41,"seed":99437},{"type":"tree","x":808,"y":430,"r":36,"seed":27536},{"type":"rock","x":1812,"y":3483,"r":26,"seed":21495},{"type":"tree","x":2638,"y":3429,"r":26,"seed":26821},{"type":"tree","x":2150,"y":1035,"r":31,"seed":63382},{"type":"tree","x":3672,"y":4000,"r":33,"seed":18742},{"type":"rock","x":2326,"y":1001,"r":32,"seed":32429},{"type":"tree","x":447,"y":2269,"r":28,"seed":97563},{"type":"rock","x":3878,"y":191,"r":23,"seed":75304},{"type":"tree","x":1113,"y":317,"r":22,"seed":16132},{"type":"tree","x":3220,"y":3683,"r":35,"seed":91544},{"type":"tree","x":2351,"y":1255,"r":22,"seed":66169},{"type":"tree","x":1378,"y":574,"r":30,"seed":70907},{"type":"tree","x":3332,"y":2981,"r":22,"seed":27832},{"type":"rock","x":2285,"y":231,"r":39,"seed":14632},{"type":"tree","x":4036,"y":3721,"r":20,"seed":157},{"type":"rock","x":1327,"y":4032,"r":40,"seed":42950},{"type":"rock","x":1585,"y":3225,"r":22,"seed":56460},{"type":"rock","x":3837,"y":1967,"r":27,"seed":15531},{"type":"rock","x":767,"y":3306,"r":27,"seed":30252},{"type":"tree","x":1980,"y":805,"r":36,"seed":4120},{"type":"rock","x":909,"y":885,"r":28,"seed":8753},{"type":"rock","x":1535,"y":725,"r":37,"seed":13780},{"type":"tree","x":2850,"y":3890,"r":19,"seed":24128},{"type":"tree","x":3617,"y":934,"r":31,"seed":57034},{"type":"rock","x":3821,"y":461,"r":39,"seed":68179},{"type":"rock","x":2887,"y":2607,"r":32,"seed":172},{"type":"tree","x":494,"y":3915,"r":37,"seed":45785},{"type":"tree","x":2336,"y":2596,"r":25,"seed":55283},{"type":"tree","x":1667,"y":636,"r":26,"seed":63093},{"type":"rock","x":1390,"y":633,"r":27,"seed":21152},{"type":"rock","x":1444,"y":1941,"r":30,"seed":52925},{"type":"rock","x":1678,"y":1296,"r":38,"seed":7897},{"type":"tree","x":1514,"y":3301,"r":19,"seed":99756},{"type":"tree","x":2603,"y":1876,"r":21,"seed":81450},{"type":"tree","x":1537,"y":2797,"r":19,"seed":51836},{"type":"tree","x":2830,"y":1291,"r":26,"seed":86236},{"type":"tree","x":772,"y":1358,"r":32,"seed":5570},{"type":"tree","x":2724,"y":1415,"r":39,"seed":17817},{"type":"tree","x":1340,"y":782,"r":19,"seed":92503},{"type":"rock","x":3992,"y":3661,"r":24,"seed":55231},{"type":"tree","x":653,"y":1304,"r":31,"seed":47100},{"type":"tree","x":2974,"y":2000,"r":34,"seed":22781},{"type":"rock","x":1306,"y":1603,"r":20,"seed":66026},{"type":"tree","x":309,"y":1553,"r":38,"seed":1892},{"type":"tree","x":853,"y":4024,"r":30,"seed":1368},{"type":"rock","x":1458,"y":762,"r":41,"seed":65296},{"type":"tree","x":2758,"y":1723,"r":25,"seed":34643},{"type":"rock","x":2330,"y":1605,"r":41,"seed":14540},{"type":"tree","x":2543,"y":1224,"r":37,"seed":86719},{"type":"rock","x":3331,"y":3256,"r":36,"seed":73735},{"type":"crystal","x":4073,"y":3770,"r":13,"seed":24750},{"type":"crystal","x":1352,"y":583,"r":13,"seed":575},{"type":"crystal","x":589,"y":501,"r":13,"seed":42009},{"type":"crystal","x":3467,"y":1034,"r":13,"seed":88224},{"type":"crystal","x":651,"y":1504,"r":13,"seed":37142},{"type":"crystal","x":289,"y":167,"r":13,"seed":91330},{"type":"crystal","x":1057,"y":2517,"r":13,"seed":96533},{"type":"crystal","x":977,"y":2340,"r":13,"seed":12170},{"type":"crystal","x":284,"y":2916,"r":13,"seed":47069},{"type":"crystal","x":1521,"y":631,"r":13,"seed":72127},{"type":"crystal","x":3005,"y":1504,"r":13,"seed":73626},{"type":"crystal","x":388,"y":1461,"r":13,"seed":21862},{"type":"crystal","x":3724,"y":2395,"r":13,"seed":68941},{"type":"crystal","x":3919,"y":1061,"r":13,"seed":70746},{"type":"crystal","x":921,"y":3885,"r":13,"seed":37182},{"type":"crystal","x":2730,"y":873,"r":13,"seed":6807},{"type":"crystal","x":1815,"y":806,"r":13,"seed":40232},{"type":"crystal","x":2064,"y":1738,"r":13,"seed":12190},{"type":"crystal","x":1498,"y":2459,"r":13,"seed":45699},{"type":"crystal","x":2499,"y":2484,"r":13,"seed":61979},{"type":"crystal","x":1726,"y":348,"r":13,"seed":39291},{"type":"crystal","x":210,"y":805,"r":13,"seed":82663},{"type":"crystal","x":1915,"y":2305,"r":13,"seed":82644},{"type":"crystal","x":3148,"y":3141,"r":13,"seed":46580},{"type":"crystal","x":1503,"y":1000,"r":13,"seed":62245},{"type":"crystal","x":2848,"y":2399,"r":13,"seed":46779},{"type":"crystal","x":2783,"y":110,"r":13,"seed":1512},{"type":"crystal","x":1657,"y":821,"r":13,"seed":78382},{"type":"crystal","x":3403,"y":2165,"r":13,"seed":59532},{"type":"crystal","x":499,"y":1772,"r":13,"seed":83731},{"type":"crystal","x":3301,"y":2390,"r":13,"seed":41894},{"type":"house","x":1810,"y":183,"r":57,"seed":40676},{"type":"house","x":3750,"y":144,"r":53,"seed":46000},{"type":"house","x":1074,"y":2818,"r":62,"seed":57213},{"type":"house","x":1010,"y":1742,"r":59,"seed":40263},{"type":"house","x":617,"y":2249,"r":49,"seed":6398},{"type":"house","x":309,"y":606,"r":55,"seed":89778},{"type":"house","x":2119,"y":3857,"r":62,"seed":5178},{"type":"house","x":3595,"y":1602,"r":49,"seed":47443},{"type":"house","x":4047,"y":2230,"r":57,"seed":36201},{"type":"bush","x":607,"y":1386,"r":24,"seed":32660},{"type":"bush","x":3140,"y":3795,"r":14,"seed":75999},{"type":"bush","x":3284,"y":1946,"r":26,"seed":38306},{"type":"bush","x":121,"y":3867,"r":14,"seed":86670},{"type":"bush","x":752,"y":2854,"r":16,"seed":88402},{"type":"bush","x":3382,"y":966,"r":18,"seed":84036},{"type":"bush","x":2602,"y":2344,"r":17,"seed":46370},{"type":"bush","x":1343,"y":201,"r":16,"seed":89603},{"type":"bush","x":3085,"y":2083,"r":26,"seed":17630},{"type":"bush","x":2437,"y":404,"r":20,"seed":25566},{"type":"bush","x":1142,"y":2169,"r":19,"seed":93546},{"type":"bush","x":2290,"y":3108,"r":20,"seed":36882},{"type":"bush","x":3839,"y":2309,"r":25,"seed":1621},{"type":"bush","x":1647,"y":3954,"r":18,"seed":19585},{"type":"bush","x":1351,"y":1272,"r":25,"seed":61941},{"type":"bush","x":3026,"y":377,"r":15,"seed":52375},{"type":"bush","x":2696,"y":2323,"r":27,"seed":65007},{"type":"bush","x":842,"y":2709,"r":26,"seed":92316},{"type":"bush","x":3433,"y":3705,"r":20,"seed":6356},{"type":"bush","x":593,"y":3219,"r":14,"seed":83750},{"type":"bush","x":916,"y":1156,"r":15,"seed":53796},{"type":"bush","x":2140,"y":322,"r":20,"seed":21667},{"type":"bush","x":2479,"y":3043,"r":19,"seed":55766},{"type":"bush","x":3391,"y":1560,"r":20,"seed":53312},{"type":"bush","x":3126,"y":881,"r":16,"seed":23208},{"type":"bush","x":1144,"y":2882,"r":23,"seed":50252},{"type":"bush","x":2835,"y":209,"r":20,"seed":29768},{"type":"bush","x":3065,"y":1836,"r":17,"seed":86697},{"type":"bush","x":3312,"y":2230,"r":22,"seed":18238},{"type":"bush","x":3291,"y":1098,"r":22,"seed":24071},{"type":"bush","x":839,"y":2355,"r":14,"seed":1828},{"type":"bush","x":1388,"y":1823,"r":26,"seed":40231},{"type":"bush","x":1445,"y":2419,"r":21,"seed":34529},{"type":"bush","x":3180,"y":397,"r":22,"seed":50580},{"type":"bush","x":2812,"y":3437,"r":23,"seed":15160},{"type":"bush","x":2453,"y":2318,"r":26,"seed":53130},{"type":"bush","x":2878,"y":1583,"r":24,"seed":24697},{"type":"bush","x":2294,"y":3349,"r":22,"seed":51836},{"type":"bush","x":3380,"y":1725,"r":16,"seed":47934},{"type":"bush","x":210,"y":2756,"r":27,"seed":89723},{"type":"bush","x":802,"y":2645,"r":21,"seed":95551},{"type":"bush","x":3440,"y":528,"r":17,"seed":99077},{"type":"bush","x":328,"y":331,"r":22,"seed":32429},{"type":"bush","x":3943,"y":790,"r":20,"seed":57898},{"type":"bush","x":1349,"y":1403,"r":20,"seed":12230},{"type":"bush","x":148,"y":1605,"r":17,"seed":52584},{"type":"bush","x":2011,"y":3145,"r":26,"seed":18207},{"type":"bush","x":2134,"y":2833,"r":16,"seed":46889},{"type":"bush","x":3032,"y":3465,"r":27,"seed":10282},{"type":"bush","x":417,"y":390,"r":21,"seed":57109},{"type":"bush","x":2851,"y":1222,"r":18,"seed":78363},{"type":"bush","x":1323,"y":2524,"r":16,"seed":33530},{"type":"bush","x":3916,"y":2720,"r":20,"seed":1916},{"type":"bush","x":2210,"y":809,"r":25,"seed":48126},{"type":"bush","x":2392,"y":2729,"r":14,"seed":15781},{"type":"bush","x":1600,"y":2755,"r":21,"seed":88501},{"type":"bush","x":881,"y":3360,"r":22,"seed":82250},{"type":"bush","x":631,"y":3298,"r":26,"seed":58085},{"type":"bush","x":602,"y":3493,"r":14,"seed":69379},{"type":"bush","x":3787,"y":2063,"r":23,"seed":82579},{"type":"bush","x":754,"y":2312,"r":25,"seed":35564},{"type":"bush","x":1087,"y":1108,"r":22,"seed":20358},{"type":"bush","x":777,"y":810,"r":17,"seed":92891},{"type":"bush","x":3735,"y":3346,"r":20,"seed":41546},{"type":"bush","x":515,"y":254,"r":21,"seed":86978},{"type":"bush","x":2429,"y":1124,"r":22,"seed":98458},{"type":"bush","x":546,"y":3417,"r":26,"seed":9159},{"type":"bush","x":2896,"y":2138,"r":23,"seed":11922},{"type":"ruin","x":1405,"y":3431,"r":45,"seed":88200},{"type":"ruin","x":1988,"y":3019,"r":44,"seed":44822},{"type":"ruin","x":163,"y":530,"r":42,"seed":35143},{"type":"ruin","x":422,"y":265,"r":41,"seed":18944},{"type":"ruin","x":3914,"y":3221,"r":43,"seed":3247},{"type":"ruin","x":1519,"y":3521,"r":40,"seed":52131},{"type":"ruin","x":2070,"y":4078,"r":46,"seed":11146},{"type":"ruin","x":2676,"y":549,"r":39,"seed":75294},{"type":"ruin","x":1915,"y":1508,"r":32,"seed":26223},{"type":"ruin","x":298,"y":766,"r":32,"seed":25541},{"type":"ruin","x":173,"y":3671,"r":33,"seed":19174},{"type":"ruin","x":2388,"y":3680,"r":43,"seed":21538},{"type":"ruin","x":3640,"y":1721,"r":40,"seed":89489},{"type":"ruin","x":1309,"y":1484,"r":34,"seed":64333},{"type":"ruin","x":236,"y":1440,"r":46,"seed":92321},{"type":"ruin","x":331,"y":2487,"r":36,"seed":18651},{"type":"ruin","x":4053,"y":3856,"r":34,"seed":75647},{"type":"ruin","x":2986,"y":2347,"r":38,"seed":99148},{"type":"ruin","x":3792,"y":2807,"r":40,"seed":82372},{"type":"ruin","x":3928,"y":2472,"r":31,"seed":83500},{"type":"ruin","x":4049,"y":2703,"r":46,"seed":85878},{"type":"ruin","x":1244,"y":2950,"r":37,"seed":27738},{"type":"ruin","x":3520,"y":3626,"r":44,"seed":85930},{"type":"ruin","x":2321,"y":708,"r":37,"seed":36170},{"type":"ruin","x":3659,"y":1920,"r":37,"seed":33644},{"type":"pond","x":3038,"y":1367,"r":46,"seed":28508},{"type":"pond","x":3071,"y":966,"r":52,"seed":58361},{"type":"pond","x":1407,"y":1718,"r":52,"seed":40142},{"type":"pond","x":1457,"y":299,"r":47,"seed":4929},{"type":"pond","x":3378,"y":3378,"r":42,"seed":1979},{"type":"pond","x":2743,"y":2625,"r":54,"seed":26066},{"type":"pond","x":3710,"y":1027,"r":58,"seed":89454},{"type":"pond","x":223,"y":3533,"r":51,"seed":70102},{"type":"pond","x":1330,"y":3597,"r":41,"seed":81014},{"type":"cart","x":940,"y":2284,"r":17,"seed":38650},{"type":"cart","x":1062,"y":1187,"r":18,"seed":3537},{"type":"cart","x":2920,"y":3539,"r":19,"seed":36174},{"type":"cart","x":1851,"y":1075,"r":19,"seed":24702},{"type":"cart","x":988,"y":2184,"r":20,"seed":22149},{"type":"cart","x":1963,"y":1318,"r":18,"seed":62861},{"type":"cart","x":207,"y":3173,"r":21,"seed":25547},{"type":"cart","x":1400,"y":2194,"r":17,"seed":55703},{"type":"cart","x":134,"y":1447,"r":20,"seed":18296},{"type":"cart","x":3101,"y":1690,"r":21,"seed":47316},{"type":"cart","x":2920,"y":3614,"r":21,"seed":13305},{"type":"torch","x":412,"y":200,"r":12,"seed":89430},{"type":"torch","x":370,"y":2850,"r":13,"seed":80151},{"type":"torch","x":1939,"y":3314,"r":11,"seed":1550},{"type":"torch","x":1080,"y":1965,"r":11,"seed":39909},{"type":"torch","x":1876,"y":2630,"r":12,"seed":49587},{"type":"torch","x":258,"y":2318,"r":12,"seed":72659},{"type":"torch","x":193,"y":3612,"r":13,"seed":80718},{"type":"torch","x":2732,"y":2457,"r":13,"seed":61316},{"type":"torch","x":2934,"y":1447,"r":11,"seed":53658},{"type":"torch","x":3661,"y":2970,"r":11,"seed":48461},{"type":"torch","x":1031,"y":4063,"r":13,"seed":66040},{"type":"torch","x":232,"y":3922,"r":12,"seed":51676},{"type":"torch","x":2621,"y":371,"r":12,"seed":52324},{"type":"torch","x":1463,"y":1176,"r":12,"seed":62110},{"type":"torch","x":3034,"y":2263,"r":12,"seed":59109},{"type":"torch","x":3409,"y":1154,"r":13,"seed":6535},{"type":"market","x":3526,"y":726,"r":70,"seed":24307},{"type":"market","x":396,"y":1951,"r":61,"seed":40431},{"type":"crate","x":3219,"y":2266,"r":19,"seed":30276},{"type":"crate","x":791,"y":2759,"r":15,"seed":24191},{"type":"crate","x":497,"y":171,"r":13,"seed":47784},{"type":"crate","x":2852,"y":3033,"r":18,"seed":94062},{"type":"crate","x":3963,"y":1210,"r":16,"seed":9623},{"type":"crate","x":1695,"y":114,"r":19,"seed":90316},{"type":"crate","x":761,"y":3202,"r":16,"seed":25432},{"type":"crate","x":1137,"y":2540,"r":19,"seed":54503},{"type":"crate","x":3231,"y":3240,"r":15,"seed":10430},{"type":"crate","x":3856,"y":2569,"r":14,"seed":26543},{"type":"crate","x":2455,"y":534,"r":19,"seed":90279},{"type":"crate","x":3291,"y":2636,"r":18,"seed":44377},{"type":"crate","x":847,"y":4089,"r":14,"seed":27174},{"type":"crate","x":289,"y":967,"r":14,"seed":50593},{"type":"crate","x":3461,"y":1075,"r":14,"seed":6348},{"type":"crate","x":3515,"y":1771,"r":15,"seed":39436},{"type":"crate","x":426,"y":2462,"r":18,"seed":52981},{"type":"crate","x":2874,"y":1090,"r":17,"seed":33477},{"type":"crate","x":2874,"y":546,"r":14,"seed":10520},{"type":"crate","x":2488,"y":369,"r":15,"seed":25253},{"type":"crate","x":2699,"y":1234,"r":17,"seed":13990},{"type":"crate","x":1956,"y":1626,"r":13,"seed":37123},{"type":"crate","x":3401,"y":1343,"r":17,"seed":76494},{"type":"crate","x":2407,"y":663,"r":15,"seed":40399},{"type":"crate","x":898,"y":3053,"r":16,"seed":69019},{"type":"shed","x":1969,"y":3626,"r":42,"seed":42110},{"type":"shed","x":3512,"y":1848,"r":47,"seed":76697},{"type":"shed","x":3915,"y":612,"r":47,"seed":63554},{"type":"shed","x":1676,"y":435,"r":57,"seed":51913},{"type":"shed","x":2032,"y":1274,"r":50,"seed":38461},{"type":"shed","x":2615,"y":715,"r":48,"seed":872},{"type":"shed","x":2542,"y":969,"r":53,"seed":93068},{"type":"shed","x":4049,"y":1787,"r":52,"seed":16017},{"type":"bin","x":2985,"y":441,"r":17,"seed":85254},{"type":"bin","x":1269,"y":2258,"r":17,"seed":34263},{"type":"bin","x":2043,"y":3280,"r":14,"seed":2315},{"type":"bin","x":2762,"y":3793,"r":20,"seed":45863},{"type":"bin","x":2456,"y":1067,"r":16,"seed":37510},{"type":"bin","x":575,"y":2148,"r":17,"seed":41661},{"type":"bin","x":1676,"y":3047,"r":17,"seed":80881},{"type":"bin","x":1382,"y":1045,"r":17,"seed":32042},{"type":"bin","x":1092,"y":426,"r":19,"seed":72118},{"type":"bin","x":2040,"y":281,"r":18,"seed":24908},{"type":"bin","x":2484,"y":2867,"r":18,"seed":93183},{"type":"bin","x":403,"y":2726,"r":19,"seed":94450},{"type":"bin","x":1170,"y":3010,"r":20,"seed":16765},{"type":"bin","x":236,"y":1922,"r":19,"seed":2555},{"type":"dumpster","x":3492,"y":2792,"r":33,"seed":24102},{"type":"dumpster","x":241,"y":1790,"r":26,"seed":65361},{"type":"dumpster","x":3786,"y":3385,"r":25,"seed":35464},{"type":"dumpster","x":3662,"y":2546,"r":31,"seed":20482},{"type":"dumpster","x":2031,"y":2489,"r":30,"seed":58413},{"type":"dumpster","x":1078,"y":175,"r":33,"seed":37050},{"type":"dumpster","x":1234,"y":1156,"r":30,"seed":77252},{"type":"dumpster","x":984,"y":2976,"r":33,"seed":884},{"type":"wreck","x":1424,"y":2731,"r":51,"seed":13299},{"type":"wreck","x":4085,"y":507,"r":40,"seed":37578},{"type":"wreck","x":2157,"y":2540,"r":45,"seed":76982},{"type":"wreck","x":240,"y":3265,"r":51,"seed":44698},{"type":"wreck","x":3586,"y":3879,"r":50,"seed":54386},{"type":"wreck","x":2423,"y":2182,"r":49,"seed":27831},{"type":"wreck","x":3053,"y":213,"r":39,"seed":7744},{"type":"wreck","x":2436,"y":1707,"r":44,"seed":23733},{"type":"wreck","x":2822,"y":2000,"r":35,"seed":59679},{"type":"haystack","x":2259,"y":1710,"r":44,"seed":49381},{"type":"haystack","x":3549,"y":2462,"r":33,"seed":20227},{"type":"haystack","x":675,"y":2767,"r":32,"seed":86845},{"type":"haystack","x":1179,"y":1091,"r":36,"seed":71162},{"type":"haystack","x":1277,"y":696,"r":34,"seed":97117},{"type":"haystack","x":1470,"y":2069,"r":39,"seed":70236},{"type":"haystack","x":2910,"y":1709,"r":32,"seed":892},{"type":"haystack","x":2211,"y":596,"r":43,"seed":8871},{"type":"haystack","x":2441,"y":1508,"r":43,"seed":88762},{"type":"haystack","x":2099,"y":3071,"r":37,"seed":47780},{"type":"haystack","x":1230,"y":2041,"r":31,"seed":19187},{"type":"haystack","x":2571,"y":3955,"r":36,"seed":60296},{"type":"bale","x":1682,"y":3604,"r":21,"seed":10779},{"type":"bale","x":3052,"y":3328,"r":23,"seed":11346},{"type":"bale","x":2929,"y":4079,"r":22,"seed":97683},{"type":"bale","x":3371,"y":2708,"r":26,"seed":12676},{"type":"bale","x":3719,"y":306,"r":25,"seed":35559},{"type":"bale","x":1125,"y":3040,"r":20,"seed":8053},{"type":"bale","x":3451,"y":2642,"r":27,"seed":96521},{"type":"bale","x":658,"y":3129,"r":27,"seed":72803},{"type":"bale","x":1196,"y":2302,"r":27,"seed":20713},{"type":"bale","x":2155,"y":2929,"r":27,"seed":92206},{"type":"bale","x":1803,"y":2422,"r":26,"seed":10818},{"type":"bale","x":3706,"y":3677,"r":19,"seed":36117},{"type":"bale","x":770,"y":2940,"r":28,"seed":84397},{"type":"bale","x":3887,"y":2187,"r":21,"seed":16133},{"type":"bale","x":954,"y":198,"r":26,"seed":61812},{"type":"bale","x":1789,"y":1299,"r":19,"seed":83058},{"type":"bale","x":297,"y":1647,"r":25,"seed":13337},{"type":"bale","x":2317,"y":2751,"r":23,"seed":93235},{"type":"bale","x":2120,"y":1184,"r":25,"seed":99779},{"type":"bale","x":2096,"y":1343,"r":24,"seed":23397},{"type":"tractor","x":1108,"y":3762,"r":43,"seed":11490},{"type":"tractor","x":1061,"y":3601,"r":43,"seed":45826},{"type":"tractor","x":2813,"y":1839,"r":44,"seed":95218},{"type":"tractor","x":3732,"y":725,"r":41,"seed":28787},{"type":"tractor","x":541,"y":3743,"r":41,"seed":99615},{"type":"flower","x":3324,"y":2000,"r":12,"seed":34339},{"type":"flower","x":2860,"y":2165,"r":10,"seed":36871},{"type":"flower","x":1210,"y":2242,"r":10,"seed":13246},{"type":"flower","x":4034,"y":998,"r":10,"seed":48368},{"type":"flower","x":485,"y":1816,"r":12,"seed":81503},{"type":"flower","x":1596,"y":2189,"r":9,"seed":94419},{"type":"flower","x":1494,"y":2903,"r":11,"seed":85913},{"type":"flower","x":2438,"y":202,"r":11,"seed":44284},{"type":"flower","x":395,"y":2487,"r":9,"seed":28527},{"type":"flower","x":1305,"y":1374,"r":11,"seed":68601},{"type":"flower","x":370,"y":2609,"r":11,"seed":84437},{"type":"flower","x":3973,"y":1146,"r":12,"seed":82854},{"type":"flower","x":2865,"y":1503,"r":8,"seed":33877},{"type":"flower","x":1499,"y":2873,"r":11,"seed":89058},{"type":"flower","x":3000,"y":2676,"r":10,"seed":10826},{"type":"flower","x":1838,"y":2697,"r":9,"seed":76934},{"type":"flower","x":3267,"y":1212,"r":11,"seed":19700},{"type":"flower","x":2613,"y":1351,"r":10,"seed":76162},{"type":"flower","x":3198,"y":2532,"r":9,"seed":46152},{"type":"flower","x":297,"y":2314,"r":11,"seed":13592},{"type":"flower","x":2254,"y":3671,"r":11,"seed":18975},{"type":"flower","x":2183,"y":1173,"r":8,"seed":83255},{"type":"flower","x":3629,"y":2072,"r":9,"seed":19319},{"type":"flower","x":2011,"y":3776,"r":11,"seed":20137},{"type":"flower","x":2786,"y":2523,"r":9,"seed":20882},{"type":"flower","x":1954,"y":3477,"r":10,"seed":24895},{"type":"flower","x":2326,"y":3954,"r":9,"seed":21935},{"type":"flower","x":3666,"y":769,"r":10,"seed":26041},{"type":"flower","x":3667,"y":2924,"r":9,"seed":33725},{"type":"flower","x":3288,"y":3369,"r":8,"seed":34863},{"type":"flower","x":3810,"y":287,"r":11,"seed":65878},{"type":"flower","x":3882,"y":330,"r":11,"seed":69266},{"type":"flower","x":1833,"y":861,"r":11,"seed":48534},{"type":"flower","x":1601,"y":933,"r":10,"seed":88791},{"type":"flower","x":2896,"y":900,"r":11,"seed":48282},{"type":"shovel","x":1791,"y":1890,"r":15,"seed":33403},{"type":"shovel","x":1342,"y":1172,"r":13,"seed":512},{"type":"shovel","x":1099,"y":2200,"r":12,"seed":37721},{"type":"shovel","x":2686,"y":3581,"r":14,"seed":40895},{"type":"shovel","x":978,"y":3579,"r":13,"seed":44478},{"type":"shovel","x":3075,"y":3146,"r":15,"seed":63790},{"type":"shovel","x":1537,"y":1735,"r":12,"seed":14300},{"type":"shovel","x":4082,"y":1347,"r":13,"seed":203},{"type":"shovel","x":1392,"y":1521,"r":13,"seed":46061},{"type":"shovel","x":3264,"y":530,"r":17,"seed":73234},{"type":"shovel","x":452,"y":582,"r":12,"seed":93877},{"type":"shovel","x":2725,"y":3029,"r":14,"seed":39416},{"type":"shovel","x":1240,"y":636,"r":12,"seed":62553},{"type":"pickaxe","x":2786,"y":2777,"r":15,"seed":76873},{"type":"pickaxe","x":1900,"y":3084,"r":15,"seed":23109},{"type":"pickaxe","x":592,"y":3036,"r":16,"seed":76134},{"type":"pickaxe","x":3389,"y":2994,"r":14,"seed":31729},{"type":"pickaxe","x":301,"y":3773,"r":13,"seed":72906},{"type":"pickaxe","x":995,"y":2902,"r":13,"seed":1123},{"type":"pickaxe","x":1422,"y":1593,"r":13,"seed":18403},{"type":"pickaxe","x":3679,"y":2150,"r":13,"seed":58084},{"type":"pickaxe","x":2655,"y":1960,"r":17,"seed":47068},{"type":"pickaxe","x":1626,"y":981,"r":16,"seed":37120},{"type":"pickaxe","x":1954,"y":1115,"r":13,"seed":92527},{"type":"ruin","x":4039,"y":2508,"r":40,"seed":23156},{"type":"ruin","x":1914,"y":2808,"r":38,"seed":76990},{"type":"ruin","x":2643,"y":2430,"r":33,"seed":31200},{"type":"ruin","x":3163,"y":3943,"r":32,"seed":45814},{"type":"ruin","x":1516,"y":2667,"r":28,"seed":69042},{"type":"ruin","x":2388,"y":3339,"r":37,"seed":6193},{"type":"ruin","x":1134,"y":973,"r":33,"seed":49087},{"type":"ruin","x":3423,"y":889,"r":36,"seed":22524},{"type":"guild","x":1712,"y":2596,"r":83,"seed":96576},{"type":"barrel","x":2350,"y":2100,"r":16,"seed":279602},{"type":"barrel","x":1846,"y":2333,"r":17,"seed":928777},{"type":"barrel","x":2139,"y":1657,"r":18,"seed":161394},{"type":"barrel","x":2383,"y":2469,"r":16,"seed":127147},{"type":"barrel","x":1824,"y":2051,"r":17,"seed":536048},{"type":"barrel","x":2416,"y":1899,"r":18,"seed":805321},{"type":"barrel","x":1872,"y":1661,"r":17,"seed":404663},{"type":"barrel","x":1809,"y":2220,"r":16,"seed":602586},{"type":"barrel","x":2364,"y":2660,"r":17,"seed":308034},{"type":"barrel","x":2989,"y":1773,"r":16,"seed":110120},{"type":"barrel","x":1591,"y":3087,"r":17,"seed":403920},{"type":"barrel","x":1766,"y":870,"r":18,"seed":364256},{"type":"barrel","x":3316,"y":2869,"r":16,"seed":891764},{"type":"barrel","x":522,"y":2384,"r":17,"seed":7937},{"type":"barrel","x":3171,"y":695,"r":18,"seed":116462},{"type":"barrel","x":2274,"y":4023,"r":16,"seed":281104},{"type":"barrel","x":1652,"y":2022,"r":16,"seed":637272},{"type":"barrel","x":2621,"y":1766,"r":17,"seed":216225},{"type":"barrel","x":923,"y":2590,"r":18,"seed":203114},{"type":"barrel","x":2706,"y":795,"r":16,"seed":690422}],"obstacles":[{"x":3627,"y":3253,"w":66,"h":66,"kind":"rock","classic":1},{"x":3921,"y":906,"w":34,"h":34,"kind":"rock","classic":1},{"x":853,"y":1352,"w":54,"h":54,"kind":"rock","classic":1},{"x":3470,"y":157,"w":52,"h":52,"kind":"tree","classic":1},{"x":137,"y":3343,"w":64,"h":64,"kind":"tree","classic":1},{"x":837,"y":2246,"w":50,"h":50,"kind":"tree","classic":1},{"x":470,"y":3279,"w":42,"h":42,"kind":"rock","classic":1},{"x":1597,"y":2934,"w":30,"h":30,"kind":"tree","classic":1},{"x":3670,"y":2641,"w":38,"h":38,"kind":"tree","classic":1},{"x":2244,"y":2446,"w":40,"h":40,"kind":"tree","classic":1},{"x":712,"y":1713,"w":46,"h":46,"kind":"tree","classic":1},{"x":2434,"y":1308,"w":48,"h":48,"kind":"rock","classic":1},{"x":3045,"y":3940,"w":64,"h":64,"kind":"rock","classic":1},{"x":2836,"y":2614,"w":56,"h":56,"kind":"tree","classic":1},{"x":2095,"y":207,"w":58,"h":58,"kind":"tree","classic":1},{"x":2752,"y":2308,"w":32,"h":32,"kind":"tree","classic":1},{"x":1568,"y":1051,"w":70,"h":70,"kind":"rock","classic":1},{"x":2009,"y":1788,"w":58,"h":58,"kind":"rock","classic":1},{"x":3186,"y":3046,"w":40,"h":40,"kind":"tree","classic":1},{"x":725,"y":1364,"w":64,"h":64,"kind":"rock","classic":1},{"x":3842,"y":3895,"w":54,"h":54,"kind":"rock","classic":1},{"x":3723,"y":2630,"w":40,"h":40,"kind":"rock","classic":1},{"x":3986,"y":819,"w":38,"h":38,"kind":"tree","classic":1},{"x":727,"y":1574,"w":40,"h":40,"kind":"tree","classic":1},{"x":173,"y":1830,"w":54,"h":54,"kind":"rock","classic":1},{"x":1410,"y":3299,"w":34,"h":34,"kind":"rock","classic":1},{"x":1238,"y":3472,"w":34,"h":34,"kind":"rock","classic":1},{"x":3272,"y":2077,"w":50,"h":50,"kind":"rock","classic":1},{"x":2693,"y":3907,"w":38,"h":38,"kind":"tree","classic":1},{"x":1824,"y":1871,"w":50,"h":50,"kind":"rock","classic":1},{"x":2770,"y":481,"w":40,"h":40,"kind":"tree","classic":1},{"x":2079,"y":2608,"w":46,"h":46,"kind":"tree","classic":1},{"x":973,"y":3104,"w":34,"h":34,"kind":"rock","classic":1},{"x":2303,"y":1620,"w":42,"h":42,"kind":"tree","classic":1},{"x":3589,"y":2220,"w":52,"h":52,"kind":"rock","classic":1},{"x":2075,"y":774,"w":40,"h":40,"kind":"tree","classic":1},{"x":2663,"y":1573,"w":62,"h":62,"kind":"tree","classic":1},{"x":625,"y":2515,"w":54,"h":54,"kind":"tree","classic":1},{"x":3656,"y":1332,"w":66,"h":66,"kind":"rock","classic":1},{"x":3954,"y":3447,"w":66,"h":66,"kind":"rock","classic":1},{"x":1691,"y":592,"w":34,"h":34,"kind":"rock","classic":1},{"x":986,"y":692,"w":44,"h":44,"kind":"tree","classic":1},{"x":154,"y":2208,"w":60,"h":60,"kind":"rock","classic":1},{"x":2784,"y":4000,"w":70,"h":70,"kind":"rock","classic":1},{"x":2075,"y":170,"w":36,"h":36,"kind":"rock","classic":1},{"x":3387,"y":2469,"w":54,"h":54,"kind":"rock","classic":1},{"x":1073,"y":2278,"w":46,"h":46,"kind":"rock","classic":1},{"x":2285,"y":2798,"w":36,"h":36,"kind":"rock","classic":1},{"x":869,"y":317,"w":44,"h":44,"kind":"tree","classic":1},{"x":470,"y":2591,"w":34,"h":34,"kind":"tree","classic":1},{"x":2707,"y":1073,"w":64,"h":64,"kind":"rock","classic":1},{"x":866,"y":1451,"w":44,"h":44,"kind":"rock","classic":1},{"x":1486,"y":3771,"w":62,"h":62,"kind":"rock","classic":1},{"x":2243,"y":1493,"w":40,"h":40,"kind":"tree","classic":1},{"x":3305,"y":810,"w":56,"h":56,"kind":"rock","classic":1},{"x":3949,"y":3639,"w":64,"h":64,"kind":"rock","classic":1},{"x":1697,"y":2304,"w":48,"h":48,"kind":"rock","classic":1},{"x":1615,"y":1568,"w":46,"h":46,"kind":"tree","classic":1},{"x":1040,"y":2018,"w":58,"h":58,"kind":"tree","classic":1},{"x":681,"y":1356,"w":30,"h":30,"kind":"tree","classic":1},{"x":2476,"y":3218,"w":60,"h":60,"kind":"rock","classic":1},{"x":623,"y":682,"w":64,"h":64,"kind":"tree","classic":1},{"x":3994,"y":3104,"w":56,"h":56,"kind":"rock","classic":1},{"x":497,"y":803,"w":36,"h":36,"kind":"rock","classic":1},{"x":3413,"y":2063,"w":62,"h":62,"kind":"rock","classic":1},{"x":430,"y":2758,"w":36,"h":36,"kind":"tree","classic":1},{"x":2209,"y":1476,"w":42,"h":42,"kind":"tree","classic":1},{"x":3861,"y":2983,"w":66,"h":66,"kind":"rock","classic":1},{"x":1487,"y":2945,"w":50,"h":50,"kind":"rock","classic":1},{"x":2894,"y":3293,"w":64,"h":64,"kind":"rock","classic":1},{"x":1443,"y":2958,"w":56,"h":56,"kind":"rock","classic":1},{"x":207,"y":2526,"w":56,"h":56,"kind":"tree","classic":1},{"x":3730,"y":2120,"w":50,"h":50,"kind":"tree","classic":1},{"x":3001,"y":2961,"w":68,"h":68,"kind":"rock","classic":1},{"x":778,"y":400,"w":60,"h":60,"kind":"tree","classic":1},{"x":1790,"y":3461,"w":44,"h":44,"kind":"rock","classic":1},{"x":2616,"y":3407,"w":44,"h":44,"kind":"tree","classic":1},{"x":2124,"y":1009,"w":52,"h":52,"kind":"tree","classic":1},{"x":3645,"y":3973,"w":54,"h":54,"kind":"tree","classic":1},{"x":2299,"y":974,"w":54,"h":54,"kind":"rock","classic":1},{"x":424,"y":2246,"w":46,"h":46,"kind":"tree","classic":1},{"x":3859,"y":172,"w":38,"h":38,"kind":"rock","classic":1},{"x":1095,"y":299,"w":36,"h":36,"kind":"tree","classic":1},{"x":3191,"y":3654,"w":58,"h":58,"kind":"tree","classic":1},{"x":2333,"y":1237,"w":36,"h":36,"kind":"tree","classic":1},{"x":1353,"y":549,"w":50,"h":50,"kind":"tree","classic":1},{"x":3314,"y":2963,"w":36,"h":36,"kind":"tree","classic":1},{"x":2253,"y":199,"w":64,"h":64,"kind":"rock","classic":1},{"x":4019,"y":3704,"w":34,"h":34,"kind":"tree","classic":1},{"x":1294,"y":3999,"w":66,"h":66,"kind":"rock","classic":1},{"x":1567,"y":3207,"w":36,"h":36,"kind":"rock","classic":1},{"x":3815,"y":1945,"w":44,"h":44,"kind":"rock","classic":1},{"x":745,"y":3284,"w":44,"h":44,"kind":"rock","classic":1},{"x":1950,"y":775,"w":60,"h":60,"kind":"tree","classic":1},{"x":886,"y":862,"w":46,"h":46,"kind":"rock","classic":1},{"x":1504,"y":694,"w":62,"h":62,"kind":"rock","classic":1},{"x":2834,"y":3874,"w":32,"h":32,"kind":"tree","classic":1},{"x":3591,"y":908,"w":52,"h":52,"kind":"tree","classic":1},{"x":3789,"y":429,"w":64,"h":64,"kind":"rock","classic":1},{"x":2860,"y":2580,"w":54,"h":54,"kind":"rock","classic":1},{"x":463,"y":3884,"w":62,"h":62,"kind":"tree","classic":1},{"x":2315,"y":2575,"w":42,"h":42,"kind":"tree","classic":1},{"x":1645,"y":614,"w":44,"h":44,"kind":"tree","classic":1},{"x":1368,"y":611,"w":44,"h":44,"kind":"rock","classic":1},{"x":1419,"y":1916,"w":50,"h":50,"kind":"rock","classic":1},{"x":1646,"y":1264,"w":64,"h":64,"kind":"rock","classic":1},{"x":1498,"y":3285,"w":32,"h":32,"kind":"tree","classic":1},{"x":2586,"y":1859,"w":34,"h":34,"kind":"tree","classic":1},{"x":1521,"y":2781,"w":32,"h":32,"kind":"tree","classic":1},{"x":2808,"y":1269,"w":44,"h":44,"kind":"tree","classic":1},{"x":745,"y":1331,"w":54,"h":54,"kind":"tree","classic":1},{"x":2692,"y":1383,"w":64,"h":64,"kind":"tree","classic":1},{"x":1324,"y":766,"w":32,"h":32,"kind":"tree","classic":1},{"x":3972,"y":3641,"w":40,"h":40,"kind":"rock","classic":1},{"x":627,"y":1278,"w":52,"h":52,"kind":"tree","classic":1},{"x":2946,"y":1972,"w":56,"h":56,"kind":"tree","classic":1},{"x":1289,"y":1586,"w":34,"h":34,"kind":"rock","classic":1},{"x":277,"y":1521,"w":64,"h":64,"kind":"tree","classic":1},{"x":828,"y":3999,"w":50,"h":50,"kind":"tree","classic":1},{"x":1424,"y":728,"w":68,"h":68,"kind":"rock","classic":1},{"x":2737,"y":1702,"w":42,"h":42,"kind":"tree","classic":1},{"x":2296,"y":1571,"w":68,"h":68,"kind":"rock","classic":1},{"x":2512,"y":1193,"w":62,"h":62,"kind":"tree","classic":1},{"x":3301,"y":3226,"w":60,"h":60,"kind":"rock","classic":1},{"x":1763,"y":136,"w":94,"h":94,"kind":"house","classic":1},{"x":3706,"y":100,"w":88,"h":88,"kind":"house","classic":1},{"x":1023,"y":2767,"w":102,"h":102,"kind":"house","classic":1},{"x":961,"y":1693,"w":98,"h":98,"kind":"house","classic":1},{"x":576,"y":2208,"w":82,"h":82,"kind":"house","classic":1},{"x":263,"y":560,"w":92,"h":92,"kind":"house","classic":1},{"x":2068,"y":3806,"w":102,"h":102,"kind":"house","classic":1},{"x":3554,"y":1561,"w":82,"h":82,"kind":"house","classic":1},{"x":4000,"y":2183,"w":94,"h":94,"kind":"house","classic":1},{"x":1368,"y":3394,"w":74,"h":74,"kind":"ruin","classic":1},{"x":1951,"y":2982,"w":74,"h":74,"kind":"ruin","classic":1},{"x":128,"y":495,"w":70,"h":70,"kind":"ruin","classic":1},{"x":388,"y":231,"w":68,"h":68,"kind":"ruin","classic":1},{"x":3878,"y":3185,"w":72,"h":72,"kind":"ruin","classic":1},{"x":1486,"y":3488,"w":66,"h":66,"kind":"ruin","classic":1},{"x":2032,"y":4040,"w":76,"h":76,"kind":"ruin","classic":1},{"x":2644,"y":517,"w":64,"h":64,"kind":"ruin","classic":1},{"x":1888,"y":1481,"w":54,"h":54,"kind":"ruin","classic":1},{"x":271,"y":739,"w":54,"h":54,"kind":"ruin","classic":1},{"x":146,"y":3644,"w":54,"h":54,"kind":"ruin","classic":1},{"x":2352,"y":3644,"w":72,"h":72,"kind":"ruin","classic":1},{"x":3607,"y":1688,"w":66,"h":66,"kind":"ruin","classic":1},{"x":1281,"y":1456,"w":56,"h":56,"kind":"ruin","classic":1},{"x":198,"y":1402,"w":76,"h":76,"kind":"ruin","classic":1},{"x":301,"y":2457,"w":60,"h":60,"kind":"ruin","classic":1},{"x":4025,"y":3828,"w":56,"h":56,"kind":"ruin","classic":1},{"x":2954,"y":2315,"w":64,"h":64,"kind":"ruin","classic":1},{"x":3759,"y":2774,"w":66,"h":66,"kind":"ruin","classic":1},{"x":3902,"y":2446,"w":52,"h":52,"kind":"ruin","classic":1},{"x":4011,"y":2665,"w":76,"h":76,"kind":"ruin","classic":1},{"x":1213,"y":2919,"w":62,"h":62,"kind":"ruin","classic":1},{"x":3483,"y":3589,"w":74,"h":74,"kind":"ruin","classic":1},{"x":2290,"y":677,"w":62,"h":62,"kind":"ruin","classic":1},{"x":3628,"y":1889,"w":62,"h":62,"kind":"ruin","classic":1},{"x":3000,"y":1329,"w":76,"h":76,"kind":"pond","classic":1},{"x":3028,"y":923,"w":86,"h":86,"kind":"pond","classic":1},{"x":1364,"y":1675,"w":86,"h":86,"kind":"pond","classic":1},{"x":1418,"y":260,"w":78,"h":78,"kind":"pond","classic":1},{"x":3343,"y":3343,"w":70,"h":70,"kind":"pond","classic":1},{"x":2698,"y":2580,"w":90,"h":90,"kind":"pond","classic":1},{"x":3662,"y":979,"w":96,"h":96,"kind":"pond","classic":1},{"x":181,"y":3491,"w":84,"h":84,"kind":"pond","classic":1},{"x":1296,"y":3563,"w":68,"h":68,"kind":"pond","classic":1},{"x":3468,"y":668,"w":116,"h":116,"kind":"market","classic":1},{"x":345,"y":1900,"w":102,"h":102,"kind":"market","classic":1},{"x":3203,"y":2250,"w":32,"h":32,"kind":"crate","classic":1},{"x":779,"y":2747,"w":24,"h":24,"kind":"crate","classic":1},{"x":486,"y":160,"w":22,"h":22,"kind":"crate","classic":1},{"x":2837,"y":3018,"w":30,"h":30,"kind":"crate","classic":1},{"x":3950,"y":1197,"w":26,"h":26,"kind":"crate","classic":1},{"x":1679,"y":98,"w":32,"h":32,"kind":"crate","classic":1},{"x":748,"y":3189,"w":26,"h":26,"kind":"crate","classic":1},{"x":1121,"y":2524,"w":32,"h":32,"kind":"crate","classic":1},{"x":3219,"y":3228,"w":24,"h":24,"kind":"crate","classic":1},{"x":3844,"y":2557,"w":24,"h":24,"kind":"crate","classic":1},{"x":2439,"y":518,"w":32,"h":32,"kind":"crate","classic":1},{"x":3276,"y":2621,"w":30,"h":30,"kind":"crate","classic":1},{"x":835,"y":4077,"w":24,"h":24,"kind":"crate","classic":1},{"x":277,"y":955,"w":24,"h":24,"kind":"crate","classic":1},{"x":3449,"y":1063,"w":24,"h":24,"kind":"crate","classic":1},{"x":3503,"y":1759,"w":24,"h":24,"kind":"crate","classic":1},{"x":411,"y":2447,"w":30,"h":30,"kind":"crate","classic":1},{"x":2860,"y":1076,"w":28,"h":28,"kind":"crate","classic":1},{"x":2862,"y":534,"w":24,"h":24,"kind":"crate","classic":1},{"x":2476,"y":357,"w":24,"h":24,"kind":"crate","classic":1},{"x":2685,"y":1220,"w":28,"h":28,"kind":"crate","classic":1},{"x":1945,"y":1615,"w":22,"h":22,"kind":"crate","classic":1},{"x":3387,"y":1329,"w":28,"h":28,"kind":"crate","classic":1},{"x":2395,"y":651,"w":24,"h":24,"kind":"crate","classic":1},{"x":885,"y":3040,"w":26,"h":26,"kind":"crate","classic":1},{"x":1934,"y":3591,"w":70,"h":70,"kind":"shed","classic":1},{"x":3473,"y":1809,"w":78,"h":78,"kind":"shed","classic":1},{"x":3876,"y":573,"w":78,"h":78,"kind":"shed","classic":1},{"x":1629,"y":388,"w":94,"h":94,"kind":"shed","classic":1},{"x":1990,"y":1232,"w":84,"h":84,"kind":"shed","classic":1},{"x":2575,"y":675,"w":80,"h":80,"kind":"shed","classic":1},{"x":2498,"y":925,"w":88,"h":88,"kind":"shed","classic":1},{"x":4006,"y":1744,"w":86,"h":86,"kind":"shed","classic":1},{"x":2971,"y":427,"w":28,"h":28,"kind":"bin","classic":1},{"x":1255,"y":2244,"w":28,"h":28,"kind":"bin","classic":1},{"x":2031,"y":3268,"w":24,"h":24,"kind":"bin","classic":1},{"x":2745,"y":3776,"w":34,"h":34,"kind":"bin","classic":1},{"x":2443,"y":1054,"w":26,"h":26,"kind":"bin","classic":1},{"x":561,"y":2134,"w":28,"h":28,"kind":"bin","classic":1},{"x":1662,"y":3033,"w":28,"h":28,"kind":"bin","classic":1},{"x":1368,"y":1031,"w":28,"h":28,"kind":"bin","classic":1},{"x":1076,"y":410,"w":32,"h":32,"kind":"bin","classic":1},{"x":2025,"y":266,"w":30,"h":30,"kind":"bin","classic":1},{"x":2469,"y":2852,"w":30,"h":30,"kind":"bin","classic":1},{"x":387,"y":2710,"w":32,"h":32,"kind":"bin","classic":1},{"x":1153,"y":2993,"w":34,"h":34,"kind":"bin","classic":1},{"x":220,"y":1906,"w":32,"h":32,"kind":"bin","classic":1},{"x":3465,"y":2765,"w":54,"h":54,"kind":"dumpster","classic":1},{"x":219,"y":1768,"w":44,"h":44,"kind":"dumpster","classic":1},{"x":3765,"y":3364,"w":42,"h":42,"kind":"dumpster","classic":1},{"x":3636,"y":2520,"w":52,"h":52,"kind":"dumpster","classic":1},{"x":2006,"y":2464,"w":50,"h":50,"kind":"dumpster","classic":1},{"x":1051,"y":148,"w":54,"h":54,"kind":"dumpster","classic":1},{"x":1209,"y":1131,"w":50,"h":50,"kind":"dumpster","classic":1},{"x":957,"y":2949,"w":54,"h":54,"kind":"dumpster","classic":1},{"x":1382,"y":2689,"w":84,"h":84,"kind":"wreck","classic":1},{"x":4052,"y":474,"w":66,"h":66,"kind":"wreck","classic":1},{"x":2120,"y":2503,"w":74,"h":74,"kind":"wreck","classic":1},{"x":198,"y":3223,"w":84,"h":84,"kind":"wreck","classic":1},{"x":3544,"y":3837,"w":84,"h":84,"kind":"wreck","classic":1},{"x":2382,"y":2141,"w":82,"h":82,"kind":"wreck","classic":1},{"x":3021,"y":181,"w":64,"h":64,"kind":"wreck","classic":1},{"x":2399,"y":1670,"w":74,"h":74,"kind":"wreck","classic":1},{"x":2793,"y":1971,"w":58,"h":58,"kind":"wreck","classic":1},{"x":2222,"y":1673,"w":74,"h":74,"kind":"haystack","classic":1},{"x":3522,"y":2435,"w":54,"h":54,"kind":"haystack","classic":1},{"x":648,"y":2740,"w":54,"h":54,"kind":"haystack","classic":1},{"x":1149,"y":1061,"w":60,"h":60,"kind":"haystack","classic":1},{"x":1249,"y":668,"w":56,"h":56,"kind":"haystack","classic":1},{"x":1438,"y":2037,"w":64,"h":64,"kind":"haystack","classic":1},{"x":2883,"y":1682,"w":54,"h":54,"kind":"haystack","classic":1},{"x":2175,"y":560,"w":72,"h":72,"kind":"haystack","classic":1},{"x":2405,"y":1472,"w":72,"h":72,"kind":"haystack","classic":1},{"x":2068,"y":3040,"w":62,"h":62,"kind":"haystack","classic":1},{"x":1204,"y":2015,"w":52,"h":52,"kind":"haystack","classic":1},{"x":2541,"y":3925,"w":60,"h":60,"kind":"haystack","classic":1},{"x":1665,"y":3587,"w":34,"h":34,"kind":"bale","classic":1},{"x":3033,"y":3309,"w":38,"h":38,"kind":"bale","classic":1},{"x":2911,"y":4061,"w":36,"h":36,"kind":"bale","classic":1},{"x":3349,"y":2686,"w":44,"h":44,"kind":"bale","classic":1},{"x":3698,"y":285,"w":42,"h":42,"kind":"bale","classic":1},{"x":1108,"y":3023,"w":34,"h":34,"kind":"bale","classic":1},{"x":3429,"y":2620,"w":44,"h":44,"kind":"bale","classic":1},{"x":636,"y":3107,"w":44,"h":44,"kind":"bale","classic":1},{"x":1174,"y":2280,"w":44,"h":44,"kind":"bale","classic":1},{"x":2133,"y":2907,"w":44,"h":44,"kind":"bale","classic":1},{"x":1781,"y":2400,"w":44,"h":44,"kind":"bale","classic":1},{"x":3690,"y":3661,"w":32,"h":32,"kind":"bale","classic":1},{"x":747,"y":2917,"w":46,"h":46,"kind":"bale","classic":1},{"x":3870,"y":2170,"w":34,"h":34,"kind":"bale","classic":1},{"x":932,"y":176,"w":44,"h":44,"kind":"bale","classic":1},{"x":1773,"y":1283,"w":32,"h":32,"kind":"bale","classic":1},{"x":276,"y":1626,"w":42,"h":42,"kind":"bale","classic":1},{"x":2298,"y":2732,"w":38,"h":38,"kind":"bale","classic":1},{"x":2099,"y":1163,"w":42,"h":42,"kind":"bale","classic":1},{"x":2076,"y":1323,"w":40,"h":40,"kind":"bale","classic":1},{"x":1072,"y":3726,"w":72,"h":72,"kind":"tractor","classic":1},{"x":1025,"y":3565,"w":72,"h":72,"kind":"tractor","classic":1},{"x":2776,"y":1802,"w":74,"h":74,"kind":"tractor","classic":1},{"x":3698,"y":691,"w":68,"h":68,"kind":"tractor","classic":1},{"x":507,"y":3709,"w":68,"h":68,"kind":"tractor","classic":1},{"x":4006,"y":2475,"w":66,"h":66,"kind":"ruin","classic":1},{"x":1882,"y":2776,"w":64,"h":64,"kind":"ruin","classic":1},{"x":2616,"y":2403,"w":54,"h":54,"kind":"ruin","classic":1},{"x":3136,"y":3916,"w":54,"h":54,"kind":"ruin","classic":1},{"x":1493,"y":2644,"w":46,"h":46,"kind":"ruin","classic":1},{"x":2357,"y":3308,"w":62,"h":62,"kind":"ruin","classic":1},{"x":1107,"y":946,"w":54,"h":54,"kind":"ruin","classic":1},{"x":3393,"y":859,"w":60,"h":60,"kind":"ruin","classic":1},{"x":1643,"y":2527,"w":138,"h":138,"kind":"guild","classic":1},{"x":2337,"y":2087,"w":26,"h":26,"kind":"barrel","classic":1},{"x":1832,"y":2319,"w":28,"h":28,"kind":"barrel","classic":1},{"x":2124,"y":1642,"w":30,"h":30,"kind":"barrel","classic":1},{"x":2370,"y":2456,"w":26,"h":26,"kind":"barrel","classic":1},{"x":1810,"y":2037,"w":28,"h":28,"kind":"barrel","classic":1},{"x":2401,"y":1884,"w":30,"h":30,"kind":"barrel","classic":1},{"x":1858,"y":1647,"w":28,"h":28,"kind":"barrel","classic":1},{"x":1796,"y":2207,"w":26,"h":26,"kind":"barrel","classic":1},{"x":2350,"y":2646,"w":28,"h":28,"kind":"barrel","classic":1},{"x":2976,"y":1760,"w":26,"h":26,"kind":"barrel","classic":1},{"x":1577,"y":3073,"w":28,"h":28,"kind":"barrel","classic":1},{"x":1751,"y":855,"w":30,"h":30,"kind":"barrel","classic":1},{"x":3303,"y":2856,"w":26,"h":26,"kind":"barrel","classic":1},{"x":508,"y":2370,"w":28,"h":28,"kind":"barrel","classic":1},{"x":3156,"y":680,"w":30,"h":30,"kind":"barrel","classic":1},{"x":2261,"y":4010,"w":26,"h":26,"kind":"barrel","classic":1},{"x":1639,"y":2009,"w":26,"h":26,"kind":"barrel","classic":1},{"x":2607,"y":1752,"w":28,"h":28,"kind":"barrel","classic":1},{"x":908,"y":2575,"w":30,"h":30,"kind":"barrel","classic":1},{"x":2693,"y":782,"w":26,"h":26,"kind":"barrel","classic":1},{"x":1980,"y":2290,"w":116,"h":100}]};
 N.acidShots=[];N.acidSeq=0;N.seq=N.ack=N.soloTick=N.soloKills=N.dropSeq=N.soloUpgradeSeq=0;N.tick=-1;N.soloDrops=[];N.drops=[];N.weaponDrops=[];N.levelBossDone=[];
 N.soloAcc=0;N.soloSwing=-100;N.soloInvul=0;N.mobHistory=[];N.mobRenderTick=null;N.soloSpawnCache=null;N.hordeTotal=100;
 N.soloWave=1;N.soloState='play';N.soloChoice=null;N.soloChestSeq=0;N.soloBetweenUntil=0;
 N.soloChests=[[603,2368],[291,1379],[3119,2452],[2506,2256],[3460,3116],[930,1524],[2922,602],[3601,527],[624,876]].map((p,i)=>({id:i+1,x:p[0],y:p[1],opened:false,style:'classic'}));
 N.choiceUiId='';N.hurtUntil=0;N.lastMyHp=null;A()?.unlock();B().unlockSound?.();
 resetExp(N.world);N.expSupported=true;N.rule=arenaRuleInit(N.world,mode);N.ruleSupported=true;resetArenaBreakables(N.world);N.breakSupported=true;N.explore=arenaExploreInit(N.world);N.exploreSupported=true;N.tradeUiKey='';N.runUiKey='';
 N.soloCrowd=createArenaCrowdSteering(N.world,(p,x,y,dt)=>moveLocal(p,x*N.world.speed*dt*(p.spellSlowFactor||1),y*N.world.speed*dt*(p.spellSlowFactor||1)));
 N.lastFrame=N.lastState=N.lastPing=N.lastInput=0;resetRenderQuality();
 N.delta={x:0,y:0};N.pending=[];N.players.clear();N.looks.clear();N.presence.clear();N.lastLookSignature='';N.lastLookCheck=0;N.lookSyncEnabled=false;N.stick.ptr=null;N.stick.x=N.stick.y=0;
 if(el('ns140Pad'))el('ns140Pad').classList.remove('active');
 N.me={id:'p1',activeWeapon:localArenaLook().weapon||'sword',x:2030,y:2070,tx:2030,ty:2070,hp:100,maxHp:100,damage:22,speedMult:1,kills:0,attackTick:-100,online:true,knocked:false,xp:0,xpNeed:160,level:1,xpCollected:0,queuedUpgrades:0};
 arenaSpellInit(N.me,localArenaLook().heroClass);N.players.set('p1',N.me);rememberLook('p1',0,localArenaLook());
 startSoloHorde(1);
 window.NS154_GOBLINS?.prewarm();window.NS157_SCENERY?.prewarm();
 status('V190 · SOLO · PLAVI EXP KRISTALI · MAPA 4200×4200');
 return true;
}

function spawnSoloXpCrystal(mob){
 arenaExploreKill(N.explore,N.me,mob,N.soloTick,LAB.enabled);expDrop(N.expedition,mob,LAB.enabled||N.explore?.invalid);
 const d={id:++N.dropSeq,x:mob.x,y:mob.y,value:['troll','rotfiend','boss','werewolfAlpha'].includes(mob.kind)?45:mob.kind==='elephant'?14:7,expires:N.soloTick+1800};
 N.soloDrops.push(d);arenaMaybeWeaponDrop(N.weaponDrops,mob,N.soloWave,N.soloTick,d.id);
 if(N.soloDrops.length>XP_CAP)N.soloDrops.shift();
}
function addSoloRunXp(amount){
 const p=N.me;if(!p)return;
 p.xp=(p.xp||0)+amount;p.xpCollected=(p.xpCollected||0)+1;
 let levels=0;
 while(p.level<100&&p.xp>=p.xpNeed&&levels++<3){
  p.xp-=p.xpNeed;p.level++;p.xpNeed=Math.ceil(xpNeeded(p.level)*(p.xpTax||1));
  p.hp=Math.min(p.maxHp,p.hp+12);
  p.queuedUpgrades=Math.min(10,(p.queuedUpgrades||0)+1);
  A()?.play('level',{gain:.75});
  announceArena('✦ NOVI NIVO '+p.level+' · IZABERI NADOGRADNJU');
 }
 if(p.level>=100)p.xp=0;
}
function stepSoloXpCrystals(){
 const p=N.me;if(!p)return;
 const out=[];
 for(const d of N.soloDrops){
  if(d.expires<=N.soloTick)continue;
  const dx=p.x-d.x,dy=p.y-d.y,dist=Math.hypot(dx,dy);
  const attract=120+(p.perks?.magnet?60:0);
  if(dist<attract&&dist>0.00001){
   const pull=Math.min(dist,(200+(attract-dist)*2.2)/30);
   d.x+=dx/dist*pull;d.y+=dy/dist*pull;
  }
  if((p.x-d.x)**2+(p.y-d.y)**2<=25**2){
   addSoloRunXp(d.value);
   A()?.play('xp',{gain:.55});
  }else out.push(d);
 }
 N.soloDrops=out;
 if(!N.soloChoice&&(p.queuedUpgrades||0)>0){
  p.queuedUpgrades--;
  N.soloChoice={id:10000+ ++N.soloUpgradeSeq,kind:'xp',level:p.level,
   owner:'p1',seq:++N.soloChestSeq,until:Date.now()+6500};
  N.choiceUiId='';
 }
}

function soloDamageRule(p,m,d){return arenaCombatDamage(N.rule,N.world,N.expedition?.id,p,m,d)}
function stepSolo(dt){
 if(!N.solo||!N.me||N.rule?.victory)return;
 N.soloAcc=Math.min(.15,N.soloAcc+dt);
 let iterations=0;
 while(N.soloAcc>=1/30&&iterations++<5){
  N.soloAcc-=1/30;N.soloTick++;N.tick=N.soloTick;
  const me=N.me;
  if(N.explore){N.explore.wave=Math.max(N.explore.wave,N.soloWave);if(LAB.enabled)N.explore.invalid=true}
  if(me.hp<=0){N.phase='solo_ended';status('STRAŽAR JE PAO · SOLO TEST ZAVRŠEN');break}
  if(N.soloChoice){
   if(Date.now()>=N.soloChoice.until)resolveSoloChest('edge');
   continue;
  }
  if(N.rule&&!N.expedition?.id&&!LAB.enabled)N.rule.elapsed++;
  if(N.soloState==='between'){
   if(Date.now()>=N.soloBetweenUntil){
    N.soloWave++;startSoloHorde(N.soloWave);
    N.soloState='play';N.soloCrowd.clear();A()?.play('wave');
   }
   continue;
  }
  const extraKill=m=>{m.deadUntil=N.soloTick+105;N.soloKills++;me.kills++;spawnSoloXpCrystal(m)};
  if(N.expedition?.id)expWake(N.soloMobs,N.players);
  arenaCombatExtras(me,N.soloMobs,N.world,N.soloTick,extraKill,showArenaSpell,soloDamageRule);
  arenaPerkTick(me,N.soloTick);N.soloInvul=Math.max(N.soloInvul,me.shield||0);arenaSpellTick(me,N.looks.get('p1')?.look?.heroClass||'warrior');arenaSpellExpire(N.soloMobs,N.soloTick);
  // Fixed physics 30Hz, steering only at 15Hz, interpolation at display FPS.
  for(const mob of N.soloMobs){mob.prevX=mob.x;mob.prevY=mob.y}
  if(!LAB.freezeAI){
   const goblins=N.soloMobs.filter(m=>m.kind!=='troll');
   const locked=goblins.filter(m=>m.labFrozen).map(m=>[m,m.x,m.y]);
   if(N.soloTick%2===0)N.soloCrowd.step(goblins,N.players,N.soloTick);
    const acid=stepArenaWorms(N.soloMobs,N.players,N.world,N.soloTick,N.soloWave,N.acidShots||[],N.acidSeq||0,(p,d)=>{if(LAB.godMode||N.soloTick<=N.soloInvul)return;p.hp=Math.max(0,p.hp-arenaIncoming(p,d));N.hurtUntil=performance.now()+290;N.soloInvul=N.soloTick+28;A()?.play('hurt')});if(acid.seq>(N.acidSeq||0)&&acid.shots.some(s=>s.id>(N.acidSeq||0)&&(s.x-me.x)**2+(s.y-me.y)**2<550**2))B().arenaWormSound?.();N.acidShots=acid.shots;N.acidSeq=acid.seq;
   stepArenaHeavy(N.soloMobs,N.players,N.world,N.soloTick,N.soloWave,(p,d)=>{if(LAB.godMode||N.soloTick<=N.soloInvul)return;p.hp=Math.max(0,p.hp-arenaIncoming(p,d));N.hurtUntil=performance.now()+290;N.soloInvul=N.soloTick+28;A()?.play('hurt')});
   N.soloCrowd.advance(goblins,N.players);
   const summoned=arenaBossSummons(N.soloMobs,N.players,N.world,N.soloTick,N.soloWave);if(summoned){N.soloTotal=(N.soloTotal||N.soloMobs.length-summoned)+summoned;announceArena('BOSS DOZIVA POJAČANJE · '+summoned)}
   for(const [m,x,y] of locked){m.x=x;m.y=y;m.prevX=x;m.prevY=y;m.vx=m.vy=0}
   for(const boss of N.soloMobs)if(boss.kind==='troll'&&boss.hp>0&&!boss.labFrozen){
    boss.targetId=me.id;
    const dx=me.x-boss.x,dy=me.y-boss.y,dist=Math.hypot(dx,dy);
    if(dist>66)moveLocal(boss,dx/dist*98/30*(boss.spellSlowFactor||1),dy/dist*98/30*(boss.spellSlowFactor||1));
   }
  }
  if(LAB.allies.length)stepSoloAllies();
  if(!LAB.freezeAI)for(const mob of N.soloMobs){
   if(mob.hp<=0||mob.labFrozen||(mob.kind==='worm'||arenaSpecial(mob)))continue; // no individual respawns during a wave
   const d2=(me.x-mob.x)**2+(me.y-mob.y)**2;
   if(!LAB.godMode&&d2<=(mob.kind==='troll'?65:34)**2&&N.soloTick>mob.attackAt&&N.soloTick>N.soloInvul){
    me.hp=Math.max(0,me.hp-arenaIncoming(me,Math.min(mob.kind==='troll'?60:30,Math.round((mob.kind==='troll'?17:7)*(1+.06*(N.soloWave-1))))));N.hurtUntil=performance.now()+290;
    A()?.play('hurt');
    mob.attackTick=N.soloTick;mob.attackAt=N.soloTick+(mob.kind==='troll'?77:39+(mob.id%5)*4);
    arenaThorns(me,mob,N.soloTick,extraKill,showArenaSpell,soloDamageRule);
    N.soloInvul=N.soloTick+28;
   }
  }
  // Auto-attack the nearest living enemy only when in 83px weapon range.
  if(N.soloTick-N.soloSwing>=Math.max(9,Math.round(arenaAttackPeriod(me)*(N.soloTick<(me.fieldRushUntil||0)?.92:1)))){
   let target=null,distSq=160**2;
   for(const mob of N.soloMobs){
    if(mob.hp<=0)continue;
    const dx=mob.x-me.x,dy=mob.y-me.y,d=dx*dx+dy*dy;
    if(d<distSq&&d<arenaAttackReach(me,mob)**2&&(!N.expedition?.id||arenaAcidClear(N.world,me.x,me.y,mob.x,mob.y,3))){target=mob;distSq=d}
   }
   if(target){
    N.soloSwing=N.soloTick;me.attackTick=N.soloTick;
    me.attackAngle=Math.atan2(target.y-me.y,target.x-me.x);
    me.facingAngle=me.attackAngle;
    target.hitTick=N.soloTick;
    target.hp=Math.max(0,target.hp-arenaRuleDamage(N.rule,me,target,arenaAttackDamage(me,N.soloTick),N.expedition?.id));
    A()?.play('swing',{weapon:N.me?.activeWeapon||localArenaLook().weapon||'sword'});
    A()?.play('hit',{weapon:N.me?.activeWeapon||localArenaLook().weapon||'sword',variant:N.soloTick,gain:.42,x:target.x,y:target.y,listenerX:me.x,listenerY:me.y});
    if(target.hp===0)extraKill(target);
    arenaEvolutionStrike(me,target,N.soloMobs,N.soloTick,extraKill,showArenaSpell,soloDamageRule);
   }else if(!LAB.enabled){const tower=!N.expedition?.id&&!N.explore?.invalid?arenaRuleTower(N.rule,N.world,me,arenaAttackDamage(me,N.soloTick),arenaAttackReach(me,{kind:'goblin'}),N.players):null;const hit=tower||arenaBreakHit(N.breakState,N.world,me,N.soloTick,N.soloWave,arenaAttackDamage(me,N.soloTick),arenaAttackReach(me,{kind:'goblin'}));if(hit){N.soloSwing=N.soloTick;me.attackTick=N.soloTick;me.attackAngle=Math.atan2(hit.y-me.y,hit.x-me.x);me.facingAngle=me.attackAngle;arenaMapBase=null;A()?.play('hit',{weapon:me.activeWeapon||'sword',gain:.4});if(hit.hp===0){if(hit.collider)N.soloCrowd?.refreshObstacles?.([hit.collider]);announceArena(hit.kind==='nightTower'?(N.rule.victory?'POBEDA · TRI KULE UNIŠTENE':'KULA UNIŠTENA'):hit.kind==='barrel'?'BURE RAZBIJENO':'KUTIJA RAZBIJENA')}}}
  }
  arenaExplorePickup(N.explore,N.players);expCollect(N.expedition,N.players);
  arenaFieldKits(N.breakState,N.players,N.soloTick,(_,hp)=>{announceArena('ZAVOJ · +'+hp+' HP');A()?.play('choose')});
  stepSoloXpCrystals();
  if(!N.expedition?.id&&!LAB.enabled&&!LAB.freezeAI){const level=arenaLevelBoss(N.soloMobs,N.players,N.world,N.soloWave,N.soloTick,N.levelBossDone);if(level){N.soloTotal=(N.soloTotal||N.soloMobs.length-1)+1;announceArena('MATRIJARH · NIVO '+level)}}
  // As in the regular game, chest proximity opens a timed reward choice.
  if(!N.soloChoice){
   const chest=N.soloChests.find(c=>!c.opened&&(c.x-me.x)**2+(c.y-me.y)**2<=64**2);
   if(chest){
    chest.opened=true;if(N.explore&&!N.explore.invalid)N.explore.chests++;N.soloChoice={id:chest.id,kind:'chest',options:arenaRewardOptions(N.me,N.soloChestSeq+1),seq:++N.soloChestSeq,owner:'p1',until:Date.now()+7000};
    N.choiceUiId='';A()?.play('chest');
   }
  }
  if(N.expedition?.id){if(expReward(N.expedition,N.soloMobs,N.players))announceArena('ZONA OČIŠĆENA · +3 ČVORIŠTA')}else if(!LAB.enabled&&N.soloState==='play'&&N.soloMobs.every(m=>m.hp<=0)){if(N.soloReserve>0)nextSoloHorde();else soloWaveDone();}
 }
}
// V151: interpolate authoritative positions on a stable tick timeline,
// not exponential easing toward each 15Hz packet (which caused visible jolts).
function sampleOnlineMobs(now,dt){
 const history=N.mobHistory;
 if(!history.length)return;
 const latest=history[history.length-1];
 const elapsed=clamp((now-N.lastState)/33.333,0,5);
 const desired=latest.tick-(N.interpolationTicks||3)+elapsed;
 if(N.mobRenderTick===null){
  N.mobRenderTick=desired;
 }else{
  const oldTick=N.mobRenderTick;
  if(desired-oldTick>15)N.mobRenderTick=desired;
  else N.mobRenderTick=oldTick+Math.min(dt,.05)*30*clamp(1+(desired-oldTick)*.12,0,1.35);
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
   mob.x=next[0];mob.y=next[1];mob.heavyRenderGait=next[2]||0;mob.heavyRenderAngle=next[3]||0;continue;
  }
  mob.x=old[0]+(next[0]-old[0])*fraction;
  mob.y=old[1]+(next[1]-old[1])*fraction;
  mob.heavyRenderGait=(old[2]||0)+((next[2]||0)-(old[2]||0))*fraction;
  const from=old[3]||0,turn=(next[3]||0)-from;mob.heavyRenderAngle=from+Math.atan2(Math.sin(turn),Math.cos(turn))*fraction;
 }
 // Remote heroes share the same render timeline; local prediction stays immediate.
 if(N.players)for(const p of N.players.values()){
  if(p.id===N.id||!p.online)continue;
  const a=before.heroes?.get(p.id),b=after.heroes?.get(p.id);
  if(!b)continue;
  if(!a||!a[2]||!b[2]||(b[0]-a[0])**2+(b[1]-a[1])**2>120**2){p.x=b[0];p.y=b[1];p.motion=null;continue}
  p.x=a[0]+(b[0]-a[0])*fraction;p.y=a[1]+(b[1]-a[1])*fraction;
 }
}
function drawClassicArenaWorm(ctx,e,model){function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}const r=e.r,phase=e.frame||0,alive=e.dead?clamp(e.deathT/.39,0,1):1;
 ctx.save();ctx.globalAlpha*=alive;ctx.translate(e.x,e.y);ctx.rotate((e.angle||0)+Math.PI/2);
 ellipse(0,17,r*.94,r*.46,'#06160d9c');
 for(let i=5;i>=0;i--){let z=i/5,undulation=Math.sin(phase*.9-i*1.1)*4.4;
  const x=undulation*(.38+z*.5),y=17-i*8,sz=r*(.52+Math.sin(z*Math.PI)*.26);
  ellipse(x,y,sz,sz*.75,i%2?'#37543a':model.color);
  ctx.strokeStyle='#b0d26977';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,sz*.72,Math.PI*.13,Math.PI*.86);ctx.stroke();
 }
 ellipse(0,-13,r*.9,r*.64,e.flash>0?'#e2ffd2':'#61814d');
 for(const side of [-1,1]){ctx.fillStyle='#d3c59a';ctx.beginPath();ctx.moveTo(side*7,-15);ctx.lineTo(side*11,-24);ctx.lineTo(side*1,-19);ctx.closePath();ctx.fill();ellipse(side*6,-15,2.2,2.8,'#f4b558')}
 const opens=e.spitWindup>0?4+Math.sin(phase*3)*2:1.8;
 ellipse(0,-8,4.8,opens+2,'#181714');ellipse(0,-9,2.7,opens,'#bcf26d');
 if(e.spitWindup>0){ellipse(0,-5,3+Math.sin(phase*6)*1.2,3,'#d0ff83')}
 ctx.restore();if(e.hp<e.maxHp){ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle='#17241b';ctx.fillRect(-r,-r*2.3,r*2,4);ctx.fillStyle='#9bc56c';ctx.fillRect(-r,-r*2.3,r*2*clamp(e.hp/Math.max(1,e.maxHp),0,1),4);ctx.restore()}
}
function drawArenaWorm(g,m,now,visible){
 if(m.hp<=0||m.x<visible.left-45||m.x>visible.right+45||m.y<visible.top-55||m.y>visible.bottom+55)return;
 const tick=N.solo?N.soloTick:N.tick,alpha=N.solo?clamp(N.soloAcc*30,0,1):1;
 const x=N.solo?(m.prevX??m.x)+(m.x-(m.prevX??m.x))*alpha:m.x,y=N.solo?(m.prevY??m.y)+(m.y-(m.prevY??m.y))*alpha:m.y;
 const winding=m.wormWindup>tick,dx=x-(m.wormDrawX??x),dy=y-(m.wormDrawY??y);m.wormDrawX=x;m.wormDrawY=y;if(dx*dx+dy*dy>.05)m.wormFacing=Math.atan2(dy,dx);
 drawClassicArenaWorm(g,{x,y,r:18.9,angle:winding?m.wormAngle:m.wormFacing??m.wormAngle??0,frame:now/105+m.id,spitWindup:winding?1:0,flash:tick-(m.hitTick||-100)<5?1:0,hp:m.hp,maxHp:m.maxHp},{color:'#638a67'});
}
function drawArenaAcid(g,now,visible){
 for(const s of N.acidShots||[]){const lead=N.solo?0:clamp((now-N.lastState)/1000,0,.07),x=s.x+s.vx*lead,y=s.y+s.vy*lead;if(x<visible.left||x>visible.right||y<visible.top||y>visible.bottom)continue;
 g.save();g.translate(x,y);g.rotate(Math.atan2(s.vy,s.vx));g.fillStyle='#a1cb4477';g.beginPath();g.ellipse(-11,0,16,4,0,0,Math.PI*2);g.fill();g.fillStyle='#6fc94c';g.beginPath();g.ellipse(0,0,9+Math.sin(now/55+s.id)*1.3,6,0,0,Math.PI*2);g.fill();g.fillStyle='#d9ff8f';g.beginPath();g.ellipse(1,-2,4,2.6,0,0,Math.PI*2);g.fill();g.restore();}
}
function drawArenaHeavy(g,m,now,visible){
 if(m.hp<=0||m.x<visible.left-110||m.x>visible.right+110||m.y<visible.top-145||m.y>visible.bottom+100)return;
 const tick=N.solo?N.soloTick:(N.mobRenderTick??N.tick),alpha=N.solo?clamp(N.soloAcc*30,0,1):1;
 const x=N.solo?(m.prevX??m.x)+(m.x-(m.prevX??m.x))*alpha:m.x,y=N.solo?(m.prevY??m.y)+(m.y-(m.prevY??m.y))*alpha:m.y;
 B().arenaClassicEnemy?.(g,m.kind,{x,y,angle:N.solo?(m.heavyAngle||0):(m.heavyRenderAngle??m.heavyAngle??0),frame:N.solo?(m.heavyGait||0):(m.heavyRenderGait??m.heavyGait??0),bossPhase:m.heavyPhase||1,bossCast:m.heavyCast?.kind===2?{kind:'howlSlow'}:null,attackT:Math.max(0,(m.kind.startsWith('werewolf')?.66:.36)-(tick-m.attackTick)/30),flash:tick-m.hitTick<5?1:0,hp:m.hp,maxHp:m.maxHp,scale:1});
}
function drawArenaHeavyWarnings(g,visible){
 const tick=N.solo?N.soloTick:(N.mobRenderTick??N.tick);
 for(const m of N.solo?N.soloMobs:N.mpMobs){const c=m.heavyCast;if(!c||m.hp<=0||c.end<=tick||c.x+c.r<visible.left||c.x-c.r>visible.right||c.y+c.r<visible.top||c.y-c.r>visible.bottom)continue;
 const k=clamp((tick-c.start)/Math.max(1,c.end-c.start),0,1);g.save();g.strokeStyle=k>.76?'#fff0a5':'#ff5752';g.fillStyle='#f14a4b24';g.lineWidth=3.5;if(c.kind===1){g.translate(c.x,c.y);g.rotate(c.angle);g.fillRect(0,-c.r,c.length,c.r*2);g.strokeRect(0,-c.r,c.length,c.r*2);g.fillRect(0,-2,c.length*k,4)}else if(c.kind!==3&&c.r>0){if(c.kind===2){g.strokeStyle='#81c6ba';g.fillStyle='#68aaa629'}g.beginPath();g.arc(c.x,c.y,c.r,0,Math.PI*2);g.fill();g.stroke();g.beginPath();g.arc(c.x,c.y,c.r*(1-k),0,Math.PI*2);g.stroke()}g.restore();
 }
}
function drawArenaMobs(g,now,dt,visible){
 const mobs=(N.solo?N.soloMobs:N.mpMobs).filter(m=>m.kind!=='troll'&&m.kind!=='worm'&&!arenaSpecial(m)),tick=N.solo?N.soloTick:N.tick;
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
  if(o.classic||o.kind==='tree'||o.kind==='rock'||o.kind==='expWall')continue;
  if(o.x>visible.right||o.x+o.w<visible.left||o.y>visible.bottom||o.y+o.h<visible.top)continue;
  const sprite=cottageSprite(o,i);
  if(sprite)g.drawImage(sprite,o.x-13,o.y-16);
 }
}

function attachVoiceToArena(){
 const expectedMatch=N.match,expectedId=N.id;
 const start=()=>{
  if(N.match!==expectedMatch||N.id!==expectedId||!['waiting','running'].includes(N.phase))return;
  window.NS159_VOICE?.mount({
   match:N.match,id:N.id,ticket:N.ticket,
   position:seat=>seat===N.id?(N.me||N.players.get(seat)):N.players.get(seat)
  });
 };
 if(window.NS159_VOICE)start();
 else window.addEventListener('ns159VoiceReady',start,{once:true});
}
// V196: explicitly opt in to isolated Cloudflare preview; guests inherit the same relay.
const EXP_PREVIEW_RELAY='https://v189-arena-abilities-nocna-straza-relay.stefanstevic1996.workers.dev';
function arenaPreviewRequested(){try{return new URLSearchParams(location.search).get('arenaPreview')==='1'}catch{return false}}
function connect(match,id,ticket,rejoin=false){
 if(rejoin?(N.phase!=='reconnecting'||!!N.ws):N.phase!=='idle')return false;
 if(B().currentProfileLevel?.()<NS140_TEMP_UNLOCK_LEVEL){N.phase='error';status('NOVA ZONA privremeno dostupna od nivoa 0');return false}
 if(!rejoin){
  resetArenaMagic();resetArenaMap();LAB_REMOTE=null;LAB_PAUSE={paused:false,votes:[],needed:1,expires:0};LAB_SUPPORTED=false;LAB_WEAPON=null;LAB_LOOK=null;LAB_SERVER_BUILD=0;
  resetRenderQuality();N.diagSnapshots=0;N.diagChars=0;N.diagRtt=null;N.seq=N.ack=0;N.tick=-1;N.delta={x:0,y:0};N.pending=[];
  N.players.clear();N.looks.clear();N.presence.clear();N.lastLookSignature='';N.lastLookCheck=0;N.lookSyncEnabled=false;N.mpMobs=[];N.mobHistory=[];N.mobRenderTick=null;N.me=null;N.retry=0;N.lostSince=0;
  N.arrivalJitter=0;N.interpolationTicks=3;N.rejoinCorrection=false;
  N.wave=1;N.waveState='play';N.choice=null;N.choiceUiId='';N.chests=[];N.drops=[];N.lastMyHp=null;N.hurtUntil=0;
 }
 N.match=match;N.id=id;N.ticket=ticket;if(!rejoin){captureArenaAccount();N.paused=false;}
 N.phase=rejoin?'reconnecting':'connecting';
 status('V168 · '+(rejoin?'VRAĆAM ISTOG IGRAČA':'POVEZIVANJE NA NOVI SERVER')+'...');
 let ws;
 try{ws=new WebSocket(N.relayPreview?EXP_PREVIEW_RELAY.replace(/^https:/,'wss:')+'/arena/'+match:'wss://nocna-straza-relay.stefanstevic1996.workers.dev/arena/'+match)}
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
  if(m.t==='ruleVictory'){announceArena(m.mode==='campaign'?'KAMPANJA ZAVRŠENA':'POBEDA · TRI KULE UNIŠTENE');return}
  if(m.t==='expeditionResult'&&m.id===N.id){if(!m.ok)announceArena('OKUPI ŽIVE SAIGRAČE KOD ULAZA');return}if(m.t==='expeditionClear'){announceArena('ZONA OČIŠĆENA · +3 ČVORIŠTA');return}
  if(m.t==='arenaTradeResult'&&m.id===N.id){if(m.ok){announceArena('RAZMENA USPEŠNA');A()?.play('choose')}else announceArena('RAZMENA NIJE DOSTUPNA');return}
  if(m.t==='fieldKit'&&m.id===N.id){announceArena('ZAVOJ · +'+Math.max(0,Math.min(18,Number(m.hp)||0))+' HP');A()?.play('choose');return}
  if(m.t==='sos'&&/^p[1-6]$/.test(m.id)){announceArena(m.id===N.id?'SOS POSLAT':'SOS · '+(N.looks.get(m.id)?.look?.name||m.id));return}
  if(m.t==='levelBoss'){announceArena('MATRIJARH · NIVO '+Math.max(10,Math.min(100,Number(m.level)||10)));return}
  if(m.t==='bossSummon'){announceArena('BOSS DOZIVA POJAČANJE · '+Math.max(0,Math.min(7,Number(m.count)||0)));return}
  if(m.t==='labState'){LAB_REMOTE={...m};if(!m.enabled){LAB_WEAPON=null;LAB_LOOK=null}window.NS160_LAB?.refresh();return}
  if(m.t==='pauseState'){LAB_PAUSE={paused:!!m.paused,votes:Array.isArray(m.votes)?m.votes:[],needed:m.needed||1,expires:m.expires||0};window.NS160_LAB?.refresh();return}
  if(m.t==='welcome'){
   if(m.protocol!==140){N.phase='error';status('Nepodudarne MP verzije');try{ws.close()}catch{}return}
   if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
   N.world=m.world||N.world;resetExp(N.world);N.expSupported=m.arenaExpedition===196;N.ruleSupported=m.arenaRules===197;N.accountSupported=m.arenaAccount===198;N.rule=null;resetArenaBreakables(N.world);N.breakSupported=m.arenaBreakables===194;N.exploreSupported=m.arenaExplore===195;N.explore=null;N.tradeUiKey='';N.phase='waiting';
   if(rejoin){N.mobHistory=[];N.mobRenderTick=null;N.lastState=0;N.rejoinCorrection=true;N.pending=[];N.delta={x:0,y:0};N.arrivalJitter=0;N.interpolationTicks=3;}
   attachVoiceToArena();
    window.NS154_GOBLINS?.prewarm();window.NS157_SCENERY?.prewarm();
    N.lookSyncEnabled=Number(m.serverBuild)>=153;
    LAB_SERVER_BUILD=Number(m.serverBuild)||0;LAB_SUPPORTED=LAB_SERVER_BUILD>=160;magicSupported=m.arenaSpells===189;N.reviveSupported=m.arenaRevive===190;N.rosterSupported=m.arenaRoster===191;N.dodgeSupported=m.arenaDodge===192;N.loadoutSupported=m.arenaLoadout===192;N.lootSupported=m.arenaLoot===192;N.sosSupported=m.arenaSOS===192;N.reviveHeld='';
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
   status('V168 · POVEZAN · ČEKAM OSTALE IGRAČE');return;
  }
  if(m.t==='look'){
   rememberLook(m.id,m.revision,m.look);
   if(LAB_SUPPORTED&&m.id===N.id&&(LAB_WEAPON||LAB_LOOK)&&m.look){
    LAB_WEAPON=m.look.weapon||null;
    LAB_LOOK={skin:m.look.skin,heroClass:m.look.heroClass,bodyStyle:m.look.bodyStyle,visualSize:m.look.visualSize};
   }
   renderPresence();return}
   if(m.t==='presence'&&Array.isArray(m.players)){
    N.presence.clear();
    for(const row of m.players)if(Array.isArray(row)&&/^p[1-6]$/.test(row[0])&&
       ['online','joining','background','reconnecting','disconnected','paused'].includes(row[1]))
      N.presence.set(row[0],row[1]);
    renderPresence();return;
   }
   if(m.t==='event'&&/^p[1-6]$/.test(m.id)){
    if(m.id!==N.id||['returned','downed','revived','eliminated'].includes(m.kind)){
     const who=String(N.looks.get(m.id)?.look?.name||m.id.toUpperCase()).slice(0,24);
     const words={downed:who+' je oboren — priđi za REVIVE',revived:who+' je podignut',eliminated:who+' je eliminisan',joined:who+' has joined the game',returned:who+' se vratio u partiju',
      left:who+' has left the game',paused:who+' je na pauzi',resumed:who+' se vratio iz pauze'};
     if(words[m.kind])announceArena(words[m.kind]);
    }
    return;
   }
   if(m.t==='waveStart'){announceArena(m.wave===10?'🧌 TALAS 10 — TROL BOSS DOLAZI':'TALAS '+m.wave+' — neprijatelji dolaze iz daljine');return}
   if(m.t==='waveEnd'){announceArena('TALAS '+m.wave+' očišćen · pripremi se za novi');return}
   if(m.t==='roster'){
   status('V190 · NOVA ZONA: '+m.ready.length+'/'+m.total+' POVEZANIH');return;
  }
  if(m.t==='start'){
   N.phase='running';N.retry=0;N.lostSince=0;
   if(N.retryTimer)clearTimeout(N.retryTimer);N.retryTimer=null;
   if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
   N.lastFrame=0;
    if(N.paused&&ws.readyState===1)ws.send(JSON.stringify({t:'pause',paused:true}));
    status('V190 · NOVA ZONA · AUTO NAPAD · 0 XP');return;
  }
  if(m.t==='s'){const before=N.diagSnapshots||0;snapshot(m);if((N.diagSnapshots||0)>before&&typeof e.data==='string')N.diagChars=(N.diagChars||0)+e.data.length;return}
  if(m.t==='pong'&&Number.isFinite(m.sent)){N.ping=Math.max(0,performance.now()-m.sent);N.diagRtt=N.ping;}
  if(m.t==='end'){
   window.NS159_VOICE?.stop();
   N.phase='ended';status('TEST ZAVRŠEN: '+String(m.reason||'kraj'));
   setTimeout(()=>{if(N.ws===ws)stop()},1200);
  }
 };
 ws.onclose=e=>{
  if(N.ws!==ws||['idle','ended'].includes(N.phase))return;
  window.NS159_VOICE?.stop();
  if(N.timeout)clearTimeout(N.timeout);N.timeout=null;
  N.ws=null;
  if(e?.code===1008){N.phase='error';status('NOVA ZONA: nevažeći pristup sobi. Vrati se u lobby.');return}
  if(!N.lostSince)N.lostSince=Date.now();
  if(Date.now()-N.lostSince>=120000){
   N.phase='error';status('V168 · ISKORIŠĆENO 2 MINUTA ZA POVRATAK · LOBBY');return;
  }
  N.retry++;N.phase='reconnecting';
  status('V168 · VRAĆAM ISTOG IGRAČA ('+N.retry+') · NE NAPUŠTAJ SOBU');
  if(N.retryTimer)clearTimeout(N.retryTimer);
  N.retryTimer=setTimeout(()=>{
   N.retryTimer=null;
   if(N.phase==='reconnecting'&&!document.hidden)connect(match,id,ticket,true);
  },Math.min(4000,650+N.retry*380));
 };
 ws.onerror=()=>{
  if(N.ws===ws)status('V168 · MREŽNA GREŠKA · POKUŠAVAM PONOVO');
 };
 return true;
}
// V179: validate the exact relay contract before any budget claim or ticket offer.
function arenaRosterIssue(net,roster,minLevel=NS140_TEMP_UNLOCK_LEVEL){
 if(!Array.isArray(roster)||roster.length<2||roster.length>6)return 'roster_count';
 const ids=roster.map(p=>p?.id);
 if(ids.some(id=>typeof id!=='string'||!/^p[1-6]$/.test(id)))return 'roster_seat';
 if(new Set(ids).size!==ids.length)return 'roster_duplicate';
 if(ids[0]!==net?.localId)return 'roster_host';
 if(typeof net.code!=='string'||!/^[A-HJ-NP-Z2-9]{6}$/.test(net.code))return 'roster_code';
 if(roster.some(p=>!Number.isFinite(Number(p.level))||Number(p.level)<minLevel))return 'roster_level';
 if(ids.slice(1).some(id=>!net.clients?.get(id)?.open))return 'guest_disconnected';
 return '';
}
function arenaRosterLabel(code){
 return ({roster_count:'Potrebna su 2–6 igrača',roster_seat:'Nevažeće mesto igrača',roster_duplicate:'Duplirano mesto igrača',roster_host:'Host nije u rosteru',roster_code:'Nevažeći kod sobe',roster_level:'Nivo igrača nije dovoljan',roster_changed:'Sastav sobe se promenio; pokušaj ponovo',invalid_tickets:'Server nije izdao sve ulaznice',guest_disconnected:'Igrač je izgubio vezu',invalid_roster:'Server je odbio roster'})[code]||code;
}
async function startHost(){
 const mode=arenaRuleMode(arguments[0]);
 const b=B(),net=b.NET,roster=b.currentLobbyRoster?.()||[];
 N.errorCode='';
 if(net?.role!=='host'||net.phase!=='lobby'||N.phase!=='idle')return false;
 const issue=arenaRosterIssue(net,roster);
 if(issue){N.errorCode=issue;N.phase='error';status('NOVA ZONA: '+arenaRosterLabel(issue));return false}
 const code=net.code,hostId=net.localId,seats=roster.map(p=>p.id);
 const attempt=(N.prepareAttempt||0)+1;N.prepareAttempt=attempt;
 N.phase='preparing';status('V168 · PRIPREMAM ZASEBAN MP SERVER...');
 try{
  N.relayPreview=arenaPreviewRequested();const req=await fetch(N.relayPreview?EXP_PREVIEW_RELAY+'/arena/create':'https://nocna-straza-relay.stefanstevic1996.workers.dev/arena/create',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({code,seats,mode}),signal:typeof globalThis.AbortSignal?.timeout==='function'?globalThis.AbortSignal.timeout(15000):undefined});
  const data=await req.json().catch(()=>null);
  if(N.prepareAttempt!==attempt||N.phase!=='preparing')return false;
  if(!req.ok||data?.protocol!==140||!data.ok||!data.tickets)throw Error(data?.error||'server_not_deployed');
  const latest=b.currentLobbyRoster?.()||[];
  if(net.role!=='host'||net.phase!=='lobby'||net.code!==code||net.localId!==hostId||latest.length!==seats.length||latest.some((p,i)=>p.id!==seats[i])||arenaRosterIssue(net,latest))throw Error('roster_changed');
  if(!/^[a-f0-9]{24}$/.test(data.match||'')||seats.some(id=>typeof data.tickets[id]!=='string'||!data.tickets[id]))throw Error('invalid_tickets');
  for(const peer of roster){
   if(peer.id===net.localId)continue;
   const c=net.clients.get(peer.id);
   if(!c?.open)throw Error('guest_disconnected');
   c.send({t:'arena140Offer',match:data.match,id:peer.id,ticket:data.tickets[peer.id],protocol:140,...(N.relayPreview?{previewRelay:1}:{})});
  }
  N.phase='idle';return connect(data.match,net.localId,data.tickets[net.localId]);
 }catch(err){
  if(N.prepareAttempt!==attempt||N.phase!=='preparing')return false;
  N.errorCode=String(err?.message||err);
  // Never redirect players to the legacy MP. Host can retry this room in-place.
  N.phase='error';status('NOVA ZONA NIJE SPREMNA: '+arenaRosterLabel(N.errorCode).slice(0,70)+' · POKUŠAJ PONOVO');return false;
 }
}
function acceptOffer(d){
 const b=B(),net=b.NET;if(net?.role!=='guest'||net.phase!=='lobby'||d?.protocol!==140||
 !/^[a-f0-9]{24}$/.test(d.match)||d.id!==net.localId||typeof d.ticket!=='string')return false;
 if(N.phase!=='idle')return N.match===d.match;
 N.relayPreview=d.previewRelay===1;return connect(d.match,d.id,d.ticket);
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
 // Remote weapon animation follows buffered world position; local pose stays responsive.
 if(!N.solo&&p.id!==N.id&&Number.isFinite(N.mobRenderTick))return N.mobRenderTick-p.attackTick;
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
  const classic=chest.style!=='arena'&&typeof B().arenaClassicProp==='function';
  const key=(classic?'classic-':'arena-')+(chest.opened?'open':'closed');
  let sprite=chestSprites[key];
  if(!sprite){
   sprite=document.createElement('canvas');sprite.width=52;sprite.height=46;
   const c=sprite.getContext('2d');
   if(!c)continue;
   if(classic){B().arenaClassicProp(c,{type:'chest',x:26,y:25,r:17,opened:chest.opened,locked:false,seed:0});chestSprites[key]=sprite;g.drawImage(sprite,chest.x-26,chest.y-25);continue;}
   c.fillStyle='#12251f9a';c.beginPath();c.ellipse(26,34,22,7,0,0,Math.PI*2);c.fill();
   c.fillStyle='#78502e';c.fillRect(8,16,36,21);
   c.strokeStyle='#e0be78';c.lineWidth=3;c.strokeRect(8,16,36,21);
   c.fillStyle='#b48246';c.fillRect(10,19,32,3);
   c.fillStyle='#e8d18b';c.fillRect(24,20,5,12);
   if(chest.opened){
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
 if(!N.soloChoice||!(N.soloChoice.options||ARENA_CORE_REWARDS).includes(option))return false;
 const me=N.me,pick=option;arenaGrantReward(me,pick,N.soloTick);
 const isXp=N.soloChoice.kind==='xp';N.soloChoice=null;N.choiceUiId='';
 if(!isXp)N.soloBetweenUntil=Date.now()+arenaRuleRest(N.rule,1750);
 A()?.play('choose');return true;
}
// Two pre-rendered blue crystal variants; retain individual pulse, depth and culling.
const xpCrystalSprites=new Map();
function xpCrystalSprite(r){
 if(xpCrystalSprites.has(r))return xpCrystalSprites.get(r);
 const canvas=document.createElement('canvas');canvas.width=40;canvas.height=44;
 const g=canvas.getContext('2d');if(!g)return null;g.translate(20,22);
 g.fillStyle='#153c5a88';g.beginPath();g.ellipse(1,8,r+5,4,0,0,Math.PI*2);g.fill();
 g.fillStyle='#62d5f8';g.strokeStyle='#c4f0ff';g.lineWidth=1.2;
 g.beginPath();g.moveTo(0,-r*1.5);g.lineTo(r,0);g.lineTo(1,r*1.2);g.lineTo(-r,0);g.closePath();g.fill();g.stroke();
 g.fillStyle='#2285b4';g.beginPath();g.moveTo(0,-r*1.5);g.lineTo(1,r*1.2);g.lineTo(-r,0);g.closePath();g.fill();
 xpCrystalSprites.set(r,canvas);return canvas;
}
function drawArenaXpCrystals(g,now,view){
 const drops=N.solo?N.soloDrops:N.drops;g.save();const alpha=g.globalAlpha;
 for(const d of drops){
  if(d.x<view.left-24||d.x>view.right+24||d.y<view.top-24||d.y>view.bottom+24)continue;
  const r=d.value>=40?10:7,sprite=xpCrystalSprite(r);
  if(sprite){
   const phase=RENDER_Q.fxLevel===1?Math.floor(now/120)*120:now;
   g.globalAlpha=alpha*(RENDER_Q.fxLevel===0?.9:.82+.18*Math.sin(phase/250+d.id));
   g.drawImage(sprite,d.x-20,d.y-22)
  }
 }
 g.restore();
}
function nearArenaRevive(){
 const me=N.me;if(N.solo||!N.reviveSupported||N.phase!=='running'||!me||me.hp<=0||me.knocked||me.finalDead||N.paused||LAB_PAUSE.paused||N.choice||N.waveState!=='play'||el('ns158Menu')?.hidden===false)return null;
 let best=null,d2=78**2;for(const p of N.players.values()){if(p.id===N.id||!p.online||!p.knocked||p.finalDead)continue;const d=(p.x-me.x)**2+(p.y-me.y)**2;if(d<=d2){best=p;d2=d}}return best;
}
function releaseArenaRevive(){
 const target=N.reviveHeld;N.reviveHeld='';N.reviveAt=0;
 if(target&&N.ws?.readyState===1)try{N.ws.send(JSON.stringify({t:'revive',target,hold:0}))}catch{}
}
function tickArenaRevive(now){
 const button=el('ns190Revive');if(!button)return;
 const near=nearArenaRevive();if(N.reviveHeld&&(!near||near.id!==N.reviveHeld))releaseArenaRevive();
 button.hidden=!near;
 if(near&&now-(N.reviveHudAt||0)>100){N.reviveHudAt=now;button.textContent=(N.reviveHeld?'PODIŽEM… ':'DRŽI ZA REVIVE · ')+Math.round(100*clamp(near.reviveProgress||0,0,75)/75)+'%'}
 if(N.reviveHeld&&N.ws?.readyState===1&&now-(N.reviveAt||0)>=100&&N.ws.bufferedAmount<4000){N.reviveAt=now;N.ws.send(JSON.stringify({t:'revive',target:N.reviveHeld,hold:1}))}
}
// Screen-space arrows reuse existing snapshot positions.
function arenaEdgePoint(dx,dy,w,h){
 const left=18,right=w-18,top=Math.min(148,h*.29),bottom=h-Math.min(118,h*.23),cx=w/2,cy=h/2;
 if(cx+dx>=0&&cx+dx<=w&&cy+dy>=0&&cy+dy<=h)return null;
 const t=Math.min(dx>0?(right-cx)/dx:dx<0?(left-cx)/dx:Infinity,dy>0?(bottom-cy)/dy:dy<0?(top-cy)/dy:Infinity);
 return {x:cx+dx*t,y:cy+dy*t,a:Math.atan2(dy,dx)};
}
function drawArenaDirections(g,w,h,zoom,me){
 const draw=(p,color,label)=>{const q=arenaEdgePoint((p.x-me.x)*zoom,(p.y-me.y)*zoom,w,h);if(!q)return;g.save();g.translate(q.x,q.y);g.rotate(q.a);g.beginPath();g.moveTo(10,0);g.lineTo(-7,-7);g.lineTo(-4,0);g.lineTo(-7,7);g.closePath();g.fillStyle=color;g.strokeStyle='#10221e';g.lineWidth=2;g.stroke();g.fill();g.restore();if(label){g.save();g.textAlign='center';g.font='bold 10px system-ui';g.fillStyle=color;g.strokeStyle='#10221e';g.lineWidth=3;const x=clamp(q.x,36,w-36),y=q.y+(q.y<h/2?16:-12);g.strokeText(label,x,y);g.fillText(label,x,y);g.restore()}};
 const mobs=N.solo?N.soloMobs:N.mpMobs;let alive=0;for(const m of mobs)if(m.hp>0)alive++;
 if(alive>0&&alive<10&&!(N.solo?N.soloReserve:N.waveReserve))for(const m of mobs)if(m.hp>0)draw(m,'#ff6363','');
 for(const p of N.players.values())if(p.id!==N.id&&p.online&&!p.finalDead)draw(p,p.knocked?(p.sosUsed?'#ff6868':'#ffbf59'):'#62dcff',p.knocked?(p.sosUsed?'SOS · REVIVE':'REVIVE'):String(N.looks.get(p.id)?.look?.name||p.id).slice(0,10));
}
function sessionHud(now){
 const wave=N.solo?N.soloWave:N.wave,state=N.solo?N.soloState:N.waveState;
 const mobs=N.solo?N.soloMobs:N.mpMobs,choice=N.solo?N.soloChoice:N.choice;
 const holder=el('ns152Choice'),hud=el('ns152Wave'),remaining=el('ns152Remaining');
 if(!holder||!hud||!remaining)return;
 if(now-N.uiAt>=140||N.choiceUiId!==(choice?(choice.seq+':'+choice.owner):'')){
  N.uiAt=now;refreshArenaDodge();refreshArenaLoot();refreshArenaRun();expHud();const swap=el('ns192Swap');if(swap){swap.hidden=!(N.solo||N.loadoutSupported)||!N.me?.secondaryWeapon||N.me.hp<=0;swap.textContent='⇄ '+(N.me?.activeWeapon||'sword')+' / '+(N.me?.secondaryWeapon||'')}
  hud.textContent=ruleTitle(wave);
  const xpHud=el('ns168XpHud'),xpText=el('ns168XpText'),xpFill=el('ns168XpFill');
  const xpEnabled=N.solo||LAB_SERVER_BUILD>=168;
  if(xpHud)xpHud.hidden=!xpEnabled;
  if(xpEnabled&&N.me){
   const level=Math.max(1,N.me.level||1),current=Math.max(0,N.me.xp||0),needed=Math.max(1,N.me.xpNeed||160);
   if(xpText)xpText.textContent='✦ NIVO '+level+' · EXP '+Math.floor(current)+' / '+needed;
   if(xpFill)xpFill.style.width=Math.min(100,current/needed*100).toFixed(1)+'%';
  }
  const count=mobs.filter(m=>m.hp>0).length+(N.solo?(LAB.enabled?0:N.soloReserve||0):(N.waveReserve||0));
  const bosses=mobs.filter(m=>m.kind==='troll'&&m.hp>0).length;
  remaining.textContent=state==='between'?'ODMOR · NOVI TALAS USKORO':
   (bosses?'🧌 BOSS TROL · ':'')+'NEPRIJATELJI '+count+'/'+(N.solo?(LAB.enabled?mobs.length:N.soloTotal||mobs.length):N.waveTotal||N.hordeTotal);
  if(!N.solo&&N.reviveSupported&&N.me?.knocked)remaining.textContent='OBORAN · '+Math.max(0,Math.ceil((N.me.downedUntil-N.tick)/30))+' s · čekaš REVIVE';
  if(!N.solo&&N.me?.finalDead)remaining.textContent='ELIMINISAN · POSMATRAŠ';
  const key=choice?(choice.seq+':'+choice.owner):'';
  if(!choice){holder.hidden=true;N.choiceUiId=''}
  else{
   holder.hidden=false;
   const mine=choice.owner===N.id;
   if(N.choiceUiId!==key){
    N.choiceUiId=key;
    el('ns152ChoiceTitle').textContent=choice.kind==='xp'?
      (mine?'✦ NIVO '+choice.level+' · NADOGRADNJA':'✦ IGRAČ BIRA NADOGRADNJU'):
      (mine?'OTVORIO SI SANDUK':'IGRAČ OTVARA SANDUK');
    el('ns152ChoiceText').textContent=mine?
     'Izaberi nadogradnju. Ako ne stigneš, automatski se bira OŠTRICA.':
     'Čeka se '+choice.owner.toUpperCase()+' · izbor se automatski završava.';
    const options=choice.options?.length?choice.options:ARENA_CORE_REWARDS;let i=0;for(const btn of holder.querySelectorAll('[data-pick]')){const k=options[i++];btn.hidden=!mine||!k;btn.disabled=false;if(k){btn.dataset.pick=k;btn.textContent=arenaRewardLabel(k)}}
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
 g.save();if(p.hp<=0){g.globalAlpha=p.knocked?.8:.38;g.translate(p.x,p.y);g.rotate(-Math.PI/2);g.translate(-p.x,-p.y);}
 const motion=updateHeroMotion(p,dt),age=swordAge(p,now);
 const b=B(),baseLook=N.looks.get(p.id)?.look||(p.id===N.id?localArenaLook():b.getVillageHeroLook?.(p.id));const look=p.activeWeapon?{...baseLook,weapon:p.activeWeapon}:baseLook;
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
// V161: one tiny cached-Canvas overlay per visible hero; no DOM nodes or game packets.
function drawArenaVoiceBadge(g,id,x,y){
 const mode=window.NS159_VOICE?.badgeState?.(id);
 if(!mode)return;
 // Muted speech activity = grey-green; real voice frames = bright green with waves.
 g.save();
 g.translate(x,y);
 g.fillStyle=mode===2?'#1e613f':'#273c34';
 g.strokeStyle=mode===2?'#b7f1a8':'#7faaa0';g.lineWidth=1.5;
 g.beginPath();g.rect(-11,-9,22,18);g.fill();g.stroke();
 g.fillStyle=mode===2?'#f3ffe3':'#b1c7bd';
 g.beginPath();g.moveTo(-7,-3);g.lineTo(-4,-3);g.lineTo(0,-7);
 g.lineTo(0,7);g.lineTo(-4,3);g.lineTo(-7,3);g.closePath();g.fill();
 g.strokeStyle=mode===2?'#ecffbb':'#8eaea3';g.lineWidth=1.5;g.lineCap='round';
 g.beginPath();g.arc(0,0,4.5,-.85,.85);g.stroke();
 if(mode===2){g.beginPath();g.arc(0,0,7,-.85,.85);g.stroke()}
 g.restore();
}
function drawArenaPlayerLabel(g,p){
 const look=N.looks.get(p.id)?.look||(p.id===N.id?localArenaLook():B().getVillageHeroLook?.(p.id));
 const visualSize=clamp(Number(look?.visualSize)||.79,.7,1.12),labelY=p.y-72-(visualSize-.79)*35;
 g.save();
 g.fillStyle='#17251c';g.fillRect(p.x-23,labelY+7,46,5);
 g.fillStyle='#a8e2a6';g.fillRect(p.x-22,labelY+8,44*clamp(p.hp/(p.maxHp||100),0,1),3);
 g.fillStyle='#f0dfb6';g.font='bold 11px sans-serif';g.textAlign='center';
 g.fillText(p.knocked?'REVIVE '+Math.max(0,3-(p.revivesUsed||0))+'/3':p.finalDead?'ELIMINISAN':p.id===N.id?'TI':(look?.name||p.id),p.x,labelY);
 drawArenaVoiceBadge(g,p.id,p.x+38,labelY-2);
 g.restore();
}
const classicSceneryCache=new Map();
function drawClassicScenery(g,p){const bridge=B().arenaClassicProp;if(!bridge)return;const key=p.type+':'+p.r+':'+p.seed;let sprite=classicSceneryCache.get(key);const pad=Math.ceil(p.r*2+12);
 if(!sprite){sprite=document.createElement('canvas');sprite.width=sprite.height=pad*2;const c=sprite.getContext('2d');if(!c||!bridge(c,{...p,x:pad,y:pad}))return;if(classicSceneryCache.size>=160)classicSceneryCache.delete(classicSceneryCache.keys().next().value);classicSceneryCache.set(key,sprite)}
 g.drawImage(sprite,p.x-pad,p.y-pad);
}
function drawDepthSortedWorld(g,now,dt,visible){
 const sprites=window.NS154_GOBLINS;
 if(!sprites?.prepare||!sprites?.drawOne){
  drawArenaBuildings(g,N.world.obstacles,visible);
  if(N.world.classicProps)for(const p of N.world.classicProps)if(p.x+p.r*2>=visible.left&&p.x-p.r*2<=visible.right&&p.y+p.r*2>=visible.top&&p.y-p.r*2<=visible.bottom)drawClassicScenery(g,p);
  drawArenaChests(g,N.solo?N.soloChests:N.chests,visible);
  drawArenaMobs(g,now,dt,visible);
  for(const m of (N.solo?N.soloMobs:N.mpMobs))if(m.kind==='worm')drawArenaWorm(g,m,now,visible);else if(arenaSpecial(m))drawArenaHeavy(g,m,now,visible);
  for(const p of N.players.values())if(p.online)drawArenaPlayerBody(g,p,now,dt);
  for(const p of N.players.values())if(p.online)drawArenaPlayerLabel(g,p);
  for(const boss of (N.solo?N.soloMobs:N.mpMobs))if(boss.kind==='troll')window.NS162_TROLL?.drawOne(g,boss,{now,tick:N.solo?N.soloTick:N.tick,visible});
  return;
 }
 if(!N.solo)sampleOnlineMobs(now,dt);
 const mobs=(N.solo?N.soloMobs:N.mpMobs).filter(m=>m.kind!=='troll'&&m.kind!=='worm'&&!arenaSpecial(m));
 const bufferedTick=N.solo?N.soloTick:(N.mobRenderTick??N.tick);
 const opt={solo:N.solo,tick:bufferedTick,now,lastState:N.solo?N.lastState:now,
  alpha:N.solo?clamp(N.soloAcc*30,0,1):1,visible};
 // Precompute visible goblins in ONE scan. They are never re-animated in sorting.
 const prepared=sprites.prepare(mobs,opt);N.visibleMobs=prepared.length;
 const jobs=[];
 const obs=N.world.obstacles||[];
 for(let i=0;i<obs.length;i++){
  const o=obs[i];
  if(o.kind==='tree'||o.kind==='rock'||o.kind==='expWall')continue;
  if(o.x>visible.right+14||o.x+o.w<visible.left-14||
     o.y>visible.bottom+17||o.y+o.h<visible.top-17)continue;
  jobs.push({depth:o.y+o.h+12,kind:0,id:i,o});
 }
 const chests=N.solo?N.soloChests:N.chests;
 for(const chest of chests)if(chest.x>=visible.left-35&&chest.x<=visible.right+35&&
   chest.y>=visible.top-35&&chest.y<=visible.bottom+35)
  jobs.push({depth:chest.y+13,kind:1,id:chest.id,chest});
 const classicProps=N.world.classicProps;
 if(classicProps)for(let i=0;i<classicProps.length;i++){const p=classicProps[i];if(p.x+p.r*2<visible.left||p.x-p.r*2>visible.right||p.y+p.r*2<visible.top||p.y-p.r*2>visible.bottom)continue;jobs.push({depth:p.y+p.r*.45,kind:8,id:i,p});}
 const decor=classicProps?[]:window.NS157_SCENERY?.generate(N.world)||[];
 for(const item of decor){
  if(item.x<visible.left-66||item.x>visible.right+66||
     item.y<visible.top-148||item.y>visible.bottom+26)continue;
  jobs.push({depth:item.depth,kind:4,id:item.id,item});
 }
 const people=[];
 for(const p of N.players.values()){
  if(!p.online)continue;
  // All remote heroes were sampled together with mobs above; no second easing pass.
  if(p.x<visible.left-75||p.x>visible.right+75||
     p.y<visible.top-95||p.y>visible.bottom+50)continue;
  people.push(p);
  jobs.push({depth:p.y+13,kind:2,id:Number(p.id.slice(1)),p});
 }
 for(const entry of prepared)jobs.push({depth:entry.depth,kind:3,id:entry.mob.id,entry});
 for(const m of N.solo?N.soloMobs:N.mpMobs)if(arenaSpecial(m)&&m.hp>0&&m.x>=visible.left-110&&m.x<=visible.right+110&&m.y>=visible.top-145&&m.y<=visible.bottom+100)jobs.push({depth:m.y+15,kind:7,id:m.id,m});
 for(const m of (N.solo?N.soloMobs:N.mpMobs))if(m.kind==='worm'&&m.hp>0&&m.x>=visible.left-45&&m.x<=visible.right+45&&m.y>=visible.top-55&&m.y<=visible.bottom+55)jobs.push({depth:m.y+12,kind:6,id:m.id,m});
 for(const boss of (N.solo?N.soloMobs:N.mpMobs)){
  if(boss.kind!=='troll'||boss.hp<=0||boss.x<visible.left-80||boss.x>visible.right+80||boss.y<visible.top-160||boss.y>visible.bottom+40)continue;
  jobs.push({depth:boss.y+14,kind:5,id:boss.id,boss});
 }
 // 80 goblins + ~12 props + six players: deterministic O(n log n),
 // far cheaper than multiple complete canvas render passes.
 jobs.sort((a,b)=>a.depth-b.depth||a.kind-b.kind||a.id-b.id);
 for(const item of jobs){
  if(item.kind===0){const sprite=cottageSprite(item.o,item.id);
   if(sprite)g.drawImage(sprite,item.o.x-13,item.o.y-16)}
  else if(item.kind===1)drawArenaChests(g,[item.chest],visible);
  else if(item.kind===2)drawArenaPlayerBody(g,item.p,now,dt);
  else if(item.kind===4)window.NS157_SCENERY?.drawOne(g,item.item);
  else if(item.kind===5)window.NS162_TROLL?.drawOne(g,item.boss,opt);
  else if(item.kind===6)drawArenaWorm(g,item.m,now,visible);
  else if(item.kind===7)drawArenaHeavy(g,item.m,now,visible);
  else if(item.kind===8)drawClassicScenery(g,item.p);
  else sprites.drawOne(g,item.entry,opt);
 }
 // Names and HP remain legible above a large horde, even when bodies are occluded.
 for(const p of people)drawArenaPlayerLabel(g,p);
}
// V160 lightweight synchronized stick-figure ally + decorative test props.
function drawLabThings(g,now,visible){
 const frozen=N.solo?N.soloMobs:N.mpMobs;
 for(const mob of frozen)if(mob.labFrozen&&mob.hp>0&&
   mob.x>=visible.left-20&&mob.x<=visible.right+20&&mob.y>=visible.top-55&&mob.y<=visible.bottom+20){
  g.save();g.fillStyle='#a7d7ff';g.font='bold 12px system-ui';
  g.textAlign='center';g.fillText('❄',mob.x,mob.y-35);g.restore();
 }
 const allies=N.solo?LAB.allies:LAB_REMOTE?.allies||[];
 const props=N.solo?LAB.props:LAB_REMOTE?.props||[];
 for(const p of props){
  if(p.x<visible.left-28||p.x>visible.right+28||p.y<visible.top-50||p.y>visible.bottom+28)continue;
  g.save();g.translate(p.x,p.y);
  g.fillStyle='#13271d99';g.beginPath();g.ellipse(0,5,13,5,0,0,7);g.fill();
  if(p.kind==='torch'){
   g.fillStyle='#70482c';g.fillRect(-2,-26,4,30);
   g.fillStyle='#ffbb56';g.beginPath();g.moveTo(0,-37);g.quadraticCurveTo(-13,-25,0,-18);g.quadraticCurveTo(13,-25,0,-37);g.fill();
  }else if(p.kind==='banner'){
   g.strokeStyle='#bda17a';g.lineWidth=3;g.beginPath();g.moveTo(-4,3);g.lineTo(-4,-39);g.stroke();
   g.fillStyle='#9c5153';g.fillRect(-3,-37,20,19);
  }else{
   g.fillStyle='#6e4f36';g.fillRect(-3,-26,6,30);
   g.fillStyle='#d1aa71';g.beginPath();g.arc(0,-29,12,0,7);g.fill();
   g.strokeStyle='#873a32';g.lineWidth=2;g.beginPath();g.arc(0,-29,6,0,7);g.stroke();
  }
  g.restore();
 }
 for(const ally of allies){
  if(ally.hp<=0||ally.x<visible.left-40||ally.x>visible.right+40||ally.y<visible.top-70||ally.y>visible.bottom+40)continue;
  g.save();g.translate(ally.x,ally.y);
  const swing=now/500+ally.id;
  g.fillStyle='#11261b99';g.beginPath();g.ellipse(0,9,16,6,0,0,7);g.fill();
  g.strokeStyle='#b2c8aa';g.lineWidth=5;g.lineCap='round';
  g.beginPath();g.moveTo(-5,-13);g.lineTo(-7,5);g.moveTo(5,-13);g.lineTo(8,5);g.stroke();
  g.fillStyle='#718e86';g.fillRect(-10,-35,20,23);
  g.fillStyle='#c8d4bd';g.fillRect(-8,-35,16,4);
  g.fillStyle='#e0bf93';g.beginPath();g.arc(0,-45,10,0,7);g.fill();
  g.fillStyle='#4d6b5f';g.fillRect(-11,-52,22,6);
  g.strokeStyle='#9fc0af';g.lineWidth=4;g.beginPath();g.moveTo(-10,-27);g.lineTo(-20,-14);g.moveTo(10,-27);g.lineTo(19,-16);g.stroke();
  g.fillStyle='#769f86';g.beginPath();g.ellipse(-20,-13,9,13,-.1,0,7);g.fill();
  g.strokeStyle='#dedbd1';g.lineWidth=3;
  g.beginPath();g.moveTo(19,-16);g.lineTo(25+Math.sin(swing)*6,-41);g.stroke();
  g.fillStyle='#9fefab';g.font='bold 10px system-ui';g.textAlign='center';
  g.fillText('SAVEZNIK '+ally.id,0,-64);
  g.restore();
 }
}
// V181 visual fidelity constraint: keep the established canvas DPR and every
// hero/enemy shape, size, skin and animation intact. Adapt cosmetic XP pulse only.
function newRenderBudget(cap=1.5){
 cap=Math.max(.5,Math.min(1.5,Number(cap)||1));
 return {cap,dpr:cap,fxLevel:2,slow:0,fast:0,p95Ms:null,frameCostMs:null,windows:0,changes:0};
}
function tuneRenderBudget(q,fps,p95Ms,costMs){
 if(![fps,p95Ms,costMs].every(Number.isFinite))return q;
 q.p95Ms=p95Ms;q.frameCostMs=costMs;q.windows++;
 // Hysteresis: two overloaded windows to drop, five comfortable to recover.
 const overloaded=fps<57||p95Ms>23||costMs>15;
 const comfortable=fps>=59&&p95Ms<=18&&costMs<10;
 q.slow=overloaded?q.slow+1:0;q.fast=comfortable?q.fast+1:0;
 const old=q.fxLevel;
 if(q.slow>=2){q.fxLevel=Math.max(0,q.fxLevel-1);q.slow=0;q.fast=0}
 else if(q.fast>=5){q.fxLevel=Math.min(2,q.fxLevel+1);q.fast=0}
 if(old!==q.fxLevel)q.changes++;
 return q;
}
let RENDER_Q=newRenderBudget(window.devicePixelRatio||1),renderIntervals=[],renderCostSum=0,renderCostCount=0;
function resetRenderSamples(now=0){
 renderIntervals.length=0;renderCostSum=0;renderCostCount=0;
 N.frames=0;N.fpsAt=now;N.lastFrame=0;
}
function resetRenderQuality(){RENDER_Q=newRenderBudget(window.devicePixelRatio||1);N.fps=0;resetRenderSamples()}
function frame(now){
 if(N.phase!=='running'||document.hidden)return;
 const canvas=el('ns140Canvas'),g=canvas?.getContext('2d');if(!g)return;
 const frameStart=performance.now();
 const elapsed=N.lastFrame?now-N.lastFrame:0;
 if(elapsed>1000||elapsed<0)resetRenderSamples(now);
 const dt=clamp((now-(N.lastFrame||now))/1000,0,.035);N.lastFrame=now;
 if(elapsed>0&&elapsed<=1000&&renderIntervals.length<300)renderIntervals.push(elapsed);
 if(!N.fpsAt)N.fpsAt=now;N.frames++;
 if(now-N.fpsAt>=1000){
  N.fps=Math.round(N.frames*1000/(now-N.fpsAt));
  if(renderIntervals.length&&renderCostCount){const sorted=renderIntervals.slice().sort((a,b)=>a-b);tuneRenderBudget(RENDER_Q,N.fps,sorted[Math.ceil(sorted.length*.95)-1],renderCostSum/renderCostCount)}
  N.frames=0;N.fpsAt=now;renderIntervals.length=0;renderCostSum=0;renderCostCount=0;
 }
 const v=input();
 const selecting=N.paused||!el('ns192MapPanel')?.hidden||!el('ns158Menu')?.hidden||LAB_PAUSE.paused||(N.solo?!!N.soloChoice:!!N.choice);
 if(selecting||N.reviveHeld||N.me?.knocked||N.me?.finalDead){v.x=0;v.y=0}
 if(N.me&&N.me.hp>0){
  const oldX=N.me.x,oldY=N.me.y;
  const dash=selecting?{x:0,y:0,speed:1}:arenaDodgeVector(N.me,N.solo?N.soloTick:N.tick,v.x,v.y),speed=N.world.speed*dt*dash.speed*(N.me.speedMult||1)*((N.me.enemySlowUntil||0)>(N.solo?N.soloTick:N.tick)?.58:1);
  moveLocal(N.me,dash.x*speed,dash.y*speed);
  if(N.solo){if(!N.paused)stepSolo(dt);if(N.me.hp<=0){N.phase='solo_ended';status('STRAŽAR JE PAO · SOLO TEST ZAVRŠEN')}}
  else {N.delta.x+=N.me.x-oldX;N.delta.y+=N.me.y-oldY;}
  const away=Math.hypot(N.me.x-N.me.tx,N.me.y-N.me.ty);
  if(!N.solo&&away>105){N.me.x=N.me.tx+(N.me.x-N.me.tx)*105/away;N.me.y=N.me.ty+(N.me.y-N.me.ty)*105/away}
 }
 if(!selecting&&N.me&&N.me.hp>0&&Math.hypot(v.x,v.y)>.25&&now-N.lastStepSound>285){
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
 const r=canvas.getBoundingClientRect(),dpr=RENDER_Q.dpr;
 const ww=Math.round(r.width*dpr),hh=Math.round(r.height*dpr);if(canvas.width!==ww||canvas.height!==hh){canvas.width=ww;canvas.height=hh}
 g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#192e29';g.fillRect(0,0,r.width,r.height);
 const zoom=clamp(Math.max(r.width/750,r.height/760),.7,1.45),me=(N.me?.finalDead?[...N.players.values()].find(p=>p.online&&p.hp>0&&!p.knocked):null)||N.me||{x:N.world.w/2,y:N.world.h/2};
 g.setTransform(dpr*zoom,0,0,dpr*zoom,dpr*(r.width/2-me.x*zoom),dpr*(r.height/2-me.y*zoom));
 // Draw only lines covering the current camera, never all 4,200 world pixels.
 const visible={left:me.x-r.width/2/zoom-90,right:me.x+r.width/2/zoom+90,
  top:me.y-r.height/2/zoom-90,bottom:me.y+r.height/2/zoom+90};
 g.fillStyle=N.expedition?.id?'#20282a':'#395443';g.fillRect(Math.max(0,visible.left),Math.max(0,visible.top),
  Math.min(N.world.w,visible.right)-Math.max(0,visible.left),
  Math.min(N.world.h,visible.bottom)-Math.max(0,visible.top));
 g.strokeStyle='#536b55';g.beginPath();
 for(let x=Math.max(0,Math.floor(visible.left/55)*55);x<=Math.min(N.world.w,visible.right);x+=55){
  g.moveTo(x,Math.max(0,visible.top));g.lineTo(x,Math.min(N.world.h,visible.bottom));
 }
 for(let y=Math.max(0,Math.floor(visible.top/55)*55);y<=Math.min(N.world.h,visible.bottom);y+=55){
  g.moveTo(Math.max(0,visible.left),y);g.lineTo(Math.min(N.world.w,visible.right),y);
 }
 g.stroke();
 drawExp(g,visible);drawRuleTowers(g,visible);drawDepthSortedWorld(g,now,dt,visible);
 drawArenaXpCrystals(g,now,visible);drawArenaWeaponLoot(g,visible);drawArenaFieldKits(g,visible);drawArenaExplore(g,visible);drawArenaAcid(g,now,visible);drawArenaHeavyWarnings(g,visible);
 drawLabThings(g,now,visible);drawArenaMagic(g,now,visible);
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
 g.setTransform(dpr,0,0,dpr,0,0);drawRuleNight(g,r.width,r.height,zoom,me,now);
 refreshArenaMap(now);tickArenaRevive(now);drawArenaDirections(g,r.width,r.height,zoom,me);sessionHud(now);refreshMagicHud(now);
 // Avoid updating live DOM HUD sixty times per second on mid-range phones.
 if(now-(N.statsAt||0)>=320){
  N.statsAt=now;
  el('ns140Stats').textContent=N.solo?
   ('FPS '+N.fps+' | SOLO · GOBLINI '+N.soloMobs.filter(m=>m.hp>0).length+' | VIDLJIVO '+N.visibleMobs+' | NIVO '+(N.me?.level||1)+' · EXP '+Math.floor(N.me?.xp||0)+ '/'+(N.me?.xpNeed||160)):
   ('FPS '+N.fps+' | '+Math.round(N.ping)+'ms | GOBLINI '+N.mpMobs.length+'/'+N.hordeTotal+
    ' | VIDLJIVO '+N.visibleMobs+(LAB_SERVER_BUILD>=168?' | NIVO '+(N.me?.level||1)+' · EXP '+Math.floor(N.me?.xp||0):'')+' | CPU '+N.serverMs+'ms');
 }
 renderCostSum+=performance.now()-frameStart;renderCostCount++;
}
window.NS140_ARENA={startHost,startSolo,acceptOffer,frame,stop,get errorCode(){return N.errorCode},get active(){return N.phase==='running'},
 get busy(){return N.phase!=='idle'},get stabilityDiagnostics(){return {phase:N.phase, fps:N.fps||null, jitterMs:N.arrivalJitter??null, interpolationDelayMs:(N.interpolationTicks||3)*1000/30, renderDpr:RENDER_Q.dpr,cosmeticFxLevel:RENDER_Q.fxLevel,characterQualityLocked:true, frameP95Ms:RENDER_Q.p95Ms, meanFrameCostMs:RENDER_Q.frameCostMs, qualityChanges:RENDER_Q.changes, rttMs:N.diagRtt??null, snapshots:N.diagSnapshots||0, avgSnapshotChars:N.diagSnapshots?Math.round(N.diagChars/N.diagSnapshots):null, snapshotAgeMs:N.lastState?Math.max(0,Math.round(performance.now()-N.lastState)):null, reconnectAttempts:N.retry, connected:[...N.presence.values()].filter(p=>p==='online'||p==='paused').length, serverBuild:LAB_SERVER_BUILD||null,error:N.errorCode||null,voiceConnected:!!window.NS159_VOICE?.connected}},get diagnostics(){return {magicSupported:N.solo||magicSupported,magicMana:N.solo?N.me?.spellMana:spellView?.[0]/10,magicCooldown:N.solo&&N.me?arenaSpellState(N.me,N.soloTick)[2]:spellView?.[2],phase:N.phase,mode:N.solo?'solo':'multiplayer',paused:N.paused,globalPaused:LAB_PAUSE.paused,labSupported:LAB_SUPPORTED,soloWave:N.soloWave,labEnabled:LAB.enabled,labCustomCount:LAB.customCount,labAllies:LAB.allies.length,labProps:LAB.props.length,seq:N.seq,ack:N.ack,correction:N.correction,fps:N.fps,ping:N.ping,serverMs:N.serverMs,soloMobCount:N.soloMobs.filter(m=>m.hp>0).length,soloBossCount:N.soloMobs.filter(m=>m.kind==='troll'&&m.hp>0).length,soloBossHp:N.soloMobs.find(m=>m.kind==='troll')?.hp||0,soloGoblinHp:N.soloMobs.map(m=>m.hp),soloMobsPos:N.soloMobs.map(m=>[m.x,m.y]),mobBufferSize:N.mobHistory.length,mobRenderTick:N.mobRenderTick,crowdFields:N.soloCrowd?.cachedFields||0,soloKills:N.soloKills,soloHp:N.solo?N.me?.hp:null,
 joystickActive:N.stick.ptr!==null,stickX:N.stick.x,stickY:N.stick.y,autoAttack:true,
 treeColliderCount:N.world.obstacles.filter(o=>o.kind==='tree').length,
 rockColliderCount:N.world.obstacles.filter(o=>o.kind==='rock').length,menuVisible:!el('ns158Menu')?.hidden,
 worldWidth:N.world.w,worldHeight:N.world.h,runLevel:N.me?.level||1,runXp:N.me?.xp||0,runXpNeed:N.me?.xpNeed||160,runXpCollected:N.me?.xpCollected||0,xpCrystals:(N.solo?N.soloDrops:N.drops).length,
  playerX:N.me?.x,playerY:N.me?.y,walking:!!N.me?.motion?.walking,
 facing:N.me?.motion?.side||1,attackAngle:N.me?.attackAngle??null}}};
})();
