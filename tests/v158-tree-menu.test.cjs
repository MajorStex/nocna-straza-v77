'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=path.resolve(__dirname,'../public');
const src=fs.readFileSync(path.join(folder,'v157-arena-scenery.js'),'utf8');
const net=fs.readFileSync(path.join(folder,'v140-net-mode.js'),'utf8');
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const ctx={window:{},Math};
vm.createContext(ctx);vm.runInContext(src,ctx,{timeout:1000});
const S=ctx.window.NS157_SCENERY;
const buildings=[
 {x:275,y:140,w:95,h:92},{x:585,y:330,w:102,h:94},
 {x:435,y:245,w:75,h:84},{x:165,y:350,w:87,h:58},
 {x:790,y:170,w:126,h:104},{x:1120,y:275,w:106,h:110},
 {x:1230,y:650,w:140,h:110},{x:720,y:730,w:116,h:100},
 {x:1005,y:875,w:120,h:90},{x:395,y:785,w:100,h:105},
 {x:1460,y:410,w:110,h:104},{x:1020,y:485,w:94,h:94}
];
const world={w:1680,h:1080,r:14,speed:156,decorSeed:157,obstacles:buildings.slice()};
const visual=S.generate(world),hitboxes=S.colliders(world);
assert.equal(hitboxes.length,visual.length,'every tree/rock has a collision footprint');
assert.ok(hitboxes.filter(o=>o.kind==='tree').length>=25,'tree trunks must be solid');
assert.ok(hitboxes.filter(o=>o.kind==='rock').length>=20,'rocks must also be solid');
for(let i=0;i<visual.length;i++){
 const item=visual[i],h=hitboxes[i];
 assert.equal(h.kind,item.type<3?'tree':'rock');
 assert.ok(h.x<=item.x&&h.x+h.w>=item.x,'collider centered on painted trunk');
 assert.ok(h.y<=item.y&&h.y+h.h>=item.y-(item.type<3?1:4),'collider near visible ground anchor');
 assert.ok(h.w<=32,'canopy must NOT be a giant invisible wall');
}
world.obstacles.push(...hitboxes);
assert.deepEqual(JSON.parse(JSON.stringify(S.generate(world))),JSON.parse(JSON.stringify(visual)),
 'adding colliders must not change the scenery coordinates or desync peers');
const start=net.indexOf('function moveLocal(p,dx,dy){'),end=net.indexOf('function snapshot(m){',start);
assert.ok(start>=0&&end>start,'player physics must remain accessible and authoritative-compatible');
const physics={N:{world},Math,clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
vm.createContext(physics);vm.runInContext(net.slice(start,end),physics,{timeout:1000});
const tree=hitboxes.find(o=>o.kind==='tree');
const centerY=tree.y+tree.h/2;
const hero={x:tree.x-36,y:centerY};
for(let i=0;i<30;i++)physics.moveLocal(hero,6,0);
assert.ok(hero.x<=tree.x-world.r+.001,'hero must not phase through tree even with repeated inputs');
const clear=(x,y)=>world.obstacles.every(o=>{
 const xx=Math.max(o.x,Math.min(x,o.x+o.w)),yy=Math.max(o.y,Math.min(y,o.y+o.h));
 return (x-xx)**2+(y-yy)**2>=world.r**2;
});
assert.ok(clear(hero.x,hero.y),'hero cannot end up embedded in a trunk');
assert.match(net,/id="ns158MenuBtn"/,'touch-visible top menu');
assert.match(net,/id="ns158MenuPause"/,'menu pause action');
assert.match(net,/id="ns158MenuMusic"/,'menu music action');
assert.match(net,/id="ns158MenuSound"/,'menu effects action');
assert.match(net,/id="ns158MenuLeave"/,'menu leave action');
assert.match(net,/o\.kind==='tree'\|\|o\.kind==='rock'/,'decor colliders must not become painted cottages');
assert.ok(html.includes('v140-net-mode.js?v=158')&&html.includes('v157-arena-scenery.js?v=158'),
 'reloaded mobile shortcut must receive new menu and collision assets');
console.log('V158 PASS: '+hitboxes.filter(o=>o.kind==='tree').length+' solid trunks, '+hitboxes.filter(o=>o.kind==='rock').length+' rocks, no pass-through, shared cached layout, visible mobile menu');
