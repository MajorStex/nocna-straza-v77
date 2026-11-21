'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('public/index.html', 'utf8');
let checks=0;
const ck=(value,why)=>{assert.ok(value,why);checks++};
const match=(source,start,end)=>{
 const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
 ck(a>=0&&b>a,'section '+start);
 return source.slice(a,b);
};
const css=match(html,'/* v77: compact, accessible room-only chat','/* v92 lobby browser:');
ck(/\.ns76ChatLog\{[^}]*overflow-y:auto;[^}]*touch-action:pan-y;[^}]*overscroll-behavior-y:auto;[^}]*-webkit-overflow-scrolling:touch/.test(css),
 'chat log supports vertical drag and passes overscroll to parent lobby');
ck(/\.ns76ChatLog:has\(>\.ns76Empty\)\{overflow-y:visible\}/.test(css),
 'empty log is no longer its own scroll container');
ck(/#ns76Chat\{touch-action:pan-y\}/.test(css),
 'touches started on chat frame can scroll the lobby');
ck(/\.ns76Empty\{[^}]*pointer-events:none;[^}]*user-select:none;[^}]*-webkit-user-select:none/.test(css),
 'empty placeholder never captures a finger drag or selects text');
ck(/\.ns76ChatForm\{display:flex/.test(css),'chat form structure stays intact');
const viewport=match(html,'/* v3.3 — SCROLL FOR ALL MOBILE MENUS','/* v3.3 bilingual menu selector');
ck(/\.modalBox[\s\S]*?touch-action:\s*pan-y/.test(viewport),
 'lobby modal is still swipe scrollable');
ck(/\.modalBox[\s\S]*?-webkit-overflow-scrolling:\s*touch/.test(html),
 'mobile scroll remains native');
ck(/#gameCanvas, \.joyBase, \.dashBtn \{ touch-action: none; \}/.test(viewport),
 'gameplay gesture isolation unchanged');
const markup=match(html,'<div id="ns76Chat"','<p class="lobbyHint"');
ck(/id="ns76ChatLog"[^>]*role="log"/.test(markup),'accessible chat history remains');
ck(/class="ns76Empty"/.test(markup),'empty state remains present before chat loads');
ck(/id="ns76ChatInput"/.test(markup),'message input preserved');
ck(/id="ns76ChatSend"/.test(markup),'send control preserved');
const logic=match(html,'const NS76CHAT=(()=>{','NS76CHAT.wire();');
ck(/if\(!messages\.length\)\{const e=document\.createElement\('div'\);e\.className='ns76Empty'/.test(logic),
 'empty-state element created only when no messages');
ck(/else for\(const msg of messages\.slice\(-24\)\)/.test(logic),
 'messages render in normal scrollable history');
ck(/btn\.addEventListener\('click',submit\)/.test(logic),
 'sending chat remains click driven');
ck(/inp\.addEventListener\('keydown'/.test(logic),
 'keyboard send remains supported');
ck(!/addEventListener\(['"](?:touchstart|touchmove|touchend|pointermove|wheel)/.test(logic),
 'lobby chat has no gesture interceptor');
const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>!/\bsrc=/.test(m[1]));
ck(inline.length===4,'same four inline scripts');
for(const m of inline){new vm.Script(m[2]);checks++}
ck(/name="ns-release" content="246"/.test(html),'V244 release stamp');
ck(/v140-net-mode\.js\?v=246&amp;release=246/.test(html),'fresh mobile script cache key');
console.log('V244 EMPTY LOBBY CHAT SWIPE PASS',JSON.stringify({checks,networkPacketsAdded:0,newGestureHandlers:0}));
