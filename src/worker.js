// =====================================================================
//  CIVARRIA · Simulations-Threads
//  Ein Koordinator (dieser Worker) und – auf Welten mit getrennten
//  Siedlungsgebieten – bis zu 8 Regionen-Worker, die gleichzeitig rechnen.
//  Liegen alle Sippen nah beieinander, rechnet der Koordinator allein.
//  Vor diese Datei wird der Simulationskern gesetzt.
// =====================================================================
let tps = 0, acc = 0, last = performance.now(), lastState = 0, measured = 0, mTicks = 0, mT = performance.now();
let stateEvery = 350, pendingChron = [], pendingTiles = new Set(), terrDirty = true;
HOOKS.onChronicle = e => pendingChron.push(e);
HOOKS.onTile = (x, y) => pendingTiles.add(y * C.MW + x);
HOOKS.onTerritory = () => { terrDirty = true; };
const HEAVY = { t: 1, clay: 1, flint: 1, foot: 1, chron: 1, bushes: 1 };
let lastBf = 0, ROLE = 'main', SRC = null, CORES = 1, SH = null;
const LINK = 120; // Sippen näher als das gehören in dieselbe Region
function liteW() { const o = {}; for (const k in W) if (!HEAVY[k]) o[k] = W[k]; return o; }
function bushF() { const bf = new Uint8Array(W.bushes.length); for (let i = 0; i < bf.length; i++) bf[i] = W.bushes[i].gone ? 255 : Math.max(0, Math.min(254, Math.round(W.bushes[i].f))); return bf; }
function tileList() { const tiles = []; for (const i of pendingTiles) tiles.push([i, W.t[i], W.cut[i] || 0, W.path[i] || 0, W.flint[i]]); pendingTiles.clear(); return tiles; }
function sendInit() {
  pendingChron = []; pendingTiles.clear();
  postMessage({ type: 'init', W: liteW(), t: W.t, clay: W.clay, flint: W.flint, chron: W.chron, own: OWN, bushes: W.bushes.map(b => ({ id: b.id, x: b.x, y: b.y, f: b.f, max: b.max, gone: b.gone })) });
  terrDirty = false;
}
function sendState() {
  const tiles = tileList();
  let bf = null; const now = performance.now();
  if (now - lastBf > 1500) { lastBf = now; bf = bushF(); }
  postMessage({ type: 'state', W: liteW(), chron: pendingChron.splice(0), tiles, own: terrDirty ? OWN : null, tps: measured, bf, cores: 1 });
  terrDirty = false;
}
function posArrays() {
  const n = W.npcs, a = W.animals, P = new Float32Array(n.length * 3), A = new Float32Array(a.length * 3);
  for (let i = 0; i < n.length; i++) { P[i * 3] = n[i].id; P[i * 3 + 1] = n[i].x; P[i * 3 + 2] = n[i].y; }
  for (let i = 0; i < a.length; i++) { A[i * 3] = a[i].id; A[i * 3 + 1] = a[i].x; A[i * 3 + 2] = a[i].y; }
  return [P, A];
}
function sendFrame() { const [P, A] = posArrays(); postMessage({ type: 'frame', tick: W.tick, frac: acc % 1, P, A }, [P.buffer, A.buffer]); }

// ---------------------------------------------------------------- Regionen planen
// Sippen, die sich erreichen können (Handel, Besuche, Überfälle), rechnen in derselben Region.
function planShards(tribes) {
  if (CORES < 2 || !SRC) return null;
  const al = tribes.filter(T => T.alive); if (al.length < 2) return null;
  const par = new Map(al.map(T => [T.id, T.id])), find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) if (Math.hypot(al[i].cx - al[j].cx, al[i].cy - al[j].cy) < LINK) par.set(find(al[i].id), find(al[j].id));
  const cl = new Map(); for (const T of al) { const r = find(T.id); if (!cl.has(r)) cl.set(r, { ids: [], pop: 0 }); const c = cl.get(r); c.ids.push(T.id); c.pop += T.members.length + 5; }
  const clusters = [...cl.values()].sort((a, b) => b.pop - a.pop);
  if (clusters.length < 2) return null;
  const K = Math.min(CORES, clusters.length), bins = Array.from({ length: K }, () => ({ ids: new Set(), pop: 0 }));
  for (const c of clusters) { const b = bins.reduce((m, x) => x.pop < m.pop ? x : m); c.ids.forEach(id => b.ids.add(id)); b.pop += c.pop; }
  const total = bins.reduce((a, b) => a + b.pop, 0); if (Math.max(...bins.map(b => b.pop)) > total * 0.85) return null; // eine Region dominiert – lohnt nicht
  return bins.map(b => b.ids);
}
// Die vollständige Welt W in Regionen zerlegen
function splitWorld(groups) {
  const gi = new Map(); groups.forEach((g, s) => g.forEach(id => gi.set(id, s)));
  const centers = W.tribes.filter(T => gi.has(T.id)).map(T => [T.cx, T.cy, gi.get(T.id)]);
  const owner = (x, y) => { let b = 0, bd = 1e18; for (const c of centers) { const d = (c[0] - x) ** 2 + (c[1] - y) ** 2; if (d < bd) { bd = d; b = c[2]; } } return b; };
  const parts = [], bushIdx = groups.map(() => []);
  W.bushes.forEach((b, i) => bushIdx[owner(b.x, b.y)].push(i));
  const FULL = W;
  for (let s = 0; s < groups.length; s++) {
    const g = groups[s], S = Object.assign({}, FULL);
    S.npcs = FULL.npcs.filter(n => g.has(n.tribe));
    S.tribes = FULL.tribes.filter(T => g.has(T.id) || (s === 0 && !gi.has(T.id)));
    S.animals = FULL.animals.filter(a => { const o = a.tribe && gi.has(a.tribe) ? gi.get(a.tribe) : a.owner && NPC.get(a.owner) ? (gi.get(NPC.get(a.owner).tribe) ?? 0) : owner(a.x, a.y); return o === s; });
    S.bushes = bushIdx[s].map(i => FULL.bushes[i]);
    const fl = {}; for (const k in FULL.fields) if (g.has(FULL.fields[k].tr)) fl[k] = FULL.fields[k]; S.fields = fl;
    S.raids = FULL.raids.filter(r => g.has(r.from) && g.has(r.to));
    S.fires = FULL.fires.filter(f => owner(f.x, f.y) === s);
    S.graves = FULL.graves.filter(f => owner(f.x, f.y) === s);
    S.corpses = (FULL.corpses || []).filter(f => owner(f.x, f.y) === s);
    S.paintAll = (FULL.paintAll || []).filter(f => owner(f.x, f.y) === s);
    S.chron = []; S.dead = []; S.stats = [];
    S.nextId = FULL.nextId + s * 50000000;
    W = S; parts.push(serialize()); W = FULL;
  }
  return { parts, bushIdx };
}
// Regionen wieder zu einer Welt zusammenfügen (Speichern, Neuaufteilung)
function mergeDumps(strs) {
  const D = strs.map(s => JSON.parse(s)), M = Object.assign({}, D[0]);
  const cat = k => D.flatMap(d => d[k] || []);
  for (const k of ['npcs', 'tribes', 'animals', 'raids', 'fires', 'graves', 'corpses', 'paintAll']) M[k] = cat(k);
  M.bushes = cat('bushes').sort((a, b) => a.id - b.id);
  M.dead = SH.master.dead.concat(cat('dead'));
  for (const k of ['fields', 'res', 'cut', 'path', 'foot', 'beliefs', 'cults']) { M[k] = {}; for (const d of D) Object.assign(M[k], d[k] || {}); }
  M.discovered = {}; for (const d of D) for (const k in d.discovered) if (!M.discovered[k] || d.discovered[k].t < M.discovered[k].t) M.discovered[k] = d.discovered[k];
  M.nextId = Math.max(...D.map(d => d.nextId)); M.tick = Math.max(...D.map(d => d.tick));
  M.chron = SH.master.chron; M.stats = SH.master.stats;
  M.t = SH.master.t.join(''); M.flint = SH.master.flint.join('');
  const clay = SH.clay0.slice(); for (const d of D) { const c = d.clay; for (let i = 0; i < clay.length; i++) if (+c[i] !== SH.clay0[i]) clay[i] = +c[i]; } M.clay = clay.join('');
  return JSON.stringify(M);
}

// ---------------------------------------------------------------- Koordinator: Regionen starten, takten, zusammenführen
function startShards(groups) {
  const { parts, bushIdx } = splitWorld(groups);
  const url = URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' }));
  SH = { list: [], bushIdx, master: { t: W.t.slice(), flint: W.flint.slice(), chron: W.chron, dead: W.dead, stats: W.stats, meta: liteW() }, clay0: W.clay.slice(), own: [], want: 2, npcS: new Map(), triS: new Map(), year: Math.floor(W.tick / C.TPY) };
  groups.forEach((g, s) => g.forEach(id => SH.triS.set(id, s)));
  for (const n of W.npcs) SH.npcS.set(n.id, SH.triS.get(n.tribe) ?? 0);
  parts.forEach((str, s) => {
    const w = new Worker(url); w.onmessage = e => onShard(s, e.data); w.onerror = e => postMessage({ type: 'error', msg: 'Region ' + s + ': ' + e.message });
    w.postMessage({ cmd: 'shardInit', str }); SH.list.push({ w, busy: false, res: null });
  });
  W = null; // die Welt lebt jetzt in den Regionen
}
function stopShards() { if (!SH) return; for (const s of SH.list) s.w.terminate(); SH = null; }
function shardRound(now) {
  if (SH.dumping || SH.list.some(s => s.busy)) return;
  const dt = Math.min(0.25, (now - (SH.lastT || now)) / 1000); SH.lastT = now;
  acc += dt * tps; let n = Math.min(Math.floor(acc), SH.want); acc -= n; if (acc > SH.want * 3) acc = SH.want * 3;
  const lite = now - lastState > stateEvery, bf = now - lastBf > 1500;
  if (lite) lastState = now; if (bf) lastBf = now;
  SH.t0 = performance.now(); SH.n = n; SH.lite = lite;
  for (const s of SH.list) { s.busy = true; s.res = null; s.w.postMessage({ cmd: 'run', n, lite, bf }); }
}
function onShard(s, m) {
  if (!SH) return;
  if (m.type === 'reply' || m.type === 'error') { postMessage(m); return; }
  if (m.type === 'dump') { SH.dumps[s] = m.str; if (SH.dumps.filter(Boolean).length === SH.list.length) { const str = mergeDumps(SH.dumps), done = SH.onDump; SH.dumping = false; SH.dumps = null; done(str); } return; }
  if (m.type !== 'ran') return;
  const sh = SH.list[s]; sh.busy = false; sh.res = m;
  if (SH.list.some(x => x.busy)) return;
  // alle Regionen sind fertig: Bild und Zustand zusammensetzen
  const R = SH.list.map(x => x.res), ms = performance.now() - SH.t0;
  if (SH.n > 0) { SH.want = clamp(Math.round(SH.n * 22 / Math.max(1, ms)), 1, 400); mTicks += SH.n; }
  const tick = R[0].tick, nP = R.reduce((a, r) => a + r.P.length, 0), nA = R.reduce((a, r) => a + r.A.length, 0);
  const P = new Float32Array(nP), A = new Float32Array(nA); let o = 0, q = 0; for (const r of R) { P.set(r.P, o); o += r.P.length; A.set(r.A, q); q += r.A.length; }
  postMessage({ type: 'frame', tick, frac: acc % 1, P, A }, [P.buffer, A.buffer]);
  for (const r of R) { for (const e of r.chron) { SH.master.chron.push(e); pendingChron.push(e); } for (const t of r.tiles) { SH.master.t[t[0]] = t[1]; SH.master.flint[t[0]] = t[4]; pendingTiles.add(t); } }
  if (SH.master.chron.length > 6000) SH.master.chron.splice(0, 1000);
  let ownDirty = false; R.forEach((r, i) => { if (r.own) { SH.own[i] = r.own; ownDirty = true; } });
  if (SH.lite) postMergedState(R, ownDirty); else if (ownDirty) SH.ownPending = true;
  // einmal im Spieljahr prüfen, ob die Aufteilung noch passt
  const y = Math.floor(tick / C.TPY); if (y !== SH.year) { SH.year = y; if (SH.lastLite) checkRegions(); }
}
function postMergedState(R, ownDirty) {
  const L = R.map(r => r.lite), M = Object.assign({}, SH.master.meta, L[0]);
  for (const k of ['npcs', 'tribes', 'animals', 'raids', 'fires', 'graves', 'corpses', 'paintAll', 'dead']) M[k] = L.flatMap(l => l[k] || []);
  for (const k of ['fields', 'res', 'cut', 'path', 'beliefs', 'cults']) { M[k] = {}; for (const l of L) Object.assign(M[k], l[k] || {}); }
  M.discovered = {}; for (const l of L) for (const k in l.discovered) if (!M.discovered[k] || l.discovered[k].t < M.discovered[k].t) M.discovered[k] = l.discovered[k];
  // Jahresstatistik: Regionen zusammenzählen
  const ys = new Map(SH.master.stats.map(s => [s.y, s]));
  L.forEach((l, i) => { for (const s of (l.stats || [])) { const key = s.y; let m = ys.get(key); if (!m || !m._r) { m = { y: s.y, pop: 0, deer: 0, tribes: {}, know: 0, _r: {} }; ys.set(key, m); } if (!m._r[i]) { m._r[i] = 1; m.pop += s.pop; m.deer += s.deer; Object.assign(m.tribes, s.tribes); m.know = Math.max(m.know, s.know); } } });
  M.stats = [...ys.values()].sort((a, b) => a.y - b.y);
  SH.master.stats.length = 0; for (const s of M.stats) SH.master.stats.push(s);
  SH.npcS.clear(); SH.triS.clear(); L.forEach((l, s) => { for (const n of l.npcs) SH.npcS.set(n.id, s); for (const T of l.tribes) SH.triS.set(T.id, s); });
  SH.lastLite = M;
  let own = null; if ((ownDirty || SH.ownPending) && SH.own.length) { SH.ownPending = false; own = new Int32Array(SH.own.find(Boolean).length); for (const o of SH.own) if (o) for (let i = 0; i < own.length; i++) if (o[i]) own[i] = o[i]; }
  let bf = null; if (R[0].bf) { bf = new Uint8Array(SH.bushIdx.reduce((a, x) => a + x.length, 0)); R.forEach((r, s) => { const idx = SH.bushIdx[s]; for (let i = 0; i < idx.length; i++) bf[idx[i]] = r.bf[i]; }); }
  const tiles = [...pendingTiles]; pendingTiles.clear();
  postMessage({ type: 'state', W: M, chron: pendingChron.splice(0), tiles, own, tps: measured, bf, cores: SH.list.length });
}
function dumpAll(cb) { SH.dumping = true; SH.dumps = []; SH.onDump = cb; for (const s of SH.list) s.w.postMessage({ cmd: 'dump' }); }
function waitIdle(fn) { if (!SH || !SH.list.some(s => s.busy)) fn(); else setTimeout(() => waitIdle(fn), 5); }
// Kommen sich Sippen verschiedener Regionen nahe, wird die Welt neu aufgeteilt
function checkRegions() {
  const T = SH.lastLite.tribes.filter(t => t.alive);
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++)
    if (SH.triS.get(T[i].id) !== SH.triS.get(T[j].id) && Math.hypot(T[i].cx - T[j].cx, T[i].cy - T[j].cy) < LINK) { regroup(); return; }
}
function regroup() { waitIdle(() => dumpAll(str => { stopShards(); deserialize(str); decideMode(); })); }
// Allein oder in Regionen rechnen?
function decideMode() { const g = planShards(W.tribes); if (g) startShards(g); }

// ---------------------------------------------------------------- Takt
setInterval(() => {
  const now = performance.now();
  if (ROLE !== 'main') return;
  if (now - mT > 1000) { measured = mTicks * 1000 / (now - mT); mTicks = 0; mT = now; }
  if (SH) { shardRound(now); return; }
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (!W) return;
  if (tps > 0) {
    acc += dt * tps;
    const t0 = performance.now();
    while (acc >= 1) { stepWorld(); acc -= 1; mTicks++; if (performance.now() - t0 > 14) { acc = Math.min(acc, 2); break; } }
    // einmal im Jahr: lohnt sich jetzt eine Aufteilung auf mehrere Kerne?
    const y = Math.floor(W.tick / C.TPY); if (y !== W._yc) { W._yc = y; if (CORES > 1 && SRC) { const g = planShards(W.tribes); if (g) { sendState(); startShards(g); return; } } }
  }
  sendFrame();
  if (now - lastState > stateEvery) { lastState = now; const t0 = performance.now(); sendState(); const c = performance.now() - t0; stateEvery = clamp(c * 14, 350, 2500); }
}, 16);

// ---------------------------------------------------------------- Befehle
function localCmd(m) {
  switch (m.cmd) {
    case 'progress': W.progress = m.v; return;
    case 'value': { const n = NPC.get(m.id); if (n && n.pv) { n.pv[m.i] = m.v; if (m.memo) memo(n, m.memo); } return; }
    case 'trait': { const n = NPC.get(m.id); if (n) { n.tr[m.k] = m.v; if (m.memo) memo(n, m.memo); } return; }
    case 'whisper': { const n = NPC.get(m.id); return n ? whisper(n, m.kind) : false; }
    case 'whisperLeader': { const n = NPC.get(m.id); return n ? whisperLeader(n, m.kind, m.target) : 'Diese Person lebt nicht mehr.'; }
    case 'grant': { const T = TRIBE.get(m.tribe); if (T) { for (const id of T.members) { const n = NPC.get(id); if (n) for (const k of m.know) n.know[k] = 1; } updateTribeKnow(T); if (m.bld) T.bld = m.bld; if (m.mud) for (const h of T.huts) h.mud = true; } return; }
    case 'steps': for (let i = 0; i < m.n; i++) stepWorld(); return;
  }
}
self.onmessage = e => {
  const m = e.data;
  try {
    // ---- als Region
    if (m.cmd === 'shardInit') { ROLE = 'shard'; deserialize(m.str); pendingChron = []; pendingTiles.clear(); terrDirty = true; return; }
    if (ROLE === 'shard') {
      if (m.cmd === 'run') {
        for (let i = 0; i < m.n; i++) stepWorld();
        const [P, A] = posArrays(), out = { type: 'ran', tick: W.tick, P, A, chron: pendingChron.splice(0), tiles: tileList(), own: terrDirty ? OWN.slice() : null, lite: m.lite ? liteW() : null, bf: m.bf ? bushF() : null };
        terrDirty = false;
        postMessage(out, [P.buffer, A.buffer]);
      } else if (m.cmd === 'dump') postMessage({ type: 'dump', str: serialize() });
      else { const r = localCmd(m); if (m.rid !== undefined) postMessage({ type: 'reply', rid: m.rid, result: r }); }
      return;
    }
    // ---- als Koordinator
    switch (m.cmd) {
      case 'src': SRC = m.src; CORES = Math.max(1, Math.min(8, m.cores || 1)); return;
      case 'new': stopShards(); newWorld(m.seed, { pop: m.pop, tribes: m.tribes, size: m.size }); acc = 0; W._yc = 0; sendInit(); decideMode(); return;
      case 'load': stopShards(); deserialize(m.str); acc = 0; W._yc = Math.floor(W.tick / C.TPY); sendInit(); decideMode(); return;
      case 'speed': tps = m.tps; return;
      case 'save': if (SH) waitIdle(() => dumpAll(str => postMessage({ type: 'reply', rid: m.rid, result: str }))); else postMessage({ type: 'reply', rid: m.rid, result: serialize() }); return;
    }
    if (SH) { // an die zuständige Region weiterreichen
      if (m.cmd === 'progress') { for (const s of SH.list) s.w.postMessage(m); return; }
      const s = m.id !== undefined ? SH.npcS.get(m.id) : m.tribe !== undefined ? SH.triS.get(m.tribe) : 0;
      if (s === undefined) { if (m.rid !== undefined) postMessage({ type: 'reply', rid: m.rid, result: m.cmd === 'whisperLeader' ? 'Diese Person lebt nicht mehr.' : false }); return; }
      waitIdle(() => SH.list[s].w.postMessage(m));
      return;
    }
    const r = localCmd(m);
    if (m.rid !== undefined) postMessage({ type: 'reply', rid: m.rid, result: r });
    if (m.cmd === 'whisper' || m.cmd === 'whisperLeader' || m.cmd === 'grant' || m.cmd === 'steps') sendState();
  } catch (err) { postMessage({ type: 'error', msg: String(err && err.stack || err) }); }
};
