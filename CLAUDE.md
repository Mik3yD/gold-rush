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

## Current state (version 1: kept deliberately simple)

- Flat ground, a dirt pile, a sluice box and a shop table, all made of plain shapes.
- Wallet, bucket and sluice counters in the HUD.
- One upgrade: the Big Shovel ($25), which digs 3 scoops at a time instead of 1.
- No saving yet. Progress resets when you reload the page.

Future ideas: nicer graphics and models, more upgrades (bigger bucket, faster sluice, wheelbarrow, excavator), sounds, and saving progress.

## Code layout

- `index.html` holds everything: the page, the HUD, and the game code in one `<script type="module">`.
- Three.js is loaded through an import map from jsDelivr (version pinned to 0.170.0).
- The `SETTINGS` object at the top of the script holds all the tuning numbers (prices, chances, speeds).
- The `state` object holds everything that changes during play (money, bucket, sluice queue, upgrades).

## Working with the user

The user is a beginner. Explain steps in plain language, keep the code readable with short comments, and prefer simple approaches over clever ones.
