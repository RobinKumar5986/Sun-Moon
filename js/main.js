import { sdk } from './core/sdk.js';
import { loadSave, writeSave } from './core/storage.js';
import { audio } from './audio/engine.js';
import { music } from './audio/music.js';
import { sfx } from './audio/sfx.js';
import { effects } from './ui/effects.js';
import { $, showScreen } from './ui/dom.js';
import { openSettings } from './ui/settings.js';
import { openTutorial } from './ui/tutorial.js';
import { renderHome } from './ui/home.js';
import { GameController } from './game/controller.js';

let game = null;

sdk.firstFrameReady();
window.addEventListener('error', () => sdk.logError());
window.addEventListener('unhandledrejection', () => sdk.logError());

sdk.onAudioEnabledChange((enabled) => {
  audio.setYouTubeAudio(enabled);
  music.refresh();
});
sdk.onPause(() => {
  document.body.classList.add('is-paused');
  game?.pause();
  music.pause();
  audio.pause();
  effects.pause();
});
sdk.onResume(() => {
  document.body.classList.remove('is-paused');
  audio.resume();
  music.refresh();
  effects.resume();
  game?.resume();
});

async function init() {
  effects.init();
  const save = await loadSave();

  audio.setMusicEnabled(save.settings.music);
  audio.setSfxEnabled(save.settings.sfx);

  const goHome = () => {
    showScreen('screen-home');
    renderHome(save);
  };

  const settings = ({ inGame }) =>
    openSettings({
      settings: save.settings,
      inGame,
      onHome: () => game.goHome(),
      onChange: (key, value) => {
        save.settings[key] = value;
        if (key === 'music') {
          audio.setMusicEnabled(value);
          music.refresh();
        } else {
          audio.setSfxEnabled(value);
        }
        writeSave(save);
      },
    });

  game = new GameController({ save, onHome: goHome, openSettings: settings });

  $('#btn-play').addEventListener('click', () => game.play());
  $('#btn-home-help').addEventListener('click', () => openTutorial());
  $('#btn-home-settings').addEventListener('click', () => settings({ inGame: false }));

  const unlockAudio = () => {
    audio.unlock();
    music.start();
  };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((type) => window.addEventListener(type, unlockAudio, true));
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn, .btn-round')) sfx.click();
  });

  goHome();
  sdk.gameReady();
}

init();
