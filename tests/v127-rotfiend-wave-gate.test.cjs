'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
assert.match(src,/VERZIJA V128 · MULTIPLAYER OPTIMIZATION/);
const start=src.indexOf('function addMob(type,x,y,levelOverride)');
const end=src.indexOf('function applyCombatClass(',start);
assert.ok(start>=0&&end>start);
const source=src.slice(start,end);
const make=(wave,mode='play')=>{
 const G={wave,mode,level:1,time:0,nextId:1,relicEnemyHaste:1,mobs:[]};
 const configs={rotfiend:{hp:620,size:1.28,speed:31}};
 const rnd=()=>.5,NSX={applyDifficulty(){}};
 const addMob=new Function('G','configs','rnd','NSX',source+';return addMob')(G,configs,rnd,NSX);
 return{G,addMob};
};
for(const wave of [1,7,10,19,21,29,31]){
 const {G,addMob}=make(wave);
 assert.equal(addMob('rotfiend',1500,1500),null,'early/unapproved wave '+wave);
 assert.equal(G.mobs.length,0,'no illegal mob at wave '+wave);
}
for(const wave of [20,30]){
 const {G,addMob}=make(wave),m=addMob('rotfiend',1500,1500);
 assert.ok(m&&m.type==='rotfiend','Rotfiend must be allowed at wave '+wave);
 assert.equal(G.mobs.length,1);
}
assert.equal(make(20,'menu').addMob('rotfiend',1500,1500),null);
assert.match(src,/if\(G\.wave<20&&G\.mobs\.some\(m=>m\.type==='rotfiend'\)\)G\.mobs=G\.mobs\.filter\(m=>m\.type!=='rotfiend'\)/);
assert.match(src,/if\(NET\.role==='guest'\|\|G\.caveMode\|\|!\[20,30\]\.includes\(G\.wave\)\)return null/);
console.log('V127 Rotfiend spawn eligibility and migration recovery PASS');
