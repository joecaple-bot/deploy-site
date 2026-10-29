const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','map.html'),'utf8');
test('initiative prompt treats a total of zero as already rolled',()=>{
 assert.match(source,/initiativeRolls\[ch\.id\]==null/);
 assert.doesNotMatch(source,/!initiativeRolls\[ch\.id\]/);
});
test('players cannot reroll initiative or roll it outside combat',()=>{
 assert.match(source,/if\(!combatMode\) return showCritOverlay\('Start combat before rolling initiative'/);
 assert.match(source,/if\(initiativeRolls\[ch\.id\]!=null\) return showCritOverlay/);
});
test('DM initiative changes broadcast immediately to connected players',()=>{
 const roll=source.indexOf("addChatMessage({kind:'initiative',character:'Table',label:'Initiative rolled for combat'});");
 assert(roll>=0);assert.match(source.slice(roll,roll+260),/broadcast\(\{type:'combatState'/);
});
