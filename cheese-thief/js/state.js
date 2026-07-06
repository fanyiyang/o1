// Shared constants + the single mutable game-state object G.
// Every module imports from here; keep this file dependency-free.

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;
export const NIGHT_SECONDS = 10;
export const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const $ = (id) => document.getElementById(id);
export const screens = [...document.querySelectorAll('.screen')];
export const show = (id) => screens.forEach((s) => s.classList.toggle('active', s.id === id));

export const G = {
  isHost: false,
  net: null,
  myId: null,
  myName: '',
  myRole: null,
  myDice: null, // [a, b]
  myVote: null,
  voteSent: false, // local: my vote has been confirmed & sent
  peekEnabled: true, // toggle set by host in the lobby
  phase: 'lobby', // lobby | role | night | day | voting | result (host gates joins on this)
  roomCode: null, // client: code we joined (kept for auto-reconnect)
  everConnected: false, // client: have we connected at least once this session
  // host-authoritative state:
  players: [], // [{id, name, disconnected?}]
  graceTimers: {}, // host: id -> timeout that purges a dropped player if they don't return
  lastResult: null, // last round's result payload (host: for resume; all: for re-render)
  roles: {}, // id -> role
  dice: {}, // id -> [a, b]
  wakeNights: {}, // id -> [nights]  (built from each player's choice)
  wakeSubmitted: false, // local: have I submitted my wake choice
  votes: {}, // voterId -> targetId
  voteResolved: false, // host: guard so late/duplicate votes can't re-resolve
  peeks: {}, // host: peekerId -> {target, name, die} (kept so a resume can't re-peek)
  // night state:
  currentNight: 0,
  cheeseHolder: null,
  stolen: false, // host: has the thief taken the cheese yet
  theftNight: null, // host: the night it was taken
  thiefHeld: false, // local (thief): chose to wait this night
  nightIntro: false, // showing the "cheese is here" reveal before counting starts
  nightTimers: [],
  countdownTimer: null,
  countdownVal: 0,
  myWake: null, // {night, action, coWakers:[{id,name}], cheeseTakenBy, cheeseGone}
  myPeek: null, // {target, name, die}
  nightActed: false, // chose to skip (装睡)
  peekSent: false, // tapped a head, waiting for the result
  log: [], // this player's personal event log for the round
  // traitors (5-8 players):
  traitors: [], // host: traitor ids
  traitorDone: false, // host: traitor phase resolved
  traitorCandidates: null, // host: ids the thief may pick from
  traitorNeed: 0, // host: how many to pick
  myTraitorPrompt: null, // thief client: {candidates, count}
  myTraitorInfo: null, // a traitor: {knowsThief, thiefName, fellows}
  myAllies: null, // thief: names of its traitors
};

// bumped each connect attempt; stale peers' callbacks no-op if behind
export const runtime = { netGen: 0 };

export const nameOf = (id) => { const p = G.players.find((x) => x.id === id); return p ? p.name : '?'; };
export const diceText = (dice) => (dice || []).map((d) => `${DICE_FACES[d]} ${d}`).join(' · ');
