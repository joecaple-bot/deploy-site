/* Shared, deterministic 2014-style gameplay rules. No network or DOM access. */
(function(root){
  const key=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  function attacksPerAction(ch){
    const level=Math.max(1,Number(ch.level)||1);
    if(ch.class==='Fighter') return level>=20?4:level>=11?3:level>=5?2:1;
    if(['Barbarian','Monk','Paladin','Ranger'].includes(ch.class)&&level>=5) return 2;
    return (ch.abilities||[]).some(a=>/extra attack/i.test(a.name))?2:1;
  }
  function spellItem(item){
    const name=key(item.name), base={...item};
    const damage=(level,formula,type,range,saveAbility='',extra={})=>({spellLevel:level,actionCost:'action',actionType:'damage',targetMode:'single',aoeRadius:0,damageFormula:formula,die:formula.slice(formula.indexOf('d')),diceCount:parseInt(formula,10),bonus:0,damageType:type,range,saveAbility,saveDC:0,saveHalf:false,attackSave:saveAbility?saveAbility+' save':'Ranged Spell Attack',resolutionMode:saveAbility?'save':'attack',...extra});
    const defs={
      poison_spray:damage(0,'1d12','poison','10 ft.','CON',{cantripScaling:true}),
      inflict_wounds:damage(1,'3d10','necrotic','Touch','',{attackSave:'Melee Spell Attack',upcastDice:'1d10'}),
      ray_of_frost:damage(0,'1d8','cold','60 ft.','',{cantripScaling:true,rider:'frost'}),
      chill_touch:damage(0,'1d8','necrotic','120 ft.','',{cantripScaling:true,rider:'chill'}),
      guiding_bolt:damage(1,'4d6','radiant','120 ft.','',{upcastDice:'1d6',rider:'guiding'}),
      eldritch_blast:damage(0,'1d10','force','120 ft.','',{volley:'beams'}),
      scorching_ray:damage(2,'2d6','fire','120 ft.','',{volley:'rays'}),
      cone_of_cold:damage(5,'8d8','cold','Self (60-foot cone)','CON',{targetMode:'cone',areaFeet:60,saveHalf:true,upcastDice:'1d8'}),
      magic_missile:{spellLevel:1,castLevel:Math.max(1,Number(item.castLevel)||1),actionCost:'action',actionType:'damage',targetMode:'single',aoeRadius:0,die:'d4',diceCount:1,damageFormula:'1d4',bonus:1,saveAbility:'',saveDC:0,attackSave:'Automatic hit',range:'120 ft.',description:'Three darts at level 1; one more per higher slot. Each dart deals 1d4 + 1 force damage. Shield blocks the darts.'},
      fire_bolt:{spellLevel:0,castLevel:0,actionCost:'action',actionType:'damage',die:'d10',diceCount:1,damageFormula:'1d10',bonus:0,saveAbility:'',saveDC:0,attackSave:'Ranged Spell Attack',range:'120 ft.'},
      sacred_flame:{spellLevel:0,castLevel:0,actionCost:'action',actionType:'damage',die:'d8',diceCount:1,damageFormula:'1d8',bonus:0,saveAbility:'DEX',saveHalf:false,attackSave:'DEX save',range:'60 ft.'},
      healing_word:{spellLevel:1,castLevel:Math.max(1,Number(item.castLevel)||1),actionCost:'bonus',actionType:'healing',targetMode:'single',aoeRadius:0,die:'d4',diceCount:1,damageFormula:'1d4',upcastDice:'1d4',range:'60 ft.'},
      cure_wounds:{spellLevel:1,actionCost:'action',actionType:'healing',targetMode:'single',aoeRadius:0,die:'d8',diceCount:1,damageFormula:'1d8',upcastDice:'1d8',range:'Touch'},
      burning_hands:{spellLevel:1,actionCost:'action',actionType:'damage',targetMode:'cone',aoeRadius:75,die:'d6',diceCount:3,damageFormula:'3d6',bonus:0,saveAbility:'DEX',saveDC:0,saveHalf:true,range:'Self (15-foot cone)',upcastDice:'1d6',damageType:'fire'},
      fireball:{spellLevel:3,actionCost:'action',actionType:'damage',targetMode:'all',aoeRadius:100,die:'d6',diceCount:8,damageFormula:'8d6',bonus:0,saveAbility:'DEX',saveDC:0,saveHalf:true,range:'150 ft.',upcastDice:'1d6',damageType:'fire'},
      counterspell:{spellLevel:3,castLevel:Math.max(3,Number(item.castLevel)||3),actionCost:'reaction',actionType:'utility',range:'60 ft.'},
      shield:{spellLevel:1,castLevel:Math.max(1,Number(item.castLevel)||1),actionCost:'reaction',actionType:'buff',targetMode:'single',aoeRadius:0,effect:'Shield',range:'Self'}
    };
    if(!defs[name])return base;
    const spell={...base,targetMode:'single',aoeRadius:0,upcastDice:'',saveAbility:'',saveHalf:false,concentration:false,...defs[name]};
    spell.castLevel=spell.spellLevel===0?0:Math.max(spell.spellLevel,Number(item.castLevel)||spell.spellLevel);
    spell.resolutionMode=spell.resolutionMode||(spell.saveAbility?'save':spell.actionType==='damage'?'attack':spell.actionType);
    if(name==='magic_missile')spell.resolutionMode='automatic';
    return spell;
  }
  function tickStatuses(statuses,phase){
    return statuses.flatMap(s=>{
      const boundary=s.expiresAt||'end';
      if(s.expiresOnActor||boundary!==phase||!(s.rounds>0)) return [{...s}];
      return s.rounds>1?[{...s,rounds:s.rounds-1}]:[];
    });
  }
  function shortRestRefresh(name,ch){
    const k=key(name);
    return ['second_wind','action_surge','ki','flurry_of_blows','patient_defense','stunning_strike','step_of_the_wind','channel_divinity','turn_undead','wild_shape'].includes(k)
      || (k==='bardic_inspiration' && Number(ch.level)>=5);
  }
  function rest(ch,type,spent=0,rollDie=Math.random){
    if(!['short','long'].includes(type)) throw Error('Unknown rest type');
    const level=Math.max(1,Math.min(20,Number(ch.level)||1));
    const used=Math.min(level,Math.max(0,Number(ch.hitDiceUsed)||0));
    if(!(ch.currentHP>0)) throw Error('A character must have at least 1 HP to benefit from this rest.');
    if(!Number.isInteger(spent)||spent<0||spent>level-used) throw Error('Choose available Hit Dice.');
    const next={...ch,featureUsage:{...ch.featureUsage},spellSlotUsage:{...ch.spellSlotUsage},hitDiceUsed:used};
    if(type==='long'){
      next.currentHP=ch.derived.HP; next.spellSlotUsage={}; next.featureUsage={};
      next.hitDiceUsed=Math.max(0,used-Math.max(1,Math.floor(level/2)));
      next.deathSaves={success:0,fail:0};
    } else {
      const die=({Barbarian:12,Fighter:10,Paladin:10,Ranger:10,Wizard:6,Sorcerer:6})[ch.class]||8;
      const con=Math.floor(((Number(ch.effectiveCon)||Number(ch.stats?.CON)||10)-10)/2);
      let healing=0;
      for(let i=0;i<spent;i++) healing+=Math.max(0,1+Math.floor(rollDie()*die)+con);
      next.currentHP=Math.min(ch.derived.HP,ch.currentHP+healing);
      next.hitDiceUsed=used+spent;
      for(const k of Object.keys(next.featureUsage)) if(shortRestRefresh(k,ch)) delete next.featureUsage[k];
      if(ch.class==='Warlock') next.spellSlotUsage={};
    }
    return next;
  }
  const saves={Barbarian:['STR','CON'],Bard:['DEX','CHA'],Cleric:['WIS','CHA'],Druid:['INT','WIS'],Fighter:['STR','CON'],Monk:['STR','DEX'],Paladin:['WIS','CHA'],Ranger:['STR','DEX'],Rogue:['DEX','INT'],Sorcerer:['CON','CHA'],Warlock:['WIS','CHA'],Wizard:['INT','WIS'],Artificer:['CON','INT']};
  function saveBonus(ch,ability,score,flat=0){
    const proficient=(ch.savingThrowProficiencies||saves[ch.class]||[]).includes(ability)||(ch.class==='Monk'&&ch.level>=14);
    return Math.floor((score-10)/2)+(proficient?2+Math.floor((Math.max(1,ch.level||1)-1)/4):0)+flat;
  }
  function weaponAbility(ch,item,stats){
    if(['STR','DEX'].includes(item.attackAbility))return item.attackAbility;
    const text=String(item.name+' '+(item.description||'')).toLowerCase();
    if(/finesse|dagger|rapier|shortsword|scimitar|whip/.test(text))return stats.DEX>stats.STR?'DEX':'STR';
    return /bow|sling|dart|ranged/.test(text)&&!/thrown/.test(text)?'DEX':'STR';
  }
  function damageAmount(amount,type,ch){
    let n=Math.max(0,Number(amount)||0);const k=String(type||'').toLowerCase();
    const list=name=>(ch[name]||[]).map(x=>String(x).toLowerCase());
    if(k&&list('immunities').includes(k))return 0;
    const rage=(ch.statuses||[]).some(s=>s.name==='Rage')&&['bludgeoning','piercing','slashing'].includes(k);
    if(k&&(list('resistances').includes(k)||rage))n=Math.floor(n/2);
    if(k&&list('vulnerabilities').includes(k))n*=2;
    return n;
  }
  const automatedSpells=new Set(['magic_missile','fire_bolt','sacred_flame','healing_word','cure_wounds','burning_hands','fireball','shield','counterspell','poison_spray','inflict_wounds','ray_of_frost','chill_touch','guiding_bolt','eldritch_blast','scorching_ray','cone_of_cold']);
  const api={key,attacksPerAction,spellItem,tickStatuses,shortRestRefresh,rest,saveBonus,weaponAbility,damageAmount,automatedSpells};
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.GameplayRules=api;
})(typeof window==='object'?window:globalThis);
