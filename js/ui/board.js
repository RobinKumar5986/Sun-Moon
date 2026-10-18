import { el, icon } from './dom.js';
import { EMPTY, SUN, MOON, SIGN_SAME, symbolName } from '../puzzle/rules.js';

const symbolClass = (value) => (value === EMPTY ? '' : symbolName(value));
const ANIMATION_CLASS = { pop: 'pop', shine: 'shine', glow: 'hinted', dance: 'dance', nudge: 'nudge', shake: 'wrong' };

export class Board {
  constructor(root, { onCell } = {}) {
    this.root = root;
    this.onCell = onCell;
    this.cursor = -1;
    if (onCell) {
      root.addEventListener('pointerdown', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell || e.button > 2) return;
        e.preventDefault();
        this.onCell(Number(cell.dataset.i), { alternate: e.button === 2 });
      });
      root.addEventListener('contextmenu', (e) => e.preventDefault());
      root.addEventListener('animationend', (e) => {
        const className = ANIMATION_CLASS[e.animationName];
        if (className && e.target.classList.contains('tile')) e.target.classList.remove(className);
      });
    }
  }

  render({ cols, rows = cols, values, givens = [], locked = [], signs = [], marks = {} }) {
    this.cols = cols;
    this.rows = rows;
    this.root.innerHTML = '';
    this.root.style.setProperty('--cols', cols);
    this.root.style.setProperty('--rows', rows);
    this.root.classList.remove('is-won');

    const grid = el('div', 'board-grid');
    this.cells = values.map((value, i) => {
      const cell = el(this.onCell ? 'button' : 'div', 'cell');
      cell.dataset.i = i;
      if (this.onCell) {
        cell.type = 'button';
        cell.tabIndex = -1;
      }
      const tile = el('span', `tile ${symbolClass(value)}`);
      if (givens[i]) tile.classList.add('given');
      else if (locked[i]) tile.classList.add('locked');
      if (marks[i]) tile.classList.add(marks[i]);
      cell.append(tile);
      grid.append(cell);
      this.label(cell, i, value);
      return cell;
    });
    this.root.append(grid);

    const layer = el('div', 'sign-layer');
    for (const sign of signs) {
      const horizontal = sign.b === sign.a + 1;
      const r = Math.floor(sign.a / cols);
      const c = sign.a % cols;
      const node = el('span', `sign ${sign.type}`, icon(sign.type === SIGN_SAME ? 'equal' : 'cross'));
      node.style.left = `${((horizontal ? c + 1 : c + 0.5) / cols) * 100}%`;
      node.style.top = `${((horizontal ? r + 0.5 : r + 1) / rows) * 100}%`;
      layer.append(node);
    }
    this.root.append(layer);
    this.setCursor(this.cursor >= 0 && this.cursor < values.length ? this.cursor : -1);
  }

  tile(index) {
    return this.cells[index].firstChild;
  }

  label(cell, index, value) {
    if (!this.onCell) return;
    const r = Math.floor(index / this.cols) + 1;
    const c = (index % this.cols) + 1;
    const name = value === EMPTY ? 'empty' : value === SUN ? 'sun' : 'moon';
    const fixed = cell.firstChild?.matches('.given, .locked') ? ', locked' : '';
    cell.setAttribute('aria-label', `Row ${r}, column ${c}: ${name}${fixed}`);
  }

  setValue(index, value, animate = true) {
    const tile = this.tile(index);
    tile.classList.remove('sun', 'moon', 'pop', 'hinted', 'wrong');
    if (value !== EMPTY) tile.classList.add(symbolName(value));
    if (animate && value !== EMPTY) this.restartAnimation(tile, 'pop');
    this.label(this.cells[index], index, value);
  }

  syncLocks(locked) {
    locked.forEach((isLocked, i) => {
      const tile = this.tile(i);
      if (!isLocked || tile.classList.contains('given') || tile.classList.contains('locked')) return;
      tile.classList.add('locked');
      this.label(this.cells[i], i, tile.classList.contains('sun') ? SUN : tile.classList.contains('moon') ? MOON : EMPTY);
    });
  }

  nudge(index) {
    this.restartAnimation(this.tile(index), 'nudge');
  }

  flashLines(lines) {
    lines.flat().forEach((index) => this.restartAnimation(this.tile(index), 'wrong'));
  }

  markHint(index) {
    this.restartAnimation(this.tile(index), 'hinted');
  }

  celebrateLines(lines) {
    lines.forEach((line) =>
      line.forEach((index, order) => {
        const tile = this.tile(index);
        tile.style.setProperty('--delay', `${order * 45}ms`);
        this.restartAnimation(tile, 'shine');
      }),
    );
  }

  celebrateWin() {
    this.cells.forEach((cell, i) => {
      const tile = cell.firstChild;
      const r = Math.floor(i / this.cols);
      const c = i % this.cols;
      tile.style.setProperty('--delay', `${(r + c) * 55}ms`);
      this.restartAnimation(tile, 'dance');
    });
    this.root.classList.add('is-won');
  }

  setCursor(index) {
    this.cells?.forEach((cell, i) => cell.classList.toggle('has-cursor', i === index));
    this.cursor = index;
  }

  moveCursor(dr, dc) {
    if (!this.cells) return;
    if (this.cursor < 0) return this.setCursor(0);
    const r = (Math.floor(this.cursor / this.cols) + dr + this.rows) % this.rows;
    const c = ((this.cursor % this.cols) + dc + this.cols) % this.cols;
    this.setCursor(r * this.cols + c);
  }

  cellCenter(index) {
    const rect = this.cells[index].getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  restartAnimation(node, className) {
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }
}

export function miniBoard(options) {
  const root = el('div', 'board mini');
  new Board(root).render(options);
  return root;
}
