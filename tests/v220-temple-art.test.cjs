'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('public/v140-net-mode.js','utf8');
const start=source.indexOf('const templeArtCache='),end=source.indexOf('function drawExp(',start);
assert(start>=0&&end>start);
const art=source.slice(start,end);
const extract=art+'\nreturn {templeEntranceSprite,templePortalVisible,arenaTemplePortal,drawArenaTempleEntrance};';
assert.match(source,/if\(p.id===1&&!z.id\)continue/);
assert.match(source,/depth:temple.y\+12,kind:9/);
assert.match(source,/item.kind===9\)drawArenaTempleEntrance/);
function verify(make){
 const p={id:1,x:2375,y:2200},z={id:0,portals:[p],key:false},N={solo:true,expedition:z};
 const a=make(N),v={left:2300,right:2500,top:2105,bottom:2250};
 const locked=a.templeEntranceSprite(false),open=a.templeEntranceSprite(true);
 assert.equal(locked.width,288);assert.equal(locked.height,312);
 assert.equal(locked,a.templeEntranceSprite(false));assert.equal(open,a.templeEntranceSprite(true));
 assert.notEqual(locked,open);
 assert.equal(a.arenaTemplePortal(v),p);
 assert.equal(a.arenaTemplePortal({left:0,right:100,top:0,bottom:100}),null);
 assert(a.templePortalVisible(p,{left:2300,right:2500,top:2050,bottom:2100}),'roof remains visible before base enters view');
 N.solo=false;N.expSupported=true;assert.equal(a.arenaTemplePortal(v),p);
 N.expSupported=false;assert.equal(a.arenaTemplePortal(v),null);
 N.solo=true;z.id=1;assert.equal(a.arenaTemplePortal(v),null);
}
let created=0;
const noop=()=>{},ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get(t,k){return k in t?t[k]:noop}});
const document={createElement(){created++;return {width:0,height:0,getContext:()=>ctx}}};
verify(N=>new Function('N','document',extract)(N,document));
assert.equal(created,2,'only two cached sprite canvases');
console.log('V220 temple cache, view culling, portal visibility and depth sort PASS');
// V221: use the actual solo map and movement function, including both sides of the portal.
{
 const fn=name=>{const a=source.indexOf('function '+name+'('),b=source.indexOf('\n',a),line=source.slice(a,b);assert(a>=0);return line.endsWith('}')?line:source.slice(a,source.indexOf('\n}',a)+2)};
 const world=JSON.parse(source.match(/^ N\.world=(\{.*\});$/m)[1]),N={world,solo:true};
 const names=['arenaAcidClear','expInit','installTempleCollider','expPlace','expNear','expParty','expAllowed','expWorld','moveLocal'];
 const f=new Function('N','nearbyObstacles','clamp',names.map(fn).join('\n')+'\nreturn {expInit,installTempleCollider,expPlace,expAllowed,expWorld,moveLocal,arenaAcidClear}')(N,w=>w.obstacles,(v,a,b)=>Math.max(a,Math.min(b,v)));
 const z=f.expInit(world),p=z.portals.find(q=>q.id===1);f.installTempleCollider(world,z);f.installTempleCollider(world,z);
 const o=world.obstacles.find(q=>q.kind==='temple');assert(o);assert.equal(world.obstacles.filter(q=>q.kind==='temple').length,1);assert.deepEqual(f.expInit(world).portals,z.portals);
 for(const radius of [14,22,30,42])for(const [x,y,dx,dy] of [[p.x,p.y+65,0,-5.2],[p.x,p.y-170,0,5.2],[p.x-125,p.y-50,5.2,0],[p.x+125,p.y-50,-5.2,0]]){
  const a={x,y,bodyRadius:radius};for(let i=0;i<100;i++){f.moveLocal(a,dx,dy);const u=a.x-Math.max(o.x,Math.min(a.x,o.x+o.w)),v=a.y-Math.max(o.y,Math.min(a.y,o.y+o.h));assert(u*u+v*v>=radius*radius-1e-7)}
 }
 const players=new Map(Array.from({length:6},(_,i)=>['p'+(i+1),{id:'p'+(i+1),hp:100,online:true}]));
 f.expPlace(players,p,0);for(const a of players.values())assert(f.arenaAcidClear(world,a.x,a.y,a.x,a.y,14));
 assert(!f.expAllowed(z,players,players.get('p1'),1,[]));z.key=true;assert(f.expAllowed(z,players,players.get('p1'),1,[]));
 assert(f.expWorld(world,0).obstacles.includes(o));assert(!f.expWorld(world,1).obstacles.includes(o));
 console.log('V221 solo movement, locked entrance, six safe return seats PASS');
}
if(process.env.NO_BROWSER!=='1') (async()=>{
 const {chromium}=require('playwright-core');
 const bin=['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync);
 if(!bin)throw Error('Chromium is required for actual temple sprite regression');
 const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const result=await page.evaluate(extract=>{
   const p={id:1,x:150,y:150},N={solo:true,expedition:{id:0,portals:[p],key:false}};
   const a=new Function('N',extract)(N),l=a.templeEntranceSprite(false),u=a.templeEntranceSprite(true),same=a.templeEntranceSprite(false)===l;
   const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const aa=pixels(l),bb=pixels(u);let opaque=0,differ=0;for(let i=0;i<aa.length;i+=4){if(aa[i+3])opaque++;if(aa[i]!==bb[i]||aa[i+1]!==bb[i+1]||aa[i+2]!==bb[i+2]||aa[i+3]!==bb[i+3])differ++}
   const display=document.createElement('canvas');display.width=300;display.height=300;a.drawArenaTempleEntrance(display.getContext('2d'),p);
   return {same,opaque,differ,w:l.width,h:l.height,draw:display.getContext('2d').getImageData(150,100,1,1).data[3]};
  },extract);
  assert(result.same&&result.opaque>20000&&result.differ>300&&result.draw>0);
  console.log('V220 REAL CHROMIUM TEMPLE PASS',JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
