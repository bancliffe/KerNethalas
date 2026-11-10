// Exploring Ker Nethalas (Chapter IV): movement, room procedure, tension, growing darkness,
// doors, traps, scavenging, resting, camp and traders.
import { S, save, bump } from '../state.js';
import { io, Death, Leave } from '../io.js';
import { r, rnd, lookup, stepDown, stepUp, pick } from '../dice.js';
import { DOMAIN1, neighbors, edgeKey, TRAPS } from '../data/domain1.js';
import { CORRIDOR_TEXT, ROOM_TEXT, GROWING_TEXT } from '../data/tables_text.js';
import { FIRST_DOMAIN_ENCOUNTERS, OVERSEERS, CREATURES } from '../data/creatures.js';
import { rollEncounter } from '../data/creatures2.js';
import { DIFFICULTY, DIFF_STEPS, DIFF_NAMES, OVERSEER_INFLUENCE, SKILLS, WEAPON_SKILLS, ROT_STAGES, DAMAGE_TYPE_TABLE } from '../data/rules.js';
import { SCAVENGING, SUPPLIES, WEAPONS, TORSO, LIMB, HELMETS, SHIELDS, GEAR } from '../data/items.js';
import {
  pc, mods, check, damagePC, healTough, healHealth, healWounds, gainSanity, loseSanity, gainExh, gainXP, hasLight, maxTough, maxHealth,
  maxSanity, maxAether, skillBase, skillValue, hasAbility, hasMastery, hasPerk, addItem, addSup, checkGoals, clampStats, overloaded, allItems, mainWeapon,
} from './character.js';
import { rollSpoils, rollContainerLoot, makeWeapon, makeArmor, makeGear, makeRandomArmor, sellValue, finishAttunement, gainPotion } from './loot.js';
import { startCombat, resumeCombat, reinforce } from './combat.js';
import { tickLight, lightOptions, lightSource } from './inventory.js';
import { runEvent, reenterEvent } from './events.js';
import { exploreAbilities, runAbility } from './abilities.js';

const g = () => S.g;
const D = () => g().domain;
/** The current Domain's map: the fixed First Domain, or a map generated room by room. */
export function curMap() { return S.g?.domain?.map || DOMAIN1; }
export const MAP = new Proxy({}, { get: (_, k) => curMap()[k] });
export const nodeDef = (id) => curMap().nodes[id];
export const nodeState = (id) => D().nodes[id] || (D().nodes[id] = {});
const isRoom = (id) => nodeDef(id).kind === 'room';

export function nodeTitle(id) {
  const d = nodeDef(id); const s = nodeState(id);
  if (!d) return 'Unknown';
  if (d.title) return `${d.label}. ${d.title}`;
  if (!s.visited && !s.scouted) return d.kind === 'room' ? 'Unexplored room' : 'Unexplored corridor';
  return d.kind === 'room' ? `Room ${d.label}` : 'Corridor';
}

// ------------------------------------------------------------------ domain setup
export function newDomain(num = 1) {
  const overseer = OVERSEERS[rnd(10) - 1];
  const inf = rnd(10);
  const influence = { id: inf }; if (inf === 6) influence.dt = lookup(DAMAGE_TYPE_TABLE, rnd(20));
  const D = {
    id: `d${num}`, num, overseer, influences: [influence], overseerDefeated: false, overseerSeen: false,
    tension: hasAbility('tracker.5') ? 10 : 8, growing: [], cur: DOMAIN1.start, prev: null, nodes: {}, doors: {}, moves: 0, extraXP: 0,
  };
  if (num > 1) {
    D.map = { name: `Domain ${num}`, nodes: {}, edges: [], open: {} };
    D.counter = 0; D.rooms = 0; D.lairDie = 10; D.exitDie = 8; D.lairFound = false; D.exitFound = false; D.roomsGen = 0;
    D.cur = createNode(D, null);
    D.map.start = D.cur;
    D.map.nodes[D.cur].entry = true;
  }
  return D;
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
function rollExits(kind) { return kind === 'corridor' ? [2, 2, 2, 3, 3, 4][rnd(6) - 1] : [1, 2, 2, 3, 3, 4][rnd(6) - 1]; }

/** Generate a new room or corridor beyond an unexplored passage (Mapping Domains, page 96-99). */
function createNode(D, fromId) {
  const map = D.map;
  const kind = rnd(100) <= 25 ? 'corridor' : 'room';
  const otherOpen = Object.values(map.open).reduce((a, b) => a + b, 0) - (fromId ? 1 : 0);
  let exits = rollExits(kind);
  if (!fromId) exits = Math.max(2, exits);
  for (let i = 0; i < 10 && otherOpen + exits - (fromId ? 1 : 0) < 1; i++) exits = rollExits(kind);
  if (otherOpen + exits - (fromId ? 1 : 0) < 1) exits = 2;
  // place it on the grid next to its parent
  let gx = 0; let gy = 0;
  if (fromId) {
    const p = map.nodes[fromId]; const taken = new Set(Object.values(map.nodes).map((n) => `${n.gx},${n.gy}`));
    const dirs = [...DIRS].sort(() => Math.random() - 0.5);
    let placed = false;
    for (let rad = 1; rad < 6 && !placed; rad++) for (const [dx, dy] of dirs) { const x = p.gx + dx * rad; const y = p.gy + dy * rad; if (!taken.has(`${x},${y}`)) { gx = x; gy = y; placed = true; break; } }
  }
  D.counter += 1;
  const id = `n${D.counter}`;
  const node = { kind, gx, gy, label: '' };
  if (kind === 'room') { D.rooms += 1; node.label = String(D.rooms); }
  map.nodes[id] = node;
  map.open[id] = exits - (fromId ? 1 : 0);
  if (fromId) {
    map.open[fromId] = Math.max(0, (map.open[fromId] || 0) - 1);
    map.edges.push([fromId, id, rnd(10) <= 5]);
    // Lair check (rooms only) until the Overseer is found, then Domain Exit checks
    if (!D.lairFound) {
      if (kind === 'room') {
        D.roomsGen += 1;
        if (D.roomsGen >= 15) { node.lair = true; io.log('Lair check: after fifteen rooms, the Overseer can no longer hide.', 'bad'); }
        else {
          const n = rnd(D.lairDie);
          if (n <= 2) {
            if (D.lairDie === 4) node.lair = true;
            else { D.lairDie = stepDown(D.lairDie); io.log(`Lair Die: ${n} — you sense you are getting closer to the Overseer (d${D.lairDie}).`, 'dim'); }
          }
        }
        if (node.lair) { D.lairFound = true; node.title = "The Overseer's Lair"; node.noEncounter = true; node.noEvent = true; }
      }
    } else if (!D.exitFound) {
      const n = rnd(D.exitDie);
      if (n <= 2) {
        if (D.exitDie === 4) { D.exitFound = true; node.exit = true; node.title = 'Domain Exit'; }
        else { D.exitDie = stepDown(D.exitDie); io.log(`Domain Exit Die: ${n} — the air shifts; a way onward must be near (d${D.exitDie}).`, 'dim'); }
      }
    }
  }
  return id;
}

/** Make the Lair (or Domain Exit) die bigger or smaller by one stage (Reason fumbles, Event 86). */
export function adjustLairDie(dir) {
  const D = g().domain; if (!D.map) return;
  const key = !D.lairFound ? 'lairDie' : !D.exitFound ? 'exitDie' : null; if (!key) return;
  D[key] = dir < 0 ? (stepDown(D[key]) || 4) : stepUp(D[key], key === 'lairDie' ? 10 : 8);
  io.log(`The ${key === 'lairDie' ? 'Lair' : 'Domain Exit'} Die is now d${D[key]}.`, 'dim');
}

/** Scout ahead without moving (Astral Projection, the crude map event, the enchanted skull). */
export async function astralProjection(n) {
  const D = g().domain; const out = [];
  const seen = new Set([D.cur]); const q = [D.cur];
  while (q.length && out.length < n) {
    const c = q.shift();
    for (const nb of neighbors(MAP, c)) if (!seen.has(nb.id)) { seen.add(nb.id); q.push(nb.id); if (!nodeState(nb.id).visited) out.push(nb.id); }
    if (D.map) while ((D.map.open[c] || 0) > 0 && out.length < n) { const id = createNode(D, c); seen.add(id); q.push(id); out.push(id); }
  }
  const picked = out.slice(0, n);
  const lines = [];
  for (const id of picked) {
    const s = nodeState(id); const d = nodeDef(id); s.scouted = true;
    if (!s.desc) s.desc = d.text || (d.kind === 'room' ? lookup(ROOM_TEXT, rnd(100)) : lookup(CORRIDOR_TEXT, rnd(20)));
    if (s.preset === undefined && !d.noEncounter && !d.lair) { const roll = rnd(20); s.preset = roll >= (d.kind === 'room' ? 10 : 15) ? (D.num > 1 ? rollEncounter() : lookup(FIRST_DOMAIN_ENCOUNTERS, rnd(20))) : null; }
    lines.push(`${nodeTitle(id)}${d.lair ? ' (the Overseer)' : d.exit ? ' (the Domain Exit)' : s.preset ? `: ${CREATURES[s.preset].name}` : ': empty'}`);
  }
  io.log(lines.length ? `You see what lies ahead — ${lines.join('; ')}.` : 'There is nothing new to see.', 'good');
  io.refresh();
}

// ------------------------------------------------------------------ main loop
export async function runGame() {
  for (;;) {
    try {
      await exploreLoop();
      return;
    } catch (e) {
      if (e && e.death) throw e;
      if (e && e.leave) continue;
      throw e;
    }
  }
}

async function exploreLoop() {
  for (;;) {
    const G = g();
    if (G.combat) { const res = await resumeCombat(); G.pending = null; await afterCombat(res); continue; }
    if (G.pending?.type === 'resolve') { const pend = G.pending; io.log(`<b>${nodeTitle(pend.id)}</b>`, 'title'); await resolveRoom(pend.id, pend.first); G.pending = null; continue; }
    if (G.over) return;
    clampStats();
    save();
    io.refresh();
    const act = await io.choose(sceneText(), roomActions(), { explore: true, allowExternal: true });
    await doAction(act);
  }
}

function sceneText() {
  const id = D().cur; const d = nodeDef(id); const s = nodeState(id);
  const parts = [];
  if (!hasLight()) parts.push('<b class="bad">You are in darkness (Blinded).</b>');
  if (overloaded()) parts.push('<b class="bad">You are carrying too much. Drop items before moving on.</b>');
  if (s.trader) parts.push('A bandage-wrapped Trader waits here, grunting softly.');
  if (d.lair && !D().overseerDefeated) parts.push(`<b>${CREATURES[D().overseer].name}</b> rules this chamber.`);
  if (s.enemies?.length) parts.push(`<b class="bad">${s.enemies.map((x) => CREATURES[x].name).join(', ')} still lurk here.</b>`);
  if (s.floor?.length) parts.push(`On the floor: ${s.floor.map((i) => i.name).join(', ')}.`);
  return parts.join(' ') || 'What do you do?';
}

function roomActions() {
  const id = D().cur; const d = nodeDef(id); const s = nodeState(id); const p = pc();
  const opts = [];
  const heavy = overloaded();
  for (const nb of neighbors(MAP, id)) {
    const ds = D().doors[edgeKey(id, nb.id)];
    const doorTxt = nb.door ? (ds?.open ? ' (open door)' : ds?.locked ? ' (locked door)' : ' (door)') : '';
    opts.push({ label: `Go to ${nodeTitle(nb.id)}${doorTxt}`, value: { t: 'move', id: nb.id }, disabled: heavy || s.mustLeaveVia, group: 'move', cls: nb.id === D().prev ? 'back' : '' });
  }
  const openN = curMap().open?.[id] || 0;
  if (openN > 0) opts.push({ label: `Explore an unexplored ${openN > 1 ? `passage (${openN} lead onward)` : 'passage'}`, value: { t: 'move', id: 'new' }, disabled: heavy, group: 'move' });
  if (d.entry && g().domain.num > 2) opts.push({ label: 'Climb back up to the previous Domain', value: { t: 'ascend' }, disabled: heavy, group: 'move' });
  if (s.mustLeave) return opts.map((o) => ({ ...o, disabled: false }));
  if (d.lair && !D().overseerDefeated) opts.push({ label: `Confront ${CREATURES[D().overseer].name}`, value: { t: 'overseer' }, group: 'special', cls: 'danger' });
  if (d.exit) opts.push({ label: g().domain.num === 1 ? 'Descend to the next Domain (you cannot return)' : 'Descend to the next Domain', value: { t: 'descend' }, group: 'special', cls: 'danger' });
  if (s.trader) opts.push({ label: 'Trade with the Trader', value: { t: 'trade' }, group: 'special' });
  if (s.choirSilenced === undefined && d.choir) opts.push({ label: 'Try to silence the choir (Reason)', value: { t: 'choir' }, group: 'special' });
  if (s.altar && !s.altarUsed) opts.push({ label: s.altarLabel, value: { t: 'altar' }, group: 'special' });
  if (isRoom(id)) {
    const scavLeft = (s.scavengeAllowed || 1) - (s.scavenged || 0);
    const barren = d.noScavenge;
    opts.push({ label: `Scavenge (Scavenge check)${scavLeft > 1 ? ` — ${scavLeft} attempts` : ''}`, value: { t: 'scavenge' }, disabled: barren || scavLeft <= 0 || s.trapBypassed || s.calmed, group: 'room' });
    opts.push({ label: 'Search for hidden containers (2 Exhaustion, Tension Die check)', value: { t: 'search' }, disabled: barren || !!s.searched || s.trapBypassed || s.calmed, group: 'room' });
  }
  if (s.trapActive) opts.push({ label: `Deal with the ${s.trap?.name || 'trap'}`, value: { t: 'roomtrap' }, group: 'room', cls: 'warn' });
  const lo = lightOptions();
  if (!hasLight() || (p.light && p.light.rooms <= 3)) for (const o of lo.out) opts.push({ label: o.label, value: { t: 'light', kind: o.value }, group: 'rest' });
  if (p.sup.bandage > 0) {
    opts.push({ label: 'Tend wounds with a Bandage (Medicine, D4 Toughness)', value: { t: 'bandage', mode: 'heal' }, disabled: !!s.medicine || p.tough >= maxTough(), group: 'rest' });
    for (const cnd of ['Bleeding', 'Poisoned']) if (p.cond[cnd]) opts.push({ label: `Treat ${cnd} with a Bandage (Medicine)`, value: { t: 'bandage', mode: cnd }, group: 'rest' });
  }
  if (p.cond.Burning) opts.push({ label: 'Put out the flames (2 Exhaustion)', value: { t: 'burn' }, group: 'rest' });
  if (p.cond.Freezing) opts.push({ label: 'Warm yourself (Endurance, once per room)', value: { t: 'freeze' }, disabled: !!s.warmed, group: 'rest' });
  if (p.sup.ration > 0 && p.exh > 0) opts.push({ label: 'Eat a Ration (-1 Exhaustion)', value: { t: 'ration' }, group: 'rest' });
  for (const a of exploreAbilities()) opts.push({ label: a.label, value: { t: 'ability', id: a.id }, disabled: a.disabled, group: 'ability' });
  opts.push({ label: 'Take a Breather', value: { t: 'breather' }, group: 'rest' });
  opts.push({ label: 'Set Camp', value: { t: 'camp' }, disabled: !!s.trapActive, group: 'rest' });
  return opts;
}

async function doAction(a) {
  if (!a) return;
  if (a.external) { await a.run(); return; }
  switch (a.t) {
    case 'move': await moveTo(a.id); break;
    case 'overseer': await fightOverseer(); break;
    case 'descend': await descend(); break;
    case 'ascend': await ascend(); break;
    case 'trade': await trade(); break;
    case 'choir': await silenceChoir(); break;
    case 'altar': await useAltar(); break;
    case 'scavenge': await scavenge(); break;
    case 'search': await deepSearch(); break;
    case 'roomtrap': await resolveRoomTrap(nodeState(D().cur)); break;
    case 'light': await lightSource(a.kind); break;
    case 'bandage': { const { useBandage } = await import('./inventory.js'); await useBandage(a.mode); break; }
    case 'burn': gainExh(2); delete pc().cond.Burning; io.log('You smother the flames.', 'good'); break;
    case 'freeze': { nodeState(D().cur).warmed = true; const c = await check('Endurance', { label: 'Fight off the cold' }); if (c.success) { delete pc().cond.Freezing; delete pc().flags.freezeRooms; io.log('You are no longer Freezing.', 'good'); } break; }
    case 'ration': { const { eatRation } = await import('./inventory.js'); await eatRation(); break; }
    case 'ability': await runAbility(null, a.id, {}); break;
    case 'breather': await takeBreather(); break;
    case 'camp': await setCamp(); break;
    default: break;
  }
}

// ------------------------------------------------------------------ movement
export async function moveTo(id, opts = {}) {
  const from = D().cur;
  if (id === 'new') { id = createNode(D(), from); io.log('You venture into the unknown...', 'dim'); }
  const nb = neighbors(MAP, from).find((n) => n.id === id);
  if (nb?.door && !opts.retreat) {
    const ok = await handleDoor(from, id);
    if (!ok) return;
  }
  const fs = nodeState(from);
  if (fs.flare) delete fs.flare;
  delete fs.aegisUsed;
  // leaving effects
  const p = pc();
  const sg = p.effects.find((e) => e.id === 'spikedGauntlet');
  if (sg) { p.effects = p.effects.filter((e) => e !== sg); await damagePC(r('2D6'), 'Fire', { label: 'The Spiked Gauntlet burns' }); }
  p.effects = p.effects.filter((e) => e.id !== 'fireCharm');
  if (p.cond.fx?.invisible) delete p.cond.fx.invisible;
  if ((p.minions || []).some((m) => m.fx?.roomBound)) { p.minions = p.minions.filter((m) => !m.fx?.roomBound); io.log('Your summoned elemental fades as you leave the room.', 'dim'); }
  D().prev = from;
  D().cur = id;
  D().moves += 1;
  await enterRoom(id, { retreat: opts.retreat });
}

/** The room procedure (page 96-99) */
async function enterRoom(id, opts = {}) {
  const G = g(); const p = pc(); const d = nodeDef(id); const s = nodeState(id);
  const first = !s.visited;
  s.visited = true;
  bump('roomsEntered');
  // per-room upkeep
  p.aether = Math.max(p.aether, maxAether());
  tickLight(G.domain.growing.includes('lightDrain') ? 2 : 1);
  await roomUpkeep();
  io.log(`<b>${nodeTitle(id)}</b>`, 'title');
  if (first) {
    s.desc = d.text || (d.kind === 'room' ? lookup(ROOM_TEXT, rnd(100)) : lookup(CORRIDOR_TEXT, rnd(20)));
  }
  io.scene({ id, title: nodeTitle(id), text: s.desc, kind: d.kind });
  if (!first) io.log(`<span class="desc">${s.desc}</span>`, 'dim');
  // Darkness
  if (!hasLight()) {
    if (!p.cond.Blinded) { p.cond.Blinded = true; }
    await loseSanity(1, { resolve: true, label: 'The darkness presses in' });
  } else delete p.cond.Blinded;
  // Tension Die
  await tensionCheck();
  // The rest of the room procedure is saved as pending, so reloading cannot skip an encounter.
  G.pending = { type: 'resolve', id, first };
  save();
  await resolveRoom(id, first);
  G.pending = null;
}

async function resolveRoom(id, first) {
  const p = pc(); const d = nodeDef(id); const s = nodeState(id); const G = g();
  // Pending enemies (fled earlier)
  if (s.enemies?.length) {
    io.log('The creatures you fled from are still here, fully recovered.', 'bad');
    const defs = s.enemies;
    const res = await startCombat({ defs, nodeId: id });
    if (res !== 'fled') s.enemies = null;
    await afterCombat(res); return;
  }
  if (!first) { await reenterEvent(id); return; }
  // Fixed room content
  if (d.loot && !s.lootTaken) { s.lootTaken = true; await grantFixedLoot(d.loot); }
  if (d.choir) await choir(true);
  if (d.lair) { G.domain.overseerSeen = true; io.log(`Within lurks the Domain's Overseer: <b>${CREATURES[G.domain.overseer].name}</b>. You may confront it, or leave.`, 'bad'); return; }
  // Combat encounter check
  if (!d.noEncounter) {
    const n = rnd(20); const need = d.kind === 'room' ? 10 : 15;
    if (p.effects.some((e) => e.id === 'cloak')) { io.log('Shrouded in the tattered cloak, you slip past whatever dwells here.', 'dim'); }
    else if (s.preset !== undefined) {
      const pre = s.preset; delete s.preset;
      if (pre) { io.log(`As you foresaw, <b>${CREATURES[pre].name}</b> lurk here!`, 'bad'); const res = await startCombat({ defs: [pre], nodeId: id }); await afterCombat(res); return; }
      io.log(`As you foresaw, the ${d.kind} is empty.`, 'dim');
    }
    else if (n >= need) { io.log(`Encounter check: ${n} — <b>something is here!</b>`, 'bad'); const res = await encounter({ nodeId: id }); await afterCombat(res); return; }
    else io.log(`Encounter check: ${n} — the ${d.kind} seems empty.`, 'dim');
  }
  // Events
  if (d.kind === 'room' && !d.noEvent) await runEvent(id);
}

async function roomUpkeep() {
  const p = pc();
  for (const e of p.effects) if (e.rooms) e.rooms -= 1;
  const expired = p.effects.filter((e) => e.rooms !== undefined && e.rooms !== null && e.rooms <= 0 && !e.rounds);
  for (const e of expired) if (e.name) io.log(`${e.name} wears off.`, 'dim');
  p.effects = p.effects.filter((e) => !expired.includes(e));
  if (p.cond.Bleeding) await damagePC(1, 'Bleed', { label: 'Bleeding', ignoreArmor: true });
  if (p.cond.Burning) await damagePC(1, 'Fire', { label: 'Burning', ignoreArmor: true });
  if (p.cond.Poisoned) await damagePC(1, 'Poison', { label: 'Poison', ignoreArmor: true });
  if (p.cond.Freezing) {
    p.flags.freezeRooms = (p.flags.freezeRooms || 0) + 1;
    if (p.flags.freezeRooms >= 10) throw new Death('the cold');
    if (p.flags.freezeRooms === 5) io.log('Hypothermia sets in: -50 to all actions.', 'bad');
  }
  const tb = p.effects.find((e) => e.id === 'tatteredBandages');
  if (tb) { healTough(2); tb.count = (tb.count || 0) + 1; if (tb.count > tb.limit) await damagePC(1, 'Necrotic', { label: 'Festering bandages', ignoreArmor: true }); }
  if (p.flags.cursedRoom) {
    const mi = allItems().find((i) => i.magic);
    const ok = mi && await io.yesNo(`The spirit of darkness gnaws at you. Destroy a magic item (${mi.name}) to end the curse?`);
    if (ok) { p.inv = p.inv.filter((i) => i !== mi); for (const k of Object.keys(p.equip)) if (p.equip[k] === mi) p.equip[k] = null; delete p.flags.cursedRoom; io.log('The curse lifts.', 'good'); }
    else await loseSanity(1);
  }
}

async function grantFixedLoot(l) {
  const p = pc();
  if (l.weapons) for (const w of l.weapons) { addItem(makeWeapon(w)); io.log(`You find a <b>${w}</b>.`, 'loot'); }
  if (l.randomArmor) for (let i = 0; i < l.randomArmor; i++) { const a = makeRandomArmor(); addItem(a); io.log(`You find <b>${a.name}</b>.`, 'loot'); }
  if (l.sup) for (const [k, v] of Object.entries(l.sup)) { addSup(k, v); io.log(`You find ${v}x ${SUPPLIES[k][0]}.`, 'loot'); }
  if (l.supRoll) for (const [k, v] of Object.entries(l.supRoll)) { const n = r(v); addSup(k, n); io.log(`You find ${n}x ${SUPPLIES[k][0]}.`, 'loot'); }
  io.refresh();
}

export async function encounter({ nodeId, ambush = false } = {}) {
  const defId = D().num > 1 ? rollEncounter() : lookup(FIRST_DOMAIN_ENCOUNTERS, rnd(20));
  if (g().combat) { reinforce(defId); return 'joined'; }
  return startCombat({ defs: [defId], nodeId: nodeId ?? D().cur, ambush });
}

/** Called after any combat completes (new or resumed). */
export async function afterCombat(res) {
  const G = g();
  if (res === 'joined') return;
  if (res === 'fled') {
    const back = D().prev; io.log('You stumble back the way you came.', 'info');
    if (back) { D().prev = D().cur; D().cur = back; D().moves += 1; tickLight(1); await tensionCheck(); }
  }
  if (res === 'calmed') nodeState(D().cur).calmed = true;
  save();
  io.refresh();
}

// ------------------------------------------------------------------ tension & growing darkness
export async function tensionCheck(reason = '') {
  const G = g(); const die = G.domain.tension;
  const n = rnd(die);
  if (n > 2) { io.log(`Tension Die (d${die}): ${n}.${reason ? ` ${reason}` : ''}`, 'dim'); return; }
  const next = stepDown(die);
  if (next) { G.domain.tension = next; io.log(`Tension Die (d${die}): ${n} — <b>the tension rises (d${next})</b>.`, 'bad'); io.refresh(); return; }
  io.log(`Tension Die (d4): ${n} — <b>the darkness grows!</b>`, 'bad');
  G.domain.tension = 8;
  await growingDarkness();
}

const BOOSTS = { 1: 'Animal', 13: 'Elemental', 23: 'Astral', 35: 'Plant', 51: 'Demon', 59: 'Undead', 65: 'Humanoid', 77: 'Construct' };
export async function growingDarkness() {
  const G = g(); const p = pc(); const M = mods();
  bump('growing');
  if (p.flags.ignoreNextGrowing) { delete p.flags.ignoreNextGrowing; io.log('You remember what you learned, and the darkness passes you by.', 'good'); return; }
  if (p.flags.artifactBomb) { delete p.flags.artifactBomb; io.log('The whole necropolis shakes as a loud explosion echoes. Debris falls on you!', 'bad'); await damagePC(r('5D4'), 'Bludgeoning', { label: 'Collapsing debris' }); return; }
  let n = rnd(100);
  let row = lookup(GROWING_TEXT, n);
  const thrill = p.rewards.some((e) => e.thrill);
  if (thrill || M.rerollGrowing) {
    io.log(`Growing Darkness (${n}): ${row}`, 'bad');
    if (await io.yesNo(thrill ? 'Thrill Seeker: roll again and choose?' : 'Reroll the Growing Darkness? The second roll is final.')) {
      const n2 = rnd(100); const row2 = lookup(GROWING_TEXT, n2);
      if (thrill) { const ch = await io.choose('Choose the result:', [{ label: `(${n}) ${row}`, value: n }, { label: `(${n2}) ${row2}`, value: n2 }]); n = ch; } else n = n2;
      row = lookup(GROWING_TEXT, n);
    }
  }
  io.log(`<b>Growing Darkness</b> (${n}): ${row}`, 'bad');
  const lo = GROWING_TEXT.find((x) => n >= x[0] && n <= x[1])[0];
  const add = (id) => { G.domain.growing.push(id); };
  switch (lo) {
    case 1: case 13: case 23: case 35: case 51: case 59: case 65: case 77: add(`boost${BOOSTS[lo]}`); break;
    case 3: { const c = await check('Resolve', { label: 'The shadows grow longer' }); if (!c.success) await loseSanity(G.domain.growing.length || 0); break; }
    case 5: if (p.tough < maxTough() || p.health < maxHealth()) await damagePC(rnd(6), 'Psychic', { label: 'Your wounds resonate' }); break;
    case 7: if (p.sanity < maxSanity()) await loseSanity(1); break;
    case 9: { const v = rnd(4); p.base.aether = Math.max(0, p.base.aether - v); io.log(`Max Aether -${v}.`, 'bad'); clampStats(); add('drainAether'); break; }
    case 11: { const v = rnd(6); p.base.tough = Math.max(1, p.base.tough - v); io.log(`Max Toughness -${v}.`, 'bad'); clampStats(); add('drainTough'); break; }
    case 15: add('breatherTension'); break;
    case 17: add('campMinus'); break;
    case 19: add('noAttune'); break;
    case 21: p.res.Spellward = Math.max(0, p.res.Spellward - 5); add('spellward'); break;
    case 25: await beltCheck(); break;
    case 27: { const c = await check('Resolve', { label: 'This place watches you' }); if (!c.success) await loseSanity(rnd(4)); break; }
    case 29: p.flags.nextAmbushed = true; add('exhausted'); break;
    case 31: {
      const ms = p.minions || [];
      if (!ms.length) await damagePC(Math.max(rnd(8), 0), 'Psychic', { label: 'An oppressive will' });
      else for (const m of [...ms]) if (rnd(6) === 1) { p.minions = p.minions.filter((x) => x !== m); p.sustained = p.sustained.filter((s) => !s.endsWith(`#${m.uid}`)); io.log(`${m.name} is destroyed.`, 'bad'); }
      break;
    }
    case 33: { const k = G.domain.growing.length; G.domain.growing = []; if (k) { await loseSanity(k); p.health -= k; io.log(`You lose ${k} Health.`, 'bad'); if (p.health <= 0) throw new Death('the screams'); } break; }
    case 37: { const res = await encounter({ ambush: true }); await afterCombat(res); break; }
    case 53: { const c = await check('Endurance', { label: 'Suffocating mist' }); if (!c.success) await damagePC(r('3D4'), 'Poison', { label: 'Suffocating mist' }); break; }
    case 55: add('weakness'); break;
    case 57: { const s = await io.choose('Reduce a Skill of your choosing by 10.', SKILLS.map((x) => ({ label: `${x} (${skillBase(x)})`, value: x }))); p.skills[s] = Math.max(0, skillBase(s) - 10); break; }
    case 61: add('marks'); break;
    case 63: {
      const sk = await io.choose('Hellbats! Make a check with your weapon Skill of choice.', WEAPON_SKILLS.map((x) => ({ label: `${x} (${skillValue(x)})`, value: x })));
      const c = await check(sk, { label: 'Fend off the Hellbats' }); if (c.success) await gainXP(10); else await damagePC(rnd(10), 'Slashing', { label: 'Hellbats' }); break;
    }
    case 67: { if (p.light) { const v = rnd(4); p.light.rooms -= v; io.log(`Your light burns down by ${v}.`, 'bad'); if (p.light.rooms <= 0) tickLight(0); } break; }
    case 69: add('lightDrain'); break;
    case 71: { const c = await check('Resolve', { label: 'Spirits of the angry dead' }); if (c.success) await gainXP(20); else await loseSanity(rnd(4)); break; }
    case 73: add('dull'); break;
    case 75: { const k = p.madness.length; if (k) await damagePC(r(`${k}D6`), 'Psychic', { label: 'Assault from within' }); else io.log('Your mind holds.', 'dim'); break; }
    case 79: { const c = await check('Dodge', { label: 'Falling debris' }); if (!c.success) await damagePC(r('3D6'), 'Bludgeoning', { label: 'Falling debris' }); break; }
    case 81: {
      const i = rnd(10); const inf = { id: i }; if (i === 6) inf.dt = lookup(DAMAGE_TYPE_TABLE, rnd(20));
      G.domain.influences.push(inf); G.domain.extraXP = (G.domain.extraXP || 0) + 10;
      io.log(`New Overseer Influence: <b>${OVERSEER_INFLUENCE[i - 1].name}</b> — ${OVERSEER_INFLUENCE[i - 1].text}`, 'bad'); break;
    }
    default: break;
  }
  await checkGoals();
  io.refresh();
}

export async function beltCheck() {
  const p = pc(); const M = mods();
  if (!p.equip.belt) { await damagePC(1, 'Piercing', { label: 'You bruise yourself (no Belt)', ignoreArmor: true }); return; }
  if (M.beltSafe) { io.log('Your Belt protects its contents.', 'good'); return; }
  const n = rnd(4);
  // Belt quick slots hold potions first, then supplies
  const slots = [...p.potions.slice(0, 4)];
  const it = slots[n - 1];
  if (it) { p.potions = p.potions.filter((x) => x !== it); io.log('A potion on your Belt shatters!', 'bad'); }
  else io.log(`Belt check (${n}): the slot was empty.`, 'dim');
}

// ------------------------------------------------------------------ doors, locks & traps
function randomDifficulty() { const d = lookup(DIFFICULTY, rnd(8)); return d; }

async function handleDoor(from, to) {
  const key = edgeKey(from, to); const ds = D().doors[key] || (D().doors[key] = {});
  if (ds.open) return true;
  io.log('A door blocks the way.', 'info');
  if (!ds.investigated) {
    const choice = await io.choose('You stand before a door. Investigate it for traps and locks first?', [
      { label: 'Investigate it (Perception)', value: 'inv' },
      { label: 'Just open it', value: 'open' },
      { label: 'Leave it alone', value: 'leave', cls: 'secondary' },
    ]);
    if (choice === 'leave') return false;
    ds.investigated = true;
    ds.trapped = rnd(10) >= 7; ds.locked = rnd(20) >= 12;
    if (ds.trapped) ds.trap = rnd(10);
    if (choice === 'inv') {
      const diff = randomDifficulty();
      const c = await check('Perception', { mod: diff.mod, label: `Investigate the door (${diff.name})` });
      ds.spotted = c.success;
      if (c.success) io.log(ds.trapped ? `You spot a trap: <b>${TRAPS[ds.trap - 1].name}</b>.` : 'There are no traps.', ds.trapped ? 'bad' : 'good');
      else io.log("You can't tell if it's safe.", 'dim');
      if (!c.success && !(await io.yesNo('Interact with the door anyway?', 'Open it', 'Leave it'))) return false;
    }
  }
  if (ds.trapped && !ds.spotted && !ds.trapDone) { ds.trapDone = true; await triggerTrap(ds.trap, { aware: false }); }
  if (ds.trapped && ds.spotted && !ds.trapDone) {
    const ok = await resolveSpottedTrap(ds, { environmental: false });
    if (!ok) return false;
  }
  if (ds.locked) {
    const ok = await resolveLock(ds, 'door');
    if (!ok) return false;
  }
  ds.open = true; ds.locked = false;
  io.log('The door opens.', 'info');
  return true;
}

async function resolveSpottedTrap(ds, { environmental }) {
  const p = pc(); const tr = TRAPS[ds.trap - 1];
  for (;;) {
    const opts = [
      { label: `Disarm it (Thievery; needs a Thieves' Toolkit)`, value: 'disarm', disabled: !p.inv.some((i) => i.name === "Thieves' Toolkit") },
      { label: `Trigger it on purpose (${tr.skill} +20 to avoid)`, value: 'trigger' },
    ];
    if (environmental) opts.push({ label: `Bypass it (${tr.skill} +20, then you can only leave)`, value: 'bypass' });
    opts.push({ label: 'Leave it alone', value: 'leave', cls: 'secondary' });
    const ch = await io.choose(`Trap: ${tr.name}. ${tr.text}`, opts);
    if (ch === 'leave') return false;
    if (ch === 'disarm') {
      const diff = randomDifficulty();
      let c = await check('Thievery', { mod: diff.mod + 5, adv: hasPerk('Trap Buster'), label: `Disarm (${diff.name})` });
      if (!c.success && mods().rerollTrap) c = await check('Thievery', { mod: diff.mod + 5, label: 'Disarm (reroll)' });
      if (c.success) { ds.trapDone = true; io.log('You disarm the trap.', 'good'); bump('trapsDisarmed'); await gainXP(10, 'Trap disarmed'); await checkGoals(); return true; }
      if (c.fumble) io.log('Your fumbling sets it off!', 'bad');
      ds.trapDone = true; await triggerTrap(ds.trap, { aware: true }); return true;
    }
    if (ch === 'trigger') { ds.trapDone = true; await triggerTrap(ds.trap, { aware: true }); return true; }
    if (ch === 'bypass') {
      const c = await avoidCheck(tr, 20 + (ds.bypassedBefore ? 20 : 0));
      ds.bypassedBefore = true;
      if (c.success) { io.log('You carefully avoid the trap.', 'good'); return 'bypass'; }
      ds.trapDone = true; await applyTrap(tr); return true;
    }
  }
}

async function avoidCheck(tr, mod) {
  let skill = tr.skill;
  if (skill === 'Dodge' && mods().hardToHit && skillValue('Acrobatics') > skillValue('Dodge')) skill = 'Acrobatics';
  if (skill === 'Acrobatics' && hasAbility('wraith.2')) mod += 20;
  return check(skill, { mod, label: `Avoid the ${tr.name}` });
}

export async function triggerTrap(n, { aware }) {
  const tr = TRAPS[n - 1];
  io.log(`<b>Trap!</b> ${tr.name}: ${tr.text}`, 'bad');
  if (tr.gas || tr.alarm) { await applyTrap(tr); return; }
  const c = await avoidCheck(tr, aware ? 20 : 0);
  if (c.success) { io.log('You avoid it!', 'good'); return; }
  await applyTrap(tr);
}

async function applyTrap(tr) {
  const p = pc();
  if (tr.alarm) { const res = await encounter({}); await afterCombat(res); return; }
  if (tr.gas) { const c = await check('Endurance', { label: 'Hold your breath' }); if (!c.success) await damagePC(r('2D4+4'), 'Poison', { label: tr.name }); return; }
  if (tr.net) {
    p.cond.Restrained = true; io.log('You are caught in the net!', 'bad');
    const limit = rnd(6);
    for (let i = 1; i <= limit; i++) {
      gainExh(1);
      const c = await check('Athletics', { label: `Struggle free (${i})` });
      if (c.success) { delete p.cond.Restrained; io.log('You cut yourself free.', 'good'); return; }
    }
    delete p.cond.Restrained; io.log('The net finally breaks and you crash to the ground.', 'bad');
    await damagePC(r('2D8'), 'Bludgeoning', { label: 'Hard landing' });
    return;
  }
  await damagePC(r(tr.dmg), tr.type, { label: tr.name });
  if (tr.poison) { const c = await check('Endurance', { label: 'Resist the poison' }); if (!c.success) { p.cond.Poisoned = (p.cond.Poisoned || 0) + 1; io.log('You are Poisoned (1).', 'bad'); } }
}

/** Room trap from the Events table (environmental). */
export async function roomTrap(s) {
  s.trapActive = true; s.trap = TRAPS[rnd(10) - 1]; s.trapN = TRAPS.indexOf(s.trap) + 1;
  const diff = randomDifficulty();
  const c = await check('Perception', { mod: diff.mod, label: `Look for danger (${diff.name})` });
  if (!c.success) { s.trapActive = false; await triggerTrap(s.trapN, { aware: false }); return; }
  io.log(`You spot a trap in this room: <b>${s.trap.name}</b>.`, 'bad');
  await resolveRoomTrap(s);
}
export async function resolveRoomTrap(s) {
  const ds = { trap: s.trapN, bypassedBefore: s.bypassedBefore };
  const res = await resolveSpottedTrap(ds, { environmental: true });
  if (res === false) { io.log('You leave the trap be. You must deal with it, or leave, before doing anything else here.', 'dim'); return; }
  if (res === 'bypass') { s.trapBypassed = true; s.bypassedBefore = true; s.trapActive = false; return; }
  s.trapActive = false;
}

async function resolveLock(ds, what) {
  const p = pc();
  ds.lockMod = ds.lockMod ?? 0; ds.forceTries = ds.forceTries || 0;
  for (;;) {
    if (p.flags.herculean) { delete p.flags.herculean; io.log(`Herculean Feat: you smash the ${what} open!`, 'good'); await gainXP(10, `Locked ${what} opened`); return true; }
    const opts = [
      { label: `Pick the lock (Thievery${ds.lockMod ? ` ${ds.lockMod > 0 ? '+' : ''}${ds.lockMod}` : ''}; uses a Lockpick on failure) — ${p.sup.lockpick} Lockpicks`, value: 'pick', disabled: p.sup.lockpick < 1 },
      { label: `Force it open (Athletics${ds.forceTries ? ` +${20 * ds.forceTries}` : ''}; noisy: Tension Die check)`, value: 'force' },
      { label: 'Give up', value: 'leave', cls: 'secondary' },
    ];
    const ch = await io.choose(`The ${what} is locked.`, opts);
    if (ch === 'leave') return false;
    if (ch === 'pick') {
      const kit = p.inv.some((i) => i.name === "Thieves' Toolkit") ? 5 : 0;
      let c = await check('Thievery', { mod: ds.lockMod + kit, label: 'Pick the lock' });
      if (!c.success && mods().rerollLock && !ds.rerolled) { ds.rerolled = true; c = await check('Thievery', { mod: ds.lockMod + kit, label: 'Pick the lock (reroll)' }); }
      if (c.success) { io.log('Click. The lock opens.', 'good'); bump('thieveryOpens'); await gainXP(10, `Locked ${what} opened`); await checkGoals(); return true; }
      p.sup.lockpick -= 1; io.log('Your Lockpick snaps.', 'bad');
      ds.lockMod = Math.min(30, ds.lockMod + 10);
      if (c.fumble) { io.log('You trigger a trap you had somehow missed!', 'bad'); await triggerTrap(rnd(10), { aware: false }); }
    } else {
      const crow = p.inv.some((i) => i.name === 'Crowbar') ? 10 : 0;
      const ring = what === 'door' ? (mods().breakDoor || 0) : 0;
      const c = await check('Athletics', { mod: 20 * ds.forceTries + crow + ring, label: `Force the ${what}` });
      ds.forceTries += 1;
      await tensionCheck('(noise)');
      if (c.success) { io.log(`You force the ${what} open.`, 'good'); await gainXP(10, `Locked ${what} opened`); return true; }
      io.log("It doesn't budge.", 'dim');
    }
  }
}

// ------------------------------------------------------------------ scavenging & containers
export async function scavenge() {
  const p = pc(); const s = nodeState(D().cur); const M = mods();
  s.scavenged = (s.scavenged || 0) + 1;
  const c = await check('Scavenge', { label: 'Scavenge' });
  if (c.fumble) { const res = await encounter({}); await afterCombat(res); return; }
  if (!c.success) { io.log('You find nothing useful.', 'dim'); return; }
  bump('scavenged');
  let n = rnd(20);
  if (c.crit && await io.yesNo(`Good Find: add +5 to your Scavenging roll (${n})?`)) n += 5;
  const adjustable = hasPerk('Scavenger') || M.scavAdjust;
  if (adjustable) {
    const d4 = rnd(4);
    const ch = await io.choose(`Scavenging roll ${n}. You may adjust it by ${d4}.`, [{ label: `Keep ${n}`, value: n }, { label: `${n + d4}`, value: n + d4 }, { label: `${Math.max(1, n - d4)}`, value: Math.max(1, n - d4) }]);
    n = ch;
  }
  const e = lookup(SCAVENGING, Math.min(99, n));
  io.log(`Scavenging (${n}): ${e.text}`, 'loot');
  if (e.grisly) await loseSanity(1, { resolve: true, label: 'Grisly remains' });
  if (e.coins) { const v = r(e.coins); addSup('coins', v); io.log(`+${v} coins.`, 'loot'); }
  if (e.sup) { const v = r(e.n); addSup(e.sup, v); }
  if (e.spoils) await rollSpoils();
  if (hasAbility('tracker.1')) { addSup('cooking', 1); io.log('Cave Foraging: +1 Cooking Ingredient.', 'loot'); }
  await checkGoals();
}

export async function deepSearch() {
  const p = pc(); const s = nodeState(D().cur);
  s.searched = true;
  gainExh(2);
  await tensionCheck('(deep search)');
  io.log('Behind loose stones you find a hidden container.', 'info');
  const ds = { trapped: rnd(10) >= 7, locked: rnd(20) >= 10 };
  if (ds.trapped) ds.trap = rnd(10);
  const choice = await io.choose('A hidden container! Investigate it first?', [{ label: 'Investigate (Perception)', value: 'inv' }, { label: 'Open it', value: 'open' }, { label: 'Leave it', value: 'leave', cls: 'secondary' }]);
  if (choice === 'leave') return;
  if (choice === 'inv') {
    const diff = randomDifficulty();
    const c = await check('Perception', { mod: diff.mod, label: `Investigate (${diff.name})` });
    ds.spotted = c.success;
    if (c.success) io.log(ds.trapped ? `It is trapped: <b>${TRAPS[ds.trap - 1].name}</b>.` : 'No traps.', ds.trapped ? 'bad' : 'good');
  }
  if (ds.trapped && !ds.spotted) { ds.trapDone = true; await triggerTrap(ds.trap, { aware: false }); }
  if (ds.trapped && ds.spotted) { const ok = await resolveSpottedTrap(ds, { environmental: false }); if (!ok) return; }
  if (ds.locked) { const ok = await resolveLock(ds, 'container'); if (!ok) return; }
  if (hasPerk('Lucky Find')) { const v = rnd(20); addSup('coins', v); io.log(`Lucky Find: +${v} coins.`, 'loot'); }
  if (rnd(10) <= 5) { io.log('The container is empty.', 'dim'); return; }
  const { rollContainerLoot: rcl } = await import('./loot.js');
  await rcl();
}

// ------------------------------------------------------------------ special rooms
async function choir(entering) {
  const s = nodeState(D().cur);
  if (s.choirSilenced) return;
  io.log('The sewn choir begins to sing, the vibrations of their voices causing you an incredibly disturbing and unpleasant feeling.', 'bad');
  const c = await check('Resolve', { label: 'Endure the choir' });
  if (!c.success) await damagePC(rnd(4), 'Psychic', { label: 'The choir' });
  if (entering) io.log('You can attempt to silence the choir with a Reason check.', 'dim');
}
async function silenceChoir() {
  const s = nodeState(D().cur);
  const c = await check('Reason', { label: 'Silence the choir' });
  if (c.success) { s.choirSilenced = true; io.log('You soothe the voices somehow. In the silence, you explore the room in peace.', 'good'); bump('reasonEvents'); await rollSpoils(); }
  else { s.choirSilenced = false; s.mustLeave = true; io.log('The situation becomes unbearable. You must leave immediately.', 'bad'); }
}
async function useAltar() {
  const s = nodeState(D().cur); s.altarUsed = true;
  const { altarSacrifice } = await import('./events.js');
  await altarSacrifice(s.altar);
}

export async function reenterRoomEffects(id) {
  const d = nodeDef(id); const s = nodeState(id);
  delete s.mustLeave;
  if (d.choir && !s.choirSilenced) await choir(false);
}

async function fightOverseer() {
  const ok = await io.yesNo(`Confront ${CREATURES[D().overseer].name}? Overseers are deadly, but defeating one grants 200 XP, D4 Sanity, and great treasure.`, 'Fight', 'Not yet');
  if (!ok) return;
  const res = await startCombat({ defs: [D().overseer], nodeId: D().cur, overseer: true });
  await afterCombat(res);
}

async function descend() {
  const G = g(); const cur = G.domain;
  const warn = cur.num === 1 ? ' You cannot return to the First Domain once you leave.' : '';
  if (!(await io.yesNo(`Descend into the next Domain?${warn}`, 'Descend', 'Stay'))) return;
  G.pastDomains = G.pastDomains || [];
  if (cur.num > 1) G.pastDomains.push(cur);
  const existing = G.pastDomains.find((x) => x.num === cur.num + 1);
  if (existing) {
    G.pastDomains = G.pastDomains.filter((x) => x !== existing);
    G.domain = existing; existing.prev = null; existing.cur = existing.map.start;
    io.log(`<b>You return to Domain ${existing.num}.</b>`, 'title');
    await arrive(existing.cur, false);
    return;
  }
  G.domain = newDomain(cur.num + 1);
  bump('domains');
  io.log(`<b>You descend into Domain ${G.domain.num}.</b> The air grows colder, and an unfamiliar presence rules these halls.`, 'title');
  await gainXP(50, 'Entering a new Domain');
  await arrive(G.domain.cur, true);
}

async function ascend() {
  const G = g(); const cur = G.domain;
  const prevD = (G.pastDomains || []).find((x) => x.num === cur.num - 1);
  if (!prevD) { io.log('The way back up has collapsed.', 'dim'); return; }
  if (!(await io.yesNo(`Climb back up to Domain ${prevD.num}?`, 'Climb', 'Stay'))) return;
  G.pastDomains = G.pastDomains.filter((x) => x !== prevD).concat([cur]);
  G.domain = prevD;
  const exitId = Object.keys(prevD.map.nodes).find((k) => prevD.map.nodes[k].exit) || prevD.map.start;
  prevD.cur = exitId; prevD.prev = null;
  io.log(`<b>You climb back up into Domain ${prevD.num}.</b>`, 'title');
  await arrive(exitId, false);
}

/** Step into a Domain's entry room as if moving into it. */
async function arrive(id, fresh) {
  D().moves += 1;
  if (fresh) io.log(`The Overseer of this Domain has spread its influence: ${D().influences.map((i) => OVERSEER_INFLUENCE[i.id - 1].name).join(', ')}.`, 'dim');
  await enterRoom(id, {});
}

// ------------------------------------------------------------------ resting
export async function takeBreather() {
  const p = pc(); const M = mods();
  io.log('<b>You take a breather.</b>', 'title');
  p.flags.toughPenalty = 0; clampStats();
  healTough(r('D10+2'));
  await healHealth(1);
  gainExh(-2);
  if (p.light) { tickLight(5); }
  if (!M.breatherSafe) {
    const die = D().tension; const next = stepDown(die);
    if (next) { D().tension = next; io.log(`The Tension Die drops to d${next}.`, 'bad'); }
    else { io.log('The Tension Die was already at d4...', 'bad'); }
  }
  if (D().growing.includes('breatherTension')) await tensionCheck();
  resetOncePerRest();
  io.refresh();
}
function resetOncePerRest() {
  const p = pc();
  for (const k of ['savageWill', 'healD10', 'vanish', 'eventReroll']) delete p.once[k];
}

const CAMP_ACTS = [
  { id: 'sleep', label: 'Sleep (only Barricade allowed alongside): -5 Exhaustion, +1 Health, +2 Camp Check' },
  { id: 'barricade', label: 'Barricade: per 1 Crafting Supplies, +1 Exhaustion and +5 Camp Check' },
  { id: 'cook', label: 'Cooking: Cooking Ingredients → Rations (+1 Exhaustion, -1 Camp Check)' },
  { id: 'bandages', label: 'Craft Bandages: 1 Crafting Supplies each (+1 Exhaustion, -1)' },
  { id: 'torches', label: 'Craft Torches: 1 Crafting Supplies each (+1 Exhaustion, -2)' },
  { id: 'lockpicks', label: 'Craft Lockpicks: 1 Crafting Supplies each (+1 Exhaustion, -2)' },
  { id: 'oil', label: 'Craft Lamp Oil: 2 Crafting Supplies each (+1 Exhaustion, -2)' },
  { id: 'repair', label: 'Repair gear: 2 Crafting Supplies per item (+2 Exhaustion, -2)' },
  { id: 'heal', label: 'Heal Conditions: 1 Bandage per condition (+1 Exhaustion each)' },
  { id: 'attune', label: 'Attune magic items: 1 Attunement Crystal and 1 Exhaustion each' },
  { id: 'improve', label: 'Skill Improvement checks (marked Skills)' },
  { id: 'pray', label: 'Pray (Emissary): heal D4 Sanity, +2 Exhaustion, -1 Camp Check', req: () => hasMastery('emissary') },
  { id: 'components', label: 'Prepare Components (Ritualist): Crafting Supplies → Ritual Components, -4 Camp Check', req: () => hasMastery('ritualist') },
];

async function askQty(prompt, max) {
  if (max <= 0) { io.log('You do not have the materials.', 'dim'); return 0; }
  const opts = [...Array(Math.min(max, 10))].map((_, i) => ({ label: `${i + 1}`, value: i + 1 }));
  opts.push({ label: 'Cancel', value: 0, cls: 'secondary' });
  return io.choose(prompt, opts);
}

export async function setCamp() {
  const G = g(); const p = pc(); const M = mods();
  io.log('<b>You set up camp.</b>', 'title');
  let checkMod = 0; const done = new Set(); let slept = false;
  if (p.inv.some((i) => i.name === 'Bedroll')) checkMod += 1;
  if (hasAbility('tracker.3')) checkMod += 2;
  checkMod -= G.domain.growing.filter((x) => x === 'campMinus').length;
  const lacks = (id) => {
    const cr = p.sup.crafting;
    switch (id) {
      case 'barricade': case 'bandages': case 'torches': case 'lockpicks': case 'components': return cr < 1;
      case 'oil': return cr < 2;
      case 'cook': return p.sup.cooking < 1;
      case 'repair': return cr < 2 || !allItems().some((i) => i.broken || i.acid || (i.integ && i.integ < i.maxInteg));
      case 'heal': return p.sup.bandage < 1 || !['Bleeding', 'Poisoned', 'Burning', 'Freezing'].some((c) => p.cond[c]);
      case 'attune': return p.sup.crystal < 1 || !allItems().some((i) => i.magic && !i.attuned) || G.domain.growing.includes('noAttune');
      case 'improve': return !p.improve.length;
      default: return false;
    }
  };
  for (;;) {
    const opts = CAMP_ACTS.filter((a) => !a.req || a.req()).map((a) => ({
      label: a.label, value: a.id,
      disabled: lacks(a.id) || (done.has(a.id) && a.id !== 'barricade') || (slept && a.id !== 'barricade') || (a.id === 'sleep' && [...done].some((x) => x !== 'barricade')),
    }));
    opts.push({ label: `Finish and rest (Camp Check: D20 ${checkMod >= 0 ? '+' : ''}${checkMod}, need 12+)`, value: 'done', cls: 'primary' });
    const ch = await io.choose(`Camp activities (Exhaustion ${p.exh}). Choose what to do before resting.`, opts);
    if (ch === 'done') break;
    if (ch === 'sleep') { slept = true; done.add('sleep'); checkMod += 2; io.log('You will sleep deeply.', 'info'); continue; }
    if (ch === 'barricade') { const n = await askQty('Spend how many Crafting Supplies on barricades?', p.sup.crafting); if (n) { p.sup.crafting -= n; gainExh(n); checkMod += 5 * n; done.add('barricade'); io.log(`You barricade the room (+${5 * n}).`, 'info'); } continue; }
    if (ch === 'cook') { const n = await askQty('Cook how many Cooking Ingredients?', p.sup.cooking); if (n) { p.sup.cooking -= n; p.sup.ration += n; gainExh(1); checkMod -= 1; done.add(ch); io.log(`You cook ${n} Ration${n > 1 ? 's' : ''}.`, 'loot'); } continue; }
    if (ch === 'bandages' || ch === 'torches' || ch === 'lockpicks') {
      const key = { bandages: 'bandage', torches: 'torch', lockpicks: 'lockpick' }[ch];
      const n = await askQty(`Craft how many ${SUPPLIES[key][0]}s?`, p.sup.crafting);
      if (n) { p.sup.crafting -= n; p.sup[key] += n; gainExh(1); checkMod -= ch === 'bandages' ? 1 : 2; done.add(ch); io.log(`You craft ${n}x ${SUPPLIES[key][0]}.`, 'loot'); }
      continue;
    }
    if (ch === 'oil') { const n = await askQty('Craft how many Lamp Oil?', Math.floor(p.sup.crafting / 2)); if (n) { p.sup.crafting -= 2 * n; p.sup.lampOil += n; gainExh(1); checkMod -= 2; done.add(ch); } continue; }
    if (ch === 'repair') {
      const broken = allItems().filter((i) => i.broken || i.acid || (i.integ && i.integ < i.maxInteg));
      if (!broken.length) { io.log('Nothing needs repairing.', 'dim'); continue; }
      let any = false;
      for (;;) {
        const sel = await io.choose(`Repair which item? (2 Crafting Supplies each; you have ${p.sup.crafting})`, [...broken.filter((i) => i.broken || i.acid || i.integ < i.maxInteg).map((i) => ({ label: `${i.name}${i.broken ? ' (broken)' : ''}${i.acid ? ` (-${i.acid} acid)` : ''}${i.integ ? ` d${i.integ}/d${i.maxInteg}` : ''}`, value: i.uid, disabled: p.sup.crafting < 2 })), { label: 'Done', value: null, cls: 'secondary' }]);
        if (!sel) break;
        const it = broken.find((i) => i.uid === sel); p.sup.crafting -= 2; any = true;
        if (it.broken) it.broken = false; else if (it.acid) it.acid = 0; else { const chain = [4, 6, 8, 10, 12]; it.integ = Math.min(it.maxInteg, chain[chain.indexOf(it.integ) + 1] || it.maxInteg); }
        io.log(`You repair the ${it.name}.`, 'good');
      }
      if (any) { gainExh(2); checkMod -= 2; done.add(ch); }
      continue;
    }
    if (ch === 'heal') {
      let any = false;
      for (const cnd of ['Bleeding', 'Poisoned', 'Burning', 'Freezing']) {
        if (p.cond[cnd] && p.sup.bandage > 0 && await io.yesNo(`Spend a Bandage to remove ${cnd}?`)) { p.sup.bandage -= 1; delete p.cond[cnd]; gainExh(1); any = true; io.log(`${cnd} removed.`, 'good'); }
      }
      if (!any) io.log('No conditions treated.', 'dim'); else done.add(ch);
      continue;
    }
    if (ch === 'attune') {
      let any = false;
      for (;;) {
        const unk = allItems().filter((i) => i.magic && !i.attuned);
        if (!unk.length) { io.log('You have no magic items to attune.', 'dim'); break; }
        const sel = await io.choose(`Attune to which item? (1 Attunement Crystal each; you have ${p.sup.crystal})`, [...unk.map((i) => ({ label: i.name, value: i.uid, disabled: p.sup.crystal < 1 })), { label: 'Done', value: null, cls: 'secondary' }]);
        if (!sel) break;
        const it = unk.find((i) => i.uid === sel); p.sup.crystal -= 1; gainExh(1); any = true;
        let sk = null;
        if (it.props.some((x) => x.needsSkill)) sk = await io.choose('This item enhances a Skill of your choosing. Which?', SKILLS.map((x) => ({ label: x, value: x })));
        finishAttunement(it, sk);
        io.log(`You attune to the <b>${it.name}</b>. ${it.props.map((x) => x.t).join(' ')} <i>${it.peculiarity}</i>`, 'loot');
      }
      if (any) done.add(ch);
      continue;
    }
    if (ch === 'improve') {
      if (!p.improve.length) { io.log('No Skills are marked for Improvement. (Roll doubles on a Skill check to mark it.)', 'dim'); continue; }
      for (const sk of [...p.improve]) {
        const n = rnd(100); const cur = skillBase(sk);
        const gain = n > cur ? rnd(4) : 1;
        p.skills[sk] = Math.min(80, cur + gain);
        io.log(`Improvement ${sk}: rolled ${n} vs ${cur} → +${gain} (now ${p.skills[sk]}).`, 'good');
      }
      p.improve = []; done.add(ch); continue;
    }
    if (ch === 'pray') { gainSanity(rnd(4)); gainExh(2); checkMod -= 1; done.add(ch); continue; }
    if (ch === 'components') { const n = await askQty('Turn how many Crafting Supplies into Ritual Components?', p.sup.crafting); if (n) { p.sup.crafting -= n; p.sup.ritual += n; checkMod -= 4; done.add(ch); } continue; }
  }
  // Ration
  let halved = false;
  if (p.sup.ration > 0) { p.sup.ration -= 1; io.log('You eat a Ration.', 'info'); }
  else { halved = true; io.log('You have no Ration. The benefits of camping are halved.', 'bad'); }
  // Camp check
  const n = rnd(20); const total = n + checkMod;
  io.log(`Camp Check: ${n} ${checkMod >= 0 ? '+' : ''}${checkMod} = <b>${total}</b>`, total >= 12 ? 'roll good' : 'roll bad');
  if (total < 12) {
    io.log('Something finds your camp in the night!', 'bad');
    const res = await encounter({});
    await afterCombat(res);
    if (res !== 'won') return;
    halved = true;
  }
  const h = (x) => (halved ? Math.floor(x / 2) : x);
  // Benefits
  p.flags.toughPenalty = 0; p.flags.healthPenalty = 0; clampStats();
  const toughGain = maxTough() - p.tough; p.tough += h(toughGain); io.log(`You recover ${h(toughGain)} Toughness.`, 'good');
  await healHealth(h(1 + (slept ? 1 : 0)) + (M.campHealth ? r(M.campHealth) : 0) + (p.rot >= 5 ? rnd(4) : 0));
  gainSanity(h(rnd(4)) + (M.campSanity ? r(M.campSanity) : 0));
  gainExh(-h(10 + (slept ? 5 : 0)));
  p.tempTough = 0; p.tempAether = 0;
  for (const k of Object.keys(p.once)) delete p.once[k];
  // Rot
  if (p.rotInfected) {
    const c = await check('Endurance', { label: 'Fight the Rot' });
    if (!c.success) {
      p.rot += 1; io.log(`<b>The Rot advances to stage ${p.rot}:</b> ${ROT_STAGES[p.rot - 1]}`, 'bad');
      if (p.rot >= 8) throw new Death('the Rot');
    }
  }
  // Band of Knowledge
  if (allItems().some((i) => i.name === 'Band of Knowledge')) {
    const sk = await io.choose('Band of Knowledge: choose a Skill to gain +50 until your next Camp Rest.', SKILLS.map((x) => ({ label: x, value: x })));
    p.effects = p.effects.filter((e) => e.id !== 'band'); p.effects.push({ id: 'band', name: 'Band of Knowledge', eff: { skill: { [sk]: 50 } } });
  }
  io.log('You wake, as rested as one can be in the Midnight Throne.', 'info');
  clampStats(); io.refresh();
}

// ------------------------------------------------------------------ traders
export async function trade() {
  const p = pc();
  let hoarderLeft = p.rewards.some((e) => e.hoarder) ? 5 - (p.flags.hoarderUsed || 0) : 0;
  for (;;) {
    const ch = await io.choose(`The Trader grunts. You have <b>${p.sup.coins}</b> coins.`, [
      { label: 'Buy weapons', value: 'w' }, { label: 'Buy armor & shields', value: 'a' }, { label: 'Buy gear & supplies', value: 'g' },
      { label: 'Sell items', value: 's' }, { label: 'Leave', value: 'x', cls: 'secondary' },
    ]);
    if (ch === 'x') return;
    const buy = async (list) => {
      const sel = await io.choose('Buy what?', [...list.map((x) => ({ label: `${x.label} — ${x.cost}`, value: x, disabled: p.sup.coins < x.cost })), { label: 'Back', value: null, cls: 'secondary' }]);
      if (!sel) return;
      p.sup.coins -= sel.cost; await sel.give(); io.log(`You buy ${sel.label}.`, 'loot'); io.refresh();
    };
    if (ch === 'w') await buy(Object.values(WEAPONS).map((w) => ({ label: `${w.name} (${w.skill}, ${w.type}${w.traits.length ? `, ${w.traits.join(', ')}` : ''})`, cost: w.cost, give: () => addItem(makeWeapon(w.name)) })));
    if (ch === 'a') {
      const list = [];
      for (const [k, v] of Object.entries(TORSO)) list.push({ label: `${k} Armor (Prot ${v.prot}, -${v.man} Maneuverability)`, cost: v.cost, give: () => addItem(makeArmor('torso', k, false)) });
      for (const [k, v] of Object.entries(HELMETS)) list.push({ label: `${k} Helmet (Prot ${v.prot}, -${v.perc} Perception)`, cost: v.cost, give: () => addItem(makeArmor('head', k, false)) });
      for (const [k, v] of Object.entries(LIMB)) list.push({ label: `${k} Vambraces (Prot ${v.prot})`, cost: v.cost, give: () => addItem(makeArmor('arms', k, false)) });
      for (const [k, v] of Object.entries(LIMB)) list.push({ label: `${k} Greaves (Prot ${v.prot})`, cost: v.cost, give: () => addItem(makeArmor('legs', k, false)) });
      for (const [k, v] of Object.entries(SHIELDS)) list.push({ label: `${k} Shield (Parry +${v.parry})`, cost: v.cost, give: () => addItem(makeArmor('shield', k, false)) });
      await buy(list);
    }
    if (ch === 'g') {
      const list = [];
      for (const [k, v] of Object.entries(GEAR)) list.push({ label: k, cost: v[0], give: () => addItem(makeGear(k)) });
      for (const [k, v] of Object.entries(SUPPLIES)) if (k !== 'coins') list.push({ label: v[0], cost: v[1], give: () => addSup(k, 1) });
      await buy(list);
    }
    if (ch === 's') {
      const items = p.inv.filter((i) => !i.noSell);
      const sel = await io.choose('Sell what? (Traders pay half price; identified magic items sell at fixed prices)', [...items.map((i) => ({ label: `${i.name} — ${sellValue(i, hoarderLeft > 0)}`, value: i.uid })), ...Object.entries(p.sup).filter(([k, v]) => k !== 'coins' && v > 0).map(([k, v]) => ({ label: `1x ${SUPPLIES[k][0]} (have ${v}) — ${Math.floor(SUPPLIES[k][1] / 2)}`, value: `sup:${k}` })), { label: 'Back', value: null, cls: 'secondary' }]);
      if (!sel) continue;
      if (sel.startsWith('sup:')) { const k = sel.slice(4); p.sup[k] -= 1; addSup('coins', Math.floor(SUPPLIES[k][1] / 2)); }
      else { const it = items.find((i) => i.uid === sel); const v = sellValue(it, hoarderLeft > 0); if (hoarderLeft > 0 && !it.magic) { hoarderLeft -= 1; p.flags.hoarderUsed = (p.flags.hoarderUsed || 0) + 1; } p.inv = p.inv.filter((i) => i !== it); addSup('coins', v); io.log(`You sell the ${it.name} for ${v} coins.`, 'loot'); }
      await checkGoals();
    }
  }
}

export { randomDifficulty, DIFF_STEPS, DIFF_NAMES };
