'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const dir=path.resolve(__dirname,'../public');
(async()=>{
 const browser=await chromium.launch({headless:true,
 executablePath:['/usr/bin/google-chrome','/usr/bin/chromium','/opt/google/chrome/chrome'].find(fs.existsSync),
 args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const build of [157,159]){
   const page=await browser.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
   await page.setContent('<html><body></body></html>');
   await page.evaluate(()=>{
    window.__NS110_BRIDGE={currentProfileLevel:()=>7,
      NET:{role:'guest',phase:'lobby',localId:'p2'},
      getVillageHeroLook:()=>({name:'p2',weapon:'sword'})};
    window.WebSocket=class{
     constructor(){window.ws=this;this.readyState=0;this.bufferedAmount=0;this.sent=[]}
     send(raw){this.sent.push(JSON.parse(raw))}
     close(code){this.readyState=3;this.onclose?.({code:code||1000})}
     open(){this.readyState=1;this.onopen?.()}
     inject(data){this.onmessage?.({data:JSON.stringify(data)})}
    };
   });
   await page.addScriptTag({path:path.join(dir,'v140-net-mode.js')});
   const data=await page.evaluate(build=>{
    window.NS140_ARENA.acceptOffer({id:'p2',protocol:140,
     match:'0123456789abcdef01234567',ticket:'seat-test'});
    ws.open();ws.inject({t:'welcome',protocol:140,serverBuild:build,world:{
     w:1680,h:1080,r:14,speed:156,obstacles:[]},looks:[]});
    return {phase:window.NS140_ARENA.diagnostics.phase,
     text:document.querySelector('#ns140Status').textContent,
     closeCode:ws.readyState};
   },build);
   if(build===157){
    assert.equal(data.phase,'error','old production server must be rejected');
    assert.match(data.text,/V159 TEST zahteva/);
    assert.equal(data.closeCode,3,'incompatible socket was closed');
   }else{
    assert.equal(data.phase,'waiting','compatible experimental server handshake is accepted');
   }
   await page.close();
  }
  console.log('V159 ISOLATION PASS: production server 157 is rejected without reconnect loop; experimental server 159 accepted');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
