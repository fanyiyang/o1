// A/V: PeerJS mesh audio + optional video (opt-in; video shows by day only),
// plus network-adaptive video resolution.
import { $, G, nameOf } from './state.js?v=10';
import { t } from './i18n.js?v=10';

let localStream = null;
let audioWanted = false; // mic toggle
let videoWanted = false; // camera toggle
let mediaReady = false; // incoming-call answerer set up (re-armed per peer in teardownNet)
const mediaConns = {}; // peerId -> active MediaConnection (one per peer)
const remoteCells = {}; // peerId ('__me' for self) -> { wrap, v }

// Destroy any existing peer before a new connect attempt and re-arm per-peer
// state (the incoming-call answerer), so a retry/reconnect rebinds cleanly and
// doesn't leak the old peer. Bump runtime.netGen FIRST (callers do) so the dying
// peer's callbacks see a stale generation and no-op.
export function teardownNet() {
  if (G.net) { try { G.net.destroy(); } catch (e) {} }
  mediaReady = false;
}

export function toggleMic() { audioWanted = !audioWanted; refreshMedia(); }
export function toggleCam() {
  videoWanted = !videoWanted;
  if (videoWanted) audioWanted = true; // opening the camera turns the mic on too
  refreshMedia();
}

const videoPhaseOk = () => !['role', 'night', 'traitor'].includes(G.phase); // hide video in secret phases

// kept name (called on connect): set up answering incoming calls so we receive others
export function setupVoiceAnswering() {
  if (mediaReady || !G.net || !G.net.peer) return;
  mediaReady = true;
  G.net.peer.on('call', (call) => {
    call.answer(localStream || undefined);
    attachCall(call.peer, call);
  });
}

function attachCall(id, call) {
  if (mediaConns[id] && mediaConns[id] !== call) {
    try { mediaConns[id].close(); } catch (e) {}
  }
  mediaConns[id] = call;
  call.on('stream', (s) => renderRemote(id, s));
  call.on('close', () => {
    if (mediaConns[id] === call) {
      delete mediaConns[id];
      removeRemote(id);
    }
  });
}

function callPeer(id) {
  if (!G.net || !G.net.peer || !localStream) return;
  try {
    const call = G.net.peer.call(id, localStream);
    if (call) attachCall(id, call);
  } catch (e) {
    /* ignore */
  }
}

export async function refreshMedia() {
  setupVoiceAnswering();
  if (!audioWanted && !videoWanted) {
    stopVidMonitor();
    Object.values(mediaConns).forEach((c) => { try { c.close(); } catch (e) {} });
    if (localStream) { localStream.getTracks().forEach((x) => x.stop()); localStream = null; }
    updateLocalTile();
    updateMediaButtons();
    updateMediaGrid();
    return;
  }
  if (videoWanted) vidTier = pickInitialTier(); // start at a resolution matched to the network
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioWanted,
      video: videoWanted ? tierVideoConstraints(vidTier) : false,
    });
    if (localStream) localStream.getTracks().forEach((x) => x.stop());
    localStream = stream;
  } catch (e) {
    audioWanted = false;
    videoWanted = false; // permission denied / no device — stay off
    updateMediaButtons();
    return;
  }
  applyNightMute(); // set track.enabled per current phase
  G.players.forEach((p) => { if (p.id !== G.myId) callPeer(p.id); });
  if (videoWanted) {
    applyTier(vidTier); // cap sender bitrate to the tier
    startVidMonitor(); // then auto-adjust by measured packet loss
  } else {
    stopVidMonitor();
  }
  updateLocalTile();
  updateMediaButtons();
  updateMediaGrid();
}

function renderRemote(id, stream) {
  let cell = remoteCells[id];
  if (!cell) {
    const v = document.createElement('video');
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    const wrap = document.createElement('div');
    wrap.className = 'vid-cell';
    const label = document.createElement('span');
    label.className = 'vid-name';
    label.textContent = nameOf(id);
    wrap.appendChild(v);
    wrap.appendChild(label);
    $('video-grid').appendChild(wrap);
    cell = remoteCells[id] = { wrap, v };
  }
  cell.v.srcObject = stream;
  cell.v.play().catch(() => {});
  updateMediaGrid();
}

function removeRemote(id) {
  const cell = remoteCells[id];
  if (cell) {
    cell.wrap.remove();
    delete remoteCells[id];
  }
  updateMediaGrid();
}

function updateLocalTile() {
  const grid = $('video-grid');
  if (!grid) return;
  const haveVideo = localStream && localStream.getVideoTracks().length > 0;
  let cell = remoteCells['__me'];
  if (haveVideo) {
    if (!cell) {
      const v = document.createElement('video');
      v.autoplay = true;
      v.muted = true; // avoid hearing yourself
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.style.transform = 'scaleX(-1)'; // mirror self-view
      const wrap = document.createElement('div');
      wrap.className = 'vid-cell me';
      const label = document.createElement('span');
      label.className = 'vid-name';
      label.textContent = t('selfLabel');
      wrap.appendChild(v);
      wrap.appendChild(label);
      grid.insertBefore(wrap, grid.firstChild);
      cell = remoteCells['__me'] = { wrap, v };
    }
    cell.v.srcObject = localStream;
    cell.v.play().catch(() => {});
  } else if (cell) {
    cell.wrap.remove();
    delete remoteCells['__me'];
  }
}

// applies per-phase audio mute + video hide (kept name for the renderPhase call site)
export function applyNightMute() {
  if (localStream) {
    localStream.getAudioTracks().forEach((x) => (x.enabled = G.phase !== 'night'));
    localStream.getVideoTracks().forEach((x) => (x.enabled = videoPhaseOk()));
  }
  updateMediaGrid();
}

function updateMediaGrid() {
  const grid = $('video-grid');
  const wrap = $('video-wrap');
  if (!grid || !wrap) return;
  const showVideo = videoPhaseOk();
  let anyVisible = false;
  [...grid.children].forEach((cell) => {
    const v = cell.querySelector('video');
    const hasVid = v && v.srcObject && v.srcObject.getVideoTracks().length > 0;
    const vis = showVideo && hasVid;
    cell.style.display = vis ? '' : 'none';
    if (vis) anyVisible = true;
  });
  wrap.style.display = anyVisible ? 'flex' : 'none';
}

// ---------- adaptive video resolution (by network) ----------
const VID_TIERS = [
  { w: 160, h: 120, fr: 15, br: 120000 },
  { w: 240, h: 180, fr: 20, br: 300000 },
  { w: 320, h: 240, fr: 24, br: 600000 },
  { w: 480, h: 360, fr: 24, br: 1100000 },
];
// In a mesh we upload one video stream PER peer, so total uplink ≈ br × peers.
// Bound it with a budget split across peers (keeps mobile uplinks from choking,
// which otherwise starves the data channel and drops the player).
const UPLINK_BUDGET = 700000;
let vidTier = 1; // start modest; the monitor raises it only if the link is healthy
let vidMon = null;
let healthyStreak = 0;

function pickInitialTier() {
  try {
    const c = navigator.connection;
    if (c && c.effectiveType) {
      if (c.effectiveType === '4g') return c.downlink && c.downlink >= 8 ? 2 : 1;
      return 0; // 3g / 2g / slow-2g
    }
  } catch (e) {}
  return 1;
}
const tierVideoConstraints = (i) => {
  const x = VID_TIERS[i];
  return { width: { ideal: x.w }, height: { ideal: x.h }, frameRate: { ideal: x.fr } };
};
async function applyTier(i) {
  vidTier = Math.max(0, Math.min(VID_TIERS.length - 1, i));
  const tier = VID_TIERS[vidTier];
  const peers = Math.max(1, Object.keys(mediaConns).length);
  const br = Math.min(tier.br, Math.floor(UPLINK_BUDGET / peers)); // share the uplink budget
  try {
    const vt = localStream && localStream.getVideoTracks()[0];
    if (vt) await vt.applyConstraints(tierVideoConstraints(vidTier));
  } catch (e) {}
  Object.values(mediaConns).forEach((conn) => {
    try {
      const pc = conn.peerConnection;
      if (!pc) return;
      pc.getSenders().forEach((s) => {
        if (s.track && s.track.kind === 'video') {
          const p = s.getParameters();
          if (!p.encodings || !p.encodings.length) p.encodings = [{}];
          p.encodings[0].maxBitrate = br;
          s.setParameters(p).catch(() => {});
        }
      });
    } catch (e) {}
  });
}
function startVidMonitor() {
  stopVidMonitor();
  healthyStreak = 0;
  vidMon = setInterval(monitorVid, 4000);
}
function stopVidMonitor() {
  if (vidMon) {
    clearInterval(vidMon);
    vidMon = null;
  }
}
async function monitorVid() {
  if (!localStream || localStream.getVideoTracks().length === 0) return;
  let lossSum = 0;
  let lossN = 0;
  for (const conn of Object.values(mediaConns)) {
    try {
      const pc = conn.peerConnection;
      if (!pc) continue;
      const stats = await pc.getStats();
      stats.forEach((r) => {
        if (r.type === 'remote-inbound-rtp' && (r.kind === 'video' || r.mediaType === 'video') && typeof r.fractionLost === 'number') {
          lossSum += r.fractionLost;
          lossN++;
        }
      });
    } catch (e) {}
  }
  if (!lossN) return;
  const loss = lossSum / lossN;
  if (loss > 0.1 && vidTier > 0) {
    applyTier(0); // severe loss → straight to the floor before the link drops
    healthyStreak = 0;
  } else if (loss > 0.03 && vidTier > 0) {
    applyTier(vidTier - 1); // network struggling → drop resolution
    healthyStreak = 0;
  } else if (loss < 0.02) {
    if (++healthyStreak >= 3 && vidTier < VID_TIERS.length - 1) {
      applyTier(vidTier + 1); // sustained healthy → raise
      healthyStreak = 0;
    }
  } else {
    healthyStreak = 0;
  }
}

export function updateMediaButtons() {
  const m = $('mic-btn');
  if (m) {
    const nightMuted = audioWanted && G.phase === 'night';
    m.className = 'mic-btn' + (audioWanted ? ' on' : '') + (nightMuted ? ' night' : '');
    m.textContent = !audioWanted ? '🎙️' : nightMuted ? '🌙' : '🎤';
    m.title = !audioWanted ? t('micOff') : nightMuted ? t('micNight') : t('micOn');
  }
  const c = $('cam-btn');
  if (c) {
    const camHidden = videoWanted && !videoPhaseOk();
    c.className = 'cam-btn' + (videoWanted ? ' on' : '') + (camHidden ? ' night' : '');
    c.textContent = !videoWanted ? '📷' : camHidden ? '🌙' : '🎥';
    c.title = !videoWanted ? t('camOff') : camHidden ? t('camHidden') : t('camOn');
  }
}

// video tile size — user-adjustable via −/＋ buttons, persisted across sessions
export function initVidSize() {
  let v = 120;
  try {
    const s = localStorage.getItem('vidSize');
    if (s) v = +s;
  } catch (e) {}
  const setSize = (nv) => {
    v = Math.max(90, Math.min(280, nv));
    document.documentElement.style.setProperty('--vid-size', v + 'px');
    try { localStorage.setItem('vidSize', v); } catch (e) {}
  };
  setSize(v);
  const sm = $('vid-smaller');
  const bg = $('vid-bigger');
  if (sm) sm.onclick = () => setSize(v - 30);
  if (bg) bg.onclick = () => setSize(v + 30);
}
