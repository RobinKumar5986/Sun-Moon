import { generatePuzzle } from '../js/puzzle/generator.js';
import { stageConfig } from '../js/puzzle/difficulty.js';
import { solveLogic } from '../js/puzzle/solver.js';
import { createContext, conflictAt, EMPTY, SUN, MOON } from '../js/puzzle/rules.js';
import { hashSeed } from '../js/core/rng.js';
import { APP_VERSION } from '../js/core/version.js';
import fs from 'fs';

const stages = Number(process.argv[2] || 120);
const salts = Number(process.argv[3] || 3);

function countSolutions(givens, ctx, limit = 2) {
  const grid = givens.slice();
  let found = 0;
  const walk = (idx) => {
    if (found >= limit) return;
    if (idx === grid.length) { found++; return; }
    if (grid[idx] !== EMPTY) { walk(idx + 1); return; }
    for (const v of [SUN, MOON]) {
      grid[idx] = v;
      if (!conflictAt(grid, ctx, idx)) walk(idx + 1);
    }
    grid[idx] = EMPTY;
  };
  walk(0);
  return found;
}

let failures = 0;
const pkgVersion = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version;
if (pkgVersion !== APP_VERSION) {
  failures++;
  console.error(`FAIL version mismatch: package.json ${pkgVersion} vs js/core/version.js ${APP_VERSION}`);
}
let slowest = { ms: 0 };
const rows = [];

for (let stage = 1; stage <= stages; stage++) {
  for (let s = 0; s < salts; s++) {
    const config = stageConfig(stage);
    const t0 = performance.now();
    const puzzle = generatePuzzle(config, hashSeed(1234 + s, stage));
    const ms = performance.now() - t0;
    const ctx = createContext(puzzle.size, puzzle.signs);
    const result = solveLogic(puzzle.givens, ctx, config.maxLevel);
    const matches = result.solved && result.grid.every((v, i) => v === puzzle.solution[i]);
    const unique = countSolutions(puzzle.givens, ctx) === 1;
    if (!matches || !unique) {
      failures++;
      console.error(`FAIL stage ${stage} salt ${s}: solved=${result.solved} matches=${matches} unique=${unique}`);
    }
    if (ms > slowest.ms) slowest = { ms, stage, size: puzzle.size };
    if (s === 0) {
      const givens = puzzle.givens.filter(Boolean).length;
      rows.push(`${String(stage).padStart(3)} ${config.tier.padEnd(6)} ${puzzle.size}x${puzzle.size} givens=${String(givens).padStart(2)} signs=${String(puzzle.signs.length).padStart(2)} level=${puzzle.level} ${ms.toFixed(0)}ms`);
    }
  }
}

console.log(rows.join('\n'));
console.log(`\nSlowest: ${slowest.ms.toFixed(0)}ms (stage ${slowest.stage}, ${slowest.size}x${slowest.size})`);
console.log(failures ? `${failures} FAILURES` : 'All puzzles valid and unique.');
process.exit(failures ? 1 : 0);
