import { boot, tick, makeSave } from './harness.mjs';
const name = process.argv[2];

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const cur = (h) => JSON.parse(h.w.localStorage.getItem('sun-and-moon-save') || 'null')?.current;
const solveAll = async (h, skipLast = false) => {
  await tick(50);
  const c = h.disk().current; const sol = [...c.solution].map(Number);
  const idx = sol.map((_, i) => i).filter(i => h.cellVal(i) !== sol[i] && !h.isLocked(i));
  const last = skipLast ? idx.pop() : undefined;
  idx.forEach(i => h.setCell(i, sol[i]));
  return { last, sol };
};
const S = {
  async win() {
    const h = await boot({ save: makeSave() });
    h.click(h.$('#btn-play')); await tick(100);
    await solveAll(h); await tick(1800);
    ok(h.modals().includes('Stage 1 clear!'), 'win modal shown: ' + h.modals());
    await tick(900);
    const d = h.disk(); ok(d.stage === 2 && d.best === 1 && d.current === null, 'save after win ' + JSON.stringify({ s: d.stage, b: d.best, c: !!d.current }));
    h.key('Escape'); await tick(400);
    ok(h.$('#hud-stage').textContent === 'Stage 2', 'Esc → next stage: ' + h.$('#hud-stage').textContent);
    return h;
  },
  async lastCellHome() {
    const h = await boot({ save: makeSave() });
    h.click(h.$('#btn-play')); await tick(100);
    const { last, sol } = await solveAll(h, true); await tick(700);
    h.setCell(last, sol[last]); await tick(100);
    h.click(h.$('#btn-settings')); await tick(50); h.click(h.$('[data-act="home"]')); await tick(400);
    ok(h.active() === 'screen-home', 'went home');
    h.click(h.$('#btn-play')); await tick(1900);
    ok(h.modals().includes('Stage 1 clear!'), 'win after resume: ' + h.modals());
    return h;
  },
  async zeroLivesResume() {
    const h0 = await boot({ save: makeSave() });
    h0.click(h0.$('#btn-play')); await tick(100);
    const c = h0.disk().current;
    const save = makeSave({ current: { ...c, lives: 0, mistakes: 3 } });
    const h = await boot({ save });
    h.click(h.$('#btn-play')); await tick(600);
    ok(h.modals().includes('Out of lives'), 'out of lives modal on resume: ' + h.modals());
    h.click(h.$('[data-act="retry"]')); await tick(400);
    ok(h.w.document.querySelectorAll('.heart.is-lost').length === 0, 'retry restores lives');
    return h;
  },
  async staleTimers() {
    const h = await boot({ save: makeSave() });
    h.click(h.$('#btn-play')); await tick(100);
    const n = h.disk().current.size; const sol = [...h.disk().current.solution].map(Number);
    for (let k = 0; k < 3; k++) {
      const row = k; for (let c = 0; c < n; c++) { const i = row * n + c; if (!h.isLocked(i)) h.setCell(i, sol[i] === 1 ? 2 : 1); }
      await tick(k < 2 ? 1300 : 600);
    }
    h.click(h.$('#btn-settings')); await tick(30);
    h.click(h.$('[data-act="home"]')); await tick(1200);
    ok(h.active() === 'screen-home', 'home');
    ok(!h.modals().includes('Out of lives'), 'no lose modal on home: ' + h.modals());
    return h;
  },
  async doubleWin() {
    const h = await boot({ save: makeSave(), yt: true });
    h.click(h.$('#btn-play')); await tick(100);
    await solveAll(h); await tick(700);
    h.ytState.pause(); await tick(50); h.ytState.resume(); await tick(1600);
    ok(h.ytState.scores.length === 1, 'one score: ' + h.ytState.scores);
    ok(h.modals().filter(t => t.includes('clear')).length === 1, 'one win modal: ' + h.modals());
    return h;
  },
  async pauseDuringWinDelay() {
    const h = await boot({ save: makeSave(), yt: true });
    h.click(h.$('#btn-play')); await tick(100);
    await solveAll(h); await tick(700);
    h.ytState.pause(); await tick(1500);
    ok(!h.modals().length, 'no modal while paused: ' + h.modals());
    h.ytState.resume(); await tick(100);
    ok(h.modals().includes('Stage 1 clear!'), 'modal after resume');
    return h;
  },
  async loadFail() {
    const h = await boot({ save: makeSave({ stage: 9 }), yt: true, loadReject: true });
    await tick(1500);
    h.click(h.$('#btn-play')); await tick(200);
    ok(h.ytState.saved.length === 0, 'no saveData after failed load: ' + h.ytState.saved.length);
    return h;
  },
  async corrupt() {
    const h = await boot({ save: makeSave({ current: { stage: 1, size: 6, givens: 5 } }) });
    h.click(h.$('#btn-play')); await tick(200);
    ok(h.active() === 'screen-game' && h.cells().length > 0, 'corrupt current → fresh stage');
    const h2 = await boot({ save: { stage: 'x', stars: 'y', settings: 3, current: 'z' } });
    h2.click(h2.$('#btn-play')); await tick(200);
    ok(h2.$('#hud-stage').textContent === 'Stage 1', 'garbage save → stage 1');
    ok(!h2.$('#hud-timer').textContent.includes('NaN'), 'timer not NaN');
    return h2;
  },
  async oldSave() {
    const h0 = await boot({ save: makeSave() });
    h0.click(h0.$('#btn-play')); await tick(100);
    const c = { ...h0.disk().current }; delete c.locked;
    const sol = [...c.solution].map(Number); const b = [...c.board].map(Number);
    const fill = b.findIndex(v => !v); b[fill] = sol[fill];
    const wrongIdx = b.findIndex(v => !v); b[wrongIdx] = sol[wrongIdx] === 1 ? 2 : 1;
    c.board = b.join(''); delete c.elapsed;
    const h = await boot({ save: makeSave({ current: c }) });
    h.click(h.$('#btn-play')); await tick(200);
    ok(h.isLocked(fill), 'correct filled old cell locked');
    ok(!h.isLocked(wrongIdx), 'wrong old cell not locked');
    ok(h.$('#hud-timer').textContent === '00:00', 'missing elapsed → 00:00: ' + h.$('#hud-timer').textContent);
    await solveAll(h); await tick(1800);
    ok(h.modals().includes('Stage 1 clear!'), 'old save solvable');
    return h;
  },
  async hintSmart() {
    const h = await boot({ save: makeSave({ stage: 4 }) });
    h.click(h.$('#btn-play')); await tick(100);
    const c = h.disk().current; const n = c.size; const sol = [...c.solution].map(Number);
    for (let i = 0; i < n * n; i++) if (!h.isLocked(i) && i % 2 === 0) h.setCell(i, sol[i]);
    const before = h.cells().map((_, i) => h.cellVal(i));
    h.click(h.$('#btn-hint')); await tick(50);
    const after = h.cells().map((_, i) => h.cellVal(i));
    const changed = after.filter((v, i) => v !== before[i]).length;
    ok(changed === 1, 'hint changed exactly one cell: ' + changed);
    ok(h.$('#hint-count').textContent === '2', 'hint count 2');
    h.click(h.$('#btn-hint')); await tick(20); h.click(h.$('#btn-hint')); await tick(20); h.click(h.$('#btn-hint')); await tick(20);
    ok(h.$('#hint-count').textContent === '0', 'hint count 0');
    ok(h.$('#toast').textContent.includes('No hints'), 'no hints toast');
    return h;
  },
  async lockedTaps() {
    const h = await boot({ save: makeSave() });
    h.click(h.$('#btn-play')); await tick(100);
    const g = h.cells().findIndex((_, i) => h.isLocked(i)); const v = h.cellVal(g);
    for (let k = 0; k < 5; k++) h.down(h.cells()[g]);
    ok(h.cellVal(g) === v, 'given unchanged');
    const e = h.cells().findIndex((_, i) => !h.isLocked(i));
    h.down(h.cells()[e]); ok(h.cellVal(e) === 1, 'tap1 sun'); h.down(h.cells()[e]); ok(h.cellVal(e) === 2, 'tap2 moon'); h.down(h.cells()[e]); ok(h.cellVal(e) === 0, 'tap3 empty');
    return h;
  },
  async keyboard() {
    const h = await boot({ save: makeSave({ tutorialDone: false }) });
    h.click(h.$('#btn-play')); await tick(100);
    ok(h.modals().includes('Fill the grid'), 'tutorial first time');
    h.key('Escape'); await tick(300);
    ok(!h.modals().length, 'Esc closes tutorial');
    ok(h.disk().tutorialDone === true, 'tutorial marked done');
    h.key('ArrowRight'); const cur0 = h.cells().findIndex(c => c.classList.contains('has-cursor'));
    ok(cur0 >= 0, 'cursor shown');
    let target = h.cells().findIndex((_, i) => !h.isLocked(i));
    const n = Math.sqrt(h.cells().length);
    for (let i = cur0; i !== target; ) { h.key('ArrowRight'); i = h.cells().findIndex(c => c.classList.contains('has-cursor')); if (i === cur0) break; }
    const at = h.cells().findIndex(c => c.classList.contains('has-cursor'));
    if (!h.isLocked(at)) { h.key('2'); ok(h.cellVal(at) === 2, 'key 2 moon'); h.key('0'); ok(h.cellVal(at) === 0, 'key 0 clear'); h.key(' '); ok(h.cellVal(at) === 1, 'space tap sun'); }
    return h;
  },
  async pauseCheck() {
    const h = await boot({ save: makeSave(), yt: true });
    h.click(h.$('#btn-play')); await tick(100);
    const c = h.disk().current; const n = c.size; const sol = [...c.solution].map(Number);
    for (let i = 0; i < n; i++) if (!h.isLocked(i)) h.setCell(i, sol[i]);
    h.ytState.pause(); await tick(900);
    ok(!h.isLocked([...Array(n).keys()].find(i => !c.givens[i] || c.givens[i] === '0')), 'no check while paused');
    h.ytState.resume(); await tick(700);
    ok([...Array(n).keys()].every(i => h.isLocked(i)), 'row locked after resume');
    return h;
  },
  async signsTip() {
    const h = await boot({ save: makeSave({ stage: 8, signsTipSeen: false }) });
    h.click(h.$('#btn-play')); await tick(100);
    ok(h.modals().includes('= and × clues'), 'signs tip: ' + h.modals());
    ok(h.w.document.querySelectorAll('.sign').length > 0, 'signs rendered');
    h.key('Escape'); await tick(300);
    ok(h.disk().signsTipSeen, 'tip saved');
    return h;
  },
  async big() {
    const h = await boot({ save: makeSave({ stage: 30 }) });
    h.click(h.$('#btn-play')); await tick(100);
    ok(h.cells().length === 64, '8x8: ' + h.cells().length);
    ok(h.$('#hud-tier').textContent.includes('Super'), 'super badge');
    await solveAll(h); await tick(1800);
    ok(h.modals().includes('Stage 30 clear!'), '8x8 win');
    return h;
  },
  async retryTimer() {
    const h = await boot({ save: makeSave() });
    h.click(h.$('#btn-play')); await tick(1300);
    h.click(h.$('#btn-help')); await tick(1500);
    const t1 = h.$('#hud-timer').textContent; await tick(1300);
    ok(h.$('#hud-timer').textContent === t1, 'timer frozen during modal');
    h.key('Escape'); await tick(200);
    const n = h.disk().current.size; const sol = [...h.disk().current.solution].map(Number);
    for (let k = 0; k < 3; k++) { for (let c = 0; c < n; c++) { const i = k * n + c; if (!h.isLocked(i)) h.setCell(i, sol[i] === 1 ? 2 : 1); } await tick(1400); }
    await tick(500);
    ok(h.modals().includes('Out of lives'), 'lose modal');
    const t2 = h.$('#hud-timer').textContent; await tick(1200);
    ok(h.$('#hud-timer').textContent === t2, 'timer frozen when lost');
    h.click(h.$('[data-act="retry"]')); await tick(400);
    ok(h.$('#hud-timer').textContent === '00:00', 'timer reset');
    ok(h.cells().every((_, i) => h.isLocked(i) || h.cellVal(i) === 0), 'board reset');
    return h;
  },
  async adLives() {
    const h = await boot({ save: makeSave(), yt: true, ad: true });
    h.click(h.$('#btn-play')); await tick(100);
    const n = h.disk().current.size; const sol = [...h.disk().current.solution].map(Number);
    for (let k = 0; k < 3; k++) { for (let c = 0; c < n; c++) { const i = k * n + c; if (!h.isLocked(i)) h.setCell(i, sol[i] === 1 ? 2 : 1); } await tick(1500); }
    await tick(400);
    ok(h.modals().includes('Out of lives'), 'lose modal');
    const filled = h.cells().filter((_, i) => h.cellVal(i) && !h.isLocked(i)).length;
    h.click(h.$('[data-act="ad"]')); await tick(50);
    h.key('Escape'); await tick(100);
    ok(h.modals().includes('Out of lives'), 'Esc ignored during ad');
    await tick(600);
    ok(!h.modals().length, 'modal closed after reward');
    ok(h.w.document.querySelectorAll('.heart.is-lost').length === 0, 'lives refilled');
    const e = h.cells().findIndex((_, i) => !h.isLocked(i) && !h.cellVal(i));
    h.down(h.cells()[e]); ok(h.cellVal(e) === 1, 'playable after ad');
    return h;
  },
  async adFail() {
    const h = await boot({ save: makeSave(), yt: true, ad: 'reject' });
    h.click(h.$('#btn-play')); await tick(100);
    for (let k = 0; k < 4; k++) { h.click(h.$('#btn-hint')); await tick(30); }
    ok(h.$('#hint-count').innerHTML.includes('svg'), 'video badge at 0 hints');
    h.click(h.$('#btn-hint')); h.click(h.$('#btn-hint')); await tick(700);
    ok((h.ytState.adIds || []).length === 1, 'single ad request: ' + (h.ytState.adIds || []).length);
    ok(h.$('#toast').textContent.includes('Ad not available'), 'ad fail toast');
    return h;
  },
  async adHint() {
    const h = await boot({ save: makeSave(), yt: true, ad: true });
    h.click(h.$('#btn-play')); await tick(100);
    for (let k = 0; k < 3; k++) { h.click(h.$('#btn-hint')); await tick(30); }
    h.click(h.$('#btn-hint')); await tick(700);
    ok(h.$('#hint-count').textContent === '1', 'hint +1 after ad: ' + h.$('#hint-count').textContent);
    return h;
  },
  async rapidTaps() {
    const h = await boot({ save: makeSave() });
    h.click(h.$('#btn-play')); await tick(100);
    const c = h.disk().current; const n = c.size; const sol = [...c.solution].map(Number);
    const row = [...Array(n).keys()].filter(i => !h.isLocked(i));
    row.forEach(i => h.setCell(i, sol[i] === 1 ? 2 : 1));
    await tick(300);
    row.forEach(i => h.setCell(i, sol[i]));
    await tick(800);
    ok(h.w.document.querySelectorAll('.heart.is-lost').length === 0, 'fixing row before check costs nothing');
    ok([...Array(n).keys()].every(i => h.isLocked(i)), 'row locked');
    const r2 = [...Array(n).keys()].map(c => n + c).filter(i => !h.isLocked(i));
    r2.forEach(i => h.setCell(i, sol[i] === 1 ? 2 : 1));
    await tick(560);
    const wrongCell = r2.find(i => sol[i] !== (sol[i] === 1 ? 2 : 1));
    h.down(h.cells()[wrongCell]); await tick(1500);
    ok(h.cellVal(wrongCell) === (h.disk() ? JSON.parse(h.w.localStorage.getItem('sun-and-moon-save')).current.board[wrongCell] * 1 : 0), 'display matches state after tap during flash');
    return h;
  },
  async settingsToggle() {
    const h = await boot({ save: makeSave() });
    h.click(h.$('#btn-home-settings')); await tick(50);
    ok(/^Version \d+\.\d+\.\d+$/.test(h.$('.version')?.textContent), 'version shown: ' + h.$('.version')?.textContent);
    const sw = h.w.document.querySelectorAll('.switch');
    sw[0].checked = false; sw[0].dispatchEvent(new h.w.Event('change'));
    sw[1].checked = false; sw[1].dispatchEvent(new h.w.Event('change'));
    ok(h.disk().settings.music === false && h.disk().settings.sfx === false, 'settings saved');
    h.click(h.$('[data-act="done"]')); await tick(300);
    ok(!h.modals().length, 'settings closed');
    return h;
  },
};
const h = await S[name]();
if (h?.errors?.length) fails.push('errors: ' + h.errors.join(' | '));
console.log(fails.length ? `FAIL ${name}: ${fails.join('; ')}` : `PASS ${name}`);
process.exit(0);
