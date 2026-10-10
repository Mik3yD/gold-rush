// Tests that the game survives a phone running out of graphics memory, and that it doesn't leak graphics memory.
//
//   node tools/test-graphics-recovery.mjs
//
// It opens the game in a hidden Chrome pretending to be an Android phone held sideways (915 x 412, touch), and:
//   1. Buys every upgrade, one by one, from a new game, and checks the graphics card isn't left holding the old
//      models (it counts the WebGL buffers, textures and shader programs that are alive, and compares the count with
//      a game loaded straight in with everything maxed).
//   2. Plays a long session with everything maxed and the sluice washing (with a jackpot nugget every 3 seconds,
//      the biggest effect there is), and checks the graphics objects and the page's memory stay level.
//   3. Takes the 3D view away (WEBGL_lose_context, like a phone does when it runs out of graphics memory) and gives
//      it back: the "Reloading graphics…" note must show, the game must pause, and afterwards the 3D view must
//      draw again (not white), the tool bar icons must be there, and nothing must be lost.
//   4. Takes it away and doesn't give it back: the game must save and reload the page by itself.
// Screenshots go in a folder (printed at the end).
// It needs Node.js (version 22 or newer), Google Chrome, and an internet connection for Three.js.
// It uses its own empty Chrome profile, so your saved game is never touched.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GAME_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS_FOLDER = path.join(os.tmpdir(), 'gold-rush-graphics-shots');
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${os.homedir()}/AppData/Local/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const PHONE = { width: 915, height: 412, deviceScaleFactor: 2.625 }; // a typical Android phone, held sideways
const LONG_SESSION_SECONDS = Number(process.env.SESSION_SECONDS) || 90;
const EVERY_UPGRADE = ['shovel', 'carrier', 'pickaxe', 'classifier', 'mesh', 'nozzles', 'length', 'water', 'pressure', 'pumps', 'hoses', 'generators', 'pondSize', 'filters', 'speed', 'digBucket'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- A tiny web server for the game folder ----------
// (GAME_PAGE=some/other.html serves that file as index.html: handy for comparing with an older version)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
function startServer() {
  const server = http.createServer((req, res) => {
    let name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (name === '/') name = '/index.html';
    let file = path.join(GAME_FOLDER, name);
    if (name === '/index.html' && process.env.GAME_PAGE) file = path.resolve(process.env.GAME_PAGE);
    else if (!file.startsWith(GAME_FOLDER)) file = '';
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-rush-graphics-'));
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

// Runs in the page before the game: counts the WebGL objects that are alive (made and not deleted yet)
const GL_COUNTER = `(() => {
  const live = { buffers: 0, textures: 0, programs: 0, framebuffers: 0, renderbuffers: 0 };
  window.__glLive = live;
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    const wrap = (make, remove, kind) => {
      const makeIt = C.prototype[make], removeIt = C.prototype[remove];
      C.prototype[make] = function (...args) { const o = makeIt.apply(this, args); if (o) live[kind]++; return o; };
      C.prototype[remove] = function (o) { if (o) live[kind]--; return removeIt.call(this, o); };
    };
    wrap('createBuffer', 'deleteBuffer', 'buffers');
    wrap('createTexture', 'deleteTexture', 'textures');
    wrap('createProgram', 'deleteProgram', 'programs');
    wrap('createFramebuffer', 'deleteFramebuffer', 'framebuffers');
    wrap('createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers');
  }
})();`;

const glLive = (chrome) => chrome.run(`({ ...window.__glLive })`);
const readGame = (chrome) => chrome.run(`dispatchEvent(new Event('pagehide')), JSON.parse(localStorage.getItem('goldRush.save'))`);
const glText = (c) => `${c.buffers} buffers, ${c.textures} textures, ${c.programs} programs`;
async function heapMB(chrome) {
  await chrome.send('HeapProfiler.collectGarbage');
  const { result } = await chrome.send('Performance.getMetrics');
  return result.metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1e6;
}
// What the 3D view shows right now: its average brightness and how much it varies (a white screen doesn't vary)
const picture = (chrome) => chrome.run(`new Promise((resolve) => requestAnimationFrame(() => {
  const view = document.querySelector('body > canvas');
  const small = document.createElement('canvas');
  small.width = 64; small.height = 32;
  const ctx = small.getContext('2d');
  ctx.drawImage(view, 0, 0, 64, 32);
  const d = ctx.getImageData(0, 0, 64, 32).data;
  let sum = 0, sum2 = 0;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += v; sum2 += v * v; }
  const n = d.length / 4, mean = sum / n;
  resolve({ mean: Math.round(mean), spread: Math.round(Math.sqrt(sum2 / n - mean * mean)) });
}))`);
const drawsScene = (p) => p.spread > 12 && p.mean > 15 && p.mean < 235;
async function screenshot(chrome, name) {
  const { result } = await chrome.send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(SHOTS_FOLDER, { recursive: true });
  fs.writeFileSync(path.join(SHOTS_FOLDER, `${name}.png`), Buffer.from(result.data, 'base64'));
}

// Put a save in, open the game and tap to play
async function openGame(chrome, url, save) {
  // (Put it in from another page on the same site: the game itself saves as it closes, which would overwrite it)
  await chrome.send('Page.navigate', { url: new URL('manifest.json', url).href });
  for (let i = 0; i < 50 && !(await chrome.run(`location.href.endsWith('manifest.json')`)); i++) await wait(100);
  await chrome.run(`localStorage.clear(), sessionStorage.clear(), localStorage.setItem('goldRush.save', ${JSON.stringify(JSON.stringify(save))})`);
  await chrome.send('Page.navigate', { url });
  await waitForGame(chrome);
  await tap(chrome, PHONE.width / 2, PHONE.height / 2);
  await wait(800);
  if (!(await chrome.run(`document.body.classList.contains('playing')`))) throw new Error('The game did not start.');
}
async function waitForGame(chrome) {
  for (let i = 0; i < 300; i++) {
    if (await chrome.run(`!!document.querySelector('body > canvas') && document.readyState === 'complete'`).catch(() => false)) break;
    await wait(200);
  }
  await wait(2000); // the module script and Three.js
}
async function tap(chrome, x, y) {
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await wait(60);
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const maxedSave = (extra = {}) => ({
  version: 1, money: 123456, pile: 150000, sluiceQueue: 20000,
  levels: { ...Object.fromEntries(EVERY_UPGRADE.map((id) => [id, 12])), excavator: 1 },
  settings: { muted: true, hints: true },
  ...extra,
});
function result(name, ok, details) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${details}`);
  return ok;
}

// ---------- 1. Buying every upgrade doesn't leave the old models on the graphics card ----------
async function testBuyingEverything(chrome, url) {
  await openGame(chrome, url, { version: 1, money: 10000000, pile: 150000, settings: { muted: true, hints: true } });
  const start = await glLive(chrome);
  // Click every shop row over and over (each click buys one level if it can), letting a frame draw in between
  const bought = await chrome.run(`(async () => {
    let bought = 0;
    for (let round = 0; round < 40; round++) {
      for (const row of document.querySelectorAll('.shop-item')) {
        row.click();
        bought++;
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
    return bought;
  })()`);
  await wait(1000);
  const after = await glLive(chrome);
  const game = await readGame(chrome);
  const levels = Object.values(game.levels).reduce((a, b) => a + b, 0);

  // The same game, loaded straight in with everything maxed: what it should be using
  await openGame(chrome, url, maxedSave({ sluiceQueue: 0 }));
  const fresh = await glLive(chrome);
  const ok = levels === 193 && after.buffers <= fresh.buffers * 1.1 + 30 && after.textures <= fresh.textures + 10;
  return result('Buying all 193 upgrades', ok,
    `${levels} levels bought (${bought} clicks). At the start: ${glText(start)}. After buying: ${glText(after)}. ` +
    `Loaded straight in maxed: ${glText(fresh)}.`);
}

// ---------- 2. A long session at max upgrades stays level ----------
async function testLongSession(chrome, url) {
  await openGame(chrome, url + '?cheats=1', maxedSave());
  await wait(3000); // warm up: every effect has been made once
  const samples = [];
  const start = Date.now();
  let nextJackpot = 0, nextSample = 0;
  while (Date.now() - start < LONG_SESSION_SECONDS * 1000) {
    const t = (Date.now() - start) / 1000;
    if (t >= nextJackpot) { // a jackpot nugget (cheat J): the biggest pop-up, glow and burst of sparkles
      await chrome.run(`dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' }))`);
      nextJackpot += 3;
    }
    if (t >= nextSample) {
      samples.push({ t: Math.round(t), gl: await glLive(chrome), heap: await heapMB(chrome) });
      nextSample += 15;
    }
    await wait(250);
  }
  samples.push({ t: LONG_SESSION_SECONDS, gl: await glLive(chrome), heap: await heapMB(chrome) });
  await screenshot(chrome, '2-long-session');
  const first = samples[0], last = samples[samples.length - 1];
  for (const s of samples) console.log(`      ${String(s.t).padStart(3)} s: ${glText(s.gl)}, page memory ${s.heap.toFixed(1)} MB`);
  const game = await readGame(chrome);
  const ok = last.gl.buffers <= first.gl.buffers + 5 && last.gl.textures <= first.gl.textures + 2
    && last.gl.programs <= first.gl.programs + 2 && last.heap - first.heap < 8;
  return result(`A ${LONG_SESSION_SECONDS} s session at max upgrades`, ok,
    `${game.nuggets} nuggets found; graphics objects ${glText(first.gl)} -> ${glText(last.gl)}, ` +
    `page memory ${first.heap.toFixed(1)} -> ${last.heap.toFixed(1)} MB.`);
}

// ---------- 3. The graphics are lost and come back: the game carries on ----------
async function testLoseAndRestore(chrome, url) {
  await openGame(chrome, url, maxedSave());
  await wait(1500);
  const before = await picture(chrome);
  await chrome.run(`window.__lose = document.querySelector('body > canvas').getContext('webgl2').getExtension('WEBGL_lose_context'); __lose.loseContext()`);
  await wait(600);
  const noteShown = await chrome.run(`!document.getElementById('graphics-lost').hidden && document.getElementById('graphics-lost').textContent`);
  await screenshot(chrome, '3a-graphics-lost');
  const lostA = await readGame(chrome);
  await wait(1500);
  const lostB = await readGame(chrome);
  const paused = lostB.timePlayed === lostA.timePlayed && lostB.sluiceQueue === lostA.sluiceQueue;

  await chrome.run(`__lose.restoreContext()`);
  await wait(1500);
  const noteGone = await chrome.run(`document.getElementById('graphics-lost').hidden`);
  const after = await picture(chrome);
  const icons = await chrome.run(`[...document.querySelectorAll('#toolbar img')].map((img) => img.complete && img.naturalWidth > 0)`);
  await screenshot(chrome, '3b-graphics-back');
  await wait(1500);
  const game = await readGame(chrome);
  const goesOn = game.timePlayed > lostB.timePlayed && game.sluiceQueue < lostB.sluiceQueue; // the sluice is washing again
  const ok = drawsScene(before) && !!noteShown && paused && noteGone && drawsScene(after) && icons.length >= 5 && icons.every(Boolean)
    && goesOn && game.money >= lostA.money && game.settings.quality === 'Low';
  return result('Graphics lost, then given back', ok,
    `before: brightness ${before.mean} (varies ${before.spread}); note "${noteShown}"; paused while lost: ${paused}; ` +
    `after: note hidden ${noteGone}, brightness ${after.mean} (varies ${after.spread}), ${icons.filter(Boolean).length}/${icons.length} tool bar icons; ` +
    `carries on: ${goesOn}; money $${lostA.money} -> $${game.money}; graphics now ${game.settings.quality}.`);
}

// ---------- 4. The graphics are lost and don't come back: the game saves and reloads ----------
async function testLoseForGood(chrome, url) {
  await openGame(chrome, url, maxedSave());
  await wait(1000);
  await chrome.run(`window.__stillTheSamePage = true; document.querySelector('body > canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
  await wait(600);
  const lost = await chrome.run(`JSON.parse(localStorage.getItem('goldRush.save'))`);
  let reloaded = false;
  for (let i = 0; i < 40 && !reloaded; i++) { // it should reload after 5 s
    await wait(250);
    reloaded = await chrome.run(`!window.__stillTheSamePage`).catch(() => false);
  }
  await waitForGame(chrome);
  const game = await chrome.run(`JSON.parse(localStorage.getItem('goldRush.save'))`);
  const startScreen = await chrome.run(`getComputedStyle(document.getElementById('start')).display !== 'none'`);
  await tap(chrome, PHONE.width / 2, PHONE.height / 2);
  await wait(1500);
  const after = await picture(chrome);
  await screenshot(chrome, '4-after-reload');
  const ok = reloaded && startScreen && game.money === lost.money && game.timePlayed >= lost.timePlayed && drawsScene(after) && game.settings.quality === 'Low';
  return result('Graphics lost for good', ok,
    `reloaded by itself: ${reloaded}; start screen showing: ${startScreen}; money $${lost.money} -> $${game.money}; ` +
    `3D view after tapping play: brightness ${after.mean} (varies ${after.spread}); graphics ${game.settings.quality}.`);
}

const server = await startServer();
const chrome = await startChrome();
let allOk = true;
try {
  await chrome.send('Runtime.enable');
  await chrome.send('Performance.enable');
  await chrome.send('Page.enable');
  await chrome.send('Page.addScriptToEvaluateOnNewDocument', { source: GL_COUNTER });
  await chrome.send('Emulation.setDeviceMetricsOverride', { ...PHONE, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
  await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await chrome.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const only = process.argv.slice(2);
  const tests = { buy: testBuyingEverything, session: testLongSession, restore: testLoseAndRestore, reload: testLoseForGood };
  for (const [name, test] of Object.entries(tests)) {
    if (only.length && !only.includes(name)) continue;
    try {
      allOk = (await test(chrome, url)) && allOk;
    } catch (e) {
      result(name, false, e.message);
      allOk = false;
    }
  }
} finally {
  chrome.close();
  server.close();
}
console.log(`Screenshots: ${SHOTS_FOLDER}`);
console.log(allOk ? 'All passed.' : 'Something failed.');
process.exitCode = allOk ? 0 : 1;
