/* Noćna Straža V157: deterministic, fully local world decoration.
   Only 5 small sprite canvases are painted once. No downloads, no MP packets,
   no per-frame tree geometry, no gameplay/physics desynchronization. */
(()=>{
'use strict';
if(window.NS157_SCENERY)return;
const TAU=Math.PI*2;
const sizes=[{w:94,h:124},{w:84,h:135},{w:94,h:119},{w:56,h:36},{w:48,h:34}];
let sprites=null,cached=null,cachedKey='';
function rng(initial){let seed=initial>>>0;return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)}
function oval(g,x,y,rx,ry,color){
 g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();
}
function build(){
 if(sprites)return sprites;
 sprites=sizes.map((size,type)=>{
  const canvas=document.createElement('canvas');
  canvas.width=size.w;canvas.height=size.h;
  const g=canvas.getContext('2d');if(!g)return null;
  const w=size.w,h=size.h,x=w/2,ground=h-12,random=rng(2409+type*78);
  if(type===3||type===4){
   oval(g,x+2,ground-4,w*.42,6,'#142a22a1');
   const path=new Path2D();
   path.moveTo(x-w*.42,ground-6);
   path.lineTo(x-w*.27,ground-21-(type===3?3:0));
   path.lineTo(x+w*.11,ground-30);
   path.lineTo(x+w*.42,ground-11);
   path.lineTo(x+w*.30,ground-4);
   path.closePath();
   g.fillStyle=type===3?'#647168':'#786f58';g.fill(path);
   g.fillStyle='#a2aaa0';g.beginPath();
   g.moveTo(x-w*.26,ground-20);g.lineTo(x+w*.1,ground-29);
   g.lineTo(x+w*.21,ground-15);g.lineTo(x,ground-14);g.closePath();g.fill();
   g.strokeStyle='#485850';g.lineWidth=2;g.beginPath();
   g.moveTo(x+w*.11,ground-29);g.lineTo(x+w*.03,ground-14);
   g.lineTo(x+w*.28,ground-5);g.stroke();
   if(type===3){g.fillStyle='#7c9656';oval(g,x-w*.18,ground-14,7,3,'#7c9656');}
   return canvas;
  }
  oval(g,x+2,ground-4,25,7,'#10291ea1');
  // Trunk below crown, tapered roots and visible twisted limbs.
  g.fillStyle=type===2?'#b2a88e':'#6d5036';g.beginPath();
  g.moveTo(x-8,ground);g.lineTo(x-5,ground-60);g.lineTo(x+5,ground-60);
  g.lineTo(x+7,ground);g.lineTo(x+14,ground+1);g.lineTo(x+1,ground-1);
  g.lineTo(x-14,ground+1);g.closePath();g.fill();
  g.strokeStyle=type===2?'#53483e':'#493624';g.lineWidth=3;g.lineCap='round';
  g.beginPath();g.moveTo(x,ground-58);g.lineTo(x-17,ground-82);
  g.moveTo(x+1,ground-47);g.lineTo(x+20,ground-70);g.stroke();
  if(type===1){
   // Pine: layered irregular needle boughs and narrowing visible tip.
   for(let layer=0;layer<6;layer++){
    const y=ground-28-layer*16,r=35-layer*4.1;
    g.fillStyle=layer%2?'#37584b':'#456b4c';
    g.beginPath();g.moveTo(x,y-35);g.lineTo(x-r,y+11);
    g.quadraticCurveTo(x,y+4,x+r,y+11);g.closePath();g.fill();
    g.strokeStyle='#78915f';g.lineWidth=1.5;g.beginPath();
    g.moveTo(x-8,y-2);g.lineTo(x-14,y+5);g.moveTo(x+8,y-2);g.lineTo(x+14,y+4);g.stroke();
   }
  }else{
   // Broadleaf crowns are groups of rounded canopies (never square rectangles).
   const baseY=type===2?ground-73:ground-69;
   for(let i=0;i<17;i++){
    const a=i*2.39996+type,d=Math.sqrt(i/17),xx=x+Math.cos(a)*30*d;
    const yy=baseY+Math.sin(a)*24*d;
    oval(g,xx,yy,17+random()*8,14+random()*7,
     type===2?(i%3?'#628850':'#91a665'):(i%3?'#426d4c':'#5d8754'));
   }
   for(let i=0;i<12;i++){
    const a=i*2.06,xx=x+Math.cos(a)*28*random(),yy=baseY-5+Math.sin(a)*19*random();
    oval(g,xx-2,yy-4,4+random()*3,3+random()*2,
     type===2?'#b6bf7a':'#91aa6a');
   }
  }
  // Shading and thin bark highlights.
  g.strokeStyle=type===2?'#ece2c0':'#977a50';g.lineWidth=2;
  g.beginPath();g.moveTo(x-3,ground-22);g.lineTo(x-2,ground-49);g.stroke();
  return canvas;
 });
 return sprites;
}
function generate(world){
 const key=[world?.w,world?.h,world?.decorSeed||157].join(':');
 if(cached&&cachedKey===key)return cached;
 const r=rng((world?.decorSeed||157)*7919),items=[];
 const obstacles=world?.obstacles||[],chests=[[530,465],[960,580],[1470,820]];
 const spawns=[[130,250],[190,250],[250,260],[130,310],[205,310],[275,310]];
 let tries=0;
 while(items.length<53&&tries++<900){
  const type=items.length<28?Math.floor(r()*3):3+Math.floor(r()*2);
  const x=38+r()*(world.w-76),y=55+r()*(world.h-100);
  const radius=type<3?45:23;
  const blocked=obstacles.some(o=>x>o.x-radius-7&&x<o.x+o.w+radius+7&&
    y>o.y-radius-7&&y<o.y+o.h+radius+7);
  if(blocked||spawns.some(([px,py])=>(x-px)**2+(y-py)**2<(radius+72)**2)||
    chests.some(([cx,cy])=>(x-cx)**2+(y-cy)**2<(radius+60)**2)||
    items.some(p=>(x-p.x)**2+(y-p.y)**2<(radius+(p.type<3?30:18))**2))continue;
  items.push({id:items.length,x:Math.round(x),y:Math.round(y),type,
   depth:Math.round(y)+(type<3?0:7)});
 }
 cachedKey=key;cached=items;
 return cached;
}
function drawOne(g,item){
 const source=build()[item.type];if(!source)return;
 const anchorX=Math.round(item.x-source.width/2);
 const anchorY=Math.round(item.y-source.height+12);
 g.drawImage(source,anchorX,anchorY);
}
window.NS157_SCENERY={generate,drawOne,prewarm:build,get total(){return cached?.length||0}};
})();