const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../vendor/three.min.js'),D=require('../miniature_decals.js'),M=require('../miniature_editor.js');
test('untrusted decal imports are bounded, finite and detached from input',()=>{
 const raw=Array.from({length:20},()=>({id:'same',target:'constructor',point:[Infinity,2,'bad'],normal:[0,0,0],size:100,layers:Array.from({length:30},()=>({color:'url(evil)',shape:'script',x:9,opacity:-3}))}));
 const result=D.sanitize(raw);assert.equal(result.length,6);assert.equal(new Set(result.map(d=>d.id)).size,6);
 for(const d of result){assert.equal(d.target,'torso');assert.equal(d.size,1.2);assert.equal(d.layers.length,16);assert(d.point.every(Number.isFinite));assert.deepEqual(d.normal,[0,0,1]);assert.equal(d.layers[0].opacity,0);assert.equal(d.layers[0].color,'#e9c879');}result[0].point[1]=0;assert.equal(raw[0].point[1],2);
});
test('projection stays on the selected face and clips UVs to the emblem bounds',()=>{
 const box=new T.BoxGeometry(1,1,1),decal=D.sanitize([{point:[0,0,.5],normal:[0,0,1],size:.6,rotation:35}])[0],geo=D.project(T,box,decal);
 assert(geo.attributes.position.count>0);for(let i=0;i<geo.attributes.position.count;i++){assert(Math.abs(geo.attributes.position.getZ(i)-.5)<1e-6);assert(geo.attributes.uv.getX(i)>=-1e-6&&geo.attributes.uv.getX(i)<=1.000001);assert(geo.attributes.uv.getY(i)>=-1e-6&&geo.attributes.uv.getY(i)<=1.000001);}
 const back=D.project(T,box,{...decal,point:[0,0,-.5],normal:[0,0,-1]});assert(back.attributes.position.count>0);for(let i=0;i<back.attributes.position.count;i++)assert(Math.abs(back.attributes.position.getZ(i)+.5)<1e-6);
 geo.dispose();back.dispose();box.dispose();
});
test('decal surfaces remain stable across hairstyle and accessory changes and follow limbs',()=>{
 const base={race:'Elf',miniature:{hair:'Bald'}},fancy={race:'Elf',miniature:{hair:'Twin braids',pack:'Expedition pack',shield:'Kite'}},g=M.build(T,base),h=M.build(T,fancy);
 for(const id of ['torso','head','arm-left','arm-right','leg-left','leg-right']){let a,b;g.traverse(o=>{if(o.userData.decalSurface===id)a=o;});h.traverse(o=>{if(o.userData.decalSurface===id)b=o;});assert(a&&b,id);assert.equal(a.geometry.vertices.length,b.geometry.vertices.length);if(id==='head')assert.equal(b.parent,h.userData.head);}
 M.poseAnimation(h,'sword',.5);h.updateMatrixWorld(true);h.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));M.dispose(g);M.dispose(h);
});
test('decal canvas materials attach to surfaces and texture resources are disposed',()=>{
 const ctx=new Proxy({},{get:()=>()=>{}}),root={};vm.runInNewContext(fs.readFileSync(require.resolve('../miniature_decals.js'),'utf8'),{window:root,document:{createElement:()=>({getContext:()=>ctx})}});
 const g=M.build(T,{race:'Human'});root.MiniatureDecals.apply(T,g,[{target:'torso',layers:[{shape:'star',color:'#ff0000'}]}]);let decal;g.traverse(o=>{if(o.userData.miniatureDecal)decal=o;});assert(decal);assert.equal(decal.parent.userData.decalSurface,'torso');let disposed=false;decal.material.map.addEventListener('dispose',()=>disposed=true);M.dispose(g);assert(disposed);
});
test('character appearance round trips retain decal designs',()=>{const ch={miniature:{decals:[{name:'Guild crest',layers:[{shape:'star',color:'#abcdef'}]}]}},config=M.config(ch);assert.equal(config.decals[0].name,'Guild crest');assert.deepEqual(M.config(JSON.parse(JSON.stringify({miniature:config}))).decals,config.decals);});
