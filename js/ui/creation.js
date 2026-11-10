// Character creation wizard (Chapter II).
import { rnd, r } from '../dice.js';
import { SKILLS, SKILL_BASE, WEAPON_SKILLS, RESISTANCES, CRIMES, SKILL_TEXT, RES_TEXT, PERSONAL_GOALS } from '../data/rules.js';
import { MASTERIES, MASTERY_BY_ID } from '../data/masteries.js';
import { WEAPONS } from '../data/items.js';
import { newPC } from '../state.js';
import { esc } from './panels.js';

const STEPS = ['Identity', 'Attributes', 'Skills', 'Masteries', 'Goals', 'Begin'];
const ALLOT = [{ v: 60, n: 1, weapon: true }, { v: 40, n: 1, weapon: true }, { v: 30, n: 3 }, { v: 20, n: 2 }, { v: 10, n: 3 }];

export function runCreation(root, onDone, onCancel) {
  const st = {
    step: 0, name: '', appearance: '', crime: null,
    attrs: null, allot: {}, res40: null, masteries: [], training: {}, dedication: null, goals: ['overthrown'],
  };
  const render = () => {
    root.innerHTML = `
      <div class="create-head"><h2>Creating Your Survivor</h2>
        <div class="steps">${STEPS.map((s, i) => `<span class="${i === st.step ? 'on' : ''}">${i + 1}. ${s}</span>`).join(' · ')}</div></div>
      <div id="cbody">${[identity, attributes, skills, masteries, goals, summary][st.step]()}</div>
      <div class="create-nav">
        <button class="secondary" id="cback">${st.step === 0 ? 'Cancel' : 'Back'}</button>
        <button class="primary" id="cnext" ${valid() ? '' : 'disabled'}>${st.step === STEPS.length - 1 ? 'Enter the necropolis' : 'Next'}</button>
      </div>`;
    bind();
    window.scrollTo(0, 0);
  };
  const valid = () => {
    switch (st.step) {
      case 0: return st.name.trim().length > 0 && st.crime != null;
      case 1: return !!st.attrs;
      case 2: return ALLOT.every((a) => Object.values(st.allot).filter((x) => x === a.v).length === a.n) && !!st.res40;
      case 3: return st.masteries.length === 2 && (!st.masteries.includes('weaponmaster') || !!st.dedication);
      case 4: return st.goals.length === 2;
      default: return true;
    }
  };
  const refreshNext = () => { const b = root.querySelector('#cnext'); if (b) b.disabled = !valid(); };

  function identity() {
    return `<div class="grid2"><div class="card">
      <p>You are alive. Barely, but alive. You've been punished for a crime that you may or may not have committed, but Anera smiles upon you, and against all odds you're still among the living.</p>
      <div class="field"><label for="cname">Name</label><input id="cname" maxlength="40" value="${esc(st.name)}" placeholder="Your survivor's name" autocomplete="off"></div>
      <div class="field"><label for="capp">Gender, age and appearance (optional)</label><textarea id="capp" rows="3" maxlength="300">${esc(st.appearance)}</textarea></div>
    </div><div class="card"><h3>Which crime were you accused of?</h3>
      <button class="secondary" id="rollcrime">Roll D20</button>
      <div class="field" style="margin-top:8px"><select id="ccrime"><option value="">— choose —</option>${CRIMES.map((c, i) => `<option value="${i}" ${st.crime === i ? 'selected' : ''}>${i + 1}. ${c[0]}</option>`).join('')}</select></div>
      ${st.crime != null ? `<p><b>${CRIMES[st.crime][0]}:</b> ${CRIMES[st.crime][1]}</p>` : ''}
    </div></div>`;
  }
  function attributes() {
    const a = st.attrs;
    return `<div class="card"><h3>Character Attributes</h3>
      <p>Your Attributes determine the most elemental aspects of your body and soul. Roll them once: Health D6+10, Toughness 3D6+20, Aether D6+8, Sanity D6+10. You start with 0 Exhaustion.</p>
      ${a ? `<div class="attr-grid">
        <div class="attr"><div class="k">Health</div><div class="big-roll">${a.health}</div><div class="note">Lost Health is slow to recover. At 0 you die.</div></div>
        <div class="attr"><div class="k">Toughness</div><div class="big-roll">${a.tough}</div><div class="note">Minor damage; lost first.</div></div>
        <div class="attr"><div class="k">Aether</div><div class="big-roll">${a.aether}</div><div class="note">Fuels Abilities; refills in each new room.</div></div>
        <div class="attr"><div class="k">Sanity</div><div class="big-roll">${a.sanity}</div><div class="note">At 0, madness takes you.</div></div>
      </div>` : '<button class="primary" id="rollattr">Roll Attributes</button>'}
    </div>`;
  }
  function skills() {
    const counts = (v) => Object.values(st.allot).filter((x) => x === v).length;
    const rows = SKILLS.map((s) => {
      const base = SKILL_BASE[s] || 0; const cur = st.allot[s] || 0;
      const isW = WEAPON_SKILLS.includes(s);
      const opts = ['<option value="0">—</option>'].concat(ALLOT.filter((a) => !a.weapon || isW).map((a) => {
        const full = counts(a.v) >= a.n && cur !== a.v;
        return `<option value="${a.v}" ${cur === a.v ? 'selected' : ''} ${full ? 'disabled' : ''}>+${a.v}</option>`;
      })).join('');
      return `<tr title="${esc(SKILL_TEXT[s])}"><td>${s}${isW ? ' <span class="tag">weapon</span>' : ''}</td><td class="num">${base}</td><td><select data-skill="${s}">${opts}</select></td><td class="num"><b>${base + cur}</b></td></tr>`;
    }).join('');
    const remaining = ALLOT.map((a) => `+${a.v}×${a.n - counts(a.v)}`).join(' ');
    return `<div class="grid2"><div class="card"><h3>Skills</h3>
      <p class="note">Assign: +60 to one weapon Skill, +40 to a second weapon Skill, +30 to three Skills, +20 to two, +10 to three. No Skill can receive two allotments. Remaining: <b>${remaining}</b></p>
      <p class="note">There are no ranged weapons down here: only a vicious melee fighter has any real chance at survival.</p>
      <table class="skill-table"><thead><tr><th>Skill</th><th class="num">Base</th><th>Allotment</th><th class="num">Total</th></tr></thead><tbody>${rows}</tbody></table>
    </div><div class="card"><h3>Resistances</h3>
      <p class="note">Start with 40 in one Resistance and 20 in the other two. Resistances are passive: they work even when you cannot act.</p>
      ${RESISTANCES.map((x) => `<div class="card pickable ${st.res40 === x ? 'selected' : ''}" data-res="${x}"><b>${x}</b> — ${st.res40 === x ? 40 : 20}<div class="note">${RES_TEXT[x]}</div></div>`).join('')}
    </div></div>`;
  }
  function masteries() {
    const cards = MASTERIES.map((m) => {
      const sel = st.masteries.includes(m.id);
      const t1 = m.tiers[0];
      return `<div class="card pickable mastery-card ${sel ? 'selected' : ''}" data-m="${m.id}">
        <h3>${m.name}</h3><div class="note"><i>${m.desc}</i></div>
        <div class="feat"><b>${m.feature[0]}.</b> ${m.feature[1]}</div>
        <div class="tier"><b>Tier 1 — ${t1[0]}</b> <span class="dim">(${t1[1]})</span><br>${t1[2]}</div>
        <div class="locked">Later tiers: ${m.tiers.slice(1).map((t) => t[0]).join(', ')}</div>
        ${sel ? `<div class="note" style="margin-top:6px">Trained at: <b>${esc(st.training[m.id] || '')}</b></div>` : ''}
      </div>`;
    }).join('');
    const ded = st.masteries.includes('weaponmaster') ? `<div class="card"><h3>Weapon Master: Dedication</h3><p class="note">Choose a weapon: your weapon Skill is increased by 10 and you add D4 damage to your Damage Pool when wielding it. This choice can only be made once.</p>
      <select id="cded"><option value="">— choose a weapon —</option>${Object.keys(WEAPONS).map((w) => `<option ${st.dedication === w ? 'selected' : ''}>${w}</option>`).join('')}</select></div>` : '';
    return `<div class="card"><h3>Masteries</h3><p class="note">You start with 2 Ability Points, spent on two different Masteries. Each unlocks its Tier 1 Ability and its Mastery Feature. Selected: ${st.masteries.length}/2</p></div>${ded}<div class="grid2">${cards}</div>`;
  }
  function goals() {
    return `<div class="card"><h3>Personal Goals</h3><p class="note">Choose two Personal Goals. Once chosen they cannot be changed until completed. We strongly recommend "Overseer Overthrown" as your first one. Selected: ${st.goals.length}/2</p></div>
      <div class="grid3">${PERSONAL_GOALS.map((gl) => `<div class="card pickable ${st.goals.includes(gl.id) ? 'selected' : ''}" data-goal="${gl.id}"><b>${gl.name}</b><div class="note">${gl.obj}</div><div class="note">Reward: ${gl.reward}</div></div>`).join('')}</div>`;
  }
  function summary() {
    const ms = st.masteries.map((id) => MASTERY_BY_ID[id].name).join(' & ');
    return `<div class="card"><h3>${esc(st.name)}</h3>
      <p>Accused of <b>${CRIMES[st.crime][0]}</b>. ${esc(st.appearance)}</p>
      <p>Health ${st.attrs.health} · Toughness ${st.attrs.tough} · Aether ${st.attrs.aether} · Sanity ${st.attrs.sanity}</p>
      <p>Masteries: <b>${ms}</b>${st.dedication ? ` (Dedication: ${st.dedication})` : ''}</p>
      <p>Personal Goals: ${st.goals.map((id) => PERSONAL_GOALS.find((x) => x.id === id).name).join(', ')}</p>
      <hr style="border-color:var(--line)">
      <p><i>Before you even open your eyes, a wave of nauseating stench hits you... A flood of memories comes rushing back: you were executed.</i></p>
      <p class="note"><b>Hard beginnings:</b> you start the game having suffered D6 damage, D4 Sanity loss and +1 Exhaustion, with nothing but rags. This first Domain is already mapped; explore every nook and cranny before facing its Overseer.</p>
    </div>`;
  }

  function bind() {
    root.querySelector('#cback').onclick = () => { if (st.step === 0) onCancel(); else { st.step -= 1; render(); } };
    root.querySelector('#cnext').onclick = () => { if (!valid()) return; if (st.step === STEPS.length - 1) finish(); else { st.step += 1; render(); } };
    const q = (s) => root.querySelector(s);
    if (st.step === 0) {
      q('#cname').oninput = (e) => { st.name = e.target.value; refreshNext(); };
      q('#capp').oninput = (e) => { st.appearance = e.target.value; };
      q('#ccrime').onchange = (e) => { st.crime = e.target.value === '' ? null : +e.target.value; render(); };
      q('#rollcrime').onclick = () => { st.crime = rnd(20) - 1; render(); };
    }
    if (st.step === 1 && q('#rollattr')) q('#rollattr').onclick = () => { st.attrs = { health: r('D6+10'), tough: r('3D6+20'), aether: r('D6+8'), sanity: r('D6+10') }; render(); };
    if (st.step === 2) {
      root.querySelectorAll('select[data-skill]').forEach((sel) => { sel.onchange = (e) => { const v = +e.target.value; if (v) st.allot[sel.dataset.skill] = v; else delete st.allot[sel.dataset.skill]; render(); }; });
      root.querySelectorAll('[data-res]').forEach((el) => { el.onclick = () => { st.res40 = el.dataset.res; render(); }; });
    }
    if (st.step === 3) {
      root.querySelectorAll('[data-m]').forEach((el) => {
        el.onclick = () => {
          const id = el.dataset.m;
          if (st.masteries.includes(id)) { st.masteries = st.masteries.filter((x) => x !== id); delete st.training[id]; if (id === 'weaponmaster') st.dedication = null; }
          else if (st.masteries.length < 2) { st.masteries.push(id); st.training[id] = MASTERY_BY_ID[id].training[rnd(6) - 1]; }
          render();
        };
      });
      if (q('#cded')) q('#cded').onchange = (e) => { st.dedication = e.target.value || null; refreshNext(); };
    }
    if (st.step === 4) root.querySelectorAll('[data-goal]').forEach((el) => { el.onclick = () => { const id = el.dataset.goal; if (st.goals.includes(id)) st.goals = st.goals.filter((x) => x !== id); else if (st.goals.length < 2) st.goals.push(id); render(); }; });
  }

  function finish() {
    const p = newPC();
    p.name = st.name.trim(); p.appearance = st.appearance.trim(); p.crime = CRIMES[st.crime][0];
    p.base = { ...st.attrs };
    p.health = st.attrs.health; p.tough = st.attrs.tough; p.aether = st.attrs.aether; p.sanity = st.attrs.sanity;
    for (const s of SKILLS) p.skills[s] = (SKILL_BASE[s] || 0) + (st.allot[s] || 0);
    for (const k of RESISTANCES) p.res[k] = k === st.res40 ? 40 : 20;
    p.masteries = st.masteries.map((id) => ({ id, tier: 1, training: st.training[id] }));
    p.dedication = st.dedication;
    p.goals = st.goals.map((id) => ({ id }));
    if (st.masteries.includes('umbra')) p.sanity += 5;
    onDone(p);
  }
  render();
}

// ------------------------------------------------------------------ random survivor
const FIRST = ['Mara', 'Edric', 'Sela', 'Corvin', 'Ilse', 'Tobias', 'Wren', 'Aldous', 'Brielle', 'Garrick', 'Hesper', 'Jorund', 'Liesl', 'Osric', 'Rowena', 'Silas', 'Thea', 'Ulric', 'Vesna', 'Anselm', 'Isolde', 'Bram', 'Odile', 'Fenwick'];
const LAST = ['Voss', 'Ashgrave', 'Morrow', 'Blackwell', 'Thorne', 'Halloran', 'Crane', 'Mirefield', 'Sallow', 'Grimm', 'Locke', 'Varn', 'Dunmore', 'Hask', 'Rook', 'Elsing'];
const APPEAR = ['Gaunt and hollow-eyed, with rope burns still raw around the neck.', 'Broad-shouldered and scarred, missing two fingers on the left hand.', 'Wiry and quick, hair matted with grave dirt.', 'Pale and soft-spoken, with ink-stained fingertips.', 'Weathered and grey at the temples, eyes sharp as flint.', 'Young and restless, a thief\'s brand on one wrist.'];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1) - 1; [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Build a complete survivor with every creation choice made at random. */
export function randomSurvivor() {
  const p = newPC();
  p.name = `${FIRST[rnd(FIRST.length) - 1]} ${LAST[rnd(LAST.length) - 1]}`;
  p.appearance = APPEAR[rnd(APPEAR.length) - 1];
  p.crime = CRIMES[rnd(20) - 1][0];
  const attrs = { health: r('D6+10'), tough: r('3D6+20'), aether: r('D6+8'), sanity: r('D6+10') };
  p.base = { ...attrs };
  p.health = attrs.health; p.tough = attrs.tough; p.aether = attrs.aether; p.sanity = attrs.sanity;
  // Skill allotments: +60 and +40 to two weapon Skills, then 30/30/30/20/20/10/10/10 to other Skills
  const allot = {};
  const ws = shuffle(WEAPON_SKILLS);
  allot[ws[0]] = 60; allot[ws[1]] = 40;
  const rest = shuffle(SKILLS.filter((s) => !(s in allot)));
  [30, 30, 30, 20, 20, 10, 10, 10].forEach((v, i) => { allot[rest[i]] = v; });
  for (const s of SKILLS) p.skills[s] = (SKILL_BASE[s] || 0) + (allot[s] || 0);
  const res40 = RESISTANCES[rnd(3) - 1];
  for (const k of RESISTANCES) p.res[k] = k === res40 ? 40 : 20;
  // Two different Masteries, each with a rolled training location
  const ms = shuffle(MASTERIES).slice(0, 2);
  p.masteries = ms.map((m) => ({ id: m.id, tier: 1, training: m.training[rnd(6) - 1] }));
  if (ms.some((m) => m.id === 'weaponmaster')) { const names = Object.keys(WEAPONS); p.dedication = names[rnd(names.length) - 1]; }
  if (ms.some((m) => m.id === 'umbra')) p.sanity += 5;
  p.goals = shuffle(PERSONAL_GOALS).slice(0, 2).map((gl) => ({ id: gl.id }));
  return p;
}
