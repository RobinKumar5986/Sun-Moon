export const EMPTY = 0;
export const SUN = 1;
export const MOON = 2;

export const SIGN_SAME = 'same';
export const SIGN_DIFF = 'diff';

export const opposite = (value) => (value === SUN ? MOON : SUN);
export const symbolName = (value) => (value === SUN ? 'sun' : 'moon');

const lineCache = new Map();

function getLines(n) {
  if (!lineCache.has(n)) {
    const lines = [];
    for (let r = 0; r < n; r++) lines.push(Array.from({ length: n }, (_, c) => r * n + c));
    for (let c = 0; c < n; c++) lines.push(Array.from({ length: n }, (_, r) => r * n + c));
    lineCache.set(n, lines);
  }
  return lineCache.get(n);
}

export function createContext(n, signs) {
  const signsAt = Array.from({ length: n * n }, () => []);
  for (const sign of signs) {
    signsAt[sign.a].push(sign);
    signsAt[sign.b].push(sign);
  }
  return { n, half: n / 2, signs, signsAt, lines: getLines(n) };
}

export function conflictAt(grid, ctx, idx) {
  const { n, half } = ctx;
  const v = grid[idx];
  if (!v) return false;
  const r = (idx / n) | 0;
  const c = idx % n;

  let rowCount = 0;
  let colCount = 0;
  for (let k = 0; k < n; k++) {
    if (grid[r * n + k] === v) rowCount++;
    if (grid[k * n + c] === v) colCount++;
  }
  if (rowCount > half || colCount > half) return true;

  for (let s = Math.max(0, c - 2); s <= Math.min(c, n - 3); s++) {
    const i = r * n + s;
    if (grid[i] === v && grid[i + 1] === v && grid[i + 2] === v) return true;
  }
  for (let s = Math.max(0, r - 2); s <= Math.min(r, n - 3); s++) {
    const i = s * n + c;
    if (grid[i] === v && grid[i + n] === v && grid[i + 2 * n] === v) return true;
  }

  for (const sign of ctx.signsAt[idx]) {
    const va = grid[sign.a];
    const vb = grid[sign.b];
    if (va && vb && (sign.type === SIGN_SAME) !== (va === vb)) return true;
  }
  return false;
}

export function isLineFull(grid, line) {
  return line.every((idx) => grid[idx] !== EMPTY);
}
