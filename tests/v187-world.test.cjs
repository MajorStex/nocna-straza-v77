'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sounds=[],window={__NS110_BRIDGE:{workshopSfx:n=>sounds.push(n)}};vm.runInNewContext(fs.readFileSync('public/v176-scenes.js','utf8'),{window});const S=window.NS176_SCENES;
const props=S.cleanProps([{kind:'barrel',x:145,y:100},{kind:'trap',x:100,y:100},{kind:'portal',x:125,y:125},{kind:'portal',x:600,y:370},{kind:'spawn',x:700,y:100}]);
const a={x:100,y:100,hp:100,s:{hp:100,damage:25},workshopSeat:'p1',mana:20,maxMana:100},sim={sceneBattle:true,paused:false,time:1,props,mobs:[],usedProps:new WeakSet()};
S.triggerTraps(sim,[a]);assert.equal(a.hp,80);S.triggerTraps(sim,[a]);assert.equal(a.hp,80);assert(S.hitProp(sim,a,props[0]));assert(!S.hitProp(sim,a,props[0]));sim.time+=.6;assert(S.hitProp(sim,a,props[0]));sim.time+=.6;assert(S.hitProp(sim,a,props[0]));assert(S.propUsed(sim,props[0]));assert(!S.blocked(props,145,100,9,p=>S.propUsed(sim,p)));assert.equal(S.propMask(sim),3);
const dest=S.portalTarget(sim,a,props[2]);assert(dest&&dest.x===600&&dest.y===400);assert(!S.portalTarget(sim,a,props[2]));assert.equal(S.spawnPoint(sim,[a],12),props[4]);assert(!S.spawnPoint(sim,[a],12));sim.time+=8;assert(!S.spawnPoint(sim,[{...a,x:695,y:100}],12));sim.time+=8;sim.mobs=Array(12).fill({x:200,y:200});assert(!S.spawnPoint(sim,[a],12));
S.playPropSounds(props,0,3,a);S.playPropSounds(props,3,3,a);assert.equal(sounds.length,1);
console.log('V187 WORLD LOGIC PASS',JSON.stringify({trapOnce:true,threeHits:true,cooldown:true,collision:true,pairedPortal:true,spawnDistance:true,spawnLimit:true,audioOnce:true}));
