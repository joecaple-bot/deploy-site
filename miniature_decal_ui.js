(function(root,factory){
 const api=factory(root);
 root.MiniatureDecalUI=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 const SHAPES=['circle','square','triangle','diamond','star','stripe','ring','heart'];
 const MAX_DECALS=6,MAX_LAYERS=16,MAX_HISTORY=30;

 function copy(value){return JSON.parse(JSON.stringify(value));}
 function clamp(value,min,max,fallback){value=Number(value);return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;}
 function uid(prefix,used){
  let id;
  do{id=prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}while(used&&used.has(id));
  return id;
 }
 function fallbackSanitize(raw){
  const used=new Set();
  return (Array.isArray(raw)?raw:[]).slice(0,MAX_DECALS).map((decal,index)=>{
   decal=decal&&typeof decal==='object'?decal:{};
   let id=typeof decal.id==='string'&&decal.id.trim()?decal.id.trim():uid('decal',used);
   if(used.has(id))id=uid('decal',used);used.add(id);
   const layers=(Array.isArray(decal.layers)?decal.layers:[]).slice(0,MAX_LAYERS).map(layer=>{
    layer=layer&&typeof layer==='object'?layer:{};
    return {shape:SHAPES.includes(layer.shape)?layer.shape:'star',color:/^#[0-9a-f]{6}$/i.test(layer.color||'')?layer.color:'#d8b56c',x:clamp(layer.x,0,1,.5),y:clamp(layer.y,0,1,.5),scale:clamp(layer.scale,.05,1.5,.65),stretchX:clamp(layer.stretchX,.25,4,1),stretchY:clamp(layer.stretchY,.25,4,1),mirrorX:layer.mirrorX===true,mirrorY:layer.mirrorY===true,rotation:clamp(layer.rotation,-180,180,0),opacity:clamp(layer.opacity,0,1,1)};
   });
   return {id,name:typeof decal.name==='string'&&decal.name.trim()?decal.name.trim().slice(0,80):'Decal '+(index+1),target:'torso',point:Array.isArray(decal.point)?decal.point.slice(0,3).map((n,i)=>clamp(n,-20,20,i===2?.28:0)):[0,0,.28],normal:Array.isArray(decal.normal)?decal.normal.slice(0,3).map((n,i)=>clamp(n,-1,1,i===2?1:0)):[0,0,1],size:clamp(decal.size,.1,1.2,.45),rotation:clamp(decal.rotation,-180,180,0),layers};
  });
 }
 function sanitize(raw){
  const core=root.MiniatureDecals;
  if(core&&typeof core.sanitize==='function')return copy(core.sanitize(raw));
  return fallbackSanitize(raw);
 }
 function defaultLayer(shape){return {shape:shape||'star',color:'#d8b56c',x:.5,y:.5,scale:.65,stretchX:1,stretchY:1,mirrorX:false,mirrorY:false,rotation:0,opacity:1};}
 function defaultDecal(existing){return {id:uid('decal',new Set(existing.map(d=>d.id))),name:'Chest decal',target:'torso',point:[0,0,.28],normal:[0,0,1],size:.45,rotation:0,layers:[defaultLayer('star')]};}
 function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
 function button(text,label){const node=el('button','',text);node.type='button';if(label)node.setAttribute('aria-label',label);return node;}
 function option(value,text){const node=el('option','',text);node.value=value;return node;}
 function field(parent,labelText,input,hint){
  const label=el('label','mini-decal-field');const line=el('span','mini-decal-label',labelText);label.append(line,input);if(hint)label.append(el('small','mini-decal-hint',hint));parent.append(label);return line;
 }

 function mount(host,options){
  if(!host||typeof host.append!=='function')throw new TypeError('MiniatureDecalUI.mount needs a host element.');
  options=options||{};
  const getDecals=typeof options.getDecals==='function'?options.getDecals:()=>[];
  const onChange=typeof options.onChange==='function'?options.onChange:()=>{};
  const onPlace=typeof options.onPlace==='function'?options.onPlace:()=>{};
  let decals=sanitize(getDecals()),selectedId=decals[0]?.id||null,selectedLayer=0,disposed=false;
  const undo=[],redo=[];

  const studio=el('details','mini-decal-studio');studio.open=false;
  const summary=el('summary','mini-decal-summary');
  summary.append(el('span','mini-decal-kicker','MINIATURE · DECALS'),el('span','mini-decal-summary-title','Decal studio'));
  const body=el('div','mini-decal-body');studio.append(summary,body);host.append(studio);

  function selected(){return decals.find(d=>d.id===selectedId)||null;}
  function snapshot(){return copy(decals);}
  function remember(stack,value){stack.push(copy(value));if(stack.length>MAX_HISTORY)stack.shift();}
  function notify(){onChange(copy(decals));}
  function commit(mutator){const before=snapshot();mutator();decals=sanitize(decals);remember(undo,before);redo.length=0;notify();render();}
  function applyLive(mutator){mutator();decals=sanitize(decals);notify();paintPreview();}
  function finishLive(before){if(!before)return;if(JSON.stringify(before)!==JSON.stringify(decals)){remember(undo,before);redo.length=0;}render();}
  function restore(from,to){if(!from.length)return;remember(to,snapshot());decals=sanitize(from.pop());if(!selected()&&decals.length)selectedId=decals[0].id;selectedLayer=Math.max(0,Math.min(selectedLayer,(selected()?.layers.length||1)-1));notify();render();}

  let canvas,canvasStatus;
  function paintPreview(){
   if(!canvas)return;
   const ctx=canvas.getContext('2d'),decal=selected();ctx.clearRect(0,0,canvas.width,canvas.height);
   if(!decal)return;
   const core=root.MiniatureDecals;
   if(core&&typeof core.paint==='function')core.paint(ctx,decal.layers,canvas.width);
   else{ctx.fillStyle='#1d2830';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#aebbc0';ctx.font='13px Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillText('Preview unavailable',canvas.width/2,canvas.height/2);}
   const layer=decal.layers[selectedLayer];
   if(layer){const radius=Math.max(10,layer.scale*canvas.width*.28);ctx.save();ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(layer.x*canvas.width-radius,layer.y*canvas.height-radius,radius*2,radius*2);ctx.restore();}
  }
  function render(){
   if(disposed)return;
   body.replaceChildren();
   const toolbar=el('div','mini-decal-toolbar');
   const picker=el('select','mini-decal-picker');picker.setAttribute('aria-label','Selected decal');
   if(!decals.length)picker.append(option('','No decals yet'));
   decals.forEach((d,index)=>picker.append(option(d.id,(index+1)+'. '+d.name)));
   picker.value=selectedId||'';picker.disabled=!decals.length;
   picker.onchange=()=>{selectedId=picker.value;selectedLayer=0;render();};
   const add=button('Add','Add decal');add.disabled=decals.length>=MAX_DECALS;
   add.onclick=()=>commit(()=>{const decal=defaultDecal(decals);decals.push(decal);selectedId=decal.id;selectedLayer=0;});
   const duplicate=button('Duplicate','Duplicate selected decal');duplicate.disabled=!selected()||decals.length>=MAX_DECALS;
   duplicate.onclick=()=>commit(()=>{const source=selected(),clone=copy(source);clone.id=uid('decal',new Set(decals.map(d=>d.id)));clone.name=(source.name+' copy').slice(0,80);decals.splice(decals.indexOf(source)+1,0,clone);selectedId=clone.id;});
   const remove=button('Remove','Remove selected decal');remove.className='mini-decal-danger';remove.disabled=!selected();
   remove.onclick=()=>commit(()=>{const index=decals.findIndex(d=>d.id===selectedId);decals.splice(index,1);selectedId=decals[Math.min(index,decals.length-1)]?.id||null;selectedLayer=0;});
   toolbar.append(picker,add,duplicate,remove);body.append(toolbar);
   const core=root.MiniatureDecals,presets=Array.isArray(core?.presets)?core.presets:[];
   if(presets.length&&typeof core.clonePreset==='function'){const presetBar=el('div','mini-decal-presets');const presetPicker=el('select');presetPicker.setAttribute('aria-label','Starter emblem preset');presets.forEach(p=>presetPicker.append(option(p.id,p.name)));const usePreset=button('Use preset','Replace selected decal layers with starter emblem preset');usePreset.disabled=!selected();usePreset.onclick=()=>commit(()=>{const preset=core.clonePreset(presetPicker.value),d=selected();d.name=preset.name;d.layers=preset.layers;selectedLayer=0;});field(presetBar,'Starter emblem',presetPicker);presetBar.append(usePreset);body.append(presetBar);}
   const cap=el('p','mini-decal-cap',decals.length>=MAX_DECALS?'Six decals is the maximum for one miniature. Remove one to add another.':decals.length+' of '+MAX_DECALS+' decal slots used.');cap.setAttribute('role','status');body.append(cap);

   const history=el('div','mini-decal-history');const undoButton=button('Undo');undoButton.disabled=!undo.length;undoButton.onclick=()=>restore(undo,redo);const redoButton=button('Redo');redoButton.disabled=!redo.length;redoButton.onclick=()=>restore(redo,undo);history.append(undoButton,redoButton);body.append(history);
   const decal=selected();
   if(!decal){body.append(el('p','mini-decal-empty','Add a decal to start with a gold star on the chest.'));return;}

   const basics=el('section','mini-decal-basics');basics.setAttribute('aria-label','Decal settings');
   const name=el('input');name.type='text';name.maxLength=80;name.value=decal.name;name.autocomplete='off';
   name.onchange=()=>{const value=name.value.trim()||'Untitled decal';commit(()=>{selected().name=value;});};field(basics,'Name',name);
   function range(label,key,min,max,step,format){
    const input=el('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=decal[key];let before=null;
    const line=field(basics,label+' · '+format(decal[key]),input);input.setAttribute('aria-label',label);
    input.oninput=()=>{if(!before)before=snapshot();const value=Number(input.value);applyLive(()=>{selected()[key]=value;});line.textContent=label+' · '+format(value);};
    const finish=()=>{const saved=before;before=null;finishLive(saved);};input.onchange=finish;input.onblur=finish;
   }
   range('Model size','size',.1,1.2,.01,value=>Number(value).toFixed(2));
   range('Model rotation','rotation',-180,180,1,value=>Math.round(value)+'°');body.append(basics);

   const workspace=el('div','mini-decal-workspace');
   const preview=el('div','mini-decal-preview');canvas=el('canvas','mini-decal-canvas');canvas.width=canvas.height=256;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Decal preview. Drag the selected shape to position it.');
   canvasStatus=el('p','mini-decal-canvas-help','Drag the selected shape to position it.');
   let drag=null;
   canvas.onpointerdown=event=>{if(!selected().layers[selectedLayer])return;drag={id:event.pointerId,before:snapshot()};canvas.setPointerCapture(event.pointerId);move(event);};
   canvas.onpointermove=event=>{if(drag&&drag.id===event.pointerId)move(event);};
   canvas.onpointerup=canvas.onpointercancel=event=>{if(!drag||drag.id!==event.pointerId)return;const before=drag.before;drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);finishLive(before);};
   function move(event){const rect=canvas.getBoundingClientRect(),x=clamp((event.clientX-rect.left)/rect.width,0,1,.5),y=clamp((event.clientY-rect.top)/rect.height,0,1,.5);applyLive(()=>{const layer=selected().layers[selectedLayer];if(layer){layer.x=x;layer.y=y;}});canvasStatus.textContent='Position: '+Math.round(x*100)+'% across, '+Math.round(y*100)+'% down.';}
   preview.append(canvas,canvasStatus);workspace.append(preview);

   const layers=el('section','mini-decal-layers');layers.setAttribute('aria-label','Decal layers');
   const layersHead=el('div','mini-decal-section-head');layersHead.append(el('h4','', 'Layers'));
   const shapePicker=el('select');shapePicker.setAttribute('aria-label','Shape to add');SHAPES.forEach(shape=>shapePicker.append(option(shape,shape[0].toUpperCase()+shape.slice(1))));
   const addLayer=button('Add shape');addLayer.disabled=decal.layers.length>=MAX_LAYERS;addLayer.onclick=()=>commit(()=>{selected().layers.push(defaultLayer(shapePicker.value));selectedLayer=selected().layers.length-1;});
   layersHead.append(shapePicker,addLayer);layers.append(layersHead);
   layers.append(el('p','mini-decal-layer-cap',decal.layers.length>=MAX_LAYERS?'Sixteen layers is the maximum for one decal.':decal.layers.length+' of '+MAX_LAYERS+' layers used.'));
   const layerList=el('div','mini-decal-layer-list');layerList.setAttribute('role','listbox');layerList.setAttribute('aria-label','Layers, back to front');
   decal.layers.forEach((layer,index)=>{const item=button((index+1)+'. '+layer.shape);item.className='mini-decal-layer-item'+(index===selectedLayer?' is-active':'');item.setAttribute('role','option');item.setAttribute('aria-selected',String(index===selectedLayer));item.onclick=()=>{selectedLayer=index;render();};layerList.append(item);});layers.append(layerList);
   const layer=decal.layers[selectedLayer];if(layer)layers.append(layerEditor(layer));
   workspace.append(layers);body.append(workspace);

   const placement=el('div','mini-decal-placement');const place=button('Place on miniature','Place selected decal on miniature');place.className='mini-decal-primary';
   const placeHelp=el('p','mini-decal-place-help','Choose Place, then click a surface on the miniature to place this decal.');placeHelp.id=uid('mini-decal-place');place.setAttribute('aria-describedby',placeHelp.id);
   const placeStatus=el('p','mini-decal-place-status');placeStatus.setAttribute('role','status');
   place.onclick=()=>{onPlace(decal.id);placeStatus.textContent='Placement ready. Click a surface on the miniature.';};
   const nudges=el('div','mini-decal-nudges');nudges.setAttribute('role','group');nudges.setAttribute('aria-label','Nudge decal along the surface');
   [['↑','up'],['←','left'],['↓','down'],['→','right']].forEach(([symbol,direction])=>{const control=button(symbol,'Nudge decal '+direction);control.disabled=!core||typeof core.nudge!=='function';control.onclick=()=>commit(()=>{const moved=core.nudge(selected(),direction,.025);if(moved)Object.assign(selected(),moved);});nudges.append(control);});
   placement.append(place,placeHelp,nudges,placeStatus);body.append(placement);
   paintPreview();
  }

  function layerEditor(layer){
   const panel=el('div','mini-decal-layer-editor');
   const shape=el('select');SHAPES.forEach(value=>shape.append(option(value,value[0].toUpperCase()+value.slice(1))));shape.value=layer.shape;shape.onchange=()=>commit(()=>{selected().layers[selectedLayer].shape=shape.value;});field(panel,'Shape',shape);
   const color=el('input');color.type='color';color.value=layer.color;let colorBefore=null;color.oninput=()=>{if(!colorBefore)colorBefore=snapshot();applyLive(()=>{selected().layers[selectedLayer].color=color.value;});};const finishColor=()=>{const saved=colorBefore;colorBefore=null;finishLive(saved);};color.onchange=finishColor;color.onblur=finishColor;field(panel,'Colour',color);
   function range(label,key,min,max,step,format){
    const input=el('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=layer[key];let before=null;
    const line=field(panel,label+' · '+format(layer[key]),input);input.setAttribute('aria-label',label);
    input.oninput=()=>{if(!before)before=snapshot();const value=Number(input.value);applyLive(()=>{selected().layers[selectedLayer][key]=value;});line.textContent=label+' · '+format(value);};
    const finish=()=>{const saved=before;before=null;finishLive(saved);};input.onchange=finish;input.onblur=finish;
   }
   range('Opacity','opacity',0,1,.01,value=>Math.round(value*100)+'%');range('X position','x',0,1,.01,value=>Math.round(value*100)+'%');range('Y position','y',0,1,.01,value=>Math.round(value*100)+'%');range('Scale','scale',.05,1.5,.01,value=>Number(value).toFixed(2));range('Rotation','rotation',-180,180,1,value=>Math.round(value)+'°');
   range('Stretch width','stretchX',.25,4,.01,value=>Number(value).toFixed(2)+'×');range('Stretch height','stretchY',.25,4,.01,value=>Number(value).toFixed(2)+'×');
   const transforms=el('div','mini-decal-layer-transforms');transforms.setAttribute('role','group');transforms.setAttribute('aria-label','Mirror selected layer');
   const mirrorX=button(layer.mirrorX?'Unmirror horizontally':'Mirror horizontally');mirrorX.setAttribute('aria-pressed',String(layer.mirrorX));mirrorX.onclick=()=>commit(()=>{const l=selected().layers[selectedLayer];l.mirrorX=!l.mirrorX;});
   const mirrorY=button(layer.mirrorY?'Unmirror vertically':'Mirror vertically');mirrorY.setAttribute('aria-pressed',String(layer.mirrorY));mirrorY.onclick=()=>commit(()=>{const l=selected().layers[selectedLayer];l.mirrorY=!l.mirrorY;});transforms.append(mirrorX,mirrorY);panel.append(transforms);
   const actions=el('div','mini-decal-layer-actions');
   const duplicate=button('Duplicate');duplicate.disabled=selected().layers.length>=MAX_LAYERS;duplicate.onclick=()=>commit(()=>{const layers=selected().layers;layers.splice(selectedLayer+1,0,copy(layers[selectedLayer]));selectedLayer++;});
   const remove=button('Delete');remove.className='mini-decal-danger';remove.onclick=()=>commit(()=>{selected().layers.splice(selectedLayer,1);selectedLayer=Math.max(0,Math.min(selectedLayer,selected().layers.length-1));});
   const back=button('Send back');back.disabled=selectedLayer===0;back.onclick=()=>commit(()=>{const layers=selected().layers;[layers[selectedLayer-1],layers[selectedLayer]]=[layers[selectedLayer],layers[selectedLayer-1]];selectedLayer--;});
   const forward=button('Bring forward');forward.disabled=selectedLayer===selected().layers.length-1;forward.onclick=()=>commit(()=>{const layers=selected().layers;[layers[selectedLayer+1],layers[selectedLayer]]=[layers[selectedLayer],layers[selectedLayer+1]];selectedLayer++;});
   actions.append(duplicate,remove,back,forward);panel.append(actions);return panel;
  }

  function refresh(){if(disposed)return;decals=sanitize(getDecals());if(!selected()&&decals.length)selectedId=decals[0].id;if(!decals.length)selectedId=null;selectedLayer=Math.max(0,Math.min(selectedLayer,(selected()?.layers.length||1)-1));render();}
  function dispose(){if(disposed)return;disposed=true;studio.remove();decals=[];undo.length=redo.length=0;canvas=null;}
  render();
  return {refresh,dispose,place(id,placement){if(disposed||!decals.some(d=>d.id===id))return;commit(()=>{const d=decals.find(d=>d.id===id);Object.assign(d,placement);});}};
 }
 return {mount};
});
