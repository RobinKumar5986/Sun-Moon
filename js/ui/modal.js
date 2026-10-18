import { $, $$, el } from './dom.js';

const stack = [];

const updateInert = () => $$('.screen').forEach((screen) => (screen.inert = stack.length > 0));

export const isModalOpen = () => stack.length > 0;

export function openModal({ title = '', body, className = '', onClose }) {
  const backdrop = el('div', 'modal-backdrop');
  const card = el('div', `modal ${className}`.trim());
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  if (title) card.append(el('h2', 'modal-title', title));
  const content = el('div');
  if (typeof body === 'string') content.innerHTML = body;
  else if (body) content.append(body);
  card.append(content);
  backdrop.append(card);
  $('#modals').append(backdrop);

  const modal = {
    el: card,
    dismissible: true,
    closed: false,
    close(reason) {
      if (modal.closed) return;
      modal.closed = true;
      stack.splice(stack.indexOf(modal), 1);
      backdrop.classList.add('is-leaving');
      setTimeout(() => backdrop.remove(), 220);
      updateInert();
      onClose?.(reason);
    },
  };

  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop && modal.dismissible) modal.close('dismiss');
  });
  stack.push(modal);
  updateInert();
  requestAnimationFrame(() => card.querySelector('button')?.focus({ preventScroll: true }));
  return modal;
}

export function bindAction(modal, selector, handler) {
  modal.el.querySelector(selector)?.addEventListener('click', handler);
}

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !stack.length) return;
  const top = stack[stack.length - 1];
  if (top.dismissible) top.close('dismiss');
});
