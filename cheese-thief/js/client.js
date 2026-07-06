// Client side: join a room, auto-reconnect after drops, and apply the host's
// messages to local state + screens.
import { createClient } from './net.js?v=10';
import { $, G, show, runtime } from './state.js?v=10';
import { t } from './i18n.js?v=10';
import { playWakeChime } from './audio.js?v=10';
import { logWake, resetLog } from './log.js?v=10';
import { teardownNet, setupVoiceAnswering, applyNightMute, updateMediaButtons } from './media.js?v=10';
import { applyTheft, applyTraitorInfo } from './host.js?v=10';
import {
  homeMsg,
  lobbyMsg,
  renderPhase,
  renderPeekState,
  renderLobby,
  renderRole,
  renderTable,
  renderNight,
  renderTraitor,
  renderDay,
  renderVote,
  renderResult,
  startCountdown,
  stopCountdown,
} from './render.js?v=10';

let reconnectTimer = null;
let reconnectTries = 0;

export function resetReconnect() {
  reconnectTries = 0;
}

// Stable per-device client id, reused as our PeerJS id so the host recognises us
// across drops/refreshes and can resume our seat. Persisted in localStorage.
function clientUid() {
  try {
    let id = localStorage.getItem('cid');
    if (!id || !/^p-/.test(id)) {
      const rnd = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      id = 'p-' + rnd;
      localStorage.setItem('cid', id);
    }
    return id;
  } catch (e) {
    return 'p-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

export function joinRoom(code, name) {
  const gen = ++runtime.netGen;
  teardownNet(); // a re-join destroys the previous peer (no leak) and re-arms media
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  G.isHost = false;
  G.myName = name;
  G.roomCode = code;
  homeMsg(t('connecting'));
  G.net = createClient({
    roomCode: code,
    peerId: clientUid(), // stable id → host can resume our seat across drops/refreshes
    onConnected: (myId) => {
      if (gen !== runtime.netGen) return;
      G.myId = myId;
      G.everConnected = true;
      reconnectTries = 0;
      reconnectBanner(false);
      G.net.send({ type: 'join', name });
      $('room-code').textContent = code;
      lobbyMsg(t('connectedWait'));
      // stay put if we're mid-game; a 'resume' message will route us correctly
      if (G.phase === 'lobby') show('screen-lobby');
      setupVoiceAnswering();
    },
    onData: (msg) => { if (gen === runtime.netGen) clientHandle(msg); },
    onDisconnect: () => {
      if (gen !== runtime.netGen) return;
      scheduleReconnect(); // mobile background / network blip → come back automatically
    },
    onError: (err) => {
      if (gen !== runtime.netGen) return;
      if (!G.everConnected) {
        // never got in — most likely a wrong/closed room code
        homeMsg(t('connectFail', err.type || err));
        show('screen-home');
      } else {
        scheduleReconnect();
      }
    },
  });
}

// Reconnect to the same room (same persisted id) after a drop. Bounded retries.
function scheduleReconnect() {
  if (G.isHost || !G.roomCode || reconnectTimer) return;
  if (reconnectTries > 20) {
    reconnectTries = 0;
    reconnectBanner(false);
    homeMsg(t('disconnectedRejoin', G.roomCode));
    show('screen-home');
    return;
  }
  reconnectTries++;
  reconnectBanner(true);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    joinRoom(G.roomCode, G.myName);
  }, 1500);
}

let _reconnectBannerEl = null;
function reconnectBanner(on) {
  if (!_reconnectBannerEl) {
    _reconnectBannerEl = document.createElement('div');
    _reconnectBannerEl.className = 'reconnect-banner';
    document.body.appendChild(_reconnectBannerEl);
  }
  _reconnectBannerEl.textContent = t('reconnecting');
  _reconnectBannerEl.style.display = on ? 'block' : 'none';
}

// Mobile: when the app returns to the foreground, reconnect right away if dropped.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (G.isHost || !G.roomCode || !G.everConnected) return;
  if (G.net && G.net.connected && G.net.connected()) return;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  joinRoom(G.roomCode, G.myName);
});

function clientHandle(msg) {
  switch (msg.type) {
    case 'resume': {
      // host re-seated us after a reconnect — restore state and land on the right screen
      G.myRole = msg.role;
      G.myDice = msg.dice;
      G.peekEnabled = msg.peek;
      if (msg.players) G.players = msg.players;
      G.wakeSubmitted = !!msg.wakeSubmitted;
      G.wakeNights = {};
      if (msg.wakeNightsMine) G.wakeNights[G.myId] = msg.wakeNightsMine;
      G.myPeek = msg.myPeek || null; // restore a peek made before the drop
      G.myTraitorPrompt = msg.traitorPrompt || null;
      G.myTraitorInfo = msg.traitorInfo || null;
      G.myAllies = msg.allies || null;
      reconnectBanner(false);
      renderPeekState();
      const ph = msg.phase;
      G.phase = ph;
      applyNightMute();
      updateMediaButtons();
      if (ph === 'role') { renderRole(); show('screen-role'); }
      else if (ph === 'night') {
        G.nightIntro = false;
        G.currentNight = msg.currentNight || 0;
        G.myWake = msg.wake || null;
        G.nightActed = false;
        G.peekSent = false;
        G.thiefHeld = false;
        logWake(G.myWake);
        startCountdown();
        renderTable();
        renderNight();
        show('screen-night');
      } else if (ph === 'traitor') { renderTraitor(); show('screen-traitor'); }
      else if (ph === 'day') { renderDay(); show('screen-day'); }
      else if (ph === 'voting') {
        renderVote();
        if (msg.voted) {
          G.voteSent = true;
          [...$('vote-options').children].forEach((c) => (c.disabled = true));
          $('vote-status').textContent = t('votedWait');
        }
        show('screen-vote');
      } else if (ph === 'result' && msg.result) { renderResult(msg.result); show('screen-result'); }
      else { show('screen-lobby'); }
      break;
    }
    case 'players':
      G.players = msg.list;
      renderLobby();
      break;
    case 'lobby':
      // seated as a FRESH player in a (possibly restarted) lobby — drop stale round state
      G.phase = 'lobby';
      G.myRole = null;
      G.myDice = null;
      G.myWake = null;
      G.myPeek = null;
      G.myVote = null;
      G.voteSent = false;
      G.wakeSubmitted = false;
      G.currentNight = 0;
      G.nightIntro = false;
      G.myTraitorPrompt = null;
      G.myTraitorInfo = null;
      G.myAllies = null;
      stopCountdown();
      applyNightMute();
      updateMediaButtons();
      show('screen-lobby');
      lobbyMsg(t('connectedWait'));
      break;
    case 'setting':
      G.peekEnabled = msg.peek;
      renderPeekState();
      break;
    case 'role':
      // a fresh 'role' means a new round — clear last round's per-game state
      // (the host resets the same fields in startGame; clients must too)
      G.myRole = msg.role;
      G.myDice = msg.dice;
      G.wakeSubmitted = false;
      G.wakeNights = {};
      G.myWake = null;
      G.myPeek = null;
      G.myVote = null;
      G.voteSent = false;
      G.nightActed = false;
      G.peekSent = false;
      G.thiefHeld = false;
      G.currentNight = 0;
      G.nightIntro = false;
      G.myTraitorPrompt = null;
      G.myTraitorInfo = null;
      G.myAllies = null;
      resetLog();
      break;
    case 'phase':
      renderPhase(msg.phase);
      break;
    case 'night-tick':
      G.currentNight = msg.night;
      G.nightIntro = false;
      G.myWake = null;
      G.nightActed = false;
      G.peekSent = false;
      G.thiefHeld = false;
      startCountdown();
      renderTable();
      renderNight();
      break;
    case 'wake':
      G.myWake = {
        night: msg.night,
        action: msg.action,
        coWakers: msg.coWakers || [],
        cheeseTakenBy: msg.cheeseTakenBy || null,
        cheeseGone: !!msg.cheeseGone,
      };
      G.nightActed = false;
      G.peekSent = false;
      G.thiefHeld = false;
      playWakeChime();
      logWake(G.myWake);
      renderTable();
      renderNight();
      break;
    case 'theft':
      applyTheft(msg.by);
      break;
    case 'peek-result':
      G.myPeek = { target: msg.target, name: msg.name, die: msg.die };
      renderTable();
      renderNight();
      break;
    case 'traitor-prompt':
      G.myTraitorPrompt = { candidates: msg.candidates, count: msg.count };
      if (G.phase === 'night') renderNight(); // 5p: pick happens during the theft night
      else renderTraitor();
      break;
    case 'traitor-assigned':
      applyTraitorInfo(msg);
      break;
    case 'traitor-allies':
      G.myAllies = msg.names;
      break;
    case 'vote-progress':
      if (G.phase === 'voting')
        $('vote-status').textContent = t('voteProgress', msg.done, msg.total) + (G.voteSent ? t('waitingOthers') : '');
      break;
    case 'result':
      G.players = msg.reveal.map((r) => ({ id: r.id, name: r.name }));
      renderResult(msg);
      show('screen-result');
      break;
    case 'aborted':
      G.phase = 'lobby';
      G.myWake = null;
      G.nightIntro = false;
      stopCountdown();
      show('screen-lobby');
      lobbyMsg(msg.text || t('abortedDefault'));
      break;
    case 'rejected':
      homeMsg(msg.reason || t('cannotJoin'));
      show('screen-home');
      break;
  }
}
