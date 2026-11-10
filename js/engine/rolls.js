// Core resolution mechanic (Chapter III).
import { d100, d100Value } from '../dice.js';

/** Evaluate a D100 value against a target score. */
export function evaluate(value, tens, ones, target, opts = {}) {
  const doubles = tens === ones;
  const success = value <= target;
  let crit = doubles && success;
  if (opts.crit66 && value === 66) crit = true;
  const fumble = doubles && !success;
  return { value, tens, ones, target, success: success || crit, crit, fumble, doubles };
}

// Rank for picking the best/worst reading of a roll (used for Advantage/Disadvantage and opposed checks)
export function rank(res) {
  const cat = res.crit ? 3 : res.success ? 2 : res.fumble ? 0 : 1;
  return cat * 1000 + res.value;
}

/**
 * Roll a check. adv/dis: Advantage lets you swap the tens and ones dice if it favors you,
 * Disadvantage forces the swap if it hampers you.
 */
export function rollCheck(target, { adv = false, dis = false, crit66 = false, forced = null } = {}) {
  const raw = forced || d100();
  const a = evaluate(raw.value, raw.tens, raw.ones, target, { crit66 });
  if (adv === dis) return { ...a, raw };
  const fv = d100Value(raw.ones, raw.tens);
  const b = evaluate(fv, raw.ones, raw.tens, target, { crit66 });
  const best = rank(b) > rank(a) ? b : a;
  const worst = rank(b) > rank(a) ? a : b;
  const pickd = adv ? best : worst;
  return { ...pickd, raw, flipped: pickd !== a, adv, dis };
}

/**
 * Compare two results of an opposed check. Returns 1 if A wins, -1 if B wins, 0 for a tie that
 * must be re-rolled. Higher Skill breaks ties.
 */
export function compareOpposed(a, b) {
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra > rb ? 1 : -1;
  if (a.target !== b.target) return a.target > b.target ? 1 : -1;
  return 0;
}

export function describeRoll(res) {
  const flip = res.flipped ? ' (swapped)' : '';
  const tag = res.crit ? ' <b class="crit">CRITICAL</b>' : res.fumble ? ' <b class="fumble">FUMBLE</b>' : res.success ? ' success' : ' failure';
  return `rolled <b>${String(res.value).padStart(2, '0')}</b>${flip} vs ${res.target}${tag}`;
}
