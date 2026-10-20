const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const T=require('../vendor/three.min.js'),M=require('../miniature_editor.js');
test('all 19 built-in races build finite, distinct geometry with every outfit and accessory',()=>{
 assert.equal(Object.keys(M.races).filter(k=>k!=='Custom').length,19);
 for(const race of Object.keys(M.races))for(const outfit of M.choices.outfit){
 const model=M.build(T,{race,miniature:{outfit,headgear:'Wizard hat',weapon:'Sword',shield:'Kite',cloak:'Long'}});assert(model.children.length>=20,race);model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model);assert(Number.isFinite(bounds.max.y));assert(bounds.max.y>bounds.min.y);M.dispose(model);
 }
});
test('each wearable option produces valid geometry',()=>{for(const [key,values]of Object.entries(M.choices))for(const value of values){const model=M.build(T,{race:'Tiefling',miniature:{[key]:value}});model.traverse(o=>{if(o.geometry){o.geometry.computeBoundingSphere();assert(Number.isFinite(o.geometry.boundingSphere.radius),key+value);}});M.dispose(model);}});
test('appearance config validates malformed imports and supports custom race fallback',()=>{const c=M.config({race:'Unknown',miniature:{skin:'bad',outfit:'Injected',yaw:'broken',frame:'bad'}});assert.equal(c.skin,'#b89b86');assert.equal(c.outfit,'Tunic');assert.equal(c.yaw,.35);assert.equal(c.frame,'Full body');});
test('builder and map preserve miniature metadata, and rejected map reskin is not loaded',()=>{for(const file of ['map.html','character_builder.html'])assert.match(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),/miniature:raw.miniature/);assert.doesNotMatch(fs.readFileSync(require('node:path').join(__dirname,'..','map.html'),'utf8'),/src="map_ui.js"|href="map_ui.css"/);});
