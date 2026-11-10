// The First Domain (Chapter VII: Stepping Into Darkness).
// The printed map is an isometric dungeon; it is represented here as a graph of rooms and
// corridors that follows its layout. Coordinates are on a 100x100 grid for the map view.

export const DOMAIN1 = {
  id: 'first',
  name: 'The First Domain',
  start: 'I',
  nodes: {
    I: { kind: 'room', x: 79, y: 9, label: 'I', title: 'The Corpse Pile', fixed: true, noEncounter: true, noEvent: true, noScavenge: true,
      text: 'This is where you opened your eyes for the first time after your supposed execution. This is where the nightmare begins. There is nothing of value here, just rotten flesh and vermin. You do find a half-spent Torch, though (it will last you another 10 rooms).' },
    II: { kind: 'room', x: 67, y: 18, label: 'II', title: 'The Guard Room', fixed: true, noEncounter: true, noEvent: true,
      text: 'This room appears to be some ancient guard room, a tattered banner still hanging from one of the walls. Several armor and weapon racks lie collapsed and rotten near the walls, but among the many rusty pieces of weaponry you find something that you can use.',
      loot: { weapons: ['Dagger', 'Club', 'Spear'], randomArmor: 1 } },
    III: { kind: 'room', x: 41, y: 13, label: 'III', title: 'Another Unfortunate Soul', fixed: true, noEvent: true,
      text: "It is clear you're not the first one here, others have come before you. In front of you lies the relatively recent corpse of another one of those unfortunate souls. A quick check reveals that they have 2x Cooking Ingredients and 10x Crafting Supplies on them. Their misfortune might be what ends up saving your life...",
      loot: { sup: { cooking: 2, crafting: 10 } } },
    IV: { kind: 'room', x: 55, y: 42, label: 'IV', title: 'Altar', fixed: true, noEvent: true,
      text: 'Old, melted candles have fused into a mass of solid wax upon an altar dedicated to some mysterious goddess you do not recognize. She holds a bowl in her hands, and within it you find the brittle remains of paper prayers, left there by whoever worshiped this deity.',
      loot: { supRoll: { candle: 'D4' } } },
    V: { kind: 'room', x: 91, y: 66, label: 'V', title: "Sorcerer's Stash", fixed: true,
      text: 'This room is covered in the remains of broken down shelves, rotten scrolls and books spilled all around them. Luckily for you, something has survived the ravages of time: you find a small sack holding 3 Attunement Crystals, warm to the touch and whispering possibilities in your mind.',
      loot: { sup: { crystal: 3 } } },
    VI: { kind: 'room', x: 40, y: 57, label: 'VI', title: 'Vaulted Ossuary', fixed: true, noEvent: true, choir: true,
      text: "This chamber is a long, ribbed vault carved from black limestone and bone. A lattice of femurs and vertebrae arches overhead, each joint threaded with rusted wire; between the bones, thin veins of pale fungus pulse with a sickly, cold light. Along the far wall, dozens of mouths-now mummified-have been sewn into a single, ragged choir, lips stitched shut with copper wire. At the center sits a low altar of cracked marble, stained with dried ink and something darker, and a shallow basin that reflects the choir's faint glow." },
    VII: { kind: 'room', x: 26, y: 74, label: 'VII', title: 'The Overseer', fixed: true, lair: true, noEncounter: true, noEvent: true,
      text: "This is where you will find this Domain's Overseer. As usual, remember you can ignore it, although the Experience Points and potential loot might prove worth the risk." },
    VIII: { kind: 'room', x: 36, y: 95, label: 'VIII', title: 'The Exit', fixed: true, exit: true,
      text: "This is the Domain's exit. Move on to the next Domain of the necropolis once you've finished reaping everything of worth in the first Domain. As opposed to normal Domains, you cannot return to this first Domain once you've left it: the drop down to the next Domain is too steep to climb back." },

    E1: { kind: 'room', x: 90, y: 25, label: 'a' },
    E2: { kind: 'room', x: 94, y: 38, label: 'b' },
    E3: { kind: 'room', x: 66, y: 68, label: 'c' },
    W1: { kind: 'room', x: 26, y: 30, label: 'd' },
    W2: { kind: 'room', x: 20, y: 52, label: 'e' },
    W3: { kind: 'room', x: 7, y: 80, label: 'f' },
    S1: { kind: 'room', x: 54, y: 84, label: 'g' },

    cIE1: { kind: 'corridor', x: 88, y: 15 },
    cII_III: { kind: 'corridor', x: 55, y: 11 },
    cII_IV: { kind: 'corridor', x: 70, y: 31 },
    cIII_IV: { kind: 'corridor', x: 47, y: 29 },
    cIII_W: { kind: 'corridor', x: 28, y: 20 },
    cW: { kind: 'corridor', x: 12, y: 42 },
    cIV_VI: { kind: 'corridor', x: 48, y: 51 },
    cW2_VII: { kind: 'corridor', x: 17, y: 65 },
    cVII_VIII: { kind: 'corridor', x: 30, y: 86 },
    cIV_E3: { kind: 'corridor', x: 68, y: 53 },
    cE2_V: { kind: 'corridor', x: 86, y: 52 },
    cE3_V: { kind: 'corridor', x: 79, y: 70 },
    cVI_S1: { kind: 'corridor', x: 47, y: 70 },
    cE3_S1: { kind: 'corridor', x: 63, y: 79 },
    cS1_VIII: { kind: 'corridor', x: 45, y: 92 },
  },
  // [a, b, door?]
  edges: [
    ['I', 'II'], ['I', 'cIE1'], ['cIE1', 'E1'], ['E1', 'E2', true],
    ['II', 'cII_III', true], ['cII_III', 'III'], ['II', 'cII_IV'], ['cII_IV', 'IV'],
    ['III', 'cIII_IV'], ['cIII_IV', 'IV', true], ['III', 'cIII_W'], ['cIII_W', 'W1'],
    ['W1', 'cW'], ['cW', 'W2'], ['W2', 'VI', true], ['IV', 'cIV_VI'], ['cIV_VI', 'VI'],
    ['W2', 'cW2_VII'], ['cW2_VII', 'VII', true], ['VII', 'W3', true], ['VII', 'cVII_VIII'], ['cVII_VIII', 'VIII'],
    ['IV', 'cIV_E3'], ['cIV_E3', 'E3'], ['E2', 'cE2_V'], ['cE2_V', 'V', true], ['E3', 'cE3_V'], ['cE3_V', 'V'],
    ['VI', 'cVI_S1'], ['cVI_S1', 'S1', true], ['E3', 'cE3_S1'], ['cE3_S1', 'S1'], ['S1', 'cS1_VIII'], ['cS1_VIII', 'VIII'],
  ],
};

export const edgeKey = (a, b) => [a, b].sort().join('|');

export function neighbors(domain, id) {
  const out = [];
  for (const [a, b, door] of domain.edges) {
    if (a === id) out.push({ id: b, door: !!door });
    else if (b === id) out.push({ id: a, door: !!door });
  }
  return out;
}

// Traps table (page 119). D10
export const TRAPS = [
  { skill: 'Dodge', name: 'Arrow Trap', text: 'Arrows shoot from a hidden spot, dealing 2D6 Piercing damage to the character who triggered it.', dmg: '2D6', type: 'Piercing' },
  { skill: 'Dodge', name: 'Bear Trap', text: 'The character steps on a hidden bear trap. They suffer 2D6 Piercing damage.', dmg: '2D6', type: 'Piercing' },
  { skill: 'Dodge', name: 'Net Trap', text: 'A net trap suddenly traps the character, who becomes Restrained. Each attempt at liberating themselves increases their Exhaustion by 1. After D6 attempts, the net breaks by itself, but the hard landing causes 2D8 Bludgeoning damage.', net: true },
  { skill: 'Dodge', name: 'Poisoned Darts', text: 'A salvo of small, poisoned darts strike the character, who becomes Poisoned (1) unless they pass an Endurance check. The darts also deal 2D4 Piercing damage.', dmg: '2D4', type: 'Piercing', poison: true },
  { skill: 'Acrobatics', name: 'Spiked Pit', text: 'The character falls into a hole, disguised by a trap door. The hole is full of spikes, dealing 3D4 Piercing damage.', dmg: '3D4', type: 'Piercing' },
  { skill: 'Dodge', name: 'Swinging Blade', text: 'A swinging blade strikes the character, dealing D12 Slashing damage.', dmg: 'D12', type: 'Slashing' },
  { skill: 'Athletics', name: 'Noxious Gas', text: 'Noxious gas is released, filling the chamber. All creatures must pass an Endurance check or immediately receive 2D4+4 Poison Damage.', gas: true },
  { skill: 'Acrobatics', name: 'Fireball', text: 'A ball of fire fills the room, dealing 2D6 Fire damage to all creatures in the room.', dmg: '2D6', type: 'Fire' },
  { skill: 'Dodge', name: 'Alarm', text: "An alarm of some sort (mechanical, magical, other) attracts the attention of one of the place's inhabitants. Roll on the Combat Encounter table.", alarm: true },
  { skill: 'Athletics', name: 'Water Rush', text: 'A rush of water fills the room, threatening to drag all creatures in it, and slam them against the walls, dealing 3D4 Bludgeoning damage.', dmg: '3D4', type: 'Bludgeoning' },
];
