/**
 * storage.js
 * ---------------------------------------------------------------------------
 * Thin wrapper around localStorage. Every read/write goes through here so
 * that (a) a missing/blocked localStorage never crashes the app, and
 * (b) this is the single file that needs to change when the app later talks
 * to a real backend (see api.js, which currently just calls these functions).
 */

const Storage = (function () {
  const KEYS = {
    SETTINGS: 'tentype:settings',
    BESTS: 'tentype:personalBests',
    HISTORY: 'tentype:history',
  };

  const LEGACY_KEYS = {
    SETTINGS: 'cadence:settings',
    BESTS: 'cadence:personalBests',
    HISTORY: 'cadence:history',
  };

  const MAX_HISTORY_ENTRIES = 100;

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    defaultDuration: 30,
    fontSizeStep: 3, // 1..5, maps to a CSS font-size in app.js
    soundEnabled: true,
  };

  // Detect whether localStorage is actually usable (Safari private mode,
  // disabled storage, sandboxed iframes, etc. can all make it throw).
  let storageAvailable = true;
  try {
    const testKey = '__tentype_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch (err) {
    storageAvailable = false;
    console.warn('TenType: localStorage is unavailable, falling back to in-memory storage for this session.');
  }

  // In-memory fallback so the app still works (just without persistence)
  // when localStorage can't be used.
  const memoryStore = {};

  function readRaw(key) {
    if (!storageAvailable) return memoryStore[key] || null;
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return memoryStore[key] || null;
    }
  }

  function writeRaw(key, value) {
    if (!storageAvailable) {
      memoryStore[key] = value;
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      // Quota exceeded or blocked mid-session: degrade gracefully.
      memoryStore[key] = value;
    }
  }

  function readJSON(key, fallback) {
    const raw = readRaw(key);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      writeRaw(key, JSON.stringify(value));
    } catch (err) {
      /* value wasn't serializable; ignore rather than crash the app */
    }
  }

  // Keep existing results when upgrading from the Cadence name.
  function migrateLegacyData() {
    if (!storageAvailable) return;

    Object.keys(KEYS).forEach((name) => {
      const currentKey = KEYS[name];
      const legacyKey = LEGACY_KEYS[name];
      if (readRaw(currentKey) !== null) return;

      const legacyValue = readRaw(legacyKey);
      if (legacyValue !== null) writeRaw(currentKey, legacyValue);
    });
  }

  migrateLegacyData();

  // ---- settings -------------------------------------------------------

  function getSettings() {
    const stored = readJSON(KEYS.SETTINGS, {});
    return Object.assign({}, DEFAULT_SETTINGS, stored);
  }

  function saveSettings(settings) {
    writeJSON(KEYS.SETTINGS, settings);
  }

  function resetSettings() {
    writeJSON(KEYS.SETTINGS, DEFAULT_SETTINGS);
    return Object.assign({}, DEFAULT_SETTINGS);
  }

  // ---- personal bests ---------------------------------------------------
  // Keyed by duration in seconds, e.g. { "30": { wpm, accuracy, rawWpm } }

  function getPersonalBests() {
    return readJSON(KEYS.BESTS, {});
  }

  function getPersonalBest(durationSeconds) {
    const bests = getPersonalBests();
    return bests[String(durationSeconds)] || null;
  }

  /** Returns { best, isNewBest } */
  function maybeSavePersonalBest(durationSeconds, result) {
    const bests = getPersonalBests();
    const key = String(durationSeconds);
    const current = bests[key];
    const isNewBest = !current || result.wpm > current.wpm;

    if (isNewBest) {
      bests[key] = {
        wpm: result.wpm,
        accuracy: result.accuracy,
        rawWpm: result.rawWpm,
        achievedAt: Date.now(),
      };
      writeJSON(KEYS.BESTS, bests);
    }

    return { best: bests[key], isNewBest };
  }

  // ---- test history -------------------------------------------------------

  function getHistory() {
    return readJSON(KEYS.HISTORY, []);
  }

  function addHistoryEntry(entry) {
    const history = getHistory();
    history.unshift(entry); // newest first
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.length = MAX_HISTORY_ENTRIES;
    }
    writeJSON(KEYS.HISTORY, history);
    return history;
  }

  function clearHistory() {
    writeJSON(KEYS.HISTORY, []);
  }

  return {
    isAvailable: () => storageAvailable,
    getSettings,
    saveSettings,
    resetSettings,
    getPersonalBests,
    getPersonalBest,
    maybeSavePersonalBest,
    getHistory,
    addHistoryEntry,
    clearHistory,
    DEFAULT_SETTINGS,
  };
})();
