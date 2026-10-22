/* Independent cosmetic idle sequences: no multiplayer traffic or gameplay state. */
(function(root){
 const kinds=['idle','idle-look','idle-shift','idle-ready','idle-stretch','idle-nod','idle-scan','idle-shoulders','idle-heel','idle-settle'];
 function createScheduler(seed=Math.floor(Math.random()*4294967296)){
  const actors=new Map();
  function entry(id,now){let a=actors.get(id);if(a)return a;let h=2166136261^seed;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);a={rng:h>>>0,bag:[],kind:null,start:now,duration:0,paused:false};if(actors.size>=512)actors.delete(actors.keys().next().value);actors.set(id,a);return a;}
  function random(a){a.rng=(a.rng+0x6D2B79F5)>>>0;let t=a.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
  function next(a,now){if(!a.bag.length){a.bag=[...kinds];for(let i=a.bag.length-1;i>0;i--){const j=Math.floor(random(a)*(i+1));[a.bag[i],a.bag[j]]=[a.bag[j],a.bag[i]];}if(a.bag[a.bag.length-1]===a.kind)[a.bag[0],a.bag[a.bag.length-1]]=[a.bag[a.bag.length-1],a.bag[0]];}a.kind=a.bag.pop();a.start=now;a.duration=3200+random(a)*2800;}
  return {sample(id,now){const a=entry(id,now);if(!a.kind){next(a,now);if(!a.paused)a.start-=random(a)*a.duration;a.paused=false;}else if(a.paused||now<a.start){a.start=now;a.paused=false;}else if(now>=a.start+a.duration)next(a,now);return {kind:a.kind,phase:Math.min(1,Math.max(0,(now-a.start)/a.duration))};},pause(id,now){const a=entry(id,now);a.paused=true;}};
 }
 root.MiniatureIdle={kinds,createScheduler};if(typeof module==='object'&&module.exports)module.exports=root.MiniatureIdle;
})(typeof window==='object'?window:globalThis);
