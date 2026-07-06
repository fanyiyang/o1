// Generated sound effects (WebAudio, unlocked on first user gesture).

let audioCtx = null;

export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {
    /* audio optional */
  }
}

export function tone(freq, startOffset, durMs, gain) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + startOffset;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export const playNightBell = () => { unlockAudio(); tone(392, 0, 500, 0.08); tone(294, 0.12, 600, 0.07); };
export const playWakeChime = () => { unlockAudio(); tone(659, 0, 250, 0.09); tone(880, 0.13, 350, 0.08); };
export const playTick = (freq = 740) => tone(freq, 0, 90, 0.05);
export const playSteal = () => { unlockAudio(); tone(660, 0, 80, 0.09); tone(440, 0.06, 120, 0.08); tone(220, 0.14, 220, 0.07); };
export const playVote = () => { unlockAudio(); tone(523, 0, 90, 0.07); tone(784, 0.05, 150, 0.08); };
export const playWin = () => { unlockAudio(); tone(523, 0, 160, 0.08); tone(659, 0.12, 160, 0.08); tone(784, 0.24, 320, 0.09); };
export const playLose = () => { unlockAudio(); tone(440, 0, 150, 0.08); tone(415, 0.14, 170, 0.08); tone(311, 0.3, 380, 0.09); };
