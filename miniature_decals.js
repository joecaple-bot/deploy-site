/* Local vector emblems projected onto animated miniature surfaces. */
(function(root){
const shapes=['circle','square','triangle','diamond','star','stripe','ring','heart'];
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
function sanitize(raw){
 const ids=new Set();return (Array.isArray(raw)?raw:[]).slice(0,6).filter(d=>d&&typeof d==='object').map((d,i)=>{
 let id=typeof d.id==='string'?d.id.slice(0,64):'decal-'+i;while(ids.has(id))id+='x';ids.add(id);
 const vector=(v,f)=>Array.isArray(v)&&v.length===3?v.map((n,i)=>clamp(n,-5,5,f[i])):f.slice();
 const normal=vector(d.normal,[0,0,1]),length=Math.hypot(...normal);if(length<.001)normal.splice(0,3,0,0,1);else normal.forEach((n,i)=>normal[i]=n/length);
 return {id,name:String(d.name||'Emblem').slice(0,40),target:/^(torso|head|muzzle|breastplate|cloak|arm-left|arm-right|leg-left|leg-right|shield-\d+)$/.test(d.target)?d.target:'torso',point:vector(d.point,[0,0,.28]),normal,size:clamp(d.size,.1,1.2,.45),rotation:clamp(d.rotation,-180,180,0),layers:(Array.isArray(d.layers)?d.layers:[]).slice(0,16).filter(l=>l&&typeof l==='object').map(l=>({shape:shapes.includes(l.shape)?l.shape:'circle',color:/^#[0-9a-f]{6}$/i.test(l.color)?l.color:'#e9c879',x:clamp(l.x,0,1,.5),y:clamp(l.y,0,1,.5),scale:clamp(l.scale,.05,1.5,.65),rotation:clamp(l.rotation,-180,180,0),opacity:clamp(l.opacity,0,1,1)}))};
 });
}
function paint(ctx,layers,size=256){
 ctx.clearRect(0,0,size,size);
 for(const l of layers){ctx.save();ctx.translate(l.x*size,l.y*size);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.scale*size,l.scale*size);ctx.globalAlpha=l.opacity;ctx.fillStyle=l.color;ctx.strokeStyle=l.color;ctx.lineWidth=.10;ctx.beginPath();
 if(l.shape==='circle'||l.shape==='ring')ctx.arc(0,0,.5,0,Math.PI*2);
 else if(l.shape==='square')ctx.rect(-.5,-.5,1,1);
 else if(l.shape==='stripe')ctx.rect(-.5,-.12,1,.24);
 else if(l.shape==='heart'){ctx.moveTo(0,.48);ctx.bezierCurveTo(-.85,-.08,-.35,-.73,0,-.29);ctx.bezierCurveTo(.35,-.73,.85,-.08,0,.48);}
 else {const count=l.shape==='star'?10:l.shape==='triangle'?3:4;for(let i=0;i<count;i++){const r=l.shape==='star'&&i%2?.22:.5,angle=-Math.PI/2+i*2*Math.PI/count;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();}
 if(l.shape==='ring')ctx.stroke();else ctx.fill();ctx.restore();}
}
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
root.MiniatureDecals={shapes,sanitize,paint,project,apply};if(typeof module==='object'&&module.exports)module.exports=root.MiniatureDecals;
})(typeof window==='object'?window:globalThis);
