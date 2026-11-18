// Exercise the actual client watchdog without a DOM or network dependency.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/v140-net-mode.js',import.meta.url),'utf8');
const start=source.indexOf('function arenaNetHealth('),end=source.indexOf('function snapshot(m){',start);assert(start>=0&&end>start);
const N={solo:false,phase:'running',lastState:1,diagRtt:40,arrivalJitter:0,pending:[{seq:1}],delta:{x:10,y:20},reviveHeld:'p2',ws:{readyState:1,close(code){this.calls=(this.calls||0)+1;this.code=code}}};
const f=new Function('N','let spellAim={x:1};'+source.slice(start,end)+'return {arenaNetHealth,arenaNetWatch,getAim:()=>spellAim}')(N);
assert.equal(f.arenaNetWatch(200),'ok');assert.equal(f.arenaNetWatch(600),'unstable');assert.equal(f.arenaNetWatch(3001),'stalled');
assert(N.netStalled&&N.rejoinCorrection&&N.pending.length===0&&N.delta.x===0&&N.reviveHeld===''&&f.getAim()===null);
assert.equal(f.arenaNetWatch(8001),'reconnect');assert(N.ws.calls===1&&N.ws.code===4001&&N.netRecoveries===1);
f.arenaNetWatch(9000);assert.equal(N.ws.calls,1);f.arenaNetWatch(38001);assert.equal(N.ws.calls,2);N.solo=true;assert(f.arenaNetWatch(70000)==='ok'&&N.ws.calls===2);
console.log('V199 watchdog PASS: stall, reconnect, cooldown, solo isolation');
