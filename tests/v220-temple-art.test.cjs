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
