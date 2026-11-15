/* Noćna Straža V162 — new-world boss art and matching spawn thumbnails.
 * Cached 8-frame tiny canvas atlas, 1 boss per instance, zero image downloads.
 * Never imports any legacy monster or animated HTML elements.
 */
(()=>{
 'use strict';
 if(window.NS162_TROLL)return;
 const FW=116,FH=136,FRAMES=8;
 let atlas=null;
 function trollSprite(g,pose=0){
  g.save();g.translate(58,111);
  const stride=Math.sin(pose/FRAMES*Math.PI*2),arm=Math.sin(pose/FRAMES*Math.PI*2+1.3);
  // Ground shadow / heavy boots.
  g.fillStyle='#14241cae';g.beginPath();g.ellipse(0,4,38,12,0,0,Math.PI*2);g.fill();
  g.strokeStyle='#344d36';g.lineWidth=12;g.lineCap='round';
  g.beginPath();g.moveTo(-18,-36);g.lineTo(-19-6*stride,-5);g.moveTo(18,-36);g.lineTo(18+6*stride,-5);g.stroke();
  g.fillStyle='#253529';g.fillRect(-31-6*stride,-10,22,10);g.fillRect(9+6*stride,-10,22,10);
  // Giant moss-green torso with armour plates.
  g.fillStyle='#345847';g.beginPath();g.moveTo(-34,-78);g.quadraticCurveTo(-49,-60,-35,-33);
  g.quadraticCurveTo(0,-18,35,-33);g.quadraticCurveTo(48,-62,33,-78);g.closePath();g.fill();
  g.fillStyle='#62866a';g.beginPath();g.ellipse(0,-65,31,25,0,0,7);g.fill();
  g.fillStyle='#3c4a35';g.fillRect(-27,-44,54,9);g.fillStyle='#c6a16b';g.fillRect(-4,-46,8,12);
  // Massive swinging arms and stone club, animated as separate limb shapes.
  g.strokeStyle='#547664';g.lineWidth=15;
  g.beginPath();g.moveTo(-32,-73);g.lineTo(-42,-42-arm*6);g.moveTo(32,-73);g.lineTo(43,-36+arm*12);g.stroke();
  g.save();g.translate(44,-37+arm*12);g.rotate(arm*.11);
  g.fillStyle='#806343';g.fillRect(-5,-22,10,34);
  g.fillStyle='#5f6254';g.beginPath();g.moveTo(-15,-39);g.lineTo(12,-43);g.lineTo(19,-20);g.lineTo(-12,-15);g.closePath();g.fill();
  g.strokeStyle='#aeb39b';g.lineWidth=2;g.beginPath();g.moveTo(-8,-35);g.lineTo(7,-38);g.stroke();g.restore();
  // Oversized head, irregular stone brow, jaw and tusks.
  g.fillStyle='#466855';g.beginPath();g.ellipse(0,-93,30,27,0,0,7);g.fill();
  g.fillStyle='#668a6b';g.beginPath();g.ellipse(0,-100,25,14,0,0,7);g.fill();
  g.fillStyle='#334d43';g.beginPath();g.moveTo(-31,-106);g.lineTo(-36,-129);g.lineTo(-14,-115);g.moveTo(31,-106);g.lineTo(37,-129);g.lineTo(14,-115);g.fill();
  g.fillStyle='#2a382f';g.fillRect(-22,-102,44,8);
  g.fillStyle='#e0bd68';g.fillRect(-17,-100,10,4);g.fillRect(7,-100,10,4);
  g.fillStyle='#2b342a';g.fillRect(-11,-80,23,8);
  g.fillStyle='#e0d6af';g.beginPath();g.moveTo(-16,-82);g.lineTo(-12,-69);g.lineTo(-8,-82);g.moveTo(16,-82);g.lineTo(12,-69);g.lineTo(8,-82);g.fill();
  g.restore();
 }
 function prewarm(){
  if(atlas||!document.createElement)return;
  const canvas=document.createElement('canvas');canvas.width=FW*FRAMES;canvas.height=FH;
  const g=canvas.getContext('2d');if(!g)return;
  for(let i=0;i<FRAMES;i++){
   g.save();g.translate(FW*i,0);trollSprite(g,i);g.restore();
  }
  atlas=canvas;
 }
 function drawOne(g,m,options={}){
  if(m.hp<=0)return;
  const {now=0,tick=0,visible}=options;
  const x=m.x,y=m.y;
  if(visible&&(x<visible.left-75||x>visible.right+75||y<visible.top-145||y>visible.bottom+35))return;
  prewarm();
  const dx=x-(m.animX??x),dy=y-(m.animY??y),distance=Math.hypot(dx,dy);
  m.animDistance=(m.animDistance||0)+Math.min(4,distance);
  m.animX=x;m.animY=y;
  const moving=distance>.20,pose=moving?Math.floor(m.animDistance/11)%FRAMES:0;
  const attacked=tick-(m.attackTick??-100);
  const attack=attacked>=0&&attacked<11;
  g.save();g.translate(Math.round(x),Math.round(y));
  if(atlas)g.drawImage(atlas,pose*FW,0,FW,FH,-FW/2,-FH+18,FW,FH);
  else{g.translate(-58,-118);trollSprite(g,pose)}
  if(attack){g.strokeStyle='#ecbe64';g.lineWidth=4;g.beginPath();g.arc(35,-56,25,-1,1.1);g.stroke()}
  const wounded=tick-(m.hitTick??-100);
  if(wounded>=0&&wounded<5){g.globalAlpha=.24;g.fillStyle='#fff6ad';g.fillRect(-32,-104,64,70)}
  const ratio=Math.max(0,Math.min(1,m.hp/(m.maxHp||900)));
  g.fillStyle='#132b22';g.fillRect(-43,-129,86,8);
  g.fillStyle='#d78b57';g.fillRect(-42,-128,84*ratio,6);
  g.strokeStyle='#f2d2a0';g.lineWidth=1;g.strokeRect(-43,-129,86,8);
  g.fillStyle='#ffe6ad';g.font='bold 10px system-ui';g.textAlign='center';
  g.fillText('BOSS TROL',0,-136);g.restore();
 }
 function drawIcon(canvas,kind){
  const ctx=canvas?.getContext?.('2d');if(!ctx)return;
  const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#142b26';ctx.fillRect(0,0,w,h);
  if(kind==='troll'){
   prewarm();
   if(atlas)ctx.drawImage(atlas,0,0,FW,FH,3,0,w-6,h-1);
   else{ctx.save();ctx.scale(w/FW,h/FH);trollSprite(ctx,0);ctx.restore()}
  }else{
   // Goblin preview echoes the existing V154 goblin's helmet, boots and eyes.
   ctx.fillStyle='#1c3427';ctx.beginPath();ctx.ellipse(w/2,h*.82,w*.32,h*.08,0,0,7);ctx.fill();
   ctx.fillStyle='#5b8c55';ctx.beginPath();ctx.moveTo(w*.3,h*.42);ctx.lineTo(w*.1,h*.24);
   ctx.lineTo(w*.24,h*.64);ctx.quadraticCurveTo(w*.5,h*.9,w*.75,h*.64);
   ctx.lineTo(w*.9,h*.24);ctx.lineTo(w*.7,h*.42);ctx.closePath();ctx.fill();
   ctx.fillStyle='#414f3d';ctx.fillRect(w*.2,h*.23,w*.6,h*.14);
   ctx.fillStyle='#e6b85d';ctx.fillRect(w*.3,h*.48,w*.12,h*.075);
   ctx.fillRect(w*.59,h*.48,w*.12,h*.075);
   ctx.fillStyle='#769465';ctx.fillRect(w*.3,h*.77,w*.12,h*.12);ctx.fillRect(w*.57,h*.77,w*.12,h*.12);
  }
 }
 window.NS162_TROLL={drawOne,drawIcon,prewarm,get ready(){return !!atlas}};
})();
