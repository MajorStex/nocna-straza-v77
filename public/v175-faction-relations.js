/* V175: scoped faction relationships. No global mutable game rules.
 * Map/session owns its matrix, each placement selects its faction.
 */
(function(){
'use strict';
if(window.NS175_FACTIONS)return;
const TEAMS={player:'Igrač',enemy:'Neprijatelji',ally:'Saveznici',neutral:'Neutralni',red:'Crvena frakcija',blue:'Plava frakcija'};
const REL={hostile:'Napad',neutral:'Ignoriši',friendly:'Savez'};
const valid=(t,d='enemy')=>Object.hasOwn(TEAMS,t)?t:d;
const defaultRelation=(a,b)=>a===b?'friendly':a==='neutral'||b==='neutral'?'neutral':(a==='player'||a==='ally')&&(b==='player'||b==='ally')?'friendly':a==='enemy'&&(b==='player'||b==='ally')||b==='enemy'&&(a==='player'||a==='ally')?'hostile':'neutral';
const pair=(a,b)=>a<b?a+'|'+b:b+'|'+a;
function clean(raw){const out={};if(raw&&typeof raw==='object')for(const a of Object.keys(TEAMS))for(const b of Object.keys(TEAMS)){if(a===b)continue;const k=pair(a,b),v=raw[k];if(Object.hasOwn(REL,v)&&v!==defaultRelation(a,b))out[k]=v}return out}
function relation(matrix,a,b){a=valid(a);b=valid(b);if(a===b)return 'friendly';const v=matrix?.[pair(a,b)];return Object.hasOwn(REL,v)?v:defaultRelation(a,b)}
function set(matrix,a,b,value){const out=clean(matrix);if(a===b||!Object.hasOwn(TEAMS,a)||!Object.hasOwn(TEAMS,b)||!Object.hasOwn(REL,value))return out;out[pair(a,b)]=value;return clean(out)}
function teams(a,b){return relation(a?.relations||b?.relations,a?.faction,b?.faction)}
function hostile(a,b){if(!a||!b||a===b||b.hp<=0)return false;const r=teams(a,b);return r==='hostile'||r==='neutral'&&a.brain?.retaliate===b}
function markHit(a,b){if(!a||!b||a===b||!b.brain||b.placement?.ai?.reaction==='passive'||teams(a,b)==='friendly')return;b.brain.retaliate=a}
function bind(actor,matrix){actor.relations=matrix;return actor}
function options(group,current){return Object.entries(group).map(([k,v])=>'<option value="'+k+'"'+(current===k?' selected':'')+'>'+v+'</option>').join('')}
function editorHtml(matrix){const ids=Object.keys(TEAMS),rows=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=ids[i],b=ids[j];rows.push('<label class="ccRelationRow"><span>'+TEAMS[a]+' ↔ '+TEAMS[b]+'</span><select data-relation-a="'+a+'" data-relation-b="'+b+'">'+options(REL,relation(matrix,a,b))+'</select></label>')}
return '<details id="ns175Relations"><summary>⚑ Odnosi frakcija</summary><p>Važi samo za ovaj poligon. Odnosi su obostrani; ista frakcija se ne napada. Klasična igra ostaje nepromenjena.</p><div class="ccRelationRows">'+rows.join('')+'</div><div class="ccRow"><button data-action="factionsDefault">Vrati podrazumevano</button></div></details>'}
window.NS175_FACTIONS={TEAMS,REL,valid,defaultRelation,clean,relation,set,hostile,markHit,bind,editorHtml};
})();