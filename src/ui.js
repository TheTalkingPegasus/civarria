// =====================================================================
//  CIVARRIA · Darstellung & Bedienung
// =====================================================================
const TS = 16; // Pixel pro Kachel
const cv = document.getElementById('view'), ctxScreen = cv.getContext('2d');
let ctx = ctxScreen; // zeigt beim Zeichnen der Welt auf die Pixelleinwand
const PIX = document.createElement('canvas'), pctx = PIX.getContext('2d'); let PIXON = false, PIXO = [0, 0, 0, 0];
const mini = document.getElementById('mini'), mctx = mini.getContext('2d');
const $ = id => document.getElementById(id);
let DPR = 1, VW = 0, VH = 0;
const cam = { x: 0, y: 0, z: 1.4, follow: 0 };
const ui = { territory: false, speed: 1, tab: 'chron', chronFilter: 3, sel: null, selTribe: null, pauseOnDiscovery: true, labels: true, lastInspect: 0, acc: 0 };
const SPEEDS = [0, 1, 3, 10, 30, 100, 500];
const TPS = 3; // Ticks pro Sekunde bei 1× (ein Tag ≈ 16 Sekunden)
let terrain = null, miniTerrain = null, nightC = null, nctx = null;

const ACT_TXT = { fetch: 'holt etwas aus dem Lager',
  sleep: 'schläft', rest: 'ruht sich aus', warm: 'wärmt sich auf', eat: 'isst', deliver: 'bringt Vorräte ins Lager', play: 'spielt',
  gather: 'sammelt Beeren und Wurzeln', hunt: 'ist auf der Jagd', fish: 'fischt', wood: 'holt Feuerholz', social: 'unterhält sich',
  defend: 'verteidigt das Lager', farm: 'arbeitet auf dem Feld', herd: 'versucht, eine Wildziege einzufangen', trap: 'legt eine Fischreuse aus', construct: 'baut', visit: 'besucht eine befreundete Sippe',
  explore: 'erkundet die Gegend', watch: 'beobachtet einen Fremden im Revier', diplo: 'reist als Gesandter', experiment: 'tüftelt herum', craft: 'stellt etwas her', build: 'baut eine Hütte', ritual: 'vollzieht ein Ritual',
  preach: 'predigt seinen Glauben', paint: 'malt an eine Felswand', heal: 'sucht Heilkräuter', lightfire: 'versucht, Feuer zu entfachen',
  fetchfire: 'holt Glut für das Lager', raid: 'zieht in den Kampf', return: 'kehrt heim', idle: 'schaut sich um',
  council: 'berät sich mit den Angesehenen im Haupthaus', road: 'legt eine Straße an', train: 'übt den Kampf', guard: 'hält Wache',
  mine: 'schlägt Kupfererz aus dem Fels', smelt: 'schmilzt Erz am Brennofen',
  hide: 'versteckt sich vor den Angreifern', down: 'liegt verwundet am Boden', bury: 'kümmert sich um einen Toten',
};
const CTX_TXT = { craft: 'Herstellen von Dingen', fishing: 'Fischen', store: 'Vorräte anlegen', winter: 'Überwintern', paint: 'Malen', trade: 'Besuch bei anderen Sippen', talk: 'Gespräch', farm: 'Feldarbeit', sheepnear: 'Mufflons in der Nähe', cattlenear: 'Auerochsen in der Nähe', pignear: 'Wildschweine in der Nähe', donkeynear: 'Wildesel in der Nähe', herd: 'Vieh hüten', woodcut: 'Holz schlagen', cook: 'Kochen und Essen', spin: 'Fäden drehen', potter: 'Töpfern', irrigate: 'Feldarbeit am Fluss', carry: 'Lasten schleppen', count: 'Vorräte zählen', sky: 'Sterne beobachten', temple: 'Rituale in der Siedlung', crowd: 'Leben in großer Gemeinschaft', theft: 'Streit um Besitz', war: 'Kampf', stone: 'Steine sammeln', hunt: 'Jagen', knap: 'Feuerstein bearbeiten', firework: 'Holz ins Feuer legen', eatfire: 'Essen am Feuer', coldhide: 'Frieren mit Fellen', gather: 'Sammeln', water: 'Arbeiten am Wasser', coldcamp: 'Frieren im Lager', wood: 'Holz schlagen', sickgather: 'Sammeln, wenn jemand krank ist', gathercamp: 'Sammeln nahe dem Lager', grief: 'Trauer um einen Toten', ritual: 'Rituale', rest: 'Gespräche am Feuer', clayfire: 'Lehm nahe am Feuer', wolfnear: 'Jagen nahe bei Wölfen', waterblock: 'Festsitzen am Fluss', build: 'Bauen', raided: 'Überfallen werden', goatnear: 'Jagen nahe bei Wildziegen' };
const CRAFT_TXT = { bogen: 'Pfeil und Bogen', faustkeil: 'ein Steinwerkzeug', speer: 'einen Speer', kleidung: 'Fellkleidung', korb: 'einen Korb', topf: 'einen Tontopf' };
const WHISPERS = [
  ['experiment', 'Herumtüfteln', 'Er/sie will ein paar Tage lang mit Dingen experimentieren.'],
  ['explore', 'Die Ferne erkunden', 'Er/sie bricht auf, um Neues zu entdecken.'],
  ['teach', 'Wissen weitergeben', 'Er/sie sucht das Gespräch und lehrt, was er/sie weiß.'],
  ['hunt', 'Jagdfieber', 'Er/sie will unbedingt jagen gehen.'],
  ['cult', 'Einen Glauben verkünden', 'Er/sie hat eine Eingebung und beginnt zu predigen.'],
  ['challenge', 'Das Oberhaupt herausfordern', 'Er/sie fordert das Oberhaupt heraus – mit ungewissem Ausgang.'],
  ['found', 'Eine eigene Sippe gründen', 'Er/sie zieht mit Familie und Freunden fort.'],
];

// ---------------------------------------------------------------- Terrain
const TCOL = { 0: [43, 79, 110], 1: [70, 116, 146], 2: [196, 182, 138], 3: [112, 143, 78], 4: [86, 120, 64], 5: [139, 132, 112], 6: [104, 100, 96] };
function hash(x, y) { let h = (x * 374761393 + y * 668265263) ^ (W.seed | 0); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// ---------------------------------------------------------------- Sprites & Texturen
const IMG = { woods: new Image(), tex: new Image() };
IMG.woods.src = ASSETS.woods; IMG.tex.src = ASSETS.tex;
const TEXI = {}; ASSETS.texNames.forEach((n, i) => TEXI[n] = i);
const texCv = {}, pattCache = {};
function texCanvas(name) { if (texCv[name]) return texCv[name]; const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').drawImage(IMG.tex, TEXI[name] * 16, 0, 16, 16, 0, 0, 16, 16); return texCv[name] = c; }
function patt(g, name) { const k = name + (g === ctx ? 'm' : 'o'); if (!pattCache[k] || pattCache[k].g !== g) pattCache[k] = { g, p: g.createPattern(texCanvas(name), 'repeat') }; return pattCache[k].p; }
function tex(g, name, x, y, w = 16, h = 16) { g.drawImage(IMG.tex, TEXI[name] * 16, 0, 16, 16, x, y, w, h); }
function spr(g, name, x, y, sc = 1) { const s = ASSETS.spr[name]; g.drawImage(IMG.woods, s[0], s[1], s[2], s[3], x, y, s[2] * sc, s[3] * sc); }
function sprC(g, name, cx, cy, sc = 1) { const s = ASSETS.spr[name]; spr(g, name, cx - s[2] * sc / 2, cy - s[3] * sc / 2, sc); }
const isWater = (x, y) => x < 0 || y < 0 || x >= C.MW || y >= C.MH || W.t[y * C.MW + x] <= T_SHALLOW;
let AVG = {};
function avgColors() {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  const avg = draw => { g.clearRect(0, 0, 16, 16); draw(g); const d = g.getImageData(0, 0, 16, 16).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } return [r / 256 | 0, gg / 256 | 0, b / 256 | 0]; };
  AVG = { 0: [20, 70, 130], 1: avg(g => spr(g, 'water', 0, 0)), 2: avg(g => tex(g, 'sand', 0, 0)), 3: avg(g => spr(g, 'grass', 0, 0)), 4: [52, 112, 40], 5: avg(g => tex(g, 'hills', 0, 0)), 6: avg(g => tex(g, 'mount', 0, 0)) };
}

// ---------------------------------------------------------------- Terrain (in Kacheln, gecacht)
const CH = 32; let chunkCache = new Map(), canopyCache = new Map(), overview = null;
// ---------------------------------------------------------------- Höhenstufen der Berge
// Je tiefer ein Felsfeld im Gebirge liegt, desto höher: 1 = Bergrand, 2 = Hang, 3 = Gipfel (mit Schnee)
let LEVEL = null, levelDirty = true, LEVEL_T = 0;
function computeLevels() {
  const N = C.MW * C.MH, d = new Int16Array(N).fill(-1), q = new Int32Array(N); let h = 0, t = 0;
  for (let i = 0; i < N; i++) if (W.t[i] !== T_MOUNT) { d[i] = 0; q[t++] = i; }
  while (h < t) { const i = q[h++], x = i % C.MW, y = (i / C.MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= C.MW || Y >= C.MH) continue; const j = Y * C.MW + X; if (d[j] < 0) { d[j] = d[i] + 1; q[t++] = j; } } }
  const L = new Uint8Array(N);
  for (let i = 0; i < N; i++) L[i] = d[i] <= 0 ? 0 : Math.min(6, 1 + ((d[i] - 1) / 3 | 0));
  if (LEVEL && chunkCache) { // nur Abschnitte neu zeichnen, deren Höhen sich geändert haben
    for (let i = 0; i < N; i++) if (L[i] !== LEVEL[i]) { const x = i % C.MW, y = (i / C.MW) | 0;
      for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) { const k = Math.floor((x + dx) / CH) + ',' + Math.floor((y + dy) / CH); chunkCache.delete(k); } }
  }
  LEVEL = L; levelDirty = false;
}
const lvAt = (x, y) => x < 0 || y < 0 || x >= C.MW || y >= C.MH ? 0 : LEVEL[y * C.MW + x];
const ROCK = [null];
for (let l = 1; l <= 6; l++) { const k = (l - 1) * 7; const c = (r, g, b) => `rgb(${r + k},${g + k},${b + k})`; ROCK.push([c(140, 132, 118), c(110, 103, 92), c(88, 82, 74), c(165, 157, 142)]); }
const SNOW = 5;
function drawRockTile(g, x, y, px, py) {
  const l = lvAt(x, y), R = ROCK[l], h = hash(x + 5, y + 9);
  tex(g, 'mount', px, py);
  g.fillStyle = `rgba(255,248,230,${0.05 * l})`; g.fillRect(px, py, TS, TS);
  if (l >= SNOW) { // Schnee auf den Gipfeln
    g.fillStyle = l > SNOW ? '#f4f7fb' : '#e6ecf3'; g.fillRect(px, py, TS, TS);
    g.fillStyle = '#cfd9e5';
    for (let k = 0; k < 4; k++) { const a = hash(x * 7 + k, y * 3 + k), b = hash(x * 3 + k, y * 7 + k * 5); g.fillRect(px + (a * 14 | 0), py + (b * 14 | 0), 2, 1); }
    if (h < 0.15) { g.fillStyle = '#8f877b'; g.fillRect(px + 5, py + 7, 3, 2); g.fillStyle = '#fff'; g.fillRect(px + 5, py + 6, 3, 1); }
  } else if (h < 0.05) sprC(g, 'rock', px + 8, py + 8); else if (h < 0.12) sprC(g, 'pebble', px + 8, py + 8);
  // Kanten: Lichtkante oben, dunkle Kanten an den Seiten zu tieferem Gelände
  const n = lvAt(x, y - 1), s = lvAt(x, y + 1), w = lvAt(x - 1, y), e = lvAt(x + 1, y);
  if (n < l) { g.fillStyle = R[3]; g.fillRect(px, py, TS, 1); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px, py + 1, TS, 1); }
  if (w < l) { g.fillStyle = 'rgba(40,30,25,.55)'; g.fillRect(px, py, 1, TS); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(px + 1, py, 1, TS); }
  if (e < l) { g.fillStyle = 'rgba(30,22,18,.6)'; g.fillRect(px + TS - 1, py, 1, TS); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px + TS - 3, py, 2, TS); }
  // Felswand nach Süden: das Plateau bricht ab
  if (s < l) {
    const fh = 11 + Math.min(2, l - s - 1) * 2; g.fillStyle = R[1]; g.fillRect(px, py + TS - fh, TS, fh);
    for (let i = 0; i < TS; i++) {
      const top = py + TS - fh - (hash(x * 16 + i, y) < 0.3 ? 1 : 0);
      g.fillStyle = R[0]; g.fillRect(px + i, top, 1, 2);                      // Abbruchkante
      if (hash(x * 16 + i, y + 77) < 0.28) { g.fillStyle = R[2]; g.fillRect(px + i, top + 3, 1, fh - 4); } // Felsrillen
    }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px, py + TS - 2, TS, 2);
    if (w < l) { g.fillStyle = 'rgba(40,30,25,.6)'; g.fillRect(px, py + TS - fh, 1, fh); }
    if (e < l) { g.fillStyle = 'rgba(30,22,18,.65)'; g.fillRect(px + TS - 1, py + TS - fh, 1, fh); }
  }
}
function drawCliffShadow(g, x, y, px, py) {
  const l = lvAt(x, y), n = lvAt(x, y - 1), w = lvAt(x - 1, y), nw = lvAt(x - 1, y - 1);
  if (n > l) { const k = n - l; g.fillStyle = `rgba(10,15,30,${0.22 + 0.06 * k})`; g.fillRect(px, py, TS, 4); g.fillStyle = 'rgba(10,15,30,.12)'; g.fillRect(px, py + 4, TS, 3); }
  if (w > l) { g.fillStyle = 'rgba(10,15,30,.18)'; g.fillRect(px, py, 3, TS); }
  else if (nw > l && n <= l) { g.fillStyle = 'rgba(10,15,30,.18)'; g.fillRect(px, py, 3, 4); }
}
function buildTerrain() {
  chunkCache = new Map(); canopyCache = new Map(); avgColors(); LEVEL = null; computeLevels();
  OVS = C.MW > 1000 ? 2 : C.MW > 500 ? 3 : 4; terrC = null;
  overview = document.createElement('canvas'); overview.width = C.MW * OVS; overview.height = C.MH * OVS;
  const o = overview.getContext('2d');
  if (C.MW * C.MH <= 120000) for (let y = 0; y < C.MH; y++) for (let x = 0; x < C.MW; x++) overviewTile(o, x, y);
  else { // große Welten: direkt in Pixel schreiben, sonst dauert das Zeichnen zu lange
    const S = OVS, OW = C.MW * S, id = o.createImageData(OW, C.MH * S), D = id.data;
    for (let y = 0; y < C.MH; y++) for (let x = 0; x < C.MW; x++) {
      const i = y * C.MW + x, t = W.t[i], c = AVG[t], v = (hash(x, y) - 0.5) * 8; let r = c[0] + v, g = c[1] + v, bl = c[2] + v;
      if (t === T_MOUNT) { const l = LEVEL[i]; if (l >= SNOW) { r = 232; g = 238; bl = 245; } else { r += l * 10; g += l * 10; bl += l * 9; } }
      if (t === 4) { const k = hash(x + 3, y) < 0.5; r = k ? 47 : 61; g = k ? 107 : 138; bl = k ? 42 : 51; }
      if (W.path[i]) { r = r * 0.3 + 119; g = g * 0.3 + 91; bl = bl * 0.3 + 56; }
      const shade = t === T_MOUNT && y + 1 < C.MH && LEVEL[i + C.MW] < LEVEL[i];
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const p = ((y * S + dy) * OW + x * S + dx) * 4, sh = shade && dy === S - 1 ? 0.55 : 1; D[p] = r * sh; D[p + 1] = g * sh; D[p + 2] = bl * sh; D[p + 3] = 255; }
    }
    o.putImageData(id, 0, 0);
  }
  miniTerrain = document.createElement('canvas'); miniTerrain.width = C.MW; miniTerrain.height = C.MH;
  const m = miniTerrain.getContext('2d'), id = m.createImageData(C.MW, C.MH);
  for (let i = 0; i < C.MW * C.MH; i++) { const c = AVG[W.t[i]]; id.data[i * 4] = c[0]; id.data[i * 4 + 1] = c[1]; id.data[i * 4 + 2] = c[2]; id.data[i * 4 + 3] = 255; }
  m.putImageData(id, 0, 0);
  buildTerritory();
}
let OVS = 4;
function overviewTile(o, x, y) {
  const S = OVS;
  const t = W.t[y * C.MW + x], c = AVG[t], v = (hash(x, y) - 0.5) * 8;
  o.fillStyle = `rgb(${c[0] + v | 0},${c[1] + v | 0},${c[2] + v | 0})`; o.fillRect(x * S, y * S, S, S);
  if (t === T_MOUNT && LEVEL) { const l = LEVEL[y * C.MW + x]; if (l >= SNOW) { o.fillStyle = hash(x, y + 1) < 0.85 ? '#e8eef5' : '#c9d2dc'; o.fillRect(x * S, y * S, S, S); } else { o.fillStyle = `rgba(255,250,235,${0.06 * l})`; o.fillRect(x * S, y * S, S, S); } if (LEVEL[(y + 1) * C.MW + x] < l) { o.fillStyle = 'rgba(40,30,25,.55)'; o.fillRect(x * S, y * S + S - 1, S, 1); } }
  if (t === 4) { o.fillStyle = hash(x + 3, y) < 0.5 ? '#2f6b2a' : '#3d8a33'; o.beginPath(); o.arc(x * S + S / 2, y * S + S * 0.4, S * 0.55, 0, 7); o.fill(); }
  if (W.path[y * C.MW + x]) { o.fillStyle = 'rgba(170,130,80,.7)'; o.fillRect(x * S, y * S, S, S); }
}
function getChunk(cx, cy) {
  const key = cx + ',' + cy; let c = chunkCache.get(key);
  if (c) { chunkCache.delete(key); chunkCache.set(key, c); return c; }
  c = document.createElement('canvas'); c.width = CH * TS; c.height = CH * TS;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const X0 = cx * CH, Y0 = cy * CH, X1 = Math.min(C.MW, X0 + CH), Y1 = Math.min(C.MH, Y0 + CH);
  // 1) Boden
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const t = W.t[y * C.MW + x], px = (x - X0) * TS, py = (y - Y0) * TS;
    if (t <= T_SHALLOW) { spr(g, 'water', px, py); if (t === T_DEEP) { g.fillStyle = 'rgba(10,40,90,.35)'; g.fillRect(px, py, TS, TS); } }
    else if (t === T_SHORE) tex(g, 'sand', px, py);
    else if (t === T_HILLS) tex(g, 'hills', px, py);
    else if (t === T_MOUNT) drawRockTile(g, x, y, px, py);
    else { spr(g, 'grass', px, py); if (t === T_FOREST) { g.fillStyle = 'rgba(15,55,20,.28)'; g.fillRect(px, py, TS, TS); } }
  }
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) drawCliffShadow(g, x, y, (x - X0) * TS, (y - Y0) * TS);
  // 2) Wege, Spuren, Kleinkram
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = y * C.MW + x, t = W.t[i], px = (x - X0) * TS, py = (y - Y0) * TS, h = hash(x + 7, y + 3), h2 = hash(x + 31, y + 17);
    const pl = W.path[i]; if (pl && t > T_SHALLOW) { g.globalAlpha = [0, 0.4, 0.7, 0.95][pl]; spr(g, 'dirt', px, py); g.globalAlpha = 1; }
    const cut = W.cut[i];
    if (cut === 'f') sprC(g, 'stump', px + 8, py + 9, 0.75);
    else if (cut === 'r') { sprC(g, 'pebble', px + 5, py + 5); sprC(g, 'pebble', px + 11, py + 11); }
    else if (!pl) {
      if (t === T_GRASS) { if (h < 0.025) sprC(g, h2 < 0.5 ? 'flowersY' : 'flowersP', px + 8, py + 8); else if (h < 0.08) sprC(g, h2 < 0.33 ? 'tuft1' : h2 < 0.66 ? 'tuft2' : 'tuft3', px + 8, py + 9); else if (h < 0.09) sprC(g, 'leaf', px + 8, py + 8); else if (h < 0.095) sprC(g, 'flowerPink', px + 8, py + 8); }
      else if (t === T_FOREST) { if (h < 0.05) sprC(g, 'fern', px + 8, py + 10); else if (h < 0.065) sprC(g, h2 < 0.6 ? 'mushRed' : 'mushBlue', px + 8, py + 10); else if (h < 0.08) sprC(g, 'stick', px + 8, py + 10); }
      else if (t === T_HILLS) { if (h < 0.12) sprC(g, 'rock', px + 8, py + 9); else if (h < 0.3) sprC(g, 'pebble', px + 8, py + 8); }
      else if (t === T_SHALLOW) { if (h < 0.05) sprC(g, 'lily', px + 8, py + 8); else if (h < 0.07) sprC(g, 'cattail', px + 8, py + 8); else if (h < 0.1) sprC(g, 'ripple', px + 8, py + 8); }
      else if (t === T_DEEP) { if (h < 0.03) sprC(g, 'ripple', px + 8, py + 8); }
      else if (t === T_SHORE && h < 0.04) sprC(g, 'pebble', px + 8, py + 8);
    }
    if (W.clay[i] && h > 0.7 && t > T_SHALLOW) { g.fillStyle = 'rgba(150,95,60,.55)'; g.fillRect(px + 5, py + 10, 4, 2); }
    if (W.flint[i]) { g.fillStyle = 'rgba(30,30,38,.75)'; g.fillRect(px + 10, py + 4, 3, 2); }
  }
  for (const o of W.ochre) if (o.x >= X0 && o.x < X1 && o.y >= Y0 && o.y < Y1) { g.fillStyle = '#b5482e'; g.beginPath(); g.arc((o.x - X0) * TS, (o.y - Y0) * TS, 2.5, 0, 7); g.fill(); }
  // 3) Ufer – Dual-Grid: jede Zelle liegt zwischen vier Kachelmitten
  for (let j = Y0; j <= Y1; j++) for (let i = X0; i <= X1; i++) {
    const nw = !isWater(i - 1, j - 1), ne = !isWater(i, j - 1), sw = !isWater(i - 1, j), se = !isWater(i, j);
    let key = (nw ? '1' : '0') + (ne ? '1' : '0') + (sw ? '1' : '0') + (se ? '1' : '0');
    if (key === '1111' || key === '0000') continue;
    const dx = (i - X0) * TS - TS / 2, dy = (j - Y0) * TS - TS / 2;
    if (key === '1001' || key === '0110') { // diagonale Engstelle: zwei Eckstücke zusammensetzen
      const A = ASSETS.shore[key === '1001' ? '1000' : '0100'], B = ASSETS.shore[key === '1001' ? '0001' : '0010'];
      g.drawImage(IMG.woods, A[0], A[1], 16, 16, dx, dy, TS, TS);
      const qx = key === '1001' ? 8 : 0; g.drawImage(IMG.woods, B[0] + qx, B[1] + 8, 8, 8, dx + qx, dy + 8, 8, 8);
      continue;
    }
    const p = ASSETS.shore[key]; g.drawImage(IMG.woods, p[0], p[1], 16, 16, dx, dy, TS, TS);
  }
  chunkCache.set(key, c);
  while (chunkCache.size > 48) chunkCache.delete(chunkCache.keys().next().value);
  return c;
}
// Baumkronen: eigene Ebene ÜBER den Figuren
function getCanopy(cx, cy) {
  const key = cx + ',' + cy; let c = canopyCache.get(key);
  if (c) { canopyCache.delete(key); canopyCache.set(key, c); return c; }
  c = document.createElement('canvas'); c.width = CH * TS; c.height = CH * TS;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const X0 = cx * CH, Y0 = cy * CH, trees = [];
  for (let y = Y0 - 1; y < Y0 + CH + 4; y++) for (let x = X0 - 3; x < X0 + CH + 3; x++) {
    if (x < 0 || y < 0 || x >= C.MW || y >= C.MH || W.t[y * C.MW + x] !== T_FOREST || CHOPS.has(y * C.MW + x)) continue;
    const h = hash(x + 101, y + 7), h2 = hash(x + 3, y + 211);
    let kind = h < 0.55 ? 'treeRound' : 'pine';
    if (h2 < 0.035 && x > 0 && y > 0 && x < C.MW - 1 && y < C.MH - 1 && W.t[y * C.MW + x - 1] === T_FOREST && W.t[y * C.MW + x + 1] === T_FOREST && W.t[(y - 1) * C.MW + x] === T_FOREST) kind = 'treeBig';
    trees.push({ kind, ax: (x + 0.5) * TS + (h2 - 0.5) * 7, ay: (y + 1) * TS - 1 + (h - 0.5) * 4 });
  }
  trees.sort((a, b) => a.ay - b.ay);
  for (const t of trees) { const s = ASSETS.spr[t.kind]; spr(g, t.kind, t.ax - s[2] / 2 - X0 * TS, t.ay - s[3] - Y0 * TS); }
  canopyCache.set(key, c);
  while (canopyCache.size > 48) canopyCache.delete(canopyCache.keys().next().value);
  return c;
}
function chunkRange(x0, y0, x1, y1) { return [Math.max(0, Math.floor(x0 / CH)), Math.max(0, Math.floor(y0 / CH)), Math.min(Math.ceil(C.MW / CH) - 1, Math.floor(x1 / CH)), Math.min(Math.ceil(C.MH / CH) - 1, Math.floor(y1 / CH))]; }
function drawTerrain(x0, y0, x1, y1) {
  if (levelDirty && LEVEL && performance.now() - (LEVEL_T || 0) > 1500) { LEVEL_T = performance.now(); computeLevels(); }
  if (cam.z < 0.42) { ctx.imageSmoothingEnabled = true; ctx.drawImage(overview, 0, 0, C.MW * TS, C.MH * TS); return; }
  ctx.imageSmoothingEnabled = false;
  const [a, b, c, d] = chunkRange(x0, y0, x1, y1);
  for (let cy = b; cy <= d; cy++) for (let cx = a; cx <= c; cx++) ctx.drawImage(getChunk(cx, cy), cx * CH * TS, cy * CH * TS);
}
function drawCanopy(x0, y0, x1, y1) {
  if (cam.z < 0.42) return;
  const [a, b, c, d] = chunkRange(x0, y0, x1, y1 + 3);
  for (let cy = b; cy <= d; cy++) for (let cx = a; cx <= c; cx++) ctx.drawImage(getCanopy(cx, cy), cx * CH * TS, cy * CH * TS);
  drawWorkFx(x0, y0, x1, y1);
}
HOOKS.onTile = (x, y) => {
  if (!overview) return;
  levelDirty = true;
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) { const k = Math.floor((x + dx) / CH) + ',' + Math.floor((y + dy) / CH); chunkCache.delete(k); canopyCache.delete(k); }
  overviewTile(overview.getContext('2d'), x, y);
  const c = AVG[W.t[y * C.MW + x]]; if (c && miniTerrain) { const m = miniTerrain.getContext('2d'); m.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; m.fillRect(x, y, 1, 1); }
};
// ---------------------------------------------------------------- Reviere als Kachelflächen
let terrC = null, borderC = null, BS = 8;
function buildTerritory() {
  if (!OWN || !W) return;
  if (!terrC) { terrC = document.createElement('canvas'); terrC.width = C.MW; terrC.height = C.MH; borderC = document.createElement('canvas'); BS = C.MW > 1000 ? 2 : C.MW > 500 ? 4 : 8; borderC.width = C.MW * BS; borderC.height = C.MH * BS; }
  const g = terrC.getContext('2d'), id = g.createImageData(C.MW, C.MH), b = borderC.getContext('2d');
  b.clearRect(0, 0, borderC.width, borderC.height);
  const col = {}; for (const T of W.tribes) col[T.id] = [parseInt(T.col.slice(1, 3), 16), parseInt(T.col.slice(3, 5), 16), parseInt(T.col.slice(5, 7), 16), T.col];
  for (let y = 0; y < C.MH; y++) for (let x = 0; x < C.MW; x++) {
    const i = y * C.MW + x, o = OWN[i]; if (!o) continue;
    const c = col[o]; if (!c) continue;
    id.data[i * 4] = c[0]; id.data[i * 4 + 1] = c[1]; id.data[i * 4 + 2] = c[2]; id.data[i * 4 + 3] = 46;
    b.fillStyle = c[3];
    if (y === 0 || OWN[i - C.MW] !== o) b.fillRect(x * BS, y * BS, BS, 1);
    if (y === C.MH - 1 || OWN[i + C.MW] !== o) b.fillRect(x * BS, y * BS + BS - 1, BS, 1);
    if (x === 0 || OWN[i - 1] !== o) b.fillRect(x * BS, y * BS, 1, BS);
    if (x === C.MW - 1 || OWN[i + 1] !== o) b.fillRect(x * BS + BS - 1, y * BS, 1, BS);
  }
  g.putImageData(id, 0, 0);
}
HOOKS.onTerritory = () => { if (overview) buildTerritory(); };

function bushesInView() {
  const hw = VW / 2 / cam.z / TS + 2, hh = VH / 2 / cam.z / TS + 2, cx = cam.x / TS, cy = cam.y / TS, out = [];
  for (let gy = Math.floor((cy - hh) / 8); gy <= Math.floor((cy + hh) / 8); gy++) for (let gx = Math.floor((cx - hw) / 8); gx <= Math.floor((cx + hw) / 8); gx++) { const c = BGRID && BGRID.get(gx + ',' + gy); if (c) for (const b of c) out.push(b); }
  return out;
}
// ---------------------------------------------------------------- Kamera
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  nightC = document.createElement('canvas'); nightC.width = cv.width; nightC.height = cv.height; nctx = nightC.getContext('2d');
  const ms = Math.min(0.75, Math.max(0.5, VW / 2400)) * 400 / Math.max(400, C.MW); mini.width = Math.round(C.MW * ms); mini.height = Math.round(C.MH * ms); mini.style.width = mini.width + 'px'; mini.style.height = mini.height + 'px';
}
const w2s = (x, y) => [(x * TS - cam.x) * cam.z + VW / 2, (y * TS - cam.y) * cam.z + VH / 2];
const s2w = (sx, sy) => [((sx - VW / 2) / cam.z + cam.x) / TS, ((sy - VH / 2) / cam.z + cam.y) / TS];
function centerOn(x, y) { cam.x = x * TS; cam.y = y * TS; }
function clampCam() { cam.x = clamp(cam.x, 0, C.MW * TS); cam.y = clamp(cam.y, 0, C.MH * TS); }

// ---------------------------------------------------------------- Zeichnen
let ALPHA = 1, FT = 0;
const lerpPos = e => [e.px === undefined ? e.x : e.px + (e.x - e.px) * ALPHA, e.py === undefined ? e.y : e.py + (e.y - e.py) * ALPHA];
const SKIN = ['#e3b48f', '#c99470', '#a8724f', '#8a5a3c', '#d9a77e'];
const HAIR = ['#2b1d14', '#4a2f1d', '#6b4a2b', '#1c1c1c', '#8a6a3a', '#5a3a2a'];

function draw(t) {
  FT = t / 1000;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0d1418'; ctx.fillRect(0, 0, VW, VH);
  const [x0, y0] = s2w(0, 0), [x1, y1] = s2w(VW, VH);
  const inView = (x, y, m = 2) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  // Ab Zoom 1 wird die Welt in echter Pixelauflösung gezeichnet und dann ohne Weichzeichnen vergrößert:
  // so liegt alles – Figuren, Feuer, Schatten, Licht – im selben Pixelraster.
  PIXON = cam.z >= 1.5 && ui.pixel !== false; // darunter sind die Pixel ohnehin kleiner als ein Bildschirmpunkt
  if (PIXON) {
    const left = cam.x - VW / 2 / cam.z, top = cam.y - VH / 2 / cam.z, ox = Math.floor(left), oy = Math.floor(top);
    const pw = Math.ceil(VW / cam.z) + 2, ph = Math.ceil(VH / cam.z) + 2;
    if (PIX.width !== pw || PIX.height !== ph) { PIX.width = pw; PIX.height = ph; }
    PIXO = [ox, oy, left, top];
    ctx = pctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#0d1418'; ctx.fillRect(0, 0, pw, ph);
    ctx.save(); ctx.translate(-ox, -oy);
  } else {
    ctx.save();
    ctx.translate(VW / 2, VH / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  }
  drawTerrain(x0, y0, x1, y1);
  // Jahreszeit
  const season = seasonNow();
  if (season === 3 && !(ui.speed >= 6)) { ctx.fillStyle = 'rgba(235,242,255,.30)'; ctx.fillRect(0, 0, C.MW * TS, C.MH * TS); }
  else if (season === 2) { ctx.fillStyle = 'rgba(200,120,30,.10)'; ctx.fillRect(0, 0, C.MW * TS, C.MH * TS); }
  else if (season === 1) { ctx.fillStyle = 'rgba(255,230,120,.05)'; ctx.fillRect(0, 0, C.MW * TS, C.MH * TS); }
  const Z = cam.z, detail = Z > 0.7;
  if (ui.territory && terrC) { ctx.imageSmoothingEnabled = false; ctx.drawImage(terrC, 0, 0, C.MW * TS, C.MH * TS); ctx.globalAlpha = 0.85; ctx.drawImage(borderC, 0, 0, C.MW * TS, C.MH * TS); ctx.globalAlpha = 1; }

  // Büsche
  if (Z > 0.45) for (const b of bushesInView()) {
    if (b.gone) continue;
    const px = b.x * TS, py = b.y * TS;
    drawPlant(b, px, py, season);
  }
  if (Z > 0.3) drawRoads(x0, y0, x1, y1);
  if (Z > 0.35) for (const o of (W.ore || [])) if (inView(o.x, o.y)) drawOre(o);
  if (Z > 0.3) for (const G of (W.ghosts || [])) if (inView(G.cx, G.cy, 30)) drawGhost(G);
  // Gräber
  for (const g of W.graves) { if (!inView(g.x, g.y)) continue; drawGrave(g); }
  if (Z > 0.45) for (const c of (W.corpses || [])) { if (c.carry || !inView(c.x, c.y)) continue; drawCorpse(c, c.x * TS, c.y * TS); }
  // Felder
  if (Z > 0.3) for (const k in W.fields) {
    const x = k % C.MW, y = (k / C.MW) | 0; if (!inView(x, y)) continue;
    const f = W.fields[k], px = x * TS, py = y * TS;
    const FTr = TRIBE.get(f.tr), legume = FTr && TK(FTr, 'huelsen') && hash(x + 11, y + 5) < 0.35;
    if (legume && f.st >= 2) { tex(ctx, 'farm', px, py); for (let yy = 2; yy < TS; yy += 5) for (let xx = 1; xx < TS; xx += 4) { ctx.fillStyle = '#3d7a2c'; ctx.fillRect(px + xx, py + yy, 3, 3); ctx.fillStyle = f.st === 3 ? '#b8c060' : '#6fae45'; ctx.fillRect(px + xx + 1, py + yy, 1, 2); } }
    else tex(ctx, f.st >= 2 ? (f.st === 3 ? 'ripe' : 'grow') : 'farm', px, py);
    { const FT_ = TRIBE.get(f.tr); if (FT_ && TK(FT_, 'bewaesserung') && (x + y) % 2 === 0) { ctx.fillStyle = '#3a6ea8'; ctx.fillRect(px, py + 14, TS, 2); ctx.fillStyle = '#7ab4e0'; ctx.fillRect(px, py + 14, TS, 1); } if (FT_ && TK(FT_, 'dattel') && hash(x, y) < 0.08) { ctx.fillStyle = '#6a4424'; ctx.fillRect(px + 7, py - 6, 2, 12); ctx.fillStyle = '#4f8a3a'; for (let i = 0; i < 5; i++) ctx.fillRect(px + 8 + Math.cos(i * 1.25) * 5 - 2, py - 7 + Math.sin(i * 1.25) * 2, 5, 2); } } if (f.st === 1) { ctx.fillStyle = '#6fb04a'; for (let yy = 3; yy < TS; yy += 4) for (let xx = 2; xx < TS; xx += 4) ctx.fillRect(px + xx, py + yy, 2, 2); }
  }
  // Felsbilder
  for (const p of (W.paintAll || [])) { if (!inView(p.x, p.y)) continue; const px = p.x * TS, py = p.y * TS; ctx.strokeStyle = '#b5482e'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px - 1, py - 3); ctx.lineTo(px + 2, py); ctx.lineTo(px + 5, py - 3); ctx.stroke(); ctx.fillStyle = '#b5482e'; ctx.beginPath(); ctx.arc(px, py + 3, 1.3, 0, 7); ctx.fill(); }
  // Lager
  for (const T of W.tribes) {
    if (!T.alive || !inView(T.cx, T.cy, 10)) continue;
    const px = T.cx * TS, py = T.cy * TS;
    if (T.town) drawTownGround(T);
    drawCampProps(T, px, py);
    // Vorräte
    const piles = T.storehouse ? 0 : Math.min(8, Math.ceil(T.store.food / 40));
    for (let i = 0; i < piles; i++) { const ax = px + 20 + (i % 4) * 7, ay = py - 14 + Math.floor(i / 4) * 7; ctx.fillStyle = '#7a5a34'; ctx.fillRect(ax, ay, 6, 6); ctx.fillStyle = '#a3311f'; ctx.fillRect(ax + 1, ay + 1, 4, 2); }
    drawStockPiles(T);
    if (T.pots > 0) for (let i = 0; i < Math.min(6, T.pots); i++) { ctx.fillStyle = '#a0583a'; ctx.beginPath(); ctx.arc(px - 22 + i * 5, py - 20, 2.2, 0, 7); ctx.fill(); }
    // Vorratshaus
    if (T.storehouse) T.storehouse.lx !== undefined ? drawStoreLot(T) : drawStorehouse(T.storehouse.x * TS, T.storehouse.y * TS, T);
    // Gehege
    if (T.penR) drawPen(T.penR);
    else if (T.pen && W.animals.some(g => g.k === 'goat' && g.tribe === T.id)) { ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(T.pen[0] * TS, T.pen[1] * TS, 2.6 * TS, 0, 7); ctx.stroke(); for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; ctx.fillStyle = '#5a3d22'; ctx.fillRect(T.pen[0] * TS + Math.cos(an) * 2.6 * TS - 1.2, T.pen[1] * TS + Math.sin(an) * 2.6 * TS - 1.2, 2.4, 2.4); } }
    // Reusen
    for (const r of (T.traps || [])) { ctx.strokeStyle = '#b8935a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(r.x * TS, r.y * TS, 4, 2.5, 0.5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r.x * TS - 3, r.y * TS); ctx.lineTo(r.x * TS + 3, r.y * TS); ctx.stroke(); }
    // Palisade
    if (T.town && (T.pal || T.bld?.wall)) drawTownWall(T);
    else if (T.pal && !((T.bld?.wall || 0) >= 8)) { for (let k = 0; k < T.pal; k++) { if (k === 6 || k === 18) continue; const a0 = k / 24 * 6.283, a1 = (k + 1) / 24 * 6.283; for (let j = 0; j < 5; j++) { const an = a0 + (a1 - a0) * j / 5, r = 10 * TS; const sx = px + Math.cos(an) * r, sy = py + Math.sin(an) * r; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(sx - 2, sy - 1, 5, 5); tex(ctx, 'logEnd', sx - 3, sy - 3, 6, 6); } } }
    // Hütten
    if (T.town) for (const k in T.town.lots) { const P = T.town.lots[k]; if (P.kind === 'bau' && k === P.i + ',' + P.j && P.prog) drawSite(P, T); }
    for (const h of T.huts) h.lx !== undefined ? drawHouse(h, T) : h.mud ? drawMudHouse(h.x * TS, h.y * TS, h.rot, T.col) : drawHut(h.x * TS, h.y * TS, h.rot, T.col, h.stone);
    drawBuildings(T, px, py);
    if (T.town && (T.bld?.hall || 0) > 0) drawHall(T);
    if (T.town) drawDecor(T, px, py);
    // Feuer
    ctx.fillStyle = '#3a3633'; ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = '#6f6a63'; ctx.beginPath(); ctx.arc(px + Math.cos(i * 0.785) * 7, py + Math.sin(i * 0.785) * 7, 1.8, 0, 7); ctx.fill(); }
    if (T.fire.lit) { if (T.fire.fuel > 0) drawFlame(px, py, 1 + Math.min(1, T.fire.fuel / 60) * 0.4); else { ctx.fillStyle = '#b8401c'; ctx.fillRect(Math.round(px) - 3, Math.round(py) - 1, 6, 3); ctx.fillStyle = '#e8541e'; if (Math.floor(FT * 3) % 2) ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 1); } }
  }
  // Blitzfeuer
  for (const f of W.fires) { if (!inView(f.x, f.y)) continue; for (let i = 0; i < 3; i++) drawFlame(f.x * TS + (i - 1) * 7, f.y * TS + (i % 2) * 4, 1.3); }
  // Tiere
  const AA = ((W.tick % 3) + ALPHA) / 3;
  if (Z > 0.3) for (const a of W.animals) { if (!inView(a.x, a.y)) continue; const x = a.px === undefined ? a.x : a.px + (a.x - a.px) * AA, y = a.py === undefined ? a.y : a.py + (a.y - a.py) * AA; if (Z < 0.6) { ctx.fillStyle = a.k === 'wolf' ? '#77787a' : a.k === 'goat' ? '#d8d0bf' : '#8a5f36'; ctx.fillRect(x * TS - 3, y * TS - 2, 6, 4); } else drawAnimal(a, x * TS, y * TS, detail); }
  // Menschen
  const sel = ui.sel ? NPC.get(ui.sel) : null;
  const drawAllNpcs = () => { for (const n of W.npcs) { if (!inView(n.x, n.y)) continue; const [x, y] = lerpPos(n); if (Z < 0.6) { const T = tribeOf(n); ctx.fillStyle = T ? T.col : '#fff'; ctx.beginPath(); ctx.arc(x * TS, y * TS, n === sel ? 9 : 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#000a'; ctx.lineWidth = 1.5; ctx.stroke(); } else drawNpc(n, x * TS, y * TS, n === sel, detail); } };
  drawAllNpcs();
  drawParticles();
  // Baumkronen über den Figuren
  drawCanopy(x0, y0, x1, y1);
  // Holzfäller bleiben am Baum sichtbar
  if (Z >= 0.6) for (const id of CHOPS.values()) { const n = NPC.get(id); if (n && inView(n.x, n.y)) { const [x, y] = lerpPos(n); drawNpc(n, x * TS, y * TS, n === sel, detail); } }
  // Ausgewählte Figur bleibt durch die Krone hindurch erkennbar
  if (sel && cam.z >= 0.42) { const [x, y] = lerpPos(sel); if (W.t[(y | 0) * C.MW + (x | 0)] === T_FOREST || W.t[((y | 0) + 1) * C.MW + (x | 0)] === T_FOREST) { ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.arc(x * TS, y * TS, 11, 0, 7); ctx.stroke(); ctx.setLineDash([]); } }
  ctx.restore();
  // Nacht in Pixelauflösung: Lichtkreise in Stufen statt weicher Verläufe
  const { dark, dusk } = dayLight();
  if (PIXON) {
    if (dusk > 0.01) { pctx.fillStyle = `rgba(255,120,50,${0.13 * dusk})`; pctx.fillRect(0, 0, PIX.width, PIX.height); }
    if (dark > 0.01) pixelNight(dark, dusk);
    ctx = ctxScreen; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(PIX, 0, 0, PIX.width, PIX.height, (PIXO[0] - PIXO[2]) * cam.z, (PIXO[1] - PIXO[3]) * cam.z, PIX.width * cam.z, PIX.height * cam.z);
  }
  if (!PIXON && dusk > 0.01) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,120,50,${0.13 * dusk})`; ctx.fillRect(0, 0, VW * DPR, VH * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  if (!PIXON && dark > 0.01) {
    nctx.setTransform(1, 0, 0, 1, 0, 0); nctx.globalCompositeOperation = 'source-over'; nctx.clearRect(0, 0, nightC.width, nightC.height);
    nctx.fillStyle = `rgba(${8 + Math.round(30 * dusk)},${14 + Math.round(6 * dusk)},${35 + Math.round(20 * dusk)},${0.74 * dark})`; nctx.fillRect(0, 0, nightC.width, nightC.height);
    nctx.globalCompositeOperation = 'destination-out';
    const lights = lightList();
    if (0) for (const T of W.tribes) if (T.alive && T.fire.lit) lights.push([T.cx, T.cy, 110]);
    for (const [lx, ly, r0] of lights) {
      const [sx, sy] = w2s(lx, ly); const r = r0 * cam.z * DPR * (0.95 + Math.sin(FT * 9 + lx) * 0.04);
      const gr = nctx.createRadialGradient(sx * DPR, sy * DPR, 0, sx * DPR, sy * DPR, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      nctx.fillStyle = gr; nctx.beginPath(); nctx.arc(sx * DPR, sy * DPR, r, 0, 7); nctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(nightC, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly, r0] of lights) { const [sx, sy] = w2s(lx, ly); const r = r0 * 0.6 * cam.z; const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, `rgba(255,140,40,${0.25 * dark})`); gr.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  // Beschriftungen
  ctx.textAlign = 'center';
  for (const T of W.tribes) {
    if (!T.alive) continue; const [sx, sy] = w2s(T.cx, T.cy - 3.6);
    if (sx < -100 || sx > VW + 100 || sy < -30 || sy > VH + 30) continue;
    ctx.font = '600 13px system-ui'; const w = ctx.measureText(T.name).width + 18;
    ctx.fillStyle = 'rgba(20,21,23,.78)'; roundRect(sx - w / 2, sy - 11, w, 20, 10); ctx.fill();
    ctx.fillStyle = T.col; ctx.beginPath(); ctx.arc(sx - w / 2 + 9, sy - 1, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#eee'; ctx.fillText(T.name, sx + 4, sy + 3.5);
  }
  if (ui.labels && cam.z >= 3.8) {
    ctx.font = '11px system-ui';
    for (const n of W.npcs) { const [x, y] = lerpPos(n); const [sx, sy] = w2s(x, y); if (sx < 0 || sx > VW || sy < 0 || sy > VH) continue; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(n.name, sx + 0.5, sy - 13 * cam.z / 2 - 4.5); ctx.fillStyle = '#f2efe8'; ctx.fillText(n.name, sx, sy - 13 * cam.z / 2 - 5); }
  }
  drawMini();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// Pixel-Feuer: vier Bilder einer kleinen Flamme, im Takt flackernd; Größe in ganzen Pixelstufen
const FLAME_PX = [
  ['....a.....', '...aba....', '...abba...', '..abcba...', '..abccba..', '.abccdcba.', '.abcddcba.', 'abcdddcba.', 'abccddcbaa', '.abbccbba.', '..aabbaa..'],
  ['.....a....', '....aba...', '...abba...', '...abcba..', '..abccba..', '.abcdccba.', '.abcddcba.', '.abcdddcba', 'aabcddccba', '.abbccbba.', '..aabbaa..'],
  ['...a......', '...ab.....', '..abba....', '..abcba...', '.abccba...', '.abcdcbaa.', 'abcddccba.', 'abcdddcba.', 'abccddcba.', '.abbccbba.', '..aabbaa..'],
  ['....aa....', '...abba...', '...abca...', '..abccba..', '..abcdcba.', '.abcddcba.', '.abcdddcba', 'abcdddccba', 'abccddcbaa', '.abbccbba.', '..aabbaa..'],
];
const FLAME_PAL = { a: '#b8401c', b: '#e8541e', c: '#ffb02e', d: '#fff1a8' };
const FLAME_CV = [];
function flameCanvas(f) { if (FLAME_CV[f]) return FLAME_CV[f]; const rows = FLAME_PX[f], c = document.createElement('canvas'); c.width = 10; c.height = rows.length; const g = c.getContext('2d'); rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (FLAME_PAL[r[x]]) { g.fillStyle = FLAME_PAL[r[x]]; g.fillRect(x, y, 1, 1); } }); return FLAME_CV[f] = c; }
function drawFlame(px, py, s) {
  const f = (Math.floor(FT * 9 + px * 0.37 + py * 0.11) % 4 + 4) % 4, k = Math.max(1, Math.round(s * 2)) / 2; // halbe Stufen: 0.5, 1, 1.5 …
  const c = flameCanvas(f), w = Math.round(10 * k), h = Math.round(c.height * k);
  ctx.drawImage(c, Math.round(px - w / 2), Math.round(py + 2 * k - h), w, h);
}
// ---------------------------------------------------------------- Bauten der Jungstein- und Kupferzeit (Pixelkunst)
function brick(x, y, w, h, light, dark) {
  ctx.fillStyle = light; ctx.fillRect(x, y, w, h); ctx.fillStyle = dark;
  for (let r = 0; r * 3 < h; r++) { ctx.fillRect(x, y + r * 3, w, 1); for (let c = (r % 2) * 3; c < w; c += 6) ctx.fillRect(x + c, y + r * 3, 1, 3); }
}
function drawMudHouse(px, py, rot, col) {
  ctx.save(); ctx.translate(px, py); ctx.rotate(rot * 0.3);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-13, -9, 31, 25);
  brick(-15, 2, 30, 11, '#b8925c', '#9c7a4a');               // Vorderwand
  ctx.fillStyle = '#d4b07a'; ctx.fillRect(-15, -12, 30, 14); // Flachdach
  ctx.fillStyle = '#e6c690'; ctx.fillRect(-15, -12, 30, 1);
  ctx.fillStyle = '#a8844f'; ctx.fillRect(-15, -12, 1, 14); ctx.fillRect(14, -12, 1, 14); ctx.fillRect(-15, 1, 30, 1);
  ctx.fillStyle = '#c8a46c'; ctx.fillRect(-11, -9, 8, 5); ctx.fillStyle = '#e0c088'; ctx.fillRect(-11, -9, 8, 1); // Strohbündel auf dem Dach
  ctx.fillStyle = '#4a3424'; ctx.fillRect(-3, 5, 6, 8); ctx.fillStyle = '#2a1e16'; ctx.fillRect(7, 5, 3, 3);
  ctx.fillStyle = col; ctx.fillRect(9, -14, 4, 3);
  ctx.restore();
}
function drawBuildings(T, px, py) {
  const B = T.bld; if (!B) return;
  const pos = k => { const p = placeBuild(T, k); return p ? [p[0] * TS, p[1] * TS] : [px, py]; };
  if (B.oven) { const [x, y] = pos('oven'), c = pxCanvas('oven', OVEN_PX, { ...MUD, g: T.fire.lit ? '#ff8a3a' : '#2a1810' }); ctx.globalAlpha = Math.min(1, 0.4 + B.oven / BUILD_NEED.oven * 0.6); ctx.drawImage(c, x - 7, y - 6); ctx.globalAlpha = 1; }
  if (B.kiln) { const [x, y] = pos('kiln'), c = pxCanvas('kiln', KILN_PX, { ...MUD, g: '#ff8a3a' }); ctx.globalAlpha = Math.min(1, 0.4 + B.kiln / BUILD_NEED.kiln * 0.6); ctx.drawImage(c, x - 7, y - 8); ctx.globalAlpha = 1;
    if (B.kiln >= BUILD_NEED.kiln) for (let i = 0; i < 3; i++) { const t = (FT * 0.5 + i / 3) % 1; ctx.fillStyle = `rgba(200,200,205,${0.5 * (1 - t)})`; ctx.beginPath(); ctx.arc(x + Math.sin(t * 6 + i) * 2, y - 9 - t * 14, 1.5 + t * 3, 0, 7); ctx.fill(); } }
  if (B.temple) { const [tx, ty] = pos('temple'); drawTemple(tx, ty + 30, B.temple / BUILD_NEED.temple, T.col, T.town ? 2 : 1); }
  if (B.wall && !T.town) drawWall(T, B.wall);
}
function drawTemple(x, y, p, col, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const tiers = Math.ceil(p * 4);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-30, 6, 66, 6);
  const T1 = [[-32, -2, 64, 10], [-24, -14, 48, 12], [-16, -24, 32, 10]];
  for (let i = 0; i < Math.min(3, tiers); i++) { const [a, b, w, h] = T1[i]; ctx.fillStyle = '#d8b880'; ctx.fillRect(a, b - 3, w, 3); brick(a, b, w, h, '#c49a62', '#a07c4c'); }
  if (tiers >= 2) { ctx.fillStyle = '#8a6a44'; for (let s = 0; s < Math.min(3, tiers) * 10; s += 2) ctx.fillRect(-4, 7 - s, 8, 1); ctx.fillStyle = '#b08a58'; ctx.fillRect(-4, 8 - Math.min(3, tiers) * 10, 8, Math.min(3, tiers) * 10 - 1); ctx.fillStyle = '#8a6a44'; for (let s = 0; s < Math.min(3, tiers) * 10; s += 2) ctx.fillRect(-4, 7 - s, 8, 1); }
  if (tiers >= 4) { ctx.fillStyle = '#efe6d4'; ctx.fillRect(-9, -36, 18, 12); ctx.fillStyle = '#d8ccb4'; ctx.fillRect(-9, -36, 18, 2); ctx.fillStyle = '#3a6ab0'; ctx.fillRect(-2, -31, 4, 7); ctx.fillStyle = col; ctx.fillRect(6, -42, 1, 6); ctx.fillRect(7, -42, 4, 3); }
  ctx.restore();
}
function drawWall(T, k) {
  const R = 13 * TS, segs = 28;
  for (let i = 0; i < Math.min(k, segs); i++) {
    if (i === 7 || i === 21) continue; // Tore
    const a0 = i / segs * 6.283, a1 = (i + 1) / segs * 6.283;
    for (let j = 0; j < 4; j++) { const an = a0 + (a1 - a0) * j / 4, x = T.cx * TS + Math.cos(an) * R, y = T.cy * TS + Math.sin(an) * R * 0.92;
      if (tileAt(x / TS, y / TS) < T_SHORE) continue;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 3, y + 2, 8, 3);
      ctx.fillStyle = '#d4b07a'; ctx.fillRect(x - 4, y - 9, 8, 3); brick(x - 4, y - 6, 8, 8, '#b8925c', '#9c7a4a');
      if (j % 2 === 0) { ctx.fillStyle = '#d4b07a'; ctx.fillRect(x - 4, y - 11, 3, 2); } }
  }
}
// ---------------------------------------------------------------- Was das Wissen einer Sippe im Lager sichtbar macht
function campShore(T) {
  if (T._shore && T._shore.c === T.cx + ',' + T.cy) return T._shore;
  let best = null, bd = 1e9; for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) { const x = (T.cx | 0) + dx, y = (T.cy | 0) + dy, t = tileAt(x, y); if (t < T_SHORE || houseAt(x, y)) continue; if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileAt(x + a, y + b) <= T_SHALLOW)) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x, y]; } }
  T._shore = best ? Object.assign(best, { c: T.cx + ',' + T.cy }) : { c: T.cx + ',' + T.cy, none: 1 }; return T._shore;
}
function drawItems(T, X, Y) { // X,Y = linke obere Ecke der Ablage (Weltpixel)
  const I = T.items || {}, sp = Math.min(6, I.speer || 0), bo = Math.min(4, I.bogen || 0), fk = Math.min(4, I.faustkeil || 0), ko = Math.min(3, I.korb || 0), kl = Math.min(4, (I.kleidung || 0) + (I.tuch || 0));
  if (!(sp + bo + fk + ko + kl)) return;
  ctx.fillStyle = '#5a3d22'; ctx.fillRect(X, Y + 10, 26, 2); ctx.fillRect(X, Y - 2, 2, 14); ctx.fillRect(X + 24, Y - 2, 2, 14); // Gestell
  for (let i = 0; i < sp; i++) { const c = toolCanvas(TK(T, 'kupfer_guss') ? 'kspeer' : 'speer'); ctx.save(); ctx.translate(X + 3 + i * 3, Y + 10); ctx.rotate(-0.75); ctx.drawImage(c, -2, -c.height + 2); ctx.restore(); }
  for (let i = 0; i < bo; i++) ctx.drawImage(toolCanvas('bogen'), X + 15 + i * 3, Y - 1);
  for (let i = 0; i < fk; i++) ctx.drawImage(toolCanvas('faustkeil'), X + 1 + i * 6, Y + 13);
  for (let i = 0; i < ko; i++) ctx.drawImage(toolCanvas('korb'), X + 26 + i * 8, Y + 5);
  for (let i = 0; i < kl; i++) { ctx.fillStyle = I.tuch ? '#d8cfb0' : '#b8956a'; ctx.fillRect(X + 27, Y - 3 - i * 3, 9, 3); ctx.fillStyle = I.tuch ? '#b5aa86' : '#8a6a44'; ctx.fillRect(X + 27, Y - 1 - i * 3, 9, 1); }
}
function drawCampProps(T, px, py) {
  if (!(T.storehouse && T.storehouse.lx !== undefined)) drawItems(T, px + 4, py + 12);
  const P = (k, rows, x, y, pal = CAMP_PAL) => { const c = pxCanvas(k, rows, pal); ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2)); };
  // Vorratsgruben (bis ein Vorratshaus steht): je mehr Vorrat, desto mehr Gruben
  if (TK(T, 'vorratsgrube') && !T.storehouse) { const n = Math.min(6, 1 + Math.floor(T.store.food / 80)); for (let i = 0; i < n; i++) P('pit', PIT_PX, px + 10 + (i % 3) * 9, py - 24 + Math.floor(i / 3) * 8); }
  // Kochen: Bratspieß über dem Feuer
  if (TK(T, 'kochen') && T.fire.lit) { ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px - 8, py + 4); ctx.lineTo(px - 7, py - 7); ctx.moveTo(px + 8, py + 4); ctx.lineTo(px + 7, py - 7); ctx.moveTo(px - 9, py - 6); ctx.lineTo(px + 9, py - 6); ctx.stroke(); if (T.store.food > 5) { ctx.fillStyle = '#8a3a20'; ctx.fillRect(px - 3, py - 8, 6, 4); ctx.fillStyle = '#b8603a'; ctx.fillRect(px - 2, py - 8, 4, 1); } }
  // Heilkräuter trocknen am Gestell, Körbe aus Flechtwerk, Mahlstein, Krüge mit Bier und Milch
  if (TK(T, 'heilkraeuter')) P('rack', RACK_PX, px - 24, py - 20);
  if (TK(T, 'flechten')) { const c = toolCanvas('korb'); ctx.drawImage(c, px - 30, py + 8); ctx.drawImage(c, px - 24, py + 11); }
  if (TK(T, 'mahlstein') && !T.huts.length) P('quern', QUERN_PX, px + 22, py + 2, FURN_PAL);
  if (TK(T, 'bier')) for (let i = 0; i < 3; i++) P('jar', JAR_PX, px - 14 + i * 7, py + 22);
  if (TK(T, 'milch') && T.penR) for (let i = 0; i < 2; i++) P('jarm', JAR_PX, (T.penR.x0 + 0.6) * TS + i * 7, (T.penR.y0 + T.penR.h - 0.8) * TS, { ...CAMP_PAL, b: '#e8e2d0', B: '#ffffff' });
  // Kalender: ein Kreis aus Steinen, der die Sonnenwenden zeigt
  if (TK(T, 'kalender')) { const RR = T.town && townRect(T), cx = RR ? (RR.x0 - 1.5) * TS : px - 44, cy = RR ? (RR.y0 - 1.5) * TS : py - 40; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, x = cx + Math.cos(a) * 10, y = cy + Math.sin(a) * 6; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 1, y + 2, 4, 2); ctx.fillStyle = '#8a8680'; ctx.fillRect(x - 1, y - 5, 3, 7); ctx.fillStyle = '#b0aca4'; ctx.fillRect(x - 1, y - 5, 3, 1); } }
  // Fernhandel: ein Marktstand am Platz
  if (TK(T, 'fernhandel')) P('stall', STALL_PX, px, py - 26);
  // am Ufer: Fischgestell, Netze, Boote
  const S = campShore(T);
  if (!S.none && (TK(T, 'fischen') || TK(T, 'netz') || TK(T, 'einbaum'))) {
    const sx = S[0] * TS + 8, sy = S[1] * TS + 8;
    if (TK(T, 'netz')) P('netrack', NETRACK_PX, sx - 10, sy - 4); else if (TK(T, 'fischen')) P('fishrack', FISHRACK_PX, sx - 10, sy - 4);
    if (TK(T, 'einbaum')) { const b = pxCanvas(TK(T, 'segelboot') ? 'reed' : 'dug', TK(T, 'segelboot') ? REED_PX : DUGOUT_PX, BOAT_PAL); ctx.drawImage(b, sx + 2, sy + 2); }
  }
}
// ---------------------------------------------------------------- Siedlung im Raster (JRPG-Draufsicht)
function drawTownGround(T) {
  const O = T.town, R = townRect(T);
  // Werkhof
  for (const k in O.lots) { const P = O.lots[k]; if (P.kind === 'werk' && k === P.i + ',' + P.j) { ctx.fillStyle = patt(ctx, 'dirtFloor'); ctx.fillRect(P.x0 * TS, P.y0 * TS, P.w * TS, P.h * TS); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1; ctx.strokeRect(P.x0 * TS + 0.5, P.y0 * TS + 0.5, P.w * TS - 1, P.h * TS - 1); }
    if (P.kind === 'werk' && k === P.i + ',' + P.j) { if (TK(T, 'toepferscheibe')) { const c = pxCanvas('pwheel', PWHEEL_PX, FURN_PAL); ctx.drawImage(c, P.x0 * TS + 26, P.y0 * TS + 10); } if (TK(T, 'lehmziegel')) for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { ctx.fillStyle = '#b8925c'; ctx.fillRect(P.x0 * TS + 6 + i * 9, P.y0 * TS + 40 + r * 7, 7, 4); ctx.fillStyle = '#d4b07a'; ctx.fillRect(P.x0 * TS + 6 + i * 9, P.y0 * TS + 40 + r * 7, 7, 1); } }
    if (P.kind === 'werk' && k === P.i + ',' + P.j && TK(T, 'rad')) { const wc = pxCanvas('wheel', WHEEL_PX, FURN_PAL); ctx.drawImage(wc, P.x0 * TS + 26, (P.y0 + P.h) * TS - 14); ctx.drawImage(wc, P.x0 * TS + 30, (P.y0 + P.h) * TS - 12); }
    if (P.kind === 'store' && k === P.i + ',' + P.j && TK(T, 'wagen')) { const c = pxCanvas('cart', CART_PX, { o: '#2a1e1a', w: '#9a6a3c', W: '#6a4424', r: '#8a6a44', R: '#4a3424' }); ctx.drawImage(c, (P.x0 + P.w) * TS + 1, (P.y0 + 2) * TS); }
    if (P.kind === 'cem' && k === P.i + ',' + P.j) drawCemLot(P, T);
    if (P.kind === 'garden' && k === P.i + ',' + P.j) drawGarden(P, T); }
}
const roofView = () => cam.z < 1.15;
function houseStyle(h) { return h.stone ? 'stone' : h.mud ? 'mud' : 'hut'; }
function drawHouse(h, T) {
  const X = h.lx * TS, Y = h.ly * TS, Wd = h.w * TS, Hd = h.h * TS, st = houseStyle(h), dx = X + Wd / 2, door = X + 2 * TS; // Tür = Kachel lx+2
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(X + 3, Y + 4, Wd, Hd);
  if (roofView()) {
    if (st === 'hut') { ctx.fillStyle = patt(ctx, 'hay'); ctx.fillRect(X - 2, Y - 2, Wd + 4, Hd + 2); ctx.fillStyle = 'rgba(90,60,20,.35)'; for (let i = 4; i < Hd; i += 6) ctx.fillRect(X - 2, Y + i, Wd + 4, 1); ctx.fillStyle = '#7a5a2a'; ctx.fillRect(X - 2, Y + Hd / 2 - 1, Wd + 4, 3); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 2, Y + Hd - 4, Wd + 4, 4); }
    else if (st === 'mud') { ctx.fillStyle = '#d4b07a'; ctx.fillRect(X, Y, Wd, Hd); ctx.fillStyle = '#a8844f'; ctx.fillRect(X, Y, Wd, 3); ctx.fillRect(X, Y, 3, Hd); ctx.fillRect(X + Wd - 3, Y, 3, Hd); brick(X, Y + Hd - 10, Wd, 10, '#b8925c', '#9c7a4a'); ctx.fillStyle = '#c8a46c'; ctx.fillRect(X + 10, Y + 10, 14, 10); ctx.fillStyle = '#4a3424'; ctx.fillRect(X + Wd - 18, Y + 12, 8, 8); }
    else { ctx.fillStyle = patt(ctx, 'cobble'); ctx.fillRect(X - 1, Y - 1, Wd + 2, Hd + 2); ctx.fillStyle = 'rgba(40,40,50,.35)'; ctx.fillRect(X - 1, Y + Hd / 2, Wd + 2, Hd / 2 + 1); ctx.fillStyle = '#5a5a62'; ctx.fillRect(X - 1, Y + Hd / 2 - 1, Wd + 2, 2); }
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(door + 3, Y + Hd - 9, 10, 9);
    ctx.fillStyle = T.col; ctx.fillRect(X + Wd - 9, Y - 4, 6, 4);
    return;
  }
  // Boden
  ctx.fillStyle = st === 'stone' ? patt(ctx, 'stoneFloor') : st === 'mud' ? '#b4906a' : patt(ctx, 'dirtFloor'); ctx.fillRect(X, Y, Wd, Hd);
  if (st === 'mud') { ctx.fillStyle = 'rgba(90,60,30,.18)'; for (let i = 0; i < Hd; i += 16) ctx.fillRect(X, Y + i, Wd, 1); for (let i = 0; i < Wd; i += 16) ctx.fillRect(X + i, Y, 1, Hd); }
  // Einrichtung
  const B = bedsOf(h), bp = BED_PAL[st === 'hut' ? 0 : st === 'mud' ? 1 : 2], bed = pxCanvas('bed' + st, BED_PX, bp);
  const fu = h.furn === undefined ? 99 : h.furn; // Einrichtung entsteht Stück für Stück: Feuerstelle, Betten, Matten, Hausrat
  for (let i = 0; i < 4; i++) if (fu >= 2 + i) ctx.drawImage(bed, B[i][0] * TS - 6, B[i][1] * TS - 8);
  const mat = pxCanvas('mat', MAT_PX, FURN_PAL); if (fu >= 6) ctx.drawImage(mat, B[4][0] * TS - 5, B[4][1] * TS - 3); if (fu >= 7) ctx.drawImage(mat, B[5][0] * TS - 5, B[5][1] * TS - 3);
  // Feuerstelle in der Mitte
  const fx = dx, fy = Y + Hd * 0.52; if (fu >= 1) { ctx.fillStyle = '#5a5650'; for (let i = 0; i < 8; i++) ctx.fillRect(fx + Math.cos(i * 0.785) * 5 - 1.5, fy + Math.sin(i * 0.785) * 4 - 1.5, 3, 3);
  ctx.fillStyle = '#2a201a'; ctx.fillRect(fx - 3, fy - 2, 6, 4); if (isNight() || seasonNow() === 3) { ctx.fillStyle = '#ff8a3a'; ctx.fillRect(fx - 2, fy - 1, 4, 2); ctx.fillStyle = '#ffd27a'; ctx.fillRect(fx - 1, fy - 1 - (Math.floor(FT * 6) % 2), 2, 1); } }
  if (fu >= 7) {
  if (TK(T, 'toepfern')) ctx.drawImage(pxCanvas('pots', POTS_PX, FURN_PAL), X + 18, Y + 11);
  if (TK(T, 'weben')) ctx.drawImage(pxCanvas('loom', LOOM_PX, FURN_PAL), X + Wd - 30, Y + 10);
  else if (TK(T, 'mahlstein')) ctx.drawImage(pxCanvas('quern', QUERN_PX, FURN_PAL), X + Wd - 28, Y + 11);
  if (st !== 'hut') ctx.drawImage(pxCanvas('shelf', SHELF_PX, FURN_PAL), dx - 7, Y + 10);
  }
  // Wände: hinten mit sichtbarer Wandfläche, seitlich und vorne als Mauerkrone, Tür nach Süden
  const wallFace = (x, y, w, hh) => { if (st === 'mud') brick(x, y, w, hh, '#b8925c', '#9c7a4a'); else { ctx.fillStyle = patt(ctx, st === 'stone' ? 'cobble' : 'bark'); ctx.fillRect(x, y, w, hh); } };
  wallFace(X, Y, Wd, 9); ctx.fillStyle = st === 'mud' ? '#d4b07a' : st === 'stone' ? '#8a8a90' : '#5a3d22'; ctx.fillRect(X, Y - 3, Wd, 3);
  const cap = st === 'mud' ? '#d4b07a' : st === 'stone' ? '#8a8a90' : '#6a4a2a', side = st === 'mud' ? '#a8844f' : st === 'stone' ? '#6a6a72' : '#4a3020';
  ctx.fillStyle = side; ctx.fillRect(X, Y - 3, 3, Hd + 3); ctx.fillRect(X + Wd - 3, Y - 3, 3, Hd + 3);
  ctx.fillStyle = side; ctx.fillRect(X, Y + Hd - 3, door - X, 4); ctx.fillRect(door + TS, Y + Hd - 3, X + Wd - door - TS, 4);
  ctx.fillStyle = cap; ctx.fillRect(X, Y + Hd - 4, door - X, 1); ctx.fillRect(door + TS, Y + Hd - 4, X + Wd - door - TS, 1);
  ctx.fillStyle = st === 'mud' ? '#8a6a44' : '#4a3020'; ctx.fillRect(door - 1, Y + Hd - 6, 2, 7); ctx.fillRect(door + TS - 1, Y + Hd - 6, 2, 7); // Türpfosten
  if (st === 'hut') { ctx.fillStyle = '#5a3d22'; for (let i = 2; i < Hd; i += 7) { ctx.fillRect(X - 1, Y + i, 5, 1); ctx.fillRect(X + Wd - 4, Y + i, 5, 1); } }
  ctx.fillStyle = T.col; ctx.fillRect(X + Wd - 9, Y - 6, 6, 3);
}
function drawStoreLot(T) {
  const S = T.storehouse, X = S.lx * TS, Y = S.ly * TS, Wd = S.w * TS, Hd = S.h * TS;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X + 3, Y + 4, Wd, Hd);
  if (roofView()) { ctx.fillStyle = patt(ctx, 'plank2'); ctx.fillRect(X, Y, Wd, Hd); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X, Y + Hd / 2, Wd, Hd / 2); ctx.fillStyle = '#4a3424'; ctx.fillRect(X, Y + Hd / 2 - 1, Wd, 2); ctx.fillStyle = T.col; ctx.fillRect(X + 2, Y - 3, 8, 3); return; }
  ctx.fillStyle = patt(ctx, 'plank'); ctx.fillRect(X, Y, Wd, Hd);
  const n = Math.min(16, Math.ceil(T.store.food / 50));
  for (let i = 0; i < n; i++) tex(ctx, i % 3 === 2 ? 'crate2' : 'crate', X + 6 + (i % 4) * 14, Y + 12 + Math.floor(i / 4) * 12, 12, 12);
  drawItems(T, X + 5, Y + Hd - 30);
  if (TK(T, 'zaehlsteine')) { ctx.fillStyle = '#8a5a34'; ctx.beginPath(); ctx.arc(X + Wd - 9, Y + Hd - 10, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#c8a070'; for (let i = 0; i < 5; i++) ctx.fillRect(X + Wd - 12 + (i % 3) * 2, Y + Hd - 12 + Math.floor(i / 3) * 2, 1, 1); }
  if (TK(T, 'schrift') || TK(T, 'rationen')) { const c = pxCanvas('tablet', TABLET_PX, CAMP_PAL); ctx.drawImage(c, X + 6, Y + Hd - 12); if (TK(T, 'schrift')) ctx.drawImage(c, X + 14, Y + Hd - 12); }
  if (TK(T, 'siegel')) { ctx.fillStyle = '#b5482e'; ctx.fillRect(X + 7, Y + 13, 2, 2); ctx.fillRect(X + 21, Y + 13, 2, 2); }
  ctx.fillStyle = patt(ctx, 'barkDark'); ctx.fillRect(X, Y, Wd, 8); ctx.fillRect(X, Y, 3, Hd); ctx.fillRect(X + Wd - 3, Y, 3, Hd); ctx.fillRect(X, Y + Hd - 3, 2 * TS, 3); ctx.fillRect(X + 3 * TS, Y + Hd - 3, Wd - 3 * TS, 3);
  ctx.fillStyle = T.col; ctx.fillRect(X + 2, Y - 3, 8, 3);
}
function drawPen(R) {
  const X = R.x0 * TS, Y = R.y0 * TS, Wd = R.w * TS, Hd = R.h * TS;
  ctx.fillStyle = 'rgba(120,150,60,.25)'; ctx.fillRect(X, Y, Wd, Hd);
  ctx.fillStyle = '#7a5530';
  const rail = (x, y, w, h) => ctx.fillRect(x, y, w, h);
  rail(X, Y + 2, Wd, 2); rail(X, Y + 2, 2, Hd - 2); rail(X + Wd - 2, Y + 2, 2, Hd - 2); rail(X, Y + Hd - 2, Wd / 2 - 8, 2); rail(X + Wd / 2 + 8, Y + Hd - 2, Wd / 2 - 8, 2);
  ctx.fillStyle = '#4a3420'; for (let x = 0; x <= R.w; x++) for (const yy of [0, R.h]) { if (yy === R.h && Math.abs(x - R.w / 2) < 0.6) continue; ctx.fillRect(X + x * TS - 1.5, Y + yy * TS - 2, 3, 6); }
  for (let y = 1; y < R.h; y++) { ctx.fillRect(X - 1.5, Y + y * TS - 2, 3, 6); ctx.fillRect(X + Wd - 1.5, Y + y * TS - 2, 3, 6); }
  ctx.fillStyle = '#c8a860'; ctx.fillRect(X + 6, Y + 8, 10, 6); ctx.fillStyle = '#a8884a'; ctx.fillRect(X + 6, Y + 8, 10, 1);
}
function drawTownWall(T) {
  const WL = townWall(T); if (!WL) return; const per = WL.tiles, isWall = (T.bld?.wall || 0) > 0;
  const prog = isWall ? Math.min(1, T.bld.wall / BUILD_NEED.wall) : Math.min(1, (T.pal || 0) / 24), n = Math.round(per.length * prog);
  for (let k = 0; k < n; k++) {
    const [x, y, o] = per[k], X = x * TS, Y = y * TS;
    if (isWall) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X + 2, Y + 12, 16, 5);
      if (o === 'h') { ctx.fillStyle = '#d4b07a'; ctx.fillRect(X, Y - 2, 16, 6); brick(X, Y + 4, 16, 10, '#b8925c', '#9c7a4a'); if ((x + y) % 2 === 0) { ctx.fillStyle = '#d4b07a'; ctx.fillRect(X + 2, Y - 6, 6, 4); ctx.fillStyle = '#a8844f'; ctx.fillRect(X + 2, Y - 6, 6, 1); } }
      else { ctx.fillStyle = '#d4b07a'; ctx.fillRect(X + 3, Y - 4, 10, 6); brick(X + 3, Y + 2, 10, 14, '#b8925c', '#9c7a4a'); ctx.fillStyle = '#a8844f'; ctx.fillRect(X + 3, Y - 4, 1, 20); }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X + 2, Y + 11, 16, 4);
      const post = (px, py) => { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(px, py, 3, 14); ctx.fillStyle = '#8a6440'; ctx.fillRect(px, py, 1, 14); ctx.fillStyle = '#c8a878'; ctx.fillRect(px, py - 2, 3, 2); ctx.fillStyle = '#4a3420'; ctx.fillRect(px + 1, py - 3, 1, 1); };
      if (o === 'h') { for (let i = 0; i < 4; i++) post(X + i * 4 + 1, Y - 4); ctx.fillStyle = '#5a3d22'; ctx.fillRect(X, Y + 3, 16, 1); }
      else { for (let i = 0; i < 4; i++) post(X + 6 + (i % 2), Y - 6 + i * 4); ctx.fillStyle = '#5a3d22'; ctx.fillRect(X + 7, Y - 4, 1, 18); }
    }
  }
  // Torpfosten
  if (n > per.length * 0.4) for (const g of WL.gates) { const c = isWall ? '#d4b07a' : '#8a6440';
    if (g[2] === 'n' || g[2] === 's') { const Y = Math.floor(g[1]) * TS; for (const X of [(g[0] - 1) * TS - 3, (g[0] + 1) * TS - 1]) { ctx.fillStyle = isWall ? '#a8844f' : '#4a3420'; ctx.fillRect(X, Y - 10, 4, 24); ctx.fillStyle = c; ctx.fillRect(X, Y - 10, 4, 2); } }
    else { const X = Math.floor(g[0]) * TS + 6; for (const Y of [(g[1] - 1) * TS - 4, (g[1] + 1) * TS - 2]) { ctx.fillStyle = isWall ? '#a8844f' : '#4a3420'; ctx.fillRect(X, Y - 6, 4, 14); ctx.fillStyle = c; ctx.fillRect(X, Y - 6, 4, 2); } } }
}
function drawStorehouse(px, py, T) {
  ctx.save(); ctx.translate(px, py);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-17, -12, 36, 28);
  ctx.fillStyle = patt(ctx, 'plank'); ctx.fillRect(-18, -14, 36, 28);
  ctx.strokeStyle = patt(ctx, 'barkDark'); ctx.lineWidth = 4; ctx.strokeRect(-18, -14, 36, 28);
  const n = Math.min(12, Math.ceil(T.store.food / 60));
  for (let i = 0; i < n; i++) { const x = -14 + (i % 4) * 7, y = -10 + Math.floor(i / 4) * 7; tex(ctx, i % 3 === 2 ? 'crate2' : 'crate', x, y, 6, 6); }
  ctx.fillStyle = patt(ctx, 'plank'); ctx.fillRect(-4, 12, 8, 4);
  ctx.fillStyle = T.col; ctx.fillRect(-18, -15.5, 8, 3);
  ctx.restore();
}
// Häuser je nach Epoche: Steinzeit = Äste und Rinde, Steinbau = Feldstein. (Ziegel, Bretter usw. liegen für später bereit.)
const HOUSE_STYLE = {
  sticks: { floor: 'dirtFloor', wall: 'bark', wallW: 3, bed: 'hay', sticks: true },
  stone:  { floor: 'hay', wall: 'cobble', wallW: 4.5, bed: 'hay' },
  // spätere Epochen (noch nicht erreichbar):
  timber: { floor: 'plank', wall: 'plank2', wallW: 4, bed: 'hay' },
  brick:  { floor: 'planks3', wall: 'brick', wallW: 4, bed: 'hay' },
};
function drawHut(px, py, rot, col, stone) {
  const st = HOUSE_STYLE[stone ? 'stone' : 'sticks'];
  ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-14, -10, 32, 26);
  ctx.fillStyle = patt(ctx, st.floor); ctx.fillRect(-16, -12, 32, 24);
  ctx.strokeStyle = patt(ctx, st.wall); ctx.lineWidth = st.wallW; ctx.strokeRect(-16, -12, 32, 24);
  if (st.sticks) { ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 0.8; for (let i = -14; i < 16; i += 6) { ctx.beginPath(); ctx.moveTo(i, -14.5); ctx.lineTo(i + 2, -9.5); ctx.moveTo(i + 1, 9.5); ctx.lineTo(i + 3, 14.5); ctx.stroke(); } }
  ctx.fillStyle = patt(ctx, st.floor); ctx.fillRect(-4, 9, 8, 6); // Eingang
  tex(ctx, st.bed, -13, -9, 10, 7); ctx.fillStyle = '#9b7a55'; ctx.fillRect(-12, -8, 4, 5); // Fellbett
  tex(ctx, st.bed, 3, -9, 10, 7); ctx.fillStyle = '#9b7a55'; ctx.fillRect(4, -8, 4, 5);
  ctx.fillStyle = col; ctx.fillRect(-16, -14, 6, 3);
  ctx.restore();
}
function drawAnimal(a, px, py, detail) {
  const dir = a.dir || 1;
  ctx.save(); ctx.translate(px, py); ctx.scale(dir, 1);
  if (ANIM_PX[a.k]) { const c = animalCanvas(a.k, !a.tribe); ctx.drawImage(c, -c.width / 2, -c.height + 3); ctx.restore(); return; }
  if (a.k === 'deer') {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(1, 2, 6, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9a6a3c'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.3, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -1.5, 2.4, 1.8, 0, 0, 7); ctx.fill();
    if (detail) { ctx.strokeStyle = '#5b3e22'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(5, -6); ctx.moveTo(6.5, -3); ctx.lineTo(8, -6); ctx.stroke(); ctx.fillStyle = '#f2e6d0'; ctx.beginPath(); ctx.arc(-5.5, 0, 1.2, 0, 7); ctx.fill(); }
  } else if (a.k === 'goat') {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(1, 2, 4, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = a.tribe ? '#e8e2d4' : '#b9ab92'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -1, 1.8, 1.4, 0, 0, 7); ctx.fill();
    if (detail) { ctx.strokeStyle = '#6b5a45'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(4, -2); ctx.quadraticCurveTo(3, -4.5, 1.5, -4); ctx.stroke(); }
  } else if (a.k === 'horse') {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(1, 2, 7.5, 3.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = (a.id % 3) ? '#6e4a2e' : '#3e2f25'; ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 3.6, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7.5, -2, 3, 1.9, -0.3, 0, 7); ctx.fill();
    if (detail) { ctx.fillStyle = '#1e1712'; ctx.fillRect(2, -3.6, 5, 1.3); ctx.fillRect(-9, -0.6, 2.5, 1.4); }
  } else {
    const dog = !!a.owner;
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(1, 2, 5, 2.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = dog ? '#8c8073' : '#77787a'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -0.8, 2.3, 1.7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-8.5, -1.5); ctx.lineTo(-5, 1); ctx.fill();
    if (dog) { const o = NPC.get(a.owner); if (o) { ctx.fillStyle = tribeOf(o)?.col || '#fff'; ctx.fillRect(3.5, -1.5, 1.2, 3); } }
  }
  ctx.restore();
}
function drawNpc(n, px, py, selected, detail) {
  const age = ageY(n), T = tribeOf(n), a = n.act;
  const child = age < 13, sc = age < 4 ? 0.8 : 1;
  // Blickrichtung aus der Bewegung
  const mdx = n.px === undefined ? 0 : n.x - n.px, mdy = n.py === undefined ? 0 : n.y - n.py;
  const moving = Math.abs(mdx) + Math.abs(mdy) > 0.03;
  if (moving) { if (Math.abs(mdx) > Math.abs(mdy) * 1.2) { n.face = 'side'; n.flip = mdx < 0; } else n.face = mdy < 0 ? 'up' : 'down'; }
  else if (a && a.stage >= 1 && (WORK_ACTS[a.type] || TALK_ACTS[a.type])) { if (n.face === 'up') n.face = 'down'; }
  const look = n.sex === 'm' ? n.id % 2 : 2 + (n.id % 2);
  const cloth = n.tools.kleidung > 0 ? (n.clothType === 'woven' || n.clothType === 'linen' || n.clothType === 'wool' ? n.clothType : (seasonNow() >= 2 || seasonNow() === 0 && dayInSeason(dayNum()) < 8 ? 'fur' : 'loin')) : 'loin';
  const sheet = spriteSheet(look, child, cloth, age > 55, cloth !== 'fur' && cloth !== 'loin' && T ? T.col : null);
  const fr = spriteFrame(n, moving, FT);
  const dir = n.face === 'side' ? (n.flip ? -1 : 1) : (n.dir || 1);
  ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
  if (T && detail && riding(n, T)) { const hc = animalCanvas('horse'); ctx.save(); if (n.face === 'side' ? n.flip : (n.dir || 1) < 0) ctx.scale(-1, 1); ctx.drawImage(hc, -hc.width / 2, -hc.height + 4); ctx.restore(); ctx.translate(0, -7); }
  // Sippenfarbe als Fleck unter den Füßen
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 2.5, 5, 2, 0, 0, 7); ctx.fill();
  if (T && detail) { ctx.strokeStyle = T.col; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 2.5, 5, 2, 0, 0, 7); ctx.stroke(); }
  if (selected) { ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 2.5, 8, 3.5, 0, 0, 7); ctx.stroke(); }
  if (fr.sleep) {
    if (fr.hurt && !houseAt(n.x, n.y)) { ctx.fillStyle = 'rgba(120,10,10,.55)'; ctx.beginPath(); ctx.ellipse(2, 3, 7, 3, 0, 0, 7); ctx.fill(); }
    else if (!houseAt(n.x, n.y)) { ctx.fillStyle = n.tools.kleidung > 0 ? '#8a6640' : '#7a6a4e'; ctx.fillRect(-8, -3, 16, 7); } // Schlaflager
    ctx.drawImage(sheet, 0, 48, 16, 16, -8, -8, 16, 16);
    if (fr.hurt) { ctx.fillStyle = '#efe6cc'; ctx.fillRect(-6, -4, 3, 2); ctx.fillStyle = '#b5302a'; ctx.fillRect(-5, -4, 1, 1); }
    else if (detail && Math.floor(FT * 1.2 + n.id) % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '6px system-ui'; ctx.fillText('z', 6, -6 - (FT * 4 % 3)); }
    ctx.restore(); return;
  }
  const tool = detail ? heldTool(n, a) : null;
  const drawTool = () => {
    if (!tool) return;
    const T = TOOLS[tool], cv = toolCanvas(tool), swing = fr.col === 4 ? -0.7 : fr.col === 5 ? 0.35 : 0;
    const hx = n.face === 'side' ? 3 : n.face === 'up' ? -4 : 5, hy = (child ? -2 : -3) + (fr.col === 4 ? -3 : 0);
    ctx.save(); ctx.translate(hx, hy); if (tool !== 'korb' && tool !== 'stab' && tool !== 'kraeuter') ctx.rotate(swing);
    ctx.drawImage(cv, -T.g[0], -T.g[1]); ctx.restore();
  };
  if (detail && T) {
    const wt = W.t[(n.y | 0) * C.MW + (n.x | 0)];
    if (wt <= T_SHALLOW) { const sail = TK(T, 'segelboot'), b = sail ? pxCanvas('reed', REED_PX, BOAT_PAL) : TK(T, 'einbaum') ? pxCanvas('dug', DUGOUT_PX, BOAT_PAL) : pxCanvas('raft', RAFT_PX, BOAT_PAL);
      ctx.save(); if (n.flip) ctx.scale(-1, 1); ctx.drawImage(b, -b.width / 2, -1); if (sail) { ctx.fillStyle = '#6a4424'; ctx.fillRect(-1, -20, 1, 20); ctx.fillStyle = '#efe6cc'; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(9, -4); ctx.lineTo(0, -4); ctx.fill(); } ctx.restore(); }
    if (a && (a.type === 'visit' || a.type === 'diplo') && moving) {
      if (TK(T, 'wagen')) { const c = pxCanvas('cart', CART_PX, { o: '#2a1e1a', w: '#9a6a3c', W: '#6a4424', r: '#8a6a44', R: '#4a3424' }); ctx.save(); if (n.flip) ctx.scale(-1, 1); ctx.drawImage(c, -c.width - 4, -6); ctx.restore(); }
      else if (TK(T, 'esel')) { const d = animalCanvas('donkey'); ctx.save(); if (n.flip) ctx.scale(-1, 1); ctx.drawImage(d, -d.width - 2, -d.height + 3); ctx.fillStyle = '#8a6a44'; ctx.fillRect(-d.width + 3, -d.height + 5, 7, 4); ctx.restore(); }
    }
    if (a && a.type === 'farm' && a.stage >= 1 && a.job !== 'harvest' && TK(T, 'ochsen') && n.id % 2 === 0) { const o = animalCanvas('cattle'); ctx.save(); if (n.flip) ctx.scale(-1, 1); ctx.drawImage(o, 4, -o.height + 2); ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(1, -1); ctx.stroke(); ctx.restore(); }
  }
  if (fr.fight || (a && a.wk)) { const ph = (FT * (fr.fight ? 6 : 5) + n.id * 0.37) % 1, l = ph < 0.5 ? ph * 2 : (1 - ph) * 2; ctx.translate((n.face === 'side' ? (n.flip ? -1 : 1) : 0) * l * (fr.fight ? 2.2 : 0.8), (n.face === 'down' ? 1 : n.face === 'up' ? -1 : 0) * l * (fr.fight ? 1.5 : 0.5)); }
  if (n.hitT && W.tick - n.hitT <= 1 && Math.floor(FT * 20) % 2 === 0) ctx.globalAlpha = 0.55;
  ctx.save(); if (n.face === 'side' && n.flip) ctx.scale(-1, 1);
  if (n.face === 'up') drawTool(); // von hinten: Werkzeug verdeckt
  ctx.drawImage(sheet, fr.col * 16, fr.row * 16, 16, 16, -8, -13, 16, 16);
  if (n.face !== 'up') drawTool();
  ctx.restore(); ctx.globalAlpha = 1;
  if (n.hitT && W.tick - n.hitT <= 1) { ctx.fillStyle = 'rgba(220,40,30,.85)'; ctx.fillRect(-2, -9, 2, 2); ctx.fillRect(1, -6, 1, 1); }
  if (n.sick > 0) { ctx.fillStyle = 'rgba(120,180,80,.35)'; ctx.fillRect(-4, -12, 8, 6); }
  // Oberhaupt: Federschmuck
  const top = child ? -9 : -13;
  if (!n.copper && !child && T && TK(T, 'schmuck') && (n.prestige > 22 || ((n.sex === 'f' || !n.partner) && n.id % 3 !== 0))) { const ny = top + 7; ctx.fillStyle = '#efe6cc'; ctx.fillRect(-3, ny, 1, 1); ctx.fillRect(2, ny, 1, 1); ctx.fillStyle = '#b5482e'; ctx.fillRect(-1, ny + 1, 2, 1); }
  if (T && a && (a.type === 'raid' || a.type === 'defend') && TK(T, 'heer') && !child) { ctx.fillStyle = '#c8783a'; ctx.fillRect(-4, top - 1, 8, 3); ctx.fillStyle = '#e8a060'; ctx.fillRect(-3, top - 1, 6, 1); ctx.fillStyle = '#8a6440'; ctx.beginPath(); ctx.arc(n.face === 'side' && n.flip ? 5 : -5, top + 9, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = '#c8783a'; ctx.fillRect((n.face === 'side' && n.flip ? 5 : -5) - 1, top + 8, 2, 2); }
  if (n.copper && !child) { const ny = top + 7; ctx.fillStyle = '#d0803e'; ctx.fillRect(-3, ny, 1, 1); ctx.fillRect(-1, ny + 1, 2, 1); ctx.fillRect(2, ny, 1, 1); ctx.fillStyle = '#f0b070'; ctx.fillRect(0, ny + 1, 1, 1); }
  if (T && T.leader === n.id && T.gov === 'koenig') { ctx.fillStyle = '#e0b03c'; ctx.fillRect(-3, top - 2, 6, 2); ctx.fillRect(-3, top - 4, 1, 2); ctx.fillRect(0, top - 4, 1, 2); ctx.fillRect(2, top - 4, 1, 2); ctx.fillStyle = '#b5482e'; ctx.fillRect(-1, top - 2, 1, 1); }
  else if (T && T.leader === n.id) { ctx.fillStyle = '#e0b03c'; ctx.fillRect(-1, top - 3, 2, 3); ctx.fillStyle = '#b5482e'; ctx.fillRect(1, top - 4, 1, 3); }
  // Tragen
  const carry = n.inv.food + n.inv.meat;
  if (carry > 0 && detail) { const bx = n.face === 'up' ? 0 : -dir * 4, by = n.face === 'up' ? -6 : -4; ctx.fillStyle = n.tools.korb > 0 ? '#b8935a' : '#7a5a34'; ctx.fillRect(bx - 2.5, by, 5, 4); if (n.inv.meat) { ctx.fillStyle = '#a3311f'; ctx.fillRect(bx - 1.5, by, 3, 2); } else { ctx.fillStyle = '#c23b4a'; ctx.fillRect(bx - 1.5, by, 1, 1); ctx.fillRect(bx + 0.5, by + 1, 1, 1); } }
  if (n.inv.wood > 0 && detail) { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-5, -5, 10, 1.5); ctx.fillRect(-4, -3.5, 8, 1.5); }
  if (n.carryFire) drawFlame(dir * 6, -8, 0.35);
  n._torch = detail !== null && typeof torchOf === 'function' && torchOf(n);
  if (n._torch && !n.carryFire) { const tx = n.face === 'side' ? (n.flip ? -5 : 5) : -5; ctx.fillStyle = '#5a3d22'; ctx.fillRect(tx - 0.5, -11, 1.5, 9); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(tx - 1, -12, 2.5, 2); drawFlame(tx + 0.3, -13, 0.28); }
  if (a && a.loot > 0 && detail) { ctx.fillStyle = '#8a6a44'; ctx.beginPath(); ctx.ellipse(-dir * 4, -6, 4, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-dir * 4 - 1, -10, 2, 2); }
  if (a && a.type === 'bury' && a.stage === 1 && detail) { const c = (W.corpses || []).find(c => c.id === a.corpse); if (c) { ctx.save(); ctx.translate(0, -12); ctx.scale(0.85, 0.85); drawCorpse(c, 0, 0, true); ctx.restore(); } }
  // Status-Symbol
  if (detail && a) {
    let sym = null;
    if (a.type === 'experiment' && a.stage === 1) sym = '?'; else if (a.type === 'social' && a.stage === 1) sym = '…'; else if ((a.type === 'ritual' || a.type === 'preach') && a.stage === 1) sym = '✦'; else if (n.injured > 0) sym = '+';
    if (sym) { ctx.font = 'bold 6px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = sym === '+' ? '#ff6b6b' : '#fff'; ctx.fillText(sym, 0, top - 4); }
  }
  ctx.restore();
}
function drawHeld(n, a, dir) {
  const t = a.type;
  ctx.save(); ctx.translate(dir * 5.2, 1);
  if ((t === 'hunt' || t === 'raid') && n.tools.bogen > 0) { ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(dir * 1, -2, 5, -1.3, 1.3); ctx.stroke(); ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(dir * 1 + Math.cos(-1.3) * 5, -2 + Math.sin(-1.3) * 5); ctx.lineTo(dir * 1 + Math.cos(1.3) * 5, -2 + Math.sin(1.3) * 5); ctx.stroke(); }
  else if ((t === 'hunt' || t === 'raid' || t === 'fish') && n.tools.speer > 0) { ctx.strokeStyle = '#7a5532'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-dir * 2, 4); ctx.lineTo(dir * 7, -8); ctx.stroke(); ctx.fillStyle = '#8d8a85'; ctx.beginPath(); ctx.moveTo(dir * 7, -8); ctx.lineTo(dir * 8.8, -11); ctx.lineTo(dir * 6.2, -9.4); ctx.fill(); }
  else if (t === 'hunt' || t === 'raid') { ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(dir * 5, -5); ctx.stroke(); }
  else if ((t === 'wood' || t === 'build' || t === 'craft') && n.tools.faustkeil > 0) { const sw = a.stage >= 1 ? Math.sin(FT * 12) * 0.7 : 0; ctx.rotate(sw * dir); ctx.fillStyle = '#7d7a75'; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(dir * 3, -4); ctx.lineTo(dir * 3.5, 0); ctx.fill(); }
  else if (t === 'gather' && n.tools.korb > 0) { ctx.strokeStyle = '#b8935a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, 7); ctx.stroke(); }
  else if (t === 'paint' && a.stage === 1) { ctx.fillStyle = '#b5482e'; ctx.fillRect(0, -2, 1.2, 3); }
  ctx.restore();
}
function mix(c1, c2, t) { const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; const a = p(c1), b = p(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; }
function drawMini() {
  const s = mini.width / C.MW;
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(miniTerrain, 0, 0, mini.width, mini.height);
  if (ui.territory && terrC) { mctx.globalAlpha = 1; mctx.drawImage(terrC, 0, 0, mini.width, mini.height); mctx.drawImage(terrC, 0, 0, mini.width, mini.height); }
  for (const T of W.tribes) if (T.alive) { mctx.fillStyle = T.col; mctx.beginPath(); mctx.arc(T.cx * s, T.cy * s, 3.5, 0, 7); mctx.fill(); mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.stroke(); }
  const [x0, y0] = s2w(0, 0), [x1, y1] = s2w(VW, VH);
  mctx.strokeStyle = '#fff'; mctx.lineWidth = 1; mctx.strokeRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
}

// ---------------------------------------------------------------- Simulation
let lastT = performance.now(), simLoad = 0;
function frame(t) {
  const dt = Math.min(0.25, (t - lastT) / 1000); lastT = t;
  if (!SIM.ready || !W) { requestAnimationFrame(frame); return; }
  ALPHA = SIM.cur ? Math.min(1, SIM.cur.frac + (ui.speed ? (performance.now() - SIM.lastFrameT) / 1000 * TPS * SPEEDS[ui.speed] : 0)) : 1;
  if (cam.follow) { const n = NPC.get(cam.follow); if (n) { const [x, y] = lerpPos(n); cam.x += (x * TS - cam.x) * 0.15; cam.y += (y * TS - cam.y) * 0.15; } else cam.follow = 0; }
  const t0 = performance.now(); draw(t); const t1 = performance.now(); PERF.note('draw', t1 - t0);
  if (t - ui.lastInspect > 400) { ui.lastInspect = t; updateTop(); refreshInspector(); if (ui.tab === 'tribes' || ui.tab === 'tech' || ui.tab === 'stats') renderSide(false); PERF.note('panel', performance.now() - t1); }
  PERF.frame(t);
  requestAnimationFrame(frame);
}
function setSpeed(i) { ui.speed = i; if (SIM.worker) simCmd('speed', { tps: TPS * SPEEDS[i] }); document.querySelectorAll('#speeds button').forEach((b, k) => b.classList.toggle('on', k === i)); }
function updateTop() {
  const h = hourNow(), hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  $('date').innerHTML = `<b>Jahr ${yearNow()}</b> · ${SEASONS[seasonNow()]} · Tag ${dayInSeason(dayNum()) + 1}${seasonNow() === 3 && W.hardWinter ? ' · <span style="color:#9fc3ff">strenger Winter</span>' : ''} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const alive = W.tribes.filter(t => t.alive).length;
  const want = TPS * SPEEDS[ui.speed]; $('popinfo').textContent = `${W.npcs.length} Menschen · ${alive} Sippen${SIM.cores > 1 ? ` · ${SIM.cores} Regionen parallel` : ''}${ui.speed >= 5 && SIM.tps < want * 0.8 ? ` · Simulation am Limit (${Math.round(SIM.tps / TPS)}×)` : ''}`;
}

// ---------------------------------------------------------------- Chronik & Toasts
HOOKS.onChronicle = e => {
  if (ui.tab === 'chron' && e.imp >= ui.chronFilter) prependChron(e);
  if (e.imp >= 3 && !e.quiet) {
    toast(e);
    if (ui.pauseOnDiscovery && e.tech && W.discovered[e.tech] && W.discovered[e.tech].t === e.t) { setSpeed(0); }
  }
};
function chronHtml(e) { return `<div class="chron i${e.imp}" data-npc="${e.npc || ''}" data-tribe="${e.tribe || ''}"><div class="d">${dateStr(e.t)}</div>${esc(e.text)}</div>`; }
function prependChron(e) { const box = $('chronlist'); if (!box) return; box.insertAdjacentHTML('afterbegin', chronHtml(e)); while (box.children.length > 400) box.lastChild.remove(); }
function toast(e) {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = `<div class="small">${dateStr(e.t)}</div>${esc(e.text)}`;
  el.onclick = () => gotoRef(e.npc, e.tribe);
  $('toasts').prepend(el); while ($('toasts').children.length > 2) $('toasts').lastChild.remove();
  setTimeout(() => el.remove(), 9000);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function gotoRef(npc, tribe) {
  npc = +npc; tribe = +tribe;
  const n = npc && NPC.get(npc);
  if (n) { select(n.id); centerOn(n.x, n.y); cam.z = Math.max(cam.z, 2); return; }
  const T = tribe && TRIBE.get(tribe);
  if (T) { selectTribe(T.id); centerOn(T.cx, T.cy); }
}

// ---------------------------------------------------------------- Seitenleiste
function vbar(i, v, ref) {
  const V = VALUES[i], p = Math.round(Math.abs(v) * 50), left = v < 0;
  const mark = ref !== undefined ? `<i style="position:absolute;left:${50 + ref * 50}%;top:-2px;bottom:-2px;width:2px;background:#fff8;border-radius:1px" title="Sitte der Sippe"></i>` : '';
  return `<div class="vrow"><span class="vl${left && Math.abs(v) > 0.15 ? ' on' : ''}">${V[1]}</span><span class="vb"><i style="left:${left ? 50 - p : 50}%;width:${p}%;background:${left ? '#6d8fbf' : '#d9a24a'}"></i>${mark}</span><span class="vr${!left && Math.abs(v) > 0.15 ? ' on' : ''}">${V[2]}</span></div>`;
}
function renderSide(full = true) {
  const b = $('sidebody'); const tab = ui.tab;
  if (tab === 'chron') {
    if (!full) return;
    b.innerHTML = `<h3>Chronik</h3><div class="filters">
      <button data-f="3" class="${ui.chronFilter === 3 ? 'on' : ''}">Wichtiges</button>
      <button data-f="2" class="${ui.chronFilter === 2 ? 'on' : ''}">Mehr</button>
      <button data-f="1" class="${ui.chronFilter === 1 ? 'on' : ''}">Alles</button></div><div id="chronlist"></div>`;
    const list = W.chron.filter(e => e.imp >= ui.chronFilter).slice(-300).reverse();
    $('chronlist').innerHTML = list.map(chronHtml).join('') || '<div class="small">Noch ist nichts Erzählenswertes geschehen.</div>';
    b.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { ui.chronFilter = +x.dataset.f; renderSide(); });
  } else if (tab === 'tribes') {
    const alive = W.tribes.filter(t => t.alive).sort((a, c) => c.members.length - a.members.length);
    const dead = W.tribes.filter(t => !t.alive);
    b.innerHTML = `<h3>Sippen</h3>` + alive.map(T => {
      const L = NPC.get(T.leader); const ks = TECH_IDS.filter(k => tribeKnows(T, k)).map(k => TECH[k].icon).join(' ');
      return `<div class="tribe" data-tribe="${T.id}"><span class="dot" style="background:${T.col}"></span><div style="flex:1"><b>${esc(T.name)}</b> <span class="small">· ${T.members.length} Köpfe</span><div class="small">${esc(govOf(T).name)} · ${L ? esc(leaderTitle(T, L)) + ': ' + esc(fullName(L)) : 'ohne Oberhaupt'}${T.fire.lit ? '' : ' · 🔥 erloschen'}</div><div class="small" style="color:var(--acc)">${esc(cultureTraits(T, 3).join(' · '))}</div><div>${ks}</div></div></div>`;
    }).join('') + (() => { const cnt = {}; for (const T of alive) cnt[T.gov] = (cnt[T.gov] || 0) + 1; return `<h3 style="margin-top:14px">Ordnungen der Welt</h3>` + Object.entries(GOV).map(([k, G]) => `<div class="small"${cnt[k] ? '' : ' style="opacity:.55"'}><b>${G.name}</b>${cnt[k] ? ` – ${cnt[k]} Sippe${cnt[k] > 1 ? 'n' : ''}` : G.later ? ` – erst mit ${G.later}` : ' – noch nirgends'}</div>`).join(''); })() + (dead.length ? `<div class="small" style="margin-top:10px">Untergegangen: ${dead.map(t => esc(t.name)).join(', ')}</div>` : '');
  } else if (tab === 'tech') {
    const known = TECH_IDS.filter(k => W.npcs.some(n => n.know[k])), lost = TECH_IDS.filter(k => W.discovered[k] && !known.includes(k));
    const near = TECH_IDS.filter(k => !known.includes(k) && TECH[k].req.every(r => known.includes(r)));
    b.innerHTML = `<h3>Wissen der Welt</h3><div class="row"><button id="opentree">🌳 Zivilisationsbaum öffnen</button></div>
      <div class="small" style="margin:8px 0">${known.length} von ${TECH_IDS.length} Entdeckungen sind bekannt${lost.length ? `, ${lost.length} wieder vergessen` : ''}. ${near.length} liegen gerade in Reichweite.</div>
      <h3>In Reichweite</h3>${near.map(k => { const best = (W.tprog || {})[k] || 0; return `<div class="tech" data-tk="${k}"><div class="n">${TECH[k].icon} ${TECH[k].name}</div>${TECH[k].condTxt ? `<div class="small">braucht: ${TECH[k].condTxt}</div>` : ''}<div class="p"><b style="width:${Math.min(100, best * 100).toFixed(0)}%"></b></div></div>`; }).join('') || '<div class="small">Nichts – erst muss anderes entdeckt werden.</div>'}`;
    $('opentree').onclick = () => openTree();
    b.querySelectorAll('[data-tk]').forEach(el => el.onclick = () => openTree(el.dataset.tk));
  } else if (tab === 'stats') {
    b.innerHTML = `<h3>Statistik</h3><canvas id="chart" width="330" height="200"></canvas><div class="small" id="statsum"></div><h3 style="margin-top:14px">Größte Sippen im Verlauf</h3><canvas id="chart2" width="330" height="180"></canvas>`;
    drawCharts();
  } else if (tab === 'world') {
    if (!full) return;
    b.innerHTML = `<h3>Welt</h3>
      <div class="sec"><div class="t">Fortschrittstempo</div>
      <input type="range" id="prog" min="0.25" max="4" step="0.25" value="${W.progress}" style="width:100%"><div class="small"><span id="progv"></span> – bestimmt, wie leicht Menschen auf neue Erkenntnisse kommen. 1 = zäh und glaubwürdig.</div></div>
      <div class="sec"><div class="t">Anzeige</div>
      <label class="cb"><input type="checkbox" id="pod" ${ui.pauseOnDiscovery ? 'checked' : ''}> Bei Erstentdeckungen anhalten</label>
      <label class="cb"><input type="checkbox" id="lbl" ${ui.labels ? 'checked' : ''}> Namen anzeigen (nah herangezoomt)</label>
      <label class="cb"><input type="checkbox" id="ter" ${ui.territory ? 'checked' : ''}> Reviere anzeigen</label>
      <label class="cb"><input type="checkbox" id="fpson" ${PERF.on ? 'checked' : ''}> FPS-Anzeige (Taste F)</label></div>
      <div class="sec"><div class="t">Speichern</div>
      <div class="row"><button id="sv">Speichern</button><button id="ld">Laden</button><button id="ex">Als Datei exportieren</button><button id="im">Datei importieren</button></div><div class="small" id="svmsg"></div>
      <input type="file" id="imf" accept=".json" style="display:none"></div>
      <div class="sec"><div class="t">Neue Welt</div>
      <div class="row">Seed <input id="seed" value="${Math.floor(Math.random() * 99999)}" style="width:90px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:4px"></div>
      <div class="row">Größe <select id="nsize"><option value="klein">Klein (10 × 7 km)</option><option value="mittel">Mittel (20 × 14 km)</option><option value="gross">Groß (35 × 24 km)</option><option value="riesig">Riesig (50 × 34 km)</option></select></div>
      <div class="row">Menschen <select id="npop"><option>150</option><option selected>300</option><option>500</option><option>800</option><option>1500</option><option>2500</option><option>4000</option></select> Sippen <select id="ntr"><option>6</option><option>8</option><option selected>10</option><option>14</option><option>24</option><option>40</option><option>70</option></select></div>
      <div class="small" id="sizehint"></div>
      <div class="row"><button id="nw">Neue Welt erschaffen</button></div>
      <div class="small">Aktuelle Welt: Seed ${W.seed} · ${C.MW} × ${C.MH} Felder</div></div>`;
    const pv = () => $('progv').textContent = '×' + (+$('prog').value).toFixed(2);
    pv(); $('prog').oninput = () => { W.progress = +$('prog').value; simCmd('progress', { v: W.progress }); pv(); };
    $('pod').onchange = e => ui.pauseOnDiscovery = e.target.checked;
    $('lbl').onchange = e => ui.labels = e.target.checked;
    $('ter').onchange = e => ui.territory = e.target.checked;
    $('fpson').onchange = e => PERF.toggle(e.target.checked);
    $('sv').onclick = () => simAsk('save').then(str => saveGame('autosave', str).then(ok => { $('svmsg').textContent = ok ? 'Gespeichert (' + dateStr(W.tick) + ').' : 'Speichern nicht möglich. Nutze „Als Datei exportieren“.'; }));
    $('ld').onclick = () => loadGame('autosave').then(s => { if (!s) { $('svmsg').textContent = 'Kein Spielstand gefunden.'; return; } loadWorld(s); $('svmsg').textContent = 'Geladen.'; });
    $('ex').onclick = async () => {
      const filename = `civarria-jahr${yearNow()}.json`, data = new Blob([await simAsk('save')], { type: 'application/json' });
      let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
      if (dl) { try { await dl.save({ filename, data }); $('svmsg').textContent = 'Datei gespeichert.'; } catch (err) { $('svmsg').textContent = err && err.code === 'declined' ? 'Abgebrochen.' : 'Export hier nicht möglich (' + (err && err.code || 'Fehler') + ').'; } return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = filename; a.click(); $('svmsg').textContent = 'Datei wird heruntergeladen.';
    };
    $('im').onclick = () => $('imf').click();
    $('imf').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(s => { try { loadWorld(s); $('svmsg').textContent = 'Importiert.'; } catch (err) { $('svmsg').textContent = 'Datei ungültig.'; } }); };
    $('nsize').value = W.size || 'klein';
    const SUG = { klein: [300, 10], mittel: [800, 24], gross: [1500, 40], riesig: [2500, 70] };
    const hint = () => { const s = SUG[$('nsize').value]; $('sizehint').textContent = `Empfohlen: ${s[0]} Menschen in ${s[1]} Sippen – weit verstreut, damit Kulturen getrennt voneinander entstehen.`; };
    $('nsize').onchange = () => { const s = SUG[$('nsize').value]; $('npop').value = s[0]; $('ntr').value = s[1]; hint(); }; hint();
    $('nw').onclick = () => { startWorld(+$('seed').value || 1, +$('npop').value, +$('ntr').value, $('nsize').value); };
  }
}
function drawCharts() {
  const c = $('chart'); if (!c) return; const g = c.getContext('2d'); const S = W.stats;
  g.clearRect(0, 0, c.width, c.height);
  const pts = S.length ? S : [{ y: 1, pop: W.npcs.length, deer: 0 }];
  const maxP = Math.max(50, ...pts.map(s => s.pop)) * 1.1, maxD = Math.max(50, ...pts.map(s => s.deer)) * 1.1;
  const X = i => 30 + i / Math.max(1, pts.length - 1) * (c.width - 40), Y = (v, m) => c.height - 22 - v / m * (c.height - 40);
  g.strokeStyle = '#33373e'; g.fillStyle = '#9a968c'; g.font = '10px system-ui';
  for (let k = 0; k <= 4; k++) { const y = Y(maxP * k / 4, maxP); g.beginPath(); g.moveTo(30, y); g.lineTo(c.width - 10, y); g.stroke(); g.fillText(Math.round(maxP * k / 4), 2, y + 3); }
  g.fillText('Jahr ' + (pts[0].y), 30, c.height - 6); g.fillText('Jahr ' + pts[pts.length - 1].y, c.width - 60, c.height - 6);
  const line = (key, m, col) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); pts.forEach((s, i) => { const y = Y(s[key], m); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); }); g.stroke(); };
  line('deer', maxD, '#9a6a3c'); line('pop', maxP, '#e0b03c');
  g.fillStyle = '#e0b03c'; g.fillText('■ Menschen', 36, 12); g.fillStyle = '#9a6a3c'; g.fillText('■ Hirsche (eigene Skala)', 110, 12);
  $('statsum').innerHTML = `Menschen: ${W.npcs.length} · Gestorben (erfasst): ${W.dead.length} · Bekannte Erkenntnisse: ${TECH_IDS.filter(k => W.npcs.some(n => n.know[k])).length} von ${TECH_IDS.length}`;
  const c2 = $('chart2'); const g2 = c2.getContext('2d'); g2.clearRect(0, 0, c2.width, c2.height);
  const top = W.tribes.filter(t => t.alive).sort((a, b) => b.members.length - a.members.length).slice(0, 6);
  const m2 = Math.max(10, ...pts.flatMap(s => top.map(t => s.tribes?.[t.id] || 0))) * 1.1;
  for (const T of top) { g2.strokeStyle = T.col; g2.lineWidth = 2; g2.beginPath(); let st = false; pts.forEach((s, i) => { const v = s.tribes?.[T.id]; if (v === undefined) { st = false; return; } const x = 30 + i / Math.max(1, pts.length - 1) * (c2.width - 40), y = c2.height - 10 - v / m2 * (c2.height - 20); st ? g2.lineTo(x, y) : g2.moveTo(x, y); st = true; }); g2.stroke(); }
  g2.font = '10px system-ui'; top.forEach((T, i) => { g2.fillStyle = T.col; g2.fillText('■ ' + T.name, 32 + (i % 2) * 150, 12 + Math.floor(i / 2) * 12); });
}

// ---------------------------------------------------------------- Inspektor
function select(id) { ui.sel = id; ui.selTribe = null; simCmd('sel', { id }); renderInspector(true); }
function selectTribe(id) { ui.selTribe = id; ui.sel = null; renderInspector(true); }
function closeInspector() { simCmd('sel', { id: 0 }); ui.sel = null; ui.selTribe = null; cam.follow = 0; $('insp').style.display = 'none'; }
let inspDrag = false;
function refreshInspector() { if (inspDrag) return; if (ui.sel || ui.selTribe) renderInspector(false); }
function bar(label, v, col) { return `<div class="bar"><span>${label}</span><i><b style="width:${clamp(v, 0, 100)}%;background:${col || (v < 25 ? '#d9644a' : v < 50 ? '#e0b03c' : '#7bbf6a')}"></b></i></div>`; }
function nameLink(id) { const n = NPC.get(id); if (n) return `<span class="link" data-npc="${id}">${esc(n.name)}</span>`; const d = W.dead.find(x => x.id === id); return d ? `<span class="small">${esc(d.name)} †</span>` : ''; }
function actText(n) {
  const a = n.act; if (!a) return 'überlegt, was zu tun ist';
  let t = ACT_TXT[a.type] || a.type;
  if (a.type === 'craft' && a.what) t = (a.stage === 1 ? 'besorgt Material für ' : 'fertigt ') + (CRAFT_TXT[a.what] || a.what) + (a.forStore ? ' für das Lager' : '');
  if (a.type === 'fetch' && a.what) t = 'holt ' + (ITEM_NAME[a.what] || a.what) + ' aus dem Lager';
  if (a.type === 'social' && a.with) { const m = NPC.get(a.with); if (m) t = 'unterhält sich mit ' + m.name; }
  if (a.type === 'sleep' && a.stage === 0) t = 'geht schlafen';
  if (a.type === 'farm') t = { new: 'bricht ein neues Feld auf', sow: 'sät auf dem Feld', tend: 'jätet und pflegt das Feld', harvest: 'erntet das Feld' }[a.job] || t;
  if (a.type === 'construct') t = a.what === 'store' ? 'baut am Vorratshaus' : 'setzt Pfähle für die Palisade';
  if (a.type === 'visit') { const O = TRIBE.get(a.target); if (O) t = 'besucht die ' + O.name; }
  if (a.type === 'watch') { const m = NPC.get(a.target); if (m) t = 'beobachtet ' + m.name + ' (' + (tribeOf(m)?.name || '?') + '), der im Revier herumstreift'; }
  if (a.type === 'diplo') { const O = TRIBE.get(a.target); if (O) t = (a.stage === 1 ? 'verhandelt mit den ' : 'reist als Gesandter zu den ') + O.name + ' (' + ({ nahrung: 'bittet um Nahrung', zugang: 'bittet um Zugang zum Land', frieden: 'bittet um Frieden', buendnis: 'bietet ein Bündnis an' }[a.kind] || '') + ')'; }
  if (a.type === 'experiment' && a.stage === 1) t = 'tüftelt herum und probiert Dinge aus';
  if (a.type === 'raid') { const R = W.raids.find(r => r.id === a.raid); const E = R && TRIBE.get(R.to); if (E) t = 'zieht gegen die ' + E.name + ' in den Kampf'; }
  if ((a.type === 'raid' || a.type === 'defend') && a.foe) { const f = NPC.get(a.foe); if (f) t = 'kämpft mit ' + f.name + (typeof weaponOf === 'function' ? ' – mit ' + WEAPONS[n.tools.bogen > 0 && dist(n.x, n.y, f.x, f.y) > 2.2 ? 'bogen' : weaponOf(n)].name : ''); }
  if (a.type === 'return' && a.loot) t = 'schleppt Beute heim';
  if (a.type === 'bury') { const c = (W.corpses || []).find(c => c.id === a.corpse); t = !c ? t : a.stage === 0 ? 'geht zum Leichnam von ' + c.name : a.stage === 1 ? (a.slot ? 'trägt ' + c.name + ' zum Totenacker' : 'trägt ' + c.name + ' aus dem Lager') : 'hebt ein Grab für ' + c.name + ' aus'; }
  if (a.type === 'build') { if (a.stage === 1) t = 'fällt einen Baum für den Hausbau'; else if (a.stage === 4 || a.stage === 5) t = 'bricht Steine für den Hausbau'; else if (a.stage === 6) t = 'richtet ein Haus ein'; else if (a.stage === 3 && a.step !== undefined) t = HUT_STEP_TXT[a.step] || t; }
  if (a.type === 'wood' && a.wk) t = 'fällt einen Baum';
  if (a.type === 'craft' && a.stage === 1 && a.wk) t = a.mat === 'stone' ? 'schlägt Stein aus dem Fels' : a.mat === 'wood' ? 'schlägt Holz' : t;
  return t;
}
function bindVals(box, n) {
  const a = box.querySelector('#allv'); if (a) a.onclick = () => { ui.allVals = !ui.allVals; renderInspector(true); };
  const e = box.querySelector('#editv'); if (e) e.onclick = () => { ui.editVals = !ui.editVals; renderInspector(true); };
  if (n) box.querySelectorAll('[data-v]').forEach(inp => {
    inp.oninput = () => { inspDrag = true; const i = +inp.dataset.v; n.pv[i] = inp.value / 100; simCmd('value', { id: n.id, i, v: inp.value / 100 }); };
    inp.onchange = () => { inspDrag = false; const i = +inp.dataset.v; simCmd('value', { id: n.id, i, v: inp.value / 100, memo: `sieht die Welt nun anders (${inp.value > 0 ? VALUES[i][2] : VALUES[i][1]})` }); };
  });
}
function renderInspector(full) {
  const box = $('insp');
  if (ui.sel) {
    const n = NPC.get(ui.sel);
    if (!n) { const d = W.dead.find(x => x.id === ui.sel); box.style.display = 'block'; box.innerHTML = `<button class="x">×</button><h2>${d ? esc(d.full) : 'Verstorben'} †</h2><div class="sub">${d ? `${Math.floor((d.died - d.born) / C.TPY)} Jahre alt geworden · ${esc(d.cause)} · ${dateStr(d.died)}` : ''}</div>`; box.querySelector('.x').onclick = closeInspector; return; }
    const T = tribeOf(n), age = Math.floor(ageY(n));
    if (full) {
      box.style.display = 'block';
      box.innerHTML = `<button class="x">×</button><div id="ihead"></div>
      <div class="sec"><div class="t">Zustand</div><div id="ineeds"></div></div>
      <div class="sec"><div class="t">Persönlichkeit <span class="small" style="text-transform:none;letter-spacing:0">– verändere die Regler</span></div>
      ${Object.entries(TRAITS).map(([k, l]) => `<div class="trait"><span>${l}</span><input type="range" min="0" max="100" data-tr="${k}" value="${Math.round(n.tr[k] * 100)}"><em id="tv-${k}">${Math.round(n.tr[k] * 100)}</em></div>`).join('')}</div>
      <div class="sec"><div class="t">Idee einflüstern</div><div class="row"><select id="wsel">${WHISPERS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button id="wgo">Einflüstern</button></div><div class="small" id="wmsg"></div></div>
      <div class="sec" id="lead" style="display:none"><div class="t">Als Oberhaupt beeinflussen</div>
        <div class="row"><select id="lkind"><option value="raid">Plündern</option><option value="conquer">Erobern</option><option value="ally">Bündnis anbieten</option><option value="peace">Frieden suchen</option><option value="food">Um Nahrung bitten</option><option value="access">Um Jagdrecht bitten</option></select>
        <select id="ltarget"></select></div><div class="row"><button id="lgo">Einflüstern</button></div><div class="small" id="lmsg">Ob ${n.sex === 'f' ? 'sie' : 'er'} dem folgt, hängt von ${n.sex === 'f' ? 'ihrem' : 'seinem'} Charakter und der Lage ab.</div></div>
      <div id="irest"></div>`;
      box.querySelector('.x').onclick = closeInspector;
      box.querySelectorAll('[data-tr]').forEach(inp => {
        inp.onpointerdown = () => inspDrag = true; inp.onpointerup = () => inspDrag = false;
        inp.oninput = () => { const m = NPC.get(ui.sel); if (!m) return; m.tr[inp.dataset.tr] = inp.value / 100; simCmd('trait', { id: m.id, k: inp.dataset.tr, v: inp.value / 100 }); $('tv-' + inp.dataset.tr).textContent = inp.value; };
        inp.onchange = () => { inspDrag = false; const m = NPC.get(ui.sel); if (m) simCmd('trait', { id: m.id, k: inp.dataset.tr, v: inp.value / 100, memo: `fühlt sich verändert (${TRAITS[inp.dataset.tr]})` }); };
      });
      $('wsel').onchange = () => { const w = WHISPERS.find(x => x[0] === $('wsel').value); $('wmsg').textContent = w[2]; };
      $('wsel').onchange();
      $('lgo').onclick = () => { const m = NPC.get(ui.sel); if (!m) return; simAsk('whisperLeader', { id: m.id, kind: $('lkind').value, target: +$('ltarget').value }).then(r => { $('lmsg').textContent = r; renderInspector(false); }); };
      $('wgo').onclick = () => { const m = NPC.get(ui.sel); if (!m) return; const k = $('wsel').value, name = m.name; simAsk('whisper', { id: m.id, kind: k }).then(ok => { $('wmsg').textContent = ok ? '✓ Die Idee ist gesät. Was daraus wird, entscheidet ' + name + ' selbst.' : 'Das hat nicht geklappt (kein geeigneter Ort gefunden).'; renderInspector(false); }); };
    }
    const L = T && T.leader === n.id;
    $('ihead').innerHTML = `<h2>${esc(fullName(n))}</h2><div class="sub">${n.sex === 'f' ? '♀' : '♂'} ${age} Jahre · <span class="link" data-tribe="${T.id}"><span class="dot" style="background:${T.col}"></span> ${esc(T.name)}</span>${L ? ' · <b style="color:var(--acc)">Oberhaupt</b>' : n.job ? ` · <b>${JOBS[n.job].icon} ${jobName(n)}</b>${n.jx && n.jx[n.job] > 60 ? ` <span class="small">(${n.jx[n.job] > 400 ? 'Meister' : n.jx[n.job] > 180 ? 'erfahren' : 'eingearbeitet'})</span>` : ''}` : ''}<br>${esc(actText(n))}${n.sick > 0 ? ' · <span style="color:#7fae5a">krank</span>' : ''}${n.injured > 0 ? ' · <span style="color:#ff6b6b">verletzt</span>' : ''}</div>
      <div class="row"><button id="fol" class="${cam.follow === n.id ? 'on' : ''}">${cam.follow === n.id ? 'Verfolgen beenden' : 'Verfolgen'}</button><button id="ctr">Hinsehen</button></div>`;
    $('fol').onclick = () => { cam.follow = cam.follow === n.id ? 0 : n.id; if (cam.follow) cam.z = Math.max(cam.z, 2.2); renderInspector(false); };
    $('ctr').onclick = () => { centerOn(n.x, n.y); cam.z = Math.max(cam.z, 2.2); };
    { const isL = T.leader === n.id, box2 = $('lead'); box2.style.display = isL ? 'block' : 'none';
      if (isL && document.activeElement !== $('ltarget')) { const cur = $('ltarget').value; const opts = W.tribes.filter(o => o.alive && o !== T && T.rel[o.id] !== undefined).map(o => `<option value="${o.id}">${esc(o.name)} (${(T.rel[o.id] ?? 0) > 25 ? 'Freunde' : (T.rel[o.id] ?? 0) < -15 ? 'Feinde' : 'Fremde'}, ${o.members.length})</option>`).join(''); if ($('ltarget').dataset.h !== opts) { $('ltarget').innerHTML = opts || '<option value="">– noch keine Nachbarn bekannt –</option>'; $('ltarget').dataset.h = opts; if (cur) $('ltarget').value = cur; } } }
    $('ineeds').innerHTML = bar('Sattheit', 100 - n.hunger) + bar('Energie', n.energy) + bar('Wärme', n.warmth) + bar('Gesundheit', n.health) + bar('Gesellschaft', n.social, '#6d8fbf');
    if (!inspDrag) for (const k in TRAITS) { const inp = box.querySelector(`[data-tr="${k}"]`); if (inp && document.activeElement !== inp) { inp.value = Math.round(n.tr[k] * 100); $('tv-' + k).textContent = inp.value; } }
    const kn = TECH_IDS.filter(k => n.know[k]);
    const ideas = Object.keys(n.insight).filter(k => !n.know[k] && n.thr[k]).map(k => [k, n.insight[k] / n.thr[k]]).filter(x => x[1] > 0.15).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const bm = new Map(); for (const [k, v] of Object.entries(n.beliefs)) { if (v < 0.3) continue; const nm = beliefName(k); if (!bm.has(nm) || bm.get(nm)[1] < v) bm.set(nm, [k, v]); } const bel = [...bm.values()].sort((a, b) => b[1] - a[1]);
    const rels = Object.entries(n.rel).map(([id, v]) => [+id, v]).filter(([id]) => NPC.get(id) && id !== n.partner && !n.kids.includes(id) && !n.parents.includes(id));
    const friends = rels.filter(r => r[1] > 15).sort((a, b) => b[1] - a[1]).slice(0, 4), foes = rels.filter(r => r[1] < -10).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const tools = [n.tools.kleidung > 0 && (n.clothType === 'woven' ? '👘 gewebte Kleidung' : null), n.tools.bogen > 0 && '🏹 Pfeil & Bogen', n.tools.faustkeil > 0 && '🪨 Steinwerkzeug', n.tools.speer > 0 && '🗡 Speer', n.tools.kleidung > 0 && n.clothType !== 'woven' && '🧥 Fellkleidung', n.tools.korb > 0 && '🧺 Korb', W.animals.some(a => a.owner === n.id) && '🐕 Hund'].filter(Boolean);
    $('irest').innerHTML = `
      <div class="sec"><div class="t">Wissen</div>${kn.length ? kn.map(k => `<span class="chip">${TECH[k].icon} ${TECH[k].name}</span>`).join('') : '<span class="small">Nur das Überlieferte: Sammeln, Jagen, Feuer hüten.</span>'}
      ${ideas.length ? `<div class="small" style="margin-top:6px">Ahnungen (noch nicht verstanden):</div>${ideas.map(([k, v]) => `<div class="bar"><span>${v > 0.75 ? 'beinahe!' : v > 0.4 ? 'eine Idee…' : 'ein Gefühl…'}</span><i><b style="width:${Math.min(100, v * 100)}%;background:#6d8fbf"></b></i></div>`).join('')}` : ''}</div>
      ${tools.length ? `<div class="sec"><div class="t">Besitz</div>${tools.map(t => `<span class="chip">${t}</span>`).join('')}</div>` : ''}
      ${n.pv ? (() => { const dev = n.pv.map((v, i) => [i, v, Math.abs(v - (T.cv ? T.cv[i] : 0))]); const top = [...dev].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, ui.allVals ? NV : 6); const odd = dev.filter(d => d[2] > 0.5).sort((a, b) => b[2] - a[2]).slice(0, 2);
        return `<div class="sec"><div class="t">Werte & Überzeugungen</div>${n.unfrei ? `<div style="color:#d9644a">Unfrei – dient den ${esc(T.name)} seit ${dateStr(n.unfrei.t)}</div>` : ''}${odd.length ? `<div class="small" style="color:#e0b03c">Eckt an: ${odd.map(d => d[1] > (T.cv ? T.cv[d[0]] : 0) ? VALUES[d[0]][2] : VALUES[d[0]][1]).join(', ')} – anders als die Sippe</div>` : ''}${top.map(([i, v]) => vbar(i, v, T.cv ? T.cv[i] : undefined)).join('')}<div class="row"><button class="lnk" id="allv">${ui.allVals ? 'weniger zeigen' : 'alle ' + NV + ' Werte'}</button><button class="lnk" id="editv">${ui.editVals ? 'fertig' : 'Werte verändern'}</button></div>${ui.editVals ? `<div id="vedit">${VALUES.map((V, i) => `<div class="vrow"><span class="vl">${V[1]}</span><input type="range" min="-100" max="100" data-v="${i}" value="${Math.round(n.pv[i] * 100)}"><span class="vr">${V[2]}</span></div>`).join('')}</div>` : ''}</div>`; })() : ''}
      ${bel.length ? `<div class="sec"><div class="t">Glaube</div>${bel.map(([k, v]) => `<span class="chip b" title="${esc(W.beliefs[k]?.desc || '')}">${esc(beliefName(k))} ${v > 0.75 ? '(fest)' : ''}</span>`).join('')}</div>` : ''}
      <div class="sec"><div class="t">Familie</div>
        ${(() => { const wives = n.sex === 'm' ? T.members.filter(id => NPC.get(id)?.partner === n.id) : []; if (wives.length > 1) return `<div>Frauen: ${wives.map(nameLink).join(', ')}</div>`; return n.partner ? `<div>Partner: ${nameLink(n.partner)}</div>` : '<div class="small">ohne Partner</div>'; })()}
        ${n.parents.filter(Boolean).length ? `<div>Eltern: ${n.parents.filter(Boolean).map(nameLink).join(', ')}</div>` : ''}
        ${n.kids.length ? `<div>Kinder: ${n.kids.map(nameLink).join(', ')}</div>` : ''}</div>
      ${friends.length || foes.length ? `<div class="sec"><div class="t">Beziehungen</div>${friends.map(([id, v]) => `<div>💚 ${nameLink(id)} <span class="small">(${Math.round(v)})</span></div>`).join('')}${foes.map(([id, v]) => `<div>💢 ${nameLink(id)} <span class="small">(${Math.round(v)})</span></div>`).join('')}</div>` : ''}
      <div class="sec"><div class="t">Erinnerungen</div>${n.mem.length ? n.mem.slice(0, 12).map(m => `<div class="mem"><span class="d">${dateStr(m.t)}:</span> ${esc(m.text)}</div>`).join('') : '<div class="small">Noch nichts Besonderes erlebt.</div>'}</div>`;
    bindVals(box, n);
    bindLinks(box);
  } else if (ui.selTribe) {
    const T = TRIBE.get(ui.selTribe); if (!T) return closeInspector();
    box.style.display = 'block';
    const L = NPC.get(T.leader), mem = T.members.map(id => NPC.get(id)).filter(Boolean);
    const kids = mem.filter(n => ageY(n) < 15).length;
    const ks = TECH_IDS.filter(k => tribeKnows(T, k));
    const rels = Object.entries(T.rel).map(([id, v]) => [TRIBE.get(+id), v]).filter(([O]) => O && O.alive);
    const fm = new Map(); for (const k of Object.keys(W.beliefs)) { const sh = tribeBeliefShare(T, k); if (sh < 0.2) continue; const nm = beliefName(k); if (!fm.has(nm) || fm.get(nm)[1] < sh) fm.set(nm, [k, sh]); }
    const faiths = [...fm.values()].sort((a, b) => b[1] - a[1]);
    box.innerHTML = `<button class="x">×</button><h2><span class="dot" style="background:${T.col}"></span> ${esc(T.name)}</h2>
      <div class="sub">${T.alive ? `${mem.length} Köpfe (${kids} Kinder) · gegründet ${dateStr(T.founded)}` : 'untergegangen'}${T.parent && TRIBE.get(T.parent) ? ` · abgespalten von den ${esc(TRIBE.get(T.parent).name)}` : ''}</div>
      <div class="row"><button id="tc">Zum Lager</button></div>
      <div class="sec"><div class="t">${settlementName(T)}</div>${T.bld ? `<div class="small">Bauten: ${Object.entries(T.bld).map(([k, v]) => ({ oven: 'Backofen', kiln: 'Brennofen', temple: 'Tempel', wall: 'Stadtmauer' }[k] + (v < BUILD_NEED[k] ? ` (im Bau, ${Math.round(v / BUILD_NEED[k] * 100)} %)` : ''))).join(' · ')}</div>` : ''}
        <div>Oberhaupt: ${L ? nameLink(L.id) : '–'}</div>
        <div>Feuer: ${T.fire.lit ? '🔥 brennt' : '<b style="color:#d9644a">erloschen</b>'} · Vorräte: ${Math.round(T.store.food)} · Hütten: ${T.huts.filter(h => !h.stone).length}${T.huts.some(h => h.stone) ? ' · Steinhäuser: ' + T.huts.filter(h => h.stone).length : ''}${T.cleared ? ' · gerodet: ' + T.cleared + ' Felder' : ''}${T.pots ? ' · Töpfe: ' + T.pots : ''}${T.store.ore ? ' · Kupfererz: ' + Math.round(T.store.ore) : ''}${T.cu ? ' · Kupfer: ' + T.cu : ''}</div>
        ${T.jobs ? `<div class="small">Berufe: ${Object.entries(T.jobs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${JOBS[k].icon} ${v} ${v === 1 ? JOBS[k].m : ({ sammler: 'Sammler', jaeger: 'Jäger', fischer: 'Fischer', bauer: 'Bauern', hirte: 'Hirten', holz: 'Holzfäller', baumeister: 'Baumeister', handwerker: 'Handwerker', heiler: 'Heiler', krieger: 'Krieger', priester: 'Schamanen', bergmann: 'Bergleute', kundschafter: 'Kundschafter' })[k]}`).join(' · ')}</div>` : ''}
        <div>${tribeFields(T).length ? 'Felder: ' + tribeFields(T).length + ' · ' : ''}${(() => { const h = {}; for (const a of W.animals) if (a.tribe === T.id && HERD_K[a.k]) h[a.k] = (h[a.k] || 0) + 1; const N = { goat: 'Ziegen', sheep: 'Schafe', cattle: 'Rinder', pig: 'Schweine', donkey: 'Esel' }; return Object.entries(h).map(([k, v]) => N[k] + ': ' + v).join(' · ') + (Object.keys(h).length ? ' · ' : ''); })()}${(T.traps || []).length ? 'Reusen: ' + T.traps.length + ' · ' : ''}${T.storehouse ? 'Vorratshaus · ' : ''}${(() => { const I = T.items || {}, N = { speer: 'Speere', bogen: 'Bögen', faustkeil: 'Steinwerkzeuge', korb: 'Körbe', kleidung: 'Fellkleider', tuch: 'Stoffkleider' }; const l = Object.entries(I).filter(([, v]) => v > 0).map(([k, v]) => v + ' ' + N[k]); return l.length ? 'Im Lager: ' + l.join(', ') + ' · ' : ''; })()}${T.pal ? 'Palisade: ' + Math.round(T.pal / 24 * 100) + ' %' : ''}</div>
        <div class="small">Ehe: ${(T.poly || 0) >= 0.5 ? 'Vielehe – angesehene Männer haben mehrere Frauen' : 'Einehe'}</div>
        <div class="small">Wintervorrat-Ziel: ${T.winterTarget} pro Kopf${T.winterTarget > 14 ? ' (aus Hungerwintern gelernt)' : ''}</div></div>
      ${T.cv ? `<div class="sec"><div class="t">Herrschaft</div><div><b>${esc(govOf(T).name)}</b>${L ? ` – ${esc(leaderTitle(T, L))}: ${nameLink(L.id)}` : ''}</div><div class="small">${esc(govOf(T).desc || '')}</div><div class="small">seit ${dateStr(T.govSince || T.founded)}</div></div>
      <div class="sec"><div class="t">Gesellschaft</div>${socialOrder(T).map(([a, b]) => `<div class="small"><b>${a}:</b> ${esc(b)}</div>`).join('')}</div>
      <div class="sec"><div class="t">Gebote</div>${T.rules.length ? T.rules.map(r => `<div class="rule">„${esc(r.text)}“ <span class="small">seit ${dateStr(r.t)}</span></div>`).join('') : '<span class="small">Noch hat sich nichts zu einem festen Gebot verdichtet.</span>'}</div>
      <div class="sec"><div class="t">Werte der Sippe</div><div class="small" style="margin-bottom:4px">Was hier als richtig gilt – es entsteht aus den Menschen, ihren Erfahrungen und ihrem Oberhaupt.</div>${T.cv.map((v, i) => [i, v]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, ui.allVals ? NV : 10).map(([i, v]) => vbar(i, v)).join('')}<button class="lnk" id="allv">${ui.allVals ? 'weniger zeigen' : 'alle ' + NV + ' Werte zeigen'}</button></div>` : ''}
      <div class="sec"><div class="t">Wissen der Sippe</div>${ks.length ? ks.map(k => `<span class="chip">${TECH[k].icon} ${TECH[k].name}</span>`).join('') : '<span class="small">Nur das Überlieferte.</span>'}</div>
      ${(() => { const nx = TECH_IDS.filter(k => !tribeKnows(T, k) && TECH[k].req.every(r => tribeKnows(T, r))); if (!nx.length) return ''; return `<div class="sec"><div class="t">Als Nächstes möglich</div>${nx.map(k => { const best = (T.tprog || {})[k] || 0; return `<div class="bar"><span style="width:150px">${TECH[k].icon} ${TECH[k].name}</span><i><b style="width:${Math.min(100, best * 100)}%;background:#6d8fbf"></b></i></div><div class="small" style="margin:-2px 0 4px">entsteht beim ${Object.keys(TECH[k].ctx).map(c => CTX_TXT[c] || (c === 'experiment' ? 'Herumtüfteln' : c)).join(', ')}${TECH[k].cond && !TECH[k].cond(T) ? ` · <span style="color:#d9a54a">${TECH[k].condTxt}</span>` : ''} · ${T.inspire && T.inspire.k === k ? '<b style="color:#e0c060">✨ Eingebung wirkt</b>' : `<span class="link" data-insp="${k}">✨ göttliche Eingebung</span>`}</div>`; }).join('')}</div>`; })()}
      ${faiths.length ? `<div class="sec"><div class="t">Glaube & Bräuche</div>${faiths.map(([k, s]) => `<div><span class="chip b">${esc(beliefName(k))}</span> <span class="small">${Math.round(s * 100)} % der Erwachsenen${T.customs.includes(k) ? ' · Brauch' : ''}</span></div>`).join('')}</div>` : ''}
      <div class="sec"><div class="t">Revier</div><div>${T.area || 0} Felder Land <span class="small">– wächst mit Menschen, Hütten und gerodetem Land, endet an Flüssen und an den Grenzen der Nachbarn</span></div>${L && L.act && L.act.type === 'diplo' ? `<div class="small">${esc(L.name)} ${esc(actText(L))}</div>` : ''}</div>
      ${rels.length ? `<div class="sec"><div class="t">Nachbarn & Haltung</div>${rels.map(([O, v]) => { const st = stance(T, O), tr = T.treaties.filter(t => t.with === O.id).map(t => t.kind === 'buendnis' ? '🤝 Bündnis' : '🕊 Frieden').join(' '), acc = (O.access[T.id] || 0) > W.tick ? ' · darf dort jagen' : '', owe = T.debt[O.id] ? ' · steht in ihrer Schuld' : '', gr = T.grudge[O.id] ? ' · Groll' : ''; return `<div><span class="link" data-tribe="${O.id}"><span class="dot" style="background:${O.col}"></span> ${esc(O.name)}</span> <span class="small">– ${v > 25 ? 'befreundet' : v > 5 ? 'freundlich' : v > -15 ? 'vorsichtig' : v > -45 ? 'misstrauisch' : 'verfeindet'} · bei uns: ${STANCE_TXT[st]}${acc}${owe}${gr}</span> ${tr}</div>`; }).join('')}</div>` : ''}
      <div class="sec"><div class="t">Mitglieder</div><div style="column-count:2">${mem.sort((a, b) => b.prestige - a.prestige).slice(0, 40).map(n => `<div>${nameLink(n.id)} <span class="small">${Math.floor(ageY(n))}</span></div>`).join('')}</div></div>`;
    box.querySelector('.x').onclick = closeInspector;
    $('tc').onclick = () => centerOn(T.cx, T.cy);
    box.querySelectorAll('[data-insp]').forEach(el => el.onclick = () => { simCmd('inspire', { tribe: T.id, k: el.dataset.insp }); T.inspire = { k: el.dataset.insp }; renderInspector(true); });
    bindVals(box); bindLinks(box);
  }
}
function bindLinks(root) {
  root.querySelectorAll('[data-npc]').forEach(el => el.onclick = () => { const id = +el.dataset.npc; const n = NPC.get(id); select(id); if (n) centerOn(n.x, n.y); });
  root.querySelectorAll('[data-tribe]').forEach(el => { if (el.classList.contains('chron')) return; el.onclick = () => { const T = TRIBE.get(+el.dataset.tribe); selectTribe(+el.dataset.tribe); if (T) centerOn(T.cx, T.cy); }; });
}

// ---------------------------------------------------------------- Eingabe
let drag = null;
cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; cv.classList.add('drag'); cam.follow = 0; } if (drag.moved) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; clampCam(); } }
  else hover(e);
});
cv.addEventListener('pointerup', e => { cv.classList.remove('drag'); if (drag && !drag.moved) click(e.clientX, e.clientY); drag = null; });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const [wx, wy] = s2w(e.clientX, e.clientY);
  cam.z = clamp(cam.z * Math.exp(-e.deltaY * 0.0015), 0.12, 5);
  const [wx2, wy2] = s2w(e.clientX, e.clientY);
  if (!cam.follow) { cam.x += (wx - wx2) * TS; cam.y += (wy - wy2) * TS; clampCam(); }
}, { passive: false });
function pickAt(sx, sy) {
  const [wx, wy] = s2w(sx, sy); let best = null, bd = 0.9 / Math.min(1, cam.z) + 0.3;
  for (const n of W.npcs) { const d = dist(n.x, n.y, wx, wy); if (d < bd) { bd = d; best = n; } }
  return { n: best, wx, wy };
}
function click(sx, sy) {
  const { n, wx, wy } = pickAt(sx, sy);
  if (n) { select(n.id); return; }
  const T = W.tribes.find(t => t.alive && dist(t.cx, t.cy, wx, wy) < 3.5);
  if (T) { selectTribe(T.id); return; }
  closeInspector();
}
function hover(e) {
  const tip = $('tip'); const { n, wx, wy } = pickAt(e.clientX, e.clientY);
  let txt = '';
  if (n) txt = `<b>${esc(n.name)}</b> · ${esc(actText(n))}`;
  else { const a = W.animals.find(a => dist(a.x, a.y, wx, wy) < 0.7); if (a) txt = a.k === 'goat' ? (a.tribe ? 'Ziege der ' + (TRIBE.get(a.tribe)?.name || '?') : 'Wildziege') : a.k === 'deer' ? 'Hirsch' : a.k === 'horse' ? (a.tribe ? 'Pferd der ' + (TRIBE.get(a.tribe)?.name || '?') : 'Wildpferd') : ({ sheep: 'Mufflon', cattle: 'Auerochse', pig: 'Wildschwein', donkey: 'Wildesel' }[a.k] && !a.tribe) ? { sheep: 'Mufflon', cattle: 'Auerochse', pig: 'Wildschwein', donkey: 'Wildesel' }[a.k] : ({ sheep: 'Schaf', cattle: 'Rind', pig: 'Schwein', donkey: 'Esel' }[a.k]) ? { sheep: 'Schaf', cattle: 'Rind', pig: 'Schwein', donkey: 'Esel' }[a.k] + ' der ' + (TRIBE.get(a.tribe)?.name || '?') : a.owner ? 'Hund von ' + (NPC.get(a.owner)?.name || '?') : 'Wolf'; else { const ore = (W.ore || []).find(o => dist(o.x, o.y, wx, wy) < 0.9); const b = !ore && bushesNear(wx, wy, 0.6)[0]; if (ore) txt = ore.amt > 0 ? `Kupfererz – noch etwa ${ore.amt} Brocken` : 'Erschöpfte Erzader'; else if (b) { const P = PLANT[b.k || 'berry'], nm = { berry: 'Beerenstrauch', apple: 'Wildapfelbaum', hazel: 'Haselstrauch', mushroom: 'Pilzstelle' }[b.k || 'berry']; txt = b.f > 0 ? `${nm} – ${P.name} (${b.f})` : `${nm} – ${b.k === 'mushroom' ? 'gerade keine Pilze' : 'abgeerntet'}`; } else { const p = (W.paintAll || []).find(p => dist(p.x, p.y, wx, wy) < 0.8); if (p) txt = `Felsbild von ${esc(p.by)}${p.k ? ' – zeigt ' + TECH[p.k].name : ''}`; else { const g = W.graves.find(g => dist(g.x, g.y, wx, wy) < 0.6); const G = !g && (W.ghosts || []).find(G => G.huts.some(h => wx >= h.lx && wx < h.lx + h.w && wy >= h.ly && wy < h.ly + h.h)); if (G) { const y = Math.round(ghostAge(G)); txt = `${G.huts.some(h => decayOf(h, G) >= 2) ? 'Ruinen' : 'Verlassene Häuser'} der ${esc(G.name)} – ${G.why === 'fort' ? 'fortgezogen' : 'ausgestorben'} vor ${y < 1 ? 'weniger als einem Jahr' : y === 1 ? 'einem Jahr' : y + ' Jahren'}`; } else if (g) txt = `Grab von ${esc(g.name)}${g.full && g.full !== g.name ? ' (' + esc(g.full) + ')' : ''}`; else { const fi = (wy | 0) * C.MW + (wx | 0), f = W.fields[fi]; if (f) txt = `Feld der ${esc(TRIBE.get(f.tr)?.name || '?')} – ${['brach', 'frisch gesät', 'wächst', 'reif zur Ernte'][f.st]}`; else if (W.path[fi]) txt = ['', 'Trampelpfad', 'ausgetretener Pfad', 'viel begangener Weg'][W.path[fi]]; } } } } }
  if (txt) { tip.innerHTML = txt; tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 12 + 'px'; } else tip.style.display = 'none';
}
cv.addEventListener('pointerleave', () => $('tip').style.display = 'none');
mini.addEventListener('pointerdown', e => { const r = mini.getBoundingClientRect(), s = mini.width / C.MW; centerOn((e.clientX - r.left) / s, (e.clientY - r.top) / s); cam.follow = 0; });
const keys = {};
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'f' || e.key === 'F') PERF.toggle();
  if (e.key === ' ') { e.preventDefault(); setSpeed(ui.speed ? 0 : (ui.prevSpeed || 1)); if (ui.speed === 0) {} }
  if (e.key >= '1' && e.key <= '6') { ui.prevSpeed = +e.key; setSpeed(+e.key); }
  if (e.key === 'Escape') closeInspector();
  if (e.key.toLowerCase() === 'f' && ui.sel) { cam.follow = cam.follow ? 0 : ui.sel; renderInspector(false); }
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
setInterval(() => { const v = 14 / cam.z; if (keys.w || keys.arrowup) cam.y -= v; if (keys.s || keys.arrowdown) cam.y += v; if (keys.a || keys.arrowleft) cam.x -= v; if (keys.d || keys.arrowright) cam.x += v; if (keys.w || keys.s || keys.a || keys.d || keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright) { cam.follow = 0; clampCam(); } }, 16);
$('sidebody').addEventListener('click', e => { const c = e.target.closest('.chron'); if (c) gotoRef(c.dataset.npc, c.dataset.tribe); const t = e.target.closest('.tribe'); if (t) { const T = TRIBE.get(+t.dataset.tribe); selectTribe(T.id); centerOn(T.cx, T.cy); } });
document.querySelectorAll('#tabs [data-tab]').forEach(b => b.onclick = () => {
  if (ui.tab === b.dataset.tab && !$('side').classList.contains('hidden')) { $('side').classList.add('hidden'); b.classList.remove('on'); return; }
  $('side').classList.remove('hidden'); ui.tab = b.dataset.tab; if (ui.tab === 'tech') openTree(); document.querySelectorAll('#tabs [data-tab]').forEach(x => x.classList.toggle('on', x === b)); renderSide();
});
$('helpbtn').onclick = () => $('help').style.display = 'flex';
$('helpok').onclick = () => { $('help').style.display = 'none'; try { localStorage.setItem('civ-help', '1'); } catch (e) {} };
const sp = $('speeds');
['⏸', '1×', '3×', '10×', '30×', '100×', '500×'].forEach((l, i) => { const b = document.createElement('button'); b.textContent = l; b.title = i ? `Tempo ${l}` : 'Pause'; b.onclick = () => { if (i) ui.prevSpeed = i; setSpeed(i); }; sp.appendChild(b); });
const _setSpeed = setSpeed;

// ---------------------------------------------------------------- Start
function afterLoad() {
  resize(); buildTerrain(); closeInspector(); renderSide();
  const T = W.tribes.find(t => t.alive) || W.tribes[0]; if (T) centerOn(T.cx, T.cy); cam.z = 1.6;
}
function startWorld(seed, pop, tribes, size) { simCmd('new', { seed, pop, tribes, size }); }
function loadWorld(str) { simCmd('load', { str }); }

// ---------------------------------------------------------------- Simulations-Thread (eigener Prozessorkern)
const SIM = { worker: null, rid: 0, cb: new Map(), cur: null, lastFrameT: 0, tps: 0, ready: false };
let T_ARR = null, CLAY = null, FLINT = null, CHRON = [], OWN_M = null, AMAP = new Map(), BUSHES = [];
function simStart() {
  const src = document.getElementById('coreSrc').textContent + '\n' + document.getElementById('workerSrc').textContent;
  try {
    SIM.worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    SIM.worker.onerror = e => { console.error('Simulation:', e.message); if (!SIM.ready) simInline(src); };
  } catch (err) { simInline(src); return; }
  SIM.worker.onmessage = e => { const t0 = performance.now(); onSim(e); if (e.data && e.data.type === 'state') PERF.note('state', performance.now() - t0); };
  SIM.worker.postMessage({ cmd: 'src', src, cores: Math.min(8, Math.max(1, (navigator.hardwareConcurrency || 4) - 2)) });
  setTimeout(() => { if (!SIM.ready && !SIM.inline) simInline(src); }, 6000);
}
// Ersatz, falls die Umgebung keine eigenen Threads erlaubt: gleiche Simulation, eigener Namensraum, aber im Hauptthread
function simInline(src) {
  if (SIM.inline) return; SIM.inline = true; try { SIM.worker && SIM.worker.terminate && SIM.worker.terminate(); } catch (e) {}
  const fake = { onmessage: null };
  const post = m => setTimeout(() => onSim({ data: structuredClone(m) }), 0);
  new Function('self', 'postMessage', src)(fake, post);
  SIM.worker = { postMessage: m => setTimeout(() => fake.onmessage({ data: structuredClone(m) }), 0) };
  SIM.worker.postMessage({ cmd: 'new', seed: Math.floor(Math.random() * 99999) + 1, pop: 300, tribes: 10 });
}
function simCmd(cmd, extra = {}) { SIM.worker.postMessage({ cmd, ...extra }); }
function simAsk(cmd, extra = {}) { return new Promise(res => { const rid = ++SIM.rid; SIM.cb.set(rid, res); simCmd(cmd, { ...extra, rid }); }); }
function adoptW(lite) {
  const prev = new Map(); if (W && W.npcs) for (const n of W.npcs) prev.set(n.id, n);
  W = lite; W.t = T_ARR; W.clay = CLAY; W.flint = FLINT; W.chron = CHRON; W.foot = {}; W.bushes = BUSHES;
  C.MW = W.MW || 400; C.MH = W.MH || 270;
  NPC = new Map(); for (const n of W.npcs) NPC.set(n.id, n); TRIBE = new Map(); for (const T of W.tribes) TRIBE.set(T.id, T); OWN = OWN_M;
  // Blickrichtung & Zwischenpositionen der bisherigen Figuren übernehmen
  for (const n of W.npcs) { if (!n.mem) { n.mem = []; n.rel = {}; n.insight = {}; n.thr = {}; n.spots = []; n.exp = { gather: 0, hunt: 0, fish: 0 }; n.jx = {}; } }
  for (const n of W.npcs) { const p = prev.get(n.id); if (p) { n.face = p.face; n.flip = p.flip; n.px = p.px; n.py = p.py; n.x = p.x; n.y = p.y; } }
  AMAP = new Map(); for (const a of W.animals) AMAP.set(a.id, a);
  updateChops(); combatFx();
}
function onSim(e) {
  const m = e.data;
  if (m.type === 'frame') {
    if (!W || !W.npcs) return;
    const newTick = !SIM.cur || m.tick !== SIM.cur.tick;
    SIM.cur = m; SIM.lastFrameT = performance.now(); W.tick = m.tick;
    if (newTick) {
      const P = m.P; for (let i = 0; i < P.length; i += 3) { const n = NPC.get(P[i]); if (n) { n.px = n.x; n.py = n.y; n.x = P[i + 1]; n.y = P[i + 2]; } }
      const A = m.A; for (let i = 0; i < A.length; i += 3) { const a = AMAP.get(A[i]); if (a && (a.x !== A[i + 1] || a.y !== A[i + 2])) { a.px = a.x; a.py = a.y; a.x = A[i + 1]; a.y = A[i + 2]; } }
    }
  } else if (m.type === 'state') {
    adoptW(m.W);
    if (m.bf) for (let i = 0; i < m.bf.length && i < BUSHES.length; i++) { if (m.bf[i] === 255) { BUSHES[i].gone = 1; BUSHES[i].f = 0; } else BUSHES[i].f = m.bf[i]; }
    for (const [i, t, cut, path, fl] of m.tiles) { if (T_ARR[i] === T_FOREST && t !== T_FOREST && FALLS.length < 60) FALLS.push({ x: i % C.MW, y: (i / C.MW) | 0, t0: performance.now(), dir: hash(i % 97, i % 89) < 0.5 ? -1 : 1 }); T_ARR[i] = t; FLINT[i] = fl; HOOKS.onTile(i % C.MW, (i / C.MW) | 0); }
    if (m.own) { OWN_M = m.own; OWN = m.own; buildTerritory(); }
    for (const ev of m.chron) { CHRON.push(ev); HOOKS.onChronicle(ev); }
    if (CHRON.length > 4000) CHRON.splice(0, 500);
    SIM.tps = m.tps; SIM.cores = m.cores || 1;
  } else if (m.type === 'init') {
    T_ARR = m.t; CLAY = m.clay; FLINT = m.flint; CHRON = m.chron; OWN_M = m.own; BUSHES = m.bushes; W = null; SIM.cur = null;
    adoptW(m.W); BGRID = new Map(); for (const b of BUSHES) { const k = ((b.x / 8) | 0) + ',' + ((b.y / 8) | 0); if (!BGRID.has(k)) BGRID.set(k, []); BGRID.get(k).push(b); } SIM.ready = true; afterLoad(); simCmd('speed', { tps: TPS * SPEEDS[ui.speed] });
  } else if (m.type === 'reply') { const cb = SIM.cb.get(m.rid); if (cb) { SIM.cb.delete(m.rid); cb(m.result); } }
  else if (m.type === 'error') console.error(m.msg);
}
// Spielstände: im Desktop-Programm als Dateien, im Browser im lokalen Speicher
function saveGame(name, str) { if (window.civ) return window.civ.save(name, str); try { localStorage.setItem('civ-save-' + name, str); return Promise.resolve(true); } catch (e) { return Promise.resolve(false); } }
function loadGame(name) { if (window.civ) return window.civ.load(name); try { return Promise.resolve(localStorage.getItem('civ-save-' + name)); } catch (e) { return Promise.resolve(null); } }
addEventListener('resize', resize);
resize();
Promise.all([IMG.woods, IMG.tex].map(im => im.complete ? 0 : new Promise(r => { im.onload = r; im.onerror = r; }))).then(() => {
  simStart();
  ui.speed = 1; document.querySelectorAll('#speeds button').forEach((b, k) => b.classList.toggle('on', k === 1));
  startWorld(Math.floor(Math.random() * 99999) + 1, 300, 10);
  try { if (!localStorage.getItem('civ-help')) $('help').style.display = 'flex'; } catch (e) { $('help').style.display = 'flex'; }
  requestAnimationFrame(frame);
});

// =====================================================================
//  Zivilisationsbaum
// =====================================================================
const TREE = { open: false, sel: null, timer: 0 };
function treeLayout() {
  const depth = {}; const d = k => depth[k] ?? (depth[k] = TECH[k].req.length ? 1 + Math.max(...TECH[k].req.map(d)) : 0);
  TECH_IDS.forEach(d);
  const cats = ['nahrung', 'tiere', 'wasser', 'handwerk', 'bauen', 'geist', 'ordnung'], NW = 158, NH = 46, GX = 52, GY = 10;
  let prev = {}, pos = {}, y = 30, bands = [];
  for (let pass = 0; pass < 2; pass++) { prev = pos; pos = {}; y = 30; bands = [];
  for (const c of cats) {
    const cols = {}; for (const k of TECH_IDS) if ((TECH[k].cat || 'handwerk') === c) (cols[depth[k]] = cols[depth[k]] || []).push(k);
    const by = k => { const r = TECH[k].req.filter(q => pos[q] || prev[q]); return r.length ? r.reduce((s, q) => s + (pos[q] || prev[q]).y, 0) / r.length : 0; };
    for (const col in cols) cols[col].sort((a, b) => by(a) - by(b));
    const rows = Math.max(1, ...Object.values(cols).map(a => a.length));
    for (const col in cols) cols[col].forEach((k, i) => pos[k] = { x: 20 + col * (NW + GX), y: y + i * (NH + GY) });
    bands.push({ c, y, h: rows * (NH + GY) }); y += rows * (NH + GY) + 26;
  } }
  const maxD = Math.max(...Object.values(depth));
  return { pos, bands, w: 40 + (maxD + 1) * (NW + GX), h: y, NW, NH };
}
function techState(k) {
  let holders = 0; const best = (W.tprog || {})[k] || 0; for (const n of W.npcs) if (n.know[k]) holders++;
  const reqOk = TECH[k].req.every(r => W.npcs.some(n => n.know[r]));
  return { holders, best, reqOk, st: holders ? 'known' : W.discovered[k] ? 'lost' : reqOk ? 'near' : 'locked' };
}
function openTree(sel) {
  let el = $('tree');
  if (!el) { el = document.createElement('div'); el.id = 'tree'; document.body.appendChild(el); }
  TREE.open = true; TREE.sel = sel || TREE.sel; el.style.display = 'flex';
  const L = treeLayout(); TREE.L = L;
  el.innerHTML = `<div class="th"><b>🌳 Zivilisationsbaum</b><span class="small"> – vom Faustkeil bis zur Stadt. Jede Entdeckung braucht Vorwissen, eine passende Lage und Erfahrung im Alltag.</span>
    <span class="leg"><i class="known"></i>bekannt <i class="near"></i>in Reichweite <i class="lost"></i>vergessen <i class="locked"></i>noch fern</span><button id="treex">×</button></div>
    <div class="tb"><div class="tw" id="tw"><div class="tc" id="tc" style="width:${L.w}px;height:${L.h}px">
    ${L.bands.map(b => `<div class="band" style="top:${b.y - 22}px;height:${b.h + 18}px"><span>${TCAT[b.c]}</span></div>`).join('')}
    <svg id="tedges" width="${L.w}" height="${L.h}"></svg>
    ${TECH_IDS.map(k => `<div class="tn" data-k="${k}" style="left:${L.pos[k].x}px;top:${L.pos[k].y}px;width:${L.NW}px;height:${L.NH}px"><span class="ic">${TECH[k].icon}</span><span class="nm">${TECH[k].name}</span><i class="pb"><b></b></i></div>`).join('')}
    </div></div><div class="td" id="td"></div></div>`;
  $('treex').onclick = closeTree;
  el.querySelectorAll('.tn').forEach(n => { n.onclick = () => { TREE.sel = n.dataset.k; refreshTree(); }; n.onmouseenter = () => hiTree(n.dataset.k); n.onmouseleave = () => hiTree(null); });
  // Ziehen zum Verschieben
  const tw = $('tw'); let drag = null;
  tw.onpointerdown = e => { if (e.target.closest('.tn')) return; drag = [e.clientX, e.clientY, tw.scrollLeft, tw.scrollTop]; tw.setPointerCapture(e.pointerId); };
  tw.onpointermove = e => { if (drag) { tw.scrollLeft = drag[2] - (e.clientX - drag[0]); tw.scrollTop = drag[3] - (e.clientY - drag[1]); } };
  tw.onpointerup = () => drag = null;
  refreshTree();
  if (TREE.sel) { const p = L.pos[TREE.sel]; tw.scrollLeft = Math.max(0, p.x - tw.clientWidth / 2 + 80); tw.scrollTop = Math.max(0, p.y - tw.clientHeight / 2); }
  clearInterval(TREE.timer); TREE.timer = setInterval(() => { if (TREE.open) refreshTree(); }, 1500);
}
function closeTree() { TREE.open = false; clearInterval(TREE.timer); const el = $('tree'); if (el) el.style.display = 'none'; }
function hiTree(k) {
  document.querySelectorAll('#tc .tn').forEach(n => n.classList.toggle('dim', !!k && n.dataset.k !== k && !TECH[k].req.includes(n.dataset.k) && !TECH[n.dataset.k].req.includes(k)));
  document.querySelectorAll('#tedges path').forEach(p => p.classList.toggle('hi', !!k && (p.dataset.a === k || p.dataset.b === k)));
}
function refreshTree() {
  const L = TREE.L; if (!L || !W) return;
  const S = {}; for (const k of TECH_IDS) S[k] = techState(k);
  let svg = '';
  for (const k of TECH_IDS) for (const r of TECH[k].req) {
    const a = L.pos[r], b = L.pos[k], x1 = a.x + L.NW, y1 = a.y + L.NH / 2, x2 = b.x, y2 = b.y + L.NH / 2, mx = (x1 + x2) / 2;
    const cls = S[r].st === 'known' ? (S[k].st === 'known' ? 'e known' : 'e open') : 'e';
    svg += `<path data-a="${r}" data-b="${k}" class="${cls}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"/>`;
  }
  $('tedges').innerHTML = svg;
  document.querySelectorAll('#tc .tn').forEach(n => { const s = S[n.dataset.k]; n.className = 'tn ' + s.st + (TREE.sel === n.dataset.k ? ' sel' : ''); n.querySelector('.pb b').style.width = (s.st === 'near' ? Math.min(100, s.best * 100) : s.st === 'known' ? 100 : 0) + '%'; });
  const k = TREE.sel, td = $('td'); if (!k) { td.innerHTML = '<div class="small">Klicke eine Entdeckung an, um zu sehen, was sie braucht und wohin sie führt. Die Leiste zeigt, wie nah die klügste lebende Person an der Idee ist.</div>'; return; }
  const T_ = TECH[k], s = S[k], D = W.discovered[k];
  const next = TECH_IDS.filter(x => TECH[x].req.includes(k));
  const tribes = W.tribes.filter(t => t.alive && tribeKnows(t, k));
  const ctxs = Object.keys(T_.ctx).filter(c => c !== 'experiment').map(c => CTX_TXT[c] || c);
  const link = x => `<span class="tl ${S[x].st}" data-go="${x}">${TECH[x].icon} ${TECH[x].name}</span>`;
  td.innerHTML = `<h2>${T_.icon} ${T_.name}</h2><div class="small" style="margin-bottom:6px">${TCAT[T_.cat || 'handwerk']}</div><div>${esc(T_.desc)}</div>
    ${T_.eff ? `<div class="sec"><div class="t">Wirkung</div>${esc(T_.eff)}</div>` : ''}
    ${T_.see ? `<div class="sec"><div class="t">Im Spiel zu sehen</div>${esc(T_.see)}</div>` : ''}
    <div class="sec"><div class="t">Braucht</div>${T_.req.length ? T_.req.map(link).join(' ') : '<span class="small">kein Vorwissen</span>'}${T_.condTxt ? `<div class="small" style="margin-top:4px">Lage: ${esc(T_.condTxt)}</div>` : ''}</div>
    <div class="sec"><div class="t">Die Idee entsteht beim</div>${esc(ctxs.join(', '))}${T_.ctx.experiment ? ', Herumtüfteln' : ''}</div>
    <div class="sec"><div class="t">Führt zu</div>${next.length ? next.map(link).join(' ') : '<span class="small">– Ende dieses Pfads (vorerst)</span>'}</div>
    <div class="sec"><div class="t">Stand</div>${s.holders ? `${s.holders} Menschen in ${tribes.length} Sippe${tribes.length === 1 ? '' : 'n'}: ${tribes.slice(0, 6).map(t => esc(t.name)).join(', ')}${tribes.length > 6 ? ' …' : ''}` : s.st === 'lost' ? '<b style="color:#d9644a">Wieder vergessen – alle Wissenden sind tot.</b>' : s.st === 'near' ? `Noch unentdeckt. Am weitesten: ${Math.round(s.best * 100)} %` : 'Noch fern – erst muss das Vorwissen her.'}${D ? `<div class="small">Zuerst: ${esc(D.byName)}, ${dateStr(D.t)}</div>` : ''}</div>`;
  td.querySelectorAll('[data-go]').forEach(e => e.onclick = () => { TREE.sel = e.dataset.go; refreshTree(); const p = L.pos[TREE.sel], tw = $('tw'); tw.scrollTo({ left: Math.max(0, p.x - tw.clientWidth / 2 + 80), top: Math.max(0, p.y - tw.clientHeight / 2), behavior: 'smooth' }); });
}

// =====================================================================
//  Kampf, Arbeit und Tod sichtbar machen
// =====================================================================
// Bäume, an denen gerade gehauen wird, und Felsen, an denen geklopft wird
let CHOPS = new Map(), FALLS = [], PARTS = [];
function updateChops() {
  if (!W || !W.npcs) return;
  const nm = new Map(); for (const n of W.npcs) { const a = n.act; if (a && a.chop && a.wk) nm.set(a.chop, n.id); }
  const keys = new Set([...CHOPS.keys(), ...nm.keys()]);
  for (const k of keys) if (CHOPS.has(k) !== nm.has(k)) { const x = k % C.MW, y = (k / C.MW) | 0; for (const [dx, dy] of [[0, 0], [3, 0], [-3, 0], [0, 4], [0, -1]]) canopyCache.delete(Math.floor((x + dx) / CH) + ',' + Math.floor((y + dy) / CH)); }
  CHOPS = nm;
}
function treeKind(x, y) { const h = hash(x + 101, y + 7), h2 = hash(x + 3, y + 211); let kind = h < 0.55 ? 'treeRound' : 'pine'; if (h2 < 0.035 && W.t[y * C.MW + x - 1] === T_FOREST && W.t[y * C.MW + x + 1] === T_FOREST && W.t[(y - 1) * C.MW + x] === T_FOREST) kind = 'treeBig'; return { kind, ax: (x + 0.5) * TS + (h2 - 0.5) * 7, ay: (y + 1) * TS - 1 + (h - 0.5) * 4 }; }
function drawWorkFx(x0, y0, x1, y1) {
  const now = performance.now();
  for (const [k, id] of CHOPS) {
    const x = k % C.MW, y = (k / C.MW) | 0; if (x < x0 - 2 || x > x1 + 2 || y < y0 - 2 || y > y1 + 4) continue;
    if (W.t[k] === T_FOREST) { // der Baum wackelt bei jedem Schlag
      const t = treeKind(x, y), s = ASSETS.spr[t.kind], ph = (FT * 5 + id * 0.37) % 1, hit = ph < 0.5 ? 0 : Math.sin((ph - 0.5) * 2 * Math.PI) * Math.exp(-(ph - 0.5) * 5);
      ctx.save(); ctx.translate(t.ax, t.ay); ctx.rotate(hit * 0.09); spr(ctx, t.kind, -s[2] / 2, -s[3]); ctx.restore();
      if (ph > 0.5 && ph < 0.56 && PARTS.length < 300) for (let i = 0; i < 2; i++) PARTS.push({ x: t.ax - 4 + Math.random() * 3, y: t.ay - 5, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, t0: now, life: 500, c: '#c8a070', s: 1.5 });
    } else { // Steinsplitter
      const ph = (FT * 5 + id * 0.37) % 1; if (ph > 0.5 && ph < 0.56 && PARTS.length < 300) for (let i = 0; i < 3; i++) PARTS.push({ x: (x + 0.5) * TS + (Math.random() - 0.5) * 6, y: (y + 0.6) * TS, vx: (Math.random() - 0.5) * 40, vy: -25 - Math.random() * 25, t0: now, life: 450, c: Math.random() < 0.5 ? '#b0aca4' : '#7a7670', s: 1.5 });
    }
  }
  // gefällte Bäume kippen um und bleiben kurz als Stamm liegen
  for (let i = FALLS.length - 1; i >= 0; i--) {
    const f = FALLS[i], age = now - f.t0; if (age > 4500) { FALLS.splice(i, 1); continue; }
    if (f.x < x0 - 2 || f.x > x1 + 2 || f.y < y0 - 2 || f.y > y1 + 4) continue;
    const t = treeKind(f.x, f.y), s = ASSETS.spr[t.kind] || ASSETS.spr.treeRound, k = Math.min(1, age / 900), ang = f.dir * (Math.PI / 2) * k * k;
    ctx.save(); ctx.globalAlpha = age > 3500 ? 1 - (age - 3500) / 1000 : 1; ctx.translate(t.ax, t.ay); ctx.rotate(ang); spr(ctx, s === ASSETS.spr.treeRound ? 'treeRound' : t.kind, -s[2] / 2, -s[3]); ctx.restore();
    if (age > 850 && age < 950 && !f.dust) { f.dust = 1; for (let j = 0; j < 8; j++) PARTS.push({ x: t.ax + f.dir * (8 + j * 2), y: t.ay, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 15, t0: now, life: 700, c: 'rgba(160,140,110,.8)', s: 2 }); }
  }
}
// Pfeile, Blut, Splitter
function combatFx() {
  if (!W || !W.npcs) return;
  const now = performance.now();
  for (const n of W.npcs) {
    if (n.fx && n.fx.t !== n._fxSeen) { n._fxSeen = n.fx.t; if (n.fx.k === 'shoot' && PARTS.length < 300) PARTS.push({ arrow: 1, x: n.x * TS, y: n.y * TS - 8, x1: n.fx.x * TS, y1: n.fx.y * TS - 6, t0: now, life: 350, hit: n.fx.hit }); }
    if (n.hitT && n.hitT !== n._hitSeen) { n._hitSeen = n.hitT; if (PARTS.length < 300) for (let i = 0; i < 6; i++) PARTS.push({ x: n.x * TS, y: n.y * TS - 6, vx: (n.hitDx || 1) * (15 + Math.random() * 30), vy: -15 - Math.random() * 25, t0: now, life: 550, c: '#a8201a', s: 1.5, blood: 1 }); }
  }
}
function drawParticles() {
  const now = performance.now();
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i], age = now - p.t0; if (age > p.life) { PARTS.splice(i, 1); continue; }
    if (p.arrow) { const k = age / p.life, x = p.x + (p.x1 - p.x) * k, y = p.y + (p.y1 - p.y) * k - Math.sin(k * Math.PI) * 10, a = Math.atan2(p.y1 - p.y - Math.cos(k * Math.PI) * 10 * Math.PI, p.x1 - p.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-5, -0.5, 8, 1); ctx.fillStyle = '#8d8a85'; ctx.fillRect(3, -1, 2, 2); ctx.fillStyle = '#efe6cc'; ctx.fillRect(-6, -1.5, 2, 1); ctx.fillRect(-6, 0.5, 2, 1); ctx.restore(); continue; }
    const t = age / 1000, x = p.x + p.vx * t, y = p.y + p.vy * t + 60 * t * t;
    ctx.globalAlpha = 1 - age / p.life; ctx.fillStyle = p.c; ctx.fillRect(x, y, p.s, p.s); ctx.globalAlpha = 1;
  }
}
// ---------------------------------------------------------------- Tote und Gräber
const CORPSE_SHEET = {};
function drawCorpse(c, px, py, carried) {
  ctx.save(); ctx.translate(px, py);
  if (c.bones) { // nur noch Knochen
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-5, 0, 3, 3); ctx.fillStyle = '#2a201a'; ctx.fillRect(-4, 1, 1, 1); ctx.fillStyle = '#d8d0bc'; ctx.fillRect(-2, 1, 7, 1); ctx.fillRect(0, 0, 1, 3); ctx.fillRect(2, 0, 1, 3); ctx.fillRect(4, -1, 1, 1); ctx.fillRect(5, 2, 2, 1);
    ctx.restore(); return;
  }
  if (!carried && c.war) { ctx.fillStyle = 'rgba(110,10,10,.5)'; ctx.beginPath(); ctx.ellipse(1, 3, 8, 3.5, 0, 0, 7); ctx.fill(); }
  const key = c.look + (c.child ? 'c' : '') + c.cloth + (c.old ? 'o' : '');
  const sheet = CORPSE_SHEET[key] || (CORPSE_SHEET[key] = spriteSheet(c.look, c.child, c.cloth, c.old, null));
  if (c.dumped || (W.tick - c.t) / C.TPD > 8) ctx.filter = 'grayscale(.6) brightness(.85)';
  ctx.drawImage(sheet, 0, 48, 16, 16, -8, -8, 16, 16);
  ctx.filter = 'none';
  ctx.restore();
}
function drawGrave(g) {
  const px = g.x * TS, py = g.y * TS, days = (W.tick - g.t) / C.TPD, T = TRIBE.get(g.tribe);
  // Grabhügel: frisch aus Erde, später überwachsen
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(px - 5, py + 3, 12, 3);
  ctx.fillStyle = days < 40 ? '#7a5a3a' : '#5d8a3a'; ctx.fillRect(px - 5, py - 2, 10, 7); ctx.fillStyle = days < 40 ? '#94704a' : '#6fa045'; ctx.fillRect(px - 4, py - 2, 8, 2);
  // Grabstein: ein aufrechter Stein, für Kinder klein, für bedeutende Menschen groß
  const h = g.child ? 5 : g.notable ? 11 : 8, w = g.notable ? 6 : 4;
  ctx.fillStyle = '#5e5a55'; ctx.fillRect(px - w / 2, py - 2 - h, w, h); ctx.fillStyle = '#9a958d'; ctx.fillRect(px - w / 2, py - 2 - h, w - 1, h - 1); ctx.fillStyle = '#b8b3aa'; ctx.fillRect(px - w / 2, py - 2 - h, w - 1, 1);
  if (T && TK(T, 'schrift')) { ctx.fillStyle = '#5e5a55'; ctx.fillRect(px - 1, py - h, 2, 1); ctx.fillRect(px - 1, py - h + 2, 2, 1); }
  else if (g.war) { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(px + 3, py - 9, 1, 9); ctx.fillStyle = '#8d8a85'; ctx.fillRect(px + 2, py - 11, 3, 2); } // Speer des Kriegers
  if (days < 25) { ctx.fillStyle = '#e8c840'; ctx.fillRect(px - 3, py + 1, 1, 1); ctx.fillStyle = '#c84a6a'; ctx.fillRect(px + 2, py, 1, 1); ctx.fillStyle = '#efe6cc'; ctx.fillRect(px, py + 2, 1, 1); } // Blumen
}
function drawCemLot(P, T) {
  const X = P.x0 * TS, Y = P.y0 * TS, Wd = P.w * TS, Hd = P.h * TS;
  ctx.fillStyle = 'rgba(40,70,30,.25)'; ctx.fillRect(X, Y, Wd, Hd);
  // niedrige Einfassung aus Feldsteinen, Eingang unten
  for (let x = 0; x < Wd; x += 5) for (const y of [0, Hd - 3]) { if (y && Math.abs(x - 2.5 * TS) < 8) continue; ctx.fillStyle = '#7e7a74'; ctx.fillRect(X + x, Y + y, 4, 3); ctx.fillStyle = '#a8a39b'; ctx.fillRect(X + x, Y + y, 3, 1); }
  for (let y = 0; y < Hd; y += 5) for (const x of [0, Wd - 4]) { ctx.fillStyle = '#7e7a74'; ctx.fillRect(X + x, Y + y, 4, 3); ctx.fillStyle = '#a8a39b'; ctx.fillRect(X + x, Y + y, 3, 1); }
}
// ---------------------------------------------------------------- Holzstapel und Steinhaufen
function drawStockPiles(T) {
  const [wx, wy] = stockSpot(T, 'wood'), [sx, sy] = stockSpot(T, 'stone');
  const nw = Math.min(15, Math.ceil(T.store.wood / 3) + (T.fire.lit ? 2 : 0));
  for (let i = 0; i < nw; i++) { const row = i < 6 ? 0 : i < 11 ? 1 : i < 14 ? 2 : 3, k = row === 0 ? i : row === 1 ? i - 6 : row === 2 ? i - 11 : 0; tex(ctx, 'logEnd', wx * TS - 16 + k * 6 + row * 3, wy * TS - row * 5, 6, 6); }
  const ns = Math.min(12, Math.ceil(T.store.stone / 3));
  for (let i = 0; i < ns; i++) { const a = i * 2.4, r = 2 + (i % 4) * 2.2, x = sx * TS + Math.cos(a) * r, y = sy * TS + Math.sin(a) * r * 0.6 - (i > 8 ? 3 : 0); ctx.fillStyle = '#6e6a64'; ctx.fillRect(x - 2, y - 1, 5, 4); ctx.fillStyle = '#a8a39b'; ctx.fillRect(x - 2, y - 1, 4, 1); }
}
// ---------------------------------------------------------------- Baustelle: Pflöcke, Boden, Wände, Dach
function drawSite(P, T) {
  const X = P.x0 * TS, Y = P.y0 * TS, Wd = P.w * TS, Hd = P.h * TS, pr = P.prog || 0, door = X + 2 * TS;
  const st = P.mud ? 'mud' : P.stone ? 'stone' : 'hut';
  // Pflöcke und Schnur
  ctx.fillStyle = '#5a3d22'; for (const [x, y] of [[X, Y], [X + Wd - 2, Y], [X, Y + Hd - 2], [X + Wd - 2, Y + Hd - 2]]) ctx.fillRect(x, y - 3, 2, 5);
  if (pr < 4) { ctx.strokeStyle = 'rgba(232,224,200,.7)'; ctx.lineWidth = 0.5; ctx.strokeRect(X + 1, Y + 1, Wd - 2, Hd - 2); }
  // Boden: erst die halbe, dann die ganze Fläche
  if (pr >= 2) { const fh = pr >= 3 ? Hd : Hd / 2; ctx.fillStyle = st === 'stone' ? patt(ctx, 'stoneFloor') : st === 'mud' ? '#b4906a' : patt(ctx, 'dirtFloor'); ctx.fillRect(X, Y + Hd - fh, Wd, fh); }
  const face = (x, y, w, h) => { if (st === 'mud') brick(x, y, w, h, '#b8925c', '#9c7a4a'); else { ctx.fillStyle = patt(ctx, st === 'stone' ? 'cobble' : 'bark'); ctx.fillRect(x, y, w, h); } };
  const side = st === 'mud' ? '#a8844f' : st === 'stone' ? '#6a6a72' : '#4a3020';
  if (pr >= 4) face(X, Y, Wd, 9);                                   // Rückwand
  if (pr >= 5) { ctx.fillStyle = side; ctx.fillRect(X, Y - 3, 3, Hd + 3); }       // links
  if (pr >= 6) { ctx.fillStyle = side; ctx.fillRect(X + Wd - 3, Y - 3, 3, Hd + 3); } // rechts
  if (pr >= 7) { ctx.fillStyle = side; ctx.fillRect(X, Y + Hd - 3, door - X, 4); ctx.fillRect(door + TS, Y + Hd - 3, X + Wd - door - TS, 4); } // vorne, mit Türlücke
  // Dach: Sparren, dann Deckung
  if (pr >= 8) { ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 1.5; for (let i = 4; i < Wd; i += 8) { ctx.beginPath(); ctx.moveTo(X + i, Y); ctx.lineTo(X + i, Y + Hd); ctx.stroke(); } }
  if (pr >= 9) { const rh = Hd * 0.5; ctx.fillStyle = st === 'hut' ? patt(ctx, 'hay') : st === 'mud' ? '#d4b07a' : patt(ctx, 'cobble'); ctx.fillRect(X - 1, Y - 1, Wd + 2, rh); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(X - 1, Y + rh - 2, Wd + 2, 2); }
  // Baumaterial liegt bereit
  for (let i = 0; i < Math.max(0, 3 - Math.floor(pr / 4)); i++) tex(ctx, 'logEnd', X + Wd + 1, Y + 6 + i * 7, 6, 6);
  if (st === 'stone' && pr < 7) for (let i = 0; i < 3; i++) { ctx.fillStyle = '#7e7a74'; ctx.fillRect(X - 7, Y + 8 + i * 6, 5, 4); ctx.fillStyle = '#a8a39b'; ctx.fillRect(X - 7, Y + 8 + i * 6, 4, 1); }
}

// =====================================================================
//  Tag und Nacht fließend · Straßen · Haupthaus · Dorfschmuck · Ruinen
// =====================================================================
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function dayLight() {
  if (!W) return { dark: 0, dusk: 0 };
  const hf = (((W.tick + (ALPHA || 0)) % C.TPD) + C.TPD) % C.TPD * 24 / C.TPD;
  let dark = hf >= 12 ? smooth(18.3, 22, hf) : 1 - smooth(4.3, 7.6, hf);
  let dusk = Math.max(0, 1 - Math.abs(hf - 19.2) / 2.2) + Math.max(0, 1 - Math.abs(hf - 5.8) / 1.8) * 0.7;
  if (ui.speed >= 5) { dark = 0.12; dusk = 0; } // bei hohem Tempo kein Flackern: gleichmäßiges Dämmerlicht
  return { dark, dusk: clamp(dusk, 0, 1) };
}
// ---------------------------------------------------------------- Straßen
function drawRoads(x0, y0, x1, y1) {
  const R = W.road; if (!R) return;
  for (const k in R) {
    const i = +k, x = i % C.MW, y = (i / C.MW) | 0; if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) continue;
    const lv = R[k], X = x * TS, Y = y * TS, h = hash(x + 3, y + 9);
    if (lv === 1) { // aufgeschüttete, festgestampfte Erde
      ctx.fillStyle = '#a5875a'; ctx.fillRect(X, Y, TS, TS); ctx.fillStyle = '#8f7149'; ctx.fillRect(X + (h * 9 | 0), Y + 3, 3, 1); ctx.fillRect(X + 4, Y + 10 + (h * 4 | 0), 2, 1); ctx.fillRect(X + 11, Y + (h * 12 | 0), 1, 2);
      ctx.fillStyle = '#b89a6a'; ctx.fillRect(X + 2 + (h * 10 | 0), Y + 7, 2, 1);
      const e = (dx, dy) => !R[(y + dy) * C.MW + x + dx]; ctx.fillStyle = 'rgba(90,70,40,.35)'; if (e(0, -1)) ctx.fillRect(X, Y, TS, 1); if (e(0, 1)) ctx.fillRect(X, Y + TS - 1, TS, 1); if (e(-1, 0)) ctx.fillRect(X, Y, 1, TS); if (e(1, 0)) ctx.fillRect(X + TS - 1, Y, 1, TS);
    } else if (lv === 2) { // Kies
      ctx.fillStyle = '#9c9488'; ctx.fillRect(X, Y, TS, TS); for (let j = 0; j < 7; j++) { const a = hash(x * 7 + j, y * 3 + j); ctx.fillStyle = j % 2 ? '#b8b0a2' : '#7e776c'; ctx.fillRect(X + (a * 15 | 0), Y + (hash(j + x, y - j) * 15 | 0), 1, 1); }
    } else { // Pflaster
      ctx.fillStyle = '#6e6a64'; ctx.fillRect(X, Y, TS, TS); ctx.fillStyle = '#9a958d'; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) ctx.fillRect(X + c * 8 + (r % 2) * 4 - (r % 2 && c ? 8 : 0) + 1, Y + r * 4 + 1, 6, 3);
    }
  }
}
// ---------------------------------------------------------------- Haupthaus: ein Langhaus über zwei Parzellen
function drawHall(T) {
  const H = hallOf(T); if (!H) return;
  const X = H.lx * TS, Y = H.ly * TS, Wd = H.w * TS, Hd = H.h * TS, pr = Math.min(1, (T.bld.hall || 0) / BUILD_NEED.hall), door = X + 2 * TS;
  const st = TK(T, 'lehmziegel') ? 'mud' : TK(T, 'steinbau') ? 'stone' : 'hut';
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(X + 3, Y + 4, Wd, Hd);
  if (pr < 1) { // Baustelle: Pfosten, Boden, Wände wachsen
    ctx.fillStyle = '#5a3d22'; for (let i = 0; i <= 8; i++) if (i / 8 <= pr * 2) { ctx.fillRect(X + i * (Wd - 3) / 8, Y - 4, 3, 7); ctx.fillRect(X + i * (Wd - 3) / 8, Y + Hd - 4, 3, 7); }
    if (pr > 0.3) { ctx.fillStyle = st === 'stone' ? patt(ctx, 'stoneFloor') : patt(ctx, 'dirtFloor'); ctx.fillRect(X, Y, Wd * Math.min(1, (pr - 0.3) / 0.3), Hd); }
    if (pr > 0.6) { ctx.fillStyle = patt(ctx, st === 'stone' ? 'cobble' : 'bark'); ctx.fillRect(X, Y, Wd * Math.min(1, (pr - 0.6) / 0.4), 9); }
    for (let i = 0; i < 4; i++) tex(ctx, 'logEnd', X + Wd + 2, Y + 4 + i * 7, 6, 6);
    return;
  }
  if (roofView()) {
    ctx.fillStyle = st === 'hut' ? patt(ctx, 'hay') : st === 'mud' ? '#d4b07a' : patt(ctx, 'cobble'); ctx.fillRect(X - 3, Y - 3, Wd + 6, Hd + 4);
    ctx.fillStyle = 'rgba(90,60,20,.35)'; for (let i = 3; i < Hd; i += 6) ctx.fillRect(X - 3, Y + i, Wd + 6, 1);
    ctx.fillStyle = st === 'hut' ? '#7a5a2a' : '#8a7a5a'; ctx.fillRect(X - 3, Y + Hd / 2 - 2, Wd + 6, 4); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - 3, Y + Hd - 4, Wd + 6, 4);
    for (const gx of [X + 2, X + Wd - 6]) { ctx.fillStyle = '#4a3020'; ctx.fillRect(gx, Y - 8, 4, 6); ctx.fillStyle = T.col; ctx.fillRect(gx + 1, Y - 7, 2, 3); } // geschnitzte Giebel
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(door + 3, Y + Hd - 9, 10, 9);
    ctx.fillStyle = T.col; ctx.fillRect(X + Wd / 2 - 6, Y - 6, 12, 5);
    return;
  }
  ctx.fillStyle = st === 'stone' ? patt(ctx, 'stoneFloor') : st === 'mud' ? '#b4906a' : patt(ctx, 'dirtFloor'); ctx.fillRect(X, Y, Wd, Hd);
  // lange Feuerstelle in der Mitte, Bänke und Tafel, Ehrenplatz an der Stirnseite
  const fy = Y + Hd * 0.5; ctx.fillStyle = '#5a5650'; ctx.fillRect(X + 34, fy - 4, Wd - 68, 8); ctx.fillStyle = '#2a201a'; ctx.fillRect(X + 36, fy - 2, Wd - 72, 4);
  if (T.fire.lit) for (let i = 0; i < 3; i++) drawFlame(X + 44 + i * (Wd - 88) / 2, fy, 0.45);
  ctx.fillStyle = '#8a6440'; ctx.fillRect(X + 18, Y + 12, Wd - 36, 4); ctx.fillRect(X + 18, Y + Hd - 18, Wd - 36, 4); // Bänke
  ctx.fillStyle = '#6a4424'; for (let i = 0; i < 6; i++) { ctx.fillRect(X + 22 + i * (Wd - 48) / 5, Y + 16, 2, 2); ctx.fillRect(X + 22 + i * (Wd - 48) / 5, Y + Hd - 14, 2, 2); }
  ctx.fillStyle = '#5a3d22'; ctx.fillRect(X + Wd - 16, fy - 7, 9, 14); ctx.fillStyle = T.col; ctx.fillRect(X + Wd - 15, fy - 6, 7, 5); ctx.fillStyle = '#e0b03c'; ctx.fillRect(X + Wd - 13, fy - 9, 3, 2); // Hochsitz
  ctx.fillStyle = T.col; for (const bx of [X + 6, X + Wd - 26]) { ctx.fillRect(bx, Y + 2, 6, 10); ctx.fillStyle = '#efe6cc'; ctx.fillRect(bx + 2, Y + 5, 2, 2); ctx.fillStyle = T.col; } // Banner
  const wallFace = (x, y, w, hh) => { if (st === 'mud') brick(x, y, w, hh, '#b8925c', '#9c7a4a'); else { ctx.fillStyle = patt(ctx, st === 'stone' ? 'cobble' : 'bark'); ctx.fillRect(x, y, w, hh); } };
  wallFace(X, Y, Wd, 9);
  const side = st === 'mud' ? '#a8844f' : st === 'stone' ? '#6a6a72' : '#4a3020', cap = st === 'mud' ? '#d4b07a' : st === 'stone' ? '#8a8a90' : '#6a4a2a';
  ctx.fillStyle = side; ctx.fillRect(X, Y - 3, 3, Hd + 3); ctx.fillRect(X + Wd - 3, Y - 3, 3, Hd + 3);
  ctx.fillRect(X, Y + Hd - 3, door - X, 4); ctx.fillRect(door + TS, Y + Hd - 3, X + Wd - door - TS, 4);
  ctx.fillStyle = cap; ctx.fillRect(X, Y + Hd - 4, door - X, 1); ctx.fillRect(door + TS, Y + Hd - 4, X + Wd - door - TS, 1);
  if (st === 'hut') { ctx.fillStyle = '#5a3d22'; for (let i = 2; i < Hd; i += 7) { ctx.fillRect(X - 1, Y + i, 5, 1); ctx.fillRect(X + Wd - 4, Y + i, 5, 1); } }
}
// ---------------------------------------------------------------- Gärten und Dorfschmuck
function drawGarden(P, T) {
  const X = P.x0 * TS, Y = P.y0 * TS, Wd = P.w * TS, Hd = P.h * TS;
  const veg = TK(T, 'ackerbau') || TK(T, 'huelsen');
  for (let r = 0; r < 5; r++) { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(X + 6, Y + 8 + r * 11, Wd - 12, 5); for (let c = 0; c < 7; c++) { const h = hash(P.x0 + c, P.y0 + r); ctx.fillStyle = veg ? (h < 0.5 ? '#4f8a3a' : '#6fae45') : (h < 0.33 ? '#e8c840' : h < 0.66 ? '#c84a6a' : '#efe6cc'); ctx.fillRect(X + 9 + c * 7, Y + 8 + r * 11, veg ? 3 : 2, veg ? 3 : 2); } }
  ctx.strokeStyle = '#7a5532'; ctx.lineWidth = 1; ctx.strokeRect(X + 3.5, Y + 3.5, Wd - 7, Hd - 7); // Flechtzaun
  ctx.fillStyle = '#5a3d22'; for (let x = 3; x < Wd - 3; x += 6) { ctx.fillRect(X + x, Y + 2, 1, 4); ctx.fillRect(X + x, Y + Hd - 6, 1, 4); }
}
// Fackeln an den Toren und am Platz
function townTorches(T) {
  const out = [], O = T.town; if (!O) return out;
  out.push([O.cx - 2.6, O.cy - 2.4], [O.cx + 2.4, O.cy - 2.4], [O.cx - 2.6, O.cy + 2.2], [O.cx + 2.4, O.cy + 2.2]);
  if ((T.pal || 0) >= 12 || (T.bld?.wall || 0) > 0) for (const g of townWall(T).gates) { const [nx, ny] = GATE_N[g[2]]; if (nx) { out.push([g[0], g[1] - 1.6]); out.push([g[0], g[1] + 1.6]); } else { out.push([g[0] - 1.6, g[1]]); out.push([g[0] + 1.6, g[1]]); } }
  return out;
}
function drawDecor(T, px, py) {
  const O = T.town, pop = T.members.length, night = dayLight().dark > 0.3;
  // Sitzbalken rund ums Feuer
  if (T.huts.length) for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + 0.4, x = px + Math.cos(a) * 20, y = py + Math.sin(a) * 14; ctx.save(); ctx.translate(x, y); ctx.rotate(a + 1.57); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-7, -2, 14, 4); ctx.fillStyle = '#8a6440'; ctx.fillRect(-7, -2, 14, 1); ctx.restore(); }
  // Pfahl mit Schnitzereien in Sippenfarben, wo man an Geister glaubt oder Bilder malt
  if (TK(T, 'malerei') || Object.keys(T.beliefs || {}).length || pop >= 25) { const x = px + 26, y = py - 30; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 2, y + 22, 8, 3); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x, y, 5, 24); ctx.fillStyle = T.col; ctx.fillRect(x, y + 3, 5, 3); ctx.fillRect(x, y + 12, 5, 2); ctx.fillStyle = '#efe6cc'; ctx.fillRect(x + 1, y + 7, 1, 1); ctx.fillRect(x + 3, y + 7, 1, 1); ctx.fillStyle = '#2a1e1a'; ctx.fillRect(x + 1, y + 9, 3, 1); ctx.fillStyle = '#8a6440'; ctx.fillRect(x - 3, y + 1, 11, 2); }
  // Brunnen am Platz für größere Dörfer
  if (pop >= 30 && (TK(T, 'steinbau') || TK(T, 'lehmziegel'))) { const x = px - 34, y = py - 26; ctx.fillStyle = '#6e6a64'; ctx.beginPath(); ctx.ellipse(x, y, 8, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#2a4a6a'; ctx.beginPath(); ctx.ellipse(x, y, 5, 3.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#5a3d22'; ctx.fillRect(x - 8, y - 12, 2, 12); ctx.fillRect(x + 6, y - 12, 2, 12); ctx.fillRect(x - 8, y - 13, 16, 2); }
  // vor den Häusern: Blumen, Holzscheite, Fellrahmen, Töpfe, Heu
  for (const h of T.huts) {
    if (h.lx === undefined) continue; const k = hash(h.lx + 5, h.ly + 11), dx = (h.lx + (k < 0.5 ? 0.4 : h.w - 0.9)) * TS, dy = (h.ly + h.h + 0.25) * TS;
    if (k < 0.2) { ctx.fillStyle = '#4f8a3a'; ctx.fillRect(dx, dy, 8, 3); ctx.fillStyle = '#e8c840'; ctx.fillRect(dx + 1, dy, 1, 1); ctx.fillStyle = '#c84a6a'; ctx.fillRect(dx + 4, dy, 1, 1); ctx.fillRect(dx + 6, dy + 1, 1, 1); }
    else if (k < 0.4) { for (let i = 0; i < 3; i++) tex(ctx, 'logEnd', dx + i * 4, dy - (i === 2 ? 3 : 0), 5, 5); }
    else if (k < 0.55 && TK(T, 'fellkleidung')) { ctx.fillStyle = '#5a3d22'; ctx.fillRect(dx, dy - 8, 1, 10); ctx.fillRect(dx + 8, dy - 8, 1, 10); ctx.fillRect(dx, dy - 8, 9, 1); ctx.fillStyle = '#9b7a55'; ctx.fillRect(dx + 1, dy - 7, 7, 6); }
    else if (k < 0.7 && TK(T, 'toepfern')) { ctx.fillStyle = '#a0583a'; ctx.beginPath(); ctx.arc(dx + 3, dy + 1, 2.5, 0, 7); ctx.fill(); ctx.fillStyle = '#c87a50'; ctx.fillRect(dx + 2, dy - 2, 2, 1); }
    else if (k < 0.8 && TK(T, 'ackerbau')) { ctx.fillStyle = '#d8b860'; ctx.fillRect(dx, dy - 2, 7, 5); ctx.fillStyle = '#b8984a'; ctx.fillRect(dx, dy + 1, 7, 1); }
  }
  // Fahnen in Sippenfarbe am Platz
  if (pop >= 20) for (const [fx, fy] of [[px - 40, py + 26], [px + 40, py + 26]]) { ctx.fillStyle = '#5a3d22'; ctx.fillRect(fx, fy - 20, 2, 22); const w = Math.sin(FT * 3 + fx) * 1.5; ctx.fillStyle = T.col; ctx.beginPath(); ctx.moveTo(fx + 2, fy - 20); ctx.lineTo(fx + 11, fy - 18 + w); ctx.lineTo(fx + 2, fy - 14); ctx.fill(); }
  // Fackeln an Toren und am Platz
  if (TK(T, 'fackeln')) for (const [x, y] of townTorches(T)) { const X = x * TS, Y = y * TS; ctx.fillStyle = '#4a3420'; ctx.fillRect(X - 1, Y - 12, 2, 13); ctx.fillStyle = '#2a1e1a'; ctx.fillRect(X - 2, Y - 13, 4, 2); if (night) drawFlame(X, Y - 14, 0.35); }
  // Vogelscheuchen auf den Feldern
  if (TK(T, 'ackerbau') && T.tc) { let c = 0; for (const k in W.fields) { const f = W.fields[k]; if (f.tr !== T.id || f.st < 1 || hash(k % 997, 3) > 0.04 || c++ > 4) continue; const x = (k % C.MW) * TS + 8, y = ((k / C.MW) | 0) * TS + 8; ctx.fillStyle = '#5a3d22'; ctx.fillRect(x, y - 12, 1, 14); ctx.fillRect(x - 5, y - 8, 11, 1); ctx.fillStyle = '#8a6440'; ctx.fillRect(x - 3, y - 8, 7, 5); ctx.fillStyle = '#d8b860'; ctx.fillRect(x - 1, y - 13, 3, 3); } }
}
// ---------------------------------------------------------------- Verlassene Häuser und Ruinen
const GHOST_T = {};
function drawGhost(G) {
  const age = ghostAge(G), pT = GHOST_T[G.id] || (GHOST_T[G.id] = { id: -G.id, col: '#7a7468', kn: {}, fire: { lit: false }, town: G.town, townVer: -1, members: [], huts: [] });
  // Reste der Palisade
  if (G.pal && age < 25) { const WL = townWall(pT); if (WL) { const n = Math.round(WL.tiles.length * Math.min(1, G.pal / 24)); for (let k = 0; k < n; k++) { if (hash(WL.tiles[k][0] + 1, WL.tiles[k][1]) < age / 25) continue; const X = WL.tiles[k][0] * TS, Y = WL.tiles[k][1] * TS; ctx.fillStyle = '#5a4430'; ctx.fillRect(X + 3, Y - 2, 3, 12); ctx.fillRect(X + 10, Y + 1, 3, 9); } } }
  for (const h of G.huts) {
    if (h.lx === undefined) continue;
    const d = decayOf(h, G), X = h.lx * TS, Y = h.ly * TS, Wd = h.w * TS, Hd = h.h * TS;
    if (d < 2) {
      drawHouse(h, pT);
      ctx.fillStyle = `rgba(30,30,25,${d === 0 ? 0.25 : 0.38})`; ctx.fillRect(X - 2, Y - 3, Wd + 4, Hd + 4);
      if (d === 1) { // Löcher im Dach, eingesunkene Wand, Unkraut
        for (let i = 0; i < 3; i++) { const a = hash(h.lx + i, h.ly), b = hash(h.ly + i, h.lx); ctx.fillStyle = 'rgba(40,30,20,.85)'; ctx.fillRect(X + 4 + a * (Wd - 14), Y + 4 + b * (Hd - 14), 8, 6); }
        ctx.fillStyle = '#4f8a3a'; for (let i = 0; i < 6; i++) ctx.fillRect(X + hash(i, h.lx) * Wd, Y + Hd - 3 + hash(h.ly, i) * 4, 2, 3);
      }
    } else { // Ruine: Boden und Mauerstümpfe, überwachsen
      ctx.fillStyle = 'rgba(90,75,55,.55)'; ctx.fillRect(X, Y, Wd, Hd);
      const stub = h.stone || h.mud ? (h.mud ? '#a8844f' : '#77737a') : '#4a3424';
      ctx.fillStyle = stub; for (let i = 0; i < 9; i++) { const a = hash(h.lx * 3 + i, h.ly), b = hash(h.ly * 5 + i, h.lx); if (a < 0.45) continue; const onX = i % 2; ctx.fillRect(onX ? X + b * (Wd - 6) : (b < 0.5 ? X : X + Wd - 3), onX ? (a < 0.7 ? Y : Y + Hd - 3) : Y + a * (Hd - 6), onX ? 6 : 3, onX ? 3 : 6); }
      ctx.fillStyle = '#5d8a3a'; for (let i = 0; i < 10; i++) ctx.fillRect(X + hash(i, h.lx + 2) * Wd, Y + hash(h.ly + 2, i) * Hd, 3, 2);
      if (age > 60) { ctx.fillStyle = '#3f6e2e'; ctx.beginPath(); ctx.arc(X + Wd * 0.6, Y + Hd * 0.4, 6, 0, 7); ctx.fill(); } // ein Busch wächst in der Ruine
    }
  }
  // ein verlassenes Haupthaus
  if (G.bld && G.bld.hall >= BUILD_NEED.hall) { const P = Object.values(G.town.lots).find(L => L.kind === 'hall'); if (P) { const X = P.x0 * TS, Y = P.y0 * TS; ctx.fillStyle = age < 20 ? 'rgba(60,45,30,.6)' : 'rgba(90,75,55,.5)'; ctx.fillRect(X, Y, P.w * TS, P.h * TS); ctx.fillStyle = '#4a3424'; for (let i = 0; i < 10; i++) if (hash(i, P.x0) < 0.75 - age / 120) ctx.fillRect(X + i * P.w * TS / 10, Y + (i % 2) * (P.h * TS - 4), 5, 4); } }
}

// ---------------------------------------------------------------- Wildpflanzen: aus den vorhandenen Pixelart-Bäumen und -Büschen abgeleitet
// Gleiche Pixelgröße, gleiche Palette – nur umgefärbt für die Jahreszeit und mit Früchten bestückt.
const PLANT_CV = new Map();
function plantSprite(base, key, edit) {
  const k = base + ':' + key; let c = PLANT_CV.get(k); if (c) return c;
  const s = ASSETS.spr[base]; c = document.createElement('canvas'); c.width = s[2]; c.height = s[3];
  const g = c.getContext('2d'); g.drawImage(IMG.woods, s[0], s[1], s[2], s[3], 0, 0, s[2], s[3]);
  const d = g.getImageData(0, 0, s[2], s[3]); edit(d.data, s[2], s[3]); g.putImageData(d, 0, 0);
  PLANT_CV.set(k, c); return c;
}
const isLeaf = (D, i) => D[i + 3] > 200 && D[i + 1] > D[i] + 12 && D[i + 1] >= D[i + 2];
// Blätter nach Jahreszeit umfärben (Helligkeit bleibt, nur der Farbton wandert)
function tintLeaves(D, season, kind) {
  for (let i = 0; i < D.length; i += 4) {
    if (!isLeaf(D, i)) continue;
    const l = (D[i] + D[i + 1] + D[i + 2]) / 3;
    if (season === 2 && kind !== 'hazel') { D[i] = Math.min(255, l * 1.45 + 30); D[i + 1] = Math.min(255, l * 1.05 + 10); D[i + 2] = l * 0.35; } // Herbstgelb
    else if (season === 2) { D[i] = Math.min(255, l * 1.15 + 20); D[i + 1] = Math.min(255, l * 1.1 + 8); D[i + 2] = l * 0.45; }
    else if (season === 3) { D[i] = l * 0.8 + 28; D[i + 1] = l * 0.72 + 20; D[i + 2] = l * 0.6 + 14; if (kind === 'apple' && hash3(i >> 2, 7, 11) < 0.32) D[i + 3] = 0; } // kahl und lichter
    else if (kind === 'hazel') { D[i] = D[i] * 0.85; D[i + 1] = D[i + 1] * 0.88; D[i + 2] = D[i + 2] * 0.8; }
  }
}
// Früchte auf Blattpixel setzen: 2×2 mit Glanzpunkt und Schatten, an festen Stellen
function leafSpots(D, W2, H2) { const spots = []; for (let y = 1; y < H2 - 2; y++) for (let x = 1; x < W2 - 2; x++) { const i = (y * W2 + x) * 4; if (isLeaf(D, i) && isLeaf(D, i + 4) && isLeaf(D, i + W2 * 4) && isLeaf(D, i + W2 * 4 + 4)) spots.push([x, y]); } return spots; }
function fruitPixels(D, W2, H2, n, cols, seed, big, spots) {
  const put = (x, y, c) => { const i = (y * W2 + x) * 4; D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = 255; };
  // gut verteilt: zufällige Reihenfolge, aber mit Abstand zueinander
  const order = spots.map((p, i) => [hash3(p[0], p[1], seed + 3), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]), used = [];
  for (const [x, y] of order) {
    if (used.length >= n) break; if (used.some(([u, v]) => Math.abs(u - x) < 4 && Math.abs(v - y) < 4)) continue; used.push([x, y]);
    put(x, y, cols[0]); if (big) { put(x + 1, y, cols[0]); put(x, y + 1, cols[1]); put(x + 1, y + 1, cols[1]); } put(x, y, cols[2]);
  }
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function drawPlant(b, px, py, season, g = ctx) {
  const k = b.k || 'berry', n = b.f;
  if (k === 'mushroom') { // Steinpilze: der rote Pilz der Vorlage, braun umgefärbt
    if (n <= 0) return;
    const c = plantSprite('mushRed', 'steinpilz', D => { for (let i = 0; i < D.length; i += 4) { if (D[i + 3] < 100) continue; const r = D[i], g = D[i + 1], bl = D[i + 2]; if (r > g + 40) { const l = r / 255; D[i] = 110 + l * 60; D[i + 1] = 70 + l * 40; D[i + 2] = 40 + l * 20; } else if (r > 200 && g > 200 && bl > 180 && (i >> 2) % 3) { D[i] = 150; D[i + 1] = 100; D[i + 2] = 58; } } });
    const s = ASSETS.spr.mushRed, m = Math.min(3, Math.ceil(n / 4));
    for (let i = 0; i < m; i++) g.drawImage(c, Math.round(px - s[2] / 2 + (i === 1 ? 5 : i === 2 ? -5 : 0)), Math.round(py - s[3] / 2 + (i ? 3 : 0)));
    return;
  }
  if (k === 'apple') { // Wildapfelbaum: der runde Baum der Vorlage, mit Blüten, grünen oder roten Äpfeln
    const lvl = season === 3 ? 0 : Math.min(5, Math.ceil(n / 6));
    const c = plantSprite('treeRound', 'apfel' + season + ':' + lvl + ':' + (b.id % 3), (D, w, h) => {
      const sp = leafSpots(D, w, h); tintLeaves(D, season, 'apple');
      if (season === 0) fruitPixels(D, w, h, 16, [[244, 220, 230], [230, 190, 205], [255, 245, 250]], b.id % 3, false, sp);
      else if (lvl) fruitPixels(D, w, h, lvl * 2 + 2, season === 2 ? [[206, 44, 38], [130, 24, 24], [255, 150, 130]] : [[206, 214, 70], [150, 160, 40], [246, 250, 160]], b.id % 3, true, sp);
    });
    const s = ASSETS.spr.treeRound; g.drawImage(c, Math.round(px - s[2] / 2), Math.round(py + 6 - s[3]));
    return;
  }
  // Beeren- und Haselstrauch: der Busch der Vorlage
  const lvl = (season === 3 && k !== 'hazel') ? 0 : Math.min(4, Math.ceil(n / 4));
  const c = plantSprite('bush', k + season + ':' + lvl, (D, w, h) => {
    const sp = leafSpots(D, w, h); tintLeaves(D, season, k);
    if (lvl) fruitPixels(D, w, h, lvl + 1, k === 'hazel' ? [[160, 108, 56], [104, 66, 34], [214, 162, 100]] : [[204, 44, 70], [128, 22, 46], [255, 140, 150]], b.id % 5, k === 'hazel' || lvl >= 3, sp);
  });
  const s = ASSETS.spr.bush; g.drawImage(c, Math.round(px - s[2] / 2), Math.round(py - s[3] / 2));
}

// ---------------------------------------------------------------- Erzadern im Fels
function drawOre(o) {
  const X = o.x * TS, Y = o.y * TS, f = o.max ? o.amt / o.max : 0;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(X, Y + 7, 14, 4, 0, 0, 7); ctx.fill();
  // ein Felsbrocken mit grünen und blauen Erzadern
  const rock = (x, y, w, h) => { ctx.fillStyle = '#5e5a55'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#8a857d'; ctx.fillRect(x + 1, y, w - 2, 2); ctx.fillStyle = '#46433f'; ctx.fillRect(x, y + h - 2, w, 2); };
  rock(X - 12, Y - 6, 15, 13); rock(X + 1, Y - 3, 12, 10); rock(X - 6, Y - 11, 11, 7);
  if (f <= 0) { ctx.fillStyle = '#2a2724'; ctx.fillRect(X - 6, Y - 3, 12, 7); ctx.fillStyle = '#6e6a64'; for (let i = 0; i < 4; i++) ctx.fillRect(X - 10 + i * 6, Y + 6, 3, 2); return; } // ausgebeutet
  const n = Math.max(3, Math.round(11 * f));
  for (let i = 0; i < n; i++) { const a = hash(o.id % 9973 + i, 5), b = hash(i, o.id % 997); ctx.fillStyle = i % 3 === 2 ? '#3fb0b0' : '#4cd078'; ctx.fillRect(X - 11 + a * 21, Y - 9 + b * 14, 3, 2); ctx.fillStyle = 'rgba(255,255,255,.5)'; if (i % 4 === 0) ctx.fillRect(X - 11 + a * 21, Y - 9 + b * 14, 1, 1); }
  ctx.fillStyle = '#c8783a'; ctx.fillRect(X + 4, Y + 1, 3, 2); ctx.fillRect(X - 7, Y - 1, 2, 2);
  if (Math.floor(FT * 1.5 + o.id) % 6 === 0) { ctx.fillStyle = '#e8fff0'; ctx.fillRect(X - 2, Y - 8, 1, 3); ctx.fillRect(X - 3, Y - 7, 3, 1); } // Glitzern
}

// =====================================================================
//  FPS-Anzeige: Bilder pro Sekunde, Bildzeiten, wo die Zeit hingeht
// =====================================================================
const PERF = {
  on: (() => { try { return localStorage.getItem('civ.fps') === '1'; } catch (e) { return false; } })(),
  last: 0, times: [], acc: { draw: [], panel: [], state: [] }, el: null, cv: null, upd: 0, worst: 0,
  note(k, ms) { if (!this.on) return; const a = this.acc[k]; a.push(ms); if (a.length > 120) a.shift(); },
  toggle(v) { this.on = v === undefined ? !this.on : v; try { localStorage.setItem('civ.fps', this.on ? '1' : '0'); } catch (e) {} if (this.el) this.el.style.display = this.on ? 'block' : 'none'; const cb = document.getElementById('fpson'); if (cb) cb.checked = this.on; this.times = []; this.worst = 0; },
  frame(t) {
    if (!this.on) { if (this.el) this.el.style.display = 'none'; return; }
    if (!this.el) {
      const d = document.createElement('div'); d.id = 'fpsbox';
      d.style.cssText = 'position:fixed;left:8px;top:44px;z-index:8;background:#0c1218e6;border:1px solid #3a4a5a;border-radius:6px;padding:6px 8px;font:11px/1.35 ui-monospace,Consolas,monospace;color:#cfe;pointer-events:none;min-width:190px';
      d.innerHTML = '<div id="fpstx"></div><canvas id="fpscv" width="190" height="44" style="display:block;margin-top:4px"></canvas>';
      document.body.appendChild(d); this.el = d; this.cv = d.querySelector('canvas');
    }
    this.el.style.display = 'block';
    if (this.last) { const dt = t - this.last; this.times.push(dt); if (this.times.length > 180) this.times.shift(); if (dt > this.worst) this.worst = dt; }
    this.last = t;
    if (t - this.upd < 250) return; this.upd = t;
    const T = this.times; if (!T.length) return;
    const avg = T.reduce((a, b) => a + b, 0) / T.length, sorted = [...T].sort((a, b) => b - a), low1 = sorted[Math.max(0, Math.floor(T.length * 0.01))];
    const m = k => { const a = this.acc[k]; return a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '–'; };
    const mx = k => { const a = this.acc[k]; return a.length ? Math.max(...a).toFixed(0) : '–'; };
    const fps = 1000 / avg, col = fps >= 50 ? '#7fdc8a' : fps >= 30 ? '#e8c860' : '#f07060';
    const want = TPS * SPEEDS[ui.speed];
    document.getElementById('fpstx').innerHTML =
      `<b style="color:${col};font-size:13px">${fps.toFixed(0)} FPS</b> <span style="color:#9ab">Ø ${avg.toFixed(1)} ms · langsamste ${low1.toFixed(0)} ms</span><br>` +
      `Zeichnen: ${m('draw')} ms (max ${mx('draw')})<br>Fenster: ${m('panel')} ms (max ${mx('panel')})<br>Weltdaten: ${m('state')} ms (max ${mx('state')})<br>` +
      `Simulation: ${Math.round(SIM.tps || 0)} / ${Math.round(want)} Schritte/s${SIM.cores > 1 ? ` · ${SIM.cores} Kerne` : ''}<br>` +
      `${W ? W.npcs.length : 0} Menschen · ${W ? W.animals.length : 0} Tiere · Zoom ${cam.z.toFixed(2)}`;
    // Verlauf der Bildzeiten: grün = flüssig, gelb = unter 30 FPS, rot = Ruckler
    const g = this.cv.getContext('2d'), Wd = this.cv.width, H = this.cv.height; g.clearRect(0, 0, Wd, H);
    const y = ms => H - Math.min(H, ms / 66 * H);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y(16.7), Wd, 1); g.fillRect(0, y(33.3), Wd, 1);
    const n = T.length, w = Wd / 180;
    for (let i = 0; i < n; i++) { const v = T[i]; g.fillStyle = v <= 20 ? '#4caf6a' : v <= 34 ? '#d8b040' : '#e05a4a'; g.fillRect(Wd - (n - i) * w, y(v), Math.max(1, w - 0.2), H - y(v)); }
  },
};

// ---------------------------------------------------------------- Licht und Nacht im Pixelraster
function lightList() {
  const L = [];
  for (const T of W.tribes) if (T.alive && T.fire.lit) L.push([T.cx, T.cy, 110]);
  for (const f of W.fires) L.push([f.x, f.y, 90]);
  for (const n of W.npcs) if (n.carryFire) L.push([n.x, n.y, 40]); else if (n._torch) { const [x, y] = lerpPos(n); L.push([x, y, 34]); }
  for (const T of W.tribes) if (T.alive && T.town && TK(T, 'fackeln')) for (const p of townTorches(T)) L.push([p[0], p[1] - 0.6, 30]);
  for (const T of W.tribes) if (T.alive && hallDone(T)) { const H = hallOf(T); if (H) L.push([H.x, H.y, 36]); }
  for (const T of W.tribes) if (T.alive) for (const h of T.huts) if (h.lx !== undefined && (h.lx + h.ly) % 3 === 0) L.push([h.x, h.y, 13]);
  return L;
}
const NP = document.createElement('canvas'), npc2 = NP.getContext('2d');
function pixelNight(dark, dusk) {
  if (NP.width !== PIX.width || NP.height !== PIX.height) { NP.width = PIX.width; NP.height = PIX.height; }
  const g = npc2, ox = PIXO[0], oy = PIXO[1], Wd = NP.width, Hd = NP.height;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, Wd, Hd);
  g.fillStyle = `rgba(${8 + Math.round(30 * dusk)},${14 + Math.round(6 * dusk)},${35 + Math.round(20 * dusk)},${0.74 * dark})`; g.fillRect(0, 0, Wd, Hd);
  g.globalCompositeOperation = 'destination-out';
  const L = lightList().filter(([x, y, r]) => x * TS - ox > -r && x * TS - ox < Wd + r && y * TS - oy > -r && y * TS - oy < Hd + r);
  // drei harte Lichtstufen statt eines weichen Verlaufs – das klassische Pixel-Licht
  for (const [lx, ly, r0] of L) {
    const r = Math.round(r0 * (0.97 + (Math.floor(FT * 6 + lx) % 2) * 0.03)), c = lightStamp(r);
    g.drawImage(c, Math.round(lx * TS - ox) - r, Math.round(ly * TS - oy) - r);
  }
  pctx.drawImage(NP, 0, 0);
  // warmer Schein, ebenfalls in Stufen
  pctx.globalCompositeOperation = 'lighter';
  pctx.globalAlpha = dark; for (const [lx, ly, r0] of L) { const c = glowStamp(Math.round(r0 * 0.45)); pctx.drawImage(c, Math.round(lx * TS - ox) - c.width / 2, Math.round(ly * TS - oy) - c.height / 2); } pctx.globalAlpha = 1;
  pctx.globalCompositeOperation = 'source-over';
}
// vorgefertigte Lichtstempel je Radius (drei harte Stufen)
const LSTAMP = new Map(), GSTAMP = new Map();
function lightStamp(r) { let c = LSTAMP.get(r); if (c) return c; c = document.createElement('canvas'); c.width = c.height = r * 2 + 1; const g = c.getContext('2d'); for (const [k, a] of [[1, 0.35], [0.72, 0.6], [0.45, 1]]) { g.fillStyle = `rgba(0,0,0,${a})`; pixelDisc(g, r, r, Math.round(r * k)); } LSTAMP.set(r, c); return c; }
function glowStamp(r) { let c = GSTAMP.get(r); if (c) return c; c = document.createElement('canvas'); c.width = c.height = r * 2 + 1; const g = c.getContext('2d'); g.fillStyle = 'rgba(255,140,40,.10)'; pixelDisc(g, r, r, r); g.fillStyle = 'rgba(255,160,60,.10)'; pixelDisc(g, r, r, Math.round(r * 0.55)); GSTAMP.set(r, c); return c; }
// gefüllter Kreis aus ganzen Pixeln (Zeile für Zeile), ohne Kantenglättung
function pixelDisc(g, cx, cy, r) { if (r <= 0) return; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } }
