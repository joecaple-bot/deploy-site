/* Local vector emblems projected onto animated miniature surfaces. */
(function(root){
const shapes=['circle','square','triangle','diamond','star','stripe','ring','heart'];
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
const presets=[
 {id:'guild-star',name:'Guild star',layers:[{shape:'ring',color:'#e9c879',scale:.72},{shape:'star',color:'#8f2430',scale:.5},{shape:'circle',color:'#f3dfaa',scale:.13}]},
 {id:'warpaint-slashes',name:'Warpaint slashes',layers:[{shape:'stripe',color:'#7f2028',scale:.72,rotation:-24,y:.39},{shape:'stripe',color:'#d8b56c',scale:.72,rotation:-24,y:.61}]},
 {id:'rune-eye',name:'Rune eye',layers:[{shape:'diamond',color:'#d8b56c',scale:.72,stretchY:.55},{shape:'diamond',color:'#263947',scale:.49,stretchY:.42},{shape:'circle',color:'#8dc9cb',scale:.17}]},
 {id:'shield-heart',name:'Shield heart',layers:[{shape:'diamond',color:'#344f68',scale:.74,stretchY:1.18},{shape:'heart',color:'#e9c879',scale:.45,y:.48}]},
 {id:'crossed-runes',name:'Crossed runes',layers:[{shape:'stripe',color:'#dfd5bd',scale:.72,stretchY:.55,rotation:45},{shape:'stripe',color:'#dfd5bd',scale:.72,stretchY:.55,rotation:-45},{shape:'ring',color:'#8f2430',scale:.26}]}
];
function sanitize(raw){
 const ids=new Set();return (Array.isArray(raw)?raw:[]).slice(0,6).filter(d=>d&&typeof d==='object').map((d,i)=>{
 let id=typeof d.id==='string'?d.id.slice(0,64):'decal-'+i;while(ids.has(id))id+='x';ids.add(id);
 const vector=(v,f)=>Array.isArray(v)&&v.length===3?v.map((n,i)=>clamp(n,-5,5,f[i])):f.slice();
 const normal=vector(d.normal,[0,0,1]),length=Math.hypot(...normal);if(length<.001)normal.splice(0,3,0,0,1);else normal.forEach((n,i)=>normal[i]=n/length);
 return {id,name:String(d.name||'Emblem').slice(0,40),target:/^(torso|head|muzzle|breastplate|cloak|arm-left|arm-right|leg-left|leg-right|shield-\d+)$/.test(d.target)?d.target:'torso',point:vector(d.point,[0,0,.28]),normal,size:clamp(d.size,.1,1.2,.45),rotation:clamp(d.rotation,-180,180,0),layers:(Array.isArray(d.layers)?d.layers:[]).slice(0,16).filter(l=>l&&typeof l==='object').map(l=>({shape:shapes.includes(l.shape)?l.shape:'circle',color:/^#[0-9a-f]{6}$/i.test(l.color)?l.color:'#e9c879',x:clamp(l.x,0,1,.5),y:clamp(l.y,0,1,.5),scale:clamp(l.scale,.05,1.5,.65),stretchX:clamp(l.stretchX,.25,4,1),stretchY:clamp(l.stretchY,.25,4,1),mirrorX:l.mirrorX===true,mirrorY:l.mirrorY===true,rotation:clamp(l.rotation,-180,180,0),opacity:clamp(l.opacity,0,1,1)}))};
 });
}
function paint(ctx,layers,size=256){
 ctx.clearRect(0,0,size,size);
 const clean=sanitize([{layers}])[0].layers;
 for(const l of clean){ctx.save();ctx.translate(l.x*size,l.y*size);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.scale*size*l.stretchX*(l.mirrorX?-1:1),l.scale*size*l.stretchY*(l.mirrorY?-1:1));ctx.globalAlpha=l.opacity;ctx.fillStyle=l.color;ctx.strokeStyle=l.color;ctx.lineWidth=.10;ctx.beginPath();
 if(l.shape==='circle'||l.shape==='ring')ctx.arc(0,0,.5,0,Math.PI*2);
 else if(l.shape==='square')ctx.rect(-.5,-.5,1,1);
 else if(l.shape==='stripe')ctx.rect(-.5,-.12,1,.24);
 else if(l.shape==='heart'){ctx.moveTo(0,.48);ctx.bezierCurveTo(-.85,-.08,-.35,-.73,0,-.29);ctx.bezierCurveTo(.35,-.73,.85,-.08,0,.48);}
 else {const count=l.shape==='star'?10:l.shape==='triangle'?3:4;for(let i=0;i<count;i++){const r=l.shape==='star'&&i%2?.22:.5,angle=-Math.PI/2+i*2*Math.PI/count;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();}
 if(l.shape==='ring')ctx.stroke();else ctx.fill();ctx.restore();}
}
function clonePreset(id){const preset=presets.find(p=>p.id===id)||presets[0];return JSON.parse(JSON.stringify(preset));}
function tangentBasis(normal){
 const n=Array.isArray(normal)?normal.map(Number):[0,0,1],len=Math.hypot(n[0],n[1],n[2]);if(!Number.isFinite(len)||len<.001)return {right:[1,0,0],up:[0,1,0]};
 n[0]/=len;n[1]/=len;n[2]/=len;const seed=Math.abs(n[1])>.95?[1,0,0]:[0,1,0];
 const right=[seed[1]*n[2]-seed[2]*n[1],seed[2]*n[0]-seed[0]*n[2],seed[0]*n[1]-seed[1]*n[0]],rlen=Math.hypot(...right);right.forEach((v,i)=>right[i]=v/rlen);
 return {right,up:[n[1]*right[2]-n[2]*right[1],n[2]*right[0]-n[0]*right[2],n[0]*right[1]-n[1]*right[0]]};
}
function nudge(decal,direction,step=.025){const clean=sanitize([decal])[0];if(!clean)return null;const basis=tangentBasis(clean.normal),axis=direction==='left'||direction==='right'?basis.right:basis.up,sign=direction==='left'||direction==='down'?-1:1,amount=clamp(step,.001,.25,.025)*sign;clean.point=clean.point.map((v,i)=>clamp(v+axis[i]*amount,-5,5,v));return clean;}
function project(T,geometry,decal){
 // Clip the source triangles in a tangent-aligned volume, preserving surface shape.
 const converted=geometry.isGeometry?new T.BufferGeometry().fromGeometry(geometry):null;geometry=converted||geometry;
 const origin=new T.Vector3(...decal.point),normal=new T.Vector3(...decal.normal).normalize();
 const tangent=new T.Vector3(0,1,0);if(Math.abs(tangent.dot(normal))>.95)tangent.set(1,0,0);
 const right=tangent.cross(normal).normalize(),up=new T.Vector3().crossVectors(normal,right).normalize();
 const angle=decal.rotation*Math.PI/180,u=right.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up,Math.sin(angle)),v=up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(right,-Math.sin(angle));
 const pos=geometry.attributes.position,idx=geometry.index,positions=[],uvs=[],half=decal.size/2,depth=.12;
 function coords(p){const q=p.clone().sub(origin);return [q.dot(u),q.dot(v),q.dot(normal)];}
 function clip(poly,axis,sign,limit){const out=[];for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],da=coords(a)[axis]*sign-limit,db=coords(b)[axis]*sign-limit;if(da<=0)out.push(a);if((da<=0)!==(db<=0))out.push(a.clone().lerp(b,da/(da-db)));}return out;}
 for(let i=0;i<(idx?idx.count:pos.count);i+=3){let poly=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,idx?idx.getX(i+j):i+j));const face=new T.Vector3().subVectors(poly[1],poly[0]).cross(new T.Vector3().subVectors(poly[2],poly[0])).normalize();if(face.dot(normal)<.15)continue;
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1])poly=clip(poly,axis,sign,axis===2?depth:half);
 for(let j=1;j<poly.length-1;j++)for(const p of [poly[0],poly[j],poly[j+1]]){const c=coords(p);positions.push(p.x,p.y,p.z);uvs.push(c[0]/decal.size+.5,c[1]/decal.size+.5);}
 }
 const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));result.computeVertexNormals();converted?.dispose();return result;
}
function apply(T,g,raw){
 if(typeof document==='undefined')return;
 const surfaces={};g.traverse(o=>{if(o.userData.decalSurface)surfaces[o.userData.decalSurface]=o;});
 for(const [i,d] of sanitize(raw).entries()){const target=surfaces[d.target];if(!target||!d.layers.length)continue;const geo=project(T,target.geometry,d);if(!geo.attributes.position.count){geo.dispose();continue;}
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;paint(canvas.getContext('2d'),d.layers);const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
 const mat=new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2-i,polygonOffsetUnits:-2-i,roughness:.85});
 const mesh=new T.Mesh(geo,mat);mesh.name='Decal: '+d.name;mesh.renderOrder=10+i;mesh.userData.miniatureDecal=true;target.add(mesh);}
}
root.MiniatureDecals={shapes,presets,clonePreset,sanitize,paint,tangentBasis,nudge,project,apply};if(typeof module==='object'&&module.exports)module.exports=root.MiniatureDecals;
})(typeof window==='object'?window:globalThis);
