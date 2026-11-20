// =====================================================================
//  DÖRFER, DIE BLEIBEN
//  Verlassene Häuser verschwinden nicht: Sie stehen leer, verfallen über
//  Jahrzehnte zu Ruinen und zeigen, wo einst eine Sippe lebte. Neue Siedler
//  und Eroberer ziehen in alte Häuser ein und richten sie wieder her.
//  Dazu: Haupthaus, Straßen, Fackeln.
// =====================================================================
Object.assign(TECH, {
  fackeln:   { cat: 'handwerk', name: 'Fackeln', icon: '🔥', req: ['feuer_machen'], D: 1600, ctx: { firework: 0.6, coldcamp: 0.2, experiment: 0.3, war: 0.4 }, desc: 'Ein Ast, umwickelt und mit Harz getränkt, brennt lange: Licht für Nachtwege, Wachen und Kriegszüge.', eff: 'Fackeln bei Nacht, Wölfe halten Abstand' },
  wegebau:   { cat: 'wasser', name: 'Wege & Straßen', icon: '🛤', req: ['huette'], D: 6500, ctx: { carry: 1, build: 0.4, crowd: 0.4 }, cond: T => tPop(T, 25), condTxt: 'mind. 25 Menschen', desc: 'Festgestampfte, aufgeschüttete Erde zwischen den Häusern – später Kies und Pflaster. Auf Straßen geht man schneller.', eff: 'Straßen im Dorf: schneller unterwegs' },
  haupthaus: { cat: 'ordnung', name: 'Haupthaus', icon: '🏛', req: ['huette'], D: 5500, ctx: { talk: 0.5, build: 0.4, crowd: 1, trade: 0.4 }, cond: T => tPop(T, 18), condTxt: 'mind. 18 Menschen', desc: 'Ein großes Langhaus am Platz: Hier versammeln sich die Angesehenen, hier wird beraten, gerichtet und mit Fremden verhandelt.', eff: 'Ratsversammlungen, Verhandlungen im Haupthaus', build: 'hall' },
});
TECH_IDS = Object.keys(TECH);
TECH.fackeln.how = 'umwickelt einen Ast mit Bast, tränkt ihn in Harz – und trägt das Feuer in die Nacht';
TECH.wegebau.how = 'schüttet Erde in die Gassen und stampft sie fest, damit man nicht im Schlamm versinkt';
TECH.haupthaus.how = 'schlägt vor, ein großes Haus für alle Versammlungen zu bauen';
TECH.fackeln.see = 'Fackeln in der Hand bei Nacht, an Toren und am Platz';
TECH.wegebau.see = 'Straßen aus festgestampfter Erde, später Kies und Pflaster';
TECH.haupthaus.see = 'Ein Langhaus am Platz mit langer Tafel und Ehrenplatz';
BUILD_NEED.hall = 10; BUILD_NAME.hall = 'ihr Haupthaus';

// ---------------------------------------------------------------- Häuser: im Raster, aber jedes etwas anders
function lotHouse(P) {
  const h1 = hash3(P.i * 31 + P.j, P.x0, P.y0), h2 = hash3(P.y0, P.i, P.x0 + 7);
  const hh = h1 < 0.38 ? 3 : 4, dy = hh === 3 && h2 < 0.5 ? 1 : 0;
  return { lx: P.x0, ly: P.y0 + dy, w: 4, h: hh };
}

// ---------------------------------------------------------------- Verlassene Dörfer
function abandonTown(T, why) {
  if (T.ghosted || !T.town) return;
  T.ghosted = 1;
  if (!T.huts.length && !T.storehouse && !(T.bld && T.bld.hall)) return;
  const town = Object.assign({}, T.town); delete town.wall; delete town.reach; delete town.rect;
  (W.ghosts || (W.ghosts = [])).push({ id: T.id, name: T.name, col: T.col, t: W.tick, why: why || 'leer', cx: T.cx, cy: T.cy, town, huts: T.huts.map(h => Object.assign({}, h)), store: T.storehouse, bld: T.bld ? Object.assign({}, T.bld) : null, pal: T.pal || 0, penR: T.penR });
  if (W.ghosts.length > 220) W.ghosts.shift();
  W.ghostVer = (W.ghostVer || 0) + 1;
}
const ghostAge = G => (W.tick - G.t) / C.TPY;
// Wie verfallen ist ein Haus? 0 = leer, 1 = baufällig, 2 = Ruine
function decayOf(h, G) { const y = ghostAge(G) / (h.stone ? 2.5 : h.mud ? 1.6 : 1); return y < 6 ? 0 : y < 22 ? 1 : 2; }
function ghostsNear(x, y, r) { return (W.ghosts || []).filter(G => Math.abs(G.cx - x) < r && Math.abs(G.cy - y) < r && dist(G.cx, G.cy, x, y) < r); }
// Neue Sippe zieht in die alten Häuser: Lage, Parzellen und Häuser werden übernommen
function adoptGhost(T, G, how) {
  const i = W.ghosts.indexOf(G); if (i < 0) return false;
  if (T.town && !T.ghosted && (T.huts.length || T.storehouse)) abandonTown(T, 'fort');
  W.ghosts.splice(i, 1); W.ghostVer = (W.ghostVer || 0) + 1;
  T.cx = G.town.cx + 0.5; T.cy = G.town.cy + 0.5;
  T.town = Object.assign({}, G.town, { lots: {} });
  T.huts = []; let ruins = 0, fix = 0;
  T.town.lots = Object.assign({}, G.town.lots);
  for (const h of G.huts) {
    const d = decayOf(h, G), P = T.town.lots[h.lot];
    if (d >= 2 && P) { P.kind = 'bau'; P.prog = 3; P.stone = h.stone; P.mud = h.mud; ruins++; continue; } // nur noch Boden und Mauerreste: neu aufbauen
    T.huts.push(Object.assign(h, { worn: d >= 1 ? W.tick : 0, furn: d >= 1 ? Math.min(h.furn ?? 7, 2) : h.furn })); if (d >= 1) fix++;
  }
  if (G.store && ghostAge(G) < 15) T.storehouse = G.store;
  if (G.bld) { T.bld = Object.assign({}, G.bld); if (ghostAge(G) > 30) for (const k in T.bld) if (k !== 'hall' && k !== 'temple' && k !== 'wall') T.bld[k] = 0; }
  T.pal = ghostAge(G) < 12 ? Math.round(G.pal * 0.6) : 0;
  T.townVer = (T.townVer || 0) + 1; W.hutVer = (W.hutVer || 0) + 1; T.ghosted = 0;
  const yrs = Math.round(ghostAge(G));
  chron(3, how === 'conquer' ? `Die ${T.name} nehmen das Dorf der unterworfenen ${G.name} in Besitz.`
    : `Die ${T.name} ziehen in die verlassenen Häuser der ${G.name}${yrs > 1 ? `, die vor ${yrs} Jahren hier lebten` : ''}.${fix ? ` ${fix} Häuser müssen ausgebessert werden` : ''}${ruins ? `${fix ? ',' : ''} ${ruins} Ruinen werden wieder aufgebaut` : ''}.`, { tribe: T.id });
  return true;
}
// einmal am Tag: ausgestorbene oder fortgezogene Sippen hinterlassen ihr Dorf
function villageDaily() {
  for (const T of W.tribes) if (!T.alive && !T.ghosted && T.town) abandonTown(T, 'tot');
  for (const T of W.tribes) if (T.alive) {
    for (const h of T.huts) {
      // Häuser nutzen sich ab und werden ausgebessert – nur wer sie lange verkommen lässt, verliert sie
      if (!h.worn && rnd() < 0.0008 * (h.stone ? 0.3 : h.mud ? 0.5 : 1)) h.worn = W.tick;
      if (h.worn && W.tick - h.worn > C.TPY * 2) { const P = T.town && T.town.lots[h.lot]; T.huts.splice(T.huts.indexOf(h), 1); if (P) { P.kind = 'bau'; P.prog = 3; P.stone = h.stone; P.mud = h.mud; } W.hutVer = (W.hutVer || 0) + 1; chron(1, `Ein Haus der ${T.name} ist eingestürzt – niemand hat es ausgebessert.`, { tribe: T.id }); break; }
    }
    if (TK(T, 'wegebau') && T.town && (T.roadT || 0) < W.tick - C.TPD * 10) planRoads(T);
  }
}

// ---------------------------------------------------------------- Straßen
// Zuerst die Gassen vor den Haustüren und am Platz, dann die übrigen Gassen; festgestampfte Erde, später Kies, dann Pflaster
function roadLevel(T) { return TK(T, 'stadtplanung') || TK(T, 'lehmziegel') && TK(T, 'steinbau') ? 3 : TK(T, 'steinbau') ? 2 : 1; }
function planRoads(T) {
  T.roadT = W.tick;
  const O = T.town, lv = roadLevel(T), out = [], seen = new Set(), R = W.road || (W.road = {});
  const add = (x, y, pr) => { const k = y * C.MW + x; if (seen.has(k)) return; seen.add(k); if ((R[k] || 0) >= lv) return; const t = W.t[k]; if (t < T_SHORE || t === T_MOUNT || W.fields[k] || houseAt(x, y) || wallAt(x, y)) return; out.push([k, pr]); };
  for (const key in O.lots) {
    const L = O.lots[key]; if (key !== L.i + ',' + L.j || L.kind === 'bau' && !L.prog) continue;
    const [x0, y0] = lotXY(O, L.i, L.j), w = (L.wl || 1) * LOT - 1, h = (L.hl || 1) * LOT - 1;
    if (L.kind === 'plaza') { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) add(x, y, 0); continue; }
    for (let x = x0 - 1; x <= x0 + w; x++) add(x, y0 + h, dist(x, y0 + h, O.cx, O.cy)); // Gasse vor der Tür
    for (let y = y0 - 1; y <= y0 + h; y++) { add(x0 - 1, y, 30 + dist(x0, y, O.cx, O.cy)); add(x0 + w, y, 30 + dist(x0, y, O.cx, O.cy)); }
    for (let x = x0 - 1; x <= x0 + w; x++) add(x, y0 - 1, 40 + dist(x, y0, O.cx, O.cy));
  }
  for (const g of (T.town && (T.pal || T.bld?.wall) ? townWall(T).gates : [])) add(g[0] | 0, g[1] | 0, 20);
  out.sort((a, b) => a[1] - b[1]);
  T.roadQ = out.slice(0, 200).map(o => o[0]);
}
function stepRoad(n, T, a) {
  const R = W.road || (W.road = {}), lv = roadLevel(T);
  if (a.stage === 0) {
    while (T.roadQ && T.roadQ.length && (R[T.roadQ[0]] || 0) >= lv) T.roadQ.shift();
    if (!T.roadQ || !T.roadQ.length) { n.act = null; return; }
    a.k = T.roadQ.shift(); a.tx = (a.k % C.MW) + 0.5; a.ty = ((a.k / C.MW) | 0) + 0.5; a.stage = 1; a.t = 0; a.n = 0; return;
  }
  if (a.stage === 1) { if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.5) { a.stage = 2; a.t = 0; } else if (++a.t > 200) n.act = null; return; }
  a.wk = 1;
  if (++a.t < (lv === 1 ? 6 : 9)) return;
  if (lv >= 2) { if (T.store.stone < 1) { a.wk = 0; n.act = null; return; } T.store.stone -= 1; }
  R[a.k] = lv; W.roadVer = (W.roadVer || 0) + 1; if (HOOKS.onRoad) HOOKS.onRoad(a.k);
  if (!T.roads) { T.roads = 1; chron(2, `Die ${T.name} legen die erste Straße an – aus festgestampfter Erde.`, { tribe: T.id, npc: n.id }); }
  if (++a.n >= 4) { a.wk = 0; n.act = null; return; }
  a.stage = 0;
}
// Straßen sind schneller und werden bevorzugt
const roadAt = i => (W.road && W.road[i]) || 0;

// ---------------------------------------------------------------- Haupthaus
// ein Langhaus über zwei Parzellen am Platz – es wird einmal gebaut und bleibt; mit neuem Wissen wird es nur ausgebessert
function hallOf(T) {
  if (!T.town || !((T.bld?.hall || 0) > 0)) return null;
  const O = T.town; const P = Object.values(O.lots).find(L => L.kind === 'hall'); if (!P) return null;
  return { lx: P.x0, ly: P.y0, w: P.w, h: P.h, x: P.cx, y: P.cy, lot: P.i + ',' + P.j, hall: 1, done: (T.bld.hall || 0) >= BUILD_NEED.hall };
}
function hallDone(T) { return T.town && (T.bld?.hall || 0) >= BUILD_NEED.hall; }
function hallSeat(T, i) { const H = hallOf(T); if (!H) return null; const k = i % 8; return [H.lx + 1.5 + (k % 4) * 1.8, H.ly + 1.3 + Math.floor(k / 4) * 1.6]; }
// Ratsversammlung: die Angesehenen sitzen im Haupthaus beisammen
function stepCouncil(n, T, a) {
  if (!hallDone(T)) { n.act = null; return; }
  if (a.stage === 0) { const s = hallSeat(T, n.id); a.tx = s[0]; a.ty = s[1]; if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.6) { a.stage = 1; a.t = 0; } else if (++a.t > 250) n.act = null; return; }
  a.t++; n.social = Math.min(100, n.social + 1);
  if (a.t % 4 === 0) { const H = hallOf(T); for (const id of T.members) { const m = NPC.get(id); if (m && m !== n && m.act && m.act.type === 'council' && m.act.stage === 1) { talk(n, m); break; } } }
  if (a.t > 22) { n.prestige += 0.3; n.act = null; }
}

// ---------------------------------------------------------------- Fackeln
// Wer trägt eine Fackel? Nachts unterwegs, auf Wache, im Kampf – wenn die Sippe Fackeln kennt
function torchOf(n) {
  const a = n.act; if (!a) return false;
  const T = tribeOf(n); if (!T || !TK(T, 'fackeln') || ageY(n) < 12) return false;
  const h = hourNow(); if (!(h >= 19.5 || h < 6)) return false;
  if (a.type === 'sleep' || a.type === 'down' || a.type === 'hide' || a.type === 'rest' || a.type === 'council') return false;
  return a.type === 'raid' || a.type === 'defend' || a.type === 'watch' || a.type === 'return' || a.type === 'bury' || (n.x !== n.px || n.y !== n.py) && !houseAt(n.x, n.y);
}

// ---------------------------------------------------------------- Eroberte Dörfer bleiben bewohnt
// Ein Statthalter der Sieger bleibt mit einigen Kriegern im eroberten Dorf – die Unterworfenen leben weiter in ihren Häusern
function holdConquered(T, E, rest, raiders) {
  const pool = raiders.filter(m => m.alive !== false && m.tribe === T.id && m.id !== T.leader && ageY(m) >= 18 && fitToFight(m)).sort((a, b) => (b.tr.ehrgeiz + b.prestige / 50) - (a.tr.ehrgeiz + a.prestige / 50));
  const L2 = pool[0]; if (!L2) return null;
  const N = makeTribe(E.cx, E.cy, T);
  const crew = [L2, ...pool.slice(1, 1 + Math.min(4, Math.floor(pool.length / 3)))];
  for (const m of crew) { const i = T.members.indexOf(m.id); if (i >= 0) T.members.splice(i, 1); N.members.push(m.id); m.tribe = N.id; m.act = null; memo(m, `bleibt im eroberten Dorf der ${E.name}`); }
  moveMembers(rest, E, N, `lebt nun unter ${L2.name}, dem Statthalter der ${T.name}`);
  N.town = E.town; N.huts = E.huts; N.storehouse = E.storehouse; N.bld = E.bld; N.pal = E.pal; N.penR = E.penR; N.pen = E.pen; N.traps = E.traps || [];
  N.store.food = Math.round(T.store.food * 0.15); T.store.food -= N.store.food;
  E.town = null; E.huts = []; E.ghosted = 1; E.storehouse = null;
  N.leader = L2.id; L2.notable = true; L2.prestige += 20;
  N.cv = memberMean(N); N.rules = (T.rules || []).map(r => ({ ...r })); N.gov = bestGov(N).key; N.govSince = W.tick; initCulture(N);
  N.vassalOf = T.id; N.rel[T.id] = 70; T.rel[N.id] = 70; N.treaties.push({ with: T.id, kind: 'buendnis', t: W.tick }); T.treaties.push({ with: N.id, kind: 'buendnis', t: W.tick });
  for (const k in T.rel) if (+k !== N.id) { N.rel[k] = Math.round(T.rel[k] * 0.6); const X = TRIBE.get(+k); if (X) X.rel[N.id] = N.rel[k]; }
  N.fire.lit = true; N.fire.fuel = 40; N.townVer = (E.townVer || 0) + 1; W.hutVer = (W.hutVer || 0) + 1;
  chron(3, `${fullName(L2)} bleibt als Statthalter der ${T.name} im eroberten Dorf. Die unterworfenen ${E.name} leben weiter in ihren Häusern – nun als ${N.name}, den ${T.name} untertan.`, { tribe: N.id, npc: L2.id });
  return N;
}
