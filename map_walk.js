/* Local miniature animation sprites; never changes movement or combat rules. */
(function(root){
 const motions=new Map(),actions=new Map(),sprites=new Map();let renderer,timer=0,seen=0,unavailable=false;
 const idles=['idle','idle-look','idle-shift','idle-ready','idle-stretch'];const kinds=[...idles,'walk','action','sword','bow','spell','ultimate-action','ultimate-sword','ultimate-bow','ultimate-spell'];
 const reduce=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 function sample(id,x,y,now){let m=motions.get(id);if(!m){m={x,y,until:0,start:now};motions.set(id,m);return null;}if(Math.hypot(x-m.x,y-m.y)>.015){if(now>m.until)m.start=now;m.until=now+130;m.x=x;m.y=y;}return now<m.until?m:null;}
 function basicKind(type,details={}){if(typeof details.miniatureAnimation==='string'&&details.miniatureAnimation.startsWith('ultimate-'))return details.miniatureAnimation.slice(9);if(['action','sword','bow','spell'].includes(details.miniatureAnimation))return details.miniatureAnimation;const source=details.sourceType||details.type||type;if(source==='spell')return 'spell';if(source==='weapon'){const name=String(details.diceLabel||details.itemName||details.text||'');return /bow|crossbow/i.test(name)?'bow':/sword|blade|dagger|scimitar|rapier|axe/i.test(name)?'sword':'action';}return 'action';}
 function classify(type,details={}){const kind=basicKind(type,details);return details.natural20Hit===true?'ultimate-'+kind:kind;}
 function trigger(ch,type,details={},now=performance.now()){const id=ch?.id||ch?.uid;if(!id)return;actions.set(id,{kind:classify(type,details),start:now,duration:details.natural20Hit===true?1800:1100});}
 function state(id,x,y,now){const move=sample(id,x,y,now),action=actions.get(id);if(action&&now-action.start<action.duration)return {kind:action.kind,phase:Math.max(0,(now-action.start)/action.duration)};actions.delete(id);return move?{kind:'walk',phase:((now-move.start)%560)/560}:{kind:idles[Math.floor(now/4000)%idles.length],phase:(now%4000)/4000};}
 function make(ch,kind){
  if(unavailable||!root.THREE||!root.MiniatureEditor)return null;
  const key=JSON.stringify([ch.race,ch.miniature,ch.tokenArt,kind]);if(sprites.has(key)){const found=sprites.get(key);sprites.delete(key);sprites.set(key,found);return found;}
  try{
   const T=root.THREE,M=root.MiniatureEditor;
   if(!renderer){renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(256,256);renderer.setClearColor(0,0);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;}
   // Show the weapon actually being used for the attack, without changing saved equipment.
   const attackKind=kind.replace('ultimate-','');const actor={...ch,miniature:M.config(ch)};actor.miniature.wearables={...actor.miniature.wearables};
   if(attackKind==='bow'||attackKind==='sword'){delete actor.miniature.wearables.Weapon;actor.miniature.weapon=attackKind==='bow'?'Bow':'Sword';actor.miniature.weaponModel=M.attackModel(actor.miniature.weaponModel,attackKind);if(attackKind==='bow'){delete actor.miniature.wearables.Shield;actor.miniature.shield='None';}}
   const scene=new T.Scene(),model=M.build(T,actor);scene.add(model);scene.add(new T.HemisphereLight(0xe1eeff,0x68574b,.75));const keyLight=new T.DirectionalLight(0xffead0,1.05);keyLight.position.set(-3,5,6);scene.add(keyLight);const rim=new T.DirectionalLight(0xb3d9ff,.45);rim.position.set(3,3,-3);scene.add(rim);
   const camera=M.createCamera(T,ch),frames=[],count=kind.startsWith('idle')||kind==='walk'?12:kind.startsWith('ultimate-')?24:12;
   for(let i=0;i<count;i++){M.poseAnimation(model,kind,i/(kind==='idle'||kind==='walk'?count:count-1));renderer.render(scene,camera);const frame=document.createElement('canvas');frame.width=frame.height=256;frame.getContext('2d').drawImage(renderer.domElement,0,0);frames.push(frame);}
   M.dispose(model);if(sprites.size>=24)sprites.delete(sprites.keys().next().value);sprites.set(key,frames);return frames;
  }catch(e){unavailable=true;return null;}
 }
 function tick(){timer=0;if(reduce()||typeof document!=='undefined'&&document.hidden)return;seen=0;if(typeof draw==='function')draw();const now=performance.now();for(const [id,m]of motions)if(now-m.until>30000)motions.delete(id);for(const [id,a]of actions)if(now-a.start>=a.duration)actions.delete(id);if(seen)schedule();}
 function schedule(){if(!timer)timer=setTimeout(tick,80);}
 function frame(ch,x,y){if(!(ch?.id||ch?.uid)||!ch.miniature||!ch.tokenArt||reduce()||typeof document!=='undefined'&&document.hidden||typeof rpMode!=='undefined'&&rpMode)return null;
  if(Number(ch.currentHP??ch.hp??1)<=0||(ch.statuses||[]).some(s=>['Unconscious','Paralyzed','Petrified','Stunned'].includes(s.name)))return null;
  const motion=state(ch.id||ch.uid,x,y,performance.now()),frames=make(ch,motion.kind);if(!frames)return null;seen++;schedule();return frames[Math.min(frames.length-1,Math.floor(motion.phase*frames.length))];}
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(!document.hidden&&typeof draw==='function')draw();});
 root.MapWalk={frame,sample,trigger,classify,state,kinds};if(typeof module==='object'&&module.exports)module.exports=root.MapWalk;
})(typeof window==='object'?window:globalThis);
