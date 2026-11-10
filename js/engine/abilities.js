// Mastery Abilities (all tiers), activated item powers, and combat Fragments.
import { S, uid } from '../state.js';
import { io } from '../io.js';
import { r, rnd, pick } from '../dice.js';
import { MASTERY_BY_ID, MASTERIES } from '../data/masteries.js';
import { CREATURES } from '../data/creatures.js';
import { HIT_LOCATIONS, CONDITIONS } from '../data/rules.js';
import {
  pc, mods, hasAbility, hasMastery, healWounds, healHealth, healTough, gainExh, gainSanity, check, clampStats, maxAether, skillValue, mainWeapon,
  hasShield, activeMasteries, SUSTAIN_COSTS, allItems,
} from './character.js';
import { pcAttack, applyPoolDamage, makeUnit, PCU } from './combat.js';
import { fragmentDef } from './loot.js';

const g = () => S.g;
const D = (sides, type, src) => ({ sides, type, src });
const Dn = (n, sides, type, src) => [...Array(n)].map(() => D(sides, type, src));
const AB = (id) => { const [m, t] = id.split('.'); const md = MASTERY_BY_ID[m]; const tier = md.tiers[+t - 1]; return { name: tier[0], line: tier[1], text: tier[2], mastery: md.name }; };
const half = () => Math.ceil(pc().level / 2);

export function payAether(n) {
  const p = pc(); const M = mods(); const c = g().combat;
  if (c && M.freeCast && !c.freeCastUsed && n > 0) { c.freeCastUsed = true; io.log('Your magic item lets you cast without spending Aether.', 'good'); return true; }
  const total = p.aether + p.tempAether;
  if (total < n) { io.log(`Not enough Aether (${total}/${n}).`, 'bad'); return false; }
  const fromTemp = Math.min(p.tempAether, n); p.tempAether -= fromTemp; p.aether -= n - fromTemp;
  io.refresh();
  return true;
}
const aetherOK = (n) => pc().aether + pc().tempAether >= n || (g().combat && mods().freeCast && !g().combat.freeCastUsed);

async function spell(C, t, pool, flat, o = {}) {
  const s = await C.save(t, 'mr', { label: 'Magic Resistance' });
  if (s.success) { io.log(`${t.name} resists the spell.`, 'dim'); return { dealt: 0, resisted: true }; }
  return applyPoolDamage(t, pool, flat, { ability: o.tag || true, ignoreArmor: true, ...o });
}
async function resisted(C, t) { const s = await C.save(t, 'mr', { label: 'Magic Resistance' }); if (s.success) io.log(`${t.name} resists.`, 'dim'); return s.success; }
async function pickTargets(C, o, n, label) {
  const es = C.enemies(); if (es.length <= n) return es;
  const out = [];
  while (out.length < n) { const t = await o.chooseEnemy(`${label}: choose target ${out.length + 1} of ${n}`); if (!out.includes(t)) out.push(t); }
  return out;
}

// ------------------------------------------------------------------ ability definitions
// cost: Aether; free: Free Action; actions: Standard Actions; magical; explore: usable out of combat;
// sustained: toggled; when(): returns a reason it can't be used, or null.
const DEFS = {
  'reaver.1': { cost: 4, magical: true, run: async (C, o) => spell(C, await o.target(), [D(6, 'Infernal'), D(4, 'Infernal')], 0) },
  'reaver.2': { sustained: true },
  'reaver.4': { cost: 5, when: () => (PCU.fx.demonShroud ? 'already active' : null), run: async () => { PCU.fx.demonShroud = true; io.log('Hellfire shrouds you: attackers who damage you suffer 1 Infernal damage.', 'good'); } },
  'reaver.5': { cost: 6, magical: true, run: async (C) => { let n = 0; for (const e of C.enemies()) { const r0 = await spell(C, e, Dn(2, 6, 'Infernal'), 0); if (r0.dealt > 0) n += 1; } if (n) gainSanity(2 * n); } },

  'arcanist.1': { cost: 4, magical: true, run: async (C, o) => { for (const t of await pickTargets(C, o, half(), 'Arcane Missiles')) await spell(C, t, [D(4, 'Arcane')], 0); } },
  'arcanist.3': { sustained: true, explore: true },
  'arcanist.4': { summon: 'arcanecompanion', actions: 2 },
  'arcanist.5': { cost: 7, magical: true, run: async (C, o) => spell(C, await o.target(), Dn(3, 10, 'Arcane'), 0) },

  'brawler.2': { run: async (C, o) => { await pcAttack(await o.target(), { label: 'Uppercut:', skill: 'Unarmed Combat & Fist Weapons', customPool: Dn(2, 8, 'Bludgeoning') }); PCU.fx.defPenaltyNext = -20; } },
  'brawler.3': { free: true, when: () => (g().combat.overwhelmUsed ? 'once per combat' : null), run: async (C, o) => { g().combat.overwhelmUsed = true; await pcAttack(await o.target(), { label: 'Overwhelm:', skill: 'Unarmed Combat & Fist Weapons', noDefense: true, extraPool: [D(8, 'Bludgeoning', 'Overwhelm')] }); } },
  'brawler.4': { run: async (C, o) => pcAttack(await o.target(), { label: 'Kidney Shot:', skill: 'Unarmed Combat & Fist Weapons', onHit: async (d, t) => C.addCond(t, 'Stunned', 2) }) },

  'bulwark.2': { when: () => (hasShield() ? null : 'needs a shield'), run: async (C, o) => pcAttack(await o.target(), { label: 'Shield Bash:', customPool: [D(4, 'Bludgeoning', 'Shield')], onHit: async (d, t) => C.addCond(t, 'Dazed', 2) }) },
  'bulwark.3': { when: () => (hasShield() ? null : 'needs a shield'), run: async (C, o) => { const t = await o.target(); await pcAttack(t, { label: 'Sword & Board:', onHit: async (d, tt) => { io.log('You follow up with your shield!', 'info'); await pcAttack(tt, { label: 'Shield strike:', customPool: [D(4, 'Bludgeoning', 'Shield')] }); } }); } },

  'duskblade.1': { cost: 3, magical: true, run: async (C, o) => { const t = await o.target(); if (!(await resisted(C, t))) C.addCond(t, 'Poisoned', 1); } },
  'duskblade.2': { cost: 5, magical: true, run: async (C, o) => { const t = await o.target(); if (!(await resisted(C, t))) { t.fx.weaken = C.round + r('D4+1'); io.log(`${t.name} is enfeebled: -20 when defending.`, 'good'); } } },
  'duskblade.3': { run: async (C, o) => pcAttack(await o.target(), { label: 'Sap:', hard: true, noDamage: true, onHit: async (d, t) => C.addCond(t, 'Stunned', 2) }) },
  'duskblade.4': { when: () => (g().domain.nodes[g().domain.cur].ruthlessUsed ? 'once per room' : null), run: async (C, o) => { g().domain.nodes[g().domain.cur].ruthlessUsed = true; await pcAttack(await o.target(), { label: 'Ruthless Strike:', forceCrit: true }); } },
  'duskblade.5': { cost: 6, when: () => (PCU.fx.invisible ? 'already invisible' : null), run: async () => { PCU.fx.invisible = true; io.log('You vanish from sight.', 'good'); } },

  'emissary.1': { cost: 4, explore: true, run: async () => { gainExh(2); await healWounds(rnd(4)); } },
  'emissary.2': { cost: 4, free: true, run: async () => { PCU.fx.unbreakable = 40; io.log('Your faith is unbreakable: +40 to your next attack.', 'good'); } },
  'emissary.3': { cost: 4, explore: true, when: () => (condList().length ? null : 'no conditions'), run: async () => { const c0 = await io.choose('Remove which condition?', condList().map((k) => ({ label: k, value: k }))); delete pc().cond[c0]; if (c0 === 'Restrained' && pc().cond.fx) { delete pc().cond.fx.graspedBy; delete pc().cond.fx.graspDmg; } io.log(`You are no longer ${c0}.`, 'good'); } },
  'emissary.4': { cost: 2, free: true, magical: true, run: async (C, o) => { const t = await o.target(); if (!(await resisted(C, t))) { t.fx.divineJustice = C.round + 1; io.log(`${t.name}'s Armor is negated.`, 'good'); } } },
  'emissary.5': { cost: 10, magical: true, run: async (C, o) => spell(C, await o.target(), Dn(3, 10, 'Holy'), 0) },

  'flamecaster.1': { cost: 4, magical: true, run: async (C, o) => spell(C, await o.target(), [D(6, 'Fire')], 0) },
  'flamecaster.2': { cost: 4, magical: true, run: async (C, o) => { for (const t of await pickTargets(C, o, half(), 'Flame Spray')) await spell(C, t, [D(4, 'Fire')], 0); } },
  'flamecaster.3': { cost: 6, magical: true, run: async (C, o) => { const t = await o.target(); if (!(await resisted(C, t))) { C.addCond(t, 'Restrained', true); t.fx.fireCage = true; } } },
  'flamecaster.4': { summon: 'fireelemental', actions: 2 },
  'flamecaster.5': { cost: 10, magical: true, run: async (C) => { for (const e of C.enemies()) await spell(C, e, Dn(3, 6, 'Fire'), 0); } },

  'frostweaver.1': { cost: 4, magical: true, run: async (C, o) => spell(C, await o.target(), [D(6, 'Cold')], 0, { tag: 'frost' }) },
  'frostweaver.3': { cost: 5, magical: true, run: async (C, o) => { for (const t of await pickTargets(C, o, half(), 'Ice Nova')) await spell(C, t, [D(6, 'Cold')], 0, { tag: 'frost' }); } },
  'frostweaver.4': { summon: 'frostelemental', actions: 2 },
  'frostweaver.5': { sustained: true, explore: true },

  'gravecaller.1': { special: 'skeleton' },
  'gravecaller.2': { cost: 2, when: () => (corpses() ? null : 'needs a corpse'), run: async (C) => { useCorpse(); io.log('The corpse bursts in a shower of necrotic gore!', 'good'); for (const e of C.enemies()) await applyPoolDamage(e, Dn(2, 4, 'Necrotic'), 0, { ability: true }); } },
  'gravecaller.3': { cost: 4, when: () => (g().combat.bloodskin ? 'once per combat' : pc().health <= 2 ? 'too little Health' : null), run: async () => { g().combat.bloodskin = true; pc().health -= 2; pc().effects.push({ id: 'bloodskin', name: 'Bloodskin', rounds: 999, eff: { armorAll: 1 } }); io.log('Blood forms a second skin over you: +1 Armor everywhere.', 'good'); } },
  'gravecaller.4': { summon: 'wight', actions: 2 },

  'hexmancer.1': { cost: 5, magical: true, run: async (C, o) => { const t = await o.target(); if (!(await resisted(C, t))) { C.addCond(t, 'Cursed', { id: 'sapVitality', text: 'Loses 5 Combat Skill every round (max -20)' }); t.fx.sapVitality = true; t.fx.sap = 5; } } },
  'hexmancer.2': { cost: 3, magical: true, run: async (C, o) => { const t = await o.target(); if (t.fx.enfeebled) { io.log('That enemy is already enfeebled.', 'dim'); return 'refund'; } if (!(await resisted(C, t))) { C.addCond(t, 'Cursed', { id: 'enfeeble', text: '+1 damage from all sources' }); t.fx.enfeebled = true; } } },
  'hexmancer.3': { cost: 5, magical: true, run: async (C, o) => { const t = await o.target(); if (await resisted(C, t)) C.addCond(t, 'Dazed', 2); else C.addCond(t, 'Stunned', 2); } },
  'hexmancer.4': { cost: 6, magical: true, run: async (C, o) => { const t = await o.target(); if (t.types.includes('Undead') || CREATURES[t.def].affinity === 'Necrotic') { io.log('Drain Lifeforce does not work on creatures Restored by Necrotic damage.', 'dim'); return; } const res = await spell(C, t, Dn(3, 6, 'Necrotic'), 0); if (res.dealt > 0) await healWounds(res.dealt); } },
  'hexmancer.5': { cost: 6, magical: true, run: async (C, o) => {
    const t = await o.target(); if (await resisted(C, t)) return;
    const locs = HIT_LOCATIONS[CREATURES[t.def].hitLoc || 'Body'].map((x) => x[2]);
    const loc = await io.choose('Putrefy which Hit Location?', locs.map((l) => ({ label: l, value: l })), { combat: true });
    t.fx.putrefy = loc; io.log(`Rot seeps into ${t.name}'s ${loc}.`, 'good');
  } },

  'iconcaller.1': { cost: 6, icon: 'restoring' },
  'iconcaller.2': { cost: 2, icon: 'vine' },
  'iconcaller.3': { cost: 8, icon: 'firebomb' },
  'iconcaller.4': { cost: 10, icon: 'razorwind' },
  'iconcaller.5': { cost: 10, icon: 'strength' },

  'mindbinder.1': { cost: 3, free: true, magical: true, run: async (C, o) => { const t = await o.target(); if (!(await resisted(C, t))) { t.fx.suppressed = g().combat.order[0] === 'pc' ? C.round : C.round + 1; io.log(`${t.name}'s mind is suppressed: no Magical actions until your next turn.`, 'good'); } } },
  'mindbinder.2': { explore: true, when: () => (pc().once.healMind ? 'once per Camp Rest' : null), run: async () => { pc().once.healMind = true; gainSanity(rnd(4)); } },
  'mindbinder.3': { cost: 10, when: () => (g().combat.overseer ? 'not against Overseers' : null), run: async () => { io.log('A wave of calm washes over your foes. They lose interest in you, and you slip away.', 'good'); return 'calmed'; } },
  'mindbinder.5': { cost: 0, magical: true, when: () => (maxAether() < 4 ? 'needs 4 Aether to sustain' : null), run: async (C, o) => {
    const t = await o.target(); if (t.overseer) { io.log("Dominate doesn't work on Overseers.", 'dim'); return 'refund'; }
    if (await resisted(C, t)) return;
    g().combat.units = g().combat.units.filter((u) => u !== t);
    t.side = 'ally'; t.dominated = true; t.name = `${t.name} (dominated)`; t.cond = {}; t.fx = {};
    pc().minions = (pc().minions || []).concat([t]); pc().sustained.push(`mindbinder.5#${t.uid}`); clampStats();
    io.log(`<b>${t.name}</b> now serves you.`, 'good');
  } },

  'ritualist.1': { cost: 5, magical: true, when: () => (pc().sup.ritual ? null : 'needs Ritual Components'), run: async (C, o) => {
    const t = await o.target(); const n = await askComponents('Astral Punishment: spend how many Ritual Components?', 1); if (!n) return 'refund';
    pc().sup.ritual -= n; await spell(C, t, Dn(n, 6, 'Arcane'), 0);
  } },
  'ritualist.2': { cost: 10, explore: true, when: () => (pc().sup.ritual >= 3 ? null : 'needs 3 Ritual Components'), run: async () => { const n = await askComponents('Aetheric Blessing: spend Ritual Components in sets of 3', 3); if (!n) return 'refund'; pc().sup.ritual -= n; await healWounds(r(`${n / 3}D6`)); } },
  'ritualist.3': { cost: 5, explore: true, when: () => (pc().sup.ritual >= 3 ? null : 'needs 3 Ritual Components'), run: async () => { const n = await askComponents('Cleanse Mind: spend Ritual Components in sets of 3', 3); if (!n) return 'refund'; pc().sup.ritual -= n; gainSanity(n / 3); } },
  'ritualist.4': { explore: true, when: () => (pc().sup.ritual < 5 ? 'needs 5 Ritual Components' : !pc().equip.main || pc().equip.main.kind !== 'weapon' ? 'needs a weapon' : pc().equip.main.sigil ? 'weapon already bears a sigil' : null), run: async () => { pc().sup.ritual -= 5; pc().equip.main.sigil = true; io.log(`You carve a Sigil of Power into your ${pc().equip.main.name}: +D10 Arcane damage.`, 'good'); } },
  'ritualist.5': { cost: 5, magical: true, run: async (C, o) => {
    const targets = [await o.target()];
    while (pc().sup.ritual >= 4 && C.enemies().length > targets.length) {
      const more = await io.choose(`Arcane Torrent: add another target for 4 Ritual Components? (you have ${pc().sup.ritual})`, [...C.enemies().filter((e) => !targets.includes(e)).map((e) => ({ label: e.name, value: e.uid })), { label: 'No more targets', value: null, cls: 'secondary' }], { combat: true });
      if (!more) break; pc().sup.ritual -= 4; targets.push(C.enemies().find((e) => e.uid === more));
    }
    for (const t of targets) await spell(C, t, Dn(2, 10, 'Arcane'), 0);
  } },

  'stormbrand.1': { sustained: true },
  'stormbrand.3': { cost: 5, magical: true, run: async (C) => { for (const e of C.enemies()) await spell(C, e, Dn(3, 4, 'Lightning'), 0); } },
  'stormbrand.4': { cost: 4, run: async (C, o) => pcAttack(await o.target(), { label: 'Thunderous Slice:', noDamage: true, onHit: async (d, t) => {
    const locs = HIT_LOCATIONS[CREATURES[t.def].hitLoc || 'Body'].map((x) => x[2]);
    const loc = await io.choose('Shatter the Armor of which Hit Location?', locs.map((l) => ({ label: l, value: l })), { combat: true });
    t.fx.armorMinus = { ...(t.fx.armorMinus || {}), [loc]: 99 }; io.log(`${t.name}'s ${loc} is laid bare.`, 'good');
  } }) },
  'stormbrand.5': { cost: 4, run: async (C) => { PCU.fx.ragingTurns = C.round + 3; PCU.fx.rageDazeAt = C.round + 4; g().combat.std += 1; io.log('Cataclysmic rage! +1 Standard Action per round for 3 rounds.', 'good'); } },

  'tracker.2': { when: () => (!g().combat.surpriseWon || g().combat.trapTried ? 'only as your first action after winning the Surprise check' : null), run: async () => { g().combat.trapTried = true; g().combat.trap = true; io.log('You set up a trap. It will spring on the first enemy to attack.', 'good'); } },

  'umbra.1': { sustained: true, explore: true },
  'umbra.2': { when: () => (pc().sanity > 1 ? null : 'too little Sanity'), run: async (C, o) => {
    const t = await o.target(); const max = Math.min(pc().sanity - 1, 8);
    const n = await io.choose('Shadow Madness: spend how much Sanity?', [...Array(max)].map((_, i) => ({ label: `${i + 1} (${i + 1}D4 Psychic)`, value: i + 1 })), { combat: true });
    pc().sanity -= n; io.log(`You tear ${n} Sanity from your own mind.`, 'bad'); await applyPoolDamage(t, Dn(n, 4, 'Psychic'), 0, { ability: true, magical: true });
  } },
  'umbra.3': { cost: 4, when: () => (pc().once.vanish ? 'once per Rest' : null), run: async () => { pc().once.vanish = true; io.log('Your shadow envelops you, and you slip away.', 'good'); return 'vanished'; } },
  'umbra.4': { run: async (C, o) => pcAttack(await o.target(), { label: 'Reaper:', reaper: true }) },
  'umbra.5': { cost: 10, run: async (C) => {
    const w = mainWeapon(); const u = summonUnit('shadowclone');
    u.combat = skillValue(w.skill); u.maxHp = u.hp = Math.max(4, pc().health); u.cloneDie = w.unarmed ? w.die : 6; u.cloneType = w.type; u.expireRound = C.round + r('D4+1');
    io.log(`Your shadow steps away from you to fight for ${u.expireRound - C.round} rounds.`, 'good');
  } },

  'weaponmaster.1': { run: async (C, o) => pcAttack(await o.target(), { label: 'Evasive Strike:', onHit: async () => { PCU.fx.evasive = true; io.log('Your next defensive check receives +10.', 'good'); } }) },
  'weaponmaster.2': { cost: 4, run: async (C, o) => pcAttack(await o.target(), { label: 'Sure Blow:', noDefense: true }) },
  'weaponmaster.3': { cost: 6, free: true, magical: true, run: async (C, o) => { const t = await o.target(); if (t.fx.overwhelmed) { io.log('Already overwhelmed.', 'dim'); return 'refund'; } if (!(await resisted(C, t))) { t.fx.overwhelmed = true; io.log(`${t.name} is overwhelmed: -20 Combat Skill.`, 'good'); } } },
  'weaponmaster.4': { cost: 4, run: async (C) => { for (const e of [...C.enemies()]) await pcAttack(e, { label: 'Thousand Strikes:', onHit: async (d, t) => C.addCond(t, 'Dazed', 1) }); } },
  'weaponmaster.5': { free: true, when: () => (PCU.fx.oneWithWeapon ? 'already active' : null), run: async () => { PCU.fx.oneWithWeapon = true; pc().tempTough += 10; io.log('You become one with your weapon: -30 to its Skill, +10 Temporary Toughness for this fight.', 'good'); } },

  'wraith.1': { cost: 5, when: () => (pc().effects.some((e) => e.id === 'combatAwareness') ? 'already active' : null), run: async () => { pc().effects.push({ id: 'combatAwareness', name: 'Combat Awareness', rounds: 999, eff: { skill: { Acrobatics: 20 } } }); io.log('+20 Acrobatics for the rest of combat.', 'good'); } },
  'wraith.3': { exh: 3, run: async () => { for (const m of pc().minions || []) m.fx.nextAtk = (m.fx.nextAtk || 0) + 30; PCU.fx.createOpening = true; io.log('You create an opening: your allies receive +30 to their next attack.', 'good'); } },
  'wraith.4': { run: async (C, o) => { const t = await o.target(); if (t.fx.exploited) { io.log('You already know its weakness.', 'dim'); return 'refund'; } t.fx.exploited = true; io.log(`You spot ${t.name}'s weakness: +10 to attacks and +1 damage against it.`, 'good'); } },
  'wraith.5': { run: async (C, o) => pcAttack(await o.target(), { label: 'Fast Strike:', onHit: async (d, t) => { io.log('You strike again!', 'info'); await pcAttack(t, { label: 'Fast Strike (second):' }); } }) },

  'wrathspawn.1': { run: async (C, o) => pcAttack(await o.target(), { label: 'Bash:', extraPool: [D(4, 'Bludgeoning', 'Bash')] }) },
  'wrathspawn.2': { exh: 2, run: async (C) => { for (const e of [...C.enemies()]) await pcAttack(e, { label: 'Sweeping Blow:' }); } },
  'wrathspawn.3': { run: async (C, o) => { PCU.fx.noDefense = C.round + 1; await pcAttack(await o.target(), { label: 'Reckless Attack:', extraPool: Dn(2, 6, 'Bludgeoning', 'Reckless') }); } },

  'zealot.1': { sustained: true },
  'zealot.2': { cost: 6, magical: true, run: async (C, o) => spell(C, await o.target(), Dn(2, 6, 'Holy'), 0) },
  'zealot.3': { explore: true, when: () => (pc().once.absolution ? 'once per Camp Rest' : null), run: async () => { pc().once.absolution = true; await healHealth(2); gainSanity(2); } },
  'zealot.4': { cost: 6, magical: true, run: async (C, o) => { const res = await spell(C, await o.target(), [D(4, 'Psychic')], 1); if (res.dealt > 0) gainSanity(res.dealt); } },
  'zealot.5': { sustained: true, explore: true },
};

function condList() { const p = pc(); return Object.keys(p.cond).filter((k) => CONDITIONS[k] && p.cond[k]); }
function corpses() { const c = g().combat; return (c?.corpses || 0) + (g().domain.nodes[g().domain.cur]?.corpses || 0); }
function useCorpse() { const c = g().combat; if (c?.corpses > 0) c.corpses -= 1; else g().domain.nodes[g().domain.cur].corpses -= 1; }
async function askComponents(prompt, step) {
  const have = pc().sup.ritual; const opts = [];
  for (let n = step; n <= Math.min(have, step * 6); n += step) opts.push({ label: `${n}`, value: n });
  if (!opts.length) return 0;
  return io.choose(`${prompt} (you have ${have})`, [...opts, { label: 'Cancel', value: 0, cls: 'secondary' }]);
}

function summonUnit(defId, sustainId) {
  const p = pc(); const u = makeUnit(defId, 0, 1);
  u.uid = uid(); u.side = 'ally';
  const same = (p.minions || []).filter((m) => m.def === defId).length;
  if (same) u.name = `${u.name} ${same + 1}`;
  p.minions = (p.minions || []).concat([u]);
  if (sustainId) p.sustained.push(`${sustainId}#${u.uid}`);
  clampStats(); io.refresh();
  return u;
}
export function raiseSkeleton(free = false) {
  const u = summonUnit('skeleton', free ? null : 'gravecaller.1');
  if (pc().inv.concat(Object.values(pc().equip)).some((i) => i?.name === 'Ring of Subjugated Servitude')) { const b = Math.ceil(pc().level / 2); u.maxHp += b; u.hp += b; }
  io.log(`<b>${u.name}</b> rises to fight for you.`, 'good');
  return u;
}

// ------------------------------------------------------------------ item powers
function itemPowers(inCombat) {
  const p = pc(); const M = mods(); const c = g().combat; const out = [];
  const add = (id, label, disabled, extra = {}) => out.push({ id: `item:${id}`, label, disabled, item: true, ...extra });
  if (M.healPower) add('healPower', `Healing armor: heal ${M.healPower} Wounds (once per Camp Rest)`, !!p.once.healPower);
  if (M.healD10) add('healD10', 'Magic item: recover D10 Wounds (once per Rest)', !!p.once.healD10);
  if (inCombat) {
    if (M.vines) add('vines', 'Armor vines: Restrain a target (once per Camp Rest)', !!p.once.vines);
    if (M.shadowForm) add('shadowForm', 'Become your own shadow: only Arcane damage harms you for D6+1 rounds (once per Domain)', !!g().domain.shadowFormUsed);
    if (M.kick) add('kick', 'Special strike: 2D6+2 Bludgeoning (Free Action, Unarmed check, once per Encounter)', !!c.kickUsed, { free: true });
    if (M.arcaneBurst) add('arcaneBurst', `Weapon burst: all enemies resist or take ${M.arcaneBurst} Arcane damage (once per room)`, !!g().domain.nodes[g().domain.cur].arcaneBurstUsed);
    if (M.berserk) add('berserk', 'Weapon fury: double your and incoming damage for D4 rounds (Free Action)', PCU.fx.berserkUntil >= c.round, { free: true });
    if (M.tempest) add('tempest', 'Ring of Arcane Tempest: 2D10 Arcane damage to all enemies (once per Camp Rest)', !!p.once.tempest);
    if (allItems().some((i) => i.name === 'Gloves of the Blazing Phoenix')) add('phoenix', 'Gloves of the Blazing Phoenix: summon a Fire Elemental for this room (once per Camp Rest)', !!p.once.phoenix);
  }
  return out;
}
async function runItemPower(C, id, o) {
  const p = pc(); const M = mods(); const c = g().combat;
  switch (id) {
    case 'healPower': p.once.healPower = true; await healWounds(r(M.healPower)); break;
    case 'healD10': p.once.healD10 = true; await healWounds(rnd(10)); break;
    case 'vines': { p.once.vines = true; const t = await o.target(); io.log('Vines sprout from your armor!', 'good'); C.addCond(t, 'Restrained', true); break; }
    case 'shadowForm': g().domain.shadowFormUsed = true; PCU.fx.shadowFormUntil = C.round + r('D6+1'); io.log('You become your own shadow.', 'good'); break;
    case 'kick': c.kickUsed = true; await pcAttack(await o.target(), { label: 'Special strike:', skill: 'Unarmed Combat & Fist Weapons', customPool: Dn(2, 6, 'Bludgeoning'), customFlat: 2 }); break;
    case 'arcaneBurst': g().domain.nodes[g().domain.cur].arcaneBurstUsed = true; io.log('Your weapon unleashes a burst of arcane energy!', 'good'); for (const e of C.enemies()) if (!(await resisted(C, e))) await C.harm(e, M.arcaneBurst, 'Arcane', { byPC: true, magical: true, label: 'Arcane burst' }); break;
    case 'berserk': PCU.fx.berserkUntil = C.round + rnd(4); io.log('Your weapon howls with fury!', 'good'); break;
    case 'tempest': p.once.tempest = true; for (const e of C.enemies()) await applyPoolDamage(e, Dn(2, 10, 'Arcane'), 0, { ability: true, magical: true }); break;
    case 'phoenix': { p.once.phoenix = true; const u = summonUnit('fireelemental'); u.fx.roomBound = true; io.log('A Fire Elemental bursts from your gloves!', 'good'); break; }
    default: break;
  }
}

// ------------------------------------------------------------------ listing
function unlocked() {
  const ids = [];
  for (const m of activeMasteries()) for (let t = 1; t <= m.tier; t++) ids.push(`${m.id}.${t}`);
  const grant = mods().grantAbility; if (grant && !ids.includes(grant)) ids.push(grant);
  return ids;
}
function describe(id, d) {
  const a = AB(id); const bits = [];
  if (d.sustained) bits.push(`${SUSTAIN_COSTS[id]} Aether sustained`);
  else if (d.summon) bits.push(`2 Standard Actions, ${SUSTAIN_COSTS[id]} Aether sustained`);
  else if (d.icon) bits.push(`${d.cost} Aether, Icon`);
  else { if (d.cost) bits.push(`${d.cost} Aether`); if (d.exh) bits.push(`${d.exh} Exhaustion`); if (d.free) bits.push('Free Action'); }
  return { label: `${a.name}${bits.length ? ` (${bits.join(', ')})` : ''}`, hint: a.text };
}

/** Abilities and item powers usable in combat right now. */
export function combatAbilities(C) {
  const p = pc(); const c = g().combat; const out = [];
  for (const id of unlocked()) {
    const d = DEFS[id]; if (!d) continue;
    if (d.sustained) { if (p.sustained.includes(id)) continue; const { label, hint } = describe(id, d); out.push({ id, label, hint, disabled: maxAether() < SUSTAIN_COSTS[id] }); continue; }
    const { label, hint } = describe(id, d);
    let why = d.when ? d.when() : null;
    if (d.cost && !aetherOK(d.cost)) why = 'not enough Aether';
    if (d.summon) why = maxAether() < SUSTAIN_COSTS[id] ? 'not enough Aether' : PCU.fx.channel ? 'already channeling' : null;
    if (d.special === 'skeleton') { const n = corpses(); out.push({ id, label: `Raise Skeleton (2 Standard Actions, 2 Aether sustained${n ? '' : ', needs a corpse'})`, hint: AB(id).text, disabled: !n || maxAether() < 2 || !!PCU.fx.channel }); continue; }
    if (d.icon) why = !aetherOK(d.cost) ? 'not enough Aether' : c.icons.includes(d.icon) ? 'already placed' : null;
    out.push({ id, label: why ? `${label} — ${why}` : label, hint, disabled: !!why, free: d.free, actions: 1 });
  }
  if (hasMastery('gravecaller') && (p.minions || []).some((m) => m.hp > 0 && CREATURES[m.def].types.includes('Undead'))) out.push({ id: 'gravecaller.f', label: 'Necrotic Vitality (sacrifice an Undead minion)', hint: MASTERY_BY_ID.gravecaller.feature[1] });
  for (const ip of itemPowers(true)) out.push(ip);
  return out;
}

/** Abilities usable outside combat. */
export function exploreAbilities() {
  const p = pc(); const out = [];
  for (const id of unlocked()) {
    if (id === 'mindbinder.4') { out.push({ id, label: 'Astral Projection: scout up to 5 rooms ahead (once per Camp Rest)', disabled: !!p.once.astral }); continue; }
    const d = DEFS[id]; if (!d) continue;
    const a = AB(id);
    if (d.sustained) {
      const on = p.sustained.includes(id);
      out.push({ id: `toggle:${id}`, label: on ? `Dismiss ${a.name} (frees ${SUSTAIN_COSTS[id]} Aether)` : `Activate ${a.name} (${SUSTAIN_COSTS[id]} Aether sustained)`, disabled: !on && maxAether() < SUSTAIN_COSTS[id] });
      continue;
    }
    if (d.special === 'skeleton') { const n = g().domain.nodes[g().domain.cur]?.corpses || 0; out.push({ id, label: `Raise Skeleton (2 Aether sustained)${n ? ` — ${n} corpse${n > 1 ? 's' : ''} here` : ' — needs a corpse'}`, disabled: !n || maxAether() < 2 }); continue; }
    if (d.summon) { out.push({ id, label: `${a.name} (${SUSTAIN_COSTS[id]} Aether sustained)`, disabled: maxAether() < SUSTAIN_COSTS[id] }); continue; }
    if (!d.explore) continue;
    let why = d.when ? d.when() : null;
    if (d.cost && !aetherOK(d.cost)) why = 'not enough Aether';
    out.push({ id, label: `${a.name}${d.cost ? ` (${d.cost} Aether)` : ''}${why ? ` — ${why}` : ''}`, disabled: !!why });
  }
  if (hasMastery('gravecaller') && (p.minions || []).some((m) => m.hp > 0)) out.push({ id: 'gravecaller.f', label: 'Necrotic Vitality (sacrifice an Undead minion)' });
  for (const ip of itemPowers(false)) out.push(ip);
  return out;
}

export function toggleSustained(sid) {
  const p = pc(); const a = AB(sid);
  if (p.sustained.includes(sid)) { p.sustained = p.sustained.filter((x) => x !== sid); io.log(`You dismiss ${a.name}.`, 'info'); }
  else { p.sustained.push(sid); io.log(`<b>${a.name}</b> is active. ${a.text}`, 'good'); clampStats(); }
  io.refresh();
}

async function sacrificeMinion() {
  const p = pc(); const list = (p.minions || []).filter((m) => m.hp > 0 && CREATURES[m.def].types.includes('Undead'));
  if (!list.length) return 'refund';
  const id = list.length === 1 ? list[0].uid : await io.choose('Sacrifice which minion?', list.map((m) => ({ label: m.name, value: m.uid })));
  p.minions = p.minions.filter((m) => m.uid !== id); p.sustained = p.sustained.filter((s) => !s.endsWith(`#${id}`));
  const ch = await io.choose('Necrotic Vitality: what do you recover?', [{ label: 'D4 Wounds', value: 'w' }, { label: '1 Sanity', value: 's' }]);
  if (ch === 'w') await healWounds(rnd(4)); else gainSanity(1);
  return 'ok';
}

/** Run an ability or item power. Returns 'refund' when cancelled, or a combat-ending result. */
export async function runAbility(C, id, o = {}) {
  const p = pc(); const c = g().combat; const fx = PCU.fx;
  if (id.startsWith('toggle:')) { toggleSustained(id.slice(7)); return 'ok'; }
  if (id === 'gravecaller.f') return sacrificeMinion();
  const target = async () => (o.target ? C.enemies().find((e) => e.uid === o.target) || C.enemies()[0] : o.chooseEnemy ? o.chooseEnemy('Target which enemy?') : C.enemies()[0]);
  const ctx = { ...o, target };
  if (id.startsWith('item:')) { await runItemPower(C, id.slice(5), ctx); io.refresh(); return 'ok'; }
  if (id === 'mindbinder.4') { p.once.astral = true; const { astralProjection } = await import('./explore.js'); await astralProjection(5); return 'ok'; }
  const d = DEFS[id]; if (!d) { io.log('That ability is not available.', 'dim'); return 'refund'; }
  const a = AB(id);
  if (!o.complete) io.log(`You use <b>${a.name}</b>.`, 'info');
  if (d.sustained) { toggleSustained(id); return 'ok'; }
  // Summons (2 Standard Actions)
  if (d.summon || d.special === 'skeleton') {
    const finish = () => {
      if (d.special === 'skeleton') { useCorpse(); const u = raiseSkeleton(); if (c) u.target = C.enemies()[0]?.uid; return; }
      const u = summonUnit(d.summon, id); if (c) u.target = C.enemies()[0]?.uid;
      io.log(`<b>${u.name}</b> answers your call.`, 'good');
    };
    if (!c || o.complete) { finish(); return 'ok'; }
    if (c.std >= 1) { c.std -= 1; finish(); return 'ok'; }
    fx.channel = { id }; fx.channeling = true;
    io.log('You begin the ritual. It completes at the start of your next turn (-10 to Reactions while channeling).', 'info');
    return 'ok';
  }
  // Icons
  if (d.icon) {
    if (!payAether(d.cost)) return 'refund';
    if (c.icons.length >= 2) { const drop = await io.choose('You can only have two Icons. Destroy which?', c.icons.map((i) => ({ label: i, value: i })), { combat: true }); c.icons = c.icons.filter((i) => i !== drop); }
    if (d.icon === 'vine') {
      const t = await target(); const s = await C.save(t, 'body', { label: 'Vine Icon' });
      if (s.success) { io.log(`${t.name} avoids the vines.`, 'dim'); return 'ok'; }
      C.addCond(t, 'Restrained', true); t.fx.vineIcon = true;
    }
    if (d.icon === 'firebomb') c.firebombAt = C.round + 1;
    if (d.icon === 'strength') { p.tempTough += 5; for (const m of p.minions || []) m.hp += 5; }
    c.icons.push(d.icon);
    io.log(`You place the ${a.name}.`, 'good');
    return 'ok';
  }
  if (d.when) { const why = d.when(); if (why) { io.log(`${a.name}: ${why}.`, 'dim'); return 'refund'; } }
  if (d.magical && fx.spellFail) { delete fx.spellFail; if (rnd(2) === 1) { io.log('Arcane feedback disrupts your focus. The spell fizzles!', 'bad'); if (d.cost) payAether(d.cost); return 'ok'; } }
  if (d.cost && !payAether(d.cost)) return 'refund';
  if (d.exh) gainExh(d.exh);
  const res = await d.run(C, ctx);
  io.refresh();
  return res || 'ok';
}

/** Use a fragment during combat. Returns falsy if not used, 'free' if a Free Action, true otherwise. */
export async function useFragmentInCombat(C, fr, o) {
  const p = pc(); const d = fragmentDef(fr); const c = g().combat; const fx = PCU.fx;
  io.log(`You use the <b>${d.name}</b>.`, 'info');
  const tgt = async () => o.chooseEnemy('Target which enemy?');
  switch (d.id) {
    case 1: p.flags.thornDagger = true; io.log('The next enemy you slay will rise as your Skeleton.', 'good'); return true;
    case 3: fx.dodgeBonus = { v: 30, until: c.round + 4 }; io.log('Illusory duplicates surround you: +30 Dodge for 4 rounds.', 'good'); return true;
    case 4: p.tempSanity += 10; io.log('+10 Temporary Sanity.', 'good'); return true;
    case 5: if (!(p.minions || []).length) { io.log('There is no ally to protect.', 'dim'); return false; } fx.blackHeart = true; io.log('The next blow meant for an ally will strike you instead.', 'good'); return 'free';
    case 6: { const t = await tgt(); const s = await check('Resolve', { label: 'Cracked Monocle', combat: true }); if (s.success) await applyPoolDamage(t, Dn(3, 10, 'Psychic'), 0, { ignoreArmor: true, magical: true }); return true; }
    case 7: for (const e of C.enemies()) await applyPoolDamage(e, Dn(3, 6, 'Acid'), 0, { ignoreArmor: true, magical: true }); return true;
    case 10: p.flags.athleticsBoost = 50; io.log('Your next Athletics check gains +50.', 'good'); return true;
    case 11: fx.ragingTurns = c.round + 4; c.std += 1; io.log('You gain +1 Standard Action for the next 4 rounds.', 'good'); return true;
    case 12: p.effects.push({ id: 'spikedGauntlet', name: 'Spiked Gauntlet', untilLeave: true, eff: { skill: { 'Unarmed Combat & Fist Weapons': 50 }, pool: [{ die: 6, type: 'Fire', src: 'Gauntlet' }, { die: 6, type: 'Fire', src: 'Gauntlet' }] } }); io.log('Searing pain courses through the gauntlet.', 'good'); return true;
    case 13: p.effects.push({ id: 'noSanityLoss', name: 'Emotionally detached', rooms: 4 }); return true;
    case 14: { const t = await tgt(); C.addCond(t, 'Restrained', true); return true; }
    case 15: { const t = await tgt(); await applyPoolDamage(t, Dn(3, 10, 'Psychic'), 0, { ignoreArmor: true, magical: true }); return true; }
    case 16: for (const e of C.enemies()) await applyPoolDamage(e, Dn(3, 4, 'Poison'), 0, { ignoreArmor: true, magical: true }); return true;
    case 17: { const t = await tgt(); C.addCond(t, 'Charmed', true); return true; }
    case 18: {
      const m = MASTERIES[rnd(20) - 1]; io.log(`The spellbook opens to the ${m.name} Mastery.`, 'info');
      const choices = [1, 2, 3, 4, 5].map((t) => `${m.id}.${t}`).filter((aid) => DEFS[aid] && DEFS[aid].run && !DEFS[aid].sustained);
      if (!choices.length) { io.log('None of its Abilities can be used right now.', 'dim'); return true; }
      const aid = await io.choose('Use which Ability (free of cost)?', choices.map((x) => ({ label: AB(x).name, hint: AB(x).text, value: x })), { combat: true });
      const before = p.aether; p.aether += 99; await runAbility(C, aid, o); p.aether = before; clampStats();
      return true;
    }
    case 19: { const v = r('2D10'); p.tempTough += v; io.log(`+${v} Temporary Toughness.`, 'good'); return true; }
    case 20: for (const e of C.enemies()) C.addCond(e, 'Dazed', 3); return true;
    default: io.log('This Fragment cannot be used in combat.', 'dim'); return false;
  }
}
