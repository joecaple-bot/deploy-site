(function(){
  const api=window.MoovablesSpellIcons;
  if(!api || typeof api.find!=='function') return;
  const script=document.currentScript;
  const base=script && script.src ? script.src.replace(/[^/]+$/,'') : 'assets/spell-icons/';
  function esc(value){
    return String(value||'')
      .replace(/&/g,'&amp;')
      .replace(/"/g,'&quot;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }
  api.iconUrl=function(name){
    const entry=api.find(name);
    return entry ? base+'generated/'+entry.slug+'.webp' : '';
  };
  api.html=function(name,size,extraClass){
    size=Number(size)||22;
    const entry=api.find(name);
    const title=entry ? entry.name : (name||'Action');
    if(!entry){
      return '<span class="spell-icon fallback '+(extraClass||'')+'" title="'+esc(title)+'" style="--icon-size:'+size+'px;">?</span>';
    }
    return '<span class="spell-icon '+(extraClass||'')+'" title="'+esc(title)+'" style="--icon-size:'+size+'px;"><img alt="" loading="lazy" decoding="async" src="'+esc(api.iconUrl(name))+'"></span>';
  };
})();
