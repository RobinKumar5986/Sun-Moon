import { JSDOM } from 'jsdom';
import fs from 'fs';
import { fileURLToPath } from 'url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export async function boot({ save = null, yt = false, loadReject = false, ad = null } = {}) {
  const html = fs.readFileSync(root + 'index.html', 'utf8').replace(/<script[^>]*youtube[^>]*><\/script>/, '');
  const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
  const w = dom.window;
  const errors = [];
  w.addEventListener('error', e => errors.push(e.message));
  globalThis.window = w; globalThis.document = w.document;
  for (const k of ['HTMLElement','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) globalThis[k] = w[k];
  w.ResizeObserver = class { observe(){} }; globalThis.ResizeObserver = w.ResizeObserver;
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} });
  const ytState = { saved: [], pause: null, resume: null, scores: [] };
  if (yt) {
    w.ytgame = {
      IN_PLAYABLES_ENV: true,
      game: { firstFrameReady(){}, gameReady(){}, loadData: () => loadReject ? Promise.reject(new Error('net')) : Promise.resolve(save ? JSON.stringify(save) : ''), saveData: (d) => { ytState.saved.push(d); return Promise.resolve(); } },
      system: { isAudioEnabled: () => true, onAudioEnabledChange(){}, onPause(cb){ ytState.pause = cb; }, onResume(cb){ ytState.resume = cb; } },
      engagement: { sendScore: (v) => { ytState.scores.push(v.value); return Promise.resolve(); } },
      health: { logError(){} },
      ...(ad !== null ? { ads: { requestRewardedAd: (id) => new Promise((res, rej) => setTimeout(() => { ytState.adIds = [...(ytState.adIds||[]), id]; ad === 'reject' ? rej(new Error('x')) : res(ad); }, 400)) } } : {}),
    };
  } else if (save) w.localStorage.setItem('sun-and-moon-save', JSON.stringify(save));
  await import(new URL('js/main.js?' + Math.random(), 'file://' + root).href);
  await tick(100);
  const $ = s => w.document.querySelector(s);
  const h = {
    w, $, errors, ytState,
    active: () => w.document.querySelector('.screen.is-active').id,
    click: el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })),
    down: el => el.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, button: 0 })),
    key: k => w.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true })),
    cells: () => [...w.document.querySelectorAll('#board .cell')],
    modals: () => [...w.document.querySelectorAll('.modal-backdrop:not(.is-leaving) .modal-title')].map(e => e.textContent),
    disk: () => yt ? JSON.parse(ytState.saved.at(-1) || 'null') : JSON.parse(w.localStorage.getItem('sun-and-moon-save')),
    tick,
  };
  h.setCell = (i, v) => { const c = h.cells()[i]; const cur = h.cellVal(i); let steps = (v - cur + 3) % 3; while (steps--) h.down(c); };
  h.cellVal = (i) => { const t = h.cells()[i].firstChild.classList; return t.contains('sun') ? 1 : t.contains('moon') ? 2 : 0; };
  h.isLocked = (i) => { const t = h.cells()[i].firstChild.classList; return t.contains('locked') || t.contains('given'); };
  return h;
}
export const tick = (ms = 50) => new Promise(r => setTimeout(r, ms));
export function makeSave(over = {}) {
  return { version: 1, salt: 12345, stage: 1, best: 0, stars: [], tutorialDone: true, signsTipSeen: true, settings: { music: true, sfx: true }, current: null, ...over };
}
