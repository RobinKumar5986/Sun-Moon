const yt = typeof window.ytgame !== 'undefined' ? window.ytgame : null;
const inPlayables = Boolean(yt && yt.IN_PLAYABLES_ENV);

const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

const call = (fn) => Promise.resolve().then(fn);

export const sdk = {
  inPlayables,
  adsAvailable: inPlayables && Boolean(yt?.ads?.requestRewardedAd),

  firstFrameReady: () => safe(() => yt?.game.firstFrameReady()),
  gameReady: () => safe(() => yt?.game.gameReady()),

  loadData: () => (inPlayables ? call(() => yt.game.loadData()) : Promise.resolve(null)),
  saveData: (data) => (inPlayables ? call(() => yt.game.saveData(data)) : Promise.resolve()),

  isAudioEnabled: () => (inPlayables ? safe(() => yt.system.isAudioEnabled(), true) : true),
  onAudioEnabledChange: (cb) => inPlayables && safe(() => yt.system.onAudioEnabledChange(cb)),
  onPause: (cb) => inPlayables && safe(() => yt.system.onPause(cb)),
  onResume: (cb) => inPlayables && safe(() => yt.system.onResume(cb)),

  sendScore: (value) => inPlayables && call(() => yt.engagement.sendScore({ value })).catch(() => {}),

  async requestRewardedAd(rewardId) {
    if (!sdk.adsAvailable) return false;
    try {
      return await yt.ads.requestRewardedAd(rewardId);
    } catch {
      return false;
    }
  },

  logError: () => inPlayables && safe(() => yt.health.logError()),
};
