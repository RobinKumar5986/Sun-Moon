import { audio, midiToHz } from './engine.js';

const play = (fn) => {
  if (!audio.running) return;
  fn(audio.ctx.currentTime);
};

const notes = (list, start, gap, opts = {}) =>
  list.forEach((midi, i) => audio.tone({ freq: midiToHz(midi), when: start + i * gap, dur: 0.35, gain: 0.16, ...opts }));

export const sfx = {
  tap: () => play((t) => audio.tone({ freq: 660, slideTo: 990, when: t, dur: 0.09, gain: 0.12 })),
  place: () =>
    play((t) => {
      audio.tone({ freq: 523, slideTo: 1046, when: t, dur: 0.12, gain: 0.16 });
      audio.tone({ freq: 1568, when: t + 0.04, dur: 0.18, gain: 0.05 });
    }),
  wrong: () =>
    play((t) => {
      audio.tone({ freq: 220, slideTo: 110, type: 'square', when: t, dur: 0.28, gain: 0.08, filter: 900 });
      audio.tone({ freq: 233, slideTo: 116, type: 'square', when: t, dur: 0.28, gain: 0.06, filter: 700 });
    }),
  line: () => play((t) => notes([72, 76, 79, 84], t, 0.06, { gain: 0.1, dur: 0.3 })),
  hint: () =>
    play((t) => {
      notes([84, 88, 91, 96], t, 0.05, { gain: 0.06, dur: 0.4 });
      audio.noise({ when: t, dur: 0.3, gain: 0.03, highpass: 9000 });
    }),
  win: () =>
    play((t) => {
      notes([60, 64, 67, 72, 76, 79, 84], t, 0.08, { gain: 0.14, dur: 0.5, type: 'triangle' });
      notes([72, 76, 79], t + 0.62, 0, { gain: 0.1, dur: 1.2, type: 'sine' });
    }),
  star: (n) => play((t) => notes([79 + n * 3, 86 + n * 3], t, 0.07, { gain: 0.12, dur: 0.4 })),
  lose: () => play((t) => notes([67, 63, 60, 55], t, 0.16, { gain: 0.12, dur: 0.45, type: 'triangle' })),
  click: () => play((t) => audio.tone({ freq: 880, when: t, dur: 0.05, gain: 0.07 })),
  reward: () => play((t) => notes([67, 71, 74, 79, 83], t, 0.07, { gain: 0.12, dur: 0.4 })),
};
