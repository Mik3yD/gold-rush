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
| E or left click | Dig, dump dirt, or dig up a buried nugget (when you're close to something) |
| B | Open or close the shop (then click an item or press 1 to 6 to buy it) |
| M | Mute or unmute the metal detector |
| Esc | Pause and get your mouse back |

The loop: walk to the **DIRT** pile and dig until your bucket is full. Carry it to the **SLUICE** and dump it in. The sluice washes the dirt and pays you for any gold it finds. Press **B** to spend your money on a better shovel, a bigger bucket or wheelbarrow, a gold pan, a faster sluice, a metal detector for finding buried nuggets, and finally a small excavator that digs for you.

## If double-clicking doesn't work

First check that you're online. If you still see only a blue screen, some browser settings block pages opened straight from a file. You can get around that by running a tiny local web server:

1. Install Python once: `winget install Python.Python.3.12`
2. In this folder, run: `python -m http.server 8000`
3. Open http://localhost:8000 in your browser. Press Ctrl+C in the terminal to stop the server.

## Built with

- HTML and JavaScript
- [Three.js](https://threejs.org/), loaded from the jsDelivr CDN
