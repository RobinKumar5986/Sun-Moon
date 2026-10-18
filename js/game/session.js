import { generatePuzzle } from '../puzzle/generator.js';
import { stageConfig } from '../puzzle/difficulty.js';
import { EMPTY, SUN, MOON, SIGN_SAME, SIGN_DIFF, createContext, isLineFull } from '../puzzle/rules.js';
import { nextDeduction } from '../puzzle/solver.js';
import { hashSeed } from '../core/rng.js';

export const MAX_LIVES = 3;
const MAX_HINTS = 3;

const CYCLE = { [EMPTY]: SUN, [SUN]: MOON, [MOON]: EMPTY };
const CYCLE_BACK = { [EMPTY]: MOON, [MOON]: SUN, [SUN]: EMPTY };

const encodeGrid = (grid) => grid.join('');
const decodeGrid = (text) => [...text].map(Number);
const encodeSigns = (signs) => signs.map((s) => [s.a, s.b, s.type === SIGN_SAME ? 0 : 1]);
const decodeSigns = (list) => list.map(([a, b, t]) => ({ a, b, type: t === 0 ? SIGN_SAME : SIGN_DIFF }));

export class StageSession {
  constructor(data) {
    Object.assign(this, data);
    this.ctx = createContext(this.size, this.signs);
  }

  static create(stage, salt) {
    const config = stageConfig(stage);
    const puzzle = generatePuzzle(config, hashSeed(salt, stage));
    return new StageSession({
      stage,
      tier: config.tier,
      size: puzzle.size,
      givens: puzzle.givens,
      signs: puzzle.signs,
      solution: puzzle.solution,
      board: puzzle.givens.slice(),
      locked: puzzle.givens.map((v) => (v ? 1 : 0)),
      lives: MAX_LIVES,
      hints: MAX_HINTS,
      mistakes: 0,
      hintsUsed: 0,
      elapsed: 0,
    });
  }

  static fromJSON(json) {
    const size = json.size;
    const cells = size * size;
    const givens = decodeGrid(json.givens);
    const solution = decodeGrid(json.solution);
    const board = decodeGrid(json.board);
    const locked = json.locked ? decodeGrid(json.locked) : board.map((v, i) => (v && v === solution[i] ? 1 : 0));
    if (![4, 6, 8].includes(size) || [givens, solution, board, locked].some((grid) => grid.length !== cells)) {
      throw new Error('Invalid saved stage');
    }
    const count = (value, fallback) => (Number.isFinite(value) && value >= 0 ? value : fallback);
    return new StageSession({
      stage: json.stage,
      tier: json.tier,
      size,
      givens,
      solution,
      board,
      locked,
      signs: decodeSigns(json.signs || []),
      lives: Math.min(count(json.lives, MAX_LIVES), MAX_LIVES),
      hints: count(json.hints, MAX_HINTS),
      mistakes: count(json.mistakes, 0),
      hintsUsed: count(json.hintsUsed, 0),
      elapsed: count(json.elapsed, 0),
    });
  }

  toJSON() {
    return {
      stage: this.stage,
      tier: this.tier,
      size: this.size,
      givens: encodeGrid(this.givens),
      solution: encodeGrid(this.solution),
      board: encodeGrid(this.board),
      locked: encodeGrid(this.locked),
      signs: encodeSigns(this.signs),
      lives: this.lives,
      hints: this.hints,
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      elapsed: Math.floor(this.elapsed),
    };
  }

  get won() {
    return this.board.every((v, i) => v === this.solution[i]);
  }

  get outOfLives() {
    return this.lives <= 0;
  }

  isLocked(index) {
    return this.locked[index] === 1;
  }

  cycle(index, backwards = false) {
    if (this.isLocked(index)) return null;
    this.board[index] = (backwards ? CYCLE_BACK : CYCLE)[this.board[index]];
    return this.board[index];
  }

  set(index, value) {
    if (this.isLocked(index)) return false;
    this.board[index] = value;
    return true;
  }

  checkLines() {
    const correct = [];
    const wrong = [];
    for (const line of this.ctx.lines) {
      if (!isLineFull(this.board, line) || line.every((i) => this.isLocked(i))) continue;
      if (line.every((i) => this.board[i] === this.solution[i])) correct.push(line);
      else wrong.push(line);
    }
    correct.forEach((line) => line.forEach((i) => (this.locked[i] = 1)));
    const wrongCells = [...new Set(wrong.flat())].filter((i) => this.board[i] !== this.solution[i]);
    if (wrong.length) {
      this.lives--;
      this.mistakes++;
      wrongCells.forEach((i) => (this.board[i] = EMPTY));
    }
    return { correct, wrong, wrongCells, won: this.won };
  }

  useHint() {
    if (this.hints <= 0 || this.won) return null;
    for (;;) {
      const trusted = this.board.map((v, i) => (this.isLocked(i) ? v : EMPTY));
      const step = nextDeduction(trusted, this.ctx) || this.revealStep();
      if (!step) return null;
      this.locked[step.index] = 1;
      if (this.board[step.index] === step.value) continue;
      this.board[step.index] = step.value;
      this.hints--;
      this.hintsUsed++;
      return step;
    }
  }

  revealStep() {
    const index = this.board.findIndex((v, i) => v !== this.solution[i]);
    return index < 0 ? null : { index, value: this.solution[index], rule: 'reveal' };
  }

  restart() {
    this.board = this.givens.slice();
    this.locked = this.givens.map((v) => (v ? 1 : 0));
    this.lives = MAX_LIVES;
    this.hints = MAX_HINTS;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.elapsed = 0;
  }

  refillLives() {
    this.lives = MAX_LIVES;
  }

  stars() {
    const penalties = this.mistakes + this.hintsUsed;
    if (penalties === 0) return 3;
    return penalties <= 2 ? 2 : 1;
  }
}
