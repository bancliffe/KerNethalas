// Creature stat blocks (Chapter V). Each action: [lo, hi, name, tag, text, run(C, me, tgt)]
// `tgt` is the creature's assigned target. Combat API is provided by engine/combat.js.
import { r, rnd } from '../dice.js';

export const A = (lo, hi, name, tag, text, run) => ({ lo, hi, name, tag, text, run });

// Common action shapes
export const melee = (dmg, type, extra = {}) => async (C, me, tgt) => C.attack(me, tgt, { dmg, type, ...extra });
export const allSave = (skill, dmg, type, opts = {}) => async (C, me) => C.areaSave(me, C.pcSide(), { skill, dmg, type, area: true, ...opts });
export const upToThree = (skill, dmg, type, opts = {}) => async (C, me) => C.areaSave(me, C.pcSide().slice(0, 3), { skill, dmg, type, ...opts });

export const CREATURES = {
  blightfang: {
    name: 'Blightfang Rats', one: 'Blightfang Rat', number: 3,
    desc: 'These abominable rodents are grotesque amalgamations of rotting flesh and shadows, their sinewy bodies covered in mangy, mottled fur.',
    types: ['Animal', 'Undead'], mind: 60, endurance: 30, body: 40, health: 6, hitLoc: 'Quadruped', weak: 'Head', armor: {}, combat: 30, mr: 20,
    spoils: 'resources', traits: ['Pack'],
    actions: [
      A(1, 2, 'Bite', 'Physical', 'The Blightfang Rat bites you with its sharp, needle-like teeth, dealing D6 Piercing damage.', melee('D6', 'Piercing')),
      A(3, 5, 'Scratch', 'Physical', 'The Blightfang Rat scratches you, dealing D4 Slashing damage.', melee('D4', 'Slashing')),
      A(6, 6, 'Rally', null, 'The Blightfang Rat screeches loudly, riling up all Blightfang Rats in the room and increasing their Combat Skill by +10 until the next round.', async (C, me) => {
        for (const u of C.enemies()) if (u.def === 'blightfang') u.fx.rally = C.round + 1;
        C.log(`${me.name} screeches! All Blightfang Rats gain +10 Combat Skill until next round.`, 'enemy');
      }),
    ],
  },
  skeletal: {
    name: 'Skeletal Horrors', one: 'Skeletal Horror', number: 2,
    desc: 'The remnants of fallen warriors cursed to wander eternally, shrouded in the tattered remnants of their once-proud armor, their bones blackened and charred by the fires of the afterlife.',
    types: ['Undead'], mind: 20, endurance: 20, body: 25, health: 8, hitLoc: 'Humanoid', weak: 'Head', armor: { Chest: 1 }, combat: 40, mr: 20,
    spoils: 'spoils', traits: ['Frightening'],
    actions: [
      A(1, 2, 'Cursed Slash', 'Physical', 'The Skeletal Horror swings its weapon with an eerie precision, dealing D6 Slashing damage.', melee('D6', 'Slashing')),
      A(3, 4, 'Ethereal Grasp', 'Magical', "Endurance check. On a failure, D6 Necrotic damage and the Skeletal Horror regains half the damage dealt. On a success, half damage and no healing.", async (C, me, tgt) => etherealGrasp(C, me, tgt)),
      A(5, 5, 'Haunting Wail', 'Magical', 'All creatures must make a successful Resolve check to avoid becoming Stunned (1).', allSave('Resolve', null, null, { onFail: (C, t) => C.addCond(t, 'Stunned', 1) })),
      A(6, 6, 'Vengeful Onslaught', 'Physical', 'A melee attack dealing D4 Piercing damage. If it hits, the Skeletal Horror immediately uses Ethereal Grasp as a Free Action.', melee('D4', 'Piercing', { onHit: async (C, me, tgt) => { if (!C.dead(tgt)) await etherealGrasp(C, me, tgt); } })),
    ],
  },
  flesheater: {
    name: 'Flesh Eater', one: 'Flesh Eater', number: 1,
    desc: 'These monstrous creatures possess a rotting, bloated form, with pallid skin stretched taut over protruding bones and oozing sores. Their jagged teeth are perpetually exposed in a wicked grin.',
    types: ['Humanoid', 'Undead'], mind: 30, endurance: 30, body: 65, health: 12, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 10,
    spoils: 'spoils', traits: ['Frightening'],
    actions: [
      A(1, 2, 'Rancid Claw', 'Physical', 'D6 Slashing damage. The target must succeed on an Endurance check or be afflicted with a festering wound: 1 Necrotic damage at the start of each of their turns until they recover any Wounds or combat is over.',
        melee('D6', 'Slashing', { onHit: async (C, me, tgt) => { const s = await C.save(tgt, 'Endurance', { label: 'resist the festering wound' }); if (!s.success) { tgt.fx.festering = true; C.log(`${C.nm(tgt)} is afflicted with a festering wound.`, 'bad'); } } })),
      A(3, 4, 'Grasp', null, "Opposed Athletics vs the Flesh Eater's Body. On a failure the target is Restrained, taking 1 Bludgeoning damage (ignoring Armor) at the start of their turn until free.", async (C, me, tgt) => {
        if (tgt.fx.graspedBy === me.uid) { C.log(`${me.name} waits, its rotting embrace tightening.`, 'enemy'); return; }
        const won = await C.opposed(tgt, 'Athletics', me, 'body', 'break free of the Grasp');
        if (!won) { C.addCond(tgt, 'Restrained', true); tgt.fx.graspedBy = me.uid; tgt.fx.graspDmg = { n: 1, type: 'Bludgeoning', by: me.uid }; C.log(`${C.nm(tgt)} is engulfed in ${me.name}'s rotting embrace!`, 'bad'); }
      }),
      A(5, 6, 'Slam', 'Physical', 'The Flesh Eater slams down with tremendous force, dealing D8 Bludgeoning damage.', melee('D8', 'Bludgeoning')),
    ],
  },
  necropede: {
    name: 'Necropede', one: 'Necropede', number: 1,
    desc: 'This grotesque fusion of insect and cadaver is a chilling sight to behold. Its razor-sharp pincers and venomous stinger are imbued with necromantic energy.',
    types: ['Animal', 'Undead'], mind: 40, endurance: 30, body: 25, health: 16, hitLoc: 'Serpentoid', weak: 'Head', armor: { Head: 2 }, combat: 50, mr: 40,
    spoils: 'resources', traits: ['Venomous'],
    adapt: [[5, { health: 4, dmg: 'D6', combat: 10 }], [10, { dmgFlat: 2, combat: 10 }]],
    actions: [
      A(1, 2, 'Bone Slam', 'Physical', 'The Necropede slams its skeletal body onto a target, dealing D6 Bludgeoning damage.', melee('D6', 'Bludgeoning')),
      A(3, 4, 'Soul Drain', 'Magical', 'The target must succeed on an Endurance check or take 2D4 Necrotic damage, and the Necropede gains Temporary Health equal to half the damage dealt.', async (C, me, tgt) => {
        const s = await C.save(tgt, 'Endurance', { label: 'resist Soul Drain', magical: true, source: me });
        if (!s.success) { const d = await C.harm(tgt, 'D4+D4', 'Necrotic', { source: me, label: 'Soul Drain' }); const g = Math.ceil(d / 2); me.hp += g; C.log(`${me.name} gains ${g} temporary Health.`, 'enemy'); }
      }),
      A(5, 6, 'Spinal Whip', null, 'All creatures make a Dodge check. Failure: D6 Piercing damage and knocked Prone. Success: half damage and not Prone.',
        allSave('Dodge', 'D6', 'Piercing', { half: true, onFail: (C, t) => C.addCond(t, 'Prone', true) })),
    ],
  },
  // ---- Overseers ----
  carnage: {
    name: 'Carnage Devourer', one: 'Carnage Devourer', number: 1, overseer: true,
    desc: 'A relentless embodiment of chaos and destruction, it strides as a colossal juggernaut. With its monstrous cleaver, it tears through both armor and flesh with ease.',
    types: ['Demon'], mind: 40, endurance: 60, body: 80, health: 30, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 60, mr: 30,
    spoils: 'overseer', traits: ['Penetrating (2)', 'Savage', 'Ruthlessness (1)'],
    adapt: [[5, { dmg: 'D6+2' }], [10, { health: 15, dmg: 'D10', combat: 10 }]],
    actions: [
      A(1, 1, 'Rampaging Charge', null, 'Each creature engaged with it must make a Dodge check or receive 2D8 Bludgeoning damage and be knocked Prone.', allSave('Dodge', '2D8', 'Bludgeoning', { onFail: (C, t) => C.addCond(t, 'Prone', true) })),
      A(2, 2, 'Flamebrand Cleave', 'Physical', 'Targets all creatures in the room, dealing D6 Slashing damage. Targets hit must also pass an Endurance check or receive the Burning condition.', async (C, me) => {
        C.destroyIcons();
        for (const t of C.pcSide()) await C.attack(me, t, { dmg: 'D6', type: 'Slashing', onHit: async (C2, m, tt) => { const s = await C.save(tt, 'Endurance', { label: 'avoid catching fire' }); if (!s.success) C.addCond(tt, 'Burning', true); } });
      }),
      A(3, 3, 'Earthshaker Slam', null, 'All creatures must make an Acrobatics check or be knocked Prone and take D6 Bludgeoning damage.', allSave('Acrobatics', 'D6', 'Bludgeoning', { onFail: (C, t) => C.addCond(t, 'Prone', true) })),
      A(4, 4, 'Rage Unleashed', null, 'Advantage on all attack rolls and +D6 damage for 2 rounds. It cannot be Frightened or Charmed during this time.', async (C, me) => { me.fx.rage = C.round + 2; C.log(`${me.name}'s fury intensifies!`, 'enemy'); }),
      A(5, 5, 'Annihilation Roar', 'Magical', 'All creatures must make a Resolve check or be Frightened (20).', allSave('Resolve', null, null, { onFail: (C, t, me) => C.addCond(t, 'Frightened', 20, me) })),
      A(6, 6, 'Devouring Blaze', 'Magical', 'All creatures must make a Dodge check or take D6 Fire damage and be set ablaze (Burning).', allSave('Dodge', 'D6', 'Fire', { onFail: (C, t) => C.addCond(t, 'Burning', true) })),
    ],
  },
  dreadlord: {
    name: 'Dreadlord', one: 'Dreadlord', number: 1, overseer: true,
    desc: 'The Dreadlord is a nightmarish enforcer of darkness and despair. With each gesture it commands an ethereal army of shadow reapers, each one a harbinger of impending doom.',
    types: ['Demon', 'Undead'], mind: 40, endurance: 40, body: 30, health: 20, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 40, mr: 50,
    spoils: 'overseer', traits: ['Ruthlessness (1)'],
    adapt: [[5, { health: 10, dmg: 'D6', combat: 10 }], [10, { health: 10, dmg: 'D6', combat: 10 }]],
    actions: [
      A(1, 1, 'Shadow Reapers', 'Magical', 'Summons D4 Shadow Reapers that each make a scythe attack (Combat Skill 40, D4 Cold damage) against a creature, then disappear.', async (C, me) => {
        const n = rnd(4); C.log(`${me.name} summons ${n} Shadow Reaper${n > 1 ? 's' : ''}!`, 'enemy');
        const side = C.pcSide();
        for (let i = 0; i < n; i++) { const t = side[i % side.length]; if (!t || C.dead(t)) continue; await C.attack({ ...C.ghost('Shadow Reaper', 40), uid: `reaper${i}` }, t, { dmg: 'D4', type: 'Cold' }); }
      }),
      A(2, 2, 'Aura of Despair', 'Magical', 'For D4 rounds, creatures that start their turn near the Dreadlord must make a Resolve check or be Frightened (10).', async (C, me) => { me.fx.despair = C.round + rnd(4); C.log(`An aura of despair radiates from ${me.name}.`, 'enemy'); }),
      A(3, 3, 'Ethereal Scythe', 'Physical', 'D8 Slashing damage. If the target is a PC, they must succeed on an Endurance check or have their maximum Toughness reduced by the damage taken until they finish a rest.', melee('D8', 'Slashing', {
        onHit: async (C, me, tgt, info) => { if (tgt.isPC && info.dealt > 0) { const s = await C.save(tgt, 'Endurance', { label: 'resist the Ethereal Scythe' }); if (!s.success) C.reduceMaxTough(info.dealt); } },
      })),
      A(4, 4, 'Shroud of Darkness', null, 'Becomes Resistant to all damage except Holy until the start of its next turn.', async (C, me) => { me.fx.resistAllBut = { except: ['Holy'], until: 'nextTurn' }; C.log(`${me.name} wraps itself in a shroud of darkness.`, 'enemy'); }),
      A(5, 5, 'Weakening Gaze', 'Magical', 'The target must pass an Endurance check or become infected with the Rot.', async (C, me, tgt) => { const s = await C.save(tgt, 'Endurance', { label: 'resist the Rot', magical: true, source: me }); if (!s.success) C.infectRot(tgt); }),
      A(6, 6, 'Abyssal Projectiles', 'Magical', 'Up to three targets must make a Spellward check, taking D6+2 Necrotic damage on a failed check.', upToThree('Spellward', 'D6+2', 'Necrotic')),
    ],
  },
  glacial: {
    name: 'Glacial Burrower', one: 'Glacial Burrower', number: 1, overseer: true,
    desc: 'A titanic behemoth of frozen fury capable of unleashing blizzard-like gusts that freeze all in their wake.',
    types: ['Animal', 'Elemental'], affinity: 'Cold', mind: 40, endurance: 70, body: 80, health: 30, hitLoc: 'Quadruped', weak: 'Head', armorAll: 1, combat: 60, mr: 30,
    spoils: 'overseer', traits: ['Penetrating (2)', 'Ruthlessness (1)'],
    adapt: [[5, { dmgFlat: 5, armor: 1 }], [10, { health: 10, dmg: 'D6', combat: 10 }]],
    actions: [
      A(1, 1, 'Blizzard Gust', 'Magical', 'A blast of freezing air in a cone, dealing 2D6 Cold damage to all characters.', allSave('Spellward', '2D6', 'Cold')),
      A(2, 2, 'Bone-Chilling Strike', 'Physical', 'Strikes a single creature, dealing D6+2 Bludgeoning damage.', melee('D6+2', 'Bludgeoning')),
      A(3, 3, 'Burrow Assault', null, 'Creatures must pass an Acrobatics check or take 2D6 Bludgeoning damage and be knocked Prone.', allSave('Acrobatics', '2D6', 'Bludgeoning', { onFail: (C, t) => C.addCond(t, 'Prone', true) })),
      A(4, 4, 'Icy Hailstones', 'Magical', 'Up to three targets take 2D6 Cold damage and must make an Athletics check or be knocked Prone.', upToThree('Spellward', '2D6', 'Cold', { onFail: async (C, t) => { const s = await C.save(t, 'Athletics', { label: 'keep your footing' }); if (!s.success) C.addCond(t, 'Prone', true); } })),
      A(5, 5, 'Frozen Rampage', null, 'Creatures must make a Dodge check or take 2D6 Bludgeoning damage and be knocked Prone.', allSave('Dodge', '2D6', 'Bludgeoning', { onFail: (C, t) => C.addCond(t, 'Prone', true) })),
      A(6, 6, 'Glacial Fury', null, 'Enemies take 1 Cold damage at the start of their turn for the next 2 rounds.', async (C, me) => { C.sideFx('glacialFury', C.round + 2); C.log('A chilling aura emanates from the Glacial Burrower.', 'enemy'); }),
    ],
  },
  gorehoof: {
    name: 'Gorehoof', one: 'Gorehoof', number: 1, overseer: true,
    desc: 'Gorehoof is the leader of clan Karth, bestial goatmen that pillage and kill with absolute savagery. Standing three meters tall and always wielding a cleaver almost as large as him.',
    types: ['Humanoid'], mind: 30, endurance: 70, body: 80, health: 30, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 65, mr: 50,
    spoils: 'overseer', traits: ['Penetrating (2)', 'Ruthlessness (1)', 'Frightening'],
    adapt: [[5, { dmg: 'D10', armor: 1 }], [10, { health: 10, dmg: 'D6', combat: 10 }]],
    actions: [
      A(1, 1, 'Cleaver Cleave', null, 'All creatures within the room must make a Dodge check or take D4 Slashing damage.', allSave('Dodge', 'D4', 'Slashing')),
      A(2, 2, 'Savage Charge', 'Physical', 'Gorehoof charges and makes a melee attack against a single target, dealing 3D6 Bludgeoning damage.', melee('3D6', 'Bludgeoning')),
      A(3, 3, 'Bloodlust Frenzy', null, 'Advantage on melee attack rolls and +D6 damage, but Vulnerable to all damage until the start of his next turn.', async (C, me) => { me.fx.frenzy = true; C.log('Gorehoof enters a bloodlust frenzy!', 'enemy'); }),
      A(4, 4, 'Rallying Roar', null, 'Gorehoof regains 2D4 Health.', async (C, me) => { const h = r('2D4'); C.heal(me, h); C.log(`Gorehoof roars and regains ${h} Health.`, 'enemy'); }),
      A(5, 5, 'Endurance Surge', null, 'Resistant to Bludgeoning, Piercing, and Slashing damage for 2 rounds.', async (C, me) => { me.fx.surge = C.round + 2; C.log('Gorehoof shrugs off pain and injuries.', 'enemy'); }),
      A(6, 6, 'Dominating Presence', null, 'All characters within the room must succeed on a Resolve check or be Frightened (20).', allSave('Resolve', null, null, { onFail: (C, t, me) => C.addCond(t, 'Frightened', 20, me) })),
    ],
  },
  archon: {
    name: 'Infernal Archon', one: 'Infernal Archon', number: 1, overseer: true,
    desc: "The Infernal Archon's very presence ignites the air, unleashing waves of scorching heat that sear the senses and smother hope.",
    types: ['Demon'], mind: 50, endurance: 40, body: 50, health: 20, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 50, mr: 50,
    spoils: 'overseer', traits: ['Ruthlessness (1)'],
    adapt: [[5, { health: 5, dmg: 'D6', combat: 10 }], [10, { health: 5, dmg: 'D8', combat: 10 }]],
    actions: [
      A(1, 1, 'Inferno Eruption', 'Magical', 'Creatures must make a Dodge check, taking 2D6 Fire damage on a failure, or half as much on a success.', allSave('Dodge', '2D6', 'Fire', { half: true })),
      A(2, 2, 'Shadow Veil', null, 'Advantage on any defensive checks until the end of its next turn.', async (C, me) => { me.fx.veil = C.round + 1; C.log(`${me.name} shrouds itself in shifting shadows.`, 'enemy'); }),
      A(3, 3, 'Demonic Conjuration', null, 'Summons D4 Lesser Demons to aid in battle (maximum of 4 present).', async (C, me) => {
        const present = C.enemies().filter((u) => u.def === 'lesserdemon').length; const n = Math.min(rnd(4), 4 - present);
        for (let i = 0; i < n; i++) C.spawn('lesserdemon');
        C.log(n ? `${me.name} summons ${n} Lesser Demon${n > 1 ? 's' : ''}!` : `${me.name} attempts to summon more demons, but the rift is full.`, 'enemy');
      }),
      A(4, 4, 'Infernal Barrage', 'Magical', 'A target must make a successful Dodge check or take D4+2 Fire damage.', async (C, me, tgt) => C.areaSave(me, [tgt], { skill: 'Dodge', dmg: 'D4+2', type: 'Fire' })),
      A(5, 5, 'Shadow Rift', 'Magical', 'All characters must make a Dodge check or receive 3D4 Fire damage.', allSave('Dodge', '3D4', 'Fire')),
      A(6, 6, 'Vortex of Annihilation', 'Magical', 'All characters must make a Spellward check or suffer 2D4 Fire damage.', allSave('Spellward', '2D4', 'Fire')),
    ],
  },
  tormentor: {
    name: 'Infernal Tormentor', one: 'Infernal Tormentor', number: 1, overseer: true,
    desc: 'A malevolent entity of raging flames and smoldering fury that stands as an embodiment of the infernal planes.',
    types: ['Demon'], mind: 70, endurance: 50, body: 60, health: 30, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 60, mr: 50,
    spoils: 'overseer', traits: ['Penetrating (2)', 'Frightening', 'Ruthlessness (1)', 'Swift'],
    adapt: [[5, { dmg: 'D6', armor: 1 }], [10, { health: 5, dmg: 'D6', combat: 10 }]],
    actions: [
      A(1, 1, 'Inferno Rain', 'Magical', 'Each creature must make a Dodge check, taking 2D4 Infernal damage on a failure, or half as much on a success.', allSave('Dodge', '2D4', 'Infernal', { half: true })),
      A(2, 2, 'Burning Grasp', 'Physical', 'A melee attack dealing D8 Infernal damage. The target must make an Athletics check or be Restrained, taking 1 Fire damage at the start of each of its turns while grappled.', melee('D8', 'Infernal', {
        onHit: async (C, me, tgt) => { const s = await C.save(tgt, 'Athletics', { label: 'escape the burning grasp' }); if (!s.success) { C.addCond(tgt, 'Restrained', true); tgt.fx.graspedBy = me.uid; tgt.fx.graspDmg = { n: 1, type: 'Fire', by: me.uid }; } },
      })),
      A(3, 3, 'Infernal Shapechange', null, 'Becomes Immune to Fire damage and Resistant to Bludgeoning, Piercing, and Slashing damage for 2 rounds.', async (C, me) => { me.fx.shapechange = C.round + 2; C.log(`${me.name} shifts its form!`, 'enemy'); }),
      A(4, 4, 'Fiery Eruption', 'Magical', 'Each creature must make a Dodge check, taking 3D4 Fire damage on a failure, or half as much on a success.', allSave('Dodge', '3D4', 'Fire', { half: true })),
      A(5, 5, 'Infernal Wrath', 'Physical', 'On a hit, the target takes 2D6 Infernal damage and is knocked Prone.', melee('2D6', 'Infernal', { onHit: async (C, me, tgt) => C.addCond(tgt, 'Prone', true) })),
      A(6, 6, 'Hellfire Nova', 'Magical', 'Each creature must make a Dodge check, taking D8 Fire + D4 Infernal damage on a failure, or half as much on a success.', async (C, me) => {
        C.destroyIcons();
        for (const t of C.pcSide()) {
          const s = await C.save(t, 'Dodge', { label: 'avoid the Hellfire Nova', source: me });
          const f = s.success ? 0.5 : 1;
          await C.harm(t, Math.ceil(r('D8') * f), 'Fire', { source: me, label: 'Hellfire Nova' });
          if (!C.dead(t)) await C.harm(t, Math.ceil(r('D4') * f), 'Infernal', { source: me, label: 'Hellfire Nova' });
        }
      }),
    ],
  },
  pyroclasmic: {
    name: 'Pyroclasmic Possessor', one: 'Pyroclasmic Possessor', number: 1, overseer: true,
    desc: 'This entity of fiery possession and smoldering dominance manifests as a malevolent spirit woven from the very flames of the abyss.',
    types: ['Demon'], mind: 40, endurance: 40, body: 40, health: 20, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 30, mr: 60,
    spoils: 'overseer', traits: ['Ruthlessness (2)'],
    adapt: [[5, { health: 5, dmg: 'D6', combat: 10 }], [10, { health: 5, dmg: 'D8', combat: 10 }]],
    actions: [
      A(1, 1, 'Infernal Possession', 'Magical', 'The target must succeed on a Resolve check or be possessed for 2 rounds, forced to attack its allies, or itself. It can repeat the Resolve check at the end of each of its turns.', async (C, me, tgt) => {
        const s = await C.save(tgt, 'Resolve', { label: 'resist possession', magical: true, source: me });
        if (!s.success) { tgt.fx.possessed = C.round + 2; C.log(`${C.nm(tgt)} is possessed by ${me.name}!`, 'bad'); }
      }),
      A(2, 2, 'Eruption of Flame', 'Magical', 'Creatures in the area must make a Dodge check, taking D6 Fire damage on a failure, or half as much on a success.', allSave('Dodge', 'D6', 'Fire', { half: true })),
      A(3, 3, 'Molten Projectiles', 'Magical', 'Up to three targets must make a Dodge check or suffer 2D6 Fire damage.', upToThree('Dodge', '2D6', 'Fire')),
      A(4, 4, 'Possessed Blaze', null, 'A swirling aura of fire for 2 rounds. Creatures engaged in combat with it gain the Burning condition.', async (C, me) => { me.fx.blaze = C.round + 2; for (const t of C.pcSide()) C.addCond(t, 'Burning', true); C.log(`${me.name} is wreathed in a swirling aura of fire.`, 'enemy'); }),
      A(5, 5, 'Burning Urge', null, 'A fiery command reverberates across the necropolis. Make a Tension Die check.', async (C) => { C.log('A fiery command reverberates across the necropolis...', 'enemy'); await C.tensionCheck(); }),
      A(6, 6, "Inferno's Grasp", null, 'The target must pass an Athletics check or take 2D4 Fire damage and be Restrained until the end of its next turn.', async (C, me, tgt) => C.areaSave(me, [tgt], { skill: 'Athletics', dmg: '2D4', type: 'Fire', onFail: (C2, t) => { C.addCond(t, 'Restrained', true); t.fx.restrainUntil = C.round + 1; } })),
    ],
  },
  veilshifter: {
    name: 'Veilshifter', one: 'Veilshifter', number: 1, overseer: true,
    desc: 'Veilshifter, the Illusory Archon, is a terrifying creature that commands illusions and weaves intricate webs of deceit.',
    types: ['Astral'], mind: 70, endurance: 40, body: 30, health: 25, hitLoc: 'Humanoid', weak: 'Head', armorAll: 1, combat: 40, mr: 50,
    spoils: 'overseer', traits: ['Ruthlessness (1)', 'Swift'],
    adapt: [[5, { health: 5, dmg: 'D6' }], [10, { health: 5, dmg: 'D6', combat: 10 }]],
    actions: [
      A(1, 1, 'Illusory Mirage', null, 'All attacks targeting it have Disadvantage until the end of its next turn.', async (C, me) => { me.fx.mirage = C.round + 1; C.log(`${me.name} splinters into illusory duplicates.`, 'enemy'); }),
      A(2, 2, 'Ethereal Distortion', 'Magical', 'All creatures in the area become Sickened (20) for D4 rounds.', allSave('Spellward', null, null, { onFail: (C, t) => { C.addCond(t, 'Sickened', 20); t.fx.sickUntil = C.round + rnd(4); } })),
      A(3, 3, 'Reality Flux', 'Magical', 'A torrent of illusions clashes upon a target, dealing 2D6 Arcane damage.', async (C, me, tgt) => C.areaSave(me, [tgt], { skill: 'Spellward', dmg: '2D6', type: 'Arcane' })),
      A(4, 4, 'Doppelganger Surge', null, 'Two illusory doppelgangers appear. They last until struck once, act once per round, and deal 2D4 Psychic damage with a Physical attack. Maximum 4 at a time.', async (C, me) => {
        const present = C.enemies().filter((u) => u.def === 'doppelganger').length; const n = Math.min(2, 4 - present);
        for (let i = 0; i < n; i++) { const d = C.spawn('doppelganger'); d.fx.mirage = C.round + 1; }
        C.log(n ? `${n} doppelgangers shimmer into existence!` : 'The Veilshifter flickers, but no more doppelgangers can appear.', 'enemy');
      }),
      A(5, 5, 'Dreamscape Shift', 'Magical', 'All creatures in the area must succeed on an Athletics check or fall Prone.', allSave('Athletics', null, null, { onFail: (C, t) => C.addCond(t, 'Prone', true) })),
      A(6, 6, 'Mystic Gaze', 'Magical', 'A target perceives illusory but very harmful threats, suffering 4D6 Arcane damage.', async (C, me, tgt) => C.areaSave(me, [tgt], { skill: 'Spellward', dmg: '4D6', type: 'Arcane' })),
    ],
  },
  siren: {
    name: 'Venomcloud Siren', one: 'Venomcloud Siren', number: 1, overseer: true,
    desc: 'The Venomcloud Siren is an eerie enchantress with a domain over the deadliest of toxins known to man.',
    types: ['Demon', 'Elemental'], affinity: 'Poison', mind: 50, endurance: 60, body: 40, health: 20, hitLoc: 'Serpentoid', weak: 'Head', armorAll: 1, combat: 40, mr: 50,
    spoils: 'overseer', traits: ['Penetrating (2)', 'Ruthlessness (1)'],
    adapt: [[5, { dmg: 'D10', armor: 1 }], [10, { health: 10, dmg: 'D6', combat: 10 }]],
    actions: [
      A(1, 1, 'Toxic Cloud', null, 'All creatures in the room must make an Endurance check or take 2D6 Poison damage.', allSave('Endurance', '2D6', 'Poison')),
      A(2, 2, 'Serpentine Strike', 'Physical', 'D6 Piercing damage. The target must pass an Endurance check or become Poisoned (1).', melee('D6', 'Piercing', { onHit: async (C, me, tgt) => { const s = await C.save(tgt, 'Endurance', { label: 'resist the venom' }); if (!s.success) C.addCond(tgt, 'Poisoned', 1); } })),
      A(3, 3, 'Venomous Projectiles', 'Magical', 'Up to three targets; each hit target takes 2D6 Poison damage.', upToThree('Spellward', '2D6', 'Poison')),
      A(4, 4, 'Ensnaring Thorns', 'Magical', 'Creatures in the area must make an Athletics check or be Restrained by the thorns.', allSave('Athletics', null, null, { onFail: (C, t) => C.addCond(t, 'Restrained', true) })),
      A(5, 5, 'Dreadful Siren Song', 'Magical', 'All creatures within the room must make a Resolve check or become Frightened (20).', allSave('Resolve', null, null, { onFail: (C, t, me) => C.addCond(t, 'Frightened', 20, me) })),
      A(6, 6, 'Toxic Infusion', null, 'Her next successful attack deals an extra 2D6 Poison damage.', async (C, me) => { me.fx.infusion = true; C.log(`${me.name} empowers herself with toxic magic.`, 'enemy'); }),
    ],
  },
  zephyrous: {
    name: 'Zephyrous Shadow', one: 'Zephyrous Shadow', number: 1, overseer: true,
    desc: 'The Zephyrous Shadow is an enigmatic force woven from the very threads of lightning and shadow.',
    types: ['Demon', 'Elemental'], affinity: 'Lightning', mind: 70, endurance: 50, body: 40, health: 20, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 50, mr: 50,
    spoils: 'overseer', traits: ['Penetrating (2)', 'Savage', 'Ruthlessness (1)', 'Swift'],
    adapt: [[5, { dmg: 'D10' }], [10, { health: 10, dmg: 'D6', combat: 10 }]],
    actions: [
      A(1, 1, 'Thunderbolt Barrage', 'Magical', 'Each creature must make a Dodge check, taking 2D6 Lightning damage on a failure, or half as much on a success.', allSave('Dodge', '2D6', 'Lightning', { half: true })),
      A(2, 2, 'Shadow Cloak', null, 'Attacks against it have Disadvantage, and it becomes Resistant to all damage except Arcane until the start of its next turn.', async (C, me) => { me.fx.resistAllBut = { except: ['Arcane'], until: 'nextTurn' }; me.fx.mirage = C.round + 1; C.log(`${me.name} melds into the shadows.`, 'enemy'); }),
      A(3, 3, 'Stormshroud', null, 'For the next 2 rounds, all creatures that attack it suffer 2 Lightning damage.', async (C, me) => { me.fx.stormshroud = C.round + 2; C.log(`${me.name} shrouds itself with lightning.`, 'enemy'); }),
      A(4, 4, 'Disruptive Curse', 'Magical', 'For the next 2 rounds, the target is Cursed and must pass a Resolve check each time it attacks, or do so with Disadvantage.', async (C, me, tgt) => C.areaSave(me, [tgt], { skill: 'Spellward', onFail: (C2, t) => { C.addCond(t, 'Cursed', { id: 'disruptive', text: 'Resolve check on each attack or Disadvantage', until: C.round + 2 }); } })),
      A(5, 5, 'Tempestuous Assault', 'Physical', 'A melee attack that deals D6+2 Force damage on a hit.', melee('D6+2', 'Force')),
      A(6, 6, 'Galeforce Surge', 'Magical', 'Each creature must make a Dodge check, taking 3D4 Force damage on a failure, or half as much on a success.', allSave('Dodge', '3D4', 'Force', { half: true })),
    ],
  },
  // ---- Summoned / minions ----
  lesserdemon: {
    name: 'Lesser Demon', one: 'Lesser Demon', number: 1, summoned: true,
    types: ['Demon'], restoredExtra: ['Fire'], mind: 40, endurance: 40, body: 20, health: 2, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 30, spoils: null, traits: [],
    actions: [A(1, 6, 'Demonic Slash', 'Physical', 'The Lesser Demon lashes with its claws at a target, dealing D4 Slashing damage.', melee('D4', 'Slashing'))],
  },
  doppelganger: {
    name: 'Doppelganger', one: 'Doppelganger', number: 1, summoned: true, struckOnce: true,
    types: ['Astral'], mind: 40, endurance: 40, body: 30, health: 1, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 40, mr: 50, spoils: null, traits: [],
    actions: [A(1, 6, 'Illusory Strike', 'Physical', 'A Physical attack dealing 2D4 Psychic damage.', melee('2D4', 'Psychic'))],
  },
  skeleton: {
    name: 'Skeleton', one: 'Skeleton', number: 1, minion: true,
    desc: 'These animated remnants form the backbone of many an army, and are the favored minions of gravecallers and necromancers all across the known world.',
    types: ['Undead'], mind: 40, endurance: 20, body: 20, health: 4, hitLoc: 'Humanoid', weak: 'Head', armor: {}, combat: 30, mr: 20, spoils: null, traits: [],
    actions: [
      A(1, 4, 'Rabid Slash', 'Physical', 'The Skeleton swings its weapon with little precision, dealing D4 Slashing damage.', melee('D4', 'Slashing')),
      A(5, 6, 'Ethereal Grasp', 'Magical', "If the target fails the Magic Resistance check they take D4 Necrotic damage, and the Skeleton regains 1 Health.", async (C, me, tgt) => {
        const s = await C.save(tgt, 'mr', { label: 'resist Ethereal Grasp', magical: true, source: me });
        if (!s.success) { await C.harm(tgt, 'D4', 'Necrotic', { source: me, label: 'Ethereal Grasp' }); C.heal(me, 1); }
      }),
    ],
  },
};

export async function etherealGrasp(C, me, tgt) {
  const s = await C.save(tgt, 'Endurance', { label: 'resist Ethereal Grasp', magical: true, source: me });
  if (s.success) { await C.harm(tgt, Math.ceil(r('D6') / 2), 'Necrotic', { source: me, label: 'Ethereal Grasp (halved)' }); return; }
  const d = await C.harm(tgt, 'D6', 'Necrotic', { source: me, label: 'Ethereal Grasp' });
  const h = Math.ceil(d / 2);
  if (h > 0) { C.heal(me, h); C.log(`${me.name} regains ${h} Health.`, 'enemy'); }
}

export const OVERSEERS = ['carnage', 'dreadlord', 'glacial', 'gorehoof', 'archon', 'tormentor', 'pyroclasmic', 'veilshifter', 'siren', 'zephyrous'];
export const FIRST_DOMAIN_ENCOUNTERS = [[1, 7, 'blightfang'], [8, 14, 'skeletal'], [15, 20, 'flesheater']];
