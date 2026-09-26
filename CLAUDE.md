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

## Current state (version 4: drivable excavator and sounds)

- Flat ground, a dirt pile, a sluice box, a shop table, an excavator and a dump truck, all made of plain shapes.
- The HUD shows the wallet, what you're carrying, your shovel, the sluice queue, the excavator and the truck.
- Press **B** anywhere (or E at the shop table) to open the shop menu. Buy by clicking or pressing 1 to 7. Items you can't buy yet are greyed out (clicking them plays the "not enough money" sound).
- A tool bar along the bottom shows an icon for every tool you own, with a "Lv N" badge. Tools you haven't bought don't appear. Icons are drawn with the 2D canvas in code (no image files) and look better at each level: bigger, shinier metal, and a gold trim plus a glowing gold border at level 3. The excavator's icon has no badge; it shows all three excavator upgrades at once (longer arm, bigger bucket, more exhaust pipes) and gets the gold border when all three are maxed.
- **Sounds:** every sound is made in code with the Web Audio API (no sound files): footsteps, digging, dumping, the sluice water (louder when washing, quieter further away), gold flake "tings", a big fanfare for nuggets, "ka-ching" for buying, a power-up for upgrading, a buzzer for not enough money, shop open/close chimes, the excavator engine (revs up when you drive or move the arm), hydraulic whine, track clanks, bucket scraping, and the truck's engine, reversing beeps and horn. **M** (or the speaker button in the top right) mutes everything. Sound starts after the first click, because browsers require that.
- **Excavator:** always parked at the dig site. Until you buy it, walking up to it says it's for sale (E opens the shop). Once bought, walk up and press **E** to climb into the cab (the camera moves to the seat). Controls while driving: **W/S** drive, **A/D** turn, **arrow left/right** swing the arm (the cab turns with it), **arrow up/down** raise/lower the arm, **Q** (or hold left click) curls the bucket to scoop, **F** (or hold right click) tips it to dump, mouse looks around, **E** gets out. A controls panel shows on the right while driving, and a hint under the crosshair says what to do next.
  - Scooping: get the bucket into the dirt pile and hold Q. Once it bites, it keeps filling while you hold Q and it's over the pile.
  - Dumping: tip the bucket far enough (`DUMP_PITCH`) and all the dirt falls out. Over the sluice it goes into the sluice queue; over the parked truck it goes into the truck; back over the pile is fine; anywhere else it's spilled and lost. The dump spot is measured at the bucket's hinge.
  - The bucket can't go below the ground, and the excavator can't drive through the pile, sluice, shop or truck, or off the dig site.
- **Dump truck:** parks near the pile. Load it with the excavator; it drives off to the sluice when full (200 scoops) or 5 s after the last load, backs up with reversing beeps, tips its bed into the sluice and comes back. It waits and honks if the excavator or you are in its way. A good spot to work is between the pile and the truck: from there you can reach both just by swinging the arm.
- No saving yet. Progress resets when you reload the page.
- **Test cheats (turn off before release):** **K** adds $10,000, **R** resets the wallet, all tools, the excavator and the truck to the start. All cheat code is in one block marked `TEST CHEATS` near the end of the script; set `CHEATS_ON = false` (or delete the block) to turn them off.

### Tools and prices

Level 0 is what you start with (or "not owned"). Each tool has 3 paid levels, except the excavator itself, which you buy once.

| # | Tool | Level 0 | Level 1 | Level 2 | Level 3 |
|---|---|---|---|---|---|
| 1 | Shovel (scoops per dig) | Basic, 1 | Big, 2 ($60) | Steel, 3 ($250) | Giant, 5 ($700) |
| 2 | Bucket / Wheelbarrow (scoops per trip) | Small Bucket, 10 | Big Bucket, 20 ($100) | Wheelbarrow, 35 ($350) | Big Wheelbarrow, 60 ($900) |
| 3 | Sluice Box | 1 scoop / 1 s | 2 / 0.8 s ($120) | 4 / 0.6 s ($450) | 8 / 0.5 s ($1,200) |
| 4 | Small Excavator | not owned | owned ($4,000) | | |
| 5 | Excavator Bucket (scoops per bucketful) | Standard, 40 | Wide, 60 ($1,500) | Heavy, 90 ($4,000) | Monster, 130 ($9,000) |
| 6 | Excavator Engine (drive and arm speed) | Stock, 100% | Tuned, 130% ($2,000) | Turbo, 165% ($5,000) | Twin-Turbo, 210% ($11,000) |
| 7 | Excavator Arm (reach) | Short, ~4.3 m | Long, ~4.8 m ($1,200) | Extra-Long, ~5.3 m ($3,500) | Super-Long, ~5.8 m ($8,000) |

Items 5 to 7 need the excavator first (`needs: 'excavator'` in `TOOLS`). Their shop rows say "Buy the Small Excavator first" until you own it.

Gold: a sluiced scoop is worth about $2 on average.

Balance targets: the first upgrade takes about 1 minute of play, and the excavator takes about 20 to 30 minutes. A stock excavator cycle (scoop, swing, dump, swing back) takes roughly 7 s for 40 scoops, a bit better than a fully upgraded shovel and wheelbarrow and much less work. The three excavator upgrades cost about $45,000 in total. With the Power Sluice washing at most 16 scoops a second (about $32/s), a well-upgraded excavator can dig faster than the sluice washes, so dirt piles up in the sluice queue and keeps paying while you do other things.

The sluice box in the world changes with its level (`SLUICE_LOOKS` in the code): level 0 is a short wooden box with 6 riffles; level 1 is longer with 10 riffles and cross braces; level 2 is wider with two channels, 14 riffles, thick posts and top rails; level 3 is a 7.5 m blue steel machine with 20 riffles, a hopper, a water pump and a spray bar. It grows downhill from the high end, so the truck still dumps into the same spot.

The excavator also changes with its upgrades (`buildExcavator()`): yellow paint with dark details, tracks with pads, rollers and drive wheels, a cab with glass windows, seat and joysticks, a bent boom, a stick and a bucket joined by pins, and hydraulic rams that stretch as the arm moves.
- Bucket: bigger at each level (4 to 7 teeth); Heavy adds dark wear strips, Monster adds side cutters and chrome teeth.
- Engine: Stock has one small black exhaust; Tuned has a chrome exhaust, an air filter and hood vents; Turbo has twin chrome stacks; Twin-Turbo adds a hood scoop, stripes on the counterweight and an orange warning light on the cab roof.
- Arm: longer at each level; Long adds dark steel plates at the bend, Extra-Long adds hoses along the boom, Super-Long adds black stripes near the end of the stick.

Removed features: the Gold Pan and pan tub (version 3), and the Metal Detector with its buried nuggets (version 4). The excavator used to dig by itself (version 3); now you drive it.

Future ideas: nicer graphics and models, and saving progress.

## Code layout

- `index.html` holds everything: the page, the HUD, and the game code in one `<script type="module">`.
- Three.js is loaded through an import map from jsDelivr (version pinned to 0.170.0).
- The `SETTINGS` object at the top of the script holds the general tuning numbers (gold chances, nugget values, walking, excavator and truck speeds, truck size).
- The `TOOLS` object right below it lists every tool's levels, names, prices and stats. Change prices there. `TOOL_ORDER` sets the shop order and number keys. `EXCAVATOR_PARTS` lists the three excavator upgrades.
- The `state` object holds everything that changes during play (money, carried dirt, the sluice queue, tool levels, whether you're driving, the excavator's position and pose in `state.exc`, and the truck in `state.truck`).
- **Saving (for later):** load tool levels with `applyToolLevels(saved)`. It only reads the tools in `TOOL_ORDER`, so old `pan` and `detector` entries are ignored, and it keeps each level in range, so an old save with `excavator: 2` or `3` (from when the excavator had 3 levels) just means "owned". It also rebuilds the sluice, the excavator and the tool bar. The R cheat uses it with `{}`.
- `toolNow(id)` and `toolNext(id)` return the level you own and the one you can buy next. `ownsTool(id)` says whether it shows on the tool bar (tools marked `startsOwned` always do).
- `buildSluice(level)` rebuilds the sluice model; `upgradeSluiceModel()` also updates its collision box.
- Solids: `solids` is the list of things you can't walk or drive through. Each one is either a `Box3` or a turnable "rect" (`excavatorRect`, `truckRect`); `nearestPoint()` and `distanceFromPoint()` work with both.
- Excavator: `buildExcavator()` rebuilds the model from the current upgrades (the moving parts end up in `ex`), `poseExcavator()` moves the parts to match `state.exc` (including the hydraulic rams), and `driveExcavator(dt)` handles the controls, scooping and dumping. The excavator's own "forward" is +x. `enterExcavator()` and `exitExcavator()` get you in and out.
- Truck: `updateTruck(dt)` runs its parked, reversing, dumping and returning steps; `poseTruck()` moves it and tips the bed. `TRUCK_PARK` and `TRUCK_REAR_AT_SLUICE` set its route.
- Sounds: `startAudio()` creates the sound system on the first click. `tone()` and `noise()` make one-off sounds, `sfx` has one function per game sound, and `loops` holds the sounds that keep running (water, engines, hydraulics), which `updateSounds()` adjusts 10 times a second. `toggleMute()` switches everything on or off.
- `ICONS` has one drawing function per tool for the tool bar, and `updateToolbar()` redraws the bar (it runs after every purchase).

## Working with the user

The user is a beginner. Explain steps in plain language, keep the code readable with short comments, and prefer simple approaches over clever ones.
