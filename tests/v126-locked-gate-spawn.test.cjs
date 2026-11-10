'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
assert.match(html,/VERZIJA V126 · GATE SPAWN FIX/);
const start=html.indexOf('function ns126LockedGateSpawn(');
const end=html.indexOf('\nfunction spawnEnemy(',start);
assert.ok(start>=0&&end>start,'isolated gate spawn rule exists');
const makeRule=new Function('props',html.slice(start,end)+';return ns126LockedGateSpawn');
const locked=makeRule([{zone:'cornerGateZone',type:'gate',x:548,y:960}]);
const opened=makeRule([{zone:'cornerGateZone',type:'gateOpen',x:548,y:960}]);
const missing=makeRule([]);
for(const [x,y,r] of [[180,180,15],[500,500,15],[850,850,38],[920,540,21],[540,920,30]]){
 assert.equal(locked(x,y,r),true,'locked compound must reject spawn '+x+','+y);
 assert.equal(opened(x,y,r),false,'open compound must allow spawn '+x+','+y);
 assert.equal(missing(x,y,r),false,'maps without a compound must retain normal spawning');
}
for(const [x,y,r] of [[1250,530,15],[530,1250,15],[1350,1350,38]]){
 assert.equal(locked(x,y,r),false,'outside compound must remain spawnable');
}
const begin=html.indexOf('function spawnEnemy('),rot=html.indexOf('function spawnRotfiend('),boss=html.indexOf('function spawnBoss('),after=html.indexOf('function addDrop(');
assert.ok(html.slice(begin,rot).includes('!ns126LockedGateSpawn(x,y,r)&&canStepClear'),'ordinary enemy spawn guarded');
assert.ok(html.slice(rot,boss).includes('ns126LockedGateSpawn(x,y,r)||!canStepClear'),'rotfiend spawn guarded');
assert.ok(html.slice(boss,after).includes('!ns126LockedGateSpawn(x,y,r)&&canStepClear'),'boss spawn guarded');
for(const m of html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script\\s*>/gi))if(!/\\bsrc=/.test(m[1]))new Function(m[2]);
console.log('V126 locked gate spawn regression PASS');
