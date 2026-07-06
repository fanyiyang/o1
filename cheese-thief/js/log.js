// Personal event log (collapsible side panel). Entries are keyed so
// replays/resumes can't duplicate them.
import { $, G, DICE_FACES } from './state.js?v=10';
import { t } from './i18n.js?v=10';

let loggedKeys = new Set();

export function logOnce(key, text) {
  if (loggedKeys.has(key)) return;
  loggedKeys.add(key);
  G.log.push(text);
  renderLog();
}

export function resetLog() {
  G.log = [];
  loggedKeys = new Set();
  renderLog();
}

// On each night you open your eyes: one line with co-wakers + whether the cheese was there.
export function logWake(wake) {
  if (!wake) return;
  const others = (wake.coWakers || []).filter((w) => w.id !== G.myId).map((w) => w.name);
  logOnce('wake-' + wake.night, t('logWake', wake.night, others, wake.cheeseGone));
}

// The theft, seen from my seat (same keys everywhere so replays/resumes can't duplicate it).
export function logTheft(by, night) {
  if (!by) return;
  if (by.id === G.myId) logOnce('took', t('logTook'));
  else logOnce('saw-theft-' + night, t('logSawTheft', night, by.name));
}

export function logPeek(peek) {
  if (!peek) return;
  logOnce('peek', t('logPeek', peek.name, DICE_FACES[peek.die], peek.die));
}

export function renderLog() {
  const list = $('log-list');
  if (!list) return;
  list.innerHTML = G.log.length
    ? G.log.map((x) => `<div class="log-entry">${x}</div>`).join('')
    : `<div class="log-empty">${t('logEmpty')}</div>`;
  list.scrollTop = list.scrollHeight;
}
