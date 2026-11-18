import assert from 'node:assert/strict';
import fs from 'node:fs';
const c=fs.readFileSync(new URL('../public/v140-net-mode.js',import.meta.url),'utf8');
const f=new Function(c.slice(c.indexOf('function newRenderBudget('),c.indexOf('let RENDER_Q='))+'return {newRenderBudget,tuneRenderBudget}')();let checks=0;function ck(v){checks++;assert(v)}
for(const cap of [3,1.5,.75]){const q=f.newRenderBudget(cap),dpr=q.dpr;for(let i=0;i<1000;i++){f.tuneRenderBudget(q,i%2?30:60,i%2?34:16,i%2?25:2);ck(q.dpr===dpr&&q.fxLevel===2&&q.changes===0)}}
const g=new Function('N','ARENA_SPELLS','performance','B','let spellSeen=new Map(),spellFx=[];'+c.slice(c.indexOf('function showArenaSpell('),c.indexOf('function requestArenaSpell('))+'return {showArenaSpell,stats:()=>[spellSeen.size,spellFx.length]}')({me:null},Array(8).fill({id:'spell'}),{now:()=>0},()=>({}));
for(let i=0;i<10000;i++){g.showArenaSpell([i,0,100,100,100]);const [seen,fx]=g.stats();ck(seen<=512&&fx<=18)}
console.log('V199 FIXED VISUALS AND MEMORY BOUNDS PASS',JSON.stringify({checks,qualityWindows:3000,events:10000,memoryCaps:g.stats()}));
