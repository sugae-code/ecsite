// CrazyGames HTML5 v3 SDK integration. No API keys, game IDs or payouts are invented.
// Disabled on independent hosts. Basic Launch does not serve ads.
export const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

export function isSdkHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' ||
    hostname === 'crazygames.com' || hostname.endsWith('.crazygames.com');
}

export function createCrazyGamesBridge({ hostname, loadSdk, onMute = () => {} }) {
  let sdk = null;
  let desiredPlaying = false;
  let reportedPlaying = false;
  let initTask = null;

  function sendPlaying(playing) {
    if (!sdk || reportedPlaying === playing) return;
    try {
      if (playing) sdk.game.gameplayStart();
      else sdk.game.gameplayStop();
      reportedPlaying = playing;
    } catch {
      // The game remains playable even if the platform API is temporarily unavailable.
    }
  }

  return {
    init() {
      if (!isSdkHost(hostname)) return Promise.resolve(false);
      if (initTask) return initTask;
      initTask = (async () => {
        try {
          const candidate = await loadSdk();
          await candidate.init(); // v3 requires initialization before other SDK calls.
          if (!['crazygames', 'local'].includes(candidate.environment)) return false;
          sdk = candidate;
          onMute(Boolean(sdk.game.settings?.muteAudio));
          if (typeof sdk.game.addSettingsChangeListener === 'function') {
            sdk.game.addSettingsChangeListener(settings => onMute(Boolean(settings?.muteAudio)));
          }
          sendPlaying(desiredPlaying);
          return true;
        } catch {
          return false;
        }
      })();
      return initTask;
    },
    start() {
      desiredPlaying = true;
      sendPlaying(true);
    },
    stop() {
      desiredPlaying = false;
      sendPlaying(false);
    },
    get environment() {
      return sdk?.environment ?? 'disabled';
    },
    // Call only after formal Full Launch selection, at an actual round break.
    // Basic Launch must not request ads or block gameplay.
    async midgameAd({ approved, onStart = () => {}, onFinish = () => {} }) {
      if (!approved || !sdk || sdk.environment !== 'crazygames') return false;
      if (desiredPlaying) return false; // Never interrupt active gameplay.
      let settled = false;
      return await new Promise(resolve => {
        const finish = result => {
          if (settled) return;
          settled = true;
          onFinish();
          resolve(result);
        };
        try {
          const request = sdk.ad.requestAd('midgame', {
            adStarted: () => onStart(),
            adFinished: () => finish(true),
            adError: () => finish(false),
          });
          if (request && typeof request.catch === 'function') request.catch(() => finish(false));
        } catch {
          finish(false);
        }
      });
    },
  };
}

export function loadCrazyGamesSdk(win) {
  return new Promise((resolve, reject) => {
    const script = win.document.createElement('script');
    script.async = true;
    script.src = SDK_URL;
    script.onload = () => {
      const sdk = win.CrazyGames?.SDK;
      if (sdk) resolve(sdk);
      else reject(new Error('CrazyGames SDK unavailable'));
    };
    script.onerror = () => reject(new Error('CrazyGames SDK script failed'));
    win.document.head.appendChild(script);
  });
}
