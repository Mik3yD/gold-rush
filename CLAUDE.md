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

## Current state (version 16: fitting iPhone Safari)

- **The start screen on short screens** (under 540 px tall: phones held sideways, and Safari with its bars showing): a smaller title (40 px), and **Tap to play**, New Game, **How to play**, Hall of Fame and Settings in one row (`#start-actions`). The controls list and the story are folded away in `#how-to`; **How to play** opens them (`#start.show-how`, the button then says "Hide help") and the card scrolls inside. On tall screens nothing changed and the How to play button is hidden.
- **Add to Home Screen tip** (`#home-tip`, at the top of the start screen card): "For full screen: tap Share, then Add to Home Screen." Only on iPhone Safari (`IPHONE_SAFARI`: an iPhone or iPod in the user agent, and not Chrome, Firefox, Edge, Opera or the Google app), and not when opened from the home screen (`FROM_HOME_SCREEN`: `navigator.standalone` or the standalone display mode). Its ✕ closes it for good (`goldRush.homeTip` = `'closed'`). Tapping the tip doesn't start the game.
- **Already in place before** (checked again): `viewport-fit=cover` and safe-area padding (`--edge`, `env(safe-area-inset-...)`), the Apple home-screen tags (`apple-mobile-web-app-capable`, `black-translucent` status bar, `apple-touch-icon`, title), and `fitScreen()` sizing everything to `visualViewport` (with `100dvh` before it runs) when Safari's bars show or hide, on turning, and on coming back to the tab.
- **iPhone test:** `node tools/test-iphone-fit.mjs` opens the game as iPhone Safari (user agent, touch, a faked notch where Chrome allows it) at 844 × 390 and 667 × 375, and shorter (844 × 330, 667 × 315, 667 × 280) as if Safari's bars were showing. At each size it checks the start screen (fits without scrolling, buttons in one row, tip showing), How to play, Settings, Hall of Fame, playing (HUD, tool bar, thumb buttons, clear of the notch), the shop and the end screen are all inside the screen, scrolling inside when too tall, and saves screenshots in the temp folder (`gold-rush-iphone-shots`).

### Version 15: the raised dig bench

- **The dig bench** (like a real placer mine): the dirt pile, the excavator and the ground around them sit up on a flat-topped dirt platform 2.3 m high. You tip your dirt down into a **hopper** on the sluice's high end, just below the bench's edge. The sluice, classifier, equipment pad and pond stay down on the ground.
  - **Its shape is part of the ground:** `benchHeight(x, z)` (in the ground section, called by `groundHeight()`), so the ground mesh, rocks, grass, signs, the fence, hidden nuggets and the player all follow it. The numbers are in `BENCH` (height, `lipX` 1.75 and `lipZ` -1.5: it covers everything west and north (-z) of those, out past the fence into the hills), `CRIB_WALL` and `RAMP`.
    - **Sides:** natural dirt slopes, 2.2 to 3.2 m wide, with a wavy edge (`fbm()`), too steep to walk.
    - **The crib wall:** facing the sluice (z -12 to -2), stacked logs with posts and a plank top (one merged mesh, built just before the pile) hold the edge upright, so the hopper can sit right against it. The ground drops just behind the logs. `cribWallBounds` is a solid, so you can't walk into it from below. No posts stand behind the hopper.
    - **The ramp:** 5.5 m wide (x -8.5 to -3), from z -3 on the bench down to z 4.5 at the camp, about 17°, cut into the bench's edge, with a darker packed-dirt track (`GROUND_COLORS.track`). It's the only way up or down. `crowded()` keeps rocks off the ramp and the crib wall.
  - **Walking** (`movePlayer()` → `tryStep()`): you can't step onto ground steeper than `MAX_WALK_SLOPE` (0.5 m up per meter; `steepAt(x, z)` measures 0.15 m each way). This stops you climbing the sides from below and walking off the edge from above, from any direction: a "how much did this step climb" rule could be beaten by zig-zagging up. If you're already on steep ground somehow, downhill steps are allowed. A refused step tries just its x part, then just its z part, so you slide along edges. Your eyes stay `EYE_HEIGHT` (1.6 m) above the ground (`standOnGround()`, eased, every frame in the game loop).
    - **Checked:** a flood fill over the whole dig site (0.1 m grid) finds the bench top only through the ramp, and every hidden nugget within reach of walkable ground. If you change `benchHeight()`, `BENCH`, `RAMP` or the wobble, check this again.
  - **Getting put somewhere** (loading a save, getting out of the excavator): `placePlayerSafely()` pushes you out of solids, moves you off steep ground to the nearest flat free spot (`moveToFreeSpot()` also skips steep ground), and sets your height. Old saves need nothing else: positions mean the same as before, so `SAVE_VERSION` stays 1.
  - **The hopper** (`buildHopper()`, called by `buildSluice()`; `HOPPER` gives its back, front, rim and bottom along the sluice): a square funnel with a frame round its rim and four corner posts. Planks, braced planks, steel with a 4-bar grizzly, then blue steel with chrome bars and a yellow stripe (the Extended Length tier, like the trough). Its rim is about 2.0 m up, 0.3 m below the bench. The sluice moved 0.25 m downhill (`sluice.position.x` 4.45, high end at x 2.45) so the hopper's back meets the crib wall's front (x 1.95). `hopperMouth` (the middle of its opening) and `hopperFloor` (where dirt lands) are updated in `buildSluice()`. The dirt waiting to be washed (`sluiceDirt`) shows inside it. The classifier (3.25, -4.95) and rock pile (3.1, -3.3) moved to stay clear of it.
  - **Tipping in by hand** (`dumpIntoSluice()`): only from up on the bench (`onBench()`). From the ground, the prompt and message say to carry it up the ramp. At the lip you stand about 0.6 m from the hopper and look straight down into it.
  - **Pouring** (`pourStream()`, in the effects section): a stream of clods that fall under gravity from one point to land around another, with dust puffs where they land (fewer on Low graphics: `particleAmount`). `pourDirt()` / `updatePours()` run your tip-out (0.7 s of small clods from just in front of you into the hopper, then a puff of dust).
  - **The excavator** sits on the bench by the crib wall (`excavator.position.y` is the ground there; the cab camera follows it).
    - **Pouring:** tipped past `DUMP_PITCH`, the bucket empties over `POUR_SECONDS` (1.5 s) in a thick stream from its lip (`pourFromBucket()`, `bucketPour`). The dirt goes to whatever is under the bucket right now (`dumpTarget()`): the sluice takes whole scoops (part-scoops wait in `bucketPour.carry`), the pile takes it back, the ground spills it ("Spilled!" once). "+N t in the sluice" shows when it's empty or tipped back up.
    - **Lining up with the hopper:** the bucket's hinge passes 0.1 m from the hopper's middle at a swing of 0.83, its bottom 0.7 m (biggest bucket) to 1.2 m (smallest) above the sluice's highest part.
      - **The tilt stops at `TIP_LIMIT` (-1.25)**, just past `DUMP_PITCH` (-1.1). There the lip hangs under the hinge (0.16 m away, 0.25 m with the biggest bucket), so the dirt falls where the hinge is. Tipping further, to -1.6 as it used to, swung the lip 0.4 to 0.6 m back towards the cab, over the hopper's back corner and the crib wall. Saved tilts are kept within the limit too.
      - **Forgiving:** `dumpTarget()` says 'sluice' when the hinge is over the hopper's opening (`hopperRect`, set in `buildSluice()`; `overHopper(x, z, margin)`) or up to `HOPPER_MARGIN` (0.45 m) outside it: swings 0.52 to 1.15 (to 1.24 with the widest sluice). Only the hopper counts now, not the rest of the trough.
      - **The stream** leaves the lip as wide as the bucket (`ex.width`) and falls into the hopper's opening, sliding in off its sides when the bucket isn't quite centered.
    - **Cues:** the hopper's rim glows gold, pulsing (`hopperGlow`, `updateHopperGlow()`), when you're lined up: in the excavator with dirt in the bucket over the hopper, or on foot up on the bench with dirt, in reach of it. The hint says "Lined up over the hopper: hold F to dump", or "Nearly there: swing (A / D) a little more, over the hopper" when you're close.
    - **Never touching the sluice:** the arm is at a fixed height, so the bucket is always well above the sluice and hopper (see above). `bucketClearsSluice()` is a safety net in `operateExcavator()`: a swing or tilt that would bring any part of the bucket within `SLUICE_CLEARANCE` (0.5 m) above the sluice is undone.
      - **`sluiceBounds` is measured without the dirt heap in the hopper** (`measureSluice()`): three.js counts hidden things too, and the heap's leftover size made the box up to 0.4 m too tall (2.51 m instead of 2.12 m). The safety net then stopped Bucket Size 7 and up tipping past about -0.5, so they never dumped (on any device; it showed up on a phone because that game had the bigger bucket). Tipped out, the biggest bucket's teeth are at 2.77 m, 0.65 m above the sluice's real top, at every upgrade level.
    - **Checked** in a headless Chrome, from the cab and from the side, at Bucket Size 1 and 12: the bucket sits right over the hopper, clearly above it, and the stream falls into the opening, also at the window's edges (swings 0.55 and 1.12). Photo mode's `swingRange` gives the window and `hopperMiddle`, and its `excavator({ hold })` now also holds keys that haven't been pressed yet.
  - Moved for the bench: the hidden nugget `path` is now on the ramp (-5, 1.2). The DIRT and SLUICE signs stand on the bench (`makeSign()` uses the ground height). Fence posts and rails follow the ground, and rails slant over the slopes.
  - **Photo mode and the cutscene shots** are updated for the bench:
    - **Helpers:** `spots()` gives real heights (the pile's includes the bench) plus `bench` and `hopper`, `ground(x, z)` gives the ground's height, the miner stands on the bench (`minerDigging()` returns his `y`), and `bucketDirt()` lands its dirt on the bench or in the hopper.
    - **Shots:** in `tools/capture-cutscene.mjs`, 01, 02, 04 and 09 measure their camera heights from the bench or the ground. 05 holds F over the hopper (`swingRange.hopperMiddle`) and shows the real stream pouring into it, with the rim glowing. 03 and 06 to 10 didn't need changing.
    - **Fix:** the tool no longer crashes at the end when Windows still has Chrome's temporary folder open.

### Version 14: the global Hall of Fame

- **Hall of Fame:** one shared online list of finished games, the same for everyone who plays from the shared link. It's stored in a free **Supabase** database (project `agesjrjqcdkbrirddojg`).
  - **The database** is made by `supabase/hall-of-fame.sql`, pasted into Supabase's SQL Editor and run (it's safe to run again). Two tables with the same columns:
    - `hall_of_fame`, the real list
    - `hall_of_fame_test`, the practice list, used when cheats are on (`?cheats=1`, locally only) or the game used a test cheat (`state.usedCheats`)
  - **Columns:** `game_id` (unique), `initials`, `created_at` (set by the server), `time_played` (seconds), `gold_earned`, `biggest_nugget` (dollars) and `nuggets_found`.
  - **Rules in the database:**
    - The browser key can only **read** and **add** entries (there are no update or delete policies, and only the game's own columns can be written). You can delete rows yourself in the dashboard's Table Editor.
    - Initials must be 3 capital letters and not on the blocklist.
    - The real list also needs believable numbers: at least 1 hour, $10,000 to $600,000, a biggest nugget of at most $3,600, and 0 to 14 hidden nuggets.
    - At most 30 new entries a minute.
  - **Keys:** `HOF_URL` and `HOF_KEY` (the **publishable** key, made for browsers) are the two marked lines in the `Hall of Fame` block of the script. Never put the secret / service_role key in the game. With them empty, the game says "The Hall of Fame isn't set up yet".
  - **Entering:**
    - After the ending cutscene, the end screen shows "Enter the Hall of Fame!" at the top (`showHofEntry()`): three letter boxes with ▲ ▼ buttons. On a keyboard, letters type and move along, the arrows pick and move, Backspace goes back and Enter submits (`initialsKey()`; it takes every key while it's showing, even M and G).
    - Only letters are possible. Rude initials (`BLOCKED_INITIALS`, the same list as in the SQL) get "Please choose different initials".
    - **No thanks** hides it. The game can still be entered later: the Hall of Fame screen then shows "Add your finished game".
    - Your initials are remembered for next time (`goldRush.initials`).
  - **One entry per finished game:** `state.gameId` is a random id (`newGameId()`), saved with the game and renewed by `resetGame()`. `state.hofEntered` is set when it's submitted. The database ignores a `game_id` it already has, so retries can't make doubles.
  - **No internet:** `submitInitials()` stores the entry in `goldRush.hallOfFamePending` before sending. If it can't go (`sendEntry()` says 'offline' or 'busy'), it stays there with a friendly message, and `sendPendingEntries()` sends it on page load, on the `online` event and every minute.
  - **The list** (`openHallOfFame()`, `loadHallOfFame()`, `showHofRows()`, `#hof`):
    - It shows the top 50 (`HOF_SIZE`), with **Fastest** (by time played) and **Most gold** tabs. A new entry is highlighted. If it isn't in the top 50, it's shown at the bottom with its place.
    - It opens after submitting, and from the start screen's **Hall of Fame** button (the practice list when cheats are on).
    - Esc closes it (it counts as a menu: `menuOpen()`).
    - The table is built with `textContent`, so nothing in the database can become page code.
  - **The service worker** leaves `*.supabase.co` alone, so the list is never an old saved copy.
  - **Not cheat-proof:** someone with the browser's developer tools can still send a made-up entry. The database's checks stop silly numbers, and you can delete bad rows in the dashboard.
  - **Free plan:** Supabase pauses a free project after about a week with no visitors. Click **Restore** in the dashboard and it's back. While it's paused, the list says it can't be reached, and entries wait on the device.
  - **Save:** `makeSave()` has `hallOfFame: { gameId, usedCheats, entered }`. Old saves get a new id.

### Version 13: the ending cutscene

- **Ending cutscene:** when the game is completed (`finishGame()`, from `checkForEnd()`), the film `ending.mp4` plays full-screen before the end screen (`playCutscene(then)`, `endCutscene()`, `#cutscene`).
  - **Skip** button (bottom right; Esc, Enter and Space skip too). The film fits the whole screen with black bars if the shape differs (`object-fit: contain`), `playsinline` so iPhones keep it in the page, and buttons keep clear of notches.
  - **Sound** follows the mute setting, and M still works while it plays (`toggleMute()` sets the video's `muted`). If the browser won't play sound without a tap (iPhones), it plays silently with a "Tap for sound" button (`#cutscene-sound`).
  - It only starts downloading once the pile is empty (`prepareCutscene()`). If it hasn't started after `CUTSCENE_WAIT` (10 s) or fails (offline: the service worker leaves `.mp4` files alone, see below), the game goes straight to the end screen. Switching apps and coming back carries on playing.
  - `ending.mp4` is 720p, 44 s, compressed from 16 MB to 7.5 MB (two-pass H.264 at 1,250 kbit/s, AAC 112 kbit/s at 48 kHz, `+faststart` so it starts before it's fully downloaded). The original is in `cutscene-shots/` (not committed).
  - Test cheat **L** finishes the game straight away.

### Version 12: random sluice nuggets

- **Sluice nuggets are random** (all the numbers are in `NUGGETS`, just below `SETTINGS`):
  - **How often:** the normal chance is 1 scoop in 100 (`NUGGETS.chance`), but the dirt comes in hidden **patches** that each last a random 50 to 500 scoops (`patchScoops`): **poor** (half the dirt, ×0.25, a dry spell), **normal** (35%, ×1) and **rich** (15%, ×3.5, a pay streak). `nuggetChanceNow()` uses up one scoop of the patch each time and picks a new random patch when it runs out (`pickByShare()`). Patches aren't shown or saved, so nobody can predict them. share × times must add up to 1 to keep the balance.
  - **How big:** each nugget picks a size by its share, then a random weight in its range, worth **$4 a gram** (`dollarsPerGram`): **small** 62% (2 to 7 g, $8 to $28), **medium** 28% (6 to 18 g), **large** 9.5% (15 to 52 g, up to $208) and the **jackpot** 0.5% (400 to 900 g, $1,600 to $3,600: about 1 nugget in 200, or 1 scoop in 20,000). The average is 12.58 g = $50.33, the same $0.50 a scoop as before, so `pileTons` and the prices still work (the browser console prints the average on load). A simulation of 10 million scoops gave $0.49 to $0.50 a scoop.
  - **Showing it:** `foundSluiceNugget()`: the message says the size, weight and value ("Nice nugget! 11.2 g, +$45"; `nuggetWeight()` shows grams under 1 oz and troy ounces from there up), and the nugget that pops up is bigger for bigger nuggets (`nuggetShine(where, size)`). The **jackpot** ("THE MOTHER LODE!") gets its own pop-up (`showJackpot()`, `#jackpot`: weight in ounces and grams and the value, 5 seconds), a longer golden glow, extra sparkles, its own sound (`sfx.jackpot()`) and a save.
  - The end screen's **biggest single nugget** now shows its weight too (dollars ÷ `dollarsPerGram`, so the hidden nuggets get one too).

### Version 11: hidden gold nuggets and a full stats screen

- **Hidden gold nuggets** (they replace the old hidden cash bundles): 14 raw nuggets lie around the camp (`HIDDEN_NUGGETS`, **spoilers!**), worth $25 to $500 each, **$3,000 in total**.
  - **Look** (`makeHiddenNugget()`): lumpy, flat-faced, shiny gold (`rawGoldMaterial`, metal) with dark dirt in its dips and a chip of white quartz, partly sunk into the ground. A small star of light flashes on each one now and then (`glintMaterial`, `updateHiddenNuggets()`). The sluice's nuggets are smooth, bright and glowing and pop up spinning (`nuggetShine()`), so a nugget lying on the ground is clearly a hidden find.
  - **Three kinds** (`NUGGET_LOOKS`: size, how buried, glint size and how often): **easy** (4: $25 to $60, out in the open or on the crates and a barrel, big, glint every 2 to 3.5 s), **medium** (5: $75 to $300, by the sluice legs, in the tent, behind the boulders, on the pond's far bank, under the corner pine), **hard** (5: $300 to $500, small, half buried, glint every 4.5 to 7 s: the leafy tree, behind the west pine, under the bush, and **two under the dirt pile** that only turn up once the pile has shrunk away from them, at about 45% and about 10% left: `underPile()`).
  - **Picking one up:** walk up and press **E** (`pickUpNugget()`): `sfx.hiddenNugget()` (a "chunk", the nugget fanfare and a sparkly run up), the gold goes in the wallet and counts as gold earned (`earn()`), "Found a nugget! +$500", a puff of dirt and a burst of sparkles, and the game saves.
  - **No counter on screen**: players don't know how many there are until the end screen. The start screen just hints that nuggets are hidden.
  - **Balance:** $3,000 is under 1.5% of the $220,120 all the upgrades cost. About $2,000 can be found early (the two under the pile come late), a nice boost when the first upgrades cost $25 to $60 and the Pickaxe $150.
  - If you move the camp props, the sluice area, the pond or the hiding scenery (`CAMP_BOULDERS`, `CAMP_TREES`, `CAMP_BUSH`), check the nuggets still sit where they should and can be reached.
- **End-of-game stats screen** (`endStatsRows()`), in groups: hidden nuggets found ("7 of 14"); total gold earned and total money spent; dirt processed (into the sluice), split by hand and by excavator; gold flakes found, sluice nuggets found, the biggest single nugget, and gold recovered from the tailing pond; tools and upgrades bought (out of 193) and how many are fully maxed (out of 17); total time played and how long until the excavator was bought. **Play Again** starts a fresh game. The numbers only used here are in `STATS_START` (`moneySpent`, `flakes`, `biggestNugget`, `pondGoldCollected`, `scoopsByHand`, `scoopsByExcavator`, `excavatorBoughtAt`): counted from the start of every game, reset by `resetGame()`, and saved.

### Version 10: saving

- **Saving and loading:** the game saves itself in the browser (`localStorage`, key `goldRush.save`) and carries on exactly where you left off.
  - **What's saved** (`makeSave()`): wallet, dirt left in the pile, dirt you're carrying, the sluice queue, pond fill, gold on the filters, the rock pile, every tool and upgrade level (`state.levels`), hidden nuggets found (`nuggetsFound`), the end-screen stats (`stats`: everything in `STATS_START`), total gold, nuggets, time played, whether the game is finished, the excavator (arm swing, bucket tilt, dirt in the bucket, whether you're in the cab and where you're looking), where you're standing and looking, the last shop tab, and the settings (sound, graphics quality, excavator controls guide open or closed).
  - **When:** every 30 seconds (`AUTOSAVE_SECONDS`), right after every purchase (`buy()`) and hidden nugget pickup (`pickUpNugget()`), and when the page is closed or hidden (`pagehide`, `visibilitychange`: switching apps on a phone counts). Changing a setting saves quietly. A small "Saved" note flashes in the bottom left (`showSaved()`, `#saved`; bottom middle on touch screens). Nothing is saved until you've pressed play once (`everPlayed`), so just opening the page doesn't make a save.
  - **Loading:** on page load, `readSave()` + `loadSave()` put everything back straight away (behind the start screen). The start screen then says **Continue** and shows a **New Game** button (`updateStartScreen()`); New Game asks "Are you sure? This erases your progress." first (`#confirm`). New Game keeps your settings.
  - **Show hints** (in Settings, On by default): `hintsOn` controls the hint box in the middle of the screen (`#prompt`: "Press E to dig", the excavator's `excavatorHint()`...). Off empties it in `updateHud()`, so no hint box shows anywhere; the HUD's warning line ("Pond FULL!"), messages, buttons, the shop and the controls guide still work. Stored like the controls guide: its own key `goldRush.hints` (`'on'` / `'off'`, written by `setHints()`) and the save's `settings.hints`. On touch screens the hint box sits lower (72%) and smaller, so it doesn't cover the bucket and the dirt.
  - **Settings** (a button on the start/pause screen, `#settings`): sound, graphics, hints and controls guide switches, and **Backup**: a code to copy (`makeBackupCode()`: `GOLDRUSH-` + the save as base64 text) and a box to paste one in on another device or browser (`readBackupCode()`, which replaces the current game). Esc closes it; the game's keys are off while it's open (`menuOpen()`), so typing a code doesn't press M or G.
  - **Old saves** (`upgradeSave()`, `SAVE_VERSION` = 1): every value is checked as it loads (`savedNumber()` keeps it a proper number and in range). Anything missing starts at its normal starting value, anything unknown (old tools, old fields) is ignored, levels past the maximum are capped, and a save that can't be read at all starts a new game. **If you change what's in a save in a way old saves can't handle, raise `SAVE_VERSION` and add a step to `upgradeSave()`.** New upgrades and new state need nothing: they just start at 0 / their default in old saves. If you add something new to `state` that should survive a reload, add it to both `makeSave()` and `loadSave()`.

### Version 9: phones and tablets

- **Upgrades:** 17 things to buy, each with **12 levels** (the excavator itself is one purchase): 193 purchases, **$220,120** in total. They're in four shop tabs:
  - **Tools:** Shovel, Bucket / Wheelbarrow (both owned from the start), then two new tools you unlock in order: **Pickaxe → Classifier Screen**.
  - **Sluice:** an upgrade tree with 8 categories: Mesh, Nozzles, Extended Length, Extra Water, Higher Pressure, More Pumps, Hoses, Generators. Some need others first (see below).
  - **Tailing Pond:** Pond Size and Filters.
  - **Excavator:** the Small Excavator (needs the Classifier Screen; the last and most expensive tool), then Bucket Size and Speed.
- **Gold:** every scoop of dirt holds about $2.00 of gold on average: a 1% nugget worth about $50 on average ($0.50; nuggets are heavy and always caught; random sizes and pay streaks, see version 12) and a 75% chance of 1 to 3 flakes at $1 ($1.50, but only the flakes the washer catches). The sluice catches **Mesh % × Nozzles %** of the flakes (45% × 70% = 31.5% at the start, 95% × 100% at the top). Missed flakes go to the pond, where **Filters %** of them collect on the filters; walk to the pond and press **E** to collect them (`state.pondGold`, `collectPondGold()`).
- **Sluice speed** (scoops a second) = `SETTINGS.sluiceBaseSpeed` (1.5) × the boost from Length, Extra Water, Pressure, Pumps, Hoses and Generators (each ×1.04 per level, ×1.58 at 12, from `SLUICE_BOOST`) ÷ (1 − the classifier's rock share). So 1.5/s at the start and 40/s (4 t/s) fully upgraded (`sluiceSpeed()`).
- **Sluice dependencies** (`needs(n)` in `TOOLS`; the shop shows "Needs Generators Lv 4" on locked rows and plays `sfx.locked()`):
  - More Pumps Lv N needs Generators Lv N.
  - Higher Pressure Lv N needs Hoses Lv N and Nozzles Lv N.
  - Extra Water Lv N needs More Pumps Lv ⌊N/2⌋.
  - Extended Length Lv N needs Extra Water Lv ⌊N/2⌋.
  - The new tools: Classifier needs the Pickaxe, Excavator needs the Classifier, Bucket Size and Speed need the Excavator ("Buy the ... first").
- **Tailing pond:** past the sluice's low end at `POND_SPOT` (18.2, -7), fed by a wooden flume. Every washed scoop sends 0.1 t of mud in (minus the rocks the classifier took out, `state.pond` in tons); it settles at Pond Size's `settles` t a minute. When it's full (`pondFull()`: it becomes full at the top and only stops being full below 90%, `POND_NOT_FULL_BELOW`, so it can't flicker), the sluice washes at `SETTINGS.pondFullSpeed` (30%), the HUD warns, the water overflows and `sfx.pondFull()` plays. The water gets muddier and a silt heap rises as it fills.
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
  - **Screen display:** gold-rush style: dark wood panels with brass edges, the Rye (western) and Bitter fonts from Google Fonts, a gold coin wallet that counts up with a "+$" popup (not in touch mode: `body.touch #gain` is hidden, because it ran into the tool bar on phones), keyboard keys drawn as keycaps, a tabbed shop with parchment cards, tool icons, level pips and gold price tags.
  - **Graphics quality:** press **G** or use **Settings** to switch between High and Low (`QUALITY`, `setQuality()`, `switchQuality()`). Low draws fewer pixels on high-resolution screens, turns off shadows, and shows a third of the grass and half the particles. Nothing about graphics (no quality label, no frame rate, no "running slowly" tip) is shown on the play screen; only switching it yourself shows a short "Graphics: Low" message. Phones and tablets (`TOUCH_DEVICE`) start on Low, and their High is capped at 1.5× pixels instead of 2×; on a touch screen you switch it in Settings.
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
- **HUD** (top left): wallet, tons left in the pile (with a bar), carrying, shovel, sluice queue and speed, pond fill (with a bar), gold waiting on the filters, the excavator (a blank line until it's bought, then "Bucket Lv 3 · Speed Lv 2", or the dirt in its bucket with a bar while you're in the cab), and one warning line ("Pond FULL" in steady red, "Pile gone").
  - **It never changes size:** every panel has a fixed width and height, every row is always there at a fixed height (`--row`, `--bar` on `#hud`; an empty bar slot is `.mini.off`, an empty warning line is just blank), text never wraps (`white-space: nowrap`, with `…` as a last resort), and numbers use same-width digits (`tabular-nums`). The wallet's Rye font has no same-width digits, so each digit is put in its own fixed-width `<i>` box. Keep HUD texts short (words in `.roomy` are dropped on short screens), and if you add a row, raise the line count in the `#status` height.
- **Dirt amounts:** the game counts dirt in scoops, and **1 scoop = 0.1 ton** (`SETTINGS.tonsPerScoop`). The pile and the excavator bucket are shown in tons; the shovel, bucket/wheelbarrow and the sluice queue in scoops. The pond is in tons. `tons(scoops)` turns scoops into a number for the screen (with commas).
- **The giant dirt pile:** all the dirt in the game.
  - Its total is **`SETTINGS.pileTons` = 19,000 t** (change it there).
  - It starts as a cone 14 m tall and 26 m across.
  - It shrinks as it empties (`pileSize()`: size goes with the square root of what's left), towards its "dig face" (`PILE_FACE`) next to the excavator, so the excavator can reach it at every size.
  - A bare dirt patch the size of the full pile shows how much has been dug away. Dumping the excavator bucket back over the pile puts the dirt back.
  - How 19,000 t was chosen: a simulated player (buying the cheapest thing available and saving up for each new tool) needs about **11,400 t** of washed dirt to buy everything ($220,120, at about $19 a ton including pond gold). That's about 2¼ hours: the pickaxe at about 2 min, the classifier at about 13, the excavator at about 105.
  - Fully upgraded, the sluice washes 40 scoops a second (4 t/s), so 30 more minutes is about 7,200 t. 11,400 + 7,200 ≈ 18,600, rounded to 19,000 (a player who doesn't keep the sluice full gets closer to an hour).
- **End of the game:** once the pile is empty, the HUD says to wash the last of your dirt. When there's no dirt left anywhere (pile, carried, sluice queue and excavator bucket: `checkForEnd()`), the stats screen shows (see version 11 above; `state.goldFound` includes pond gold and hidden nuggets, `state.timePlayed` doesn't count time on the pause screen). **Play Again** starts a fresh game (`resetGame()`); **Keep walking around** closes it and lets you carry on (it won't show again).
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
  - **The guide is one setting** (`helpOpen`, "Shown" / "Hidden" in Settings). **H** (only while in the excavator), clicking its title while the mouse is free (paused with Esc) and the Settings button all flip the same value (`toggleExcavatorHelp()` → `setExcavatorHelp(open)`). **Hidden means it never shows at all**: `updateExcavatorHelp()` is the only thing that shows or hides it (shown only when you're in the cab *and* the setting says Shown), and `enterExcavator()` / `exitExcavator()` call it. It's shown until you hide it the first time.
  - **Where it's stored:** under its own key `goldRush.excavatorHelp` (`'open'` / `'closed'`), written every time it changes, so it sticks even before there's a saved game (the save only starts once you've played); and also in the save's settings (`controlsGuide`), so backup codes carry it. A save that has it wins on load (`loadSave()` calls `setExcavatorHelp(…, false)`, which also updates the key).
  - Scooping: swing the bucket above the dirt pile and hold Q. It fills as it curls, for as long as it's above the pile (`bucketOverPile()`, measured at the bucket's hinge).
  - Dumping: tip the bucket past `DUMP_PITCH` and it pours out over 1.5 s (version 15). Over the sluice it goes into the hopper (through the classifier); over the pile back on the pile; anywhere else it's spilled (`dumpTarget()`).
  - The arm stays at `EXCAVATOR_START.boom` and has one fixed length (`BOOM_LENGTH`, `STICK_LENGTH`). Swinging all the way round, the bucket passes the pile (swing about -2.46 to -1.42) and the hopper (dumping counts from 0.52 to 1.15, its middle at 0.83), at the smallest and largest upgrades. If you move the pile, sluice, bench or excavator, check it can still reach both, and that it still clears the sluice (see version 15).
  - Upgrades change its look (`buildExcavator()`):
    - Bucket Size: 15 to 30 t and 4.5% bigger per level, 4 → 8 teeth, wear strips, side plates, side cutters, a lip plate, chrome teeth, and gold trim at 12.
    - Speed: chrome exhaust, air filter, vents, taller stack, twin stacks, a turbo pipe, a hood scoop, stripes, a beacon, triple stacks, chrome rams (`ramColor`), and gold stripes at 12.
- **Phones and tablets (touch controls):** everything works with fingers, and keyboard and mouse still work on computers.
  - **Touch mode** (`touchMode`, the `touch` class on `<body>`) is on from the start on phones and tablets (`TOUCH_DEVICE`: the main pointer is "coarse"), switches on with any touch, and off again when you use a mouse (`setTouchMode()`, from `pointerdown`). The touch buttons only show in touch mode while playing (`body.touch.playing`).
  - **Playing and pausing:** phones can't capture the mouse, so `setPlaying(on)` starts and pauses the game in both modes (mouse: from `pointerlockchange`), and `resumePlaying()` is "back to the game" (tap to play, closing the shop or end screen). In touch mode it goes full-screen and locks landscape where the browser allows it (`goFullScreen()`, Android). A pause button (top right), switching apps and turning the phone upright pause it.
  - **Walking:** a joystick appears wherever your left thumb goes down on the left half of the screen (`stick`, `STICK_RADIUS` 60 px, `#touch-area`); how far you push it sets the speed (`movePlayer()`). Dragging anywhere else looks around (`lookAround()`, `SETTINGS.touchSensitivity`).
  - **Buttons** (`touchButton()`): **Interact** (does E; its label says what: Dig, Dump, Collect, Shop, Get in, Pick up, from each `interactables` entry's `label`; dimmed when nothing's in reach), **Dig** (dig at the pile, hold with a pickaxe: `keys.TouchDig`), **Shop**, pause, and the speaker button. `updateTouchButtons()` runs every frame.
  - **Excavator:** ◀ ▶ Swing on the left, Scoop, Dump and Get out on the right. They hold down the same `keys` as the keyboard (`data-key` on the buttons: KeyA, KeyD, KeyQ, KeyF). The arm doesn't go up and down on purpose (see Excavator). The keyboard guide is hidden in touch mode.
  - **Words:** on a touch screen, hints and messages talk about buttons instead of keys: `forScreen(text)` swaps them using `TOUCH_WORDS` ("Press E" → "Tap Interact", "hold Q" → "hold Scoop"...). Text written once (shop descriptions, start screen, shop tabs) has both versions, and CSS shows the right one (`.only-touch`, `.only-desktop`, `bothVersions()`). If you add a hint with a key in it, check it reads well on a phone too.
  - **Layout:** on a touch screen the tool bar moves to the top middle (smaller icons), pause and sound sit in a row at the top right, and the "Saved" note at the bottom middle. Short screens (under 540 px tall: phones held sideways) get a smaller HUD, start screen and end screen, and a full-screen shop with a sticky header (money and a big ✕) and tabs ("Tailing Pond" becomes "Pond"). Everything keeps clear of notches (`env(safe-area-inset-...)`).
  - **Portrait:** a "Please rotate your phone" message covers the game (`#rotate`) and pauses it.
  - **Fitting the screen** (`fitScreen()`, in the "Fitting the screen" block before the graphics quality code):
    - It measures the part of the screen you can see (`visualViewport`) and resizes the 3D view (`screenW`/`screenH`, the camera, the renderer) and sets `--app-h`, the height every full-screen layer uses (start, end, shop, Hall of Fame, settings, confirm, cutscene, rotate; `100dvh` until it runs).
    - `fitSoon()` runs it on load, resizing, turning the phone, the address bar showing or hiding (`visualViewport` resize), coming back to the page (`pageshow`, `focus`, `visibilitychange`) and going full-screen or back, and checks again at 150 ms, 0.5 s and 1 s, because phones report the new size late.
    - The page never zooms or scrolls: the viewport tag fixes the scale at 1 (minimum and maximum), `resetZoom()` puts it back if a browser zoomed anyway, the body is `position: fixed` with `touch-action: none`, the 3D canvas is fixed under everything (`z-index: -1`, so it can never make the page wider), and the backup-code boxes use 16 px text (smaller makes phones zoom in when you tap them).
    - Every pop-up's `.card` fits inside its layer (which keeps clear of notches with `--edge`) and scrolls inside if it's too tall.
    - `fitPanels()` shrinks the HUD (`--hud-scale`: at most 40% of the width, and the height minus 100 px for thumbs on touch screens), the tool bar (`--bar-scale`: between the HUD and the pause/sound buttons on touch screens) and the excavator guide (`--help-scale`), never below half size. It runs after `fitScreen()`, after `updateToolbar()`, when touch mode switches and when the guide shows. Screens under 300 px tall also get smaller thumb buttons.
- **Installable app (PWA):** players can add Gold Rush to their home screen and open it full-screen like an app, and it works with no signal once it has loaded once.
  - `manifest.json` gives the name, colours, full-screen landscape and icons. The icons in `icons/` (a gold nugget and a pickaxe on a wooden badge) are drawn by `icons/make-icons.ps1` (run it again to change them). `apple-touch-icon.png` is the iPhone's, and `icon-maskable-512.png` has its picture in the middle for phones that cut icons into circles.
  - **Updates:** a new `sw.js` replaces the old one by itself (`skipWaiting()`, `clients.claim()`, registered with `updateViaCache: 'none'`), and the game's own files are fetched with `cache: 'no-cache'`, so GitHub Pages' 10-minute browser copy is never used. A game that's already open checks for a newer `index.html` (`checkForUpdate()`: a `HEAD` request's `Last-Modified` against `document.lastModified`) 5 s after opening, every 5 minutes, when back online and when you come back to the tab, and then shows **"Update available, tap to reload"** (`#update`, top middle; under the tool bar on touch screens). Tapping it saves and reloads.
  - `sw.js` is the service worker (it doesn't touch `.mp4` files or requests for part of a file: the ending film always comes from the internet, because phones ask for videos in pieces, which a saved copy can't answer). When installing it saves the game's files, Three.js and the Google Fonts (`GAME_FILES`). After that the game's own files come from the internet when possible (so updates arrive) and from the saved copy when offline; Three.js and the fonts always come from the saved copy. **If you add a file the game needs (or change the Three.js version), add it to `GAME_FILES` and change the version in `CACHE`.**
  - Service workers only run on https (or `localhost`), so none of this works when `index.html` is opened straight from disk; the game still plays normally then. The game is published on GitHub Pages at https://mik3yd.github.io/gold-rush/ (from the `main` branch).
- **Test cheats (off by default):** open the game **on your own computer** with `?cheats=1` at the end of the address (for example `http://localhost:8000/?cheats=1` or `.../index.html?cheats=1`) to turn them on. They never work on the public GitHub Pages link (`RUNNING_LOCALLY`: `file:`, `localhost`, `127.0.0.1`); the browser tab's title then says "(test cheats on)" and a message lists the keys. **K** adds $25,000, **R** resets everything to the start (same as "Play Again"), **P** digs away most of the pile, leaving 5 t (`CHEAT_PILE_LEFT`), to test the end screen, **O** fills the tailing pond to test the slowdown, **J** makes the sluice find a jackpot nugget, **L** finishes the game (to test the ending cutscene and end screen). Using any cheat sets `state.usedCheats`, so that game can only go on the Hall of Fame's practice list. All cheat code is in one block marked `TEST CHEATS` near the end of the script; `CHEATS_ON` reads the address. To have them always on while working, set `CHEATS_ON = true`, but put it back before sharing the game.
- **Phone test:** `node tools/test-touch-dump.mjs` opens the game in a hidden Chrome pretending to be an Android phone held sideways (915 × 412, touch), loads a ready-made save (in the cab, bucket full), holds the real ◀ Swing button until the hint says it's lined up, holds Dump, and checks from the save that every scoop went into the sluice: at Bucket Size 1, 12, and 12 with everything else maxed. It also checks nothing covers the buttons. Same needs as the photo tool below.
- **Cutscene pictures (photo mode):** `node tools/capture-cutscene.mjs` takes 10 pictures for the end-game cutscene (1920 × 1080 PNGs, no on-screen display) and saves them in `cutscene-shots/`. It needs Node.js 22+ and Google Chrome, and nothing to install: it starts its own little web server, opens the game in a hidden Chrome with its own empty profile (so saves are never touched), with `?photo` on the address. Add words to only take some shots (`node tools/capture-cutscene.mjs sluice pond`), and `--info` prints where things are, for aiming the camera. The shots (upgrades, pile left, camera, timing) are the `SHOTS` list at the top of the script.
  - **Photo mode** (`PHOTO_MODE`, the `PHOTO MODE` block after the test cheats) only switches on with `?photo`: the game loop doesn't run (the script moves time forward with `step()`), nothing is saved (`saveGame()` returns), random nuggets are off, and hidden nuggets aren't shown. `window.goldRushPhoto` has `setup()`, `camera()`, `step()`, `excavator()`, `minerDigging()` (a miner figure with a shovel that only exists in photo mode), `bucketDirt()`, `nugget()`, `sunset()` (uses the sky shader's `dusk` uniform, 0 in the game, and `skyLight`), `spots()` and `capture()` (draws at 2× and shrinks it, for smooth edges).

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

Removed features: the Gold Pan and pan tub (version 3), the Metal Detector with its buried nuggets (version 4), in version 5 the dump truck, driving the excavator, the Excavator Arm upgrade and the old Excavator Engine upgrade (now Excavator Speed), in version 6 buying new loads of dirt and the Dirt Loads upgrade, and in version 8 the one-piece Sluice Box upgrade (now the Sluice tab) and the sluice's puddle (the water now runs down a flume into the pond). A Highbanker (a second washer next to the pile) was added in version 8 and then taken out again. The 7 hidden cash bundles (version 9) were replaced by hidden gold nuggets in version 11. The excavator used to dig by itself (version 3).


## Code layout

- `index.html` holds everything: the page, the HUD, and the game code in one `<script type="module">`.
- For the installable app: `manifest.json`, `sw.js` (the service worker, registered near the end of the script) and `icons/` (with `make-icons.ps1`, which draws them).
- **Script order:**
  1. settings and tools
  2. the scene and renderer
  3. maths and noise helpers (`fbm()` makes the natural bumps)
  4. textures (`TEX`) and materials
  5. sky and lights
  6. positions of the big things (pile, `POND_SPOT`, `PAD`), the dig bench (`BENCH`, `CRIB_WALL`, `RAMP`, `benchHeight()`), then the ground (`groundHeight()`, `steepAt()`, `grassiness()`, `groundColor()`)
  7. grass, rocks, trees, fence, pile
  8. sluice, pond, equipment pad, classifier (`buildSluiceArea()` builds all four in the right order)
  9. signs, shop, camp props, hiding spots (boulders, camp trees, bush), solids
  10. excavator, sounds, effects, hidden nuggets
  11. game logic, shop (with `TOUCH_WORDS`), tool bar, controls, touch controls, HUD
  12. quality setting, end of game (with the ending cutscene), saving and loading (with Settings and New Game), cheats, the Hall of Fame, photo mode and the game loop
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
- **Saving and loading** (the section just before the test cheats; see "Saving and loading" above for what and when): `makeSave()` builds the save object, `saveGame(showNote)` writes it, `readSave()` reads it, `upgradeSave()` brings old saves up to date, and `loadSave(save)` puts the game back (it's used for the saved game on page load and for pasted backup codes). `loadSave()` uses `applyToolLevels(saved)`, which only reads the ids in `TOOL_ORDER` (so old `pan`, `detector`, `engine`, `arm`, `dirtLoad` and `sluice` entries are ignored), keeps each level in range and rebuilds the sluice area, the excavator and the tool bar; and `applyNuggetsFound(saved)`, which ignores unknown nugget ids (old saves have `cashFound` instead, which is ignored: that cash is already in the wallet). The end-screen stats load from `save.stats`; old saves without them start at 0, except money spent, which is worked out from the upgrades owned. `resetGame()` uses both with empty lists (and leaves the settings alone).
- **Hidden nuggets:** `HIDDEN_NUGGETS` lists each nugget's `id`, spot, `hide` kind and `value`; `NUGGET_LOOKS` sets each kind's size, burial and glint. `makeHiddenNugget()` builds the model, `pickUpNugget(spot)` picks one up, `nuggetIsThere()` / `underPile()` say whether it can be seen, and `updateHiddenNuggets(dt)` (every frame, from `updateEffects()`) shows them and flashes their glints. Each nugget has an entry in `interactables`. Stats for the end screen: `STATS_START`, `endStatsRows()`.
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
- **Solids:** `solids` is the list of things you can't walk through (created at the start of the sluice section, filled in under "Solid things"). Each one is a `Box3`, a turnable "rect" (`excavatorRect`) or a "circle" (`pileCircle`, `pondCircle`, `rockCircle`); `nearestPoint()` and `distanceFromPoint()` work with all three. Solids are flat footprints with no height: that works because the things up on the bench (pile, excavator) and the things down below (sluice, pond, pad) never overlap, and the steep-ground rule (`steepAt()`) keeps you on your own level.
  - The pile's circle has an `edge` profile (`PILE_EDGE`, measured from the heap's own shape by `edgeProfile()`), because its lumps stick out up to about 9% past a plain circle; `circleRadius()` and `edgeAt()` read it. It scales with the pile as it shrinks, and `pileCircle.off` makes it not solid once the pile is gone (a solid with `off: true` is skipped).
  - **Walking into things** (`movePlayer()`): each move is split into steps of at most `MAX_STEP` (0.1 m), so a slow frame can't jump you past an edge. After each step `pushAway()` pushes you out of anything you touch (`pushOut()` also works when your middle has ended up inside a solid: out through the nearest edge). If you'd still overlap something (`stuckInSolid()`: a gap narrower than you are), that step isn't taken. `pushOutOfSolids()` runs every frame and when things appear or grow, and if you're wedged in (say an upgrade made the sluice grow onto you), `moveToFreeSpot()` hops you to the nearest spot where you fit. `PLAYER_RADIUS` is 0.4 m.
- **Interacting:** `interactables` lists what E works on (hidden nuggets, pile, sluice, pond, shop, excavator); `nearbyThing()` picks the **closest** one in reach. `keepDigging()` handles holding E (or the left mouse button, or the Dig button) with a pickaxe. Each entry's `label` is what the touch Interact button says.
- **Excavator:** `buildExcavator()` rebuilds the model from the current upgrades (the moving parts end up in `ex`), `poseExcavator()` moves the arm and bucket to match `state.exc` (including the hydraulic rams), and `operateExcavator(dt)` handles the controls, scooping and dumping. The excavator's own "forward" is +x. `enterExcavator()` and `exitExcavator()` get you in and out; `excavatorHint()` is the hint under the crosshair.
- **Sounds:** `startAudio()` creates the sound system on the first click or tap (and wakes it up again after that). `tone()` and `noise()` make one-off sounds, `sfx` has one function per game sound, and `loops` holds the sounds that keep running, which `updateSounds()` adjusts 10 times a second. `toggleMute()` switches everything on or off.
- **Shop:** `makeShopRow()` makes one row per upgrade, `showShopTab(id)` / `switchShopTab(step)` switch tabs, `shopSummaryText()` is the line at the top, `updateShop()` refreshes the open tab.
- **Icons:** `ICONS` has one drawing function per tool, upgrade and summary icon (`sluiceAll`, `pondAll`), and `updateToolbar()` redraws the bar (it runs after every purchase).

## Working with the user

The user is a beginner. Explain steps in plain language, keep the code readable with short comments, and prefer simple approaches over clever ones.
