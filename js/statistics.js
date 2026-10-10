/**
 * statistics.js
 * ---------------------------------------------------------------------------
 * Pure functions only — no DOM, no storage. Every calculation guards against
 * divide-by-zero so the UI never shows NaN/Infinity, especially in the very
 * first fraction of a second of a test.
 */

const Statistics = (function () {

  function safeDivide(numerator, denominator, fallback) {
    if (!denominator || !isFinite(denominator) || denominator <= 0) return fallback;
    const result = numerator / denominator;
    return isFinite(result) ? result : fallback;
  }

  /**
   * @param {number} correctChars
   * @param {number} elapsedSeconds
   * @returns {number} WPM, using the standard (correct chars / 5) / minutes
   */
  function calculateWpm(correctChars, elapsedSeconds) {
    const minutes = elapsedSeconds / 60;
    return round1(safeDivide(correctChars / 5, minutes, 0));
  }

  /** Raw WPM counts every typed character, correct or not. */
  function calculateRawWpm(totalChars, elapsedSeconds) {
    const minutes = elapsedSeconds / 60;
    return round1(safeDivide(totalChars / 5, minutes, 0));
  }

  /** @returns {number} accuracy percentage, 0-100 */
  function calculateAccuracy(correctChars, totalChars) {
    if (totalChars <= 0) return 100;
    const pct = safeDivide(correctChars * 100, totalChars, 100);
    return round1(Math.max(0, Math.min(100, pct)));
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  /**
   * Builds the full result object used for the results screen, history
   * entry, and personal-best comparison.
   */
  function buildResultSummary({ mode, duration, correctChars, incorrectChars, wordsTyped, elapsedSeconds }) {
    const totalChars = correctChars + incorrectChars;
    const safeElapsed = Math.max(elapsedSeconds, 0.01); // guard against a 0s test
    return {
      mode,
      duration,
      wpm: calculateWpm(correctChars, safeElapsed),
      rawWpm: calculateRawWpm(totalChars, safeElapsed),
      accuracy: calculateAccuracy(correctChars, totalChars),
      correctChars,
      incorrectChars,
      totalChars,
      wordsTyped,
      elapsedSeconds: Math.round(safeElapsed),
    };
  }

  /** Aggregates saved history entries into the stats view summary. */
  function summarizeHistory(history) {
    if (!history || history.length === 0) {
      return {
        bestWpm: null,
        avgWpm: null,
        bestAccuracy: null,
        testsCompleted: 0,
        totalWords: 0,
        totalChars: 0,
      };
    }

    let bestWpm = 0;
    let bestAccuracy = 0;
    let wpmSum = 0;
    let totalWords = 0;
    let totalChars = 0;

    history.forEach((entry) => {
      bestWpm = Math.max(bestWpm, entry.wpm || 0);
      bestAccuracy = Math.max(bestAccuracy, entry.accuracy || 0);
      wpmSum += entry.wpm || 0;
      totalWords += entry.wordsTyped || 0;
      totalChars += entry.totalChars || 0;
    });

    return {
      bestWpm: round1(bestWpm),
      avgWpm: round1(safeDivide(wpmSum, history.length, 0)),
      bestAccuracy: round1(bestAccuracy),
      testsCompleted: history.length,
      totalWords,
      totalChars,
    };
  }

  return {
    calculateWpm,
    calculateRawWpm,
    calculateAccuracy,
    buildResultSummary,
    summarizeHistory,
  };
})();
