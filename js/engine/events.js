// The Events table (page 108-115). Text is displayed from the book; mechanics are implemented per entry.
import { S, uid, bump } from '../state.js';
import { io } from '../io.js';
import { r, rnd, lookup } from '../dice.js';
import { EVENTS_TEXT } from '../data/tables_text.js';
import { WEAPON_SKILLS } from '../data/rules.js';
import { pc, check, damagePC, healWounds, healTough, gainSanity, loseSanity, gainExh, gainXP, addSup, addItem, maxSanity, maxTough, skillValue, hasMastery, allItems, clampStats, madness, checkGoals } from './character.js';
import { rollSpoils, gainPotion } from './loot.js';
import { startCombat } from './combat.js';
import { encounter, afterCombat, growingDarkness, roomTrap, nodeState, trade, reenterRoomEffects, nodeTitle, MAP, adjustLairDie, astralProjection } from './explore.js';
import { neighbors } from '../data/domain1.js';

const g = () => S.g;
const T = (n) => lookup(EVENTS_TEXT, n);

const reasonOK = async (label) => { const c = await check('Reason', { label }); if (c.success) bump('reasonEvents'); return c; };
async function fight(opts = {}) { const res = await encounter(opts); await afterCombat(res); return res; }

const ALTARS = {
  31: ['Dyxemis', 'Sacrifice 1 Health at the altar of Dyxemis (+5 max Toughness for D10+2 rooms)'],
  32: ['Voteus', 'Sacrifice 1 Health at the altar of Voteus (+10 to attack checks for D10+2 rooms)'],
  33: ['Udall', 'Sacrifice 1 Health at the altar of Udall (+D4 Fire damage for D10+2 rooms)'],
  34: ['Koias', 'Sacrifice 1 Health at the altar of Koias (+5 max Aether for D10+2 rooms)'],
  35: ['Keasis', 'Sacrifice 1 Health at the altar of Keasis (recover D4 Sanity)'],
};

export async function altarSacrifice(n) {
  const p = pc();
  p.health -= 1; io.log('You cut yourself and offer your blood: -1 Health.', 'bad');
  if (p.health <= 0) { const { Death } = await import('../io.js'); throw new Death('your offering'); }
  const rooms = r('D10+2');
  switch (n) {
    case 31: p.effects.push({ id: 'altarDyxemis', name: 'Blessing of Dyxemis', rooms, eff: { maxTough: 5 } }); p.tough += 5; break;
    case 32: p.effects.push({ id: 'altarVoteus', name: 'Blessing of Voteus', rooms }); break;
    case 33: p.effects.push({ id: 'altarUdall', name: 'Blessing of Udall', rooms }); break;
    case 34: p.effects.push({ id: 'altarKoias', name: 'Blessing of Koias', rooms, eff: { maxAether: 5 } }); p.aether += 5; break;
    case 35: gainSanity(rnd(4)); break;
    default: break;
  }
  if (n !== 35) io.log(`The god's favor lasts ${rooms} rooms.`, 'good');
  clampStats(); io.refresh();
}

export async function runEvent(id) {
  const p = pc(); const s = nodeState(id);
  let n = rnd(100);
  io.log(`<b>Event</b> (${n}): ${T(n)}`, 'event');
  if (hasMastery('zealot') && !p.once.eventReroll) {
    if (await io.yesNo('Divine Guidance: re-roll this Event? (once per Rest)', 'Re-roll', 'Keep it')) {
      p.once.eventReroll = true; n = rnd(100); io.log(`<b>Event</b> (${n}): ${T(n)}`, 'event');
    }
  }
  s.event = n;
  await resolveEvent(n, s);
  await checkGoals();
  io.refresh();
}

export async function reenterEvent(id) {
  const s = nodeState(id);
  await reenterRoomEffects(id);
  switch (s.event) {
    case 40: io.log('The mangled remains are still here.', 'dim'); await loseSanity(2, { resolve: true, label: 'The massacre' }); break;
    case 60: { io.log('The ghostly flames still dance here.', 'dim'); const c = await check('Dodge', { label: 'Avoid the ghostly flames' }); if (!c.success) await loseSanity(1); break; }
    case 71: { io.log('The strange devices still crackle.', 'dim'); const c = await check('Acrobatics', { label: 'Skip over the circuit' }); if (!c.success) await damagePC(r('2D6'), 'Force', { label: 'Shock' }); break; }
    default: break;
  }
}

async function resolveEvent(n, s) {
  const p = pc();
  if (n <= 10) return roomTrap(s);
  if (n <= 20) return rollSpoils();
  if (n <= 30) { s.trader = true; if (await io.yesNo('Trade with the Trader now?', 'Trade', 'Later')) await trade(); return; }
  switch (n) {
    case 31: case 32: case 33: case 34: case 35: {
      s.altar = n; s.altarLabel = ALTARS[n][1];
      if (await io.yesNo(`${ALTARS[n][1]}?`, 'Sacrifice', 'Not now')) { s.altarUsed = true; await altarSacrifice(n); }
      return;
    }
    case 36: { const c = await check('Endurance', { label: 'Showered in debris' }); if (!c.success) gainExh(2); return; }
    case 37: { const c = await check('Resolve', { label: 'The nagging voice' }); if (!c.success) { const v = Math.min(p.sup.coins, rnd(100)); p.sup.coins -= v; io.log(`You throw away ${v} coins.`, 'bad'); } return; }
    case 38: {
      await loseSanity(1, { resolve: true, label: 'A wall of bones' });
      const c = await check('Dodge', { label: 'The pile collapses' });
      if (c.success) { await gainXP(10); await rollSpoils(); } else await damagePC(r('2D6'), 'Bludgeoning', { label: 'Collapsing bones' });
      return;
    }
    case 39: { const c = await reasonOK('Strange markings'); if (c.success) await gainXP(10); else { io.log("You're so distracted that you fail to realize you're being attacked!", 'bad'); await fight({ ambush: true }); } return; }
    case 40: s.scavengeAllowed = 2; await loseSanity(2, { resolve: true, label: 'The massacre' }); return;
    case 41: {
      const c = await reasonOK('The old beggar');
      if (c.success) { io.log('The man thanks you with something of value.', 'good'); await rollSpoils(); }
      else { io.log('The man explodes in front of your eyes as a Necropede bursts out of him!', 'bad'); const res = await startCombat({ defs: ['necropede'], nodeId: g().domain.cur }); await afterCombat(res); }
      return;
    }
    case 42: { const c = await check('Athletics', { label: 'Pry open a box' }); if (c.success) await rollSpoils(); return; }
    case 43: { const c = await check('Perception', { label: 'Search the body' }); if (c.success) { p.effects.push({ id: 'fireCharm', name: 'Fire charm' }); io.log('You find a charm: +D4 Fire damage to your Damage Pool while in this room.', 'loot'); } return; }
    case 44: { const c = await reasonOK('The bleeding wall'); if (c.success) await gainXP(10); else await damagePC(r('2D4'), 'Acid', { label: 'Acidic blood' }); return; }
    case 45: {
      const c = await check('Perception', { label: 'Examine the body' }); if (c.success) await rollSpoils();
      const d = await check('Dodge', { label: 'The body lurches!' }); if (!d.success) { p.cond.Bleeding = (p.cond.Bleeding || 0) + 1; io.log('You are scratched: Bleeding (1).', 'bad'); }
      return;
    }
    case 46: {
      if (p.sup.bandage > 0 && await io.yesNo('Help the wounded man (Medicine, uses 1 Bandage)?', 'Help him', 'Move on')) {
        p.sup.bandage -= 1; const c = await check('Medicine', { label: 'Tend the dying man' }); if (c.success) await gainXP(20);
      } else { io.log("You can't bear to look as you leave him behind.", 'dim'); await loseSanity(1); }
      return;
    }
    case 47: { if (await io.yesNo('Try to decipher the bloody sigil (Reason)?', 'Decipher', 'Look away')) { const c = await reasonOK('The sigil'); if (c.success) await gainXP(20); else await loseSanity(rnd(4)); } return; }
    case 48: { if (await io.yesNo('Reach into the dark pool (Acrobatics)?', 'Reach', 'Leave it')) { const c = await check('Acrobatics', { label: 'Balance on the edge' }); if (c.success) await rollSpoils(); else { io.log('You slip and fall inside!', 'bad'); await growingDarkness(); } } return; }
    case 49: { if (await io.yesNo('Stick your arm into the hole (Athletics)?', 'Reach in', 'Leave it')) { const c = await check('Athletics', { label: 'Reach deep' }); if (c.success) await rollSpoils(); else await damagePC(r('2D6'), 'Slashing', { label: 'Something pulls at you' }); } return; }
    case 50: {
      const c = await check('Resolve', { label: 'The tolling bell' });
      if (c.success) await gainXP(20);
      else { const ch = await io.choose('The bell breaks into your mind. Choose your fate:', [{ label: 'Roll on the Growing Darkness table', value: 'g' }, { label: 'Roll on the Madness table', value: 'm' }]); if (ch === 'g') await growingDarkness(); else await madness(); }
      return;
    }
    case 51: {
      const ch = await io.choose('The makeshift mausoleum.', [{ label: 'Desecrate the tomb (lose 1 Sanity, roll Spoils)', value: 'd' }, { label: 'Say a quick prayer (recover D4 Sanity)', value: 'p' }, { label: 'Leave it', value: null, cls: 'secondary' }]);
      if (ch === 'd') { await loseSanity(1); await rollSpoils(); } else if (ch === 'p') gainSanity(rnd(4));
      return;
    }
    case 52: { const c = await check('Resolve', { label: 'Resist the effigy' }); if (c.success) await gainXP(10); else await damagePC(r('3D4'), 'Slashing', { label: 'You cut your own arm' }); return; }
    case 53: {
      if (await io.yesNo('Take down the hanged men and give them rest (2 Exhaustion, recover D4 Sanity)?', 'Take them down', 'Ignore them')) { gainExh(2); gainSanity(rnd(4)); }
      else await growingDarkness();
      return;
    }
    case 54: { const c = await reasonOK('Forbidden whispers'); if (c.success) await gainXP(10); else await loseSanity(1); return; }
    case 55: s.scavengeAllowed = 3; io.log('You can Scavenge up to 3 times here.', 'info'); return;
    case 56: { await loseSanity(rnd(6), { resolve: true, label: 'Visions of your own death' }); p.flags.cheatDeath = true; io.log('The next time your Health reaches 0, you can ignore that source of damage.', 'good'); return; }
    case 57: { const c = await check('Endurance', { label: 'The terrible cold' }); if (c.success) { p.flags.coldCharge = true; io.log('The cold clings to you: +D8 Cold damage on your next melee attack.', 'good'); } return; }
    case 58: {
      const opts = [{ label: 'Accept its judgment (Resolve)', value: 'a' }];
      if (g().domain.growing.length) opts.push({ label: 'Bash the statue (remove one Growing Darkness effect)', value: 'b' });
      opts.push({ label: 'Leave', value: null, cls: 'secondary' });
      const ch = await io.choose('The judging statue.', opts);
      if (ch === 'a') { const c = await check('Resolve', { label: 'Judgment' }); if (c.success) { await rollSpoils(); await rollSpoils(); } }
      if (ch === 'b') await removeGrowing();
      return;
    }
    case 59: gainExh(-rnd(4)); return;
    case 60: { const c = await check('Dodge', { label: 'Avoid the ghostly flames' }); if (!c.success) await loseSanity(1); return; }
    case 61: { if (await io.yesNo('Sit and read the scrolls (Reason)?', 'Read', 'Leave them')) { const c = await reasonOK('Ancient scrolls'); if (c.success) { g().domain.overseerWeakness = true; io.log("You learn a weakness of this Domain's Overseer: it will be Stunned in the first round of combat.", 'good'); } } return; }
    case 62: { const c = await reasonOK('Fencing mosaics'); if (c.success) { p.skills['Bladed Weapons'] = Math.min(80, (p.skills['Bladed Weapons'] || 0) + 1); io.log('Bladed Weapons +1.', 'good'); } return; }
    case 63: { const c = await check('Resolve', { label: 'The furious specter' }); if (c.success) await gainXP(10); else { await loseSanity(1); gainExh(1); } return; }
    case 64: { const c = await check('Perception', { label: "Search the robber's camp" }); if (c.success) { const t = rnd(4); const cr = rnd(10); addSup('torch', t); addSup('crafting', cr); io.log(`You find ${t} Torches and ${cr} Crafting Supplies.`, 'loot'); } return; }
    case 65: {
      if (await io.yesNo('Defile the altar (Athletics)?', 'Defile it', 'Leave it')) {
        const c = await check('Athletics', { label: 'Defile the altar' });
        if (c.success) { if (g().domain.growing.length) await removeGrowing(); else io.log('There is no darkness to dispel, for now.', 'dim'); }
        else { io.log("You've made too much noise!", 'bad'); await fight(); }
      }
      return;
    }
    case 66: {
      const c = await check('Stealth', { label: 'Hide from the horde' });
      if (c.success) await gainXP(20);
      else {
        io.log('You must throw something to distract them!', 'bad');
        if (p.equip.belt && p.potions.length) { p.potions.shift(); io.log('You hurl a potion from your Belt.', 'bad'); }
        else {
          const opts = [];
          if (p.equip.main) opts.push({ label: `Throw your ${p.equip.main.name}`, value: 'main' });
          if (p.equip.off) opts.push({ label: `Throw your ${p.equip.off.name}`, value: 'off' });
          if (!opts.length) { io.log('You have nothing in your hands to throw... but the dead lose interest.', 'dim'); return; }
          const ch = await io.choose('Throw what?', opts);
          const it = p.equip[ch]; p.equip[ch] = null;
          if (it.kind === 'light') { p.light = null; }
          io.log(`You throw away your ${it.name}.`, 'bad');
        }
      }
      return;
    }
    case 67: g().domain.tension = 8; io.log('The Tension Die resets to d8.', 'good'); return;
    case 68: { if (await io.yesNo('Kneel and meditate (Resolve)?', 'Meditate', 'Move on')) { const c = await check('Resolve', { label: 'Meditation' }); if (c.success) gainSanity(rnd(4)); else await loseSanity(1); } return; }
    case 69: { const c = await check('Resolve', { label: 'Resist the angry spirit' }); if (c.success) await gainXP(10); else { const v = Math.min(p.sup.coins, rnd(100)); p.sup.coins -= v; io.log(`The spirit steals ${v} coins.`, 'bad'); } return; }
    case 70: {
      const c = await check('Resolve', { label: 'Resist possession' });
      if (c.success) await gainXP(20);
      else { p.flags.cursedRoom = true; io.log('You are cursed: each time you enter a new room you lose 1 Sanity, unless you destroy a magic item.', 'bad'); }
      return;
    }
    case 71: { const c = await check('Acrobatics', { label: 'Skip over the circuit' }); if (!c.success) await damagePC(r('2D6'), 'Force', { label: 'Shock' }); return; }
    case 72: { const c = await check('Perception', { label: 'Dig through the refuse' }); if (c.success) await rollSpoils(); return; }
    case 73: {
      const c = await check('Stealth', { label: 'Sneak up on the warlock' });
      if (c.success) { io.log('You eliminate the warlock before they realize what is going on.', 'good'); gainSanity(rnd(4)); }
      else { io.log('The warlock hears you and casts a spell. You wake up hours later, alive but confused.', 'bad'); gainExh(2); await growingDarkness(); }
      return;
    }
    case 74: { const c = await check('Perception', { label: 'Search the alchemy lab' }); gainPotion(c.success ? rnd(4) : 1); return; }
    case 75: { const c = await check('Perception', { label: "The bag's contents" }); if (c.success) await rollSpoils(); else { io.log('Whatever killed the owner has come back!', 'bad'); await fight(); } return; }
    case 76: { const c = await reasonOK('The sliding puzzle'); if (c.success) { const v = r('2D100'); addSup('coins', v); io.log(`A hidden compartment holds ${v} coins.`, 'loot'); } return; }
    case 77: { if (await io.yesNo('Stick your arm into the viscera (Perception)?', 'Search', 'No way')) { const c = await check('Perception', { label: 'Search the viscera' }); if (c.success) await rollSpoils(); else await loseSanity(1); } return; }
    case 78: { if (await io.yesNo('Try to open the rusty gate (Athletics)?', 'Force it', 'Leave it')) { const c = await check('Athletics', { label: 'Open the gate' }); if (c.success) { io.log('You find the desiccated corpse of a forgotten prisoner, and something of value.', 'good'); await rollSpoils(); } } return; }
    case 79: {
      const c = await check('Medicine', { label: 'Study the herbs' });
      if (c.success) { addItem({ uid: uid(), kind: 'consumable', name: 'Medicinal Herbs', desc: 'When consumed, heal 2D6 Wounds.', use: { wounds: '2D6' } }); io.log('You gather a dose of Medicinal Herbs (heal 2D6 Wounds).', 'loot'); }
      return;
    }
    case 80: { for (let i = 0; i < 10; i++) { const c = await check('Athletics', { label: 'Wade through the mud' }); if (c.success) break; gainExh(1); } return; }
    case 81: { const c = await reasonOK('The floor sigils'); if (c.success) { p.flags.ignoreNextGrowing = true; io.log('You can ignore the next roll on the Growing Darkness table.', 'good'); } else await damagePC(r('2D6'), 'Arcane', { label: 'Failsafe' }); return; }
    case 82: {
      const c = await check('Dodge', { label: 'Vampire bats!' }); if (!c.success) await damagePC(r('2D4'), 'Slashing', { label: 'Vampire bats' });
      const e = await check('Endurance', { label: 'Resist the Rot' }); if (!e.success && !p.rotInfected) { p.rotInfected = true; io.log('<b>You have contracted the Rot.</b>', 'bad'); }
      return;
    }
    case 83: gainSanity(rnd(6)); return;
    case 84: {
      const sk = await io.choose('An invisible force slams against you! Check with which weapon Skill?', WEAPON_SKILLS.map((x) => ({ label: `${x} (${skillValue(x)})`, value: x })));
      const c = await check(sk, { label: 'Fend off the assault' }); if (c.success) await gainXP(10); else await damagePC(rnd(12), 'Bludgeoning', { label: 'Invisible force' });
      return;
    }
    case 85: { if (await io.yesNo('Drink from the demonic fountain (2D6 Infernal damage, recover D6 Sanity)?', 'Drink', 'Refrain')) { await damagePC(r('2D6'), 'Infernal', { label: 'Demonic water' }); gainSanity(rnd(6)); } return; }
    case 86: {
      if (g().domain.map && !g().domain.lairFound && await io.yesNo("Take the left door, towards the Overseer's lair (reduce the Lair Die by one stage)?", 'Left door', 'No')) adjustLairDie(-1);
      else if (!g().domain.map) io.log('In this First Domain the way to the Overseer is already known; the left door adds nothing new.', 'dim');
      if (await io.yesNo('Drink from the black fountain behind the right door (Growing Darkness, but recover D10 Toughness)?', 'Drink', 'Refrain')) { await growingDarkness(); healTough(rnd(10)); }
      return;
    }
    case 87: { const c = await check('Athletics', { label: 'Reach into the pond' }); if (c.success) { const v = r('3D20'); addSup('coins', v); io.log(`You recover ${v} coins.`, 'loot'); } else await loseSanity(1); return; }
    case 88: {
      const c = await check('Perception', { label: 'Over the roar of the waterfall' });
      if (c.success) { io.log('You scurry out before a group of enemies sneaks up on you.', 'good'); s.mustLeave = true; }
      else { io.log("You're attacked by surprise!", 'bad'); await fight({ ambush: true }); }
      return;
    }
    case 89: {
      if (await io.yesNo('Eat the dark berries?', 'Eat', 'Leave them')) { const d = rnd(6); if (d <= 3) gainExh(-5); else await damagePC(r('2D4'), 'Poison', { label: 'Poisonous berries' }); }
      return;
    }
    case 90: { const c = await check('Acrobatics', { label: 'A floor of bones' }); if (c.success) await rollSpoils(); else await damagePC(rnd(10), 'Bludgeoning', { label: 'You crash into the skulls' }); return; }
    case 91: {
      if (await io.yesNo('Try to deactivate the unstable artifact (Reason)?', 'Try', 'Ignore it')) { const c = await reasonOK('Deactivate the artifact'); if (c.success) { await gainXP(10); return; } }
      p.flags.artifactBomb = true; io.log('The artifact keeps humming... ominously.', 'bad'); return;
    }
    case 92: { const c = await reasonOK('The old journal'); if (c.success) { p.flags.ignoreNextGrowing = true; io.log('You can ignore the next Growing Darkness event.', 'good'); } return; }
    case 93: { const c = await reasonOK('The crude map'); if (c.success) await astralProjection(3); return; }
    case 94: { if (await io.yesNo('Touch the floating sphere of blood?', 'Touch it', 'Leave it')) { const v = rnd(10); p.tempAether += v; p.flags.loseInitiative = true; io.log(`+${v} Temporary Aether. You will lose the Initiative in your next combat.`, 'info'); } return; }
    case 95: {
      if (await io.yesNo('Pull the bronze chain (Athletics)?', 'Pull', 'Leave it')) { const c = await check('Athletics', { label: 'Pull the chain' }); if (c.success) await gainXP(20); else { io.log('Cackling laughter booms in the room... the next Combat Encounter has +20 Combat Skill.', 'bad'); p.flags.nextEncounterBonus = 20; } }
      return;
    }
    case 96: { const c = await reasonOK('The warning on the wall'); if (c.success) { p.flags.initiativeBonus = 20; io.log('You will start the next Combat Encounter with +20 Initiative.', 'good'); } return; }
    case 97: {
      if (await io.yesNo('Accept the strange deal (lose D4 maximum Sanity, gain D4 maximum Toughness)?', 'Accept', 'Refuse')) {
        const a = rnd(4); const b = rnd(4); p.base.sanity = Math.max(1, p.base.sanity - a); p.base.tough += b; p.tough += b; clampStats();
        io.log(`Max Sanity -${a}, max Toughness +${b}.`, 'info');
      }
      return;
    }
    case 98: { const c = await check('Acrobatics', { label: 'Cross the iron spikes' }); if (!c.success) { p.cond.Bleeding = (p.cond.Bleeding || 0) + 1; io.log('You are Bleeding (1).', 'bad'); } return; }
    case 99: gainExh(rnd(6)); return;
    case 100: { const c = await check('Resolve', { label: 'The necrolord' }); if (c.success) await gainXP(100); else await madness(); return; }
    default: return;
  }
}

async function removeGrowing() {
  const gr = g().domain.growing; if (!gr.length) return;
  const names = { boostAnimal: 'Animals empowered', boostElemental: 'Elementals empowered', boostAstral: 'Astrals empowered', boostPlant: 'Plants empowered', boostDemon: 'Demons empowered', boostUndead: 'Undead empowered', boostHumanoid: 'Humanoids empowered', boostConstruct: 'Constructs empowered', breatherTension: 'Restless breathers', campMinus: 'Shaking hands (-1 Camp)', noAttune: 'Cannot Attune', weakness: '+1 damage taken', marks: 'Mental wounds', lightDrain: 'Thick darkness', dull: 'Dull mind', spellward: 'Weakened spirit', drainAether: 'Drained spirit', drainTough: 'Conspiring air', exhausted: 'Exhausted' };
  const ch = await io.choose('Remove which Growing Darkness effect?', gr.map((x, i) => ({ label: names[x] || x, value: i })));
  const [rem] = gr.splice(ch, 1);
  io.log(`The effect "${names[rem] || rem}" is lifted.`, 'good');
}
