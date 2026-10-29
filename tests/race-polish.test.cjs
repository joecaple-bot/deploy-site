const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../vendor/three.min.js'),R=require('../miniature_races.js'),M=require('../miniature_editor.js');

const builtIns=Object.keys(M.races).filter(r=>r!=='Custom');
function features(model){
 const details=model.userData.head.children.find(o=>o.name.startsWith('Race details:'));
 const meshes=[];model.traverse(o=>{if(o.userData.raceFeature)meshes.push(o);});
 return {details,meshes,names:new Set(meshes.map(o=>o.userData.raceFeature)),regions:new Set(meshes.map(o=>o.userData.raceRegion))};
}

test('all 19 race looks retain finite signature geometry in the combined miniature build',()=>{
 assert.equal(builtIns.length,19);
 for(const race of builtIns){
  const model=M.build(T,{race,miniature:{raceDetail:'Bold',hair:'Bald',headgear:'None',beard:race==='Dwarf'?'Full':'None'}}),f=features(model);
  assert(f.details,race);assert(f.meshes.length,race);assert(f.details.userData.visibleSignatures.length,race);
  assert.deepEqual(new Set([...f.details.userData.visibleSignatures,...f.details.userData.hiddenSignatures]),new Set(R.profiles[race].signatures),race);
  model.updateMatrixWorld(true);for(const mesh of f.meshes){mesh.geometry.computeBoundingBox();assert(mesh.geometry.boundingBox.min.toArray().concat(mesh.geometry.boundingBox.max.toArray()).every(Number.isFinite),race+' '+mesh.userData.raceFeature);}
  M.dispose(model);
 }
});

test('helmet and hood builds suppress covered ornaments and keep details out of the eye strip',()=>{
 const covered=new Set(['brow','forehead','ear','horn','temple']);
 for(const headgear of ['Helmet','Hood'])for(const race of builtIns){
  const model=M.build(T,{race,miniature:{raceDetail:'Bold',hair:'Side swept',headgear,beard:'Full'}}),f=features(model);
  for(const region of f.regions)assert(!covered.has(region),race+' exposes '+region+' through '+headgear);
  for(const mesh of f.meshes){if(mesh.userData.raceRegion==='temple-low')assert(mesh.position.y<=.12,race);if(mesh.userData.raceRegion==='brow')assert(mesh.position.y>=.18,race);}
  M.dispose(model);
 }
});

test('horn bands require bare headwear and dwarf clasps require a claspable beard',()=>{
 for(const race of ['Dragonborn','Tiefling'])for(const headgear of M.choices.headgear){
  const model=M.build(T,{race,miniature:{hair:'Bald',headgear}}),f=features(model);
  assert.equal(f.names.has('Horn bands'),headgear==='None',race+' '+headgear);M.dispose(model);
 }
 for(const beard of M.choices.beard){
  const model=M.build(T,{race:'Dwarf',miniature:{hair:'Bald',headgear:'None',beard}}),f=features(model);
  assert.equal(f.names.has('Beard clasps'),beard==='Full'||beard==='Goatee',beard);M.dispose(model);
 }
});

test('front-fringe styles hide ornamental brows while lower-face identity remains',()=>{
 for(const hair of ['Bob','Pixie','Side swept'])for(const race of ['Human','Dwarf','Goblin','Half-Elf','Half-Orc','Goliath','Kobold','Orc','Triton']){
  const model=M.build(T,{race,miniature:{hair,headgear:'None',beard:'Full'}}),f=features(model);
  assert(!f.regions.has('brow'),race+' '+hair);assert(f.meshes.some(m=>!['brow','forehead'].includes(m.userData.raceRegion)),race+' '+hair);M.dispose(model);
 }
});
