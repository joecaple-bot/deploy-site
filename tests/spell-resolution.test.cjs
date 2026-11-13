const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const mapSource=fs.readFileSync(path.join(root,'map.html'),'utf8');
const gameplayTestSource=fs.readFileSync(path.join(__dirname,'gameplay.test.cjs'),'utf8');

function extract(name,file=mapSource){
  const start=file.search(new RegExp('(?:async )?function '+name+'\\('));
  assert(start>=0,`missing ${name}`);
  const next=/\n(?:async )?function /.exec(file.slice(start+1));
  return file.slice(start,next?start+1+next.index:undefined);
}

// Reuse the established gameplay harness without running its test cases.
const firstTest=gameplayTestSource.indexOf("\ntest('");
assert(firstTest>0,'gameplay harness setup');
const bootstrap={require,__dirname,console,process,Buffer,setImmediate,clearImmediate};
vm.createContext(bootstrap);
vm.runInContext(gameplayTestSource.slice(0,firstTest)+'\nglobalThis.__spellHarness=harness;',bootstrap,{filename:'gameplay-harness-setup.cjs'});
const baseHarness=bootstrap.__spellHarness;

function harness(){
  const h=baseHarness(),c=h.c;
  c.MapWalk={classify:()=> 'spell'};
  c.gameplayMiniatureAnimation=()=>{};
  c.setConcentration=()=>{};
  c.concentrationSpellName=()=>'';
  c.addEnemyStatus=(id,name,rounds,meta={})=>{
    const target=c.enemyByUid(id);
    if(!target)return null;
    target.statuses.push({name,rounds,...meta});
    return target;
  };
  c.addCharacterStatus=(id,name,rounds,meta={})=>{
    const target=c.characterById(id);
    if(!target)return null;
    target.statuses.push({name,rounds,...meta});
    return target;
  };
  for(const name of ['validDiceFormula','diceCountFromFormula','dieFromFormula','inferSaveAbility','inferSaveHalfDamage','diceFormulaAtLevel','diceFormulaForAction']){
    vm.runInContext(extract(name),c);
  }
  return h;
}

function windowId(h){return h.eval('gameplayWindow&&gameplayWindow.id');}
function windowOpen(h){return h.eval('!!gameplayWindow');}
function dmResolve(h,id,outcome,from){
  h.c.gameplayHandleMessage({type:'gameplayResolveWindow',windowId:id,outcome,from});
}
function tick(){return new Promise(resolve=>setImmediate(resolve));}

test('Sacred Flame resolves failed and successful saves after the DM closes the window',async t=>{
  await t.test('failed save damages once after the DM message',async()=>{
    const h=harness(),{c,hero,enemy}=h;
    hero.derived.spellSaveDC=13;
    hero.spells=[{id:'sacred',name:'Sacred Flame'}];
    h.setDie(10);
    const cast=c.rollCharacterAction('hero','spell','sacred');
    await tick();
    const id=windowId(h);
    assert.ok(id);
    assert.equal(enemy.hp,100,'damage waits for DM approval');
    dmResolve(h,id);
    await cast;
    assert.equal(enemy.hp,96);
    dmResolve(h,id);
    assert.equal(enemy.hp,96,'duplicate approval cannot apply the spell twice');
  });

  await t.test('successful save applies no Sacred Flame damage',async()=>{
    const h=harness(),{c,hero,enemy}=h;
    hero.derived.spellSaveDC=13;
    hero.spells=[{id:'sacred',name:'Sacred Flame'}];
    h.setDie(15);
    const cast=c.rollCharacterAction('hero','spell','sacred');
    await tick();
    dmResolve(h,windowId(h));
    await cast;
    assert.equal(enemy.hp,100);
    assert.match(h.logs.at(-1).detail,/Saved/);
  });
});

test('Healing Word is normalized as a level-one bonus action and uses the casting modifier',()=>{
  const h=harness(),{c,hero}=h;
  const normalized=c.GameplayRules.spellItem({id:'word',name:'Healing Word',spellLevel:0,castLevel:0,actionCost:'action'});
  assert.equal(normalized.id,'word');
  assert.equal(normalized.spellLevel,1);
  assert.equal(normalized.castLevel,1);
  assert.equal(normalized.actionCost,'bonus');
  assert.equal(normalized.actionType,'healing');
  const prepared=c.gameplaySpellForCast(hero,normalized);
  assert.equal(prepared.damageFormula,'1d4');
  assert.equal(prepared.bonus,3);
});

test('legacy Healing Word casts as a bonus action, heals after approval, and spends one level-one slot',async()=>{
  const h=harness(),{c,hero,messages}=h;
  hero.currentHP=20;
  hero.spells=[{id:'word',name:'Healing Word',spellLevel:0,castLevel:0,actionCost:'action'}];
  const cast=c.rollCharacterAction('hero','spell','word');
  await tick();
  assert.equal(hero.currentHP,20,'healing waits for reaction approval');
  assert.equal(hero.spellSlotUsage[1],1);
  assert.equal(c.turnActionState.bonusActionTaken,true);
  assert.equal(c.turnActionState.actionTaken,undefined);
  dmResolve(h,windowId(h));
  await cast;
  assert.equal(hero.currentHP,27);
  assert.equal(hero.spellSlotUsage[1],1);
  assert.equal(messages.findLast(row=>row.type==='gameplayDamage')?.patch.currentHP,27);
});

test('a Counterspelled spell deals no damage while both casters spend their resources',async()=>{
  const h=harness(),{c,hero,enemy}=h;
  const mage={id:'mage',name:'Mage',class:'Wizard',level:5,currentHP:30,derived:{HP:30,AC:12,spellAttackBonus:6},stats:{STR:8,DEX:12,CON:12,INT:18,WIS:10,CHA:10},statuses:[],spells:[c.GameplayRules.spellItem({name:'Counterspell'})],spellSlotUsage:{},featureUsage:{},position:{x:5,y:0}};
  c.characterById=id=>id==='hero'?hero:id==='mage'?mage:null;
  c.allCharactersById=()=>({hero,mage});
  hero.spells=[{id:'wounds',name:'Inflict Wounds',spellLevel:1,castLevel:1}];
  const cast=c.rollCharacterAction('hero','spell','wounds');
  await tick();
  assert.equal(c.gameplayUseReaction(mage,'Counterspell'),true);
  c.gameplayCloseWindow();
  await cast;
  assert.equal(enemy.hp,100);
  assert.equal(hero.spellSlotUsage[1],1);
  assert.equal(c.turnActionState.actionTaken,true);
  assert.equal(mage.spellSlotUsage[3],1);
  assert.equal(mage.reactionUsed,true);
});

test('manual spell outcomes apply only a validated DM choice',async t=>{
  for(const scenario of [
    {kind:'damage',outcome:{kind:'damage',damageType:'fire',condition:'',rounds:0,targets:[{id:'enemy',amount:7}]},before:100,after:93},
    {kind:'healing',outcome:{kind:'healing',damageType:'',condition:'',rounds:0,targets:[{id:'hero',amount:6}]},before:20,after:26},
    {kind:'condition',outcome:{kind:'condition',damageType:'',condition:'Restrained',rounds:2,targets:[{id:'enemy',amount:0}]}}
  ])await t.test(scenario.kind,async()=>{
    const h=harness(),{c,hero,enemy,warnings}=h;
    hero.spells=[{id:'unknown',name:'Uncatalogued Spell',spellLevel:1,castLevel:1,actionCost:'action',actionType:'utility'}];
    if(scenario.kind==='healing')hero.currentHP=scenario.before;
    const cast=c.rollCharacterAction('hero','spell','unknown');
    await tick();
    const id=windowId(h);
    assert.ok(id);
    dmResolve(h,id,{kind:'damage',damageType:'not-a-type',targets:[{id:'enemy',amount:999}]});
    assert.equal(windowOpen(h),true,'invalid DM payload leaves adjudication open');
    assert.equal(enemy.hp,100);
    assert.equal(hero.currentHP,scenario.kind==='healing'?scenario.before:40);
    assert.match(warnings.at(-1),/valid spell outcome/);
    dmResolve(h,id,scenario.outcome);
    await cast;
    if(scenario.kind==='damage')assert.equal(enemy.hp,scenario.after);
    if(scenario.kind==='healing')assert.equal(hero.currentHP,scenario.after);
    if(scenario.kind==='condition')assert.deepEqual(Array.from(enemy.statuses,s=>[s.name,s.rounds]),[['Restrained',2]]);
    assert.equal(hero.spellSlotUsage[1],1);
  });
});

test('duplicate, unauthorized and stale DM outcome messages cannot replay an effect',async()=>{
  const h=harness(),{c,hero,enemy}=h;
  c.campaignInfo={ownerId:'owner',dmEnabled:true,dmPermissions:{}};
  hero.spells=[{id:'unknown',name:'Uncatalogued Spell',spellLevel:1,castLevel:1,actionCost:'action',actionType:'utility'}];
  const cast=c.rollCharacterAction('hero','spell','unknown');
  await tick();
  const id=windowId(h),outcome={kind:'damage',damageType:'force',condition:'',rounds:0,targets:[{id:'enemy',amount:5}]};
  dmResolve(h,id,outcome,'intruder');
  assert.equal(enemy.hp,100);
  assert.equal(windowOpen(h),true);
  dmResolve(h,id,outcome,'owner');
  await cast;
  assert.equal(enemy.hp,95);
  dmResolve(h,id,outcome,'owner');
  assert.equal(enemy.hp,95);
  c.gameplayHandleMessage({type:'gameplayWindow',window:{id,actorId:'hero',actorName:'Hero',actionName:'Replay',type:'spell',targetIds:[]}});
  assert.equal(windowOpen(h),false,'a closed window cannot be reopened by a stale packet');
});

test('a duplicated close arriving before resolution does not strand the origin promise',async()=>{
  const h=harness(),{c,hero,enemy}=h;
  hero.spells=[{id:'bolt',name:'Fire Bolt'}];
  const cast=c.rollCharacterAction('hero','spell','bolt');
  await tick();
  const id=windowId(h);
  c.gameplayHandleMessage({type:'gameplayWindowClosed',windowId:id});
  c.gameplayHandleMessage({type:'gameplayWindowClosed',windowId:id});
  assert.equal(windowOpen(h),true,'remote close packets must not clear an origin-owned resolver');
  dmResolve(h,id);
  await cast;
  assert.equal(enemy.hp,96);
  assert.equal(windowOpen(h),false);
});

test('dual-transport packets with the same packet id apply reactions and effects once',async()=>{
  const h=harness(),{c,hero,enemy}=h;
  hero.spells=[{id:'unknown',name:'Uncatalogued Spell',spellLevel:1,castLevel:1,actionCost:'action',actionType:'utility'}];
  const cast=c.rollCharacterAction('hero','spell','unknown');
  await tick();
  const id=windowId(h),sentAt=Date.now();
  const reaction={type:'gameplayReaction',packetId:'transport-reaction',sentAt,id:'reaction-a',windowId:id,name:'Remote',label:'One reaction',cancelled:false,patch:{id:'hero',statuses:[],reactionUsed:false,spellSlotUsage:{1:1},featureUsage:{}}};
  c.gameplayHandleMessage(reaction);
  c.gameplayHandleMessage({...reaction,id:'reaction-b'});
  assert.equal(h.logs.filter(row=>row.kind==='reaction').length,1);
  const outcome={kind:'damage',damageType:'force',condition:'',rounds:0,targets:[{id:'enemy',amount:6}]};
  const effect={type:'gameplayResolveWindow',packetId:'transport-effect',sentAt,windowId:id,outcome};
  c.gameplayHandleMessage(effect);
  c.gameplayHandleMessage(effect);
  await cast;
  assert.equal(enemy.hp,94);
  assert.equal(h.eval('gameplayTransportPackets.size'),2);
});

test('applyAoeResult preserves explicit damage type and reports the same HP as gameplayDamage',()=>{
  const h=harness(),{c,enemy}=h;
  enemy.resistances=['fire'];
  const fire=c.applyAoeResult({kind:'enemy',entity:enemy},10,'damage','Manual ruling','fire');
  assert.equal(fire.hpAfter,95);
  assert.equal(fire.hpAfter,enemy.hp);
  const force=c.applyAoeResult({kind:'enemy',entity:enemy},10,'damage','Manual ruling','force');
  assert.equal(force.hpAfter,85);
  assert.equal(force.hpAfter,enemy.hp);
});

test('spell-attack descriptions mentioning a rider save stay attack rolls',async()=>{
  const h=harness(),{c,hero,enemy}=h;
  const ray={id:'ray',name:'Ray of Sickness',spellLevel:1,castLevel:1,actionCost:'action',actionType:'damage',damageFormula:'1d8',damageType:'poison',attackSave:'Ranged Spell Attack',description:'On a hit, the target also makes a CON save or is poisoned.'};
  assert.equal(c.inferSaveAbility(ray),'');
  hero.spells=[ray];
  const kinds=[];const roll=c.rollWithBuffs;c.rollWithBuffs=(ch,formula,bonus,kind,...rest)=>{kinds.push(kind);return roll(ch,formula,bonus,kind,...rest);};
  const cast=c.executeCharacterAction('hero','spell','ray');
  await tick();
  dmResolve(h,windowId(h));
  await cast;
  assert.deepEqual(kinds,['attack']);
  assert.equal(enemy.hp,96);
});

test('enemy Sacred Flame and Healing Word both pause for reactions before applying HP changes',async t=>{
  await t.test('Sacred Flame damages the selected character only after approval',async()=>{
    const h=harness(),{c,hero,enemy}=h;
    c.isDM=()=>true;
    c.activeTurnIndex=1;
    c.selectedTargetCharacter=()=>hero;
    enemy.saveDC=13;
    enemy.spells=[{id:'sacred',name:'Sacred Flame'}];
    h.setDie(5);
    const cast=c.rollEnemyAction('enemy','spell','sacred');
    await tick();
    assert.equal(hero.currentHP,40);
    const id=windowId(h);assert.ok(id);
    dmResolve(h,id);
    await cast;
    assert.equal(hero.currentHP,36);
  });

  await t.test('Healing Word heals the enemy only after approval',async()=>{
    const h=harness(),{c,enemy}=h;
    c.isDM=()=>true;
    c.activeTurnIndex=1;
    c.selectedTargetCharacter=()=>null;
    c.selectedTargetUid='enemy';
    enemy.hp=50;
    enemy.spells=[{id:'word',name:'Healing Word',spellLevel:0,castLevel:0,actionCost:'action'}];
    const cast=c.rollEnemyAction('enemy','spell','word');
    await tick();
    assert.equal(enemy.hp,50);
    const id=windowId(h);assert.ok(id);
    dmResolve(h,id);
    await cast;
    assert.equal(enemy.hp,54);
    assert.equal(c.turnActionState.bonusActionTaken,true);
  });
});

async function resolveEveryRay(h,promise){
  let guard=0;
  while(guard++<10){
    await tick();
    const id=windowId(h);
    if(!id)break;
    dmResolve(h,id);
  }
  return promise;
}

test('Eldritch Blast and Scorching Ray allocate and roll each beam separately',async t=>{
  await t.test('level-five Eldritch Blast makes two attacks',async()=>{
    const h=harness(),{c,hero,enemy,elements}=h;
    hero.spells=[{id:'blast',name:'Eldritch Blast'}];
    let attacks=0;const roll=c.rollWithBuffs;c.rollWithBuffs=(...args)=>{attacks++;return roll(...args);};
    const cast=c.rollCharacterAction('hero','spell','blast');
    await tick();
    assert.equal(elements.filter(e=>/^Beam [12] $/.test(e.textContent)).length,2);
    elements.find(e=>e.textContent==='Cast').onclick();
    await resolveEveryRay(h,cast);
    assert.equal(attacks,2);
    assert.equal(h.logs.filter(x=>/^Beam [12]\//.test(x.detail)).length,2);
    assert.equal(enemy.hp,92);
  });

  await t.test('level-three Scorching Ray makes four attacks and spends one slot',async()=>{
    const h=harness(),{c,hero,enemy,elements}=h;
    hero.spells=[{id:'rays',name:'Scorching Ray',spellLevel:2,castLevel:3}];
    let attacks=0;const roll=c.rollWithBuffs;c.rollWithBuffs=(...args)=>{attacks++;return roll(...args);};
    const cast=c.rollCharacterAction('hero','spell','rays');
    await tick();
    assert.equal(elements.filter(e=>/^Beam [1-4] $/.test(e.textContent)).length,4);
    elements.find(e=>e.textContent==='Cast').onclick();
    await resolveEveryRay(h,cast);
    assert.equal(attacks,4);
    assert.equal(h.logs.filter(x=>/^Beam [1-4]\//.test(x.detail)).length,4);
    assert.equal(enemy.hp,84);
    assert.equal(hero.spellSlotUsage[3],1);
  });
});

test('Shield raised against the first Scorching Ray protects against the remaining rays',async()=>{
  const h=harness(),{c,hero,enemy,elements}=h;
  c.isDM=()=>true;
  c.activeTurnIndex=1;
  enemy.attackBonus=7;
  enemy.spells=[{id:'rays',name:'Scorching Ray',spellLevel:2,castLevel:2}];
  hero.spells=[c.GameplayRules.spellItem({name:'Shield'})];
  const cast=c.rollEnemyAction('enemy','spell','rays');
  await tick();
  for(const select of elements.filter(el=>el.children.some(child=>child.value==='hero')))select.value='hero';
  elements.find(el=>el.textContent==='Cast').onclick();
  await tick();
  assert.equal(c.gameplayUseReaction(hero,'Shield'),true);
  c.gameplayCloseWindow();
  await resolveEveryRay(h,cast);
  assert.equal(hero.currentHP,40);
  assert.equal(hero.spellSlotUsage[1],1);
  assert.equal(hero.reactionUsed,true);
  assert.equal(h.logs.filter(row=>/^Beam [1-3]\//.test(row.detail)).length,3);
});

test('missing targets and cancelled ray allocation spend no slots or actions',async t=>{
  await t.test('missing target',async()=>{
    const h=harness(),{c,hero}=h;
    c.selectedTargetUid=null;
    hero.spells=[{id:'wounds',name:'Inflict Wounds',spellLevel:1,castLevel:1}];
    await c.rollCharacterAction('hero','spell','wounds');
    assert.equal(Object.keys(hero.spellSlotUsage).length,0);
    assert.equal(c.turnActionState.actionTaken,undefined);
  });

  await t.test('cancelled allocation',async()=>{
    const h=harness(),{c,hero,elements}=h;
    hero.spells=[{id:'rays',name:'Scorching Ray',spellLevel:2,castLevel:2}];
    const cast=c.rollCharacterAction('hero','spell','rays');
    await tick();
    elements.find(e=>e.textContent==='Cancel').onclick();
    await cast;
    assert.equal(Object.keys(hero.spellSlotUsage).length,0);
    assert.equal(c.turnActionState.actionTaken,undefined);
  });
});

test('gameplay transport sends approval on both live channels, never reconnect queue',()=>{
  const cloud=[],relay=[];
  const c={myId:'test',CLOUD_CAMPAIGN_ID:'room',outgoingSeq:0,cloudReady:true,cloudChannel:{send:x=>{cloud.push(x);return Promise.resolve('ok');}},wsReady:true,ws:{send:x=>relay.push(JSON.parse(x))},pendingMsgs:[],Date,console,RECONNECT_QUEUE_TTL_MS:15000};
  vm.createContext(c);vm.runInContext(extract('broadcast'),c);
  c.broadcast({type:'gameplayResolveWindow',windowId:'cast'});
  assert.equal(cloud.length,1);assert.equal(relay.length,1);
  assert.equal(cloud[0].payload.message.packetId,relay[0].packetId);
  assert.equal(relay[0].campaignId,'room');
  c.wsReady=false;c.cloudReady=false;c.broadcast({type:'gameplayResolveWindow',windowId:'offline'});
  assert.equal(c.pendingMsgs.length,0);
  c.cloudReady=true;c.cloudChannel.send=()=>{throw Error('test transport failure');};c.console={warn(){}};
  assert.doesNotThrow(()=>c.broadcast({type:'gameplayResolveWindow',windowId:'failed'}));
});

test('older state received on the slower transport cannot rewind HP or statuses',()=>{
  const h=harness(),{c,enemy}=h,now=Date.now();
  const msg={type:'gameplayDamage',from:'player',sentAt:now,seq:12,packetId:'new-state',patch:{id:'enemy',hp:70,tempHP:0,statuses:[]}};
  c.gameplayHandleMessage(msg);
  c.gameplayHandleMessage({...msg,seq:11,packetId:'old-state',patch:{...msg.patch,hp:90}});
  assert.equal(enemy.hp,70);
  c.gameplayHandleMessage({...msg,type:'gameplayActor',seq:10,packetId:'old-status',patch:{id:'enemy',statuses:[{name:'Obsolete',rounds:1}]}});
  assert.equal(enemy.statuses.length,0);
});

test('invalid adjudication target entries are rejected without throwing or spending again',()=>{
  const {c}=harness();
  for(const targets of [[null],[{}],[{id:'enemy',amount:NaN}],[{id:'enemy',amount:-1}]])assert.equal(c.gameplayValidOutcome({kind:'damage',damageType:'fire',targets}),false);
});

test('Chill Touch stops healing and Ray of Frost slow expires on the source turn',()=>{
  const h=harness(),{c,hero,enemy}=h;
  c.gameplaySpellRider(hero,c.gameplaySpellForCast(hero,{name:'Chill Touch'}),enemy);
  enemy.hp=50;assert.equal(c.gameplayHeal(enemy,10),50);
  c.gameplayBoundary('hero','start');assert.equal(c.gameplayHeal(enemy,10),60);
  c.gameplaySpellRider(enemy,c.gameplaySpellForCast(enemy,{name:'Ray of Frost'}),hero);
  assert.equal(c.getCombatMoveBudget(hero),100);
  c.gameplayBoundary('enemy','start');assert.equal(c.getCombatMoveBudget(hero),150);
});

test('a newer beam arriving before the previous close stays visible and old opens cannot replay',()=>{
  const h=harness(),{c}=h,now=Date.now();
  const window={id:'beam-1',originId:'caster',createdAt:now,sequence:1,actorId:'hero',actorName:'Hero',actionName:'Scorching Ray',targetIds:['enemy'],type:'spell'};
  c.gameplayHandleMessage({type:'gameplayWindow',window});
  c.gameplayHandleMessage({type:'gameplayWindow',window:{...window,id:'beam-2',sequence:2,type:'spell-ray'}});
  assert.equal(windowId(h),'beam-2');
  c.gameplayHandleMessage({type:'gameplayWindowClosed',windowId:'beam-1'});
  assert.equal(windowId(h),'beam-2');
  c.gameplayHandleMessage({type:'gameplayWindowClosed',windowId:'beam-2'});
  c.gameplayHandleMessage({type:'gameplayWindow',window:{...window,id:'delayed-older-beam',sequence:1}});
  assert.equal(windowOpen(h),false);
});
