// Tests that the game fits an iPhone held sideways, with and without Safari's address bar and tab bar.
//
//   node tools/test-iphone-fit.mjs
//
// What it does: starts a tiny web server for the game folder and opens the game (with ?cheats=1, to reach the
// end screen) in a hidden Chrome that pretends to be iPhone Safari: an iPhone's name in the user agent, a touch
// screen, and a notch (safe areas) on the left and right where this Chrome version can fake one. For every
// screen size below it checks the start screen (folded up, then with "How to play" open), Settings, the
// Hall of Fame, playing, the shop and the end screen: each must be inside the visible screen, and anything too
// tall must scroll inside its own panel. It saves a screenshot of each in a folder (printed at the end).
// It needs Node.js (version 22 or newer), Google Chrome, and an internet connection for Three.js.
// It uses its own empty Chrome profile, so your saved game is never touched.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GAME_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS_FOLDER = path.join(os.tmpdir(), 'gold-rush-iphone-shots');
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${os.homedir()}/AppData/Local/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
// Sideways iPhones: the whole screen, and what's left when Safari's bars are showing
const SIZES = [
  { name: 'iphone14-full', width: 844, height: 390, notch: true },
  { name: 'iphone14-bars', width: 844, height: 330, notch: true },
  { name: 'iphoneSE-full', width: 667, height: 375, notch: false },
  { name: 'iphoneSE-bars', width: 667, height: 315, notch: false },
  { name: 'iphoneSE-tight', width: 667, height: 280, notch: false }, // bars showing and big text: a worst case
];
const NOTCH = { left: 47, right: 47, top: 0, bottom: 21 }; // an iPhone with a notch, held sideways
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- A tiny web server for the game folder ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp4': 'video/mp4' };
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-rush-iphone-'));
  const chrome = spawn(chromePath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=900,500',
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

// Where an element is, and whether it's taller than its box (so it scrolls inside)
const box = (chrome, selector) => chrome.run(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, shown: r.width > 0 && r.height > 0,
    scrolls: el.scrollHeight > el.clientHeight + 1, canScroll: /auto|scroll/.test(cs.overflowY), screenW: innerWidth, screenH: innerHeight };
})()`);

// The element is fully on the screen; if it's too tall, it must be able to scroll inside
async function checkFits(chrome, selector, label) {
  const b = await box(chrome, selector);
  if (!b || !b.shown) {
    check(false, `${label}: not showing`);
    return;
  }
  const inside = b.top >= -0.5 && b.left >= -0.5 && b.bottom <= b.screenH + 0.5 && b.right <= b.screenW + 0.5;
  check(inside, `${label} is inside the screen (${Math.round(b.top)}..${Math.round(b.bottom)} of ${b.screenH} tall)`);
  if (b.scrolls) check(b.canScroll, `${label} is taller than the screen, and scrolls inside`);
}

// The element sits between the notch insets (or nothing covers it on the sides)
async function checkClearOfNotch(chrome, selector, label, notch) {
  if (!notch) return;
  const b = await box(chrome, selector);
  if (!b || !b.shown) return;
  check(b.left >= NOTCH.left - 0.5 && b.right <= b.screenW - NOTCH.right + 0.5, `${label} is clear of the notch (${Math.round(b.left)}..${Math.round(b.right)})`);
}

async function screenshot(chrome, file) {
  const { result } = await chrome.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS_FOLDER, file), Buffer.from(result.data, 'base64'));
}

async function tapAt(chrome, x, y) {
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await wait(60);
  await chrome.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tapButton(chrome, id) {
  const b = await box(chrome, `#${id}`);
  await tapAt(chrome, (b.left + b.right) / 2, (b.top + b.bottom) / 2);
  await wait(400);
}

// ---------- One iPhone screen size ----------
async function testSize(chrome, url, size) {
  console.log(`\n${size.name}: ${size.width} x ${size.height}${size.notch ? ', with a notch' : ''}`);
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 2, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
  await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await chrome.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  const insets = size.notch ? NOTCH : { left: 0, right: 0, top: 0, bottom: 0 };
  const notchFaked = !(await chrome.send('Emulation.setSafeAreaInsetsOverride', { insets })).error;
  if (size.notch && !notchFaked) console.log('  (this Chrome cannot fake a notch, so the notch checks are skipped)');
  const notch = size.notch && notchFaked;

  await chrome.send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) {
    await wait(200);
    if (await chrome.run(`!!document.getElementById('start') && getComputedStyle(document.getElementById('start')).display !== 'none' && document.readyState === 'complete'`)) break;
  }
  await wait(1500); // fonts and the first picture

  // The start screen, folded up
  const card = '#start .card';
  check(await chrome.run(`!document.getElementById('home-tip').hidden`), 'the Add to Home Screen tip shows (iPhone Safari)');
  await checkFits(chrome, card, 'start screen');
  check(!(await box(chrome, card)).scrolls, 'start screen fits without scrolling');
  check(await chrome.run(`getComputedStyle(document.getElementById('how-to')).display === 'none'`), 'controls are folded away behind How to play');
  const rowTops = await chrome.run(`['play', 'how-to-play', 'open-hof', 'open-settings'].map((id) => Math.round(document.getElementById(id).getBoundingClientRect().top + document.getElementById(id).getBoundingClientRect().height / 2))`);
  check(Math.max(...rowTops) - Math.min(...rowTops) <= 4, `play and the buttons are in one row (middles at ${rowTops.join(', ')})`);
  await checkClearOfNotch(chrome, card, 'start screen', notch);
  await screenshot(chrome, `${size.name}-1-start.png`);

  // "How to play" open: the card scrolls inside
  await chrome.run(`document.getElementById('how-to-play').click()`);
  await wait(200);
  await checkFits(chrome, card, 'start screen with How to play open');
  await screenshot(chrome, `${size.name}-2-how-to-play.png`);
  await chrome.run(`document.getElementById('how-to-play').click()`);

  // Settings
  await chrome.run(`document.getElementById('open-settings').click()`);
  await wait(200);
  await checkFits(chrome, '#settings .card', 'Settings');
  await screenshot(chrome, `${size.name}-3-settings.png`);
  await chrome.run(`document.getElementById('close-settings').click()`);

  // Hall of Fame (the practice list, as cheats are on; it may not reach the internet, which is fine here)
  await chrome.run(`document.getElementById('open-hof').click()`);
  await wait(1500);
  await checkFits(chrome, '#hof .card', 'Hall of Fame');
  await screenshot(chrome, `${size.name}-4-hall-of-fame.png`);
  await chrome.run(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))`);
  await wait(200);
  if (await chrome.run(`!document.getElementById('hof').hidden`)) await chrome.run(`document.querySelector('#hof-buttons button:last-child').click()`);

  // Playing: tap Tap to play, and check the HUD, tool bar and thumb buttons are all on the screen
  await tapButton(chrome, 'play');
  await wait(800);
  check(await chrome.run(`document.body.classList.contains('playing') && document.body.classList.contains('touch')`), 'tapping plays, in touch mode');
  for (const [selector, label] of [['#hud', 'HUD'], ['#toolbar', 'tool bar'], ['#t-use', 'Interact button'], ['#t-dig', 'Dig button'], ['#t-shop', 'Shop button'], ['#t-pause', 'pause button'], ['#sound', 'sound button']]) {
    await checkFits(chrome, selector, label);
    await checkClearOfNotch(chrome, selector, label, notch);
  }
  await screenshot(chrome, `${size.name}-5-playing.png`);

  // The shop
  await tapButton(chrome, 't-shop');
  await wait(300);
  await checkFits(chrome, '#shop-panel', 'shop');
  await checkFits(chrome, '#shop-x', 'shop close button');
  await checkClearOfNotch(chrome, '#shop-x', 'shop close button', notch);
  await screenshot(chrome, `${size.name}-6-shop.png`);
  await tapButton(chrome, 'shop-x');

  // The end screen: test cheat L finishes the game; skip the film
  await chrome.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyL', key: 'l' });
  await chrome.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyL', key: 'l' });
  for (let i = 0; i < 60 && (await chrome.run(`document.getElementById('end').hidden`)); i++) {
    await wait(250);
    if (await chrome.run(`!document.getElementById('cutscene').hidden`)) await chrome.run(`document.getElementById('cutscene-skip').click()`);
  }
  await wait(600);
  await checkFits(chrome, '#end .card', 'end screen');
  await screenshot(chrome, `${size.name}-7-end.png`);
}

// ---------- Run it ----------
fs.mkdirSync(SHOTS_FOLDER, { recursive: true });
const server = await startServer();
const chrome = await startChrome();
try {
  await chrome.send('Page.enable');
  await chrome.send('Emulation.setUserAgentOverride', { userAgent: IPHONE_SAFARI, platform: 'iPhone' });
  const url = `http://127.0.0.1:${server.address().port}/?cheats=1`;
  for (const size of SIZES) {
    // A fresh game every time: leave the game first (it saves as it closes), then delete that save
    await chrome.send('Page.navigate', { url: 'about:blank' });
    await wait(500);
    await chrome.send('Storage.clearDataForOrigin', { origin: new URL(url).origin, storageTypes: 'local_storage' });
    await testSize(chrome, url, size);
  }
} finally {
  chrome.close();
  server.close();
}
console.log(`\nScreenshots: ${SHOTS_FOLDER}`);
console.log(problems ? `${problems} problem(s) found.` : 'Everything fits.');
process.exitCode = problems ? 1 : 0;
