(function(root,factory){
  const api=factory(root);
  root.DmRolls=api;
  if(typeof module==='object'&&module.exports) module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';

  const DIE_SIDES=[4,6,8,10,12,20,100];
  const MAX_HISTORY=20;
  const history=[];
  let panel=null;
  let resultList=null;
  let errorText=null;
  let formulaInput=null;

  function rollFormula(value,random=Math.random){
    const match=String(value??'').trim().match(/^(\d+)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?$/i);
    if(!match) throw new Error('Use dice notation such as 2d6+3.');
    const count=Number(match[1]);
    const sides=Number(match[2]);
    const magnitude=match[4]===undefined?0:Number(match[4]);
    const modifier=match[3]==='-'?-magnitude:magnitude;
    if(!Number.isSafeInteger(count)||count<1||count>100) throw new Error('Dice count must be from 1 to 100.');
    if(!Number.isSafeInteger(sides)||sides<1||sides>1000) throw new Error('Die sides must be from 1 to 1000.');
    if(!Number.isSafeInteger(modifier)||Math.abs(modifier)>10000) throw new Error('Modifier must be from -10000 to 10000.');
    if(typeof random!=='function') throw new Error('A random number function is required.');
    const rolls=[];
    for(let index=0;index<count;index++){
      const sample=Number(random());
      if(!Number.isFinite(sample)) throw new Error('Random number function returned an invalid value.');
      const bounded=Math.max(0,Math.min(1-Number.EPSILON,sample));
      rolls.push(Math.floor(bounded*sides)+1);
    }
    const formula=`${count}d${sides}${modifier>0?`+${modifier}`:modifier<0?modifier:''}`;
    return {formula,total:rolls.reduce((sum,roll)=>sum+roll,modifier),rolls,modifier};
  }

  function hasDmAccess(){
    try{return typeof root.isDM==='function'&&root.isDM()===true;}catch(_error){return false;}
  }

  function element(tag,className,text){
    const node=root.document.createElement(tag);
    if(className) node.className=className;
    if(text!==undefined) node.textContent=text;
    return node;
  }

  function ensureStyles(){
    if(root.document.getElementById('dm-rolls-style')) return;
    const style=element('style');
    style.id='dm-rolls-style';
    style.textContent=`
      .dm-rolls{margin:0 0 9px;padding:9px;border:1px solid rgba(222,178,91,.38);border-radius:11px;background:linear-gradient(145deg,rgba(90,50,17,.34),rgba(18,15,13,.72));box-shadow:inset 0 1px rgba(255,236,184,.07)}
      .dm-rolls[hidden]{display:none!important}.dm-rolls__head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}.dm-rolls__title{color:#ffe5a8;font:800 12px Georgia,serif;letter-spacing:.04em}.dm-rolls__badge{padding:2px 6px;border:1px solid rgba(232,189,102,.35);border-radius:999px;color:#cdb88c;font:700 9px Inter,Segoe UI,sans-serif;text-transform:uppercase;letter-spacing:.08em}
      .dm-rolls__dice{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.dm-rolls__dice button,.dm-rolls__form button{min-width:0;padding:5px 2px;font-size:10px}.dm-rolls__form{display:grid;grid-template-columns:1fr auto;gap:5px;margin-top:6px}.dm-rolls__form input{min-width:0;padding:6px 7px;border:1px solid rgba(202,168,107,.3);border-radius:7px;background:rgba(6,7,9,.56);color:#fff3d0;font-size:11px}
      .dm-rolls__error{min-height:0;margin-top:5px;color:#ffb4a8;font-size:10px}.dm-rolls__results{display:grid;gap:4px;max-height:116px;overflow:auto;margin-top:6px}.dm-rolls__result{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;padding:5px 7px;border-left:2px solid #c9943b;border-radius:5px;background:rgba(0,0,0,.2)}.dm-rolls__total{grid-row:1 / span 2;color:#fff0bd;font:900 18px Georgia,serif}.dm-rolls__who{color:#d6bd88;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.dm-rolls__detail{overflow-wrap:anywhere;color:#bdb4a4;font-size:10px}
    `;
    (root.document.head||root.document.documentElement).appendChild(style);
  }

  function breakdown(result){
    const suffix=result.modifier>0?` + ${result.modifier}`:result.modifier<0?` - ${Math.abs(result.modifier)}`:'';
    return `${result.formula} · [${result.rolls.join(', ')}]${suffix}`;
  }

  function renderHistory(){
    if(!resultList) return;
    resultList.replaceChildren();
    history.forEach(result=>{
      const item=element('div','dm-rolls__result');
      item.appendChild(element('strong','dm-rolls__total',String(result.total)));
      item.appendChild(element('span','dm-rolls__who','DM · Private'));
      item.appendChild(element('span','dm-rolls__detail',breakdown(result)));
      resultList.appendChild(item);
    });
  }

  function performRoll(formula){
    if(!hasDmAccess()) return refresh();
    try{
      const result=rollFormula(formula);
      history.unshift(result);
      if(history.length>MAX_HISTORY) history.length=MAX_HISTORY;
      errorText.textContent='';
      renderHistory();
      return result;
    }catch(error){
      errorText.textContent=error.message;
      return null;
    }
  }

  function buildPanel(){
    ensureStyles();
    const section=element('section','dm-rolls');
    section.id='dm-private-rolls';
    section.setAttribute('aria-label','Private DM dice rolls');
    const head=element('div','dm-rolls__head');
    head.appendChild(element('span','dm-rolls__title','Private dice'));
    head.appendChild(element('span','dm-rolls__badge','DM only'));
    section.appendChild(head);
    const dice=element('div','dm-rolls__dice');
    DIE_SIDES.forEach(sides=>{
      const button=element('button','',`d${sides}`);
      button.type='button';
      button.addEventListener('click',()=>performRoll(`1d${sides}`));
      dice.appendChild(button);
    });
    section.appendChild(dice);
    const form=element('form','dm-rolls__form');
    formulaInput=element('input');
    formulaInput.type='text';
    formulaInput.maxLength=40;
    formulaInput.value='2d6+3';
    formulaInput.placeholder='2d6+3';
    formulaInput.setAttribute('aria-label','Private dice formula');
    const rollButton=element('button','', 'Roll');
    rollButton.type='submit';
    form.appendChild(formulaInput);
    form.appendChild(rollButton);
    form.addEventListener('submit',event=>{event.preventDefault();performRoll(formulaInput.value);});
    section.appendChild(form);
    errorText=element('div','dm-rolls__error');
    errorText.setAttribute('role','status');
    section.appendChild(errorText);
    resultList=element('div','dm-rolls__results');
    resultList.setAttribute('aria-live','polite');
    section.appendChild(resultList);
    return section;
  }

  function mount(host){
    if(!host||typeof host.insertBefore!=='function') return null;
    if(!panel) panel=buildPanel();
    if(panel.parentNode!==host) host.insertBefore(panel,host.firstChild||null);
    refresh();
    return panel;
  }

  function refresh(){
    if(!panel) return false;
    const allowed=hasDmAccess();
    panel.hidden=!allowed;
    if(!allowed){
      errorText.textContent='';
      resultList.replaceChildren();
    }else renderHistory();
    return allowed;
  }

  return {mount,refresh,rollFormula};
});
