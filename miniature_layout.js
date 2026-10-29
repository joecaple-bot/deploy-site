/* Organize existing controls without replacing their save or preview handlers. */
(function(root){
let active='Body';
function arrange(host,onTabChange){
 const controls=host.querySelector('.mini-controls'),stage=host.querySelector('.mini-stage');if(!controls||!stage)return;
 const nodes=[...controls.children],names=['Body','Face','Hair','Gear','Decals','Animations'],panels={},tabs={};
 const nav=document.createElement('div');nav.className='mini-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Character customization');
 const content=document.createElement('div');content.className='mini-tab-content';
 const actions=document.createElement('div');actions.className='mini-stage-actions';stage.append(actions);
 function choose(name,focus=false){active=name;for(const n of names){panels[n].hidden=n!==name;tabs[n].setAttribute('aria-selected',String(n===name));tabs[n].tabIndex=n===name?0:-1;}if(focus)tabs[name].focus();onTabChange?.(name);}
 for(const name of names){const tab=document.createElement('button');tab.type='button';tab.textContent=name;tab.id='mini-tab-'+name;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','mini-panel-'+name);tab.onclick=()=>choose(name);tab.onkeydown=e=>{const i=names.indexOf(name),next=e.key==='ArrowRight'?names[(i+1)%names.length]:e.key==='ArrowLeft'?names[(i+names.length-1)%names.length]:e.key==='Home'?names[0]:e.key==='End'?names[names.length-1]:null;if(next){e.preventDefault();choose(next,true);}};tabs[name]=tab;nav.append(tab);const panel=document.createElement('section');panel.id='mini-panel-'+name;panel.className='mini-tab-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panels[name]=panel;content.append(panel);}
 const face=new Set(['brows','mouth','scar','eyeColor','faceWidth','noseSize','eyeSpacing']),hair=new Set(['hair','hairColor','beard']),body=new Set(['raceDetail','skin','height','weight']);
 for(const node of nodes){const key=node.dataset.miniField,text=node.textContent;
 if(key==='frame'||text==='Front view'||text==='Use as map icon'||node.id==='mini-save-status'){actions.append(node);continue;}
 let group='Body';if(key)group=face.has(key)?'Face':hair.has(key)?'Hair':body.has(key)?'Body':'Gear';
 else if(node.classList.contains('mini-decal-studio')){group='Decals';node.open=true;}
 else if(node.classList.contains('mini-wardrobe')||text==='Show equipped gear')group='Gear';
 else if(node.tagName==='BUTTON'&&text.startsWith('Preview '))group='Animations';
 panels[group].append(node);
 }
 const hint=document.createElement('p');hint.className='mini-fit-note';hint.textContent='Headwear tucks hair underneath. Your chosen hairstyle returns when headwear is removed.';panels.Hair.append(hint);
 controls.append(nav,content);choose(names.includes(active)?active:'Body');
}
root.MiniatureLayout={arrange};if(typeof module==='object'&&module.exports)module.exports=root.MiniatureLayout;
})(typeof window==='object'?window:globalThis);
