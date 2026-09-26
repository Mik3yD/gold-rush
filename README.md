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
| F or hold right click | Tip the bucket out to dump (over the sluice or the highbanker) |
| Mouse | Look around |
| E | Get out |

The tools you own are shown along the bottom of the screen, each with its level. Upgraded tools get better-looking icons, and every sluice, pond and excavator upgrade also changes how things look in the game.

The loop: walk to the **DIRT** pile and dig until your bucket is full. Carry it to the **SLUICE** and dump it in. The sluice washes the dirt and pays you for any gold it finds. The gold it misses flows into the **tailing pond** with the muddy water: walk up to the pond and press E to collect what the filters caught. If the pond fills up, the sluice slows down until you make the pond bigger.

Press **B** to open the shop. It has four tabs:
- **Tools:** shovel, bucket/wheelbarrow, and three new tools that unlock in order: the pickaxe (hold to dig), the classifier screen (screens out rocks) and the highbanker (a second washer next to the pile).
- **Sluice:** mesh, nozzles, length, extra water, pressure, pumps, hoses and generators. Some need others first (for example, more pumps need a bigger generator).
- **Tailing Pond:** pond size and filters.
- **Excavator:** the last and most expensive tool, plus its bucket size and speed. It parks between the pile and the sluice: climb in, scoop from the pile and swing over to dump into the sluice or the highbanker.

Every upgrade has 12 levels.

There is one giant pile of dirt (22,000 tons) for the whole game. The tons left are always shown in the top left, and the pile shrinks as you dig. When every last ton has been dug up and washed, the game ends and shows how much gold you found, how many big nuggets, and how long you played.

## If double-clicking doesn't work

First check that you're online. If you still see only a blue screen, some browser settings block pages opened straight from a file. You can get around that by running a tiny local web server:

1. Install Python once: `winget install Python.Python.3.12`
2. In this folder, run: `python -m http.server 8000`
3. Open http://localhost:8000 in your browser. Press Ctrl+C in the terminal to stop the server.

## Built with

- HTML and JavaScript
- [Three.js](https://threejs.org/), loaded from the jsDelivr CDN
