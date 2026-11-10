// Equipment, light sources and out-of-combat item use.
import { S, uid } from '../state.js';
import { io } from '../io.js';
import { r, rnd } from '../dice.js';
import { WEAPONS, SUPPLIES } from '../data/items.js';
import { pc, check, healTough, gainExh, damagePC, clampStats, addItem, mods } from './character.js';
import { drinkPotion, identifyPotion, potionName, useConsumable, fragmentDef } from './loot.js';

const g = () => S.g;
const SLOT_OF = { weapon: 'main', shield: 'off', torso: 'torso', head: 'head', arms: 'arms', legs: 'legs', belt: 'belt', boots: 'boots', gloves: 'gloves', amulet: 'amulet' };

export function isTwoHanded(it) { return it?.kind === 'weapon' && WEAPONS[it.base]?.traits.includes('Two-Handed'); }

/** Remove whatever is in a slot and put it back into the bags. */
export function unequip(slot, { silent } = {}) {
  const p = pc(); const it = p.equip[slot]; if (!it) return;
  p.equip[slot] = null;
  if (it.kind === 'light') { stowLight(); }
  else p.inv.push(it);
  if (!silent) io.log(`You put away the ${it.name}.`, 'dim');
  clampStats(); io.refresh();
}

function stowLight() {
  const p = pc();
  if (p.light && p.light.hand) { p.stowedLight = p.light; p.light = null; io.log(`You snuff out your ${p.stowedLight.src} and stow it (${p.stowedLight.rooms} rooms left).`, 'dim'); }
}

export async function equipItem(it, opts = {}) {
  const p = pc();
  if (it.kind === 'weapon' && it.broken) { io.log('That weapon is broken. Repair it at Camp.', 'bad'); return; }
  if (it.name === 'Mace of Obliteration' && ((p.skills.Athletics || 0) < 60 || (p.skills['Bludgeoning Weapons'] || 0) < 60)) { io.log('The Mace of Obliteration requires Athletics 60 and Bludgeoning Weapons 60.', 'bad'); return; }
  let slot = SLOT_OF[it.kind];
  if (it.kind === 'ring') slot = !p.equip.ring1 ? 'ring1' : !p.equip.ring2 ? 'ring2' : await io.choose('Replace which ring?', [{ label: p.equip.ring1.name, value: 'ring1' }, { label: p.equip.ring2.name, value: 'ring2' }]);
  if (it.kind === 'weapon' && !opts.offhand && p.equip.main && !isTwoHanded(it) && !isTwoHanded(p.equip.main) && !p.equip.off && !opts.combat) {
    const where = await io.choose(`Wield the ${it.name} in which hand?`, [{ label: 'Main hand (replace current weapon)', value: 'main' }, { label: 'Off-hand (dual wield: -40 to attacks unless Stormbrand, +1 damage)', value: 'off' }]);
    if (where === 'off') slot = 'off';
  }
  if (opts.offhand) slot = 'off';
  if (!slot) { io.log("That item can't be equipped. It works while you carry it.", 'dim'); return; }
  if (isTwoHanded(it) && p.equip.off) {
    if (p.equip.off.kind === 'light' && !opts.combat) {
      const ok = await io.yesNo(`The ${it.name} needs both hands. Stow your ${p.equip.off.name}? (You will have no light unless you have another source.)`);
      if (!ok) return;
    }
    unequip('off');
  }
  if (slot === 'off' && isTwoHanded(p.equip.main)) unequip('main');
  if (slot === 'off' && p.equip.off) unequip('off');
  p.inv = p.inv.filter((x) => x.uid !== it.uid);
  if (p.equip[slot]) unequip(slot, { silent: true });
  p.equip[slot] = it;
  io.log(`You equip the <b>${it.name}</b>.`, 'info');
  clampStats(); io.refresh();
}

export function dropItem(it) {
  const p = pc(); p.inv = p.inv.filter((x) => x.uid !== it.uid);
  const node = g().domain?.nodes?.[g().domain.cur]; if (node) node.floor = (node.floor || []).concat([it]);
  io.log(`You drop the ${it.name}.`, 'dim'); io.refresh();
}
export function pickUp(it) {
  const p = pc(); const node = g().domain.nodes[g().domain.cur];
  node.floor = (node.floor || []).filter((x) => x.uid !== it.uid); p.inv.push(it);
  io.log(`You pick up the ${it.name}.`, 'info'); io.refresh();
}
export function dropSupply(key, n) {
  const p = pc(); p.sup[key] = Math.max(0, p.sup[key] - n); io.log(`You discard ${n}x ${SUPPLIES[key][0]}.`, 'dim'); io.refresh();
}

// ---------------------------------------------------------------- light
export function lightOptions() {
  const p = pc(); const out = [];
  const offFree = !p.equip.off || p.equip.off.kind === 'light';
  if (p.stowedLight && p.stowedLight.rooms > 0) out.push({ label: `Take out your ${p.stowedLight.src} (${p.stowedLight.rooms} rooms)`, value: 'stowed' });
  if (p.sup.torch > 0) out.push({ label: `Light a Torch (20 rooms) — ${p.sup.torch} left`, value: 'torch' });
  if (p.sup.candle > 0) out.push({ label: `Light a Candle (10 rooms) — ${p.sup.candle} left`, value: 'candle' });
  if (p.inv.some((i) => i.name === 'Lamp') && p.sup.lampOil > 0) out.push({ label: 'Fill and light your Lamp (1 Lamp Oil, 20 rooms)', value: 'lamp' });
  if (p.inv.some((i) => i.name === 'Belt Lamp') && p.equip.belt && p.sup.lampOil > 0) out.push({ label: 'Fill and light your Belt Lamp (hands free)', value: 'beltlamp' });
  if (p.sup.flare > 0) out.push({ label: 'Throw a Flare into this room', value: 'flare' });
  return { out, offFree };
}

export async function lightSource(kind) {
  const p = pc();
  const holdInHand = (name) => {
    if (p.equip.off && p.equip.off.kind !== 'light') unequip('off');
    if (p.equip.main && isTwoHanded(p.equip.main)) unequip('main');
    p.equip.off = { uid: uid(), kind: 'light', name };
  };
  if (p.light && p.light.hand && kind !== 'flare') { io.log(`You discard the remains of your ${p.light.src}.`, 'dim'); p.light = null; }
  switch (kind) {
    case 'stowed': holdInHand(p.stowedLight.src); p.light = p.stowedLight; p.stowedLight = null; break;
    case 'torch': p.sup.torch -= 1; holdInHand('Torch'); p.light = { src: 'Torch', rooms: 20, hand: true }; break;
    case 'candle': p.sup.candle -= 1; holdInHand('Candle'); p.light = { src: 'Candle', rooms: 10, hand: true }; break;
    case 'lamp': p.sup.lampOil -= 1; holdInHand('Lamp'); p.light = { src: 'Lamp', rooms: 20, hand: true }; break;
    case 'beltlamp': p.sup.lampOil -= 1; p.light = { src: 'Belt Lamp', rooms: 20, hand: false }; break;
    case 'flare': p.sup.flare -= 1; g().domain.nodes[g().domain.cur].flare = true; io.log('The flare sputters to life, bathing the room in harsh red light.', 'info'); break;
    default: break;
  }
  if (kind !== 'flare') { delete p.cond.Blinded; io.log(`Your ${p.light.src} burns (${p.light.rooms} rooms).`, 'info'); }
  io.refresh();
}

/** Called once per room moved. */
export function tickLight(n = 1) {
  const p = pc(); if (!p.light) return;
  p.light.rooms -= n;
  if (p.light.rooms <= 0) {
    io.log(`Your ${p.light.src} gutters and goes out.`, 'bad');
    if (p.light.hand && p.equip.off?.kind === 'light') p.equip.off = null;
    p.light = null;
  }
}

// ---------------------------------------------------------------- consumables out of combat
export async function eatRation() {
  const p = pc();
  const need = p.rot >= 4 ? 2 : 1;
  if (p.sup.ration < need) { io.log('You do not have enough Rations.', 'bad'); return; }
  p.sup.ration -= need; io.log(`You eat ${need > 1 ? 'two Rations' : 'a Ration'}.`, 'info');
  gainExh(-1);
}
export async function eatRaw() {
  const p = pc(); if (p.sup.cooking < 1) return;
  p.sup.cooking -= 1; io.log('Desperate, you eat raw Cooking Ingredients.', 'info');
  gainExh(-1);
  const c = await check('Endurance', { label: 'Keep it down' });
  if (!c.success) await damagePC(1, 'Poison', { label: 'Food poisoning', ignoreArmor: true });
}
/** Medicine with a Bandage: heal D4 Toughness (once per room), or remove Bleeding/Poisoned. */
export async function useBandage(mode) {
  const p = pc(); const node = g().domain.nodes[g().domain.cur];
  if (p.sup.bandage < 1) { io.log('You have no Bandages.', 'bad'); return; }
  if (mode === 'heal' && node.medicine) { io.log('You have already tended your wounds in this room.', 'dim'); return; }
  p.sup.bandage -= 1;
  const c = await check('Medicine', { label: mode === 'heal' ? 'Tend wounds' : `Treat ${mode}` });
  if (mode === 'heal') { node.medicine = true; if (c.success) healTough(rnd(4)); }
  else if (c.success) { delete p.cond[mode]; io.log(`You are no longer ${mode}.`, 'good'); }
  io.refresh();
}

export { drinkPotion, identifyPotion, potionName, useConsumable, fragmentDef, addItem, mods, r };
