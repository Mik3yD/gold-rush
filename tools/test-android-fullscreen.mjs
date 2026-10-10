// Tests that the 3D view fills the whole screen when an installed Android app opens full screen.
//
//   node tools/test-android-fullscreen.mjs
//
// An installed app often starts at the browser window's size and only gets its final, bigger full-screen size
// a moment later, and some phones keep reporting the old size for a while (visualViewport lags behind).
// This test opens the game in a hidden Chrome pretending to be an Android phone held sideways, at the smaller
// size first, then makes the screen bigger later. For each way that can happen it checks that the 3D canvas
// covers the screen edge to edge (no light-blue page showing on the right or at the bottom), that its picture
// is drawn at the full size (not stretched), and that the panels stay clear of the camera cutout. Screenshots go
// in a folder (printed at the end).
// It needs Node.js (version 22 or newer), Google Chrome, and an internet connection for Three.js.
// It uses its own empty Chrome profile, so your saved game is never touched.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GAME_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS_FOLDER = path.join(os.tmpdir(), 'gold-rush-android-shots');
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${os.homedir()}/AppData/Local/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const BROWSER_SIZE = { width: 846, height: 360 }; // what the app starts at (the browser window, with bars)
const FULL_SIZE = { width: 915, height: 412 };    // the whole screen, once it has gone full screen
const CUTOUT = { left: 32, right: 0, top: 0, bottom: 0 }; // a camera cutout on the left, held sideways
// The ways the full-screen size can arrive late
const CASES = [
  { name: '1-grows-early', grow: 300, lagging: false, about: 'the screen grows 0.3 s after loading' },
  { name: '2-grows-late', grow: 3000, lagging: false, about: 'the screen grows 3 s after loading' },
  { name: '3-lagging-viewport', grow: 1500, lagging: true, about: 'the screen grows, but visualViewport keeps the old size' },
];
let cutoutFaked = false;
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-rush-android-'));
  const chrome = spawn(chromePath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1000,500',
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

// ---------- Checks ----------
let problems = 0;
function check(ok, what) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) problems++;
}

const setScreen = (chrome, size) => chrome.send('Emulation.setDeviceMetricsOverride', {
  width: size.width, height: size.height, deviceScaleFactor: 2.625, mobile: true,
  screenOrientation: { type: 'landscapePrimary', angle: 90 },
});

async function testCase(chrome, url, test) {
  console.log(`\n${test.name}: ${test.about}`);
  await chrome.send('Page.navigate', { url: 'about:blank' });
  await wait(300);
  await setScreen(chrome, BROWSER_SIZE);
  // "Lagging" phones: visualViewport keeps saying the browser window's size after the app has gone full screen
  const lag = test.lagging
    ? `Object.defineProperty(visualViewport, 'width', { get: () => ${BROWSER_SIZE.width} });
       Object.defineProperty(visualViewport, 'height', { get: () => ${BROWSER_SIZE.height} });`
    : '';
  const { identifier } = (await chrome.send('Page.addScriptToEvaluateOnNewDocument', { source: lag })).result;
  await chrome.send('Page.navigate', { url });
  for (let i = 0; i < 100 && !(await chrome.run(`document.readyState === 'complete'`)); i++) await wait(100);
  await wait(test.grow);
  await setScreen(chrome, FULL_SIZE); // the app goes full screen
  await wait(3500); // the game's own late checks, and a little more
  await chrome.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });

  // The panels and buttons stay out of the camera cutout on the left (the 3D view goes behind it)
  if (cutoutFaked) {
    const lefts = await chrome.run(`Object.fromEntries(['#start .card', '#hud', '#t-left'].map((s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      return [s, r.width > 0 ? Math.round(r.left) : null];
    }))`);
    for (const [selector, left] of Object.entries(lefts)) {
      if (left !== null) check(left >= CUTOUT.left, `${selector} is clear of the cutout (starts at ${left} px)`);
    }
  }

  // Hide the start screen and the panels for the screenshot, so the 3D view itself shows
  await chrome.run(`document.querySelectorAll('#start, #hud, #toolbar, #sound, .tbtn').forEach((el) => { el.style.visibility = 'hidden'; })`);
  await wait(300);
  const m = await chrome.run(`(() => {
    const canvas = document.querySelector('body > canvas');
    const r = canvas.getBoundingClientRect();
    const ratio = canvas.width / r.width;
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, screenW: innerWidth, screenH: innerHeight,
      bufferW: canvas.width, bufferH: canvas.height, ratio, ratioH: canvas.height / r.height,
      under: document.elementFromPoint(innerWidth - 2, innerHeight - 2)?.tagName };
  })()`);
  check(m.left <= 0 && m.top <= 0, `the 3D view starts at the top left corner (${m.left}, ${m.top})`);
  check(m.right >= m.screenW && m.bottom >= m.screenH, `it reaches the right and bottom edges (${Math.round(m.right)} x ${Math.round(m.bottom)} on a ${m.screenW} x ${m.screenH} screen)`);
  check(m.under === 'CANVAS', `the bottom right corner is the 3D view (${m.under})`);
  check(Math.abs(m.ratio - m.ratioH) < 0.02, `its picture is drawn at the full size, not stretched (${m.bufferW} x ${m.bufferH} pixels)`);
  check(Math.abs(m.bufferW / m.bufferH - m.screenW / m.screenH) < 0.02, 'the picture has the screen\'s shape');

  const { result } = await chrome.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS_FOLDER, `${test.name}.png`), Buffer.from(result.data, 'base64'));
}

// ---------- Run it ----------
fs.mkdirSync(SHOTS_FOLDER, { recursive: true });
const server = await startServer();
const chrome = await startChrome();
try {
  await chrome.send('Page.enable');
  await chrome.send('Emulation.setUserAgentOverride', { userAgent: ANDROID, platform: 'Linux armv8l' });
  await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  cutoutFaked = !(await chrome.send('Emulation.setSafeAreaInsetsOverride', { insets: CUTOUT })).error;
  if (!cutoutFaked) console.log('(this Chrome cannot fake a camera cutout)');
  const url = `http://127.0.0.1:${server.address().port}/`;
  for (const test of CASES) await testCase(chrome, url, test);
} finally {
  chrome.close();
  server.close();
}
console.log(`\nScreenshots: ${SHOTS_FOLDER}`);
console.log(problems ? `${problems} problem(s) found.` : 'The 3D view fills the screen every time.');
process.exitCode = problems ? 1 : 0;
