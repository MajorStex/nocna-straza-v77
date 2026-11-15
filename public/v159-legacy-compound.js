/* V159 TEST AREA — exact original corner gate geometry from index.html.
 * This is NOT yet integrated into the authoritative multiplayer world.
 * All static drawings use original drawFence/drawGate/drawObelisk functions,
 * pre-rendered once per variant. Only view-visible cached sprites are drawn.
 */
(()=>{
'use strict';
if(window.NS159_LEGACY_COMPOUND)return;
const TAU=Math.PI*2,CELL=96;
let ctx=null,cache=new Map(),builds=0;
function ellipse(x,y,rx,ry,fill){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);
 ctx.fillStyle=fill;ctx.fill();
}
// BEGIN ORIGINAL fence, gate and obelisk artwork from the stable game.
function drawFence(p){const r=p.r,vertical=p.orientation==='v';ctx.save();if(vertical)ctx.rotate(Math.PI/2);ellipse(0,r*.46,r*1.08,r*.23,'#10120f55');ctx.fillStyle='#5a4332';ctx.strokeStyle='#a88a67';ctx.lineWidth=2;for(const sx of [-.75,-.25,.25,.75]){ctx.fillRect(r*sx-4,-r*.9,8,r*1.8);ctx.strokeRect(r*sx-4,-r*.9,8,r*1.8)}ctx.fillStyle='#725840';ctx.fillRect(-r*.96,-r*.27,r*1.92,7);ctx.fillRect(-r*.96,r*.13,r*1.92,7);ctx.strokeRect(-r*.96,-r*.27,r*1.92,7);ctx.strokeRect(-r*.96,r*.13,r*1.92,7);ctx.restore()}
function drawGate(p){const r=p.r,open=p.type==='gateOpen';ctx.save();if(p.orientation==='v')ctx.rotate(Math.PI/2);ellipse(0,r*.5,r*1.18,r*.26,'#11130f66');ctx.fillStyle='#4d382a';ctx.fillRect(-r*.86,-r*.96,8,r*1.9);ctx.fillRect(r*.78,-r*.96,8,r*1.9);ctx.strokeStyle='#a98c67';ctx.lineWidth=2;ctx.strokeRect(-r*.86,-r*.96,8,r*1.9);ctx.strokeRect(r*.78,-r*.96,8,r*1.9);if(!open){for(const sx of [-.48,-.16,.16,.48]){ctx.fillStyle='#6b5138';ctx.fillRect(r*sx-4,-r*.86,8,r*1.72);ctx.strokeRect(r*sx-4,-r*.86,8,r*1.72)}ctx.fillStyle='#785a41';ctx.fillRect(-r*.68,-r*.28,r*1.36,8);ctx.fillRect(-r*.68,r*.18,r*1.36,8);ctx.strokeRect(-r*.68,-r*.28,r*1.36,8);ctx.strokeRect(-r*.68,r*.18,r*1.36,8);ctx.fillStyle='#d8bc7c';ctx.fillRect(r*.38,-3,7,7);}else{ctx.save();ctx.translate(r*.96,0);ctx.rotate(.88);ctx.fillStyle='#6b5138';ctx.fillRect(-r*.56,-r*.82,12,r*1.64);ctx.fillRect(-r*.62,-r*.26,r*1.08,8);ctx.fillRect(-r*.62,r*.18,r*1.08,8);ctx.strokeStyle='#b69872';ctx.strokeRect(-r*.56,-r*.82,12,r*1.64);ctx.strokeRect(-r*.62,-r*.26,r*1.08,8);ctx.strokeRect(-r*.62,r*.18,r*1.08,8);ctx.restore();ctx.save();ctx.translate(-r*.82,0);ctx.rotate(-.12);ctx.fillStyle='#74573f';ctx.fillRect(-r*.08,-r*.84,10,r*1.68);ctx.fillRect(-r*.08,-r*.26,r*.54,8);ctx.fillRect(-r*.08,r*.18,r*.54,8);ctx.strokeStyle='#a98c67';ctx.strokeRect(-r*.08,-r*.84,10,r*1.68);ctx.strokeRect(-r*.08,-r*.26,r*.54,8);ctx.strokeRect(-r*.08,r*.18,r*.54,8);ctx.restore();ctx.shadowColor='#d8bf7e';ctx.shadowBlur=12;ctx.fillStyle='#d8bf7e';ctx.beginPath();ctx.arc(0,-r*.62,3,0,TAU);ctx.fill();ctx.shadowBlur=0;}
// Visually bridge the gateposts into both permanent fence sides, even when open.
 if(p.orientation==='h'&&p.zone==='cornerGateZone'){
  ctx.lineWidth=7;ctx.strokeStyle='#6a5038';ctx.beginPath();
  for(const side of [-1,1]){
   ctx.moveTo(side*r*.83,-r*.22);ctx.lineTo(side*(r+43),-r*.22);
   ctx.moveTo(side*r*.83,r*.20);ctx.lineTo(side*(r+43),r*.20);
  }
  ctx.stroke();ctx.lineWidth=1.3;ctx.strokeStyle='#c29a65';ctx.beginPath();
  for(const side of [-1,1]){
   ctx.moveTo(side*r*.83,-r*.26);ctx.lineTo(side*(r+43),-r*.26);
  }
  ctx.stroke();
 }
ctx.restore()}
function drawObelisk(p){const r=p.r;ctx.save();ellipse(0,r*.56,r*.95,r*.28,'#12120f66');ctx.fillStyle='#4b3b4f';ctx.beginPath();ctx.moveTo(-r*.44,r*.72);ctx.lineTo(-r*.2,-r*.7);ctx.lineTo(r*.22,-r*.88);ctx.lineTo(r*.48,r*.72);ctx.closePath();ctx.fill();ctx.strokeStyle='#bda0db';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#2b2030';ctx.fillRect(-r*.1,-r*.18,r*.2,r*.72);ctx.shadowColor='#b68cff';ctx.shadowBlur=p.used?0:16;ctx.strokeStyle=p.used?'#7c6a91':'#dbc3ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r*.58);ctx.lineTo(-r*.12,-r*.2);ctx.lineTo(0,-r*.04);ctx.lineTo(r*.14,.22);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#5e4f69';ctx.fillRect(-r*.55,r*.7,r*1.1,8);ctx.restore()}
// END ORIGINAL artwork.
const GATEX=548,GATEY=960;
function create(open=false){
 const out=[],zone='cornerGateZone',wall=960,edgePad=40,step=66;
 const place=(type,x,y,r,extra={})=>out.push({type,x,y,r,zone,seed:110,opened:false,used:false,...extra});
 for(let y=-edgePad;y<=wall+edgePad;y+=step)place('fence',wall,y,34,{orientation:'v'});
 for(let x=-edgePad;x<=wall+edgePad;x+=step){
  if(x>445&&x<655)continue;place('fence',x,wall,34,{orientation:'h'});
 }
 for(let y=26;y<=wall-92;y+=step)place('fence',wall-58,y,28,{orientation:'v'});
 for(let x=26;x<=wall-92;x+=step){
  if(x>430&&x<670)continue;place('fence',x,wall-58,28,{orientation:'h'});
 }
 // Preserve original corner posts, gate seals, obelisk, torches and details.
 place('rock',wall,wall,38);place('rock',wall,-edgePad,30);place('rock',-edgePad,wall,30);
 for(const dx of [-83,83])place('fence',GATEX+dx,wall,37,{orientation:'h',ns110GateSeal:true});
 place(open?'gateOpen':'gate',GATEX,wall,70,{orientation:'h'});
 place('obelisk',310,310,30);
 place('torch',450,850,12);place('torch',700,850,12);
 place('torch',430,905,12);place('torch',665,905,12);
 place('crate',230,540,17);place('haystack',675,330,25);
 place('bush',180,680,16);place('bush',735,470,17);
 return out;
}
function colliders(items){
 return items.filter(o=>o.type==='gate'||o.type==='fence'||
 o.type==='rock'||o.type==='obelisk'||o.type==='crate'||o.type==='haystack')
 .map(o=>{
  let w,h;
  if(o.type==='fence'){
   w=o.orientation==='v'?26:o.r*2+7;
   h=o.orientation==='v'?o.r*2+7:26;
  }else if(o.type==='gate'){w=148;h=28}
  else if(o.type==='rock'){w=h=o.r*1.35}
  else if(o.type==='obelisk'){w=36;h=42}
  else if(o.type==='crate'){w=h=28}
  else{w=47;h=28}
  return {kind:o.type,x:o.x-w/2,y:o.y-h/2,w,h};
 });
}
function cachedSprite(item){
 const key=item.type+':'+item.r+':'+(item.orientation||'h');
 if(cache.has(key))return cache.get(key);
 const size=item.type.startsWith('gate')?280:Math.ceil(item.r*4+80);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const g=canvas.getContext('2d');if(!g)return null;
 ctx=g;g.translate(size/2,size/2);
 try{
  if(item.type==='fence')drawFence(item);
  else if(item.type==='gate'||item.type==='gateOpen')drawGate(item);
  else if(item.type==='obelisk')drawObelisk(item);
  else if(item.type==='rock'){
   ellipse(0,8,item.r*1.12,item.r*.54,'#0b1713a9');
   ctx.fillStyle='#394747';ctx.beginPath();
   ctx.moveTo(-item.r,-10);ctx.lineTo(-item.r*.7,-item.r*.8);
   ctx.lineTo(item.r*.25,-item.r*.9);ctx.lineTo(item.r,-4);
   ctx.lineTo(item.r*.7,item.r*.7);ctx.lineTo(-item.r*.6,item.r*.66);
   ctx.closePath();ctx.fill();ctx.strokeStyle='#86908a';ctx.lineWidth=2;ctx.stroke();
  }
  else if(item.type==='torch'){
   ctx.fillStyle='#7f694a';ctx.fillRect(-3,-16,6,30);
   ctx.fillStyle='#e5c27d';ctx.beginPath();ctx.ellipse(0,-17,7,10,0,0,TAU);ctx.fill();
  }
  else if(item.type==='crate'){
   ctx.fillStyle='#806244';ctx.fillRect(-15,-14,30,30);
   ctx.strokeStyle='#d5b478';ctx.lineWidth=3;ctx.strokeRect(-15,-14,30,30);
  }
  else if(item.type==='haystack'){
   ctx.fillStyle='#aa925b';ctx.beginPath();ctx.ellipse(0,0,30,22,0,0,TAU);ctx.fill();
  }
  else if(item.type==='bush'){
   ctx.fillStyle='#54764c';for(const x of [-12,0,12]){
    ctx.beginPath();ctx.arc(x,0,13,0,TAU);ctx.fill();
   }
  }
 }finally{ctx=null}
 cache.set(key,canvas);builds++;
 return canvas;
}
function prewarm(items){
 for(const item of items)cachedSprite(item);
 return cache.size;
}
function prepare(items,visible){
 const rows=[];
 for(const item of items){
  if(item.x<visible.left-160||item.x>visible.right+160||
   item.y<visible.top-160||item.y>visible.bottom+160)continue;
  rows.push({item,depth:item.y+12});
 }
 return rows;
}
function drawOne(g,entry){
 const o=entry.item,s=cachedSprite(o);if(!s)return;
 g.drawImage(s,Math.round(o.x-s.width/2),Math.round(o.y-s.height/2));
}
window.NS159_LEGACY_COMPOUND=Object.freeze({create,colliders,prewarm,prepare,drawOne,
 get builds(){return builds},get variants(){return cache.size},
 get totalCachePixels(){let n=0;for(const a of cache.values())n+=a.width*a.height;return n},
 gateX:GATEX,gateY:GATEY});
})();
