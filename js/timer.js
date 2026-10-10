/**
 * timer.js
 * ---------------------------------------------------------------------------
 * Simple countdown timer. It does NOT start itself — the app calls
 * `TestTimer.arm(durationSeconds, callbacks)` when a new test loads, then
 * `TestTimer.start()` the moment the user's first keystroke lands, so the
 * clock only ever runs while the user is actually typing.
 */

const TestTimer = (function () {
  let durationSeconds = 30;
  let remainingMs = 30000;
  let startedAtMs = null;
  let intervalId = null;
  let running = false;
  let callbacks = {};

  function arm(seconds, cbs) {
    stop();
    durationSeconds = Math.max(1, Math.floor(seconds));
    remainingMs = durationSeconds * 1000;
    startedAtMs = null;
    running = false;
    callbacks = cbs || {};
  }

  function tick() {
    if (!running) return;
    const elapsed = Date.now() - startedAtMs;
    const remaining = Math.max(0, durationSeconds * 1000 - elapsed);
    remainingMs = remaining;

    if (typeof callbacks.onTick === 'function') {
      callbacks.onTick(getElapsedSeconds(), getRemainingSeconds());
    }

    if (remaining <= 0) {
      stop();
      if (typeof callbacks.onEnd === 'function') callbacks.onEnd();
    }
  }

  function start() {
    if (running || startedAtMs !== null) return; // already started/ended for this test
    startedAtMs = Date.now();
    running = true;
    intervalId = window.setInterval(tick, 250); // finer than 1s so the UI feels responsive
  }

  function stop() {
    running = false;
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function getElapsedSeconds() {
    if (startedAtMs === null) return 0;
    const elapsedMs = running ? Date.now() - startedAtMs : (durationSeconds * 1000 - remainingMs);
    return Math.min(durationSeconds, elapsedMs / 1000);
  }

  function getRemainingSeconds() {
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  function getDurationSeconds() {
    return durationSeconds;
  }

  function isRunning() { return running; }
  function hasStarted() { return startedAtMs !== null; }

  return { arm, start, stop, getElapsedSeconds, getRemainingSeconds, getDurationSeconds, isRunning, hasStarted };
})();
