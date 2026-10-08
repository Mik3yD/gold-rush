// Takes the pictures for the end-game cutscene, automatically.
//
//   node tools/capture-cutscene.mjs              (all the shots)
//   node tools/capture-cutscene.mjs sluice pond   (only shots whose names contain these words)
//   node tools/capture-cutscene.mjs --info        (also print where things are, for aiming the camera)
//
// What it does: starts a tiny web server for the game folder, opens the game in a hidden Chrome window
// with ?photo at the end of the address (photo mode: see "PHOTO MODE" in index.html), sets up each shot
// through window.goldRushPhoto, and saves it as a 1920 x 1080 PNG in cutscene-shots/.
// It needs Node.js (version 22 or newer) and Google Chrome, and an internet connection for Three.js.
// Nothing to install. It uses its own empty Chrome profile, so your saved game is never touched.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GAME_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FOLDER = path.join(GAME_FOLDER, 'cutscene-shots');
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${os.homedir()}/AppData/Local/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

// ---------- The shots ----------
// Each one runs inside the game page. P is window.goldRushPhoto: setup(), camera(from, to, fov), step(seconds),
// excavator(), minerDigging(), nugget(), sunset(), spots(), ground(x, z). Positions are [x, height, z] in meters.
// The pile and the excavator are up on the dig bench (spots().bench meters above the ground), so heights near them
// are measured from the bench top, and ground(x, z) gives the ground's height anywhere.
const SHOTS = [
  ['01-huge-pile-at-start', (P) => {
    P.setup({ levels: 'none' });
    const s = P.spots();
    P.camera([-1.2, P.ground(-1.2, -3.6) + 0.25, -3.6], [s.pile[0], s.bench + 5.5, s.pile[2]], 62); // low down on the bench, looking up
    P.step(0.5);
  }],
  ['02-digging-with-shovel', (P) => {
    P.setup({ levels: 'none' });
    const m = P.minerDigging(0.15);
    P.step(0.15); // the dirt has just flown up off the shovel
    const side = m.facing - Math.PI / 2;
    const from = [m.x + Math.cos(side) * 3.2 + Math.cos(m.facing) * 0.9, m.y + 1.25, m.z + Math.sin(side) * 3.2 + Math.sin(m.facing) * 0.9];
    P.camera(from, [m.x - Math.cos(m.facing) * 0.6, m.y + 0.85, m.z - Math.sin(m.facing) * 0.6], 50);
  }],
  ['03-sluice-fully-upgraded', (P) => {
    P.setup({ levels: 'max', pileLeft: 0.6, sluiceQueue: 3000, rocks: 6000 });
    P.step(3);
    P.camera([3.2, 3.0, -12.8], [10.5, 0.5, -6.4], 55); // from the far side, looking down the sluice to the pond
  }],
  ['04-excavator-scooping', (P) => {
    P.setup({ levels: 'max', pileLeft: 0.75 });
    P.excavator({ swing: -1.95, bucketPitch: -0.55, hold: ['KeyQ'] });
    P.step(0.3); // part way through the curl, with dirt in the bucket
    P.bucketDirt('belly', 35, { lift: 0.5 });
    P.step(0.14);
    const s = P.spots();
    // From the side of the arm, so the bucket digging into the pile is in full view
    const mid = [(s.cab[0] + s.bucket[0]) / 2, (s.cab[2] + s.bucket[2]) / 2];
    const across = Math.atan2(s.bucket[2] - s.cab[2], s.bucket[0] - s.cab[0]) - Math.PI / 2 + 0.2;
    P.camera([mid[0] + Math.cos(across) * 6.2, s.bench + 2.6, mid[1] + Math.sin(across) * 6.2], [mid[0] - 0.8, s.bench + 1.7, mid[1] - 0.6], 60);
  }],
  ['05-excavator-dumping-into-sluice', (P) => {
    P.setup({ levels: 'max', pileLeft: 0.75, sluiceQueue: 400 });
    P.step(1.5);
    // Over the hopper (swing range: P.swingRange), holding F: it tips out and pours a stream of dirt into the hopper
    P.excavator({ swing: P.swingRange.hopperMiddle, bucketPitch: -0.9, load: 0.8, hold: ['KeyF'] });
    P.step(0.7);
    const s = P.spots();
    // From down by the sluice, looking up at the bucket pouring into the hopper below the bench's edge
    P.camera([s.hopper[0] + 4.2, 3.4, s.hopper[2] - 5.4], [s.hopper[0] - 0.6, 2.7, s.hopper[2] - 0.2], 55);
  }],
  ['06-big-nugget-found', (P) => {
    P.setup({ levels: 'max', pileLeft: 0.6, sluiceQueue: 3000 });
    P.step(2);
    P.nugget('large');
    P.step(0.5); // risen out of the sluice, with its rays and sparkles
    const n = P.spots().nugget;
    P.camera([n[0] - 1.3, n[1] + 0.6, n[2] - 3.0], [n[0], n[1] - 0.15, n[2]], 45);
  }],
  ['07-tailing-pond-filters', (P) => {
    P.setup({ levels: 'max', pileLeft: 0.6, sluiceQueue: 3000, pond: 0.45, pondGold: 300 });
    P.step(3);
    const p = P.spots().pond;
    P.camera([p[0] + 7, 4.2, p[2] + 5], [p[0] - 2, 0, p[2] - 0.5], 55); // from across the pond, looking back at the filters by the inlet
  }],
  ['08-whole-camp-wide', (P) => {
    P.setup({ levels: 'max', pileLeft: 0.55, sluiceQueue: 3000, pond: 0.4, pondGold: 200, rocks: 8000 });
    P.excavator({ swing: 0.85, bucketPitch: -0.3 });
    P.step(3);
    P.camera([34, 21, 27], [-1, 0, -8], 55);
  }],
  ['09-pile-almost-gone', (P) => {
    P.setup({ levels: 'max', pileLeft: 0.03, rocks: 12000 });
    P.excavator({ swing: -1.6, bucketPitch: -0.3 });
    P.step(0.5);
    const s = P.spots();
    P.camera([s.pile[0] + 9, s.bench + 3.2, s.pile[2] - 4.5], [s.pile[0] - 2, s.bench + 0.6, s.pile[2] - 0.5], 60); // with the sun behind, over the bare bench where the pile was
  }],
  ['10-empty-site-at-sunset', (P) => {
    P.setup({ levels: 'max', pileLeft: 0, rocks: 12000 });
    P.excavator({ swing: 0.3, bucketPitch: -0.3 });
    P.sunset(true);
    P.step(0.5);
    P.camera([30, 3.2, -26], [-2, 3.5, 2], 60);
  }],
];

// ---------- A tiny web server for the game folder ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
function startServer() {
  const server = http.createServer((req, res) => {
    const file = path.join(GAME_FOLDER, decodeURIComponent(new URL(req.url, 'http://x').pathname));
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-rush-photo-'));
  const chrome = spawn(chromePath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1920,1080',
    '--no-first-run', '--no-default-browser-check', '--mute-audio', '--ignore-gpu-blocklist', '--enable-gpu',
    'about:blank',
  ], { stdio: 'ignore' });
  // Chrome writes the port it picked into the profile folder (keep trying: it may still be writing it)
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = '';
  for (let i = 0; i < 150 && !port; i++) {
    try {
      port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
    } catch (e) { /* not there yet */ }
    if (!port) await new Promise((r) => setTimeout(r, 100));
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
  // Run some code in the page and get the answer back
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

// ---------- Take the shots ----------
const showInfo = process.argv.includes('--info');
const wanted = process.argv.slice(2).filter((word) => !word.startsWith('--'));
const shots = SHOTS.filter(([name]) => !wanted.length || wanted.some((word) => name.includes(word)));
fs.mkdirSync(OUT_FOLDER, { recursive: true });

const server = await startServer();
const chrome = await startChrome();
try {
  await chrome.send('Runtime.enable');
  await chrome.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/index.html?photo` });
  // Wait for the game to load (Three.js comes from the internet)
  for (let i = 0; i < 300; i++) {
    if (await chrome.run('!!window.goldRushPhoto').catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!(await chrome.run('!!window.goldRushPhoto'))) throw new Error('The game did not load in photo mode.');
  console.log(`Graphics: ${await chrome.run(`(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
  })()`)}`);

  for (const [name, shot] of shots) {
    const started = Date.now();
    const png = await chrome.run(`(${shot})(window.goldRushPhoto), window.goldRushPhoto.capture()`);
    const file = path.join(OUT_FOLDER, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
    console.log(`Saved ${path.relative(GAME_FOLDER, file)} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    if (showInfo) console.log(JSON.stringify(await chrome.run('window.goldRushPhoto.spots()'), (k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)));
  }
} finally {
  chrome.close();
  server.close();
}
