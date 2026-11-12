// Combat (Chapter III & V). Resumable at the start of each player turn.
import { S, save, settings, bump, uid } from '../state.js';
import { io, Death } from '../io.js';
import { r, rnd, roll, parseExpr, lookup, pick } from '../dice.js';
import { rollCheck, compareOpposed, describeRoll } from './rolls.js';
import { HIT_LOCATIONS, TYPE_RULES, ARMOR_IGNORING, PC_DEFENSIVE_MOVES, NPC_DEFENSIVE_MOVES, PC_FUMBLES, NPC_FUMBLES, OVERSEER_INFLUENCE, DAMAGE_TYPE_TABLE } from '../data/rules.js';
import { CREATURES } from '../data/creatures.js';
import { creatureCount } from '../data/creatures2.js';
import { WEAPONS } from '../data/items.js';
import {
  hasLight, pc, mods, check, skillValue, mainWeapon, hasShield, twoHanded, handsFree, damagePC, healWounds, healTough, gainSanity, loseSanity,
  gainExh, gainXP, hasAbility, hasMastery, hasPerk, maxTough, maxAether, checkGoals, abilityTier, clampStats,
} from './character.js';
import { rollSpoils, rollResources, rollValuable, rollPrecious, drinkPotion, potionName, fragmentDef } from './loot.js';
import { combatAbilities, runAbility, useFragmentInCombat } from './abilities.js';

const g = () => S.g;
const C = {}; // combat API given to creature actions and abilities

// ------------------------------------------------------------------ units
export const PCU = {
  uid: 'pc', isPC: true, side: 'pc',
  get name() { return pc().name; },
  get cond() { return pc().cond; },
  get fx() { const c = pc().cond; return c.fx || (c.fx = {}); },
};
const unitByUid = (id) => (id === 'pc' ? PCU : [...g().combat.units, ...(pc().minions || [])].find((u) => u.uid === id));
const def = (u) => CREATURES[u.def];
const nm = (u) => (u.isPC ? 'You' : u.name);
const isDead = (u) => (u.isPC ? pc().health <= 0 : u.hp <= 0);
const enemies = () => g().combat.units.filter((u) => u.hp > 0);
const minions = () => (pc().minions || []).filter((u) => u.hp > 0);
const pcSide = () => [PCU, ...minions()];
const traitVal = (u, t) => { const m = (def(u)?.traits || []).concat(u.extraTraits || []).map((x) => x.match(new RegExp(`^${t}(?: \\((\\d+)\\))?$`))).find(Boolean); return m ? (m[1] ? +m[1] : true) : 0; };

export function makeUnit(defId, idx, total) {
  const d = CREATURES[defId]; const G = g(); const lvl = pc().level;
  const u = {
    uid: uid(), def: defId, name: total > 1 ? `${d.one} ${idx + 1}` : d.one, side: d.minion ? 'ally' : 'enemy',
    hp: d.health, maxHp: d.health, combat: d.combat, mind: d.mind, body: d.body, endurance: d.endurance, mr: d.mr,
    armor: { ...(d.armor || {}) }, armorAll: d.armorAll || 0, dmgDice: [], dmgFlat: 0, cond: {}, fx: {}, extraTraits: [], influences: [],
    types: d.types, overseer: !!d.overseer,
  };
  if (d.healthPerLvl) u.maxHp += d.healthPerLvl * lvl;
  for (const [lv, a] of d.adapt || []) {
    if (lvl > lv) {
      if (a.health) u.maxHp += a.health; if (a.combat) u.combat += a.combat; if (a.armor) u.armorAll += a.armor;
      if (a.dmg) u.dmgDice.push(a.dmg); if (a.dmgFlat) u.dmgFlat += a.dmgFlat; if (a.mr) u.mr += a.mr;
      if (a.armorExcept) { u.armorAll += 1; u.armor[a.armorExcept] = (u.armor[a.armorExcept] || 0) - 1; }
    }
  }
  if (d.minion && d.types.includes('Undead') && hasAbility('gravecaller.5')) { u.maxHp += 2; u.dmgDice.push('D6'); }
  if (!d.minion && !d.overseer && G.domain && !G.domain.overseerDefeated) {
    for (const inf of G.domain.influences || []) applyInfluence(u, inf);
  }
  u.hp = u.maxHp;
  return u;
}
function applyInfluence(u, inf) {
  const i = typeof inf === 'object' ? inf : { id: inf };
  u.influences.push(i.id);
  switch (i.id) {
    case 2: { let n = 0; for (let k = 0; k < Math.floor(u.maxHp / 5); k++) n += rnd(6); u.maxHp += n; break; }
    case 3: u.dmgFlat += 1; break;
    case 4: u.combat += 10; break;
    case 5: u.mr += 10; break;
    case 6: u.fx.infResist = (u.fx.infResist || []).concat([i.dt || lookup(DAMAGE_TYPE_TABLE, rnd(20))]); break;
    case 9: u.mind += 20; break;
    case 10: u.extraTraits.push('Penetrating (1)'); break;
    default: break;
  }
}
function unitTypeRules(u) {
  const out = { vulnerable: [], restored: [], immuneCond: [], resist: [], immune: [] };
  for (const t of u.types || []) { const tr = TYPE_RULES[t] || {}; for (const k of Object.keys(out)) out[k].push(...(tr[k] || [])); }
  const d = def(u);
  if (d.affinity) out.restored.push(d.affinity);
  if (d.restoredExtra) out.restored.push(...d.restoredExtra);
  if (d.vulnerableExtra) out.vulnerable.push(...d.vulnerableExtra);
  if (u.fx.infResist) out.resist.push(...u.fx.infResist);
  if (u.fx.shapechange >= g().combat.round) { out.immune.push('Fire'); out.resist.push('Bludgeoning', 'Piercing', 'Slashing'); }
  if (u.fx.surge >= g().combat.round) out.resist.push('Bludgeoning', 'Piercing', 'Slashing');
  return out;
}

// ------------------------------------------------------------------ conditions
function condImmune(t, name) {
  if (t.isPC) {
    const M = mods();
    if (t.fx.immuneAllCond) return true;
    if ((M.immuneCond || []).includes(name)) return true;
    if (hasAbility('reaver.3') && ['Frightened', 'Poisoned'].includes(name)) return true;
    return false;
  }
  if (t.fx.rage >= g().combat?.round && ['Frightened', 'Charmed'].includes(name)) return true;
  return unitTypeRules(t).immuneCond.includes(name);
}
const STACKING = ['Bleeding', 'Poisoned', 'Frightened', 'Sickened', 'Stunned', 'Dazed'];
C.addCond = (t, name, v = true) => {
  if (condImmune(t, name)) { io.log(`${nm(t)} ${t.isPC ? 'are' : 'is'} immune to ${name}.`, 'dim'); return; }
  if (name === 'Cursed' && typeof v === 'object') { t.cond.Cursed = (t.cond.Cursed || []).concat([v]); }
  else if (typeof v === 'number' && STACKING.includes(name)) t.cond[name] = (t.cond[name] || 0) + v;
  else t.cond[name] = v;
  if (name === 'Poisoned') t.fx.poisonedRound = g().combat?.round || 0;
  io.log(`${nm(t)} ${t.isPC ? 'are' : 'is'} <b>${name}</b>${typeof v === 'number' ? ` (${t.cond[name]})` : ''}.`, t.isPC ? 'bad' : 'good');
  io.refresh();
};
const hasCond = (t, n) => !!t.cond[n];

// ------------------------------------------------------------------ damage
/** Roll a damage pool. dice: [{sides, type}] flat: number. Returns {values:[{sides,type,v}]} */
function rollPool(dice) { return dice.map((d) => ({ ...d, v: rnd(d.sides) })); }
function exprToDice(expr, type) {
  const { dice, mod } = parseExpr(expr);
  return { dice: dice.map((d) => ({ sides: d.sides, type })), flat: mod };
}

/** Damage to a non-PC unit after armor. Returns damage dealt. */
function damageUnit(t, amount, type, opts = {}) {
  const tr = unitTypeRules(t);
  let dmg = amount;
  const notes = [];
  if (t.fx.resistAllBut && !t.fx.resistAllBut.except.includes(type)) tr.resist.push(type);
  const physical = ['Bludgeoning', 'Piercing', 'Slashing'].includes(type) && !opts.magical;
  if (def(t).resistPhysical && physical) tr.resist.push(type);
  if (t.fx.incorporeal && !opts.magical) { io.log(`${t.name} is incorporeal; the blow passes through it.`, 'dim'); return 0; }
  if (t.side === 'ally' && PCU.fx.blackHeart && amount > 0) { delete PCU.fx.blackHeart; io.log('The black heart crumbles: you take the blow instead.', 'info'); g().combat.queuedPCDamage = (g().combat.queuedPCDamage || 0) + amount; return 0; }
  if (t.fx.frenzy) tr.vulnerable.push(type);
  if (t.fx.enfeebled && dmg > 0) { dmg += 1; notes.push('enfeebled'); }
  if (tr.restored.includes(type)) {
    const before = t.hp; t.hp = Math.min(t.maxHp, t.hp + dmg);
    io.log(`${t.name} is Restored by ${type} damage (+${t.hp - before} Health).`, 'bad'); return 0;
  }
  if (tr.immune.includes(type)) { io.log(`${t.name} is Immune to ${type}.`, 'bad'); return 0; }
  const res = tr.resist.includes(type); const vul = tr.vulnerable.includes(type);
  if (res && !vul) { dmg = Math.ceil(dmg / 2); notes.push('resistant'); }
  if (vul && !res) { dmg *= 2; notes.push('vulnerable'); }
  if (opts.minDamage && dmg < opts.minDamage) dmg = opts.minDamage;
  dmg = Math.max(0, dmg);
  if (def(t).struckOnce && opts.hit) dmg = Math.max(dmg, t.hp);
  t.hp -= dmg;
  io.log(`${t.name} takes <b>${dmg}</b> ${type} damage${notes.length ? ` <span class="dim">(${notes.join(', ')})</span>` : ''}.${t.hp <= 0 ? ' <b>It falls!</b>' : ''}`, t.side === 'ally' ? 'bad' : 'good');
  if (t.side === 'enemy' && opts.byPC && dmg > 0) { bump(`dmg.${type}`, dmg); if (opts.arcaneFeedback) t.fx.feedback = (t.fx.feedback || 0) + 1; }
  if (t.cond.Sleeping) delete t.cond.Sleeping;
  if (t.side === 'enemy' && dmg > 0) for (const v of pcSide()) {
    if (v.fx.graspedBy === t.uid && v.fx.escapeDmg) { v.fx.escapeDmg -= dmg; if (v.fx.escapeDmg <= 0) { releaseGrasp(v); io.log(`${nm(v)} ${v.isPC ? 'break' : 'breaks'} free!`, 'good'); } }
  }
  if (t.hp <= 0) { for (const v of pcSide()) if (v.fx.graspedBy === t.uid) releaseGrasp(v); onUnitDeath(t, opts); }
  return dmg;
}

function releaseGrasp(v) { delete v.cond.Restrained; delete v.fx.graspedBy; delete v.fx.graspDmg; delete v.fx.escapeDmg; }

function onUnitDeath(t, opts) {
  const c = g().combat;
  if (t.side === 'ally') {
    pc().minions = (pc().minions || []).filter((m) => m.uid !== t.uid);
    pc().sustained = pc().sustained.filter((s) => !s.endsWith(`#${t.uid}`));
    return;
  }
  if (def(t).summoned) return;
  if (opts.byPC !== false) {
    bump('kills'); for (const ty of t.types) bump(`killsType.${ty}`);
    if (opts.skill) bump(`killsSkill.${opts.skill}`);
  }
  if (t.types.some((x) => x === 'Humanoid' || x === 'Animal')) c.corpses = (c.corpses || 0) + 1;
  c.dead = (c.dead || []).concat([t.def]);
  if (t.influences.includes(8)) c.pendingUnstable = (c.pendingUnstable || 0) + 1;
  const M = mods();
  if (opts.byPC && M.healOnKill) c.healOnKill = (c.healOnKill || 0) + M.healOnKill;
  if (opts.byPC && opts.weapon && M.killTempTough) { const v = rnd(6); pc().tempTough += v; io.log(`You gain ${v} Temporary Toughness.`, 'good'); }
  if (opts.byPC && opts.weapon && M.killTempAether) { const v = rnd(6); pc().tempAether += v; io.log(`You gain ${v} Temporary Aether.`, 'good'); }
  if (opts.reaper) gainSanity(r('D6'));
  if (opts.byPC && pc().flags.thornDagger) { delete pc().flags.thornDagger; c.raiseSkeleton = true; }
}

/** Generic harm (no hit location): used by area effects and spells. */
C.harm = async (t, amountOrExpr, type, opts = {}) => {
  let amount = amountOrExpr;
  if (typeof amountOrExpr === 'string') {
    const { dice, flat } = exprToDice(amountOrExpr, type);
    const src = opts.source && !opts.source.isPC ? opts.source : null;
    if (src) { for (const e of src.dmgDice || []) dice.push(...exprToDice(e, type).dice); }
    const vals = rollPool(dice);
    amount = Math.max(...vals.map((x) => x.v), 0) + flat + (src?.dmgFlat || 0);
  }
  if (opts.half) amount = Math.ceil(amount / 2);
  if (opts.double) amount *= 2;
  if (isDead(t)) return 0;
  if (!t.isPC && opts.byPC && opts.magical === undefined) opts.magical = true;
  if (t.isPC) return damagePC(amount, type, { label: opts.label, magic: opts.magic, source: opts.source });
  return damageUnit(t, amount, type, opts);
};
C.heal = (u, n) => { if (u.isPC) return healWounds(n); u.hp = Math.min(u.maxHp, u.hp + n); return n; };
C.dead = isDead;
C.nm = nm;
C.log = (m, c) => io.log(m, c);
C.enemies = enemies;
C.pcSide = pcSide;
C.ghost = (name, combat) => ({ uid: 'ghost', name, side: 'enemy', combat, cond: {}, fx: {}, types: [], dmgDice: [], dmgFlat: 0, def: 'lesserdemon', ghost: true });
C.spawn = (defId) => { const u = makeUnit(defId, enemies().length, 2); u.name = `${CREATURES[defId].one}`; g().combat.units.push(u); assignTargets(); return u; };
C.destroyIcons = () => { const c = g().combat; if (c.icons?.length) { io.log('The area attack destroys your Icons!', 'bad'); c.icons = []; } };
C.sideFx = (k, v) => { g().combat.sideFx = { ...(g().combat.sideFx || {}), [k]: v }; };
C.reduceMaxTough = (n) => { const p = pc(); p.flags.toughPenalty = (p.flags.toughPenalty || 0) + n; clampStats(); io.log(`Your maximum Toughness is reduced by ${n} until you rest.`, 'bad'); };
C.infectRot = () => { const p = pc(); if (!p.rotInfected) { p.rotInfected = true; io.log('<b>You are infected with the Rot.</b>', 'bad'); } };
C.tensionCheck = async () => { const { tensionCheck } = await import('./explore.js'); await tensionCheck(); };
Object.defineProperty(C, 'round', { get: () => g().combat.round });
/** A creature holds its target (Restrained), optionally dealing damage at the start of each of the target's turns. */
C.grasp = (me, t, o = {}) => {
  C.addCond(t, 'Restrained', true);
  if (!t.cond.Restrained) return;
  if (!o.noHold) t.fx.graspedBy = me.uid;
  if (o.dmg) t.fx.graspDmg = { n: o.dmg, type: o.type, by: me.uid };
  if (o.escapeDmg) t.fx.escapeDmg = o.escapeDmg;
};
C.reduceMaxHealth = (n) => { const p = pc(); p.flags.healthPenalty = (p.flags.healthPenalty || 0) + n; clampStats(); io.log(`Your maximum Health is reduced by ${n} until your next Camp Rest.`, 'bad'); };
/** Damage that goes straight to Health, bypassing Toughness. */
C.healthDamage = async (t, n, type, label) => {
  if (!t.isPC) return damageUnit(t, n, type, {});
  const p = pc(); p.health -= n; io.log(`${label}: you lose <b>${n}</b> Health (bypassing Toughness).`, 'bad');
  if (p.health <= 0) { const { Death: D } = await import('../io.js'); throw new D(label); }
  io.refresh(); return n;
};
/** Temporary Health for a creature until the start of its next turn. */
C.tempHp = (u, n) => { if (n <= 0) return; u.hp += n; u.fx.tempHp = (u.fx.tempHp || 0) + n; io.log(`${u.name} gains ${n} temporary Health.`, 'enemy'); };
C.blindBriefly = (t) => { C.addCond(t, 'Blinded', true); t.fx.blindUntil = g().combat.round + 1; };
C.unarmored = (t) => (t.isPC ? !['head', 'torso', 'arms', 'legs'].some((s) => pc().equip[s]) : !(t.armorAll || Object.values(t.armor || {}).some((x) => x > 0)));
C.pcTough = () => pc().tough;
C.selfDestruct = (me) => { me.hp = 0; io.log(`${me.name} is destroyed in the process.`, 'good'); onUnitDeath(me, { byPC: false }); };
/** An immediate Armor Integrity check on the PC's armor (random location if none is given). */
C.integrity = async (t, loc) => {
  if (!t.isPC) return;
  const map = { Head: 'head', Chest: 'torso', Abdomen: 'torso', 'Left Arm': 'arms', 'Right Arm': 'arms', 'Left Leg': 'legs', 'Right Leg': 'legs' };
  const slot = loc ? map[loc] : pick(['head', 'torso', 'arms', 'legs']);
  const it = pc().equip[slot]; if (!it || !it.integ || it.relic) return;
  integrityRoll(slot);
};
C.corrode = (t) => {
  if (!t.isPC) { t.armorAll = Math.max(0, (t.armorAll || 0) - 1); return; }
  const worn = ['head', 'torso', 'arms', 'legs'].filter((s) => pc().equip[s]);
  if (!worn.length) return;
  const it = pc().equip[pick(worn)]; it.acid = (it.acid || 0) + 1; io.log(`Acid eats into your ${it.name}.`, 'bad');
};
/** A minion casts a spell at an enemy (Magic Resistance negates). Returns true if it landed. */
C.minionSpell = async (me, t, dmg, type) => {
  const s = await C.save(t, 'mr', { label: 'Magic Resistance' });
  if (s.success) { io.log(`${t.name} resists.`, 'dim'); return false; }
  await C.harm(t, dmg, type, { source: me, label: me.name, magical: true });
  return true;
};

// ------------------------------------------------------------------ saves (checks made by any side)
function unitStat(u, skill) {
  if (['Dodge', 'Acrobatics', 'Athletics', 'body'].includes(skill)) return u.body;
  if (skill === 'Endurance' || skill === 'endurance') return u.endurance;
  if (skill === 'Resolve' || skill === 'mind' || skill === 'Perception') return u.mind;
  return u.mr + (u.fx.sanctuary ? 20 : 0);
}
C.save = async (t, skill, opts = {}) => {
  if (t.isPC) {
    const p = pc(); const fx = PCU.fx; let mod = 0; let adv = false; let dis = false;
    let name = skill === 'mr' ? 'Spellward' : skill;
    if (name === 'Dodge' && mods().hardToHit && skillValue('Acrobatics') > skillValue('Dodge')) name = 'Acrobatics';
    if (name === 'Spellward') {
      if (fx.spellwardMod && fx.spellwardMod.until >= g().combat.round) mod += fx.spellwardMod.v;
      if (fx.spellwardDis) { dis = true; delete fx.spellwardDis; }
      if (fx.spellwardBonus) { mod += fx.spellwardBonus; delete fx.spellwardBonus; }
    }
    if (['Dodge', 'Acrobatics', 'Spellward'].includes(name) && fx.nextDefMod) { mod += fx.nextDefMod; delete fx.nextDefMod; }
    if (name === 'Dodge' && fx.dodgeBonus && fx.dodgeBonus.until >= g().combat.round) mod += fx.dodgeBonus.v;
    if (['Dodge', 'Acrobatics'].includes(name) && fx.crippled >= g().combat.round) dis = true;
    if (fx.plague >= g().combat.round || fx.nextCheckDis) { dis = true; delete fx.nextCheckDis; }
    const c = await check(name, { mod, adv, dis, label: opts.label, combat: true });
    const out = { success: c.success, crit: c.crit, fumble: c.fumble };
    if (name === 'Spellward' && c.crit) { p.cond.spellResist = true; fx.spellResistUntil = g().combat.round + rnd(4); io.log('Unbreakable Will: you are Resistant to magic damage for a few rounds.', 'good'); }
    if ((name === 'Spellward' || name === 'Dodge') && c.fumble) { out.double = true; io.log(name === 'Dodge' ? 'Clumsy Misstep: you receive double damage!' : 'Magical Vulnerability: double damage!', 'bad'); }
    if (name === 'Dodge' && c.crit) { fx.dodgeBonus = { v: 20, until: g().combat.round + 1 }; }
    return out;
  }
  let target = unitStat(t, skill);
  if (t.cond.Sickened) target -= t.cond.Sickened;
  if (t.cond.Freezing) target -= 10;
  if (t.cond.Restrained && ['Dodge', 'Acrobatics', 'Athletics', 'body'].includes(skill)) target -= 20;
  const res = rollCheck(target);
  io.log(`${t.name} ${opts.label ? `(${opts.label}) ` : ''}${describeRoll(res)}`, 'roll dim');
  return { success: res.success, crit: res.crit, fumble: res.fumble };
};
C.opposed = async (pcSideUnit, skill, enemy, stat, label) => {
  // Returns true if the pc-side unit wins
  for (;;) {
    let a;
    if (pcSideUnit.isPC) a = await check(skill, { label, combat: true, quiet: false });
    else { a = rollCheck(unitStat(pcSideUnit, skill)); }
    const b = rollCheck(unitStat(enemy, stat));
    io.log(`${enemy.name} ${describeRoll(b)}`, 'roll dim');
    const cmp = compareOpposed(a, b);
    if (cmp !== 0) return cmp > 0;
  }
};

/** Area/targeted save-or-suffer used by creature actions. */
C.areaSave = async (me, targets, o) => {
  if (o.area) C.destroyIcons();
  for (const t of targets) {
    if (isDead(t)) continue;
    const magical = o.skill === 'Spellward';
    const s = await C.save(t, o.skill, { label: o.label || `avoid ${me.name}`, magical, source: me });
    if (!s.success) {
      if (o.dmg) {
        const d = await C.harm(t, o.dmg, o.type, { source: me, label: me.name, double: s.double, magic: magical });
        if (o.drain && d > 0) { C.heal(me, Math.ceil(d * o.drain)); io.log(`${me.name} regains Health.`, 'enemy'); }
        if (o.tempDrain && d > 0) C.tempHp(me, Math.ceil(d * o.tempDrain));
      }
      if (o.onFail && !isDead(t)) await o.onFail(C, t, me);
    } else {
      if (o.dmg && o.half) await C.harm(t, o.dmg, o.type, { source: me, label: `${me.name} (halved)`, half: true, magic: magical });
      if (o.onSuccess) await o.onSuccess(C, t, me);
    }
  }
};

// ------------------------------------------------------------------ hit locations
function rollLocation(table) { return lookup(HIT_LOCATIONS[table] || HIT_LOCATIONS.Body, rnd(20)); }
function unitArmorAt(u, loc) {
  let a = (u.armor[loc] || 0) + (u.armorAll || 0) - ((u.fx.armorMinus || {})[loc] || 0);
  if (u.fx.divineJustice >= g().combat.round) a = 0;
  return Math.max(0, a);
}

// ------------------------------------------------------------------ enemy attacks
C.attack = async (me, tgt, o = {}) => {
  const c = g().combat; const p = pc(); const M = mods();
  if (!tgt || isDead(tgt)) return { hit: false };
  // attacker skill
  let aSkill = (me.combat || 40) + 10; let adv = false; let dis = false; const notes = [];
  if (me.fx?.rally >= c.round) { aSkill += 10; notes.push('rally'); }
  if (me.fx?.nextAtk) { aSkill += me.fx.nextAtk; delete me.fx.nextAtk; }
  if (me.fx?.nextAtkPenalty) { aSkill -= 20; delete me.fx.nextAtkPenalty; }
  if (me.fx?.nextAdv) { adv = true; delete me.fx.nextAdv; }
  if (me.fx?.rage >= c.round || me.fx?.frenzy) adv = true;
  if (!me.ghost && traitVal(me, 'Pack')) { const n = enemies().filter((u) => u.def === me.def && u !== me).length; aSkill += 5 * n; if (n) notes.push(`pack +${5 * n}`); }
  const gd = g().domain?.growing || [];
  for (const ty of me.types || []) if (gd.includes(`boost${ty}`)) aSkill += 10;
  if (c.bonusCombat) aSkill += c.bonusCombat;
  if (me.fx?.sap) aSkill -= me.fx.sap;
  if (me.fx?.lurch?.until >= c.round) aSkill += me.fx.lurch.v;
  if (me.fx?.weaponMinus) aSkill -= me.fx.weaponMinus;
  if (me.fx?.nextAtkMinus) { aSkill -= me.fx.nextAtkMinus; delete me.fx.nextAtkMinus; }
  if (me.fx?.crippled >= c.round || me.fx?.plague >= c.round || me.fx?.disAttackUntil >= c.round || me.cond?.Blinded) dis = true;
  if (me.fx?.nextDis) { dis = true; delete me.fx.nextDis; }
  if (!tgt.isPC && tgt.fx?.mirage >= c.round) dis = true;
  if (me.fx?.overwhelmed) aSkill -= 20;
  if (me.cond?.Frightened) aSkill -= me.cond.Frightened;
  if (me.cond?.Sickened) aSkill -= me.cond.Sickened;
  if (me.cond?.Freezing) aSkill -= 10;
  if (me.cond?.Restrained) aSkill -= 20;
  if (me.cond?.Prone) dis = true;
  if (tgt.isPC) { aSkill += (M.enemyAtk || 0); if (c.firstEnemyBonus) { aSkill += 20; } }
  if (tgt.cond?.Prone) adv = true;
  if (tgt.isPC && PCU.fx.enemyDisAdvRounds >= c.round) dis = true;
  // Concealed target: Mind check first
  if (tgt.isPC && p.cond.Concealed) {
    const s = rollCheck(me.mind || 40); io.log(`${me.name} searches for you (Mind) ${describeRoll(s)}`, 'roll dim');
    if (!s.success) { io.log(`${me.name} cannot find you.`, 'good'); return { hit: false }; }
  }
  // Brace (Bulwark) and other pre-attack reactions are decided in the defense prompt.
  let defense = null;
  o = { tag: c.curAction?.tag, name: c.curAction?.name, ...o };
  if (tgt.isPC) defense = await pcDefensePrompt(me, o);
  if (defense?.reflect) {
    const { dice, flat } = exprToDice(o.dmg, o.type);
    const d = Math.max(...rollPool(dice).map((x) => x.v)) + flat + (me.dmgFlat || 0);
    io.log(`The Voidclasp Gauntlets turn ${me.name}'s attack back against it!`, 'good');
    if (!me.ghost) damageUnit(me, d, o.type, { byPC: true, magical: true });
    return { hit: false };
  }
  const aRes = rollCheck(aSkill, { adv, dis });
  let dRes = null;
  if (tgt.isPC) {
    if (defense.none) io.log(`${me.name} attacks (${o.name || 'attack'}): ${describeRoll(aRes)} — you cannot defend!`, aRes.success ? 'enemy' : 'dim');
    else {
      dRes = defense.roll(aRes);
    }
  } else {
    let dSkill = tgt.combat + (tgt.fx.defBonus?.v || 0) + (tgt.fx.lurch?.until >= c.round ? tgt.fx.lurch.v : 0) - (tgt.fx.weaken >= c.round ? 20 : 0);
    if (tgt.side === 'enemy' && !traitVal(tgt, 'Swift')) dSkill -= 20 * (tgt.fx.reactions || 0);
    tgt.fx.reactions = (tgt.fx.reactions || 0) + 1;
    dRes = (tgt.cond.Stunned || tgt.cond.Paralyzed) ? null : rollCheck(dSkill);
    io.log(`${me.name} attacks ${tgt.name}: ${describeRoll(aRes)}${dRes ? ` / ${tgt.name} ${describeRoll(dRes)}` : ''}`, 'roll dim');
  }
  let hit = false; let crit = false; let bothFail = false; let defWon = false;
  if (!dRes) { hit = aRes.success; crit = aRes.crit; }
  else if (!aRes.success && !dRes.success) bothFail = true;
  else {
    let cmp = compareOpposed(aRes, dRes);
    if (cmp === 0) cmp = -1; // defender keeps footing on a perfect tie
    if (cmp > 0) { hit = true; crit = aRes.crit; } else defWon = true;
  }
  if (aRes.fumble) await npcFumble(me, tgt);
  if (bothFail) {
    io.log(`Both sides falter; ${nm(tgt)} ${tgt.isPC ? 'suffer' : 'suffers'} 1 unavoidable damage.`, 'dim');
    if (tgt.isPC) await damagePC(1, 'Bludgeoning', { ignoreArmor: true, label: 'Scrape' }); else damageUnit(tgt, 1, 'Bludgeoning', {});
    return { hit: false };
  }
  if (defWon) {
    if (tgt.isPC) {
      if (defense.feint && dRes.success) { PCU.fx.feintBonus = true; io.log('Feint: your next attack receives +20 instead of +10.', 'good'); }
      if (defense.parry && dRes.success && hasAbility('stormbrand.2') && !me.ghost && (p.aether + p.tempAether) >= 4 && await io.yesNo('Countershock: spend 4 Aether to send D6 Force damage back through your weapon?', 'Countershock', 'No', { combat: true })) {
        const { payAether } = await import('./abilities.js'); if (payAether(4)) await C.harm(me, 'D6', 'Force', { byPC: true, label: 'Countershock' });
      }
      await pcDefensiveMove(me);
    }
    return { hit: false };
  }
  if (!hit) { io.log(`${me.name} misses.`, 'dim'); return { hit: false }; }
  // Damage
  const loc = rollLocation(tgt.isPC ? 'Humanoid' : def(tgt).hitLoc);
  const isWeak = tgt.isPC ? loc === 'Head' : loc === def(tgt).weak;
  const { dice, flat } = exprToDice(o.dmg, o.type);
  for (const e of me.dmgDice || []) dice.push(...exprToDice(e, o.type).dice);
  if (me.fx?.rage >= c.round || me.fx?.frenzy) dice.push({ sides: 6, type: o.type });
  if (me.fx?.poolBonus) { dice.push({ sides: 6, type: o.type }); delete me.fx.poolBonus; }
  const vals = rollPool(dice);
  let dmg = Math.max(...vals.map((x) => x.v)) + flat + (me.dmgFlat || 0);
  if (crit && tgt.isPC) {
    const negated = await offerCritSacrifice();
    if (negated) return { hit: true, dealt: 0 };
  }
  if (crit && !(me.influences || []).includes(1)) dmg *= 2;
  if (isWeak) dmg *= 2;
  if (crit && o.type === 'Piercing') dmg += 2;
  io.log(`${me.name} hits ${tgt.isPC ? 'you' : tgt.name} in the <b>${loc}</b>${isWeak ? ' (weak spot!)' : ''}${crit ? ' with a <b>Critical Strike</b>' : ''} [${vals.map((x) => x.v).join(', ')}].`, 'enemy');
  let dealt = 0;
  if (tgt.isPC) {
    if (defense?.brace) { const b = rnd(4); dmg = Math.max(0, dmg - b); io.log(`Brace absorbs ${b} damage.`, 'good'); }
    if (defense?.shell) { dmg = Math.max(0, dmg - defense.shell); io.log(`Your Magic Shell soaks ${defense.shell} damage.`, 'good'); }
    if (p.inv.some((i) => i.name === 'Aegis of the Eternal Sentinel') || p.equip.off?.name === 'Aegis of the Eternal Sentinel') {
      const node = g().domain.nodes[g().domain.cur];
      if (!node.aegisUsed && dmg >= 4 && await io.yesNo(`The Aegis of the Eternal Sentinel can ignore all damage from this attack (${dmg}). Once per room. Use it?`)) { node.aegisUsed = true; io.log('The Aegis absorbs the blow.', 'good'); return { hit: true, dealt: 0 }; }
    }
    const pen = traitVal(me, 'Penetrating') || 0;
    c.armorUsed = c.armorUsed || {}; c.armorUsed[loc] = true;
    dealt = await damagePC(dmg, o.type, { loc, penetrating: pen, label: o.name || me.name, attack: true, source: me, ignoreArmor: o.ignoreArmor });
    if (dealt > 0 && M.thorns && !me.ghost) damageUnit(me, M.thorns, 'Piercing', {});
    if (dealt > 0 && PCU.fx.demonShroud && !me.ghost) damageUnit(me, 1, 'Infernal', { byPC: true });
    if (dealt >= 5 && (me.influences || []).includes(7)) await loseSanity(1, { resolve: true, label: 'Corrupting strike' });
    if (dealt > 0 && traitVal(me, 'Venomous')) { const s = await C.save(PCU, 'Endurance', { label: 'resist the venom' }); if (!s.success) C.addCond(PCU, 'Poisoned', 1); }
  } else {
    if (!o.ignoreArmor) dmg = Math.max(0, dmg - unitArmorAt(tgt, loc));
    dealt = damageUnit(tgt, dmg, o.type, { hit: true, magical: CREATURES[me.def]?.minion });
  }
  if (me.fx?.infusion && dealt > 0) { delete me.fx.infusion; await C.harm(tgt, '2D6', 'Poison', { source: me, label: 'Toxic Infusion' }); }
  if (me.def === 'netherfiend' && dealt > 0 && tgt.fx.infernalMark >= c.round && !isDead(tgt)) await C.harm(tgt, 1, 'Fire', { source: me, label: 'Infernal Mark' });
  if (me.fx?.bloodFrenzy && tgt.isPC && dealt > 0 && (pc().tough === 0 || isDead(tgt))) {
    delete me.fx.bloodFrenzy; const other = minions()[0];
    if (other) { io.log(`${me.name}'s blood frenzy drives it at ${other.name}!`, 'enemy'); me.fx.nextAdv = true; await C.attack(me, other, { dmg: o.dmg, type: o.type }); }
  }
  if (o.onHit && !isDead(tgt)) await o.onHit(C, me, tgt, { dealt, loc, crit });
  return { hit: true, dealt };
};

async function offerCritSacrifice() {
  const p = pc(); const opts = [];
  if (p.equip.main && p.equip.main.kind === 'weapon' && !p.equip.main.broken) opts.push({ label: `Sacrifice ${p.equip.main.name}`, value: 'main' });
  const sh = hasShield(); if (sh) opts.push({ label: `Sacrifice ${sh.name}`, value: 'off' });
  if (!opts.length) return false;
  opts.push({ label: 'Take the Critical Strike', value: null, cls: 'secondary' });
  const ch = await io.choose('You are about to receive a Critical Strike! You may sacrifice your weapon or shield to negate it completely.', opts);
  if (!ch) return false;
  p.equip[ch].broken = true; io.log(`Your ${p.equip[ch].name} shatters, absorbing the blow. It must be repaired at Camp.`, 'bad');
  if (p.equip[ch].relic || mods().noBreak) p.equip[ch].broken = false;
  return true;
}

/** Ask the player how to defend (or auto-pick). Returns {roll(aRes)->dRes, ...flags} */
async function pcDefensePrompt(me, o) {
  const p = pc(); const c = g().combat; const fx = PCU.fx; const M = mods();
  if (p.cond.Paralyzed || p.cond.Sleeping) return { none: true };
  if (p.cond.Stunned || fx.noDefense >= c.round || p.effects.some((e) => e.id === 'frenzy')) return { none: true };
  const w = mainWeapon(); const sh = hasShield();
  const savage = traitVal(me, 'Savage');
  const canParry = !savage && !p.cond.Prone && (w.traits.includes('Parrying') || !!sh || fx.iceShieldReady);
  const reactionsUsed = fx.reactions || 0;
  const penaltyStep = hasAbility('brawler.5') ? 10 : 20;
  const freeR = (M.freeReaction || 0);
  const penalty = Math.max(0, reactionsUsed - freeR) * penaltyStep + (fx.channeling ? 10 : 0);
  const dodgeName = M.hardToHit && skillValue('Acrobatics') > skillValue('Dodge') ? 'Acrobatics' : 'Dodge';
  let dodgeVal = skillValue(dodgeName) - penalty;
  let parryVal = skillValue(w.skill) - penalty + (sh ? sh.parry : 0) + (sh && w.traits.includes('Defensive') ? 10 : 0) + (M.parry || 0);
  if (fx.dodgeBonus && fx.dodgeBonus.until >= c.round) dodgeVal += fx.dodgeBonus.v;
  const extra = (fx.nextDefMod || 0) + (fx.evasive ? 10 : 0) + (fx.defPenaltyNext || 0);
  const opts = [];
  opts.push({ label: `${dodgeName} (${dodgeVal + extra})`, value: 'dodge' });
  if (canParry) opts.push({ label: `Parry with ${sh ? sh.name : w.name} (${parryVal + extra})`, value: 'parry' });
  const reacts = [];
  if (hasAbility('brawler.1') && o.tag !== 'Magical') reacts.push({ label: `Feint (Dodge; +20 next attack on success) (${dodgeVal + extra})`, value: 'feint' });
  if (hasAbility('bulwark.1')) reacts.push({ label: `${canParry && parryVal > dodgeVal ? 'Parry' : dodgeName} + Brace (2 Exhaustion, -D4 damage)`, value: 'brace' });
  if (hasAbility('arcanist.2') && p.aether >= 2) reacts.push({ label: `Magic Shell (spend Aether: soak 1 damage per 2 Aether) + ${canParry && parryVal > dodgeVal ? 'Parry' : dodgeName}`, value: 'shell' });
  if (p.equip.main?.name === 'Voidclasp Gauntlets' && !c.voidclaspUsed) reacts.push({ label: 'Voidclasp Gauntlets: turn the attack back against your opponent (once per encounter)', value: 'void' });
  if (hasAbility('frostweaver.2') && p.aether >= 3) reacts.push({ label: `Ice Shield (3 Aether, +30 Parry) (${skillValue(w.skill) - penalty + 30 + (sh ? sh.parry : 0) + extra})`, value: 'ice' });
  let choice;
  if (!reacts.length && settings.autoDefense) choice = canParry && parryVal > dodgeVal ? 'parry' : 'dodge';
  else choice = await io.choose(`${me.name} attacks you! How do you defend?`, [...opts, ...reacts], { combat: true });
  const out = { parry: false };
  if (choice === 'void') { c.voidclaspUsed = true; fx.reactions = reactionsUsed + 1; return { reflect: true }; }
  if (choice === 'shell') {
    const max = Math.min(p.aether, 20);
    const spend = await io.choose('Magic Shell: how much Aether do you pour into it?', [2, 4, 6, 8, 10, 12, 14, 16, 18, 20].filter((x) => x <= max).map((x) => ({ label: `${x} Aether (soak ${x / 2})`, value: x })), { combat: true });
    p.aether -= spend; out.shell = spend / 2;
    choice = canParry && parryVal > dodgeVal ? 'parry' : 'dodge';
  }
  let val; let label;
  if (choice === 'parry') { val = parryVal; label = 'Parry'; out.parry = true; }
  else if (choice === 'ice') { p.aether -= 3; val = skillValue(w.skill) - penalty + 30 + (sh ? sh.parry : 0); label = 'Ice Shield parry'; out.parry = true; }
  else if (choice === 'brace') { gainExh(2); out.brace = true; if (canParry && parryVal > dodgeVal) { val = parryVal; out.parry = true; label = 'Parry'; } else { val = dodgeVal; label = dodgeName; } }
  else { val = dodgeVal; label = dodgeName; if (choice === 'feint') out.feint = true; }
  if (out.parry && hasAbility('stormbrand.2') && p.aether >= 4) out.countershockAvail = true;
  val += extra;
  delete fx.nextDefMod; delete fx.evasive; delete fx.defPenaltyNext;
  fx.reactions = reactionsUsed + 1;
  if (out.parry && sh) { c.shieldUsed = true; }
  let advD = false; let disD = false;
  if (fx.defAdvUntil >= c.round) advD = true;
  if (fx.crippled >= c.round || fx.plague >= c.round || p.cond.Blinded) disD = true;
  const rerollDodge = !out.parry && M.rerollDodge && !g().domain.nodes[g().domain.cur]?.dodgeReroll;
  out.roll = (aRes) => {
    let d = rollCheck(val, { adv: advD, dis: disD });
    if (!d.success && rerollDodge) { g().domain.nodes[g().domain.cur].dodgeReroll = true; io.log('Your boots let you reroll the failed Dodge.', 'good'); d = rollCheck(val, { adv: advD, dis: disD }); }
    io.log(`${me.name} attacks: ${describeRoll(aRes)} &nbsp;|&nbsp; Your ${label}: ${describeRoll(d)}`, d.success && (!aRes.success || compareOpposed(aRes, d) < 0) ? 'roll good' : 'roll bad');
    if (d.doubles && !pc().improve.includes(label === 'Parry' ? w.skill : dodgeName) && label !== 'Ice Shield parry') pc().improve.push(label === 'Parry' ? w.skill : dodgeName);
    return d;
  };
  return out;
}

async function pcDefensiveMove(me) {
  const n = rnd(10); const fx = PCU.fx; const c = g().combat;
  io.log(`<b>Defensive Move</b> (${n}): ${PC_DEFENSIVE_MOVES[n - 1]}`, 'good');
  switch (n) {
    case 1: fx.nextAtkBonus = (fx.nextAtkBonus || 0) + 10; break;
    case 2: if (!me.ghost) { const loc = rollLocation(def(me).hitLoc); me.fx.armorMinus = { ...(me.fx.armorMinus || {}), [loc]: ((me.fx.armorMinus || {})[loc] || 0) + 1 }; io.log(`${me.name}'s ${loc} armor is reduced.`, 'good'); } break;
    case 3: if (!me.ghost) C.addCond(me, 'Bleeding', 1); break;
    case 4: { const p = pc(); for (const k of ['Bleeding', 'Poisoned', 'Burning', 'Frightened', 'Sickened', 'Stunned', 'Dazed', 'Restrained', 'Prone', 'Blinded', 'Cursed', 'Freezing']) delete p.cond[k]; fx.immuneAllCond = c.round + 1; break; }
    case 5: if (!me.ghost) damageUnit(me, 1, 'Piercing', { byPC: true }); break;
    case 6: fx.poolD6 = (fx.poolD6 || 0) + 1; break;
    case 7: fx.nextAdv = true; break;
    case 8: if (!me.ghost) me.fx.defPenalty = (me.fx.defPenalty || 0) + 20; break;
    case 9: healTough(2); break;
    case 10: fx.freeAim = true; break;
    default: break;
  }
}

async function npcDefensiveMove(me) {
  const n = rnd(10); const fx = PCU.fx; const c = g().combat;
  io.log(`<b>${me.name} Defensive Move</b> (${n}): ${NPC_DEFENSIVE_MOVES[n - 1]}`, 'enemy');
  switch (n) {
    case 1: me.fx.nextAtk = (me.fx.nextAtk || 0) + 10; fx.spellwardMod = { v: -10, until: c.round }; break;
    case 2: { const slots = ['head', 'torso', 'arms', 'legs']; const s = pick(slots); const p = pc(); p.cond.armorMod = { ...(p.cond.armorMod || {}), [s]: ((p.cond.armorMod || {})[s] || 0) - 1 }; break; }
    case 3: C.addCond(PCU, 'Bleeding', 1); break;
    case 4: for (const k of Object.keys(me.cond)) delete me.cond[k]; break;
    case 5: await damagePC(1, 'Piercing', { ignoreArmor: true, label: 'Counter' }); break;
    case 6: me.fx.poolBonus = true; break;
    case 7: me.fx.nextAdv = true; fx.spellwardDis = true; break;
    case 8: fx.nextDefMod = (fx.nextDefMod || 0) - 20; break;
    case 9: { const h = rnd(4); me.hp = Math.min(me.maxHp, me.hp + h); break; }
    case 10: me.fx.extraTurn = true; break;
    default: break;
  }
}

async function npcFumble(me, tgt) {
  if (me.ghost) return;
  const n = rnd(10); const fx = PCU.fx; const c = g().combat;
  io.log(`<b>${me.name} fumbles</b> (${n}): ${NPC_FUMBLES[n - 1]}`, 'good');
  switch (n) {
    case 1: me.fx.nextAtkPenalty = true; fx.spellwardBonus = 20; break;
    case 2: C.addCond(me, 'Stunned', 1); break;
    case 3: C.addCond(me, 'Restrained', true); me.fx.restrainUntil = c.round + rnd(4); break;
    case 4: fx.defAdvUntil = c.round + 2; break;
    case 5: C.addCond(PCU, 'Concealed', true); fx.concealUntil = c.round + rnd(4); break;
    case 6: C.addCond(me, 'Prone', true); me.fx.mustStand = true; break;
    case 7: C.addCond(me, 'Prone', true); C.addCond(me, 'Stunned', 2); break;
    case 8: C.addCond(me, 'Frightened', 20); break;
    case 9: damageUnit(me, rnd(6), 'Slashing', { byPC: false }); break;
    case 10: C.addCond(me, 'Prone', true); me.fx.mustStand = true; damageUnit(me, Math.max(rnd(6), rnd(6)), 'Bludgeoning', { byPC: false }); break;
    default: break;
  }
}

// ------------------------------------------------------------------ PC attacks
/**
 * The player attacks an enemy.
 * o: { aim, extraPool:[{sides,type}], bonus, noDefense, forceCrit, label, onHit(dealt,target), hard, ability }
 */
export async function pcAttack(target, o = {}) {
  const c = g().combat; const p = pc(); const M = mods(); const fx = PCU.fx;
  const w = mainWeapon();
  const atkSkill = o.skill || w.skill;
  let skill = skillValue(atkSkill) + 10; // the attacker has the upper hand
  const notes = [];
  if (fx.nextAtkMinus) { skill -= fx.nextAtkMinus; delete fx.nextAtkMinus; }
  if (fx.weaponMinus) skill -= fx.weaponMinus;
  if (fx.oneWithWeapon) skill -= 30;
  if (fx.feintBonus) { skill += 10; delete fx.feintBonus; notes.push('feint +20'); }
  if (fx.nextAtkBonus) { skill += fx.nextAtkBonus; notes.push(`+${fx.nextAtkBonus}`); delete fx.nextAtkBonus; }
  if (fx.unbreakable) { skill += fx.unbreakable; delete fx.unbreakable; notes.push('faith'); }
  if (c.surpriseBonus) { skill += 20; notes.push('surprise +20'); }
  if (p.effects.some((e) => e.id === 'altarVoteus')) skill += 10;
  if (fx.fumblePenalty) { skill -= 20; delete fx.fumblePenalty; }
  if (o.bonus) skill += o.bonus;
  if (o.hard) skill -= 20;
  if (p.cond.Frightened) skill -= p.cond.Frightened;
  if (p.cond.Sickened) skill -= p.cond.Sickened;
  if (p.cond.Freezing) skill -= 10;
  if (p.cond.Restrained) skill -= 20;
  if (target.fx.exploited) skill += 10;
  if (fx.createOpening) { skill += 30; delete fx.createOpening; }
  if (!w.unarmed && p.equip.off?.kind === 'weapon' && !M.dualWielder) skill -= 40;
  let adv = false; let dis = false;
  if (fx.nextAdv) { adv = true; delete fx.nextAdv; }
  if (fx.initiativeAdv) { adv = true; delete fx.initiativeAdv; }
  if (target.cond.Prone) adv = true;
  if (p.cond.Prone) dis = true;
  if (target.fx.mirage >= c.round) dis = true;
  if (fx.crippled >= c.round || fx.plague >= c.round || fx.disAttackUntil >= c.round) dis = true;
  if (fx.nextDis) { dis = true; delete fx.nextDis; }
  if (p.cond.Blinded) dis = true;
  if ((p.cond.Cursed || []).some((cu) => cu.id === 'disruptive' && cu.until >= c.round)) {
    const s = await check('Resolve', { label: 'Disruptive Curse', combat: true });
    if (!s.success) dis = true;
  }
  if (o.aim) {
    const free = fx.freeAim || (c.surpriseBonus && hasMastery('duskblade'));
    if (!free) dis = true; delete fx.freeAim;
  }
  // defender
  let dSkill = target.combat - (w.speed || 0) - (M.speed && w.item ? M.speed : 0);
  if (target.fx.weaken >= c.round) dSkill -= 20;
  if (target.fx.defBonus) dSkill += target.fx.defBonus.v;
  if (target.fx.lurch?.until >= c.round) dSkill += target.fx.lurch.v;
  if (target.fx.defPenalty) { dSkill -= target.fx.defPenalty; delete target.fx.defPenalty; }
  if (fx.invisible) dSkill -= 40;
  if (target.fx.overwhelmed) dSkill -= 20;
  if (target.cond.Sickened) dSkill -= target.cond.Sickened;
  if (target.cond.Freezing) dSkill -= 10;
  if (target.cond.Restrained) dSkill -= 20;
  if (!traitVal(target, 'Swift')) dSkill -= 20 * (target.fx.reactions || 0);
  target.fx.reactions = (target.fx.reactions || 0) + 1;
  const dAdv = target.fx.veil >= c.round;
  const canDefend = !o.noDefense && !target.cond.Stunned && !target.cond.Paralyzed && !target.cond.Sleeping && !fx.ghostStrike;
  const autoHit = target.cond.Paralyzed || target.cond.Sleeping || fx.ghostStrike;
  delete fx.ghostStrike;
  const aRes = autoHit ? { success: true, crit: false, value: 0, target: skill, fumble: false } : rollCheck(skill, { adv, dis, crit66: !!M.crit66 });
  const dRes = canDefend && !autoHit ? rollCheck(dSkill, { adv: dAdv }) : null;
  if (!autoHit && aRes.doubles && !p.improve.includes(atkSkill)) p.improve.push(atkSkill);
  io.log(`${o.label || 'You attack'} ${target.name}${notes.length ? ` <span class="dim">(${notes.join(', ')})</span>` : ''}: ${autoHit ? 'automatic hit' : describeRoll(aRes)}${dRes ? ` &nbsp;|&nbsp; ${target.name} ${describeRoll(dRes)}` : ''}`, 'roll');
  let hit = false; let crit = false;
  if (o.forceCrit && aRes.success) { hit = true; crit = true; }
  else if (!dRes) { hit = aRes.success; crit = aRes.crit; }
  else if (!aRes.success && !dRes.success) {
    io.log(`Both falter; ${target.name} suffers 1 unavoidable damage.`, 'dim');
    damageUnit(target, 1, w.type, { byPC: true, skill: atkSkill });
  } else {
    let cmp = compareOpposed(aRes, dRes); if (cmp === 0) cmp = -1;
    if (cmp > 0) { hit = true; crit = aRes.crit; } else { await npcDefensiveMove(target); }
  }
  if (p.flags.herculean && hit) { crit = true; delete p.flags.herculean; io.log('Herculean Feat: your strike becomes a Critical Strike!', 'good'); }
  if (aRes.fumble) await pcFumble();
  c.surpriseBonus = false;
  if (fx.invisible) { delete fx.invisible; io.log('You become visible again.', 'dim'); }
  if (p.cond.Concealed) { delete p.cond.Concealed; }
  if (target.fx.feedback === true) {
    delete target.fx.feedback;
    io.log(`${target.name} lashes back with arcane feedback!`, 'enemy');
    const s = await C.save(PCU, 'Resolve', { label: 'Arcane Feedback' });
    if (!s.success) { await damagePC(rnd(6), 'Arcane', { label: 'Arcane Feedback' }); fx.spellFail = true; }
  }
  if (!hit) return { hit: false };
  if (crit) bump('crits');
  const loc = o.aim ? def(target).weak || 'Body' : rollLocation(def(target).hitLoc);
  if (o.noDamage) { if (o.onHit && !isDead(target)) await o.onHit(0, target); return { hit: true, dealt: 0 }; }
  const res = o.customPool ? await applyPoolDamage(target, o.customPool, o.customFlat || 0, { ...o, crit, loc, ability: true })
    : await dealWeaponDamage(target, { ...o, crit, loc, w, atkSkill });
  if (o.onHit && !isDead(target)) await o.onHit(res.dealt, target);
  if (target.fx.stormshroud >= c.round) await damagePC(2, 'Lightning', { label: 'Stormshroud' });
  return { hit: true, ...res };
}

async function dealWeaponDamage(target, o) {
  const p = pc(); const M = mods(); const fx = PCU.fx; const c = g().combat; const w = o.w;
  // Build the damage pool
  let pool = [];
  if (p.equip.main?.base && !p.equip.main.broken && (p.equip.main.name === 'Mace of Obliteration')) {
    io.log('The Mace of Obliteration rends flesh: 4 Slashing damage.', 'good');
    const d = damageUnit(target, 4, 'Slashing', { byPC: true, weapon: true, skill: w.skill, hit: true });
    return { dealt: d };
  }
  const frost = p.sustained.includes('frostweaver.5');
  const oneWith = hasAbility('weaponmaster.5') && !w.unarmed;
  const baseType = oneWith ? 'Psychic' : frost ? 'Cold' : w.type;
  pool.push({ sides: frost ? 8 : w.unarmed ? w.die : 6, type: baseType, src: frost ? 'Frost Weapon' : w.name, base: true, alt: M.weaponType && !oneWith ? M.weaponType : null });
  const node = g().domain?.nodes?.[g().domain.cur];
  if (M.burstPool && node && !node.burstUsed) { node.burstUsed = true; for (let i = 0; i < M.burstPool; i++) pool.push({ sides: 6, type: baseType, src: 'Weapon burst' }); }
  for (const d of M.wpool || []) pool.push({ sides: d.die, type: d.type, src: d.src || 'weapon' });
  for (const d of M.pool || []) pool.push({ sides: d.die, type: d.type, src: d.src || 'bonus' });
  if (M.stonefists && !w.unarmed && w.skill === 'Unarmed Combat & Fist Weapons') pool.push({ sides: 4, type: 'Bludgeoning', src: 'Stonefists' });
  if (p.dedication && w.item?.base === p.dedication) pool.push({ sides: 4, type: w.type, src: 'Dedication' });
  if (fx.poolD6) { for (let i = 0; i < fx.poolD6; i++) pool.push({ sides: 6, type: w.type, src: 'Defensive Move' }); delete fx.poolD6; }
  if (p.effects.some((e) => e.id === 'altarUdall')) pool.push({ sides: 4, type: 'Fire', src: 'Udall' });
  if (p.flags.coldCharge) { pool.push({ sides: 8, type: 'Cold', src: 'Cold' }); delete p.flags.coldCharge; }
  if (p.effects.some((e) => e.id === 'fireCharm')) pool.push({ sides: 4, type: 'Fire', src: 'Charm' });
  if (w.item?.sigil) pool.push({ sides: 10, type: 'Arcane', src: 'Sigil' });
  if (c.icons?.includes('strength')) pool.push({ sides: 4, type: 'Bludgeoning', src: 'Strength Icon' }, { sides: 4, type: 'Bludgeoning', src: 'Strength Icon' });
  if (p.effects.some((e) => e.id === 'frenzy')) pool.push({ sides: 6, type: w.type, src: 'Frenzy' }, { sides: 6, type: w.type, src: 'Frenzy' });
  if (o.crit && M.critPool) pool.push({ sides: 6, type: w.type, src: 'Critical' });
  if (M.firstStrike && !c.firstStrikeUsed) { pool.push({ sides: 6, type: w.type, src: 'First strike' }); c.firstStrikeUsed = true; }
  if (o.extraPool) pool = pool.concat(o.extraPool);
  // Flat modifiers
  let flat = frost ? 1 : 0;
  if (w.traits.includes('Two-Handed')) flat += 2;
  if (w.traits.includes('Powerful')) flat += 1;
  if (w.traits.includes('Versatile') && !p.equip.off) flat += 1;
  if (!w.unarmed && p.equip.off?.kind === 'weapon') flat += 1; // dual wielding
  flat += (M.weaponDmg || 0) + (M.wdmg || 0) + (M.skillDmg?.[w.skill] || 0);
  for (const t of target.types) flat += (M.vsType?.[t] || 0);
  if ((target.cond.Cursed || []).length && hasMastery('hexmancer')) flat += 1;
  if (target.fx.exploited) flat += 1;
  if (M.revenge && p.flags.damagedThisTurn) flat += 1;
  return applyPoolDamage(target, pool, flat, { ...o, weapon: true, magical: !!(p.equip.main?.magic || p.equip.main?.relic || frost || oneWith || (M.wpool || []).length) });
}

/** Roll a PC damage pool, pick a die, apply crit / weak spot / armor / resistances. */
export async function applyPoolDamage(target, pool, flat, o) {
  const p = pc(); const M = mods(); const c = g().combat;
  if (M.abilityDie && o.ability) pool.push({ sides: M.abilityDie, type: pool[0]?.type || 'Arcane', src: 'Diadem' });
  let vals = rollPool(pool);
  if (PCU.fx.berserkUntil >= c.round && o.weapon) io.log('Berserk!', 'dim');
  if (o.crit && hasPerk('Precision Striker')) {
    const best = Math.max(...vals.map((v) => v.v));
    if (best <= 3) { vals = rollPool(pool); io.log('Precision Striker: you re-roll the damage.', 'dim'); }
  }
  const loc = o.loc || null; const weak = loc && def(target).weak && loc === def(target).weak;
  // Critical Strikes and Weak Spots each double damage, but they never stack (no tripling).
  const critMult = o.crit && !target.influences?.includes(1) ? (target.types.some((t) => (M.tripleCrit || []).includes(t)) ? 3 : 2) : 1;
  const mult = Math.max(critMult, weak ? 2 : 1);
  const effective = (v) => {
    let d = v.v + flat + (M.typeBonus?.[v.type] || 0) + (v.type === 'Arcane' ? (target.fx.feedback || 0) : 0);
    d *= mult;
    if (o.crit && v.type === 'Piercing') d += 2;
    if (loc && !ARMOR_IGNORING.has(v.type) && !o.ignoreArmor && !(p.equip.main?.name === 'Ethereal Requiem Blade' && o.weapon)) {
      let a = unitArmorAt(target, loc); if (v.type === 'Bludgeoning') a = Math.max(0, a - 1); d = Math.max(0, d - a);
    }
    if (v.type === 'Slashing' && d > 0 && d <= 3) d += 1;
    const tr = unitTypeRules(target);
    if (tr.restored.includes(v.type)) return -d; if (tr.immune.includes(v.type)) return 0;
    if (tr.vulnerable.includes(v.type) && !tr.resist.includes(v.type)) d *= 2;
    if (tr.resist.includes(v.type) && !tr.vulnerable.includes(v.type)) d = Math.ceil(d / 2);
    return d;
  };
  let chosen;
  if (settings.manualDamage && vals.length > 1) {
    const idx = await io.choose(`Damage Pool: pick a die (fixed modifiers ${flat >= 0 ? '+' : ''}${flat}).`, vals.map((v, i) => ({ label: `${v.v} ${v.type} (d${v.sides} ${v.src || ''}) → ~${effective(v)}`, value: i })), { combat: true });
    chosen = vals[idx];
  } else chosen = vals.reduce((a, b) => (effective(b) > effective(a) ? b : a));
  if (chosen.alt && effective({ ...chosen, type: chosen.alt }) > effective(chosen)) chosen = { ...chosen, type: chosen.alt };
  // Compute the final number (before resistances, which damageUnit applies)
  let d = chosen.v + flat + (M.typeBonus?.[chosen.type] || 0) + (chosen.type === 'Arcane' ? (target.fx.feedback || 0) : 0);
  d *= mult;
  if (o.crit && chosen.type === 'Piercing') d += 2;
  let armorTxt = '';
  if (loc && !ARMOR_IGNORING.has(chosen.type) && !o.ignoreArmor && !(p.equip.main?.name === 'Ethereal Requiem Blade' && o.weapon)) {
    let a = unitArmorAt(target, loc); if (chosen.type === 'Bludgeoning') a = Math.max(0, a - 1);
    if (a) { d = Math.max(0, d - a); armorTxt = ` armor ${a}`; }
  }
  if (chosen.type === 'Slashing' && d > 0 && d <= 3) d += 1;
  if (o.savageWill) d += o.savageWill;
  if (o.weapon && !o.crit && PCU.fx.berserkUntil >= c.round) d *= 2;
  io.log(`${loc ? `Hit: <b>${loc}</b>${weak ? ' (weak spot!)' : ''}. ` : ''}Damage Pool [${vals.map((v) => `${v.v}${v.type !== chosen.type ? v.type[0] : ''}`).join(', ')}] → ${chosen.v} ${chosen.type}${flat ? ` ${flat > 0 ? '+' : ''}${flat}` : ''}${o.crit ? ' <b class="crit">×CRIT</b>' : ''}${armorTxt ? ` <span class="dim">(${armorTxt.trim()})</span>` : ''}`, 'roll');
  const dealt = damageUnit(target, d, chosen.type, { byPC: true, weapon: o.weapon, skill: o.weapon ? (o.atkSkill || mainWeapon().skill) : null, hit: true, minDamage: M.minDamage, arcaneFeedback: o.ability && chosen.type === 'Arcane' && hasMastery('arcanist'), reaper: o.reaper, magical: !!(o.ability || o.magical) });
  if (dealt > 0 && o.weapon && M.bloodPrice && !isDead(target) && await io.yesNo('Your weapon thirsts: add D8 damage, and suffer the same amount yourself?', 'Feed it', 'No', { combat: true })) {
    const extra = rnd(8); damageUnit(target, extra, chosen.type, { byPC: true, magical: true }); await damagePC(extra, chosen.type, { label: 'Blood price', ignoreArmor: true });
  }
  // on-hit riders
  if (dealt > 0 && !isDead(target)) {
    if (M.onHitCond) C.addCond(target, M.onHitCond, 1);
    if (p.effects.some((e) => e.id === 'poisonWeapon') && o.weapon) { C.addCond(target, 'Poisoned', 1); p.effects = p.effects.filter((e) => e.id !== 'poisonWeapon'); }
    if (M.onHitDaze && o.weapon) { const s = await C.save(target, 'Endurance', { label: 'Mace of Eclipse' }); if (!s.success) C.addCond(target, 'Dazed', 1); }
    if (M.sapAttack && o.weapon) { target.combat -= M.sapAttack; io.log(`${target.name}'s Combat Skill drops by ${M.sapAttack}.`, 'good'); }
    if (o.ability === 'frost' && hasMastery('frostweaver')) C.addCond(target, 'Freezing', true);
  }
  if (dealt > 0 && M.hitDodge && o.weapon) PCU.fx.dodgeBonus = { v: 10, until: c.round + 1 };
  if (dealt > 0 && hasAbility('wrathspawn.5')) await healWounds(1);
  if (o.crit && M.critHeal && o.weapon) await healWounds(rnd(10));
  // Savage Will (Wrathspawn feature): spend Aether for +damage once per Rest
  if (dealt > 0 && o.weapon && hasMastery('wrathspawn') && !p.once.savageWill && p.aether > 0 && !isDead(target)) {
    const n = await io.choose(`Savage Will: spend Aether for +1 damage each (once per Rest). Aether: ${p.aether}`, [{ label: 'No', value: 0, cls: 'secondary' }, ...[1, 2, 3, 4, 5].filter((x) => x <= p.aether).map((x) => ({ label: `+${x}`, value: x }))], { combat: true });
    if (n) { p.aether -= n; p.once.savageWill = true; damageUnit(target, n, chosen.type, { byPC: true }); }
  }
  // Strain: +1 damage per 2 Exhaustion (melee, non-ability)
  if (dealt > 0 && o.weapon && settings.askStrain && !isDead(target)) {
    const n = await io.choose('Strain yourself for extra damage? (+1 damage per 2 Exhaustion)', [{ label: 'No', value: 0, cls: 'secondary' }, { label: '+1 (2 Exh)', value: 1 }, { label: '+2 (4 Exh)', value: 2 }], { combat: true });
    if (n) { gainExh(2 * n); damageUnit(target, n, chosen.type, { byPC: true }); }
  }
  return { dealt, crit: o.crit, type: chosen.type };
}

async function pcFumble() {
  const p = pc(); const fx = PCU.fx; const M = mods();
  if (M.ignoreFumble && !p.once.ignoreFumble) { p.once.ignoreFumble = true; io.log('Your magic item lets you ignore the Fumble.', 'good'); return; }
  if (g().combat.lampDown) { io.log('<b>Fumble!</b> You kick the Lamp, spilling all its oil. You are Blinded.', 'bad'); p.light = null; g().combat.lampDown = false; C.addCond(PCU, 'Blinded', true); return; }
  const n = rnd(10); const w = mainWeapon();
  io.log(`<b>Fumble</b> (${n}): ${PC_FUMBLES[n - 1]}`, 'bad');
  switch (n) {
    case 1: if (w.unarmed) fx.fumblePenalty = true; else if (!M.returning) fx.loseStandard = true; break;
    case 2: if (w.unarmed) fx.fumblePenalty = true; else if (!M.returning) { fx.weaponStuck = p.equip.main.uid; } break;
    case 3: if (w.unarmed) fx.fumblePenalty = true; else if (p.equip.main.magic || p.equip.main.relic) fx.loseStandard = true; else p.equip.main.broken = true; break;
    case 4: { const { beltCheck } = await import('./explore.js'); await beltCheck(); break; }
    case 5: if (p.aether > 0) p.aether = Math.max(0, p.aether - rnd(8)); else await damagePC(1, 'Piercing', { label: 'Fumble' }); break;
    case 6: C.addCond(PCU, 'Prone', true); fx.mustStand = true; break;
    case 7: C.addCond(PCU, 'Prone', true); C.addCond(PCU, 'Dazed', 2); break;
    case 8: { const m = minions(); if (m.length) { const t = pick(m); damageUnit(t, rnd(w.unarmed ? w.die : 6), w.type, {}); } else await damagePC(rnd(w.unarmed ? w.die : 6), w.type, { label: 'You strike yourself', loc: rollLocation('Humanoid') }); break; }
    case 9: await damagePC(rnd(w.unarmed ? w.die : 6), w.type, { label: 'You strike yourself', loc: rollLocation('Humanoid') }); break;
    case 10: await damagePC(rnd(w.unarmed ? w.die : 6) * 2, w.type, { label: 'You badly wound yourself' }); break;
    default: break;
  }
}

// ------------------------------------------------------------------ setup
function assignTargets() {
  const c = g().combat; const allies = minions();
  const es = enemies();
  es.forEach((e, i) => {
    if (e.target && unitByUid(e.target) && !isDead(unitByUid(e.target))) return;
    e.target = i > 0 && allies[i - 1] ? allies[i - 1].uid : 'pc';
  });
  for (const m of allies) if (!m.target || !unitByUid(m.target) || isDead(unitByUid(m.target))) m.target = es.find((e) => e.target === m.uid)?.uid || es[0]?.uid;
}

/**
 * Start a combat. spec: { defs:[defId], ambush, title, bonusCombat, nodeId, overseer }
 */
export async function startCombat(spec) {
  const G = g(); const p = pc(); const M = mods();
  const units = [];
  for (const d of spec.defs) { const n = creatureCount(CREATURES[d]); for (let i = 0; i < n; i++) units.push(makeUnit(d, i, n)); }
  G.combat = { round: 0, units, stage: 'setup', nodeId: spec.nodeId ?? G.domain?.cur, overseer: !!spec.overseer, bonusCombat: spec.bonusCombat || 0, icons: [], ambush: !!spec.ambush, dead: [], corpses: 0 };
  if (p.flags.nextEncounterBonus) { G.combat.bonusCombat += p.flags.nextEncounterBonus; delete p.flags.nextEncounterBonus; }
  const names = [...new Set(units.map((u) => CREATURES[u.def].name))].join(', ');
  io.log(`<b>Combat!</b> ${names}${units.length > 1 ? ` (${units.length})` : ''}`, 'title');
  for (const d of [...new Set(spec.defs)]) io.log(`<i>${CREATURES[d].desc || ''}</i>`, 'dim');
  io.refresh();
  // Fear
  const horrifying = units.some((u) => traitVal(u, 'Horrifying')); const frightening = units.some((u) => traitVal(u, 'Frightening'));
  if (horrifying || frightening) {
    const c = await check('Resolve', { label: 'Face the horror', combat: true });
    if (!c.success) await loseSanity(horrifying ? 4 : 2);
  }
  // Initiative & surprise
  let ambush = spec.ambush || p.flags.nextAmbushed; delete p.flags.nextAmbushed;
  if (ambush && (hasPerk('Living Shadow') || M.neverSurprised)) ambush = false;
  const alert = units.some((u) => traitVal(u, 'Alert') || u.influences.includes(9) && false);
  let playerFirst = false; let firstEnemyBonus = false;
  if (p.flags.loseInitiative) { delete p.flags.loseInitiative; ambush = true; io.log('The aether-blood in your veins makes you sluggish. You lose the Initiative.', 'bad'); }
  if (ambush) { io.log('<b>You are surprised!</b> Your opponents strike first.', 'bad'); firstEnemyBonus = true; }
  else {
    const highestMind = Math.max(...units.map((u) => u.mind));
    let tryS = false;
    if (hasPerk('Living Shadow') && !alert) { playerFirst = true; G.combat.surpriseBonus = true; bump('surprised', units.length); io.log('Living Shadow: you strike from the darkness!', 'good'); }
    else {
      const ch = alert ? 'init' : await io.choose(`You face ${names}. Do you try to surprise them (Stealth vs Mind ${highestMind}) or prepare to fight?`, [
        { label: `Attempt to surprise them (Stealth ${skillValue('Stealth') - 10 * minions().length})`, value: 'surprise' },
        { label: `Fight (Initiative: Perception vs Mind ${highestMind})`, value: 'init' },
        ...(hasAbility('wrathspawn.4') ? [{ label: 'Charge! (2 Exhaustion: win the Initiative and deal 2D6 Bludgeoning damage)', value: 'charge' }] : []),
      ], { combat: true });
      tryS = ch === 'surprise';
      if (ch === 'charge') {
        gainExh(2); playerFirst = true; io.log('You charge headlong into the fight!', 'good');
        G.combat.order = ['pc', 'enemies']; G.combat.round = 0;
        const t = units.length === 1 ? units[0] : await chooseEnemyFrom(units, 'Charge which enemy?');
        await applyPoolDamage(t, [{ sides: 6, type: 'Bludgeoning', src: 'Charge' }, { sides: 6, type: 'Bludgeoning', src: 'Charge' }], 0, { ability: true });
      }
      let percMod = 0;
      if (tryS) {
        const a = await check('Stealth', { mod: -10 * minions().length, label: 'Surprise', combat: true });
        const b = rollCheck(highestMind); io.log(`Enemy Mind ${describeRoll(b)}`, 'roll dim');
        if (compareOpposed(a, b) > 0) { playerFirst = true; G.combat.surpriseBonus = true; bump('surprised', units.length); G.combat.surpriseWon = true; io.log('<b>You surprise them!</b> Your first attack gains +20.', 'good'); if (a.crit) PCU.fx.ghostStrike = true; }
        else { percMod = -20; io.log('They notice you.', 'bad'); if (a.fumble) PCU.fx.nextAdvLost = true; }
      }
      if (!playerFirst && ch !== 'charge') {
        const w = mainWeapon();
        let mod = percMod + (w.traits.includes('Quick') ? 10 : 0) + (M.initiative || 0) + (p.flags.initiativeBonus || 0);
        delete p.flags.initiativeBonus;
        if (hasAbility('wrathspawn.4') && false) mod += 0;
        let won;
        for (;;) {
          const a = await check('Perception', { mod, label: 'Initiative', combat: true, noCrit: true });
          const b = rollCheck(highestMind); io.log(`Enemy Mind ${describeRoll(b)}`, 'roll dim');
          if (a.crit) { PCU.fx.initiativeAdv = true; io.log('Snap Reaction: your next attack has Advantage.', 'good'); }
          if (a.fumble) { PCU.fx.loseFirstTurn = true; io.log('Taken by Surprise: you lose your first turn.', 'bad'); }
          const cmp = compareOpposed(a, b); if (cmp !== 0) { won = cmp > 0; break; }
        }
        playerFirst = won;
        io.log(won ? 'You act first.' : 'Your opponents act first.', won ? 'good' : 'bad');
      }
    }
  }
  if (G.combat.overseer && p.rewards.some((e) => e.overseerStun)) for (const u of units) if (u.overseer) C.addCond(u, 'Stunned', 1);
  if (G.combat.overseer && G.domain?.overseerWeakness) for (const u of units) if (u.overseer) { C.addCond(u, 'Stunned', 1); io.log('You exploit the weakness you learned in the scrolls!', 'good'); }
  G.combat.order = playerFirst ? ['pc', 'enemies'] : ['enemies', 'pc'];
  G.combat.firstEnemyBonus = firstEnemyBonus;
  G.combat.stage = 'roundStart';
  if (mods().infernoPlate) G.combat.infernoPlate = true;
  assignTargets();
  return combatLoop();
}

/** Creatures that arrive mid-fight (e.g. a Growing Darkness ambush during combat) join the current battle. */
export function reinforce(defId) {
  const n = creatureCount(CREATURES[defId]);
  const added = [];
  for (let i = 0; i < n; i++) { const u = makeUnit(defId, enemies().length + i, 2); g().combat.units.push(u); added.push(u); }
  assignTargets();
  io.log(`<b>Reinforcements!</b> ${CREATURES[defId].name} join the fight.`, 'bad');
  io.refresh();
  return added;
}

export async function resumeCombat() { io.log('<i>The fight continues...</i>', 'dim'); return combatLoop(); }

// ------------------------------------------------------------------ loop
async function combatLoop() {
  const c = g().combat;
  for (;;) {
    if (c.stage === 'roundStart') {
      c.round += 1;
      PCU.fx.reactions = 0; for (const u of enemies()) u.fx.reactions = 0;
      io.log(`— Round ${c.round} —`, 'round');
      await roundStartEffects();
      if (checkEnd()) break;
      c.stage = c.order[0];
    }
    if (c.stage === 'pc') {
      const res = await pcSideTurn();
      if (res === 'fled' || res === 'vanished' || res === 'calmed') return endCombat(res);
      if (checkEnd()) break;
      c.stage = c.order[0] === 'pc' ? 'enemies' : 'roundEnd';
    }
    if (c.stage === 'enemies') {
      await enemiesTurn();
      c.firstEnemyBonus = false;
      if (checkEnd()) break;
      c.stage = c.order[0] === 'enemies' ? 'pc' : 'roundEnd';
    }
    if (c.stage === 'roundEnd') { await roundEndEffects(); if (checkEnd()) break; c.stage = 'roundStart'; }
  }
  return endCombat(enemies().length ? 'lost' : 'won');
}
function checkEnd() { return enemies().length === 0 || pc().health <= 0; }

async function roundStartEffects() {
  const c = g().combat; const p = pc();
  // Icons
  if (c.icons.includes('restoring')) { healTough(1); for (const m of minions()) m.hp = Math.min(m.maxHp, m.hp + 1); }
  if (c.firebombAt === c.round) {
    io.log('The Firebomb Icon explodes!', 'good'); c.icons = c.icons.filter((i) => i !== 'firebomb');
    for (const e of enemies()) { const s = await C.save(e, 'mr', { label: 'Firebomb' }); if (!s.success) await C.harm(e, '2D10', 'Fire', { byPC: true, label: 'Firebomb' }); }
  }
  if (c.icons.includes('razorwind')) for (const e of enemies()) damageUnit(e, 1, 'Slashing', { byPC: true });
  if (c.infernoPlate) for (const e of enemies()) damageUnit(e, 1, 'Fire', { byPC: true });
  // Regeneration potion
  const regen = p.effects.find((e) => e.id === 'regen');
  if (regen) { await healWounds(1); regen.regen -= 1; if (regen.regen <= 0) p.effects = p.effects.filter((e) => e !== regen); }
  // Timed effects in rounds
  for (const e of p.effects) if (e.rounds) e.rounds -= 1;
  p.effects = p.effects.filter((e) => !(e.rounds !== undefined && e.rounds !== null && e.rounds <= 0));
  // condition expiry
  if (PCU.fx.concealUntil && PCU.fx.concealUntil < c.round) { delete p.cond.Concealed; delete PCU.fx.concealUntil; }
  if (PCU.fx.spellResistUntil && PCU.fx.spellResistUntil < c.round) { delete p.cond.spellResist; delete PCU.fx.spellResistUntil; }
  if (PCU.fx.sickUntil && PCU.fx.sickUntil < c.round) { delete p.cond.Sickened; delete PCU.fx.sickUntil; }
  if (p.cond.Cursed) { p.cond.Cursed = p.cond.Cursed.filter((cu) => !cu.until || cu.until >= c.round); if (!p.cond.Cursed.length) delete p.cond.Cursed; }
  for (const e of enemies()) {
    if (e.fx.restrainUntil && e.fx.restrainUntil < c.round) { delete e.cond.Restrained; delete e.fx.restrainUntil; }
    if (e.fx.sapVitality) { e.fx.sap = Math.min(20, (e.fx.sap || 0) + 5); }
  }
  if (PCU.fx.restrainUntil && PCU.fx.restrainUntil < c.round) { delete p.cond.Restrained; delete PCU.fx.restrainUntil; }
  for (const u of [...pcSide(), ...enemies()]) if (u.fx.blindUntil && u.fx.blindUntil < c.round) { delete u.fx.blindUntil; if (!u.isPC || hasLight()) delete u.cond.Blinded; }
  for (const e of enemies()) {
    if (!e.fx.putrefy) continue;
    const loc = e.fx.putrefy;
    if (unitArmorAt(e, loc) > 0) { e.fx.armorMinus = { ...(e.fx.armorMinus || {}), [loc]: ((e.fx.armorMinus || {})[loc] || 0) + 1 }; io.log(`${e.name}'s ${loc} armor rots away (Putrefy Armor).`, 'good'); }
    else {
      const s = await C.save(e, 'mr', { label: 'Putrefy Armor' });
      const others = Object.keys(e.armor).concat(e.armorAll ? HIT_LOCATIONS[def(e).hitLoc || 'Body'].map((x) => x[2]) : []).filter((l) => unitArmorAt(e, l) > 0);
      if (!s.success && others.length) { e.fx.putrefy = others[0]; io.log(`The rot spreads to ${e.name}'s ${others[0]}.`, 'good'); } else delete e.fx.putrefy;
    }
  }
  for (const m of minions()) if (m.expireRound && m.expireRound < c.round) { m.hp = 0; onUnitDeath(m, {}); io.log(`${m.name} fades away.`, 'dim'); }
  if (PCU.fx.rageDazeAt === c.round) { delete PCU.fx.rageDazeAt; C.addCond(PCU, 'Dazed', 1); }
}

async function flushQueued() {
  const c = g().combat; if (!c?.queuedPCDamage) return;
  const n = c.queuedPCDamage; c.queuedPCDamage = 0;
  await damagePC(n, 'Bludgeoning', { label: 'Shielding your ally', ignoreArmor: true });
}
async function roundEndEffects() { /* reserved */ }

async function startOfTurnDamage(u) {
  const c = g().combat;
  const isP = u.isPC;
  const dmg = async (n, type, label) => (isP ? damagePC(n, type, { label, ignoreArmor: true }) : damageUnit(u, n, type, { byPC: true }));
  if (u.cond.Bleeding) await dmg(u.cond.Bleeding, 'Bleed', 'Bleeding');
  if (isDead(u)) return;
  if (u.cond.Poisoned) {
    if (c.round > (u.fx.poisonedRound || 0)) {
      const s = isP ? await check('Endurance', { label: 'Resist poison', combat: true }) : rollCheck(u.endurance);
      if (!isP) io.log(`${u.name} resists poison ${describeRoll(s)}`, 'roll dim');
      if (s.success) { delete u.cond.Poisoned; io.log(`${nm(u)} shake${isP ? '' : 's'} off the poison.`, 'dim'); }
    }
    if (u.cond.Poisoned) await dmg(u.cond.Poisoned, 'Poison', 'Poison');
  }
  if (isDead(u)) return;
  if (u.cond.Burning) await dmg(1, 'Fire', 'Burning');
  if (isDead(u)) return;
  if (u.fx.festering) await dmg(1, 'Necrotic', 'Festering wound');
  if (u.fx.graspDmg && u.cond.Restrained) { const gr = unitByUid(u.fx.graspDmg.by); if (gr && !isDead(gr)) await dmg(u.fx.graspDmg.n, u.fx.graspDmg.type, 'Grasp'); else { delete u.cond.Restrained; delete u.fx.graspDmg; delete u.fx.graspedBy; } }
  if (isP && c.sideFx?.glacialFury >= c.round) await dmg(1, 'Cold', 'Glacial Fury');
  if (u.fx.acidBurn) await dmg(1, 'Acid', 'Acid');
  if (isDead(u)) return;
  if (isP) for (const e of enemies()) {
    if (!(e.fx.aura?.until >= c.round)) continue;
    const s = await C.save(PCU, 'Endurance', { label: `${e.name}'s aura` });
    if (!s.success) await dmg(e.fx.aura.n, 'Necrotic', `${e.name}'s aura`);
    if (isDead(u)) return;
  }
  if (isP) {
    const dl = enemies().find((e) => e.fx.despair >= c.round);
    if (dl) { const s = await check('Resolve', { label: 'Aura of Despair', combat: true }); if (!s.success) C.addCond(PCU, 'Frightened', 10); }
  }
  if (u.cond.Freezing && c.round > 1) {
    const s = isP ? await check('Endurance', { label: 'Shake off the cold', combat: true }) : rollCheck(u.endurance);
    if (s.success) { delete u.cond.Freezing; io.log(`${nm(u)} ${isP ? 'are' : 'is'} no longer Freezing.`, 'dim'); }
  }
}

// ------------------------------------------------------------------ PC turn
async function pcSideTurn() {
  const c = g().combat; const p = pc(); const fx = PCU.fx;
  if (!c.pcStarted) {
    c.pcStarted = true;
    delete fx.immuneAllCond; delete fx.noDefense;
    p.flags.damagedThisTurn = false;
    await startOfTurnDamage(PCU);
    if (isDead(PCU)) return 'dead';
    c.std = 1 + (p.flags.extraAction || 0) + (fx.ragingTurns >= c.round ? 1 : 0); delete p.flags.extraAction;
    c.free = 1;
    if (fx.loseFirstTurn) { delete fx.loseFirstTurn; c.std = 0; c.free = 0; io.log('You lose your turn.', 'bad'); }
    if (fx.loseStandard) { delete fx.loseStandard; c.std = Math.max(0, c.std - 1); io.log('You spend your action recovering your weapon.', 'dim'); }
    if (p.cond.Stunned) { c.std = 0; c.free = 0; p.cond.Stunned -= 1; if (p.cond.Stunned <= 0) delete p.cond.Stunned; io.log('You are Stunned and cannot act.', 'bad'); }
    if (p.cond.Paralyzed) { c.std = 0; c.free = 0; io.log('You are Paralyzed.', 'bad'); if (typeof p.cond.Paralyzed === 'number') { p.cond.Paralyzed -= 1; if (p.cond.Paralyzed <= 0) delete p.cond.Paralyzed; } }
    if (fx.possessed >= c.round) {
      io.log('Possessed, you turn your weapon against yourself!', 'bad');
      const m = minions(); const w = mainWeapon();
      if (m.length) damageUnit(pick(m), rnd(w.unarmed ? w.die : 6), w.type, {}); else await damagePC(rnd(w.unarmed ? w.die : 6), w.type, { label: 'Possessed strike', loc: rollLocation('Humanoid') });
      c.std = 0;
      const s = await check('Resolve', { label: 'Break the possession', combat: true }); if (s.success) { delete fx.possessed; io.log('You wrest back control.', 'good'); }
    }
    if (fx.channel) {
      const ch = fx.channel; delete fx.channel; delete fx.channeling; c.std = Math.max(0, c.std - 1);
      await runAbility(C, ch.id, { complete: true, target: ch.target });
    }
  }
  save();
  io.refresh();
  // Action menu
  while (c.std > 0 || c.free > 0) {
    if (enemies().length === 0 || isDead(PCU)) break;
    const action = await pcActionMenu();
    if (action === 'end') break;
    const res = await performPcAction(action);
    await flushQueued();
    if (res === 'fled' || res === 'vanished' || res === 'calmed') { c.pcStarted = false; return res; }
    io.refresh();
  }
  // End of PC turn: Frightened decreases, Dazed counts down
  if (p.cond.Frightened) { p.cond.Frightened -= 10; if (p.cond.Frightened <= 0) delete p.cond.Frightened; }
  if (p.cond.Dazed) { p.cond.Dazed -= 1; if (p.cond.Dazed <= 0) delete p.cond.Dazed; }
  c.pcStarted = false;
  // Minions act in your turn
  for (const m of minions()) {
    if (enemies().length === 0) break;
    const t = unitByUid(m.target) && !isDead(unitByUid(m.target)) ? unitByUid(m.target) : pick(enemies());
    m.target = t.uid;
    if (m.cond.Stunned || m.cond.Paralyzed) { io.log(`${m.name} cannot act.`, 'dim'); if (typeof m.cond.Stunned === 'number') { m.cond.Stunned -= 1; if (m.cond.Stunned <= 0) delete m.cond.Stunned; } if (typeof m.cond.Paralyzed === 'number') { m.cond.Paralyzed -= 1; if (m.cond.Paralyzed <= 0) delete m.cond.Paralyzed; } continue; }
    if (m.dominated) { io.log(`${m.name} attacks at your command.`, 'info'); await C.attack(m, t, { dmg: 'D6', type: 'Bludgeoning' }); continue; }
    const d = CREATURES[m.def]; const n = rnd(6); const a = d.actions.find((x) => n >= x.lo && n <= x.hi) || d.actions[0];
    io.log(`${m.name}: <b>${a.name}</b>`, 'info');
    await a.run(C, m, t);
    await flushQueued();
  }
  return 'ok';
}

async function pcActionMenu() {
  const c = g().combat; const p = pc(); const fx = PCU.fx;
  const es = enemies();
  const opts = [];
  const canAct = c.std > 0;
  const dazed = !!p.cond.Dazed;
  const blinded = !!p.cond.Blinded; const prone = !!p.cond.Prone;
  if (fx.weaponStuck) opts.push({ label: 'Pull your stuck weapon free (Athletics)', value: { t: 'unstick' }, disabled: !canAct });
  if (prone) opts.push({ label: fx.mustStand ? 'Get up (Standard Action)' : 'Get up (Free Action; opponents roll a Defensive Move)', value: { t: 'stand' }, disabled: fx.mustStand ? !canAct : c.free < 1 });
  if (p.cond.Restrained) opts.push({ label: 'Break free (Athletics: Free Action, or Standard Action for +20)', value: { t: 'escape' } });
  if (p.cond.Burning) opts.push({ label: 'Put out the flames (Standard Action)', value: { t: 'extinguish' }, disabled: !canAct });
  for (const e of es) {
    opts.push({ label: `Attack ${e.name} (${e.hp}/${e.maxHp})`, value: { t: 'attack', id: e.uid }, disabled: !canAct || dazed || (!!fx.weaponStuck && fx.weaponStuck === p.equip.main?.uid), group: 'attack' });
  }
  if (!blinded && !prone && es.length) opts.push({ label: 'Aimed attack at a weak spot (Disadvantage)…', value: { t: 'aim' }, disabled: !canAct || dazed, group: 'attack' });
  if (!blinded && !prone) for (const a of combatAbilities(C)) opts.push({ label: a.label, value: { t: 'ability', id: a.id }, disabled: (a.free ? c.free < 1 : !canAct) || a.disabled, hint: a.hint, group: 'ability' });
  // Items
  const beltFree = !!p.equip.belt;
  if (p.potions.length) opts.push({ label: `Drink a potion${beltFree ? ' (Belt: Free Action)' : ''}…`, value: { t: 'potion' }, disabled: beltFree ? c.free < 1 && !canAct : !canAct, group: 'item' });
  if (p.fragments.length) opts.push({ label: 'Use a Fragment…', value: { t: 'fragment' }, disabled: !canAct && c.free < 1, group: 'item' });
  opts.push({ label: 'Swap weapon…', value: { t: 'swap' }, disabled: !canAct, group: 'item' });
  if (p.light?.src === 'Lamp' && !c.lampDown) opts.push({ label: 'Set your Lamp down (frees your off-hand)', value: { t: 'lamp' }, disabled: !canAct, group: 'item' });
  opts.push({ label: 'Flee to the previous room (Dodge)', value: { t: 'flee' }, disabled: !canAct || g().domain.prev == null, group: 'flee', cls: 'warn' });
  const st = `Your turn — ${c.std} Standard, ${c.free} Free action${c.free === 1 ? '' : 's'} left.`;
  // Nothing usable left: show only End turn instead of a wall of disabled buttons.
  if (!opts.some((o) => !o.disabled)) return io.choose(`${st} Nothing else you can do this turn.`, [{ label: 'End turn', value: 'end', cls: 'primary' }], { combat: true });
  opts.push({ label: c.std > 0 ? 'End turn' : 'End turn (no actions left)', value: 'end', cls: 'secondary', group: 'end' });
  return io.choose(st, opts, { combat: true });
}

async function chooseEnemyFrom(list, prompt) {
  const id = await io.choose(prompt, list.filter((e) => e.hp > 0).map((e) => ({ label: `${e.name} (${e.hp}/${e.maxHp})`, value: e.uid })), { combat: true });
  return list.find((u) => u.uid === id);
}
async function chooseEnemy(prompt) {
  const es = enemies(); if (es.length === 1) return es[0];
  const id = await io.choose(prompt, es.map((e) => ({ label: `${e.name} (${e.hp}/${e.maxHp})`, value: e.uid })), { combat: true });
  return unitByUid(id);
}

async function performPcAction(a) {
  const c = g().combat; const p = pc(); const fx = PCU.fx;
  switch (a.t) {
    case 'attack': { c.std -= 1; const t = unitByUid(a.id); await pcAttack(t); break; }
    case 'aim': { const t = await chooseEnemy('Aim at which enemy?'); c.std -= 1; await pcAttack(t, { aim: true }); break; }
    case 'ability': {
      const ab = combatAbilities(C).find((x) => x.id === a.id);
      if (ab.free) c.free -= 1; else c.std -= ab.actions || 1;
      const res = await runAbility(C, a.id, { chooseEnemy });
      if (res === 'refund') { if (ab.free) c.free += 1; else c.std += ab.actions || 1; }
      if (res === 'fled' || res === 'vanished' || res === 'calmed') return res;
      break;
    }
    case 'potion': {
      const po = await io.choose('Drink which potion?', [...p.potions.map((x) => ({ label: potionName(x), value: x.uid })), { label: 'Cancel', value: null, cls: 'secondary' }], { combat: true });
      if (!po) break;
      if (p.equip.belt && c.free > 0) c.free -= 1; else c.std -= 1;
      await drinkPotion(p.potions.find((x) => x.uid === po), { combat: true });
      if (p.flags.extraAction) { c.std += p.flags.extraAction; delete p.flags.extraAction; }
      break;
    }
    case 'fragment': {
      const id = await io.choose('Use which Fragment?', [...p.fragments.map((x) => ({ label: `${fragmentDef(x).name} — ${fragmentDef(x).text}`, value: x.uid })), { label: 'Cancel', value: null, cls: 'secondary' }], { combat: true });
      if (!id) break;
      const fr = p.fragments.find((x) => x.uid === id);
      const used = await useFragmentInCombat(C, fr, { chooseEnemy, pcAttack });
      if (used) { p.fragments = p.fragments.filter((x) => x.uid !== id); if (used === 'free') c.free -= 1; else c.std -= 1; }
      break;
    }
    case 'swap': {
      const ws = p.inv.filter((i) => i.kind === 'weapon');
      const opts = ws.map((w) => ({ label: `Wield ${w.name}${w.broken ? ' (broken)' : ''}`, value: w.uid, disabled: w.broken }));
      if (p.equip.main) opts.push({ label: 'Put your weapon away (fight unarmed)', value: 'none' });
      opts.push({ label: 'Cancel', value: null, cls: 'secondary' });
      const ch = await io.choose('Swap weapons', opts, { combat: true });
      if (!ch) break;
      c.std -= 1;
      const { equipItem, unequip } = await import('./inventory.js');
      if (ch === 'none') unequip('main'); else await equipItem(p.inv.find((i) => i.uid === ch), { combat: true });
      break;
    }
    case 'lamp': c.std -= 1; c.lampDown = true; p.equip.off = null; io.log('You set the Lamp down on the floor. Your off-hand is free.', 'info'); break;
    case 'unstick': {
      c.std -= 1; const s = await check('Athletics', { label: 'Pull weapon free', combat: true });
      if (s.success) { delete fx.weaponStuck; io.log('You wrench your weapon free.', 'good'); }
      break;
    }
    case 'stand': {
      if (fx.mustStand) { c.std -= 1; delete fx.mustStand; } else { c.free -= 1; const e = pick(enemies()); if (e) await npcDefensiveMove(e); }
      delete p.cond.Prone; io.log('You get back up.', 'info'); break;
    }
    case 'escape': {
      const asStd = c.std > 0 && await io.yesNo('Spend your Standard Action for +20 to the Athletics check?', 'Yes (+20)', 'No (Free Action)', { combat: true });
      if (asStd) c.std -= 1; else c.free -= 1;
      const s = await check('Athletics', { mod: asStd ? 20 : 0, label: 'Break free', combat: true });
      if (s.success) { delete p.cond.Restrained; delete fx.graspedBy; delete fx.graspDmg; io.log('You break free!', 'good'); }
      break;
    }
    case 'extinguish': c.std -= 1; delete p.cond.Burning; io.log('You put out the flames.', 'good'); break;
    case 'flee': {
      c.std -= 1;
      const s = await check('Dodge', { label: 'Flee', combat: true });
      if (s.success) { io.log('You disengage and flee!', 'good'); return 'fled'; }
      io.log('Your opponent blocks your escape.', 'bad');
      break;
    }
    default: break;
  }
  return 'ok';
}

// ------------------------------------------------------------------ enemy turn
async function enemiesTurn() {
  const c = g().combat;
  const list = enemies().slice().sort((a, b) => (a.cond.Freezing ? 1 : 0) - (b.cond.Freezing ? 1 : 0));
  for (const e of list) {
    if (isDead(e)) continue;
    const turns = 1 + (traitVal(e, 'Ruthlessness') || 0);
    for (let t = 0; t < turns; t++) {
      if (isDead(e) || isDead(PCU)) break;
      await enemyTurn(e, t === 0);
      while (e.fx.extraTurn && !isDead(e) && !isDead(PCU)) { delete e.fx.extraTurn; io.log(`${e.name} gets a new turn!`, 'enemy'); await enemyTurn(e, false); }
      if (enemies().length === 0) return;
    }
    if (e.cond.Frightened) { e.cond.Frightened -= 10; if (e.cond.Frightened <= 0) delete e.cond.Frightened; }
  }
}

async function enemyTurn(e, first) {
  const c = g().combat; const d = def(e);
  if (first) { await startOfTurnDamage(e); if (isDead(e)) return; }
  if (e.fx.resistAllBut?.until === 'nextTurn') delete e.fx.resistAllBut;
  if (e.fx.frenzy) delete e.fx.frenzy;
  if (first) { delete e.fx.incorporeal; delete e.fx.defBonus; if (e.fx.tempHp) { delete e.fx.tempHp; if (e.hp > e.maxHp) e.hp = e.maxHp; } }
  if (e.fx.detonate) {
    io.log(`<b>${e.name} explodes in a burst of necrotic energy!</b>`, 'enemy');
    await C.areaSave(e, pcSide(), { skill: 'Dodge', dmg: '2D10', type: 'Necrotic', half: true, area: true });
    C.selfDestruct(e); return;
  }
  if (e.fx.fireCage && e.cond.Restrained) {
    const s = await C.save(e, 'mr', { label: 'break the Fire Cage' });
    if (s.success) { delete e.cond.Restrained; delete e.fx.fireCage; io.log(`${e.name} breaks out of the Fire Cage.`, 'dim'); } else damageUnit(e, 1, 'Fire', { byPC: true, magical: true });
  }
  if (typeof e.cond.Paralyzed === 'number') { io.log(`${e.name} is Paralyzed.`, 'dim'); e.cond.Paralyzed -= 1; if (e.cond.Paralyzed <= 0) delete e.cond.Paralyzed; return; }
  if (e.cond.Stunned) { io.log(`${e.name} is Stunned.`, 'dim'); e.cond.Stunned -= 1; if (e.cond.Stunned <= 0) delete e.cond.Stunned; return; }
  if (e.cond.Paralyzed || e.cond.Sleeping) { io.log(`${e.name} cannot act.`, 'dim'); return; }
  if (e.cond.Dazed) { io.log(`${e.name} is Dazed and cannot attack.`, 'dim'); e.cond.Dazed -= 1; if (e.cond.Dazed <= 0) delete e.cond.Dazed; return; }
  if (e.cond.Prone) {
    if (e.fx.mustStand) { delete e.fx.mustStand; delete e.cond.Prone; io.log(`${e.name} spends its turn getting up.`, 'dim'); return; }
    delete e.cond.Prone; io.log(`${e.name} gets back up.`, 'dim'); await pcDefensiveMove(e);
  }
  if (e.cond.Restrained && !e.fx.restrainUntil) {
    const s = rollCheck(e.body - 20); io.log(`${e.name} struggles free (Body) ${describeRoll(s)}`, 'roll dim');
    if (s.success) delete e.cond.Restrained;
  }
  if (e.fx.vineIcon && !e.cond.Restrained) { delete e.fx.vineIcon; c.icons = c.icons.filter((i) => i !== 'vine'); }
  // target
  let tgt = unitByUid(e.target);
  if (!tgt || isDead(tgt)) { assignTargets(); tgt = unitByUid(e.target) || PCU; }
  if (tgt.isPC && PCU.fx.invisible) { const m = minions(); if (m.length) tgt = pick(m); else { io.log(`${e.name} cannot see you.`, 'dim'); return; } }
  if (e.cond.Charmed && tgt.isPC) { const m = minions(); if (m.length) tgt = pick(m); else { io.log(`${e.name} is Charmed and will not attack you.`, 'dim'); return; } }
  let forced = null;
  const held = pcSide().find((v) => v.fx.graspedBy === e.uid && v.cond.Restrained);
  const holds = d.holds || d.actions.some((a) => a.name === 'Grasp');
  if (held && holds && tgt === held) {
    if (typeof d.holds === 'string') forced = d.actions.find((a) => a.name === d.holds);
    else { const others = pcSide().filter((v) => v !== held); if (others.length) tgt = pick(others); else { io.log(`${e.name} holds ${held.isPC ? 'you' : held.name} fast...`, 'enemy'); return; } }
  }
  // action
  let a = forced; let tries = 0;
  if (!a) do { const n = rnd(6); a = d.actions.find((x) => n >= x.lo && n <= x.hi); tries += 1; } while (a && a.tag === 'Magical' && e.fx.suppressed >= c.round && tries < 12);
  if (a.tag === 'Magical' && e.fx.suppressed >= c.round) { io.log(`${e.name}'s mind is suppressed; it cannot act.`, 'dim'); return; }
  io.log(`${e.name}: <b>${a.name}</b>${a.tag ? ` <span class="dim">(${a.tag})</span>` : ''} — <i>${a.text}</i>`, 'enemy');
  c.curAction = a;
  // Tracker trap
  if (c.trap && a.tag === 'Physical') {
    delete c.trap; const s = rollCheck(e.mind); io.log(`${e.name} notices your trap? ${describeRoll(s)}`, 'roll dim');
    if (!s.success) { await C.harm(e, '3D4', 'Piercing', { byPC: true, label: 'Trap' }); if (isDead(e)) return; }
  }
  await a.run(C, e, tgt, { tag: a.tag, name: a.name });
  await flushQueued();
}

// ------------------------------------------------------------------ end
async function endCombat(result) {
  const G = g(); const c = G.combat; const p = pc(); const M = mods();
  const node = G.domain.nodes[c.nodeId] || {};
  if (c.queuedPCDamage) { c.queuedPCDamage = 0; }
  // clean combat-only conditions
  for (const k of ['Stunned', 'Dazed', 'Prone', 'Frightened', 'Restrained', 'Concealed', 'Charmed', 'Sickened', 'Cursed', 'Paralyzed', 'Sleeping', 'armorMod', 'spellResist']) delete p.cond[k];
  if (hasLight()) delete p.cond.Blinded; else p.cond.Blinded = true;
  p.cond.fx = {};
  p.minions = (p.minions || []).filter((m) => !m.expireRound && m.hp > 0);
  for (const m of p.minions) { m.cond = {}; const keep = { roomBound: m.fx.roomBound }; m.fx = keep; }
  p.effects = p.effects.filter((e) => e.rounds === undefined || e.rounds === null);
  if (c.lampDown) { io.log('You pick your Lamp back up.', 'dim'); }
  p.flags.toughPenaltyCombat = 0;
  if (result === 'won') {
    io.log('<b>Victory!</b>', 'title');
    const xp = c.overseer ? 200 : 50;
    const extra = (G.domain.extraXP || 0) * (c.dead || []).filter((d) => !CREATURES[d].overseer && !CREATURES[d].summoned).length;
    await gainXP(xp + extra, c.overseer ? 'Overseer defeated' : 'Combat Encounter');
    if (c.pendingUnstable) await damagePC(c.pendingUnstable, 'Arcane', { label: 'Unstable remains', ignoreArmor: true });
    if (c.healOnKill) await healWounds(c.healOnKill);
    healTough(rnd(4));
    if (hasMastery('reaver')) { p.tempTough += 1; io.log("Conqueror's Vitality: +1 Temporary Toughness.", 'good'); }
    if (M.postFightTough && rnd(6) <= 3) healTough(rnd(4));
    if (M.fightSanity) gainSanity(M.fightSanity);
    // armor integrity
    await integrityChecks(c);
    if (c.overseer) {
      G.domain.overseerDefeated = true; bump('overseers');
      gainSanity(rnd(4));
      io.log('With the Overseer slain, its influence over the Domain fades.', 'good');
    }
    // loot
    const counted = {};
    for (const d of c.dead || []) {
      const cd = CREATURES[d]; if (!cd.spoils) continue;
      counted[d] = (counted[d] || 0) + 1;
      if (cd.spoils === 'resources') await rollResources();
      else if (cd.spoils === 'spoils') await rollSpoils();
      else if (cd.spoils === 'overseer') { await rollValuable(); await rollPrecious(); }
    }
    node.cleared = true; node.enemies = null;
    node.corpses = (node.corpses || 0) + (c.corpses || 0);
    for (const m of minions()) m.hp = m.maxHp;
    if (c.raiseSkeleton) { const { raiseSkeleton } = await import('./abilities.js'); raiseSkeleton(true); }
    await checkGoals();
  } else if (result === 'fled') {
    node.enemies = [...new Set(c.units.filter((u) => u.hp > 0 && !def(u).summoned).map((u) => u.def))];
    node.enemyCount = c.units.filter((u) => u.hp > 0 && !def(u).summoned).length;
  } else if (result === 'calmed' || result === 'vanished') {
    node.enemies = [...new Set(c.units.filter((u) => u.hp > 0 && !def(u).summoned).map((u) => u.def))];
  }
  G.combat = null;
  clampStats();
  io.refresh();
  return result;
}

function integrityRoll(s) {
  const p = pc(); const it = p.equip[s]; if (!it || !it.integ || it.relic) return;
  const n = rnd(it.integ);
  io.log(`Armor Integrity (${it.name}): d${it.integ} → ${n}`, 'dim');
  if (n <= 2) {
    if (it.integ === 4) { io.log(`Your ${it.name} is beyond repair and falls apart.`, 'bad'); p.equip[s] = null; }
    else { const chain = [12, 10, 8, 6, 4]; it.integ = chain[chain.indexOf(it.integ) + 1]; io.log(`Your ${it.name} loses Integrity (now d${it.integ}).`, 'bad'); }
  }
}

async function integrityChecks(c) {
  const p = pc();
  const used = [];
  const locSlot = { Head: 'head', Chest: 'torso', Abdomen: 'torso', 'Left Arm': 'arms', 'Right Arm': 'arms', 'Left Leg': 'legs', 'Right Leg': 'legs' };
  for (const loc of Object.keys(c.armorUsed || {})) { const s = locSlot[loc]; if (p.equip[s] && !used.includes(s)) used.push(s); }
  if (c.shieldUsed && hasShield()) used.push('off');
  for (const s of used) {
    const it = p.equip[s]; if (!it || !it.integ || it.relic) continue;
    const n = rnd(it.integ);
    if (n <= 2) {
      if (it.integ === 4) { io.log(`Your ${it.name} is beyond repair and falls apart.`, 'bad'); p.equip[s] = null; }
      else { const chain = [12, 10, 8, 6, 4]; it.integ = chain[chain.indexOf(it.integ) + 1]; io.log(`Your ${it.name} loses Integrity (now d${it.integ}).`, 'bad'); }
    }
  }
}

export { C };
