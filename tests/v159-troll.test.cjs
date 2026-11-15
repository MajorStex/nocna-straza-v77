'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const dir=path.join(__dirname,'../public');
const original=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const art=fs.readFileSync(path.join(dir,'v159-troll-renderer.js'),'utf8');
const arena=fs.readFileSync(path.join(dir,'v140-net-mode.js'),'utf8');
const goblins=fs.readFileSync(path.join(dir,'v154-goblin-renderer.js'),'utf8');
const take=(s)=>s.slice(s.indexOf('function drawTroll(e,model){'),s.indexOf('\n/* V135:',s.indexOf('function drawTroll(e,model){'))).trim();
const artFrom=art.slice(art.indexOf('function drawTroll(e,model){'),art.indexOf('// END EXACT ORIGINAL LEGACY RENDERER.')).trim();
assert.equal(artFrom,take(original),'Troll must use the EXACT old artwork, not a similar copy');
for(const code of [art,arena,goblins])new Function(code);
assert.match(original,/v159-troll-renderer\.js\?v=159/);
assert.ok(original.indexOf('v159-troll-renderer.js')<original.indexOf('v140-net-mode.js'));
assert.match(goblins,/mob\.type==='troll'/,'do not mistake troll for a goblin');
assert.match(arena,/mob\.type=q\[7\]===1\?'troll':'goblin'/);
assert.match(arena,/const troll=wave===10&&i===0/);
assert.match(arena,/window\.NS159_TROLL\?\.prewarm\(\)/);
(async()=>{
const browser=await chromium.launch({headless:true,
 executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
 args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const viewport of [{width:360,height:780},{width:832,height:394}]){
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({path:path.join(dir,'v159-troll-renderer.js')});
  const data=await page.evaluate(()=>{
   const S=window.NS159_TROLL,sheet=S.prewarm();
   if(!sheet)return {error:'failed to create atlas'};
   const g=document.createElement('canvas');g.width=320;g.height=250;
   const ctx=g.getContext('2d',{willReadFrequently:true});
   const mob={id:1,type:'troll',x:155,y:158,prevX:155,prevY:158,
    animX:149,animY:157,attackTick:5,hitTick:0,maxHp:335,hp:335,facing:1,animDistance:0};
   const visible={left:0,right:320,top:0,bottom:250};
   const shown=S.prepare([mob],{solo:true,alpha:1,visible});
   S.drawOne(ctx,shown[0],{solo:true,tick:7,now:1700,lastState:1500});
   const pixels=ctx.getImageData(0,0,320,250).data;
   let painted=0;for(let n=3;n<pixels.length;n+=4)if(pixels[n]>0)painted++;
   const first=sheet.getContext('2d',{willReadFrequently:true});
   const A=first.getImageData(0,0,120,140).data;
   const B=first.getImageData(9*120,0,120,140).data;
   let different=0;for(let i=0;i<A.length;i+=4)
    if(A[i]!==B[i]||A[i+1]!==B[i+1]||A[i+2]!==B[i+2]||A[i+3]!==B[i+3])different++;
   S.prewarm();
   return {builds:S.builds,atlasPixels:S.atlasPixels,shown:shown.length,painted,different,
    culled:S.prepare([mob],{solo:true,alpha:1,visible:{left:500,right:650,top:500,bottom:650}}).length};
  });
  assert.ok(!data.error,JSON.stringify(data));
  assert.equal(data.builds,1,'cache once even across repeated draws');
  assert.ok(data.atlasPixels<=400000,'mobile atlas memory bounded');
  assert.equal(data.shown,1);
  assert.ok(data.painted>400,'original troll rendered');
  assert.ok(data.different>70,'attack frame is visibly distinct');
  assert.equal(data.culled,0,'offscreen trolls are not painted');
  await page.close();
 }
 console.log('V159 CLIENT PASS: exact original troll art, 22 prebuilt poses, no frame rebuild, mobile portrait/landscape, wave-10 type');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
