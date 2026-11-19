'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('public/v171-character-creator.js','utf8');
const begin=src.indexOf('function workshopRescue('),end=src.indexOf('function workshopState(',begin);
assert(begin>=0&&end>begin);
const test=new Function('sim','A',src.slice(begin,end)+'\nreturn workshopRescue;');
const player=(id,x,y)=>({workshopSeat:id,x,y,hp:100,s:{hp:100},revives:0,downSince:null,cd:0,swing:0});
const p=player('p1',100,100),guests=Array.from({length:5},(_,i)=>player('p'+(i+2),130+i*30,100));
const sim={sceneBattle:true,paused:false,time:10,p,visitors:new Map(guests.map(v=>[v.workshopSeat,v]))};
const rescue=test(sim,()=>({init(a){a.mana=100}}));
for(let n=1;n<=100;n++){const b=guests[0];b.hp=0;b.downSince=sim.time;assert(rescue('p1','revive'));assert.equal(b.revives,n);assert.equal(b.hp,40);assert.equal(b.protectedUntil,sim.time+2);sim.time+=3;}
const b=guests[0];b.hp=0;b.downSince=sim.time;const before=sim.time;assert(rescue('p2','respawn'));assert.equal(sim.time,before);assert.equal(rescue('p2','respawn'),false);assert.equal(p.hp,100);assert.equal(b.hp,100);assert.equal(b.revives,100);
p.hp=0;p.downSince=sim.time;assert(rescue('p2','revive'));assert.equal(p.hp,40);assert.equal(p.revives,1);
const far=guests[4];far.hp=0;far.downSince=sim.time;assert.equal(rescue('p1','revive'),false);
sim.paused=true;assert.equal(rescue('p5','revive'),false);
console.log('V185 SIX SEAT UNLIMITED RESCUE PASS',JSON.stringify({seats:6,repeatRevives:100,hostRevive:true,respawnDelay:0,distance:true,paused:true}));
