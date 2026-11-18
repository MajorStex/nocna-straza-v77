/* V174 — data-only AI controller, independent of actor appearance, role and game mode.
 * Placement owns faction, home and optional overrides. Engine supplies actors, movement and damage.
 * No DOM, network or timers are needed by simulation. Perception runs at 5Hz.
 */
(function(){
'use strict';
if(window.NS174_AI)return;
const MODES={hunt:'Slobodno kretanje / potera',patrol:'Patrola po krugu',roam:'Slobodna šetnja u radijusu',guard:'Čuvaj lokaciju',still:'Stoji na mestu'};
const REACTIONS={hostile:'Napada neprijatelje',defend:'Samo se brani',passive:'Ne ulazi u borbu'};
const FACTIONS={enemy:'Neprijateljski',ally:'Saveznički',neutral:'Neutralni',red:'Crvena frakcija',blue:'Plava frakcija',player:'Igrač'};
const SPECIALS={none:'Bez specijalnog napada',slam:'Udarac o tlo',frost:'Ledeni talas',beam:'Matrijarh · laserski zrak',slow:'Alfa · zavijanje'};
const STATES={idle:'Miruje',patrol:'Patrolira',roam:'Šeta',guard:'Čuva',chase:'Prati metu',return:'Vraća se',fight:'U borbi',cast:'Priprema napad'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),val=(n,d,a,b)=>clamp(n!==null&&n!==''&&Number.isFinite(Number(n))?Number(n):d,a,b),enumOf=(o,k,d)=>Object.hasOwn(o,k)?k:d;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function clean(raw={},legacy='melee'){
 raw=raw&&typeof raw==='object'?raw:{};
 const mode=enumOf(MODES,raw.mode,legacy==='guard'?'guard':'hunt');
 const radius=Math.round(val(raw.radius,120,30,800));
 return {v:1,mode,reaction:enumOf(REACTIONS,raw.reaction,'hostile'),radius,vision:Math.round(val(raw.vision,mode==='hunt'?650:180,25,1200)),leash:Math.round(val(raw.leash,mode==='hunt'?650:radius,radius,2000)),wait:val(raw.wait,1.3,0,8),pace:val(raw.pace,.55,.2,1),flee:Math.round(val(raw.flee,0,0,45))};
}
function cleanBoss(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const phase2=Math.round(val(raw.phase2,70,40,90)),phase3=Math.round(val(raw.phase3,35,10,phase2-10));
 return {v:1,enabled:raw.enabled===true,phase2,phase3,rage:Math.round(val(raw.rage,25,0,65)),special:enumOf(SPECIALS,raw.special,'slam'),power:Math.round(val(raw.power,28,5,85)),radius:Math.round(val(raw.radius,85,35,180)),windup:val(raw.windup,1.3,.65,3),cooldown:val(raw.cooldown,9,4,30)};
}
function cleanPlacement(raw,template,bounds){
 raw=raw&&typeof raw==='object'?raw:{};
 const x=val(raw.x,0,bounds?.minX??-100000,bounds?.maxX??100000),y=val(raw.y,0,bounds?.minY??-100000,bounds?.maxY??100000);
 const faction=enumOf(FACTIONS,raw.faction,'enemy'),base=clean(template?.ai,template?.behavior),over=raw.ai&&typeof raw.ai==='object'?raw.ai:{};
 // Waypoints are instance-relative coordinates and never extend the patrol radius.
 const switched=over.mode&&over.mode!==base.mode&&over.mode!=='hunt';const ai=clean({...base,...(switched?{leash:base.radius,vision:Math.min(base.vision,Math.max(120,base.radius))}:{}),...over},template?.behavior);
 const points=(Array.isArray(raw.points)?raw.points:[]).slice(0,12).map(p=>{let x=val(p?.x,0,-ai.radius,ai.radius),y=val(p?.y,0,-ai.radius,ai.radius);const d=Math.hypot(x,y);if(d>ai.radius){x*=ai.radius/d;y*=ai.radius/d}return {x,y}});
 const target=typeof raw.target==='string'&&/^(nearest|p[1-6])$/.test(raw.target)?raw.target:null;
 return {v:1,characterId:String(raw.characterId||template?.id||'').replace(/[^a-z0-9@_-]/gi,'').slice(0,64),x,y,faction,ai,points,...(target?{target}:{})};
}
function attach(actor,placement,seed=0){
 const p=cleanPlacement(placement,actor.c);
 actor.faction=p.faction;actor.placement=p;actor.brain={state:'idle',target:null,retaliate:null,nextSense:0,waypoint:null,point:0,waitUntil:0,seed:(Math.abs(Math.floor(seed))+1)>>>0,returning:false};
 actor.boss={config:cleanBoss(actor.c?.boss),stage:1,cooldown:2,cast:null};
 return actor;
}
function hostile(a,b){
 if(!a||!b||a===b||b.hp<=0)return false;
 if((a.relations||b.relations)&&window.NS175_FACTIONS)return window.NS175_FACTIONS.hostile(a,b);
 const ta=a.faction||'enemy',tb=b.faction||'enemy';
 if(ta==='neutral'||tb==='neutral')return a.brain?.retaliate===b;
 return ta!==tb;
}
function markHit(a,b){if(!a||!b||a===b||!b.brain||b.placement.ai.reaction==='passive')return;
 if((a.relations||b.relations)&&window.NS175_FACTIONS){window.NS175_FACTIONS.markHit(a,b);return}if(a.faction!==b.faction)b.brain.retaliate=a;
}
function rng(brain){brain.seed=(Math.imul(brain.seed,1664525)+1013904223)>>>0;return brain.seed/4294967296}
function home(actor){return actor.placement}
function territory(actor){const p=home(actor),ai=p.ai;return ai.mode==='hunt'?Infinity:ai.mode==='still'?0:ai.leash}
function inTerritory(actor,p,extra=0){return distance(home(actor),p)<=territory(actor)+extra}
function boundMove(actor,x,y){
 if(!actor?.placement)return {x,y};const p=actor.placement,r=territory(actor),dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
 if(d<=r||!Number.isFinite(r))return {x,y};if(!r)return {x:p.x,y:p.y};return {x:p.x+dx/d*r,y:p.y+dy/d*r};
}
function targetValid(actor,t,retain=false){
 const p=actor.placement,ai=p.ai,b=actor.brain;
 if(!t||t.hp<=0||!hostile(actor,t)||ai.reaction==='passive')return false;
 if(p.target&&(t.faction!=='player'||(p.target!=='nearest'&&t.workshopSeat!==p.target)))return false;
 if(ai.reaction==='defend'&&b.retaliate!==t)return false;
 // Stationary characters can see and attack but cannot pursue.
 const allowed=ai.mode==='still'?Math.max(ai.vision,actor.s?.range||0):territory(actor);
 return distance(p,t)<=allowed+(retain&&ai.mode==='still'?15:0)&&distance(actor,t)<=ai.vision*(retain?1.2:1);
}
function sense(actor,actors,now){
 const b=actor.brain,ai=actor.placement.ai;
 if(b.returning||ai.reaction==='passive'){b.target=null;return}
 if(b.target&&!targetValid(actor,b.target,true))b.target=null;
 if(now<b.nextSense)return;b.nextSense=now+.20+(b.seed%5)*.009;
 let best=b.target,bestD=best?distance(actor,best):Infinity;for(const t of actors){if(!targetValid(actor,t,false))continue;const d=distance(actor,t);if(d<bestD*.85){best=t;bestD=d}}
 if(!best&&targetValid(actor,b.retaliate,false))best=b.retaliate;b.target=best;
}
function toward(actor,point,speed,dt,state){const dx=point.x-actor.x,dy=point.y-actor.y,d=Math.hypot(dx,dy);actor.brain.state=state;if(d<2||dt<=0)return {vx:0,vy:0,target:null,state};const v=Math.min(speed,d/dt);return {vx:dx/d*v,vy:dy/d*v,target:null,state}}
function idle(actor,state='idle'){actor.brain.state=state;return {vx:0,vy:0,target:null,state}}
function nextWaypoint(actor){
 const p=actor.placement,b=actor.brain,ai=p.ai;let dx,dy;
 if(p.points.length){const q=p.points[b.point++%p.points.length];dx=q.x;dy=q.y}
 else if(ai.mode==='patrol'){const a=(b.point++%6)*Math.PI/3+(b.seed%31)*.12;dx=Math.cos(a)*ai.radius*.90;dy=Math.sin(a)*ai.radius*.90}
 else{const a=rng(b)*Math.PI*2,r=Math.sqrt(rng(b))*ai.radius*.90;dx=Math.cos(a)*r;dy=Math.sin(a)*r}
 return {x:p.x+dx,y:p.y+dy};
}
function decide(actor,actors,now,dt){
 if(!actor?.brain||actor.hp<=0)return {vx:0,vy:0,target:null,state:'idle'};
 const p=actor.placement,ai=p.ai,b=actor.brain,mode=ai.mode,atHome=distance(actor,p),speed=(actor.s.speed||100)*.72*(actor.slow>0?.58:1)*phaseBuff(actor).speed;
 if(b.target&&!targetValid(actor,b.target,true)){b.target=null;if(mode!=='hunt'&&mode!=='still')b.returning=true}
 if(b.returning||atHome>territory(actor)+.5){b.target=null;b.returning=true;if(atHome>5)return toward(actor,p,speed,dt,'return');b.returning=false;b.retaliate=null;b.waypoint=null;b.nextSense=now+.8}
 sense(actor,actors,now);
 const t=b.target,range=(actor.s.range||65)*.92;
 if(t){const d=distance(actor,t);
  if(mode!=='still'&&ai.flee>0&&actor.hp/actor.s.hp*100<=ai.flee&&d<100){const dx=actor.x-t.x,dy=actor.y-t.y,n=Math.hypot(dx,dy)||1,q=boundMove(actor,actor.x+dx/n*70,actor.y+dy/n*70);const a=toward(actor,q,speed,dt,'return');return a}
  if(d>range&&mode!=='still'){const a=toward(actor,t,speed*(actor.c.behavior==='charge'&&d>100?1.4:1),dt,'chase');return {...a,target:t}}
  return {...idle(actor,'fight'),target:t};
 }
 if(mode==='still'||mode==='guard'||mode==='hunt'){if(mode==='guard'&&atHome>3)return toward(actor,p,speed,dt,'return');return idle(actor,mode==='guard'?'guard':'idle')}
 if(now<b.waitUntil)return idle(actor,mode==='patrol'?'patrol':'roam');
 if(!b.waypoint)b.waypoint=nextWaypoint(actor);
 if(distance(actor,b.waypoint)<4||(!actor.moving&&b.lastWaypoint===b.waypoint&&now-(b.lastWaypointTime||0)>1)){b.waypoint=null;b.waitUntil=now+ai.wait;return idle(actor,mode)}
 if(b.lastWaypoint!==b.waypoint){b.lastWaypoint=b.waypoint;b.lastWaypointTime=now}return toward(actor,b.waypoint,speed*ai.pace,dt,mode);
}
function phaseBuff(actor){
 const b=actor.boss;if(!b?.config.enabled||!['mini','boss'].includes(actor.c.role))return {stage:1,speed:1,damage:1};
 const stage=b.stage,bonus=b.config.rage/100*(stage-1)/2;return {stage,speed:1+bonus*.6,damage:1+bonus};
}
// Boss specials have a fixed warned ground position and resolve once. Adapter chooses hostile actors.
function bossTick(actor,opponents,target,dt,callbacks={}){
 const b=actor.boss;if(!b?.config.enabled||!['mini','boss'].includes(actor.c.role)||actor.hp<=0)return false;
 const c=b.config,frac=actor.hp/Math.max(1,actor.s.hp)*100,stage=frac<=c.phase3?3:frac<=c.phase2?2:1;
 if(stage>b.stage){b.stage=stage;callbacks.phase?.(actor,stage)}
 b.cooldown=Math.max(0,b.cooldown-dt);
 if(b.cast){actor.brain.state='cast';b.cast.remaining-=dt;if(b.cast.remaining>0)return true;const cast=b.cast;b.cast=null;
  for(const t of opponents){if(!hostile(actor,t))continue;const x=t.x-cast.x,y=t.y-cast.y;
  if(c.special==='beam'){const u=Math.cos(cast.angle),v=Math.sin(cast.angle),a=x*u+y*v,z=Math.abs(-x*v+y*u);if(a<0||a>cast.length||z>cast.radius)continue}else if(distance(t,cast)>cast.radius)continue;
  if(c.special!=='slow')callbacks.damage?.(actor,t,Math.round(c.power*phaseBuff(actor).damage*(1+Math.min(.8,(actor.s.level-1)*.009))));if((c.special==='frost'||c.special==='slow')&&t.hp>0)t.slow=Math.max(t.slow||0,2.55)}
  callbacks.impact?.(actor,cast);b.cooldown=c.cooldown;return true}
 if(c.special==='none'||(b.stage<2&&!actor.c.classicModel)||b.cooldown>0||!target||!hostile(actor,target)||distance(actor,target)>(actor.c.classicModel?700:Math.min(320,c.radius*2.2)))return false;
 b.cast={x:target.x,y:target.y,radius:c.radius,remaining:c.windup,total:c.windup,type:c.special};if(c.special==='beam')Object.assign(b.cast,{x:actor.x,y:actor.y,angle:Math.atan2(target.y-actor.y,target.x-actor.x),radius:[39,47,56][stage-1],length:[380,425,475][stage-1]});if(c.special==='slow')b.cast.radius=[124,145,163][stage-1];actor.brain.state='cast';callbacks.warn?.(actor,b.cast);return true;
}
function cancelCast(actor){if(actor.boss?.cast){actor.boss.cast=null;actor.boss.cooldown=Math.max(actor.boss.cooldown,1)}}
const esc=s=>String(s).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
function selects(map,current){return Object.entries(map).map(([k,v])=>'<option value="'+k+'"'+(k===current?' selected':'')+'>'+esc(v)+'</option>').join('')}
function editorHtml(spec){
 const ai=clean(spec.ai,spec.behavior),boss=cleanBoss(spec.boss);
 const r=(group,k,title,min,max,step=1)=>{const v=(group==='ai'?ai:boss)[k];return '<label>'+title+' <output data-ai-out="'+group+'-'+k+'">'+v+'</output><input type="range" data-ai-group="'+group+'" data-ai-field="'+k+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></label>'};
 return '<h3>AI & BOSS · PONAŠANJE</h3><p>Ovo su podrazumevana pravila karaktera. Svaka instanca na mapi može dobiti svoju lokaciju, stranu, radijus i ponašanje.</p><div class="ccGrid"><label class="ccFull">Kretanje<select data-ai-group="ai" data-ai-field="mode">'+selects(MODES,ai.mode)+'</select></label><label class="ccFull">Reakcija<select data-ai-group="ai" data-ai-field="reaction">'+selects(REACTIONS,ai.reaction)+'</select></label>'+ (ai.mode==='hunt'||ai.mode==='still'?'':r('ai','radius','Radijus patrole',30,800,10)+r('ai','leash','Granica potere',ai.radius,2000,10))+r('ai','vision','Radijus opažanja',25,1200,25)+(['patrol','roam'].includes(ai.mode)?r('ai','wait','Pauza na tački (s)',0,8,.1)+r('ai','pace','Tempo šetnje',.2,1,.05):'')+r('ai','flee','Beži ispod HP % (0 = ne)',0,45,5)+'</div><p>Patrola i šetnja ostaju unutar radijusa. Potera se prekida na granici, zatim se lik vraća na svoje mesto. Stacionarni lik se ne pomera.</p><h3>BOSS FAZE</h3><label class="ccLabCheck"><input type="checkbox" data-ai-group="boss" data-ai-field="enabled" '+(boss.enabled?'checked':'')+'> Aktiviraj boss faze (samo mini-boss / boss)</label>'+
 (boss.enabled?'<div class="ccGrid">'+r('boss','phase2','Faza II · HP %',40,90,5)+r('boss','phase3','Faza III · HP %',10,boss.phase2-10,5)+r('boss','rage','Bonus u III fazi %',0,65,5)+'<label class="ccFull">Specijalni napad<select data-ai-group="boss" data-ai-field="special">'+selects(SPECIALS,boss.special)+'</select></label>'+(boss.special==='none'?'':r('boss','power','Osnovna šteta',5,85,1)+r('boss','radius','Radijus udara',35,180,5)+r('boss','windup','Upozorenje (s)',.65,3,.05)+r('boss','cooldown','Cooldown (s)',4,30,.5))+'</div><p>Od faze II specijalni napad upozorava crvenim krugom. Iz kruga možeš da izađeš pre udara. Faza III pojačava borbu.</p>':'')+'<div class="ccRow"><button data-action="asEnemy">▶ Test ponašanja</button><button data-action="asHero">Test kao heroj</button></div>';
}
function drawDebug(g,actor){const p=actor.placement;if(!p)return;g.save();g.lineWidth=1;g.setLineDash([5,5]);const ring=(r,color)=>{if(!Number.isFinite(r)||r<=0)return;g.strokeStyle=color;g.beginPath();g.arc(p.x,p.y,r,0,Math.PI*2);g.stroke()};if(p.ai.mode!=='hunt'){ring(p.ai.radius,'#d3c18188');ring(territory(actor),'#d98b7b88')}g.setLineDash([]);g.fillStyle='#e9d6a6';g.fillRect(p.x-2,p.y-2,4,4);g.font='10px system-ui';g.fillText(STATES[actor.brain?.state]||'',actor.x+12,actor.y+12);g.restore()}
function drawWarning(g,actor){const a=actor.boss?.cast;if(!a)return;const t=clamp(1-a.remaining/a.total,0,1);g.save();g.fillStyle='#c84d4438';g.strokeStyle='#f38e70';g.lineWidth=2;if(a.type==='beam'){g.translate(a.x,a.y);g.rotate(a.angle);g.fillRect(0,-a.radius,a.length,a.radius*2);g.strokeRect(0,-a.radius,a.length,a.radius*2);g.fillRect(0,-2,a.length*t,4)}else{if(a.type==='slow'){g.strokeStyle='#81c6ba';g.fillStyle='#68aaa629'}g.beginPath();g.arc(a.x,a.y,a.radius,0,Math.PI*2);g.fill();g.stroke();g.beginPath();g.arc(a.x,a.y,a.radius*t,0,Math.PI*2);g.stroke()}g.restore()}
window.NS174_AI={MODES,REACTIONS,FACTIONS,SPECIALS,STATES,clean,cleanBoss,cleanPlacement,attach,hostile,markHit,boundMove,decide,phaseBuff,bossTick,cancelCast,editorHtml,drawDebug,drawWarning,selects};
})();