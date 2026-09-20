/**
 * Dev-only screenshot tool.
 *
 * Chrome's --screenshot flag captures as soon as the page goes idle, which
 * lands mid-transition and misses reveal animations. This drives Chrome over
 * the DevTools Protocol instead, so we can wait real time before capturing.
 *
 *   node tools/shoot.mjs <url> <out.png> [width] [height] [waitMs] [full|viewport]
 */

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;

const [url, out, w = '1440', h = '940', wait = '3200', mode = 'viewport', evalJs = ''] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node tools/shoot.mjs <url> <out.png> [w] [h] [waitMs] [full|viewport]');
  process.exit(1);
}

const profile = resolve('tools/.cdp-profile');
if (!existsSync(profile)) mkdirSync(profile, { recursive: true });
mkdirSync(dirname(resolve(out)), { recursive: true });

const extraFlags = process.env.SHOOT_FLAGS ? process.env.SHOOT_FLAGS.split(' ').filter(Boolean) : [];

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--window-size=' + w + ',' + h,
  ...extraFlags,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore'] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error('Chrome DevTools endpoint never appeared');
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.method + ': ' + msg.error.message));
      else res(msg.result);
    }
  });
  return (method, params = {}) =>
    new Promise((res, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve: res, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
}

try {
  const wsUrl = await endpoint();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  const send = cdp(ws);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: Number(w) < 700,
  });

  const loaded = new Promise((res) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', onMsg);
        res();
      }
    };
    ws.addEventListener('message', onMsg);
  });

  await send('Page.navigate', { url });
  await loaded;
  await sleep(Number(wait));

  if (evalJs) {
    const r = await send('Runtime.evaluate', {
      expression: `(() => { ${evalJs} })()`,
      returnByValue: true,
      awaitPromise: false,
    });
    if (r.exceptionDetails) console.error('eval threw: ' + JSON.stringify(r.exceptionDetails.text));
    else if (r.result && r.result.value !== undefined) console.log('eval: ' + JSON.stringify(r.result.value));
    await sleep(1400);
  }

  const shots = [];
  if (mode === 'full') {
    const { cssContentSize } = await send('Page.getLayoutMetrics');
    const height = Math.ceil(cssContentSize.height);
    const bands = Math.ceil(height / 2400);
    for (let i = 0; i < bands; i++) {
      const y = i * 2400;
      await send('Emulation.setDeviceMetricsOverride', {
        width: Number(w), height: Math.min(2400, height - y), deviceScaleFactor: 1, mobile: false,
      });
      await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
      await sleep(900);
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const p = bands === 1 ? out : out.replace(/\.png$/, `-${i + 1}.png`);
      const { writeFileSync } = await import('node:fs');
      writeFileSync(p, Buffer.from(data, 'base64'));
      shots.push(p + ' @y=' + y);
    }
  } else {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(out, Buffer.from(data, 'base64'));
    shots.push(out);
  }

  // surface page-level diagnostics alongside the image
  const diag = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      scrollHeight: document.documentElement.scrollHeight,
      ready: document.body.classList.contains('is-ready'),
      revealed: document.querySelectorAll('[data-reveal].is-in').length,
      reveals: document.querySelectorAll('[data-reveal]').length,
      bars: [...document.querySelectorAll('.bar__fill')].map(f => f.style.width || 'unset'),
      errors: window.__rkErrors || []
    })`,
    returnByValue: true,
  });

  console.log(shots.join('\n'));
  console.log('diag: ' + diag.result.value);
} catch (err) {
  console.error('FAILED: ' + err.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(220);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
}
