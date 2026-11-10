// Side panels: Map, Survivor sheet, Inventory, Journal.
import { S } from '../state.js';
import { SKILLS, RESISTANCES, SKILL_TEXT, RES_TEXT, CONDITIONS, PERSONAL_GOALS, OVERSEER_INFLUENCE, EXHAUSTION_TABLE, ROT_STAGES, MADNESS, PERKS } from '../data/rules.js';
import { MASTERY_BY_ID } from '../data/masteries.js';
import { WEAPONS, SUPPLIES, SUPPLY_TEXT, WEAPON_TRAITS, LORE_BOOKS, GEAR } from '../data/items.js';
import { CREATURES } from '../data/creatures.js';
import { neighbors, edgeKey } from '../data/domain1.js';
import {
  pc, mods, skillValue, skillBase, maxHealth, maxTough, maxAether, maxSanity, mainWeapon, pcArmorAt, capacity, slotsUsed, lightLabel,
  hasLight, activeMasteries, exhaustionEffect, maneuverPenalty, helmetPenalty,
} from '../engine/character.js';
import { potionName, fragmentDef } from '../engine/loot.js';
import { MAP, nodeTitle } from '../engine/explore.js';
import { lookup } from '../dice.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function statChips() {
  const p = pc(); const g = S.g;
  const chip = (lbl, v, max, color, warn) => `<span class="stat${warn ? ' warn' : ''}" title="${lbl}"><span class="dot" style="background:${color}"></span><span class="lbl">${lbl}</span> <b>${v}${max != null ? `/${max}` : ''}</b></span>`;
  const out = [];
  out.push(chip('HP', p.health, maxHealth(), 'var(--health)', p.health <= 3));
  out.push(chip('TGH', p.tough + (p.tempTough ? `+${p.tempTough}` : ''), maxTough(), 'var(--tough)'));
  out.push(chip('AE', p.aether + (p.tempAether ? `+${p.tempAether}` : ''), maxAether(), 'var(--aether)'));
  out.push(chip('SAN', p.sanity + (p.tempSanity ? `+${p.tempSanity}` : ''), maxSanity(), 'var(--sanity)', p.sanity <= 3));
  out.push(chip('EXH', p.exh, null, 'var(--exh)', p.exh >= 11));
  out.push(chip('Light', lightLabel(), null, '#f0c67a', !hasLight()));
  if (g.domain) out.push(chip('Tension', `d${g.domain.tension}`, null, 'var(--blood)', g.domain.tension <= 4));
  out.push(chip('XP', p.xp, p.level * 1000, 'var(--gold)'));
  return out.join('');
}

function bar(label, v, max, color) {
  const pct = Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100));
  return `<div class="bar"><div>${label} <b>${v}/${max}</b></div><div class="track"><i style="width:${pct}%;background:${color}"></i></div></div>`;
}

// ------------------------------------------------------------------ Survivor sheet
export function renderSheet() {
  const p = pc(); const M = mods(); const w = mainWeapon();
  const conds = Object.entries(p.cond).filter(([k, v]) => v && k[0] === k[0].toUpperCase() && CONDITIONS[k]);
  const skills = SKILLS.map((s) => {
    const base = skillBase(s); const eff = skillValue(s);
    return `<div title="${esc(SKILL_TEXT[s])}">${s}${p.improve.includes(s) ? ' <span class="tag">improve</span>' : ''}</div><div class="v">${eff}${eff !== base ? ` <span class="dim">(${base})</span>` : ''}</div>`;
  }).join('');
  const res = RESISTANCES.map((s) => `<div title="${esc(RES_TEXT[s])}">${s}</div><div class="v">${skillValue(s)}</div>`).join('');
  const masteries = activeMasteries().map((m) => {
    const d = MASTERY_BY_ID[m.id];
    const tiers = d.tiers.map((t, i) => (i < m.tier ? `<div class="ability"><b>Tier ${i + 1} — ${t[0]}</b> <span class="dim">(${t[1]})</span><br>${t[2]}</div>` : `<div class="ability dim">Tier ${i + 1} — ${t[0]} <span class="tag">locked</span></div>`)).join('');
    return `<div class="card"><h3>${d.name}${m.amulet ? ' <span class="tag">Amulet</span>' : ''}</h3><div class="note">${m.training ? `Trained at ${esc(m.training)}` : ''}</div>
      <div class="ability"><b>${d.feature[0]}</b>: ${d.feature[1]}</div>${tiers}
      ${m.id === 'weaponmaster' && p.dedication ? `<div class="note">Dedication: ${p.dedication}</div>` : ''}</div>`;
  }).join('');
  const goals = p.goals.map((gl) => { const d = PERSONAL_GOALS.find((x) => x.id === gl.id); return `<div class="item"><div><b>${d.name}</b><div class="meta">${d.obj} → ${d.reward}</div></div><div class="v">${Math.min(p.stats[d.stat] || 0, d.n)}/${d.n}</div></div>`; }).join('') || '<div class="note">None</div>';
  const done = p.goalsDone.map((id) => PERSONAL_GOALS.find((x) => x.id === id)?.name).join(', ');
  const exhE = exhaustionEffect();
  const armorLocs = ['Head', 'Chest', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'];
  return `<div class="panel">
    <h3>${esc(p.name)}</h3>
    <div class="note">Level ${p.level} survivor${p.crime ? `, accused of ${esc(p.crime)}` : ''}. ${esc(p.appearance || '')}</div>
    <div class="bars" style="margin-top:8px">
      ${bar('Health', p.health, maxHealth(), 'var(--health)')}
      ${bar('Toughness', p.tough, maxTough(), 'var(--tough)')}
      ${bar('Aether', p.aether, maxAether(), 'var(--aether)')}
      ${bar('Sanity', p.sanity, maxSanity(), 'var(--sanity)')}
      ${bar('Experience', p.xp - (p.level - 1) * 1000, 1000, 'var(--gold)')}
    </div>
    <div class="kv" style="margin-top:8px">
      <div>Exhaustion</div><div class="v">${p.exh}</div>
      <div class="note" style="grid-column:1/3">${exhE}</div>
      ${p.tempTough ? `<div>Temporary Toughness</div><div class="v">${p.tempTough}</div>` : ''}
      ${p.abilityPoints ? `<div>Unspent Ability Points</div><div class="v">${p.abilityPoints} <button class="chip-btn" data-act="spendap">Spend</button></div>` : ''}
      <div>Coins</div><div class="v">${p.sup.coins}</div>
    </div>
    ${conds.length ? `<h3>Conditions</h3>${conds.map(([k, v]) => `<div class="ability" title="${esc(CONDITIONS[k])}"><b>${k}</b>${typeof v === 'number' ? ` (${v})` : ''} — <span class="note">${CONDITIONS[k]}</span></div>`).join('')}` : ''}
    ${p.effects.filter((e) => e.name).length ? `<h3>Active effects</h3>${p.effects.filter((e) => e.name).map((e) => `<div class="ability">${esc(e.name)}${e.rooms ? ` <span class="dim">(${e.rooms} rooms)</span>` : ''}</div>`).join('')}` : ''}
    <h3>Combat</h3>
    <div class="kv">
      <div>Weapon</div><div class="v">${esc(w.name)}</div>
      <div>Attack (${esc(w.skill)})</div><div class="v">${skillValue(w.skill)}</div>
      <div>Damage</div><div class="v">D${w.unarmed ? w.die : 6} ${w.type}</div>
      <div>Speed</div><div class="v">${w.speed || 0}</div>
      ${w.traits.length ? `<div class="note" style="grid-column:1/3">${w.traits.map((t) => `<span class="tag" title="${esc(WEAPON_TRAITS[t])}">${t}</span>`).join('')}</div>` : ''}
      ${armorLocs.map((l) => `<div>Armor: ${l}</div><div class="v">${pcArmorAt(l)}</div>`).join('')}
      ${maneuverPenalty() ? `<div>Maneuverability</div><div class="v">-${maneuverPenalty()}</div>` : ''}
      ${helmetPenalty() ? `<div>Helmet (Perception)</div><div class="v">-${helmetPenalty()}</div>` : ''}
    </div>
    <h3>Skills</h3><div class="kv">${skills}</div>
    <h3>Resistances</h3><div class="kv">${res}</div>
    <h3>Masteries</h3>${masteries}
    <h3>Personal Goals</h3>${goals}${done ? `<div class="note">Completed: ${done}</div>` : ''}
    ${p.perks.length ? `<h3>Perks</h3>${p.perks.map((x) => `<div class="ability"><b>${x}</b>: ${PERKS[x]}</div>`).join('')}` : ''}
    ${p.madness.length ? `<h3>Madness</h3>${p.madness.map((x) => `<div class="ability">${MADNESS[x - 1]}</div>`).join('')}` : ''}
    ${p.rotInfected ? `<h3>The Rot</h3><div class="ability">Infected${p.rot ? `, stage ${p.rot}` : ''}.</div>${ROT_STAGES.slice(0, p.rot).map((t) => `<div class="note">${t}</div>`).join('')}` : ''}
  </div>`;
}

// ------------------------------------------------------------------ Inventory
const SLOT_NAMES = { main: 'Main hand', off: 'Off-hand', head: 'Head', torso: 'Torso', arms: 'Arms', legs: 'Legs', belt: 'Belt', gloves: 'Gloves', boots: 'Boots', amulet: 'Amulet', ring1: 'Ring', ring2: 'Ring' };

export function itemDesc(it) {
  const parts = [];
  if (it.kind === 'weapon') { const w = WEAPONS[it.base]; if (w) parts.push(`${w.skill}, ${w.type}, Speed ${w.speed}${w.traits.length ? `, ${w.traits.join(', ')}` : ''}`); }
  if (it.prot) parts.push(`Protection ${Math.max(0, it.prot - (it.acid || 0))}`);
  if (it.parry) parts.push(`Parry +${it.parry}`);
  if (it.integ) parts.push(`Integrity d${it.integ}/d${it.maxInteg}`);
  if (it.broken) parts.push('<b class="bad">BROKEN</b>');
  if (it.desc) parts.push(esc(it.desc));
  if (GEAR[it.name] && !it.desc) parts.push(GEAR[it.name][2]);
  if (it.magic && it.identified) parts.push(`<span class="magic">${it.props.map((x) => esc(x.t)).join(' ')}</span>`);
  if (it.magic && !it.identified) parts.push('<span class="magic">Magic — attune at Camp with an Attunement Crystal to identify.</span>');
  if (it.peculiarity && it.identified) parts.push(`<i>${esc(it.peculiarity)}</i>`);
  return parts.join(' · ');
}
function nameCls(it) { return it.relic || it.crelic ? 'relicname' : it.magic ? 'magic' : ''; }

export function renderInventory(canAct) {
  const p = pc();
  const dis = canAct ? '' : ' disabled';
  const eq = Object.entries(p.equip).map(([slot, it]) => {
    if (!it) return `<div class="item"><div><span class="dim">${SLOT_NAMES[slot]}:</span> <span class="dim">—</span></div></div>`;
    const acts = it.kind === 'light' ? '' : `<button class="chip-btn" data-act="unequip" data-slot="${slot}"${dis}>Remove</button>`;
    return `<div class="item"><div><span class="dim">${SLOT_NAMES[slot]}:</span> <span class="${nameCls(it)}">${esc(it.name)}</span><div class="meta">${it.kind === 'light' ? `${p.light ? `${p.light.rooms} rooms left` : ''}` : itemDesc(it)}</div></div><div class="acts">${acts}</div></div>`;
  }).join('');
  const bag = p.inv.map((it) => {
    const acts = [];
    if (['weapon', 'shield', 'torso', 'head', 'arms', 'legs', 'belt', 'boots', 'gloves', 'amulet', 'ring'].includes(it.kind)) acts.push(`<button class="chip-btn" data-act="equip" data-id="${it.uid}"${dis}>Equip</button>`);
    if (it.kind === 'consumable') acts.push(`<button class="chip-btn" data-act="consume" data-id="${it.uid}"${dis}>Use</button>`);
    acts.push(`<button class="chip-btn" data-act="drop" data-id="${it.uid}"${dis}>Drop</button>`);
    return `<div class="item"><div><span class="${nameCls(it)}">${esc(it.name)}</span><div class="meta">${itemDesc(it)}</div></div><div class="acts">${acts.join('')}</div></div>`;
  }).join('') || '<div class="note">Nothing.</div>';
  const sup = Object.entries(p.sup).filter(([k, v]) => v > 0 && k !== 'coins').map(([k, v]) => {
    const acts = [];
    if (k === 'ration') acts.push(`<button class="chip-btn" data-act="ration"${dis}>Eat</button>`);
    if (k === 'cooking') acts.push(`<button class="chip-btn" data-act="raw"${dis}>Eat raw</button>`);
    acts.push(`<button class="chip-btn" data-act="dropsup" data-key="${k}"${dis}>Drop 1</button>`);
    return `<div class="item"><div>${v}× ${SUPPLIES[k][0]}<div class="meta">${SUPPLY_TEXT[k] || ''}</div></div><div class="acts">${acts.join('')}</div></div>`;
  }).join('');
  const pots = p.potions.map((po) => `<div class="item"><div>${esc(potionName(po))}</div><div class="acts">${!po.type ? `<button class="chip-btn" data-act="idpotion" data-id="${po.uid}"${dis}>Identify</button>` : ''}<button class="chip-btn" data-act="drink" data-id="${po.uid}"${dis}>Drink</button><button class="chip-btn" data-act="droppotion" data-id="${po.uid}"${dis}>Drop</button></div></div>`).join('');
  const frs = p.fragments.map((fr) => { const d = fragmentDef(fr); return `<div class="item"><div><span class="magic">${esc(d.name)}</span><div class="meta">${esc(d.text)}</div></div><div class="acts">${d.use !== 'combat' ? `<button class="chip-btn" data-act="fragment" data-id="${fr.uid}"${dis}>Use</button>` : '<span class="note">combat</span>'}</div></div>`; }).join('');
  const floor = S.g.domain?.nodes?.[S.g.domain.cur]?.floor || [];
  const fl = floor.map((it) => `<div class="item"><div>${esc(it.name)}</div><div class="acts"><button class="chip-btn" data-act="pickup" data-id="${it.uid}"${dis}>Pick up</button></div></div>`).join('');
  const minions = (p.minions || []).map((m) => `<div class="item"><div>${esc(m.name)} <span class="dim">${m.hp}/${m.maxHp} HP</span></div></div>`).join('');
  const used = slotsUsed(); const cap = capacity();
  return `<div class="panel">
    ${canAct ? '' : '<div class="note" style="margin-bottom:8px">Finish the current action to manage your gear.</div>'}
    <h3>Equipped</h3>${eq}
    <h3>Bags <span class="note">(${used}/${cap} slots${used > cap ? ' — <b class="bad">overloaded</b>' : ''})</span></h3>${bag}
    ${sup ? `<h3>Supplies</h3>${sup}` : ''}
    <div class="kv" style="margin-top:6px"><div>Coins</div><div class="v">${p.sup.coins}</div></div>
    ${pots ? `<h3>Potions</h3>${pots}` : ''}
    ${frs ? `<h3>Fragments</h3>${frs}` : ''}
    ${minions ? `<h3>Minions</h3>${minions}` : ''}
    ${fl ? `<h3>On the floor</h3>${fl}` : ''}
  </div>`;
}

// ------------------------------------------------------------------ Map
export function renderMap() {
  const g = S.g; const D = g.domain; if (!D) return '';
  const visible = new Set();
  for (const [id, s] of Object.entries(D.nodes)) if (s.visited || s.scouted) { visible.add(id); for (const nb of neighbors(MAP, id)) visible.add(nb.id); }
  visible.add(D.cur);
  const adj = new Set(neighbors(MAP, D.cur).map((n) => n.id));
  // Generated Domains use grid coordinates: scale them into the view.
  const P = {};
  const gen = !!D.map;
  if (gen) {
    const ns = Object.entries(MAP.nodes).filter(([id]) => visible.has(id));
    const xs = ns.map(([, n]) => n.gx); const ys = ns.map(([, n]) => n.gy);
    const minX = Math.min(...xs); const minY = Math.min(...ys);
    const span = Math.max(4, Math.max(...xs) - minX, Math.max(...ys) - minY);
    for (const [id, n] of ns) P[id] = { x: 8 + ((n.gx - minX) / span) * 84, y: 8 + ((n.gy - minY) / span) * 84 };
  } else for (const [id, n] of Object.entries(MAP.nodes)) P[id] = { x: n.x, y: n.y };
  const edges = MAP.edges.filter(([a, b]) => visible.has(a) && visible.has(b)).map(([a, b, door]) => {
    const A = P[a], B = P[b];
    const known = D.nodes[a]?.visited || D.nodes[b]?.visited;
    const open = D.doors[edgeKey(a, b)]?.open;
    return `<line class="edge${door && !open ? ' door' : ''}${known ? '' : ' dim'}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
  }).join('');
  const nodes = [...visible].map((id) => {
    const n = { ...MAP.nodes[id], ...P[id] }; const s = D.nodes[id] || {};
    const cls = ['node', s.visited ? 'visited' : '', id === D.cur ? 'current' : '', adj.has(id) ? 'adj' : '', n.lair && (s.visited) ? 'lair' : ''].join(' ');
    const shape = n.kind === 'room' ? `<circle cx="${n.x}" cy="${n.y}" r="${n.fixed ? 3.6 : 3}"/>` : `<rect x="${n.x - 1.6}" y="${n.y - 1.6}" width="3.2" height="3.2" transform="rotate(45 ${n.x} ${n.y})"/>`;
    const label = n.lair ? '!' : n.exit ? '>' : n.kind === 'room' ? (n.fixed ? n.label : s.visited ? '' : '?') : '';
    const open = gen ? (MAP.open[id] || 0) : 0;
    const sub = `${s.trader ? '$' : ''}${open ? `+${open}` : ''}`;
    return `<g class="${cls}" data-node="${id}">${shape}${label ? `<text class="lbl" x="${n.x}" y="${n.y + 1.1}">${label}</text>` : ''}${sub ? `<text x="${n.x + 4}" y="${n.y - 2}">${sub}</text>` : ''}</g>`;
  }).join('');
  const cur = MAP.nodes[D.cur];
  const infl = (D.influences || []).map((i) => OVERSEER_INFLUENCE[(i.id || i) - 1]).map((o) => `<b>${o.name}</b>: ${o.text}`).join(' · ');
  return `<div class="panel">
    <h3>${MAP.name}</h3>${gen ? `<div class="note">Lair Die d${D.lairFound ? '—' : D.lairDie} · Exit Die d${D.exitFound ? '—' : D.exitDie}</div>` : ''}
    <div class="map-wrap"><svg class="map-svg" viewBox="-4 -4 108 108" role="img" aria-label="Map of the domain">${edges}${nodes}</svg></div>
    <div class="legend"><span>● room</span><span>◆ corridor</span><span>- - door</span><span>$ trader</span>${gen ? '<span>+n unexplored passages</span><span>! Overseer</span><span>&gt; exit</span>' : ''}<span>Tap an adjacent room to move.</span></div>
    <h3>Here</h3><div><b>${esc(nodeTitle(D.cur))}</b></div>
    <h3>Domain</h3>
    <div class="kv">
      <div>Overseer</div><div class="v">${D.overseerSeen || D.overseerDefeated ? esc(CREATURES[D.overseer].name) : 'Unknown'}${D.overseerDefeated ? ' (slain)' : ''}</div>
      <div>Tension Die</div><div class="v">d${D.tension}</div>
      <div>Growing Darkness</div><div class="v">${D.growing.length}</div>
      <div>Rooms traversed</div><div class="v">${D.moves}</div>
    </div>
    ${!D.overseerDefeated ? `<div class="note" style="margin-top:6px">Overseer Influence on this Domain's creatures: ${infl}</div>` : ''}
  </div>`;
}

// ------------------------------------------------------------------ Journal
export function renderJournal() {
  const p = pc();
  const books = p.lore.map((i) => `<details class="card"><summary><b>${esc(LORE_BOOKS[i][0])}</b></summary><p class="lore"><i>"${esc(LORE_BOOKS[i][1])}"</i></p></details>`).join('') || '<div class="note">No Lore Books found yet.</div>';
  return `<div class="panel">
    <h3>Lore Books</h3>${books}
    <h3>Quick rules</h3>
    <div class="note">
      <p><b>Checks:</b> roll D100 equal to or under your Skill. Doubles under are Critical Successes; doubles over are Fumbles. Doubles mark a Skill for Improvement at Camp.</p>
      <p><b>Combat:</b> attacks are opposed (your weapon Skill +10 vs their Combat Skill minus your weapon's Speed). Higher successful roll wins. If both fail, the defender takes 1 damage. Damage comes from your Damage Pool: roll all dice, keep one.</p>
      <p><b>Wounds:</b> damage removes Toughness first, then Health. At 0 Health you die. You recover D4 Toughness after each fight.</p>
      <p><b>Tension Die:</b> rolled every time you move. On 1-2 it shrinks; on 1-2 at d4 the darkness grows.</p>
      <p><b>Light:</b> without a lightsource you are Blinded and must pass Resolve in every room or lose Sanity.</p>
      <p><b>Camp</b> to fully restore Toughness, recover Health and Sanity, reduce Exhaustion, craft, repair, and attune magic items.</p>
    </div>
  </div>`;
}

export { esc };
