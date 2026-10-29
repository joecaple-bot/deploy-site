const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','map.html'),'utf8');
test('reconnect queue expires stale packets and coalesces replaceable state',()=>{
 assert.match(source,/RECONNECT_QUEUE_TTL_MS=15000/);
 assert.match(source,/pendingMsgs=pendingMsgs\.filter\(raw=>\{try\{return queueKey\(JSON\.parse\(raw\)\)!==key/);
 assert.match(source,/Number\(JSON\.parse\(raw\)\.sentAt\|\|0\)>=cutoff/);
});
test('remote state packets reject out-of-order sequence numbers',()=>{
 assert.match(source,/lastRemoteSeq\[msg\.from\]/);
 assert.match(source,/Number\(msg\.seq\)<=previous/);
 assert.match(source,/lastRemoteSeq\[msg\.from\]=Number\(msg\.seq\)/);
});
