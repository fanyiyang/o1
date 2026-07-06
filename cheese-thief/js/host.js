// Host-authoritative game flow: the host's browser deals roles + dice, runs the
// counted nights, collects votes and resolves outcomes. Clients render what the
// host sends.
//
// NIGHT PRIVACY: who wakes on night N is sent privately (via `wake`) only to the
// players awake that night, so co-wakers recognize each other. Asleep players get
// only the bare `night-tick` (an integer) and see a static all-sleeping table.
import {
  ROLES,
  dealRoles,
  rollDie,
  tallyVotes,
  distinctNights,
  wakersAt,
  resolveEliminations,
  resolveWinner,
  randomRoomCode,
  roomCodeFor,
  traitorCount,
  diceCountFor,
  peekAllowedFor,
} from './game.js?v=10';
import { createHost } from './net.js?v=10';
import { $, G, show, runtime, MIN_PLAYERS, MAX_PLAYERS, NIGHT_SECONDS, nameOf } from './state.js?v=10';
import { t } from './i18n.js?v=10';
import { playWakeChime, playSteal } from './audio.js?v=10';
import { logOnce, logWake, logTheft, resetLog } from './log.js?v=10';
import { teardownNet, setupVoiceAnswering } from './media.js?v=10';
import {
  homeMsg,
  lobbyMsg,
  renderPhase,
  renderPeekState,
  renderLobby,
  renderTable,
  renderNight,
  renderTraitor,
  renderResult,
  startCountdown,
  stopCountdown,
} from './render.js?v=10';

export function startHosting(name) {
  G.isHost = true;
  G.myName = name;
  document.body.classList.add('is-host');
  homeMsg(t('creating'));
  spawnHost(roomCodeFor(name), name, 0); // same nickname → same room code across refreshes
}

function spawnHost(code, name, attempt) {
  const gen = ++runtime.netGen;
  teardownNet();
  G.net = createHost({
    roomCode: code,
    onReady: (id) => {
      if (gen !== runtime.netGen) return; // a newer attempt superseded this peer
      G.myId = id;
      G.players = [{ id, name }];
      $('room-code').textContent = id;
      renderPeekState();
      renderLobby();
      show('screen-lobby');
      setupVoiceAnswering();
    },
    onData: (peerId, msg) => { if (gen === runtime.netGen) hostHandle(peerId, msg); },
    onDisconnect: (peerId) => {
      if (gen !== runtime.netGen) return;
      if (G.phase === 'lobby' || G.phase === 'result') {
        // trivial to rejoin here — drop immediately
        const who = nameOf(peerId);
        removePlayerState(peerId);
        G.net.broadcast({ type: 'players', list: G.players });
        renderLobby();
        if (G.phase === 'lobby') lobbyMsg(t('leftRoom', who));
        return;
      }
      // mid-game: keep their state and give them a grace window to reconnect
      const p = G.players.find((x) => x.id === peerId);
      if (p) p.disconnected = true;
      clearGrace(peerId);
      G.graceTimers[peerId] = setTimeout(() => purgePlayer(peerId), RECONNECT_GRACE_MS);
    },
    onError: (err) => {
      if (gen !== runtime.netGen) return; // stale peer (a newer attempt replaced it)
      try { G.net.destroy(); } catch (e) {}
      if (err.type === 'unavailable-id') {
        if (attempt < 2) {
          // usually our own peer from a refresh still releasing — keep the nickname code
          setTimeout(() => { if (gen === runtime.netGen) spawnHost(code, name, attempt + 1); }, 700);
        } else if (attempt < 5) {
          // genuine clash (another online host with the same nickname) — use a random code
          spawnHost(randomRoomCode(), name, attempt + 1);
        } else {
          homeMsg(t('createFailRetry'));
        }
      } else if (!G.myId) {
        // only a real creation failure before we ever opened; ignore post-open blips
        homeMsg(t('createFail', err.type || err));
      }
    },
  });
}

const RECONNECT_GRACE_MS = 45000; // how long a dropped player's seat is held open

function removePlayerState(peerId) {
  G.players = G.players.filter((p) => p.id !== peerId);
  delete G.roles[peerId];
  delete G.dice[peerId];
  delete G.wakeNights[peerId];
  delete G.votes[peerId];
}

function clearGrace(peerId) {
  if (G.graceTimers[peerId]) {
    clearTimeout(G.graceTimers[peerId]);
    delete G.graceTimers[peerId];
  }
}

// Grace expired without a reconnect — apply the real mid-game-departure rules.
function purgePlayer(peerId) {
  clearGrace(peerId);
  const wasThief = G.roles[peerId] === ROLES.THIEF;
  removePlayerState(peerId);
  G.net.broadcast({ type: 'players', list: G.players });
  if (G.phase === 'lobby' || G.phase === 'result') return renderLobby();
  if (wasThief) return abortRound(t('thiefLeft'));
  if (G.players.length < MIN_PLAYERS) return abortRound(t('tooFew'));
  if (G.phase === 'role') updateChooseGate();
  else if (G.phase === 'voting') {
    broadcastVoteProgress();
    if (!G.voteResolved && Object.keys(G.votes).length >= G.players.length) resolveVotes();
  }
}

// Reconstruct what a player should currently see on a given wake night (mirrors
// tickNight's per-player logic), or null if they're asleep / it's not night.
function wakeInfoFor(id) {
  if (G.phase !== 'night' || G.nightIntro || G.currentNight < 1) return null;
  const N = G.currentNight;
  const wakers = wakersAt(G.wakeNights, N);
  if (!wakers.includes(id)) return null;
  const wakerList = wakers.map((w) => ({ id: w, name: nameOf(w) }));
  const thiefId = wakers.find((w) => G.roles[w] === ROLES.THIEF) || null;
  const thiefLastNight = thiefId ? Math.max(...G.wakeNights[thiefId]) : null;
  let action;
  if (id === thiefId) {
    if (G.stolen && G.theftNight === N) action = 'steal';
    else if (G.stolen) action = 'stole-earlier';
    else if (N === thiefLastNight) action = 'steal-last';
    else action = 'steal-choice';
  } else {
    action = wakers.length === 1 && G.peekEnabled ? 'peek' : 'recognize';
  }
  const cheeseTakenBy = G.stolen && G.theftNight === N && thiefId ? { id: thiefId, name: nameOf(thiefId) } : null;
  return { night: N, action, coWakers: wakerList, cheeseTakenBy, cheeseGone: G.stolen };
}

// Each player's view of the traitor phase, rebuilt from host state.
function traitorViewFor(id) {
  const out = { traitorPrompt: null, traitorInfo: null, allies: null };
  const thiefId = thiefIdOf();
  // an unresolved pick may be pending mid-night (5p) or on the traitor screen (6-8p)
  if (!G.traitorDone && ['night', 'traitor'].includes(G.phase) && id === thiefId && G.traitorCandidates) {
    out.traitorPrompt = { candidates: G.traitorCandidates.map((cid) => ({ id: cid, name: nameOf(cid) })), count: G.traitorNeed };
  }
  if (G.traitorDone && G.traitors.length) {
    const knowsThief = G.players.length !== 7;
    if (G.traitors.includes(id)) {
      out.traitorInfo = { knowsThief, thiefName: knowsThief ? nameOf(thiefId) : null, fellows: G.traitors.filter((x) => x !== id).map(nameOf) };
    }
    if (id === thiefId) out.allies = G.traitors.map(nameOf);
  }
  return out;
}

// Send a returning player everything needed to land on the right screen.
function sendResume(peerId) {
  if (peerId === G.myId) return;
  const tv = traitorViewFor(peerId);
  G.net.sendTo(peerId, {
    type: 'resume',
    role: G.roles[peerId] || null,
    dice: G.dice[peerId] || null,
    peek: G.peekEnabled,
    players: G.players,
    phase: G.phase,
    currentNight: G.currentNight,
    wakeSubmitted: !!(G.wakeNights[peerId] && G.wakeNights[peerId].length),
    wakeNightsMine: G.wakeNights[peerId] || null,
    wake: wakeInfoFor(peerId),
    myPeek: G.peeks[peerId] || null, // what they already peeked (so they can't re-peek)
    voted: !!G.votes[peerId],
    traitorPrompt: tv.traitorPrompt,
    traitorInfo: tv.traitorInfo,
    allies: tv.allies,
    result: G.phase === 'result' ? G.lastResult : null,
  });
}

function hostHandle(peerId, msg) {
  if (msg.type === 'join') {
    // returning player (same persisted client id) — let them resume their seat,
    // even mid-game, and cancel any pending purge.
    const isReturning = G.roles[peerId] !== undefined || G.players.some((p) => p.id === peerId);
    if (isReturning) {
      clearGrace(peerId);
      let p = G.players.find((x) => x.id === peerId);
      if (!p) { p = { id: peerId, name: msg.name }; G.players.push(p); }
      p.name = msg.name || p.name;
      delete p.disconnected;
      G.net.broadcast({ type: 'players', list: G.players });
      sendResume(peerId);
      renderLobby();
      return;
    }
    const inPlay = ['role', 'night', 'traitor', 'day', 'voting'].includes(G.phase);
    if (inPlay || G.players.length >= MAX_PLAYERS) {
      G.net.sendTo(peerId, { type: 'rejected', reason: inPlay ? t('rejectedInPlay') : t('rejectedFull') });
      return;
    }
    if (!G.players.some((p) => p.id === peerId)) G.players.push({ id: peerId, name: msg.name });
    G.net.broadcast({ type: 'players', list: G.players });
    G.net.sendTo(peerId, { type: 'setting', peek: G.peekEnabled });
    // land them on the lobby screen even if their UI is stuck mid-game
    // (e.g. the host refreshed mid-round and this is the fresh room)
    G.net.sendTo(peerId, { type: 'lobby' });
    renderLobby();
  } else if (msg.type === 'wake-choice') {
    recordWakeChoice(peerId, msg.nights);
  } else if (msg.type === 'night-action') {
    recordNightAction(peerId, msg);
  } else if (msg.type === 'traitor-pick') {
    recordTraitorPick(peerId, msg.ids);
  } else if (msg.type === 'vote') {
    recordVote(peerId, msg.target);
  }
}

export function startGame() {
  // a fresh round only includes players currently connected
  Object.keys(G.graceTimers).forEach(clearGrace);
  G.players = G.players.filter((p) => !p.disconnected);
  const ids = G.players.map((p) => p.id);
  G.roles = dealRoles(ids);
  // official setup by player count: 4p = 2 dice each & NO peeking (variant);
  // 5-8p = 1 die each & a lone-waking sleepyhead may peek (base game)
  const diceCount = diceCountFor(ids.length);
  G.peekEnabled = peekAllowedFor(ids.length);
  G.net.broadcast({ type: 'setting', peek: G.peekEnabled });
  G.dice = {};
  ids.forEach((id) => (G.dice[id] = Array.from({ length: diceCount }, () => rollDie())));
  G.wakeNights = {};
  G.votes = {};
  G.voteResolved = false;
  G.voteSent = false;
  G.peeks = {};
  clearNightTimers();
  stopCountdown();
  G.currentNight = 0;
  G.cheeseHolder = null;
  G.stolen = false;
  G.theftNight = null;
  G.thiefHeld = false;
  G.nightIntro = false;
  G.myWake = null;
  G.myPeek = null;
  G.nightActed = false;
  G.peekSent = false;
  G.wakeSubmitted = false;
  G.traitors = [];
  G.traitorDone = false;
  G.traitorCandidates = null;
  G.traitorNeed = 0;
  G.myTraitorPrompt = null;
  G.myTraitorInfo = null;
  G.myAllies = null;
  resetLog();
  G.players.forEach((p) => {
    if (p.id === G.myId) {
      G.myRole = G.roles[p.id];
      G.myDice = G.dice[p.id];
    } else {
      G.net.sendTo(p.id, { type: 'role', role: G.roles[p.id], dice: G.dice[p.id] });
    }
  });
  setPhase('role');
}

export function setPhase(phase) {
  if (G.isHost) G.net.broadcast({ type: 'phase', phase });
  renderPhase(phase);
}

// host learns each player's chosen wake schedule before the night can begin
export function recordWakeChoice(id, nights) {
  if (G.phase !== 'role') return; // late/stray message (round aborted or already started)
  const allowed = distinctNights(G.dice[id] || []);
  const uniq = [...new Set(nights || [])].sort((a, b) => a - b);
  // thief wakes every die night; a mouse picks exactly one of its die nights
  const need = G.roles[id] === ROLES.THIEF ? allowed.length : 1;
  if (uniq.length !== need || !uniq.every((n) => allowed.includes(n))) return;
  G.wakeNights[id] = uniq;
  updateChooseGate();
}

export function updateChooseGate() {
  if (!G.isHost) return;
  const chosen = G.players.filter((p) => G.wakeNights[p.id]).length;
  const ready = G.players.length >= MIN_PLAYERS && chosen === G.players.length;
  $('btn-to-night').disabled = !ready;
  $('role-wait').textContent = ready ? t('allChosen') : t('waitingChoose', chosen, G.players.length);
}

// a player critical to the round dropped (or too few left) — void the round, back to lobby
function abortRound(text) {
  clearNightTimers();
  stopCountdown();
  G.phase = 'lobby';
  G.net.broadcast({ type: 'aborted', text });
  show('screen-lobby');
  renderLobby();
  lobbyMsg(text);
}

// ---------- HOST: counted nights ----------
function clearNightTimers() {
  (G.nightTimers || []).forEach(clearTimeout);
  G.nightTimers = [];
}

export function startNight() {
  clearNightTimers();
  G.currentNight = 0;
  G.cheeseHolder = null;
  G.stolen = false;
  G.theftNight = null;
  G.myWake = null;
  setPhase('night'); // renderPhase('night') shows the "cheese is here" reveal
  // hold the reveal a moment, then cover the cheese and begin counting
  G.nightTimers = [
    setTimeout(() => {
      G.nightIntro = false;
      tickNight();
    }, 2800),
  ];
}

function tickNight() {
  clearNightTimers();
  G.nightIntro = false;
  G.currentNight++;
  if (G.currentNight > 6) {
    afterNights();
    return;
  }
  const N = G.currentNight;
  G.net.broadcast({ type: 'night-tick', night: N });
  const wakers = wakersAt(G.wakeNights, N);
  const wakerList = wakers.map((id) => ({ id, name: nameOf(id) }));
  const thiefId = wakers.find((id) => G.roles[id] === ROLES.THIEF) || null;
  const thiefLastNight = thiefId ? Math.max(...G.wakeNights[thiefId]) : null;
  const cheeseGone = G.stolen; // taken on an earlier night

  // The thief is never forced silently: it gets a button each wake night and
  // decides which night to take the cheese (see renderNight). endNight() is the
  // only auto-steal, and only as an AFK safety net on the last chance.
  G.myWake = null;
  G.thiefHeld = false;
  G.nightActed = false;
  G.peekSent = false;
  for (const id of wakers) {
    let action;
    if (id === thiefId) {
      if (G.stolen) action = 'stole-earlier'; // already taken on an earlier night
      else if (N === thiefLastNight) action = 'steal-last'; // last chance — must take it now
      else action = 'steal-choice'; // take now, or wait for the later night
    } else {
      action = wakers.length === 1 && G.peekEnabled ? 'peek' : 'recognize';
    }
    const wake = { type: 'wake', night: N, action, coWakers: wakerList, cheeseTakenBy: null, cheeseGone };
    if (id === G.myId) G.myWake = { night: N, action, coWakers: wakerList, cheeseTakenBy: null, cheeseGone };
    else G.net.sendTo(id, wake);
  }
  startCountdown();
  if (G.myWake) playWakeChime();
  logWake(G.myWake);
  renderTable();
  renderNight();
  G.nightTimers = [setTimeout(endNight, NIGHT_SECONDS * 1000)];
}

function endNight() {
  // AFK safety net: the thief must end up with the cheese. If it never clicked
  // by its last wake night, take it now so the round stays valid.
  const thiefId = thiefIdOf();
  if (
    thiefId &&
    !G.stolen &&
    G.wakeNights[thiefId] &&
    G.currentNight === Math.max(...G.wakeNights[thiefId])
  ) {
    thiefSteal(G.currentNight);
  }
  forceAdvance();
}

// the thief chose to steal on the current night (an earlier-than-last wake night)
export function thiefSteal(N) {
  if (G.stolen) return;
  const thiefId = thiefIdOf();
  G.stolen = true;
  G.theftNight = N;
  G.cheeseHolder = thiefId;
  const by = { id: thiefId, name: nameOf(thiefId) };
  for (const id of wakersAt(G.wakeNights, N)) {
    if (id === G.myId) applyTheft(by);
    else G.net.sendTo(id, { type: 'theft', by });
  }
  maybeStartFiveTraitor(N, thiefId);
}

// Official 5p rule: the traitor forms THE NIGHT the thief is awake — a lone
// co-waker becomes the traitor instantly; several co-wakers → the thief picks
// one on the spot; nobody → no traitor this round. The nights keep counting.
function maybeStartFiveTraitor(N, thiefId) {
  if (G.players.length !== 5 || G.traitorDone || G.traitorCandidates) return;
  const cands = wakersAt(G.wakeNights, N).filter((id) => id !== thiefId);
  G.traitorNeed = 1;
  if (cands.length <= 1) return finishTraitors(cands, false); // 0 → none, 1 → auto
  G.traitorCandidates = cands;
  const prompt = { type: 'traitor-prompt', candidates: cands.map((id) => ({ id, name: nameOf(id) })), count: 1 };
  if (thiefId === G.myId) {
    G.myTraitorPrompt = { candidates: prompt.candidates, count: 1 };
    renderNight();
  } else {
    G.net.sendTo(thiefId, prompt);
  }
}

// a player awake this night learns the cheese was just taken
export function applyTheft(by) {
  if (!G.myWake) return;
  G.myWake.cheeseTakenBy = by;
  G.myWake.cheeseGone = true;
  if (by.id === G.myId) G.myWake.action = 'steal'; // show "you took it"
  logTheft(by, G.myWake.night);
  playSteal();
  renderTable();
  renderNight();
}

function forceAdvance() {
  clearNightTimers();
  tickNight();
}

function dawn() {
  clearNightTimers();
  stopCountdown();
  setPhase('day');
}

const thiefIdOf = () => Object.keys(G.roles).find((id) => G.roles[id] === ROLES.THIEF);

// after night 6: 6-8 player games recruit accomplices before dawn
// (5p traitors form during the theft night — see maybeStartFiveTraitor)
function afterNights() {
  clearNightTimers();
  stopCountdown();
  const n = G.players.length;
  if (n < 5 || G.traitorDone) return dawn();
  if (n === 5) {
    // thief never confirmed a mid-night pick (AFK) — auto-resolve now
    finishTraitors((G.traitorCandidates || []).slice(0, G.traitorNeed), true);
    return;
  }
  startTraitorPhase();
}

function startTraitorPhase() {
  const n = G.players.length;
  const count = traitorCount(n);
  const candidates = G.players.map((p) => p.id).filter((id) => G.roles[id] !== ROLES.THIEF);
  G.traitorCandidates = candidates;
  G.traitorNeed = count;
  setPhase('traitor');
  const thiefId = thiefIdOf();
  const prompt = { type: 'traitor-prompt', candidates: candidates.map((id) => ({ id, name: nameOf(id) })), count };
  if (thiefId === G.myId) {
    G.myTraitorPrompt = { candidates: prompt.candidates, count };
    renderTraitor();
  } else {
    G.net.sendTo(thiefId, prompt);
  }
  // AFK safety: auto-pick if the thief never chooses
  G.nightTimers = [
    setTimeout(() => {
      if (!G.traitorDone) finishTraitors(candidates.slice(0, count));
    }, 25000),
  ];
}

export function recordTraitorPick(peerId, ids) {
  // 5p picks arrive mid-night; 6-8p on the traitor screen. Anything else
  // (e.g. after an abort) is stray and must not resurrect the round.
  if (!['night', 'traitor'].includes(G.phase) || G.traitorDone) return;
  if (peerId !== thiefIdOf()) return; // only the thief picks
  const valid = (ids || []).filter((id) => (G.traitorCandidates || []).includes(id));
  if (valid.length !== G.traitorNeed) return;
  finishTraitors(valid, G.phase === 'traitor'); // mid-night pick must NOT jump to dawn
}

// advance=true → this resolution ends the night sequence (6-8p screen / fallback);
// advance=false → 5p mid-night resolution, the remaining nights keep counting.
function finishTraitors(ids, advance = true) {
  if (G.traitorDone) return;
  G.traitorDone = true;
  if (advance) clearNightTimers();
  // a candidate may have been purged while the thief was choosing — drop ghosts
  ids = (ids || []).filter((id) => G.players.some((p) => p.id === id));
  G.traitors = ids;
  const n = G.players.length;
  const knowsThief = n !== 7; // 7p: traitors know each other but not the thief
  const thiefId = thiefIdOf();
  ids.forEach((id) => {
    const fellows = ids.filter((x) => x !== id).map(nameOf);
    const info = { type: 'traitor-assigned', knowsThief, thiefName: knowsThief ? nameOf(thiefId) : null, fellows };
    if (id === G.myId) applyTraitorInfo(info);
    else G.net.sendTo(id, info);
  });
  if (ids.length) {
    const names = ids.map(nameOf);
    if (thiefId === G.myId) {
      G.myAllies = names;
      if (G.phase === 'night') renderNight();
    } else G.net.sendTo(thiefId, { type: 'traitor-allies', names });
  }
  if (advance) dawn();
}

export function applyTraitorInfo(info) {
  G.myTraitorInfo = { knowsThief: info.knowsThief, thiefName: info.thiefName, fellows: info.fellows || [] };
  logOnce('traitor', t('logTraitor', info.knowsThief, info.thiefName, info.fellows));
  if (G.phase === 'night') renderNight(); // 5p: recruited on the spot, mid-night
  else renderTraitor();
}

export function recordNightAction(peerId, msg) {
  if (G.phase !== 'night' || G.nightIntro) return; // late/stray action after the phase moved on
  if (msg.kind === 'steal') {
    // only the thief, on one of its wake nights, before the cheese is taken
    if (
      G.roles[peerId] === ROLES.THIEF &&
      !G.stolen &&
      (G.wakeNights[peerId] || []).includes(G.currentNight)
    ) {
      thiefSteal(G.currentNight);
    }
    return;
  }
  if (msg.kind !== 'peek') return;
  if (!G.peekEnabled) return;
  // peeking is only for THE lone waker of the current night, once per round
  const wakers = wakersAt(G.wakeNights, G.currentNight);
  if (wakers.length !== 1 || wakers[0] !== peerId) return;
  if (G.peeks[peerId]) return; // already peeked (e.g. re-sent after a reconnect)
  const target = G.players.find((p) => p.id === msg.target);
  if (!target || msg.target === peerId) return;
  const pair = G.dice[msg.target];
  if (!pair || !pair.length) return;
  const die = pair[Math.floor(Math.random() * pair.length)]; // reveal ONE random die
  G.peeks[peerId] = { target: msg.target, name: target.name, die }; // kept for resume
  if (peerId === G.myId) {
    G.myPeek = G.peeks[peerId];
    renderTable();
    renderNight();
  } else {
    G.net.sendTo(peerId, { type: 'peek-result', target: msg.target, name: target.name, die });
  }
}

export function startVoting() {
  G.votes = {};
  G.voteResolved = false;
  setPhase('voting');
  broadcastVoteProgress(); // everyone starts from 0/n
}

export function recordVote(voterId, target) {
  if (G.phase !== 'voting' || G.voteResolved) return; // ignore late/duplicate votes
  // both the voter and the target must be seated players; no self-votes
  if (!G.players.some((p) => p.id === voterId)) return;
  if (voterId === target || !G.players.some((p) => p.id === target)) return;
  G.votes[voterId] = target;
  broadcastVoteProgress();
  if (Object.keys(G.votes).length >= G.players.length) resolveVotes();
}

// everyone (not just the host) sees how many votes are in
function broadcastVoteProgress() {
  const done = Object.keys(G.votes).length;
  const total = G.players.length;
  G.net.broadcast({ type: 'vote-progress', done, total });
  if (G.phase === 'voting')
    $('vote-status').textContent = t('voteProgress', done, total) + (G.voteSent ? t('waitingOthers') : '');
}

export function resolveVotes() {
  if (G.voteResolved) return;
  G.voteResolved = true;
  const counts = tallyVotes(G.votes);
  const eliminated = resolveEliminations(counts);
  const winner = resolveWinner(eliminated, G.roles);
  const reveal = G.players.map((p) => ({
    id: p.id,
    name: p.name,
    role: G.roles[p.id],
    dice: G.dice[p.id],
    traitor: G.traitors.includes(p.id),
  }));
  const result = { type: 'result', eliminated, winner, reveal, counts };
  G.lastResult = result; // kept so a reconnecting player can be shown the outcome
  G.net.broadcast(result);
  renderResult(result);
  show('screen-result');
}
