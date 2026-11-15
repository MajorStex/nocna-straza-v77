/* Noćna Straža v159 TEST: exact original drawTroll vector artwork
 * from public/index.html; converted into one bounded 11x2 sprite atlas.
 * VISUAL ONLY: server remains authoritative for collision, HP, and attacks.
 */
(()=>{
'use strict';
if(window.NS159_TROLL)return;
const W=120,H=140,G=100,POSES=11,TAU=Math.PI*2,MODEL={color:'#83ae91'};
let atlas=null,builds=0,ctx=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ellipse(x,y,rx,ry,fill){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);
 ctx.fillStyle=fill;ctx.fill();
}
function limbs(ax,ay,bx,by,c,w){
 ctx.lineCap='round';ctx.lineWidth=w+3;ctx.strokeStyle='#182027';
 ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
 ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();
}
// BEGIN EXACT ORIGINAL LEGACY TROLL RENDERER; no shapes or animation rewritten.
function drawTroll(e,model){
 const r=e.r||22,t=e.frame||0,life=e.dead?clamp((e.deathT||0)/.39,0,1):1;
 const step=Math.sin(t*1.25)*5.2,bob=Math.abs(Math.sin(t*1.25))*1.15;
 const attack=e.attackT||0;
 const windup=attack>.30?Math.min(1,(.82-attack)/.52):1;
 const strike=attack>0&&attack<=.32?Math.sin((.32-attack)/.32*Math.PI):0;
 const skin=e.flash>0?'#bddfd1':model.color||'#83ae91';
 ctx.save();ctx.globalAlpha*=life;ctx.translate(e.x,e.y);ctx.rotate((e.angle||0)+Math.PI/2+(e.dead?(1-life)*.7:0));
 ellipse(0,r*.77,r*1.0,r*.32,'#0b141398');
 ctx.scale(r/22,r/22);ctx.translate(0,-bob);
 for(const side of [-1,1]){
  limbs(side*8,5,side*9+step*side*.85,22+Math.abs(step)*.13,'#506a60',7.5);
  ellipse(side*9+step*side*.85,22+Math.abs(step)*.13,6.7,4.2,'#334b40');
 }
 limbs(-14,-14,-18-step*.7,8-step*.25,skin,7.5);
 ctx.fillStyle='#6a5444';ctx.beginPath();ctx.moveTo(-15,-16);ctx.lineTo(15,-16);ctx.lineTo(16,7);ctx.lineTo(0,20);ctx.lineTo(-16,7);ctx.closePath();ctx.fill();
 ellipse(0,-1,17.5,17,skin);
 ellipse(-4,-6,3.2,2.0,'#aacbbc');ellipse(9,4,2.5,2,'#639183');
 ctx.fillStyle='#745742';ctx.fillRect(-16,-13,6,21);ctx.fillRect(10,-13,6,21);
 ellipse(0,-25,12,11,skin);
 for(const side of [-1,1]){ctx.fillStyle=skin;ctx.beginPath();ctx.moveTo(side*8,-29);ctx.lineTo(side*19,-34);ctx.lineTo(side*13,-21);ctx.closePath();ctx.fill();}
 ellipse(-4,-26,2,2.4,'#263731');ellipse(4,-26,2,2.4,'#263731');
 ellipse(0,-18,5,2.5,'#405349');ctx.fillStyle='#d6d8b4';ctx.fillRect(-3,-19,2.5,3);ctx.fillRect(1,-19,2.5,3);
 const armSwing=attack>0?(attack>.30?-3-7*windup:5+18*strike):step*.55;
 limbs(14,-14,20+armSwing,-8*strike,skin,8);
 ctx.save();ctx.translate(20+armSwing,-8*strike);ctx.rotate(-.35-1.4*strike+.35*windup);
 ctx.strokeStyle='#655043';ctx.lineWidth=5.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,-34);ctx.stroke();
 ctx.fillStyle='#514d47';ctx.beginPath();ctx.moveTo(-7,-42);ctx.lineTo(7,-42);ctx.lineTo(10,-24);ctx.lineTo(-10,-24);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#867a68';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-4,-39);ctx.lineTo(2,-31);ctx.stroke();ctx.restore();
 ctx.restore();
}
// END EXACT ORIGINAL LEGACY RENDERER.
function prewarm(){
 if(atlas)return atlas;
 const sheet=document.createElement('canvas');
 sheet.width=W*POSES;sheet.height=H*2;
 const g=sheet.getContext('2d');if(!g)return null;
 ctx=g;
 try{
  for(let direction=0;direction<2;direction++)for(let pose=0;pose<POSES;pose++){
   g.save();g.translate(pose*W+W/2,direction*H+G);
   if(direction)g.scale(-1,1);
   // Legacy angles are world-facing; point the original sprite up in its own cell.
   const isWalking=pose<8;
   const e={x:0,y:0,r:22,frame:isWalking?pose*.64:0,
    angle:-Math.PI/2,dead:false,attackT:pose===9?.55:pose===10?.16:0,flash:0};
   drawTroll(e,MODEL);
   g.restore();
  }
 }finally{ctx=null}
 builds++;atlas=sheet;return sheet;
}
function prepare(mobs,{solo,alpha,visible}){
 const shown=[];
 for(const mob of mobs){
  if(mob.hp<=0||mob.type!=='troll')continue;
  const x=solo?(mob.prevX??mob.x)+(mob.x-(mob.prevX??mob.x))*alpha:mob.x;
  const y=solo?(mob.prevY??mob.y)+(mob.y-(mob.prevY??mob.y))*alpha:mob.y;
  if(x<visible.left-75||x>visible.right+75||y<visible.top-120||y>visible.bottom+45){
   mob.animX=x;mob.animY=y;continue;
  }
  shown.push({mob,x,y,depth:y+16});
 }
 return shown;
}
function drawOne(g,entry,{tick,now,lastState,solo}){
 const {mob,x,y}=entry,dx=x-(mob.animX??x),dy=y-(mob.animY??y);
 const dist=Math.hypot(dx,dy);
 if(dist>.17&&dist<36){
  mob.animDistance=(mob.animDistance||0)+Math.min(4,dist);
  mob.movingUntil=now+160;
  if(Math.abs(dx)>.2)mob.facing=dx<0?-1:1;
 }
 mob.animX=x;mob.animY=y;
 const since=tick-(mob.attackTick??-100)+(solo?0:Math.min(2,Math.max(0,(now-lastState)/33.333)));
 const pose=since>=0&&since<5?9:since>=5&&since<11?10:
  now<(mob.movingUntil||0)?Math.floor((mob.animDistance||0)/6+mob.id*3)%8:8;
 const sheet=prewarm();
 if(!sheet)return;
 g.drawImage(sheet,pose*W,mob.facing===-1?H:0,W,H,
  Math.round(x-W/2),Math.round(y-G),W,H);
 if(mob.hp<mob.maxHp){
  const a=Math.max(0,Math.min(1,mob.hp/(mob.maxHp||1)));
  g.fillStyle='#21352e';g.fillRect(Math.round(x-26),Math.round(y-65),52,6);
  g.fillStyle='#b6d593';g.fillRect(Math.round(x-25),Math.round(y-64),Math.round(50*a),4);
 }
}
window.NS159_TROLL=Object.freeze({prepare,drawOne,prewarm,
 get cached(){return !!atlas},get builds(){return builds},get atlasPixels(){return atlas?atlas.width*atlas.height:0},
 get originalRendererVersion(){return 'legacy-drawTroll-v89'}});
})();
