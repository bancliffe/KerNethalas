// Core rules data transcribed from Ker Nethalas: Into the Midnight Throne (Gravebound Edition).
// Used with permission of Blackoath Entertainment.

export const SKILLS = [
  'Acrobatics', 'Athletics', 'Bladed Weapons', 'Bludgeoning Weapons', 'Dodge', 'Medicine',
  'Perception', 'Reason', 'Scavenge', 'Shafted Weapons', 'Stealth', 'Thievery',
  'Unarmed Combat & Fist Weapons',
];
export const SKILL_BASE = { Acrobatics: 10, Athletics: 10, Dodge: 10, Perception: 20 };
export const WEAPON_SKILLS = ['Bladed Weapons', 'Bludgeoning Weapons', 'Shafted Weapons', 'Unarmed Combat & Fist Weapons'];
export const RESISTANCES = ['Endurance', 'Resolve', 'Spellward'];

export const SKILL_TEXT = {
  Acrobatics: 'A character can roll beneath a closing gate, swing across a chasm on a rope, or hold their balance on a precarious ledge by passing an Acrobatics check.',
  Athletics: 'To undertake difficult feats of lifting heavy weights, sprinting, climbing, or jumping, a character must make an Athletics check.',
  'Bladed Weapons': 'The ability to wield weapons within this category, such as the longsword or axe.',
  'Bludgeoning Weapons': 'The ability to wield weapons within this category, such as the morningstar or hammer.',
  Dodge: "A character's ability to get out of the way, either during combat or out of it. This Skill is also used when a character attempts to disengage from a melee fight.",
  Medicine: 'Required whenever your character attempts to tend to their wounds. Combined with 1x Bandage, a Medicine check recovers D4 Toughness. You can also spend 1x Bandage and make a Medicine check to remove the Bleeding and Poisoned conditions (out of combat only).',
  Perception: "Perception refers to a character's ability to see, hear, or sense things.",
  Reason: 'This Skill determines your ability to understand things and uncover mysteries, as well as decipher signs and symbols that you might find in the necropolis.',
  Scavenge: 'This Skill allows your character to find any useful bits and pieces that might be lying around in any room.',
  'Shafted Weapons': 'Weapons that have a handle or shaft and a blade or point at the end: spears, polearms (such as halberds and glaives), and staves of all sorts and sizes.',
  Stealth: "Stealth is used to hide or avoid notice. A character's Stealth check is usually opposed by a potential observer's Perception check.",
  Thievery: "Mostly used to disarm traps, or attempt to open a lock. Disarming a trap requires a Thieves' Toolkit, whereas lockpicking only requires using a Lockpick.",
  'Unarmed Combat & Fist Weapons': "Improvised, dirty fighting, elegant martial arts mastery, and anything in between. An unarmed character deals D4 Bludgeoning damage.",
};

export const RES_TEXT = {
  Endurance: "The measure of physical toughness and stamina against injury, toxins, or environmental hazards. It governs how well a character resists bleeding, poison, fatigue, or sustained physical punishment.",
  Resolve: "The strength of willpower and mental fortitude in the face of fear, coercion, or psychological strain. It protects against panic, mind control, despair, or morale-breaking effects.",
  Spellward: "The ability to withstand or diminish the effects of supernatural forces, spells, and arcane phenomena.",
};

export const SKILL_ALLOTMENTS = [60, 40, 30, 30, 30, 20, 20, 10, 10, 10];

export const CRIMES = [
  ['Highway Robbery', 'Armed individuals ambush travelers on highways, robbing them of their belongings and sometimes resorting to violence.'],
  ['Witchcraft', 'Accusations of practicing witchcraft are common in Veldonia, and those accused often face trials and punishment, such as imprisonment or execution.'],
  ['Poaching', "People illegally hunt game on private land, often to supplement their diet or sell the animals for profit, disregarding the landowner's rights."],
  ['Smuggling', 'Illicit trade involving the import or export of goods without paying customs duties, usually through hidden routes to avoid detection.'],
  ['Piracy', 'Seafaring individuals that attack ships, plundering their cargo and often resorting to violence against the crew. Pirates are a significant concern for Veldonia due to the importance of its maritime trade.'],
  ['Murder', 'The intentional killing of another person, which could be motivated by various factors such as revenge, personal disputes, or criminal activities.'],
  ['Sedition', 'Engaging in activities that undermine or seek to overthrow the established authority, such as inciting rebellion or spreading dissent.'],
  ['Treason', 'Engaging in activities that betray or threaten the monarchy, such as plotting against the king.'],
  ['Counterfeiting', 'Producing fake currency or counterfeit goods, which undermine the economy and defraud individuals.'],
  ['Housebreaking', 'Breaking into homes to steal valuable items or money, often resulting in damage to property and sometimes violence against occupants.'],
  ['Vagrancy', 'Being homeless and unemployed, wandering from place to place without a clear means of support.'],
  ['Dueling', 'Engaging in private combat with deadly weapons to resolve personal disputes.'],
  ['Rioting', 'Participating in violent public disturbances or protests, often with groups of people causing damage to property or attacking others.'],
  ['Blasphemy', 'Uttering or promoting sacrilegious or disrespectful statements or actions against any of the sanctioned churches.'],
  ['Grave Robbery', 'The profanation of sepulchers to rob the dead of their valuables is seen with utmost disgust by Veldonian society, especially by the followers of Sothos, God of Death.'],
  ['Fraud', 'Pretending to be something you are not to gain sympathy, regard or money. This might include pretending to be a veteran of the Eskalian wars, selling phony cures or masquerading as a priest, noble, or similar person of station.'],
  ['Trespassing', "Entering or remaining on someone else's property without permission, often resulting in disputes or damage."],
  ['Clandestine Marriage', 'Secretly marrying without the consent or approval of family members or authorities.'],
  ['Child Theft', 'Kidnapping or abducting children for various reasons, including ransom, forced labor, or adoption without consent.'],
  ['Sodomy', 'Committing any "unnatural" sexual act, including those among members of the same sex, but not limited to it.'],
];

// D8 Difficulty modifier
export const DIFFICULTY = [
  [1, 1, { name: "Child's play", mod: 30 }],
  [2, 2, { name: 'Effortless', mod: 20 }],
  [3, 3, { name: 'Easy', mod: 10 }],
  [4, 5, { name: 'Normal', mod: 0 }],
  [6, 6, { name: 'Demanding', mod: -10 }],
  [7, 7, { name: 'Hard', mod: -20 }],
  [8, 8, { name: 'Impossible', mod: -30 }],
];
export const DIFF_STEPS = [30, 20, 10, 0, -10, -20, -30];
export const DIFF_NAMES = { 30: "Child's play", 20: 'Effortless', 10: 'Easy', 0: 'Normal', '-10': 'Demanding', '-20': 'Hard', '-30': 'Impossible' };

// Non-combat critical successes and failures (page 71-73)
export const CRIT_EFFECTS = {
  Acrobatics: { success: 'Daring Maneuver: +30 to your next action.', fail: 'Catastrophic Tumble: you take D6 Bludgeoning damage and are Prone.' },
  Athletics: { success: 'Herculean Feat: your next successful attack is a Critical Strike, or the next door/container is smashed open automatically.', fail: 'Overexertion: you gain D4 Exhaustion.' },
  Dodge: { success: 'Elusive Maneuver: +20 to your Dodge Skill for the next round.', fail: 'Clumsy Misstep: you receive double damage from the source you are trying to avoid.' },
  Endurance: { success: 'Unwavering Resilience: you recover 1 Health and lose D4 Exhaustion.', fail: 'Overwhelmed by Strain: you gain D4 Exhaustion.' },
  Initiative: { success: 'Snap Reaction: perform your next attack with Advantage.', fail: 'Taken by Surprise: you lose your first turn.' },
  Medicine: { success: 'Miraculous Recovery: you recover D10 Toughness.', fail: 'Harmful Treatment: you suffer 2D6 Bludgeoning damage.' },
  Perception: { success: 'Heightened Awareness: Advantage on your next Perception check.', fail: 'Blind Spot: Disadvantage on your next Perception check.' },
  Resolve: { success: 'Unwavering Will: you recover D4+1 Sanity.', fail: 'Mental Lapse: you lose D4 Sanity.' },
  Reason: { success: 'Brilliant Deduction: you immediately identify a magic item in your possession, without spending an Attunement Crystal.', fail: 'Mental Block: you wander aimlessly. The Lair/Domain Exit Die increases by 1 stage.' },
  Scavenge: { success: 'Good Find: you may add +5 to the roll on the Scavenging table.', fail: 'Noisy Search: you attract unwanted attention. Roll on the Combat Encounters table.' },
  Spellward: { success: 'Unbreakable Will: you become Resistant to damage from magic for the next D4 rounds.', fail: 'Magical Vulnerability: you receive double damage from the spell, or its consequences last twice as long.' },
  Stealth: { success: 'Ghost in the Shadows: if you attack in the next round, it strikes automatically.', fail: 'Flimsy Footing: Disadvantage on any action you perform in the next round.' },
  Thievery: { success: 'Masterful Thief: Advantage on your next Thievery check.', fail: 'Bungled Attempt: you trigger a trap you had somehow missed. Roll on the Traps table.' },
};

// Hit location tables (D20)
export const HIT_LOCATIONS = {
  Humanoid: [[1, 3, 'Right Leg'], [4, 6, 'Left Leg'], [7, 9, 'Abdomen'], [10, 12, 'Chest'], [13, 15, 'Left Arm'], [16, 18, 'Right Arm'], [19, 20, 'Head']],
  Quadruped: [[1, 3, 'Right Hind Leg'], [4, 6, 'Left Hind Leg'], [7, 9, 'Hindquarters'], [10, 12, 'Forequarters'], [13, 15, 'Right Front Leg'], [16, 18, 'Left Front Leg'], [19, 20, 'Head']],
  Serpentoid: [[1, 17, 'Body'], [18, 20, 'Head']],
  Insectoid: [[1, 1, 'Right Rear Leg'], [2, 2, 'Left Rear Leg'], [3, 3, 'Right Middle Leg'], [4, 4, 'Left Middle Leg'], [5, 9, 'Abdomen'], [10, 13, 'Thorax'], [14, 14, 'Right Front Leg'], [15, 15, 'Left Front Leg'], [16, 20, 'Head']],
  Arachnid: [[1, 2, 'Right Rear Leg'], [3, 4, 'Left Rear Leg'], [5, 6, 'Mid Right Leg'], [7, 8, 'Mid Left Leg'], [9, 10, 'Fore Right Leg'], [11, 12, 'Fore Left Leg'], [13, 14, 'Abdomen'], [15, 16, 'Front Right Leg'], [17, 18, 'Front Left Leg'], [19, 20, 'Cephalothorax']],
  'Winged Biped': [[1, 1, 'Right Leg'], [2, 2, 'Left Leg'], [3, 3, 'Abdomen'], [4, 4, 'Chest'], [5, 9, 'Right Wing'], [10, 13, 'Left Wing'], [14, 14, 'Right Arm'], [15, 15, 'Left Arm'], [16, 20, 'Head']],
  Body: [[1, 20, 'Body']],
};

// PC armor coverage for the Humanoid table
export const PC_LOC_SLOT = {
  Head: 'head', Chest: 'torso', Abdomen: 'torso',
  'Left Arm': 'arms', 'Right Arm': 'arms', 'Left Leg': 'legs', 'Right Leg': 'legs',
};

export const DAMAGE_TYPES = ['Acid', 'Arcane', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Holy', 'Infernal', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Slashing'];
export const DAMAGE_TYPE_TABLE = [[1, 1, 'Acid'], [2, 3, 'Arcane'], [4, 5, 'Bludgeoning'], [6, 6, 'Cold'], [7, 8, 'Force'], [9, 9, 'Fire'], [10, 10, 'Holy'], [11, 11, 'Infernal'], [12, 12, 'Lightning'], [13, 14, 'Necrotic'], [15, 16, 'Piercing'], [17, 17, 'Poison'], [18, 18, 'Psychic'], [19, 20, 'Slashing']];
export const DAMAGE_TEXT = {
  Acid: 'Causes the Hit Location to lose 1 Armor until repaired at Camp.',
  Arcane: 'Ignores all Armor.', Bludgeoning: 'Ignores 1 point of Armor.', Cold: 'Ignores all Armor.', Fire: 'Ignores all Armor.',
  Force: 'Ignores all Armor.', Holy: 'Ignores all Armor.', Infernal: 'Ignores all Armor.', Lightning: 'Ignores all Armor.', Necrotic: 'Ignores all Armor.',
  Piercing: 'Deals +2 damage on a Critical Strike (not doubled).', Poison: 'Ignores all Armor.', Psychic: 'Ignores all Armor.',
  Slashing: 'When it deals 3 or less damage after Armor, it deals +1.',
};
// Types that ignore all armor
export const ARMOR_IGNORING = new Set(['Arcane', 'Cold', 'Fire', 'Force', 'Holy', 'Infernal', 'Lightning', 'Necrotic', 'Poison', 'Psychic']);

export const ENEMY_TYPES = ['Animal', 'Astral', 'Plant', 'Demon', 'Elemental', 'Undead', 'Humanoid', 'Construct'];

// Creature type rules (page 129-131)
export const TYPE_RULES = {
  Animal: {},
  Astral: { immuneCond: ['Bleeding', 'Poisoned', 'Sickened', 'Frightened'] },
  Construct: { immuneCond: ['Charmed', 'Poisoned', 'Bleeding', 'Sickened', 'Frightened', 'Sleeping'] },
  Demon: { restored: ['Infernal'], vulnerable: ['Holy'], immuneCond: ['Poisoned'] },
  Elemental: { immuneCond: ['Bleeding', 'Sickened', 'Poisoned'] },
  Humanoid: {},
  Plant: { vulnerable: ['Fire'], immuneCond: ['Frightened', 'Blinded'] },
  Undead: { vulnerable: ['Holy'], restored: ['Necrotic'], immuneCond: ['Bleeding', 'Sickened', 'Poisoned', 'Frightened'] },
};

export const CONDITIONS = {
  Bleeding: 'Suffers X damage every round until removed (cumulative). Remove with 1x Bandage and a successful Medicine check (out of combat). Out of combat, deals 1 Health damage per room. Ignores Armor.',
  Blinded: 'Disadvantage on all Skill checks except Reason. Only basic melee attacks; cannot target Hit Locations or use Mastery Abilities.',
  Burning: 'Receives 1 Fire damage until removed. Remove by spending 1 Standard Action (combat) or 2 Exhaustion (out of combat). Out of combat, deals 1 Health damage per room.',
  Charmed: 'Cannot attack the charmer or use harmful abilities on the charmer.',
  Concealed: 'Attacking a Concealed target requires a successful Perception or Mind check. Attacking or being harmed breaks this condition.',
  Cursed: "Plagued by an effect detailed on the curse's description until removed.",
  Dazed: 'Cannot initiate attacks for X rounds. Stacks.',
  Freezing: '-10 to all Skills and acts last. Must pass an Endurance check after the first round to recover. Out of combat, worsens every 5 rooms.',
  Frightened: 'Reduces all physical attack Skills against the source of fear by XX. Decreases by 10 at the end of each of their turns. Cumulative.',
  Paralyzed: "Incapacitated; can't move or speak. Attacks against it hit automatically.",
  Poisoned: 'Suffers X damage every round. From the round after it takes hold, may resist with an Endurance check (Free Action). Out of combat, deals 1 Poison damage to Health per room. Remove with 1x Bandage + Medicine.',
  Prone: 'Getting up is a Free Action, but opponents roll on the Defensive Move table. Attacks against a Prone creature have Advantage; a Prone creature attacks with Disadvantage and only basic attacks.',
  Restrained: 'Cannot move; -20 to Acrobatics, weapon Skills, Dodge and Athletics/Body. May attempt an Athletics/Body check to escape (Free Action, or Standard Action for +20).',
  Sickened: 'Negative modifier to all checks equal to XX. Cumulative.',
  Sleeping: 'Immediately falls Prone; any attack against it hits automatically. Wakes when hit.',
  Stunned: 'Cannot act for X rounds. Cannot actively defend from Physical attacks. Stacks.',
};

// D10 defensive moves
export const PC_DEFENSIVE_MOVES = [
  'Your next attack receives an additional +10 to the combat check.',
  "Reduce your opponent's Armor by -1 in a random Hit Location until the end of combat.",
  'Your opponent receives the Bleeding (1) condition.',
  'You are Immune to all conditions until your next turn, including the ones you are currently suffering from.',
  'Your opponent immediately suffers 1 Piercing damage that ignores Armor.',
  'Add +D6 to your Damage Pool for your next attack.',
  'You gain Advantage on your next attack.',
  "You press your advantage, reducing your opponent's next defensive check by -20.",
  "Recover 2 Toughness. You get a moment of respite after fending off your opponent's attack.",
  "Your next attack doesn't suffer the usual Disadvantage when targeting a specific body part.",
];
export const NPC_DEFENSIVE_MOVES = [
  "The creature's next attack receives an additional +10 to its Combat Skill. If it's a magic action, your Spellward is reduced by -10 until the creature's next turn.",
  'Reduce your Armor by -1 in a random Hit Location until the end of combat.',
  'You receive the Bleeding (1) condition.',
  'The creature clears all negative conditions that it is currently suffering from.',
  'You receive 1 Piercing damage that ignores Armor.',
  "The creature's next damaging Action receives +D6 damage to its Damage Pool. If it's not a damaging Action, your Spellward is reduced by -10 until the creature's next turn.",
  'The creature gains Advantage on its next attack. If the attack is a Magical one, you roll Spellward with Disadvantage.',
  'Your next Dodge, Parry, or Spellward check is reduced by -20.',
  'The creature recovers D4 Health.',
  'The creature gets a new turn immediately.',
];

export const PC_FUMBLES = [
  'You drop your weapon and must spend your next turn recovering it. If unarmed, your next attack suffers -20 instead.',
  'Your weapon gets stuck deep in a wall or the ground. You must pass an Athletics check as a Standard Action to retrieve it. If unarmed, your next attack suffers -20 instead.',
  'You smash your weapon against stone, breaking non-magical weapons in half (repairable at Camp). Magical weapons take your next turn to recover. If unarmed, your next attack is at -20.',
  "A random item from your Belt breaks. If you don't have a Belt, you receive 1 Piercing damage.",
  "You are suddenly feeling drained and lose D8 Aether. If you don't have any Aether, you receive 1 Piercing damage.",
  'You trip and fall, wasting this action. You are Prone and must use a Standard Action to get back up next round.',
  'In the process of executing your attack you trip and slam your head. You are Prone and Dazed (2).',
  'Your attack hits a random ally instead of the intended target. If there are no allies, you strike yourself.',
  'You manage to strike yourself with a normal attack.',
  'You somehow manage to hurt yourself badly with your own weapon. You receive a Critical Strike.',
];
export const NPC_FUMBLES = [
  "The creature's next attack suffers -20. If it's a Magical Action, you receive +20 to your Spellward.",
  'The creature becomes confused by its own inability to strike you, becoming Stunned for the next round.',
  'The creature is Restrained for the next D4 rounds due to some vegetation or refuse in its vicinity.',
  'The creature exposes a weakness in its attack pattern, granting you Advantage on your defensive checks for the next 2 rounds.',
  'The attack creates a huge cloud of lifted dust, causing you to be Concealed for D4 rounds (or until you make an attack).',
  'The creature trips and falls, wasting its action. It is Prone and must use its next turn to get back up.',
  'In the process of executing its attack, the creature trips and slams its head. It is Prone and Stunned (2).',
  'The creature becomes Frightened (20).',
  'The creature manages to strike itself, receiving D6 Slashing damage.',
  'The creature falls in an awkward position, becoming Prone and receiving 2D6 Bludgeoning damage. It must use its next turn to get back up.',
];

export const MADNESS = [
  'Your mind breaks, and you\'re lost to the madness. Your character is, for all effects and purposes, dead.',
  'Your mind is in shambles, and any amount of pressure will break it. All your future rolls on this table suffer -1. Cumulative.',
  'You start developing physical reactions as a consequence of the state of your mind. Reduce your max Toughness by -1. Cumulative.',
  'You know the darkness is coming for you... Each time you suffer any loss of Sanity, you lose an additional -1. Cumulative.',
  "You're scared of spending too much time in one place, and rush through the rooms as fast as you can. Scavenging becomes a Demanding (-10) task. Cumulative.",
  'You feel like your mind is starting to give in to the darkness, offering less resistance. All Resolve checks are now a Demanding (-10) task. Cumulative.',
  "You're having trouble retaining all your memories and experiences. Each time you earn any amount of XP, you earn 10 less. Cumulative.",
  "You've blocked out a traumatic experience, and with it, some of what you learned from it. Reduce a Skill of your choosing by 10. Cumulative.",
  'You slap yourself with all your strength, quickly regaining your wits and snapping out of it. You receive 2D6 Bludgeoning damage that ignores Armor, but are otherwise fine.',
  "The traumatic experiences you've gone through have taught you a lot about yourself. +100 XP.",
];

export const EXHAUSTION_TABLE = [
  [0, 10, 'No effects, other than some heavy breathing and sweating.'],
  [11, 15, 'You heal half of the amount of Wounds from all sources.'],
  [16, 20, 'You have Disadvantage on all checks.'],
  [21, 999, 'You die, your body no longer capable of enduring the accumulated stress and fatigue.'],
];

export const ROT_STAGES = [
  'You become Immune to Necrotic damage but are Vulnerable to Holy damage.',
  'Your max Toughness is reduced by half.',
  'Your skin becomes black as charcoal, and you can see in the dark. You no longer require a lightsource.',
  'You are always ravenous, requiring 2x Rations to remove 1 Exhaustion.',
  'Your flesh knits itself, recovering an additional D4 Health each time you Set Camp.',
  'Your body becomes unresponsive. You have Disadvantage on all weapon Skills, Dodge, Athletics, and Acrobatics checks.',
  'You are immune to the effects of Exhaustion.',
  'The Rot takes over your mind, and you become yet another abomination roaming the halls of the Midnight Throne.',
];

export const OVERSEER_INFLUENCE = [
  { name: 'Tough', text: 'Immune to Critical Strikes.' },
  { name: 'Vital', text: '+D6 Health per each 5 Health.' },
  { name: 'Frenzied', text: '+1 damage.' },
  { name: 'Skilled', text: '+10 Combat Skill.' },
  { name: 'Magebane', text: '+10 Magic Resistance.' },
  { name: 'Resistant', text: 'Resistant to 1 random type of damage.' },
  { name: 'Corrupting', text: 'Each time the creature deals 5+ damage on a single attack, the target must make a Resolve check or lose 1 Sanity.' },
  { name: 'Unstable', text: 'Deals 1 Arcane damage when killed.' },
  { name: 'Alert', text: '+20 Mind.' },
  { name: 'Piercing', text: 'Gains the Penetrating (1) Trait.' },
];

export const LEVEL_BENEFITS = [
  { id: 'health', text: 'Somehow all the tribulations you are going through are a blessing in disguise. Increase your Health by +D4.' },
  { id: 'tough', text: 'The more they try to break you, the more impervious you become to their attacks. Increase your Toughness by +D6.' },
  { id: 'sanity', text: 'The shadows grow darker, but nothing hiding in them can scare you any longer. Increase your Sanity by +D4.' },
  { id: 'aether', text: 'Your connection to the aetheric realm grows stronger. Increase your Aether by +D6.' },
  { id: 'pool', text: 'Add +D6 damage (Slashing, Bludgeoning or Piercing; pick one) to your Damage Pool when dealing physical, non-Ability damage.' },
  { id: 'skill', text: 'There is a lesson in everything, if you know where to look. Increase a Skill of your choosing by +5.' },
  { id: 'res', text: 'The constant punishment suffered in the depths of Ker Nethalas has increased your resilience. Increase your Endurance, Resolve, and Spellward by +5.' },
];

export const PERKS = {
  'Living Shadow': 'You always surprise your opponents, and cannot be surprised.',
  'Lucky Find': 'Each time you open a container of any sort you obtain D20 coins.',
  'Precision Striker': 'When you deal a Critical Strike, you can re-roll the damage dealt.',
  Scavenger: 'Whenever you roll on the Scavenging table, you can roll an additional D4 and add or subtract it from the roll.',
  Scholar: 'You have Advantage on all Reason checks.',
  'Trap Buster': 'You have Advantage on all Thievery checks when dismantling traps.',
};

// Personal goals: stat = counter key tracked in pc.stats; reward = effect descriptor
export const PERSONAL_GOALS = [
  { id: 'acid', name: 'Acid Damage Expert', obj: 'Deal 200 Acid damage', stat: 'dmg.Acid', n: 200, reward: 'Gain 1 Acid damage reduction', eff: { dr: { Acid: 1 } } },
  { id: 'force', name: 'Air Damage Expert', obj: 'Deal 200 Force damage', stat: 'dmg.Force', n: 200, reward: 'Gain 1 Force damage reduction', eff: { dr: { Force: 1 } } },
  { id: 'annihilator', name: 'Annihilator', obj: 'Defeat 100 opponents', stat: 'kills', n: 100, reward: '+D4 Psychic damage to all attacks', eff: { pool: [{ die: 4, type: 'Psychic', all: true }] } },
  { id: 'arcane', name: 'Arcane Damage Expert', obj: 'Deal 200 Arcane damage', stat: 'dmg.Arcane', n: 200, reward: 'Increase all Arcane damage dealt by +1', eff: { typeBonus: { Arcane: 1 } } },
  { id: 'astral', name: 'Astral Bane', obj: 'Defeat 50 Astral opponents', stat: 'killsType.Astral', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Astral opponents', eff: { tripleCrit: ['Astral'] } },
  { id: 'beast', name: 'Beast Hunter', obj: 'Defeat 50 Animal opponents', stat: 'killsType.Animal', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Animal opponents', eff: { tripleCrit: ['Animal'] } },
  { id: 'bladed', name: 'Bladed Weapon Master', obj: 'Defeat 50 opponents with the Bladed Weapons Skill', stat: 'killsSkill.Bladed Weapons', n: 50, reward: '+1 damage while wielding a Bladed weapon', eff: { skillDmg: { 'Bladed Weapons': 1 } } },
  { id: 'bludg', name: 'Bludgeoning Damage Expert', obj: 'Deal 200 Bludgeoning damage', stat: 'dmg.Bludgeoning', n: 200, reward: 'Gain 1 Bludgeoning damage reduction', eff: { dr: { Bludgeoning: 1 } } },
  { id: 'bludgw', name: 'Bludgeoning Weapon Master', obj: 'Defeat 50 opponents with the Bludgeoning Weapons Skill', stat: 'killsSkill.Bludgeoning Weapons', n: 50, reward: '+1 damage while wielding a Bludgeoning weapon', eff: { skillDmg: { 'Bludgeoning Weapons': 1 } } },
  { id: 'botanical', name: 'Botanical Exterminator', obj: 'Defeat 50 Plant opponents', stat: 'killsType.Plant', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Plant opponents', eff: { tripleCrit: ['Plant'] } },
  { id: 'brawler', name: 'Brawler', obj: 'Defeat 50 opponents with the Unarmed Combat & Fist Weapons Skill', stat: 'killsSkill.Unarmed Combat & Fist Weapons', n: 50, reward: '+1 damage while wielding a fist weapon or completely unarmed', eff: { skillDmg: { 'Unarmed Combat & Fist Weapons': 1 } } },
  { id: 'cold', name: 'Cold Damage Expert', obj: 'Deal 200 Cold damage', stat: 'dmg.Cold', n: 200, reward: 'Increase all Cold damage dealt by +1', eff: { typeBonus: { Cold: 1 } } },
  { id: 'decap', name: 'Decapitate the Leadership', obj: 'Defeat 20 Overseers', stat: 'overseers', n: 20, reward: 'When facing an Overseer, they are Stunned during the first combat round', eff: { overseerStun: true } },
  { id: 'demon', name: 'Demon Bane', obj: 'Defeat 50 Demon opponents', stat: 'killsType.Demon', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Demon opponents', eff: { tripleCrit: ['Demon'] } },
  { id: 'elemental', name: 'Elemental Vanquisher', obj: 'Defeat 50 Elemental opponents', stat: 'killsType.Elemental', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Elemental opponents', eff: { tripleCrit: ['Elemental'] } },
  { id: 'fire', name: 'Fire Damage Expert', obj: 'Deal 200 Fire damage', stat: 'dmg.Fire', n: 200, reward: 'Increase all Fire damage dealt by +1', eff: { typeBonus: { Fire: 1 } } },
  { id: 'hoarder', name: 'Hoarder', obj: 'Obtain 5,000 coins. You do not need to hold this amount all at once', stat: 'coinsGained', n: 5000, reward: 'Traders will buy up to 5 items from you at full price', eff: { hoarder: 5 } },
  { id: 'holy', name: 'Holy Damage Expert', obj: 'Deal 200 Holy damage', stat: 'dmg.Holy', n: 200, reward: 'Increase all Holy damage dealt by +1', eff: { typeBonus: { Holy: 1 } } },
  { id: 'infernal', name: 'Infernal Damage Expert', obj: 'Deal 200 Infernal damage', stat: 'dmg.Infernal', n: 200, reward: 'Increase all Infernal damage dealt by +1', eff: { typeBonus: { Infernal: 1 } } },
  { id: 'shadow', name: 'Living Shadow', obj: 'Surprise 50 opponents', stat: 'surprised', n: 50, reward: 'You gain the Living Shadow Perk', eff: { perk: 'Living Shadow' } },
  { id: 'marauder', name: 'Marauder', obj: 'Defeat 50 Humanoid opponents', stat: 'killsType.Humanoid', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Humanoid opponents', eff: { tripleCrit: ['Humanoid'] } },
  { id: 'thief', name: 'Master Thief', obj: 'Open 100 doors or containers with the help of your Thievery Skill', stat: 'thieveryOpens', n: 100, reward: 'You gain the Lucky Find Perk', eff: { perk: 'Lucky Find' } },
  { id: 'necrotic', name: 'Necrotic Damage Expert', obj: 'Deal 200 Necrotic damage', stat: 'dmg.Necrotic', n: 200, reward: 'Increase all Necrotic damage dealt by +1', eff: { typeBonus: { Necrotic: 1 } } },
  { id: 'overthrown', name: 'Overseer Overthrown', obj: 'Defeat an Overseer', stat: 'overseers', n: 1, reward: 'You obtain an Amulet', eff: { amulet: true } },
  { id: 'piercing', name: 'Piercing Damage Expert', obj: 'Deal 200 Piercing damage', stat: 'dmg.Piercing', n: 200, reward: 'Gain 1 Piercing damage reduction', eff: { dr: { Piercing: 1 } } },
  { id: 'poison', name: 'Poison Damage Expert', obj: 'Deal 200 Poison damage', stat: 'dmg.Poison', n: 200, reward: 'Gain 1 Poison damage reduction', eff: { dr: { Poison: 1 } } },
  { id: 'precision', name: 'Precision Striker', obj: 'Deal 50 Critical Strikes in combat', stat: 'crits', n: 50, reward: 'You gain the Precision Striker Perk', eff: { perk: 'Precision Striker' } },
  { id: 'psychic', name: 'Psychic Damage Expert', obj: 'Deal 200 Psychic damage', stat: 'dmg.Psychic', n: 200, reward: 'Increase all Psychic damage dealt by +1', eff: { typeBonus: { Psychic: 1 } } },
  { id: 'relic', name: 'Relic Hunter', obj: 'Find a Relic', stat: 'relics', n: 1, reward: '100 XP', eff: { xp: 100 } },
  { id: 'scavenger', name: 'Scavenger', obj: 'Successfully scavenge 100 rooms', stat: 'scavenged', n: 100, reward: 'You gain the Scavenger Perk', eff: { perk: 'Scavenger' } },
  { id: 'scholar', name: 'Scholar', obj: 'Successfully use the Reason Skill 100 times to solve Events', stat: 'reasonEvents', n: 100, reward: 'You gain the Scholar Perk', eff: { perk: 'Scholar' } },
  { id: 'sentinel', name: 'Sentinel Smasher', obj: 'Defeat 50 Construct opponents', stat: 'killsType.Construct', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Construct opponents', eff: { tripleCrit: ['Construct'] } },
  { id: 'shafted', name: 'Shafted Weapon Master', obj: 'Defeat 50 opponents with the Shafted Weapons Skill', stat: 'killsSkill.Shafted Weapons', n: 50, reward: '+1 damage while wielding a Shafted weapon', eff: { skillDmg: { 'Shafted Weapons': 1 } } },
  { id: 'slashing', name: 'Slashing Damage Expert', obj: 'Deal 200 Slashing damage', stat: 'dmg.Slashing', n: 200, reward: 'Gain 1 Slashing damage reduction', eff: { dr: { Slashing: 1 } } },
  { id: 'stormkin', name: 'Stormkin', obj: 'Deal 200 Lightning damage', stat: 'dmg.Lightning', n: 200, reward: 'Increase all Lightning damage dealt by +1', eff: { typeBonus: { Lightning: 1 } } },
  { id: 'trapbuster', name: 'Trap Buster', obj: 'Successfully dismantle 50 traps', stat: 'trapsDisarmed', n: 50, reward: 'You gain the Trap Buster Perk', eff: { perk: 'Trap Buster' } },
  { id: 'thrill', name: 'Thrill Seeker', obj: 'Trigger 20 Growing Darkness events', stat: 'growing', n: 20, reward: 'Each time you must roll on the Growing Darkness table, you can roll a second time and choose the result you prefer', eff: { thrill: true } },
  { id: 'erudite', name: 'Vaelorian Erudite', obj: 'Loot 10 Lore Books', stat: 'loreBooks', n: 10, reward: 'Increase your maximum Aether by +D4', eff: { maxAetherRoll: 'D4' } },
  { id: 'wraith', name: 'Wraithstalker', obj: 'Defeat 50 Undead opponents', stat: 'killsType.Undead', n: 50, reward: 'Triple the damage dealt with a Critical Strike against Undead opponents', eff: { tripleCrit: ['Undead'] } },
];
