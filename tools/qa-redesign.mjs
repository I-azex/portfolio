/**
 * Dev-only QA pass over the redesigned page.
 *
 * Checks what a screenshot review tends to miss: broken image files, content
 * overflowing its box, clipped text, icon-only controls without an accessible
 * name, duplicate ids, and console/network errors.
 *
 *   node tools/qa-redesign.mjs [width] [height]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;
const [w = '1440', h = '1000'] = process.argv.slice(2);
const url = 'http://127.0.0.1:8087/';

const profile = resolve('tools/.cdp-qa');
if (!existsSync(profile)) mkdirSync(profile, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, `--window-size=${w},${h}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, docWidth: document.documentElement.scrollWidth, docHeight: document.documentElement.scrollHeight,
                brokenImages: [], overflow: [], clipped: [], unnamedControls: [], duplicateIds: [],
                tinyText: [], horizontalOverflow: [] };

  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
    + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');

  document.querySelectorAll('img').forEach(img => {
    // lazy images below the fold legitimately have no dimensions yet
    if (img.loading === 'lazy' && !img.complete) return;
    if (!img.getAttribute('src')) return;
    if (!img.complete || img.naturalWidth === 0) out.brokenImages.push({ el: name(img), src: img.getAttribute('src') });
  });

  const seen = new Map();
  document.querySelectorAll('[id]').forEach(el => {
    seen.set(el.id, (seen.get(el.id) || 0) + 1);
  });
  seen.forEach((count, id) => { if (count > 1) out.duplicateIds.push({ id, count }); });

  document.querySelectorAll('button, a').forEach(el => {
    const text = (el.textContent || '').trim();
    const aria = el.getAttribute('aria-label') || el.getAttribute('title');
    if (!text && !aria) out.unnamedControls.push({ el: name(el) });
  });

  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    if (r.width > vw + 2 && cs.position !== 'fixed' && !el.closest('.floating-dock')) out.overflow.push({ el: name(el), w: Math.round(r.width) });
    if (r.right > vw + 2 && cs.overflowX === 'visible' && !el.closest('.floating-dock')) out.horizontalOverflow.push({ el: name(el), right: Math.round(r.right) });
    let text = '';
    el.childNodes.forEach(n => { if (n.nodeType === 3) text += n.nodeValue; });
    text = text.trim();
    if (!text) return;
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible') out.clipped.push({ el: name(el), by: Math.round(el.scrollWidth - el.clientWidth), text: text.slice(0, 40) });
    const fs = parseFloat(cs.fontSize);
    if (fs && fs < 9) out.tinyText.push({ el: name(el), fs: +fs.toFixed(1), text: text.slice(0, 30) });
  });
  const uniq = (arr, key) => { const s = new Set(); return arr.filter(o => { const v = o.el + '|' + (o[key] ?? ''); if (s.has(v)) return false; s.add(v); return true; }); };
  out.overflow = uniq(out.overflow, 'w').slice(0, 12);
  out.horizontalOverflow = uniq(out.horizontalOverflow, 'right').slice(0, 12);
  out.clipped = uniq(out.clipped, 'text').slice(0, 12);
  out.tinyText = uniq(out.tinyText, 'fs').slice(0, 12);
  return JSON.stringify(out);
})()`;

try {
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      wsUrl = list.find(t => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(150);
  }
  if (!wsUrl) throw new Error('no devtools endpoint');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const events = { consoleErrors: [], failedRequests: [] };
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      events.consoleErrors.push((m.params.args || []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
    }
    if (m.method === 'Network.loadingFailed') events.failedRequests.push({ url: m.params.requestId, error: m.params.errorText });
    if (m.id && pending.has(m.id)) {
      const { resolve: res, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : res(m.result);
    }
  });
  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: Number(w) < 700 });
  const loaded = new Promise(res => {
    const on = ev => { if (JSON.parse(ev.data).method === 'Page.loadEventFired') { ws.removeEventListener('message', on); res(); } };
    ws.addEventListener('message', on);
  });
  await send('Page.navigate', { url });
  await loaded;
  await sleep(3000);

  const r = await send('Runtime.evaluate', { expression: AUDIT, returnByValue: true });
  const report = JSON.parse(r.result.value);

  // prove the lazy photographs really resolve once they are on screen
  await send('Runtime.evaluate', { expression: `document.querySelector('#journal').scrollIntoView()` });
  await sleep(2500);
  const lazy = await send('Runtime.evaluate', {
    expression: `JSON.stringify([...document.querySelectorAll('img[loading=lazy]')].map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })))`,
    returnByValue: true,
  });
  report.lazyImagesLoaded = JSON.parse(lazy.result.value);

  // Measure the poster so the colour window visibly lands on the face.
  const poster = await send('Runtime.evaluate', {
    expression: `(() => {
      const stage = document.querySelector('.portrait-stage').getBoundingClientRect();
      const frame = document.querySelector('.focus-frame').getBoundingClientRect();
      const colour = document.querySelector('.portrait-color');
      return JSON.stringify({
        stage: { w: Math.round(stage.width), h: Math.round(stage.height) },
        frame: {
          topPct: +(((frame.top - stage.top) / stage.height) * 100).toFixed(1),
          heightPct: +((frame.height / stage.height) * 100).toFixed(1),
        },
        colourClip: getComputedStyle(colour).clipPath,
        filter: getComputedStyle(document.querySelector('.portrait-main')).filter,
      });
    })()`,
    returnByValue: true,
  });
  report.poster = JSON.parse(poster.result.value);

  report.consoleErrors = events.consoleErrors.filter(e => !/chrome-extension|ERR_FAILED/.test(e));
  report.failedRequests = events.failedRequests.length;
  console.log(JSON.stringify(report, null, 2));
} catch (err) {
  console.error('FAILED: ' + err.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(200);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
}
