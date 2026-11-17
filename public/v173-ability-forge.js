/* V173 Ability Forge: bounded data-only templates, identical cast rules for player and AI.
 * No timers, network messages, external assets or extra animation loops.
 */
(function(){
'use strict';
if(window.NS173_ABILITIES)return;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,d,a,b)=>clamp(Number.isFinite(Number(n))?Number(n):d,a,b);
const TYPES={
 none:{label:'Prazan slot',icon:'—',color:'#8d9e91',hint:'Bez sposobnosti.'},
 fireball:{label:'Vatrena kugla',icon:'✦',color:'#ef9b58',hint:'Pogađa najbližu metu u dometu.'},
 whirlwind:{label:'Vrtlog',icon:'⚔',color:'#c4cddd',hint:'Udarac oko lika; više meta.'},
 heal:{label:'Lečenje',icon:'✚',color:'#9bd58b',hint:'Vraća sopstveni HP.'},
 shield:{label:'Štit',icon:'⬡',color:'#e5c47c',hint:'Smanjuje primljenu štetu dok traje.'},
 frost:{label:'Ledeni talas',icon:'❄',color:'#92d7ed',hint:'Šteta i usporavanje više neprijatelja.'}
};
const DEFAULT={type:'none',name:'',mana:22,cooldown:5,power:35,range:165,duration:3,unlock:1};
const PRESETS={fireball:{mana:25,cooldown:5,power:40,range:230,duration:1},whirlwind:{mana:28,cooldown:7,power:32,range:105,duration:1},heal:{mana:30,cooldown:10,power:35,range:0,duration:1},shield:{mana:25,cooldown:12,power:45,range:0,duration:4},frost:{mana:30,cooldown:9,power:22,range:150,duration:3}};
function cleanOne(raw){const o=raw&&typeof raw==='object'?raw:{},type=Object.hasOwn(TYPES,o.type)?o.type:'none',d={...DEFAULT,...PRESETS[type],type};
 return {type,name:String(o.name||'').trim().slice(0,22),mana:Math.round(finite(o.mana,d.mana,5,65)),cooldown:Math.round(finite(o.cooldown,d.cooldown,2,30)*10)/10,power:Math.round(finite(o.power,d.power,5,type==='shield'?65:type==='heal'?70:100)),range:Math.round(finite(o.range,d.range,45,type==='whirlwind'?150:320)),duration:Math.round(finite(o.duration,d.duration,1,6)*10)/10,unlock:Math.round(finite(o.unlock,1,1,100))};
}
function cleanSlots(raw){return [0,1].map(i=>cleanOne(Array.isArray(raw)?raw[i]:null))}
const label=a=>a.name||TYPES[a.type].label;
function manaMax(raw,lv){return Math.round(finite(raw?.mana,100,50,200)+Math.min(90,(Math.max(1,lv)-1)*1.2))}
function init(actor){actor.abilities=cleanSlots(actor.c.abilities);actor.maxMana=manaMax(actor.c,actor.s.level);actor.mana=actor.maxMana;actor.abilityCd=[0,0];actor.shield=0;actor.shieldPower=0;actor.slow=0;actor.castFlash=0;actor.hurtFlash=0}
function tick(actor,dt){actor.mana=Math.min(actor.maxMana,actor.mana+dt*finite(actor.c.manaRegen,7,2,15));for(let i=0;i<2;i++)actor.abilityCd[i]=Math.max(0,actor.abilityCd[i]-dt);actor.shield=Math.max(0,actor.shield-dt);actor.slow=Math.max(0,actor.slow-dt);actor.castFlash=Math.max(0,actor.castFlash-dt);actor.hurtFlash=Math.max(0,actor.hurtFlash-dt)}
function levelUp(actor){const old=actor.maxMana;actor.maxMana=manaMax(actor.c,actor.s.level);actor.mana=Math.min(actor.maxMana,actor.mana+actor.maxMana-old)}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function ready(actor,i){const a=actor?.abilities?.[i];if(!a||a.type==='none')return 'Prazno';if(actor.hp<=0)return 'Poražen';if(actor.s.level<a.unlock)return 'Nivo '+a.unlock;if(actor.abilityCd[i]>.01)return actor.abilityCd[i].toFixed(1)+' s';if(actor.mana+.001<a.mana)return 'Nema mane';return ''}
function effect(sim,actor,target,a){if(!sim.fx)sim.fx=[];if(sim.fx.length>=32)sim.fx.shift();sim.fx.push({type:a.type,x:actor.x,y:actor.y,tx:target?.x??actor.x,ty:target?.y??actor.y,r:a.range,life:a.type==='fireball'?.42:.65,total:a.type==='fireball'?.42:.65,color:TYPES[a.type].color})}
function cast(sim,actor,i,opponents,{damage,voice}={}){
 if(!sim||sim.paused||!actor||ready(actor,i))return false;
 const a=actor.abilities[i],targets=opponents.filter(t=>t.hp>0&&dist(actor,t)<=a.range).sort((x,y)=>dist(actor,x)-dist(actor,y));let hits=[];
 if(a.type==='fireball'){if(!targets.length)return false;hits=[targets[0]]}
 if(a.type==='whirlwind'||a.type==='frost'){if(!targets.length)return false;hits=targets.slice(0,8)}
 if(a.type==='heal'&&actor.hp>=actor.s.hp)return false;
 if(a.type==='shield'&&actor.shield>.3)return false;
 actor.mana=Math.max(0,actor.mana-a.mana);actor.abilityCd[i]=a.cooldown;actor.castFlash=.45;
 const power=1+Math.min(.9,(actor.s.level-1)*.01);
 if(a.type==='heal')actor.hp=Math.min(actor.s.hp,actor.hp+Math.max(1,Math.round(actor.s.hp*a.power/100)));
 else if(a.type==='shield'){actor.shield=a.duration;actor.shieldPower=a.power}
 else for(const target of hits){damage?.(actor,target,Math.max(1,Math.round(a.power*power)));if(a.type==='frost'&&target.hp>0)target.slow=Math.max(target.slow,a.duration)}
 effect(sim,actor,hits[0],a);voice?.(actor,'attack');return true;
}
function ai(sim,actor,opponents,callbacks){if(actor.hp<=0)return false;for(let i=0;i<2;i++){
 const a=actor.abilities[i];if(!a||ready(actor,i))continue;
 if(a.type==='heal'&&actor.hp>actor.s.hp*.6)continue;
 if(a.type==='shield'&&!opponents.some(t=>t.hp>0&&dist(actor,t)<150))continue;
 if(cast(sim,actor,i,opponents,callbacks))return true;
 }return false}
function tickFx(sim,dt){for(const e of sim.fx||[])e.life-=dt;sim.fx=(sim.fx||[]).filter(e=>e.life>0)}
function drawFx(g,sim){for(const e of sim.fx||[]){const t=1-e.life/e.total;g.save();g.globalAlpha=Math.min(1,e.life*.0+.9)*(1-t*.55);g.strokeStyle=e.color;g.fillStyle=e.color;g.lineWidth=2.5;
 if(e.type==='fireball'){const x=e.x+(e.tx-e.x)*t,y=e.y+(e.ty-e.y)*t-24;g.beginPath();g.moveTo(e.x,e.y-24);g.lineTo(x,y);g.stroke();g.beginPath();g.arc(x,y,7,0,Math.PI*2);g.fill()}
 else{const r=e.type==='shield'||e.type==='heal'?28:e.r*(.35+t*.65);g.beginPath();g.ellipse(e.x,e.y,r,Math.max(9,r*.62),0,0,Math.PI*2);g.stroke();g.globalAlpha*=.14;g.fill()}
 g.restore()}}
const escape=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function editorHtml(raw,slot,lv){const a=cleanSlots(raw.abilities)[slot],type=TYPES[a.type],r=(k,title,min,max,step)=>'<label>'+title+' <output data-ability-out="'+k+'">'+a[k]+'</output><input type="range" data-ability-field="'+k+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+a[k]+'"></label>';
 return '<h3>ABILITY FORGE · SPOSOBNOSTI</h3><div class="ccAbilitySlots">'+[0,1].map(i=>{const x=cleanSlots(raw.abilities)[i];return '<button data-ability-slot="'+i+'" aria-pressed="'+(slot===i)+'"><b>'+TYPES[x.type].icon+' SLOT '+(i+1)+'</b><small>'+escape(label(x))+'</small></button>'}).join('')+'</div><div class="ccNumbers ccAbilityHint"><b style="color:'+type.color+'">'+type.icon+' '+escape(label(a))+'</b><br>'+type.hint+'</div><div class="ccGrid"><label class="ccFull">Vrsta<select data-ability-field="type">'+Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'"'+(a.type===k?' selected':'')+'>'+v.icon+' '+v.label+'</option>').join('')+'</select></label>'+ (a.type==='none'?'<p class="ccFull">Izaberi vrstu magije da otključaš podešavanja.</p>':'<label class="ccFull">Ime sposobnosti<input maxlength="22" data-ability-field="name" value="'+escape(a.name)+'" placeholder="'+type.label+'"></label>'+r('mana','Potrošnja mane',5,65,1)+r('cooldown','Cooldown (s)',2,30,.5)+r('power',a.type==='heal'?'Vraćeni HP %':a.type==='shield'?'Zaštita %':'Šteta',5,a.type==='heal'?70:a.type==='shield'?65:100,1)+(['heal','shield'].includes(a.type)?'':r('range','Domet / radijus',45,a.type==='whirlwind'?150:320,5))+(['frost','shield'].includes(a.type)?r('duration','Trajanje (s)',1,6,.5):'')+r('unlock','Otključava se na nivou',1,100,1))+'</div><div class="ccNumbers">Nivo testa '+lv+' · '+(a.type==='none'?'Prazan slot':a.unlock<=lv?'Sposobnost dostupna':'Zaključana do nivoa '+a.unlock)+'</div><p>Mana i regeneracija podešavaju se u Statistike. Protivnik koristi iste sposobnosti prema situaciji. Bez pravih nagrada u solo testu.</p><div class="ccRow"><button data-action="asHero">▶ Test kao heroj</button><button data-action="asEnemy">⚔ Test kao protivnik</button></div>';
}
function changeSlot(raw,slot,k,v){const slots=cleanSlots(raw);if(k==='type'){slots[slot]=cleanOne({type:v})}else slots[slot]=cleanOne({...slots[slot],[k]:v});return slots}
function hud(el,p){if(!el||!p)return;for(let i=0;i<2;i++){const b=el.querySelector('[data-cast="'+i+'"]'),a=p.abilities[i],reason=ready(p,i);if(!b)continue;const text=TYPES[a.type].icon+' '+label(a),sub=reason||a.mana+' MP';if(b.firstElementChild.textContent!==text)b.firstElementChild.textContent=text;if(b.lastElementChild.textContent!==sub)b.lastElementChild.textContent=sub;b.disabled=!!reason;b.style.setProperty('--skill',TYPES[a.type].color);b.hidden=a.type==='none'}el.hidden=p.abilities.every(a=>a.type==='none')}
window.NS173_ABILITIES={TYPES,cleanOne,cleanSlots,changeSlot,editorHtml,init,tick,levelUp,ready,cast,ai,tickFx,drawFx,hud,manaMax};
})();