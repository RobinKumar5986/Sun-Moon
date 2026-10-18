import { sdk } from './sdk.js';
import { randomSalt } from './rng.js';

const LOCAL_KEY = 'sun-and-moon-save';
const SAVE_VERSION = 1;
const LOAD_ATTEMPTS = 3;

let loaded = false;
let pendingTimer = 0;

function defaults() {
  return {
    version: SAVE_VERSION,
    salt: randomSalt(),
    stage: 1,
    best: 0,
    stars: [],
    tutorialDone: false,
    signsTipSeen: false,
    settings: { music: true, sfx: true },
    current: null,
  };
}

function migrate(raw) {
  const base = defaults();
  if (!raw || typeof raw !== 'object') return base;
  const whole = (value, min, fallback) => (Number.isInteger(value) && value >= min ? value : fallback);
  const stage = whole(raw.stage, 1, base.stage);
  return {
    ...base,
    ...raw,
    salt: whole(raw.salt, 0, base.salt),
    stage,
    best: Math.min(whole(raw.best, 0, stage - 1), stage - 1),
    stars: Array.isArray(raw.stars) ? raw.stars.map((n) => whole(n, 0, 0)) : [],
    settings: { ...base.settings, ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) },
    current: raw.current && typeof raw.current === 'object' ? raw.current : null,
    version: SAVE_VERSION,
  };
}

async function readSave() {
  if (!sdk.inPlayables) {
    try {
      return window.localStorage.getItem(LOCAL_KEY);
    } catch {
      return null;
    }
  }
  for (let attempt = 1; ; attempt++) {
    try {
      return await sdk.loadData();
    } catch (error) {
      if (attempt >= LOAD_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
}

export async function loadSave() {
  let text = null;
  try {
    text = await readSave();
    loaded = true;
  } catch {
    sdk.logError();
  }
  try {
    return migrate(text ? JSON.parse(text) : null);
  } catch {
    return migrate(null);
  }
}

export function writeSave(save) {
  if (!loaded) return;
  clearTimeout(pendingTimer);
  const text = JSON.stringify(save);
  if (sdk.inPlayables) {
    sdk.saveData(text).catch(() => sdk.logError());
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_KEY, text);
  } catch {
    /* storage unavailable */
  }
}

export function writeSaveSoon(save, delay = 800) {
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => writeSave(save), delay);
}
