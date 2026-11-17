/* V176 reusable scene documents; data only, no voices or network. */
(function(){
'use strict';
if(window.NS176_SCENES)return;
const key=()=> 'ns176_scenes_v1_'+String(window.__NS110_BRIDGE?.getActiveAccount?.()?.id||'offline').replace(/[^a-z0-9_-]/gi,'').slice(0,64);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),num=(n,d,a,b)=>Number.isFinite(Number(n))?clamp(Number(n),a,b):d;
function clean(raw,cleanChar,I,F){if(!raw||typeof raw!=='object')return null;
 const id=String(raw.id||'').replace(/[^a-z0-9-]/gi,'').slice(0,64);if(!id)return null;
 const actors=(Array.isArray(raw.actors)?raw.actors:[]).slice(0,12).filter(a=>a&&a.spec&&a.placement).map(a=>{const spec=cleanChar(a.spec),placement=I.cleanPlacement(a.placement,spec,{minX:35,maxX:745,minY:60,maxY:470});if(placement.faction==='player')placement.faction='neutral';return {spec,placement}});
 return {v:1,id,name:String(raw.name||'Nova scena').trim().slice(0,40)||'Nova scena',level:Math.round(num(raw.level,1,1,100)),hero:cleanChar(raw.hero||{}),relations:F.clean(raw.relations),actors};
}
function list(cleanChar,I,F){try{const a=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(a)?a.slice(0,12).map(x=>clean(x,cleanChar,I,F)).filter(Boolean):[]}catch{return []}}
function write(a){try{localStorage.setItem(key(),JSON.stringify(a.slice(0,12)));return true}catch{return false}}
function save(raw,cleanChar,I,F){const a=list(cleanChar,I,F),c=clean(raw,cleanChar,I,F);if(!c)return false;const index=a.findIndex(x=>x.id===c.id);if(index<0){if(a.length>=12)return false;a.push(c)}else a[index]=c;return write(a)}
function remove(id,cleanChar,I,F){return write(list(cleanChar,I,F).filter(x=>x.id!==id))}
function id(){return 'scene-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)}
window.NS176_SCENES={clean,list,save,remove,id};
})();