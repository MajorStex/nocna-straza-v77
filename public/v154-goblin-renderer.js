/* Noćna Straža V154 - cached walking goblin sprites. Cosmetics stay local.
   Physics, damage and movement remain authoritative on the 30Hz server. */
(()=>{
'use strict';
if(window.NS154_GOBLINS)return;
const W=48,H=56,POSES=10,TAU=Math.PI*2;
let atlas=null;
function spriteAtlas(){
 if(atlas)return atlas;
 const sheet=document.createElement('canvas');
 sheet.width=W*POSES;sheet.height=H*2;
 const ctx=sheet.getContext('2d');if(!ctx)return null;
 for(let face=0;face<2;face++)for(let pose=0;pose<POSES;pose++){
  const walk=pose<8,attack=pose===9;
  const phase=walk?Math.sin(pose*TAU/8):0;
  ctx.save();ctx.translate(pose*W+W/2,face*H+36-(walk?Math.abs(phase)*1.2:0));
  if(face)ctx.scale(-1,1);
  // Shadow, boots and individually animated legs.
  ctx.fillStyle='#192b22a8';ctx.beginPath();ctx.ellipse(0,13,17,4,0,0,TAU);ctx.fill();
  for(const side of [-1,1]){
   const step=phase*side*6;
   ctx.strokeStyle='#36512e';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();
   ctx.moveTo(side*6,0);ctx.lineTo(side*6+step,10);ctx.stroke();
   ctx.fillStyle='#283627';ctx.beginPath();ctx.ellipse(side*6+step+side,12,6,3.5,0,0,TAU);ctx.fill();
  }
  // Arms counter-swing while walking; a raised claw marks authoritative attack ticks.
  for(const side of [-1,1]){
   const elbowX=side*15-phase*side*3,elbowY=attack?-27:-4+phase*side*3;
   ctx.strokeStyle='#65834c';ctx.lineWidth=6;ctx.beginPath();
   ctx.moveTo(side*10,-14);ctx.lineTo(elbowX,elbowY);ctx.stroke();
   ctx.fillStyle='#8fac65';ctx.beginPath();ctx.arc(elbowX,elbowY,3,0,TAU);ctx.fill();
  }
  ctx.save();ctx.rotate(phase*.05);
  ctx.fillStyle='#4d6d3e';ctx.beginPath();ctx.ellipse(0,-11,12,15,0,0,TAU);ctx.fill();
  ctx.fillStyle='#769653';ctx.beginPath();ctx.ellipse(0,-21,13,11,0,0,TAU);ctx.fill();
  ctx.fillStyle='#617e43';ctx.beginPath();
  ctx.moveTo(-11,-24);ctx.lineTo(-19,-30);ctx.lineTo(-13,-17);
  ctx.moveTo(11,-24);ctx.lineTo(19,-30);ctx.lineTo(13,-17);ctx.fill();
  ctx.fillStyle=attack?'#ff674e':'#f1c269';
  ctx.fillRect(-8,-24,4,3);ctx.fillRect(5,-24,4,3);
  // Steel helmet: keep the old palette with more visible motion silhouette.
  ctx.fillStyle='#34412e';ctx.fillRect(-14,-32,28,5);
  ctx.fillStyle='#aaa67c';ctx.fillRect(-10,-34,20,4);
  ctx.fillStyle='#b9a681';ctx.fillRect(-3,-12,6,2);
  ctx.restore();ctx.restore();
 }
 atlas=sheet;return atlas;
}
function draw(g,mobs,opt){
 const sheet=spriteAtlas();
 const {solo,tick,now,lastState,alpha,visible}=opt;let count=0;
 for(const mob of mobs){
  if(mob.hp<=0)continue;
  const x=solo?(mob.prevX??mob.x)+(mob.x-(mob.prevX??mob.x))*alpha:mob.x;
  const y=solo?(mob.prevY??mob.y)+(mob.y-(mob.prevY??mob.y))*alpha:mob.y;
  // Fast viewport rejection: don't animate or draw distant goblins.
  if(x<visible.left-36||x>visible.right+36||y<visible.top-42||y>visible.bottom+35){
   mob.animX=x;mob.animY=y;continue;
  }
  count++;
  const dx=x-(mob.animX??x),dy=y-(mob.animY??y),distance=Math.hypot(dx,dy);
  if(distance>.18&&distance<35){
   mob.animDistance=(mob.animDistance||0)+Math.min(3,distance);
   mob.movingUntil=now+140;
   if(Math.abs(dx)>.15)mob.facing=dx<0?-1:1;
  }
  mob.animX=x;mob.animY=y;
  const age=(tick-mob.attackTick)+(solo?0:Math.min(2,Math.max(0,(now-lastState)/33.333)));
  const pose=age>=0&&age<8?9:now<(mob.movingUntil||0)?
   (Math.floor((mob.animDistance||0)/5+mob.id*3)%8):8;
  if(sheet)g.drawImage(sheet,pose*W,mob.facing===-1?H:0,W,H,
   Math.round(x-W/2),Math.round(y-36),W,H);
  else {g.fillStyle='#729557';g.fillRect(Math.round(x-12),Math.round(y-29),24,30)}
  if(tick-(mob.hitTick||-100)>=0&&tick-(mob.hitTick||-100)<5){
   g.fillStyle='#daefa38c';g.fillRect(Math.round(x-15),Math.round(y-32),30,3);
  }
  if(mob.hp<mob.maxHp){
   g.fillStyle='#32412d';g.fillRect(Math.round(x-15),Math.round(y-43),30,4);
   g.fillStyle='#a6d49a';g.fillRect(Math.round(x-15),Math.round(y-43),
    Math.round(30*Math.max(0,Math.min(1,mob.hp/(mob.maxHp||35)))),3);
  }
 }
 return count;
}
window.NS154_GOBLINS={draw,prewarm:spriteAtlas,get atlasReady(){return !!atlas}};
})();