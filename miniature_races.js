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
  const head=g.userData.head,group=new T.Group();group.name='Race details: '+race;group.userData={race,detail:level,signatures:profile.signatures.slice(),visibleSignatures:[],hiddenSignatures:[]};head.add(group);group.scale.x=Number.isFinite(a.faceWidth)?a.faceWidth:1;
  const owned=[];
  const material=color=>{const m=new T.MeshStandardMaterial({color,roughness:.82,metalness:0,flatShading:true});owned.push(m);return m;};
  let currentFeature='',currentRegion='';
  const add=(geo,color,x,y,z,parent=group)=>{const mesh=new T.Mesh(geo,material(color));mesh.position.set(x,y,z);mesh.name=race+' detail: '+currentFeature;mesh.userData.raceFeature=currentFeature;mesh.userData.raceRegion=currentRegion;parent.add(mesh);return mesh;};
  const box=(w,h,d,color,x,y,z,parent)=>add(new T.BoxGeometry(w*amount,h*amount,d*amount),color,x,y,z,parent);
  const orb=(x,y,z,s,color=profile.palette[1],parent)=>{const m=add(new T.SphereGeometry(s*amount,7,5),color,x,y,z,parent);m.scale.z=.58;return m;};
  const cone=(x,y,z,rad,h,color=profile.palette[1],parent)=>add(new T.ConeGeometry(rad*amount,h*amount,5),color,x,y,z,parent);
  const bar=(x,y,z,len,color=profile.palette[1],angle=0,parent)=>{const m=add(new T.CylinderGeometry(.012*amount,.012*amount,len*amount,5),color,x,y,z,parent);m.rotation.z=angle;return m;};
  const skin=a.skin||r.skin||profile.palette[0],dark=profile.palette[1],accent=a.trim||profile.palette[2];
  const pair=fn=>{fn(-1);fn(1);};
  const hardHeadwear=a.headgear==='Helmet'||a.headgear==='Hood',anyHeadwear=a.headgear&&a.headgear!=='None';
  const frontHair=['Bob','Pixie','Side swept'].includes(a.hair),browClear=!hardHeadwear&&!frontHair,sidesClear=!hardHeadwear;
  const show=(name,visible,region,draw)=>{if(!visible){group.userData.hiddenSignatures.push(name);return;}group.userData.visibleSignatures.push(name);currentFeature=name;currentRegion=region;draw();currentFeature='';currentRegion='';};
  switch(race){
   case 'Human': show('Defined brow',browClear,'brow',()=>pair(s=>{const m=box(.14,.028,.032,dark,s*.17,.19,.325);m.rotation.z=-s*.10;}));show('Cheek planes',true,'cheek',()=>pair(s=>{const m=box(.11,.025,.028,accent,s*.22,-.055,.326);m.rotation.z=s*.24;}));break;
   case 'Elf': show('Ear cuffs',sidesClear,'ear',()=>pair(s=>{for(let i=0;i<(level==='Bold'?2:1);i++){const cuff=add(new T.TorusGeometry((.045+i*.025)*amount,.011*amount,4,8),accent,s*(.405+i*.025),.08-i*.045,.02);cuff.rotation.y=Math.PI/2;}}));show('Temple points',true,hardHeadwear?'temple-low':'temple',()=>pair(s=>{const mark=cone(s*.25,hardHeadwear?.12:.19,.335,.032,.09,accent);mark.rotation.z=-s*.18;}));break;
   case 'Dwarf': show('Heavy brow',browClear,'brow',()=>pair(s=>{const brow=box(.20,.045,.05,dark,s*.15,.20,.33);brow.rotation.z=-s*.08;}));show('Beard clasps',['Full','Goatee'].includes(a.beard),'beard',()=>{const count=a.beard==='Goatee'?1:level==='Bold'?3:2;for(let i=0;i<count;i++){const clasp=add(new T.TorusGeometry((.055-i*.006)*amount,.014*amount,4,8),accent,0,-.20-i*.075,.32);clasp.rotation.x=Math.PI/2;}});break;
   case 'Goblin': show('Brow notch',browClear,'brow',()=>pair(s=>{const brow=box(.12,.025,.035,dark,s*.18,.19,.33);brow.rotation.z=s*.22;}));show('Fang',true,'mouth',()=>{const fang=cone(.14,-.17,.36,.032,.12,profile.palette[2]);fang.rotation.z=Math.PI;});break;
   case 'Dragonborn': show('Scale plates',true,'muzzle',()=>{for(let row=0;row<(level==='Bold'?3:2);row++)pair(s=>orb(s*(.11+row*.045),.01-row*.07,.585,.050-row*.006,dark));});show('Horn bands',!anyHeadwear,'horn',()=>pair(s=>{const band=add(new T.TorusGeometry(.075*amount,.018*amount,4,8),accent,s*.26,.44,-.05);band.rotation.x=Math.PI/2;}));break;
   case 'Gnome': show('Button nose',true,'nose',()=>orb(0,-.035,.405,.105,skin));show('Freckles',true,'cheek',()=>{for(let i=0;i<(level==='Bold'?3:2);i++)pair(s=>orb(s*(.15+i*.045),-.075+i*.035,.335,.017,dark));});break;
   case 'Half-Elf': show('Temple accents',true,hardHeadwear?'temple-low':'temple',()=>pair(s=>{const mark=cone(s*.25,hardHeadwear?.12:.19,.335,.032,.095,accent);mark.rotation.z=-s*.20;}));show('Fine brow',browClear,'brow',()=>pair(s=>{const brow=box(.13,.022,.028,dark,s*.16,.19,.33);brow.rotation.z=-s*.08;}));break;
   case 'Half-Orc': show('Brow plates',browClear,'brow',()=>pair(s=>{const plate=box(.19,.045,.05,dark,s*.16,.20,.33);plate.rotation.z=-s*.10;}));show('Jaw studs',true,'jaw',()=>pair(s=>orb(s*.25,-.17,.345,.032,accent)));break;
   case 'Halfling': show('Round cheeks',true,'cheek',()=>pair(s=>orb(s*.22,-.065,.33,.068,profile.palette[1])));show('Foot tufts',true,'foot',()=>{const parts=g.userData.walkParts||[];for(const part of parts){if(!part.foot)continue;for(let i=0;i<(level==='Bold'?3:2);i++){const tuft=cone((i-1)*.045,.13,.18,.032,.12,a.hairColor||dark,part.foot);tuft.rotation.x=-.55;}}});break;
   case 'Tiefling': show('Temple ridges',true,hardHeadwear?'temple-low':'temple',()=>pair(s=>{const count=hardHeadwear?1:level==='Bold'?3:2;for(let i=0;i<count;i++){const ridge=box(.042,hardHeadwear?.07:.10,.04,dark,s*(.25+i*.04),(hardHeadwear?.12:.19)+i*.055,.31);ridge.rotation.z=-s*.32;}}));show('Horn bands',!anyHeadwear,'horn',()=>pair(s=>{const band=add(new T.TorusGeometry(.075*amount,.017*amount,4,8),accent,s*.26,.44,-.05);band.rotation.x=Math.PI/2;}));break;
   case 'Aasimar': show('Forehead jewel',browClear,'forehead',()=>{const gem=add(new T.OctahedronGeometry(.060*amount),accent,0,.22,.345);gem.scale.y=1.25;});show('Celestial motes',!hardHeadwear&&!frontHair,'forehead',()=>{const count=level==='Bold'?5:3;for(let i=0;i<count;i++)orb((i-(count-1)/2)*.07,.31-Math.abs(i-(count-1)/2)*.025,.25,.015,profile.palette[2]);});break;
   case 'Firbolg': show('Broad nose',true,'nose',()=>{const nose=orb(0,-.04,.405,.11,skin);nose.scale.x=1.35;});show('Bridge spots',true,'nose',()=>{for(let i=0;i<(level==='Bold'?3:2);i++)pair(s=>orb(s*(.06+i*.05),.06+i*.045,.345,.016,dark));});break;
   case 'Goliath': show('Brow studs',browClear,'forehead',()=>pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++)orb(s*(.08+i*.07),.23-Math.abs(i-1)*.025,.33,.022,dark);}));show('Stone markings',true,'cheek',()=>pair(s=>{const mark=box(.035,.13,.025,dark,s*.255,-.04,.325);mark.rotation.z=s*.14;}));break;
   case 'Kenku': show('Feather tufts',sidesClear,'ear',()=>pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++){const feather=cone(s*(.20+i*.075),.13-i*.035,.12,.050,.18,dark);feather.rotation.z=-s*(.65+i*.08);}}));show('Beak ridge',true,'muzzle',()=>box(.085,.045,.085,accent,0,.11,.47));break;
   case 'Kobold': show('Muzzle scales',true,'muzzle',()=>{for(let row=0;row<(level==='Bold'?3:2);row++)pair(s=>{const plate=add(new T.OctahedronGeometry((.052-row*.006)*amount),dark,s*(.10+row*.06),-.03-row*.065,.585);plate.scale.y=.65;});});show('Brow scales',browClear,'brow',()=>pair(s=>{const plate=add(new T.OctahedronGeometry(.038*amount),accent,s*.15,.19,.34);plate.scale.y=.6;}));break;
   case 'Lizardfolk': show('Jaw scales',true,'jaw',()=>pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++){const plate=add(new T.OctahedronGeometry(.062*amount),dark,s*(.17+i*.07),-.08-i*.07,.585);plate.scale.y=.65;}}));show('Throat plates',true,'throat',()=>{for(let i=0;i<(level==='Bold'?3:2);i++){const throat=box(.18-i*.025,.042,.065,accent,0,-.25-i*.06,.19);throat.rotation.x=.20;}});break;
   case 'Orc': show('Heavy brow',browClear,'brow',()=>pair(s=>{const brow=box(.20,.05,.052,dark,s*.16,.20,.33);brow.rotation.z=-s*.12;}));show('Jaw studs',true,'jaw',()=>pair(s=>orb(s*.27,-.16,.35,.034,accent)));break;
   case 'Tabaxi': show('Feline muzzle',true,'muzzle',()=>{pair(s=>{const muzzle=orb(s*.08,-.11,.41,.09,profile.palette[1]);muzzle.scale.x=1.2;});const nose=cone(0,-.035,.48,.065,.085,dark);nose.rotation.x=Math.PI/2;});show('Whiskers',true,'muzzle',()=>pair(s=>{const count=level==='Bold'?3:2;for(let i=0;i<count;i++)bar(s*(.13+i*.012),-.10-i*.045,.46,.34,dark,-s*(Math.PI/2-.15+i*.10));}));break;
   case 'Triton': show('Pearl scales',browClear,'brow',()=>pair(s=>{for(let i=0;i<(level==='Bold'?3:2);i++)orb(s*(.07+i*.065),.19-i*.03,.34,.024,profile.palette[2]);}));show('Gill marks',true,'cheek',()=>pair(s=>{for(let i=0;i<2;i++){const gill=box(.10,.016,.022,dark,s*.24,-.04-i*.055,.325);gill.rotation.z=s*.18;}}));break;
   case 'Custom': break;
  }
  group.userData.materials=owned;
  return group;
 }
 return {profiles,detailChoices,enhance};
});
