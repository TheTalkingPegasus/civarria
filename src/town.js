// =====================================================================
//  SIEDLUNGEN IM RASTER
//  Jede Sippe legt ihr Lager auf dem Kachelraster an: ein Platz mit dem
//  Feuer in der Mitte, ringsum Parzellen (4×4 Kacheln, dazwischen Gassen).
//  Häuser, Vorratshaus, Gehege, Werkhof und Tempel bekommen Parzellen,
//  Palisade und Mauer umschließen das Ganze als Rechteck mit Toren.
// =====================================================================
const LOT = 5, LOTW = 4; // Raster: 4 Kacheln Bau + 1 Kachel Gasse
const LOT_KIND = { house: 'Wohnhaus', store: 'Vorratshaus', pen: 'Gehege', werk: 'Werkhof', temple: 'Tempel', plaza: 'Platz' };
function townOrigin(T) { if (!T.town || T.town.cx !== (T.cx | 0) || T.town.cy !== (T.cy | 0)) T.town = { cx: T.cx | 0, cy: T.cy | 0, lots: {} }; return T.town; }
const lotXY = (O, i, j) => [O.cx - 2 + i * LOT, O.cy - 2 + j * LOT]; // linke obere Kachel
// Was ist vom Platz aus trockenen Fußes erreichbar? (Parzellen nur dort, sonst stehen Häuser jenseits des Bachs)
function townReach(T, O) {
  if (O.reach && O.reachV === (W.hutVer || 0) + ':' + (T.townVer || 0)) return O.reach;
  const seen = new Set(), q = [O.cy * C.MW + O.cx]; seen.add(q[0]);
  while (q.length) { const i = q.pop(), x = i % C.MW, y = (i / C.MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (Math.abs(X - O.cx) > 40 || Math.abs(Y - O.cy) > 40 || X < 0 || Y < 0 || X >= C.MW || Y >= C.MH) continue; const j = Y * C.MW + X; if (seen.has(j) || W.t[j] < T_SHORE) continue; const h = houseAt(X, Y); if (h && !(X === h.lx + 2 && Y === h.ly + h.h - 1)) continue; seen.add(j); q.push(j); } }
  O.reach = seen; O.reachV = (W.hutVer || 0) + ':' + (T.townVer || 0); return seen;
}
function lotOK(T, O, i, j) {
  const [x0, y0] = lotXY(O, i, j);
  const RE = townReach(T, O); if (!RE.has((y0 + LOTW) * C.MW + x0 + 2)) return false; // die Tür muss vom Platz aus erreichbar sein
  for (let y = y0; y < y0 + LOTW; y++) for (let x = x0; x < x0 + LOTW; x++) {
    if (x < 2 || y < 2 || x >= C.MW - 2 || y >= C.MH - 2) return false;
    const k = y * C.MW + x, t = W.t[k];
    if (t < T_SHORE || t === T_MOUNT || W.fields[k]) return false;
    if (OWN && OWN[k] && OWN[k] !== T.id) return false;
  }
  return true;
}
// freie Parzelle(n) suchen – von innen nach außen, Ring für Ring
function allocLot(T, kind, wl = 1, hl = 1) {
  const O = townOrigin(T);
  if (!O.lots['0,0']) O.lots['0,0'] = { kind: 'plaza' };
  for (let r = 1; r <= 6; r++) {
    const cand = [];
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (Math.max(Math.abs(i), Math.abs(j)) === r || (wl > 1 || hl > 1)) cand.push([i, j]);
    cand.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])) || hash3(T.id, a[0], a[1]) - hash3(T.id, b[0], b[1]));
    for (const [i, j] of cand) {
      let ok = true;
      for (let b = 0; b < hl && ok; b++) for (let a = 0; a < wl && ok; a++) { const key = (i + a) + ',' + (j + b); if (O.lots[key] || !lotOK(T, O, i + a, j + b)) ok = false; }
      if (!ok) continue;
      const P = { kind, i, j, wl, hl }; for (let b = 0; b < hl; b++) for (let a = 0; a < wl; a++) O.lots[(i + a) + ',' + (j + b)] = P;
      const [x0, y0] = lotXY(O, i, j); P.x0 = x0; P.y0 = y0; P.w = wl * LOT - 1; P.h = hl * LOT - 1;
      P.cx = x0 + P.w / 2; P.cy = y0 + P.h / 2;
      // Bauplatz roden – auch Beerensträucher verschwinden
      for (const bu of bushesNear(P.cx, P.cy, 4)) if (bu.x >= x0 && bu.x < x0 + P.w && bu.y >= y0 && bu.y < y0 + P.h) { bu.gone = 1; bu.f = 0; bu.max = 0; }
      for (const id of T.members) { const m = NPC.get(id); if (m && m.spots.length) m.spots = m.spots.filter(s => !s.b.gone); }
      for (let y = y0; y < y0 + P.h; y++) for (let x = x0; x < x0 + P.w; x++) { const k = y * C.MW + x; if (W.t[k] === T_FOREST) { W.t[k] = T_GRASS; W.cut[k] = 'f'; if (HOOKS.onTile) HOOKS.onTile(x, y); } }
      T.townVer = (T.townVer || 0) + 1; if (!W.hutVer) W.hutVer = 1;
      return P;
    }
  }
  return null;
}
function freeLot(T, P) { const O = T.town; if (!O || !P) return; for (const k in O.lots) if (O.lots[k] === P) delete O.lots[k]; W.hutVer = (W.hutVer || 0) + 1; }
const hash3 = (a, b, c) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// Ein Haus auf einer Parzelle: Tür nach Süden (zur Gasse), Betten an den Wänden
function houseFromLot(P, base) {
  const h = Object.assign(base || {}, { lx: P.x0, ly: P.y0, w: P.w, h: P.h, x: P.cx, y: P.cy, lot: P.i + ',' + P.j, rot: 0 });
  return h;
}
const bedsOf = h => [[h.lx + 0.62, h.ly + 1.45], [h.lx + h.w - 0.62, h.ly + 1.45], [h.lx + 0.62, h.ly + 2.85], [h.lx + h.w - 0.62, h.ly + 2.85], [h.lx + 1.0, h.ly + 3.45], [h.lx + h.w - 0.62, h.ly + 3.55]];
const doorOut = h => [h.lx + 2.5, h.ly + h.h + 0.45], doorIn = h => [h.lx + 2.5, h.ly + h.h - 0.55];
// Wände: hinein und hinaus nur durch die Tür (Kachel lx+2 in der unteren Reihe)
function houseOK(e, x, y) {
  const hq = houseAt(x, y), hp = houseAt(e.x, e.y);
  if (hq === hp) return true;
  const door = h => (x | 0) === h.lx + 2 || (e.x | 0) === h.lx + 2;
  if (hq && !hp) return door(hq) && (y | 0) === hq.ly + hq.h - 1 && e.y >= hq.ly + hq.h - 0.2;
  if (hp && !hq) return door(hp) && (e.y | 0) === hp.ly + hp.h - 1 && y >= hp.ly + hp.h - 0.2;
  return false;
}
// Wo liegt welches Haus? (für Tür-Wege und Wärme)
let HMAP = null, HMAPV = -1, HLIST = [];
function houseAt(x, y) {
  if (HMAPV !== (W.hutVer || 0) || !HMAP || HMAP.length !== C.MW * C.MH) {
    HMAPV = W.hutVer || 0; if (!HMAP || HMAP.length !== C.MW * C.MH) HMAP = new Int32Array(C.MW * C.MH); else HMAP.fill(0); HLIST = [null];
    for (const T of W.tribes) if (T.alive) for (const h of (T.storehouse && T.storehouse.lx !== undefined ? [...T.huts, T.storehouse] : T.huts)) if (h.lx !== undefined) { const id = HLIST.length; HLIST.push(h); for (let yy = h.ly; yy < h.ly + h.h; yy++) for (let xx = h.lx; xx < h.lx + h.w; xx++) if (xx >= 0 && yy >= 0 && xx < C.MW && yy < C.MH) HMAP[yy * C.MW + xx] = id; }
  }
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= C.MW || y >= C.MH) return undefined;
  const id = HMAP[y * C.MW + x]; return id ? HLIST[id] : undefined;
}
// ---------------------------------------------------------------- Laufen in der Siedlung
// Häuser betritt und verlässt man nur durch die Tür, Palisade und Mauer nur durch die Tore.
// Ist der gerade Weg verstellt, sucht A* einen Weg über das Kachelraster.
let WMAP = null, WMAPV = '';
let WMAPT = -1;
function wallAt(x, y) {
  if (WMAPT !== W.tick) { WMAPT = W.tick; const v = (W.hutVer || 0) + ':' + W.tribes.reduce((a, T) => a + (T.alive && T.town ? (T.pal || 0) + (T.bld?.wall || 0) * 100 + (T.townVer || 0) * 7 : 0), 0);
  if (v !== WMAPV) { WMAPV = v; WMAP = new Set(); for (const T of W.tribes) { if (!T.alive || !T.town) continue; const isW = (T.bld?.wall || 0) > 0, prog = isW ? T.bld.wall / BUILD_NEED.wall : (T.pal || 0) / 24; if (prog <= 0) continue; const R = townRect(T), per = townPerimeter(R), n = Math.round(per.length * Math.min(1, prog)); for (let k = 0; k < n; k++) WMAP.add(per[k][1] * C.MW + per[k][0]); } } }
  return WMAP.has((y | 0) * C.MW + (x | 0));
}
// darf man von Kachel (ax,ay) nach (bx,by)?
function stepOK(e, ax, ay, bx, by) {
  const t = tileAt(bx, by); if (t === T_DEEP) return false;
  if (t === T_SHALLOW && !(e.know && e.know.floss) && tileAt(ax, ay) !== T_SHALLOW) return false;
  if (wallAt(bx, by) && !wallAt(ax, ay)) return false;
  const hq = houseAt(bx, by), hp = houseAt(ax, ay);
  if (hq === hp) return true;
  if (hq && !hp) return (bx | 0) === hq.lx + 2 && (by | 0) === hq.ly + hq.h - 1 && (ay | 0) === hq.ly + hq.h;
  if (hp && !hq) return (ax | 0) === hp.lx + 2 && (ay | 0) === hp.ly + hp.h - 1 && (by | 0) === hp.ly + hp.h;
  return false;
}
function lineClear(e, tx, ty) {
  const d = dist(e.x, e.y, tx, ty), n = Math.ceil(d / 0.4); let px = e.x | 0, py = e.y | 0;
  for (let k = 1; k <= n; k++) { const x = (e.x + (tx - e.x) * k / n) | 0, y = (e.y + (ty - e.y) * k / n) | 0; if (x === px && y === py) continue;
    if (x !== px && y !== py) { if (!(stepOK(e, px, py, x, py) && stepOK(e, x, py, x, y)) && !(stepOK(e, px, py, px, y) && stepOK(e, px, y, x, y))) return false; }
    else if (!stepOK(e, px, py, x, y)) return false;
    px = x; py = y; }
  return true;
}
const AS_MAX = 9000, AS_G = new Float32Array(AS_MAX), AS_FROM = new Int32Array(AS_MAX), AS_STAMP = new Int32Array(AS_MAX), AS_HK = new Float32Array(AS_MAX * 4), AS_HV = new Int32Array(AS_MAX * 4); let AS_GEN = 0;
function aStar(e, tx, ty) {
  const sx = e.x | 0, sy = e.y | 0, gx = tx | 0, gy = ty | 0;
  const x0 = Math.min(sx, gx) - 8, y0 = Math.min(sy, gy) - 8, w = Math.abs(sx - gx) + 17, h = Math.abs(sy - gy) + 17, N = w * h;
  if (N > AS_MAX) return null;
  const gen = ++AS_GEN, g = AS_G, from = AS_FROM, st = AS_STAMP, hk = AS_HK, hv = AS_HV; let hn = 0;
  const G = i => st[i] === gen ? g[i] : 1e9;
  const push = (v, k) => { let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v; };
  const pop = () => { const v = hv[0], lk = hk[--hn], lv = hv[hn]; let i = 0; while (true) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = lk; hv[i] = lv; return v; };
  const s = (sy - y0) * w + (sx - x0), goal = (gy - y0) * w + (gx - x0); st[s] = gen; g[s] = 0; from[s] = -1; push(s, 0); let it = 0;
  while (hn > 0 && it++ < 2500) {
    const c = pop(); if (c === goal) { const pts = []; let q = c; while (q >= 0 && q !== s) { pts.push([(q % w) + x0 + 0.5, ((q / w) | 0) + y0 + 0.5]); q = from[q]; } return pts.reverse(); }
    const x = (c % w) + x0, y = ((c / w) | 0) + y0, gc = g[c];
    for (let d = 0; d < 4; d++) { const X = x + (d === 0 ? 1 : d === 1 ? -1 : 0), Y = y + (d === 2 ? 1 : d === 3 ? -1 : 0); if (X < x0 || Y < y0 || X >= x0 + w || Y >= y0 + h) continue;
      const j = (Y - y0) * w + (X - x0), ng = gc + (W.path[Y * C.MW + X] ? 0.7 : 1); if (ng >= G(j) || hn >= AS_MAX * 4 - 1 || !stepOK(e, x, y, X, Y)) continue; st[j] = gen; g[j] = ng; from[j] = c; push(j, ng + 1.2 * (Math.abs(X - gx) + Math.abs(Y - gy))); }
  }
  return null;
}
function navMove(e, tx, ty, speed) {
  if (e.ghost > 0) { e.ghost--; return moveStep(e, tx, ty, speed); }
  let N = e.nav;
  if (N && N.clear && N.tx === tx && N.ty === ty && W.tick < N.until) return moveStep(e, tx, ty, speed);
  if (N && !N.clear && (Math.abs(N.tx - tx) > 0.01 || Math.abs(N.ty - ty) > 0.01) && Math.abs(N.tx - tx) + Math.abs(N.ty - ty) < 1.5 && houseAt(tx, ty) === houseAt(N.tx, N.ty)) { N.tx = tx; N.ty = ty; } // Ziel hat sich nur ein wenig bewegt
  if (!N || N.clear || Math.abs(N.tx - tx) > 0.01 || Math.abs(N.ty - ty) > 0.01) {
    if (lineClear(e, tx, ty)) { e.nav = { clear: 1, tx, ty, until: W.tick + 10 }; return moveStep(e, tx, ty, speed); }
    if (e.act && (e.act.type === 'social' || e.act.type === 'play')) return moveStep(e, tx, ty, speed); // Plaudern: kein Umweg-Planen
    const pts = aStar(e, tx, ty);
    if (!pts) { e.ghost = 40; e.nav = null; return moveStep(e, tx, ty, speed); }
    N = e.nav = { tx, ty, v: WMAPV + '|' + (W.hutVer || 0), pts, i: 0, f: 0 };
  }
  while (N.i < N.pts.length && dist(e.x, e.y, N.pts[N.i][0], N.pts[N.i][1]) < 0.3) N.i++;
  if (N.i >= N.pts.length - 1 && lineClear(e, tx, ty)) { const r = moveStep(e, tx, ty, speed); if (r) e.nav = null; return r; }
  const p = N.pts[Math.min(N.i, N.pts.length - 1)], ox = e.x, oy = e.y;
  moveStep(e, p[0], p[1], speed);
  if (e.x === ox && e.y === oy && ++N.f > 12) { e.ghost = 40; e.nav = null; }
  return false;
}
function routeTarget() { return null; }
function nearTowns(x, y) { const out = []; for (const T of W.tribes) if (T.alive && T.town && Math.abs(T.cx - x) < 26 && Math.abs(T.cy - y) < 26) out.push(T); return out; }
// Das Rechteck um alle Parzellen (+ 1 Kachel Abstand)
function townRect(T) {
  const O = T.town; if (!O) return null;
  if (O.rv === T.townVer && O.rect) return O.rect;
  let i0 = 0, i1 = 0, j0 = 0, j1 = 0; for (const k in O.lots) { const [i, j] = k.split(',').map(Number); i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); }
  i0 = Math.min(i0, -1); i1 = Math.max(i1, 1); j0 = Math.min(j0, -1); j1 = Math.max(j1, 1);
  const [x0, y0] = lotXY(O, i0, j0), [x1b, y1b] = lotXY(O, i1, j1);
  O.rect = { x0: x0 - 1, y0: y0 - 1, x1: x1b + LOTW + 1, y1: y1b + LOTW + 1 }; O.rv = T.townVer; return O.rect;
}
function townGates(R) { const mx = Math.floor((R.x0 + R.x1) / 2), my = Math.floor((R.y0 + R.y1) / 2); return [[mx, R.y0 + 0.5, 'n'], [mx, R.y1 - 0.5, 's'], [R.x0 + 0.5, my, 'w'], [R.x1 - 0.5, my, 'e']]; }
// Umfang als Liste von Kacheln (im Uhrzeigersinn), Tore ausgespart
function townPerimeter(R) {
  const t = [], mx = Math.floor((R.x0 + R.x1) / 2), my = Math.floor((R.y0 + R.y1) / 2);
  for (let x = R.x0; x < R.x1; x++) t.push([x, R.y0, 'n']);
  for (let y = R.y0 + 1; y < R.y1 - 1; y++) t.push([R.x1 - 1, y, 'e']);
  for (let x = R.x1 - 1; x >= R.x0; x--) t.push([x, R.y1 - 1, 's']);
  for (let y = R.y1 - 2; y > R.y0; y--) t.push([R.x0, y, 'w']);
  return t.filter(([x, y, s]) => !((s === 'n' || s === 's') && (x === mx || x === mx - 1)) && !((s === 'e' || s === 'w') && (y === my || y === my - 1)));
}
// alte, verstreute Hütten auf das Raster umziehen (alte Spielstände, nach dem Laden)
function ensureTown(T) {
  if (!T.alive) return;
  townOrigin(T);
  for (const h of T.huts) if (h.lx === undefined || !T.town.lots[h.lot]) { const P = allocLot(T, 'house'); if (P) houseFromLot(P, h); }
  if (T.storehouse && T.storehouse.lot === undefined) { const P = allocLot(T, 'store'); if (P) T.storehouse = { x: P.cx, y: P.cy, lot: P.i + ',' + P.j, lx: P.x0, ly: P.y0, w: P.w, h: P.h }; }
}

function inTown(T, x, y) { const R = T.town && townRect(T); return !!R && x >= R.x0 && x < R.x1 && y >= R.y0 && y < R.y1; }
// liegt der Punkt in oder nahe einer Siedlung mit Häusern oder Zaun?
function nearTownAny(x, y) { const O = HMAP_T(); for (const R of O) if (x >= R.x0 - 2 && x <= R.x1 + 2 && y >= R.y0 - 2 && y <= R.y1 + 2) return true; return false; }
let TRS = null, TRSV = -1;
function HMAP_T() { const v = W.tick; if (v !== TRSV) { TRSV = v; TRS = W.tribes.filter(T => T.alive && T.town && (T.huts.length || T.pal)).map(T => townRect(T)); } return TRS; }
