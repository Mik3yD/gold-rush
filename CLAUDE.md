# Gold Rush

A first-person 3D browser game about gold mining, built with plain HTML + JavaScript and Three.js loaded from a CDN. No build step, no npm, and nothing to install.

## The game idea

The player is a gold miner walking around a small outdoor dig site in first person (WASD to move, mouse to look).

Core loop:
1. Dig dirt from a dirt pile into a bucket.
2. Carry it to a sluice box and dump it in.
3. The sluice washes the dirt and finds gold flakes. Each flake adds money to the wallet shown on screen.
4. Once in a while a big nugget turns up, worth much more.
5. Spend money on better tools and equipment so you can dig and process more dirt, faster.

## Current state (version 3: tool bar and upgrade looks)

- Flat ground, a dirt pile, a sluice box, a shop table and (once bought) an excavator, all made of plain shapes.
- The HUD shows the wallet, what you're carrying, your shovel, the sluice queue, the excavator and the metal detector signal.
- Press **B** anywhere (or E at the shop table) to open the shop menu. Buy by clicking or pressing 1 to 5. Items you can't afford are greyed out.
- A tool bar along the bottom shows an icon for every tool you own, with a "Lv N" badge. Tools you haven't bought don't appear. Icons are drawn with the 2D canvas in code (no image files) and look better at each level: bigger, shinier metal, and a gold trim plus a glowing gold border at level 3.
- Buried nuggets: up to 3 are hidden in the ground at a time, and a new one is buried every 60 s. You need the metal detector to dig them up ($100 to $250 each). **M** mutes the detector.
- No saving yet. Progress resets when you reload the page.
- **Test cheats (turn off before release):** **K** adds $10,000, **R** resets the wallet and all tools to the start. All cheat code is in one block marked `TEST CHEATS` near the end of the script; set `CHEATS_ON = false` (or delete the block) to turn them off.

### Tools and prices

Level 0 is what you start with (or "not owned"). Each tool has 3 paid levels.

| # | Tool | Level 0 | Level 1 | Level 2 | Level 3 |
|---|---|---|---|---|---|
| 1 | Shovel (scoops per dig) | Basic, 1 | Big, 2 ($60) | Steel, 3 ($250) | Giant, 5 ($700) |
| 2 | Bucket / Wheelbarrow (scoops per trip) | Small Bucket, 10 | Big Bucket, 20 ($100) | Wheelbarrow, 35 ($350) | Big Wheelbarrow, 60 ($900) |
| 3 | Sluice Box | 1 scoop / 1 s | 2 / 0.8 s ($120) | 4 / 0.6 s ($450) | 8 / 0.5 s ($1,200) |
| 4 | Metal Detector (hearing range) | none | 8 m ($300) | 14 m ($900) | 22 m ($2,000) |
| 5 | Small Excavator (scoops dumped into the sluice every 2 s) | none | 10 ($4,000) | 20 ($10,000) | 40 ($20,000) |

Gold: a sluiced scoop is worth about $2 on average. The excavator pauses when 300 or more scoops are waiting in the sluice.

Balance targets: the first upgrade takes about 1 minute of play, and the excavator takes about 20 to 30 minutes.

The sluice box in the world changes with its level (`SLUICE_LOOKS` in the code): level 0 is a short wooden box with 6 riffles; level 1 is longer with 10 riffles and cross braces; level 2 is wider with two channels, 14 riffles, thick posts and top rails; level 3 is a 7.5 m blue steel machine with 20 riffles, a hopper, a water pump and a spray bar. It grows downhill from the high end, so the excavator still dumps into the same spot.

The Gold Pan and pan tub were removed in version 3.

Future ideas: nicer graphics and models, sounds, and saving progress.

## Code layout

- `index.html` holds everything: the page, the HUD, and the game code in one `<script type="module">`.
- Three.js is loaded through an import map from jsDelivr (version pinned to 0.170.0).
- The `SETTINGS` object at the top of the script holds the general tuning numbers (gold chances, nugget values, speeds).
- The `TOOLS` object right below it lists every tool's levels, names, prices and stats. Change prices there. `TOOL_ORDER` sets the shop order and number keys.
- The `state` object holds everything that changes during play (money, carried dirt, the sluice queue, tool levels, buried nuggets). If saving is added, load only the tools in `TOOL_ORDER` so an old `pan` entry in a save is ignored.
- `toolNow(id)` and `toolNext(id)` return the level you own and the one you can buy next. `ownsTool(id)` says whether it shows on the tool bar (tools marked `startsOwned` always do).
- `buildSluice(level)` rebuilds the sluice model; `upgradeSluiceModel()` also updates its collision box.
- `ICONS` has one drawing function per tool for the tool bar, and `updateToolbar()` redraws the bar (it runs after every purchase).

## Working with the user

The user is a beginner. Explain steps in plain language, keep the code readable with short comments, and prefer simple approaches over clever ones.
