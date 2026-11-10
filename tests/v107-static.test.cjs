'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const rights=fs.readFileSync(path.join(__dirname,'../RIGHTS_AND_SECURITY.md'),'utf8');
for(const term of ['VERZIJA V124','ns107WaitOverlay','function beginShop(id,kind,seconds=7)','function finishShop(id,kind)',
 'ns107RateAt','NS107_LINK_JOIN','?join=','t:\'shopDone\'','tokenId||found?.[0]',
 'ns106Identity()','NETLAB.markDisconnect(assigned)','sessionIdentity','shop?{id:shop.id','required:107'])
 assert.ok(html.includes(term),'Required marker '+term);
assert.match(rights,/all rights reserved/i);
const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const inline=tags.filter(t=>!/\bsrc\s*=|type=['"]module/i.test(t[1])).map(t=>t[2]).filter(Boolean);
assert.ok(inline.length>0);
for(const [i,source] of inline.entries())assert.doesNotThrow(()=>new vm.Script(source,{filename:'inline-'+i+'.js'}));
console.log('PASS V107: syntax parsed '+inline.length+' JS scripts; invite, shop, timed wait, stable slots, reconnection and rights markers.');
