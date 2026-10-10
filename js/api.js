/**
 * api.js
 * ---------------------------------------------------------------------------
 * This is the ONLY module the rest of the app talks to for reading/writing
 * test results. Right now every method just delegates to Storage
 * (localStorage). When a real backend exists, each method below is meant to
 * become a `fetch()` call to the matching endpoint, and nothing outside this
 * file should need to change.
 *
 * Planned mapping to a future Java Spring Boot + MySQL API:
 *
 *   Api.submitTestResult(result)   -> POST /api/tests
 *   Api.getTestHistory()           -> GET  /api/tests
 *   Api.getStatistics()            -> GET  /api/stats
 *   Api.getLeaderboard(duration)   -> GET  /api/leaderboard?duration=60
 *
 * All methods are async (return Promises) even though the local version is
 * synchronous under the hood, so call sites already work correctly once
 * these become real network requests.
 */

const Api = (function () {

  /**
   * Persists a finished test result and updates personal bests.
   * @param {object} result - see statistics.js `buildResultSummary()`
   * @returns {Promise<{entry: object, isNewBest: boolean, best: object}>}
   */
  async function submitTestResult(result) {
    const entry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      timestamp: Date.now(),
      mode: result.mode,
      duration: result.duration,
      wpm: result.wpm,
      rawWpm: result.rawWpm,
      accuracy: result.accuracy,
      correctChars: result.correctChars,
      incorrectChars: result.incorrectChars,
      totalChars: result.totalChars,
      wordsTyped: result.wordsTyped,
    };

    Storage.addHistoryEntry(entry);
    const { best, isNewBest } = Storage.maybeSavePersonalBest(result.duration, result);

    return { entry, isNewBest, best };
  }

  /** @returns {Promise<object[]>} newest-first list of past tests */
  async function getTestHistory() {
    return Storage.getHistory();
  }

  /** @returns {Promise<object>} aggregate stats derived from local history */
  async function getStatistics() {
    const history = Storage.getHistory();
    return Statistics.summarizeHistory(history);
  }

  /**
   * Not meaningful without a real backend (no other users to compare to),
   * but kept here so the call site / shape already matches the future API.
   */
  async function getLeaderboard(_duration) {
    return [];
  }

  async function getSettings() {
    return Storage.getSettings();
  }

  async function saveSettings(settings) {
    Storage.saveSettings(settings);
    return settings;
  }

  return {
    submitTestResult,
    getTestHistory,
    getStatistics,
    getLeaderboard,
    getSettings,
    saveSettings,
  };
})();
