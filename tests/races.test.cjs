const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../vendor/three.min.js'),R=require('../miniature_races.js');

const races=['Human','Elf','Dwarf','Goblin','Dragonborn','Gnome','Half-Elf','Half-Orc','Halfling','Tiefling','Aasimar','Firbolg','Goliath','Kenku','Kobold','Lizardfolk','Orc','Tabaxi','Triton','Custom'];
function base(){
 const g=new T.Group(),head=new T.Group();head.position.y=2.12;g.add(head);g.userData.head=head;g.userData.walkParts=[];
 for(const side of [-1,1]){const foot=new T.Group();foot.position.set(side*.21,.14,.08);g.add(foot);g.userData.walkParts.push({side,foot});}
 return g;
}
function snapshot(o){const values=[];o.traverse(x=>values.push(...x.position.toArray(),...x.rotation.toArray().slice(0,3),...x.scale.toArray()));return values;}

test('profiles cover all built-in races plus Custom with useful identity metadata',()=>{
 assert.deepEqual(Object.keys(R.profiles),races);
 for(const [name,p] of Object.entries(R.profiles)){
  assert.equal(typeof p.description,'string',name);assert(p.description.length>20,name);
  assert(p.palette.length>=3,name);assert(p.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c)),name);
  assert(p.signatures.length,name);
 }
 assert.deepEqual(R.detailChoices,['Subtle','Classic','Bold']);
});

test('every race and detail level creates finite, animated-safe geometry without mutating config',()=>{
 for(const race of races)for(const raceDetail of R.detailChoices){
  const ch={race,miniature:{raceDetail}},a={skin:R.profiles[race].palette[0],trim:'#d1af68',hairColor:'#49372c',raceDetail},saved=JSON.stringify({ch,a}),g=base();
  const details=R.enhance(T,g,ch,a,{});assert.equal(details.parent,g.userData.head);assert.equal(details.userData.detail,raceDetail);
  g.userData.head.rotation.set(.1,.2,.05);g.updateMatrixWorld(true);
  g.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite),race);if(o.geometry){o.geometry.computeBoundingSphere();assert(Number.isFinite(o.geometry.boundingSphere.radius),race);}});
  assert.equal(JSON.stringify({ch,a}),saved);
 }
});

test('built-in races are visually varied while Custom remains an explicit safe base',()=>{
 const signatures=new Set();
 for(const race of races){const g=base(),details=R.enhance(T,g,{race},{raceDetail:'Classic'},{}),values=snapshot(details);signatures.add(JSON.stringify(values));if(race==='Custom')assert.equal(details.children.length,0);else assert(details.children.length>0,race);}
 assert(signatures.size>=17);
 const unknown=base(),details=R.enhance(T,unknown,{race:'Imported homebrew'},{raceDetail:'Invalid'},{});assert.equal(details.userData.race,'Custom');assert.equal(details.userData.detail,'Classic');assert.equal(details.children.length,0);
 assert.equal(R.enhance(T,new T.Group(),{race:'Human'},{},{}),null);
});
