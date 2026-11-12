// App shell: screens, the UI side of the engine bridge, panels and menus.
import { S, save, hasSave, loadGame, clearSave, exportSave, importSave, settings, saveSettings, saveLastPC, loadLastPC } from '../state.js';
import { setIO, io } from '../io.js';
import { r, rnd } from '../dice.js';
import { runCreation, randomSurvivor } from './creation.js';
import { MASTERY_BY_ID } from '../data/masteries.js';
import { PERSONAL_GOALS } from '../data/rules.js';
import { statChips, statTip, renderSheet, renderInventory, renderMap, renderJournal, esc } from './panels.js';
import { pc, maxTough, maxHealth, maxAether, maxSanity, healWounds, gainSanity } from '../engine/character.js';
import { newDomain, runGame, moveTo, nodeState, MAP, nodeTitle } from '../engine/explore.js';
import { neighbors } from '../data/domain1.js';
import { CREATURES } from '../data/creatures.js';
import { CONDITIONS } from '../data/rules.js';
import { equipItem, unequip, dropItem, pickUp, dropSupply, eatRation, eatRaw } from '../engine/inventory.js';
import { drinkPotion, identifyPotion, useConsumable, fragmentDef } from '../engine/loot.js';

const $ = (s) => document.querySelector(s);
const screens = ['title-screen', 'create-screen', 'game-screen', 'end-screen'];
function show(id) { for (const s of screens) $(`#${s}`).hidden = s !== id; }

let pending = null;   // { resolve, opts }
let recap = [];       // log entries since the player's last decision, shown above the next prompt
let sideTab = 'map';
let mobileView = 'play';

// ------------------------------------------------------------------ IO implementation
const LOG_MAX = 300;
function appendLog(html, cls) {
  const el = document.createElement('div');
  el.className = `e ${cls}`;
  el.innerHTML = html;
  const log = $('#log'); log.prepend(el); // newest entries on top
  while (log.children.length > LOG_MAX) log.removeChild(log.lastChild);
  const wrap = $('#log-wrap'); wrap.scrollTop = 0;
}

const GROUP_LABELS = { move: 'Go', special: 'Here', room: 'Search', rest: 'Rest & recover', ability: 'Abilities', attack: 'Attack', item: 'Items', flee: '', end: '' };

const impl = {
  log(html, cls) {
    appendLog(html, cls);
    recap.push({ h: html, c: cls, s: snap() }); if (recap.length > 60) recap.shift();
    if (S.g) { S.g.log = S.g.log || []; S.g.log.push([html, cls]); if (S.g.log.length > LOG_MAX) S.g.log.splice(0, S.g.log.length - LOG_MAX); }
  },
  choose(prompt, options, opts = {}) {
    return new Promise((resolve) => {
      pending = { resolve, opts };
      renderPrompt(prompt, options, opts);
      refreshAll();
      beginReveal($('#prompt'));
    });
  },
  refresh() { refreshAll(); },
  scene(s) { if (S.g) S.g.scene = s; renderScene(); },
  toast(msg) { toast(msg); },
};
setIO(impl);

/** Chronological feed of what happened since the last decision. pending: rows start hidden for a paced reveal. */
const recapRows = () => recap.filter((e) => e.c !== 'title');
function recapHTML(title = 'What happened', pending = false) {
  const rows = recapRows();
  if (!rows.length) return '';
  return `<div class="recap" aria-label="${title}"><div class="recap-h">${title}${pending ? '<span class="recap-skip">tap to skip ▸</span>' : ''}</div>${rows.map((e) => `<div class="e ${e.c}${pending ? ' pending' : ''}">${e.h}</div>`).join('')}</div>`;
}
const pacing = () => settings.paceEvents && !reduceMotion();

function renderPrompt(prompt, options, opts) {
  const el = $('#prompt');
  stopReveal();
  let html = `${recapHTML('What happened', pacing())}<div class="q">${prompt}</div>`;
  const groups = []; const byGroup = {};
  for (const o of options) { const gk = o.group || '_'; if (!byGroup[gk]) { byGroup[gk] = []; groups.push(gk); } byGroup[gk].push(o); }
  const compact = options.length <= 3 && options.every((o) => (o.label || '').length < 40) && !opts.explore;
  html += `<div class="opts${compact ? ' row' : ''}">`;
  options.forEach((o, i) => { o._i = i; });
  for (const gk of groups) {
    if (gk !== '_' && GROUP_LABELS[gk] && groups.length > 1) html += `<div class="group-label">${GROUP_LABELS[gk]}</div>`;
    for (const o of byGroup[gk]) {
      html += `<button class="opt ${o.cls || ''}" data-i="${o._i}" ${o.disabled ? 'disabled' : ''}><span>${esc(o.label)}</span>${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ''}</button>`;
    }
  }
  html += '</div>';
  el.innerHTML = html;
  el.scrollTop = 0;
  el.querySelectorAll('button.opt').forEach((b) => {
    b.onclick = () => {
      if (!pending) return;
      const o = options[+b.dataset.i];
      const res = pending.resolve; pending = null;
      clearRecap();
      el.innerHTML = '<div class="q dim">…</div>';
      res(o.value);
    };
  });
  if (mobileView !== 'play' && mobileView !== 'log' && !opts.explore) setMobileView('play');
}

/** Run an out-of-band action (from inventory/map) when the engine is idle. */
function external(fn) {
  if (pending && pending.opts.allowExternal) {
    const res = pending.resolve; pending = null;
    clearRecap();
    $('#prompt').innerHTML = '<div class="q dim">…</div>';
    res({ external: true, run: fn });
    return true;
  }
  toast('Finish the current action first.');
  return false;
}
const canExternal = () => !!(pending && pending.opts.allowExternal);

// ------------------------------------------------------------------ rendering
function renderScene() {
  const g = S.g; if (!g) return;
  const el = $('#scene');
  if (g.combat) {
    const foes = g.combat.units.filter((u) => u.hp > 0);
    const allies = (pc().minions || []).filter((m) => m.hp > 0);
    const card = (u, ally) => {
      const conds = Object.entries(u.cond).filter(([k, v]) => v && CONDITIONS[k]).map(([k, v]) => `<span class="cond" title="${esc(CONDITIONS[k])}">${k}${typeof v === 'number' ? ` ${v}` : ''}</span>`).join('');
      return `<div class="foe${ally ? ' ally' : ''}" data-uid="${esc(String(u.uid))}"><div class="n">${esc(u.name)}</div><div class="hp"><i style="width:${Math.max(0, (u.hp / u.maxHp) * 100)}%"></i></div><div class="note"><span class="hpt">${u.hp}/${u.maxHp} HP</span>${ally ? '' : ` · Combat ${u.combat}`}</div><div class="conds">${conds}</div></div>`;
    };
    el.innerHTML = `<div class="kind">Combat — round ${g.combat.round}</div><h2>${esc(nodeTitle(g.domain.cur))}</h2>
      <div class="foes">${foes.map((u) => card(u, false)).join('')}${allies.map((u) => card(u, true)).join('')}</div>`;
    return;
  }
  const s = g.scene || {};
  const id = g.domain?.cur;
  const st = id ? nodeState(id) : {};
  el.innerHTML = `<div class="kind">${MAP.nodes[id]?.kind || ''}${st.trader ? ' · Trader' : ''}</div><h2>${esc(nodeTitle(id))}</h2><p class="desc">${esc(st.desc || s.text || '')}</p>`;
}

function renderTopbar() {
  const p = pc();
  hideTip();
  $('#tb-name').textContent = p.name;
  $('#tb-level').textContent = `Lv ${p.level}`;
  $('#tb-stats').innerHTML = statChips();
}

function panelHTML(tab) {
  switch (tab) {
    case 'map': return renderMap();
    case 'sheet': return renderSheet();
    case 'inv': return renderInventory(canExternal());
    case 'journal': return renderJournal();
    default: return '';
  }
}
function renderSide() {
  const host = window.innerWidth >= 1000 ? $('#side-panel') : $('#mobile-panel');
  const tab = window.innerWidth >= 1000 ? sideTab : mobileView;
  if (!host) return;
  if (window.innerWidth < 1000 && (mobileView === 'play' || mobileView === 'log')) return;
  if (window.innerWidth >= 1000 && sideTab === 'history') return;
  host.innerHTML = panelHTML(tab);
}

function refreshAll() {
  if (!S.g || !S.g.pc) return;
  renderTopbar();
  renderScene();
  renderSide();
}

// ------------------------------------------------------------------ panel interactions
function bindPanels() {
  const handler = (e) => {
    const node = e.target.closest('[data-node]');
    if (node) {
      const id = node.dataset.node; const D = S.g.domain;
      if (id !== D.cur && neighbors(MAP, D.cur).some((n) => n.id === id)) {
        if (S.g.combat) { toast('You are in combat.'); return; }
        if (external(() => moveTo(id)) && window.innerWidth < 1000) setMobileView('play');
      }
      return;
    }
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const p = pc(); const act = b.dataset.act; const id = b.dataset.id;
    const item = () => p.inv.find((x) => x.uid === id);
    const run = {
      equip: () => equipItem(item()),
      unequip: () => unequip(b.dataset.slot),
      drop: () => dropItem(item()),
      consume: () => useConsumable(item()),
      ration: () => eatRation(),
      raw: () => eatRaw(),
      dropsup: () => dropSupply(b.dataset.key, 1),
      drink: () => drinkPotion(p.potions.find((x) => x.uid === id)),
      idpotion: () => identifyPotion(p.potions.find((x) => x.uid === id)),
      droppotion: async () => { p.potions = p.potions.filter((x) => x.uid !== id); io.log('You discard the potion.', 'dim'); },
      pickup: () => pickUp(S.g.domain.nodes[S.g.domain.cur].floor.find((x) => x.uid === id)),
      fragment: () => useFragmentExplore(id),
      spendap: async () => { const { spendAbilityPoints } = await import('../engine/character.js'); await spendAbilityPoints(); },
    }[act];
    if (run) external(run);
  };
  $('#side-panel').addEventListener('click', handler);
  document.addEventListener('click', (e) => { if (e.target.closest('#mobile-panel')) handler(e); });
}

async function useFragmentExplore(id) {
  const p = pc(); const fr = p.fragments.find((x) => x.uid === id); const d = fragmentDef(fr);
  p.fragments = p.fragments.filter((x) => x.uid !== id);
  io.log(`You use the <b>${d.name}</b>.`, 'info');
  switch (d.id) {
    case 2: p.effects.push({ id: 'cloak', name: 'Tattered Cloak (invisible)', rooms: 5 }); io.log('You can ignore all Combat Encounters for 5 rooms.', 'good'); break;
    case 4: p.tempSanity += 10; io.log('+10 Temporary Sanity.', 'good'); break;
    case 8: { const { astralProjection } = await import('../engine/explore.js'); await astralProjection(3); break; }
    case 9: p.effects.push({ id: 'tatteredBandages', name: 'Tattered Bandages', limit: rnd(6) }); io.log('You wrap the tattered bandages around your wounds.', 'good'); break;
    case 10: p.flags.athleticsBoost = 50; io.log('Your next Athletics check gains +50.', 'good'); break;
    case 13: p.effects.push({ id: 'noSanityLoss', name: 'Emotionally detached', rooms: 4 }); break;
    case 19: { const v = r('2D10'); p.tempTough += v; io.log(`+${v} Temporary Toughness.`, 'good'); break; }
    default: io.log('Nothing happens outside of combat. The fragment crumbles.', 'dim');
  }
}

// ------------------------------------------------------------------ mobile views & tabs
function setMobileView(v) {
  mobileView = v;
  const gs = $('#game-screen');
  gs.classList.toggle('view-other', v !== 'play');
  document.querySelectorAll('#mobile-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  syncHistory();
  renderSide();
  if (v === 'log') { const w = $('#log-wrap'); w.scrollTop = 0; }
}
function bindTabs() {
  document.querySelectorAll('.side-tabs button').forEach((b) => {
    b.onclick = () => {
      sideTab = b.dataset.tab; document.querySelectorAll('.side-tabs button').forEach((x) => x.classList.toggle('active', x === b));
      syncHistory(); renderSide();
      if (sideTab === 'history') $('#log-wrap').scrollTop = 0;
    };
  });
  document.querySelectorAll('#mobile-tabs button').forEach((b) => { b.onclick = () => setMobileView(b.dataset.view); });
  // mobile panel host
  const host = document.createElement('div'); host.id = 'mobile-panel-host';
  host.innerHTML = '<div id="mobile-panel"></div>';
  $('#layout').appendChild(host);
  syncHistory();
  window.addEventListener('resize', () => { syncHistory(); renderSide(); });
}
/** The History (log) pane lives in the side column on desktop and in the mobile panel host on phones. */
function syncHistory() {
  const desk = window.innerWidth >= 1000;
  const w = $('#log-wrap');
  const target = desk ? $('#side-col') : $('#mobile-panel-host');
  if (target && w.parentElement !== target) target.appendChild(w);
  const show = desk ? sideTab === 'history' : mobileView === 'log';
  w.hidden = !show;
  $('#side-panel').hidden = desk && show;
  const mp = $('#mobile-panel'); if (mp) mp.hidden = !desk && show;
}

// ------------------------------------------------------------------ stat tooltips
// One floating tooltip (position: fixed, so the sideways-scrolling stat row cannot clip it).
// Mouse: hover. Touch: tap to toggle. Keyboard: focus.
let tipFor = null;
function showTip(chip) {
  const tip = $('#stat-tip'); const html = statTip(chip.dataset.k);
  if (!html) return;
  tipFor = chip; tip.innerHTML = html; tip.hidden = false;
  const r0 = chip.getBoundingClientRect(); const w = tip.offsetWidth;
  tip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r0.left + r0.width / 2 - w / 2))}px`;
  tip.style.top = `${r0.bottom + 8}px`;
}
function hideTip() { tipFor = null; const tip = $('#stat-tip'); if (tip) tip.hidden = true; }
function bindStatTips() {
  const tip = document.createElement('div'); tip.id = 'stat-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);
  const bar = $('#tb-stats');
  const chipOf = (e) => e.target.closest?.('.stat[data-k]');
  bar.addEventListener('pointerover', (e) => { const c = chipOf(e); if (c && e.pointerType === 'mouse') showTip(c); });
  bar.addEventListener('pointerout', (e) => { const c = chipOf(e); if (c && e.pointerType === 'mouse' && !c.contains(e.relatedTarget)) hideTip(); });
  bar.addEventListener('click', (e) => { const c = chipOf(e); if (!c || e.pointerType === 'mouse') return; if (tipFor === c) hideTip(); else showTip(c); });
  bar.addEventListener('focusin', (e) => { const c = chipOf(e); if (c) showTip(c); });
  bar.addEventListener('focusout', hideTip);
  bar.addEventListener('scroll', hideTip, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (tipFor && !chipOf(e)) hideTip(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('resize', hideTip);
}

// ------------------------------------------------------------------ toast & modal & menu
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}
function modal(html, actions = []) {
  $('#modal-body').innerHTML = html; $('#modal').hidden = false;
  const box = document.querySelector('.modal-actions');
  box.querySelectorAll('.extra').forEach((x) => x.remove());
  for (const a of actions) { const b = document.createElement('button'); b.className = `extra ${a.cls || 'secondary'}`; b.textContent = a.label; b.onclick = () => { a.run(); }; box.prepend(b); }
}
function closeModal() { $('#modal').hidden = true; }

function openMenu() {
  modal(`<h2>Menu</h2>
    <div class="settings">
      <label><input type="checkbox" id="set-auto" ${settings.autoDefense ? 'checked' : ''}> <span>Automatically choose the best defense (Dodge or Parry) when you have no reaction abilities.</span></label>
      <label><input type="checkbox" id="set-manual" ${settings.manualDamage ? 'checked' : ''}> <span>Pick the damage die from your Damage Pool yourself (otherwise the best die is chosen).</span></label>
      <label><input type="checkbox" id="set-strain" ${settings.askStrain ? 'checked' : ''}> <span>After each hit, ask whether to spend Exhaustion for extra damage (+1 damage per 2 Exhaustion).</span></label>
      <label><input type="checkbox" id="set-pace" ${settings.paceEvents ? 'checked' : ''}> <span>Reveal events one at a time, with health bars and damage numbers following along (tap to skip).</span></label>
    </div>
    <div class="menu-list">
      <button class="secondary" id="m-export">Export save file</button>
      <button class="secondary" id="m-abandon">Abandon this survivor</button>
    </div>
    <p class="note">Your progress is saved automatically on this device.</p>`);
  const bindSet = (id, key) => { $(id).onchange = (e) => { settings[key] = e.target.checked; saveSettings(settings); }; };
  bindSet('#set-auto', 'autoDefense'); bindSet('#set-manual', 'manualDamage'); bindSet('#set-strain', 'askStrain'); bindSet('#set-pace', 'paceEvents');
  $('#m-export').onclick = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kernethalas-${(pc().name || 'save').replace(/\W+/g, '_')}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#m-abandon').onclick = () => {
    if (confirm('Abandon this survivor? The save will be deleted.')) { clearSave(); location.reload(); }
  };
}

// ------------------------------------------------------------------ game start / loop
function startNewGame(p) {
  saveLastPC(p);
  S.g = { version: 1, pc: p, domain: null, combat: null, log: [], over: false, created: Date.now() };
  S.g.domain = newDomain();
  // Hard beginnings
  const dmg = rnd(6); p.tough = Math.max(0, p.tough - dmg);
  const san = rnd(4); p.sanity -= san;
  p.exh += 1;
  p.light = { src: 'Torch', rooms: 10, hand: true };
  p.equip.off = { uid: 'starttorch', kind: 'light', name: 'Torch' };
  const st = nodeState('I'); st.visited = true; st.desc = MAP.nodes.I.text;
  enterGame();
  io.log('<b>Before you even open your eyes, a wave of nauseating stench hits you.</b>', 'title');
  io.log('<i>Your whole body hurts, and you can feel an intense burning around your neck. With some hesitation, you manage to sit up from the pile of soft refuse you appear to be lying on top of. To your horror, you quickly discover that this is not garbage, but a pile of decaying human corpses. A flood of memories comes rushing back: you were executed.</i>', 'dim');
  io.log("<i>There's no doubt in your mind of where you are: Ker Nethalas, the Midnight Throne. Somehow, though, you've cheated death, and there must be a way out of here.</i>", 'dim');
  io.log(`Hard beginnings: you have suffered ${dmg} damage, lost ${san} Sanity and gained 1 Exhaustion.`, 'bad');
  io.log(`<b>${nodeTitle('I')}</b>`, 'title');
  io.log(MAP.nodes.I.text, 'dim');
  io.log("Remember: this first Domain's Overseer awaits somewhere within. Explore carefully.", 'info');
  io.scene({ id: 'I' });
  save();
  loop();
}

function enterGame() {
  show('game-screen');
  $('#log').innerHTML = '';
  clearRecap();
  for (const [h, c] of S.g.log || []) appendLog(h, c);
  setMobileView('play');
  refreshAll();
}

async function loop() {
  try {
    await runGame();
    if (S.g.over === 'victory') victory();
  } catch (e) {
    if (e && e.death) { await death(e.cause); return; }
    console.error(e);
    appendLog(`<b>Something went wrong:</b> ${esc(e?.message || e)}. Your progress up to the last safe point is saved; reload to continue.`, 'bad');
  }
}

async function death(cause) {
  const p = pc();
  if (recapRows().length && pacing()) await playRecap();
  appendLog(`<b>You have died</b> (${esc(cause)}).`, 'bad');
  const finalMoments = recapHTML('Your final moments');
  S.g.dead = cause;
  save();
  const canRevive = cause !== 'the Rot' && cause !== 'madness';
  const end = $('#end-screen'); end.className = 'screen';
  end.innerHTML = `<div class="end-inner"><h1>Your journey ends</h1>
    <p><i>${esc(p.name)} has fallen to ${esc(cause)}, deep within the Midnight Throne. Or at least, as dead as anything else in the necropolis...</i></p>
    <p class="note">Level ${p.level} · ${p.xp} XP · ${p.stats.kills || 0} foes slain · reached Domain ${S.g.domain.num || 1}</p>
    ${finalMoments}
    ${canRevive ? `<div class="card" style="text-align:left"><h3>Optional rule: Overcoming Death</h3>
      <p>Immediately recover 2D6 Sanity, 2D6 Health, and your full Toughness. If you died at the hands of your enemies, they've moved on and lost interest, taking you for dead. You lose 2 Mastery Abilities of your choosing, but you cannot end up with less than 1 Ability per Mastery this way.</p>
      <button class="primary" id="revive">Rise again</button></div>` : ''}
    <div class="title-buttons" style="margin-top:16px">${retryButton()}<button class="secondary" id="newrun">Create a new survivor</button></div></div>`;
  show('end-screen');
  $('#newrun').onclick = () => { clearSave(); location.reload(); };
  bindRetry();
  if (canRevive) $('#revive').onclick = () => {
    const G = S.g;
    if (G.combat) { const node = nodeState(G.combat.nodeId); node.cleared = true; node.enemies = null; G.combat = null; }
    p.cond = {}; p.health = Math.min(maxHealth(), Math.max(1, r('2D6'))); p.tough = maxTough();
    p.sanity = Math.max(1, Math.min(p.sanity + r('2D6'), 99));
    if (p.exh >= 21) p.exh = 20;
    G.pending = null; delete G.dead;
    appendLog('<b>You rise again.</b> The creatures have moved on, taking you for dead.', 'good');
    save(); enterGame(); loop();
  };
}

function victory() {
  const p = pc();
  const end = $('#end-screen'); end.className = 'screen victory';
  end.innerHTML = `<div class="end-inner"><h1>The First Domain</h1>
    <p><i>You lower yourself over the edge and drop into the darkness below. There is no way back up. ${esc(p.name)} descends deeper into Ker Nethalas...</i></p>
    <p class="note">Level ${p.level} · ${p.xp} XP · ${p.stats.kills || 0} foes slain · ${S.g.domain.overseerDefeated ? 'Overseer slain' : 'Overseer left alive'} · ${S.g.domain.moves} rooms traversed</p>
    <div class="card" style="text-align:left"><p>This first version covers the First Domain of the necropolis. Deeper Domains, generated room by room with the full bestiary, will follow in a future update. Your survivor has been saved.</p></div>
    <div class="title-buttons" style="margin-top:16px">${retryButton()}<button class="secondary" id="newrun">Create a new survivor</button><button class="secondary" id="backrun">Back to the title screen</button></div></div>`;
  show('end-screen');
  $('#newrun').onclick = () => { clearSave(); location.reload(); };
  bindRetry();
  $('#backrun').onclick = () => location.reload();
}

// ------------------------------------------------------------------ recap pacing & combat feedback
// Each log entry carries a snapshot of HP/stat values taken when it was logged. The reveal steps through
// the entries one at a time, moving health bars and stat chips to each snapshot and floating the change.
let recapBase = null;   // snapshot when the current recap started (just after the player's last decision)
let reveal = null;      // in-progress reveal: { timer, finish, onDone }
let settleTimer = null;
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function snap() {
  try {
    const g = S.g; if (!g?.pc) return null;
    const p = g.pc; const units = [];
    if (g.combat) {
      for (const u of g.combat.units) units.push({ uid: String(u.uid), name: u.name, hp: u.hp, maxHp: u.maxHp, ally: u.side === 'ally' });
      for (const m of p.minions || []) if (!units.some((x) => x.uid === String(m.uid))) units.push({ uid: String(m.uid), name: m.name, hp: m.hp, maxHp: m.maxHp, ally: true });
    }
    const st = (v, t, max) => ({ n: v + (t || 0), txt: `${v}${t ? `+${t}` : ''}/${max}` });
    return { units, stats: { HP: st(p.health, 0, maxHealth()), TGH: st(p.tough, p.tempTough, maxTough()), AE: st(p.aether, p.tempAether, maxAether()), SAN: st(p.sanity, p.tempSanity, maxSanity()) } };
  } catch { return null; }
}
function clearRecap() { recap = []; recapBase = snap(); }
function stopReveal() {
  if (reveal) { clearTimeout(reveal.timer); reveal = null; }
  clearTimeout(settleTimer);
  const el = $('#prompt'); el.classList.remove('revealing'); el.onclick = null;
}

function foeCard(box, u) {
  let card = box.querySelector(`.foe[data-uid="${CSS.escape(u.uid)}"]`);
  if (!card) {
    card = document.createElement('div');
    card.className = `foe${u.ally ? ' ally' : ''}`; card.dataset.uid = u.uid;
    card.innerHTML = `<div class="n">${esc(u.name)}</div><div class="hp"><i></i></div><div class="note"><span class="hpt"></span></div><div class="conds"></div>`;
    box.appendChild(card);
  }
  return card;
}
function setCard(card, u) {
  const bar = card.querySelector('.hp > i'); if (bar) bar.style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
  const t = card.querySelector('.hpt'); if (t) t.textContent = `${Math.max(0, u.hp)}/${u.maxHp} HP`;
  card.classList.toggle('fallen', u.hp <= 0);
}
function floatNum(el, delta) {
  const f = document.createElement('span');
  f.className = `fx-float ${delta < 0 ? 'down' : 'up'}`; f.textContent = delta > 0 ? `+${delta}` : `${delta}`;
  f.addEventListener('animationend', () => f.remove());
  el.appendChild(f);
  setTimeout(() => f.remove(), 1500);
}
function flash(el, delta) {
  el.classList.remove('flash-down', 'flash-up'); void el.offsetWidth;
  el.classList.add(delta < 0 ? 'flash-down' : 'flash-up');
}
/** Show snapshot `cur` on the foe cards and stat chips; with anim, float and flash what changed since `prev`. */
function applySnap(prev, cur, anim) {
  if (!cur) return;
  let box = $('#scene .foes');
  if (!box && cur.units.length) { box = document.createElement('div'); box.className = 'foes'; $('#scene').appendChild(box); }
  for (const u of cur.units) {
    const pu = prev?.units.find((x) => x.uid === u.uid);
    if (!pu && u.hp <= 0) continue;
    const card = foeCard(box, u); setCard(card, u);
    if (anim && pu && pu.hp !== u.hp) { const d = Math.max(0, u.hp) - Math.max(0, pu.hp); if (d) { floatNum(card, d); flash(card, d); } }
  }
  for (const [k, v] of Object.entries(cur.stats)) {
    const chip = document.querySelector(`#tb-stats .stat[data-k="${k}"]`); if (!chip) continue;
    const b = chip.querySelector('b'); if (b) b.textContent = v.txt;
    const pv = prev?.stats[k];
    if (anim && pv && pv.n !== v.n) { floatNum(chip, v.n - pv.n); flash(chip, v.n - pv.n); }
  }
}
/** After a reveal, re-render from the real state (drops fallen foes, restores combat-over scenes). */
function settle() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { if (!reveal && S.g?.pc) { renderTopbar(); renderScene(); } }, 1000);
}
/** Step through the recap rows in `host`. Paced: one row at a time (click to skip); otherwise all at once. */
function beginReveal(host, onDone) {
  const rows = [...host.querySelectorAll('.recap .e')];
  const entries = recapRows();
  if (!rows.length || rows.length !== entries.length) { onDone?.(); return; }
  const motion = !reduceMotion();
  // Rewind the visuals to where this recap started.
  if (recapBase) applySnap(null, { ...recapBase, units: recapBase.units.filter((u) => u.hp > 0) }, false);
  if (!pacing()) { applySnap(recapBase, entries[entries.length - 1].s, motion); settle(); onDone?.(); return; }
  host.classList.add('revealing');
  const list = host.querySelector('.recap');
  const delay = Math.min(320, Math.max(70, 3500 / rows.length));
  let i = 0;
  const finish = () => {
    if (!reveal) return;
    clearTimeout(reveal.timer);
    if (i < rows.length) { rows.forEach((r0) => r0.classList.remove('pending')); applySnap(entries[i - 1]?.s || recapBase, entries[entries.length - 1].s, motion); }
    host.classList.remove('revealing'); host.onclick = null;
    const cb = reveal.onDone; reveal = null;
    settle(); cb?.();
  };
  const step = () => {
    rows[i].classList.remove('pending'); list.scrollTop = list.scrollHeight;
    applySnap(i ? entries[i - 1].s : recapBase, entries[i].s, true);
    i += 1;
    if (i >= rows.length) finish(); else reveal.timer = setTimeout(step, delay);
  };
  reveal = { timer: null, finish, onDone };
  host.onclick = () => reveal?.finish();
  step();
}
/** Play the pending recap in the prompt area with no options (used before the death screen). */
function playRecap() {
  return new Promise((res) => {
    stopReveal();
    const el = $('#prompt');
    el.innerHTML = `${recapHTML('What happened', true)}<div class="q dim">…</div>`;
    beginReveal(el, () => setTimeout(res, 1200));
  });
}

// ------------------------------------------------------------------ try again
const retryTitle = (p) => `Start a new run as ${p.name}, with the same attributes, skills, masteries and goals.`;
/** Start a fresh run with the last survivor's creation snapshot. */
function tryAgain() {
  const p = loadLastPC(); if (!p) return;
  startNewGame(p);
  io.log(`<b>Trying again</b> as ${esc(p.name)}, with the same choices as before.`, 'info');
}
/** End-screen "Try Again" button markup (empty if no snapshot exists). */
function retryButton() {
  const p = loadLastPC();
  return p ? `<button class="primary" id="retryrun" title="${esc(retryTitle(p))}">Try again as ${esc(p.name)}</button>` : '';
}
function bindRetry() { const b = $('#retryrun'); if (b) b.onclick = tryAgain; }

// ------------------------------------------------------------------ boot
function boot() {
  bindTabs(); bindPanels(); bindStatTips();
  $('#modal-close').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('#btn-menu').onclick = openMenu;
  const cont = $('#btn-continue');
  if (hasSave()) {
    cont.hidden = false;
    cont.onclick = () => {
      if (!loadGame()) return;
      if (S.g.dead) { enterGame(); death(S.g.dead); return; }
      enterGame(); loop();
    };
  }
  $('#btn-new').onclick = () => {
    if (hasSave() && !confirm('Start a new survivor? Your current save will be replaced.')) return;
    show('create-screen');
    runCreation($('#create-screen'), (p) => startNewGame(p), () => show('title-screen'));
  };
  $('#btn-random').onclick = () => {
    if (hasSave() && !confirm('Start a new random survivor? Your current save will be replaced.')) return;
    const p = randomSurvivor();
    startNewGame(p);
    const ms = p.masteries.map((m) => `${MASTERY_BY_ID[m.id].name} (trained at ${m.training})`).join(' & ');
    io.log(`<b>Random survivor:</b> ${esc(p.name)}, accused of ${esc(p.crime)}. ${esc(p.appearance)}`, 'info');
    io.log(`Masteries: ${ms}${p.dedication ? `; Dedication: ${p.dedication}` : ''}. Personal Goals: ${p.goals.map((gl) => PERSONAL_GOALS.find((x) => x.id === gl.id).name).join(', ')}. See the Survivor tab for full details.`, 'info');
  };
  const last = loadLastPC();
  if (last) {
    const retry = $('#btn-retry');
    retry.hidden = false;
    retry.title = retryTitle(last);
    retry.onclick = () => {
      if (hasSave() && !confirm(`Try again as ${last.name}? Your current save will be replaced.`)) return;
      tryAgain();
    };
  }
  $('#btn-import').onclick = () => $('#import-file').click();
  $('#import-file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importSave(await f.text()); enterGame(); loop(); } catch (err) { alert(`Could not import: ${err.message}`); }
  };
  show('title-screen');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
