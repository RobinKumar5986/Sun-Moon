import { StageSession, MAX_LIVES } from './session.js';
import { Board } from '../ui/board.js';
import { $, $$, icon, image, formatTime, showScreen, toast } from '../ui/dom.js';
import { openModal, bindAction, isModalOpen } from '../ui/modal.js';
import { openTutorial, SIGNS_SLIDE } from '../ui/tutorial.js';
import { effects } from '../ui/effects.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { sdk } from '../core/sdk.js';
import { writeSave, writeSaveSoon } from '../core/storage.js';
import { EMPTY, SUN, MOON, opposite, symbolName } from '../puzzle/rules.js';
import { TIER_HARD, TIER_SUPER } from '../puzzle/difficulty.js';

const REWARD_LIVES = 'sun-moon-refill-3-lives';
const REWARD_HINT = 'sun-moon-extra-hint';
const CHECK_DELAY_MS = 500;
const CLEAR_DELAY_MS = 650;
const LOSE_DELAY_MS = 900;
const WIN_DELAY_MS = 1100;
const TIER_LABEL = { [TIER_HARD]: 'Hard', [TIER_SUPER]: 'Super hard' };

const hintText = (step) => {
  switch (step.rule) {
    case 'same': return 'The = clue means both cells match.';
    case 'diff': return 'The × clue means the two cells are opposite.';
    case 'pair': return 'Two in a row already, so the next one must be different.';
    case 'sandwich': return 'No three in a row, so the middle one must be different.';
    case 'count': return `This line already has ${step.count} ${symbolName(opposite(step.value))}s.`;
    case 'trial': return 'The other symbol would break a rule here.';
    default: return 'Here’s a free one!';
  }
};

export class GameController {
  constructor({ save, onHome, openSettings }) {
    this.save = save;
    this.onHome = onHome;
    this.openSettings = openSettings;
    this.session = null;
    this.paused = false;
    this.finished = false;
    this.adBusy = false;
    this.lastTick = 0;
    this.checkTimer = 0;
    this.timers = new Set();
    this.deferred = [];
    this.board = new Board($('#board'), { onCell: (i, opts) => this.handleCell(i, opts) });

    $('#btn-hint').addEventListener('click', () => this.handleHint());
    $('#btn-help').addEventListener('click', () => openTutorial());
    $('#btn-settings').addEventListener('click', () => this.openSettings({ inGame: true }));
    window.addEventListener('keydown', (e) => this.handleKey(e));

    new ResizeObserver(() => this.fitBoard()).observe($('#board-area'));
    window.addEventListener('resize', () => this.fitBoard());
    setInterval(() => this.tick(), 250);
  }

  get active() {
    return Boolean(this.session) && $('#screen-game').classList.contains('is-active');
  }

  get running() {
    return this.active && !this.paused && !this.finished && !this.adBusy && !isModalOpen() && !this.session.outOfLives;
  }

  later(fn, ms) {
    const session = this.session;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.session !== session) return;
      if (this.paused) this.deferred.push(fn);
      else fn();
    }, ms);
    this.timers.add(id);
  }

  clearTimers() {
    clearTimeout(this.checkTimer);
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.deferred = [];
  }

  play() {
    const current = this.save.current;
    let session = null;
    if (current && current.stage === this.save.stage) {
      try {
        session = StageSession.fromJSON(current);
      } catch {
        session = null;
      }
    }
    this.begin(session || StageSession.create(this.save.stage, this.save.salt));
    if (!this.save.tutorialDone) {
      openTutorial({ onDone: () => this.markSeen('tutorialDone') });
    } else if (this.session.signs.length && !this.save.signsTipSeen) {
      openTutorial({ slides: [SIGNS_SLIDE], onDone: () => this.markSeen('signsTipSeen') });
    }
  }

  markSeen(key) {
    this.save[key] = true;
    if (key === 'tutorialDone' && this.session?.signs.length) this.save.signsTipSeen = true;
    writeSave(this.save);
  }

  begin(session) {
    this.clearTimers();
    this.session = session;
    this.finished = false;
    this.persist(true);
    showScreen('screen-game');
    this.board.render({ cols: session.size, values: session.board, givens: session.givens, locked: session.locked, signs: session.signs });
    this.fitBoard();
    this.renderHearts();
    this.updateHud();
    this.lastTick = performance.now();
    music.start();
    if (session.outOfLives) this.later(() => this.showOutOfLives(), 300);
    else this.scheduleCheck();
  }

  persist(now = false) {
    this.save.current = this.session && !this.finished ? this.session.toJSON() : null;
    if (now) writeSave(this.save);
    else writeSaveSoon(this.save);
  }

  fitBoard() {
    const area = $('#board-area').getBoundingClientRect();
    const size = Math.floor(Math.min(area.width, area.height));
    if (size > 0) $('#board').style.setProperty('--board-size', `${size}px`);
  }

  renderHearts() {
    $('#hud-lives').innerHTML = Array.from({ length: MAX_LIVES }, () => image('heart', 'heart')).join('');
  }

  updateHud() {
    const s = this.session;
    $('#hud-stage').textContent = `Stage ${s.stage}`;
    const tier = $('#hud-tier');
    tier.className = `tier-badge ${s.tier}`;
    tier.innerHTML = TIER_LABEL[s.tier] ? `${icon('flame')}${TIER_LABEL[s.tier]}` : '';
    $$('#hud-lives .heart').forEach((heart, i) => heart.classList.toggle('is-lost', i >= s.lives));
    $('#hud-lives').setAttribute('aria-label', `${s.lives} of ${MAX_LIVES} lives left`);
    this.updateHintButton();
    this.updateTimer();
  }

  updateHintButton() {
    const btn = $('#btn-hint');
    const empty = this.session.hints <= 0;
    btn.classList.toggle('is-empty', empty);
    $('#hint-count').innerHTML = empty ? (sdk.adsAvailable ? icon('video', 'icon tiny') : '0') : this.session.hints;
  }

  updateTimer() {
    $('#hud-timer').textContent = formatTime(this.session.elapsed);
  }

  tick() {
    const now = performance.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;
    if (!this.running) return;
    this.session.elapsed += Math.min(dt, 1);
    this.updateTimer();
  }

  handleCell(index, { alternate = false } = {}) {
    this.board.setCursor(-1);
    this.tap(index, alternate);
  }

  tap(index, backwards = false) {
    if (!this.running) return;
    const value = this.session.cycle(index, backwards);
    if (value === null) return this.board.nudge(index);
    this.showChange(index, value);
  }

  setAt(index, value) {
    if (!this.running) return;
    if (!this.session.set(index, value)) return this.board.nudge(index);
    this.showChange(index, value);
  }

  showChange(index, value) {
    this.board.setValue(index, value);
    if (value === EMPTY) sfx.tap();
    else sfx.place();
    this.scheduleCheck();
    this.persist();
  }

  scheduleCheck() {
    clearTimeout(this.checkTimer);
    this.checkTimer = setTimeout(() => this.checkLines(), CHECK_DELAY_MS);
  }

  checkLines() {
    if (!this.session || this.finished || this.session.outOfLives || this.paused) return;
    if (isModalOpen() || this.adBusy) return this.scheduleCheck();
    const result = this.session.checkLines();
    if (result.correct.length) {
      this.board.syncLocks(this.session.locked);
      this.board.celebrateLines(result.correct);
      this.burstLines(result.correct);
      sfx.line();
    }
    if (result.wrong.length) this.rejectLines(result);
    else if (result.won) return this.win();
    this.persist();
  }

  burstLines(lines) {
    lines.forEach((line) => {
      const { x, y } = this.board.cellCenter(line[Math.floor(line.length / 2)]);
      effects.burst(x, y, { count: 12, speed: 4, size: 5 });
    });
  }

  rejectLines({ wrong, wrongCells }) {
    this.board.flashLines(wrong);
    sfx.wrong();
    this.loseHeartFx();
    this.updateHud();
    toast(wrong.length > 1 ? 'Not quite! Those lines don’t fit the puzzle.' : 'Not quite! That line doesn’t fit the puzzle.');
    this.later(() => wrongCells.forEach((i) => this.board.setValue(i, this.session.board[i], false)), CLEAR_DELAY_MS);
    if (this.session.outOfLives) this.later(() => this.showOutOfLives(), LOSE_DELAY_MS);
  }

  loseHeartFx() {
    const lost = $$('#hud-lives .heart')[this.session.lives];
    if (lost) {
      const rect = lost.getBoundingClientRect();
      effects.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 10, colors: ['#ff4f7a', '#ff9ab5'], speed: 3 });
    }
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
  }

  async handleHint() {
    if (!this.running) return;
    if (this.session.hints <= 0) {
      if (!sdk.adsAvailable) return toast('No hints left for this stage.');
      const session = this.session;
      if (!(await this.watchAd(REWARD_HINT)) || this.session !== session) return;
      session.hints++;
      sfx.reward();
      this.updateHintButton();
      this.persist();
      return;
    }
    const step = this.session.useHint();
    this.board.syncLocks(this.session.locked);
    if (step) {
      this.board.setValue(step.index, step.value);
      this.board.markHint(step.index);
      sfx.hint();
      toast(hintText(step), 3400);
      this.updateHintButton();
    }
    this.scheduleCheck();
    this.persist();
  }

  async watchAd(rewardId) {
    this.adBusy = true;
    music.pause();
    const earned = await sdk.requestRewardedAd(rewardId);
    this.adBusy = false;
    if (!this.paused) music.refresh();
    this.lastTick = performance.now();
    if (!earned) toast('Ad not available right now. Try again later.');
    return earned;
  }

  handleKey(e) {
    if (!this.running || e.ctrlKey || e.metaKey || e.altKey) return;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      this.board.moveCursor(...moves[e.key]);
      return;
    }
    const key = e.key.toLowerCase();
    const cursor = this.board.cursor;
    if (key === 'h') return this.handleHint();
    if (cursor < 0) return;
    if (key === '1' || key === 's') this.setAt(cursor, SUN);
    else if (key === '2' || key === 'm') this.setAt(cursor, MOON);
    else if (key === '0' || key === 'backspace' || key === 'delete') this.setAt(cursor, EMPTY);
    else if ((key === ' ' || key === 'enter') && !e.target.closest?.('button, input')) {
      e.preventDefault();
      this.tap(cursor);
    }
  }

  win() {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.checkTimer);
    const s = this.session;
    const stars = s.stars();
    const save = this.save;
    save.stars[s.stage - 1] = Math.max(save.stars[s.stage - 1] || 0, stars);
    save.best = Math.max(save.best, s.stage);
    save.stage = s.stage + 1;
    save.current = null;
    writeSave(save);
    sdk.sendScore(save.best);

    this.board.celebrateWin();
    sfx.win();
    effects.confetti();
    this.later(() => this.showWin(s, stars), WIN_DELAY_MS);
  }

  showWin(s, stars) {
    const body = `
      <div class="stars">${[1, 2, 3].map((n) => image('star', `star ${n <= stars ? 'is-earned' : ''}`)).join('')}</div>
      <div class="stats">
        <div class="stat">${icon('clock')}<b>${formatTime(s.elapsed)}</b><span>Time</span></div>
        <div class="stat">${image('heart')}<b>${s.mistakes}</b><span>Mistakes</span></div>
        <div class="stat">${image('bulb')}<b>${s.hintsUsed}</b><span>Hints</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="home" aria-label="Home">${icon('home')}</button>
        <button class="btn btn-green btn-wide" data-act="next">Next stage ${icon('play')}</button>
      </div>`;
    let goHome = false;
    const modal = openModal({
      title: `Stage ${s.stage} clear!`,
      body,
      onClose: () => (goHome ? this.goHome() : this.play()),
    });
    modal.el.querySelectorAll('.star.is-earned').forEach((_, i) => this.later(() => sfx.star(i), 350 + i * 260));
    bindAction(modal, '[data-act="next"]', () => modal.close('next'));
    bindAction(modal, '[data-act="home"]', () => {
      goHome = true;
      modal.close('home');
    });
  }

  showOutOfLives() {
    if (isModalOpen() && $('.modal-lose')) return;
    sfx.lose();
    const body = `
      <div>${image('heart', 'big-heart')}</div>
      <p class="modal-text">Don’t give up, you were close!</p>
      <div class="modal-actions column">
        ${sdk.adsAvailable ? `<button class="btn btn-blue btn-wide" data-act="ad">${icon('video')} Watch ad · +3 lives</button>` : ''}
        <button class="btn btn-wide" data-act="retry">${icon('retry')} Retry stage</button>
      </div>`;
    let refilled = false;
    const modal = openModal({
      title: 'Out of lives',
      className: 'modal-lose',
      body,
      onClose: () => (refilled ? this.updateHud() : this.retry()),
    });
    bindAction(modal, '[data-act="retry"]', () => modal.close('retry'));
    bindAction(modal, '[data-act="ad"]', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      modal.dismissible = false;
      const earned = await this.watchAd(REWARD_LIVES);
      modal.dismissible = true;
      btn.disabled = false;
      if (!earned) return;
      refilled = true;
      this.session.refillLives();
      this.persist(true);
      sfx.reward();
      toast('+3 lives! Keep going!');
      modal.close('ad');
    });
  }

  retry() {
    if (!this.session) return;
    this.session.restart();
    this.begin(this.session);
  }

  goHome() {
    this.clearTimers();
    if (this.session && !this.finished) this.persist(true);
    this.session = null;
    this.onHome();
  }

  pause() {
    this.paused = true;
    if (this.session && !this.finished) this.persist(true);
  }

  resume() {
    this.paused = false;
    this.lastTick = performance.now();
    const deferred = this.deferred;
    this.deferred = [];
    deferred.forEach((fn) => fn());
    if (this.session && !this.finished) this.scheduleCheck();
  }
}
