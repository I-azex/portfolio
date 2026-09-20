/**
 * Dev-only layout audit.
 *
 * Flags the failures that are invisible in a screenshot: elements wider than
 * the viewport, content spilling past the right edge, clipped text, and
 * grid children that refuse to shrink.
 *
 *   node tools/audit.mjs <file-url> [width] [height]
 */

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const [url, w = '1440', h = '940'] = process.argv.slice(2);
if (!url) { console.error('usage: node tools/audit.mjs <url> [w] [h]'); process.exit(1); }

const profile = resolve('tools/.cdp-audit');
if (!existsSync(profile)) mkdirSync(profile, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, `--window-size=${w},${h}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore'] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EXPR = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, scrollWidth: document.documentElement.scrollWidth,
                scrollHeight: document.documentElement.scrollHeight,
                wide: [], spill: [], clipped: [], tiny: [] };

  const label = (el) => el.tagName.toLowerCase()
    + (el.id ? '#' + el.id : '')
    + (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');

  // text that is actually rendered as a direct child text node
  const ownText = (el) => {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s.trim();
  };

  // real painted height of the text, independent of line-height
  const textBox = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return r;
  };

  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;

    if (r.width > vw + 1.5 && cs.position !== 'fixed' && !el.closest('.belt, .boot')) {
      out.wide.push({ el: label(el), w: Math.round(r.width) });
    }
    if (r.right > vw + 1.5 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll'
        && !el.closest('.belt, .boot')) {
      out.spill.push({ el: label(el), right: Math.round(r.right) });
    }

    const t = ownText(el);
    if (!t) return;

    // text clipped by an ancestor that hides overflow
    const tr = textBox(el);
    let clippedBy = null;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.overflow === 'visible' && ps.overflowX === 'visible') continue;
      const pr = p.getBoundingClientRect();
      if (tr.right > pr.right + 2 || tr.left < pr.left - 2
          || tr.bottom > pr.bottom + 2 || tr.top < pr.top - 2) {
        clippedBy = label(p);
      }
      break;
    }
    if (clippedBy) out.clipped.push({ el: label(el), by: clippedBy, t: t.slice(0, 26) });

    const fs = parseFloat(cs.fontSize);
    if (fs && fs < 9.5) out.tiny.push({ el: label(el), fs: +fs.toFixed(1), t: t.slice(0, 22) });
  });

  const dedupe = (arr, k) => {
    const seen = new Set();
    return arr.filter((o) => { const v = o.el + '|' + (o[k] || ''); if (seen.has(v)) return false; seen.add(v); return true; });
  };
  out.wide = dedupe(out.wide, 'w').slice(0, 14);
  out.spill = dedupe(out.spill, 'right').slice(0, 14);
  out.clipped = dedupe(out.clipped, 't').slice(0, 14);
  out.tiny = dedupe(out.tiny, 'fs').slice(0, 14);
  return JSON.stringify(out, null, 2);
})()`;

try {
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
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
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
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
  const loaded = new Promise((res) => {
    const on = (ev) => {
      if (JSON.parse(ev.data).method === 'Page.loadEventFired') { ws.removeEventListener('message', on); res(); }
    };
    ws.addEventListener('message', on);
  });
  await send('Page.navigate', { url });
  await loaded;
  await sleep(2600);

  const r = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true });
  console.log(r.result.value);
} catch (e) {
  console.error('FAILED: ' + e.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(200);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
}
