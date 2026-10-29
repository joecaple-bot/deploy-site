const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=fs.readFileSync(path.join(__dirname,'..','gameplay_runtime.js'),'utf8');
test('manual reactions are disabled until a real reaction window exists',()=>{
 assert.match(runtime,/b\.disabled=!!ch\.reactionUsed\|\|!gameplayWindow/);
});
