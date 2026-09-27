# Gold Rush

A first-person 3D browser game about gold mining, built with plain HTML + JavaScript and Three.js loaded from a CDN. No build step, no npm, and nothing to install.

## The game idea

The player is a gold miner walking around a small outdoor dig site in first person (WASD to move, mouse to look).

Core loop:
1. Dig dirt from a dirt pile into a bucket.
2. Carry it to a sluice box and dump it in.
3. The sluice washes the dirt and finds gold flakes. Each flake adds money to the wallet shown on screen. Flakes it misses wash into a tailing pond, where filters catch some of them for you to collect.
4. Once in a while a big nugget turns up, worth much more.
5. Spend money on better tools and equipment so you can dig and process more dirt, faster.
6. There is one giant dirt pile for the whole game. When it's all dug up and washed, the game ends.

## Current state (version 10: saving)

- **Saving and loading:** the game saves itself in the browser (`localStorage`, key `goldRush.save`) and carries on exactly where you left off.
  - **What's saved** (`makeSave()`): wallet, dirt left in the pile, dirt you're carrying, the sluice queue, pond fill, gold on the filters, the rock pile, every tool and upgrade level (`state.levels`), cash bundles found, total gold, nuggets, time played, whether the game is finished, the excavator (arm swing, bucket tilt, dirt in the bucket, whether you're in the cab and where you're looking), where you're standing and looking, the last shop tab, and the settings (sound, graphics quality, excavator controls guide open or closed).
  - **When:** every 30 seconds (`AUTOSAVE_SECONDS`), right after every purchase (`buy()`) and cash pickup (`collectCash()`), and when the page is closed or hidden (`pagehide`, `visibilitychange`: switching apps on a phone counts). Changing a setting saves quietly. A small "Saved" note flashes in the bottom left (`showSaved()`, `#saved`; bottom middle on touch screens). Nothing is saved until you've pressed play once (`everPlayed`), so just opening the page doesn't make a save.
  - **Loading:** on page load, `readSave()` + `loadSave()` put everything back straight away (behind the start screen). The start screen then says **Continue** and shows a **New Game** button (`updateStartScreen()`); New Game asks "Are you sure? This erases your progress." first (`#confirm`). New Game keeps your settings.
  - **Settings** (a button on the start/pause screen, `#settings`): sound, graphics and controls guide switches, and **Backup**: a code to copy (`makeBackupCode()`: `GOLDRUSH-` + the save as base64 text) and a box to paste one in on another device or browser (`readBackupCode()`, which replaces the current game). Esc closes it; the game's keys are off while it's open (`menuOpen()`), so typing a code doesn't press M or G.
  - **Old saves** (`upgradeSave()`, `SAVE_VERSION` = 1): every value is checked as it loads (`savedNumber()` keeps it a proper number and in range). Anything missing starts at its normal starting value, anything unknown (old tools, old fields) is ignored, levels past the maximum are capped, and a save that can't be read at all starts a new game. **If you change what's in a save in a way old saves can't handle, raise `SAVE_VERSION` and add a step to `upgradeSave()`.** New upgrades and new state need nothing: they just start at 0 / their default in old saves. If you add something new to `state` that should survive a reload, add it to both `makeSave()` and `loadSave()`.

### Version 9: phones and tablets

- **Upgrades:** 17 things to buy, each with **12 levels** (the excavator itself is one purchase): 193 purchases, **$220,120** in total. They're in four shop tabs:
  - **Tools:** Shovel, Bucket / Wheelbarrow (both owned from the start), then two new tools you unlock in order: **Pickaxe → Classifier Screen**.
  - **Sluice:** an upgrade tree with 8 categories: Mesh, Nozzles, Extended Length, Extra Water, Higher Pressure, More Pumps, Hoses, Generators. Some need others first (see below).
  - **Tailing Pond:** Pond Size and Filters.
  - **Excavator:** the Small Excavator (needs the Classifier Screen; the last and most expensive tool), then Bucket Size and Speed.
- **Gold:** every scoop of dirt holds about $2.00 of gold on average: a 1% nugget worth $50 ($0.50; nuggets are heavy and always caught) and a 75% chance of 1 to 3 flakes at $1 ($1.50, but only the flakes the washer catches). The sluice catches **Mesh % × Nozzles %** of the flakes (45% × 70% = 31.5% at the start, 95% × 100% at the top). Missed flakes go to the pond, where **Filters %** of them collect on the filters; walk to the pond and press **E** to collect them (`state.pondGold`, `collectPondGold()`).
- **Sluice speed** (scoops a second) = `SETTINGS.sluiceBaseSpeed` (1.5) × the boost from Length, Extra Water, Pressure, Pumps, Hoses and Generators (each ×1.04 per level, ×1.58 at 12, from `SLUICE_BOOST`) ÷ (1 − the classifier's rock share). So 1.5/s at the start and 40/s (4 t/s) fully upgraded (`sluiceSpeed()`).
- **Sluice dependencies** (`needs(n)` in `TOOLS`; the shop shows "Needs Generators Lv 4" on locked rows and plays `sfx.locked()`):
  - More Pumps Lv N needs Generators Lv N.
  - Higher Pressure Lv N needs Hoses Lv N and Nozzles Lv N.
  - Extra Water Lv N needs More Pumps Lv ⌊N/2⌋.
  - Extended Length Lv N needs Extra Water Lv ⌊N/2⌋.
  - The new tools: Classifier needs the Pickaxe, Excavator needs the Classifier, Bucket Size and Speed need the Excavator ("Buy the ... first").
- **Tailing pond:** past the sluice's low end at `POND_SPOT` (18.2, -7), fed by a wooden flume. Every washed scoop sends 0.1 t of mud in (minus the rocks the classifier took out, `state.pond` in tons); it settles at Pond Size's `settles` t a minute. When it's full (`pondFull()`), the sluice washes at `SETTINGS.pondFullSpeed` (30%), the HUD warns, the water overflows and `sfx.pondFull()` plays. The water gets muddier and a silt heap rises as it fills.
- **Pickaxe:** without it you dig once per click, at most 2 a second (`SETTINGS.digPause`, `state.digTimer`). With it, hold E or the left mouse button at the pile to keep digging (`keepDigging()`), 2.5 to 7 digs a second.
- **Classifier Screen:** stands beside the sluice's high end and removes 8% to 42% rocks from all dirt going into the sluice (`addToSluice()`), which makes the sluice wash faster and puts less mud in the pond. The rocks go on a rock pile that grows (`state.rocks`, `rockPile`, solid once it's there). It shakes from level 6 and becomes a spinning trommel at 11.
- **Graphics** (everything is built in code: no image files and no downloaded models):
  - **World:** an outdoor dig site with a sky (gradient, drifting clouds and a sun, in a shader), soft sunlight with shadows, haze in the distance, dusty ground in the middle that turns to grass at the edges, gentle hills far away, rocks, grass tufts, pine and leafy trees in the distance, a rail fence around the edge (with a gap where the pile spills over it), a tent, crates and barrels.
  - **Textures** are painted on hidden canvases when the page loads (`TEX`: ground specks and pebbles, loose dirt, wood planks, worn yellow paint, grimy steel, scratched metal, water ripples, foam, awning stripes, sluice mat, wire mesh grid, particle pictures).
  - **Materials:** `materialFor(color)` gives every colour one shared material, and `SURFACES` says which colours get a special surface (worn paint, wood grain, shiny metal, chrome, gold...). `box()` and `cylinder()` take a colour or a ready-made material.
  - **Dirt pile:** a lumpy heap (`makeHeapGeometry()`, bumpiness `PILE_LUMPS`) with clods and stones on it. It still shrinks with the tonnage. Small heaps of the same kind show the dirt waiting in the sluice and the dirt in the excavator bucket.
  - **Sluice** (`buildSluice()`), every level of every category changes it:
    - Length: 4 m to 10 m (+0.5 m a level, growing downhill from the fixed high end), 6 to 26 riffles and more legs. It's wood at 0-3, braced wood at 4-7, steel with rails at 8-11, and a blue power box with a hopper grate and safety stripes at 12.
    - Extra Water: wider, two channels from 6, deeper and faster water.
    - Mesh: the mat changes (burlap, rubber, ribbed, moss, carpet), and from level 5 a metal mesh lies over the riffles, finer and shinier every level, gold at 12.
    - Nozzles: spray bars with 3 to 14 nozzles (two bars from 6; chrome from 7; gold tips at 12) and spray particles.
    - Pressure: a gauge whose needle points higher every level.
  - **Equipment pad** (`buildSluiceGear()`, `PAD`): the gravel pad on the camp side of the sluice.
    - Water tanks (Extra Water): barrel → two barrels → caged tote → big tank → steel tanks.
    - Pumps: 1/2/3/4 pumps, red/orange/yellow/blue, bigger within each group, flywheels spinning.
    - Generators: 1 to 3, portable → open-frame → enclosed genset → trailer genset, with exhaust smoke and power cables.
    - Hoses: thicker every level; green → black rubber → blue lay-flat → steel-braided, with gold fittings at 12. They run from the pumps to the spray bar, plus suction hoses from the pond.
    - Pressure: a red pressure tank from 4 and a valve manifold from 8, chrome at 12.
  - **Pond** (`buildPond()`):
    - Pond Size: radius 2.5 to 5.5 m, a higher bank; a liner at 4-7, a rock rim from 8, a spillway at 11, a stone wall at 12.
    - Filters: one more thing every level at the inlet: straw bales, a silt fence, riffle flumes, moss mats, a gravel bank, a baffle, a carpet filter, a floating boom, a skimmer box, a pump-back line, then a gold-trimmed filter house.
    - Gold waiting on the filters twinkles.
  - **Excavator:** worn yellow paint, grimy tracks, glass that reflects the sky, two boom rams plus the stick and bucket rams (yellow barrels with chrome rods), hoses, work lights, a mirror, a hand rail, and exhaust smoke while you're in it. The bucket shows a heap of dirt as it fills.
  - **Effects** (`makeParticles()`: `dust`, `clods`, `glitter`):
    - flying dirt and dust when digging, scooping and dumping (`dirtBurst()`, `dirtFalls()`)
    - twinkling gold sparkles for flakes (`sparkle()`)
    - for nuggets, `nuggetShine()`: a gold nugget pops up spinning, with rays of light, a sparkle burst, a flash of golden light and a golden glow around the screen
    - splashes into the flume and the pond, spray from the spray bars, generator smoke (`generatorSmoke()`), and overflow splashes when the pond is full
  - **Screen display:** gold-rush style: dark wood panels with brass edges, the Rye (western) and Bitter fonts from Google Fonts, a gold coin wallet that counts up with a "+$" popup, keyboard keys drawn as keycaps, a tabbed shop with parchment cards, tool icons, level pips and gold price tags.
  - **Graphics quality:** press **G** to switch between High and Low (`QUALITY`, `setQuality()`). Low draws fewer pixels on high-resolution screens, turns off shadows, and shows a third of the grass and half the particles. The frame rate is shown in the bottom right corner (`countFps()`); if it stays under 30 on High, the game suggests pressing G. Phones and tablets (`TOUCH_DEVICE`) start on Low, and their High is capped at 1.5× pixels instead of 2×; on a touch screen you tap the Graphics label (top right) to switch.
- **Shop:** press **B** anywhere (or E at the shop table).
  - Four tabs (`TABS`): click one or press **← / →**. The shop remembers the last tab.
  - The number keys 1 to 8 buy the row with that number on the open tab.
  - Each row shows "Lv N / 12" with 12 pips, Now / Next, the price, and a red "Needs ..." line when it's locked.
  - Rows you can't buy are greyed out; clicking them plays the buzzer or the "locked" sound and says why.
  - A summary line at the top of each tab: tool unlock order, sluice speed / catch % / pond, pond fill and gold, excavator stats.
- **Tool bar** along the bottom (`TOOLBAR`): Shovel, Bucket, Pickaxe, Classifier, **Sluice**, **Pond**, Excavator (only the ones you own).
  - The Sluice and Pond icons show all their upgrades at once, with badges like "Lv 34/96".
  - Icons are drawn with the 2D canvas in code (`ICONS`) for levels 0 to 12: the metal goes from grey to chrome (`metal(level)`), details appear every few levels, and there's a gold trim plus a glowing gold border when maxed.
  - The shop has its own icon for every sluice and pond category too.
- **HUD** (top left): wallet, tons left in the pile (with a bar), carrying, shovel, sluice queue and speed, pond fill (with a bar), gold waiting on the filters, a "Pond FULL" warning, and the excavator.
- **Dirt amounts:** the game counts dirt in scoops, and **1 scoop = 0.1 ton** (`SETTINGS.tonsPerScoop`). The pile and the excavator bucket are shown in tons; the shovel, bucket/wheelbarrow and the sluice queue in scoops. The pond is in tons. `tons(scoops)` turns scoops into a number for the screen (with commas).
- **The giant dirt pile:** all the dirt in the game.
  - Its total is **`SETTINGS.pileTons` = 19,000 t** (change it there).
  - It starts as a cone 14 m tall and 26 m across.
  - It shrinks as it empties (`pileSize()`: size goes with the square root of what's left), towards its "dig face" (`PILE_FACE`) next to the excavator, so the excavator can reach it at every size.
  - A bare dirt patch the size of the full pile shows how much has been dug away. Dumping the excavator bucket back over the pile puts the dirt back.
  - How 19,000 t was chosen: a simulated player (buying the cheapest thing available and saving up for each new tool) needs about **11,400 t** of washed dirt to buy everything ($220,120, at about $19 a ton including pond gold). That's about 2¼ hours: the pickaxe at about 2 min, the classifier at about 13, the excavator at about 105.
  - Fully upgraded, the sluice washes 40 scoops a second (4 t/s), so 30 more minutes is about 7,200 t. 11,400 + 7,200 ≈ 18,600, rounded to 19,000 (a player who doesn't keep the sluice full gets closer to an hour).
- **End of the game:** once the pile is empty, the HUD says to wash the last of your dirt. When there's no dirt left anywhere (pile, carried, sluice queue and excavator bucket: `checkForEnd()`), the end screen shows total gold found (`state.goldFound`, which spending doesn't lower), the number of big nuggets (`state.nuggets`) and time played (`state.timePlayed`, which doesn't count time on the pause screen). **Play again** starts a fresh game (`resetGame()`); **Keep walking around** closes it and lets you carry on (it won't show again).
- **Sounds:** every sound is made in code with the Web Audio API (no sound files).
  - Running sounds (`loops`, adjusted by distance in `updateSounds()`):
    - sluice water (fuller with Extra Water / Length, brighter with Pressure)
    - pumps (`makePumpSound()`: motor whine plus churn; deeper and louder with more pumps)
    - generators (a chugging engine, louder with more generators, revving while washing)
    - spray hiss (`makeHissSound()`, sharper with pressure)
    - water trickling into the pond
    - the excavator engine and hydraulics
  - One-off sounds (`sfx`): footsteps, digging, dumping, flake "tings", a nugget fanfare, "ka-ching" for buying, a power-up for upgrading, a buzzer for not enough money, a "locked" sound, a tab click, shop open/close chimes, pond gold (splash and coins), rocks rattling down the classifier, a pond-full gurgle, a "thunk" when the pile runs out, bucket scraping, and a drum roll and victory tune on the end screen.
  - **M** (or the speaker button) mutes everything. Sound starts after the first click, because browsers require that.
  - Phones: `startAudio()` also runs on every tap (`touchend`, which is when iPhones allow sound) and when you tap to play again after switching apps. It uses `webkitAudioContext` on older iPhones, and asks newer iPhones to play even with the silent switch on (`navigator.audioSession.type = 'playback'`).
- **Excavator:** parked in one spot (`EXCAVATOR_SPOT`); it never drives.
  - It isn't there at all until you buy it: `showExcavatorIfOwned()` hides the model and takes it out of `solids`.
  - Walk up and press **E** to climb into the cab. Controls: **A/D** swing the arm, **Q** (or hold left click) curls the bucket in to scoop, **F** (or hold right click) tips it out to dump, mouse looks around, **E** gets out. A controls guide (on the right) and a hint under the crosshair help.
  - **H** (only while in the excavator) folds the guide away into a tiny "H show controls" tab in the corner, and back again. You can also click its title or tab while the mouse is free (paused with Esc); during play the mouse turns the camera, so clicks don't reach it. It's open the very first time; after that open or closed is saved with the game's settings (see Saving and loading; `toggleExcavatorHelp()`, `updateExcavatorHelp()`), and it can also be switched in Settings. The old separate key `goldRush.excavatorHelp` is still read as the starting value for players who closed it before saving existed.
  - Scooping: swing the bucket above the dirt pile and hold Q. It fills as it curls, for as long as it's above the pile (`bucketOverPile()`, measured at the bucket's hinge).
  - Dumping: tip the bucket past `DUMP_PITCH`. Over the sluice it goes into the sluice (through the classifier); over the pile back on the pile; anywhere else it's spilled (`dumpTarget()`).
  - The arm stays at `EXCAVATOR_START.boom` and has one fixed length (`BOOM_LENGTH`, `STICK_LENGTH`). Swinging all the way round, the bucket passes the pile (swing about -2.46 to -1.42) and the sluice (0.55 to 1.15), at the smallest and largest upgrades. If you move the pile, sluice or excavator, check it can still reach both.
  - Upgrades change its look (`buildExcavator()`):
    - Bucket Size: 15 to 30 t and 4.5% bigger per level, 4 → 8 teeth, wear strips, side plates, side cutters, a lip plate, chrome teeth, and gold trim at 12.
    - Speed: chrome exhaust, air filter, vents, taller stack, twin stacks, a turbo pipe, a hood scoop, stripes, a beacon, triple stacks, chrome rams (`ramColor`), and gold stripes at 12.
- **Hidden cash:** 7 bundles of bills (tied with string) are hidden around the camp, worth $25 to $400 each, **$1,000 in total**. Some are easy to spot, a couple are really well hidden, and the better hidden ones are worth more. Each gives off a faint twinkle now and then (`twinkleCash()`). Walk up and press **E** to pick one up: a cash sound (`sfx.cash()`), the money goes in the wallet (not into `goldFound`, since it isn't gold), a "Found $N!" message and a burst of sparkles. A small "Cash found: 2/7" counter sits in the bottom left, and the end screen shows how many you found. The start screen hints that cash is hidden. The spots are listed in `CASH_BUNDLES` in the code (**spoilers!**); some hide behind scenery added for them (`CAMP_BOULDERS`, `CAMP_TREES`, `CAMP_BUSH`: two boulders, three trees and a bush inside the fence, all solid). If you move the camp props, the sluice area or that scenery, check the bundles still sit where they should and can be reached. Balance: $1,000 is a nice early boost (the first upgrades cost $25 to $60, the Pickaxe $150) but under 0.5% of the $220,120 all the upgrades cost.
- **Phones and tablets (touch controls):** everything works with fingers, and keyboard and mouse still work on computers.
  - **Touch mode** (`touchMode`, the `touch` class on `<body>`) is on from the start on phones and tablets (`TOUCH_DEVICE`: the main pointer is "coarse"), switches on with any touch, and off again when you use a mouse (`setTouchMode()`, from `pointerdown`). The touch buttons only show in touch mode while playing (`body.touch.playing`).
  - **Playing and pausing:** phones can't capture the mouse, so `setPlaying(on)` starts and pauses the game in both modes (mouse: from `pointerlockchange`), and `resumePlaying()` is "back to the game" (tap to play, closing the shop or end screen). In touch mode it goes full-screen and locks landscape where the browser allows it (`goFullScreen()`, Android). A pause button (top right), switching apps and turning the phone upright pause it.
  - **Walking:** a joystick appears wherever your left thumb goes down on the left half of the screen (`stick`, `STICK_RADIUS` 60 px, `#touch-area`); how far you push it sets the speed (`movePlayer()`). Dragging anywhere else looks around (`lookAround()`, `SETTINGS.touchSensitivity`).
  - **Buttons** (`touchButton()`): **Interact** (does E; its label says what: Dig, Dump, Collect, Shop, Get in, Pick up, from each `interactables` entry's `label`; dimmed when nothing's in reach), **Dig** (dig at the pile, hold with a pickaxe: `keys.TouchDig`), **Shop**, pause, and the speaker button. `updateTouchButtons()` runs every frame.
  - **Excavator:** ◀ ▶ Swing on the left, Scoop, Dump and Get out on the right. They hold down the same `keys` as the keyboard (`data-key` on the buttons: KeyA, KeyD, KeyQ, KeyF). The arm doesn't go up and down on purpose (see Excavator). The keyboard guide is hidden in touch mode.
  - **Words:** on a touch screen, hints and messages talk about buttons instead of keys: `forScreen(text)` swaps them using `TOUCH_WORDS` ("Press E" → "Tap Interact", "hold Q" → "hold Scoop"...). Text written once (shop descriptions, start screen, shop tabs) has both versions, and CSS shows the right one (`.only-touch`, `.only-desktop`, `bothVersions()`). If you add a hint with a key in it, check it reads well on a phone too.
  - **Layout:** on a touch screen the tool bar moves to the top middle (smaller icons), Graphics, pause and sound sit in a row at the top right, and the cash counter at the bottom middle. Short screens (under 540 px tall: phones held sideways) get a smaller HUD, start screen and end screen, and a full-screen shop with a sticky header (money and a big ✕) and tabs ("Tailing Pond" becomes "Pond"). Everything keeps clear of notches (`env(safe-area-inset-...)`).
  - **Portrait:** a "Please rotate your phone" message covers the game (`#rotate`) and pauses it.
- **Installable app (PWA):** players can add Gold Rush to their home screen and open it full-screen like an app, and it works with no signal once it has loaded once.
  - `manifest.json` gives the name, colours, full-screen landscape and icons. The icons in `icons/` (a gold nugget and a pickaxe on a wooden badge) are drawn by `icons/make-icons.ps1` (run it again to change them). `apple-touch-icon.png` is the iPhone's, and `icon-maskable-512.png` has its picture in the middle for phones that cut icons into circles.
  - `sw.js` is the service worker. When installing it saves the game's files, Three.js and the Google Fonts (`GAME_FILES`). After that the game's own files come from the internet when possible (so updates arrive) and from the saved copy when offline; Three.js and the fonts always come from the saved copy. **If you add a file the game needs (or change the Three.js version), add it to `GAME_FILES` and change the version in `CACHE`.**
  - Service workers only run on https (or `localhost`), so none of this works when `index.html` is opened straight from disk; the game still plays normally then. The game is published on GitHub Pages at https://mik3yd.github.io/gold-rush/ (from the `main` branch).
- **Test cheats (off by default):** add `?cheats` to the end of the game's address (for example `.../index.html?cheats`) to turn them on; the browser tab's title then says "(test cheats on)" and a message lists the keys. **K** adds $25,000, **R** resets everything to the start (same as "Play again"), **P** digs away most of the pile, leaving 5 t (`CHEAT_PILE_LEFT`), to test the end screen, **O** fills the tailing pond to test the slowdown. All cheat code is in one block marked `TEST CHEATS` near the end of the script; `CHEATS_ON` reads the address. To have them always on while working, set `CHEATS_ON = true`, but put it back before sharing the game.

### Tools and prices

Level 0 is what you start with (or "not owned"). Prices for levels 1 to 12:

| Tab | Upgrade | What it does (level 0 → 12) | Prices, levels 1-12 |
|---|---|---|---|
| Tools | Shovel | scoops per dig 1 → 16 | 50, 62, 77, 96, 120, 150, 180, 230, 280, 350, 430, 540 |
| Tools | Bucket / Wheelbarrow | scoops per trip 10 → 120 (buckets, wheelbarrows, Mini Dumper) | 60, 75, 94, 120, 150, 190, 230, 290, 370, 460, 570, 720 |
| Tools | Pickaxe | hold to dig, 2.5 → 7 digs a second | 150, 180, 220, 260, 320, 390, 470, 560, 680, 820, 990, 1,200 |
| Tools | Classifier Screen (needs Pickaxe) | removes 8% → 42% rocks (sluice x1.09 → x1.72) | 400, 470, 550, 650, 770, 900, 1,100, 1,300, 1,500, 1,700, 2,000, 2,400 |
| Sluice | Mesh | catches 45% → 95% of the fine gold | 30, 43, 61, 87, 120, 180, 250, 360, 520, 740, 1,100, 1,500 |
| Sluice | Nozzles | breaks up 70% → 100% of the clay; 0 → 14 nozzles | 40, 57, 80, 110, 160, 230, 320, 450, 640, 900, 1,300, 1,800 |
| Sluice | Extended Length | 4 m → 10 m, washing x1.58 | 40, 57, 80, 110, 160, 230, 320, 450, 640, 900, 1,300, 1,800 |
| Sluice | Extra Water | washing x1.58 | 50, 70, 99, 140, 190, 270, 380, 540, 760, 1,100, 1,500, 2,100 |
| Sluice | Higher Pressure | 10 → 120 psi, washing x1.58 | 80, 110, 150, 210, 300, 420, 580, 800, 1,100, 1,600, 2,200, 3,000 |
| Sluice | More Pumps | 0 → 4 pumps, washing x1.58 | 100, 140, 190, 260, 360, 490, 670, 930, 1,300, 1,700, 2,400, 3,300 |
| Sluice | Hoses | washing x1.58 | 25, 36, 51, 72, 100, 150, 210, 290, 420, 590, 840, 1,200 |
| Sluice | Generators | 0 → 60 kW (1 → 3 generators), washing x1.58 | 80, 110, 150, 210, 290, 400, 550, 750, 1,000, 1,400, 2,000, 2,700 |
| Pond | Pond Size | holds 40 → 2,000 t, settles 3 → 100 t a minute | 60, 83, 110, 160, 220, 300, 420, 580, 800, 1,100, 1,500, 2,100 |
| Pond | Filters | gets back 10% → 85% of the gold the sluice misses | 50, 69, 96, 130, 180, 250, 350, 490, 680, 940, 1,300, 1,800 |
| Excavator | Small Excavator (needs Classifier) | one purchase | 12,000 |
| Excavator | Bucket Size | 15 t → 30 t per scoop | 2,000, 2,200, 2,500, 2,800, 3,200, 3,600, 4,000, 4,500, 5,100, 5,700, 6,400, 7,200 |
| Excavator | Speed | 100% → 220% arm speed | 2,500, 2,800, 3,100, 3,500, 3,900, 4,300, 4,800, 5,400, 6,000, 6,700, 7,500, 8,400 |

Totals: Tools $25,874, Sluice $60,378, Pond $13,768, Excavator $120,100, everything **$220,120**. If you change prices or gold values, redo the sum for `SETTINGS.pileTons` (the working is in the comment next to it).

Removed features: the Gold Pan and pan tub (version 3), the Metal Detector with its buried nuggets (version 4), in version 5 the dump truck, driving the excavator, the Excavator Arm upgrade and the old Excavator Engine upgrade (now Excavator Speed), in version 6 buying new loads of dirt and the Dirt Loads upgrade, and in version 8 the one-piece Sluice Box upgrade (now the Sluice tab) and the sluice's puddle (the water now runs down a flume into the pond). A Highbanker (a second washer next to the pile) was added in version 8 and then taken out again. The excavator used to dig by itself (version 3).


## Code layout

- `index.html` holds everything: the page, the HUD, and the game code in one `<script type="module">`.
- For the installable app: `manifest.json`, `sw.js` (the service worker, registered near the end of the script) and `icons/` (with `make-icons.ps1`, which draws them).
- **Script order:**
  1. settings and tools
  2. the scene and renderer
  3. maths and noise helpers (`fbm()` makes the natural bumps)
  4. textures (`TEX`) and materials
  5. sky and lights
  6. positions of the big things (pile, `POND_SPOT`, `PAD`), then the ground (`groundHeight()`, `grassiness()`, `groundColor()`)
  7. grass, rocks, trees, fence, pile
  8. sluice, pond, equipment pad, classifier (`buildSluiceArea()` builds all four in the right order)
  9. signs, shop, camp props, hiding spots (boulders, camp trees, bush), solids
  10. excavator, sounds, effects, hidden cash
  11. game logic, shop (with `TOUCH_WORDS`), tool bar, controls, touch controls, HUD
  12. quality setting, end of game, saving and loading (with Settings and New Game), cheats and the game loop
- The camp props (tent, crates, barrels) are solid: their boxes are added to `solids`. `crowded()` keeps rocks and grass off the pile, sluice, pad, pond, shop and excavator.
- Three.js is loaded through an import map from jsDelivr (version pinned to 0.170.0).
- The `SETTINGS` object at the top of the script holds the general tuning numbers: gold chances and values, `sluiceBaseSpeed`, `pondFullSpeed`, `digPause`, walking, tons per scoop, **the total dirt in the game (`pileTons`)**, excavator arm speeds.
- The `TOOLS` object right below it lists every upgrade's levels (one line each: name, price, stats), plus its `tab`, `title`, `about`, `describe(level)` and `needs(n)`. Change prices there.
  - `TABS` sets the shop tabs, their order and number keys; `TOOL_ORDER` is every id in order.
  - `SLUICE_PARTS`, `POND_PARTS` and `EXCAVATOR_PARTS` group the upgrades.
  - `SLUICE_BOOST` is the shared ×1.04-per-level speed boost.
- The `state` object holds everything that changes during play:
  - money, carried dirt, the sluice queue (`washTimer` adds up partly washed scoops)
  - the pond (`pond` tons, `pondGold` dollars), `rocks`, `digTimer`
  - the pile, the end-screen numbers (`goldFound`, `nuggets`, `timePlayed`, `finished`)
  - tool levels, whether you're in the excavator (`inExcavator`), and the arm's pose and bucket load in `state.exc`
- **Saving and loading** (the section just before the test cheats; see "Saving and loading" above for what and when): `makeSave()` builds the save object, `saveGame(showNote)` writes it, `readSave()` reads it, `upgradeSave()` brings old saves up to date, and `loadSave(save)` puts the game back (it's used for the saved game on page load and for pasted backup codes). `loadSave()` uses `applyToolLevels(saved)`, which only reads the ids in `TOOL_ORDER` (so old `pan`, `detector`, `engine`, `arm`, `dirtLoad` and `sluice` entries are ignored), keeps each level in range and rebuilds the sluice area, the excavator and the tool bar; and `applyCashFound(saved)`, which ignores unknown bundle ids and hides the ones already found. `resetGame()` uses both with empty lists (and leaves the settings alone).
- **Hidden cash:** `CASH_BUNDLES` lists each bundle's `id`, spot, `turn` and `value`. `makeCashBundle()` builds the model (bill textures `TEX.bill` and `TEX.billEdge`), `collectCash(bundle)` picks one up, `showCashBundles()` shows the ones not found yet, and `twinkleCash(dt)` makes the faint sparkles. Each bundle has an entry in `interactables`. `resetGame()` hides them all again with `applyCashFound([])`.
- **Helpers:**
  - `toolNow(id)` and `toolNext(id)` return the level you own and the one you can buy next.
  - `ownsTool(id)` says whether a tool shows on the tool bar (tools marked `startsOwned` always do).
  - `missingNeed(id)` returns the "Needs ..." text, or ''.
  - `sluiceSpeed()`, `sluiceRecovery()` and `pondFull()` give the sluice's numbers.
- **Sluice area:**
  - `buildSluice()` (reads the levels itself), `buildPond()` + `buildFlume()`, `buildSluiceGear()` (its machines' boxes are `gearSolids`, swapped in and out of `solids`), and `buildClassifier()`.
  - `upgradeSluiceModel()` rebuilds them all and refreshes `sluiceBounds` and `updateSolids()` (the rock pile's circle joins `solids` once it exists).
  - `sluiceBounds` is just the trough (the excavator's "over the sluice" check uses it); `sluiceInlets` are where hoses plug in.
- **Washing:** `updateSluice(dt)` (speed, pond fill, pond slowdown, rock pile size), `updatePond(dt)` (settling, water colour, silt, twinkles). `addToSluice(scoops)` is how all dirt enters the sluice (the classifier's rocks come off there). `findGold(where, catches, toPond)` finds gold in one scoop, and `earn()` pays it.
- **Dirt pile:** `pileSize()` works out its radius and height, `updatePile()` resizes and moves the cone and its footprint (`pileCircle`), `takeFromPile(scoops)` removes dirt (and announces when it's empty), `addToPile(scoops)` puts some back. `PILE_RADIUS`/`PILE_HEIGHT` are its full size, `PILE_FACE`/`PILE_DIRECTION` where it sits relative to the excavator.
- **End of the game:** `checkForEnd()` runs every frame, `showEndScreen()` and `closeEndScreen()` show and hide it, `resetGame()` starts over, `formatTime()` writes the time played.
- **Solids:** `solids` is the list of things you can't walk through (created at the start of the sluice section, filled in under "Solid things"). Each one is a `Box3`, a turnable "rect" (`excavatorRect`) or a "circle" (`pileCircle`, `pondCircle`, `rockCircle`); `nearestPoint()` and `distanceFromPoint()` work with all three.
  - The pile's circle has an `edge` profile (`PILE_EDGE`, measured from the heap's own shape by `edgeProfile()`), because its lumps stick out up to about 9% past a plain circle; `circleRadius()` and `edgeAt()` read it. It scales with the pile as it shrinks, and `pileCircle.off` makes it not solid once the pile is gone (a solid with `off: true` is skipped).
  - **Walking into things** (`movePlayer()`): each move is split into steps of at most `MAX_STEP` (0.1 m), so a slow frame can't jump you past an edge. After each step `pushAway()` pushes you out of anything you touch (`pushOut()` also works when your middle has ended up inside a solid: out through the nearest edge). If you'd still overlap something (`stuckInSolid()`: a gap narrower than you are), that step isn't taken. `pushOutOfSolids()` runs every frame and when things appear or grow, and if you're wedged in (say an upgrade made the sluice grow onto you), `moveToFreeSpot()` hops you to the nearest spot where you fit. `PLAYER_RADIUS` is 0.4 m.
- **Interacting:** `interactables` lists what E works on (cash bundles, pile, sluice, pond, shop, excavator); `nearbyThing()` picks the **closest** one in reach. `keepDigging()` handles holding E (or the left mouse button, or the Dig button) with a pickaxe. Each entry's `label` is what the touch Interact button says.
- **Excavator:** `buildExcavator()` rebuilds the model from the current upgrades (the moving parts end up in `ex`), `poseExcavator()` moves the arm and bucket to match `state.exc` (including the hydraulic rams), and `operateExcavator(dt)` handles the controls, scooping and dumping. The excavator's own "forward" is +x. `enterExcavator()` and `exitExcavator()` get you in and out; `excavatorHint()` is the hint under the crosshair.
- **Sounds:** `startAudio()` creates the sound system on the first click or tap (and wakes it up again after that). `tone()` and `noise()` make one-off sounds, `sfx` has one function per game sound, and `loops` holds the sounds that keep running, which `updateSounds()` adjusts 10 times a second. `toggleMute()` switches everything on or off.
- **Shop:** `makeShopRow()` makes one row per upgrade, `showShopTab(id)` / `switchShopTab(step)` switch tabs, `shopSummaryText()` is the line at the top, `updateShop()` refreshes the open tab.
- **Icons:** `ICONS` has one drawing function per tool, upgrade and summary icon (`sluiceAll`, `pondAll`), and `updateToolbar()` redraws the bar (it runs after every purchase).

## Working with the user

The user is a beginner. Explain steps in plain language, keep the code readable with short comments, and prefer simple approaches over clever ones.
