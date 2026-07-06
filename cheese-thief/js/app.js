// Entry point: wires DOM events to the host/client/game modules.
// The heavy lifting lives in:
//   state.js  shared constants + the G state object
//   i18n.js   bilingual strings (中文 / English)
//   net.js    PeerJS wrappers (host / client)
//   host.js   host-authoritative game flow
//   client.js join / reconnect / host-message handling
//   render.js all screen rendering
//   media.js  voice + video mesh, adaptive resolution
//   audio.js  generated sound effects
//   log.js    the personal "my log" panel
import { G } from './state.js?v=10';
import { $, show } from './state.js?v=10';
import { t, getLang, setLang, applyStatic } from './i18n.js?v=10';
import { unlockAudio } from './audio.js?v=10';
import { renderLog } from './log.js?v=10';
import { toggleMic, toggleCam, initVidSize, updateMediaButtons } from './media.js?v=10';
import {
  startHosting,
  startGame,
  startNight,
  startVoting,
  resolveVotes,
  recordVote,
  updateChooseGate,
} from './host.js?v=10';
import { joinRoom, resetReconnect } from './client.js?v=10';
import {
  homeMsg,
  renderPeekState,
  renderLobby,
  renderRole,
  renderTable,
  renderNight,
  renderTraitor,
  renderDay,
  renderResult,
  confirmVoteUI,
  showRules,
  hideRules,
} from './render.js?v=10';

// ---------- HOME ----------
function readName() {
  const name = $('name-input').value.trim();
  if (!name) {
    homeMsg(t('enterNick'));
    return null;
  }
  try { localStorage.setItem('nick', name); } catch (e) {} // remember for next time
  return name;
}

// forgive sloppy code entry: lowercase, stray spaces/dashes, missing CHS- prefix
function normalizeCode(raw) {
  let s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.startsWith('CHS')) s = s.slice(3);
  return s ? 'CHS-' + s : '';
}

$('btn-create').onclick = () => {
  unlockAudio();
  const name = readName();
  if (name) startHosting(name);
};

$('btn-join').onclick = () => {
  unlockAudio();
  const name = readName();
  if (!name) return;
  const code = normalizeCode($('code-input').value);
  if (!code) return homeMsg(t('enterCode'));
  G.everConnected = false; // manual join: a bad code should fail fast, not auto-retry
  resetReconnect();
  joinRoom(code, name);
};

// Enter submits: the code field joins; the name field creates (or joins if a code is typed)
$('code-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-join').click(); });
$('name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') ($('code-input').value.trim() ? $('btn-join') : $('btn-create')).click();
});

// ---------- lobby / game controls (host) ----------
$('btn-start').onclick = () => startGame();
$('btn-to-night').onclick = () => startNight();
$('btn-to-vote').onclick = () => startVoting();
$('btn-force-resolve').onclick = () => resolveVotes();
$('btn-replay').onclick = () => startGame();

// ---------- vote ----------
$('btn-confirm-vote').onclick = () => {
  const target = confirmVoteUI(); // null if nothing selected
  if (!target) return;
  if (G.isHost) recordVote(G.myId, target);
  else G.net.send({ type: 'vote', target });
};

// ---------- rules overlay ----------
$('rules-btn').onclick = showRules;
$('rules-overlay').onclick = (e) => {
  if (e.target.id === 'rules-overlay') hideRules();
};

// ---------- language toggle ----------
// Re-render the current screen so an in-game switch updates what's visible.
// (Already-written log entries and the voting screen keep their language.)
function refreshAfterLangChange() {
  applyStatic();
  renderLog();
  renderPeekState();
  updateMediaButtons();
  if (!G.net) return; // still on the home screen — statics are enough
  if (G.phase === 'lobby') renderLobby();
  else if (G.phase === 'role') { renderRole(); updateChooseGate(); }
  else if (G.phase === 'night') { renderTable(); renderNight(); }
  else if (G.phase === 'traitor') renderTraitor();
  else if (G.phase === 'day') renderDay();
  else if (G.phase === 'result' && G.lastResult) renderResult(G.lastResult);
}
$('lang-btn').onclick = () => {
  setLang(getLang() === 'zh' ? 'en' : 'zh');
  refreshAfterLangChange();
};

// copy a join link (prefills the room code — and the custom server, if any —
// for whoever opens it)
$('btn-copy-code').onclick = () => {
  const code = $('room-code').textContent;
  if (!code) return;
  let url = location.origin + location.pathname + '?room=' + encodeURIComponent(code);
  const server = new URLSearchParams(location.search).get('server');
  if (server) url += '&server=' + encodeURIComponent(server);
  const done = () => {
    const b = $('btn-copy-code');
    b.textContent = t('copied');
    setTimeout(() => (b.textContent = t('copyLink')), 1800);
  };
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(done);
  else done();
};

// deep link: /?room=CHS-XXXX prefills the join field
const _roomParam = new URLSearchParams(location.search).get('room');
if (_roomParam) $('code-input').value = _roomParam.toUpperCase();

// remember the last nickname across refreshes
try {
  const _nick = localStorage.getItem('nick');
  if (_nick) $('name-input').value = _nick;
} catch (e) {}

// mid-game, closing/refreshing the tab is destructive (host: kills the round for
// everyone; client: a needless drop) — ask for confirmation first
window.addEventListener('beforeunload', (e) => {
  if (G.net && ['role', 'night', 'traitor', 'day', 'voting'].includes(G.phase)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ---------- side log panel ----------
$('log-toggle').onclick = () => $('log-panel').classList.toggle('open');
$('log-close').onclick = () => $('log-panel').classList.remove('open');

// ---------- A/V buttons ----------
$('mic-btn').onclick = toggleMic;
$('cam-btn').onclick = toggleCam;

// ---------- boot ----------
applyStatic(); // fill every data-i18n element for the detected language
renderLog(); // show the empty-state placeholder at load
initVidSize();
