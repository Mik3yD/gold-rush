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
6. There is one giant dirt pile for the whole game. When it's all dug up and washed, the game ends.

## Current state (version 6: one giant pile and an end screen)

- Flat ground, a giant dirt pile, a sluice box and a shop table, all made of plain shapes. Once you buy the excavator, it appears parked between the pile and the sluice.
- The HUD shows the wallet, the tons left in the dirt pile (always, with a bar that empties as you dig), what you're carrying, your shovel, the sluice queue and the excavator.
- Press **B** anywhere (or E at the shop table) to open the shop menu. Buy by clicking or pressing 1 to 6. Items you can't buy yet are greyed out (clicking them plays the "not enough money" sound). Dirt can't be bought.
- A tool bar along the bottom shows an icon for every tool you own, with a "Lv N" badge. Tools you haven't bought don't appear. Icons are drawn with the 2D canvas in code (no image files) and look better at each level: bigger, shinier metal, and a gold trim plus a glowing gold border at level 3. The excavator's icon has no badge; it shows both excavator upgrades at once (bigger bucket, more exhaust pipes) and gets the gold border when both are maxed.
- **Dirt amounts:** the game counts dirt in scoops, and **1 scoop = 0.1 ton** (`SETTINGS.tonsPerScoop`). The pile and the excavator bucket are shown in tons; the shovel, bucket/wheelbarrow and sluice queue in scoops. `tons(scoops)` turns scoops into a number for the screen (with commas, like "4,012.5").
- **The giant dirt pile:** all the dirt in the game. Its total is **`SETTINGS.pileTons` = 5,000 t** (change it there). It starts as a cone 14 m tall and 26 m across, towering over you and the excavator. Every shovel scoop and every excavator scoop takes that amount out of it (`state.pile`, in scoops). It shrinks as it empties (`pileSize()`: size goes with the square root of what's left, so the shrinking is easy to see), and it shrinks towards its "dig face" (`PILE_FACE`), the edge next to the excavator, so the excavator can reach it at every size, right down to the last scoop. A bare dirt patch the size of the full pile shows how much has been dug away. Dumping the excavator bucket back over the pile puts the dirt back.
  - How 5,000 t was chosen: a sluiced scoop is worth 2% × $50 (nugget) + 98% × 50% × 2 flakes × $1 ≈ **$1.98**, so a ton is worth about **$19.80**. Every tool and upgrade costs **$40,630** in total ≈ 2,050 t. The fully upgraded sluice washes at most 1.6 t/s (96 t a minute), so about 30 more minutes of play after that is about 2,900 t (slower digging stretches it towards 60 minutes). 2,050 + 2,900 ≈ 4,950, rounded to 5,000.
- **End of the game:** once the pile is empty, the HUD says to wash the last of your dirt. When there's no dirt left anywhere (pile, carried, sluice queue and excavator bucket: `checkForEnd()`), the end screen shows total gold found (`state.goldFound`, which spending doesn't lower), the number of big nuggets (`state.nuggets`) and time played (`state.timePlayed`, which doesn't count time on the pause screen). **Play again** starts a fresh game (`resetGame()`); **Keep walking around** closes it and lets you carry on (it won't show again).
- **Sounds:** every sound is made in code with the Web Audio API (no sound files): footsteps, digging, dumping, the sluice water (louder when washing, quieter further away), gold flake "tings", a big fanfare for nuggets, "ka-ching" for buying, a power-up for upgrading, a buzzer for not enough money, shop open/close chimes, a hollow "thunk" when the pile runs out, a drum roll and victory tune on the end screen, the excavator engine (revs up when you move the arm), hydraulic whine, and bucket scraping. **M** (or the speaker button in the top right) mutes everything. Sound starts after the first click, because browsers require that.
- **Excavator:** parked in one spot (`EXCAVATOR_SPOT`); it never drives. It isn't there at all until you buy it: `showExcavatorIfOwned()` hides the model and takes it out of `solids`, and its E prompt only works once you own it (`onlyIf` in `interactables`). Once bought, it appears between the pile and the sluice. Walk up and press **E** to climb into the cab (the camera moves to the seat). Controls inside: **arrow left/right** swing the arm (the cab turns with it), **arrow up/down** raise/lower the arm, **Q** (or hold left click) curls the bucket in to scoop, **F** (or hold right click) tips it out to dump, mouse looks around, **E** gets out. A controls panel shows on the right while you're in it, and a hint under the crosshair says what to do next.
  - Scooping: get the bucket into the dirt pile and hold Q. Once it bites, it keeps filling while you hold Q and it's over the pile. The dirt comes out of the pile as the bucket fills.
  - Dumping: tip the bucket far enough (`DUMP_PITCH`) and all the dirt falls out. Over the sluice it goes into the sluice queue; back over the pile it goes back on the pile; anywhere else it's spilled and lost. The dump spot is measured at the bucket's hinge. To clear the sluice's sides, raise the arm before swinging over it.
  - The arm has one fixed length (`BOOM_LENGTH`, `STICK_LENGTH`) that reaches both the pile (at every size, down to the last bit) and the sluice. If you move the pile, sluice or excavator, check the arm can still reach both.
  - The bucket can't go below the ground.
- No saving yet. Progress resets when you reload the page.
- **Test cheats (turn off before release):** **K** adds $10,000, **R** resets everything to the start (same as "Play again"), **P** digs away most of the pile, leaving 5 t (`CHEAT_PILE_LEFT`), to test the end screen. (M is the mute key, so the pile cheat is on P.) All cheat code is in one block marked `TEST CHEATS` near the end of the script; set `CHEATS_ON = false` (or delete the block) to turn them off.

### Tools and prices

Level 0 is what you start with (or "not owned"). Each tool has 3 paid levels, except the excavator itself, which you buy once.

| # | Tool | Level 0 | Level 1 | Level 2 | Level 3 |
|---|---|---|---|---|---|
| 1 | Shovel (scoops per dig) | Basic, 1 | Big, 2 ($60) | Steel, 3 ($250) | Giant, 5 ($700) |
| 2 | Bucket / Wheelbarrow (scoops per trip) | Small Bucket, 10 | Big Bucket, 20 ($100) | Wheelbarrow, 35 ($350) | Big Wheelbarrow, 60 ($900) |
| 3 | Sluice Box | 1 scoop / 1 s | 2 / 0.8 s ($120) | 4 / 0.6 s ($450) | 8 / 0.5 s ($1,200) |
| 4 | Small Excavator | not owned | owned ($4,000) | | |
| 5 | Excavator Bucket Size (tons per scoop) | Standard, 4 t | Wide, 6 t ($1,500) | Heavy, 9 t ($4,000) | Monster, 13 t ($9,000) |
| 6 | Excavator Speed (arm and bucket speed) | Stock, 100% | Tuned, 130% ($2,000) | Turbo, 165% ($5,000) | Twin-Turbo, 210% ($11,000) |
Items 5 and 6 need the excavator first (`needs: 'excavator'` in `TOOLS`). Their shop rows say "Buy the Small Excavator first" until you own it. Everything together costs $40,630.

Gold: a sluiced scoop is worth about $1.98 on average (including nuggets), so a ton is worth about $19.80, and the whole 5,000 t pile about $99,000.

Balance targets: the first upgrade takes about 1 minute of play, the excavator about 20 to 30 minutes, and after everything is bought there's about 30 to 60 minutes of pile left. If you change prices or gold values, redo the sum for `SETTINGS.pileTons`. A stock excavator cycle (scoop, swing, dump, swing back) takes roughly 7 s for 4 t (40 scoops), a bit better than a fully upgraded shovel and wheelbarrow and much less work. The two excavator upgrades cost about $32,500 in total. With the Power Sluice washing at most 16 scoops a second (about $32/s), a well-upgraded excavator can dig faster than the sluice washes, so dirt piles up in the sluice queue and keeps paying while you do other things.

The sluice box in the world changes with its level (`SLUICE_LOOKS` in the code): level 0 is a short wooden box with 6 riffles; level 1 is longer with 10 riffles and cross braces; level 2 is wider with two channels, 14 riffles, thick posts and top rails; level 3 is a 7.5 m blue steel machine with 20 riffles, a hopper, a water pump and a spray bar. It grows downhill from the high end (away from the excavator), so the excavator can still reach it.

The excavator also changes with its upgrades (`buildExcavator()`): yellow paint with dark details, tracks with pads, rollers and drive wheels, a cab with glass windows, seat and joysticks, a bent boom with steel plates and hoses, a stick and a bucket joined by pins, and hydraulic rams that stretch as the arm moves.
- Bucket Size: bigger at each level (4 to 7 teeth); Heavy adds dark wear strips, Monster adds side cutters and chrome teeth.
- Speed: Stock has one small black exhaust; Tuned has a chrome exhaust, an air filter and hood vents; Turbo has twin chrome stacks; Twin-Turbo adds a hood scoop, stripes on the counterweight and an orange warning light on the cab roof.

Removed features: the Gold Pan and pan tub (version 3), the Metal Detector with its buried nuggets (version 4), in version 5 the dump truck, driving the excavator, the Excavator Arm upgrade (the arm now has one fixed length) and the old Excavator Engine upgrade (now Excavator Speed), and in version 6 buying new loads of dirt and the Dirt Loads upgrade (there's one giant pile instead). The excavator used to dig by itself (version 3).

Future ideas: nicer graphics and models, and saving progress.

## Code layout

- `index.html` holds everything: the page, the HUD, and the game code in one `<script type="module">`.
- Three.js is loaded through an import map from jsDelivr (version pinned to 0.170.0).
- The `SETTINGS` object at the top of the script holds the general tuning numbers (gold chances, nugget values, walking, tons per scoop, **the total dirt in the game (`pileTons`)**, excavator arm speeds).
- The `TOOLS` object right below it lists every tool's levels, names, prices and stats. Change prices there. `TOOL_ORDER` sets the shop order and number keys. `EXCAVATOR_PARTS` lists the two excavator upgrades.
- The `state` object holds everything that changes during play (money, carried dirt, the sluice queue, the pile, the end-screen numbers (`goldFound`, `nuggets`, `timePlayed`, `finished`), tool levels, whether you're in the excavator (`inExcavator`), and the arm's pose and bucket load in `state.exc`).
- **Saving (for later):** load tool levels with `applyToolLevels(saved)`. It only reads the tools in `TOOL_ORDER`, so old `pan`, `detector`, `engine`, `arm` and `dirtLoad` entries are ignored, and it keeps each level in range, so an old save with `excavator: 2` or `3` (from when the excavator had 3 levels) just means "owned". It also rebuilds the sluice, the excavator and the tool bar. `resetGame()` uses it with `{}`. A save should also store `state.pile`, `goldFound`, `nuggets` and `timePlayed` (then call `updatePile()`).
- `toolNow(id)` and `toolNext(id)` return the level you own and the one you can buy next. `ownsTool(id)` says whether it shows on the tool bar (tools marked `startsOwned` always do).
- `buildSluice(level)` rebuilds the sluice model; `upgradeSluiceModel()` also updates its collision box.
- Dirt pile: `pileSize()` works out its radius and height, `updatePile()` resizes and moves the cone and its footprint (`pileCircle`), `takeFromPile(scoops)` removes dirt (and announces when it's empty), `addToPile(scoops)` puts some back. `PILE_RADIUS`/`PILE_HEIGHT` are its full size, `PILE_FACE`/`PILE_DIRECTION` where it sits relative to the excavator.
- End of the game: `checkForEnd()` runs every frame, `showEndScreen()` and `closeEndScreen()` show and hide it, `resetGame()` starts over, `formatTime()` writes the time played.
- Solids: `solids` is the list of things you can't walk through. Each one is a `Box3`, a turnable "rect" (`excavatorRect`) or a "circle" (`pileCircle`); `nearestPoint()` and `distanceFromPoint()` work with all three.
- Excavator: `buildExcavator()` rebuilds the model from the current upgrades (the moving parts end up in `ex`), `poseExcavator()` moves the arm and bucket to match `state.exc` (including the hydraulic rams), and `operateExcavator(dt)` handles the controls, scooping and dumping. The excavator's own "forward" is +x. `enterExcavator()` and `exitExcavator()` get you in and out; `excavatorHint()` is the hint under the crosshair.
- Sounds: `startAudio()` creates the sound system on the first click. `tone()` and `noise()` make one-off sounds, `sfx` has one function per game sound, and `loops` holds the sounds that keep running (water, excavator engine, hydraulics), which `updateSounds()` adjusts 10 times a second. `toggleMute()` switches everything on or off.
- `ICONS` has one drawing function per tool for the tool bar, and `updateToolbar()` redraws the bar (it runs after every purchase).

## Working with the user

The user is a beginner. Explain steps in plain language, keep the code readable with short comments, and prefer simple approaches over clever ones.
