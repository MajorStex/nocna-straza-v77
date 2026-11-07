
// Noćna Straža v95: small host-owned rescue event.
// A single cage, three leash-bound orc guards and at most one weak temporary helper.
// Never adds the helper to G.players (no extra input, player snapshots or revive slots).
const NS95_CAGE=(()=>{
 const tr=(en,sr)=>window.__gameLanguage?.value==='sr'?sr:en;
 const now=()=>G.time||0;
 const testMode=()=>{try{return new URLSearchParams(location.search).get('cage-test')==='1'}catch{return false}};
 let stepped=0;
 function current(){return G.ns95Cage||null}
 function posValid(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>130&&y>130&&x<WORLD.w-130&&y<WORLD.h-130}
 function chooseLocation(){
  const ox=START.x,oy=START.y;
  const offsets=[[410,-170],[-350,210],[365,320],[-370,-290],[170,-400],[-130,415]];
  for(const [dx,dy] of offsets){
   const x=ox+dx,y=oy+dy;
   if(!posValid(x,y))continue;
   if(!canStepClear({r:44},x,y))continue;
   if(props.some(p=>isSolidProp(p.type)&&Math.hypot(p.x-x,p.y-y)<p.r+70))continue;
   return{x,y};
  }
  return{x:ox+410,y:oy-170};
 }
 function spawnGuards(c){
  const placements=[[83,0],[-78,22],[3,89]];
  c.guardIds=[];
  for(let i=0;i<placements.length;i++){
   const [dx,dy]=placements[i],x=c.x+dx,y=c.y+dy;
   let x2=x,y2=y;
   for(let tryNo=0;tryNo<8&&!canStepClear({r:15},x2,y2);tryNo++){
    const a=tryNo*TAU/8;x2=x+Math.cos(a)*25;y2=y+Math.sin(a)*25;
   }
   if(!posValid(x2,y2))continue;
   const m=addMob('goblin',x2,y2);
   m.ns95Guard=true;m.ns95AnchorX=x2;m.ns95AnchorY=y2;
   m.ns95CageX=c.x;m.ns95CageY=c.y;
   m.hp=Math.round(58*(1+Math.min(1.4,(G.wave-1)*.08)));
   m.maxHp=m.hp;m.damage=8;m.speed=50;m.attackCD=1.0+i*.2;
   m.approach=0;m.targetLockUntil=0;m.ns95PatrolPhase=i*2.1;
   c.guardIds.push(m.id);
  }
 }
 function reset(){
  stepped=0;
  G.ns95Cage=null;
  if(NET.role==='guest'||G.caveMode||!['default','network'].includes(G.runType))return;
  const {x,y}=chooseLocation();
  const c={x,y,freed:false,rewarded:false,createdAt:now(),guards:3,guardIds:[],ally:null,attractors:0};
  G.ns95Cage=c;spawnGuards(c);
 }
 function guardCount(c=current()){
  if(!c||c.freed)return 0;
  return G.mobs.reduce((n,m)=>n+(!m.dead&&m.ns95Guard?1:0),0);
 }
 function guardStep(m,dt,alive){
  const c=current();
  if(!c||!m.ns95Guard)return false;
  const at=alive.filter(p=>!p.dead&&Math.hypot(p.x-c.x,p.y-c.y)<195)
    .sort((a,b)=>(a.x-m.x)**2+(a.y-m.y)**2-((b.x-m.x)**2+(b.y-m.y)**2))[0];
  const guardDist=Math.hypot(m.x-c.x,m.y-c.y);
  if(at){
   const dx=at.x-m.x,dy=at.y-m.y,dist=Math.max(1,Math.hypot(dx,dy));
   m.angle=Math.atan2(dy,dx);
   if(dist<m.r+at.r+46&&!obstacleInPath(m.x,m.y,at.x,at.y,Math.min(10,m.r*.5))){
    if(m.attackCD<=0){m.attackCD=1.65;m.attackT=.33;damagePlayer(at,m.damage,m);sfx('goblinAttack')}
   }else if(guardDist<145&&dist>m.r+at.r+34) movingCircle(m,dx/dist*m.speed*dt,dy/dist*m.speed*dt);
  }else{
   const a=now()*.48+(m.ns95PatrolPhase||0);
   const x=(m.ns95AnchorX||c.x)+Math.cos(a)*21;
   const y=(m.ns95AnchorY||c.y)+Math.sin(a)*18;
   const dx=x-m.x,dy=y-m.y,d=Math.hypot(dx,dy);
   if(d>5)movingCircle(m,dx/d*dt*32,dy/d*dt*32);
   m.angle=a;
  }
  if(guardDist>152){
   const dx=c.x-m.x,dy=c.y-m.y,d=Math.max(1,Math.hypot(dx,dy));
   movingCircle(m,dx/d*dt*75,dy/d*dt*75);
  }
  return true;
 }
 function free(c){
  if(!c||c.freed||guardCount(c)>0)return false;
  const rescuer=G.players.filter(p=>!p.dead)
    .sort((a,b)=>(a.x-c.x)**2+(a.y-c.y)**2-((b.x-c.x)**2+(b.y-c.y)**2))[0];
  if(!rescuer||Math.hypot(rescuer.x-c.x,rescuer.y-c.y)>210)return false;
  c.freed=true;c.guards=0;c.ally={
   x:c.x+8,y:c.y+26,hp:64,maxHp:64,until:now()+110,
   attackAt:now()+1.3,frame:0,owner:rescuer.id,phase:0
  };
  if(!c.rewarded){
   c.rewarded=true;
   if(NET.role==='host'){
    coopXP(rescuer,40);
   }else if(NET.role===''){
    G.xp=Math.max(0,Math.min(G.xpNeed-1,G.xp+45));
   }
  }
  effect('loot',c.x,c.y);sfx('unlock');
  announce(tr('PRISONER FREED · WEAK ALLY + XP','ZAROBLJENIK OSLOBOĐEN · SAVEZNIK + XP'),3.5);
  return true;
 }
 function tick(dt){
  const c=current();
  if(!c||NET.role==='guest'||G.mode!=='play'||G.caveMode)return;
  stepped+=dt;
  if(stepped<.09)return;const h=Math.min(stepped,.2);stepped=0;
  if(!c.freed){c.guards=guardCount(c);if(!c.guards)free(c);return}
  const a=c.ally;if(!a)return;
  if(now()>a.until||a.hp<=0){c.ally=null;return}
  a.frame=(a.frame||0)+h*6;a.phase=(a.phase||0)+h;
  const p=G.players.find(p=>p.id===a.owner&&!p.dead)||G.players.find(p=>!p.dead);
  if(!p)return;
  const dx=p.x-a.x,dy=p.y-a.y,d=Math.max(1,Math.hypot(dx,dy));
  if(d>640){a.x=p.x-35;a.y=p.y+38}
  else if(d>95){
   const speed=d>270?207:115;
   movingCircle({x:a.x,y:a.y,r:13,get dead(){return false}},0,0); // no mutation, collision probes are below
   const pseudo={x:a.x,y:a.y,r:13};
   movingCircle(pseudo,dx/d*speed*h,dy/d*speed*h);a.x=pseudo.x;a.y=pseudo.y;
  }
  if(now()>=a.attackAt){
   a.attackAt=now()+2.35;
   const nearest=G.mobs.find(m=>!m.dead&&!m.ns95Guard&&Math.hypot(m.x-a.x,m.y-a.y)<54);
   if(nearest){nearest.hp-=3;nearest.flash=.1;if(nearest.hp<=0)killMob(nearest,p)}
  }
 }
 function beginMobTick(){const c=current();if(c)c.attractors=0}
 function decoyStep(m,dt){
  const c=current(),a=c?.ally;
  if(!a||G.caveMode||m.ns95Guard||m.dead||m.id%5!==0||!['goblin','crawler','skeleton'].includes(m.type)||c.attractors>=2)return false;
  if(now()>=a.until||a.hp<=0)return false;
  const d=Math.hypot(m.x-a.x,m.y-a.y);
  if(d>160)return false;
  c.attractors++;
  m.angle=Math.atan2(a.y-m.y,a.x-m.x);
  if(d>m.r+15){
   const step=Math.min(m.speed,100)*dt;
   movingCircle(m,(a.x-m.x)/Math.max(1,d)*step,(a.y-m.y)/Math.max(1,d)*step);
  }else if(m.attackCD<=0){
   m.attackCD=1.6;m.attackT=.25;
   a.hp=Math.max(0,a.hp-7);
  }
  return true;
 }
 function snapshot(){
  const c=current();
  if(!c)return null;
  const a=c.ally;
  return [Math.round(c.x),Math.round(c.y),c.freed?1:0,c.rewarded?1:0,
   c.freed?0:guardCount(c),a?[Math.round(a.x),Math.round(a.y),Math.round(a.hp),Math.round(a.until-now()),a.owner]:null];
 }
 function receive(data){
  if(NET.role!=='guest')return;
  if(!Array.isArray(data)||data.length<5||!posValid(data[0],data[1])){G.ns95Cage=null;return}
  const old=current(),freed=!!data[2];
  const ally=Array.isArray(data[5])&&data[5].length>=4?{
    x:Number(data[5][0])||0,y:Number(data[5][1])||0,
    hp:Math.max(0,Math.min(64,Number(data[5][2])||0)),maxHp:64,
    until:now()+Math.max(0,Math.min(120,Number(data[5][3])||0)),
    frame:(old?.ally?.frame||0)+.13,owner:String(data[5][4]||'p1')
  }:null;
  G.ns95Cage={x:data[0],y:data[1],freed,rewarded:!!data[3],
   guards:Math.max(0,Math.min(3,Number(data[4])||0)),ally,guardIds:[]};
  if(freed&&!old?.freed)effect('loot',data[0],data[1]);
 }
 function save(){
  const c=current();if(!c)return null;
  return {x:c.x,y:c.y,freed:c.freed,rewarded:c.rewarded,
   guards:guardCount(c),ally:c.ally?{...c.ally}:null};
 }
 function resume(o){
  if(!o||!posValid(Number(o.x),Number(o.y)))return false;
  const old=current(),freed=!!o.freed;
  const c={x:Number(o.x),y:Number(o.y),freed,rewarded:!!o.rewarded,guards:0,guardIds:[],ally:null};
  if(freed){
   const a=o.ally;
   if(a&&Number.isFinite(Number(a.hp))&&Number(a.hp)>0)c.ally={
    x:Number(a.x)||c.x,y:Number(a.y)||c.y,hp:clamp(Number(a.hp),0,64),
    maxHp:64,until:Math.max(now()+2,Math.min(now()+120,Number(a.until)||now()+40)),
    owner:String(a.owner||'p1'),frame:0,attackAt:now()+1.7
   };
  }
  G.ns95Cage=c;
  if(!freed){
   for(const m of G.mobs){
    if(m.dead||Math.hypot(m.x-c.x,m.y-c.y)>130)continue;
    if(m.ns95Guard){
     m.ns95CageX=c.x;m.ns95CageY=c.y;
     m.ns95AnchorX=m.ns95AnchorX||m.x;m.ns95AnchorY=m.ns95AnchorY||m.y;
     c.guardIds.push(m.id);
    }
   }
   if(!c.guardIds.length)spawnGuards(c);
   c.guards=guardCount(c);
  }
  return true;
 }
 function draw(){
  const c=current();
  if(!c||G.caveMode||G.mode!=='play')return;
  const p=screenPoint(c.x,c.y),v=viewSize();
  if(p.x<-125||p.x>v.w+125||p.y<-120||p.y>v.h+135)return;
  ctx.save();ctx.translate(p.x,p.y);
  if(!c.freed){
   // Tiled silhouette cage: prisoner is BEHIND front bars, never detached.
   ellipse(0,22,55,17,'#061011a8');
   ctx.fillStyle='#3b3933';ctx.fillRect(-38,11,76,9);
   ctx.strokeStyle='#a98d66';ctx.lineWidth=4;
   ctx.strokeRect(-43,-55,86,77);
   ctx.strokeStyle='#667d72';ctx.lineWidth=3.2;
   ctx.beginPath();ctx.moveTo(-43,-56);ctx.lineTo(-27,-67);ctx.lineTo(27,-67);ctx.lineTo(43,-56);ctx.stroke();
   // Captive humanoid with head, hands and boots, in muted matching palette.
   ellipse(0,-34,10,11,'#d2b29b');ellipse(0,-52,10,5,'#453e3b');
   ctx.fillStyle='#aeb4a1';ctx.fillRect(-10,-23,20,27);
   ctx.strokeStyle='#9b8b7f';ctx.lineWidth=5;ctx.beginPath();
   ctx.moveTo(-10,-14);ctx.lineTo(-19,1);ctx.moveTo(10,-14);ctx.lineTo(19,1);
   ctx.moveTo(-5,4);ctx.lineTo(-8,18);ctx.moveTo(5,4);ctx.lineTo(8,18);ctx.stroke();
   // Foreground iron bars rendered over the prisoner.
   ctx.strokeStyle='#566b68';ctx.lineWidth=5;ctx.beginPath();
   for(const dx of [-31,-14,3,20,36]){ctx.moveTo(dx,-54);ctx.lineTo(dx,17)}ctx.stroke();
   ctx.strokeStyle='#b0bcb1';ctx.lineWidth=1.5;ctx.beginPath();
   for(const dx of [-31,-14,3,20,36]){ctx.moveTo(dx-2,-51);ctx.lineTo(dx-2,14)}ctx.stroke();
   ctx.fillStyle='#936d43';ctx.fillRect(-11,-1,22,20);
   ctx.strokeStyle='#d6ac71';ctx.lineWidth=2;ctx.strokeRect(-11,-1,22,20);
   ctx.fillStyle='#e2d3ac';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
   ctx.fillText(tr('SAVE PRISONER','OSLOBODI'),0,-80);
  }else{
   ctx.strokeStyle='#648577';ctx.lineWidth=3;ctx.globalAlpha=.55;
   ctx.beginPath();ctx.moveTo(-35,-30);ctx.lineTo(-35,16);ctx.lineTo(-12,16);ctx.moveTo(35,-30);ctx.lineTo(35,16);ctx.stroke();
  }
  ctx.restore();
  const a=c.ally;
  if(!a||a.hp<=0||now()>a.until)return;
  const q=screenPoint(a.x,a.y);
  if(q.x<-35||q.y<-70||q.x>v.w+35||q.y>v.h+55)return;
  ctx.save();ctx.translate(q.x,q.y);
  ellipse(0,16,16,5,'#06121088');
  const sway=Math.sin(a.frame||0)*3;
  ctx.strokeStyle='#6f7e72';ctx.lineWidth=5;ctx.beginPath();
  ctx.moveTo(-5,3);ctx.lineTo(-5+sway,16);ctx.moveTo(5,3);ctx.lineTo(5-sway,16);ctx.stroke();
  ctx.fillStyle='#7e9d8b';ctx.fillRect(-9,-20,18,23);
  ctx.fillStyle='#d2b49b';ctx.beginPath();ctx.arc(0,-27,10,0,TAU);ctx.fill();
  ctx.fillStyle='#4b423d';ctx.fillRect(-9,-36,18,6);
  ctx.strokeStyle='#c2ad8d';ctx.lineWidth=4;ctx.beginPath();
  ctx.moveTo(-10,-15);ctx.lineTo(-16,-3);ctx.moveTo(10,-15);ctx.lineTo(15,-3);ctx.stroke();
  ctx.fillStyle='#182e28';ctx.fillRect(-18,-47,36,5);
  ctx.fillStyle='#82d6ab';ctx.fillRect(-18,-47,36*clamp(a.hp/64,0,1),5);
  ctx.fillStyle='#bdeac8';ctx.font='bold 9px system-ui';ctx.textAlign='center';
  ctx.fillText(tr('ALLY','SAVEZNIK'),0,-51);ctx.restore();
 }
 function drawGuard(a){
  if(!a.ns95Guard||a.dead)return;
  ctx.save();ctx.strokeStyle='#d29c63';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-a.r-6,-a.r-18);ctx.lineTo(a.r+6,-a.r-18);ctx.stroke();
  ctx.fillStyle='#5e3933';ctx.fillRect(-a.r-6,-a.r-21,8,8);ctx.fillRect(a.r-2,-a.r-21,8,8);
  ctx.fillStyle='#e2b37b';ctx.font='bold 9px sans-serif';ctx.textAlign='center';
  ctx.fillText(tr('CAGE GUARD','ČUVAR'),0,-a.r-28);ctx.restore();
 }
 function runTest(){
  if(NET.role)return false;
  startGame({specialMode:'normal'});
  const c=current();if(!c)return false;
  G.debugRun=true;G.ns95TestOnly=true;
  // The test keeps existing combat and controls but deliberately disables ordinary spawns/rewards.
  G.mobs=G.mobs.filter(m=>m.ns95Guard);
  const p=G.players[0];p.x=c.x-155;p.y=c.y+35;G.camera.x=p.x;G.camera.y=p.y;
  announce(tr('TEST: FREE THE PRISONER · GUARDS HOLD THEIR POSTS','TEST: OSLOBODI ZAROBLJENIKA · ČUVARI BRANE KAVEZ'),4);
  return true;
 }
 function initTestUI(){
  if(!testMode())return;
  const home=$('home');if(!home||$('ns95TestLaunch'))return;
  const b=document.createElement('button');b.id='ns95TestLaunch';b.type='button';b.className='primary';
  b.style.cssText='width:100%;margin:8px 0;border:2px solid #b8a271;background:#304637;color:#f9e7b8;min-height:54px';
  b.textContent=tr('🧪 START CAGE TEST — no permanent rewards','🧪 TESTIRAJ KAVEZ — bez trajnih nagrada');
  b.onclick=runTest;home.insertBefore(b,home.firstChild);
  // Preserve account login and guest choice; user only needs to press this button after login.
 }
 return {reset,guardStep,guardCount,tick,beginMobTick,decoyStep,snapshot,receive,save,resume,draw,drawGuard,runTest,initTestUI};
})();
window.__NS95_CAGE=NS95_CAGE;
