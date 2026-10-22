/* Small procedural race details for the miniature builder. No textures or stat changes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.MiniatureRaces=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const profiles={
  Human:{description:'Balanced features with a clean brow and cheek structure.',palette:['#c68e69','#81564d','#49372c'],signatures:['Defined brow','Cheek planes']},
  Elf:{description:'Fine angular features accented by delicate ear jewellery.',palette:['#d9b69b','#d1af68','#7d6b83'],signatures:['Ear cuffs','Temple points']},
  Dwarf:{description:'A sturdy face with a heavy brow and worked beard clasps.',palette:['#b77c58','#5b3b2e','#c39a54'],signatures:['Heavy brow','Beard clasps']},
  Goblin:{description:'Sharp, lively features with a notched brow and small fang.',palette:['#78994d','#405d35','#e3d3a6'],signatures:['Brow notch','Fang']},
  Dragonborn:{description:'Layered facial scales reinforce the draconic muzzle.',palette:['#ac6545','#75402f','#d6b879'],signatures:['Scale plates','Horn bands']},
  Gnome:{description:'A round prominent nose and bright cheek freckles.',palette:['#d4a481','#b96f55','#6f493d'],signatures:['Button nose','Freckles']},
  'Half-Elf':{description:'Soft elven angles marked by subtle temple accents.',palette:['#bb8e70','#8d6254','#c7a66a'],signatures:['Temple accents','Fine brow']},
  'Half-Orc':{description:'A broad lower face with reinforced brow plates.',palette:['#8a9b75','#52634b','#e0d3ad'],signatures:['Brow plates','Jaw studs']},
  Halfling:{description:'Warm rounded cheeks and small tufts over broad feet.',palette:['#c79d7a','#a86455','#6b4935'],signatures:['Round cheeks','Foot tufts']},
  Tiefling:{description:'Ridged temples and metal bands frame infernal horns.',palette:['#ad686c','#713e50','#d2a85e'],signatures:['Temple ridges','Horn bands']},
  Aasimar:{description:'A luminous forehead jewel and tiny celestial motes.',palette:['#d7b98e','#f1d77c','#fff2bd'],signatures:['Forehead jewel','Celestial motes']},
  Firbolg:{description:'A wide gentle nose with contrasting bridge spots.',palette:['#91a4ad','#697d86','#d2b49b'],signatures:['Broad nose','Bridge spots']},
  Goliath:{description:'Stone-like brow studs extend the traditional markings.',palette:['#9b9f9d','#505f69','#c7cbc8'],signatures:['Brow studs','Stone markings']},
  Kenku:{description:'Layered feather tufts frame the base of the beak.',palette:['#39434f','#202832','#71808b'],signatures:['Feather tufts','Beak ridge']},
  Kobold:{description:'Small overlapping scale plates sharpen the muzzle.',palette:['#bc734a','#7a4531','#d0a065'],signatures:['Muzzle scales','Brow scales']},
  Lizardfolk:{description:'Broad jaw scales and throat plates suggest heavy hide.',palette:['#658865','#3f624a','#9ab66b'],signatures:['Jaw scales','Throat plates']},
  Orc:{description:'A powerful brow and jaw studs emphasize the heavy face.',palette:['#70916d','#405b42','#c8aa71'],signatures:['Heavy brow','Jaw studs']},
  Tabaxi:{description:'A split feline muzzle is finished with swept whiskers.',palette:['#c5a067','#ecdbb6','#574535'],signatures:['Feline muzzle','Whiskers']},
  Triton:{description:'Pearl-like brow scales echo fins and ocean crests.',palette:['#65a9b2','#377d8b','#b7ddd8'],signatures:['Pearl scales','Gill marks']},
  Custom:{description:'A clean base for user-defined colours and accessories.',palette:['#b89b86','#815f55','#d1af68'],signatures:['None']}
 };
 const detailChoices=['Subtle','Classic','Bold'];
 function detailLevel(a,ch){const value=a&&a.raceDetail!==undefined?a.raceDetail:ch&&ch.miniature&&ch.miniature.raceDetail;return detailChoices.includes(value)?value:'Classic';}
 function enhance(T,g,ch={},a={},r={}){
  if(!T||!g||!g.userData||!g.userData.head)return null;
  const race=profiles[ch.race]?ch.race:'Custom',profile=profiles[race],level=detailLevel(a,ch),amount=level==='Subtle'?.78:level==='Bold'?1.22:1;
  const head=g.userData.head,group=new T.Group();group.name='Race details: '+race;group.userData={race,detail:level,signatures:profile.signatures.slice()};head.add(group);group.scale.x=Number.isFinite(a.faceWidth)?a.faceWidth:1;
  const owned=[];
  const material=color=>{const m=new T.MeshStandardMaterial({color,roughness:.82,metalness:0,flatShading:true});owned.push(m);return m;};
  const add=(geo,color,x,y,z,parent=group)=>{const mesh=new T.Mesh(geo,material(color));mesh.position.set(x,y,z);mesh.name=race+' detail';parent.add(mesh);return mesh;};
  const box=(w,h,d,color,x,y,z,parent)=>add(new T.BoxGeometry(w*amount,h*amount,d*amount),color,x,y,z,parent);
  const orb=(x,y,z,s,color=profile.palette[1],parent)=>{const m=add(new T.SphereGeometry(s*amount,7,5),color,x,y,z,parent);m.scale.z=.58;return m;};
  const cone=(x,y,z,rad,h,color=profile.palette[1],parent)=>add(new T.ConeGeometry(rad*amount,h*amount,5),color,x,y,z,parent);
  const bar=(x,y,z,len,color=profile.palette[1],angle=0,parent)=>{const m=add(new T.CylinderGeometry(.012*amount,.012*amount,len*amount,5),color,x,y,z,parent);m.rotation.z=angle;return m;};
  const skin=a.skin||r.skin||profile.palette[0],dark=profile.palette[1],accent=a.trim||profile.palette[2];
  const pair=fn=>{fn(-1);fn(1);};
  switch(race){
   case 'Human': pair(s=>{const m=box(.15,.035,.035,dark,s*.17,.14,.315);m.rotation.z=-s*.10;orb(s*.22,-.04,.323,.035,skin);});break;
   case 'Elf': pair(s=>{for(let i=0;i<(level==='Bold'?2:1);i++){const cuff=add(new T.TorusGeometry((.045+i*.025)*amount,.011*amount,4,8),accent,s*(.405+i*.025),.08-i*.045,.02);cuff.rotation.y=Math.PI/2;}cone(s*.23,.18,.32,.035,.11,accent).rotation.z=-s*.18;});break;
   case 'Dwarf': pair(s=>{const brow=box(.23,.075,.065,dark,s*.15,.15,.31);brow.rotation.z=-s*.08;});for(let i=0;i<(a.beard==='None'?0:level==='Bold'?3:2);i++){const clasp=add(new T.TorusGeometry((.065-i*.008)*amount,.016*amount,4,8),accent,0,-.22-i*.09,.31);clasp.rotation.x=Math.PI/2;}break;
   case 'Goblin': pair(s=>{const brow=box(.14,.045,.04,dark,s*.17,.14,.32);brow.rotation.z=s*.18;});cone(.14,-.17,.35,.035,.13,profile.palette[2]).rotation.z=Math.PI;break;
   case 'Dragonborn': for(let row=0;row<(level==='Bold'?3:2);row++)pair(s=>orb(s*(.11+row*.045),.02-row*.07,.58,.052-row*.006,dark));pair(s=>{const band=add(new T.TorusGeometry(.075*amount,.018*amount,4,8),accent,s*.26,.44,-.05);band.rotation.x=Math.PI/2;});break;
   case 'Gnome': orb(0,-.035,.40,.11,skin);for(let i=0;i<(level==='Bold'?3:2);i++)pair(s=>orb(s*(.15+i*.045),-.075+i*.035,.33,.018,dark));break;
   case 'Half-Elf': pair(s=>{const mark=cone(s*.25,.14,.325,.035,.13,accent);mark.rotation.z=-s*.20;box(.15,.025,.03,dark,s*.16,.17,.32).rotation.z=-s*.08;});break;
   case 'Half-Orc': pair(s=>{box(.22,.075,.07,dark,s*.16,.15,.31).rotation.z=-s*.10;orb(s*.25,-.17,.335,.035,accent);});break;
   case 'Halfling': pair(s=>orb(s*.22,-.065,.325,.075,profile.palette[1]));{const parts=g.userData.walkParts||[];for(const part of parts){if(!part.foot)continue;for(let i=0;i<(level==='Bold'?3:2);i++){const tuft=cone((i-1)*.045,.13,.18,.032,.12,a.hairColor||dark,part.foot);tuft.rotation.x=-.55;}}}break;
   case 'Tiefling': pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++){const ridge=box(.055,.14,.045,dark,s*(.25+i*.045),.19+i*.07,.25);ridge.rotation.z=-s*.32;}const band=add(new T.TorusGeometry(.075*amount,.017*amount,4,8),accent,s*.26,.44,-.05);band.rotation.x=Math.PI/2;});break;
   case 'Aasimar': {const gem=add(new T.OctahedronGeometry(.075*amount),accent,0,.23,.34);gem.scale.y=1.35;const count=level==='Bold'?5:3;for(let i=0;i<count;i++)orb((i-(count-1)/2)*.075,.34-Math.abs(i-(count-1)/2)*.03,.24,.018,profile.palette[2]);}break;
   case 'Firbolg': {const nose=orb(0,-.04,.40,.115,skin);nose.scale.x=1.35;for(let i=0;i<(level==='Bold'?3:2);i++)pair(s=>orb(s*(.06+i*.05),.06+i*.045,.34,.018,dark));}break;
   case 'Goliath': pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++)orb(s*(.08+i*.07),.25-Math.abs(i-1)*.025,.32,.025,dark);});break;
   case 'Kenku': pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++){const feather=cone(s*(.20+i*.075),.13-i*.035,.12,.055,.20,dark);feather.rotation.z=-s*(.65+i*.08);}});box(.09,.05,.10,accent,0,.11,.45);break;
   case 'Kobold': for(let row=0;row<(level==='Bold'?3:2);row++)pair(s=>{const plate=add(new T.OctahedronGeometry((.055-row*.006)*amount),dark,s*(.10+row*.06),.02-row*.07,.58);plate.scale.y=.65;});break;
   case 'Lizardfolk': pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++){const plate=add(new T.OctahedronGeometry(.065*amount),dark,s*(.17+i*.07),-.08-i*.07,.58);plate.scale.y=.65;}});for(let i=0;i<(level==='Bold'?3:2);i++){const throat=box(.18-i*.025,.045,.07,accent,0,-.25-i*.06,.19);throat.rotation.x=.20;}break;
   case 'Orc': pair(s=>{box(.23,.08,.07,dark,s*.16,.15,.31).rotation.z=-s*.12;orb(s*.27,-.16,.34,.038,accent);});break;
   case 'Tabaxi': {pair(s=>{const muzzle=orb(s*.08,-.11,.405,.095,profile.palette[1]);muzzle.scale.x=1.2;const count=level==='Bold'?3:2;for(let i=0;i<count;i++)bar(s*(.13+i*.012),-.09-i*.045,.45,.36,dark,-s*(Math.PI/2-.15+i*.10));});const nose=cone(0,-.035,.475,.07,.09,dark);nose.rotation.x=Math.PI/2;}break;
   case 'Triton': pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++)orb(s*(.07+i*.065),.18-i*.035,.33,.027,profile.palette[2]);for(let i=0;i<2;i++){const gill=box(.12,.018,.025,dark,s*.27,-.04-i*.055,.31);gill.rotation.z=s*.18;}});break;
   case 'Custom': break;
  }
  group.userData.materials=owned;
  return group;
 }
 return {profiles,detailChoices,enhance};
});
