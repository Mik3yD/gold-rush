# Gold Rush

A first-person 3D gold mining game that runs in your web browser.

Dig dirt, wash it in the sluice box, find gold, and buy better tools.

## How to play

1. Double-click `index.html` to open it in your browser (Chrome, Edge or Firefox). You need an internet connection because the 3D library, Three.js, is downloaded when the page opens.
2. Click the screen to start. Your mouse now controls where you look.

| Control | Action |
|---|---|
| W A S D | Walk |
| Mouse | Look around |
| E or left click | Dig, dump dirt, collect gold at the pond, or get in the excavator (when you're close to something). With a pickaxe, hold it at the pile to keep digging. |
| B | Open or close the shop (← → switch tabs; click an item or press its number to buy it) |
| M | Turn all sounds off or on (or click the speaker in the top right) |
| G | Switch the graphics between High and Low (Low runs faster on slower computers; the frame rate is shown in the bottom right) |
| Esc | Pause and get your mouse back |

Using the excavator (these controls are also shown on screen while you sit in it). It stays parked in one spot; you only swing its arm and tilt the bucket. The arm stays at one height: swing the bucket above the dirt pile and hold Q to scoop.

| Control | Action |
|---|---|
| A / D | Swing the arm left / right |
| Q or hold left click | Curl the bucket in to scoop (with the bucket above the dirt pile) |
| F or hold right click | Tip the bucket out to dump (over the sluice) |
| Mouse | Look around |
| E | Get out |

The tools you own are shown along the bottom of the screen, each with its level. Upgraded tools get better-looking icons, and every sluice, pond and excavator upgrade also changes how things look in the game.

The loop: walk to the **DIRT** pile and dig until your bucket is full. Carry it to the **SLUICE** and dump it in. The sluice washes the dirt and pays you for any gold it finds. The gold it misses flows into the **tailing pond** with the muddy water: walk up to the pond and press E to collect what the filters caught. If the pond fills up, the sluice slows down until you make the pond bigger.

Press **B** to open the shop. It has four tabs:
- **Tools:** shovel, bucket/wheelbarrow, and two new tools that unlock in order: the pickaxe (hold to dig) and the classifier screen (screens out rocks).
- **Sluice:** mesh, nozzles, length, extra water, pressure, pumps, hoses and generators. Some need others first (for example, more pumps need a bigger generator).
- **Tailing Pond:** pond size and filters.
- **Excavator:** the last and most expensive tool, plus its bucket size and speed. It parks between the pile and the sluice: climb in, scoop from the pile and swing over to dump into the sluice.

Every upgrade has 12 levels.

There is one giant pile of dirt (19,000 tons) for the whole game. The tons left are always shown in the top left, and the pile shrinks as you dig. When every last ton has been dug up and washed, the game ends with a full stats screen: hidden nuggets found, gold earned and money spent, tons washed by hand and by excavator, flakes, nuggets, pond gold, tools bought, and how long you played.

Keep your eyes open: real gold nuggets are hidden around the camp. Look for a little glint, walk up and press E (or tap Interact) to pick one up. Some are easy to spot, some are very well hidden, and a couple only turn up once the dirt pile has been dug away.

## Playing on a phone or tablet

Open **https://mik3yd.github.io/gold-rush/** on your phone and turn it sideways. Touch controls appear by themselves:

| Touch | Action |
|---|---|
| Left thumb (drag anywhere on the left half) | Walk: a joystick appears under your thumb |
| Right thumb (drag on the right half) | Look around |
| Interact | Dump, collect, open the shop, climb in... (its label says what) |
| Dig | Dig at the pile (hold it once you have a pickaxe) |
| Shop | Open the shop (tap an item to buy it, scroll with your finger) |
| Top right | Graphics High/Low, pause, sound on/off |
| In the excavator | ◀ ▶ swing, Scoop, Dump, Get out |

Phones start on Low graphics so the game runs smoothly; tap "Graphics" to switch.

**Add it to your home screen** to get a Gold Rush icon that opens full-screen like an app, and works even without signal once it has loaded once:
- **Android (Chrome):** menu (⋮) → *Add to Home screen* / *Install app*.
- **iPhone / iPad (Safari):** Share button → *Add to Home Screen*.

## If double-clicking doesn't work

First check that you're online. If you still see only a blue screen, some browser settings block pages opened straight from a file. You can get around that by running a tiny local web server:

1. Install Python once: `winget install Python.Python.3.12`
2. In this folder, run: `python -m http.server 8000`
3. Open http://localhost:8000 in your browser. Press Ctrl+C in the terminal to stop the server.

## Built with

- HTML and JavaScript
- [Three.js](https://threejs.org/), loaded from the jsDelivr CDN
