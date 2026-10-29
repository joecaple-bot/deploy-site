const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const manager=fs.readFileSync(path.join(__dirname,'..','campaign_manager.html'),'utf8');
const map=fs.readFileSync(path.join(__dirname,'..','map.html'),'utf8');
test('campaign creation records the creator as DM owner with a switchable session',()=>{
 assert.match(manager,/ownerId:stablePlayerId\(\)/);assert.match(manager,/dmEnabled:true/);assert.match(manager,/function toggleDmEnabled/);
});
test('creator can grant additional DM permissions and map enforces the session switch',()=>{
 assert.match(manager,/function grantPermission/);assert.match(manager,/dmPermissions/);
 assert.match(map,/function sessionCanDM/);assert.match(map,/if\(c\.dmEnabled===false\) return false/);
});
