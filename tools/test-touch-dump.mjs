// Tests the excavator on a phone: swing to the hopper with the touch Swing button, hold Dump,
// and check the dirt really ends up in the sluice. At Bucket Size 1 and 12, and with everything maxed.
//
//   node tools/test-touch-dump.mjs
//
// What it does: starts a tiny web server for the game folder, opens the game in a hidden Chrome that
// pretends to be an Android phone held sideways (915 x 412, touch screen), puts a ready-made save in
// (excavator bought, bucket full, sitting in the cab over the dirt pile), then uses real touches on the
// on-screen buttons, like a thumb would. Afterwards it reads the saved game to see where the dirt went.
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
// Every upgrade with 12 levels (the excavator itself is one purchase)
const EVERY_UPGRADE = ['shovel', 'carrier', 'pickaxe', 'classifier', 'mesh', 'nozzles', 'length', 'water', 'pressure', 'pumps', 'hoses', 'generators', 'pondSize', 'filters', 'speed'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- A tiny web server for the game folder ----------
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

// ---------- Hidden Chrome, controlled through its "DevTools" connection ----------
async function startChrome() {
  const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
  if (!chromePath) throw new Error('Could not find Google Chrome. Add its path to CHROME_PATHS.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-rush-touch-'));
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

// ---------- Fingers ----------
// The middle of a button on the screen
async function middleOf(chrome, id) {
  return chrome.run(`(() => {
    const r = document.getElementById('${id}').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, shown: r.width > 0 };
  })()`);
}
// Put a finger down on a button (and check the button really is the thing under the finger)
async function press(chrome, id, finger = 1) {
  const p = await middleOf(chrome, id);
  if (!p.shown) throw new Error(`The ${id} button isn't showing.`);
  const onTop = await chrome.run(`document.elementFromPoint(${p.x}, ${p.y})?.closest('button')?.id || document.elementFromPoint(${p.x}, ${p.y})?.id`);
  if (onTop !== id) throw new Error(`Something else (${onTop}) is covering the ${id} button.`);
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: finger }] });
  return p;
}
async function lift(chrome) {
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tap(chrome, x, y) {
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await wait(60);
  await lift(chrome);
}
const hint = (chrome) => chrome.run(`document.getElementById('prompt').textContent`);
// The game saves when the page is hidden: make it save now, and read the save
const readGame = (chrome) => chrome.run(`dispatchEvent(new Event('pagehide')), JSON.parse(localStorage.getItem('goldRush.save'))`);

// ---------- One test: a full bucket from the pile into the hopper ----------
async function testBucketLevel(chrome, url, bucketLevel, everythingMaxed = false) {
  // A ready-made save: excavator bought, sitting in the cab, the bucket full (300 scoops is more than any bucket holds,
  // so the game fills it to the brim) and swung over the dirt pile.
  // (The game fills in everything else with its starting values, like for an old save.)
  const save = {
    version: 1, money: 0, pile: 150000, sluiceQueue: 0,
    levels: everythingMaxed
      ? { ...Object.fromEntries(EVERY_UPGRADE.map((id) => [id, 12])), excavator: 1, digBucket: bucketLevel }
      : { pickaxe: 1, classifier: 1, excavator: 1, digBucket: bucketLevel },
    excavator: { swing: -1.9, bucketPitch: 0.6, load: 300, inCab: true, lookYaw: 0, lookPitch: -0.3 },
    settings: { muted: true, hints: true },
  };
  // (Put it in from another page on the same site: the game itself saves as it closes, which would overwrite it)
  await chrome.send('Page.navigate', { url: new URL('manifest.json', url).href });
  for (let i = 0; i < 50 && !(await chrome.run(`location.href.endsWith('manifest.json')`)); i++) await wait(100);
  await chrome.run(`localStorage.setItem('goldRush.save', ${JSON.stringify(JSON.stringify(save))}), localStorage.setItem('goldRush.excavatorHelp', 'closed')`);
  await chrome.send('Page.navigate', { url });
  await waitForGame(chrome);

  // Tap the start screen to play (like a thumb on "Tap to continue")
  await tap(chrome, PHONE.width / 2, PHONE.height / 2);
  await wait(500);
  const playing = await chrome.run(`document.body.classList.contains('playing') && document.body.classList.contains('touch') && document.body.classList.contains('in-excavator')`);
  if (!playing) throw new Error('The game did not start in touch mode, in the excavator.');

  const before = await readGame(chrome);
  // Hold the left Swing button until the hint says it's lined up over the hopper
  await press(chrome, 't-left');
  let lined = false;
  for (let i = 0; i < 200 && !lined; i++) {
    await wait(25);
    lined = (await hint(chrome)).startsWith('Lined up over the hopper');
  }
  await lift(chrome);
  if (!lined) throw new Error(`Swinging never lined up with the hopper (hint: "${await hint(chrome)}").`);
  const swung = await readGame(chrome);

  // Hold Dump until it's poured out (tipping down takes about 1.5 s, pouring 1.5 s)
  await press(chrome, 't-dump');
  for (let i = 0; i < 80; i++) {
    await wait(100);
    if ((await readGame(chrome)).excavator.load === 0) break;
  }
  await wait(300);
  await lift(chrome);
  const after = await readGame(chrome);
  const into = after.stats.scoopsByExcavator - before.stats.scoopsByExcavator;
  const ok = before.excavator.load > 0 && after.excavator.load === 0 && into === before.excavator.load;
  console.log(`Bucket Size Lv ${bucketLevel}${everythingMaxed ? ', everything else maxed' : ''}: lined up at swing ${swung.excavator.swing.toFixed(2)}, ` +
    `bucket ${before.excavator.load} -> ${after.excavator.load} scoops, ${into} scoops went into the sluice ` +
    `(queue now ${after.sluiceQueue}): ${ok ? 'PASS' : 'FAIL'}`);
  return ok;
}

async function waitForGame(chrome) {
  for (let i = 0; i < 300; i++) {
    if (await chrome.run(`!!document.querySelector('canvas') && document.readyState === 'complete'`).catch(() => false)) break;
    await wait(200);
  }
  await wait(1500); // the module script and Three.js
}

const server = await startServer();
const chrome = await startChrome();
let allOk = true;
try {
  await chrome.send('Runtime.enable');
  await chrome.send('Emulation.setDeviceMetricsOverride', { ...PHONE, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
  await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await chrome.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  for (const level of [1, 12]) allOk = (await testBucketLevel(chrome, url, level)) && allOk;
  allOk = (await testBucketLevel(chrome, url, 12, true)) && allOk; // the biggest sluice too
} catch (e) {
  console.log(`FAIL: ${e.message}`);
  allOk = false;
} finally {
  chrome.close();
  server.close();
}
console.log(allOk ? 'All passed.' : 'Something failed.');
process.exitCode = allOk ? 0 : 1;
