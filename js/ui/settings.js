import { icon } from './dom.js';
import { openModal, bindAction } from './modal.js';
import { openTutorial } from './tutorial.js';
import { APP_VERSION } from '../core/version.js';

const toggle = (key, label, iconName, on) => `
  <label class="toggle-row">
    <span class="toggle-icon">${icon(iconName)}</span>
    <span class="toggle-label">${label}</span>
    <input type="checkbox" class="switch" data-key="${key}" ${on ? 'checked' : ''}>
  </label>`;

export function openSettings({ settings, inGame, onChange, onHome }) {
  const body = `
    ${toggle('music', 'Music', 'music', settings.music)}
    ${toggle('sfx', 'Sound effects', 'sparkle', settings.sfx)}
    <div class="modal-actions column">
      <button class="btn btn-wide" data-act="help">${icon('help')} How to play</button>
      ${inGame ? `<button class="btn btn-ghost btn-wide" data-act="home">${icon('home')} Home</button>` : ''}
      <button class="btn btn-green btn-wide" data-act="done">Done</button>
    </div>
    <p class="version">Version ${APP_VERSION}</p>`;
  const modal = openModal({ title: 'Settings', body });
  modal.el.querySelectorAll('.switch').forEach((input) =>
    input.addEventListener('change', () => onChange(input.dataset.key, input.checked)),
  );
  bindAction(modal, '[data-act="done"]', () => modal.close('done'));
  bindAction(modal, '[data-act="help"]', () => {
    modal.close('help');
    openTutorial();
  });
  bindAction(modal, '[data-act="home"]', () => {
    modal.close('home');
    onHome();
  });
  return modal;
}
