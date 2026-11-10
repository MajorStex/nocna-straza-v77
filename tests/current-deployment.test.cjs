'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const folder=path.join(__dirname,'../public');
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const title=html.match(/<title>Night Watch v(\d+)\b/);
const menu=html.match(/id="ns102MenuVersion"[^>]*>[^<]*VERZIJA V(\d+)\b/);
assert.ok(title, 'HTML title must contain the actual release version');
assert.ok(menu, 'Home menu must contain the actual release version');
assert.equal(menu[1],title[1],'Menu and browser tab must advertise the same release');
assert.ok(Number(title[1])>=130,'Old V69/V74/V129 artifacts may not replace current production');
assert.match(html,/id="ns129VersionBadge"/,'Small in-game version badge must be present');
assert.match(html,/const NS129_BUILD=\(\/\\bNight Watch v/,'Badge derives its number from document title');
assert.match(html,/pointer-events:none;user-select:none/,'Badge must not steal touch inputs');
assert.match(html,/body:has\(#ns109Village:not\(\.ns109Hidden\)\) #ns129VersionBadge/,'Badge must remain visible in Village');
assert.match(html,/const link=location\.origin\+location\.pathname\+'\?join='\+encodeURIComponent\(code\)/,'Room invites use the same game URL that player opened');
for(const name of ['firebase-config.js','v115-village.js','auth-v82.js']){
 assert.ok(fs.statSync(path.join(folder,name)).size>100,'Missing required runtime file '+name);
}
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
 .filter(m=>!/\bsrc=/.test(m[1]));
assert.equal(scripts.length,4,'Unexpected number of inline scripts');
for(const [i,m] of scripts.entries())assert.doesNotThrow(()=>new Function(m[2]),'Inline JS syntax error '+i);
const headers=fs.readFileSync(path.join(folder,'_headers'),'utf8');
assert.match(headers,/\/\s*\n\s*Cache-Control: no-cache, max-age=0, must-revalidate/,'Mobile bookmark must revalidate HTML');
console.log('PASS current release '+title[1]+': title, menu, watermark, share links, files, JavaScript syntax and no-cache HTML');
