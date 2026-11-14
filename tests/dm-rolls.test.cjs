const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dm_rolls.js'),'utf8');
const {rollFormula}=require('../dm_rolls.js');

test('rollFormula parses bounded notation and returns its full breakdown',()=>{
  const samples=[0,.49,.999];
  const result=rollFormula(' 3D6 + 3 ',()=>samples.shift());
  assert.deepEqual(result,{formula:'3d6+3',total:13,rolls:[1,3,6],modifier:3});
  assert.deepEqual(rollFormula('1d100-7',()=>.999),{formula:'1d100-7',total:93,rolls:[100],modifier:-7});
});

test('rollFormula accepts its documented limits',()=>{
  const result=rollFormula('100d1000+10000',()=>0);
  assert.equal(result.rolls.length,100);
  assert.equal(result.total,10100);
  assert.equal(rollFormula('1d1-10000',()=>.5).total,-9999);
});

test('rollFormula rejects malformed and out-of-bounds input without evaluating code',()=>{
  for(const formula of ['', 'd6', '0d6', '101d6', '1d0', '1d1001', '2.5d6', '2d6+10001', '2d6-10001', '2d6+3+2', 'process.exit()']){
    assert.throws(()=>rollFormula(formula),Error,formula);
  }
  assert.throws(()=>rollFormula('1d6',()=>NaN),/invalid value/);
});

class NodeStub{
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.firstChild=null;
    this.textContent='';this.className='';this.hidden=false;this.listeners={};this.attributes={};
  }
  appendChild(child){return this.insertBefore(child,null);}
  insertBefore(child,before){
    if(child.parentNode) child.parentNode.children=child.parentNode.children.filter(node=>node!==child);
    const index=before?this.children.indexOf(before):-1;
    if(index<0)this.children.push(child);else this.children.splice(index,0,child);
    child.parentNode=this;this.firstChild=this.children[0]||null;return child;
  }
  replaceChildren(...children){this.children.forEach(child=>child.parentNode=null);this.children=[];this.firstChild=null;children.forEach(child=>this.appendChild(child));}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(type,listener){this.listeners[type]=listener;}
  dispatch(type,event={}){this.listeners[type]?.({preventDefault(){},...event});}
}

function domHarness(){
  let dm=false;
  const ids=new Map();
  const document={
    head:new NodeStub('head'),documentElement:new NodeStub('html'),
    createElement:tag=>new NodeStub(tag),getElementById:id=>ids.get(id)||null
  };
  const context={document,isDM:()=>dm,Math,Number,String,Error,globalThis:null};
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'dm_rolls.js'});
  return {context,host:new NodeStub('div'),setDM:value=>{dm=value;}};
}

function find(node,predicate){
  if(predicate(node)) return node;
  for(const child of node.children){const match=find(child,predicate);if(match)return match;}
  return null;
}

test('panel is mounted first, rolls privately, and removes rendered results outside DM mode',()=>{
  const h=domHarness();
  const sharedChat=new NodeStub('div');
  h.host.appendChild(sharedChat);
  const panel=h.context.DmRolls.mount(h.host);
  assert.equal(h.host.firstChild,panel);
  assert.equal(panel.hidden,true);

  h.setDM(true);
  assert.equal(h.context.DmRolls.refresh(),true);
  assert.equal(panel.hidden,false);
  const d4=find(panel,node=>node.tagName==='BUTTON'&&node.textContent==='d4');
  d4.dispatch('click');
  const results=find(panel,node=>node.className==='dm-rolls__results');
  assert.equal(results.children.length,1);
  assert.equal(find(results,node=>node.className==='dm-rolls__who').textContent,'DM · Private');
  assert.equal(sharedChat.children.length,0,'shared roll chat remains untouched');
  for(let index=0;index<25;index++) d4.dispatch('click');
  assert.equal(results.children.length,20,'private history is bounded');

  h.setDM(false);
  assert.equal(h.context.DmRolls.refresh(),false);
  assert.equal(panel.hidden,true);
  assert.equal(results.children.length,0,'private roll text is removed from the DOM');
});

test('module contains no shared-state or persistence integrations',()=>{
  for(const name of ['broadcast','addChatMessage','emitLiveEffect','scheduleSave','localStorage','lastRoll']){
    assert.equal(new RegExp(`\\b${name}\\b`).test(source),false,name);
  }
});
