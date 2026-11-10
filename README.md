# Ker Nethalas: Into the Midnight Throne (web adaptation)

A browser version of the solo dungeon crawler *Ker Nethalas: Into the Midnight Throne* (Gravebound Edition).
It plays on desktop and on phones. It installs as an app (PWA), works offline, and saves automatically.

Game text, rules and tables are from the corebook by Alex T., © 2026 Blackoath Entertainment.
They are used here with permission from Alex T. The book's artwork is not included.

## Running it

The app is plain HTML, CSS and JavaScript modules. There is no build step, but it must be served over HTTP:
browsers block ES modules on `file://`.

```sh
# from this folder, any static server works:
python -m http.server 8765
# then open http://localhost:8765
```

To play on a phone, put the folder on any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).
Then open the site and use "Add to Home Screen". Do **not** upload the PDF: it is in `.gitignore`.

## What's in the game

- **Character creation:** name, crime (D20), rolled Attributes, Skill allotments, Resistances, all 20 Masteries
  (with training location), Weapon Master Dedication and Personal Goals. Hard beginnings are applied.
- **The First Domain:** the fixed map from *Stepping Into Darkness*, drawn as a graph that follows the printed
  layout, with its special rooms and its own encounter table. Descending from its Exit is one-way.
- **Every Domain after that:** generated room by room with the book's mapping procedure: a D100 roll for room or
  corridor, a D10 door check, the Lair Die (D10, including the optional 15-room rule) and then the Domain Exit
  Die (D8). Each Domain gets a new Overseer, Overseer Influence, Tension Die and Growing Darkness. You can climb
  back up to earlier generated Domains. The book says the room shape doesn't matter, so the generator rolls how
  many passages lead onward instead of drawing geomorph tiles.
- **Exploration:** the Tension Die and Growing Darkness, all 100 Events, Traders, light and darkness, scavenging,
  hidden containers, locks and traps, Taking a Breather, and Setting Camp with every activity.
- **Combat:** the full rules from Chapter III, including initiative and surprise, opposed attacks, reactions,
  hit locations, the Damage Pool, armor, damage types, Defensive Moves, Fumbles, conditions, creature traits and
  Overseer Influence.
- **The full bestiary:** all 40 creatures on the standard encounter tables plus the Blightfang Rats, Skeletal
  Horrors and Flesh Eater, all 10 Overseers (with Lesser Demons, Shadow Reapers and Doppelgangers), and the
  Mastery Minions (Skeleton, Wight, Arcane Companion, Fire Elemental and Frost Elemental).
- **All Mastery Abilities, Tiers 1-5:** spells, attacks, reactions (Feint, Brace, Magic Shell, Ice Shield,
  Countershock), sustained powers, Icons, minions, Dominate, Shadow Clone, Calm, Vanish, Astral Projection and
  every passive. You earn Ability Points on level-up (and from the Gloomheart Seed) and spend them tier by tier,
  including on an Amulet's third Mastery.
- **Loot and magic items:** all loot tables. Every activated magic-item and Relic power works, including armor
  vines, shadow form, healing armor, kicks and punches, arcane bursts, weapon fury, blood price, the Ring of
  Arcane Tempest, the Phoenix gloves' Fire Elemental, the Voidclasp Gauntlets' reflection, rerolls, the Potion
  of Forgotten Fate and the Black Heart.
- **Saving:** autosave (also mid-combat), export and import, and the optional *Overcoming Death* rule.

### Known simplifications

- Ring of Mental Peace only works on another character, so it does nothing in solo play.
- A few minion and companion edge cases are resolved with simple rules. For example, a Dominated creature
  fights with a basic melee attack.

## Project layout

```
index.html, css/style.css, manifest.webmanifest, sw.js, icons/
js/dice.js            dice, D100, usage-die chain
js/state.js           game state, saving, settings
js/io.js              bridge between engine and UI (the engine awaits player choices)
js/data/              rules tables, items, masteries, creatures, First Domain map, book table text
js/engine/            character, combat, abilities, loot, inventory, exploration, events
js/ui/                app shell, character creation, side panels (map, sheet, inventory, journal)
```

When you change files, bump `VERSION` in `sw.js` so installed copies pick up the update.
