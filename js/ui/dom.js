export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

export const icon = (name, className = 'icon') =>
  `<svg class="${className}" aria-hidden="true"><use href="assets/images/icons.svg#${name}"></use></svg>`;

export const image = (name, className = '') => `<img class="${className}" src="assets/images/${name}.svg" alt="" draggable="false">`;

export function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function showScreen(id) {
  $$('.screen').forEach((screen) => screen.classList.toggle('is-active', screen.id === id));
}

let toastTimer = 0;
export function toast(text, duration = 2600) {
  const node = $('#toast');
  node.textContent = text;
  node.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), duration);
}
