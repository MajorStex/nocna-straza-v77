'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const {chromium}=require('playwright-core');
 const browser=await chromium.launch({headless:true,
  executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const pages=[];
 try{
  const examine=async(myId,color,remoteId,remoteColor)=>{
   const page=await browser.newPage({viewport:{width:380,height:840},isMobile:true,hasTouch:true});pages.push(page);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../public/index.html'),{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__NS110_BRIDGE?.drawVillageHero,{timeout:15000});
   const values=await page.evaluate(({myId,color,remoteId,remoteColor})=>{
    // Simulate different local profiles/equipped cosmetics on the two phones.
    const net=window.__NS110_BRIDGE.NET;net.role=myId==='p1'?'host':'guest';net.localId=myId;
    window.NS109_SPARTA=window.NS109_SPARTA||{};
    window.NS109_SPARTA.appearance=(source,e)=>{
     if(e.id!==myId)return source;
     return {...source,accent:color,wardrobe:{...source.wardrobe,topColor:color,torso:color}};
    };
    const base=window.__nightWatch.networkHeroStyle(window.__nightWatch.FACTORY_HERO);
    const red={...base,name:'CRVENI',skin:'#d8967a',accent:'#e93c26',
     wardrobe:{...base.wardrobe,topColor:'#ed2424',torso:'#c52c2c',leftArm:'#a02727'},
     ns69Sku:null,ns109Sparta:false};
    const blue={...base,name:'PLAVI',skin:'#dabfa2',accent:'#2266e9',
     wardrobe:{...base.wardrobe,topColor:'#254aca',torso:'#223ab5',leftArm:'#2440bb'},
     ns69Sku:null,ns109Sparta:false};
    function picture(look,id){
     const canvas=document.createElement('canvas');canvas.width=220;canvas.height=220;
     const g=canvas.getContext('2d',{willReadFrequently:true});
     const ok=window.__NS110_BRIDGE.drawVillageHero(g,110,145,
      {id,look,netArena:true,walking:true,frame:42,visualSide:1});
     const data=g.getImageData(0,0,220,220).data;
     // Stable digest includes actual drawn pixels, not serialized appearance metadata.
     let hash=2166136261,nonZero=0;
     for(let i=0;i<data.length;i+=4){
      if(data[i+3]>0)nonZero++;
      hash=Math.imul(hash^(data[i]<<16|data[i+1]<<8|data[i+2]),16777619)>>>0;
     }
     return{ok,hash,nonZero};
    }
    return{red:picture(red,'p1'),blue:picture(blue,'p2'),
     remote:picture(remoteId==='p1'?red:blue,remoteId)};
   },{myId,color,remoteId,remoteColor});
   assert.deepEqual(errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x)),[]);
   return values;
  };
  const a=await examine('p1','#ffff00','p2','#254aca');
  const b=await examine('p2','#00ffff','p1','#ed2424');
  assert.ok(a.red.ok&&a.blue.ok&&b.red.ok&&b.blue.ok);
  assert.ok(a.red.nonZero>100&&a.blue.nonZero>100,'rendered pixels are not empty');
  assert.notEqual(a.red.hash,a.blue.hash,'different skins must look different');
  assert.equal(a.blue.hash,b.blue.hash,'p2 blue skin must render identically on host and guest');
  assert.equal(a.red.hash,b.red.hash,'p1 red skin must render identically on host and guest');
  console.log('V155 TWO-PHONE VISUAL PASS: red and blue have distinct pixels and identical remote appearance despite local skin overrides');
 }finally{await Promise.all(pages.map(p=>p.close().catch(()=>{})));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
