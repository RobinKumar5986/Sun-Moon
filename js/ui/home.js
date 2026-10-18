import { $, icon, image } from './dom.js';
import { stageTier, TIER_NORMAL } from '../puzzle/difficulty.js';

const PATH_BEFORE = 2;
const PATH_AFTER = 3;

let lastSave = null;

function node(stage, save) {
  const done = stage < save.stage;
  const current = stage === save.stage;
  const tier = stageTier(stage);
  const stars = save.stars[stage - 1] || 0;
  const classes = ['path-node', done ? 'is-done' : current ? 'is-current' : 'is-locked', tier !== TIER_NORMAL ? `tier-${tier}` : ''];
  const badge = tier !== TIER_NORMAL ? `<span class="node-badge">${icon('flame')}</span>` : '';
  const starRow = done ? `<span class="node-stars">${[1, 2, 3].map((n) => image('star', n <= stars ? 'is-earned' : '')).join('')}</span>` : '';
  return `<li class="${classes.join(' ')}" data-stage="${stage}"><span class="node-circle">${stage}</span>${badge}${starRow}</li>`;
}

function fitPath(path, current) {
  const overflowing = () => path.scrollHeight > path.clientHeight + 1 || path.scrollWidth > path.clientWidth + 1;
  while (overflowing() && path.children.length > 1) {
    const last = path.lastElementChild;
    const removeFuture = Number(last.dataset.stage) > current + 1 || Number(path.firstElementChild.dataset.stage) === current;
    (removeFuture ? last : path.firstElementChild).remove();
  }
}

export function renderHome(save) {
  lastSave = save;
  const first = Math.max(1, save.stage - PATH_BEFORE);
  const stages = [];
  for (let s = first; s <= save.stage + PATH_AFTER; s++) stages.push(s);
  const path = $('#stage-path');
  path.innerHTML = stages.map((s) => node(s, save)).join('');
  fitPath(path, save.stage);
  $('#play-label').textContent = save.stage === 1 && !save.current ? 'Play' : `Stage ${save.stage}`;
  $('#star-total').textContent = save.stars.reduce((sum, n) => sum + (n || 0), 0);
}

window.addEventListener('resize', () => {
  if (lastSave && $('#screen-home').classList.contains('is-active')) renderHome(lastSave);
});
