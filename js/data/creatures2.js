// The rest of the bestiary (Chapter V), the Mastery Minions (page 200-203), and the standard encounter tables.
import { r, rnd, pick } from '../dice.js';
import { CREATURES, A, melee, allSave } from './creatures.js';

const spellOne = (dmg, type, extra = {}) => async (C, me, tgt) => C.areaSave(me, [tgt], { skill: 'Spellward', dmg, type, ...extra });
const restrain = (C, t) => C.addCond(t, 'Restrained', true);
const prone = (C, t) => C.addCond(t, 'Prone', true);
const saveThen = async (C, t, skill, label, fn) => { const s = await C.save(t, skill, { label }); if (!s.success) await fn(); return s; };
const L = (lv, o) => [lv, o];

Object.assign(CREATURES, {
  vexator: {
    name: 'Abyssal Vexator', one: 'Abyssal Vexator', number: 1, desc: 'Demons specialized in inflicting excruciating pain, shadows shrouded in oppressive darkness that wield writhing ethereal chains.',
    types: ['Demon'], mind: 50, endurance: 40, body: 30, health: 8, healthPerLvl: 4, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 1 }, combat: 40, mr: 80, spoils: 'spoils', traits: ['Frightening'], holds: true,
    adapt: [L(5, { dmg: 'D6' }), L(10, { dmg: 'D8', combat: 10 })],
    actions: [
      A(1, 2, 'Chain Lash', 'Physical', 'On a hit, D6 Piercing damage and the target must succeed on an Athletics check or be knocked Prone.', melee('D6', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Athletics', 'keep your footing', () => prone(C, t)) })),
      A(3, 4, 'Tormenting Bind', null, 'Dodge check or be Restrained by the chains, taking D4 Necrotic damage at the start of each turn.', async (C, me, t) => saveThen(C, t, 'Dodge', 'evade the chains', () => C.grasp(me, t, { dmg: 'D4', type: 'Necrotic' }))),
      A(5, 6, 'Abyssal Wither', 'Magical', 'Endurance check or take D10 Necrotic damage; maximum Health is reduced by the damage taken until the next Camp Rest.', async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the wither', async () => { const d = await C.harm(t, 'D10', 'Necrotic', { source: me, label: 'Abyssal Wither' }); if (t.isPC && d > 0) C.reduceMaxHealth(d); })),
    ],
  },
  amalgam: {
    name: 'Amalgam', one: 'Amalgam', number: 1, desc: 'A horrific fusion of multiple corpses and dark magic, its body swollen and bloated, held together by taut, necrotic sinews.',
    types: ['Undead'], mind: 20, endurance: 60, body: 60, health: 15, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 2 }, combat: 60, mr: 30, spoils: 'spoils', traits: ['Frightening'], holds: true,
    adapt: [L(5, { health: 5, dmg: 'D6', armorExcept: 'Chest' }), L(10, { dmg: 'D8', combat: 10 })],
    actions: [
      A(1, 2, 'Gruesome Slam', 'Physical', 'A brutal sweeping limb, dealing D6 Bludgeoning damage.', melee('D6', 'Bludgeoning')),
      A(3, 4, 'Necrotic Burst', null, 'All creatures in the room must succeed on an Endurance check or take D6 Necrotic damage.', allSave('Endurance', 'D6', 'Necrotic')),
      A(5, 6, 'Dismembering Strike', 'Physical', 'D6 Slashing damage. On a hit, Athletics check or be Restrained, taking 1 Slashing damage at the start of each turn.', melee('D6', 'Slashing', { onHit: async (C, me, t) => saveThen(C, t, 'Athletics', 'tear free', () => C.grasp(me, t, { dmg: 1, type: 'Slashing' })) })),
    ],
  },
  construct: {
    name: 'Armor Construct', one: 'Armor Construct', number: 1, desc: 'A spirit bound to a suit of heavy armor, its surface adorned with intricate runes pulsing with an ominous glow.',
    types: ['Construct'], mind: 40, endurance: 80, body: 60, health: 15, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 1, Head: 1 }, combat: 60, mr: 30, spoils: 'spoils', traits: ['Penetrating (1)'],
    adapt: [L(5, { dmg: 'D8', combat: 10, armor: 1 }), L(10, { health: 10, dmg: 'D10', combat: 10 })],
    actions: [
      A(1, 2, 'Crushing Fist', 'Physical', 'A massive fist, dealing D6 Bludgeoning damage.', melee('D6', 'Bludgeoning')),
      A(3, 4, 'Arcane Shield', null, 'A shimmering shield grants Health equal to half its maximum Health until the start of its next turn.', async (C, me) => C.tempHp(me, Math.ceil(me.maxHp / 2))),
      A(5, 6, 'Rune Strike', 'Physical', 'D8 Slashing damage. On a hit, Endurance check or be Paralyzed for 1 round.', melee('D8', 'Slashing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the runes', () => C.addCond(t, 'Paralyzed', 1)) })),
    ],
  },
  astralbeast: {
    name: 'Astral Beast', one: 'Astral Beast', number: 1, desc: 'A colossal creature shimmering with iridescent hues, stardust and swirling nebulae visible across its skin.',
    types: ['Animal', 'Astral'], mind: 50, endurance: 40, body: 50, health: 12, hitLoc: 'Quadruped', weak: 'Head', armor: { Forequarters: 2 }, combat: 40, mr: 70, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 8, dmg: 'D8', combat: 10 }), L(10, { health: 5, dmg: 'D10', mr: 10 })],
    actions: [
      A(1, 2, 'Celestial Surge', 'Magical', 'A directed blast of celestial energy, dealing D6 Arcane damage on a hit.', spellOne('D6', 'Arcane')),
      A(3, 4, 'Nebula Shield', null, 'Until the start of its next turn, the Astral Beast becomes Resistant to all damage.', async (C, me) => { me.fx.resistAllBut = { except: [], until: 'nextTurn' }; C.log(`${me.name} envelops itself in a shimmering nebula.`, 'enemy'); }),
      A(5, 6, 'Astral Tempest', 'Magical', 'All creatures make a Spellward check: D8 Arcane damage on a failure, half on a success.', allSave('Spellward', 'D8', 'Arcane', { half: true })),
    ],
  },
  bladewings: {
    name: 'Bladewings', one: 'Bladewing', number: 'D4+1', desc: 'Small, bat-like creatures with wings resembling sharp, scythe-like blades, covered in obsidian-black fur.',
    types: ['Animal'], mind: 70, endurance: 30, body: 10, health: 5, hitLoc: 'Winged Biped', weak: 'Head', armor: {}, combat: 40, mr: 20, spoils: 'resources', traits: ['Swift'],
    adapt: [L(5, { dmgFlat: 1, combat: 10 }), L(10, { dmg: 'D6', combat: 10, mr: 10 })],
    actions: [
      A(1, 2, 'Scythe Slash', 'Physical', 'D6 Slashing damage. If the target is wearing no Armor, they are Bleeding (1).', melee('D6', 'Slashing', { onHit: async (C, me, t) => { if (C.unarmored(t)) C.addCond(t, 'Bleeding', 1); } })),
      A(3, 4, 'Shadow Dive', null, 'It disappears into the shadows: +10 Combat Skill for defensive checks until its next turn.', async (C, me) => { me.fx.defBonus = { v: 10, until: 'nextTurn' }; C.log(`${me.name} vanishes into the shadows.`, 'enemy'); }),
      A(5, 6, 'Shrieking Assault', null, 'All creatures make a Resolve check or have Disadvantage on their next attack. It then makes a free melee attack against an affected creature (D6 Slashing).', async (C, me) => {
        const hit = [];
        for (const t of C.pcSide()) { const s = await C.save(t, 'Resolve', { label: 'endure the shriek' }); if (!s.success) { t.fx.nextDis = true; hit.push(t); } }
        if (hit.length) await C.attack(me, pick(hit), { dmg: 'D6', type: 'Slashing' });
      }),
    ],
  },
  bloodstalker: {
    name: 'Blood Stalker', one: 'Blood Stalker', number: 1, desc: 'A predator with pale, alabaster skin and crimson eyes that moves with eerie grace, gaining power from the blood it spills.',
    types: ['Humanoid'], mind: 60, endurance: 50, body: 40, health: 5, healthPerLvl: 2, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 2 }, combat: 60, mr: 60, spoils: 'spoils', traits: ['Penetrating (1)'],
    adapt: [L(5, { dmg: 'D6', combat: 10 }), L(10, { dmg: 'D8', mr: 10 })],
    actions: [
      A(1, 2, 'Fang Strike', 'Physical', 'D6 Piercing damage. On a hit, Endurance check or take an additional D4 Necrotic damage.', melee('D6', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the bite', () => C.harm(t, 'D4', 'Necrotic', { source: me, label: 'Weakening bite' })) })),
      A(3, 3, 'Blood Frenzy', null, 'The next time it reduces a creature to 0 Health or 0 Toughness with a melee attack, it attacks another target with Advantage.', async (C, me) => { me.fx.bloodFrenzy = true; C.log(`${me.name} is seized by a blood frenzy.`, 'enemy'); }),
      A(4, 6, 'Vampiric Drain', 'Physical', 'D6 Piercing damage. It gains Health equal to half the damage dealt for 1 round.', melee('D6', 'Piercing', { onHit: async (C, me, t, info) => { if (info.dealt) C.tempHp(me, Math.ceil(info.dealt / 2)); } })),
    ],
  },
  bonegolem: {
    name: 'Bone Golem', one: 'Bone Golem', number: 1, desc: 'A towering, nightmarish fusion of skeletal fragments held together by dark magic and ancient runes.',
    types: ['Construct', 'Undead'], mind: 30, endurance: 60, body: 50, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 3 }, combat: 60, mr: 30, spoils: 'spoils', traits: ['Penetrating (1)'],
    adapt: [L(5, { health: 8, dmg: 'D6', combat: 10 }), L(10, { dmg: 'D8', mr: 10 })],
    actions: [
      A(1, 2, 'Crushing Slam', 'Physical', 'D6 Bludgeoning damage. On a hit, Athletics check or be knocked Prone.', melee('D6', 'Bludgeoning', { onHit: async (C, me, t) => saveThen(C, t, 'Athletics', 'keep your footing', () => prone(C, t)) })),
      A(3, 4, 'Necrotic Grasp', 'Magical', 'D6 Necrotic damage on a hit; it regains Health equal to half the damage dealt.', spellOne('D6', 'Necrotic', { drain: 0.5 })),
      A(5, 6, 'Rending Strike', 'Physical', 'D6 Slashing damage. If it hits an armored Location, an immediate Armor Integrity check is made.', melee('D6', 'Slashing', { onHit: async (C, me, t, info) => C.integrity(t, info.loc) })),
    ],
  },
  bonespiders: {
    name: 'Bone Spiders', one: 'Bone Spider', number: 3, desc: 'Skeletal eight-legged horrors woven from the bones of many creatures, their fangs dripping with paralyzing venom.',
    types: ['Construct', 'Undead'], mind: 30, endurance: 40, body: 40, health: 6, hitLoc: 'Arachnid', weak: 'Cephalothorax', armor: { Abdomen: 2 }, combat: 40, mr: 30, spoils: 'resources', traits: [],
    adapt: [L(5, { dmg: 'D8', armorExcept: 'Abdomen' }), L(10, { health: 10, dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Venomous Bite', 'Physical', 'D4 Piercing damage. On a hit, Endurance check or be Paralyzed for 1 round.', melee('D4', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the venom', () => C.addCond(t, 'Paralyzed', 1)) })),
      A(3, 4, 'Skittering Assault', 'Physical', 'D6 Slashing damage. On a hit, Dodge check or be knocked Prone.', melee('D6', 'Slashing', { onHit: async (C, me, t) => saveThen(C, t, 'Dodge', 'stay upright', () => prone(C, t)) })),
      A(5, 6, 'Web Bind', null, 'Dodge check or be Restrained by sticky webbing.', async (C, me, t) => saveThen(C, t, 'Dodge', 'avoid the webbing', () => restrain(C, t))),
    ],
  },
  leech: {
    name: 'Cavebound Leech', one: 'Cavebound Leech', number: 1, desc: 'A slimy, segmented body several meters long, its maw lined with razor-sharp teeth that pierce even the sturdiest armor.',
    types: ['Animal'], mind: 60, endurance: 60, body: 40, health: 10, hitLoc: 'Serpentoid', weak: 'Head', armorAll: 1, combat: 40, mr: 30, spoils: 'resources', traits: ['Penetrating (1)', 'Alert'], holds: 'Engulfing Devour',
    adapt: [L(5, { health: 5, dmg: 'D4', combat: 10 }), L(10, { health: 5, dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Constricting Grasp', 'Physical', 'D6 Bludgeoning damage. On a hit, the target is Restrained and takes 1 Bludgeoning damage at the start of each turn.', melee('D6', 'Bludgeoning', { onHit: async (C, me, t) => C.grasp(me, t, { dmg: 1, type: 'Bludgeoning' }) })),
      A(3, 4, 'Razor Bite', 'Physical', 'D6 Piercing damage that ignores all Armor.', melee('D6', 'Piercing', { ignoreArmor: true })),
      A(5, 6, 'Engulfing Devour', 'Physical', 'Against a creature it holds: 2D8 Acid damage. Otherwise D6 Piercing damage, healing for half the damage done.', async (C, me, t) => {
        const held = C.pcSide().find((x) => x.fx.graspedBy === me.uid);
        if (held) { C.log(`${me.name} opens its maw wide and engulfs ${C.nm(held)}!`, 'enemy'); await C.harm(held, '2D8', 'Acid', { source: me, label: 'Engulfing Devour' }); return; }
        await C.attack(me, t, { dmg: 'D6', type: 'Piercing', onHit: async (C2, m, tt, info) => { if (info.dealt) C.heal(me, Math.ceil(info.dealt / 2)); } });
      }),
    ],
  },
  corpseants: {
    name: 'Corpse Ants', one: 'Corpse Ant', number: 3, desc: 'Ants several times the size of a regular one, their serrated jaws capable of tearing through steel armor.',
    types: ['Animal'], mind: 40, endurance: 60, body: 40, health: 8, hitLoc: 'Insectoid', weak: 'Head', armorAll: 1, combat: 30, mr: 30, spoils: 'resources', traits: ['Penetrating (1)', 'Pack'],
    adapt: [L(5, { health: 4, dmg: 'D4', combat: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Chitinous Bite', 'Physical', 'D6 Piercing damage.', melee('D6', 'Piercing')),
      A(3, 4, 'Acidic Spray', null, 'All characters make a Dodge check or receive D6 Acid damage and make an Armor Integrity check.', allSave('Dodge', 'D6', 'Acid', { onFail: (C, t) => C.integrity(t) })),
      A(5, 6, 'Putrid Eruption', null, 'It explodes: all creatures make an Endurance check or take D8 Necrotic damage (half on a success). The Corpse Ant does not survive.', async (C, me) => { await C.areaSave(me, C.pcSide(), { skill: 'Endurance', dmg: 'D8', type: 'Necrotic', half: true, area: true }); C.selfDestruct(me); }),
    ],
  },
  deathsage: {
    name: 'Death Sage', one: 'Death Sage', number: 1, desc: 'Undead magi-priests of Kalatha, withered and skeletal in tattered robes that once bore grandeur and opulence.',
    types: ['Undead'], mind: 60, endurance: 40, body: 20, health: 10, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 30, mr: 60, spoils: 'resources', traits: ['Horrifying'],
    adapt: [L(5, { health: 5, dmg: 'D6', combat: 10 }), L(10, { dmg: 'D8', combat: 10 })],
    actions: [
      A(1, 2, 'Necrotic Bolt', 'Magical', 'D6 Necrotic damage on a hit. The target must also pass an Endurance check or have maximum Toughness reduced by 1 until they rest.', spellOne('D6', 'Necrotic', { onFail: async (C, t) => saveThen(C, t, 'Endurance', 'resist the decay', () => { if (t.isPC) C.reduceMaxTough(1); }) })),
      A(3, 4, 'Crippling Curse', 'Magical', 'Endurance check or Disadvantage on all weapon Skills and Dodge checks for D4 rounds.', async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the curse', () => { t.fx.crippled = C.round + rnd(4); C.log(`${C.nm(t)} ${t.isPC ? 'are' : 'is'} crippled by the curse.`, 'bad'); })),
      A(5, 6, 'Drain Life', 'Magical', 'Endurance check or take D6 Necrotic damage; it regains half the damage dealt.', async (C, me, t) => saveThen(C, t, 'Endurance', 'resist Drain Life', async () => { const d = await C.harm(t, 'D6', 'Necrotic', { source: me, label: 'Drain Life' }); C.heal(me, Math.ceil(d / 2)); })),
    ],
  },
  cryptguards: {
    name: 'Desiccated Cryptguards', one: 'Desiccated Cryptguard', number: 2, desc: 'Skeletal sentinels guarding the resting places of Vaelorian nobility, draped in corroded remnants of armor.',
    types: ['Undead'], mind: 40, endurance: 60, body: 20, health: 10, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 2 }, combat: 60, mr: 30, spoils: 'spoils', traits: [],
    adapt: [L(5, { dmg: 'D6', combat: 10, armorExcept: 'Chest' }), L(10, { health: 10, dmg: 'D8' })],
    actions: [
      A(1, 2, 'Rusting Slash', 'Physical', 'D6 Slashing damage. On a hit, the target makes an immediate Armor Integrity check.', melee('D6', 'Slashing', { onHit: async (C, me, t, info) => C.integrity(t, info.loc) })),
      A(3, 4, 'Relentless Assault', 'Physical', 'Two melee attacks against the same target, each dealing D4+1 Slashing damage.', async (C, me, t) => { await C.attack(me, t, { dmg: 'D4+1', type: 'Slashing' }); if (!C.dead(t)) await C.attack(me, t, { dmg: 'D4+1', type: 'Slashing' }); }),
      A(5, 6, "Tomb Guardian's Wrath", 'Physical', 'D6 Slashing damage. On a hit, Resolve check or become Frightened (20).', melee('D6', 'Slashing', { onHit: async (C, me, t) => saveThen(C, t, 'Resolve', 'steel yourself', () => C.addCond(t, 'Frightened', 20)) })),
    ],
  },
  dwerax: {
    name: 'Dwerax', one: 'Dwerax', number: 1, desc: 'Eyeless horrors with unnaturally long clawed arms and an enormous gaping maw full of razor-sharp teeth.',
    types: ['Demon'], mind: 60, endurance: 60, body: 60, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 2 }, combat: 60, mr: 30, spoils: 'spoils', traits: ['Frightening', 'Alert'], holds: true,
    adapt: [L(5, { dmg: 'D6', combat: 10 }), L(10, { health: 10, dmg: 'D8', mr: 10 })],
    actions: [
      A(1, 2, 'Claw Grasp', 'Physical', 'D6 Slashing damage. On a hit, the target is Restrained and takes 1 Slashing damage at the start of each turn.', melee('D6', 'Slashing', { onHit: async (C, me, t) => C.grasp(me, t, { dmg: 1, type: 'Slashing' }) })),
      A(3, 4, 'Abyssal Bite', 'Physical', 'D6 Piercing damage that ignores all Armor.', melee('D6', 'Piercing', { ignoreArmor: true })),
      A(5, 6, 'Tremor Strike', null, 'All creatures make an Acrobatics check or are knocked Prone and take D4 Bludgeoning damage.', allSave('Acrobatics', 'D4', 'Bludgeoning', { onFail: (C, t) => prone(C, t) })),
    ],
  },
  fangvine: {
    name: 'Fangvine', one: 'Fangvine', number: 1, desc: 'Sinewy roots and tendrils that lash out from the soil, with rows of obsidian thorns that inject a paralyzing venom.',
    types: ['Plant'], mind: 40, endurance: 40, body: 30, health: 8, healthPerLvl: 2, hitLoc: 'Serpentoid', weak: 'Head', armor: { Body: 2 }, combat: 50, mr: 30, spoils: 'resources', traits: [], holds: true,
    adapt: [L(5, { dmg: 'D4', combat: 10 }), L(10, { dmg: 'D6', mr: 10 })],
    actions: [
      A(1, 2, 'Ensnaring Grasp', 'Physical', 'D6 Bludgeoning damage. On a hit, the target is Restrained by the Fangvine.', melee('D6', 'Bludgeoning', { onHit: async (C, me, t) => restrain(C, t) })),
      A(3, 4, 'Thorned Assault', 'Physical', 'D6 Piercing damage. On a hit, Endurance check or be Paralyzed for 1 round.', melee('D6', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the venom', () => C.addCond(t, 'Paralyzed', 1)) })),
      A(5, 6, 'Savage Grasp', null, 'Dodge check or become Restrained, suffering 2 Piercing damage each turn while Restrained.', async (C, me, t) => saveThen(C, t, 'Dodge', 'leap clear', () => C.grasp(me, t, { dmg: 2, type: 'Piercing' }))),
    ],
  },
  flayedknight: {
    name: 'Flayed Knight', one: 'Flayed Knight', number: 1, desc: 'The flayed apparition of a once-glorious knight, brandishing a rusted, blood-stained spectral blade.',
    types: ['Undead'], mind: 40, endurance: 60, body: 50, health: 16, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 60, mr: 30, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 5, dmgFlat: 1, combat: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Spectral Strike', 'Physical', 'D4 Slashing damage that ignores all Armor.', melee('D4', 'Slashing', { ignoreArmor: true })),
      A(3, 4, 'Haunting Grasp', 'Magical', 'D6 Necrotic damage on a hit; it regains half the damage dealt.', spellOne('D6', 'Necrotic', { drain: 0.5 })),
      A(5, 6, 'Vengeful Cleave', 'Physical', 'A melee attack against two creatures, D6 Slashing damage each. If a hit reduces a target to 0 Toughness, it regains half the damage dealt.', async (C, me) => {
        for (const t of C.pcSide().slice(0, 2)) await C.attack(me, t, { dmg: 'D6', type: 'Slashing', onHit: async (C2, m, tt, info) => { if (tt.isPC && C.pcTough() === 0) C.heal(me, Math.ceil(info.dealt / 2)); } });
      }),
    ],
  },
  fleshmelt: {
    name: 'Fleshmelt Slime', one: 'Fleshmelt Slime', number: 1, desc: 'A repulsive, quivering ooze of melted and rotten flesh, its surface a ghastly palette of decomposing bodies.',
    types: ['Elemental', 'Undead'], affinity: 'Acid', mind: 20, endurance: 60, body: 40, health: 12, hitLoc: 'Body', weak: null, armor: {}, combat: 50, mr: 40, spoils: 'resources', traits: [],
    adapt: [L(5, { health: 4, dmg: 'D4', combat: 10 }), L(10, { health: 4, dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Corrosive Touch', 'Physical', 'D6 Acid damage on a hit.', melee('D6', 'Acid')),
      A(3, 4, 'Putrid Eruption', null, 'Endurance check or take 2D4 Acid damage and suffer -5 to weapon Skills until the end of combat.', allSave('Endurance', '2D4', 'Acid', { onFail: (C, t) => { t.fx.weaponMinus = (t.fx.weaponMinus || 0) + 5; } })),
      A(5, 6, 'Devour Essence', 'Magical', 'Endurance check or take 2D4 Necrotic damage and have maximum Toughness reduced by the same amount until resting. It regains Health equal to the damage.', async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the slime', async () => { const d = await C.harm(t, '2D4', 'Necrotic', { source: me, label: 'Devour Essence' }); if (t.isPC && d) C.reduceMaxTough(d); C.heal(me, d); })),
    ],
  },
  giantspider: {
    name: 'Giant Spider', one: 'Giant Spider', number: 1, desc: 'A hairy, jet-black arachnid marked with crimson patterns, its serrated fangs dripping with a potent neurotoxin.',
    types: ['Animal'], mind: 60, endurance: 40, body: 40, health: 10, hitLoc: 'Arachnid', weak: 'Cephalothorax', armorAll: 1, combat: 50, mr: 30, spoils: 'resources', traits: ['Penetrating (1)', 'Alert'],
    adapt: [L(5, { health: 4, dmg: 'D6', combat: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Venomous Bite', 'Physical', 'D4 Piercing damage. On a hit, Endurance check or be Poisoned (1).', melee('D4', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the venom', () => C.addCond(t, 'Poisoned', 1)) })),
      A(3, 4, 'Web Snare', null, 'Dodge check or be Restrained by the webbing.', async (C, me, t) => saveThen(C, t, 'Dodge', 'avoid the web', () => restrain(C, t))),
      A(5, 6, 'Terrifying Gaze', 'Magical', 'Resolve check or be Frightened (20).', async (C, me, t) => saveThen(C, t, 'Resolve', 'meet its gaze', () => C.addCond(t, 'Frightened', 20))),
    ],
  },
  hivelarvae: {
    name: 'Hive Larvae', one: 'Hive Larva', number: 4, desc: 'Repugnant, cat-sized grubs with slimy iridescent carapaces, moving as one with a hive-mind hunger.',
    types: ['Animal'], mind: 20, endurance: 20, body: 10, health: 2, hitLoc: 'Body', weak: null, armor: {}, combat: 30, mr: 30, spoils: 'resources', traits: ['Penetrating (1)'],
    adapt: [L(5, { dmg: 'D4', combat: 10 }), L(10, { dmg: 'D6', combat: 20 })],
    actions: [
      A(1, 2, 'Swarm Bite', 'Physical', 'D4 Piercing damage. On a hit, Endurance check or take 1 Acid damage at the start of each turn until magically healed or combat ends.', melee('D4', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the acid', () => { t.fx.acidBurn = true; C.log(`${C.nm(t)} ${t.isPC ? 'are' : 'is'} burning with acid.`, 'bad'); }) })),
      A(3, 4, 'Luminescent Distraction', 'Magical', 'All creatures make an Endurance check or are Blinded until the end of their next turn.', allSave('Endurance', null, null, { onFail: (C, t) => C.blindBriefly(t) })),
      A(5, 6, 'Consume Essence', 'Magical', 'Endurance check or take D6 Necrotic damage and have maximum Toughness reduced by the same amount until resting. It heals half the damage.', async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the drain', async () => { const d = await C.harm(t, 'D6', 'Necrotic', { source: me, label: 'Consume Essence' }); if (t.isPC && d) C.reduceMaxTough(d); C.heal(me, Math.ceil(d / 2)); })),
    ],
  },
  hivewarrior: {
    name: 'Hive Warriors', one: 'Hive Warrior', number: 2, desc: 'Monstrosities with elongated limbs and sleek exoskeletons that guard the subterranean hive and its colossal queen.',
    types: ['Humanoid', 'Animal'], mind: 30, endurance: 30, body: 45, health: 8, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 30, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 4, dmg: 'D6', combat: 10 }), L(10, { health: 6, dmg: 'D6', combat: 20 })],
    actions: [
      A(1, 2, 'Rending Strike', 'Physical', 'D6 Slashing damage.', melee('D6', 'Slashing')),
      A(3, 4, 'Venomous Spines', null, 'Dodge check or suffer 1 Piercing damage; if hit, Endurance check or be Poisoned (2).', async (C, me, t) => saveThen(C, t, 'Dodge', 'dodge the spines', async () => { await C.harm(t, 1, 'Piercing', { source: me, label: 'Venomous Spines' }); if (!C.dead(t)) await saveThen(C, t, 'Endurance', 'resist the venom', () => C.addCond(t, 'Poisoned', 2)); })),
      A(5, 6, 'Unyielding Charge', 'Physical', 'D6 Bludgeoning damage and the target is knocked Prone.', melee('D6', 'Bludgeoning', { onHit: async (C, me, t) => prone(C, t) })),
    ],
  },
  shambler: {
    name: 'Hollow Shambler', one: 'Hollow Shambler', number: 1, desc: 'A headless undead with an enormous maw gaping open in its chest, lined with rows of jagged teeth.',
    types: ['Undead'], mind: 30, endurance: 30, body: 45, health: 12, hitLoc: 'Humanoid', weak: 'Chest', armor: {}, combat: 50, mr: 50, spoils: 'spoils', traits: [], holds: true,
    adapt: [L(5, { health: 4, dmg: 'D4', combat: 10 }), L(10, { health: 4, dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Soul Devour', null, 'Athletics check or be pulled into its chest cavity: 2D4 Piercing damage now and 1 Necrotic damage each turn. Escape with an Athletics check or by dealing 3 damage to it.', async (C, me, t) => saveThen(C, t, 'Athletics', 'resist being devoured', async () => { C.grasp(me, t, { dmg: 1, type: 'Necrotic', escapeDmg: 3 }); await C.harm(t, '2D4', 'Piercing', { source: me, label: 'Soul Devour' }); })),
      A(3, 4, 'Distorted Lurch', null, 'Its Combat Skill increases by 5 for D4 rounds.', async (C, me) => { me.fx.lurch = { v: 5, until: C.round + rnd(4) }; C.log(`${me.name} lurches unpredictably.`, 'enemy'); }),
      A(5, 6, 'Tormented Wail', null, 'Every creature makes a Resolve check or is Frightened (20).', allSave('Resolve', null, null, { onFail: (C, t) => C.addCond(t, 'Frightened', 20) })),
    ],
  },
  livingmoss: {
    name: 'Living Moss', one: 'Living Moss', number: 1, desc: 'A twisted amalgamation of decaying vegetation and rotting flesh; the ground beneath it withers and dies.',
    types: ['Undead', 'Plant'], mind: 30, endurance: 60, body: 45, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 60, spoils: 'resources', traits: [],
    adapt: [L(5, { health: 4, dmg: 'D6', combat: 10 }), L(10, { health: 4, dmg: 'D6', combat: 20 })],
    actions: [
      A(1, 2, 'Necrotic Touch', 'Physical', 'D6 Necrotic damage on a hit.', melee('D6', 'Necrotic')),
      A(3, 4, 'Ensnaring Vines', null, 'Dodge check or be Restrained. If already Restrained, suffer D6 Bludgeoning damage.', async (C, me, t) => {
        if (t.cond.Restrained) { await C.harm(t, 'D6', 'Bludgeoning', { source: me, label: 'Crushing vines' }); return; }
        await saveThen(C, t, 'Dodge', 'evade the vines', () => restrain(C, t));
      }),
      A(5, 6, 'End Life', 'Magical', 'Endurance check or take 2 Necrotic damage directly to Health, ignoring Toughness.', async (C, me, t) => saveThen(C, t, 'Endurance', 'resist End Life', () => C.healthDamage(t, 2, 'Necrotic', 'End Life'))),
    ],
  },
  netherfiend: {
    name: 'Netherfiend', one: 'Netherfiend', number: 1, desc: 'A lesser demon barely a meter tall, with obsidian skin, curving horns and sharp, jagged wings.',
    types: ['Demon'], mind: 40, endurance: 40, body: 40, health: 10, hitLoc: 'Winged Biped', weak: 'Head', armor: { Head: 2 }, combat: 40, mr: 60, spoils: 'spoils', traits: ['Frightening'],
    adapt: [L(5, { health: 5, dmg: 'D4', combat: 20 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Infernal Claw', 'Physical', "D6 Slashing damage. The target must pass a Spellward check or bear the Infernal Mark for D4 rounds: the Netherfiend's attacks deal +1 Fire damage to them.", melee('D6', 'Slashing', { onHit: async (C, me, t) => saveThen(C, t, 'Spellward', 'resist the mark', () => { t.fx.infernalMark = Math.max(t.fx.infernalMark || 0, C.round) + rnd(4); C.log(`${C.nm(t)} ${t.isPC ? 'bear' : 'bears'} the Infernal Mark.`, 'bad'); }) })),
      A(3, 4, 'Eldritch Flames', 'Magical', 'D4 Fire damage on a hit; the target must succeed on an Endurance check or receive the Burning condition.', spellOne('D4', 'Fire', { onFail: async (C, t) => saveThen(C, t, 'Endurance', 'avoid catching fire', () => C.addCond(t, 'Burning', true)) })),
      A(5, 6, 'Corrupting Bind', 'Magical', 'Athletics check or be Restrained by tendrils.', async (C, me, t) => saveThen(C, t, 'Athletics', 'tear the tendrils', () => restrain(C, t))),
    ],
  },
  plaguebringer: {
    name: 'Plaguebringer', one: 'Plaguebringer', number: 1, desc: 'A vile form of rotting flesh and oozing pustules, swarmed by diseased insects and exuding a noxious stench.',
    types: ['Undead', 'Elemental'], affinity: 'Necrotic', mind: 20, endurance: 60, body: 50, health: 16, hitLoc: 'Humanoid', weak: 'Head', armor: { Head: 2 }, combat: 50, mr: 30, spoils: 'spoils', traits: ['Frightening', 'Venomous'],
    adapt: [L(5, { health: 4, dmg: 'D4', armorExcept: 'Chest' }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Corrosive Claws', 'Physical', 'D6 Slashing damage.', melee('D6', 'Slashing')),
      A(3, 4, 'Virulent Cloud', 'Magical', 'Endurance check or take 1 Poison damage and have Disadvantage on attack rolls and Skill checks for D4 rounds.', allSave('Endurance', null, null, { onFail: async (C, t) => { await C.harm(t, 1, 'Poison', { label: 'Virulent Cloud' }); t.fx.plague = Math.max(t.fx.plague || 0, C.round) + rnd(4); } })),
      A(5, 6, 'Disease Spew', 'Magical', "2 Necrotic damage that reduces the target's Health, bypassing Toughness.", async (C, me, t) => saveThen(C, t, 'Spellward', 'avoid the spew', () => C.healthDamage(t, 2, 'Necrotic', 'Disease Spew'))),
    ],
  },
  pyreborn: {
    name: 'Pyreborn', one: 'Pyreborn', number: 1, desc: 'Particularly violent fire elementals, summoned by ancient rituals and used as guardians by the Vaelorians.',
    types: ['Elemental'], affinity: 'Fire', vulnerableExtra: ['Cold'], mind: 40, endurance: 40, body: 60, health: 8, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 60, mr: 30, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 12, dmg: 'D4' }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Ember Strike', 'Magical', 'D6 Fire damage on a hit; the target must succeed on a Dodge check to avoid Burning.', spellOne('D6', 'Fire', { onFail: async (C, t) => saveThen(C, t, 'Dodge', 'avoid the flames', () => C.addCond(t, 'Burning', true)) })),
      A(3, 4, 'Inferno Burst', null, 'All creatures make a Dodge check or take 2 Fire damage and receive Burning.', allSave('Dodge', '2', 'Fire', { onFail: (C, t) => C.addCond(t, 'Burning', true) })),
      A(5, 6, 'Firestorm', 'Magical', 'All creatures make a Dodge check, taking D4 Fire damage and Burning on a failure.', allSave('Dodge', 'D4', 'Fire', { onFail: (C, t) => C.addCond(t, 'Burning', true) })),
    ],
  },
  ratkin: {
    name: 'Ratkin Marauders', one: 'Ratkin Marauder', number: 3, desc: 'Hunched, rat-like humanoids with razor-sharp claws, draped in stolen garments and grisly trophies.',
    types: ['Humanoid'], mind: 80, endurance: 50, body: 50, health: 6, hitLoc: 'Humanoid', weak: 'Head', armor: { Head: 1 }, combat: 60, mr: 30, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 4, dmg: 'D4', armorExcept: 'Chest' }), L(10, { dmg: 'D6', combat: 20 })],
    actions: [
      A(1, 2, 'Claw Slash', 'Physical', 'D6 Slashing damage.', melee('D6', 'Slashing')),
      A(3, 4, 'Dirty Trick', null, 'Dodge check or be Blinded until the end of their next turn.', async (C, me, t) => saveThen(C, t, 'Dodge', 'protect your eyes', () => C.blindBriefly(t))),
      A(5, 6, 'Alarm', null, 'It readies a horn to sound the alarm. You may try to interrupt it with a Thievery check; on a failure, make a Tension Die check.', async (C, me) => {
        const s = await C.save(C.pcSide()[0], 'Thievery', { label: 'Snatch the horn' });
        if (s.success) C.log('You knock the horn away before it sounds.', 'good'); else { C.log('The horn blares through the halls!', 'bad'); await C.tensionCheck(); }
      }),
    ],
  },
  razorjaw: {
    name: 'Razorjaw', one: 'Razorjaw', number: 1, desc: 'Scaly black predators with thick, muscular limbs and serrated teeth resembling interlocking blades.',
    types: ['Animal'], mind: 70, endurance: 50, body: 60, health: 12, hitLoc: 'Quadruped', weak: 'Head', armor: { Forequarters: 1 }, combat: 40, mr: 30, spoils: 'spoils', traits: ['Penetrating (2)'],
    adapt: [L(5, { health: 4, dmg: 'D4', armorExcept: 'Forequarters' }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Vicious Bite', 'Physical', 'D6 Piercing damage.', melee('D6', 'Piercing')),
      A(3, 4, 'Claw Swipe', 'Physical', '2 Slashing damage on a hit; the target must succeed on a Dodge check or be Bleeding (1).', melee('2', 'Slashing', { onHit: async (C, me, t) => saveThen(C, t, 'Dodge', 'twist away', () => C.addCond(t, 'Bleeding', 1)) })),
      A(5, 6, 'Savage Pounce', null, 'Athletics check or be knocked Prone, followed by a free bite dealing D4 Piercing damage.', async (C, me, t) => saveThen(C, t, 'Athletics', 'withstand the pounce', async () => { prone(C, t); await C.attack(me, t, { dmg: 'D4', type: 'Piercing' }); })),
    ],
  },
  homunculus: {
    name: 'Reanimated Homunculus', one: 'Reanimated Homunculus', number: 1, desc: 'A stitched-together mockery of life crackling with volatile necrotic essence. When it freezes in place, run.',
    types: ['Undead', 'Construct'], mind: 40, endurance: 50, body: 20, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 2 }, combat: 30, mr: 60, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 4, dmg: 'D6', armorExcept: 'Chest' }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Slam', 'Physical', 'D4 Bludgeoning damage.', melee('D4', 'Bludgeoning')),
      A(3, 4, 'Necrotic Aura', null, 'For 2 rounds, creatures must succeed on an Endurance check at the start of each of their turns or take 1 Necrotic damage.', async (C, me) => { me.fx.aura = { n: 1, until: Math.max(me.fx.aura?.until || C.round, C.round) + 2 }; C.log(`${me.name} emits an unstable necrotic aura.`, 'enemy'); }),
      A(5, 6, 'Unstable Detonation', 'Magical', 'It freezes in place. At the start of its next turn it explodes: Dodge check or 2D10 Necrotic damage (half on a success). It is destroyed.', async (C, me) => { me.fx.detonate = true; C.log(`<b>${me.name} freezes in place, its essence growing volatile...</b>`, 'bad'); }),
    ],
  },
  rotwalkers: {
    name: 'Rotwalkers', one: 'Rotwalker', number: 3, desc: 'Once-human creatures consumed by decomposition, hollow eyes glowing with malevolent light.',
    types: ['Undead'], mind: 20, endurance: 30, body: 20, health: 8, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 60, mr: 40, spoils: 'spoils', traits: ['Frightening'], holds: true,
    adapt: [L(5, { health: 4, dmg: 'D6' }), L(10, { health: 4, dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Grasping Claw', 'Physical', 'D4 Necrotic damage on a hit; the target must succeed on a Dodge check or be Restrained.', melee('D4', 'Necrotic', { onHit: async (C, me, t) => saveThen(C, t, 'Dodge', 'pull free', () => restrain(C, t)) })),
      A(3, 4, 'Festering Aura', null, 'For 2 rounds, creatures must succeed on an Endurance check at the start of their turns or take 2 Necrotic damage.', async (C, me) => { me.fx.aura = { n: 2, until: Math.max(me.fx.aura?.until || C.round, C.round) + 2 }; C.log(`${me.name} emits a foul aura of decay.`, 'enemy'); }),
      A(5, 6, 'Deathly Embrace', null, 'Athletics check or be Restrained, taking 1 Necrotic damage at the start of each turn until free or it is destroyed.', async (C, me, t) => saveThen(C, t, 'Athletics', 'break the embrace', () => C.grasp(me, t, { dmg: 1, type: 'Necrotic' }))),
    ],
  },
  stonewarden: {
    name: 'Stone Warden', one: 'Stone Warden', number: 1, desc: 'An earth elemental with stony humanoid features, exuding primordial power and ageless knowledge.',
    types: ['Elemental'], affinity: 'Force', vulnerableExtra: ['Psychic'], mind: 30, endurance: 60, body: 80, health: 15, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 60, mr: 30, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 5, dmg: 'D4' }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Stone Spike', 'Magical', 'A spike of stone deals D6 Force damage; the target must also pass a Dodge check or be Restrained.', spellOne('D6', 'Force', { onFail: async (C, t) => saveThen(C, t, 'Dodge', 'avoid being impaled', () => restrain(C, t)) })),
      A(3, 4, 'Tremor Strike', null, 'All creatures make an Acrobatics check or take D6 Bludgeoning damage and are knocked Prone.', allSave('Acrobatics', 'D6', 'Bludgeoning', { onFail: (C, t) => prone(C, t) })),
      A(5, 6, 'Landslide', null, 'All creatures make an Athletics check or take D8 Bludgeoning damage.', allSave('Athletics', 'D8', 'Bludgeoning')),
    ],
  },
  swarmer: {
    name: 'Swarmer', one: 'Swarmer', number: 1, desc: 'A colossal mass of chittering insects, squirming worms and writhing serpents fused into a monstrous swarm.',
    types: ['Animal', 'Construct'], mind: 50, endurance: 40, body: 30, health: 12, hitLoc: 'Body', weak: null, armor: {}, combat: 30, mr: 30, spoils: 'resources', traits: ['Penetrating (1)', 'Venomous'],
    adapt: [L(5, { health: 4, dmg: 'D6', combat: 10 }), L(10, { dmg: 'D6', combat: 20 })],
    actions: [
      A(1, 2, 'Venomous Bite', 'Physical', 'D4+1 Poison damage on a hit.', melee('D4+1', 'Poison')),
      A(3, 4, 'Acid Spray', 'Magical', 'Dodge check or take D6 Acid damage and have Armor reduced by 1 until repaired at Camp.', allSave('Dodge', 'D6', 'Acid', { onFail: (C, t) => C.corrode(t) })),
      A(5, 6, 'Swarm Assault', null, 'The swarm deals 2 Piercing damage; Endurance check or be Blinded until their next turn.', async (C, me, t) => { await C.harm(t, 2, 'Piercing', { source: me, label: 'Swarm Assault' }); if (!C.dead(t)) await saveThen(C, t, 'Endurance', 'see through the swarm', () => C.blindBriefly(t)); }),
    ],
  },
  tombcrawler: {
    name: 'Tomb Crawler', one: 'Tomb Crawler', number: 1, desc: 'A giant millipede with a segmented exoskeleton of jagged spines, nearly invisible in the darkness.',
    types: ['Animal'], mind: 60, endurance: 40, body: 25, health: 16, hitLoc: 'Serpentoid', weak: 'Head', armor: { Body: 2 }, combat: 50, mr: 30, spoils: 'resources', traits: ['Venomous'],
    adapt: [L(5, { dmg: 'D4', combat: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Spine Strike', 'Physical', 'D6 Piercing damage; the target must succeed on an Endurance check or receive -10 to their next attack.', melee('D6', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'shake off the sting', () => { t.fx.nextAtkMinus = (t.fx.nextAtkMinus || 0) + 10; }) })),
      A(3, 4, 'Paralyzing Bite', 'Physical', 'D4 Piercing damage; the target must succeed on an Endurance check or be Paralyzed for 1 round.', melee('D4', 'Piercing', { onHit: async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the venom', () => C.addCond(t, 'Paralyzed', 1)) })),
      A(5, 6, 'Slash', 'Physical', '2 Slashing damage. The target is now Bleeding (1).', melee('2', 'Slashing', { onHit: async (C, me, t) => C.addCond(t, 'Bleeding', 1) })),
    ],
  },
  umbrafiend: {
    name: 'Umbra Fiend', one: 'Umbra Fiend', number: 1, desc: 'A formless creature of inky, swirling shadows that dims the very light around it.',
    types: ['Astral'], mind: 50, endurance: 40, body: 25, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 40, spoils: 'spoils', traits: ['Frightening'], resistPhysical: true,
    adapt: [L(5, { health: 8, dmg: 'D4', combat: 10 }), L(10, { dmg: 'D6', mr: 10 })],
    actions: [
      A(1, 2, 'Shadow Claw', 'Physical', 'D6 Slashing damage.', melee('D6', 'Slashing')),
      A(3, 4, 'Darkness Pulse', 'Magical', 'All creatures take 2 Necrotic damage and must succeed on an Endurance check or have Disadvantage on attack checks for 1 round.', async (C, me) => {
        for (const t of C.pcSide()) { await C.harm(t, 2, 'Necrotic', { source: me, label: 'Darkness Pulse' }); if (!C.dead(t)) await saveThen(C, t, 'Endurance', 'see through the dark', () => { t.fx.disAttackUntil = C.round + 1; }); }
      }),
      A(5, 6, 'Evasive Shadows', null, 'Until the start of its next turn, attacks against it have Disadvantage.', async (C, me) => { me.fx.mirage = C.round + 1; C.log(`${me.name} merges with the shadows.`, 'enemy'); }),
    ],
  },
  familiar: {
    name: 'Unfettered Familiar', one: 'Unfettered Familiar', number: 1, desc: 'A once-bound magical servant, translucent like a wisp and consumed by hatred of all physical beings.',
    types: ['Astral'], mind: 70, endurance: 40, body: 20, health: 8, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 60, spoils: 'spoils', traits: [], resistPhysical: true,
    adapt: [L(5, { health: 2, dmg: 'D4', combat: 10 }), L(10, { health: 2, dmg: 'D6', mr: 10 })],
    actions: [
      A(1, 2, 'Arcane Burst', 'Magical', 'D6 Arcane damage on a hit.', spellOne('D6', 'Arcane')),
      A(3, 4, 'Ethereal Grasp', 'Magical', 'Endurance check or suffer 1 Arcane damage and be Blinded for 1 round.', async (C, me, t) => saveThen(C, t, 'Endurance', 'resist the touch', async () => { await C.harm(t, 1, 'Arcane', { source: me, label: 'Ethereal Grasp' }); C.blindBriefly(t); })),
      A(5, 6, 'Arcane Feedback', 'Magical', 'The next creature to attack it must pass a Resolve check or take D6 Arcane damage, and its next Magical Ability has a 50% chance of failing.', async (C, me) => { me.fx.feedback = true; C.log(`${me.name} crackles with arcane feedback.`, 'enemy'); }),
    ],
  },
  magus: {
    name: 'Vaelorian Magus', one: 'Vaelorian Magus', number: 1, desc: 'An undead spellcaster in tattered robes, commanding the forces of death and decay.',
    types: ['Undead'], mind: 40, endurance: 40, body: 20, health: 16, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 40, mr: 60, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 4, dmg: 'D6', combat: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Death Bolt', 'Magical', 'D6 Necrotic damage on a hit.', spellOne('D6', 'Necrotic')),
      A(3, 4, 'Apparition Summoning', 'Magical', 'All characters make a Resolve check or become Frightened (20).', allSave('Resolve', null, null, { onFail: (C, t) => C.addCond(t, 'Frightened', 20) })),
      A(5, 6, 'Eldritch Enfeeblement', 'Magical', 'The target has Disadvantage on its next attack roll or Skill check.', async (C, me, t) => saveThen(C, t, 'Spellward', 'resist the curse', () => { t.fx.nextDis = true; t.fx.nextCheckDis = true; C.log(`${C.nm(t)} ${t.isPC ? 'feel' : 'feels'} drained.`, 'bad'); })),
    ],
  },
  vinekin: {
    name: 'Vinekin', one: 'Vinekin', number: 1, desc: 'A tangle of writhing vines and thorny brambles in the outline of a humanoid, interested only in violence.',
    types: ['Plant', 'Humanoid'], mind: 40, endurance: 40, body: 30, health: 10, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 60, mr: 30, spoils: 'spoils', traits: [],
    adapt: [L(5, { health: 5, dmg: 'D6', combat: 10 }), L(10, { health: 5, dmg: 'D8', mr: 10 })],
    actions: [
      A(1, 2, 'Thorn Lash', 'Physical', 'D6 Piercing damage.', melee('D6', 'Piercing')),
      A(3, 4, 'Entangling Roots', 'Magical', 'Every creature makes a Dodge check or is Restrained, taking 1 Slashing damage each turn. If already Restrained, it takes 2 Slashing damage immediately.', async (C, me) => {
        C.destroyIcons();
        for (const t of C.pcSide()) {
          if (t.cond.Restrained) { await C.harm(t, 2, 'Slashing', { source: me, label: 'Tightening roots' }); continue; }
          await saveThen(C, t, 'Dodge', 'avoid the roots', () => C.grasp(me, t, { dmg: 1, type: 'Slashing', noHold: true }));
        }
      }),
      A(5, 6, 'Brutal Slam', 'Physical', 'D6 Bludgeoning damage; Athletics check or be knocked Prone.', melee('D6', 'Bludgeoning', { onHit: async (C, me, t) => saveThen(C, t, 'Athletics', 'stand firm', () => prone(C, t)) })),
    ],
  },
  voidweaver: {
    name: 'Voidweaver', one: 'Voidweaver', number: 1, desc: 'An ever-shifting mass of swirling shadows and cosmic dust, attuned to the chaotic forces of the void.',
    types: ['Astral'], mind: 40, endurance: 20, body: 20, health: 8, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 60, spoils: 'spoils', traits: [], resistPhysical: true,
    adapt: [L(5, { health: 2, dmg: 'D4', combat: 10 }), L(10, { health: 2, dmg: 'D6', mr: 10 })],
    actions: [
      A(1, 2, 'Void Ray', 'Magical', 'A beam of dark energy deals D4+1 Arcane damage on a hit.', spellOne('D4+1', 'Arcane')),
      A(3, 4, 'Cosmic Distortion', 'Magical', 'For 2 rounds, creatures have Disadvantage on weapon Skills and Dodge checks.', async (C, me) => { for (const t of C.pcSide()) t.fx.crippled = C.round + 2; C.log('Reality distorts around you!', 'bad'); }),
      A(5, 6, 'Void Nova', 'Magical', 'All creatures take D6 Arcane damage; those that fail an Athletics check are knocked Prone.', async (C, me) => {
        C.destroyIcons();
        for (const t of C.pcSide()) { await C.harm(t, 'D6', 'Arcane', { source: me, label: 'Void Nova' }); if (!C.dead(t)) await saveThen(C, t, 'Athletics', 'keep your feet', () => prone(C, t)); }
      }),
    ],
  },
  vorleg: {
    name: 'Vorleg', one: 'Vorleg', number: 1, desc: 'A sleek reptile with venomous fangs and barbed, paralyzing tentacles covering its back.',
    types: ['Animal'], mind: 60, endurance: 40, body: 40, health: 10, hitLoc: 'Quadruped', weak: 'Head', armorAll: 1, combat: 60, mr: 30, spoils: 'spoils', traits: ['Penetrating (1)', 'Alert', 'Venomous'],
    adapt: [L(5, { health: 5, dmg: 'D4', combat: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Venomous Bite', 'Physical', 'D6 Piercing damage.', melee('D6', 'Piercing')),
      A(3, 4, 'Ensnaring Tentacles', 'Physical', 'D6 Bludgeoning damage; on a hit, Athletics check or be grappled and Restrained.', melee('D6', 'Bludgeoning', { onHit: async (C, me, t) => saveThen(C, t, 'Athletics', 'escape the tentacles', () => C.grasp(me, t, { noHold: true })) })),
      A(5, 6, 'Paralyzing Grasp', null, 'A grappled creature must succeed on an Endurance check or receive 2D10 Bludgeoning damage. If none is grappled, the target is Restrained instead.', async (C, me, t) => {
        const held = C.pcSide().find((x) => x.fx.graspedBy === me.uid);
        if (!held) { restrain(C, t); t.fx.graspedBy = me.uid; return; }
        await saveThen(C, held, 'Endurance', 'resist the crushing grip', () => C.harm(held, '2D10', 'Bludgeoning', { source: me, label: 'Paralyzing Grasp' }));
      }),
    ],
  },
  wraithskull: {
    name: 'Wraithskull', one: 'Wraithskull', number: 1, desc: 'A fragile but terrifying disembodied skull hovering through the air, feeding on the life force of the living.',
    types: ['Undead', 'Astral'], mind: 60, endurance: 20, body: 10, health: 10, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 30, mr: 60, spoils: 'spoils', traits: ['Frightening'],
    adapt: [L(5, { health: 5, dmg: 'D6', combat: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Soul Drain', 'Magical', 'The target takes D6 Necrotic damage and it gains Temporary Health equal to half the damage dealt.', spellOne('D6', 'Necrotic', { tempDrain: 0.5 })),
      A(3, 4, 'Ethereal Phantasm', null, 'It becomes incorporeal until its next turn: Immune to non-magical damage and effects.', async (C, me) => { me.fx.incorporeal = true; C.log(`${me.name} fades into the ethereal plane.`, 'enemy'); }),
      A(5, 6, 'Wail of Torment', 'Magical', 'Each creature makes a Resolve check or becomes Frightened (20).', allSave('Resolve', null, null, { onFail: (C, t) => C.addCond(t, 'Frightened', 20) })),
    ],
  },
  wrathelemental: {
    name: 'Wrath Elemental', one: 'Wrath Elemental', number: 1, desc: 'An ever-shifting tempest of wind, fire, water and lightning, fused with demonic malevolence.',
    types: ['Demon', 'Elemental'], affinity: 'Infernal', mind: 30, endurance: 50, body: 40, health: 15, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 2 }, combat: 50, mr: 50, spoils: 'spoils', traits: ['Swift'],
    adapt: [L(5, { health: 5, dmg: 'D6', mr: 10 }), L(10, { dmg: 'D6', combat: 10 })],
    actions: [
      A(1, 2, 'Elemental Fury', 'Magical', 'Each creature takes D6 damage: Fire (1-2), Lightning (3-4) or Force (5-6).', async (C, me) => { const n = rnd(6); const type = n <= 2 ? 'Fire' : n <= 4 ? 'Lightning' : 'Force'; await C.areaSave(me, C.pcSide(), { skill: 'Spellward', dmg: 'D6', type, area: true }); }),
      A(3, 4, 'Infernal Resilience', null, 'It gains Temporary Health equal to half its current Health (never more than twice its Health).', async (C, me) => { const add = Math.min(Math.ceil(me.hp / 2), me.maxHp * 2 - me.hp); if (add > 0) { me.hp += add; C.log(`${me.name} gains ${add} Temporary Health.`, 'enemy'); } }),
      A(5, 6, 'Chaotic Eruption', 'Magical', 'Each creature is Blinded for 1 round and knocked Prone.', allSave('Spellward', null, null, { onFail: (C, t) => { C.blindBriefly(t); prone(C, t); } })),
    ],
  },
  // ---- Mastery minions (fight for you) ----
  arcanecompanion: {
    name: 'Arcane Companion', one: 'Arcane Companion', number: 1, minion: true, desc: 'A barely sentient amalgam of aetheric energies hovering above the ground.',
    types: ['Astral'], mind: 40, endurance: 40, body: 30, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 80, spoils: null, traits: [],
    actions: [
      A(1, 4, 'Arcane Bolt', 'Magical', 'A bolt of aether deals D6+1 Arcane damage.', async (C, me, t) => C.minionSpell(me, t, 'D6+1', 'Arcane')),
      A(5, 6, 'Ethereal Surge', 'Magical', '2D4 Arcane damage; the target must succeed on an Endurance check or be Blinded until the end of its next turn.', async (C, me, t) => { const ok = await C.minionSpell(me, t, '2D4', 'Arcane'); if (ok && !C.dead(t)) await saveThen(C, t, 'Endurance', 'Ethereal Surge', () => C.blindBriefly(t)); }),
    ],
  },
  fireelemental: {
    name: 'Fire Elemental', one: 'Fire Elemental', number: 1, minion: true, desc: 'A creature from the Plane of Fire, directed by a cunning magician.',
    types: ['Elemental'], affinity: 'Fire', mind: 40, endurance: 60, body: 40, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 60, spoils: null, traits: [],
    actions: [
      A(1, 4, 'Ember Blast', 'Physical', 'D4 Fire damage on a hit; Body check to avoid Burning.', melee('D4', 'Fire', { onHit: async (C, me, t) => saveThen(C, t, 'body', 'avoid Burning', () => C.addCond(t, 'Burning', true)) })),
      A(5, 6, 'Firestorm', 'Magical', 'A firestorm deals D4 Fire damage to all enemies.', async (C, me) => { for (const e of C.enemies()) await C.minionSpell(me, e, 'D4', 'Fire'); }),
    ],
  },
  frostelemental: {
    name: 'Frost Elemental', one: 'Frost Elemental', number: 1, minion: true, desc: 'A powerful creature made of spiritual cold.',
    types: ['Elemental'], affinity: 'Cold', mind: 40, endurance: 60, body: 40, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 60, spoils: null, traits: [],
    actions: [
      A(1, 4, 'Frostbite', 'Magical', 'A spear of ice deals D6 Cold damage.', async (C, me, t) => C.minionSpell(me, t, 'D6', 'Cold')),
      A(5, 6, "Blizzard's Embrace", 'Magical', 'D4 Cold damage to all enemies; those that fail are Restrained.', async (C, me) => { for (const e of C.enemies()) { const ok = await C.minionSpell(me, e, 'D4', 'Cold'); if (ok && !C.dead(e)) C.addCond(e, 'Restrained', true); } }),
    ],
  },
  wight: {
    name: 'Wight', one: 'Wight', number: 1, minion: true, desc: 'A gaunt, withered undead warrior driven by a relentless hunger for the souls of the living.',
    types: ['Undead'], mind: 60, endurance: 10, body: 10, health: 10, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 2 }, combat: 40, mr: 60, spoils: null, traits: [],
    actions: [
      A(1, 4, 'Deathly Slash', 'Physical', 'A swipe of pure death energy dealing D6 Necrotic damage.', melee('D6', 'Necrotic')),
      A(5, 6, 'Embrace of Death', null, 'The target makes an Endurance check or takes D4+1 Necrotic damage.', async (C, me, t) => saveThen(C, t, 'Endurance', 'Embrace of Death', () => C.harm(t, 'D4+1', 'Necrotic', { source: me, label: 'Embrace of Death' }))),
    ],
  },
  shadowclone: {
    name: 'Shadow Clone', one: 'Shadow Clone', number: 1, minion: true, desc: 'Your shadow, given form and fighting by your side.',
    types: ['Astral'], mind: 40, endurance: 40, body: 40, health: 10, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 40, spoils: null, traits: [],
    actions: [A(1, 6, 'Shadow Strike', 'Physical', 'Your shadow strikes with your weapon (D6).', async (C, me, t) => C.attack(me, t, { dmg: `D${me.cloneDie || 6}`, type: me.cloneType || 'Slashing' }))],
  },
});

export const ENCOUNTERS_A = ['vexator', 'amalgam', 'construct', 'astralbeast', 'bladewings', 'bloodstalker', 'bonegolem', 'bonespiders', 'leech', 'corpseants', 'deathsage', 'cryptguards', 'dwerax', 'fangvine', 'flayedknight', 'fleshmelt', 'giantspider', 'hivelarvae', 'hivewarrior', 'shambler'];
export const ENCOUNTERS_B = ['livingmoss', 'necropede', 'netherfiend', 'plaguebringer', 'pyreborn', 'ratkin', 'razorjaw', 'homunculus', 'rotwalkers', 'stonewarden', 'swarmer', 'tombcrawler', 'umbrafiend', 'familiar', 'magus', 'vinekin', 'voidweaver', 'vorleg', 'wraithskull', 'wrathelemental'];
/** Standard Combat Encounters table (page 133-135) */
export function rollEncounter() { return rnd(6) <= 3 ? ENCOUNTERS_A[rnd(20) - 1] : ENCOUNTERS_B[rnd(20) - 1]; }
export const creatureCount = (d) => (typeof d.number === 'string' ? r(d.number) : d.number || 1);
