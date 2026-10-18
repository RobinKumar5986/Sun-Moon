import { sdk } from '../core/sdk.js';

const MUSIC_LEVEL = 0.5;
const SFX_LEVEL = 0.85;

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.youtubeEnabled = sdk.isAudioEnabled();
    this.paused = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.readyListeners = [];
  }

  unlock() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.ctx = new Context();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.buses = { music: this.ctx.createGain(), sfx: this.ctx.createGain() };
      this.buses.music.connect(this.master);
      this.buses.sfx.connect(this.master);
      this.applyLevels(true);
      this.readyListeners.forEach((fn) => fn());
    }
    if (!this.paused && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  onReady(fn) {
    if (this.ctx) fn();
    else this.readyListeners.push(fn);
  }

  get running() {
    return Boolean(this.ctx) && !this.paused;
  }

  applyLevels(instant = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const set = (param, value) => (instant ? param.setValueAtTime(value, t) : param.setTargetAtTime(value, t, 0.05));
    set(this.master.gain, this.youtubeEnabled ? 1 : 0);
    set(this.buses.music.gain, this.musicEnabled ? MUSIC_LEVEL : 0);
    set(this.buses.sfx.gain, this.sfxEnabled ? SFX_LEVEL : 0);
  }

  setYouTubeAudio(enabled) {
    this.youtubeEnabled = enabled;
    this.applyLevels();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    this.applyLevels();
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    this.applyLevels();
  }

  pause() {
    this.paused = true;
    if (this.ctx) this.ctx.suspend();
  }

  resume() {
    this.paused = false;
    if (this.ctx) this.ctx.resume();
  }

  tone({ freq, type = 'sine', when = 0, dur = 0.2, gain = 0.2, attack = 0.005, sustain = false, bus = 'sfx', filter = 0, detune = 0, slideTo = 0 }) {
    const ctx = this.ctx;
    const t = Math.max(when, ctx.currentTime);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    if (sustain) {
      amp.gain.linearRampToValueAtTime(gain, t + attack);
      amp.gain.linearRampToValueAtTime(gain * 0.75, t + dur * 0.7);
    } else {
      amp.gain.exponentialRampToValueAtTime(gain, t + attack);
    }
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = osc;
    if (filter) {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = filter;
      osc.connect(lowpass);
      node = lowpass;
    }
    node.connect(amp);
    amp.connect(this.buses[bus]);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noise({ when = 0, dur = 0.05, gain = 0.05, highpass = 6000, bus = 'sfx' }) {
    const ctx = this.ctx;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = Math.max(when, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.buses[bus]);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const audio = new AudioEngine();
export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);
