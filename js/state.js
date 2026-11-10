// Global game state + persistence.
const KEY = 'kernethalas.save.v1';
const SETTINGS_KEY = 'kernethalas.settings.v1';

export const S = { g: null };
let uidCounter = 1;
export const uid = () => `u${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export const DEFAULT_SETTINGS = {
  askStrain: false,       // prompt to spend Exhaustion for +damage after a hit
  manualDamage: false,    // pick the damage die from the pool yourself
  autoDefense: true,      // automatically choose the best defense (Dodge/Parry)
  fastDice: false,        // skip dice animation
};

export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) }; } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ } }
export const settings = loadSettings();

export function save() {
  if (!S.g) return;
  try { localStorage.setItem(KEY, JSON.stringify(S.g)); } catch { /* storage unavailable */ }
}
export function hasSave() {
  try { const s = localStorage.getItem(KEY); return !!s && !JSON.parse(s).over; } catch { return false; }
}
export function loadGame() {
  try { const s = localStorage.getItem(KEY); if (!s) return null; S.g = JSON.parse(s); return S.g; } catch { return null; }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
export function exportSave() { return JSON.stringify(S.g); }
export function importSave(txt) { const g = JSON.parse(txt); if (!g || !g.pc) throw new Error('Invalid save'); S.g = g; save(); return g; }

export function newPC() {
  return {
    name: '', appearance: '', crime: null, level: 1, xp: 0, abilityPoints: 0,
    base: { health: 0, tough: 0, aether: 0, sanity: 0 },
    health: 0, tough: 0, aether: 0, sanity: 0, exh: 0, tempTough: 0, tempAether: 0, tempSanity: 0,
    skills: {}, res: { Endurance: 20, Resolve: 20, Spellward: 20 },
    masteries: [], sustained: [], dedication: null,
    improve: [], cond: {},
    equip: { main: null, off: null, belt: null, head: null, torso: null, arms: null, legs: null, gloves: null, boots: null, amulet: null, ring1: null, ring2: null },
    inv: [], sup: { coins: 0, torch: 0, candle: 0, flare: 0, lampOil: 0, ration: 0, bandage: 0, lockpick: 0, cooking: 0, crafting: 0, crystal: 0, ritual: 0 },
    potions: [], fragments: [], beltSlots: [],
    light: null,
    goals: [], goalsDone: [], perks: [], rewards: [], stats: {}, effects: [], madness: [], rot: 0, rotInfected: false,
    flags: {}, once: {}, lore: [], journal: [],
  };
}

/** Increment a (possibly dotted) stat counter, e.g. bump('dmg.Fire', 4). */
export function bump(key, n = 1) {
  const st = S.g.pc.stats;
  st[key] = (st[key] || 0) + n;
}
