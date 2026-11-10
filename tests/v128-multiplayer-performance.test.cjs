'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
assert.match(html,/VERZIJA V129 · BUILD WATERMARK/);
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(x=>!/\bsrc=/.test(x[1]));
for(const m of scripts)new Function(m[2]);
const start=html.indexOf('const NS128_SIM_STEP=1/60;'),end=html.indexOf('function loop(ts){',start);
assert.ok(start>0&&end>start,'60Hz simulation scheduler found');
function clock(){return new Function(html.slice(start,end)+';return ns128SimulationStep;')()}
for(const hz of [30,45,60,90,120,144]){
 const next=clock();let ticks=0,seconds=0;
 for(let i=0;i<hz*10;i++){const dt=Math.min(.035,1/hz),v=next(dt);if(v>0){ticks++;seconds+=v}}
 assert.ok(Math.abs(seconds-10)<.065,'simulation time drift at '+hz+'Hz: '+seconds);
 assert.ok(ticks<=Math.min(60,hz)*10+1,'too much CPU simulation at '+hz+'Hz');
 assert.ok(ticks>=Math.min(60,hz)*10-1,'sim clock slowed at '+hz+'Hz');
}
assert.match(html,/ns77GetPropIndex\(true\)/,'prewarm collision grid before guest READY');
assert.match(html,/ns111PreloadWorld\(\);NET\.worldReady=true/,'world should prewarm before readiness');
const transferStart=html.indexOf('const sendWorldPart=()=>{'),transferEnd=html.indexOf('const beginWorldTransfer=()=>',transferStart);
const transfer=html.slice(transferStart,transferEnd);
assert.ok(transfer.includes('if(backlog>14000)return'),'congestion guard during map transfer');
assert.ok(transfer.includes('backlog>6500?1:2'),'bounded in-flight map chunks');
assert.ok(html.includes('roster.slice(1).some(p=>!NET.worldReadyPlayers.get(p.id))'),'no premature start before all guests load world');
assert.ok(html.includes("NET.ns67LastSnapshot.get(id)"),'existing per-guest snapshot pacing retained');
assert.ok(html.includes('ns79SmoothRemote(m,dt,.21)'), 'guest mob smoothing retained');
console.log('V128 performance QA PASS: 30/45/60/90/120/144Hz simulation, map preload, congestion guard, lobby readiness, interpolation');
