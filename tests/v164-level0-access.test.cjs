'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const client=fs.readFileSync(path.join(root,'v140-net-mode.js'),'utf8');
const release=Number(html.match(/name="ns-release" content="(\d+)"/)?.[1]);assert(release>=166,'release marker');assert.equal(Number(html.match(/<title>Night Watch v(\d+)/)?.[1]),release,'title release');assert.equal(Number(html.match(/id="ns102MenuVersion"[^>]*>[^<]*VERZIJA V(\d+)/)?.[1]),release,'menu release');assert.equal(Number(html.match(/v140-net-mode\.js\?v=(\d+)&amp;release=\d+/)?.[1]),release,'arena asset release');assert.equal(Number(html.match(/v140-net-mode\.js\?v=\d+&amp;release=(\d+)/)?.[1]),release,'arena cache marker');
assert.match(html,/const NS140_TEMP_UNLOCK_LEVEL=0/);
assert.match(client,/const NS140_TEMP_UNLOCK_LEVEL=0/);
assert.match(html,/PRIVREMENO OTKLJUČANO ZA SVE \(NIVO 0\+\)/);
assert.match(html,/<option value="arena140">NOVA ZONA · SOLO \+ MP · OTKLJUČANO OD NIVO 0 \(TEST\)<\/option>/);
assert.match(html,/\['arena140','NOVA ZONA',NS140_TEMP_UNLOCK_LEVEL\]/);
assert.match(html,/\['arena140','NOVA ZONA'[^\n]*,NS140_TEMP_UNLOCK_LEVEL\]/);
assert.match(html,/roster\.every\(p=>Number\(p\.level\)>=NS140_TEMP_UNLOCK_LEVEL\)/);
assert.match(html,/latest\.some\(p=>Number\(p\.level\)<NS140_TEMP_UNLOCK_LEVEL\)/);
assert.match(html,/roster\.some\(p=>Number\(p\.level\)<NS140_TEMP_UNLOCK_LEVEL\)/);
assert.match(html,/next==='arena140'&&currentProfileLevel\(\)<NS140_TEMP_UNLOCK_LEVEL/);
assert.match(html,/selectedMode==='arena140'&&currentProfileLevel\(\)<NS140_TEMP_UNLOCK_LEVEL/);
assert.match(client,/currentProfileLevel\?\.\(\)<NS140_TEMP_UNLOCK_LEVEL/);
assert.doesNotMatch(html,/arena140'&&currentProfileLevel\(\)<7|p\.level\)\s*[<>]=?7/);
assert.doesNotMatch(client,/currentProfileLevel\?\.\(\)<7/);
for(const [a,b] of [['normal',1],['night',3],['rush',8],['future',20]]){
 const pattern=new RegExp("\\['"+a+"','[^']+',[^\\n]*?,"+b+"\\]");
 assert.match(html,pattern,'Do not accidentally unlock original '+a+' mode');
}
assert.match(html,/selectedMode==='night'&&currentProfileLevel\(\)<3/);
assert.match(html,/selectedMode==='rush'&&currentProfileLevel\(\)<8/);
assert.match(html,/next==='night'&&currentProfileLevel\(\)<3/);
assert.match(html,/next==='rush'&&currentProfileLevel\(\)<8/);
new Function(client);
for(const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))
 if(!/\bsrc=/.test(tag[1]))new Function(tag[2]);
console.log('V164 ACCESS PASS: levels 0-6 can select SOLO and MULTIPLAYER New Zone, guest connect, READY and auto-start; other modes unchanged');
