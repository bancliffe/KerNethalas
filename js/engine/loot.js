// Loot generation and consumables (Chapter VI).
import { S, uid, bump } from '../state.js';
import { io } from '../io.js';
import { r, rnd, lookup, pick } from '../dice.js';
import {
  WEAPONS, TORSO, LIMB, HELMETS, SHIELDS, GEAR, SUPPLIES, RANDOM_WEAPON, RANDOM_ARMOR, RANDOM_LIMB, RANDOM_SHIELD, RANDOM_TORSO,
  SPOILS, MUNDANE, VALUABLE, PRECIOUS, RESOURCES, GEMS, CONTAINER_LOOT, POTIONS, POTION_AGING, FRAGMENTS, LORE_BOOKS,
  MAGIC_ITEM_TYPE, RARITY, PROPS, PECULIARITIES, RELICS, CONTAINER_RELICS, RARITY_SELL,
} from '../data/items.js';
import { DAMAGE_TYPE_TABLE, ENEMY_TYPES, SKILLS } from '../data/rules.js';
import { MASTERIES } from '../data/masteries.js';
import { pc, addItem, addSup, gainXP, healWounds, gainSanity, gainExh, check, damagePC, maxTough, clampStats, checkGoals } from './character.js';
import { stepDown } from '../dice.js';

// ---------------------------------------------------------------- item factories
export function makeWeapon(name) {
  const w = WEAPONS[name];
  return { uid: uid(), kind: 'weapon', base: name, name, cost: w.cost };
}
function lootInteg(max) { return stepDown(max) || 4; } // found armor starts one stage lower
export function makeArmor(slot, base, found = true) {
  if (slot === 'torso') { const a = TORSO[base]; return { uid: uid(), kind: 'torso', slot, base, name: `${base} Armor`, prot: a.prot, maxInteg: a.integ, integ: found ? lootInteg(a.integ) : a.integ, cost: a.cost }; }
  if (slot === 'head') { const a = HELMETS[base]; return { uid: uid(), kind: 'head', slot, base, name: `${base} Helmet`, prot: a.prot, maxInteg: a.integ, integ: found ? lootInteg(a.integ) : a.integ, cost: a.cost }; }
  if (slot === 'shield') { const a = SHIELDS[base]; return { uid: uid(), kind: 'shield', slot: 'off', base, name: `${base} Shield`, parry: a.parry, maxInteg: a.integ, integ: found ? lootInteg(a.integ) : a.integ, cost: a.cost }; }
  const a = LIMB[base];
  const nm = slot === 'arms' ? 'Vambraces' : 'Greaves';
  return { uid: uid(), kind: slot, slot, base, name: `${base} ${nm}`, prot: a.prot, maxInteg: a.integ, integ: found ? lootInteg(a.integ) : a.integ, cost: a.cost };
}
export function makeGear(name) {
  const g = GEAR[name];
  const kind = name === 'Belt' ? 'belt' : 'gear';
  return { uid: uid(), kind, name, cost: g[0], desc: g[2] };
}

export function randomWeaponName() {
  let n; do { n = lookup(RANDOM_WEAPON, rnd(100)); } while (n === 'MAGIC');
  return n;
}
export function makeRandomWeapon() {
  const n = lookup(RANDOM_WEAPON, rnd(100));
  if (n === 'MAGIC') return makeMagicItem('weapon');
  return makeWeapon(n);
}
export function makeRandomArmor(allowMagic = true) {
  const slot = lookup(RANDOM_ARMOR, rnd(10));
  if (slot === 'torso') {
    const b = lookup(RANDOM_TORSO, rnd(100));
    if (b === 'MAGIC') return allowMagic ? makeMagicItem('armor') : makeArmor('torso', 'Heavy Cloth');
    return makeArmor('torso', b);
  }
  if (slot === 'shield') return makeArmor('shield', lookup(RANDOM_SHIELD, rnd(100)));
  return makeArmor(slot, lookup(RANDOM_LIMB, rnd(100)));
}

const damageType = () => lookup(DAMAGE_TYPE_TABLE, rnd(20));

export function makeMagicItem(forcedType) {
  const type = forcedType || lookup(MAGIC_ITEM_TYPE, rnd(8));
  const [rarity, nprops] = lookup(RARITY, rnd(10));
  let item;
  if (type === 'weapon') { item = makeWeapon(randomWeaponName()); }
  else if (type === 'armor') {
    let a; do { a = makeRandomArmor(false); } while (!a);
    item = a;
  } else if (type === 'belt') item = { uid: uid(), kind: 'belt', name: 'Belt', cost: 1000 };
  else if (type === 'boots') item = { uid: uid(), kind: 'boots', name: 'Boots', cost: 0 };
  else if (type === 'gloves') item = { uid: uid(), kind: 'gloves', name: 'Gloves', cost: 0 };
  else if (type === 'ring') item = { uid: uid(), kind: 'ring', name: 'Ring', cost: 0 };
  else if (type === 'amulet') {
    const m = MASTERIES[rnd(20) - 1];
    return { uid: uid(), kind: 'amulet', name: `Amulet of the ${m.name}`, amuletMastery: m.id, magic: true, identified: true, attuned: true, rarity: 'Amulet', props: [{ t: `Grants access to the ${m.name} Mastery.` }], noSell: true, peculiarity: pick(PECULIARITIES) };
  }
  const table = type === 'weapon' ? PROPS.weapon : type === 'armor' ? PROPS.armor : PROPS[type];
  const rr = nprops;
  const props = [];
  for (let i = 0; i < nprops; i++) {
    const def = lookup(table, rnd(20));
    const p = { t: def.t };
    const v = def.v ? (def.roll ? r(def.v(rr)) : def.v(rr)) : null;
    const dt = def.dt ? damageType() : null;
    const et = def.et ? ENEMY_TYPES[rnd(8) - 1] : null;
    p.needsSkill = !!def.sk;
    p.t = p.t.replace('{v}', v).replace('{dt}', dt).replace('{et}', et);
    p.def = { v, dt, et };
    p.eff = def.sk ? null : def.eff(v, dt, null, et);
    p.src = table === PROPS.weapon ? 'weapon' : type;
    if (def.sk) p.skillProp = { amount: def.t.includes('by 10') ? 10 : 20, slotType: type };
    props.push(p);
  }
  item.magic = true; item.rarity = rarity; item.props = props; item.identified = false; item.attuned = false;
  item.peculiarity = pick(PECULIARITIES);
  item.trueName = item.name;
  item.name = `Unidentified ${item.name}`;
  return item;
}

export function finishAttunement(item, skillChoice) {
  item.identified = true; item.attuned = true;
  item.name = `${item.trueName} (${item.rarity})`;
  for (const p of item.props) {
    if (p.needsSkill && skillChoice) {
      p.t = p.t.replace('{sk}', skillChoice);
      p.eff = { skill: { [skillChoice]: p.skillProp.amount } };
      p.needsSkill = false;
    }
  }
}

export function makeRelic(name) {
  const def = name ? RELICS.find((x) => x.name === name) : RELICS[rnd(20) - 1];
  bump('relics');
  let item;
  if (def.kind === 'weapon') item = { ...makeWeapon(def.base) };
  else if (def.kind === 'shield') item = makeArmor('shield', def.base, false);
  else if (def.kind === 'torso') item = makeArmor('torso', def.base, false);
  else item = { uid: uid(), kind: def.kind === 'head' ? 'head' : def.kind, prot: 0, maxInteg: 0 };
  Object.assign(item, { name: def.name, relic: true, identified: true, desc: def.text, flavor: def.flavor, eff: def.eff || {}, use: def.use || null, rarity: 'Relic', cost: 1000 });
  if (def.kind === 'shield') item.parry += def.eff?.parryExtra || 0;
  return item;
}
export function makeContainerRelic(name) {
  const def = CONTAINER_RELICS[name];
  let item;
  if (def.kind === 'weapon') item = makeWeapon(def.base);
  else item = { uid: uid(), kind: def.kind };
  Object.assign(item, { name, crelic: true, identified: true, desc: def.text, eff: def.eff || {}, use: def.use || null, heavy: !!def.heavy, cost: 0 });
  return item;
}

export function sellValue(it, hoarderFull = false) {
  if (it.noSell) return 0;
  if (it.relic) return RARITY_SELL.Relic;
  if (it.magic && it.identified) return RARITY_SELL[it.rarity] || 0;
  const base = it.cost || 0;
  return hoarderFull ? base : Math.floor(base / 2);
}

// ---------------------------------------------------------------- loot rolls
export async function rollSpoils() {
  const t = lookup(SPOILS, rnd(6));
  if (t === 'mundane') return rollMundane();
  if (t === 'valuable') return rollValuable();
  return rollPrecious();
}
export async function rollMundane() {
  const e = lookup(MUNDANE, rnd(100));
  await grant(e);
}
export async function rollValuable() {
  const t = lookup(VALUABLE, rnd(20));
  if (t === 'potion') { gainPotion(); return; }
  if (t === 'crystal') { addSup('crystal', 1); io.log('You find an <b>Attunement Crystal</b>.', 'loot'); return; }
  if (t === 'fragment') { gainFragment(); return; }
  const it = makeMagicItem(); addItem(it); io.log(`You find a magic item: <b>${it.name}</b>.`, 'loot');
}
export async function rollPrecious() {
  const t = lookup(PRECIOUS, rnd(20));
  if (t === 'magic') { const it = makeMagicItem(); addItem(it); io.log(`You find a magic item: <b>${it.name}</b>.`, 'loot'); return; }
  const it = makeRelic(); addItem(it); io.log(`You find a <b class="relic">Relic: ${it.name}</b>! ${it.desc}`, 'loot');
  await checkGoals();
}
export async function rollResources() {
  const t = lookup(RESOURCES, rnd(10));
  if (!t) { io.log('You find nothing of value.', 'dim'); return; }
  addSup(t, 1); io.log(`You find 1x ${SUPPLIES[t][0]}.`, 'loot');
}
export async function rollGems() {
  const [nm, ex] = lookup(GEMS, rnd(20));
  const v = r(ex); addSup('coins', v);
  io.log(`You find a ${nm} gem worth <b>${v}</b> coins.`, 'loot');
}
export async function rollLoreBook() {
  const p = pc(); const i = rnd(10) - 1; const [title, text] = LORE_BOOKS[i];
  bump('loreBooks');
  if (!p.lore.includes(i)) p.lore.push(i);
  io.log(`You find a Lore Book: <b><i>${title}</i></b>.`, 'loot');
  io.log(`<span class="lore">"${text}"</span>`, 'dim');
  await gainXP(10, 'Lore Book');
  await checkGoals();
}
export async function rollContainerLoot() {
  const e = lookup(CONTAINER_LOOT, rnd(20));
  if (e.text) { io.log(e.text, 'dim'); return; }
  await grant(e);
}

/** Grant a loot descriptor */
export async function grant(e) {
  if (e.sup) { const n = r(e.n || '1'); addSup(e.sup, n); io.log(`You find ${n}x ${SUPPLIES[e.sup][0]}.`, 'loot'); return; }
  if (e.gear) { const it = makeGear(e.gear); addItem(it); io.log(`You find a <b>${e.gear}</b>.`, 'loot'); return; }
  if (e.lore) return rollLoreBook();
  if (e.gems) return rollGems();
  if (e.armor) { const it = makeRandomArmor(); addItem(it); io.log(`You find <b>${it.name}</b>.`, 'loot'); return; }
  if (e.weapon) { const it = makeRandomWeapon(); addItem(it); io.log(`You find a <b>${it.name}</b>.`, 'loot'); return; }
  if (e.crelic) { const it = makeContainerRelic(e.crelic); addItem(it); io.log(`You find <b class="relic">${it.name}</b>: ${it.desc}`, 'loot'); }
}

// ---------------------------------------------------------------- potions
export function gainPotion(n = 1) {
  const p = pc();
  for (let i = 0; i < n; i++) p.potions.push({ uid: uid(), type: null, aging: null });
  io.log(`You find ${n > 1 ? `${n} Potions` : 'a Potion'}.`, 'loot');
  io.refresh();
}
export function potionName(po) {
  if (!po.type) return 'Unknown Potion';
  const d = POTIONS.map((x) => x[2]).find((x) => x.id === po.type);
  const a = POTION_AGING.map((x) => x[2]).find((x) => x.id === po.aging);
  return `${d.name} Potion${a && a.id !== 'normal' ? ` (${a.id})` : ''}`;
}
export function potionDef(po) { return POTIONS.map((x) => x[2]).find((x) => x.id === po.type); }
function revealPotion(po) {
  po.type = lookup(POTIONS, rnd(20)).id;
  po.aging = lookup(POTION_AGING, rnd(20)).id;
}
/** Medicine check to learn a potion's effects. */
export async function identifyPotion(po) {
  const p = pc();
  if (po.type) return true;
  if (p.inv.some((i) => i.name === 'Borestian Stone') || p.equip.amulet?.name === 'Borestian Stone') {
    revealPotion(po); io.log(`The Borestian Stone reveals it: <b>${potionName(po)}</b>.`, 'loot'); return true;
  }
  if (po.tried) { io.log('You have already studied this Potion and cannot make sense of it.', 'dim'); return false; }
  po.tried = true;
  const c = await check('Medicine', { label: 'Identify Potion' });
  if (c.success) { revealPotion(po); io.log(`It is a <b>${potionName(po)}</b>. ${POTION_AGING.map((x) => x[2]).find((x) => x.id === po.aging).text}`, 'loot'); return true; }
  io.log("You can't tell what it is. The only way to know is to drink it...", 'dim');
  return false;
}

/** Drink a potion. ctx: { combat } — combat-only effects are wasted outside combat. Returns true if consumed. */
export async function drinkPotion(po, ctx = {}) {
  const p = pc();
  p.potions = p.potions.filter((x) => x.uid !== po.uid);
  if (!po.type) revealPotion(po);
  const def = potionDef(po); const aging = po.aging;
  io.log(`You drink the potion: <b>${def.name}</b>. ${def.text}`, 'info');
  const age = POTION_AGING.map((x) => x[2]).find((x) => x.id === aging);
  if (aging !== 'normal') io.log(age.text, 'dim');
  if (aging === 'poisoned') { const c = await check('Endurance', { label: 'Spoiled potion' }); if (!c.success) addCondition('Poisoned', 1); return true; }
  if (aging === 'explodes') { await damagePC(r('2D4'), 'Force', { label: 'Exploding potion' }); return true; }
  if (aging === 'inert') return true;
  const f = aging === 'half' ? 0.5 : aging === 'double' ? 2 : 1;
  const dur = (n) => Math.max(1, Math.round(n * (aging === 'half' ? 0.5 : aging === 'double' ? 1.5 : 1)));
  const perm = aging === 'permanent';
  switch (def.id) {
    case 'aether': p.aether = Math.min(p.aether + Math.round(5 * f), 999); break;
    case 'antidote': delete p.cond.Poisoned; break;
    case 'coagulate': delete p.cond.Bleeding; break;
    case 'courage': delete p.cond.Frightened; break;
    case 'flaming': p.effects.push({ id: 'flaming', name: 'Flaming weapon', rounds: perm ? 9999 : dur(5), eff: { wpool: [{ die: 4, type: 'Fire', src: 'Flaming' }] } }); break;
    case 'frenzy': p.effects.push({ id: 'frenzy', name: 'Frenzy', rounds: perm ? 9999 : dur(rnd(6)), eff: { frenzy: true } }); break;
    case 'heal': await healWounds(Math.round(r('D6+2') * f)); break;
    case 'regen': p.effects.push({ id: 'regen', name: 'Regeneration', regen: Math.round(r('D10+5') * f) }); break;
    case 'poison': p.effects.push({ id: 'poisonWeapon', name: 'Poisoned weapon', eff: { poisonNext: true } }); break;
    case 'purge': delete p.cond.Cursed; delete p.cond.Sickened; break;
    case 'rest': gainExh(-Math.round(r('D4') * f)); break;
    case 'satiation': gainExh(-Math.round(1 * f)); break;
    case 'mind': gainSanity(Math.round(1 * f)); break;
    case 'speed': p.flags.extraAction = (p.flags.extraAction || 0) + 1; if (!ctx.combat) io.log('The surge of speed fades with nothing to spend it on.', 'dim'); break;
    case 'stoneskin': p.effects.push({ id: 'stoneskin', name: 'Stoneskin', rooms: perm ? null : dur(rnd(10)), eff: { armorAll: 1, skill: { Dodge: -10, Acrobatics: -10 } } }); break;
    case 'strength': p.effects.push({ id: 'strength', name: 'Strength', rooms: perm ? null : dur(rnd(10)), eff: { res: { Endurance: 10 }, skill: { Athletics: 10 } } }); break;
    case 'vitality': {
      if (p.effects.some((e) => e.id === 'vitality')) await damagePC(r('D10'), 'Acid', { label: 'Vitality overdose' });
      const v = Math.round(r('D10') * f); p.tempTough += v; p.effects.push({ id: 'vitality', name: 'Vitality', rooms: 1 });
      io.log(`You gain ${v} Temporary Toughness.`, 'good'); break;
    }
    default: break;
  }
  clampStats(); io.refresh();
  return true;
}

export function addCondition(name, v = true) {
  const p = pc();
  if (typeof v === 'number' && ['Bleeding', 'Poisoned', 'Frightened', 'Sickened', 'Stunned', 'Dazed'].includes(name)) p.cond[name] = (p.cond[name] || 0) + v;
  else p.cond[name] = v;
  io.log(`You are <b>${name}</b>${typeof v === 'number' ? ` (${p.cond[name]})` : ''}.`, 'bad');
  io.refresh();
}

// ---------------------------------------------------------------- fragments
export function gainFragment() {
  const f = FRAGMENTS[rnd(20) - 1];
  pc().fragments.push({ uid: uid(), id: f.id });
  io.log(`You find a Fragment: <b>${f.name}</b>. ${f.text}`, 'loot');
  io.refresh();
}
export const fragmentDef = (fr) => FRAGMENTS.find((x) => x.id === fr.id);

// ---------------------------------------------------------------- relic consumables / container relics
export async function useConsumable(it) {
  const p = pc(); const u = it.use || {};
  p.inv = p.inv.filter((x) => x !== it);
  io.log(`You use <b>${it.name}</b>.`, 'info');
  if (u.maxHealth) { const v = r(u.maxHealth); p.base.health += v; p.health += v; io.log(`Max Health +${v}.`, 'good'); }
  if (u.maxAether) { const v = r(u.maxAether); p.base.aether += v; p.aether += v; io.log(`Max Aether +${v}.`, 'good'); }
  if (u.maxSanity) { const v = r(u.maxSanity); p.base.sanity += v; p.sanity += v; io.log(`Max Sanity +${v}.`, 'good'); }
  if (u.endurance) { p.res.Endurance = Math.min(80, p.res.Endurance + u.endurance); io.log(`Endurance +${u.endurance}.`, 'good'); }
  if (u.spellward) { p.res.Spellward = Math.min(80, p.res.Spellward + u.spellward); io.log(`Spellward +${u.spellward}.`, 'good'); }
  if (u.abilityPoint) { p.abilityPoints += u.abilityPoint; io.log('You gain an Ability Point.', 'good'); }
  if (u.wounds) await healWounds(r(u.wounds));
  if (u.xp) await gainXP(u.xp, it.name);
  if (u.sanityLoss) { const { loseSanity } = await import('./character.js'); await loseSanity(r(u.sanityLoss)); }
  if (u.respec) {
    const { MASTERIES: MS, MASTERY_BY_ID: MB } = await import('../data/masteries.js');
    const lose = await io.choose('The Potion of Forgotten Fate: which of your Masteries do you forget?', p.masteries.map((m) => ({ label: `${MB[m.id].name} (Tier ${m.tier})`, value: m.id })));
    const old = p.masteries.find((m) => m.id === lose);
    const pickNew = await io.choose('Choose a new Mastery. It receives the same number of Ability Points.', MS.filter((m) => !p.masteries.some((x) => x.id === m.id)).map((m) => ({ label: m.name, hint: m.desc, value: m.id })));
    p.sustained = p.sustained.filter((sid) => !sid.startsWith(`${lose}.`));
    if (lose === 'weaponmaster') p.dedication = null;
    old.id = pickNew; old.training = MB[pickNew].training[rnd(6) - 1];
    io.log(`You vomit a black crystal holding your old power. You are now a ${MB[pickNew].name} (Tier ${old.tier}).`, 'good');
    if (pickNew === 'weaponmaster') p.dedication = await io.choose('Weapon Master Dedication: choose a weapon.', Object.keys((await import('../data/items.js')).WEAPONS).map((w) => ({ label: w, value: w })));
    clampStats();
  }
  io.refresh();
}

export { maxTough };
