/**
 * sound.js
 * ---------------------------------------------------------------------------
 * All audio feedback is generated with the Web Audio API — no audio files
 * are shipped or loaded. The AudioContext is created lazily on the first
 * call (browsers block audio until a user gesture has occurred, and the
 * first keystroke of a test satisfies that).
 */

const Sound = (function () {
  let ctx = null;
  let enabled = true;

  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function setEnabled(value) {
    enabled = !!value;
  }

  function tone(freq, durationMs, { type = 'sine', volume = 0.05, delayMs = 0 } = {}) {
    if (!enabled) return;
    const audioCtx = getContext();
    if (!audioCtx) return;

    const startAt = audioCtx.currentTime + delayMs / 1000;
    const stopAt = startAt + durationMs / 1000;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(stopAt + 0.02);
  }

  function keyCorrect() {
    tone(720, 35, { type: 'sine', volume: 0.035 });
  }

  function keyIncorrect() {
    tone(160, 90, { type: 'square', volume: 0.045 });
  }

  function testComplete() {
    tone(520, 110, { type: 'sine', volume: 0.05 });
    tone(660, 140, { type: 'sine', volume: 0.05, delayMs: 100 });
    tone(880, 220, { type: 'sine', volume: 0.05, delayMs: 220 });
  }

  return { setEnabled, keyCorrect, keyIncorrect, testComplete };
})();
