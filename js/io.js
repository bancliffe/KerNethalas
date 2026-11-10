// Bridge between the game engine and the UI. The engine awaits these calls; the UI implements them.

let impl = null;
export function setIO(i) { impl = i; }

export class Death extends Error {
  constructor(cause) { super(cause); this.death = true; this.cause = cause; }
}
export class Leave extends Error {
  // Thrown to abort the current flow (e.g. fled combat, ended the domain)
  constructor(reason) { super(reason); this.leave = true; this.reason = reason; }
}

export const io = {
  /** Append a line to the adventure log. cls: info|good|bad|roll|enemy|title|loot|dim */
  log(html, cls = 'info') { impl?.log(html, cls); },
  /** Ask the player to pick one option. options: [{label, value, hint, disabled, cls}] */
  choose(prompt, options, opts = {}) { return impl.choose(prompt, options, opts); },
  /** Show a message with a single button. */
  async ok(prompt, label = 'Continue', opts = {}) { return impl.choose(prompt, [{ label, value: true }], opts); },
  /** Yes/no question */
  async yesNo(prompt, yes = 'Yes', no = 'No', opts = {}) { return impl.choose(prompt, [{ label: yes, value: true }, { label: no, value: false, cls: 'secondary' }], opts); },
  refresh() { impl?.refresh(); },
  scene(s) { impl?.scene(s); },
  toast(msg) { impl?.toast?.(msg); },
};
