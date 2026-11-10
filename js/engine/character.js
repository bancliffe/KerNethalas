// Character state: derived statistics, modifiers, checks, damage, healing, sanity, exhaustion, XP.
import { S, bump } from '../state.js';
import { io, Death } from '../io.js';
import { r, rnd, lookup } from '../dice.js';
import { rollCheck, describeRoll } from './rolls.js';
import { SKILLS, RESISTANCES, CRIT_EFFECTS, ARMOR_IGNORING, PC_LOC_SLOT, MADNESS, EXHAUSTION_TABLE, PERSONAL_GOALS, LEVEL_BENEFITS } from '../data/rules.js';
import { WEAPONS, TORSO, LIMB, HELMETS, SHIELDS, GEAR } from '../data/items.js';
import { MASTERY_BY_ID } from '../data/masteries.js';

export const pc = () => S.g.pc;
export const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);

// ---------------------------------------------------------------- effects / modifiers
function mergeEff(M, e) {
  for (const [k, v] of Object.entries(e)) {
    if (v == null) continue;
    if (typeof v === 'number') M[k] = (M[k] || 0) + v;
    else if (Array.isArray(v)) M[k] = (M[k] || []).concat(v);
    else if (typeof v === 'object') { M[k] = M[k] || {}; for (const [kk, vv] of Object.entries(v)) M[k][kk] = (M[k][kk] || 0) + vv; }
    else if (typeof v === 'boolean') M[k] = M[k] || v;
    else M[k] = v;
  }
}

/** Effects granted by an item: magic properties (when attuned), relic effects. */
export function itemEffects(it) {
  if (!it) return [];
  const out = [];
  if (it.magic && it.attuned) for (const p of it.props || []) if (p.eff) out.push(p.eff);
  if (it.eff && (it.relic || it.crelic)) out.push(it.eff);
  if (it.tempEff) out.push(it.tempEff);
  return out;
}

/** Masteries the character can currently use: the two learned ones plus any granted by a worn Amulet. */
export function activeMasteries(pcx = pc()) {
  const list = [...pcx.masteries];
  const am = pcx.equip.amulet;
  if (am && am.amuletMastery && !list.some((m) => m.id === am.amuletMastery)) list.push({ id: am.amuletMastery, tier: (pcx.amuletTiers || {})[am.amuletMastery] || 0, amulet: true });
  return list;
}

function featureEffects(pcx) {
  const out = [];
  for (const m of activeMasteries(pcx)) {
    switch (m.id) {
      case 'bulwark': out.push({ res: { Endurance: 10 }, noManeuver: true }); break;
      case 'umbra': out.push({ res: { Spellward: 10 }, maxSanity: 5 }); break;
      case 'tracker': out.push({ adv: ['Scavenge', 'Perception'] }); break;
      case 'zealot': out.push({ adv: ['Resolve'] }); break;
      case 'flamecaster': out.push({ restored: ['Fire'] }); break;
      case 'mindbinder': out.push({ enemyAtk: -10 }); break;
      case 'brawler': out.push({ stonefists: true }); break;
      case 'wraith': out.push({ hardToHit: true }); break;
      case 'stormbrand': out.push({ dualWielder: true }); break;
      default: break;
    }
  }
  // sustained abilities
  if (pcx.sustained.includes('stormbrand.1')) out.push({ wpool: [{ die: 4, type: 'Lightning', src: 'Infuse Weapon' }] });
  if (pcx.sustained.includes('zealot.1')) out.push({ wpool: [{ die: 4, type: 'Holy', src: 'Holy Weapon' }] });
  if (pcx.sustained.includes('reaver.2')) out.push({ wpool: [{ die: 6, type: 'Infernal', src: 'Hellish Weapon' }] });
  if (pcx.sustained.includes('umbra.1') || pcx.sustained.includes('arcanist.3')) out.push({ light: true });
  if (pcx.sustained.includes('zealot.5')) out.push({ res: { Spellward: 20 } });
  return out;
}

export function mods(pcx = pc()) {
  const M = {};
  for (const it of Object.values(pcx.equip)) for (const e of itemEffects(it)) mergeEff(M, e);
  for (const it of pcx.inv) if (it.kind === 'trinket' || it.kind === 'gear') for (const e of itemEffects(it)) mergeEff(M, e);
  for (const e of featureEffects(pcx)) mergeEff(M, e);
  for (const e of pcx.rewards) mergeEff(M, e);
  for (const e of pcx.effects) if (e.eff) mergeEff(M, e.eff);
  for (const p of pcx.perks) mergeEff(M, { perks: [p] });
  if (pcx.rot >= 1) mergeEff(M, { immune: ['Necrotic'], vulnerable: ['Holy'] });
  if (pcx.rot >= 3) M.light = true;
  return M;
}
export const hasPerk = (p) => pc().perks.includes(p);
export const hasMastery = (id) => activeMasteries().some((m) => m.id === id);
export const abilityTier = (id) => activeMasteries().find((m) => m.id === id)?.tier || 0;
export const hasAbility = (aid) => { const [m, t] = aid.split('.'); return abilityTier(m) >= +t || mods().grantAbility?.includes?.(aid); };

// ---------------------------------------------------------------- maxima
const madCount = (n) => pc().madness.filter((x) => x === n).length;
export function maxHealth() { return Math.max(1, pc().base.health + (mods().maxHealth || 0) - (pc().flags.healthPenalty || 0)); }
export function maxTough() {
  const p = pc(); let v = p.base.tough + (mods().maxTough || 0) - madCount(3) - (p.flags.toughPenalty || 0);
  if (p.rot >= 2) v = Math.ceil(v / 2);
  return Math.max(1, v);
}
export const SUSTAIN_COSTS = { 'reaver.2': 5, 'arcanist.3': 4, 'stormbrand.1': 4, 'umbra.1': 5, 'zealot.1': 5, 'zealot.5': 2, 'frostweaver.5': 4, 'gravecaller.1': 2, 'gravecaller.4': 4, 'arcanist.4': 4, 'flamecaster.4': 4, 'frostweaver.4': 4, 'mindbinder.5': 4 };
const MINION_SUMMONS = ['gravecaller.1', 'gravecaller.4', 'arcanist.4', 'flamecaster.4', 'frostweaver.4'];
export function sustainedCost() {
  const p = pc();
  let total = 0; let minion = 0;
  for (const id of p.sustained) { const k = id.split('#')[0]; const c = SUSTAIN_COSTS[k] || 0; total += c; if (MINION_SUMMONS.includes(k)) minion += c; }
  if (mods().minionAether) total -= Math.min(minion, mods().minionAether);
  return total;
}
export function maxAether() { return Math.max(0, pc().base.aether + (mods().maxAether || 0) - sustainedCost()); }
export function maxSanity() { return Math.max(1, pc().base.sanity + (mods().maxSanity || 0) - (hasAbility('reaver.3') ? 5 : 0)); }
export function clampStats() {
  const p = pc();
  p.health = Math.min(p.health, maxHealth());
  p.tough = Math.min(p.tough, maxTough());
  p.aether = Math.min(p.aether, maxAether());
  p.sanity = Math.min(p.sanity, maxSanity());
}

// ---------------------------------------------------------------- equipment info
export function weaponInfo(it) {
  if (!it) return null;
  const base = WEAPONS[it.base] || WEAPONS[it.name];
  if (!base) return null;
  return { ...base, item: it, name: it.name };
}
export function mainWeapon() {
  const p = pc(); const it = p.equip.main;
  if (it && it.kind === 'weapon' && !it.broken) return weaponInfo(it);
  const stone = mods().stonefists;
  return { name: 'Unarmed', type: 'Bludgeoning', skill: 'Unarmed Combat & Fist Weapons', speed: 0, traits: [], unarmed: true, die: stone ? 6 : 4 };
}
export function offHandItem() { return pc().equip.off; }
export function hasShield() { const o = pc().equip.off; return o && o.kind === 'shield' && !o.broken ? o : null; }
export function twoHanded() { const w = mainWeapon(); return w.traits.includes('Two-Handed'); }
export function handsFree() { return !pc().equip.off; }

export function armorPieces() {
  const p = pc(); return ['head', 'torso', 'arms', 'legs'].map((s) => p.equip[s]).filter(Boolean);
}
export function maneuverPenalty() {
  if (mods().noManeuver) return 0;
  const t = pc().equip.torso; return t && TORSO[t.base] ? TORSO[t.base].man : 0;
}
export function helmetPenalty() { const h = pc().equip.head; return h && HELMETS[h.base] ? HELMETS[h.base].perc : 0; }

export function pcArmorAt(loc) {
  const p = pc(); const slot = PC_LOC_SLOT[loc]; if (!slot) return 0;
  const it = p.equip[slot]; const M = mods();
  let v = 0;
  if (it) v += Math.max(0, (it.prot || 0) - (it.acid || 0));
  v += (M.armorBonus?.[slot] || 0) + (M.armorAll || 0);
  v += (p.cond.armorMod?.[slot] || 0);
  return Math.max(0, v);
}

// ---------------------------------------------------------------- skill values
export function skillBase(name) { return pc().skills[name] ?? 0; }
export function skillValue(name, { forDefense = false } = {}) {
  const p = pc(); const M = mods();
  if (RESISTANCES.includes(name)) return Math.min(80, (p.res[name] || 0) + (M.res?.[name] || 0));
  let v = skillBase(name) + (M.skill?.[name] || 0);
  if (['Acrobatics', 'Dodge', 'Stealth'].includes(name)) v -= maneuverPenalty();
  if (name === 'Perception') v -= helmetPenalty();
  const w = mainWeapon();
  if (name === w.skill) {
    if (w.traits.includes('Simple')) v += 10;
    if (p.dedication && w.item && w.item.base === p.dedication) v += 10;
  }
  return v;
}
export const resValue = (n) => skillValue(n);

// ---------------------------------------------------------------- checks
/**
 * Perform a check against a Skill or Resistance.
 * opts: mod, adv, dis, label, combat (bool), quiet, noCrit
 */
export async function check(name, opts = {}) {
  const p = pc(); const M = mods(); const g = S.g;
  const isRes = RESISTANCES.includes(name);
  let target = skillValue(name) + (opts.mod || 0);
  let adv = !!opts.adv; let dis = !!opts.dis;
  const notes = [];
  if (M.adv?.includes(name)) adv = true;
  if (name === 'Reason' && hasPerk('Scholar')) adv = true;
  if (p.exh >= 16 && p.rot < 7) { dis = true; notes.push('exhausted'); }
  if (p.cond.Blinded && name !== 'Reason') { dis = true; notes.push('blinded'); }
  if (p.cond.Sickened) { target -= p.cond.Sickened; notes.push(`sickened -${p.cond.Sickened}`); }
  if (p.cond.Freezing) { target -= 10; notes.push('freezing'); }
  if (p.cond.Restrained && ['Acrobatics', 'Dodge', 'Athletics', 'Bladed Weapons', 'Bludgeoning Weapons', 'Shafted Weapons', 'Unarmed Combat & Fist Weapons'].includes(name)) { target -= 20; notes.push('restrained'); }
  if (p.rot >= 6 && ['Dodge', 'Athletics', 'Acrobatics', 'Bladed Weapons', 'Bludgeoning Weapons', 'Shafted Weapons', 'Unarmed Combat & Fist Weapons'].includes(name)) dis = true;
  if (name === 'Resolve') target -= 10 * madCount(6);
  if (name === 'Scavenge') target -= 10 * madCount(5);
  if (!opts.combat && !isRes && g.domain?.growing?.includes('dull')) { target -= 10; notes.push('dull mind'); }
  // next-check flags from earlier criticals
  const nf = p.flags.next || {};
  if (nf[name] === 'adv') { adv = true; delete nf[name]; }
  if (nf[name] === 'dis') { dis = true; delete nf[name]; }
  if (nf[name] && typeof nf[name] === 'number') { target += nf[name]; notes.push(`${fmt(nf[name])}`); delete nf[name]; }
  if (nf.any && typeof nf.any === 'number') { target += nf.any; notes.push(`${fmt(nf.any)}`); delete nf.any; }
  p.flags.next = nf;
  if (name === 'Athletics' && p.flags.athleticsBoost) { target += p.flags.athleticsBoost; notes.push(`+${p.flags.athleticsBoost}`); delete p.flags.athleticsBoost; }

  let res = rollCheck(target, { adv, dis });
  if (!res.success && !opts.quiet && !opts.noReroll) {
    const node = g.domain?.nodes?.[g.domain.cur];
    if (name === 'Dodge' && M.rerollDodge && node && !node.dodgeReroll) {
      node.dodgeReroll = true; io.log(`${name} ${describeRoll(res)} — your boots let you reroll.`, 'dim'); res = rollCheck(target, { adv, dis });
    } else if (M.reroll && !p.once.reroll && await io.yesNo(`${opts.label ? `${opts.label}: ` : ''}${name} failed (${res.value} vs ${target}). Use your magic item to reroll it? (once per Camp Rest)`, 'Reroll', 'Accept')) {
      p.once.reroll = true; res = rollCheck(target, { adv, dis });
    }
  }
  const advTxt = adv && !dis ? ' [Adv]' : dis && !adv ? ' [Dis]' : '';
  if (!opts.quiet) io.log(`${opts.label ? `${opts.label}: ` : ''}<b>${name}</b>${advTxt}${notes.length ? ` <span class="dim">(${notes.join(', ')})</span>` : ''} ${describeRoll(res)}`, res.success ? 'roll good' : 'roll bad');
  // Skill improvement on doubles (Skills only)
  if (res.doubles && !isRes && SKILLS.includes(name) && !p.improve.includes(name)) { p.improve.push(name); io.log(`${name} marked for Improvement.`, 'dim'); }
  if (!opts.noCrit && !opts.combat && (res.crit || res.fumble)) await applyCritEffect(name, res);
  res.name = name;
  return res;
}

async function applyCritEffect(name, res) {
  const p = pc(); const ce = CRIT_EFFECTS[name]; if (!ce) return;
  const nf = (p.flags.next = p.flags.next || {});
  if (res.crit) {
    io.log(ce.success, 'good');
    switch (name) {
      case 'Acrobatics': nf.any = 30; break;
      case 'Athletics': p.flags.herculean = true; break;
      case 'Endurance': await healHealth(1); gainExh(-r('D4')); break;
      case 'Medicine': healTough(r('D10')); break;
      case 'Perception': nf.Perception = 'adv'; break;
      case 'Resolve': gainSanity(r('D4+1')); break;
      case 'Thievery': nf.Thievery = 'adv'; break;
      case 'Reason': {
        const unk = allItems().find((it) => it.magic && !it.identified);
        if (unk) { unk.identified = true; unk.attuned = true; io.log(`You identify the ${unk.name}: ${unk.props.map((x) => x.t).join(' ')}`, 'loot'); }
        break;
      }
      default: break;
    }
  } else {
    io.log(ce.fail, 'bad');
    switch (name) {
      case 'Acrobatics': await damagePC(r('D6'), 'Bludgeoning', { label: 'Catastrophic Tumble' }); break;
      case 'Athletics': gainExh(r('D4')); break;
      case 'Endurance': gainExh(r('D4')); break;
      case 'Medicine': await damagePC(r('2D6'), 'Bludgeoning', { label: 'Harmful Treatment' }); break;
      case 'Perception': nf.Perception = 'dis'; break;
      case 'Resolve': await loseSanity(r('D4'), { noResolve: true }); break;
      case 'Reason': { const { adjustLairDie } = await import('./explore.js'); adjustLairDie(+1); break; }
      default: break;
    }
  }
}

// ---------------------------------------------------------------- damage & healing
export function isDead() { return pc().health <= 0; }

/**
 * Apply damage to the PC. opts: loc (hit location), crit, weak, penetrating, label, source, inCombat, ignoreArmor
 * Returns the amount actually dealt.
 */
export async function damagePC(amount, type, opts = {}) {
  const p = pc(); const M = mods(); const g = S.g;
  let dmg = Math.max(0, Math.round(amount));
  const notes = [];
  if (opts.loc && !opts.ignoreArmor && !ARMOR_IGNORING.has(type)) {
    let armor = pcArmorAt(opts.loc);
    if (type === 'Bludgeoning') armor = Math.max(0, armor - 1);
    armor = Math.max(0, armor - (opts.penetrating || 0));
    if (armor) { dmg = Math.max(0, dmg - armor); notes.push(`armor ${armor}`); }
    if (type === 'Acid') { const slot = PC_LOC_SLOT[opts.loc]; const it = p.equip[slot]; if (it) { it.acid = (it.acid || 0) + 1; notes.push('acid corrodes armor'); } }
  }
  if (type === 'Slashing' && opts.attack && dmg > 0 && dmg <= 3) { dmg += 1; notes.push('slashing +1'); }
  if (M.dr?.[type]) { dmg = Math.max(0, dmg - M.dr[type]); notes.push(`DR ${M.dr[type]}`); }
  const immune = (M.immune || []).includes(type) || (type === 'Bludgeoning' && hasAbility('bulwark.5'));
  const restored = (M.restored || []).includes(type) || (type === 'Necrotic' && hasAbility('gravecaller.5'));
  const resist = (M.resist || []).includes(type) || (type === 'Piercing' && hasAbility('bulwark.5')) || (type === 'Slashing' && hasAbility('wrathspawn.5')) || (opts.magic && p.cond.spellResist);
  const vuln = (M.vulnerable || []).includes(type);
  if (restored) { io.log(`${opts.label ? `${opts.label}: ` : ''}You are Restored by ${type} damage and recover ${dmg} Wounds.`, 'good'); await healWounds(dmg); return 0; }
  if (immune) { io.log(`You are Immune to ${type} damage.`, 'good'); return 0; }
  if (resist && !vuln) { dmg = Math.ceil(dmg / 2); notes.push('resistant'); }
  if (vuln && !resist) { dmg *= 2; notes.push('vulnerable'); }
  if (g.domain?.growing?.includes('weakness') && dmg > 0) { dmg += 1; notes.push('weakness +1'); }
  const rnd0 = S.g.combat?.round ?? -1;
  if (p.cond.fx?.berserkUntil >= rnd0 && rnd0 >= 0) { dmg *= 2; notes.push('berserk'); }
  if (p.cond.fx?.shadowFormUntil >= rnd0 && rnd0 >= 0 && type !== 'Arcane') { io.log('In your shadow form, only Arcane damage can touch you.', 'good'); return 0; }
  if (opts.doubleDamage) { dmg *= 2; notes.push('doubled'); }
  if (p.cond.immuneAllDamage) { io.log('You ignore the damage.', 'good'); return 0; }
  return applyDamage(dmg, type, opts, notes);
}

async function applyDamage(dmg, type, opts, notes) {
  const p = pc();
  let left = dmg;
  const fromTemp = Math.min(p.tempTough, left); p.tempTough -= fromTemp; left -= fromTemp;
  const fromT = Math.min(p.tough, left); p.tough -= fromT; left -= fromT;
  const fromH = left;
  p.health -= fromH;
  io.log(`${opts.label ? `${opts.label}: ` : ''}You take <b>${dmg}</b> ${type} damage${notes.length ? ` <span class="dim">(${notes.join(', ')})</span>` : ''}${fromH ? ` — <b class="bad">${fromH} to Health</b>` : ''}.`, dmg ? 'bad' : 'dim');
  if (dmg > 0) p.flags.damagedThisTurn = true;
  if (p.health <= 0) await onLethal(opts);
  io.refresh();
  return dmg;
}

async function onLethal(opts) {
  const p = pc();
  const echo = p.inv.find((it) => it.name === 'Echo of Resurgence');
  if (echo) {
    p.inv = p.inv.filter((x) => x !== echo);
    p.health = Math.min(maxHealth(), r('D10'));
    io.log('The Echo of Resurgence shatters, absorbing the fatal blow!', 'good');
    return;
  }
  if (p.flags.cheatDeath) { delete p.flags.cheatDeath; p.health = 1; io.log('You have seen your own death before, and you refuse it. You cling to life with 1 Health.', 'good'); return; }
  if (hasAbility('tracker.4') && !p.once.willToSurvive) { p.once.willToSurvive = true; p.health = 1; io.log('Will to Survive: your Health drops to 1 instead.', 'good'); return; }
  throw new Death(opts.label || 'your wounds');
}

export function healTough(n) {
  const p = pc(); if (p.exh >= 11 && p.exh <= 15) n = Math.floor(n / 2);
  const before = p.tough; p.tough = Math.min(maxTough(), p.tough + n);
  if (p.tough > before) io.log(`You recover ${p.tough - before} Toughness.`, 'good');
  return p.tough - before;
}
export async function healHealth(n) {
  const p = pc(); const before = p.health; p.health = Math.min(maxHealth(), p.health + n);
  if (p.health > before) io.log(`You recover ${p.health - before} Health.`, 'good');
  return p.health - before;
}
/** Recover Wounds: Toughness first, then Health. */
export async function healWounds(n) {
  const p = pc(); if (p.exh >= 11 && p.exh <= 15 && p.rot < 7) n = Math.floor(n / 2);
  let left = n;
  const t = Math.min(maxTough() - p.tough, left); p.tough += t; left -= t;
  const h = Math.min(maxHealth() - p.health, left); p.health += h;
  if (t + h > 0) { io.log(`You recover ${t + h} Wounds.`, 'good'); if (p.cond.fx) delete p.cond.fx.festering; }
  io.refresh();
  return t + h;
}

// ---------------------------------------------------------------- sanity
export function gainSanity(n) {
  const p = pc(); const before = p.sanity; p.sanity = Math.min(maxSanity(), p.sanity + n);
  if (p.sanity > before) io.log(`You recover ${p.sanity - before} Sanity.`, 'good');
}
/** Lose Sanity. If opts.resolve is true a Resolve check is made first. */
export async function loseSanity(n, opts = {}) {
  const p = pc(); const g = S.g;
  if (opts.resolve) {
    const c = await check('Resolve', { label: opts.label || 'Hold on to your wits' });
    if (c.success) return 0;
  }
  if (p.effects.some((e) => e.id === 'noSanityLoss')) { io.log('You feel nothing. Your Sanity is untouched.', 'dim'); return 0; }
  n += madCount(4);
  if (p.tempSanity > 0) { const t = Math.min(p.tempSanity, n); p.tempSanity -= t; n -= t; }
  p.sanity -= n;
  io.log(`You lose <b>${n}</b> Sanity.`, 'bad');
  if (g.domain?.growing?.includes('marks') && n > 0) {
    const c = await check('Endurance', { label: 'Mental wounds leave marks' });
    if (!c.success) await damagePC(r('D6'), 'Psychic', { label: 'Mental wounds' });
  }
  if (p.sanity <= 0) await madness();
  io.refresh();
  return n;
}

export async function madness() {
  const p = pc();
  const ignore = mods().ignoreMadness || 0;
  let roll = rnd(10) - madCount(2);
  roll = Math.max(1, roll);
  const txt = MADNESS[roll - 1];
  io.log(`<b>Your mind cracks.</b> Madness (${roll}): ${txt}`, 'bad');
  p.sanity = maxSanity();
  if (roll === 1) throw new Death('madness');
  if (roll === 8) {
    const choice = await io.choose('Madness: reduce a Skill of your choosing by 10.', SKILLS.map((s) => ({ label: `${s} (${skillBase(s)})`, value: s })));
    p.skills[choice] = Math.max(0, skillBase(choice) - 10);
  }
  if (roll === 9) await damagePC(r('2D6'), 'Bludgeoning', { label: 'You slap yourself', ignoreArmor: true });
  if (roll === 10) await gainXP(100);
  if ([2, 3, 4, 5, 6, 7, 8].includes(roll)) {
    if (ignore > p.madness.filter((m) => m !== 9 && m !== 10).length) io.log('A magic item shields you from the worst of it.', 'good');
    p.madness.push(roll);
  }
  clampStats();
}

// ---------------------------------------------------------------- exhaustion
export function gainExh(n) {
  const p = pc();
  if (n > 0 && mods().exhReduce) n = Math.max(1, n - 1);
  const before = p.exh; p.exh = Math.max(0, p.exh + n);
  if (p.exh !== before) io.log(n > 0 ? `You gain ${p.exh - before} Exhaustion.` : `You lose ${before - p.exh} Exhaustion.`, n > 0 ? 'bad' : 'good');
  if (p.exh >= 21 && p.rot < 7) throw new Death('exhaustion');
  io.refresh();
}
export function exhaustionEffect() { return lookup(EXHAUSTION_TABLE, pc().exh); }

// ---------------------------------------------------------------- XP & leveling
export async function gainXP(n, why = '') {
  const p = pc();
  n -= 10 * madCount(7);
  if (n <= 0) return;
  p.xp += n;
  io.log(`+${n} XP${why ? ` (${why})` : ''}`, 'good');
  while (p.xp >= p.level * 1000) await levelUp();
  io.refresh();
}

async function levelUp() {
  const p = pc();
  p.level += 1; p.abilityPoints += 1;
  io.log(`<b>You reached level ${p.level}!</b> +1 Ability Point.`, 'title');
  const opts = LEVEL_BENEFITS.map((b) => ({ label: b.text, value: b.id }));
  const pickd = await io.choose(`Level ${p.level}: choose a benefit.`, opts);
  switch (pickd) {
    case 'health': { const v = r('D4'); p.base.health += v; p.health += v; io.log(`Health +${v}`, 'good'); break; }
    case 'tough': { const v = r('D6'); p.base.tough += v; p.tough += v; io.log(`Toughness +${v}`, 'good'); break; }
    case 'sanity': { const v = r('D4'); p.base.sanity += v; p.sanity += v; io.log(`Sanity +${v}`, 'good'); break; }
    case 'aether': { const v = r('D6'); p.base.aether += v; p.aether += v; io.log(`Aether +${v}`, 'good'); break; }
    case 'pool': {
      const t = await io.choose('Pick the damage type.', ['Slashing', 'Bludgeoning', 'Piercing'].map((x) => ({ label: x, value: x })));
      p.rewards.push({ pool: [{ die: 6, type: t, physical: true, src: 'Level' }] }); break;
    }
    case 'skill': {
      const s = await io.choose('Increase a Skill by +5.', SKILLS.map((x) => ({ label: `${x} (${skillBase(x)})`, value: x })));
      p.skills[s] = skillBase(s) + 5; break;
    }
    case 'res': for (const k of RESISTANCES) p.res[k] = Math.min(80, p.res[k] + 5); break;
    default: break;
  }
  if (hasAbility('bulwark.4')) { p.base.tough += 2; }
  await spendAbilityPoints();
}

/** Options for spending an Ability Point: the next tier of each Mastery you can advance. */
export function abilityPointOptions() {
  const p = pc(); const out = [];
  for (const m of activeMasteries()) {
    const md = MASTERY_BY_ID[m.id]; if (m.tier >= 5) continue;
    const t = md.tiers[m.tier];
    out.push({ id: m.id, amulet: !!m.amulet, label: `${md.name} — Tier ${m.tier + 1}: ${t[0]}`, hint: `${t[1]}. ${t[2]}` });
  }
  return out;
}
export async function unlockTier(mid, amulet) {
  const p = pc();
  if (amulet) { p.amuletTiers = p.amuletTiers || {}; p.amuletTiers[mid] = (p.amuletTiers[mid] || 0) + 1; }
  else p.masteries.find((m) => m.id === mid).tier += 1;
  p.abilityPoints -= 1;
  const tier = abilityTier(mid); const t = MASTERY_BY_ID[mid].tiers[tier - 1];
  io.log(`<b>New Ability: ${t[0]}</b> (${MASTERY_BY_ID[mid].name}, Tier ${tier}). ${t[2]}`, 'title');
  if (mid === 'bulwark' && tier === 4) { p.base.tough += p.level; p.tough += p.level; io.log(`Battle Form: Toughness +${p.level}.`, 'good'); }
  if (mid === 'reaver' && tier === 3) clampStats();
  io.refresh();
}
export async function spendAbilityPoints() {
  const p = pc();
  while (p.abilityPoints > 0) {
    const opts = abilityPointOptions();
    if (!opts.length) { io.log('All your Masteries are fully unlocked.', 'dim'); return; }
    const ch = await io.choose(`You have ${p.abilityPoints} Ability Point${p.abilityPoints > 1 ? 's' : ''}. Unlock the next Ability of which Mastery?`, [...opts.map((o) => ({ label: o.label, hint: o.hint, value: o })), { label: 'Later', value: null, cls: 'secondary' }]);
    if (!ch) return;
    await unlockTier(ch.id, ch.amulet);
  }
}

// ---------------------------------------------------------------- personal goals
export async function checkGoals() {
  const p = pc();
  for (const gl of [...p.goals]) {
    const def = PERSONAL_GOALS.find((x) => x.id === gl.id); if (!def) continue;
    if ((p.stats[def.stat] || 0) >= def.n) {
      p.goals = p.goals.filter((x) => x.id !== gl.id); p.goalsDone.push(gl.id);
      io.log(`<b>Personal Goal complete: ${def.name}!</b> ${def.reward}`, 'title');
      const e = def.eff;
      if (e.perk) p.perks.push(e.perk);
      else if (e.xp) await gainXP(e.xp, def.name);
      else if (e.maxAetherRoll) { const v = r(e.maxAetherRoll); p.base.aether += v; }
      else if (e.amulet) { const { makeMagicItem } = await import('./loot.js'); const it = makeMagicItem('amulet'); addItem(it); io.log(`You obtain ${it.name}.`, 'loot'); }
      else p.rewards.push(e);
    }
  }
}

// ---------------------------------------------------------------- inventory
export function allItems() { const p = pc(); return [...Object.values(p.equip).filter(Boolean), ...p.inv]; }
export function itemWeight(it) {
  if (it.kind === 'weapon') return WEAPONS[it.base]?.traits.includes('Two-Handed') ? 2 : 1;
  if (it.kind === 'shield') return SHIELDS[it.base]?.heavy ? 2 : 1;
  if (['ring', 'amulet', 'trinket', 'consumable'].includes(it.kind)) return 0.1;
  if (it.kind === 'gear') return GEAR[it.name]?.[1] === 'heavy' || it.heavy ? 2 : 1;
  return 1;
}
export function capacity() {
  const p = pc(); let c = 10 + (mods().carry || 0);
  if (p.inv.some((i) => i.name === 'Backpack')) c += 20;
  c += Math.min(3, p.inv.filter((i) => i.name === 'Pouch').length) * 5;
  return c;
}
export function slotsUsed() {
  const p = pc(); let light = 0; let used = 0;
  for (const it of p.inv) {
    if (it.name === 'Backpack' || it.name === 'Pouch') continue; // worn
    const w = itemWeight(it); if (w < 1) light += 1; else used += w;
  }
  for (const [k, v] of Object.entries(p.sup)) { if (k === 'coins') used += Math.ceil(v / 100); else light += v; }
  light += p.potions.length + p.fragments.length;
  used += Math.ceil(light / 10);
  return used;
}
export const overloaded = () => slotsUsed() > capacity();
export function addItem(it) { pc().inv.push(it); io.refresh(); }
export function addSup(key, n) {
  const p = pc(); p.sup[key] = Math.max(0, (p.sup[key] || 0) + n);
  if (key === 'coins' && n > 0) bump('coinsGained', n);
  io.refresh();
}

// ---------------------------------------------------------------- light
export function hasLight() {
  const p = pc(); const g = S.g;
  if (mods().light) return true;
  if (g.domain?.nodes?.[g.domain.cur]?.flare) return true;
  return !!(p.light && p.light.rooms > 0);
}
export function lightLabel() {
  const p = pc();
  if (mods().light) return 'Magical light';
  if (S.g.domain?.nodes?.[S.g.domain.cur]?.flare) return 'Flare';
  if (p.light && p.light.rooms > 0) return `${p.light.src} (${p.light.rooms})`;
  return 'None';
}

// ---------------------------------------------------------------- mastery helpers
export function masteryName(id) { return MASTERY_BY_ID[id]?.name || id; }
