import { el, image } from './dom.js';
import { miniBoard } from './board.js';
import { openModal } from './modal.js';
import { SUN as S, MOON as M, SIGN_SAME, SIGN_DIFF } from '../puzzle/rules.js';

const strip = (values, extra = {}) => miniBoard({ cols: values.length, rows: 1, values, ...extra });

const example = (board, verdict) => {
  const row = el('div', `example ${verdict}`);
  row.append(board, el('span', 'verdict', verdict === 'good' ? '✓' : '✗'));
  return row;
};

const SLIDES = [
  {
    title: 'Fill the grid',
    text: 'Put a <b>sun</b> or a <b>moon</b> in every cell. <b>Tap</b> a cell for a sun, <b>tap again</b> for a moon, and once more to clear it.',
    visual: () => miniBoard({ cols: 4, values: [S, M, S, M, M, S, M, S, S, S, M, M, M, M, S, S], givens: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0] }),
  },
  {
    title: 'No three in a row',
    text: 'You can’t have <b>more than 2</b> of the same symbol next to each other, across or down.',
    visual: () => [example(strip([S, S, M, S]), 'good'), example(strip([S, S, S, M], { marks: { 0: 'bad', 1: 'bad', 2: 'bad' } }), 'bad')],
  },
  {
    title: 'Half and half',
    text: 'Every row and column has the <b>same number</b> of suns and moons.',
    visual: () => [example(strip([S, M, M, S, M, S]), 'good'), example(strip([S, M, S, S, M, S], { marks: { 0: 'bad', 2: 'bad', 3: 'bad', 5: 'bad' } }), 'bad')],
  },
  {
    title: '= and × clues',
    text: '<b>=</b> means the two cells are the <b>same</b>. <b>×</b> means they are <b>opposite</b>.',
    visual: () => [
      example(strip([S, S], { signs: [{ a: 0, b: 1, type: SIGN_SAME }] }), 'good'),
      example(strip([M, S], { signs: [{ a: 0, b: 1, type: SIGN_DIFF }] }), 'good'),
    ],
  },
  {
    title: 'Lives & hints',
    text: 'When you fill a whole <b>row or column</b>, it gets checked. Correct lines turn green and lock. A wrong line costs a life. You have <b>3 lives</b> and <b>3 hints</b>.',
    visual: () => {
      const row = el('div', 'tutorial-icons');
      row.innerHTML = `${image('heart')}${image('heart')}${image('heart')}<span class="spacer"></span>${image('bulb')}`;
      return row;
    },
  },
];

export const SIGNS_SLIDE = 3;

export function openTutorial({ slides = SLIDES.map((_, i) => i), onDone } = {}) {
  let index = 0;
  const body = el('div');
  const modal = openModal({ body, onClose: () => onDone?.() });

  const render = () => {
    const slide = SLIDES[slides[index]];
    const last = index === slides.length - 1;
    body.innerHTML = `
      <h2 class="modal-title">${slide.title}</h2>
      <div class="tutorial-visual"></div>
      <p class="tutorial-text">${slide.text}</p>
      <div class="dots">${slides.map((_, i) => `<span class="dot ${i === index ? 'is-active' : ''}"></span>`).join('')}</div>
      <div class="modal-actions">
        ${index > 0 ? '<button class="btn btn-ghost" data-act="back">Back</button>' : ''}
        <button class="btn ${last ? 'btn-green' : ''}" data-act="next">${last ? 'Let’s play!' : 'Next'}</button>
      </div>`;
    body.querySelector('.tutorial-visual').append(...[slide.visual()].flat());
    body.querySelector('[data-act="next"]').focus({ preventScroll: true });
  };

  body.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'back') index--;
    if (act === 'next') {
      if (index === slides.length - 1) return modal.close('done');
      index++;
    }
    if (act) render();
  });

  render();
  return modal;
}
