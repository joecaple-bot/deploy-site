/* Loot tables are data-only so the map logic can stay small.
   Add as many items as you like under each rarity bucket. */
window.DND_LOOT_TABLES = {
  Common: [
    {name:'Bent Copper Ring',qty:1,rarity:'Common',description:'Cheap jewelry. Might sell for a few coins.'},
    {name:'Chipped Dagger',qty:1,rarity:'Common',description:'Rough backup blade. Not pretty, still sharp.'},
    {name:'Frayed Rope',qty:1,rarity:'Common',description:'About 20 feet of rope. Worn but usable.'},
    {name:'Cracked Vial',qty:1,rarity:'Common',description:'A small empty vial with a hairline crack.'},
    {name:'Lucky Bone Charm',qty:1,rarity:'Common',description:'A crude charm tied with old string.'},
    {name:'Dented Buckle',qty:1,rarity:'Common',description:'Could repair a strap or be traded as scrap.'},
    {name:'Stale Rations',qty:1,rarity:'Common',description:'Barely food, but technically food.'},
    {name:'Smoky Quartz Chip',qty:1,rarity:'Common',description:'A dull little gemstone chip.'},
    {name:'Torn Map Scrap',qty:1,rarity:'Common',description:'A fragment of a route or room sketch.'},
    {name:'Rusty Lockpick',qty:1,rarity:'Common',description:'Risky to use, but better than bare hands.'},
    {name:'Wax-Sealed Note',qty:1,rarity:'Common',description:'A short note sealed in cheap wax.'},
    {name:'Bundle of Chalk',qty:3,rarity:'Common',description:'Good for marking dungeon walls.'},
    {name:'Iron Piton',qty:2,rarity:'Common',description:'Useful for climbing or jamming doors.'},
    {name:'Tallow Candle',qty:4,rarity:'Common',description:'Smoky, cheap light.'},
    {name:'Patchwork Pouch',qty:1,rarity:'Common',description:'A small pouch with several obvious repairs.'},
    {name:'Bone Dice Set',qty:1,rarity:'Common',description:'A stained but balanced set of dice.'},
    {name:'Tiny Mirror Shard',qty:1,rarity:'Common',description:'Can peek around corners in a pinch.'},
    {name:'Oilskin Wrap',qty:1,rarity:'Common',description:'Keeps one small object dry.'},
    {name:'Tin Whistle',qty:1,rarity:'Common',description:'Shrill, annoying, and occasionally useful.'},
    {name:'Sooty Lantern Wick',qty:2,rarity:'Common',description:'Replacement wicks for a lantern.'},
    {name:'Copper Idol',qty:1,rarity:'Common',description:'A crude little idol with worn features.'},
    {name:'Traveler Soup Packet',qty:1,rarity:'Common',description:'Just add hot water and courage.'},
    {name:'Cheap Perfume Vial',qty:1,rarity:'Common',description:'Strong enough to hide bad smells for a minute.'},
    {name:'Splintered Wand Case',qty:1,rarity:'Common',description:'The wand is gone, but the case survived.'},
    {name:'Pocket Almanac',qty:1,rarity:'Common',description:'Weather guesses, moon phases, and farmer notes.'}
  ],
  Uncommon: [
    {name:'Minor Healing Salve',qty:1,rarity:'Uncommon',description:'A weak salve. Restores 1d4 HP if the DM allows it.'},
    {name:'Odd Key',qty:1,rarity:'Uncommon',description:'No label. Surely opens something, somewhere.'},
    {name:'Silvered Arrowhead',qty:1,rarity:'Uncommon',description:'A single arrowhead treated with silver.'},
    {name:'Climbing Claws',qty:1,rarity:'Uncommon',slot:'Gloves',description:'Hooked finger grips for rough stone.'},
    {name:'Apprentice Focus Crystal',qty:1,rarity:'Uncommon',slot:'Pendant',description:'A cloudy spell focus for simple rituals.'},
    {name:'Smoke Pellet',qty:2,rarity:'Uncommon',description:'Creates a small burst of smoke when cracked.'},
    {name:'Stitching Needle of Mending',qty:1,rarity:'Uncommon',description:'Repairs cloth unusually neatly.'},
    {name:'Moonlit Compass',qty:1,rarity:'Uncommon',description:'Points north only under moonlight.'},
    {name:'Quickstep Boots',qty:1,rarity:'Uncommon',slot:'Boots',description:'Light boots that feel eager to move.'},
    {name:'Brass Alarm Bell',qty:1,rarity:'Uncommon',description:'Rings softly when someone crosses a tied string.'},
    {name:'Ember Bead',qty:1,rarity:'Uncommon',description:'Warm to the touch. Can start a campfire once.'},
    {name:'Scribe Ink of Recall',qty:1,rarity:'Uncommon',description:'Ink that darkens when reread by its writer.'},
    {name:'Polished Guard Charm',qty:1,rarity:'Uncommon',slot:'Bracelet',acBonus:1,description:'A small charm that helps turn a glancing blow.'},
    {name:'Farspeaker Shell',qty:1,rarity:'Uncommon',description:'Carries a whispered word a short distance.'},
    {name:'Grave Salt Pouch',qty:1,rarity:'Uncommon',description:'Useful in rituals against restless dead.'}
  ],
  Rare: [
    {name:'Ring of the Split Step',qty:1,rarity:'Rare',slot:'Ring 1',description:'Once per rest, the wearer may make a quick evasive step.'},
    {name:'Goblet of Clean Water',qty:1,rarity:'Rare',description:'Water poured into it becomes drinkable after a minute.'},
    {name:'Cloak of Quiet Footfalls',qty:1,rarity:'Rare',slot:'Cloak',description:'Softens movement and helps with stealthy approaches.'},
    {name:'Helm of Second Sight',qty:1,rarity:'Rare',slot:'Helmet',description:'The visor catches faint traces of hidden magic.'},
    {name:'Veteran Chestplate',qty:1,rarity:'Rare',slot:'Chestplate',acBonus:2,description:'Scarred armor that still holds strong.'},
    {name:'Pearl of Stored Breath',qty:1,rarity:'Rare',slot:'Pendant',description:'Stores a few minutes of breathable air.'},
    {name:'Thornbite Dagger',qty:1,rarity:'Rare',description:'A narrow blade that leaves a stinging cut.'},
    {name:'Sunspike Javelin',qty:1,rarity:'Rare',description:'A bright throwing spear with excellent balance.'},
    {name:'Lantern of Blue Flame',qty:1,rarity:'Rare',description:'Blue light reveals faint footprints and old stains.'},
    {name:'Band of Borrowed Luck',qty:1,rarity:'Rare',slot:'Ring 2',description:'A ring that feels lucky until the bill comes due.'}
  ],
  'Very Rare': [
    {name:'Aegis Pendant',qty:1,rarity:'Very Rare',slot:'Pendant',acBonus:1,description:'A shield-shaped pendant that hums near danger.'},
    {name:'Stormglass Bracelet',qty:1,rarity:'Very Rare',slot:'Bracelet',description:'Clouds swirl inside the glass when magic is near.'},
    {name:'Boots of the Horizon Step',qty:1,rarity:'Very Rare',slot:'Boots',description:'A short burst of impossible distance once per rest.'},
    {name:'Dragonbone Buckler',qty:1,rarity:'Very Rare',slot:'Shield',acBonus:2,description:'Light, pale, and much stronger than it looks.'},
    {name:'Crownless Helm',qty:1,rarity:'Very Rare',slot:'Helmet',description:'Grants a commanding presence without a crown.'},
    {name:'Blade of Returning Dawn',qty:1,rarity:'Very Rare',description:'A radiant weapon that yearns to return to hand.'},
    {name:'Spellglass Orb',qty:1,rarity:'Very Rare',description:'Stores the shape of a spell seen recently.'},
    {name:'Mantle of Falling Stars',qty:1,rarity:'Very Rare',slot:'Cloak',description:'A dark cloak scattered with moving points of light.'}
  ],
  Legendary: [
    {name:'Crown Shard of the First King',qty:1,rarity:'Legendary',slot:'Helmet',description:'A broken crown piece heavy with old authority.'},
    {name:'Heartfire Plate',qty:1,rarity:'Legendary',slot:'Chestplate',acBonus:3,description:'Armor that glows from within when its wearer is near death.'},
    {name:'Ring of the Last Door',qty:1,rarity:'Legendary',slot:'Ring 1',description:'A keyhole appears briefly in the ring under starlight.'},
    {name:'Worldroot Staff',qty:1,rarity:'Legendary',description:'A living staff grown from impossible wood.'},
    {name:'Moon-Eater Blade',qty:1,rarity:'Legendary',description:'A black blade that drinks reflected light.'},
    {name:'Phoenix Ash Locket',qty:1,rarity:'Legendary',slot:'Pendant',description:'Warm ash shifts inside a sealed crystal locket.'}
  ]
};

(function expandLootTables(){
  const targets={Common:200,Uncommon:100,Rare:100,'Very Rare':100,Legendary:50};
  const slots=['Helmet','Chestplate','Pendant','Bracelet','Ring 1','Ring 2','Boots','Cloak','Gloves','Belt','Shield'];
  const abilities=['STR','DEX','CON','INT','WIS','CHA'];
  const usedNames=new Set();
  for(const pool of Object.values(window.DND_LOOT_TABLES)){
    for(const item of pool) usedNames.add(item.name);
  }

  function statBonus(stat,value){
    return {STR:0,DEX:0,CON:0,INT:0,WIS:0,CHA:0,[stat]:value};
  }
  function addUnique(rarity,item){
    if(usedNames.has(item.name)) return false;
    usedNames.add(item.name);
    window.DND_LOOT_TABLES[rarity].push({qty:1,rarity,...item});
    return true;
  }
  function fillPool(rarity,parts){
    let guard=0;
    while(window.DND_LOOT_TABLES[rarity].length<targets[rarity] && guard<12000){
      const i=guard++;
      const material=parts.materials[i%parts.materials.length];
      const object=parts.objects[Math.floor(i/parts.materials.length)%parts.objects.length];
      const suffix=parts.suffixes[i%parts.suffixes.length];
      const name=`${material} ${object} ${suffix}`.replace(/\s+/g,' ').trim();
      const slot=parts.slots?.length ? parts.slots[i%parts.slots.length] : '';
      const stat=abilities[i%abilities.length];
      const ac=parts.acEvery && slot && i%parts.acEvery===0 ? parts.acBonus : 0;
      const item={
        name,
        description:parts.description(object,suffix,stat),
        slot,
        acBonus:ac,
        statBonuses:parts.statEvery && slot && i%parts.statEvery===0 ? statBonus(stat,parts.statBonus) : undefined,
        ability:parts.abilityEvery && i%parts.abilityEvery===0 ? parts.ability(object,suffix) : '',
        bonusAction:parts.bonusEvery && i%parts.bonusEvery===0 ? parts.bonusAction(object) : ''
      };
      if(!item.slot) delete item.slot;
      if(!item.acBonus) delete item.acBonus;
      if(!item.statBonuses) delete item.statBonuses;
      if(!item.ability) delete item.ability;
      if(!item.bonusAction) delete item.bonusAction;
      addUnique(rarity,item);
    }
  }

  fillPool('Common',{
    materials:['Bent','Scuffed','Weathered','Dusty','Patched','Dull','Worn','Tarnished','Cracked','Frayed','Soot-Stained','Mud-Caked','Plain','Old','Nickel','Copper','Tin','Splintered','Faded','Threadbare'],
    objects:['Travel Spoon','Boot Knife','Canvas Pouch','Map Tube','Prayer Bead','Lantern Hook','Rope Coil','Trail Marker','Needle Case','Water Flask','Belt Tag','Dice Cup','Candle Stub','Iron Spike','Chalk Tin','Button Set','Wax Seal','Pocket Comb','Fishhook Bundle','Scrap Charm'],
    suffixes:['of the Road','from a Guard Post','with Initials','Wrapped in Twine','with a Hidden Nick','from the Market','Marked by Smoke','with Old Scratches','from a Lost Pack','of Questionable Luck','with a Bent Edge','from a River Camp'],
    description:(object,suffix)=>`A ${object.toLowerCase()} ${suffix.toLowerCase()}. Mostly mundane, but useful in the right hands.`
  });

  fillPool('Uncommon',{
    materials:['Silvered','Moon-Touched','Ashwood','Amber','Low Ember','Hearth-Blessed','Ravenmarked','Blueglass','Whispering','Frosted','Verdant','Runescratched','Storm-Tinged','Glimmering','Oathbound'],
    objects:['Charm','Compass','Pendant','Bracelet','Boots','Gloves','Cloak Pin','Focus Shard','Bell','Lockpick Set','Tonic Flask','Signal Mirror','Needle','Whetstone','Lantern Lens'],
    suffixes:['of Minor Warding','of Safe Passage','of the Quick Hand','of Clear Water','of the Quiet Step','of Campfire Light','of Small Warnings','of Borrowed Nerve','of the Watchful Eye','of Gentle Mending'],
    slots:['Pendant','Bracelet','Boots','Gloves','Cloak','Ring 1','Ring 2','Belt'],
    acEvery:9,
    acBonus:1,
    abilityEvery:6,
    bonusEvery:8,
    description:(object,suffix,stat)=>`A practical ${object.toLowerCase()} ${suffix.toLowerCase()}. It carries a small enchantment and a faint ${stat} resonance.`,
    ability:(object)=>`${object} trick`,
    bonusAction:(object)=>`Use ${object}`
  });

  fillPool('Rare',{
    materials:['Dragonbone','Sunforged','Nightglass','Kingswood','Star-Iron','Ghostsilver','Stormhide','Embersteel','Pearlbound','Runebound','Bloodstone','Feywoven','Deep Crystal','Griffon','Sainted'],
    objects:['Ring','Dagger','Javelin','Helm','Chestplate','Pendant','Cloak','Boots','Buckler','Wand','Orb','Gloves','Belt','Charm','Shortblade'],
    suffixes:['of the Split Step','of Quiet Thunder','of the Hidden Door','of Resolute Guard','of the Bright Hunt','of Unbroken Focus','of Far Hearing','of the Silver Path','of Thorned Mercy','of the Lantern Soul'],
    slots:['Ring 1','Ring 2','Helmet','Chestplate','Pendant','Cloak','Boots','Shield','Gloves','Belt'],
    acEvery:5,
    acBonus:1,
    statEvery:4,
    statBonus:1,
    abilityEvery:5,
    bonusEvery:7,
    description:(object,suffix,stat)=>`A rare ${object.toLowerCase()} ${suffix.toLowerCase()}. It can influence ${stat} checks when its magic is relevant.`,
    ability:(object,suffix)=>`${object} ${suffix.replace('of ','')}`,
    bonusAction:(object)=>`Trigger ${object}`
  });

  fillPool('Very Rare',{
    materials:['Astral','Phoenix','Voidglass','Thunder-Crowned','Wyrmheart','Eclipsed','Mythril','Soul-Lit','Celestial','Ironstar','Everflame','Sea-King','Dreamforged','Oracle','Titanbone'],
    objects:['Aegis','Blade','Mantle','Helm','Chestplate','Pendant','Bracelet','Ring','Staff','Orb','Boots','Shield','Crown','Gauntlets','Sash'],
    suffixes:['of Returning Dawn','of Falling Stars','of the Horizon Step','of Storm Command','of the World Below','of the Unseen Gate','of Deathless Breath','of the Sunken Oath','of Mirror Fate','of the Seventh Watch'],
    slots:['Helmet','Chestplate','Pendant','Bracelet','Ring 1','Ring 2','Boots','Cloak','Gloves','Belt','Shield'],
    acEvery:4,
    acBonus:2,
    statEvery:3,
    statBonus:1,
    abilityEvery:3,
    bonusEvery:5,
    description:(object,suffix,stat)=>`A very rare ${object.toLowerCase()} ${suffix.toLowerCase()}. Its power bends danger away and sharpens ${stat}.`,
    ability:(object,suffix)=>`${object} ${suffix.replace('of ','')}`,
    bonusAction:(object)=>`Unleash ${object}`
  });

  fillPool('Legendary',{
    materials:['First-King','Worldroot','Moon-Eater','Godglass','Dawn-Tyrant','Elder Dragon','Starfallen','Fatebound','Crownfire','Abyss-Sealed','Heaven-Sundered','Oracle-King'],
    objects:['Crown Shard','Blade','Plate','Ring','Staff','Locket','Mantle','Helm','Aegis','Scepter','Heartstone','Codex'],
    suffixes:['of the Last Door','of the First Flame','of Unwritten Fate','of the Broken Throne','of Eternal Return','of the Silent Apocalypse','of Heaven and Ash','of the Deepest Oath','of the Living World','of Final Mercy'],
    slots:['Helmet','Chestplate','Pendant','Ring 1','Ring 2','Cloak','Shield','Belt'],
    acEvery:3,
    acBonus:3,
    statEvery:2,
    statBonus:2,
    abilityEvery:2,
    bonusEvery:3,
    description:(object,suffix,stat)=>`A legendary ${object.toLowerCase()} ${suffix.toLowerCase()}. Stories cling to it, and its bearer feels ${stat} surge at decisive moments.`,
    ability:(object,suffix)=>`${object} ${suffix.replace('of ','')}`,
    bonusAction:(object)=>`Invoke ${object}`
  });
})();
