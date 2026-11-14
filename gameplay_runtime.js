/* Runtime adapters for the shared rules. Uses the existing tabletop functions. */
let gameplayBusy=false;
let gameplayWindow=null;
let gameplayResolve=null;
const gameplaySeenPackets=new Set();
const gameplayClosedWindows=new Set();
const gameplayTransportPackets=new Set();
const gameplayStateVersions=new Map();
const gameplayRemoteWindowVersions=new Map();
let gameplayWindowSequence=0;
const gameplayResolvedEffectIds=new Set();
let gameplayUndoHistory=[];
function gameplayEntity(id){return enemyByUid(id)||characterById(id);}
function gameplayId(ch){return ch?.uid||ch?.id;}
function gameplayActors(){return [...Object.values(allCharactersById()),...placedIcons.filter(x=>x.kind==='enemy')];}
function gameplayPatch(ch){return {id:gameplayId(ch),statuses:normalizeStatuses(ch.statuses||[]),reactionUsed:!!ch.reactionUsed,hitDiceUsed:Number(ch.hitDiceUsed)||0,spellSlotUsage:{...ch.spellSlotUsage},featureUsage:{...ch.featureUsage}};}
function gameplayApplyPatches(patches=[]){
  for(const patch of patches){const ch=gameplayEntity(patch.id);if(!ch)continue;
    ch.statuses=normalizeStatuses(patch.statuses||[]);ch.reactionUsed=!!patch.reactionUsed;
    if(patch.hitDiceUsed!=null)ch.hitDiceUsed=patch.hitDiceUsed;
    if(patch.spellSlotUsage)ch.spellSlotUsage={...patch.spellSlotUsage};if(patch.featureUsage)ch.featureUsage={...patch.featureUsage};
  }
}
function gameplaySyncActor(ch){
  if(ch.uid) broadcast({type:'iconUpdate',icon:ch});
  else if(canControlCharacter(ch)) syncCharacter(ch);
  broadcast({type:'gameplayActor',patch:gameplayPatch(ch)});
  updateAllPanels();scheduleSave();
}
function gameplayBoundary(id,phase){
  const ch=gameplayEntity(id);if(!ch)return;
  const before=normalizeStatuses(ch.statuses||[]);
  ch.statuses=GameplayRules.tickStatuses(before,phase);
  if(before.some(s=>s.name==='Concentrating')&&!ch.statuses.some(s=>s.name==='Concentrating')){
    // clearConcentration needs the source marker in order to remove linked effects.
    ch.statuses=before;clearConcentration(id,'Concentration expired');
    ch.statuses=GameplayRules.tickStatuses(normalizeStatuses(ch.statuses),phase);
  }
  for(const actor of gameplayActors()){actor.statuses=normalizeStatuses(actor.statuses||[]).filter(s=>{if(s.expiresOnActor!==id||s.expiresAt!==phase)return true;if(s.expiresAfterTurn){s.expiresAfterTurn=false;return true;}return false;});}
  if(phase==='start'){ch.reactionUsed=false;ch.gameplayLastHit=null;}
}
function gameplayCanAct(ch,kind='action',weapon=false){
  if((ch.uid?ch.hp:ch.currentHP)<=0||normalizeStatuses(ch.statuses||[]).some(s=>['Stunned','Incapacitated','Unconscious','Paralyzed'].includes(s.name))){showCritOverlay('This creature cannot act','roll','Condition');return false;}
  if(kind==='passive')return true;
  if(kind==='reaction'){
    if(ch.reactionUsed){showCritOverlay('Reaction used until your next turn','roll','Reaction');return false;}
    return true;
  }
  if(gameplayWindow){showCritOverlay('Resolve the reaction window first','roll','Combat');return false;}
  if(!combatMode)return true;
  const id=gameplayId(ch);
  if(currentTurnId()!==id){showCritOverlay('Wait for your turn','roll','Combat');return false;}
  const state=turnActionState.actorId===id?turnActionState:{};
  if(kind==='action'&&state.actionTaken&&!(weapon&&state.attacksRemaining>0)){
    showCritOverlay('Action already used','roll','Combat');return false;
  }
  if(kind==='bonus'&&state.bonusActionTaken){showCritOverlay('Bonus action already used','roll','Combat');return false;}
  return true;
}
function gameplayMarkAction(reason,id){
  const ch=gameplayEntity(id);if(!ch)return;
  if(reason==='reaction'){
    ch.reactionUsed=true;gameplaySyncActor(ch);return;
  }
  if(reason==='free'||reason==='passive')return;
  const state=turnActionState.actorId===id?turnActionState:{actorId:id,movementUsed:0,moved:false};
  if(reason==='attack'){
    if(!state.actionTaken)state.attacksRemaining=GameplayRules.attacksPerAction(ch);
    state.attacksRemaining=Math.max(0,(Number(state.attacksRemaining)||0)-1);
    state.actionTaken=true;
  } else if(reason==='action'){state.actionTaken=true;state.attacksRemaining=0;}
  else if(reason==='bonus')state.bonusActionTaken=true;
  state.acted=true;state.reason=reason;state.at=Date.now();turnActionState=state;
  broadcast({type:'turnAction',turnActionState});updateFloatingEndTurn();updateEndTurnButton();scheduleSave();
}
function gameplayAC(ch){return Number(ch.uid?ch.ac:ch.derived?.AC)||10;}
function gameplayEffectiveAC(ch){return gameplayAC(ch)+(normalizeStatuses(ch.statuses||[]).some(s=>s.name==='Shield')?5:0);}
function gameplayHasShield(ch){return normalizeStatuses(ch.statuses||[]).some(s=>s.name==='Shield');}
function gameplayDialog(title){
  document.getElementById('gameplay-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='gameplay-dialog';
  dialog.style.cssText='position:fixed;inset:0;margin:auto;background:#181b20;color:#f5f1e8;border:1px solid #caa86b;border-radius:12px;padding:20px;width:min(600px,92vw);max-height:85vh;overflow:auto;box-shadow:0 20px 80px #0009';
  const h=document.createElement('h2');h.textContent=title;dialog.append(h);document.body.append(dialog);return dialog;
}
function gameplayButton(parent,label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;b.style.cssText='margin:8px 8px 0 0;padding:8px 12px;border-radius:8px;cursor:pointer';parent.append(b);return b;}
function gameplayRenderWindow(){
  document.getElementById('gameplay-window')?.remove();if(!gameplayWindow)return;
  const w=gameplayWindow,el=document.createElement('section');el.id='gameplay-window';
  el.setAttribute('role','region');el.setAttribute('aria-label','Reaction window');el.setAttribute('aria-live','polite');
  el.style.cssText='position:fixed;top:110px;left:50%;transform:translateX(-50%);z-index:10000;padding:16px;background:#181b20;color:#fff;border:2px solid #caa86b;border-radius:12px;width:min(560px,90vw)';
  const text=document.createElement('p');text.textContent=`${w.actorName}: ${w.actionName}. ${w.detail||''} ${w.manual?'Waiting for the DM to enter and apply the outcome.':'Resolution paused for reactions.'}`;el.append(text);
  gameplayButton(el,'React',openReactionPrompt);
  if(w.manual){
    if(isDM())gameplayButton(el,'Enter spell outcome',()=>gameplayAdjudicationDialog(w));
    if(gameplayResolve)gameplayButton(el,'Cancel effect (resources spent)',()=>{w.cancelled=true;gameplayCloseWindow();});
  }else if(gameplayResolve)gameplayButton(el,'Resolve after reactions',()=>gameplayCloseWindow());
  else if(isDM())gameplayButton(el,'Finish window (DM)',()=>{broadcast({type:'gameplayResolveWindow',windowId:w.id});});
  document.body.append(el);
}
function gameplayReactionWindow(actor,item,type,targets=[],detail='',trigger={}){
  if((!combatMode||item.actionCost==='reaction')&&!trigger.manual)return Promise.resolve(false);
  const w={id:'reaction_'+Date.now()+Math.random().toString(36).slice(2),originId:myId,createdAt:Date.now(),sequence:++gameplayWindowSequence,actorId:gameplayId(actor),actorName:actor.name,actionName:item.name,type,spellLevel:Number(item.castLevel)||Number(item.spellLevel)||0,targetIds:targets.map(gameplayId),detail,cancelled:false,...trigger};
  return new Promise(resolve=>{gameplayWindow=w;gameplayResolve=resolve;broadcast({type:'gameplayWindow',window:w});gameplayRenderWindow();});
}
function gameplayRememberClosedWindow(id){gameplayClosedWindows.add(id);if(gameplayClosedWindows.size>200)gameplayClosedWindows.delete(gameplayClosedWindows.values().next().value);}
function gameplayCloseRemoteWindow(id){if(gameplayWindow?.id===id&&gameplayResolve)return;gameplayRememberClosedWindow(id);if(gameplayWindow?.id===id){gameplayWindow=null;gameplayRenderWindow();}}
function gameplayCloseWindow(outcome){
  if(!gameplayResolve||!gameplayWindow)return;
  if(gameplayWindow.manual&&!gameplayWindow.cancelled&&!gameplayValidOutcome(outcome))return showCritOverlay('The DM must enter a valid spell outcome first','roll','Spell resolution');
  const resolve=gameplayResolve,w=gameplayWindow;gameplayResolve=null;gameplayWindow=null;
  gameplayRememberClosedWindow(w.id);
  broadcast({type:'gameplayWindowClosed',windowId:w.id});gameplayRenderWindow();resolve(w.manual?{cancelled:!!w.cancelled,outcome}:!!w.cancelled);
}
function gameplayHandleMessage(msg){
  if(msg.packetId){
    if(gameplayTransportPackets.has(msg.packetId)||Date.now()-Number(msg.sentAt)>15000)return;
    gameplayTransportPackets.add(msg.packetId);if(gameplayTransportPackets.size>1000)gameplayTransportPackets.delete(gameplayTransportPackets.values().next().value);
  }
  if(['gameplayDamage','gameplayActor'].includes(msg.type)&&msg.from&&Number.isFinite(msg.sentAt)&&Number.isFinite(msg.seq)){
    const key=msg.from+':'+msg.patch?.id,previous=gameplayStateVersions.get(key);
    if(previous&&(msg.sentAt<previous.at||(msg.sentAt===previous.at&&msg.seq<=previous.seq)))return;
    gameplayStateVersions.set(key,{at:msg.sentAt,seq:msg.seq});
    if(gameplayStateVersions.size>1000)gameplayStateVersions.delete(gameplayStateVersions.keys().next().value);
  }
  if(msg.type==='gameplayUndoSnapshot'){if(isDM())gameplayUndoHistory.push(msg.snapshot);gameplayUndoHistory=gameplayUndoHistory.slice(-20);return;}
  if(msg.type==='gameplayUndoApply'){gameplayRestoreSnapshot(msg.snapshot);return;}
  if(msg.type==='gameplayDamage'){
    const ch=gameplayEntity(msg.patch?.id);if(!ch)return;
    ch.tempHP=msg.patch.tempHP;ch.statuses=normalizeStatuses(msg.patch.statuses||[]);
    if(ch.uid)ch.hp=msg.patch.hp;else{ch.currentHP=msg.patch.currentHP;ch.deathSaves=msg.patch.deathSaves;}
    updateAllPanels();scheduleSave();return;
  }
  if(msg.type==='gameplayWindow'){
    const w=msg.window;if(!w?.id||gameplayClosedWindows.has(w.id))return;
    if(w.originId&&Number.isFinite(w.createdAt)&&Number.isFinite(w.sequence)){
      const previous=gameplayRemoteWindowVersions.get(w.originId);
      if(previous&&(w.createdAt<previous.at||(w.createdAt===previous.at&&w.sequence<=previous.seq)))return;
      // A caster emits sequential windows. A newer beam can beat the previous
      // close packet across transports; keep the newer window visible.
      if(gameplayWindow&&(gameplayResolve||gameplayWindow.originId!==w.originId))return;
      if(gameplayWindow)gameplayRememberClosedWindow(gameplayWindow.id);
      gameplayRemoteWindowVersions.set(w.originId,{at:w.createdAt,seq:w.sequence});
      if(gameplayRemoteWindowVersions.size>200)gameplayRemoteWindowVersions.delete(gameplayRemoteWindowVersions.keys().next().value);
      gameplayWindow=w;gameplayRenderWindow();return;
    }
    if(!gameplayWindow){gameplayWindow=w;gameplayRenderWindow();}return;
  }
  if(msg.type==='gameplayWindowClosed'){gameplayCloseRemoteWindow(msg.windowId);return;}
  if(msg.type==='gameplayResolveWindow'){
    const c=campaignInfo||{};
    if(c.ownerId&&(c.dmEnabled===false||!(msg.from===c.ownerId||c.dmPermissions?.[msg.from]===true)))return;
    if(gameplayWindow?.id===msg.windowId)gameplayCloseWindow(msg.outcome);return;
  }
  if(msg.type==='gameplayActor'){gameplayApplyPatches([msg.patch]);updateAllPanels();scheduleSave();return;}
  if(msg.type==='gameplayReaction'){
    if(!gameplayWindow||msg.windowId!==gameplayWindow.id||gameplaySeenPackets.has(msg.id))return;
    gameplaySeenPackets.add(msg.id);gameplayApplyPatches([msg.patch]);
    if(msg.cancelled)gameplayWindow.cancelled=true;
    addChatMessage({kind:'reaction',character:msg.name,label:msg.label});updateAllPanels();scheduleSave();
  }
}
function gameplayUseReaction(ch,name){
  if(!ch||!canControlCharacter(ch)||!gameplayCanAct(ch,'reaction'))return false;
  const w=gameplayWindow;
  if(!w)return showCritOverlay('Wait for an attack or spell reaction window','roll','Reaction');
  const raw=(ch.spells||[]).find(s=>GameplayRules.key(s.name)===GameplayRules.key(name));
  if(!raw)return showCritOverlay(`Add ${name} to this character's spells first`,'roll','Reaction');
  const spell=GameplayRules.spellItem(raw);
  const slot=chooseCastLevel(ch,spell);
  if(!slot)return showCritOverlay('No spell slot available','roll','Reaction');
  if(name==='Shield'&&(!w.targetIds.includes(ch.id)||(!w.magicMissile&&!(w.attackTotal>=gameplayEffectiveAC(ch)||w.natural===20))))return showCritOverlay('Shield requires an incoming hit or Magic Missile targeting you','roll','Reaction');
  if(name==='Counterspell'&&(w.type!=='spell'||w.actorId===ch.id))return showCritOverlay('Choose another caster’s spell','roll','Reaction');
  if(name==='Counterspell'&&!confirm('Confirm the caster is visible and within 60 feet. Attempt Counterspell?'))return false;
  if(!spendSpellSlot(ch,slot))return false;
  ch.reactionUsed=true;let cancelled=false,label=name;
  if(name==='Shield'){
    ch.statuses=normalizeStatuses(ch.statuses||[]).filter(s=>s.name!=='Shield');
    ch.statuses.push({name:'Shield',rounds:1,expiresAt:'start'});
  } else {
    const check=rollDiceExpression('1d20',abilityMod(statsWithRace(ch)[classDefFor(ch).primary]));
    cancelled=slot>=w.spellLevel||check.total>=10+w.spellLevel;
    label=`Counterspell: ${cancelled?'spell cancelled':'failed'}${slot<w.spellLevel?` (${check.total} vs ${10+w.spellLevel})`:''}`;
    if(cancelled)w.cancelled=true;
  }
  const msg={type:'gameplayReaction',id:'react_'+Date.now()+Math.random(),windowId:w.id,name:ch.name,label,cancelled,patch:gameplayPatch(ch)};
  gameplaySeenPackets.add(msg.id);broadcast(msg);gameplaySyncActor(ch);
  addChatMessage({kind:'reaction',character:ch.name,label});return true;
}
function gameplayOpenReactions(){
  const dialog=gameplayDialog('Reactions');
  const actors=Object.values(allCharactersById()).filter(ch=>canControlCharacter(ch));
  for(const ch of actors){
    const p=document.createElement('p');p.textContent=`${ch.name}: ${ch.reactionUsed?'reaction used':'reaction available'}`;dialog.append(p);
    for(const name of ['Shield','Counterspell'])if((ch.spells||[]).some(s=>GameplayRules.key(s.name)===GameplayRules.key(name))){
      const b=gameplayButton(dialog,name,()=>{if(gameplayUseReaction(ch,name))dialog.close();});b.disabled=!!ch.reactionUsed||!gameplayWindow;
    }
    const b=gameplayButton(dialog,'Other reaction — DM adjudicates',()=>{
      const label=prompt('Reaction and trigger (DM resolves its effect):','Opportunity Attack');
      if(!label||!gameplayCanAct(ch,'reaction'))return;
      ch.reactionUsed=true;gameplaySyncActor(ch);addChatMessage({kind:'reaction',character:ch.name,label:`${label} — DM adjudication`});dialog.close();
    });b.disabled=!!ch.reactionUsed||!gameplayWindow;
  }
  const note=document.createElement('p');note.textContent='Shield and Counterspell resolve here. Other reactions spend your reaction and require the DM to resolve the effect. Reactions refresh at the start of your next turn.';dialog.append(note);
  gameplayButton(dialog,'Close',()=>dialog.close());dialog.showModal();
}
function gameplayValidateAim(ch,item,type){
  if(type!=='spell'&&type!=='weapon')return true;
  if(isConeAction(item)&&!selectedTargetUid&&!selectedTargetCharacter()&&templateDraft?.kind!=='cone'){
    showCritOverlay('Choose a cone direction first; nothing spent','roll','Target required');return false;
  }
  if(!item.volley&&GameplayRules.key(item.name)!=='magic_missile'&&!isAoeAction(item)&&(item.actionType||inferActionType(item))==='damage'&&!enemyByUid(selectedTargetUid)){
    showCritOverlay('Choose an enemy target first; nothing spent','roll','Target required');return false;
  }
  if(isAoeAction(item)){
    const prepared=gameplaySpellForCast(ch,item),center=aoeCenter(ch,prepared),origin=entityPoint(ch);
    const aim=templateDraft?.kind==='cone'?{x:templateDraft.x2,y:templateDraft.y2}:center;
    const targets=isConeAction(prepared)?coneTargetsFor(ch,'character',prepared.targetMode,origin,aim,prepared.aoeRadius,prepared.actionType):aoeTargetsFor('character',prepared.targetMode,center,prepared.aoeRadius,prepared.actionType);
    if(!confirm(`${item.name} will affect: ${targets.map(t=>t.entity.name).join(', ')||'no creatures'}. Each target resolves its own save. Cast and spend the listed resources?`))return false;
  }
  return gameplayValidateRange(ch,item,type);
}
async function gameplayRunCharacter(id,type,itemId,options={}){
  const ch=characterById(id);if(!ch||!canControlCharacter(ch))return;
  const raw=(type==='spell'?[...(ch.spells||[]),...equippedSpellActions(ch)]:(ch[type+'s']||[])).find(x=>x.id===itemId);
  if(!raw)return;
  const item=type==='spell'?gameplaySpellForCast(ch,raw):raw;
  if(item.actionCost==='reaction'){
    if(['Shield','Counterspell'].includes(item.name))return gameplayUseReaction(ch,item.name);
    return gameplayOpenReactions();
  }
  if(gameplayBusy||gameplayWindow)return showCritOverlay('Resolve the current action first','roll','Combat');
  if(type==='spell'&&!GameplayRules.automatedSpells.has(GameplayRules.key(item.name))){gameplayBusy=true;try{return await gameplayAssistedSpell(ch,item);}finally{gameplayBusy=false;}}
  if(!gameplayValidateAim(ch,item,type))return;
  gameplayRememberAction(`${ch.name}: ${item.name}`);
  gameplayBusy=true;
  try{return await executeCharacterAction(id,type,itemId,options);}finally{gameplayBusy=false;}
}
async function gameplayRunEnemy(id,type,itemId){
  if(gameplayBusy||gameplayWindow)return showCritOverlay('Resolve the current action first','roll','Combat');
  const enemy=enemyByUid(id),spell=enemy?.spells?.find(x=>x.id===itemId);
  if(type==='spell'&&spell&&!GameplayRules.automatedSpells.has(GameplayRules.key(spell.name))){if(!isDM())return;gameplayBusy=true;try{return await gameplayAssistedSpell(enemy,spell);}finally{gameplayBusy=false;}}
  gameplayRememberAction('Enemy action');
  gameplayBusy=true;try{return await executeEnemyAction(id,type,itemId);}finally{gameplayBusy=false;}
}
function gameplayRememberAction(label){
  const snapshot=JSON.parse(JSON.stringify({label,actors:gameplayActors(),turnActionState,activeTurnIndex,turnOrder}));
  if(isDM())gameplayUndoHistory.push(snapshot);else broadcast({type:'gameplayUndoSnapshot',snapshot});
  gameplayUndoHistory=gameplayUndoHistory.slice(-20);
}
function gameplayRestoreSnapshot(snapshot){
  if(!snapshot)return;
  for(const saved of snapshot.actors||[]){const ch=gameplayEntity(gameplayId(saved));if(ch)Object.assign(ch,JSON.parse(JSON.stringify(saved)));}
  turnActionState=snapshot.turnActionState||{};activeTurnIndex=snapshot.activeTurnIndex||0;turnOrder=snapshot.turnOrder||turnOrder;
  updateAllPanels();draw();scheduleSave();
}
function gameplayUndo(){
  if(!isDM())return requireDM();if(gameplayWindow||gameplayBusy)return showCritOverlay('Finish the pending action first','roll','Undo');
  const snapshot=gameplayUndoHistory.pop();if(!snapshot)return showCritOverlay('No gameplay action to undo','roll','Undo');
  gameplayRestoreSnapshot(snapshot);broadcast({type:'gameplayUndoApply',snapshot});addChatMessage({kind:'note',character:'DM',label:'Undo: '+snapshot.label});
}
function gameplaySpellForCast(ch,item){
  const spell=GameplayRules.spellItem(item),k=GameplayRules.key(spell.name);
  if(spell.cantripScaling||['fire_bolt','sacred_flame'].includes(k)){
    spell.diceCount=Number(ch.level)>=17?4:Number(ch.level)>=11?3:Number(ch.level)>=5?2:1;
    spell.damageFormula=`${spell.diceCount}${spell.die}`;
  }
  if(k==='healing_word'||k==='cure_wounds')spell.bonus=ch.uid?(Number(ch.spellcastingModifier)||Number(item.bonus)||0):abilityMod(gameplayStats(ch)[classDefFor(ch).primary]);
  if(k==='burning_hands'){spell.targetMode='cone';spell.aoeRadius=15*gameplayScale();}
  if(k==='fireball'){spell.targetMode='all';spell.aoeRadius=20*gameplayScale();}
  if(spell.areaFeet)spell.aoeRadius=spell.areaFeet*gameplayScale();
  if(spell.volley)spell.projectileCount=spell.volley==='beams'?(ch.level>=17?4:ch.level>=11?3:ch.level>=5?2:1):3+Math.max(0,Number(spell.castLevel)-2);
  return spell;
}
function gameplaySpellRider(caster,item,target){
  const names={frost:'Ray of Frost slow',chill:'Chill Touch',guiding:'Guiding Bolt'};
  const name=names[item.rider];if(!name)return;
  const meta={sourceId:gameplayId(caster),sourceSpell:item.name,expiresOnActor:gameplayId(caster),expiresAt:item.rider==='guiding'?'end':'start',expiresAfterTurn:item.rider==='guiding'};
  if(target.uid)addEnemyStatus(target.uid,name,0,meta);else addCharacterStatus(target.id,name,0,meta);
  gameplaySyncActor(target);
}
async function gameplaySpellVolley(ch,item){
  const count=item.volley==='beams'?(ch.level>=17?4:ch.level>=11?3:ch.level>=5?2:1):3+Math.max(0,Number(item.castLevel)-2);
  const targets=gameplayActors().filter(x=>gameplayId(x)!==gameplayId(ch)&&(x.uid?x.hp:x.currentHP)>0);
  if(!targets.length)return showCritOverlay('No targets available; nothing spent','roll','Spell');
  const allocations=await new Promise(resolve=>{
    const d=gameplayDialog(`${item.name} — assign ${count} beams`),rows=[];
    for(let i=0;i<count;i++){
      const label=document.createElement('label');label.textContent=`Beam ${i+1} `;
      const select=document.createElement('select');select.setAttribute('aria-label',`Beam ${i+1} target`);
      for(const t of targets){const o=document.createElement('option');o.value=gameplayId(t);o.textContent=t.name;select.append(o);}
      if(targets.some(t=>gameplayId(t)===selectedTargetUid))select.value=selectedTargetUid;
      label.append(select);d.append(label,document.createElement('br'));rows.push(select);
    }
    let done=false;const finish=value=>{if(done)return;done=true;d.close();resolve(value);};
    gameplayButton(d,'Cast',()=>finish(rows.map(r=>r.value)));gameplayButton(d,'Cancel',()=>finish(null));d.addEventListener('cancel',()=>finish(null));d.showModal();
  });
  if(!allocations||allocations.some(id=>!gameplayEntity(id)))return;
  if(allocations.some(id=>dist(entityPoint(ch),entityPoint(gameplayEntity(id)))/gameplayScale()>120)&&!confirm('Some beam targets are over 120 feet away. DM range override?'))return;
  if(!gameplayCanAct(ch,item.actionCost))return;
  if(!ch.uid&&!item.freeCast&&!spendSpellSlot(ch,item.castLevel))return;
  markTurnAction(item.actionCost,gameplayId(ch));gameplaySyncActor(ch);
  for(const [index,id] of allocations.entries()){
    const target=gameplayEntity(id);if(!target)continue;
    const bonus=ch.uid?Number(ch.spellAttackBonus??ch.attackBonus)||0:gameplayAttackBonus(ch,'spell',item);
    const attack=rollWithBuffs(ch,'1d20',bonus,'attack','',target),natural=keptD20(attack);
    if(await gameplayReactionWindow(ch,item,index===0?'spell':'spell-ray',[target],`Beam ${index+1}/${count}: attack ${attack.total}`,{attackTotal:attack.total,natural}))return;
    const hit=natural!==1&&(natural===20||attack.total>=gameplayEffectiveAC(target));
    const damage=hit?rollDiceExpression(item.damageFormula,item.bonus).total+(natural===20?rollDiceExpression(item.damageFormula,0).total:0):0;
    const before=target.uid?target.hp:target.currentHP;
    if(hit)applyAoeResult({entity:target,kind:target.uid?'enemy':'character'},damage,'damage',item.name,item.damageType);
    gameplayEmitResolvedEffect(ch,item,target,{kind:'damage',amount:damage,before,natural20Hit:hit&&natural===20});
    addChatMessage({kind:'spell',character:ch.name,label:item.name,detail:`Beam ${index+1}/${count}: ${target.name}, attack ${attack.total} — ${hit?damage+' '+item.damageType+' damage':'miss'}`,total:damage});
  }
  updateAllPanels();draw();scheduleSave();
}
function gameplayActionMenu(){
  const ch=getActiveCharacter();if(!ch)return;
  const d=gameplayDialog(`${ch.name} — turn actions`),p=document.createElement('p');
  const s=turnActionState.actorId===ch.id?turnActionState:{};
  p.textContent=`${combatMode?(currentTurnId()===ch.id?'Your turn':'Waiting for turn'):'Free play'} · ${s.actionTaken?'Action used':'Action ready'}${s.attacksRemaining?' / '+s.attacksRemaining+' attacks left':''} · ${s.bonusActionTaken?'Bonus used':'Bonus ready'} · ${ch.reactionUsed?'Reaction used':'Reaction ready'} · ${Math.max(0,Math.round((getCombatMoveBudget(ch)-(s.movementUsed||0))/gameplayScale()))}ft movement left`;d.append(p);
  if(s.flurryRemaining>0)gameplayButton(d,`Unarmed strike (${s.flurryRemaining} left)`,()=>{d.close();gameplayUnarmed(ch);});
  gameplayButton(d,`Speed: ${ch.speedFeet||30}ft`,()=>{const value=Number(prompt('Movement speed in feet (include class/race adjustments)',String(ch.speedFeet||30)));if(Number.isFinite(value)&&value>0&&value<=1000){ch.speedFeet=value;gameplaySyncActor(ch);}d.close();});
  gameplayButton(d,ch.difficultTerrain?'Leave difficult terrain':'Enter difficult terrain',()=>{ch.difficultTerrain=!ch.difficultTerrain;gameplaySyncActor(ch);d.close();});
  for(const name of ['Dash','Disengage','Dodge','Hide'])gameplayButton(d,name,()=>{gameplayBasicAction(ch.id,name);d.close();});
  if(ch.currentHP<=0)gameplayButton(d,'Roll death saving throw',()=>{gameplayDeathSave(ch.id);d.close();});
  gameplayButton(d,'Reactions',()=>{d.close();gameplayOpenReactions();});
  if(combatMode&&currentTurnId()===ch.id)gameplayButton(d,'End turn / pass',()=>{d.close();isDM()?nextTurn():endPlayerTurn();});
  gameplayButton(d,'Close',()=>d.close());d.showModal();
}
function gameplayArcaneRecovery(ch){
  if(ch.class!=='Wizard'||Number(ch.featureUsage?.arcane_recovery)>0)return showCritOverlay('Arcane Recovery unavailable until a long rest','roll','Rest');
  if(combatMode)return showCritOverlay('Complete a short rest first','roll','Rest');
  if(!confirm('Has the DM confirmed a completed short rest? Use Arcane Recovery now?'))return;
  const raw=prompt(`Recover slots with total levels up to ${Math.ceil(ch.level/2)} (levels 1–5 only). Enter levels separated by commas, e.g. 1,1.`,'1');if(raw===null)return;
  const levels=raw.split(',').map(Number),counts={};for(const l of levels)counts[l]=(counts[l]||0)+1;
  if(levels.some(l=>!Number.isInteger(l)||l<1||l>5)||levels.reduce((a,b)=>a+b,0)>Math.ceil(ch.level/2)||Object.entries(counts).some(([l,n])=>n>(ch.spellSlotUsage[l]||0)))return showCritOverlay('Choose expended slots within the recovery budget','roll','Arcane Recovery');
  for(const [l,n]of Object.entries(counts))ch.spellSlotUsage[l]-=n;
  ch.featureUsage={...ch.featureUsage,arcane_recovery:1};gameplaySyncActor(ch);
}
async function gameplayAssistedSpell(ch,item){
  const cost=['action','bonus','reaction'].includes(item.actionCost)?item.actionCost:'action';
  if(!gameplayCanAct(ch,cost))return;
  const slot=ch.uid||item.freeCast?(Number(item.castLevel)||Number(item.spellLevel)||0):chooseCastLevel(ch,item);
  if(!ch.uid&&item.spellLevel>0&&!item.freeCast&&!slot)return showCritOverlay('No spell slot available','roll','Spell slots');
  if(!confirm(`${item.name} needs a DM ruling. Spend ${cost}${slot&&!item.freeCast&&!ch.uid?' and a level '+slot+' slot':''}? The DM will enter targets and final damage, healing or a condition in the spell outcome panel. Special movement, summons and ongoing effects still need manual handling.`))return;
  gameplayRememberAction(ch.name+': '+item.name);
  if(!ch.uid&&slot&&!item.freeCast&&!spendSpellSlot(ch,slot))return;
  markTurnAction(cost,gameplayId(ch));
  gameplaySyncActor(ch);
  const result=await gameplayReactionWindow(ch,{...item,castLevel:slot},'spell',[],'DM adjudication',{manual:true,description:item.description||'',concentration:!!item.concentration});
  if(result.cancelled){addChatMessage({kind:'spell',character:ch.name,label:item.name+' cancelled',detail:'No effects applied; casting resources spent.'});return;}
  const outcome=result.outcome;
  if(item.concentration&&!ch.uid)setConcentration(ch.id,item.name);
  for(const row of outcome.targets){
    const target=gameplayEntity(row.id);if(!target)continue;
    const before=target.uid?target.hp:target.currentHP;
    if(outcome.kind==='damage')applyAoeResult({entity:target,kind:target.uid?'enemy':'character'},row.amount,'damage',item.name,outcome.damageType);
    if(outcome.kind==='healing')applyAoeResult({entity:target,kind:target.uid?'enemy':'character'},row.amount,'healing',item.name);
    if(outcome.condition){
      const meta=item.concentration?{sourceId:gameplayId(ch),sourceSpell:item.name,concentration:true}:{};
      if(target.uid)addEnemyStatus(target.uid,outcome.condition,outcome.rounds,meta);else addCharacterStatus(target.id,outcome.condition,outcome.rounds,meta);
      gameplaySyncActor(target);
    }
    gameplayEmitResolvedEffect(ch,{...item,damageType:outcome.damageType},target,{kind:outcome.kind,amount:row.amount,before,sourceType:outcome.visualType||'spell'});
  }
  addChatMessage({kind:'spell',character:ch.name,label:item.name+' — DM resolved',detail:outcome.kind==='narrative'?outcome.note:outcome.targets.map(row=>`${gameplayEntity(row.id)?.name||row.id}: ${outcome.kind==='condition'?'':row.amount+' '+outcome.kind}${outcome.condition?' '+outcome.condition+' ('+outcome.rounds+' rounds)':''}`).join('; ')});
  gameplaySyncActor(ch);
}
function gameplayValidOutcome(outcome){
  if(!outcome||!['damage','healing','condition','narrative'].includes(outcome.kind)||!Array.isArray(outcome.targets))return false;
  if(outcome.visualType&&!['spell','weapon'].includes(outcome.visualType))return false;
  if(outcome.kind==='narrative')return outcome.targets.length===0&&typeof outcome.note==='string'&&outcome.note.trim().length>0&&outcome.note.length<=500;
  if(!outcome.targets.length||outcome.targets.length>200||outcome.targets.some(r=>!r||typeof r.id!=='string')||new Set(outcome.targets.map(r=>r.id)).size!==outcome.targets.length)return false;
  if(outcome.targets.some(r=>!gameplayEntity(r.id)||!Number.isFinite(r.amount)||r.amount<0||r.amount>100000))return false;
  if(outcome.kind==='damage'&&!['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'].includes(outcome.damageType))return false;
  if(outcome.kind==='condition'&&!outcome.condition)return false;
  if(outcome.condition&&(typeof outcome.condition!=='string'||outcome.condition.length>80||!Number.isInteger(outcome.rounds)||outcome.rounds<0||outcome.rounds>10000))return false;
  return true;
}
function gameplayRollOutcomeAmounts(windowId,ids,formula,shared=true){
  if(!isDM()||!gameplayWindow?.manual||gameplayWindow.id!==windowId)throw Error('This spell is no longer waiting for a DM outcome.');
  if(!Array.isArray(ids)||!ids.length||ids.some(id=>!gameplayEntity(id)))throw Error('Select at least one target first.');
  const common=shared?DmRolls.rollFormula(formula):null;
  return ids.map(id=>{const roll=common||DmRolls.rollFormula(formula);return {id,amount:Math.max(0,roll.total),roll};});
}
function gameplayEmitResolvedEffect(caster,item,target,details={}){
  const from=entityPoint(caster),to=entityPoint(target);
  if([from.x,from.y,to.x,to.y].some(n=>n==null||!Number.isFinite(Number(n))))return;
  const after=target.uid?target.hp:target.currentHP;
  const effect={kind:'resolvedAction',resolutionEffectId:'resolved_'+Date.now()+'_'+Math.random().toString(36).slice(2),characterId:gameplayId(caster),targetUid:target.uid||null,targetCharacterId:target.uid?null:target.id,sourceType:details.sourceType||'spell',actionType:details.kind==='healing'?'healing':details.kind==='condition'?'buff':'damage',text:item.name+': '+target.name,title:item.name,damageType:item.damageType||gameplayDamageType(item),x:from.x,y:from.y,tx:to.x,ty:to.y,damage:details.kind==='damage'?Math.max(0,Number(details.amount)||0):0,hpBefore:details.before,hpAfter:after,maxHP:target.uid?target.maxHP:target.derived?.HP,natural20Hit:!!details.natural20Hit};
  gameplayPlayResolvedEffect(effect);
  emitLiveEffect(effect);
}
function gameplayPlayResolvedEffect(effect){
  if(!effect.resolutionEffectId||gameplayResolvedEffectIds.has(effect.resolutionEffectId))return;
  gameplayResolvedEffectIds.add(effect.resolutionEffectId);
  if(gameplayResolvedEffectIds.size>500)gameplayResolvedEffectIds.delete(gameplayResolvedEffectIds.values().next().value);
  const caster=gameplayEntity(effect.characterId)||{position:{x:effect.x,y:effect.y},x:effect.x,y:effect.y};
  // HP and conditions arrive through gameplay state messages. Visuals must
  // never reapply a stale snapshot or resolve damage a second time.
  playActionAnimation(caster,effect.sourceType||'spell',{...effect,kind:effect.actionType==='damage'?'action':effect.actionType==='healing'?'heal':'buff'});
}
function gameplayAdjudicationDialog(w){
  if(!isDM()||gameplayWindow?.id!==w.id)return;
  const d=gameplayDialog(w.actionName+' — DM outcome');
  const field=(title,tag='input',parent=d)=>{const label=document.createElement('label');label.textContent=title+' ';const el=document.createElement(tag);el.setAttribute('aria-label',title);label.append(el);parent.append(label,document.createElement('br'));return el;};
  const options=(el,values)=>{for(const [value,label] of values){const o=document.createElement('option');o.value=value;o.textContent=label;el.append(o);}};
  const note=document.createElement('p');note.textContent=(w.description||'')+' Enter the outcome after saves. Damage resistance is applied by the app. Conditions are markers; special rules and ongoing effects remain DM-managed.';d.append(note);
  const kind=field('Outcome','select');options(kind,[['damage','Damage'],['healing','Healing'],['condition','Condition only'],['narrative','Narrative / no mechanical effect']]);
  const damageType=field('Damage type','select');options(damageType,['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'].map(x=>[x,x]));
  const visualType=field('Animation','select');options(visualType,[['spell','Spell toward each target'],['weapon','Attack toward each target']]);
  const amountMode=field('Amount entry','select');options(amountMode,[['manual','Enter amounts'],['roll','Roll dice']]);
  const rollControls=document.createElement('section');rollControls.hidden=true;d.append(rollControls);
  const formula=field('Damage / healing dice','input',rollControls);formula.placeholder='e.g. 3d6+2';formula.maxLength=40;
  const rollSummary=document.createElement('p');rollSummary.setAttribute('role','status');rollSummary.style.cssText='font-size:12px;color:#e6cca0;margin:8px 0';rollControls.append(rollSummary);
  const condition=field('Condition (optional)');condition.maxLength=80;
  const rounds=field('Condition rounds (0 = until removed)');rounds.type='number';rounds.min='0';rounds.max='10000';rounds.value='1';
  const narrative=field('Ruling / narrative');narrative.maxLength=500;
  const rows=[];
  for(const actor of gameplayActors()){
    const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #ffffff15';
    const check=document.createElement('input');check.type='checkbox';check.style.cssText='width:18px;height:18px;flex:none;margin:0';check.setAttribute('aria-label','Affect '+actor.name);
    const name=document.createElement('span');name.textContent=actor.name+' ';name.style.flex='1';
    const amount=document.createElement('input');amount.type='number';amount.min='0';amount.max='100000';amount.placeholder='Amount';amount.setAttribute('aria-label',actor.name+' amount');amount.style.width='90px';
    label.append(check,name,amount);d.append(label);
    const row={id:gameplayId(actor),check,amount};
    row.rollButton=gameplayButton(label,'Roll',()=>rollAmounts([row],true));row.rollButton.setAttribute('aria-label','Roll for '+actor.name);row.rollButton.hidden=true;
    rows.push(row);
  }
  function rollAmounts(selected,shared){
    try{
      const rolled=gameplayRollOutcomeAmounts(w.id,selected.map(row=>row.id),formula.value,shared);
      for(const result of rolled){const row=selected.find(row=>row.id===result.id);row.check.checked=true;row.amount.value=String(result.amount);}
      rollSummary.textContent=rolled.map(result=>`${gameplayEntity(result.id)?.name}: ${result.roll.formula} [${result.roll.rolls.join(', ')}] = ${result.roll.total}`).join('; ')+' — review amounts for saves, then Apply outcome. Nothing applied yet.';
    }catch(error){rollSummary.textContent=error.message;}
  }
  gameplayButton(rollControls,'Roll once for selected targets',()=>rollAmounts(rows.filter(row=>row.check.checked),true));
  gameplayButton(rollControls,'Roll separately for selected targets',()=>rollAmounts(rows.filter(row=>row.check.checked),false));
  const refreshRollControls=()=>{const enabled=amountMode.value==='roll'&&['damage','healing'].includes(kind.value);rollControls.hidden=!enabled;for(const row of rows)row.rollButton.hidden=!enabled;};
  amountMode.onchange=refreshRollControls;kind.onchange=refreshRollControls;
  gameplayButton(d,'Apply outcome',()=>{
    if(!isDM()||gameplayWindow?.id!==w.id){d.close();return;}
    const outcome={kind:kind.value,visualType:visualType.value,damageType:damageType.value,condition:condition.value.trim(),rounds:Number(rounds.value),note:narrative.value.trim(),targets:kind.value==='narrative'?[]:rows.filter(r=>r.check.checked).map(r=>({id:r.id,amount:kind.value==='condition'?0:r.amount.value.trim()===''?NaN:Number(r.amount.value)}))};
    if(!gameplayValidOutcome(outcome))return showCritOverlay('Choose targets and enter amounts, or enter a narrative ruling','roll','Spell outcome');
    if(gameplayResolve)gameplayCloseWindow(outcome);else broadcast({type:'gameplayResolveWindow',windowId:w.id,outcome});d.close();
  });
  gameplayButton(d,'Back',()=>d.close());d.showModal();
}
function gameplayStats(ch){const stats=statsWithRace(ch),gear=itemStatBonuses(ch);for(const ab of ABILITIES)stats[ab]+=(gear[ab]||0);return stats;}
function gameplayAttackBonus(ch,type,item){
  if(type==='spell'){ch.gameplayAttackAbility=null;return calculateDerived(ch).spellAttackBonus;}
  if(ch.overrides?.attackBonus!==''&&ch.overrides?.attackBonus!=null)return Number(ch.overrides.attackBonus)||0;
  const stats=gameplayStats(ch),ab=GameplayRules.weaponAbility(ch,item,stats);
  ch.gameplayAttackAbility=ab;ch.gameplayMelee=!/bow|sling|dart|ranged|thrown/i.test(item.name+' '+(item.description||''));
  return abilityMod(stats[ab])+proficiencyBonus(ch.level)+itemFlatBonuses(ch).attackBonus+(Number(item.attackBonus)||0);
}
function gameplayBasicAction(id,name,cost='action'){
  const ch=characterById(id);if(!ch||!canControlCharacter(ch)||!gameplayCanAct(ch,cost))return;
  if(name==='Hide'&&!confirm('The DM must confirm you can hide here. Roll Stealth and let the DM resolve who notices you?'))return;
  gameplayMarkAction(cost,id);
  if(name==='Dash'){
    turnActionState.dashCount=(Number(turnActionState.dashCount)||0)+1;
    broadcast({type:'turnAction',turnActionState});
  } else if(name==='Hide')rollSkillCheck(id,'Stealth');
  else addCharacterStatus(id,name,1,{expiresAt:name==='Dodge'?'start':'end'});
  gameplayMiniatureAnimation(ch);
  addChatMessage({kind:'feature',character:ch.name,label:name,detail:name==='Disengage'?'Movement does not provoke opportunity attacks this turn.':name==='Dash'?'Movement budget increased by your speed.':name==='Dodge'?'Incoming attacks have disadvantage until your next turn.':'DM resolves hiding from the Stealth result.'});
  gameplaySyncActor(ch);
}
function gameplaySaveBonus(ch,ability){return GameplayRules.saveBonus(ch,ability,gameplayStats(ch)[ability],itemFlatBonuses(ch).saveBonus);}
function gameplayScale(){return Math.max(.1,Number(campaignInfo?.pixelsPerFoot)||5);}
function gameplayCalibrateMap(){
  if(!isDM())return requireDM();
  const raw=prompt('Map scale: pixels per foot. Example: a 50px grid square representing 5ft = 10.',String(gameplayScale()));
  if(raw===null)return;const value=Number(raw);if(!Number.isFinite(value)||value<=0)return;
  campaignInfo={...campaignInfo,pixelsPerFoot:value};scheduleSave();updateAllPanels();draw();
}
function gameplayValidateRange(ch,item,type){
  const target=selectedTargetCharacter()||(selectedTargetUid?enemyByUid(selectedTargetUid):null);
  if(!target||item.range==='Self')return true;
  const from=entityPoint(ch),to=entityPoint(target);if(from.x==null||to.x==null)return true;
  const text=String(item.range||item.description||'');
  const match=text.match(/(\d+)\s*(?:\/\s*(\d+))?\s*(?:ft|feet)/i);
  const ranged=/bow|sling|dart|ranged/i.test(item.name+' '+text);
  const reach=/touch/i.test(text)?5:match?Number(match[2]||match[1]):type==='weapon'&&!ranged?5:null;
  if(reach===null)return true;
  const distance=dist(from,to)/gameplayScale();
  if(distance>reach+.1)return confirm(`${target.name} is ${Math.round(distance)}ft away; ${item.name} has ${reach}ft range. Ask the DM to approve an override. Proceed?`);
  return true;
}
function gameplayDamageType(item){
  const known={burning_hands:'fire',fire_bolt:'fire',fireball:'fire',magic_missile:'force',sacred_flame:'radiant'};
  if(known[GameplayRules.key(item.name)])return known[GameplayRules.key(item.name)];
  if(['acid','cold','fire','force','lightning','necrotic','poison','psychic','radiant','thunder','bludgeoning','piercing','slashing'].includes(String(item.damageType).toLowerCase()))return String(item.damageType).toLowerCase();
  const text=[item.effect,item.description,item.name].filter(Boolean).join(' ').toLowerCase();
  return ['acid','cold','fire','force','lightning','necrotic','poison','psychic','radiant','thunder','bludgeoning','piercing','slashing'].find(t=>text.includes(t))||(/sword|axe|scimitar/i.test(item.name)?'slashing':/bow|dagger|rapier|spear/i.test(item.name)?'piercing':'bludgeoning');
}
function gameplayHeal(target,amount){
  const before=Number(target.uid?target.hp:target.currentHP)||0;
  const after=hasStatusNamed(target,'Chill Touch')?before:Math.min(Number(target.uid?target.maxHP:target.derived?.HP)||before,before+Math.max(0,Number(amount)||0));
  if(target.uid)target.hp=after;else applyCharacterPatch(target.id,{currentHP:after});
  broadcast({type:'gameplayDamage',patch:{id:gameplayId(target),hp:after,currentHP:after,tempHP:target.tempHP,statuses:target.statuses,deathSaves:target.deathSaves}});
  if(target.uid)broadcast({type:'iconUpdate',icon:target});
  return after;
}
function gameplayDamage(ch,amount,type='',critical=false){
  const enemy=!!ch.uid,before=Number(enemy?ch.hp:ch.currentHP)||0;
  const damage=GameplayRules.damageAmount(amount,type,ch);
  const absorbed=Math.min(Number(ch.tempHP)||0,damage);ch.tempHP=Math.max(0,(Number(ch.tempHP)||0)-absorbed);
  const lost=damage-absorbed,after=Math.max(0,before-lost);
  if(enemy)ch.hp=after;else ch.currentHP=after;
  if(!enemy){
    if(before===0&&damage>0){ch.deathSaves={success:0,fail:ch.deathSaves?.fail||0};ch.deathSaves.fail=Math.min(3,ch.deathSaves.fail+(critical?2:1));}
    if(after===0&&lost>0){
      if(lost-before>=ch.derived.HP)ch.deathSaves={success:0,fail:3};
      ch.statuses=normalizeStatuses(ch.statuses||[]).filter(s=>s.name!=='Unconscious');ch.statuses.push({name:'Unconscious',rounds:0});
      clearConcentration(ch.id,'Unconscious: concentration ended');
    } else if(damage>0&&normalizeStatuses(ch.statuses||[]).some(s=>s.name==='Concentrating')){
      const dc=Math.max(10,Math.floor(damage/2)),save=rollWithBuffs(ch,'1d20',gameplaySaveBonus(ch,'CON'),'save');
      addChatMessage({kind:'save',character:ch.name,label:'Concentration',detail:`${save.total} vs DC ${dc}: ${save.total>=dc?'maintained':'lost'}`});
      if(save.total<dc)clearConcentration(ch.id,'Damage broke concentration');
    }
  }
  const patch={id:gameplayId(ch),hp:after,currentHP:after,tempHP:ch.tempHP,statuses:ch.statuses,deathSaves:ch.deathSaves};
  broadcast({type:'gameplayDamage',patch});
  if(enemy)broadcast({type:'iconUpdate',icon:ch});else if(canControlCharacter(ch))syncCharacter(ch);
  updateAllPanels();scheduleSave();return after;
}
function gameplayDeathSave(id=activeCharacterId){
  const ch=characterById(id);if(!ch||!canControlCharacter(ch)||ch.currentHP>0)return;
  if(combatMode&&currentTurnId()!==id)return showCritOverlay('Wait for your turn','roll','Death save');
  if(turnActionState.deathSaveRolled&&turnActionState.actorId===id)return;
  const previous=ch.deathSaves||{success:0,fail:0};if(previous.success>=3||previous.fail>=3)return;
  const roll=rollDiceExpression('1d20',0).total;ch.deathSaves={...previous};
  if(roll===20){applyCharacterPatch(id,{currentHP:1});ch.deathSaves={success:0,fail:0};}
  else if(roll===1)ch.deathSaves.fail=Math.min(3,ch.deathSaves.fail+2);
  else if(roll>=10)ch.deathSaves.success=Math.min(3,ch.deathSaves.success+1);
  else ch.deathSaves.fail=Math.min(3,ch.deathSaves.fail+1);
  turnActionState={...turnActionState,actorId:id,deathSaveRolled:true};broadcast({type:'turnAction',turnActionState});
  addChatMessage({kind:'death',character:ch.name,label:`Death save: ${roll}`,detail:ch.deathSaves.fail>=3?'Dead — DM adjudicates revival':ch.deathSaves.success>=3?'Stable':ch.currentHP>0?'Conscious at 1 HP':`${ch.deathSaves.success} successes / ${ch.deathSaves.fail} failures`});
  syncCharacter(ch);updateAllPanels();scheduleSave();
}
async function gameplayMagicMissile(ch,item){
  const targets=ch.uid?Object.values(allCharactersById()).filter(c=>c.currentHP>0):placedIcons.filter(e=>e.kind==='enemy'&&e.hp>0);
  const count=3+Math.max(0,Number(item.castLevel)-1);
  const allocations=await new Promise(resolve=>{
    const d=gameplayDialog(`Magic Missile — assign ${count} darts`),rows=[];
    for(let i=0;i<count;i++){
      const label=document.createElement('label');label.textContent=`Dart ${i+1} `;
      const select=document.createElement('select');select.setAttribute('aria-label',`Dart ${i+1} target`);
      for(const target of targets){const option=document.createElement('option');option.value=gameplayId(target);option.textContent=target.name;select.append(option);}
      if(selectedTargetUid)select.value=selectedTargetUid;label.append(select);d.append(label,document.createElement('br'));rows.push(select);
    }
    let done=false;const finish=value=>{if(done)return;done=true;d.close();resolve(value);};
    gameplayButton(d,'Cast',()=>finish(rows.map(r=>r.value)));gameplayButton(d,'Cancel',()=>finish(null));
    d.addEventListener('cancel',()=>finish(null));d.showModal();
  });
  if(!allocations)return false;
  if(allocations.some(id=>!gameplayEntity(id)))return false;
  if(allocations.some(id=>dist(entityPoint(ch),entityPoint(gameplayEntity(id)))/gameplayScale()>120)&&!confirm('Some dart targets are over 120 feet away. DM range override?'))return false;
  if(!ch.uid&&!item.freeCast&&!spendSpellSlot(ch,item.castLevel))return false;
  markTurnAction(item.actionCost||'action',gameplayId(ch));gameplaySyncActor(ch);
  if(await gameplayReactionWindow(ch,item,'spell',[...new Set(allocations)].map(gameplayEntity),'Automatic-hit force darts',{magicMissile:true}))return true;
  const roll=rollDiceExpression('1d4',1),counts={};allocations.forEach(id=>counts[id]=(counts[id]||0)+1);
  for(const [id,n] of Object.entries(counts)){
    const target=gameplayEntity(id);if(!target)continue;
    const damage=gameplayHasShield(target)?0:roll.total*n;
    const before=target.uid?target.hp:target.currentHP;
    applyAoeResult({kind:target.uid?'enemy':'character',entity:target},damage,'damage','Force');
    gameplayEmitResolvedEffect(ch,{...item,damageType:'force'},target,{kind:'damage',amount:damage,before});
    addChatMessage({kind:'spell',character:ch.name,label:'Magic Missile',detail:`${target.name}: ${n} dart(s), ${damage} force damage${gameplayHasShield(target)?' — Shield blocks darts':''}`,total:damage});
  }
  updateAllPanels();draw();scheduleSave();return true;
}
function gameplayRestDialog(type,onlyId=null){
  if(!isDM())return showCritOverlay('Ask the DM to complete a rest','roll','Rest');
  if(combatMode||gameplayWindow||gameplayBusy)return showCritOverlay('Finish combat before resting','roll','Rest');
  const chars=Object.values(allCharactersById()).filter(ch=>ch.currentHP>0&&(!onlyId||ch.id===onlyId)&&!isGeneratedDefaultGhost(ch));
  const d=gameplayDialog(type==='long'?'Complete long rest':'Complete short rest'),inputs=[];
  const note=document.createElement('p');note.textContent=type==='long'?'Confirm at least 8 hours of eligible rest and no long-rest benefit in the last 24 in-game hours. Rest does not remove ongoing conditions automatically.':'Confirm at least 1 hour of eligible rest. Choose Hit Dice to spend; zero dice gives no healing. Only short-rest resources recover.';d.append(note);
  for(const ch of chars){
    const p=document.createElement('label');p.textContent=`${ch.name} (${ch.currentHP}/${ch.derived.HP} HP) `;
    const input=document.createElement('input');input.type='number';input.min=0;input.max=Math.max(0,ch.level-(Number(ch.hitDiceUsed)||0));input.value=0;input.setAttribute('aria-label',`${ch.name} Hit Dice`);
    if(type==='short'){p.append(input,document.createTextNode(` / ${input.max} Hit Dice available`));}d.append(p,document.createElement('br'));inputs.push({ch,input});
  }
  gameplayButton(d,'Confirm rest completed',()=>{
    const counts=inputs.map(({ch,input})=>({ch,count:type==='short'?Number(input.value):0}));
    if(counts.some(({ch,count})=>!Number.isInteger(count)||count<0||count>ch.level-(Number(ch.hitDiceUsed)||0)))return showCritOverlay('Choose available Hit Dice','roll','Rest');
    pushDMUndo(`${type} rest`);const patches=[];
    for(const {ch,count} of counts){applyRestToCharacter(ch,type,count);patches.push(restPatchForCharacter(ch));}
    applyPartyRestPatches(patches);broadcast({type:'partyRest',restType:type,patches,label:`${type} rest`,detail:'DM confirmed elapsed rest; resources updated.'});
    addChatMessage({kind:'rest',character:'DM',label:`${type} rest completed`,detail:type==='short'?'Hit Dice spent; eligible resources recovered.':'HP, slots and long-rest resources recovered; up to half Hit Dice restored.'});d.close();
  });gameplayButton(d,'Cancel',()=>d.close());d.showModal();
}
function gameplayStunningStrike(ch,item){
  const enemy=enemyByUid(selectedTargetUid);
  if(!gameplayCanAct(ch,'free')||!enemy||ch.gameplayLastHit?.targetId!==enemy.uid||!ch.gameplayLastHit?.melee)return showCritOverlay('Requires a melee weapon hit against this target on this turn','roll','Stunning Strike');
  if(featureUsesLeft(ch,item.name)<=0)return showCritOverlay('No ki remaining','roll','Stunning Strike');
  if(!confirm('Spend 1 ki to attempt Stunning Strike on the last melee hit?'))return;
  gameplayRememberAction(ch.name+': Stunning Strike');
  if(!spendFeatureUse(ch,item.name))return;
  ch.gameplayLastHit=null;
  const dc=8+proficiencyBonus(ch.level)+abilityMod(gameplayStats(ch).WIS);
  const save=rollWithBuffs(enemy,'1d20',saveBonusForEntry({kind:'enemy',entity:enemy},'CON'),'save');
  if(save.total<dc)addEnemyStatus(enemy.uid,'Stunned',0,{expiresOnActor:ch.id,expiresAt:'end',sourceId:ch.id,saveDC:dc});
  // End of the monk's NEXT turn, not the current one.
  if(save.total<dc){const status=enemy.statuses.find(s=>s.name==='Stunned');status.expiresAfterTurn=true;}
  addChatMessage({kind:'save',character:ch.name,label:'Stunning Strike',detail:`${enemy.name}: CON ${save.total} vs DC ${dc} — ${save.total<dc?'stunned until end of your next turn':'saved'}`});
  gameplaySyncActor(ch);gameplaySyncActor(enemy);
}
function gameplayFlurry(ch,item){
  if(!gameplayCanAct(ch,'bonus')||turnActionState.actorId!==ch.id||turnActionState.attacksRemaining==null)return showCritOverlay('Take the Attack action before Flurry of Blows','roll','Flurry of Blows');
  if(featureUsesLeft(ch,item.name)<=0)return showCritOverlay('No ki remaining','roll','Flurry of Blows');
  gameplayRememberAction(ch.name+': Flurry of Blows');if(!spendFeatureUse(ch,item.name))return;
  gameplayMarkAction('bonus',ch.id);turnActionState.flurryRemaining=2;
  broadcast({type:'turnAction',turnActionState});gameplaySyncActor(ch);
  addChatMessage({kind:'feature',character:ch.name,label:'Flurry of Blows',detail:'1 ki and bonus action spent. Use Turn actions → Unarmed strike twice; choose a target before each strike.'});gameplayActionMenu();
}
async function gameplayUnarmed(ch){
  const target=enemyByUid(selectedTargetUid);
  if(gameplayBusy||gameplayWindow||!target||currentTurnId()!==ch.id||!(turnActionState.flurryRemaining>0)||!gameplayCanAct(ch,'free'))return;
  if(!gameplayValidateRange(ch,{range:'Touch'},'weapon'))return;
  gameplayRememberAction(ch.name+': Flurry strike');gameplayBusy=true;
  try{
    const stats=gameplayStats(ch),ab=stats.DEX>stats.STR?'DEX':'STR',mod=abilityMod(stats[ab]),die=ch.level>=17?10:ch.level>=11?8:ch.level>=5?6:4;
    ch.gameplayAttackAbility=ab;ch.gameplayMelee=true;
    const attack=rollWithBuffs(ch,'1d20',mod+proficiencyBonus(ch.level),'attack','',target),natural=keptD20(attack);
    turnActionState.flurryRemaining--;broadcast({type:'turnAction',turnActionState});
    await gameplayReactionWindow(ch,{name:'Unarmed strike',actionCost:'bonus'},'weapon',[target],`Attack ${attack.total}`,{attackTotal:attack.total,natural});
    const hit=natural!==1&&(natural===20||attack.total>=gameplayEffectiveAC(target));
    const amount=hit?Math.max(0,rollDiceExpression(`1d${die}`,mod).total+(natural===20?rollDiceExpression(`1d${die}`,0).total:0)):0;
    if(hit){gameplayDamage(target,amount,'bludgeoning',natural===20);ch.gameplayLastHit={targetId:target.uid,melee:true};}
    gameplayMiniatureAnimation(ch,'action',{natural20Hit:hit&&natural===20});
    addChatMessage({kind:'weapon',character:ch.name,label:'Unarmed strike',detail:`${hit?'Hit':'Miss'} ${target.name}: ${amount} damage; ${turnActionState.flurryRemaining} Flurry strikes remaining`});
  }finally{gameplayBusy=false;gameplaySyncActor(ch);}
}
function gameplayAssistedFeature(ch,item){
  const cost=item.actionCost||'action';if(!gameplayCanAct(ch,cost)||featureUsesLeft(ch,item.name)<=0)return;
  if(!confirm(`${item.name} requires DM adjudication of targets, saves, and any form statistics. Spend its ${cost} and feature use? No automatic effects will be applied.`))return;
  gameplayRememberAction(ch.name+': '+item.name);if(!spendFeatureUse(ch,item.name))return;
  gameplayMarkAction(cost,ch.id);gameplaySyncActor(ch);
  gameplayMiniatureAnimation(ch);
  addChatMessage({kind:'feature',character:ch.name,label:item.name+' — DM-assisted',detail:'Resources spent. DM resolves effects; no automatic status or statistics applied.'});
}

// Cosmetic-only event for actions that do not use the ordinary attack effect path.
function gameplayMiniatureAnimation(ch,kind='action',details={}){
 if(typeof MapWalk==='undefined')return;
 const effect={...details,kind:'miniature',characterId:gameplayId(ch),miniatureAnimation:kind};
 MapWalk.trigger(ch,kind,effect);if(typeof emitLiveEffect==='function')emitLiveEffect(effect);if(typeof draw==='function')draw();
}
