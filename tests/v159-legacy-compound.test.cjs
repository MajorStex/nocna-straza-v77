'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'../public');
const original=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const port=fs.readFileSync(path.join(dir,'v159-legacy-compound.js'),'utf8');
const a=original.slice(original.indexOf('function drawFence(p){'),
 original.indexOf('\nfunction drawGuild(p){')).trim();
const b=port.slice(port.indexOf('function drawFence(p){'),
 port.indexOf('// END ORIGINAL artwork.')).trim();
assert.equal(a,b,'original fence, gate and obelisk vector artwork must remain byte-identical');
const source=original.slice(original.indexOf('function ensureClassicCornerGate(target){'),
 original.indexOf('function classicGateShouldExist()',original.indexOf('function ensureClassicCornerGate(target){')));
const lctx={window:{},Math,Map},octx={rnd:()=>.4,Math,Number};
vm.createContext(lctx);vm.createContext(octx);
vm.runInContext(port,lctx,{timeout:2000});
vm.runInContext(source,octx,{timeout:2000});
const mod=lctx.window.NS159_LEGACY_COMPOUND;
const migrate=mod.create(false),legacy=octx.ensureClassicCornerGate([]);
const geom=x=>x.map(o=>[o.type,o.x,o.y,o.r,o.orientation||'',!!o.ns110GateSeal]);
assert.deepEqual(JSON.parse(JSON.stringify(geom(migrate))),JSON.parse(JSON.stringify(geom(legacy))),
 'all original positions and original obstacle sizes are faithfully preserved');
const open=mod.create(true);
assert.equal(open.filter(o=>o.type==='gateOpen').length,1);
assert.equal(migrate.filter(o=>o.type==='gate').length,1);
const solid=mod.colliders(migrate),openSolid=mod.colliders(open);
assert.equal(solid.length-openSolid.length,1,'only the gate stops blocking after unlock');
const blocked=(objects,x,y,r=14)=>objects.some(o=>{
 const px=Math.max(o.x,Math.min(x,o.x+o.w)),py=Math.max(o.y,Math.min(y,o.y+o.h));
 return (x-px)**2+(y-py)**2<r*r;
});
assert.equal(blocked(solid,548,960),true,'closed gate blocks in-world');
assert.equal(blocked(openSolid,548,960),false,'open gate allows crossing');
assert.equal(blocked(openSolid,465,960),true,'left permanent gate seal stays solid');
assert.equal(blocked(openSolid,631,960),true,'right permanent gate seal stays solid');
assert.ok(migrate.length>=55,'map geometry must not be simplified to a few fake blocks');
console.log('V159 ORIGINAL MAP PASS: '+legacy.length+' exact preserved old props, byte-identical original fence/gate/obelisk artwork, permanent gate seals, lock/unlock collisions');
