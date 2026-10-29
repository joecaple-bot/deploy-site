const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const map=fs.readFileSync(require('node:path').join(__dirname,'..','map.html'),'utf8');
const sql=fs.readFileSync(require('node:path').join(__dirname,'..','phase2_discord_auth_setup.sql'),'utf8');

test('relay packets require an exact campaign scope',()=>{
 assert.match(map,/if\(msg\.campaignId!==CLOUD_CAMPAIGN_ID\) return;/);
 assert.doesNotMatch(map,/if\(msg\.campaignId && msg\.campaignId!==CLOUD_CAMPAIGN_ID\)/);
});
test('cloud writes surface failures and uploaded maps use the asset row',()=>{
 assert.match(map,/const \{error\}=await cloudClient\.from\(CLOUD_TABLE\)\.upsert/);
 assert.match(map,/Cloud save failed - local copy retained/);
 assert.match(map,/const CLOUD_STORE_UPLOADED_MAP_ASSETS = true/);
 assert.match(map,/const \{error\}=await cloudClient\.from\(CLOUD_ASSETS_TABLE\)\.upsert/);
});
test('campaign membership cannot self-promote a member to DM',()=>{
 assert.match(sql,/for insert to authenticated\s+with check \(auth\.uid\(\) = user_id and role = 'player'\)/);
 assert.doesNotMatch(sql,/on public\.campaign_members for all/);
 assert.match(sql,/Campaign members read state/);
});
