import { audio, midiToHz } from './engine.js';
import { createRng, randomSalt } from '../core/rng.js';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTATONIC = [0, 2, 4, 7, 9];
const STEPS_PER_BAR = 8;
const BARS_PER_SECTION = 8;
const SECTIONS_PER_SONG = 4;
const LOOKAHEAD = 0.15;

const SONGS = [
  { root: 60, bpm: 96, progression: [0, 4, 5, 3] },
  { root: 65, bpm: 90, progression: [0, 2, 3, 4] },
  { root: 62, bpm: 100, progression: [5, 3, 0, 4] },
  { root: 67, bpm: 92, progression: [0, 5, 1, 4] },
  { root: 63, bpm: 86, progression: [3, 4, 2, 5] },
  { root: 64, bpm: 94, progression: [0, 3, 5, 4] },
];

const ARP_PATTERNS = [
  [0, 1, 2, 1, 0, 1, 2, 1],
  [0, 2, 1, 2, 0, 2, 1, 2],
  [0, 1, 2, 3, 2, 1, 0, 1],
  [2, 1, 0, 1, 2, 1, 3, 1],
];

const RHYTHMS = [
  [1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0],
];

const LAYERS = [
  { pad: true, bass: true, arp: true },
  { pad: true, bass: true, arp: true, melody: true, shaker: true },
  { pad: true, bass: true, arp: true, melody: true, shaker: true, kick: true },
  { pad: true, melody: true, bells: true },
];

function scaleNote(root, degree) {
  const octave = Math.floor(degree / 7);
  return root + MAJOR[((degree % 7) + 7) % 7] + 12 * octave;
}

function chordNotes(song, degree) {
  return [degree, degree + 2, degree + 4, degree + 7].map((d) => scaleNote(song.root, d));
}

class MusicPlayer {
  constructor() {
    this.playing = false;
    this.timer = 0;
    this.songIndex = randomSalt() % SONGS.length;
    this.resetSong();
  }

  resetSong() {
    this.song = SONGS[this.songIndex];
    this.rng = createRng(randomSalt());
    this.step = 0;
    this.arp = this.rng.pick(ARP_PATTERNS);
    this.phrase = [];
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this.step = STEPS_PER_BAR * BARS_PER_SECTION;
    audio.onReady(() => this.refresh());
  }

  get audible() {
    return this.playing && Boolean(audio.ctx) && !audio.paused && audio.musicEnabled && audio.youtubeEnabled;
  }

  pause() {
    clearTimeout(this.timer);
    this.timer = 0;
  }

  refresh() {
    if (!this.audible) return this.pause();
    if (this.timer) return;
    this.nextTime = audio.ctx.currentTime + 0.02;
    this.tick();
  }

  nextSong() {
    this.songIndex = (this.songIndex + 1 + this.rng.int(SONGS.length - 1)) % SONGS.length;
    this.resetSong();
  }

  tick() {
    clearTimeout(this.timer);
    if (!this.audible) return this.pause();
    const stepDur = 60 / this.song.bpm / 2;
    while (this.nextTime < audio.ctx.currentTime + LOOKAHEAD) {
      this.scheduleStep(this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
      if (this.step >= STEPS_PER_BAR * BARS_PER_SECTION * SECTIONS_PER_SONG) this.nextSong();
    }
    this.timer = setTimeout(() => this.tick(), 40);
  }

  scheduleStep(t, stepDur) {
    const song = this.song;
    const bar = Math.floor(this.step / STEPS_PER_BAR);
    const pos = this.step % STEPS_PER_BAR;
    const section = Math.floor(bar / BARS_PER_SECTION) % SECTIONS_PER_SONG;
    const layers = LAYERS[section];
    const degree = song.progression[bar % song.progression.length];
    const chord = chordNotes(song, degree);
    const barDur = stepDur * STEPS_PER_BAR;

    if (pos === 0 && bar % BARS_PER_SECTION === 0) this.arp = this.rng.pick(ARP_PATTERNS);

    if (layers.pad && pos === 0) {
      chord.slice(0, 3).forEach((note) => {
        [-7, 7].forEach((detune) =>
          audio.tone({ freq: midiToHz(note - 12), type: 'triangle', when: t, dur: barDur * 1.05, gain: 0.035, attack: 0.15, sustain: true, bus: 'music', filter: 1100, detune }),
        );
      });
    }

    if (layers.bass && (pos === 0 || pos === 4 || (pos === 7 && bar % 2 === 1))) {
      const note = pos === 7 ? chord[2] - 24 : chord[0] - 24;
      audio.tone({ freq: midiToHz(note), type: 'sine', when: t, dur: stepDur * 2.6, gain: 0.2, attack: 0.01, bus: 'music' });
      audio.tone({ freq: midiToHz(note + 12), type: 'triangle', when: t, dur: stepDur * 1.5, gain: 0.04, attack: 0.01, bus: 'music', filter: 900 });
    }

    if (layers.arp) {
      const note = chord[this.arp[pos]] + (section === 2 ? 12 : 0);
      audio.tone({ freq: midiToHz(note), type: 'sine', when: t, dur: stepDur * 1.8, gain: 0.05, bus: 'music' });
      audio.tone({ freq: midiToHz(note + 12), type: 'sine', when: t, dur: stepDur * 0.8, gain: 0.012, bus: 'music' });
    }

    if (layers.bells && pos % 2 === 0) {
      const note = chord[(pos / 2 + bar) % 4] + 12;
      audio.tone({ freq: midiToHz(note), type: 'sine', when: t, dur: stepDur * 4, gain: 0.035, bus: 'music' });
    }

    if (layers.melody) this.scheduleMelody(t, stepDur, bar, pos, chord, section);

    if (layers.shaker && pos % 2 === 1) audio.noise({ when: t, dur: 0.05, gain: 0.018, highpass: 7500, bus: 'music' });

    if (layers.kick && pos % 4 === 0) {
      audio.tone({ freq: 130, slideTo: 45, type: 'sine', when: t, dur: 0.22, gain: 0.22, attack: 0.003, bus: 'music' });
    }
  }

  scheduleMelody(t, stepDur, bar, pos, chord, section) {
    const phraseStep = (bar % 2) * STEPS_PER_BAR + pos;
    if (phraseStep === 0) this.phrase = this.composePhrase(chord, section);
    const note = this.phrase[phraseStep];
    if (!note) return;
    audio.tone({ freq: midiToHz(note.midi), type: 'triangle', when: t, dur: stepDur * note.length, gain: 0.06, attack: 0.02, bus: 'music', filter: 2600 });
    audio.tone({ freq: midiToHz(note.midi), type: 'sine', when: t, dur: stepDur * note.length, gain: 0.03, attack: 0.02, bus: 'music', detune: 6 });
  }

  composePhrase(chord, section) {
    const rhythm = this.rng.pick(RHYTHMS);
    const base = this.song.root + (section === 2 ? 17 : 12);
    const phrase = new Array(16).fill(null);
    let degree = this.rng.int(PENTATONIC.length);
    for (let i = 0; i < rhythm.length; i++) {
      if (!rhythm[i]) continue;
      degree = Math.max(0, Math.min(PENTATONIC.length * 2 - 1, degree + this.rng.pick([-2, -1, -1, 0, 1, 1, 2])));
      let midi = base + PENTATONIC[degree % PENTATONIC.length] + 12 * Math.floor(degree / PENTATONIC.length);
      if (i % 4 === 0) midi = this.nearestChordTone(midi, chord);
      let length = 1;
      while (i + length < rhythm.length && !rhythm[i + length] && length < 3) length++;
      phrase[i] = { midi, length: length + 0.4 };
    }
    return phrase;
  }

  nearestChordTone(midi, chord) {
    const tones = chord.flatMap((n) => [n, n + 12, n + 24]);
    return tones.reduce((best, n) => (Math.abs(n - midi) < Math.abs(best - midi) ? n : best), tones[0]);
  }
}

export const music = new MusicPlayer();
