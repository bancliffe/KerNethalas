// Dice utilities for Ker Nethalas.
// D100 is rolled as two D10s (tens + ones). 00 = 100. Doubles = tens digit equals ones digit.

export const rnd = (n) => 1 + Math.floor(Math.random() * n);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Parse an expression such as "2D6+1", "D4", "D6+D4", "3D4+4", "2D100". */
export function parseExpr(expr) {
  const parts = String(expr).replace(/\s+/g, '').toUpperCase().match(/[+-]?[^+-]+/g) || [];
  const dice = [];
  let mod = 0;
  for (const p of parts) {
    const sign = p.startsWith('-') ? -1 : 1;
    const body = p.replace(/^[+-]/, '');
    const m = body.match(/^(\d*)D(\d+)$/);
    if (m) {
      const n = m[1] ? parseInt(m[1], 10) : 1;
      for (let i = 0; i < n; i++) dice.push({ sides: parseInt(m[2], 10), sign });
    } else if (/^\d+$/.test(body)) {
      mod += sign * parseInt(body, 10);
    }
  }
  return { dice, mod };
}

/** Roll an expression and sum it (standard notation, NOT a damage pool). */
export function roll(expr) {
  const { dice, mod } = parseExpr(expr);
  const rolls = dice.map((d) => ({ sides: d.sides, v: rnd(d.sides) * d.sign }));
  const total = rolls.reduce((a, r) => a + r.v, 0) + mod;
  return { total, rolls, mod, expr };
}
export const r = (expr) => roll(expr).total;

/** Max value an expression can produce. */
export function maxOf(expr) {
  const { dice, mod } = parseExpr(expr);
  return dice.reduce((a, d) => a + d.sides * d.sign, 0) + mod;
}

export function d100Value(tens, ones) {
  const v = tens * 10 + ones;
  return v === 0 ? 100 : v;
}

/** Raw percentile roll. */
export function d100() {
  const tens = rnd(10) - 1;
  const ones = rnd(10) - 1;
  return { tens, ones, value: d100Value(tens, ones), doubles: tens === ones };
}

// Usage die chain (largest to smallest)
export const DIE_CHAIN = [20, 12, 10, 8, 6, 4];
export function stepDown(die) {
  const i = DIE_CHAIN.indexOf(die);
  return i < 0 || i === DIE_CHAIN.length - 1 ? null : DIE_CHAIN[i + 1];
}
export function stepUp(die, max = 20) {
  const i = DIE_CHAIN.indexOf(die);
  if (i <= 0) return die;
  const next = DIE_CHAIN[i - 1];
  return next > max ? die : next;
}

/** Look up a value in a ranged table: entries [[lo, hi, value], ...]. */
export function lookup(table, n) {
  for (const row of table) {
    if (n >= row[0] && n <= row[1]) return row[2];
  }
  return null;
}
