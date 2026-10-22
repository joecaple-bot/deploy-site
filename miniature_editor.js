/* Original procedural low-poly miniatures. Uses the bundled Three.js r124. */
(function(root){
const Idle=root.MiniatureIdle||(typeof require==='function'?require('./miniature_idle.js'):null),editorIdles=Idle.createScheduler();
const races={
 Human:{skin:'#c68e69'},Elf:{skin:'#d9b69b',height:1.1,width:.85,ears:true},Dwarf:{skin:'#b77c58',height:.78,width:1.2,beard:true},Goblin:{skin:'#78994d',height:.7,width:.8,ears:true},Dragonborn:{skin:'#ac6545',height:1.12,snout:true,horns:true,tail:true},Gnome:{skin:'#d4a481',height:.63,width:.85,ears:true,nose:true},'Half-Elf':{skin:'#bb8e70',height:1.03,ears:true},'Half-Orc':{skin:'#8a9b75',width:1.12,tusks:true},Halfling:{skin:'#c79d7a',height:.65,width:.95,feet:true},Tiefling:{skin:'#ad686c',horns:true,tail:true},Aasimar:{skin:'#d7b98e',halo:true},Firbolg:{skin:'#91a4ad',height:1.17,width:1.12,ears:true,nose:true,beard:true},Goliath:{skin:'#9b9f9d',height:1.2,width:1.25,marks:true},Kenku:{skin:'#39434f',height:.88,beak:true},Kobold:{skin:'#bc734a',height:.65,width:.8,snout:true,horns:true,tail:true},Lizardfolk:{skin:'#658865',height:1.04,snout:true,crest:true,tail:true},Orc:{skin:'#70916d',height:1.1,width:1.2,tusks:true},Tabaxi:{skin:'#c5a067',cat:true,tail:true},Triton:{skin:'#65a9b2',fins:true,crest:true},Custom:{skin:'#b89b86'}
};
const choices={outfit:['Tunic','Robe','Leather','Plate'],hair:['Short','Long','Mohawk','Bald','Buzz cut','Bob','Pixie','Side swept','Spiky','Curly','Afro','Ponytail','Top knot','Twin braids'],headgear:['None','Helmet','Hood','Wizard hat'],weapon:['None','Sword','Axe','Staff','Bow','Dagger','Hammer'],weaponModel:['Procedural',...Object.keys(root.MiniatureWeaponAssets||{})],shield:['None','Round','Kite'],cloak:['None','Short','Long'],beard:['None','Stubble','Full','Goatee'],brows:['Soft','Straight','Angled'],mouth:['Neutral','Smile'],scar:['None','Cheek','Brow'],pack:['None','Backpack','Expedition pack'],rope:['None','Coiled rope'],lantern:['None','Brass lantern'],bedroll:['None','Bedroll'],pouch:['None','Belt pouches'],flask:['None','Waterskin'],book:['None','Spellbook'],quiver:['None','Arrow quiver']};
function defaults(ch={}){const r=races[ch.race]||races.Custom;return {skin:r.skin,hairColor:'#49372c',cloth:'#426a78',trim:'#d1af68',metal:'#9cabb5',outfit:['Wizard','Sorcerer','Cleric'].includes(ch.class)?'Robe':'Tunic',hair:r.beard?'Long':r.beak||r.snout||r.marks?'Bald':'Short',headgear:'None',weapon:'None',weaponModel:'Procedural',shield:'None',cloak:'None',beard:r.beard?'Full':'None',brows:'Soft',mouth:'Neutral',scar:'None',eyeColor:'#354b48',height:1,weight:1,faceWidth:1,noseSize:1,eyeSpacing:1,pack:'None',rope:'None',lantern:'None',bedroll:'None',pouch:'None',flask:'None',book:'None',quiver:'None',yaw:.35,frame:'Full body',wearables:{}};}
function config(ch={}){const d=defaults(ch),raw=ch.miniature||{},out={...d};for(const k of ['skin','hairColor','cloth','trim','metal','eyeColor'])if(/^#[0-9a-f]{6}$/i.test(raw[k]||''))out[k]=raw[k];for(const [k,values]of Object.entries(choices))if(values.includes(raw[k]))out[k]=raw[k];for(const [k,range] of Object.entries(ranges)){const n=Number(raw[k]);out[k]=Number.isFinite(n)?Math.min(range[1],Math.max(range[0],n)):d[k];}out.wearables={};for(const [slot,item] of Object.entries(raw.wearables||{})){if(slots.includes(slot)&&item&&typeof item.name==='string'&&item.name.length<160){out.wearables[slot]={name:item.name,slot,rarity:typeof item.rarity==='string'?item.rarity:'Common'};}}out.yaw=Number.isFinite(Number(raw.yaw))?Number(raw.yaw):d.yaw;out.frame=raw.frame==='Portrait'?'Portrait':'Full body';return out;}
const ranges={height:[.8,1.25],weight:[.8,1.45],faceWidth:[.85,1.2],noseSize:[.6,1.5],eyeSpacing:[.8,1.2]};
const slots=['Chestplate','Helmet','Boots','Gloves','Pendant','Ring 1','Cloak','Belt','Shield','Weapon'];
function itemSlot(item){if(slots.includes(item.slot))return item.slot;const n=item.name||'';return /cloak|cape|mantle/i.test(n)?'Cloak':/belt|girdle/i.test(n)?'Belt':null;}
function wardrobe(ch={}){const entries=[...Object.values(root.DND_BG3_LOOT_ITEMS||{}).flat(),...Object.values(root.DND_LOOT_TABLES||{}).flat(),...(ch.inventory||[])],seen=new Set();return entries.filter(i=>{if(!i||typeof i.name!=='string'||/^(#N\/A|unknown|undefined)$/i.test(i.name.trim()))return false;const slot=itemSlot(i),key=slot+':'+i.name.toLowerCase();if(!slot||seen.has(key))return false;seen.add(key);return true;}).map(i=>({name:i.name,slot:itemSlot(i),rarity:i.rarity||'Common'})).sort((a,b)=>a.name.localeCompare(b.name));}
function weaponType(n){return /crossbow|bow/i.test(n)?'Bow':/staff|quarterstaff|spear|pike|trident|halberd|glaive/i.test(n)?'Staff':/axe/i.test(n)?'Axe':/dagger|knife|sickle/i.test(n)?'Dagger':/hammer|mace|club|flail|morningstar/i.test(n)?'Hammer':'Sword';}
function appearance(ch){const a=config(ch),w=a.wearables;if(w.Chestplate)a.outfit=/robe|cloth|vestment|dress|garb/i.test(w.Chestplate.name)?'Robe':/leather|hide|padded/i.test(w.Chestplate.name)?'Leather':'Plate';if(w.Helmet)a.headgear=/hood|cowl/i.test(w.Helmet.name)?'Hood':/hat/i.test(w.Helmet.name)?'Wizard hat':'Helmet';if(w.Weapon)a.weapon=weaponType(w.Weapon.name);if(w.Shield)a.shield=/kite|tower/i.test(w.Shield.name)?'Kite':'Round';if(w.Cloak)a.cloak='Long';return a;}
function attackModel(current,kind){if(!root.MiniatureWeaponAssets?.[current])return 'Procedural';if(kind==='bow')return /bow/i.test(current)?current:'Bow';return ['Sword','Axe','Dagger'].includes(weaponType(current))&&!/rock|pebble|arrow/i.test(current)?current:'Arming Sword';}
function itemColor(item){return ({Uncommon:'#71a684',Rare:'#669fcd','Very Rare':'#b48bd2',Legendary:'#dfb252'})[item?.rarity]||'#ad9776';}
function createCamera(T,ch){const a=config(ch),r=races[ch.race]||{},h=(r.height||1)*a.height,portrait=a.frame==='Portrait',half=portrait?1.05*Math.max(1,h):Math.max(1.9,1.85*h),y=portrait?2.12*h:1.48*h;const camera=new T.OrthographicCamera(-half,half,half,-half,.1,30);camera.position.set(0,y+1,7);camera.lookAt(0,y,0);camera.updateProjectionMatrix();return camera;}
function build(T,ch){
 const a=appearance(ch),r=races[ch.race]||races.Custom,g=new T.Group();g.name='Miniature: '+(ch.race||'Human');
 g.userData.walkParts=[];
 const materials={};const mat=c=>materials[c]||(materials[c]=new T.MeshStandardMaterial({color:c,roughness:.83,metalness:c===a.metal?.35:0,flatShading:true}));
 function mesh(geo,c,x,y,z){const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);g.add(m);return m;}
 // Bevelled solids keep a faceted silhouette without sharp cuboid joints.
 const box=(w,h,d,c,x,y,z)=>{const bevel=Math.min(w,h,d)*.16,shape=new T.Shape();shape.moveTo(-w/2+bevel,-h/2+bevel);shape.lineTo(w/2-bevel,-h/2+bevel);shape.lineTo(w/2-bevel,h/2-bevel);shape.lineTo(-w/2+bevel,h/2-bevel);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:bevel,bevelThickness:bevel});geo.translate(0,0,-d/2+bevel);return mesh(geo,c,x,y,z);};
 const joint=(w,h,d,c,x,y,z)=>{const m=mesh(new T.SphereGeometry(1,10,6),c,x,y,z);m.scale.set(w,h,d);return m;};
 const cone=(rad,h,c,x,y,z,n=5)=>mesh(new T.ConeGeometry(rad,h,n),c,x,y,z);
 const skin=a.skin,cloth=a.outfit==='Plate'?a.metal:a.outfit==='Leather'?'#70503b':a.cloth;
 // Chunky proportions, separated feet, angular head and visible fingers.
 for(const side of [-1,1]){const leg=box(.35,.77,.37,'#343e4a',side*.21,.52,0),foot=box(.39,.23,r.feet?.56:.48,r.feet?skin:'#3f3029',side*.21,.14,.08);const arm=box(.34,.68,.36,cloth,side*.57,1.34,0);arm.rotation.z=side*.10;const hand=box(.29,.28,.32,skin,side*.61,.91,.02);const shoulder=joint(.22,.23,.23,cloth,side*.56,1.60,0);g.updateMatrixWorld(true);arm.attach(shoulder);
 if(a.wearables.Boots){const boot=box(.40,.38,.43,itemColor(a.wearables.Boots),side*.21,.34,.02);g.updateMatrixWorld(true);foot.attach(boot);}
 if(a.wearables.Gloves){hand.material=mat(itemColor(a.wearables.Gloves));const cuff=box(.33,.13,.36,a.trim,side*.61,1.04,.02);g.updateMatrixWorld(true);hand.attach(cuff);}
 g.userData.walkParts.push({leg,foot,arm,hand,side});}
 box(.90,.79,.55,cloth,0,1.30,0);joint(.45,.23,.28,cloth,0,1.02,0);box(.85,.12,.47,'#40312b',0,1.02,0);box(.15,.15,.05,a.trim,0,1.02,.26);
 box(.24,.20,.28,skin,0,1.79,0);const headStart=g.children.length;box(.65,.61,.56,skin,0,2.12,0);
 for(const x of [-.16*a.eyeSpacing,.16*a.eyeSpacing]){box(.105,.10,.035,'#efead5',x,2.17,.291);box(.049,.075,.042,a.eyeColor,x,2.16,.312);const brow=box(.13,.035,.045,a.hairColor,x,2.25,.30);brow.rotation.z=a.brows==='Angled'?Math.sign(x)*-.22:a.brows==='Soft'?Math.sign(x)*.12:0;}
 box(.10*a.noseSize,(r.nose?.2:.11)*a.noseSize,(r.nose?.18:.09)*a.noseSize,skin,0,2.06,.32);for(const side of [-1,1]){const lip=box(.09,.025,.035,'#81564d',side*.043,1.94,.289);lip.rotation.z=a.mouth==='Smile'?side*.22:0;}if(a.scar!=='None'){const scar=box(.024,.16,.02,'#b47971',.23,a.scar==='Brow'?2.25:2.02,.29);scar.rotation.z=-.25;}
 if(r.ears)for(const side of [-1,1]){const e=cone(.14,.44,skin,side*.43,2.19,0,4);e.rotation.z=-side*1.0;}
 if(r.cat){for(const side of [-1,1]){cone(.16,.32,skin,side*.25,2.51,0,4);box(.065,.24,.02,'#574535',side*.25,2.02,.29);}box(.24,.15,.16,'#ecdbb6',0,2.0,.32);}
 if(r.snout)box(.48,.25,.38,skin,0,2.01,.37);
 if(r.beak){const beak=cone(.21,.48,'#bda46e',0,2.05,.46,4);beak.rotation.x=Math.PI/2;for(const side of [-1,1])box(.14,.27,.27,skin,side*.33,1.95,-.05);}
 if(r.tusks)for(const side of [-1,1])cone(.065,.24,'#f1dfb5',side*.21,1.99,.34);
 if(r.horns)for(const side of [-1,1]){const h=cone(.115,.46,'#dbc393',side*.26,2.56,-.05);h.rotation.z=-side*.3;}
 if(r.crest)for(let i=0;i<4;i++)cone(.12,.25,a.trim,0,2.48,-.23+i*.13,4);
 if(r.fins)for(const side of [-1,1]){const f=cone(.19,.40,a.trim,side*.40,2.13,-.01,3);f.rotation.z=side*1.1;}
 if(r.marks){box(.08,.58,.02,'#505f69',-.22,2.12,.29);box(.30,.08,.025,'#505f69',.08,2.3,.29);}
 if(r.tail){const tail=box(.14,.15,.85,skin,0,.77,-.58);tail.rotation.x=-.45;cone(.13,.27,skin,0,1.0,-.99);}
 // Hair pieces share the head pivot, including long locks and braids.
 const hairStart=g.children.length;
 if(a.hair!=='Bald'){
 const c=a.hairColor,h=a.hair;
 box(.69,h==='Buzz cut'?.07:.18,.59,c,0,h==='Buzz cut'?2.40:2.43,-.02);
 if(h==='Short'||h==='Long')box(.23,.16,.08,c,-.21,2.32,.30);
 if(h==='Long')box(.69,.56,.17,c,0,2.11,-.32);
 if(h==='Mohawk')box(.15,.28,.56,c,0,2.60,-.02);
 if(h==='Bob'){box(.72,.48,.18,c,0,2.18,-.32);for(const side of [-1,1])box(.15,.45,.48,c,side*.32,2.18,-.03);box(.60,.11,.10,c,0,2.32,.28);}
 if(h==='Pixie'){for(const side of [-1,1]){const lock=cone(.14,.26,c,side*.30,2.33,-.04);lock.rotation.z=side*.5;}const fringe=box(.40,.14,.16,c,-.12,2.35,.27);fringe.rotation.z=-.2;}
 if(h==='Side swept'){const fringe=box(.57,.23,.15,c,-.06,2.35,.29);fringe.rotation.z=-.32;box(.12,.25,.34,c,-.32,2.28,0);}
 if(h==='Spiky')for(let i=0;i<7;i++){const spike=cone(.13,.30+(i%3)*.04,c,((i%3)-1)*.22,2.62,-.19+Math.floor(i/3)*.18);spike.rotation.z=((i%3)-1)*-.25;}
 if(h==='Curly'||h==='Afro'){const big=h==='Afro';for(let i=0;i<10;i++){const angle=i*Math.PI/5;joint(big?.22:.14,big?.24:.14,big?.22:.14,c,Math.cos(angle)*(big?.35:.29),2.43+Math.sin(angle)*(big?.21:.07),Math.sin(angle)*.24);}joint(big?.42:.31,big?.27:.16,.30,c,0,big?2.59:2.49,0);}
 if(h==='Ponytail'){joint(.18,.18,.19,c,0,2.38,-.39);box(.13,.10,.17,a.trim,0,2.27,-.44);const tail=box(.25,.56,.23,c,0,2.03,-.47);tail.rotation.x=.20;}
 if(h==='Top knot'){joint(.19,.20,.18,c,0,2.68,-.09);box(.24,.06,.23,a.trim,0,2.54,-.09);}
 if(h==='Twin braids')for(const side of [-1,1]){box(.13,.30,.32,c,side*.31,2.27,-.06);for(let i=0;i<5;i++)joint(.10,.10,.10,c,side*(.35+(i%2)*.025),2.10-i*.115,.09);box(.12,.055,.12,a.trim,side*.36,1.57,.09);}
 }
 const hairMeshes=g.children.slice(hairStart);
 if(a.beard!=='None'){const b=cone(a.beard==='Goatee'?.12:.30,a.beard==='Stubble'?.17:.45,a.hairColor,0,1.83,.29,4);b.rotation.z=Math.PI;}
 if(r.halo){const h=mesh(new T.TorusGeometry(.42,.04,4,16),'#e5ca7c',0,2.72,0);h.rotation.x=Math.PI/2;}
 const headMeshes=g.children.slice(headStart);for(const part of headMeshes){part.position.x*=a.faceWidth;part.scale.x*=a.faceWidth;}
 if(a.outfit==='Robe'){mesh(new T.CylinderGeometry(.43,.58,.86,6),a.cloth,0,.73,0);box(.11,.88,.04,a.trim,0,.75,.48);}
 if(a.outfit==='Plate'){for(const side of [-1,1])box(.38,.26,.48,a.metal,side*.56,1.69,0);box(.35,.42,.08,a.trim,0,1.4,.25);}
 if(a.outfit==='Leather'){for(const side of [-1,1])box(.08,.67,.06,a.trim,side*.25,1.36,.25);}
 if(a.cloak!=='None'){const cape=box(.98,a.cloak==='Long'?1.35:.74,.10,a.cloth,0,a.cloak==='Long'?1.02:1.32,-.36);cape.rotation.x=.12;box(.75,.10,.58,a.trim,0,1.69,0);}
 const headgearStart=g.children.length;
 if(a.headgear==='Helmet'){box(.76,.28,.67,a.metal,0,2.43,0);for(const side of [-1,1])box(.11,.34,.59,a.metal,side*.34,2.22,-.03);box(.07,.31,.05,a.trim,0,2.29,.36);}
 if(a.headgear==='Hood'){box(.79,.19,.70,a.cloth,0,2.49,-.04);for(const side of [-1,1])box(.13,.62,.62,a.cloth,side*.37,2.13,-.04);box(.78,.65,.13,a.cloth,0,2.14,-.37);}
 if(a.headgear==='Wizard hat'){mesh(new T.CylinderGeometry(.57,.57,.08,8),a.cloth,0,2.47,0);cone(.39,.76,a.cloth,0,2.87,0,6);mesh(new T.CylinderGeometry(.36,.4,.10,6),a.trim,0,2.56,0);}
 for(const part of g.children.slice(headgearStart)){part.position.x*=a.faceWidth;part.scale.x*=a.faceWidth;}
 const weaponStart=g.children.length;const wx=-.72;const asset=root.MiniatureWeaponAssets?.[a.weaponModel];
 if(!asset&&a.weapon!=='None'){box(.10,.43,.11,'#604329',wx,.94,.16);
  if(['Sword','Dagger'].includes(a.weapon)){box(.35,.07,.13,a.trim,wx,1.15,.16);box(.12,a.weapon==='Dagger'?.36:.85,.055,a.metal,wx,a.weapon==='Dagger'?1.36:1.60,.16);cone(.085,.18,a.metal,wx,a.weapon==='Dagger'?1.62:2.1,.16,4);}
  if(['Axe','Hammer'].includes(a.weapon)){box(.1,.85,.1,'#604329',wx,1.3,.16);box(a.weapon==='Axe'?.50:.43,.31,.22,a.metal,wx,1.72,.16);}
  if(a.weapon==='Staff'){box(.09,2.13,.09,'#604329',wx,1.17,.16);mesh(new T.OctahedronGeometry(.21),a.trim,wx,2.35,.16);}
  if(a.weapon==='Bow'){const bow=mesh(new T.TorusGeometry(.49,.055,4,12,Math.PI),'#9a7147',wx,1.20,.16);bow.rotation.z=-Math.PI/2;box(.025,1.0,.025,'#eadac0',wx,1.20,.16);}
 }
 if(asset){
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(asset.positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(asset.colors,3));geo.computeVertexNormals();if(/bow/i.test(a.weaponModel))geo.rotateZ(Math.PI/2);geo.computeBoundingBox();const bounds=geo.boundingBox,extent=new T.Vector3();bounds.getSize(extent);const name=a.weaponModel,bow=/bow/i.test(name),rock=/rock|pebble/i.test(name),length=rock?.35:/arrow|shiv|dagger|kukri/i.test(name)?.65:/staff|spear|halberd|pitchfork/i.test(name)?1.8:/great|double/i.test(name)?1.5:bow?1.2:1.15;const scale=length/Math.max(extent.x,extent.y,extent.z,.001);geo.translate(-(bounds.min.x+bounds.max.x)/2,-(bounds.min.y+extent.y*(bow||rock?.5:.17)),-(bounds.min.z+bounds.max.z)/2);geo.scale(scale,scale,scale);const weapon=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:.15,flatShading:true}));weapon.name='Asset weapon: '+name;weapon.position.set(-.61,.91,.18);g.add(weapon);
 }
 const weaponMeshes=g.children.slice(weaponStart);g.updateMatrixWorld(true);for(const part of weaponMeshes)g.userData.walkParts[0].hand.attach(part);
 const shieldStart=g.children.length;
 if(a.shield!=='None'){if(a.shield==='Round'){const m=mesh(new T.CylinderGeometry(.40,.40,.13,8),a.metal,.74,1.17,.28);m.rotation.x=Math.PI/2;}else{box(.58,.57,.13,a.metal,.74,1.28,.28);const tip=cone(.41,.36,a.metal,.74,.84,.28,4);tip.rotation.z=Math.PI;tip.scale.z=.22;}box(.09,.50,.04,a.trim,.74,1.2,.37);}
 g.updateMatrixWorld(true);for(const part of g.children.slice(shieldStart))g.userData.walkParts[1].hand.attach(part);
 if(a.wearables.Pendant){const chain=mesh(new T.TorusGeometry(.16,.018,4,12),a.trim,0,1.61,.29);chain.scale.y=1.3;mesh(new T.OctahedronGeometry(.075),itemColor(a.wearables.Pendant),0,1.40,.32);}
 if(a.wearables['Ring 1']){const hand=g.userData.walkParts[1].hand,ring=mesh(new T.OctahedronGeometry(.055),itemColor(a.wearables['Ring 1']),.66,.9,.20);g.updateMatrixWorld(true);hand.attach(ring);}
 if(a.wearables.Belt)box(.93,.13,.61,itemColor(a.wearables.Belt),0,1.02,0);
 if(a.wearables.Chestplate){for(const side of [-1,1])box(.06,.52,.05,itemColor(a.wearables.Chestplate),side*.28,1.39,.30);}
 // Keep adventuring gear on the body, outside the head and hand animation pivots.
 const gearStart=g.children.length,leather='#795238',ropeColor='#c4aa77';
 if(a.pack!=='None'){const tall=a.pack==='Expedition pack';box(.72,tall?.84:.66,.34,leather,0,1.30,-.58);box(.78,.19,.38,a.trim,0,tall?1.72:1.62,-.59);for(const side of [-1,1]){box(.085,.67,.07,leather,side*.29,1.35,.30);box(.08,.48,.04,a.trim,side*.23,1.28,-.77);}if(tall)for(const side of [-1,1])box(.20,.34,.28,leather,side*.45,1.23,-.57);}
 if(a.rope!=='None'){for(let i=0;i<4;i++){const coil=mesh(new T.TorusGeometry(.19+i*.018,.023,5,16),ropeColor,-.49,1.08,.32+i*.025);coil.scale.y=1.25;}box(.08,.18,.13,leather,-.49,1.29,.36);}
 if(a.lantern!=='None'){const x=.51,y=.73,z=.36;box(.23,.29,.22,'#f3bb52',x,y,z);for(const side of [-1,1])for(const depth of [-1,1])box(.035,.34,.035,a.metal,x+side*.13,y,z+depth*.12);box(.31,.055,.30,a.trim,x,y-.18,z);cone(.23,.14,a.trim,x,y+.22,z,4);mesh(new T.TorusGeometry(.09,.018,4,12),a.trim,x,y+.37,z);}
 if(a.bedroll!=='None'){const roll=mesh(new T.CylinderGeometry(.18,.18,.91,10),a.cloth,0,.85,-.64);roll.rotation.z=Math.PI/2;for(const side of [-1,1]){const strap=mesh(new T.TorusGeometry(.183,.025,4,10),leather,side*.29,.85,-.64);strap.rotation.y=Math.PI/2;}}
 if(a.pouch!=='None')for(const side of [-1,1]){box(.22,.25,.14,leather,side*.23,.87,.35);box(.24,.075,.16,a.trim,side*.23,.99,.36);}
 if(a.flask!=='None'){joint(.16,.22,.10,leather,-.48,.77,-.16);box(.07,.10,.09,a.trim,-.48,1.00,-.16);}
 if(a.book!=='None'){box(.25,.32,.13,'#593b64',.43,.85,-.21);box(.20,.26,.14,'#e6d4ab',.43,.85,-.21);box(.045,.34,.16,'#593b64',.31,.85,-.21);box(.06,.11,.17,a.trim,.50,.85,-.21);}
 if(a.quiver!=='None'){const x=.53,z=-.49;mesh(new T.CylinderGeometry(.13,.10,.66,8),leather,x,1.43,z);for(let i=0;i<4;i++){const ax=x+(i%2)*.08-.04,az=z+Math.floor(i/2)*.08-.04;box(.022,.70,.022,ropeColor,ax,1.79,az);box(.07,.15,.025,a.trim,ax,2.08,az);}}
 const gear=new T.Group();gear.name='Adventuring accessories';const gearMeshes=g.children.slice(gearStart);g.add(gear);for(const part of gearMeshes)gear.add(part);
 g.userData.walkParts[0].hand.rotation.z=.55;g.userData.walkParts[0].hand.rotation.x=-.12;
 g.scale.set((r.width||1)*a.weight,(r.height||1)*a.height,Math.sqrt(a.weight));g.rotation.y=a.yaw;
 const glow=mesh(new T.IcosahedronGeometry(.20,1),'#83d9ff',-.65,1.30,.48);glow.material=new T.MeshBasicMaterial({color:0x83d9ff,transparent:true,opacity:.8});glow.visible=false;
 const arrow=box(.025,.025,.72,'#dec694',-.72,1.35,.65);arrow.visible=false;
 const head=new T.Group();head.position.y=2.12;const headParts=g.children.filter(o=>o!==glow&&o!==arrow&&(o.position.y>1.8||hairMeshes.includes(o)));g.add(head);g.updateMatrixWorld(true);for(const part of headParts)head.attach(part);g.userData.head=head;
 const ultimate=new T.Group();g.add(ultimate);const ring=new T.Mesh(new T.TorusGeometry(.85,.035,5,32),new T.MeshBasicMaterial({color:0xffd76a,transparent:true,opacity:.9}));ring.rotation.x=Math.PI/2;ring.position.y=.12;ultimate.add(ring);for(let i=0;i<10;i++){const ray=new T.Mesh(new T.ConeGeometry(.045,.50,4),new T.MeshBasicMaterial({color:i%2?0xfff2b0:0x77ddff,transparent:true,opacity:.85}));const angle=i*Math.PI/5;ray.position.set(Math.cos(angle)*.9,.8+Math.sin(angle)*.6,Math.sin(angle)*.5);ray.rotation.z=-angle;ultimate.add(ray);}ultimate.visible=false;
 g.userData.animationFX={glow,arrow,ultimate};g.userData.rest=[];g.traverse(o=>g.userData.rest.push({o,position:o.position.clone(),rotation:o.rotation.clone(),scale:o.scale.clone()}));return g;
}
function poseWalk(g,phase){const wave=Math.sin(phase);for(const p of g.userData.walkParts||[]){const step=wave===0?0:wave*p.side;p.leg.rotation.x=step*.42;p.leg.position.z=step*.08;p.foot.position.z=.08+step*.23;p.foot.position.y=.14+Math.max(0,step)*.10;p.arm.rotation.x=-step*.28;p.hand.position.z=.02-step*.14;}g.position.y=Math.abs(Math.sin(phase))* .045;}
function poseAnimation(g,kind,time){
 for(const r of g.userData.rest||[]){r.o.position.copy(r.position);r.o.rotation.copy(r.rotation);r.o.scale.copy(r.scale);}
 const fx=g.userData.animationFX;if(fx){fx.glow.visible=false;fx.arrow.visible=false;if(fx.ultimate)fx.ultimate.visible=false;}
 if(kind==='walk'){poseWalk(g,time*Math.PI*2);return;}
 const p=g.userData.walkParts||[],left=p[0],right=p[1];if(!left||!right)return;
 if(kind.startsWith('idle')){const breath=Math.sin(time*Math.PI*2);g.scale.y*=1+breath*.009;g.rotation.z=breath*.008;for(const limb of p){limb.arm.rotation.x=breath*.025;limb.hand.position.y+=breath*.009;}const beat=Math.sin(time*Math.PI)**2;
 if(kind==='idle-look'&&g.userData.head)g.userData.head.rotation.y=breath*.32;
 if(kind==='idle-shift'){g.position.x=breath*.055;g.rotation.z+=breath*.035;left.leg.rotation.z=breath*.035;}
 if(kind==='idle-ready'){left.hand.rotation.z+=beat*.16;left.hand.position.y+=beat*.10;left.arm.rotation.x-=beat*.15;}
 if(kind==='idle-nod'&&g.userData.head)g.userData.head.rotation.x=Math.sin(time*Math.PI*4)*beat*.12;
 if(kind==='idle-scan'&&g.userData.head){g.userData.head.rotation.y=breath*.42;g.userData.head.rotation.x=-beat*.10;g.rotation.y+=breath*.04;}
 if(kind==='idle-shoulders'){for(const limb of p){limb.arm.position.y+=beat*.065;limb.hand.position.y+=beat*.065;limb.arm.rotation.z+=limb.side*beat*.10;}g.userData.head.rotation.x=beat*.07;}
 if(kind==='idle-heel'){right.foot.position.y+=beat*.055;right.foot.rotation.x-=beat*.13;right.leg.rotation.x-=beat*.06;g.position.x-=beat*.025;}
 if(kind==='idle-settle'){g.position.y-=beat*.035;g.rotation.x+=beat*.025;right.arm.rotation.x-=beat*.14;right.hand.position.z+=beat*.06;g.userData.head.rotation.z=breath*.07;}
 if(kind==='idle-stretch'){right.arm.rotation.z-=beat*.35;right.hand.position.x+=beat*.13;right.hand.position.y+=beat*.16;g.scale.y*=1+beat*.018;}
 return;}
 const ultimate=kind.startsWith('ultimate-');if(ultimate)kind=kind.slice(9);const t=Math.max(0,Math.min(1,time)),envelope=Math.sin(t*Math.PI),swing=Math.sin(t*Math.PI*2);
 if(kind==='sword'){
  g.rotation.y+=swing*.22;left.arm.rotation.x=-envelope*1.05;left.arm.rotation.z-=swing*.65;left.hand.position.y+=envelope*.45;left.hand.position.z+=envelope*.30;left.hand.rotation.x-=envelope*1.2;left.hand.rotation.z-=swing*.95;g.position.z+=envelope*.08;
 }else if(kind==='bow'){
  const draw=Math.sin(Math.min(t/.68,1)*Math.PI/2)*(t<.68?1:Math.max(0,(1-t)/.32));
  left.arm.rotation.x=-draw*1.25;left.hand.position.y+=draw*.40;left.hand.position.z+=draw*.35;left.hand.rotation.x-=draw*.25;
  right.arm.rotation.x=-draw*1.0;right.arm.rotation.z-=draw*.5;right.hand.position.x-=draw*.45;right.hand.position.y+=draw*.44;right.hand.position.z+=draw*.10;
  if(fx){fx.arrow.visible=t>.18&&t<.88;fx.arrow.position.y=1.35+draw*.15;fx.arrow.position.z=.65+Math.max(0,t-.68)*4;}
 }else if(kind==='spell'){
  for(const limb of p){limb.arm.rotation.x=-envelope*.9;limb.arm.rotation.z+=limb.side*envelope*.25;limb.hand.position.y+=envelope*.4;limb.hand.position.z+=envelope*.25;limb.hand.rotation.x-=envelope*.4;}
  if(fx){fx.glow.visible=envelope>.05;fx.glow.position.y=1.32+envelope*.45;fx.glow.rotation.y=t*Math.PI*3;fx.glow.scale.setScalar(.4+envelope*.9);fx.glow.material.opacity=envelope*.85;}
 }else{right.arm.rotation.x=-envelope*.75;right.hand.position.y+=envelope*.30;right.hand.position.z+=envelope*.25;g.rotation.z=-envelope*.04;}
 if(ultimate){const burst=Math.sin(Math.PI*t)**2;g.position.y+=burst*.30;g.rotation.y+=kind==='sword'?Math.PI*2*t:Math.sin(t*Math.PI*2)*.25;left.hand.rotation.z-=burst*.35;fx.ultimate.visible=t>0&&t<1;fx.ultimate.rotation.y=t*Math.PI*4;fx.ultimate.scale.setScalar(.55+burst*.8);fx.ultimate.children.forEach((o,i)=>{o.material.opacity=burst*(i?.8:1);});fx.glow.visible=t>.1&&t<.9;fx.glow.scale.setScalar(.8+burst*1.8);fx.glow.material.opacity=burst*.8;fx.glow.position.y=1.5+burst*.5;if(kind==='bow'){fx.arrow.visible=t>.35&&t<.9;fx.arrow.scale.setScalar(1+burst);fx.arrow.position.z=.65+Math.max(0,t-.35)*3;}}
}
function dispose(g){g?.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}
let renderer,scene,camera,model,mounted,activeId,previewTimer=0,previewKind='idle',previewStart=0;
function previewTick(){clearTimeout(previewTimer);if(!mounted?.isConnected||!mounted.getClientRects().length)return;const now=performance.now();if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches){if(previewKind!=='idle'&&now-previewStart>=(previewKind.startsWith('idle-')?4000:previewKind.startsWith('ultimate-')?1800:1100)){previewKind='idle';redraw(selected());}const idle=previewKind==='idle',motion=idle?editorIdles.sample(activeId,now):null,kind=idle?motion.kind:previewKind;if(!idle)editorIdles.pause(activeId,now);poseAnimation(model,kind,idle?motion.phase:(now-previewStart)/(previewKind.startsWith('idle-')?4000:previewKind.startsWith('ultimate-')?1800:1100));renderer.render(scene,camera);}previewTimer=setTimeout(previewTick,80);}
function mount(ch){
 const host=document.getElementById('miniature-editor');if(!host)return;activeId=ch.id;
 if(!root.THREE){host.textContent='3D renderer unavailable. Existing icon and equipment controls still work.';return;}
 const a=config(ch);host.innerHTML='<div class="mini-stage"><div class="mini-kicker">CHARACTER MINIATURE · 3D</div><div class="mini-canvas"></div><div class="mini-caption">Drag to rotate · choose your view before saving</div></div><div class="mini-controls"></div>';
 const controls=host.querySelector('.mini-controls');
 const title=document.createElement('h3');title.textContent=(races[ch.race]?ch.race:'Custom')+' appearance';controls.append(title);
 const note=document.createElement('p');note.className='muted';note.textContent='Choose an Asset-pack weapon to use the imported models instead of the basic Held item. Appearance is cosmetic; equipment slots below control stats.';controls.append(note);
 function field(key,label,values){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement(values?'select':'input');input.setAttribute('aria-label',label);if(values){values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;input.append(o);});input.value=a[key];}else{input.type='color';input.value=a[key];}input.onchange=()=>{const current=selected();if(current.id!==activeId)return;current.miniature={...config(current),[key]:input.value};const slot=({outfit:'Chestplate',headgear:'Helmet',weapon:'Weapon',shield:'Shield',cloak:'Cloak'})[key];if(slot)delete current.miniature.wearables[slot];if(key==='weapon'){current.miniature.weaponModel='Procedural';controls.querySelector('[aria-label="Asset-pack weapon"]').value='Procedural';}scheduleSave();redraw(current);renderWorn();};wrap.append(input);controls.append(wrap);}
 for(const [k,v]of Object.entries(choices))field(k,({weaponModel:'Asset-pack weapon',headgear:'Headwear',outfit:'Clothing',hair:'Hair',weapon:'Held item',shield:'Shield',cloak:'Cloak',beard:'Facial hair',brows:'Eyebrows',mouth:'Expression',scar:'Face scar',pack:'Backpack',rope:'Rope',lantern:'Lantern',bedroll:'Bedroll',pouch:'Belt pouches',flask:'Waterskin',book:'Spellbook',quiver:'Quiver'})[k],v);
 for(const [k,label]of Object.entries({skin:'Skin / scales / fur',hairColor:'Hair colour',cloth:'Cloth colour',trim:'Trim colour',metal:'Metal colour',eyeColor:'Eye colour'}))field(k,label);
 for(const [key,label]of Object.entries({height:'Height',weight:'Body build / weight',faceWidth:'Face width',noseSize:'Nose size',eyeSpacing:'Eye spacing'})){const wrap=document.createElement('label'),output=document.createElement('span'),input=document.createElement('input');output.textContent=label+' · '+Math.round(a[key]*100)+'%';input.type='range';input.min=ranges[key][0];input.max=ranges[key][1];input.step=.01;input.value=a[key];input.setAttribute('aria-label',label);input.oninput=()=>{const c=selected();if(c.id!==activeId)return;c.miniature={...config(c),[key]:Number(input.value)};output.textContent=label+' · '+Math.round(Number(input.value)*100)+'%';scheduleSave();redraw(c);};wrap.append(output,input);controls.append(wrap);}
 const wardrobePanel=document.createElement('details');wardrobePanel.className='mini-wardrobe';wardrobePanel.open=true;const heading=document.createElement('summary');heading.textContent='Database wardrobe';wardrobePanel.append(heading);const hint=document.createElement('p');hint.textContent='Try on item looks without adding items or changing stats. Models represent equipment types; rarity adds accent colours.';wardrobePanel.append(hint);
 const search=document.createElement('input');search.type='search';search.placeholder='Search item names…';search.setAttribute('aria-label','Search wardrobe');const category=document.createElement('select');category.setAttribute('aria-label','Wardrobe slot');for(const slot of slots){const opt=document.createElement('option');opt.textContent=slot;category.append(opt);}const picker=document.createElement('select');picker.setAttribute('aria-label','Database wearable');const count=document.createElement('p'),catalogue=wardrobe(ch);let matches=[];
 const refresh=()=>{matches=catalogue.filter(i=>i.slot===category.value&&i.name.toLowerCase().includes(search.value.toLowerCase()));picker.replaceChildren();for(const item of matches){const opt=document.createElement('option');opt.value=item.name;opt.textContent=item.name+' · '+item.rarity;picker.append(opt);}count.textContent=matches.length+' matching items';apply.disabled=!matches.length;};
 const apply=document.createElement('button');apply.type='button';apply.textContent='Wear this look';const worn=document.createElement('div');worn.className='mini-worn';const renderWorn=()=>{worn.replaceChildren();for(const [slot,item]of Object.entries(config(selected()).wearables)){const b=document.createElement('button');b.type='button';b.textContent=slot+': '+item.name+' ×';b.setAttribute('aria-label','Remove '+item.name);b.onclick=()=>{const c=selected();c.miniature=config(c);delete c.miniature.wearables[slot];scheduleSave();redraw(c);renderWorn();};worn.append(b);}};
 apply.onclick=()=>{const item=matches.find(i=>i.name===picker.value);if(!item)return;const c=selected();c.miniature=config(c);c.miniature.wearables[item.slot]={...item};if(item.slot==='Weapon'){c.miniature.weaponModel='Procedural';controls.querySelector('[aria-label="Asset-pack weapon"]').value='Procedural';}scheduleSave();redraw(c);renderWorn();};search.oninput=refresh;category.onchange=refresh;wardrobePanel.append(search,category,picker,count,apply,worn);controls.append(wardrobePanel);refresh();renderWorn();
 field('frame','Icon framing',['Full body','Portrait']);
 function button(label,fn,primary=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=primary?'primary':'';b.onclick=fn;controls.append(b);return b;}
 button('Show equipped gear',()=>{const c=selected(),v=config(c);v.wearables={};v.weaponModel='Procedural';for(const [slot,id]of Object.entries(c.equipment||{})){const item=(c.inventory||[]).find(i=>i.id===id);const target=slot==='Ring 2'?'Ring 1':slot;if(item&&slots.includes(target))v.wearables[target]={name:item.name,slot:target,rarity:item.rarity||'Common'};}const weapon=(c.weapons||[])[0];if(weapon)v.wearables.Weapon={name:weapon.name,slot:'Weapon',rarity:weapon.rarity||'Common'};v.headgear='None';v.shield='None';v.cloak='None';v.weapon='None';v.outfit=defaults(c).outfit;c.miniature=v;scheduleSave();mount(c);});
 for(const kind of ['action','sword','bow','spell','idle-look','idle-shift','idle-ready','idle-stretch','idle-nod','idle-scan','idle-shoulders','idle-heel','idle-settle','ultimate-sword','ultimate-bow','ultimate-spell'])button('Preview '+({'idle-look':'look around','idle-shift':'weight shift','idle-ready':'grip adjustment','idle-stretch':'stretch','idle-nod':'nod','idle-scan':'scan the horizon','idle-shoulders':'shoulder shrug','idle-heel':'heel lift','idle-settle':'settle stance','ultimate-sword':'ultimate sword','ultimate-bow':'ultimate bow','ultimate-spell':'ultimate spell'}[kind]||kind),()=>{previewKind=kind;previewStart=performance.now();const c=selected(),miniature=config(c),attackKind=kind.replace('ultimate-','');if(attackKind==='sword'||attackKind==='bow'){delete miniature.wearables.Weapon;miniature.weapon=attackKind==='bow'?'Bow':'Sword';miniature.weaponModel=attackModel(miniature.weaponModel,attackKind);if(attackKind==='bow'){delete miniature.wearables.Shield;miniature.shield='None';}}redraw({...c,miniature});previewTick();});
 button('Front view',()=>{const c=selected();c.miniature={...config(c),yaw:0};scheduleSave();redraw(c);});
 const save=button('Use as map icon',()=>{try{const c=selected();if(c.id!==activeId)return;redraw(c);const data=renderer.domElement.toDataURL('image/png');if(!data.startsWith('data:image/png;base64,'))throw Error('Image capture failed');const idx=state.myCharacters.findIndex(x=>x.id===c.id);state.myCharacters[idx]=stampCharacterForCurrentCampaign(c);campaignCharacterIds.add(c.id);saveSelectedTokenVisual({tokenArt:data});const result=document.getElementById('mini-save-status');if(result)result.textContent='Saved as your map icon. Save & return to map to use it.';}catch(err){document.getElementById('mini-save-status').textContent='Could not save icon: '+err.message;}},true);
 const status=document.createElement('p');status.id='mini-save-status';status.setAttribute('role','status');controls.append(status);
 try{
  if(!renderer){renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(512,512);renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;}
  host.querySelector('.mini-canvas').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D character preview');renderer.domElement.setAttribute('role','img');
  let last=null;const canvas=renderer.domElement;canvas.onpointerdown=e=>{last=e.clientX;canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(last===null)return;const c=selected();c.miniature={...config(c),yaw:config(c).yaw+(e.clientX-last)*.012};last=e.clientX;redraw(c);};canvas.onpointerup=()=>{last=null;scheduleSave();};canvas.onpointercancel=()=>{last=null;};
  redraw(ch);mounted=host;previewKind='idle';previewTick();
 }catch(err){save.disabled=true;host.querySelector('.mini-canvas').textContent='3D preview needs WebGL. Enable browser hardware acceleration and reload. Equipment and existing icons remain available.';}
}
function redraw(ch){
 if(!renderer)return;dispose(model);const T=root.THREE;scene=new T.Scene();model=build(T,ch);scene.add(model);scene.add(new T.HemisphereLight(0xe1eeff,0x68574b,.75));const key=new T.DirectionalLight(0xffead0,1.05);key.position.set(-3,5,6);scene.add(key);const rim=new T.DirectionalLight(0xb3d9ff,.45);rim.position.set(3,3,-3);scene.add(rim);
 camera=createCamera(T,ch);renderer.render(scene,camera);
}
root.MiniatureEditor={races,choices,ranges,wardrobe,attackModel,appearance,config,build,poseWalk,poseAnimation,createCamera,mount,dispose};
if(typeof module==='object'&&module.exports)module.exports=root.MiniatureEditor;
})(typeof window==='object'?window:globalThis);
