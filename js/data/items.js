// Weapons, armor, gear and loot tables (Chapter VI: Spoils & Loot).

const FIST = 'Unarmed Combat & Fist Weapons';
const BL = 'Bladed Weapons', BU = 'Bludgeoning Weapons', SH = 'Shafted Weapons';

// [name, cost, damageType, skill, speed, traits]
export const WEAPONS = Object.fromEntries([
  ['Bardiche', 15, 'Slashing', SH, 0, ['Two-Handed', 'Quick']],
  ['Bastard Sword', 30, 'Slashing', BL, 0, ['Versatile', 'Parrying']],
  ['Billhook', 10, 'Slashing', SH, 0, ['Two-Handed', 'Simple']],
  ['Cestus', 5, 'Bludgeoning', FIST, 5, ['Simple']],
  ['Claw', 20, 'Slashing', FIST, 0, ['Parrying', 'Quick']],
  ['Club', 5, 'Bludgeoning', BU, 5, ['Simple']],
  ['Dagger', 5, 'Piercing', BL, 0, ['Parrying', 'Quick']],
  ['Flail', 30, 'Bludgeoning', BU, 5, ['Powerful']],
  ['Glaive', 15, 'Slashing', SH, 5, ['Two-Handed']],
  ['Great Axe', 50, 'Slashing', BL, 5, ['Two-Handed']],
  ['Greatclub', 20, 'Bludgeoning', BU, 5, ['Two-Handed']],
  ['Great Sword', 80, 'Slashing', BL, 0, ['Two-Handed', 'Parrying']],
  ['Halberd', 15, 'Slashing', SH, 5, ['Two-Handed']],
  ['Hatchet', 5, 'Slashing', BL, 5, ['Simple']],
  ['Improvised Weapon', 1, 'Bludgeoning', SH, 5, ['Two-Handed']],
  ['Knuckles', 5, 'Bludgeoning', FIST, 0, ['Simple', 'Quick']],
  ['Light Hammer', 5, 'Bludgeoning', BU, 5, ['Defensive']],
  ['Longsword', 20, 'Slashing', BL, 0, ['Parrying', 'Versatile']],
  ['Maul', 20, 'Bludgeoning', BU, 0, ['Two-Handed', 'Simple']],
  ['Mace', 15, 'Bludgeoning', BU, 5, ['Simple']],
  ['Morningstar', 15, 'Bludgeoning', BU, 5, ['Powerful']],
  ['Pike', 10, 'Piercing', SH, 5, ['Two-Handed']],
  ['Quarterstaff', 5, 'Bludgeoning', SH, 0, ['Parrying', 'Two-Handed']],
  ['Rapier', 30, 'Piercing', BL, 0, ['Parrying', 'Quick']],
  ['Saber', 20, 'Slashing', BL, 5, ['Parrying']],
  ['Shortsword', 15, 'Slashing', BL, 0, ['Parrying', 'Defensive']],
  ['Spear', 10, 'Piercing', SH, 0, ['Defensive', 'Versatile']],
  ['Sword Gauntlet', 10, 'Piercing', FIST, 5, ['Defensive']],
  ['Warhammer', 25, 'Bludgeoning', BU, 0, ['Powerful', 'Versatile']],
  ['War Pick', 15, 'Piercing', BU, 5, ['Powerful']],
].map(([name, cost, type, skill, speed, traits]) => [name, { name, cost, type, skill, speed, traits }]));

export const WEAPON_TRAITS = {
  Defensive: '+10 combat Skill when used defensively in combination with a shield.',
  Quick: '+10 to Initiative checks.',
  Parrying: 'Allows you to use your weapon Skill when defending against attacks.',
  Powerful: '+1 damage.',
  Simple: '+10 to the combat Skill.',
  'Two-Handed': 'Requires two hands; +2 damage.',
  Versatile: 'When wielded with two hands, +1 damage.',
};

export const RANDOM_WEAPON = [
  [1, 4, 'Bardiche'], [5, 8, 'Bastard Sword'], [9, 12, 'Billhook'], [13, 16, 'Cestus'], [17, 20, 'Claw'],
  [21, 24, 'Club'], [25, 28, 'Dagger'], [29, 31, 'Flail'], [32, 34, 'Glaive'], [35, 37, 'Great Axe'],
  [38, 40, 'Greatclub'], [41, 43, 'Great Sword'], [44, 46, 'Halberd'], [47, 49, 'Hatchet'], [50, 52, 'Improvised Weapon'],
  [53, 55, 'Knuckles'], [56, 58, 'Light Hammer'], [59, 61, 'Longsword'], [62, 64, 'Mace'], [65, 67, 'Maul'],
  [68, 70, 'Morningstar'], [71, 73, 'Pike'], [74, 76, 'Quarterstaff'], [77, 79, 'Rapier'], [80, 82, 'Saber'],
  [83, 85, 'Shortsword'], [86, 88, 'Spear'], [89, 91, 'Sword Gauntlet'], [92, 94, 'Warhammer'], [95, 97, 'War Pick'],
  [98, 100, 'MAGIC'],
];

// Armor: slot, name, cost, protection, integrity die, penalty
export const TORSO = {
  'Heavy Cloth': { cost: 40, prot: 1, integ: 6, man: 5 },
  'Soft Leather': { cost: 60, prot: 1, integ: 8, man: 5 },
  'Hide Scale': { cost: 75, prot: 2, integ: 8, man: 10 },
  Laminar: { cost: 100, prot: 2, integ: 8, man: 15 },
  'Rigid Leather': { cost: 125, prot: 2, integ: 8, man: 15 },
  Mail: { cost: 150, prot: 2, integ: 8, man: 15 },
  'Metal Scale': { cost: 150, prot: 2, integ: 10, man: 20 },
  Brigandine: { cost: 175, prot: 3, integ: 10, man: 20 },
  Plate: { cost: 200, prot: 3, integ: 12, man: 20 },
};
export const LIMB = { Light: { cost: 20, prot: 1, integ: 6 }, Medium: { cost: 40, prot: 2, integ: 8 }, Heavy: { cost: 60, prot: 3, integ: 10 } };
export const HELMETS = { Light: { cost: 20, prot: 1, integ: 6, perc: 5 }, Medium: { cost: 40, prot: 2, integ: 8, perc: 10 }, Heavy: { cost: 60, prot: 3, integ: 10, perc: 15 } };
export const SHIELDS = { Target: { cost: 20, parry: 5, integ: 6 }, Normal: { cost: 40, parry: 10, integ: 8 }, Full: { cost: 60, parry: 15, integ: 8 }, Wall: { cost: 100, parry: 20, integ: 8, heavy: true } };

export const RANDOM_ARMOR = [[1, 2, 'torso'], [3, 4, 'arms'], [5, 6, 'legs'], [7, 8, 'head'], [9, 10, 'shield']];
export const RANDOM_LIMB = [[1, 33, 'Light'], [34, 66, 'Medium'], [67, 100, 'Heavy']];
export const RANDOM_SHIELD = [[1, 25, 'Target'], [26, 50, 'Normal'], [51, 75, 'Full'], [76, 100, 'Wall']];
export const RANDOM_TORSO = [[1, 10, 'Heavy Cloth'], [11, 20, 'Soft Leather'], [21, 30, 'Hide Scale'], [31, 40, 'Laminar'], [41, 50, 'Rigid Leather'], [51, 60, 'Metal Scale'], [61, 70, 'Mail'], [71, 80, 'Brigandine'], [81, 90, 'Plate'], [91, 100, 'MAGIC']];

// Supplies are tracked as counters (all "Light" unless noted). key: [label, cost, weight]
export const SUPPLIES = {
  coins: ['Coins', 1, 'coin'],
  torch: ['Torch', 10, 'light'],
  candle: ['Candle', 2, 'light'],
  flare: ['Flare', 20, 'light'],
  lampOil: ['Lamp Oil', 5, 'light'],
  ration: ['Ration', 5, 'light'],
  bandage: ['Bandage', 10, 'light'],
  lockpick: ['Lockpick', 5, 'light'],
  cooking: ['Cooking Ingredients', 5, 'light'],
  crafting: ['Crafting Supplies', 5, 'light'],
  crystal: ['Attunement Crystal', 50, 'light'],
  ritual: ['Ritual Components', 10, 'light'],
};

// Non-stackable common gear: [cost, weight, description]
export const GEAR = {
  Backpack: [500, 'normal', 'Increases carrying capacity by 20 item slots. Can only equip 1.'],
  Bedroll: [200, 'heavy', 'Grants +1 to the Camp Check.'],
  Belt: [1000, 'normal', 'Allows you to have up to 4 items available in your Belt quickslots (using them is a Free Action).'],
  'Belt Lamp': [1500, 'normal', 'Attached to a Belt, taking one of the slots. A lightsource that leaves your hands free. Requires Lamp Oil.'],
  Crowbar: [50, 'normal', '+10 Athletics when attempting to break down a container or door.'],
  Lamp: [200, 'normal', 'Serves as a lightsource. Requires Lamp Oil.'],
  Pouch: [100, 'normal', 'Increases carrying capacity by 5 item slots. Can only equip 3 at once.'],
  "Thieves' Toolkit": [200, 'normal', 'Required to disarm traps. +5 to Thievery.'],
};

export const SUPPLY_TEXT = {
  torch: 'Serves as a lightsource for 20 rooms. Requires a free hand.',
  candle: 'Serves as a lightsource, but only lasts 10 rooms.',
  flare: 'Thrown into a room or corridor, it serves as a lightsource (for that room).',
  lampOil: 'Fuel for a Lamp (20 rooms).',
  ration: 'Consume to remove 1 Exhaustion (not in combat).',
  bandage: 'Heals D4 Toughness with a successful Medicine check (once per room), or removes Bleeding/Poisoned.',
  lockpick: 'Required to open locks. Breaks on each failed lockpicking attempt.',
  cooking: 'Cook into Rations at Camp. Can be eaten raw in desperation.',
  crafting: 'Used at Camp to craft bandages, torches, lockpicks, lamp oil, to barricade, and to repair gear.',
  crystal: 'Spend at Camp to attune to (and identify) a magic item.',
  ritual: 'Required by Ritualists.',
};

export const SPOILS = [[1, 3, 'mundane'], [4, 5, 'valuable'], [6, 6, 'precious']];
export const MUNDANE = [
  [1, 5, { sup: 'crafting', n: 'D4' }], [6, 10, { sup: 'cooking', n: 'D4' }], [11, 15, { gear: 'Backpack' }],
  [16, 20, { sup: 'bandage', n: '1' }], [21, 25, { gear: 'Bedroll' }], [26, 30, { gear: 'Belt' }],
  [31, 35, { gear: 'Belt Lamp' }], [36, 40, { sup: 'candle', n: '1' }], [41, 45, { lore: true }],
  [46, 50, { gear: 'Crowbar' }], [51, 55, { sup: 'flare', n: '1' }], [56, 60, { gems: true }],
  [61, 65, { gear: 'Lamp' }], [66, 70, { sup: 'lampOil', n: '1' }], [71, 75, { sup: 'lockpick', n: '1' }],
  [76, 80, { gear: 'Pouch' }], [81, 85, { armor: true }], [86, 90, { weapon: true }], [91, 100, { sup: 'ritual', n: 'D4' }],
];
export const VALUABLE = [[1, 5, 'potion'], [6, 12, 'crystal'], [13, 16, 'fragment'], [17, 20, 'magic']];
export const PRECIOUS = [[1, 15, 'magic'], [16, 20, 'relic']];
export const RESOURCES = [[1, 2, null], [3, 6, 'cooking'], [7, 10, 'crafting']];
export const GEMS = [[1, 2, ['Ornamental', 'D100']], [3, 6, ['Semi-precious', '2D100']], [7, 11, ['Precious', '3D100']], [12, 15, ['Lavish', '4D100']], [16, 18, ['Sumptuous', '5D100']], [19, 20, ['Extravagant', '6D100']]];

export const SCAVENGING = [
  [1, 1, { text: 'You uncover some grisly remains. Make a successful Resolve check or lose 1 Sanity.', grisly: true }],
  [2, 2, { text: 'You find nothing of interest.' }],
  [3, 3, { text: 'You discover D20 coins.', coins: 'D20' }],
  [4, 11, { text: 'You find D4 Crafting Supplies.', sup: 'crafting', n: 'D4' }],
  [12, 12, { text: 'You discover 2D20 coins.', coins: '2D20' }],
  [13, 18, { text: 'You find D4 Cooking Ingredients.', sup: 'cooking', n: 'D4' }],
  [19, 19, { text: 'You discover D100 coins.', coins: 'D100' }],
  [20, 99, { text: 'Roll on the Spoils table.', spoils: true }],
];

export const CONTAINER_LOOT = [
  [1, 2, { text: 'Rotten foodstuff and clothing.' }], [3, 3, { sup: 'crafting', n: 'D4' }], [4, 4, { sup: 'candle', n: 'D4' }],
  [5, 5, { lore: true }], [6, 7, { gems: true }], [8, 8, { gear: 'Pouch' }], [9, 9, { sup: 'flare', n: 'D4' }],
  [10, 10, { sup: 'ritual', n: 'D10' }], [11, 11, { crelic: 'Blank Diary' }], [12, 12, { crelic: 'Borestian Stone' }],
  [13, 13, { crelic: 'Heart Fragment of Amal-Tul' }], [14, 14, { crelic: 'Mace of Obliteration' }], [15, 15, { crelic: 'Ring of Mental Peace' }],
  [16, 16, { crelic: 'Vial of Potency - Aether' }], [17, 17, { crelic: 'Vial of Potency - Endurance' }], [18, 18, { crelic: 'Vial of Potency - Health' }],
  [19, 19, { crelic: 'Vial of Potency - Spellward' }], [20, 20, { crelic: 'Vial of Potency - Sanity' }],
];

export const POTIONS = [
  [1, 1, { id: 'aether', name: 'Aether', text: 'You immediately recover 5 Aether.' }],
  [2, 2, { id: 'antidote', name: 'Antidote', text: 'Immediately removes the Poisoned condition.' }],
  [3, 3, { id: 'coagulate', name: 'Coagulate', text: 'Immediately removes the Bleeding condition.' }],
  [4, 4, { id: 'courage', name: 'Courage', text: 'Immediately removes the Frightened condition.' }],
  [5, 5, { id: 'flaming', name: 'Flaming', text: 'When applied to a weapon, increase your Damage Pool by +D4 Fire damage during 5 rounds.' }],
  [6, 6, { id: 'frenzy', name: 'Frenzy', text: "For the next D6 rounds you deal +2D6 damage, but you're unable to defend in any way." }],
  [7, 8, { id: 'heal', name: 'Heal', text: 'You immediately heal D6+2 Wounds.' }],
  [9, 9, { id: 'regen', name: 'Regeneration', text: 'Heal D10+5 Wounds, at a rate of 1 Wound/round.' }],
  [10, 10, { id: 'poison', name: 'Poison', text: 'When applied to a weapon, the next successful attack applies the Poisoned (1) condition.' }],
  [11, 11, { id: 'purge', name: 'Purge', text: 'Immediately removes the Cursed and Sickened conditions.' }],
  [12, 13, { id: 'rest', name: 'Rest', text: 'Reduce your Exhaustion by D4.' }],
  [14, 14, { id: 'satiation', name: 'Satiation', text: 'Counts as a Ration.' }],
  [15, 15, { id: 'mind', name: 'Mindfulness', text: 'Heal 1 Sanity.' }],
  [16, 17, { id: 'speed', name: 'Speed', text: 'Grants 1 free Standard Action.' }],
  [18, 18, { id: 'stoneskin', name: 'Stoneskin', text: 'For the next D10 rooms you have +1 Armor, but your Dodge and Acrobatics Skills are reduced by 10.' }],
  [19, 19, { id: 'strength', name: 'Strength', text: 'Increase your Endurance and Athletics by +10 for the next D10 rooms.' }],
  [20, 20, { id: 'vitality', name: 'Vitality', text: 'Grants D10 Temporary Toughness. Taking more than one while under the effects of a previous one causes D10 Acid damage.' }],
];
export const POTION_AGING = [
  [1, 2, { id: 'poisoned', text: 'The Potion has turned into a poison. Make a successful Endurance check or become Poisoned (1).' }],
  [3, 4, { id: 'explodes', text: 'The Potion has become extremely unstable, and it explodes the second you open it. You suffer 2D4 Force damage.' }],
  [5, 6, { id: 'inert', text: 'The Potion has lost all its potency. No effect after drinking it.' }],
  [7, 10, { id: 'half', text: "The Potion has lost some potency. Its effects only last 50% of what they're supposed to, and have their efficacy halved." }],
  [11, 17, { id: 'normal', text: 'The Potion works as intended.' }],
  [18, 19, { id: 'double', text: 'The Potion has been refined by time. Its effects last 50% longer and have their efficacy doubled.' }],
  [20, 20, { id: 'permanent', text: 'The Potion has been completely enhanced, making its effects permanent.' }],
];

export const FRAGMENTS = [
  { id: 1, name: 'Thorned Dagger', text: 'A twisted dagger with a thorn-covered blade. When used to deal the fatal strike against an enemy, the creature rises as a Skeleton under your control.', use: 'combat' },
  { id: 2, name: 'Tattered Cloak', text: 'A tattered cloak that shrouds the wearer in darkness. Grants invisibility for 5 rooms, or until you make an attack. You can ignore all Combat Encounters until then.', use: 'explore' },
  { id: 3, name: 'Jagged Mirror', text: 'A jagged mirror fragment that, when shattered, creates illusory duplicates of the user. +30 to Dodge for the next 4 rounds.', use: 'combat' },
  { id: 4, name: 'Rusted Chain', text: 'A rusted chain that, when wrapped around you, grants your mind strength and resolve. +10 Temporary Sanity.', use: 'any' },
  { id: 5, name: 'Black Heart Amulet', text: 'A black heart-shaped amulet. When crushed (Free Action), it allows you to absorb damage meant for an ally, but the amulet crumbles to dust, leaving you unable to feel empathy for a week.', use: 'combat' },
  { id: 6, name: 'Cracked Monocle', text: 'A cracked monocle. As a Standard Action, make a Resolve check: if successful your target suffers 3D10 Psychic damage.', use: 'combat' },
  { id: 7, name: 'Sickly Green Vial', text: 'A vial filled with sickly green liquid. When thrown, it bursts into corrosive flames that deal 3D6 Acid damage to all targets.', use: 'combat' },
  { id: 8, name: 'Enchanted Skull', text: "A small, enchanted skull that grants the user the ability to see what's ahead. Roll the contents of the next 3 rooms.", use: 'explore' },
  { id: 9, name: 'Tattered Bandages', text: 'Tattered bandages that accelerate healing but carry a curse. Heal 2 Toughness/room. If kept for more than D6 rooms, you lose 1 Health/room.', use: 'any' },
  { id: 10, name: 'Blood-red Potion', text: 'A blood-red potion that grants immense strength for a short time. Increase your next Athletics check by +50.', use: 'any' },
  { id: 11, name: 'Raven Feather Pendant', text: "A pendant adorned with a single raven's feather. Grants you +1 Standard Action during the next 4 rounds.", use: 'combat' },
  { id: 12, name: 'Spiked Gauntlet', text: 'For as long as you remain in this room your Unarmed Combat & Fist Weapons Skill is increased by 50 and you deal 2D6 Fire damage. Once you exit the room you receive 2D6 Fire damage.', use: 'combat' },
  { id: 13, name: 'Vial of Black Liquid', text: 'Grants immunity to Sanity loss for the next 4 rooms, but leaves you emotionally detached afterward.', use: 'any' },
  { id: 14, name: 'Delicate Locket', text: 'Releases a swarm of spectral spiders. A target of your choice becomes Restrained.', use: 'combat' },
  { id: 15, name: 'Obsidian Whistle', text: 'Summons a vengeful spirit that immediately deals 3D10 Psychic damage to a designated target.', use: 'combat' },
  { id: 16, name: 'Flask of Miasma', text: 'Releases a cloud of disease, dealing 3D4 Poison damage to all enemies.', use: 'combat' },
  { id: 17, name: 'Broken Harp', text: 'Creates haunting melodies that charm enemies. A single target is Charmed.', use: 'combat' },
  { id: 18, name: 'Tattered Spellbook', text: 'Allows you to use any Mastery Ability once. Roll on the Random Mastery table to find out which Mastery it has access to, and pick one Ability.', use: 'combat' },
  { id: 19, name: 'Amethyst Ring', text: 'Grants you 2D10 Temporary Toughness.', use: 'any' },
  { id: 20, name: 'Sinister Hourglass', text: 'Temporarily slows time for everyone except you. All enemies become Dazed (3).', use: 'combat' },
];

export const LORE_BOOKS = [
  ['Shadows of Devotion: The Vaelorian Rites of Necromantic Worship', 'Through a potent blend of religion and dark sorcery, the Vaelorians worship the realm of death itself, embracing the forbidden arts that bind them to the eternal cycle of life and decay. Shadow-clad priests, adorned in somber vestments, conduct solemn ceremonies to commune with the departed souls in their hallowed temples. They seek divine favor through rituals shrouded in macabre mystique, harnessing the power of necromancy to unlock secrets hidden in the realms beyond mortal comprehension. The Vaelorian Ascendancy\'s complete devotion to necromantic practices and their self-imposed isolation have forged an empire where faith and the manipulation of death intertwine, forming the very core of their society.'],
  ['Aetheric Tailoring', 'Our creations are more than mere garments; they are conduits of enigmatic magic. The fabrics we produce possess an intrinsic essence, an uncanny enchantment that cloaks the wearer in an aura of mystique. We weave secrets into the very fabric of our society with each stitch, concealing even the darkest intentions beneath layers of artistry and illusion. Our work grants those who don our creations an enigmatic allure, transforming them into figures of fascination and reverence in any social circle.'],
  ['Mysteries of Death', "Kalatha, the Sovereign of Shadows, is revered as the eternal orchestrator of the cosmic cycle, her skeletal hand guiding souls from the mortal realm to the veiled mysteries beyond. The Temple of Ebon Rites stands as a monument to her dominion, its towering spires piercing the heavens as a firm declaration of our reverence. There, cloaked acolytes perform their rituals under the dim glow of obsidian candles, invoking Kalatha's name with whispered prayers and offerings of bone and ash. The goddess's presence is felt keenly in the rituals of necromancy, where death is both a path to power and a sacrament of devotion. Yet, Kalatha's blessings are never given freely; they must be earned through loyalty and sacrifice. Her worshipers navigate the delicate balance between life and death, embracing the inevitability of their mortality while wielding the potency of necromantic arts. As the Vaelorian Ascendancy's guiding light, Kalatha bestows a chilling solace upon her devoted, a promise of unity with the shadows that shroud our world in an absolute embrace."],
  ['Contemplations on the Tapestry of Realms', 'Dear minds curious enough to delve into the labyrinthine corridors of thought, I present to you the heart of my contemplations in this humble tome you hold in your hands. In its pages, I dare to explore the intricate origins of the diverse planes of existence, those realms veiled from our senses yet profoundly interwoven with our reality. Imagine, if you will, a celestial loom, where primordial weavers spin the threads of existence. Each plane, distinct and evocative, is its own micro-universe: a realm of fire, another of water, one of shadow, and countless others. These parallel domains intersect with our world, like ethereal echoes casting intricate patterns upon our reality. My musings, though bold and met with skepticism, invite you to transcend the ordinary and embrace the enigma that our reality weaves. Let us embark together on this voyage of understanding, peering beyond the veil to fathom the cosmic loom that shapes the very essence of our being.'],
  ['The Battle of Curum', "The Battle of Curum, a chapter seared into the living memory of the Vaelorian Ascendancy, unfolds in my mind like a visceral painting of heroism and strife. There, on the rain-soaked battleground, our shadowsteel-clad warriors clashed with the invading Ashthreni horde, an unwavering bulwark against the encroaching chaos. The Obsidian Veil, like spectral wraiths, cut through enemy ranks, their blades weaving a symphony of death. The Inquisitors' incantations shook the very ground in that tempest of combat, their necromantic might turning the tide. Victory was earned through blood and valor, proving once again our empire's unyielding spirit and the triumph of the Vaelorian Ascendancy against the relentless storm."],
  ['The Midnight Throne', "In the heart of the Vaelorian Ascendancy stands Ker Nethalas, the Midnight Throne, a city unrivaled in its grandeur and mystique. To wander through its labyrinthine alleys is to traverse the crossroads of divine devotion and architectural marvel. The obsidian spires, etched with arcane symbols, reach skyward as if seeking the touch of the gods. The very stones beneath one's feet whisper the secrets of generations, and the air is alive with a palpable energy, embodying our history and unyielding faith. The Midnight Throne is more than just a capital, it's a living testament to our empire's soul, a manifestation of the shadows that cradle us, and a sentinel guarding the holiness of the Vaelorian Ascendancy."],
  ['A Thousand Years of Glory', "In the annals of the Vaelorian Ascendancy's saga, one name emerges as a symbol of authority and enigma: Emperor Aurelius the Undying. Like a figure conjured from the depths of our collective consciousness, Aurelius ruled with an iron fist sheathed in velvet gloves, his every decree reverberating across our history like the whispers of fate itself. It is said that he possessed an aura that bridged the mortal and the divine, embodying the power of the Ascendancy's theocratic might. Yet, it was not just his dominion that earned him the epithet 'the Undying'. Rather, it was his absolute connection to the necromantic arts, a mastery that stirred both awe and trepidation. In all of our extensive history, Emperor Aurelius emerges as a pivotal figure that served as a mortal conduit to the gods' divine will, cementing and guarding the secrets of the Vaelorian Ascendancy's legacy."],
  ['Rising Shadows: A History of House Tesir', "As if ordained by the very weavers of destiny, this once-obscure lineage ascended the rungs of power with a grace that belied their origins. From the shadows of the common quarters, House Tesir's ascent mirrored the empire's own journey, proof of the validity of the meritocratic ideals embedded in Vaelorian society. Yet, their climb was not bereft of critique; whispers of clandestine alliances and esoteric bargains linger still in the air. Under the leadership of Lord Valerius Tesir, the family's influence expanded like ripples in a pond. It is said that their mastery over the arts of assassination became the foundation of their dominion, intertwining their name with both reverence and fear."],
  ['The Third Path', 'The convergence of necromancy and demonology, like the crossing of two shadowy rivers, invokes a dichotomy that both intrigues and unsettles. But the marriage of necromancy\'s communion with the departed and demonology\'s conjuration of infernal entities creates a well of forbidden potential; what secrets are whispered by the abyssal entities drawn from the nether realms? The fusion of these magics has sparked both fascination and condemnation, blurring the lines between mastery and recklessness. It is true that our work on these dark arts, a reflection of our ceaseless ambition, serves often as a cautionary tale of the relentless pursuit of dominion over the arcane, but I dare to claim that any risks are insignificant, compared to the power offered by this Third Path.'],
  ['The Ganeus Rebellion', "In the intricate mosaic of the Vaelorian Ascendancy's history, the treacherous saga of House Ganeus is one that, to this day, still casts a shadow that lingers as a reminder of the precarious nature of power and loyalty. Once esteemed pillars of the empire, their name now resonates as a byword for betrayal. The web of deceit they wove, concealed beneath a veneer of allegiance, speaks to the abyss that can form between kin and empire. It is said that House Ganeus courted forbidden pacts with entities beyond mortal ken, seeking power that transcended the very bounds of our world. Their duplicity unfurled like a venomous serpent, poisoning the very heart of our Ascendancy. The Ganeus Rebellion, an event etched in sorrow and shame, saw the empire's own children raising arms against it, their actions seared with the stain of perfidy. The tale of House Ganeus is an everlasting reminder that shadows can be cast from within as much as from without, and that we must always be wary of our own hubris and desire for power."],
];

// ---- Magic items ----
export const MAGIC_ITEM_TYPE = [[1, 1, 'weapon'], [2, 2, 'armor'], [3, 3, 'belt'], [4, 4, 'boots'], [5, 5, 'gloves'], [6, 6, 'amulet'], [7, 8, 'ring']];
export const RARITY = [[1, 5, ['Uncommon', 1]], [6, 8, ['Rare', 2]], [9, 10, ['Epic', 3]]];
export const RARITY_SELL = { Uncommon: 200, Rare: 400, Epic: 600, Relic: 1000 };

// Each property: text (with {r} placeholders) and an effect builder. rr = rarity index 1..3
const byR = (a, b, c) => (rr) => [a, b, c][rr - 1];
export const PROPS = {
  armor: [
    [1, 2, { t: 'Increase your Endurance by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Endurance: v } }) }],
    [3, 4, { t: 'Increase your Resolve by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Resolve: v } }) }],
    [5, 6, { t: 'Increase your Spellward by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Spellward: v } }) }],
    [7, 7, { t: 'Reduce your max Aether by 5, but increase your max Toughness by 10.', eff: () => ({ maxAether: -5, maxTough: 10 }) }],
    [8, 8, { t: 'Reduce your max Toughness by 5, but increase your max Aether by 10.', eff: () => ({ maxAether: 10, maxTough: -5 }) }],
    [9, 9, { t: 'You are Resistant to {dt} damage.', dt: true, eff: (v, dt) => ({ resist: [dt] }) }],
    [10, 10, { t: 'Increase your Dodge by 20.', eff: () => ({ skill: { Dodge: 20 } }) }],
    [11, 11, { t: 'Opponents have their Combat Skill reduced by 10 when attacking you.', eff: () => ({ enemyAtk: -10 }) }],
    [12, 12, { t: 'Enemies that damage you suffer 1 Piercing damage that cannot be avoided in any way.', eff: () => ({ thorns: 1 }) }],
    [13, 13, { t: 'This Armor works as a lightsource.', eff: () => ({ light: true }) }],
    [14, 14, { t: 'Increase your carrying capacity by 10.', eff: () => ({ carry: 10 }) }],
    [15, 15, { t: 'Reroll any check once per Camp Rest.', eff: () => ({ reroll: 1 }) }],
    [16, 16, { t: 'Heal one target once per Camp Rest ({v} Wounds). Standard Action.', v: byR('D10+2', 'D10+3', 'D10+4'), eff: (v) => ({ healPower: v }) }],
    [17, 17, { t: 'After defeating a Combat Encounter, roll D6: on 1-3 you immediately recover D4 Toughness.', eff: () => ({ postFightTough: true }) }],
    [18, 18, { t: "You're Immune to Stunned.", eff: () => ({ immuneCond: ['Stunned'] }) }],
    [19, 19, { t: 'Once per Camp Rest you can make vines sprout out of the Armor, leaving a target Restrained.', eff: () => ({ vines: true }) }],
    [20, 20, { t: 'Once per Domain you can become your own shadow for D6+1 rounds. You can only be damaged by Arcane damage while in your shadow form.', eff: () => ({ shadowForm: true }) }],
  ],
  belt: [
    [1, 2, { t: 'Increase your Endurance by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Endurance: v } }) }],
    [3, 4, { t: 'Increase your Resolve by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Resolve: v } }) }],
    [5, 6, { t: 'Increase your Spellward by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Spellward: v } }) }],
    [7, 7, { t: '{v} damage reduction against {dt} damage.', v: byR(1, 2, 3), dt: true, eff: (v, dt) => ({ dr: { [dt]: v } }) }],
    [8, 8, { t: 'You are Resistant to {dt} damage.', dt: true, eff: (v, dt) => ({ resist: [dt] }) }],
    [9, 9, { t: 'Increase your carrying capacity by 10.', eff: () => ({ carry: 10 }) }],
    [10, 10, { t: 'Reroll any check once per Camp Rest.', eff: () => ({ reroll: 1 }) }],
    [11, 11, { t: 'Items stored in this Belt are Immune to damage caused by Belt checks.', eff: () => ({ beltSafe: true }) }],
    [12, 12, { t: 'After defeating a Combat Encounter, roll D6: on 1-3 you immediately recover D4 Toughness.', eff: () => ({ postFightTough: true }) }],
    [13, 13, { t: 'Increase {sk} by 20 while wearing this Belt.', sk: true, eff: (v, dt, sk) => ({ skill: { [sk]: 20 } }) }],
    [14, 14, { t: 'Increase the amount of Health you recover after Setting Camp by D4.', eff: () => ({ campHealth: 'D4' }) }],
    [15, 15, { t: 'Increase the amount of Sanity you recover after Setting Camp by D4.', eff: () => ({ campSanity: 'D4' }) }],
    [16, 16, { t: "Ignore the effects of a single Madness you're currently affected by.", eff: () => ({ ignoreMadness: 1 }) }],
    [17, 17, { t: 'Reroll any failed Thievery checks while attempting to open a lock.', eff: () => ({ rerollLock: true }) }],
    [18, 18, { t: 'Reroll any failed Thievery checks while attempting to dismantle a trap.', eff: () => ({ rerollTrap: true }) }],
    [19, 19, { t: 'This Belt works as a lightsource.', eff: () => ({ light: true }) }],
    [20, 20, { t: 'Once per Rest you can recover D10 Wounds.', eff: () => ({ healD10: true }) }],
  ],
  boots: [
    [1, 2, { t: 'Increase your Endurance by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Endurance: v } }) }],
    [3, 4, { t: 'Increase your Resolve by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Resolve: v } }) }],
    [5, 6, { t: 'Increase your Spellward by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Spellward: v } }) }],
    [7, 7, { t: "You're Immune to Stunned.", eff: () => ({ immuneCond: ['Stunned'] }) }],
    [8, 8, { t: "You're Immune to Restrained.", eff: () => ({ immuneCond: ['Restrained'] }) }],
    [9, 9, { t: 'Increase {sk} by 20.', sk: true, eff: (v, dt, sk) => ({ skill: { [sk]: 20 } }) }],
    [10, 10, { t: '{v} damage reduction against {dt} damage.', v: byR(1, 2, 3), dt: true, eff: (v, dt) => ({ dr: { [dt]: v } }) }],
    [11, 11, { t: 'Reroll any failed Thievery checks while attempting to open a lock.', eff: () => ({ rerollLock: true }) }],
    [12, 12, { t: 'Reroll any failed Thievery checks while attempting to dismantle a trap.', eff: () => ({ rerollTrap: true }) }],
    [13, 13, { t: 'You have Advantage on Acrobatics checks.', eff: () => ({ adv: ['Acrobatics'] }) }],
    [14, 14, { t: 'You have Advantage on Stealth checks.', eff: () => ({ adv: ['Stealth'] }) }],
    [15, 15, { t: 'Ignore the effects of a Fumble once per Camp Rest.', eff: () => ({ ignoreFumble: 1 }) }],
    [16, 16, { t: 'After rolling on the Scavenging table, you can adjust the die roll by up to D4.', eff: () => ({ scavAdjust: true }) }],
    [17, 17, { t: 'Increase the amount of Armor provided by greaves you wear by +1.', eff: () => ({ armorBonus: { legs: 1 } }) }],
    [18, 18, { t: 'Once per room you can reroll a failed Dodge check.', eff: () => ({ rerollDodge: true }) }],
    [19, 19, { t: 'Once per Encounter, a special kick attack that deals 2D6+2 Bludgeoning damage (Free Action, Unarmed Combat & Fist Weapons check).', eff: () => ({ kick: true }) }],
    [20, 20, { t: 'You gain a free Reaction per round.', eff: () => ({ freeReaction: 1 }) }],
  ],
  gloves: [
    [1, 1, { t: '{v} damage reduction against {dt} damage.', v: byR(1, 2, 3), dt: true, eff: (v, dt) => ({ dr: { [dt]: v } }) }],
    [2, 2, { t: 'Increase your Spellward by +{v}.', v: byR(10, 20, 30), eff: (v) => ({ res: { Spellward: v } }) }],
    [3, 3, { t: 'Increase your Resolve by +{v}.', v: byR(10, 20, 30), eff: (v) => ({ res: { Resolve: v } }) }],
    [4, 4, { t: 'Increase {sk} by 20.', sk: true, eff: (v, dt, sk) => ({ skill: { [sk]: 20 } }) }],
    [5, 5, { t: 'Every time you were to gain Exhaustion, reduce the amount gained by 1, to a minimum of 1.', eff: () => ({ exhReduce: true }) }],
    [6, 6, { t: 'You have Advantage on Athletics checks.', eff: () => ({ adv: ['Athletics'] }) }],
    [7, 7, { t: 'Increase your Unarmed Combat & Fist Weapons Skill by 30.', eff: () => ({ skill: { 'Unarmed Combat & Fist Weapons': 30 } }) }],
    [8, 8, { t: 'Reroll any failed Thievery checks while attempting to open a lock (once per door).', eff: () => ({ rerollLock: true }) }],
    [9, 9, { t: 'Reroll any failed Thievery checks while attempting to dismantle a trap (once per trap).', eff: () => ({ rerollTrap: true }) }],
    [10, 10, { t: 'Once per Encounter, a special punch attack that deals 2D6+2 Bludgeoning damage (Free Action, Unarmed Combat & Fist Weapons check).', eff: () => ({ kick: true }) }],
    [11, 11, { t: 'You have Advantage on Scavenge checks.', eff: () => ({ adv: ['Scavenge'] }) }],
    [12, 12, { t: 'After rolling on the Scavenging table, you can adjust the die roll by up to D4.', eff: () => ({ scavAdjust: true }) }],
    [13, 13, { t: 'Increase the amount of Armor provided by vambraces you wear by 1.', eff: () => ({ armorBonus: { arms: 1 } }) }],
    [14, 14, { t: 'Increase your attack Skill by 10 when attempting to Parry an attack.', eff: () => ({ parry: 10 }) }],
    [15, 15, { t: 'Increase your max Aether by {v}.', v: () => 'D10', roll: true, eff: (v) => ({ maxAether: v }) }],
    [16, 16, { t: 'Once per Encounter you can use an Ability that has an Aether cost without spending any Aether.', eff: () => ({ freeCast: 1 }) }],
    [17, 17, { t: 'Your weapon attacks deal +1 damage.', eff: () => ({ weaponDmg: 1 }) }],
    [18, 18, { t: 'You can choose to deal {dt} damage with your weapon attacks.', dt: true, eff: (v, dt) => ({ weaponType: dt }) }],
    [19, 19, { t: 'Heal 1 Wound each time you defeat an opponent.', eff: () => ({ healOnKill: 1 }) }],
    [20, 20, { t: 'Increase your max Toughness by {v}.', v: () => 'D10', roll: true, eff: (v) => ({ maxTough: v }) }],
  ],
  ring: [
    [1, 1, { t: '{v} damage reduction against {dt} damage.', v: byR(1, 2, 3), dt: true, eff: (v, dt) => ({ dr: { [dt]: v } }) }],
    [2, 2, { t: 'Increase your Resistances by +{v}.', v: byR(5, 10, 15), eff: (v) => ({ res: { Endurance: v, Resolve: v, Spellward: v } }) }],
    [3, 3, { t: 'Reroll any check once per Camp Rest.', eff: () => ({ reroll: 1 }) }],
    [4, 4, { t: 'Increase {sk} by 10.', sk: true, eff: (v, dt, sk) => ({ skill: { [sk]: 10 } }) }],
    [5, 5, { t: 'When you attempt to break down a door, you gain +20 Athletics.', eff: () => ({ breakDoor: 20 }) }],
    [6, 6, { t: "When Taking a Breather, you don't reduce the Tension Die.", eff: () => ({ breatherSafe: true }) }],
    [7, 7, { t: 'Increase your maximum Sanity by 5.', eff: () => ({ maxSanity: 5 }) }],
    [8, 8, { t: 'Reroll any failed Thievery checks while attempting to open a lock (once per door).', eff: () => ({ rerollLock: true }) }],
    [9, 9, { t: 'Reroll any failed Thievery checks while attempting to dismantle a trap (once per trap).', eff: () => ({ rerollTrap: true }) }],
    [10, 10, { t: 'Increase your maximum Health by 5.', eff: () => ({ maxHealth: 5 }) }],
    [11, 11, { t: 'Once per Rest you can heal D10 Wounds.', eff: () => ({ healD10: true }) }],
    [12, 12, { t: 'After rolling on the Scavenging table, you can adjust the die roll by up to D4.', eff: () => ({ scavAdjust: true }) }],
    [13, 13, { t: 'Increase the amount of Health you recover after Setting Camp by D4.', eff: () => ({ campHealth: 'D4' }) }],
    [14, 14, { t: 'Increase the amount of Sanity you recover after Setting Camp by D4.', eff: () => ({ campSanity: 'D4' }) }],
    [15, 15, { t: "Ignore the effects of a single Madness you're currently affected by.", eff: () => ({ ignoreMadness: 1 }) }],
    [16, 16, { t: 'Increase your maximum Toughness by 5.', eff: () => ({ maxTough: 5 }) }],
    [17, 17, { t: 'Once per Encounter you can use an Ability that has an Aether cost without spending any Aether.', eff: () => ({ freeCast: 1 }) }],
    [18, 18, { t: 'You have Advantage on Scavenge checks.', eff: () => ({ adv: ['Scavenge'] }) }],
    [19, 19, { t: 'You can reroll your Growing Darkness rolls. The second roll is final.', eff: () => ({ rerollGrowing: true }) }],
    [20, 20, { t: 'Ignore the effects of a Fumble once per Camp Rest.', eff: () => ({ ignoreFumble: 1 }) }],
  ],
  weapon: [
    [1, 1, { t: 'Add +D4 {dt} damage to your Damage Pool when attacking with this weapon.', dt: true, eff: (v, dt) => ({ wpool: [{ die: 4, type: dt }] }) }],
    [2, 2, { t: '+10 to Initiative checks.', eff: () => ({ initiative: 10 }) }],
    [3, 3, { t: 'Add +D6 damage to your Damage Pool when you deal a Critical Strike.', eff: () => ({ critPool: 6 }) }],
    [4, 4, { t: '+1 damage of the same type the weapon deals.', eff: () => ({ wdmg: 1 }) }],
    [5, 5, { t: 'When dropped, the weapon instantly returns to your hand.', eff: () => ({ returning: true }) }],
    [6, 6, { t: 'Target gains Bleeding (1) each time you deal damage to them.', eff: () => ({ onHitCond: 'Bleeding' }) }],
    [7, 7, { t: 'Target gains Poisoned (1) each time you deal damage to them.', eff: () => ({ onHitCond: 'Poisoned' }) }],
    [8, 8, { t: 'This weapon deals +{v} damage against {et} enemies.', v: byR(1, 2, 3), et: true, eff: (v, dt, sk, et) => ({ vsType: { [et]: v } }) }],
    [9, 9, { t: 'Once per room you can add +{v}D6 to your Damage Pool when attacking with this weapon.', v: byR('1', '2', '3'), eff: (v) => ({ burstPool: parseInt(v, 10) }) }],
    [10, 10, { t: 'When you reduce a target to 0 Health with this weapon, you gain D6 Temporary Toughness.', eff: () => ({ killTempTough: true }) }],
    [11, 11, { t: 'Once per room, unleash a burst of Arcane energy (Standard Action): every enemy must pass a Magic Resistance check or take {v} Arcane damage.', v: byR('D4', '2D4', '3D4'), eff: (v) => ({ arcaneBurst: v }) }],
    [12, 12, { t: 'When you reduce a target to 0 Health with this weapon, you gain D6 Temporary Aether.', eff: () => ({ killTempAether: true }) }],
    [13, 13, { t: 'Free Action: during the next D4 rounds, all non-Critical Strike damage dealt with this weapon is doubled. All incoming damage is doubled as well.', eff: () => ({ berserk: true }) }],
    [14, 14, { t: 'You add +D6 to your Damage Pool for your first attack in a room while wielding this weapon.', eff: () => ({ firstStrike: true }) }],
    [15, 15, { t: 'When you deal a Critical Strike with this weapon, you recover D10 Wounds.', eff: () => ({ critHeal: true }) }],
    [16, 16, { t: 'When wielding this weapon, you deal a Critical Strike when rolling 66, regardless of your Skill score.', eff: () => ({ crit66: true }) }],
    [17, 17, { t: 'Deals +1 damage on your next attack if you received damage during this same turn.', eff: () => ({ revenge: true }) }],
    [18, 18, { t: 'You can choose to add D8 damage to your Damage Pool each time you deal damage with this weapon. If you do so, you receive the same amount of damage.', eff: () => ({ bloodPrice: true }) }],
    [19, 19, { t: 'When you deal damage with this weapon, gain +10 Dodge until your next turn.', eff: () => ({ hitDodge: true }) }],
    [20, 20, { t: 'This weapon has +10 Speed.', eff: () => ({ speed: 10 }) }],
  ],
};

export const PECULIARITIES = [
  'It feels wet to the touch.', 'It feels heavier than it looks.', 'Tiny scales cover its surface.', "You hear whispers when you're holding it, but can't make out the words.",
  "It appears to be completely made of glass. It doesn't make it more fragile than it should be though.", 'It levitates slightly.', 'When left on soil, grass grows under it.',
  'You feel a constant chill while holding this item.', 'Turns completely black under direct light.', "An eye opens on it when you're not directly looking at it.",
  'Small, ferrous items adhere to it.', "It's always warm to the touch.", "It's always covered in a layer of filth.", 'Smells like freshly baked bread.',
  'Appears to be made of stone.', 'Smells like rotten flesh.', 'Secretes small droplets of water.', "It's always covered in a layer of mucus.", 'It sparkles.',
  'Light seems to dim around it.', 'Your eyes change color frequently.', "It's always pristine.", 'Harmless insects swarm around it at all times.',
  'Appears to be made of metal.', 'It bounces when dropped.', 'Seems to be covered in fur.', 'Completely outlandishly colored.', 'Arcs of energy jump across it.',
  "Your voice's pitch drops an octave.", 'Constantly thrums.', 'Sticks to any surface.', 'Becomes highly reflective, like a mirror.', 'Constantly changes and shifts color.',
  'Stars seem to drift within it.', 'Appears to be made of precious gems.', 'Covered in chitin.', 'Possesses a distinct heartbeat.', 'Surrounded by a constant, gentle breeze.',
  'Tendrils of mist appear occasionally.', 'Drips sand.', 'Always giving off smoke.', 'Tiny crystals grow from it.', 'Appears to be made of flesh.', 'Smells of burning charcoal.',
  'Covered in intricate runes.', 'Chiming bells can be heard in the distance when touched.', 'Smells strongly of incense.', 'Screams randomly.',
];

export const RELICS = [
  { name: 'Aegis of the Eternal Sentinel', kind: 'shield', base: 'Full', text: 'Increases your Parry by +20. Once per room you can ignore all damage from a single source.', eff: { parryExtra: 5, aegis: true }, flavor: "The Aegis of the Eternal Sentinel absorbs and disperses incoming attacks with remarkable efficiency, offering a stalwart defense against both mundane and magical assaults." },
  { name: 'Band of Knowledge', kind: 'ring', text: 'After a Camp Rest, choose a Skill: it gains +50 until your next Camp Rest.', eff: { bandKnowledge: true }, flavor: 'Forged in the heart of the lost library of Kizanu and infused with the essence of countless tomes.' },
  { name: 'Diadem of Aetheric Power', kind: 'head', text: '+10 max Aether. All Abilities that deal damage deal an additional +D4 damage.', eff: { maxAether: 10, abilityDie: 4 }, flavor: "This delicately crafted diadem made of a single piece of unidentified crystal enhances the caster's connection to the arcane." },
  { name: 'Draught of Vitality', kind: 'consumable', text: 'Permanently increases your Health by +D4.', use: { maxHealth: 'D4' }, flavor: 'A liquid blend of rare herbs, gemstone fragments, and distilled essence of vitality itself.' },
  { name: 'Echo of Resurgence', kind: 'trinket', text: 'If one blow were to kill you, ignore all damage and heal D10 Health instead. The Echo of Resurgence shatters afterwards.', eff: { echo: true }, flavor: 'A fragile crystal trinket hanging from a slender chain, resting gently against the wearer\'s heart.' },
  { name: 'Elixir of Arcane Ascendance', kind: 'consumable', text: 'Permanently increases your Aether by D4.', use: { maxAether: 'D4' }, flavor: 'This vial of shimmering luminescence radiates an aura of magical empowerment.' },
  { name: 'Ethereal Requiem Blade', kind: 'weapon', base: 'Saber', text: 'Attacks with this weapon ignore Armor. You can never drop this weapon unwillingly. Recover 1 Sanity after a successful Combat Encounter.', eff: { ignoreArmor: true, returning: true, fightSanity: 1 }, flavor: 'Forged from an alloy of silvered steel and infused with fragments of star metal.' },
  { name: 'Gloomheart Seed', kind: 'consumable', text: '+1 Ability Point.', use: { abilityPoint: 1 }, flavor: 'This ebony-hued seed merges seamlessly with the essence of the consumer, awakening an innate potential within.' },
  { name: 'Gloves of the Blazing Phoenix', kind: 'gloves', text: "You're Resistant to Fire damage. Once per Camp Rest you can summon a Fire Elemental (disappears when you exit the room).", eff: { resist: ['Fire'] }, flavor: 'Gloves woven from enchanted crimson silk and adorned with intricate patterns resembling dancing flames.' },
  { name: 'Inferno Plate', kind: 'torso', base: 'Plate', text: 'This armor bursts into flames when you engage in combat, dealing 1 Fire damage per round to all opponents.', eff: { infernoPlate: true }, flavor: 'Crafted from enchanted obsidian and etched with intricate flame motifs by the enslaved Orneka blacksmiths.' },
  { name: 'Mace of Eclipse', kind: 'weapon', base: 'Mace', text: '+2 Force damage. Any creature struck by this mace must pass an Endurance check or be Dazed (1).', eff: { flatType: { Force: 2 }, onHitDaze: true }, flavor: "The mace's head is sculpted into a wickedly spiked orb, etched with intricate lunar motifs." },
  { name: 'Mindward Elixir', kind: 'consumable', text: 'Permanently increases your Sanity by D4.', use: { maxSanity: 'D4' }, flavor: 'A harmonious blend of rare herbs, moonlit dew, and crystalline extracts.' },
  { name: 'Potion of Forgotten Fate', kind: 'consumable', text: 'You lose access to one of your two starting Masteries and may pick a new one, assigning the same number of Ability Points.', use: { respec: true }, flavor: 'This swirling black liquid slushes and bubbles as if it has a mind of its own.' },
  { name: 'Ring of Arcane Tempest', kind: 'ring', text: 'Blast a wave of aetheric energies that deals 2D10 Arcane damage to all opponents in the room. Once per Camp Rest.', eff: { tempest: true }, flavor: "Fashioned from a lustrous blend of obsidian and sapphire." },
  { name: 'Ring of Ethereal Grasp', kind: 'ring', text: 'Grants the character 5 Aether that can only be spent on summoning Minions.', eff: { minionAether: 5 }, flavor: 'Crafted from a rare fusion of argent metal and a crystalline core.' },
  { name: 'Ring of Subjugated Servitude', kind: 'ring', text: 'Increases the Health of Tier 1 Minions by half your level.', eff: { minionHealth: true }, flavor: 'This twisted emblem of dominion exudes an aura of enigmatic control.' },
  { name: 'Third Eye of Emaricus', kind: 'trinket', text: 'You have Advantage on all Perception and Scavenging checks. You can never be surprised.', eff: { adv: ['Perception', 'Scavenge'], neverSurprised: true }, flavor: 'Hewn from a rare onyx infused with a glimmering sapphire pupil.' },
  { name: 'Vitalbane Cinch', kind: 'belt', text: "Increase your Health by 5. You gain access to the Hexmancer's Tier 4 Ability Drain Lifeforce.", eff: { maxHealth: 5, grantAbility: 'hexmancer.4' }, flavor: 'Fashioned from supple leather and woven with threads of life-affirming magic.' },
  { name: 'Voidclasp Gauntlets', kind: 'weapon', base: 'Sword Gauntlet', text: 'Target receives a minimum of 1 damage every time you strike them, regardless of Armor or resistances. Once per Combat Encounter you may spend a Reaction to turn your opponent\'s attack against them.', eff: { minDamage: 1 }, flavor: 'Engraved sigils shimmer with a faint iridescence across these black, supple gauntlets.' },
  { name: 'Wyrmfang', kind: 'weapon', base: 'Spear', text: "+D6 Lightning damage. Reduce the opponent's Attack Skill by 5 each time you deal damage to them.", eff: { wpool: [{ die: 6, type: 'Lightning' }], sapAttack: 5 }, flavor: "Forged from a fusion of mithril and wyrm's fang." },
];

export const CONTAINER_RELICS = {
  'Blank Diary': { kind: 'gear', heavy: true, text: 'A character in possession of the Diary can keep track of a third Personal Goal.', eff: { goalSlots: 1 } },
  'Borestian Stone': { kind: 'amulet', text: 'A character in possession of a Borestian Stone can immediately identify Potions without requiring a Medicine check.', eff: { identifyPotions: true } },
  'Heart Fragment of Amal-Tul': { kind: 'consumable', text: 'A character that eats the Heart instantly gains 200 XP, but loses D6 Sanity.', use: { xp: 200, sanityLoss: 'D6' } },
  'Mace of Obliteration': { kind: 'weapon', base: 'Mace', text: 'Requires Athletics (60), Bludgeoning Weapons (60). Always deals 4 Slashing damage, ignoring all Armor.', eff: { obliteration: true } },
  'Ring of Mental Peace': { kind: 'ring', text: 'Touching a target causes them to recover D6 Sanity. Once per Camp Rest. Can only be used on another character.', eff: {} },
  'Vial of Potency - Aether': { kind: 'consumable', text: 'Increase your Aether by D4 permanently.', use: { maxAether: 'D4' } },
  'Vial of Potency - Endurance': { kind: 'consumable', text: 'Increase your Endurance by 5 permanently.', use: { endurance: 5 } },
  'Vial of Potency - Health': { kind: 'consumable', text: 'Increase your Health by D4 permanently.', use: { maxHealth: 'D4' } },
  'Vial of Potency - Spellward': { kind: 'consumable', text: 'Increase your Spellward by 5 permanently.', use: { spellward: 5 } },
  'Vial of Potency - Sanity': { kind: 'consumable', text: 'Increase your Sanity by D4 permanently.', use: { maxSanity: 'D4' } },
};
