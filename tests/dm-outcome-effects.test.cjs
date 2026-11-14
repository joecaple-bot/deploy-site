const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const setup=fs.readFileSync(path.join(__dirname,'spell-resolution.test.cjs'),'utf8').split("\ntest('")[0];
const ctx={require,__dirname,console,process,Buffer,setImmediate,clearImmediate};
vm.createContext(ctx);vm.runInContext(setup+'\nglobalThis.build=harness;',ctx);
const dice=require('../dm_rolls.js');
function harness(){const h=ctx.build();h.c.DmRolls=dice;h.fx=[];h.animations=[];h.c.emitLiveEffect=fx=>h.fx.push(fx);h.c.playActionAnimation=(caster,type,details)=>h.animations.push({caster,type,details});return h;}
function pending(h){h.hero.spells=[{id:'manual',name:'Test spell',spellLevel:1,actionCost:'action'}];return h.c.rollCharacterAction('hero','spell','manual');}
function outcome(targets,visualType='spell'){return {kind:'damage',damageType:'fire',visualType,targets};}

test('DM dice amounts are preview only, shared or independently rolled, and clamped at zero',async()=>{
 const h=harness(),{c,hero,enemy}=h,cast=pending(h);c.isDM=()=>true;
 let samples=[0,.99,0];c.DmRolls={rollFormula:f=>dice.rollFormula(f,()=>samples.shift())};
 const id=h.eval('gameplayWindow.id'),count=h.messages.length;
 const shared=c.gameplayRollOutcomeAmounts(id,['hero','enemy'],'1d6+2',true);
 assert.deepEqual(Array.from(shared,r=>r.amount),[3,3]);
 const separate=c.gameplayRollOutcomeAmounts(id,['hero','enemy'],'1d6+2',false);
 assert.deepEqual(Array.from(separate,r=>r.amount),[8,3]);
 assert.equal(hero.currentHP,40);assert.equal(enemy.hp,100);assert.equal(h.messages.length,count);assert.equal(h.fx.length,0);
 c.DmRolls=dice;const zero=c.gameplayRollOutcomeAmounts(id,['enemy'],'1d1-5');assert.equal(zero[0].amount,0);
 c.gameplayCloseWindow(outcome([{id:'enemy',amount:shared[1].amount}]));await cast;assert.equal(enemy.hp,97);
});

test('outcome dice require DM access, a pending matching cast, valid targets and a valid formula',async()=>{
 const h=harness(),{c}=h,cast=pending(h),id=h.eval('gameplayWindow.id');
 assert.throws(()=>c.gameplayRollOutcomeAmounts(id,['enemy'],'1d6'),/no longer/);
 c.isDM=()=>true;
 assert.throws(()=>c.gameplayRollOutcomeAmounts('old',['enemy'],'1d6'),/no longer/);
 assert.throws(()=>c.gameplayRollOutcomeAmounts(id,[],'1d6'),/target/);
 assert.throws(()=>c.gameplayRollOutcomeAmounts(id,['enemy'],'100000d6'),/count/);
 h.eval('gameplayWindow.cancelled=true');c.gameplayCloseWindow();await cast;assert.equal(h.fx.length,0);
});

test('confirmed DM outcomes send one aimed cosmetic effect per target and do not reroll',async()=>{
 const h=harness(),{c,hero,enemy}=h,cast=pending(h);
 c.DmRolls={rollFormula(){throw Error('Confirmation must not reroll');}};
 assert.equal(h.fx.length,0);assert.equal(h.animations.length,0);
 c.gameplayCloseWindow(outcome([{id:'hero',amount:2},{id:'enemy',amount:7}],'weapon'));await cast;
 assert.equal(hero.currentHP,38);assert.equal(enemy.hp,93);assert.equal(h.fx.length,2);
 assert.deepEqual(h.fx.map(f=>[f.sourceType,f.characterId,f.targetCharacterId,f.targetUid,f.tx,f.ty]),[['weapon','hero','hero',null,0,0],['weapon','hero',null,'enemy',10,0]]);
 assert.equal(h.animations.length,2);assert(h.fx.every(f=>f.kind==='resolvedAction'));
 const remote=harness();remote.c.CLOUD_CAMPAIGN_ID='room';
 const source=fs.readFileSync(path.join(root,'map.html'),'utf8');const start=source.indexOf('function handleLiveEffect('),end=source.indexOf('\nfunction ',start+1);
 vm.runInContext(source.slice(start,end),remote.c);
 for(const fx of h.fx){const payload={...fx,campaignId:'room'};remote.c.handleLiveEffect(payload);remote.c.handleLiveEffect({...payload,id:'second-transport'});}
 assert.equal(remote.animations.length,2);assert.equal(remote.enemy.hp,100);assert.equal(remote.hero.currentHP,40);
});

test('normal attacks still wait for confirmation and send their target coordinates',async()=>{
 const h=harness(),cast=h.c.rollCharacterAction('hero','weapon','sword');
 assert.equal(h.fx.length,0);
 h.c.gameplayCloseWindow();await cast;
 assert.equal(h.fx.length,1);assert.equal(h.fx[0].targetUid,'enemy');assert.equal(h.fx[0].tx,10);assert.equal(h.fx[0].ty,0);
});

test('each approved Scorching Ray travels toward the targeted player',async()=>{
 const h=harness(),{c,hero,enemy,elements}=h;
 c.isDM=()=>true;c.activeTurnIndex=1;enemy.attackBonus=7;
 enemy.spells=[{id:'rays',name:'Scorching Ray',spellLevel:2,castLevel:2}];
 const cast=c.rollEnemyAction('enemy','spell','rays');
 await new Promise(setImmediate);
 for(const select of elements.filter(el=>el.children.some(child=>child.value==='hero')))select.value='hero';
 elements.find(el=>el.textContent==='Cast').onclick();
 for(let i=0;i<3;i++){
   await new Promise(setImmediate);
   assert.equal(h.fx.length,i,'next ray waits for approval');
   c.gameplayCloseWindow();
 }
 await cast;
 assert.equal(h.fx.length,3);assert.equal(new Set(h.fx.map(f=>f.resolutionEffectId)).size,3);
 assert(h.fx.every(f=>f.targetCharacterId===hero.id&&f.characterId===enemy.uid&&f.tx===0&&f.ty===0&&f.damageType==='fire'));
});
