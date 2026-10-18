import { EMPTY, SUN, MOON, SIGN_SAME, opposite, conflictAt } from './rules.js';

export const LEVEL_BASIC = 1;
export const LEVEL_TRIAL = 2;

function basicStep(grid, ctx) {
  for (const sign of ctx.signs) {
    const va = grid[sign.a];
    const vb = grid[sign.b];
    if (va && !vb) return { index: sign.b, value: sign.type === SIGN_SAME ? va : opposite(va), rule: sign.type };
    if (vb && !va) return { index: sign.a, value: sign.type === SIGN_SAME ? vb : opposite(vb), rule: sign.type };
  }

  const { n, half } = ctx;
  for (const line of ctx.lines) {
    let suns = 0;
    let moons = 0;
    for (let i = 0; i < n; i++) {
      const v = grid[line[i]];
      if (v === SUN) suns++;
      else if (v === MOON) moons++;
      if (!v || i >= n - 1) continue;
      if (v === grid[line[i + 1]]) {
        if (i > 0 && !grid[line[i - 1]]) return { index: line[i - 1], value: opposite(v), rule: 'pair' };
        if (i + 2 < n && !grid[line[i + 2]]) return { index: line[i + 2], value: opposite(v), rule: 'pair' };
      }
      if (i + 2 < n && v === grid[line[i + 2]] && !grid[line[i + 1]]) {
        return { index: line[i + 1], value: opposite(v), rule: 'sandwich' };
      }
    }
    if (suns + moons < n && (suns === half || moons === half)) {
      const index = line.find((idx) => !grid[idx]);
      return { index, value: suns === half ? MOON : SUN, rule: 'count', count: half };
    }
  }
  return null;
}

function place(grid, ctx, idx, value) {
  grid[idx] = value;
  return !conflictAt(grid, ctx, idx);
}

function propagate(grid, ctx) {
  for (let step = basicStep(grid, ctx); step; step = basicStep(grid, ctx)) {
    if (!place(grid, ctx, step.index, step.value)) return false;
  }
  return true;
}

function trialStep(grid, ctx) {
  for (let idx = 0; idx < grid.length; idx++) {
    if (grid[idx] !== EMPTY) continue;
    for (const value of [SUN, MOON]) {
      const test = grid.slice();
      if (!place(test, ctx, idx, value) || !propagate(test, ctx)) {
        return { index: idx, value: opposite(value), rule: 'trial' };
      }
    }
  }
  return null;
}

export function nextDeduction(grid, ctx, maxLevel = LEVEL_TRIAL) {
  return basicStep(grid, ctx) || (maxLevel >= LEVEL_TRIAL ? trialStep(grid, ctx) : null);
}

export function solveLogic(start, ctx, maxLevel = LEVEL_TRIAL) {
  const grid = start.slice();
  let level = 0;
  for (;;) {
    let step = basicStep(grid, ctx);
    if (step) level = Math.max(level, LEVEL_BASIC);
    else if (maxLevel >= LEVEL_TRIAL && (step = trialStep(grid, ctx))) level = LEVEL_TRIAL;
    if (!step) break;
    if (!place(grid, ctx, step.index, step.value)) return { solved: false, level, grid };
  }
  return { solved: !grid.includes(EMPTY), level, grid };
}
