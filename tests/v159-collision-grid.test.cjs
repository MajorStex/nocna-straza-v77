'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.join(__dirname,'../public/v140-net-mode.js');
const src=fs.readFileSync(file,'utf8');
const from=src.indexOf('function createArenaCollisionGrid(world){');
const to=src.indexOf('\nconst N={',from);
assert.ok(from>0&&to>from,'client has static spatial grid');
const code=src.slice(from,to);
const sandbox={Math,Map,Uint32Array,Number};vm.createContext(sandbox);
vm.runInContext(code,sandbox,{timeout:3000});
const world={w:1680,h:1080,r:14,obstacles:[
{x:275,y:140,w:95,h:92},{x:585,y:330,w:102,h:94},
{x:435,y:245,w:75,h:84},{x:165,y:350,w:87,h:58},
{x:790,y:170,w:126,h:104},{x:1120,y:275,w:106,h:110},
{x:1230,y:650,w:140,h:110},{x:720,y:730,w:116,h:100},
{x:1005,y:875,w:120,h:90},{x:395,y:785,w:100,h:105},
{x:1460,y:410,w:110,h:104},{x:1020,y:485,w:94,h:94}
],decorSeed:157};
const decoration=fs.readFileSync(path.join(__dirname,'../public/v157-arena-scenery.js'),'utf8');
const sc={window:{},Math};vm.createContext(sc);
vm.runInContext(decoration,sc,{timeout:3000});
world.obstacles.push(...sc.window.NS157_SCENERY.colliders(world));
const grid=sandbox.createArenaCollisionGrid(world);
assert.equal(world.obstacles.length,65);
const reference=(x,y,r)=>world.obstacles.every(o=>{
 const qx=Math.max(o.x,Math.min(x,o.x+o.w)),qy=Math.max(o.y,Math.min(y,o.y+o.h));
 return (x-qx)**2+(y-qy)**2>=r*r;
});
let checked=0;
for(const r of [14,22,37])for(let y=-20;y<=1100;y+=8)for(let x=-20;x<=1700;x+=8){
 assert.equal(grid.free(x,y,r),reference(x,y,r),'exact collision at '+x+','+y+' r='+r);
 checked++;
}
// Normal 14px player path, including near edges, is not altered by indexing.
const move=(p,dx,dy,test)=>{
 const x=Math.max(14,Math.min(world.w-14,p.x+dx));
 if(test(x,p.y,14))p.x=x;
 const y=Math.max(14,Math.min(world.h-14,p.y+dy));
 if(test(p.x,y,14))p.y=y;
};
const fast={x:130,y:250},slow={...fast};
for(let n=0;n<15000;n++){
 const dx=Math.sin(n*.19)*4.8,dy=Math.cos(n*.13)*4.8;
 move(fast,dx,dy,(x,y,r)=>grid.free(x,y,r));
 move(slow,dx,dy,reference);
 assert.ok(Math.abs(fast.x-slow.x)<1e-8&&Math.abs(fast.y-slow.y)<1e-8,
  'indexed movement drifted from legacy physics step '+n);
}
const {calls,candidates}=grid.counts;
assert.ok(candidates/calls<2.2,'too many collision candidates: '+(candidates/calls));
assert.ok(grid.cells>75,'most world cells should be populated');
console.log('V159 COLLISION GRID PASS: '+checked.toLocaleString('en-US')+
 ' exact points across three radii, 15k identical player steps, '+world.obstacles.length+
 ' obstacles, '+grid.cells+' spatial cells, '+(candidates/calls).toFixed(2)+
 ' nearby candidates/query (not full '+world.obstacles.length+')');
