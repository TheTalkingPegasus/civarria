// =====================================================================
//  CIVARRIA · Simulations-Thread (läuft in einem eigenen Prozessorkern)
//  Vor diese Datei wird core.js gesetzt.
// =====================================================================
let tps = 0, acc = 0, last = performance.now(), lastState = 0, measured = 0, mTicks = 0, mT = performance.now();
let stateEvery = 350, pendingChron = [], pendingTiles = new Set(), terrDirty = true;
HOOKS.onChronicle = e => pendingChron.push(e);
HOOKS.onTile = (x, y) => pendingTiles.add(y * C.MW + x);
HOOKS.onTerritory = () => { terrDirty = true; };
const HEAVY = { t: 1, clay: 1, flint: 1, foot: 1, chron: 1, bushes: 1 };
let lastBf = 0;
function liteW() { const o = {}; for (const k in W) if (!HEAVY[k]) o[k] = W[k]; return o; }
function sendInit() {
  pendingChron = []; pendingTiles.clear();
  postMessage({ type: 'init', W: liteW(), t: W.t, clay: W.clay, flint: W.flint, chron: W.chron, own: OWN, bushes: W.bushes.map(b => ({ id: b.id, x: b.x, y: b.y, f: b.f, max: b.max, gone: b.gone })) });
  terrDirty = false;
}
function sendState() {
  const tiles = [];
  for (const i of pendingTiles) tiles.push([i, W.t[i], W.cut[i] || 0, W.path[i] || 0, W.flint[i]]);
  pendingTiles.clear();
  let bf = null; const now = performance.now();
  if (now - lastBf > 1500) { lastBf = now; bf = new Uint8Array(W.bushes.length); for (let i = 0; i < bf.length; i++) bf[i] = W.bushes[i].gone ? 255 : Math.max(0, Math.min(254, Math.round(W.bushes[i].f))); }
  postMessage({ type: 'state', W: liteW(), chron: pendingChron.splice(0), tiles, own: terrDirty ? OWN : null, tps: measured, bf });
  terrDirty = false;
}
function sendFrame() {
  const n = W.npcs, a = W.animals;
  const P = new Float32Array(n.length * 3), A = new Float32Array(a.length * 3);
  for (let i = 0; i < n.length; i++) { P[i * 3] = n[i].id; P[i * 3 + 1] = n[i].x; P[i * 3 + 2] = n[i].y; }
  for (let i = 0; i < a.length; i++) { A[i * 3] = a[i].id; A[i * 3 + 1] = a[i].x; A[i * 3 + 2] = a[i].y; }
  postMessage({ type: 'frame', tick: W.tick, frac: acc % 1, P, A }, [P.buffer, A.buffer]);
}
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (!W) return;
  if (tps > 0) {
    acc += dt * tps;
    const t0 = performance.now();
    while (acc >= 1) { stepWorld(); acc -= 1; mTicks++; if (performance.now() - t0 > 14) { acc = Math.min(acc, 2); break; } }
  }
  if (now - mT > 1000) { measured = mTicks * 1000 / (now - mT); mTicks = 0; mT = now; }
  sendFrame();
  if (now - lastState > stateEvery) { lastState = now; const t0 = performance.now(); sendState(); const c = performance.now() - t0; stateEvery = clamp(c * 14, 350, 2500); }
}, 16);

self.onmessage = e => {
  const m = e.data;
  try {
    switch (m.cmd) {
      case 'new': newWorld(m.seed, { pop: m.pop, tribes: m.tribes, size: m.size }); acc = 0; sendInit(); break;
      case 'load': deserialize(m.str); acc = 0; sendInit(); break;
      case 'save': postMessage({ type: 'reply', rid: m.rid, result: serialize() }); break;
      case 'speed': tps = m.tps; break;
      case 'progress': W.progress = m.v; break;
      case 'value': { const n = NPC.get(m.id); if (n && n.pv) { n.pv[m.i] = m.v; if (m.memo) memo(n, m.memo); } break; }
      case 'trait': { const n = NPC.get(m.id); if (n) { n.tr[m.k] = m.v; if (m.memo) memo(n, m.memo); } break; }
      case 'whisper': { const n = NPC.get(m.id); const r = n ? whisper(n, m.kind) : false; postMessage({ type: 'reply', rid: m.rid, result: r }); sendState(); break; }
      case 'whisperLeader': { const n = NPC.get(m.id); const r = n ? whisperLeader(n, m.kind, m.target) : 'Diese Person lebt nicht mehr.'; postMessage({ type: 'reply', rid: m.rid, result: r }); sendState(); break; }
      case 'grant': { const T = TRIBE.get(m.tribe); if (T) { for (const id of T.members) { const n = NPC.get(id); if (n) for (const k of m.know) n.know[k] = 1; } updateTribeKnow(T); if (m.bld) T.bld = m.bld; if (m.mud) for (const h of T.huts) h.mud = true; } sendState(); break; }
      case 'steps': for (let i = 0; i < m.n; i++) stepWorld(); sendState(); break;
    }
  } catch (err) { postMessage({ type: 'error', msg: String(err && err.stack || err) }); }
};
