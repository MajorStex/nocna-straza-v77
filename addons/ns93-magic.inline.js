// Noćna Straža v93: original drag-to-cast magic, kept inside the existing main game closure.
// No added render loop, textures, third-party audio or per-frame network traffic.
const NS93_MAGIC=(()=>{
 const spells=[
  {id:'spark',icon:'✦',en:'Spark',sr:'Iskra',cost:12,price:0,cd:3.6,radius:57,damage:29,range:355,color:'#a6d9ff',audio:490,cap:4},
  {id:'lightning',icon:'⚡',en:'Lightning',sr:'Grom',cost:26,price:7,cd:6.5,radius:63,damage:61,range:360,color:'#b9b0ff',audio:260,cap:5},
  {id:'fire',icon:'🔥',en:'Fireburst',sr:'Vatrena eksplozija',cost:23,price:6,cd:5.4,radius:86,damage:41,range:350,color:'#ffad6b',audio:160,cap:7},
  {id:'frost',icon:'❄',en:'Glacial Spike',sr:'Ledeni šiljci',cost:28,price:9,cd:8.5,radius:110,damage:31,range:340,color:'#a0e7f7',audio:420,cap:7,slow:2.4},
  {id:'chain',icon:'⌁',en:'Chain Storm',sr:'Lančana oluja',cost:36,price:12,cd:10,radius:112,damage:49,range:365,color:'#dab3ff',audio:320,cap:5},
  {id:'comet',icon:'☄',en:'Comet',sr:'Kometa',cost:48,price:17,cd:12,radius:118,damage:79,range:370,color:'#ffbd8a',audio:125,cap:8},
  {id:'heal',icon:'✚',en:'Healing Circle',sr:'Krug lečenja',cost:36,price:11,cd:15,radius:135,damage:0,heal:28,range:290,color:'#8be3b2',audio:660,cap:6},
  {id:'nova',icon:'✺',en:'Arcane Nova',sr:'Magični talas',cost:61,price:22,cd:19,radius:150,damage:68,range:325,color:'#d2aaff',audio:190,cap:9}
 ];
 const byId=Object.fromEntries(spells.map(s=>[s.id,s]));
 let active=null,lastHud=0,lastAudio=0,bound=false;
 const tr=(en,sr)=>window.__gameLanguage?.value==='sr'?sr:en;
 const learned=obj=>{
  const o={spark:1};
  for(const s of spells)if(s.price&&obj&&obj[s.id]===1)o[s.id]=1;
  return o;
 };
 const mine=()=>G.players.find(p=>p.id===(NET.role?NET.localId:'p1'))||G.players[0];
 function initPlayer(p,unlocks){
  if(!p)return;
  const mage=p.nsCombatClass==='mage';
  p.ns93MaxMana=mage?102:64;
  p.ns93Mana=p.ns93MaxMana;
  p.ns93ManaRegen=mage?4.3:2.5;
  p.ns93Spells=learned(unlocks||{});
  p.ns93Cooldown={};
 }
 function changeClass(cls){
  if(G.mode==='play'||NET.phase==='playing'||!['warrior','ranger','mage','support'].includes(cls))return false;
  if(activeHeroProfile==='default'&&!createHeroProfile())return false;
  heroStyle.heroClass=cls;
  const rec=heroProfiles.find(h=>h.id===activeHeroProfile);
  if(rec)rec.spec.heroClass=cls;
  saveHeroProfiles();
  renderPreRun();
  if(NET.role==='guest'&&NET.conn?.open)NET.conn.send({t:'profile',...localMPProfile()});
  if(NET.role==='host'&&NET.phase==='lobby')broadcastLobby();
  return true;
 }
 function purchase(id){
  const s=byId[id];
  if(!s||!s.price||G.mode==='play'||NET.phase==='playing'||mpProgress.spells?.[id]===1)return false;
  if(mpProgress.coins<s.price){toast(tr('Not enough honor coins','Nema dovoljno poena časti'));return false;}
  mpProgress.coins-=s.price;
  mpProgress.spells[id]=1;
  saveMP();
  renderStores();
  if(NET.role==='guest'&&NET.conn?.open)NET.conn.send({t:'profile',...localMPProfile()});
  if(NET.role==='host'&&NET.phase==='lobby')broadcastLobby();
  return true;
 }
 function renderStores(){
  for(const id of ['ns93PreStore','ns93LobbyStore']){
   const root=$(id);
   if(!root)continue;
   root.replaceChildren();
   const label=document.createElement('div');
   label.className='ns93StoreLabel';
   label.textContent=tr('SPELL GRIMOIRE • '+mpProgress.coins+' honor coins','KNJIGA MAGIJA • '+mpProgress.coins+' poena časti');
   root.append(label);
   const grid=document.createElement('div');grid.className='ns93StoreGrid';
   for(const s of spells){
    const known=!s.price||mpProgress.spells?.[s.id]===1;
    const b=document.createElement('button');
    b.type='button';b.className='ns93StoreItem';b.disabled=known||mpProgress.coins<s.price||NET.phase==='playing';
    const head=document.createElement('strong');head.textContent=s.icon+' '+tr(s.en,s.sr);
    const line=document.createElement('small');
    line.textContent=s.cost+' '+tr('mana','mane')+' • '+s.cd+'s • '+s.radius+' '+tr('radius','radijus');
    const state=document.createElement('b');
    state.textContent=known?tr('✓ UNLOCKED','✓ OTKLJUČANO'):s.price+' ✦ '+tr('UNLOCK','OTKLJUČAJ');
    b.append(head,line,state);b.onclick=()=>purchase(s.id);grid.append(b);
   }
   root.append(grid);
  }
  const selector=$('ns93ClassSelect');if(selector)selector.value=heroStyle.heroClass||'warrior';
 }
 function previewPosition(x,y){
  if(!active)return;
  const v=worldPoint(x,y),p=mine(),s=byId[active.id],hint=$('ns93Target');
  if(!hint||!p||!s)return;
  const dist=Math.hypot(v.x-p.x,v.y-p.y);
  const invalid=dist>s.range||v.x<30||v.y<30||v.x>WORLD.w-30||v.y>WORLD.h-30;
  hint.style.display='block';
  hint.style.width=Math.round(s.radius*worldScale()*2)+'px';
  hint.style.height=Math.round(s.radius*worldScale()*2)+'px';
  hint.style.left=x+'px';hint.style.top=y+'px';
  hint.style.borderColor=invalid?'#ff6e80':s.color;
  hint.style.boxShadow='0 0 18px '+(invalid?'#dc416455':s.color+'44')+', inset 0 0 20px '+s.color+'22';
  hint.textContent=invalid?'×':'+';
  active.target={x:v.x,y:v.y,invalid};
 }
 function stopAim(){active=null;const h=$('ns93Target');if(h)h.style.display='none';}
 function bind(){
  if(bound)return;bound=true;
  const selection=$('ns93ClassSelect');
  if(selection)selection.addEventListener('change',e=>changeClass(e.target.value));
  window.addEventListener('pointermove',e=>{
   if(!active||e.pointerId!==active.pointerId)return;
   active.moved=active.moved||Math.hypot(e.clientX-active.sx,e.clientY-active.sy)>13;
   previewPosition(e.clientX,e.clientY);
  },{passive:true});
  window.addEventListener('pointerup',e=>{
   if(!active||e.pointerId!==active.pointerId)return;
   const current=active;
   if(current.moved)previewPosition(e.clientX,e.clientY);
   stopAim();
   if(G.mode!=='play'||G.paused||G.lootPending||G.guildPending||G.marketPending)return;
   let target=current.target;
   if(!current.moved){
    const p=mine();if(!p)return;
    const mob=G.mobs.filter(m=>!m.dead&&Math.hypot(m.x-p.x,m.y-p.y)<250)
      .sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    target=mob?{x:mob.x,y:mob.y}:{x:p.x+Math.cos(p.facing)*105,y:p.y+Math.sin(p.facing)*105};
   }
   if(!target||target.invalid){toast(tr('Target out of range','Meta je van dometa'));return;}
   request(current.id,target.x,target.y);
  },{passive:true});
  window.addEventListener('pointercancel',stopAim,{passive:true});
  window.addEventListener('blur',stopAim);
 }
 function renderHud(){
  const dock=$('ns93SpellDock');if(!dock)return;
  const p=mine(),visible=G.mode==='play'&&!G.paused&&!G.lootPending&&!G.marketPending&&!G.guildPending&&!p?.dead;
  dock.classList.toggle('hidden',!visible);
  if(!visible||!p)return;
  const now=performance.now();if(now-lastHud<110)return;lastHud=now;
  const mana=Number(p.ns93Mana)||0,max=Number(p.ns93MaxMana)||64;
  $('ns93ManaValue').textContent=Math.ceil(mana)+' / '+Math.ceil(max)+' MP';
  $('ns93ManaFill').style.width=Math.max(0,Math.min(100,100*mana/Math.max(1,max)))+'%';
  const holder=$('ns93SpellList');
  const own=NET.role==='guest'?learned(mpProgress.spells):learned(p.ns93Spells);
  const expected=spells.filter(s=>own[s.id]).map(s=>s.id).join(',');
  if(holder.dataset.ids!==expected){
   holder.replaceChildren();holder.dataset.ids=expected;
   for(const s of spells.filter(s=>own[s.id])){
    const b=document.createElement('button');b.type='button';
    b.className='ns93Spell';b.dataset.spell=s.id;b.title=tr(s.en,s.sr)+' • '+s.cost+' MP';
    b.style.setProperty('--spell',s.color);
    const icon=document.createElement('span');icon.textContent=s.icon;
    const cd=document.createElement('small');cd.className='ns93Cooldown';
    b.append(icon,cd);
    b.addEventListener('pointerdown',e=>{
     if(G.mode!=='play'||p.dead||G.paused)return;
     if(e.pointerType==='mouse'&&e.button!==0)return;
     if((Number(mine()?.ns93Mana)||0)<s.cost){toast(tr('Not enough mana','Nedovoljno mane'));return;}
     e.preventDefault();e.stopPropagation();
     active={id:s.id,pointerId:e.pointerId,moved:false,sx:e.clientX,sy:e.clientY};
     try{b.setPointerCapture(e.pointerId)}catch{}
     previewPosition(e.clientX,e.clientY);
    });
    holder.append(b);
   }
  }
  for(const b of holder.children){
   const s=byId[b.dataset.spell],remaining=Math.max(0,Number(p.ns93Cooldown?.[s.id]||0)-G.time);
   b.disabled=mana<s.cost||remaining>.02;
   b.querySelector('small').textContent=remaining>.02?Math.ceil(remaining)+'s':'';
  }
 }
 function request(id,x,y){
  const p=mine();
  if(!p||p.dead)return false;
  if(NET.role==='guest'){
   if(!NET.conn?.open)return false;
   try{NET.conn.send({t:'ns93Cast',id,x:Math.round(x),y:Math.round(y),round:NET.round});return true}catch{return false}
  }
  return cast(p,id,x,y).ok;
 }
 // Authoritative host/solo damage; one cast = one FX event, never per particle.
 function cast(p,id,x,y){
  const s=byId[id],now=G.time;
  if(!p||p.dead||G.mode!=='play'||G.paused||!s||!p.ns93Spells?.[id]||!Number.isFinite(x)||!Number.isFinite(y))
   return {ok:false,reason:'unavailable'};
  if(now<(p.ns93TryAt||-10)+.14)return {ok:false,reason:'rate'};
  p.ns93TryAt=now;
  if(now<(p.ns93Cooldown?.[id]||0))return {ok:false,reason:'cooldown'};
  if((p.ns93Mana||0)<s.cost)return {ok:false,reason:'mana'};
  if(x<30||y<30||x>WORLD.w-30||y>WORLD.h-30||Math.hypot(x-p.x,y-p.y)>s.range)
   return {ok:false,reason:'range'};
  p.ns93Mana=Math.max(0,p.ns93Mana-s.cost);
  p.ns93Cooldown[id]=now+s.cd;
  let hits=0;
  if(s.heal){
   for(const ally of G.players.filter(a=>!a.dead&&Math.hypot(a.x-x,a.y-y)<s.radius).slice(0,6)){
    ally.hp=Math.min(ally.maxHp,ally.hp+s.heal);hits++;
   }
  }else{
   const victims=G.mobs.filter(m=>!m.dead&&Math.abs(m.x-x)<s.radius+m.r&&Math.abs(m.y-y)<s.radius+m.r)
    .sort((a,b)=>(a.x-x)**2+(a.y-y)**2-((b.x-x)**2+(b.y-y)**2)).slice(0,s.cap);
   for(const m of victims){
    const distance=Math.hypot(m.x-x,m.y-y);
    if(distance>s.radius+m.r)continue;
    const falloff=Math.max(.42,1-distance/(s.radius+m.r)*.5);
    const boss=m.type==='boss'||m.type==='rotfiend'?0.48:1;
    const dmg=Math.max(1,Math.round(s.damage*falloff*boss*(p.nsCombatClass==='mage'?1.09:1)));
    const real=lightAt(m.x,m.y,p)?dmg:1;
    m.hp-=real;m.flash=.22;
    if(s.slow&&!m.ns93BaseSpeed){m.ns93BaseSpeed=m.speed;m.speed*=.69;m.ns93SlowUntil=now+s.slow;}
    else if(s.slow&&m.ns93BaseSpeed)m.ns93SlowUntil=Math.max(m.ns93SlowUntil||0,now+s.slow);
    if(m.hp<=0)killMob(m,p);hits++;
   }
  }
  effect('ns93Magic',x,y,{id:s.id,radius:s.radius,owner:p.id});
  soundAt(s.id,x,y);
  return {ok:true,mana:p.ns93Mana,readyAt:p.ns93Cooldown[id],hits};
 }
 function tick(dt){
  if(G.mode!=='play'||NET.role==='guest')return;
  for(const p of G.players){
   if(p.dead)continue;
   if(p.ns93MaxMana>0)p.ns93Mana=Math.min(p.ns93MaxMana,(p.ns93Mana||0)+dt*(p.ns93ManaRegen||2.5));
  }
  for(const m of G.mobs){
   if(m.ns93BaseSpeed&&G.time>=(m.ns93SlowUntil||0)){
    m.speed=m.ns93BaseSpeed;delete m.ns93BaseSpeed;delete m.ns93SlowUntil;
   }
  }
 }
 function guestRequest(assigned,data){
  if(!assigned||data.round!==NET.round||NET.role!=='host'||NET.phase!=='playing')return;
  const p=G.players.find(q=>q.id===assigned),connection=NET.clients.get(assigned);
  const result=cast(p,data.id,Number(data.x),Number(data.y));
  if(connection?.open)connection.send({t:'ns93CastAck',id:data.id,ok:result.ok,reason:result.reason||'',mana:p?.ns93Mana||0,readyAt:p?.ns93Cooldown?.[data.id]||0,round:NET.round});
 }
 function ack(data){
  if(data.round!==NET.round)return;
  const p=mine();if(!p)return;
  if(!data.ok){if(data.reason!=='rate')toast(tr('Spell unavailable: ','Magija nije dostupna: ')+(data.reason||'?'));return;}
  p.ns93Mana=Number(data.mana)||0;
  p.ns93Cooldown=p.ns93Cooldown||{};
  if(byId[data.id])p.ns93Cooldown[data.id]=Number(data.readyAt)||0;
 }
 function soundAt(id,x,y){
  if(!cfgSettings.sfx||G.mode!=='play')return;
  const p=mine(),distance=p?Math.hypot(p.x-x,p.y-y):900;
  if(distance>=640)return;
  const volume=(1-distance/640)*Math.min(.6,Math.max(0,Number(cfgSettings.sfxVolume)||.5));
  if(volume<.02)return;
  if(performance.now()-lastAudio<95)return;
  lastAudio=performance.now();
  unlockSound();const ac=AudioFX.ctx;if(!ac||ac.state!=='running')return;
  const s=byId[id]||byId.spark;
  try{
   const o=ac.createOscillator(),g=ac.createGain(),filter=ac.createBiquadFilter();
   o.type=id==='heal'?'sine':id==='lightning'||id==='chain'?'sawtooth':'triangle';
   o.frequency.setValueAtTime(s.audio*1.8,ac.currentTime);
   o.frequency.exponentialRampToValueAtTime(Math.max(60,s.audio*.56),ac.currentTime+.27);
   filter.type='lowpass';filter.frequency.value=1100;
   g.gain.setValueAtTime(.0001,ac.currentTime);
   g.gain.exponentialRampToValueAtTime(Math.max(.0005,volume*.18),ac.currentTime+.02);
   g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.32);
   o.connect(filter);filter.connect(g);g.connect(ac.destination);
   o.start();o.stop(ac.currentTime+.34);
  }catch{}
 }
 function drawSpell(e,life){
  const val=e.value||{},s=byId[val.id]||byId.spark,r=Math.min(160,Number(val.radius)||s.radius),q=1-life;
  const low=!!window.__NS77PERF?.guestActive&&window.__NS77PERF.guestCap<1.05;
  ctx.lineWidth=2.6*life+.9;ctx.strokeStyle=s.color;ctx.globalAlpha*=.92;
  ctx.beginPath();ctx.ellipse(0,0,Math.max(5,r*(.16+.84*q)),Math.max(4,r*(.10+.66*q)),0,0,TAU);ctx.stroke();
  ctx.globalAlpha*=.5;
  ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(0,0,Math.max(3,r*.2*life),0,TAU);ctx.fill();
  ctx.globalAlpha=life*.95;
  const spikes=low?4:val.id==='comet'||val.id==='nova'?9:7;
  for(let i=0;i<spikes;i++){
   const angle=i*TAU/spikes+e.id*.3;
   const rr=(.2+q*.68)*r;
   const px=Math.cos(angle)*rr,py=Math.sin(angle)*rr*.72;
   ctx.strokeStyle=i%2?'#fff4d3':s.color;
   ctx.lineWidth=1.5+life*2;
   ctx.beginPath();ctx.moveTo(px*.63,py*.63);ctx.lineTo(px,py);ctx.stroke();
  }
  if(val.id==='lightning'||val.id==='chain'){
   ctx.strokeStyle='#f1ecff';ctx.lineWidth=2.6*life;ctx.beginPath();
   ctx.moveTo(-r*.25,-r*.88*life);ctx.lineTo(r*.02,-r*.23);ctx.lineTo(-r*.06,r*.04);
   ctx.lineTo(r*.23,r*.55*life);ctx.stroke();
  }else if(val.id==='comet'){
   ctx.fillStyle='#fff2cb';ctx.beginPath();ctx.arc(0,-q*r*.4,4+life*8,0,TAU);ctx.fill();
   ctx.strokeStyle='#ffc88c';ctx.lineWidth=8*life;ctx.beginPath();
   ctx.moveTo(-r*.32,-r*.8);ctx.lineTo(0,-q*r*.4);ctx.stroke();
  }else if(val.id==='frost'){
   ctx.strokeStyle='#e2f9ff';ctx.lineWidth=2*life;
   for(let i=0;i<4;i++){const a=i*TAU/4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*.6*q,Math.sin(a)*r*.6*q);ctx.stroke();}
  }else if(val.id==='heal'){
   ctx.strokeStyle='#dcffe6';ctx.lineWidth=3*life;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.stroke();
  }
 }
 function reset(){stopAim();lastHud=0;}
 bind();
 return {spells,learned,initPlayer,renderStores,renderHud,request,cast,purchase,tick,guestRequest,ack,soundAt,drawSpell,reset,changeClass};
})();
window.__NS93_MAGIC=NS93_MAGIC;
