const test=require('node:test'),assert=require('node:assert/strict'),D=require('../miniature_decals.js');

test('old decal layers gain safe transform defaults and values stay bounded',()=>{
 const layer=D.sanitize([{layers:[{shape:'star'},{stretchX:99,stretchY:0,mirrorX:1,mirrorY:true}]}])[0].layers;
 assert.deepEqual([layer[0].stretchX,layer[0].stretchY,layer[0].mirrorX,layer[0].mirrorY],[1,1,false,false]);
 assert.deepEqual([layer[1].stretchX,layer[1].stretchY,layer[1].mirrorX,layer[1].mirrorY],[4,.25,false,true]);
});

test('starter presets are layered, useful, and cloned without shared mutations',()=>{
 assert(D.presets.length>=4&&D.presets.length<=6);assert(D.presets.every(p=>p.layers.length>=2));
 const a=D.clonePreset('guild-star'),b=D.clonePreset('guild-star');a.layers[0].color='#000000';assert.notEqual(b.layers[0].color,a.layers[0].color);assert.notEqual(a,D.presets[0]);
});

test('paint applies independent stretch and mirror transforms',()=>{
 const scales=[],ctx=new Proxy({},{get:(target,key)=>key==='scale'?((x,y)=>scales.push([x,y])):(()=>{})});
 D.paint(ctx,[{shape:'square',scale:.5,stretchX:2,stretchY:.5,mirrorX:true}],100);
 assert.deepEqual(scales,[[-100,25]]);
});

test('nudges move in tangent directions, preserve normal, clamp points, and detach input',()=>{
 const source={point:[0,0,.3],normal:[0,0,1],layers:[]},right=D.nudge(source,'right',.05),up=D.nudge(source,'up',.05);
 assert.deepEqual(right.point,[.05,0,.3]);assert.deepEqual(up.point,[0,.05,.3]);assert.deepEqual(right.normal,[0,0,1]);assert.deepEqual(source.point,[0,0,.3]);
 const bounded=D.nudge({point:[5,5,5],normal:[0,0,1],layers:[]},'right',.25);assert(bounded.point.every(v=>v>=-5&&v<=5));
 const basis=D.tangentBasis([1,2,3]);assert(Math.abs(basis.right[0]+2*basis.right[1]+3*basis.right[2])<1e-12);assert(Math.abs(basis.up[0]+2*basis.up[1]+3*basis.up[2])<1e-12);
});
