import { createRng } from '../core/rng.js';
import { EMPTY, SUN, MOON, SIGN_SAME, SIGN_DIFF, createContext } from './rules.js';
import { solveLogic, LEVEL_BASIC } from './solver.js';

function randomSolution(n, rng) {
  const half = n / 2;
  const grid = new Array(n * n).fill(EMPTY);
  const rowCount = Array.from({ length: n }, () => [0, 0, 0]);
  const colCount = Array.from({ length: n }, () => [0, 0, 0]);

  const fits = (idx, v) => {
    const r = (idx / n) | 0;
    const c = idx % n;
    if (rowCount[r][v] >= half || colCount[c][v] >= half) return false;
    if (c >= 2 && grid[idx - 1] === v && grid[idx - 2] === v) return false;
    if (r >= 2 && grid[idx - n] === v && grid[idx - 2 * n] === v) return false;
    return true;
  };

  const fill = (idx) => {
    if (idx === grid.length) return true;
    const r = (idx / n) | 0;
    const c = idx % n;
    const order = rng.next() < 0.5 ? [SUN, MOON] : [MOON, SUN];
    for (const v of order) {
      if (!fits(idx, v)) continue;
      grid[idx] = v;
      rowCount[r][v]++;
      colCount[c][v]++;
      if (fill(idx + 1)) return true;
      grid[idx] = EMPTY;
      rowCount[r][v]--;
      colCount[c][v]--;
    }
    return false;
  };

  fill(0);
  return grid;
}

function pickSigns(solution, n, count, rng) {
  const pairs = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const a = r * n + c;
      if (c < n - 1) pairs.push([a, a + 1]);
      if (r < n - 1) pairs.push([a, a + n]);
    }
  }
  return rng.shuffle(pairs).slice(0, count).map(([a, b]) => ({
    a,
    b,
    type: solution[a] === solution[b] ? SIGN_SAME : SIGN_DIFF,
  }));
}

export function generatePuzzle({ size, maxLevel, targetGivens, signCount }, seed) {
  const rng = createRng(seed);
  const solution = randomSolution(size, rng);
  let signs = pickSigns(solution, size, signCount, rng);
  const ctx = createContext(size, signs);
  const givens = solution.slice();
  let givenCount = givens.length;

  for (const idx of rng.shuffle([...givens.keys()])) {
    if (givenCount <= targetGivens) break;
    givens[idx] = EMPTY;
    const quick = solveLogic(givens, ctx, LEVEL_BASIC).solved;
    if (quick || (maxLevel > LEVEL_BASIC && solveLogic(givens, ctx, maxLevel).solved)) givenCount--;
    else givens[idx] = solution[idx];
  }

  signs = signs.filter((s) => !(givens[s.a] && givens[s.b]));
  const { level } = solveLogic(givens, createContext(size, signs), maxLevel);
  return { size, givens, signs, solution, level };
}
