// Tests the ramps up to the dig bench, especially the second one up the east face (next to the crib wall).
//
//   node tools/test-ramps.mjs
//
// 1. The ground (worked out here in Node from the game's own ground code): a flood fill over the dig site,
//    walking only where the game lets you, must reach the bench top through each ramp, and not at all
//    without the ramps. Every hidden nugget must still be within reach of walkable ground.
// 2. Walking (in a hidden Chrome pretending to be an Android phone, using the real touch joystick):
//    up the new ramp to the top without getting stuck, stopping at the dirt pile instead of walking into it;
//    back down; pushing towards each side halfway up (you must stay on the ramp, not slip off); and from
//    the top along the bench to the hopper.
// It needs Node.js (version 22 or newer), Google Chrome, and an internet connection for Three.js.
// It uses its own empty Chrome profile, so your saved game is never touched.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GAME_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${os.homedir()}/AppData/Local/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const PHONE = { width: 915, height: 412, deviceScaleFactor: 2.625 }; // a typical Android phone, held sideways
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let allOk = true;
function check(ok, text) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${text}`);
  if (!ok) allOk = false;
}

// ---------- The game's own ground code, taken out of index.html ----------
const html = fs.readFileSync(path.join(GAME_FOLDER, 'index.html'), 'utf8');
const between = (from, to) => {
  const start = html.indexOf(from), end = html.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`Couldn't find "${from}" in index.html`);
  return html.slice(start, end);
};
const groundCode = between('const clamp = (value', '// ---------- Textures') + between('const BENCH = {', '// How grassy the ground is');
const nuggetCode = between('const HIDDEN_NUGGETS = [', '// How each kind looks');
// Make a copy of the ground with only some of the ramps (which = list of ramp numbers to keep)
function makeGround(which) {
  return new Function(`${groundCode}
    const keep = RAMPS.filter((ramp, i) => ${JSON.stringify(which)}.includes(i)); RAMPS.length = 0; RAMPS.push(...keep);
    ${nuggetCode}
    return { groundHeight, steepAt, BENCH, RAMPS, HIDDEN_NUGGETS };`)();
}
const game = makeGround([0, 1]);

// ---------- 1. The ground: where can you walk? ----------
// Solids you can't walk through, grown by your size (0.4 m): the full dirt pile (with its lumps, up to 9% out),
// the crib wall and the excavator's tracks. (The pile only gets smaller, so this is the hardest case.)
const PLAYER = 0.4, PILE = { x: -14.84, z: -17.42, radius: 13 * 1.09 };
function blocked(x, z, excavator) {
  if (Math.hypot(x - PILE.x, z - PILE.z) < PILE.radius + PLAYER) return true;
  if (x > 1.7 - PLAYER && x < 2.1 + PLAYER && z > -12 - PLAYER && z < -2 + PLAYER) return true;
  return excavator && Math.abs(x) < 1.3 + PLAYER && z > -11.6 - PLAYER && z < -8.4 + PLAYER;
}
// Walk everywhere you can from the camp, on a 0.1 m grid (the same rule as the game: no stepping onto
// ground steeper than you can walk, unless you're already on steep ground and going down)
function floodFill(ground, excavator = true) {
  const G = 0.1, X0 = -29, Z0 = -29, N = 581;
  const height = new Float32Array(N * N), steep = new Uint8Array(N * N), wall = new Uint8Array(N * N), seen = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = X0 + i * G, z = Z0 + j * G, k = j * N + i;
    height[k] = ground.groundHeight(x, z);
    steep[k] = ground.steepAt(x, z) ? 1 : 0;
    wall[k] = blocked(x, z, excavator) ? 1 : 0;
  }
  const start = Math.round((3 - Z0) / G) * N + Math.round((0 - X0) / G), todo = [start];
  seen[start] = 1;
  while (todo.length) {
    const k = todo.pop(), i = k % N, j = (k - i) / N;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const n = nj * N + ni;
      if (seen[n] || wall[n] || (steep[n] && !(steep[k] && height[n] < height[k]))) continue;
      seen[n] = 1;
      todo.push(n);
    }
  }
  const at = (x, z) => seen[Math.round((z - Z0) / G) * N + Math.round((x - X0) / G)] === 1;
  let benchTop = 0;
  for (let k = 0; k < N * N; k++) if (seen[k] && height[k] > ground.BENCH.height - 0.1) benchTop++;
  return { at, benchTop, G };
}
const both = floodFill(game), none = floodFill(makeGround([])), southOnly = floodFill(makeGround([0])), eastOnly = floodFill(makeGround([1]));
check(none.benchTop === 0, `without ramps the bench top can't be reached (${none.benchTop} spots)`);
check(southOnly.at(-5, -3.5), 'the camp ramp alone leads up onto the bench');
check(eastOnly.at(0.5, -17.75), 'the new east ramp alone leads up onto the bench');
check(both.at(0.5, -17.75) && both.at(-5, -3.5), 'with both ramps, both tops are reachable');
// From the top of the new ramp, along the bench to the hopper's edge (standing where you tip dirt in)
const hopperNoExcavator = floodFill(makeGround([1]), false).at(1.2, -7);
check(hopperNoExcavator, 'before the excavator is bought: from the new ramp along the bench to the hopper (full pile)');
// Hidden nuggets: each one (except the two under the pile) within reach (1.5 m) of somewhere you can stand
for (const n of game.HIDDEN_NUGGETS.filter((n) => !n.id.endsWith('ile'))) {
  let near = false;
  for (let dx = -1.5; dx <= 1.5 && !near; dx += 0.1) for (let dz = -1.5; dz <= 1.5 && !near; dz += 0.1) {
    if (Math.hypot(dx, dz) <= 1.4 && both.at(n.x + dx, n.z + dz)) near = true;
  }
  check(near, `hidden nugget "${n.id}" can be reached`);
}

// ---------- 2. Walking it on a phone, with the touch joystick ----------
// A tiny web server for the game folder
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
function startServer() {
  const server = http.createServer((req, res) => {
    let name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (name === '/') name = '/index.html';
    const file = path.join(GAME_FOLDER, name);
    if (!file.startsWith(GAME_FOLDER) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Hidden Chrome, controlled through its "DevTools" connection
async function startChrome() {
  const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
  if (!chromePath) throw new Error('Could not find Google Chrome. Add its path to CHROME_PATHS.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-rush-ramps-'));
  const chrome = spawn(chromePath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${PHONE.width},${PHONE.height}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio', '--ignore-gpu-blocklist', '--enable-gpu',
    'about:blank',
  ], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = '';
  for (let i = 0; i < 150 && !port; i++) {
    try {
      port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
    } catch (e) { /* not there yet */ }
    if (!port) await wait(100);
  }
  if (!port) {
    chrome.kill();
    throw new Error('Chrome did not start.');
  }
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const socket = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1;
  const waiting = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (waiting.has(message.id)) {
      waiting.get(message.id)(message);
      waiting.delete(message.id);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  async function run(code) {
    const { result } = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  function close() {
    socket.close();
    chrome.kill();
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch (e) { /* Windows may still have Chrome's files open: it's only a temporary folder, so leave it */ }
    }, 1000);
  }
  return { send, run, close };
}

async function waitForGame(chrome) {
  for (let i = 0; i < 300; i++) {
    if (await chrome.run(`!!document.querySelector('canvas') && document.readyState === 'complete'`).catch(() => false)) break;
    await wait(200);
  }
  await wait(1500); // the module script and Three.js
}
// The game saves when the page is hidden: make it save now, and read where you're standing
const whereAmI = async (chrome) => (await chrome.run(`dispatchEvent(new Event('pagehide')), JSON.parse(localStorage.getItem('goldRush.save'))`)).player;

// Start the game standing at (x, z), looking along yaw (0 = north (-z), PI/2 = west (-x), -PI/2 = east, PI = south)
async function startAt(chrome, url, x, z, yaw, levels = {}) {
  const save = {
    version: 1, money: 0, pile: 100000, carrying: 0, levels,
    player: { x, z, yaw, pitch: -0.1 }, settings: { muted: true, hints: true, quality: 'Low' },
  };
  // (Put it in from another page on the same site: the game itself saves as it closes, which would overwrite it)
  await chrome.send('Page.navigate', { url: new URL('manifest.json', url).href });
  for (let i = 0; i < 50 && !(await chrome.run(`location.href.endsWith('manifest.json')`)); i++) await wait(100);
  await chrome.run(`localStorage.setItem('goldRush.save', ${JSON.stringify(JSON.stringify(save))})`);
  await chrome.send('Page.navigate', { url });
  await waitForGame(chrome);
  // Tap the start screen to play (like a thumb on "Tap to continue")
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: PHONE.width / 2, y: PHONE.height / 2, id: 1 }] });
  await wait(60);
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(500);
  if (!(await chrome.run(`document.body.classList.contains('playing') && document.body.classList.contains('touch')`))) {
    throw new Error('The game did not start in touch mode.');
  }
}

// Hold the joystick: a thumb goes down on the left half of the screen and pushes (dx, dy) pixels
// (60 = all the way; dy -60 = straight forward). Every 0.25 s it notes where you are, and returns those spots.
async function holdStick(chrome, seconds, dx = 0, dy = -60) {
  const base = { x: 160, y: 300 };
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...base, id: 7 }] });
  await wait(50);
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: base.x + dx, y: base.y + dy, id: 7 }] });
  const spots = [];
  for (let t = 0; t < seconds; t += 0.25) {
    await wait(250);
    spots.push(await whereAmI(chrome));
  }
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(200);
  return spots;
}
const interactLabel = (chrome) => chrome.run(`document.getElementById('t-use-label')?.textContent.trim() || ''`);
const fmt = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)}, ${game.groundHeight(p.x, p.z).toFixed(2)} m up)`;
// The longest time (seconds) spent nearly standing still while the stick was pushed, before reaching the goal
function longestStop(spots, done) {
  let worst = 0, still = 0;
  for (let i = 1; i < spots.length && !done(spots[i - 1]); i++) {
    still = Math.hypot(spots[i].x - spots[i - 1].x, spots[i].z - spots[i - 1].z) < 0.15 ? still + 0.25 : 0;
    worst = Math.max(worst, still);
  }
  return worst;
}

const R = game.RAMPS[1], MIDDLE = (R.side1 + R.side2) / 2;
const server = await startServer();
const chrome = await startChrome();
try {
  await chrome.send('Runtime.enable');
  await chrome.send('Emulation.setDeviceMetricsOverride', { ...PHONE, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
  await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await chrome.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
  const url = `http://127.0.0.1:${server.address().port}/index.html`;

  // Up the new ramp from the grass below it, straight on, and on into the dirt pile
  // (about 2.5 s to the pile at full speed; then you slide along its side, never into it)
  for (const [name, z] of [['middle', MIDDLE], ['near its north edge', R.side1 + 0.6], ['near its south edge', R.side2 - 0.6]]) {
    await startAt(chrome, url, R.bottom + 2.5, z, Math.PI / 2);
    const spots = await holdStick(chrome, 4);
    const end = spots.at(-1), top = (p) => p.x < R.top;
    check(spots.some(top) && game.groundHeight(end.x, end.z) > game.BENCH.height - 0.1, `up the ramp (${name}): reached the top, ended at ${fmt(end)}`);
    check(longestStop(spots, top) < 0.5, `up the ramp (${name}): never got stuck on the way (longest stop ${longestStop(spots, top)} s)`);
    const closest = Math.min(...spots.map((p) => Math.hypot(p.x - PILE.x, p.z - PILE.z)));
    check(closest > 13, `up the ramp (${name}): stopped at the dirt pile, not inside it (${(closest - 13).toFixed(2)} m outside its plain circle)`);
    const label = await interactLabel(chrome);
    check(/dig/i.test(label), `up the ramp (${name}): standing at the pile, the Interact button says "${label}"`);
  }

  // Back down from the top to the grass
  await startAt(chrome, url, R.top - 0.8, MIDDLE, -Math.PI / 2);
  let spots = await holdStick(chrome, 4);
  check(spots.at(-1).x > R.bottom && game.groundHeight(spots.at(-1).x, spots.at(-1).z) < 0.2, `down the ramp: ended on the ground at ${fmt(spots.at(-1))}`);
  check(longestStop(spots, (p) => p.x > R.bottom) < 0.5, 'down the ramp: never got stuck on the way');

  // Halfway up, pushing towards each side: you must stay on the ramp, not slide off its steep sides
  // (its edges are rounded, so you can step a little way onto the shoulder before it gets too steep)
  for (const [name, yaw, side] of [['north', 0, R.side1], ['south', Math.PI, R.side2]]) {
    await startAt(chrome, url, (R.top + R.bottom) / 2, MIDDLE, yaw);
    spots = await holdStick(chrome, 3);
    const furthest = spots.reduce((most, p) => Math.max(most, Math.abs(p.z - MIDDLE)), 0);
    const end = spots.at(-1);
    const onRamp = game.groundHeight((R.top + R.bottom) / 2, MIDDLE);
    check(furthest < Math.abs(side - MIDDLE) + 0.6 && game.groundHeight(end.x, end.z) > onRamp - 0.15, `halfway up, pushing ${name} off the side: stayed on the ramp, at ${fmt(end)}`);
  }

  // From the top of the new ramp, along the bench to the hopper's edge (before the excavator is bought)
  await startAt(chrome, url, 0.6, R.side2 + 0.5, Math.PI);
  spots = await holdStick(chrome, 6);
  check(spots.some((p) => p.z > -8 && game.groundHeight(p.x, p.z) > game.BENCH.height - 0.1), `from the top, along the bench to the hopper: got to ${fmt(spots.at(-1))}`);
  // Once it's bought, the excavator is parked on that path (between the pile and the crib wall), so you can't
  // walk past it: but you can walk up to it from the ramp and climb in
  await startAt(chrome, url, 0.6, R.side2 + 0.5, Math.PI, { pickaxe: 1, classifier: 1, excavator: 1 });
  spots = await holdStick(chrome, 3);
  const label = await interactLabel(chrome);
  check(/get in/i.test(label), `from the top, walking to the excavator: stopped at ${fmt(spots.at(-1))}, the Interact button says "${label}"`);
} catch (e) {
  check(false, e.message);
} finally {
  chrome.close();
  server.close();
}
console.log(allOk ? 'All passed.' : 'Something failed.');
process.exitCode = allOk ? 0 : 1;
