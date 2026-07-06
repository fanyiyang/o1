// All screen rendering + the small player-action senders that the rendered
// buttons trigger. Imports host.js for the isHost==true short-circuits (the
// module cycle is fine: everything here is called after both modules load).
import { ROLES, distinctNights, traitorCount, diceCountFor } from './game.js?v=10';
import { $, G, show, MIN_PLAYERS, MAX_PLAYERS, NIGHT_SECONDS, DICE_FACES, diceText } from './state.js?v=10';
import { t } from './i18n.js?v=10';
import { unlockAudio, tone, playNightBell, playWakeChime, playTick, playVote, playWin, playLose } from './audio.js?v=10';
import { logOnce, logWake, logTheft, logPeek } from './log.js?v=10';
import { applyNightMute, updateMediaButtons } from './media.js?v=10';
import { thiefSteal, recordNightAction, recordWakeChoice, recordTraitorPick } from './host.js?v=10';

export const homeMsg = (x) => ($('home-msg').textContent = x);
export const lobbyMsg = (x) => ($('lobby-msg').textContent = x);

// day/night transition: sun↔moon morph + sky color fade (subtle, indicative)
let skyTimer = null;
export function playSky(toNight) {
  const sky = $('sky');
  if (!sky) return;
  const lbl = $('sky-label');
  if (lbl) lbl.textContent = toNight ? t('skyNight') : t('skyDay');
  sky.className = 'sky';
  void sky.offsetWidth; // reflow so the CSS animation restarts
  sky.className = 'sky show ' + (toNight ? 'to-night' : 'to-day');
  if (skyTimer) clearTimeout(skyTimer);
  // hold, then drop only 'show' so it fades out (keeps the bg during the fade)
  skyTimer = setTimeout(() => (sky.className = 'sky ' + (toNight ? 'to-night' : 'to-day')), 1900);
}

// brief dice-roll: cycle random faces, then settle on the real roll
let diceTimer = null;
export function rollDiceAnim() {
  const slot = $('dice-slot');
  if (!slot) return;
  if (diceTimer) clearInterval(diceTimer);
  slot.classList.add('dice-rolling');
  let ticks = 0;
  diceTimer = setInterval(() => {
    ticks++;
    slot.textContent = (G.myDice || [1]).map(() => DICE_FACES[1 + Math.floor(Math.random() * 6)]).join(' ');
    if (ticks >= 18) {
      clearInterval(diceTimer);
      diceTimer = null;
      slot.classList.remove('dice-rolling');
      slot.textContent = diceText(G.myDice);
    }
  }, 80);
}

export function renderPhase(phase) {
  G.phase = phase;
  applyNightMute(); // mic auto-mutes & camera auto-hides during secret phases
  updateMediaButtons();
  if (phase === 'role') {
    renderRole();
    show('screen-role');
  } else if (phase === 'night') {
    G.nightIntro = true;
    G.currentNight = 0;
    G.myWake = null;
    playSky(true);
    playNightBell();
    renderTable();
    renderNight();
    show('screen-night');
  } else if (phase === 'traitor') {
    renderTraitor();
    show('screen-traitor');
  } else if (phase === 'day') {
    playSky(false);
    renderDay();
    show('screen-day');
  } else if (phase === 'voting') {
    renderVote();
    show('screen-vote');
  }
}

// rules are keyed on player count (official) — this line tells the lobby what to expect
export function renderPeekState() {
  const s = $('peek-state');
  if (!s) return;
  const n = G.players.length;
  s.textContent = n === 4 ? t('mode4p') : n >= 5 ? t('mode5plus', n, traitorCount(n)) : t('modeGeneric');
}

// shared label for player lists: 👑 host (always players[0]) + your seat + drop status
function playerLabel(p, i) {
  return (
    (i === 0 ? '👑 ' : '') + p.name + (p.id === G.myId ? t('youSuffix') : '') + (p.disconnected ? t('dcSuffix') : '')
  );
}

export function renderLobby() {
  const ul = $('lobby-players');
  ul.innerHTML = '';
  G.players.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = playerLabel(p, i);
    if (p.disconnected) li.className = 'dc';
    ul.appendChild(li);
  });
  renderPeekState(); // the mode line follows the live player count
  if (G.isHost) {
    const n = G.players.length;
    $('btn-start').disabled = !(n >= MIN_PLAYERS && n <= MAX_PLAYERS);
    lobbyMsg(t('joinedCount', n, MIN_PLAYERS, MAX_PLAYERS));
  }
}

function roleCardHTML(role) {
  const cls = role === ROLES.THIEF ? 'thief' : 'mouse';
  const emoji = role === ROLES.THIEF ? '🧀' : '🐭';
  const name = role === ROLES.THIEF ? t('roleThief') : t('roleMouse');
  return `<div class="card ${cls}"><div class="big">${emoji}</div>
    <div class="role-name">${name}</div>
    <div class="die">${t('yourDice')}<span id="dice-slot">🎲</span></div></div>`;
}

export function renderRole() {
  $('role-card').innerHTML = roleCardHTML(G.myRole);
  rollDiceAnim();
  renderWakeChoice();
  logOnce('role', t('logRole', G.myRole === ROLES.THIEF, diceText(G.myDice)));
}

export function renderWakeChoice() {
  const box = $('wake-choice');
  box.innerHTML = '';
  const nights = distinctNights(G.myDice);

  if (G.myRole === ROLES.THIEF) {
    box.innerHTML =
      nights.length === 2
        ? `<div class="choice-info">${t('thiefTwoNights', nights[0], nights[1])}</div>`
        : `<div class="choice-info">${t('thiefOneNight', nights[0])}</div>`;
    submitWakeChoice(nights);
    return;
  }

  // sleepyhead
  if (nights.length === 1) {
    box.innerHTML = `<div class="choice-info">${t('mouseOneNight', nights[0])}</div>`;
    submitWakeChoice([nights[0]]);
    return;
  }
  if (G.wakeSubmitted) {
    box.innerHTML = `<div class="choice-info">${t('chosenNight', G.wakeNights[G.myId] ? G.wakeNights[G.myId][0] : '?')}</div>`;
    return;
  }
  box.innerHTML = `<div class="choice-info">${t('choosePrompt')}</div>`;
  const row = document.createElement('div');
  row.className = 'vote-options';
  nights.forEach((nt) => {
    const b = document.createElement('button');
    b.className = 'vote-opt';
    b.textContent = t('nightBtn', nt);
    b.onclick = () => {
      submitWakeChoice([nt]);
      renderWakeChoice();
    };
    row.appendChild(b);
  });
  box.appendChild(row);
}

export function submitWakeChoice(nights) {
  if (G.wakeSubmitted) return;
  G.wakeSubmitted = true;
  G.wakeNights[G.myId] = nights; // record locally so my own "已选" display is correct
  if (G.isHost) recordWakeChoice(G.myId, nights);
  else {
    G.net.send({ type: 'wake-choice', nights });
    $('role-wait').textContent = t('chosenWait');
  }
}

// Static seats; eyes-open + cheese-taken shown only to a fellow waker.
export function renderTable() {
  const table = $('night-table');
  [...table.querySelectorAll('.seat')].forEach((s) => s.remove());
  // The cheese sits under a cup. The cup lifts during the opening reveal, or when
  // YOU are awake tonight — then you see whether the cheese is still there or gone.
  const spot = $('cheese-spot');
  const under = $('cheese-under');
  const lifted = G.nightIntro || !!G.myWake;
  const present = G.nightIntro ? true : G.myWake ? !G.myWake.cheeseGone : true;
  if (spot) spot.classList.toggle('lifted', lifted);
  if (under) {
    under.classList.toggle('empty', !present);
    under.textContent = present ? '🧀' : '';
  }
  const awake = G.myWake ? new Set((G.myWake.coWakers || []).map((w) => w.id)) : new Set();
  const cheeseSeat = G.myWake && G.myWake.cheeseTakenBy ? G.myWake.cheeseTakenBy.id : null;
  // peek: when you're awake alone and may look, other heads become tappable
  const peekMode = !!(G.myWake && G.myWake.action === 'peek' && !G.myPeek && !G.nightActed && !G.peekSent);
  const peekedId = G.myPeek ? G.myPeek.target : null;
  const n = G.players.length;
  G.players.forEach((p, i) => {
    const angle = ((-90 + (i * 360) / n) * Math.PI) / 180;
    const left = 50 + 42 * Math.cos(angle);
    const top = 50 + 42 * Math.sin(angle);
    const isAwake = awake.has(p.id);
    const tookCheese = p.id === cheeseSeat;
    const canPeek = peekMode && p.id !== G.myId;
    const wasPeeked = peekedId && p.id === peekedId;
    const seat = document.createElement('div');
    seat.className =
      'seat' +
      (p.id === G.myId ? ' me' : '') +
      (isAwake ? ' awake' : '') +
      (tookCheese ? ' cheese' : '') +
      (canPeek ? ' peekable' : '') +
      (wasPeeked ? ' peeked' : '');
    seat.style.left = left + '%';
    seat.style.top = top + '%';
    let badge = tookCheese ? '<span class="cheese-badge">🧀</span>' : '';
    if (wasPeeked) badge += `<span class="peek-badge">🔍 ${DICE_FACES[G.myPeek.die]}${G.myPeek.die}</span>`;
    seat.innerHTML =
      `<div class="avatar">${isAwake ? '😳' : '😴'}${badge}</div>` +
      `<div class="seat-name">${p.name}${p.id === G.myId ? t('youSuffix') : ''}</div>`;
    if (canPeek) seat.onclick = () => sendPeek(p.id);
    table.appendChild(seat);
  });
}

export function startCountdown() {
  stopCountdown();
  G.countdownVal = NIGHT_SECONDS;
  playNightBell();
  renderCountdown();
  G.countdownTimer = setInterval(() => {
    G.countdownVal--;
    if (G.countdownVal >= 1 && G.countdownVal <= 3) playTick(740 + (4 - G.countdownVal) * 80);
    renderCountdown();
    if (G.countdownVal <= 0) stopCountdown();
  }, 1000);
}
export function stopCountdown() {
  if (G.countdownTimer) {
    clearInterval(G.countdownTimer);
    G.countdownTimer = null;
  }
}
function renderCountdown() {
  const el = $('night-timer');
  if (!el) return;
  el.textContent = G.countdownVal > 0 ? `⏳ ${G.countdownVal}` : '';
  el.classList.toggle('urgent', G.countdownVal > 0 && G.countdownVal <= 3);
}

function renderNightCounter() {
  $('night-counter').textContent = G.currentNight ? t('nightCounter', G.currentNight) : t('nightFalling');
  const pips = $('moon-pips');
  pips.innerHTML = '';
  for (let i = 1; i <= 6; i++) {
    const d = document.createElement('div');
    d.className = 'moon-pip' + (i <= G.currentNight ? ' filled' : '');
    pips.appendChild(d);
  }
}

function peekResultHTML(peek) {
  const single = (G.myDice || []).length === 1; // 5-8p official: everyone has one die
  const card = single ? t('peekResultOne', peek.name, DICE_FACES[peek.die], peek.die) : t('peekResult', peek.name, DICE_FACES[peek.die], peek.die);
  const hint = single ? t('peekResultHintOne', peek.die) : t('peekResultHint');
  return `<div class="peek-card">${card}</div>\n    <div class="peek-hint">${hint}</div>`;
}

export function renderNight() {
  renderNightCounter();
  renderCountdown();
  const cap = $('night-caption');
  const box = $('night-action');
  box.innerHTML = '';

  if (G.nightIntro) {
    cap.textContent = t('introCaption');
    return;
  }

  if (G.myWake) {
    const n = G.myWake.night;
    const others = (G.myWake.coWakers || []).filter((w) => w.id !== G.myId).map((w) => w.name);
    let line = others.length ? t('awakeWith', others) : t('awakeAlone');
    const tb = G.myWake.cheeseTakenBy;
    if (tb && tb.id !== G.myId) line += t('sawTheftSuffix', tb.name);
    else if (G.myWake.cheeseGone && (!tb || tb.id === G.myId) && G.myRole !== ROLES.THIEF)
      line += t('cheeseGoneSuffix');
    cap.textContent = line;
    logTheft(tb, n); // logWake already covered the wake itself
  } else {
    const mine = G.wakeNights[G.myId] || [];
    const upcoming = mine.filter((n) => n > G.currentNight);
    cap.textContent = upcoming.length ? t('sleepingUpcoming', upcoming) : t('sleepingWait');
  }

  const act = G.myWake ? G.myWake.action : null;
  if (act === 'steal') {
    box.innerHTML = `<div class="action-title">${t('youStole')}</div>
      <div class="peek-hint">${t('youStoleHint')}</div>`;
  } else if (act === 'steal-choice') {
    renderStealChoice(box);
  } else if (act === 'steal-last') {
    renderStealMust(box);
  } else if (act === 'stole-earlier') {
    box.innerHTML = `<div class="action-title">${t('stoleEarlier')}</div>`;
  } else if (act === 'peek') {
    if (G.myPeek) box.innerHTML = peekResultHTML(G.myPeek);
    else if (G.nightActed) box.innerHTML = `<div class="action-title">${t('chosePass')}</div>`;
    else if (G.peekSent) box.innerHTML = `<div class="action-title">${t('peeking')}</div>`;
    else renderPeekPrompt(box);
  } else if (act === 'recognize') {
    const alone = !(G.myWake.coWakers || []).some((w) => w.id !== G.myId);
    box.innerHTML = `<div class="action-title">${alone ? t('recognizeAlone') : t('recognize')}</div>`;
  } else if (G.myPeek) {
    box.innerHTML = peekResultHTML(G.myPeek);
  }
  if (G.myPeek) logPeek(G.myPeek);

  // 5p: the thief recruits its traitor ON the theft night, right here
  if (G.myRole === ROLES.THIEF && G.myTraitorPrompt && !G.myAllies) {
    const pickBox = document.createElement('div');
    pickBox.style.marginTop = '12px';
    renderTraitorPick(pickBox, G.myTraitorPrompt);
    box.appendChild(pickBox);
  } else if (G.myRole === ROLES.THIEF && G.myAllies && G.myAllies.length) {
    const d = document.createElement('div');
    d.className = 'peek-hint';
    d.style.marginTop = '10px';
    d.textContent = t('yourAllies', G.myAllies);
    box.appendChild(d);
  }
  // 5p: a mouse recruited on the spot sees it immediately, mid-night
  if (G.myTraitorInfo && G.myWake) {
    const d = document.createElement('div');
    d.style.marginTop = '10px';
    d.innerHTML = traitorInfoHTML();
    box.appendChild(d);
  }
}

function renderStealChoice(box) {
  if (G.thiefHeld) {
    box.innerHTML = `<div class="action-title">${t('heldTitle')}</div>`;
    return;
  }
  const later = Math.max(...distinctNights(G.myDice));
  const others = (G.myWake.coWakers || []).filter((w) => w.id !== G.myId);
  const warn = others.length ? t('warnOthers', others.length) : t('warnAlone');
  box.innerHTML = `<div class="action-title">${t('stealChoiceTitle', later)}</div><div class="peek-hint">${warn}</div>`;
  const a = document.createElement('button');
  a.className = 'btn primary tempt';
  a.textContent = t('stealNow', G.myWake.night);
  a.onclick = () => sendSteal();
  box.appendChild(a);
  const b = document.createElement('button');
  b.className = 'btn ghost';
  b.textContent = t('holdUntil', later);
  b.onclick = () => {
    G.thiefHeld = true;
    renderNight();
  };
  box.appendChild(b);
}

function renderStealMust(box) {
  box.innerHTML = `<div class="action-title">${t('lastChanceTitle')}</div>`;
  const a = document.createElement('button');
  a.className = 'btn primary tempt';
  a.textContent = t('stealBtn');
  a.onclick = () => sendSteal();
  box.appendChild(a);
  const hint = document.createElement('div');
  hint.className = 'peek-hint';
  hint.textContent = t('lastChanceHint');
  box.appendChild(hint);
}

function sendSteal() {
  unlockAudio();
  tone(880, 0, 50, 0.06); // instant tactile click (the real steal sound lands after the round-trip)
  if (G.isHost) thiefSteal(G.currentNight);
  else G.net.send({ type: 'night-action', kind: 'steal', night: G.currentNight });
}

// ---------- traitor phase (5-8 players) ----------
export function renderTraitor() {
  const body = $('traitor-body');
  if (!body) return;
  if (G.myRole === ROLES.THIEF && G.myTraitorPrompt && !G.myAllies) {
    renderTraitorPick(body, G.myTraitorPrompt);
  } else if (G.myTraitorInfo) {
    body.innerHTML = traitorInfoHTML();
  } else if (G.myRole === ROLES.THIEF && G.myAllies) {
    body.innerHTML = `<div class="action-title">${t('yourAllies', G.myAllies)}</div>`;
  } else {
    body.innerHTML = `<div class="action-title">${t('thiefPicking')}</div>`;
  }
}

function renderTraitorPick(body, prompt) {
  body.innerHTML = `<div class="action-title">${t('pickTitle', prompt.count)}</div>`;
  const picks = new Set();
  const opts = document.createElement('div');
  opts.className = 'vote-options';
  const confirm = document.createElement('button');
  confirm.className = 'btn primary';
  confirm.textContent = t('confirm');
  confirm.disabled = true;
  prompt.candidates.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'vote-opt';
    b.textContent = c.name;
    b.onclick = () => {
      if (picks.has(c.id)) {
        picks.delete(c.id);
        b.classList.remove('selected');
      } else {
        if (picks.size >= prompt.count) return;
        picks.add(c.id);
        b.classList.add('selected');
      }
      confirm.disabled = picks.size !== prompt.count;
    };
    opts.appendChild(b);
  });
  body.appendChild(opts);
  confirm.onclick = () => {
    confirm.disabled = true;
    sendTraitorPick([...picks]);
    body.querySelector('.action-title').textContent = t('pickedWait');
  };
  body.appendChild(confirm);
}

function sendTraitorPick(ids) {
  if (G.isHost) recordTraitorPick(G.myId, ids);
  else G.net.send({ type: 'traitor-pick', ids });
}

function traitorInfoHTML() {
  const info = G.myTraitorInfo;
  let s = `<div class="action-title">${t('traitorTitle')}</div>`;
  if (info.knowsThief && info.thiefName) s += `<div class="peek-hint">${t('thiefIs', info.thiefName)}</div>`;
  if (info.fellows && info.fellows.length) s += `<div class="peek-hint">${t('fellowsAre', info.fellows)}</div>`;
  if (!info.knowsThief) s += `<div class="peek-hint">${t('dontKnowThief')}</div>`;
  return s;
}

function renderPeekPrompt(box) {
  box.innerHTML = `<div class="action-title">${t('peekPrompt')}</div>`;
  const skip = document.createElement('button');
  skip.className = 'btn ghost';
  skip.textContent = t('skipPeek');
  skip.onclick = () => {
    G.nightActed = true;
    renderTable();
    renderNight();
  };
  box.appendChild(skip);
}

function sendPeek(target) {
  if (!target || G.peekSent || G.myPeek) return;
  G.peekSent = true;
  renderTable(); // drop the tappable hint right away
  if (G.isHost) recordNightAction(G.myId, { kind: 'peek', target });
  else {
    G.net.send({ type: 'night-action', kind: 'peek', target });
    renderNight();
  }
}

export function renderDay() {
  logOnce('dawn', t('logDawn'));
  const ul = $('day-players');
  ul.innerHTML = '';
  G.players.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent = playerLabel(p, i);
    if (p.disconnected) li.className = 'dc';
    ul.appendChild(li);
  });
  const note = $('day-note');
  if (note) {
    let h = `<div class="cheese-gone">${t('cheeseGoneBanner')}</div>`;
    if (G.myTraitorInfo) {
      const ti = G.myTraitorInfo;
      h += `<div class="peek-card" style="margin-bottom:8px">${t('dayTraitorCard', ti.knowsThief, ti.thiefName, ti.fellows)}</div>`;
    }
    if (G.myAllies && G.myAllies.length)
      h += `<div class="peek-card" style="margin-bottom:8px">${t('dayAlliesCard', G.myAllies)}</div>`;
    if (G.myPeek) h += `<div class="peek-hint" style="margin:0 0 6px">${t('privateClue')}</div>` + peekResultHTML(G.myPeek);
    note.innerHTML = h;
  }
  const dh = $('day-hint');
  if (dh) dh.textContent = G.isHost ? t('dayHintHost') : t('dayHintClient');
}

export function renderVote() {
  G.myVote = null;
  G.voteSent = false;
  const box = $('vote-options');
  box.innerHTML = '';
  G.players
    .filter((p) => p.id !== G.myId)
    .forEach((p) => {
      const b = document.createElement('button');
      b.className = 'vote-opt';
      b.textContent = p.name + (p.disconnected ? t('voteDcSuffix') : '');
      b.onclick = () => {
        G.myVote = p.id;
        [...box.children].forEach((c) => c.classList.toggle('selected', c === b));
        $('btn-confirm-vote').disabled = false;
      };
      box.appendChild(b);
    });
  $('btn-confirm-vote').disabled = true;
  $('vote-status').textContent = '';
}

export function confirmVoteUI() {
  if (!G.myVote) return null;
  G.voteSent = true;
  playVote();
  $('btn-confirm-vote').disabled = true;
  [...$('vote-options').children].forEach((c) => (c.disabled = true));
  if (!G.isHost) $('vote-status').textContent = t('votedWait');
  return G.myVote;
}

export function renderResult(r) {
  G.phase = 'result';
  G.lastResult = r; // kept for resume (host) and language-toggle re-render (all)
  (r.winner === 'sleepyheads' ? playWin : playLose)();
  const roleLabel = (p) => (p.role === ROLES.THIEF ? t('labelThief') : p.traitor ? t('labelTraitor') : t('labelMouse'));
  const hasTraitors = r.reveal.some((p) => p.traitor);
  const winText = r.winner === 'sleepyheads' ? t('winSleepy') : hasTraitors ? t('winThiefCamp') : t('winThief');
  const elimNames = r.eliminated.map((id) => {
    const p = r.reveal.find((x) => x.id === id);
    return p ? t('nameWithRole', p.name, roleLabel(p)) : '?';
  });
  const elimText =
    (elimNames.length > 1 ? t('tiedAllOut') : '') +
    (elimNames.length ? t('elimList', elimNames) : t('noElim'));
  logOnce('result', t('logResult', winText, elimText));
  $('result-banner').innerHTML = `<div class="winner ${r.winner}">${winText}</div><div class="elim">${elimText}</div>`;

  const tbl = $('reveal-table');
  tbl.innerHTML = `<tr><th>${t('thPlayer')}</th><th>${t('thRole')}</th><th>${t('thDice')}</th><th>${t('thVotes')}</th></tr>`;
  r.reveal.forEach((p, i) => {
    const tr = document.createElement('tr');
    if (r.eliminated.includes(p.id)) tr.className = 'eliminated';
    tr.style.animationDelay = (i + 1) * 0.1 + 's'; // stagger the identity reveal
    tr.innerHTML =
      `<td>${p.name}</td>` +
      `<td>${roleLabel(p)}</td>` +
      `<td>${diceText(p.dice)}</td>` +
      `<td>${r.counts[p.id] || 0}</td>`;
    tbl.appendChild(tr);
  });
}

// ---------- rules overlay (official rulebook, keyed on player count) ----------
function renderRules() {
  const n = G.players.length || 4;
  const four = n === 4; // 4p variant: 2 dice, no peek, no traitor
  const dice = diceCountFor(n);
  let html =
    `<h3>${t('rTitle')}</h3>` +
    `<p class="r-meta">${t('rMeta', n, four)}</p>` +
    `<p>${t('rGoal')}</p>` +
    `<p>${t('rRoles', n, dice)}</p>` +
    `<p>${t('rNight', four)}</p>` +
    `<p>${t('rThief', four)}</p>` +
    `<p>${four ? t('rNoPeek') : t('rPeek')}</p>` +
    `<p>${t('rDay')}</p>` +
    `<p>${t('rVote')}</p>`;
  if (n >= 5) {
    const tc = traitorCount(n);
    html += `<p>${t('rTraitor', n, tc)}</p><p class="r-note">${t('rTraitorNote')}</p>`;
  } else {
    html += `<p class="r-note">${t('rNoTraitor')}</p>`;
  }
  $('rules-card').innerHTML = html + `<button id="rules-close" class="btn primary">${t('gotIt')}</button>`;
  $('rules-close').onclick = hideRules;
}
export function showRules() {
  renderRules();
  $('rules-overlay').classList.add('show');
}
export function hideRules() {
  $('rules-overlay').classList.remove('show');
}
