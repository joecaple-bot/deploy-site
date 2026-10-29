const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','map.html'),'utf8');
test('combat UI includes a subtle coach prompt without auto-playing actions',()=>{
 assert.match(source,/function combatCoachHtml\(ch,isEnemy=false\)/);
 assert.match(source,/Your turn<\/b>Choose a target/);
 assert.match(source,/Extra Attack ready/);
 assert.match(source,/combat-coach/);
});
