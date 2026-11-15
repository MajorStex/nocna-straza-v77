'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../public/v140-net-mode.js'),'utf8');
new Function(src);
for(const name of ['ns167Revive','drawArenaDiamonds','reviveHeld','reviveProgress','downedUntil']){
 assert(src.includes(name),name+' must exist in New Zone client');
}
assert.match(src,/serverBuild/);
assert.match(src,/LAB_SERVER_BUILD>=167/,'old production servers must not expose inactive revive controls');
assert.match(src,/hold:1/);
assert.match(src,/hold:0/);
assert.match(src,/if\(wave>=10&&wave%10===0&&spawnList\.length\)/);
assert.match(src,/N\.drops=m\.drops\.slice\(0,64\)/);
console.log('V167 CLIENT PASS: compile, consent-based hold button, 64 drop cap, bounded multi-boss waves and backward compatibility');
