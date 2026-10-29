const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../vendor/three.min.js'),M=require('../miniature_editor.js');

test('hoods tuck every hairstyle without overwriting the saved style',()=>{
 for(const hair of M.choices.hair){
  const character={race:'Tiefling',miniature:{hair,headgear:'Hood'}};
  const before=JSON.stringify(character),model=M.build(T,character),pieces=[];
  model.traverse(o=>{if(o.userData.hairPiece)pieces.push(o);});
  assert.equal(pieces.length,0,hair);assert.equal(JSON.stringify(character),before);
  M.dispose(model);character.miniature.headgear='None';
  const uncovered=M.build(T,character),restored=[];
  uncovered.traverse(o=>{if(o.userData.hairPiece)restored.push(o);});
  assert.equal(restored.length>0,hair!=='Bald',hair);M.dispose(uncovered);
 }
});

test('backpack and bedroll occupy separate vertical space with a cloak',()=>{
 const model=M.build(T,{race:'Human',miniature:{pack:'Expedition pack',bedroll:'Bedroll',cloak:'Long',yaw:0}});
 model.updateMatrixWorld(true);const pack=new T.Box3(),roll=new T.Box3();
 model.traverse(o=>{if(o.userData.backpackPiece&&o.position.z<0)pack.union(new T.Box3().setFromObject(o));if(o.userData.bedrollPiece)roll.union(new T.Box3().setFromObject(o));});
 assert(roll.max.y<pack.min.y,'bedroll must hang beneath pack');M.dispose(model);
});
