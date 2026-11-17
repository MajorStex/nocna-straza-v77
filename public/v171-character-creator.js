/* Noćna Straža V171 — original modular Character Creator / isolated solo test.
 * No external images, audio, network packets, framework, or modification of existing saves.
 * Art is original Canvas geometry; gait phase is driven by distance and limb length.
 */
(function(){
'use strict';
if(window.NS171_CREATOR)return;
const $=id=>document.getElementById(id),B=()=>window.__NS110_BRIDGE;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),num=(v,d,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
const forms={
 role:['hero','enemy','mini','boss'],
 race:['human','elf','dwarf','orc','undead','troll'],
 helmet:['none','hood','iron','horned','crown','skull','cap'],
 torso:['leather','cloth','chain','plate','bone','fur'],
 shoulders:['none','round','spikes','plate'],
 arms:['bare','bracers','chain','plate','bone'],
 legs:['cloth','leather','plate','bone','fur'],
 boots:['light','heavy','bare','claw'],
 weapon:['sword','axe','spear','hammer','staff','dagger','claws','bow'],
 offhand:['none','shield','torch','cape'],
 gait:['natural','heavy','agile','limp','shuffle'],
 behavior:['melee','charge','ranged','guard']
};
const labels={hero:'Heroj',enemy:'Neprijatelj',mini:'Mini-boss',boss:'Boss',human:'Čovek',elf:'Vilenjak',dwarf:'Patuljak',orc:'Ork',undead:'Nemrtvi',troll:'Trol',none:'Bez',hood:'Kapuljača',iron:'Gvozdeni šlem',horned:'Rogati šlem',crown:'Kruna',skull:'Lobanja',cap:'Kapa',leather:'Koža',cloth:'Tkanina',chain:'Pancir',plate:'Ploče',bone:'Kosti',fur:'Krzno',round:'Zaobljeni',spikes:'Bodlje',bare:'Golo',bracers:'Narukvice',light:'Lake čizme',heavy:'Teške',claw:'Kandže',sword:'Mač',axe:'Sekira',spear:'Koplje',hammer:'Čekić',staff:'Štap',dagger:'Bodež',claws:'Kandže',bow:'Luk',shield:'Štit',torch:'Baklja',cape:'Plašt',natural:'Prirodno',agile:'Okretno',limp:'Hramanje',shuffle:'Tetura',melee:'Bliska borba',charge:'Juriš',ranged:'Daljinski',guard:'Čuvar'};
const base={id:'',name:'Noćni stražar',role:'hero',race:'human',helmet:'iron',torso:'plate',shoulders:'round',arms:'bracers',legs:'leather',boots:'heavy',weapon:'sword',offhand:'shield',gait:'natural',behavior:'melee',skin:'#cfaa85',armor:'#647b77',accent:'#d5b173',size:1,leg:1,arm:1,width:1,head:1,hp:100,speed:145,damage:24,armorPoints:5,growth:7,attackRate:.85};
const colors=['skin','armor','accent'],stats={size:[.65,1.65,.05],leg:[.65,1.45,.05],arm:[.65,1.45,.05],width:[.7,1.45,.05],head:[.75,1.35,.05],hp:[40,260,5],speed:[65,220,5],damage:[8,65,1],armorPoints:[0,30,1],growth:[0,14,1],attackRate:[.45,1.6,.05]};
function clean(raw={}){
 const o={...base};o.id=String(raw.id||'').replace(/[^a-z0-9-]/gi,'').slice(0,50);o.name=String(raw.name||base.name).trim().slice(0,30)||base.name;
 for(const [k,arr] of Object.entries(forms))if(arr.includes(raw[k]))o[k]=raw[k];
 for(const k of colors)if(/^#[0-9a-f]{6}$/i.test(raw[k]||''))o[k]=raw[k];
 for(const [k,[lo,hi]] of Object.entries(stats))o[k]=num(raw[k],base[k],lo,hi);
 return o;
}
function effective(raw,level=1){
 const c=clean(raw),l=Math.round(num(level,1,1,100)),t=l-1;
 const tier=c.role==='boss'?3.6:c.role==='mini'?1.95:1;
 const growth=c.growth/100, curve=1+growth*t/(1+t/65);
 return {hp:Math.round(c.hp*tier*curve),damage:Math.round(c.damage*(c.role==='boss'?1.48:c.role==='mini'?1.2:1)*(1+growth*.58*t/(1+t/75))),speed:Math.round(clamp(c.speed*(1+.0025*t)*(c.role==='boss'?.87:1),55,260)),armor:Math.min(55,c.armorPoints+Math.floor(t*.13)),interval:c.attackRate,level:l,range:c.weapon==='bow'?205:c.weapon==='staff'?155:c.weapon==='spear'?84:65};
}
const presets={
 guardian:{...base,name:'Gvozdeni stražar'},
 scout:{...base,name:'Šumski izviđač',race:'elf',helmet:'hood',torso:'leather',shoulders:'none',arms:'bare',legs:'cloth',boots:'light',weapon:'bow',offhand:'cape',gait:'agile',armor:'#52674d',accent:'#b0c78a',width:.83,leg:1.16,speed:175,hp:80,damage:21},
 dwarf:{...base,name:'Patuljasti kovač',race:'dwarf',helmet:'horned',torso:'chain',shoulders:'plate',weapon:'hammer',offhand:'none',width:1.35,leg:.73,arm:1.12,size:.9,gait:'heavy',hp:150,speed:105},
 orc:{...base,name:'Orkovski pljačkaš',role:'enemy',race:'orc',helmet:'horned',torso:'fur',shoulders:'spikes',arms:'bare',legs:'leather',boots:'claw',weapon:'axe',offhand:'none',skin:'#82915b',armor:'#615a43',accent:'#b68e59',hp:75,damage:13,speed:126,gait:'heavy'},
 skeleton:{...base,name:'Kostur čuvar',role:'enemy',race:'undead',helmet:'skull',torso:'bone',arms:'bone',legs:'bone',boots:'bare',weapon:'spear',offhand:'none',skin:'#d8d0b5',armor:'#69675d',accent:'#a8c4a9',hp:65,damage:10,speed:105,width:.8,gait:'shuffle'},
 troll:{...base,name:'Gorski razarač',role:'boss',race:'troll',helmet:'none',torso:'fur',shoulders:'spikes',arms:'bare',legs:'fur',boots:'claw',weapon:'hammer',offhand:'none',skin:'#76865b',armor:'#665b43',accent:'#bb8b58',size:1.45,arm:1.35,width:1.4,leg:.9,hp:185,damage:25,speed:93,gait:'heavy',behavior:'charge'}
};
const key=()=>{const a=B()?.getActiveAccount?.();return 'ns171_creator_v1_'+String(a?.id||'offline').replace(/[^a-z0-9_-]/gi,'').slice(0,64)};
function load(){try{const a=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(a)?a.slice(0,30).map(clean).filter(x=>x.id):[]}catch{return []}}
function persist(all){try{localStorage.setItem(key(),JSON.stringify(all.slice(0,30)));return true}catch{return false}}
const mix=(hex,t)=>{const n=parseInt(hex.slice(1),16);const k=v=>Math.round(clamp(v+t,0,255));return 'rgb('+k(n>>16)+','+k(n>>8&255)+','+k(n&255)+')'};
function el(g,x,y,rx,ry,fill){g.fillStyle=fill;g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);g.fill()}
function poly(g,pts,fill,stroke='#20302e',w=1.15){g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke()}}
function line(g,x,y,x2,y2,w,c){g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke()}
function gaitStep(c,distance=0){return distance/Math.max(16,37*c.leg*c.size)*(Math.PI*2)}
// Same ground-anchored skeletal rig for every character. No image generation in a frame.
function draw(g,c,x,y,op={}){
 const phase=op.phase||0,moving=!!op.moving,attack=clamp(op.attack||0,0,1),side=op.side===-1?-1:1;
 const k=(op.scale||1)*c.size,leg=22*c.leg,arm=18*c.arm,bw=12*c.width,hh=10*c.head;
 const heavy=c.gait==='heavy'?1.25:c.gait==='agile'?.8:1,amp=(c.gait==='shuffle'?.45:c.gait==='limp'?.75:1)*4.6;
 const sway=moving?Math.sin(phase)*amp:0,bob=moving?Math.abs(Math.sin(phase))*1.4*heavy:Math.sin((op.now||0)*.002)*.55;
 const hip=-leg-5-bob,shoulder=hip-23,head=shoulder-hh-6,shade=mix(c.armor,-28),trim=mix(c.accent,15),skin=c.skin;
 g.save();g.translate(x,y);g.scale(k*side,k);
 el(g,0,2,18*c.width,5,'#07120f88');
 if(op.dead)g.globalAlpha*=.4;
 if(c.offhand==='cape')poly(g,[[-bw,shoulder],[-bw-6,hip+11+sway],[bw+6,hip+9-sway],[bw,shoulder]],shade,'#28392f');
 for(const s of [-1,1]){
  const p=phase+(s===1?Math.PI:0),stride=moving?Math.sin(p)*amp*c.leg:0,lift=moving?Math.max(0,Math.cos(p))*3.9*c.leg*(c.gait==='limp'&&s===1?.35:1):0;
  const hx=s*bw*.43,kx=hx+stride*.5,ky=hip+leg*.50,fx=hx+stride,fy=-5-lift;
  const lc=c.legs==='bone'?'#beb9a5':c.legs==='fur'?mix(skin,-27):shade;
  const lw=c.legs==='bone'?3.4:c.legs==='plate'?8:6;
  line(g,hx,hip,kx,ky,lw+2,'#24312d');line(g,hx,hip,kx,ky,lw,lc);line(g,kx,ky,fx,fy,lw,lc);
  if(c.legs==='plate')el(g,kx,ky,4,4,trim);
  el(g,fx+1,fy+2,c.boots==='heavy'?6:4.8,c.boots==='bare'?2.6:3.5,c.boots==='bare'||c.boots==='claw'?skin:'#343f3c');
  if(c.boots==='claw')for(let i=-1;i<=1;i++)line(g,fx+i*2,fy+3,fx+i*2+1,fy+5,1,'#ded3b0');
 }
 const cloth=c.torso==='bone'?'#9c9e87':c.torso==='fur'?mix(skin,-18):c.armor;
 poly(g,[[-bw,shoulder],[bw,shoulder],[bw*.74,hip],[-bw*.74,hip]],cloth);
 if(c.torso==='plate'||c.torso==='chain'){
  poly(g,[[-bw*.84,shoulder+3],[bw*.84,shoulder+3],[bw*.58,hip-4],[0,hip-1],[-bw*.58,hip-4]],mix(c.armor,18));
  if(c.torso==='chain')for(let iy=0;iy<3;iy++)for(let ix=-1;ix<=1;ix++)el(g,ix*bw*.45,shoulder+7+iy*5,1.3,1.3,'#b7c1b3');
  else line(g,-bw*.73,shoulder+8,bw*.73,shoulder+8,1.6,c.accent);
 }else if(c.torso==='bone'){for(let j=0;j<3;j++)line(g,-bw*.7,shoulder+5+j*5,bw*.7,shoulder+5+j*5,2,'#d3cbb6')}
 else if(c.torso==='fur'){for(let j=-1;j<=1;j++)poly(g,[[j*bw*.57-3,hip-6],[j*bw*.57+3,hip-6],[j*bw*.57,hip+3]],shade,null)}
 line(g,-bw*.77,hip-3,bw*.77,hip-3,4,'#313933');el(g,0,hip-3,3,2.7,c.accent);
 let handX=0,handY=0;
 for(const s of [-1,1]){
  const swing=-s*sway*.63+(s===1?attack*13:0),sx=s*(bw+1),sy=shoulder+3;
  const ex=sx+s*3+swing*.5,ey=sy+arm*.48,hx=ex+swing*.65,hy=sy+arm-(s===1?attack*10:0);
  const ac=c.arms==='bare'?skin:c.arms==='bone'?'#d2cbb4':c.armor,aw=c.arms==='bone'?3.4:c.arms==='plate'?7.6:5.7;
  line(g,sx,sy,ex,ey,aw+2,'#26322c');line(g,sx,sy,ex,ey,aw,ac);line(g,ex,ey,hx,hy,aw,ac);
  if(c.arms==='bracers'||c.arms==='plate')line(g,ex,ey,hx,hy,aw*.8,c.accent);
  el(g,hx,hy,3.5,3.8,skin);
  if(c.shoulders!=='none'){el(g,sx,sy,5.5,4.5,c.armor);line(g,sx-4,sy,sx+4,sy,1.4,c.accent);if(c.shoulders==='spikes')poly(g,[[sx-3,sy-2],[sx+s*3,sy-11],[sx+4,sy-2]],trim)}
  if(s===1){handX=hx;handY=hy}else if(c.offhand==='shield'){poly(g,[[hx-8,hy-13],[hx+7,hy-12],[hx+6,hy+4],[hx,hy+10],[hx-7,hy+3]],shade,trim,2);el(g,hx,hy-3,3,3,c.accent)}
  else if(c.offhand==='torch'){line(g,hx,hy+5,hx,hy-14,4,'#67462e');el(g,hx,hy-18,4,7,'#c77d3b');el(g,hx,hy-18,2,4,'#ffe4a0')}
 }
 line(g,0,shoulder-2,0,head+hh*.55,6,skin);
 el(g,0,head,hh*.85,hh,skin);
 if(c.race==='elf'||c.race==='orc'){for(const s of [-1,1])poly(g,[[s*hh*.65,head-2],[s*hh*1.32,head-6],[s*hh*.71,head+5]],skin)}
 if(c.race==='troll'){el(g,0,head+hh*.16,hh*.92,hh*.65,skin);el(g,0,head+3,3.6,3,mix(skin,-20))}
 const eye=c.race==='undead'?'#71efd2':c.race==='orc'||c.race==='troll'?'#e8c46c':'#21312d';
 for(const s of [-1,1])el(g,s*hh*.37,head-1,1.5,1.8,eye);
 line(g,-hh*.26,head+hh*.38,hh*.26,head+hh*.38,1.3,mix(skin,-56));
 if(c.race==='dwarf')poly(g,[[-hh*.65,head+2],[hh*.65,head+2],[hh*.48,head+hh*1.25],[0,head+hh*1.55],[-hh*.48,head+hh*1.25]],'#695144');
 if(c.helmet==='hood'){poly(g,[[-hh,head+3],[-hh,head-5],[0,head-hh*1.38],[hh,head-5],[hh,head+3],[hh*.62,head-hh*.45],[-hh*.62,head-hh*.45]],shade)}
 else if(c.helmet==='iron'||c.helmet==='horned'||c.helmet==='skull'){poly(g,[[-hh*.95,head+2],[-hh*.95,head-6],[-hh*.54,head-hh*1.12],[hh*.54,head-hh*1.12],[hh*.95,head-6],[hh*.95,head+2],[hh*.52,head-3],[-hh*.52,head-3]],c.helmet==='skull'?'#d8d1ba':c.armor,trim,1.4);if(c.helmet==='horned')for(const s of [-1,1])poly(g,[[s*hh*.69,head-6],[s*hh*1.5,head-hh*1.28],[s*hh,head-hh*1.28]],'#d9c29d')}
 else if(c.helmet==='crown'){poly(g,[[-hh,head-5],[-hh,head-hh*1.4],[-hh*.42,head-hh*.95],[0,head-hh*1.65],[hh*.42,head-hh*.95],[hh,head-hh*1.4],[hh,head-5]],c.accent)}
 else if(c.helmet==='cap'){el(g,0,head-hh*.65,hh,hh*.5,c.armor);line(g,0,head-hh*.35,hh*1.15,head-hh*.35,2.5,c.accent)}
 else if(c.race!=='undead')el(g,0,head-hh*.72,hh*.72,hh*.36,mix(skin,-62));
 g.save();g.translate(handX,handY);g.rotate(-.15-attack*1.15);
 if(c.weapon==='claws'){for(let i=0;i<3;i++)line(g,i*2-2,0,i*2+2,-9,1.8,'#ddd4b7')}
 else if(c.weapon==='bow'){g.strokeStyle='#b98950';g.lineWidth=3;g.beginPath();g.arc(-4,0,17,-1.08,1.08);g.stroke();line(g,4,-15,4,15,1,'#e5d9bd')}
 else{
  const long=c.weapon==='spear'||c.weapon==='staff'?35:c.weapon==='dagger'?13:25;
  line(g,0,7,0,-long,3,'#71553b');
  if(c.weapon==='axe'){poly(g,[[0,-22],[11,-25],[14,-19],[9,-10],[0,-14]],'#a8b6ae')}
  else if(c.weapon==='hammer'){poly(g,[[-9,-29],[9,-29],[9,-18],[-9,-18]],'#82938e',trim)}
  else if(c.weapon==='staff'){el(g,0,-33,5,5,c.accent);el(g,0,-33,2,2,'#f6e4a9')}
  else {poly(g,[[-3,-6],[-2,-long],[0,-long-5],[2,-long],[3,-6]],'#becdc7');line(g,-5,-5,5,-5,2.8,c.accent)}
 }
 g.restore();if(attack>.1){g.globalAlpha*=attack*.5;g.strokeStyle='#ebdcaf';g.lineWidth=2.4;g.beginPath();g.arc(bw+3,shoulder+8,24,-1.1,.5);g.stroke()}
 g.restore();
}
let root=null,canvas=null,g=null,open=false,raf=0,last=0,lastDraw=0,all=[],draft=clean(base),tab='look',preview='idle',level=1,sim=null,notice='',selectedEnemy='',hidHome=false;
let stick={id:null,x:0,y:0,vx:0,vy:0},keys=new Set(),grid=null,selectedHero='';
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const option=(v,label,on=false)=>'<option value="'+esc(v)+'"'+(on?' selected':'')+'>'+esc(label)+'</option>';
const select=(k,title)=>'<label>'+title+'<select data-field="'+k+'">'+forms[k].map(v=>option(v,labels[v]||v,draft[k]===v)).join('')+'</select></label>';
const range=(k,title)=>{const [min,max,step]=stats[k];return '<label>'+title+' <output data-out="'+k+'">'+draft[k]+'</output><input type="range" data-field="'+k+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+draft[k]+'"></label>'};
function make(){
 if(root)return;
 root=document.createElement('section');root.id='ns171Creator';root.hidden=true;root.setAttribute('aria-label','Character Creator');
 root.innerHTML='<header><div><div class="ccKicker">NOĆNA STRAŽA · V171</div><strong>CREATE A CHARACTER</strong></div><button data-action="close" aria-label="Zatvori editor">✕</button></header><div class="ccView"><canvas id="ns171Canvas" aria-label="Pregled i solo poligon"></canvas><div class="ccStatus" id="ns171Status" aria-live="polite"></div><div class="ccStick" hidden><i></i></div></div><div class="ccTabs" role="tablist"><button data-tab="look">Izgled</button><button data-tab="stats">Statistike</button><button data-tab="motion">Animacije</button><button data-tab="test">Solo test</button></div><main id="ns171Fields"></main><footer><button data-action="new">＋ Novi</button><button data-action="save" class="ccGold">Sačuvaj</button><button data-action="test">▶ Testiraj</button></footer>';
 const style=document.createElement('style');style.textContent=
 '#ns171Creator[hidden]{display:none!important}#ns171Creator{position:fixed;inset:0;z-index:3000;background:#111f23;color:#eadbc0;display:flex;flex-direction:column;overflow:hidden;font:14px system-ui;--edge:#5b7268}'+
 '#ns171Creator *{box-sizing:border-box}#ns171Creator header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(9px + env(safe-area-inset-top)) 12px 9px;background:#192e2e;border-bottom:1px solid #536c5f}#ns171Creator header strong{font-size:17px;letter-spacing:.08em;color:#e2c591}.ccKicker{font-size:9px;letter-spacing:.13em;color:#9eb6a9}'+
 '#ns171Creator button,#ns171Creator select,#ns171Creator input:not([type=range]){background:#243a38;border:1px solid #60766b;color:#f5e7cc;border-radius:9px;min-height:39px;font:600 12px system-ui;padding:7px 9px;min-width:0}#ns171Creator button[aria-selected=true],#ns171Creator .ccGold{border-color:#e0bc79;background:#53472f;color:#fff1cf}'+
 '#ns171Creator .ccView{position:relative;flex:0 0 clamp(170px,33dvh,340px);overflow:hidden;background:#152b29}#ns171Canvas{width:100%;height:100%;display:block;touch-action:none}#ns171Creator .ccStatus{position:absolute;top:7px;left:9px;right:9px;font:700 10px system-ui;color:#e8d8b7;pointer-events:none;text-shadow:0 1px 3px #000;white-space:pre-wrap}'+
 '#ns171Creator .ccTabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:7px 9px;background:#122326}#ns171Fields{min-height:0;flex:1;overflow:auto;overscroll-behavior:contain;padding:9px 12px 14px}#ns171Fields .ccGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 10px}#ns171Fields label{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;color:#c3d3c3;min-width:0}#ns171Fields label output{color:#eccd8c}#ns171Fields input[type=range]{width:100%;accent-color:#d1b574;margin:6px 0}#ns171Fields input[type=color]{width:100%;padding:3px;height:40px}#ns171Fields .ccFull{grid-column:1/-1}#ns171Fields p{line-height:1.45;margin:8px 0;color:#b7c8b9;font-size:12px}#ns171Fields h3{font:800 12px system-ui;color:#eccb91;letter-spacing:.06em;margin:8px 0}#ns171Fields .ccRow{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}#ns171Fields .ccRow>*{flex:1 1 100px}#ns171Fields .ccNumbers{padding:9px;border:1px solid #596f64;border-radius:10px;color:#ebd6a3;background:#182d2c;font-size:12px;line-height:1.6}'+
 '#ns171Creator footer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;background:#192e2e;padding:8px 10px calc(8px + env(safe-area-inset-bottom))}#ns171Creator.ccTesting .ccView{flex:1;min-height:190px}#ns171Creator.ccTesting #ns171Fields{flex:0 0 auto;max-height:29dvh}#ns171Creator .ccStick{position:absolute;pointer-events:none;width:90px;height:90px;transform:translate(-50%,-50%);border:2px solid #e2daa488;background:#284b4077;border-radius:50%}#ns171Creator .ccStick i{position:absolute;width:36px;height:36px;left:25px;top:25px;border:1px solid #c9e1b7;background:#7ca694aa;border-radius:50%}'+
 '@media(min-width:780px) and (min-height:520px){#ns171Creator{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);grid-template-rows:auto auto minmax(0,1fr) auto}#ns171Creator header,#ns171Creator footer{grid-column:1/-1}#ns171Creator .ccView{grid-column:1;grid-row:2/4;height:100%}#ns171Creator .ccTabs{grid-column:2;grid-row:2}#ns171Fields{grid-column:2;grid-row:3}#ns171Creator.ccTesting #ns171Fields{max-height:none}}';
 document.head.append(style);document.body.append(root);canvas=$('ns171Canvas');g=canvas.getContext('2d',{alpha:false});
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.tab,a=b.dataset.action;if(t){if(t!=='test')stopTest();tab=t;render();return}
  if(a==='close')close();if(a==='new'){stopTest();draft=clean({...base,role:draft.role,name:draft.role==='hero'?'Novi heroj':'Novo stvorenje'});tab='look';render()}
  if(a==='save')save();if(a==='test'){tab='test';startTest();render()}
  if(a==='delete'){if(!draft.id)return;const next=all.filter(x=>x.id!==draft.id);if(persist(next)){all=next;draft=clean(base);stopTest();tab='look';notice='Lik obrisan.';render()}else notice='Čuvanje nije uspelo.'}
  if(a==='random'){for(const k of Object.keys(forms)){if(['role','race','behavior','gait'].includes(k))continue;const ar=forms[k];draft[k]=ar[Math.floor(Math.random()*ar.length)]}render()}
  if(a==='restart'){startTest();render()}if(a==='next'){if(sim){sim.wave++;resetWave()}}if(a==='pause'&&sim){sim.paused=!sim.paused;b.textContent=sim.paused?'Nastavi':'Pauza'}if(a==='spawn'&&sim)spawnEnemy(1);
  if(b.dataset.pose){preview=b.dataset.pose;render()}
 });
 root.addEventListener('input',e=>{const n=e.target,k=n.dataset.field;if(k&&k in base){draft=clean({...draft,[k]:n.type==='range'?Number(n.value):n.value});const out=root.querySelector('[data-out="'+k+'"]');if(out)out.textContent=draft[k];updateStats()}if(n.id==='ns171Level'){level=Number(n.value);updateStats()}});
 root.addEventListener('change',e=>{const n=e.target;if(n.id==='ns171Saved'){const old=all.find(x=>x.id===n.value);if(old){stopTest();draft=clean(old);render()}}if(n.id==='ns171Preset'&&presets[n.value]){const role=draft.role;draft=clean({...presets[n.value],id:'',role:role==='hero'?'hero':presets[n.value].role==='hero'?role:presets[n.value].role});render()}if(n.id==='ns171Enemy')selectedEnemy=n.value;if(n.id==='ns171TestHero')selectedHero=n.value;if(n.dataset.field==='role'){stopTest();render()}});
 const move=e=>{if(e.pointerId!==stick.id)return;const dx=e.clientX-stick.x,dy=e.clientY-stick.y,d=Math.hypot(dx,dy);stick.vx=d>5?dx/Math.max(40,d):0;stick.vy=d>5?dy/Math.max(40,d):0;root.querySelector('.ccStick i').style.transform='translate('+clamp(dx,-25,25)+'px,'+clamp(dy,-25,25)+'px)'};
 canvas.addEventListener('pointerdown',e=>{if(!sim||stick.id!==null)return;e.preventDefault();stick={id:e.pointerId,x:e.clientX,y:e.clientY,vx:0,vy:0};const r=canvas.getBoundingClientRect(),s=root.querySelector('.ccStick');s.hidden=false;s.style.left=e.clientX-r.left+'px';s.style.top=e.clientY-r.top+'px';try{canvas.setPointerCapture(e.pointerId)}catch{}});
 canvas.addEventListener('pointermove',move);for(const k of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(k,e=>{if(e.pointerId===stick.id)resetStick()});
 document.addEventListener('keydown',e=>{if(!open)return;if(e.key==='Escape'){e.stopImmediatePropagation();close();return}if(!sim||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();e.stopImmediatePropagation();keys.add(k)}},true);
 document.addEventListener('keyup',e=>{if(open)keys.delete(e.key.toLowerCase())},true);window.addEventListener('blur',()=>{keys.clear();if(root)resetStick()});
}
function resetStick(){stick={id:null,x:0,y:0,vx:0,vy:0};root.querySelector('.ccStick').hidden=true;root.querySelector('.ccStick i').style.transform=''}
function updateStats(){const show=$('ns171TestLevel');if(show)show.textContent=level;const o=$('ns171Computed');if(o){const s=effective(draft,level);o.textContent='Nivo '+s.level+' · HP '+s.hp+' · šteta '+s.damage+' · brzina '+s.speed+' · oklop '+s.armor+'% · napad '+s.interval.toFixed(2)+' s'}}
function render(){
 root.classList.toggle('ccTesting',!!sim);for(const b of root.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));
 let html='';
 if(tab==='look'){
 html='<div class="ccGrid"><label class="ccFull">Moji likovi<select id="ns171Saved">'+option('','Izaberi sačuvanog lika',!draft.id)+all.map(x=>option(x.id,labels[x.role]+' · '+x.name,x.id===draft.id)).join('')+'</select></label><label>Ime<input data-field="name" maxlength="30" value="'+esc(draft.name)+'"></label>'+select('role','Uloga')+select('race','Rasa')+'<label>Gotovi uzori<select id="ns171Preset">'+option('','Izaberi uzor')+Object.entries(presets).map(([k,c])=>option(k,c.name)).join('')+'</select></label>'+select('helmet','Glava / šlem')+select('torso','Telo / oklop')+select('shoulders','Ramena')+select('arms','Ruke')+select('legs','Noge')+select('boots','Obuća')+select('weapon','Oružje')+select('offhand','Dodatak')+colors.map((k,i)=>'<label>'+['Koža','Oklop','Detalji'][i]+'<input type="color" data-field="'+k+'" value="'+draft[k]+'"></label>').join('')+'</div><div class="ccRow"><button data-action="random">Nasumični delovi</button><button data-action="delete">Obriši sačuvani lik</button></div>';
 }else if(tab==='stats'){
 html='<h3>TELO I PROPORCIJE</h3><div class="ccGrid">'+range('size','Veličina')+range('width','Širina tela')+range('leg','Dužina nogu')+range('arm','Dužina ruku')+range('head','Veličina glave')+'</div><h3>BORBA I RAST</h3><div class="ccGrid">'+select('role','Uloga')+range('hp','Osnovni HP')+range('damage','Šteta')+range('speed','Brzina')+range('armorPoints','Oklop %')+range('attackRate','Razmak napada (s)')+range('growth','Rast po nivou %')+'</div><label>Pregled nivoa 1–100<input id="ns171Level" type="range" min="1" max="100" value="'+level+'"></label><div class="ccNumbers" id="ns171Computed"></div><p>Statistike su namenjene privatnom solo poligonu. Mini-boss i boss dobijaju dodatni HP i štetu; rast je ograničen krivom da se ne otme kontroli.</p>';
 }else if(tab==='motion'){
 html='<div class="ccGrid">'+select('gait','Stil hodanja')+select('behavior','Ponašanje neprijatelja')+'</div><div class="ccRow">'+[['idle','Miruje'],['walk','Hoda'],['run','Trči'],['attack','Napada']].map(([k,v])=>'<button data-pose="'+k+'" aria-pressed="'+(preview===k)+'">'+v+'</button>').join('')+'</div><p>Animacija koristi dužinu nogu, veličinu, brzinu i pređenu udaljenost. Ruke se kreću nasuprot nogama, a stopala ostaju pri tlu.</p>';
 }else{
 html='<div class="ccGrid"><label>Heroj<select id="ns171TestHero">'+option('','Fabrički / trenutni')+all.filter(x=>x.role==='hero').map(x=>option(x.id,x.name,selectedHero===x.id)).join('')+'</select></label><label>Protivnik<select id="ns171Enemy">'+option('','Automatski izbor')+all.filter(x=>x.role!=='hero').map(x=>option(x.id,x.name,selectedEnemy===x.id)).join('')+'</select></label><label class="ccFull">Početni nivo <output id="ns171TestLevel">'+level+'</output><input id="ns171Level" type="range" min="1" max="100" value="'+level+'"></label></div><div class="ccRow"><button data-action="restart">Start / reset</button><button data-action="next" '+(!sim?'disabled':'')+'>Sledeći talas</button><button data-action="spawn" '+(!sim?'disabled':'')+'>＋ Protivnik</button><button data-action="pause" '+(!sim?'disabled':'')+'>'+(sim?.paused?'Nastavi':'Pauza')+'</button></div><p>Joystick ili WASD / strelice. Automatski napad, XP kristali i rast nivoa. Samo test: bez pravih nagrada i multiplayera.</p>';
 }
 $('ns171Fields').innerHTML=html;updateStats();grid=null;
}
function save(){
 const c=clean(draft),old=all.findIndex(x=>x.id===c.id);
 if(old<0&&all.length>=30){notice='Najviše 30 likova.';return false}
 if(!c.id)c.id='cc-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e6).toString(36);
 const next=all.slice();if(old>=0)next[old]=c;else next.push(c);
 if(!persist(next)){notice='Nije moguće sačuvati u ovom pregledaču.';return false}all=next;draft=clean(c);notice='Sačuvan: '+c.name;render();return true;
}
function openEditor(role='hero'){
 if(B()?.G?.mode!=='menu'||B()?.NET?.role)return false;
 make();if(open){draft=clean({...base,role:forms.role.includes(role)?role:'hero'});tab='look';stopTest();render();return true}
 all=load();draft=clean({...base,role:forms.role.includes(role)?role:'hero',name:role==='hero'?'Noćni stražar':'Novo stvorenje'});tab='look';notice='';preview='idle';level=1;sim=null;open=true;
 const home=$('home');hidHome=!!home&&!home.classList.contains('hidden');if(hidHome)home.classList.add('hidden');root.hidden=false;render();last=0;lastDraw=0;raf=requestAnimationFrame(frame);return true;
}
function close(){if(!open)return;open=false;cancelAnimationFrame(raf);raf=0;stopTest();root.hidden=true;if(hidHome&&B()?.G?.mode==='menu')$('home')?.classList.remove('hidden');hidHome=false}
function stopTest(){sim=null;keys.clear();if(root)resetStick()}
const W=780,H=500,MAX_MOBS=12;
function entity(spec,l,x,y){const c=clean(spec),s=effective(c,l);return {c,s,x,y,hp:s.hp,phase:0,side:1,moving:false,cd:0,swing:0}}
function startTest(){
 const c=clean(draft),hero=c.role==='hero'?c:clean(all.find(x=>x.id===selectedHero&&x.role==='hero')||presets.guardian);sim={p:entity(hero,level,W/2,H/2),enemy:c.role!=='hero'?c:clean(all.find(x=>x.id===selectedEnemy&&x.role!=='hero')||presets.orc),mobs:[],drops:[],wave:level,xp:0,kills:0,time:0,paused:false,cleared:0};
 resetWave();keys.clear();resetStick();notice='';
}
function resetWave(){if(!sim)return;sim.mobs=[];sim.drops=[];sim.cleared=0;sim.p.hp=sim.p.s.hp;sim.p.x=W/2;sim.p.y=H/2;spawnEnemy(Math.min(7,sim.enemy.role==='boss'?1:sim.enemy.role==='mini'?2:3+Math.floor(sim.wave/5)))}
function spawnEnemy(count){if(!sim)return;for(let i=0;i<count&&sim.mobs.length<MAX_MOBS;i++){const a=sim.mobs.length*2.399+sim.wave*.71+sim.time*.15,x=clamp(sim.p.x+Math.cos(a)*230,35,W-35),y=clamp(sim.p.y+Math.sin(a)*210,45,H-26);sim.mobs.push(entity(sim.enemy,sim.wave,x,y))}}
function moveEnt(p,vx,vy,dt){const oldX=p.x,oldY=p.y;p.x=clamp(p.x+vx*dt,22,W-22);p.y=clamp(p.y+vy*dt,60,H-22);const d=Math.hypot(p.x-oldX,p.y-oldY);p.moving=d>.05;if(p.moving){p.phase+=gaitStep(p.c,d);if(Math.abs(vx)>.1)p.side=vx<0?-1:1}}
function strike(a,b){if(a.cd>0||b.hp<=0)return false;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d>a.s.range)return false;a.cd=a.s.interval;a.swing=.26;a.side=b.x<a.x?-1:1;b.hp=Math.max(0,b.hp-Math.max(1,Math.round(a.s.damage*(1-b.s.armor/100))));return true}
function step(dt){if(!sim||sim.paused||sim.p.hp<=0)return;const p=sim.p;sim.time+=dt;p.cd=Math.max(0,p.cd-dt);p.swing=Math.max(0,p.swing-dt);
 let vx=stick.vx+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),vy=stick.vy+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),n=Math.max(1,Math.hypot(vx,vy));moveEnt(p,p.s.speed*vx/n,p.s.speed*vy/n,dt);
 let target=null,dist=Infinity;for(const m of sim.mobs){if(m.hp<=0)continue;const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<dist){dist=d;target=m}}
 if(target&&strike(p,target)&&target.hp<=0){sim.kills++;sim.drops.push({x:target.x,y:target.y,value:target.c.role==='boss'?45:target.c.role==='mini'?25:12})}
 for(const m of sim.mobs){if(m.hp<=0)continue;m.cd=Math.max(0,m.cd-dt);m.swing=Math.max(0,m.swing-dt);const dx=p.x-m.x,dy=p.y-m.y,d=Math.hypot(dx,dy),range=m.c.behavior==='ranged'?140:m.c.behavior==='guard'?62:Math.min(63,m.s.range);
 const mult=m.c.behavior==='charge'&&d>100?1.4:1;if(d>range&&d>0)moveEnt(m,dx/d*m.s.speed*.72*mult,dy/d*m.s.speed*.72*mult,dt);else{m.moving=false;if(m.c.behavior==='ranged'&&m.s.range<140)m.s.range=140;strike(m,p)}}
 sim.mobs=sim.mobs.filter(m=>m.hp>0);
 for(let i=sim.drops.length-1;i>=0;i--){const q=sim.drops[i];if(Math.hypot(p.x-q.x,p.y-q.y)<35){sim.xp+=q.value;sim.drops.splice(i,1);const need=30+p.s.level*10;if(sim.xp>=need&&p.s.level<100){sim.xp-=need;const old=p.s.hp;p.s=effective(p.c,p.s.level+1);p.hp=Math.min(p.s.hp,p.hp+p.s.hp-old+12)}}}
 if(!sim.mobs.length){sim.cleared+=dt;if(sim.cleared>7){sim.wave++;resetWave()}}
}
function dimensions(){const r=canvas.getBoundingClientRect(),d=Math.min(1.5,devicePixelRatio||1),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;grid=null}return[w,h]}
function background(w,h,arena){if(!grid){grid=document.createElement('canvas');grid.width=w;grid.height=h;const c=grid.getContext('2d',{alpha:false});c.fillStyle='#1b3631';c.fillRect(0,0,w,h);const grad=c.createRadialGradient(w*.5,h*.5,8,w*.5,h*.5,Math.max(w,h)*.7);grad.addColorStop(0,'#36574b');grad.addColorStop(1,'#132725');c.fillStyle=grad;c.fillRect(0,0,w,h);c.strokeStyle='#b8cba013';c.lineWidth=1;for(let i=0;i<w;i+=36){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke()}for(let i=0;i<h;i+=36){c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke()}if(!arena){c.strokeStyle='#ae9b6644';c.beginPath();c.ellipse(w/2,h*.81,w*.28,h*.10,0,0,Math.PI*2);c.stroke()}}g.drawImage(grid,0,0)}
function drawTest(w,h,now){
 const scale=Math.min(w/W,h/H),ox=(w-W*scale)/2,oy=(h-H*scale)/2;g.save();g.translate(ox,oy);g.scale(scale,scale);
 g.strokeStyle='#91b59977';g.lineWidth=2;g.strokeRect(4,4,W-8,H-8);
 for(const q of sim.drops){poly(g,[[q.x,q.y-7],[q.x+5,q.y],[q.x,q.y+8],[q.x-5,q.y]],'#71d6ff','#b7e8ff',1)}
 const list=[sim.p,...sim.mobs].sort((a,b)=>a.y-b.y);
 for(const p of list){draw(g,p.c,p.x,p.y,{phase:p.phase,moving:p.moving,attack:p.swing/.26,side:p.side,scale:1,now,dead:p.hp<=0});const y=p.y-(22*p.c.leg+23+20*p.c.head+16)*p.c.size;g.fillStyle='#17221f';g.fillRect(p.x-19,y,38,4);g.fillStyle=p===sim.p?'#acd58b':'#d88872';g.fillRect(p.x-19,y,38*clamp(p.hp/p.s.hp,0,1),4)}
 g.restore();const p=sim.p;return 'TALAS '+sim.wave+' · NIVO '+p.s.level+' · HP '+Math.ceil(p.hp)+'/'+p.s.hp+' · XP '+sim.xp+' · KILL '+sim.kills+(p.hp<=0?' · PORAŽEN — RESET':sim.paused?' · PAUZA':'');
}
function frame(now){if(!open)return;raf=requestAnimationFrame(frame);if(document.hidden){last=0;return}const dt=last?clamp((now-last)/1000,0,.065):0;last=now;if(sim)step(dt);
 if(!sim&&now-lastDraw<32)return;lastDraw=now;const [w,h]=dimensions();background(w,h,!!sim);let status;
 if(sim)status=drawTest(w,h,now);else{const moving=preview==='walk'||preview==='run',phase=gaitStep(draft,now*.001*draft.speed*(preview==='run'?1.55:1));draw(g,draft,w/2,h*.83,{phase,moving,attack:preview==='attack'?(Math.sin(now*.008)+1)/2:0,side:1,scale:Math.min(w/115,h/175),now});status=labels[draft.role].toUpperCase()+' · '+draft.name+' · '+labels[draft.race]}
 if(notice)status+='\n'+notice;const node=$('ns171Status');if(node.textContent!==status)node.textContent=status;
}
function install(){const parent=$('ns50MenuCreate')?.querySelector('.ns50GroupBody');if(!parent||$('ns171HeroBtn'))return;for(const [id,title,role] of [['ns171HeroBtn','♟ CREATE MY HERO','hero'],['ns171CharacterBtn','◇ CREATE CHARACTER · HERO / ENEMY','enemy']]){const b=document.createElement('button');b.id=id;b.textContent=title;b.onclick=()=>openEditor(role);parent.append(b)}}
window.NS171_CREATOR={open:openEditor,close,clean,effective,gaitStep,draw,presets, get opened(){return open},test:{get draft(){return {...draft}},get saved(){return all.map(x=>({...x}))},get simulation(){return sim?{wave:sim.wave,level:sim.p.s.level,hp:sim.p.hp,maxHp:sim.p.s.hp,hero:sim.p.c.name,x:sim.p.x,y:sim.p.y,paused:sim.paused,mobs:sim.mobs.map(m=>({name:m.c.name,hp:m.hp,role:m.c.role})),kills:sim.kills}:null},get raf(){return !!raf}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();