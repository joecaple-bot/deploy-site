const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','character_builder.html'),'utf8');
test('builder return path bounds cloud sync and always redirects after local save',()=>{
 const start=source.indexOf('async function goToMap');
 const end=source.indexOf('\nfunction exportSelected',start);
 const fn=source.slice(start,end);
 assert.match(fn,/writeStorage\('Character saved'\)/);
 assert.match(fn,/Promise\.race\(\[promise,new Promise\(resolve=>setTimeout\(resolve,1500\)\)\]\)/);
 assert.match(fn,/finish\(\);/);
});
