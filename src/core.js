// =====================================================================
//  CIVARRIA  ·  Simulationskern
// =====================================================================
const C = { MW: 400, MH: 270, TPD: 48, DPS: 30, SPY: 4 };
C.DPY = C.DPS * C.SPY;
C.TPY = C.TPD * C.DPY;
const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
const T_DEEP = 0, T_SHALLOW = 1, T_SHORE = 2, T_GRASS = 3, T_FOREST = 4, T_HILLS = 5, T_MOUNT = 6;
const MOVE_COST = [0, 0.45, 0.9, 1, 0.75, 0.65, 0.4];

let W = null;          // die Welt (komplett speicherbar)
let NPC = new Map();   // id -> npc (Laufzeit-Index)
let TRIBE = new Map(); // id -> tribe
let BGRID = null;      // Büsche-Raster (Laufzeit)
const HOOKS = { onChronicle: null, onTile: null };
const STAT = { g: 0, h: 0, f: 0, es: 0, ei: 0, roots: 0, trips: 0, emptyTrips: 0 };

// ---------- Zufall (speicherbar) ----------
function rnd() {
  let a = W.rs | 0; a = (a + 0x6D2B79F5) | 0; W.rs = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// ---------- Zeit ----------
const dayNum = () => Math.floor(W.tick / C.TPD);
const hourNow = () => (W.tick % C.TPD) * 24 / C.TPD;
const SEASON_LEN = [25, 25, 25, 45]; // langer Winter
function seasonOf(d) { let r = d % C.DPY; for (let i = 0; i < 4; i++) { if (r < SEASON_LEN[i]) return i; r -= SEASON_LEN[i]; } return 3; }
function dayInSeason(d) { let r = d % C.DPY; for (let i = 0; i < 4; i++) { if (r < SEASON_LEN[i]) return r; r -= SEASON_LEN[i]; } return r; }
let _SC = -1, _SV = 0, _NC = -1, _NV = false;
const seasonNow = () => { if (_SC !== W.tick) { _SC = W.tick; _SV = seasonOf(dayNum()); } return _SV; };
const yearNow = () => Math.floor(dayNum() / C.DPY) + 1;
const isNight = () => { if (_NC !== W.tick) { _NC = W.tick; const h = hourNow(); _NV = h >= 21 || h < 5.5; } return _NV; };
const ageY = n => (W.tick - n.born) / C.TPY;
function dateStr(t) {
  const d = Math.floor(t / C.TPD);
  return `Jahr ${Math.floor(d / C.DPY) + 1}, ${SEASONS[seasonOf(d)]}`;
}

// ---------- Technologien / Erkenntnisse ----------
// ctx = in welchen Situationen ein NPC Einsicht in diese Sache gewinnen kann
const TECH = {
  faustkeil:   { name: 'Steinwerkzeug', icon: '🪨', req: [], D: 4500, ctx: { stone: 1, hunt: 0.3, experiment: 1 }, desc: 'Geschlagene Steine mit scharfer Kante – zum Schneiden, Schaben und Hauen.' },
  speer:       { name: 'Speer', icon: '🗡', req: ['faustkeil'], D: 5100, ctx: { hunt: 1, experiment: 0.6 }, desc: 'Ein gespitzter Holzschaft mit Steinspitze. Die Jagd wird viel erfolgreicher.' },
  feuer_machen:{ name: 'Feuer entfachen', icon: '🔥', req: ['faustkeil'], D: 7800, ctx: { knap: 1.3, experiment: 0.8, firework: 0.4 }, desc: 'Funken aus Feuerstein schlagen. Ein erloschenes Feuer kann neu entfacht werden.' },
  kochen:      { name: 'Kochen', icon: '🍖', req: [], D: 3900, ctx: { eatfire: 1, experiment: 0.5 }, desc: 'Fleisch über dem Feuer garen. Sättigt besser und macht seltener krank.' },
  fellkleidung:{ name: 'Fellkleidung', icon: '🧥', req: ['faustkeil'], D: 4500, ctx: { coldhide: 1.2, experiment: 0.5 }, desc: 'Felle zuschneiden und umhängen. Schützt vor Kälte.' },
  flechten:    { name: 'Korbflechten', icon: '🧺', req: [], D: 5100, ctx: { gather: 0.6, experiment: 0.8 }, desc: 'Fasern zu Körben flechten. Sammler tragen mehr nach Hause.' },
  fischen:     { name: 'Fischen', icon: '🐟', req: ['speer'], D: 1500, ctx: { water: 1.5, waterblock: 0.6, hunt: 0.15, experiment: 0.4 }, desc: 'Fische im seichten Wasser mit dem Speer fangen.' },
  huette:      { name: 'Hüttenbau', icon: '🛖', req: ['faustkeil'], D: 6600, ctx: { coldcamp: 1, wood: 0.4, experiment: 0.6 }, desc: 'Aus Ästen und Fellen feste Hütten bauen. Warm und geschützt.' },
  heilkraeuter:{ name: 'Heilkräuter', icon: '🌿', req: [], D: 6000, ctx: { sickgather: 1.5, gather: 0.08, experiment: 0.4 }, desc: 'Bestimmte Pflanzen lindern Krankheit und Wunden.' },
  bestattung:  { name: 'Bestattung', icon: '⚱', req: [], D: 1800, ctx: { grief: 1 }, desc: 'Die Toten werden mit einem Ritual begraben. Ahnen werden verehrt.' },
  malerei:     { name: 'Zeichen & Malerei', icon: '🎨', req: [], D: 7200, ctx: { ritual: 0.8, rest: 0.25, experiment: 0.6 }, desc: 'Bilder und Zeichen an Felswänden. Wissen kann so die Zeit überdauern.' },
  toepfern:    { name: 'Töpferei', icon: '🏺', req: ['feuer_machen'], D: 8400, ctx: { clayfire: 1, experiment: 0.7 }, desc: 'Lehm im Feuer brennen. Vorräte verderben langsamer.' },
  zaehmung:    { name: 'Tierzähmung', icon: '🐕', req: ['speer'], D: 10500, ctx: { wolfnear: 1, experiment: 0.3 }, desc: 'Wölfe gewöhnen sich an Menschen und werden zu Jagdgefährten.' },
  bogen:       { name: 'Pfeil & Bogen', icon: '🏹', req: ['speer', 'flechten'], D: 9000, ctx: { hunt: 0.8, experiment: 0.5 }, desc: 'Eine gespannte Sehne schleudert Pfeile weit und genau. Jagd und Kampf verändern sich.' },
  palisade:    { name: 'Palisaden', icon: '🪵', req: ['faustkeil', 'huette'], D: 7500, ctx: { raided: 3, build: 0.4, experiment: 0.3 }, desc: 'Angespitzte Pfähle im Kreis um das Lager. Schutz vor Räubern, Feinden und Wölfen.' },
  viehzucht:   { name: 'Viehzucht', icon: '🐐', req: ['flechten', 'faustkeil'], D: 6500, ctx: { goatnear: 1.5, experiment: 0.3 }, desc: 'Wildziegen einfangen, einpferchen und vermehren. Milch und Fleisch ohne Jagd.' },
  reusen:      { name: 'Fischreusen', icon: '🪤', req: ['fischen', 'flechten'], D: 3200, ctx: { water: 0.8, experiment: 0.4 }, desc: 'Geflochtene Fallen im seichten Wasser fangen Fische, während man schläft.' },
  weben:       { name: 'Weben', icon: '🧶', req: ['flechten', 'viehzucht'], D: 9000, ctx: { goatnear: 0.3, gather: 0.15, rest: 0.3, experiment: 0.6 }, desc: 'Ziegenhaar und Pflanzenfasern zu Fäden drehen und zu Stoff verweben. Leichte, warme Kleidung.' },
  floss:       { name: 'Floß', icon: '🛶', req: ['flechten', 'faustkeil'], D: 7000, ctx: { waterblock: 1, water: 0.3, experiment: 0.4 }, desc: 'Baumstämme zusammenbinden und über Flüsse und Seen setzen.' },
  steinbau:    { name: 'Steinbau', icon: '🧱', req: ['huette', 'faustkeil'], D: 9000, ctx: { stone: 0.6, build: 1.2, experiment: 0.4 }, desc: 'Fels aus Hügeln und Bergen brechen und daraus feste Steinhäuser bauen.' },
  ackerbau:    { name: 'Ackerbau', icon: '🌾', req: ['flechten', 'toepfern'], D: 15000, ctx: { gathercamp: 1, experiment: 0.4 }, desc: 'Samen in die Erde bringen und ernten. Der Anfang der Sesshaftigkeit.' },
};
let TECH_IDS = Object.keys(TECH);

const TRAITS = {
  neugier: 'Neugier', skepsis: 'Skepsis', mut: 'Mut', gier: 'Gier', gesellig: 'Geselligkeit',
  ehrgeiz: 'Ehrgeiz', fromm: 'Frömmigkeit', stur: 'Sturheit', charisma: 'Charisma',
  mitgefuehl: 'Mitgefühl', geschick: 'Geschick',
};
const TRAIT_EPI = {
  neugier: ['die Neugierige', 'der Neugierige'], skepsis: ['die Zweiflerin', 'der Zweifler'], mut: ['die Kühne', 'der Kühne'],
  gier: ['die Raffende', 'der Raffende'], gesellig: ['die Gesellige', 'der Gesellige'], ehrgeiz: ['die Ehrgeizige', 'der Ehrgeizige'],
  fromm: ['die Fromme', 'der Fromme'], stur: ['die Sture', 'der Sture'], charisma: ['die Strahlende', 'der Strahlende'],
  mitgefuehl: ['die Gütige', 'der Gütige'], geschick: ['die Geschickte', 'der Geschickte'],
};

// ---------- Namen ----------
const SYL_A = ['Ka', 'Ro', 'Mi', 'Ta', 'Bru', 'E', 'Lo', 'Gar', 'Thi', 'Ul', 'Sa', 'Na', 'Vo', 'I', 'Ma', 'Du', 'Ri', 'O', 'Fe', 'A', 'Bo', 'Ke', 'Hal', 'Sk', 'Yr', 'Te', 'Wa', 'Gu', 'Le', 'Ny'];
const SYL_B = ['ra', 'ma', 'lin', 'no', 'ka', 'ru', 'ti', 'sha', 'go', 'dri', 'mo', 'ne', 'va', 'ko', 'li', 'ar', 'en', 'ul', 'ri', 'de'];
const END_M = ['k', 'n', 'r', 'g', 'th', 'm', 'rik', 'dor', 'an', 'ok', 'urn', ''];
const END_F = ['a', 'i', 'e', 'ia', 'ra', 'ya', 'na', 'ela', 'is', 'enn', ''];
function makeName(sex) {
  let n = pick(SYL_A) + (rnd() < 0.7 ? pick(SYL_B) : '') + (sex === 'f' ? pick(END_F) : pick(END_M));
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}
const TRIBE_A = ['Rot', 'Grau', 'Stein', 'Fluss', 'Aschen', 'Nebel', 'Sturm', 'Moos', 'Birken', 'Schatten', 'Sonnen', 'Eis', 'Dorn', 'Wolken', 'Erd', 'Glut', 'Silber', 'Farn'];
const TRIBE_B = ['wölfe', 'hirsche', 'raben', 'bären', 'luchse', 'otter', 'falken', 'eulen', 'dachse', 'füchse', 'adler', 'biber', 'kraniche', 'elche'];
const TRIBE_COL = ['#d9644a', '#4a90d9', '#e0b03c', '#59b36b', '#b05ad9', '#d95aa0', '#4ac0c0', '#c08a4a', '#8a9ad9', '#9ad94a', '#d9d94a', '#e07a2e', '#6a6ad9', '#3cb08a', '#c04a6a', '#9a7a5a'];
function makeTribeName() {
  for (let i = 0; i < 50; i++) {
    const n = pick(TRIBE_A) + pick(TRIBE_B);
    if (!W.tribes.some(t => t.name === n)) return n;
  }
  return pick(TRIBE_A) + pick(TRIBE_B) + ' ' + W.tribes.length;
}
const SPIRITS = ['Großer Hirsch', 'Ewiges Feuer', 'Mutter Fluss', 'Himmelswolf', 'Sternenauge', 'Steinvater', 'Nebelfrau', 'Donnergeist', 'Weiße Eule', 'Schlafender Berg', 'Mondbärin', 'Tiefe Quelle'];
const RITUALS = ['vor der Jagd Asche auf die Stirn reiben', 'dem Wild ein Lied singen', 'einen Knochen am Lager vergraben', 'dreimal ums Feuer gehen', 'einen Stein nach Osten werfen', 'vor dem Aufbruch schweigen', 'Federn ins Haar stecken', 'Blut auf den Speer streichen'];

// =====================================================================
//  Welt erzeugen
// =====================================================================
function makeNoise() {
  const N = 256, g = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) g[i] = rnd();
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = g[((yi & 255) * N) + (xi & 255)], b = g[((yi & 255) * N) + ((xi + 1) & 255)];
    const c = g[(((yi + 1) & 255) * N) + (xi & 255)], d = g[(((yi + 1) & 255) * N) + ((xi + 1) & 255)];
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
function fbm(n, x, y, o) { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2; } return s / t; }

const WORLD_SIZES = { klein: [400, 270], mittel: [800, 540], gross: [1400, 950], riesig: [2000, 1360] };
// Wildpflanzen: was wann wächst (Frühling, Sommer, Herbst, Winter) und wie viel ein Strauch trägt
const PLANT = {
  berry:    { name: 'Beeren',     grow: [1.2, 2.6, 2.0, 0], winter: 0.08, max: () => rint(12, 22) },
  apple:    { name: 'Wildäpfel',  grow: [0, 0.5, 4.2, 0],   winter: 0.15, max: () => rint(22, 34) },
  hazel:    { name: 'Haselnüsse', grow: [0, 0.4, 3.2, 0],   winter: 0,    max: () => rint(16, 26) }, // Nüsse halten sich über den Winter
  mushroom: { name: 'Pilze',      grow: [1.6, 0.6, 3.8, 0], winter: 0.4,  max: () => rint(8, 14) },
};
function plantKind(t, r) { return t === T_FOREST ? (r < 0.42 ? 'mushroom' : r < 0.7 ? 'berry' : r < 0.86 ? 'hazel' : 'apple') : (r < 0.58 ? 'berry' : r < 0.82 ? 'hazel' : 'apple'); }
function newWorld(seed, opts = {}) {
  const popTarget = opts.pop || 300, nTribes = opts.tribes || 10;
  const sz = WORLD_SIZES[opts.size] || WORLD_SIZES.klein; C.MW = sz[0]; C.MH = sz[1];
  const AREA = (C.MW * C.MH) / (400 * 270);
  W = {
    v: 1, seed, rs: seed | 0, tick: 0, nextId: 1, progress: opts.progress || 1,
    t: [], flint: [], clay: [], bushes: [], ochre: [], animals: [], npcs: [], dead: [], tribes: [],
    chron: [], stats: [], beliefs: {}, cults: {}, raids: [], fires: [], graves: [], corpses: [], fauna2: 1, res: {}, cut: {}, foot: {}, path: {}, pathVer: 0, fields: {},
    discovered: {}, // techId -> {t, by, tribe}
    MW: C.MW, MH: C.MH, size: opts.size || 'klein',
  };
  NPC = new Map(); TRIBE = new Map();
  for (let i = 0; i < 20; i++) rnd();
  const nE = makeNoise(), nM = makeNoise(), nC = makeNoise();
  const { MW, MH } = C;
  const elev = new Float32Array(MW * MH);
  // große Welten: Kontinente, Meeresarme und lange Gebirgszüge über der kleinräumigen Landschaft
  const cw = AREA > 1.5 ? 0.5 : 0, cs = Math.max(MW, MH) / 4.5;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const ex = Math.min(x, MW - 1 - x) / 34, ey = Math.min(y, MH - 1 - y) / 34;
    const edge = Math.min(1, Math.min(ex, ey));
    let e = fbm(nE, x / 48, y / 48, 6);
    if (cw) { const c = fbm(nC, x / cs, y / cs, 4), ridge = 1 - Math.abs(fbm(nC, x / (cs * 0.6) + 31, y / (cs * 0.6) + 17, 3) - 0.5) * 2; e = e * (1 - cw) + (c * 0.85 + ridge * ridge * 0.25) * cw; }
    elev[y * MW + x] = e * (0.55 + 0.45 * edge) + 0.25 * edge - 0.1;
  }
  if (cw) { // Höhen so verteilen, dass Wasser, Ebenen und Gebirge im gewohnten Verhältnis bleiben
    const smp = []; for (let k = 0; k < 60000; k++) smp.push(elev[(rnd() * MW * MH) | 0]); smp.sort((a, b) => a - b);
    const q = p => smp[Math.min(smp.length - 1, (p * smp.length) | 0)];
    const src = [smp[0], q(0.15), q(0.18), q(0.77), q(0.91), smp[smp.length - 1]], dst = [0, 0.33, 0.36, 0.68, 0.77, 1];
    for (let i = 0; i < MW * MH; i++) { const e = elev[i]; let k = 0; while (k < 4 && e > src[k + 1]) k++; const a = src[k], b = src[k + 1]; elev[i] = dst[k] + (dst[k + 1] - dst[k]) * clamp((e - a) / Math.max(1e-6, b - a), 0, 1); }
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x, e = elev[i], m = fbm(nM, x / 26 + 50, y / 26 + 50, 5);
    let t;
    if (e < 0.33) t = T_DEEP; else if (e < 0.36) t = T_SHORE;
    else if (e > 0.77) t = T_MOUNT; else if (e > 0.68) t = T_HILLS;
    else t = m > 0.52 ? T_FOREST : T_GRASS;
    W.t.push(t);
  }
  // Flüsse
  for (let r = 0; r < Math.round(16 * AREA); r++) {
    let x = 0, y = 0, ok = false;
    for (let k = 0; k < 400; k++) { x = rint(10, MW - 11); y = rint(10, MH - 11); if (W.t[y * MW + x] >= T_HILLS) { ok = true; break; } }
    if (!ok) continue;
    for (let s = 0; s < 900 * Math.sqrt(AREA); s++) {
      const i = y * MW + x;
      if (W.t[i] === T_DEEP) break;
      W.t[i] = T_SHALLOW;
      let best = null, be = 9;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
        const ni = ny * MW + nx; if (W.t[ni] === T_SHALLOW) continue;
        const e2 = elev[ni] + rnd() * 0.02; if (e2 < be) { be = e2; best = [nx, ny]; }
      }
      if (!best) break; x = best[0]; y = best[1]; elev[y * MW + x] = Math.min(elev[y * MW + x], elev[i] - 0.001);
    }
  }
  for (let i = 0; i < MW * MH; i++) {
    const x = i % MW, y = (i / MW) | 0, t = W.t[i];
    let nearW = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < MW && ny < MH && W.t[ny * MW + nx] <= T_SHALLOW) nearW = true; }
    W.clay.push(nearW && (t === T_SHORE || t === T_GRASS) && rnd() < 0.5 ? 1 : 0);
    W.flint.push(t === T_HILLS && rnd() < 0.12 ? 1 : 0);
    if (t === T_GRASS && rnd() < 0.07 || t === T_FOREST && rnd() < 0.11) { const k = plantKind(t, rnd()); W.bushes.push({ id: W.nextId++, x: x + 0.5, y: y + 0.5, f: rint(4, 10), max: PLANT[k].max(), k }); }
    if (t === T_HILLS && rnd() < 0.006) W.ochre.push({ x: x + 0.5, y: y + 0.5 });
  }
  // Tiere
  const land = () => { for (let k = 0; k < 2000; k++) { const x = rint(2, MW - 3), y = rint(2, MH - 3), t = W.t[y * MW + x]; if (t === T_GRASS || t === T_FOREST) return [x + 0.5, y + 0.5]; } return [MW / 2, MH / 2]; };
  for (let i = 0; i < 70 * AREA; i++) { const [x, y] = land(); W.animals.push({ id: W.nextId++, k: 'deer', x, y, tx: x, ty: y, born: -rint(0, 8) * C.TPY }); }
  for (let i = 0; i < 14 * AREA; i++) { const [x, y] = land(); W.animals.push({ id: W.nextId++, k: 'horse', x, y, tx: x, ty: y, born: -rint(0, 8) * C.TPY }); }
  for (let p = 0; p < 4 * AREA; p++) { const [x, y] = land(); for (let i = 0; i < 3; i++) W.animals.push({ id: W.nextId++, k: 'wolf', x: x + rnd(), y: y + rnd(), tx: x, ty: y, born: -rint(0, 6) * C.TPY, owner: 0 }); }

  { // Wildziegen in den Hügeln
    for (let g = 0; g < 5 * AREA; g++) { let p = null; for (let k = 0; k < 400 && !p; k++) { const x = rint(2, MW - 3), y = rint(2, MH - 3); if (W.t[y * MW + x] === T_HILLS) p = [x + 0.5, y + 0.5]; } if (!p) continue; for (let i = 0; i < 3; i++) W.animals.push({ id: W.nextId++, k: 'goat', x: p[0] + rnd(), y: p[1] + rnd(), tx: p[0], ty: p[1], born: -rint(0, 6) * C.TPY, tribe: 0 }); }
  }
  { // Wildtiere, aus denen später Haustiere werden: Mufflons in den Hügeln, Auerochsen und Wildesel im Grasland, Wildschweine im Wald
    const spot = (tt) => { for (let k = 0; k < 400; k++) { const x = rint(2, MW - 3), y = rint(2, MH - 3); if (W.t[y * MW + x] === tt) return [x + 0.5, y + 0.5]; } return null; };
    for (const [kind, tt, groups, size] of [['sheep', T_HILLS, 4, 3], ['cattle', T_GRASS, 3, 4], ['pig', T_FOREST, 4, 3], ['donkey', T_GRASS, 3, 3]])
      for (let g = 0; g < groups * AREA; g++) { const p = spot(tt); if (!p) continue; for (let i = 0; i < size; i++) W.animals.push({ id: W.nextId++, k: kind, x: p[0] + rnd(), y: p[1] + rnd(), tx: p[0], ty: p[1], born: -rint(0, 6) * C.TPY, tribe: 0 }); }
  }
  makeOres(MW, MH, AREA);
  // Sippen
  const camps = []; buildIndex();
  for (let tr = 0; tr < nTribes; tr++) {
    let best = null, cands = 0;
    for (let k = 0; k < 6000 * Math.sqrt(AREA); k++) {
      const x = rint(35, MW - 36), y = rint(30, MH - 31), t = W.t[y * MW + x];
      if (t !== T_GRASS) continue;
      if (camps.some(c => dist(c[0], c[1], x, y) < 45)) continue;
      let water = 99; for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) { const tt = W.t[(y + dy) * MW + x + dx]; if (tt <= T_SHALLOW) water = Math.min(water, Math.hypot(dx, dy)); }
      if (water > 7 || water < 2) continue;
      // reiche Gegend bevorzugen: Beeren und Wald in der Nähe
      let sc = 0; for (const b of bushesNear(x, y, 20)) sc += b.max;
      let forest = 0; for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) if (W.t[(y + dy) * MW + x + dx] === T_FOREST) forest++;
      sc += Math.min(forest, 10) * 40;
      if (!best || sc > best[2]) best = [x + 0.5, y + 0.5, sc];
      if (++cands >= 50) break;
    }
    if (!best) for (let k = 0; k < 2000; k++) { const x = rint(12, MW - 13), y = rint(10, MH - 11); if (W.t[y * MW + x] === T_GRASS && !camps.some(c => dist(c[0], c[1], x, y) < 18)) { best = [x + 0.5, y + 0.5]; break; } }
    if (!best) continue;
    camps.push(best);
    const T = makeTribe(best[0], best[1], null);
    T.fire.lit = true; T.fire.fuel = 40; T.store.food = 220;
    const size = Math.round(popTarget / nTribes);
    const fams = [];
    for (let i = 0; i < size; i++) {
      const age = i < size * 0.25 ? rint(0, 14) : rint(15, 48);
      const n = makeNpc(rnd() < 0.5 ? 'f' : 'm', T, null, null, age);
      n.x = best[0] + (rnd() - 0.5) * 6; n.y = best[1] + (rnd() - 0.5) * 6;
      if (age >= 16) fams.push(n);
    }
    // Paare + Kinder zuordnen
    const men = fams.filter(n => n.sex === 'm'), women = fams.filter(n => n.sex === 'f');
    for (let i = 0; i < Math.min(men.length, women.length) * 0.75; i++) { men[i].partner = women[i].id; women[i].partner = men[i].id; setRel(men[i], women[i], 60); setRel(women[i], men[i], 60); }
    const kids = T.members.map(id => NPC.get(id)).filter(n => ageY(n) < 15);
    for (const k of kids) { const m = pick(women.filter(w => w.partner && ageY(w) - ageY(k) > 16) .concat([null])); if (m) { k.parents = [m.id, m.partner]; m.kids.push(k.id); NPC.get(m.partner).kids.push(k.id); setRel(k, m, 70); setRel(m, k, 80); } }
    initCulture(T); chooseLeader(T, true);
  }
  buildIndex();
  for (const T of W.tribes) T.R = territoryRadius(T);
  computeTerritory();
  chron(3, `Die Welt erwacht. ${W.tribes.length} Sippen streifen durch das Land – sie kennen nur das Sammeln, die Jagd mit Stock und Stein und das Hüten des Feuers.`);
  return W;
}

function makeTribe(x, y, parent) {
  const T = {
    id: W.nextId++, name: makeTribeName(), col: TRIBE_COL[W.tribes.length % TRIBE_COL.length],
    cx: x, cy: y, fire: { lit: true, fuel: 30 }, store: { food: 0, wood: 0, hide: 0, stone: 0, fiber: 0, clay: 0, herbs: 0 },
    huts: [], paintings: [], pots: 0, members: [], leader: 0, founded: W.tick, parent: parent ? parent.id : 0,
    alive: true, rel: {}, customs: [], tension: {}, lastCheck: 0, fireLostT: -1, winterTarget: 24, winterDeaths: 0, R: 14, access: {}, trespass: {}, debt: {}, grudge: {}, treaties: [],
  };
  W.tribes.push(T); TRIBE.set(T.id, T);
  return T;
}

function makeNpc(sex, T, mother, father, ageYears = 0) {
  const tr = {};
  for (const k in TRAITS) {
    let v;
    if (mother && father) v = (mother.tr[k] + father.tr[k]) / 2 + (rnd() - 0.5) * 0.45;
    else v = (rnd() + rnd() + rnd()) / 3 + (rnd() - 0.5) * 0.3;
    tr[k] = clamp(v, 0.02, 0.98);
  }
  const n = {
    id: W.nextId++, name: makeName(sex), sex, born: W.tick - Math.round(ageYears * C.TPY), tribe: T.id,
    x: T.cx, y: T.cy, tr, hunger: rint(0, 40), energy: rint(60, 100), warmth: 80, health: 100, social: 60,
    inv: { food: 0, meat: 0, hide: 0, wood: 0, stone: 0, fiber: 0, clay: 0, herbs: 0 },
    tools: { faustkeil: 0, speer: 0, korb: 0, kleidung: 0, bogen: 0 },
    know: {}, insight: {}, thr: {}, exp: { hunt: 4, gather: 4, fish: 3 },
    beliefs: {}, mem: [], rel: {}, parents: mother ? [mother.id, father ? father.id : 0] : [], partner: 0, kids: [],
    prestige: rint(0, 10), act: null, sick: 0, injured: 0, whisper: null, notable: false, lastBirth: -99999,
    spots: [], hutIdx: -1, carryFire: false, followers: 0,
  };
  // Grundwissen der Sippe übernehmen (für Neugeborene: über Erziehung später)
  if (!mother) for (const k in TECH) if (T.members.length && T.members.some(id => NPC.get(id)?.know[k])) n.know[k] = 1;
  W.npcs.push(n); NPC.set(n.id, n); T.members.push(n.id);
  return n;
}

function buildIndex() {
  NPC = new Map(); TRIBE = new Map(); FLOW = new Map(); OWN = null;
  for (const n of W.npcs) NPC.set(n.id, n);
  for (const T of W.tribes) TRIBE.set(T.id, T);
  BGRID = new Map();
  for (const b of W.bushes) { const k = ((b.x / 8) | 0) + ',' + ((b.y / 8) | 0); if (!BGRID.has(k)) BGRID.set(k, []); BGRID.get(k).push(b); }
}

// ---------- Hilfen ----------
const tileAt = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= C.MW || y >= C.MH) return T_DEEP; return W.t[y * C.MW + x]; };
const passable = (x, y) => tileAt(x, y) !== T_DEEP;
const passableFor = (e, x, y) => { const t = tileAt(x, y); if (t === T_DEEP) return false; if (t === T_SHALLOW && e.know && !e.know.floss && tileAt(e.x, e.y) !== T_SHALLOW) return false; if (e.know && W.hutVer) { if (e.ghost > 0) { if (wallAt(x, y) && !wallAt(e.x, e.y) && !((e.stk || 0) > 40)) return false; } else if (!stepOK(e, e.x, e.y, x, y)) return false; } return true; };
const tribeOf = n => TRIBE.get(n.tribe);
const knows = (n, k) => !!n.know[k];
function epithet(n) {
  let best = null, bv = 0;
  for (const k in n.tr) { const v = Math.abs(n.tr[k] - 0.5); if (v > bv) { bv = v; best = k; } }
  if (!best || n.tr[best] < 0.5) return '';
  return TRAIT_EPI[best][n.sex === 'f' ? 0 : 1];
}
const fullName = n => { const e = epithet(n); return e ? `${n.name} ${e}` : n.name; };
function setRel(a, b, v) { a.rel[b.id] = clamp(v, -100, 100); }
function addRel(a, b, d) {
  a.rel[b.id] = clamp((a.rel[b.id] || 0) + d, -100, 100);
  const keys = Object.keys(a.rel);
  if (keys.length > 24) { // Vergessen: schwächste Beziehung (außer Familie)
    let wk = null, wv = 999;
    for (const k of keys) { const id = +k; if (id === a.partner || a.kids.includes(id) || a.parents.includes(id)) continue; const v = Math.abs(a.rel[k]); if (v < wv) { wv = v; wk = k; } }
    if (wk) delete a.rel[wk];
  }
}
function memo(n, text) { n.mem.unshift({ t: W.tick, text }); if (n.mem.length > 30) n.mem.pop(); }
function chron(imp, text, refs = {}) {
  const e = { t: W.tick, imp, text, ...refs };
  W.chron.push(e); if (W.chron.length > 4000) W.chron.splice(0, 500);
  if (HOOKS.onChronicle) HOOKS.onChronicle(e);
}
function moveToward(e, tx, ty, speed) {
  if (e.know && W.hutVer && (nearTownAny(e.x, e.y) || nearTownAny(tx, ty))) return navMove(e, tx, ty, speed);
  return moveStep(e, tx, ty, speed);
}
function moveStep(e, tx, ty, speed) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 0.35) return true;
  const ti = (e.y | 0) * C.MW + (e.x | 0);
  let cost = MOVE_COST[W.t[ti]] || 0.5; const pl = W.path[ti];
  if (pl) cost = Math.max(cost, 0.85) * (1 + 0.15 * pl);
  { const rl = W.road && W.road[ti]; if (rl) cost = Math.max(cost, 1) * (1.25 + 0.1 * rl); }
  if (e.know && (W.tick + e.id) % 3 === 0 && W.t[ti] >= T_SHORE) footstep(ti);
  const step = Math.min(d, speed * cost);
  const qx = e.x + dx / d * step, qy = e.y + dy / d * step;
  if (passableFor(e, qx, qy)) { e.x = qx; e.y = qy; e.dir = dx < 0 ? -1 : 1; e.stk = 0; return d - step < 0.35; }
  // lange festgesteckt? dann notfalls durch seichtes Wasser waten
  if (e.know && (e.stk = (e.stk || 0) + 1) > 25) { const t = tileAt(qx, qy); if (t === T_SHALLOW && !(W.hutVer && !houseOK(e, qx, qy))) { e.x = qx; e.y = qy; if (e.stk > 60) e.stk = 0; return d - step < 0.35; } }
  const a0 = Math.atan2(dy, dx);
  for (const off of [0.6, -0.6, 1.3, -1.3, 2, -2]) {
    const a = a0 + off, nx = e.x + Math.cos(a) * step, ny = e.y + Math.sin(a) * step;
    if (passableFor(e, nx, ny)) { e.x = nx; e.y = ny; e.dir = Math.cos(a) < 0 ? -1 : 1; return d - step < 0.35; }
  }
  return false;
}
// Fluss-Feld (Wegfindung) zum Lager jeder Sippe
let FLOW = new Map();
const FLOW_R = 110;
function flowAt(gi) { const x = gi % C.MW - this.x0, y = ((gi / C.MW) | 0) - this.y0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? 1e9 : this.d[y * this.w + x]; }
const TILE_COST = [0, 22, 11, 10, 14, 16, 25];
function flowFor(T) {
  let F = FLOW.get(T.id);
  const raft = !!T.raft;
  if (W.hutVer) wallAt(0, 0);
  if (F && F.cx === T.cx && F.cy === T.cy && F.raft === raft && F.wv === wallSig(T) && (F.pv === W.pathVer || W.tick - F.t < C.TPY)) return F;
  // Nur ein Fenster um das Lager: große Welten bleiben bezahlbar
  const RW = FLOW_R, x0 = Math.max(0, (T.cx | 0) - RW), y0 = Math.max(0, (T.cy | 0) - RW), MW = Math.min(C.MW, (T.cx | 0) + RW + 1) - x0, MH = Math.min(C.MH, (T.cy | 0) + RW + 1) - y0, N = MW * MH, d = new Int32Array(N).fill(1e9);
  const G = (lx, ly) => (ly + y0) * C.MW + lx + x0;
  // Binärer Heap (Dijkstra): Trampelpfade sind billiger zu begehen
  const hk = new Int32Array(N * 4), hv = new Int32Array(N * 4); let hn = 0;
  const push = (v, k) => { let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v; };
  const pop = () => { const v = hv[0], k = hk[0]; const lk = hk[--hn], lv = hv[hn]; let i = 0; while (true) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = lk; hv[i] = lv; popK = k; return v; };
  let popK = 0;
  const s0 = ((T.cy | 0) - y0) * MW + ((T.cx | 0) - x0); d[s0] = 0; push(s0, 0);
  while (hn > 0) {
    const i = pop(); if (popK > d[i]) continue;
    const x = i % MW, y = (i / MW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const j = ny * MW + nx, gj = G(nx, ny), t = W.t[gj];
      if (t === T_DEEP || (!raft && t === T_SHALLOW)) continue;
      if (dx && dy && (W.t[G(nx, y)] <= (raft ? T_DEEP : T_SHALLOW) || W.t[G(x, ny)] <= (raft ? T_DEEP : T_SHALLOW))) continue;
      let c = TILE_COST[t]; const pl = W.path[gj]; if (W.hutVer) { if (WMAP && WMAP.has(gj)) continue; const hh = houseAt(gj % C.MW, (gj / C.MW) | 0); if (hh) { const hx = gj % C.MW, hy = (gj / C.MW) | 0; if (!(hx === hh.lx + 2 && hy === hh.ly + hh.h - 1)) continue; c *= 3; } } if (pl) c = Math.max(6, Math.round(c / (1 + 0.3 * pl))); if (W.road && W.road[gj]) c = 5;
      if (dx && dy) c = Math.round(c * 1.41);
      const nd = d[i] + c; if (nd < d[j] && hn < N * 4 - 1) { d[j] = nd; push(j, nd); }
    }
  }
  F = { cx: T.cx, cy: T.cy, d, raft, wv: wallSig(T), t: W.tick, pv: W.pathVer, hv: W.hutVer || 0, x0, y0, w: MW, h: MH, at: flowAt }; FLOW.set(T.id, F); return F;
}
function moveVia(n, O, tx, ty, speed) { return moveHome(n, O, tx, ty, speed); }
function reachable(T, x, y) { const F = flowFor(T); if (dist(x, y, T.cx, T.cy) > FLOW_R - 2) return true; return F.at((y | 0) * C.MW + (x | 0)) < 1e9; }
function moveHome(n, T, tx, ty, speed) {
  if (W.hutVer && dist(n.x, n.y, tx, ty) < 30 && nearTownAny(n.x, n.y) && nearTownAny(tx, ty)) return moveToward(n, tx, ty, speed); // im Dorf: Rasterweg statt Flussfeld
  if (dist(n.x, n.y, tx, ty) < 9 || dist(tx, ty, T.cx, T.cy) > 10) return moveToward(n, tx, ty, speed);
  const F = flowFor(T), x = n.x | 0, y = n.y | 0; let bi = -1, bd = F.at(y * C.MW + x);
  if (bd >= 1e9) return moveToward(n, tx, ty, speed);
  if (n.wp !== undefined && n.wp >= 0 && F.at(n.wp) < bd && Math.abs((n.wp % C.MW) - x) <= 1 && Math.abs(((n.wp / C.MW) | 0) - y) <= 1) {
    moveToward(n, (n.wp % C.MW) + 0.5, ((n.wp / C.MW) | 0) + 0.5, speed); return false;
  }
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C.MW || ny >= C.MH) continue; const j = ny * C.MW + nx, dj = F.at(j); if (dj < bd) { bd = dj; bi = j; } }
  if (bi < 0) return moveToward(n, tx, ty, speed);
  n.wp = bi;
  moveToward(n, (bi % C.MW) + 0.5, ((bi / C.MW) | 0) + 0.5, speed);
  return false;
}
function nearestTile(x, y, r, test) {
  let best = null, bd = 1e9;
  for (let k = 0; k < 40; k++) {
    const tx = Math.floor(x + (rnd() * 2 - 1) * r), ty = Math.floor(y + (rnd() * 2 - 1) * r);
    if (tx < 0 || ty < 0 || tx >= C.MW || ty >= C.MH) continue;
    if (!test(tx, ty)) continue;
    const d = dist(x, y, tx + 0.5, ty + 0.5); if (d < bd) { bd = d; best = [tx + 0.5, ty + 0.5]; }
  }
  return best;
}
// Trampelpfade: wo oft gegangen wird, entsteht ein Weg
const PATH_LV = [0, 30, 110, 280];
function footstep(i) {
  const f = (W.foot[i] || 0) + 1; W.foot[i] = f;
  const lv = W.path[i] || 0;
  if (lv < 3 && f >= PATH_LV[lv + 1]) { W.path[i] = lv + 1; W.pathVer++; if (HOOKS.onTile) HOOKS.onTile(i % C.MW, (i / C.MW) | 0); }
}
function decayPaths() {
  for (const k in W.foot) {
    const f = W.foot[k] * 0.55; const lv = W.path[k] || 0;
    if (f < 3 && !lv) { delete W.foot[k]; continue; }
    W.foot[k] = f;
    if (lv && f < PATH_LV[lv] * 0.35) { if (lv === 1) delete W.path[k]; else W.path[k] = lv - 1; W.pathVer++; if (HOOKS.onTile) HOOKS.onTile(k % C.MW, (k / C.MW) | 0); }
  }
}
// Rohstoffe aus der Landschaft – Wälder und Felsen können verschwinden
const RES_CAP = { [T_FOREST]: 24, [T_HILLS]: 30, [T_MOUNT]: 45 };
function harvestTile(x, y, amt, T) {
  x |= 0; y |= 0; const i = y * C.MW + x, t = W.t[i], cap = RES_CAP[t];
  if (!cap) return false;
  const rem = (W.res[i] ?? cap) - amt;
  if (rem > 0) { W.res[i] = rem; return false; }
  delete W.res[i];
  if (t === T_FOREST) { W.t[i] = T_GRASS; W.cut[i] = 'f'; if (T) { T.cleared = (T.cleared || 0) + 1; if (T.cleared === 25) chron(2, `Rund um das Lager der ${T.name} ist der Wald gelichtet – nur Baumstümpfe erinnern an ihn.`, { tribe: T.id }); } }
  else if (t === T_MOUNT) { W.t[i] = T_HILLS; W.cut[i] = 'r'; }
  else if (t === T_HILLS) { W.t[i] = T_GRASS; W.cut[i] = 'r'; W.flint[i] = 0; if (T) { T.quarried = (T.quarried || 0) + 1; if (T.quarried === 10) chron(2, `Die ${T.name} haben einen ganzen Hügel abgetragen.`, { tribe: T.id }); } }
  if (HOOKS.onTile) HOOKS.onTile(x, y);
  return true;
}
function regrowForest() {
  for (let k = 0; k < 150; k++) {
    const x = rint(1, C.MW - 2), y = rint(1, C.MH - 2), i = y * C.MW + x;
    if (W.t[i] !== T_GRASS || W.fields[i] || W.path[i]) continue;
    let f = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (W.t[i + dx + dy * C.MW] === T_FOREST) f++;
    if (f < 2 || rnd() > 0.05) continue;
    if (W.tribes.some(T => T.alive && dist(T.cx, T.cy, x, y) < 12)) continue;
    W.t[i] = T_FOREST; delete W.cut[i]; if (HOOKS.onTile) HOOKS.onTile(x, y);
  }
}
function bushesNear(x, y, r) {
  const out = [], gx = (x / 8) | 0, gy = (y / 8) | 0, gr = Math.ceil(r / 8);
  for (let j = gy - gr; j <= gy + gr; j++) for (let i = gx - gr; i <= gx + gr; i++) {
    const l = BGRID.get(i + ',' + j); if (!l) continue;
    for (const b of l) if (!b.gone && dist(x, y, b.x, b.y) <= r) out.push(b);
  }
  return out;
}
function adults(T) { return T.members.map(id => NPC.get(id)).filter(n => n && ageY(n) >= 15); }
function tribeKnows(T, k) { return T.members.some(id => NPC.get(id)?.know[k]); }

// =====================================================================
//  Erkenntnis & Lernen
// =====================================================================
let CTX_TECH = null;
function insightCtx(n, ctx, amt = 1) {
  const tm = (0.2 + n.tr.neugier * 1.1) * (0.55 + n.tr.geschick * 0.8) * (ageY(n) < 12 ? 0.3 : 1) * cultInsight(n);
  if (!CTX_TECH || CTX_TECH.n !== TECH_IDS.length) { CTX_TECH = { n: TECH_IDS.length }; for (const k of TECH_IDS) for (const c in TECH[k].ctx) (CTX_TECH[c] = CTX_TECH[c] || []).push(k); }
  const list = CTX_TECH[ctx]; if (!list) return;
  for (const k of list) {
    if (n.know[k]) continue;
    const T_ = TECH[k], w = T_.ctx[ctx]; if (!w) continue;
    if (!T_.req.every(r => n.know[r])) continue;
    if (T_.cond && !T_.cond(tribeOf(n))) continue;
    n.insight[k] = (n.insight[k] || 0) + w * tm * amt * W.progress;
    if (!n.thr[k]) n.thr[k] = Math.round(T_.D * (0.65 + rnd() * 0.75));
    if (n.insight[k] >= n.thr[k]) discover(n, k);
  }
}
function discover(n, k) {
  n.know[k] = 1; n.prestige += 25; n.notable = true;
  const T = tribeOf(n), first = !W.discovered[k];
  if (first) { nudgeTribe(T, 'wissen', 0.04); nudgeTribe(T, 'tradition', -0.03); }
  const how = {
    faustkeil: 'schlägt zwei Steine gegeneinander und bemerkt die scharfe Kante',
    speer: 'bindet eine Steinspitze an einen Stock',
    feuer_machen: 'sieht Funken aus dem Feuerstein springen – und entfacht damit trockenes Gras',
    kochen: 'lässt ein Stück Fleisch ins Feuer fallen und merkt, wie gut es schmeckt',
    fellkleidung: 'schneidet ein Fell zurecht und wickelt es um den frierenden Körper',
    flechten: 'verdreht beim Sammeln Gräser zu einem festen Geflecht',
    fischen: 'spießt im seichten Wasser einen Fisch auf',
    huette: 'stützt Äste gegeneinander und deckt sie mit Fellen ab',
    heilkraeuter: 'kaut ein bitteres Kraut – und das Fieber sinkt',
    bestattung: 'legt einen geliebten Toten in die Erde und gibt ihm Gaben mit',
    malerei: 'malt mit Ocker und Asche ein Tier an den Fels',
    toepfern: 'findet Lehm, der im Feuer steinhart geworden ist',
    zaehmung: 'wirft einem jungen Wolf Fleisch zu – und er bleibt',
    ackerbau: 'bemerkt, dass dort, wo Samen verschüttet wurden, neue Pflanzen wachsen',
    bogen: 'biegt einen Ast, spannt eine Sehne daran – und der Pfeil fliegt weiter als jeder Speer',
    palisade: 'rammt angespitzte Pfähle rings um das Lager in die Erde',
    viehzucht: 'fängt eine junge Ziege lebend und sperrt sie hinter Flechtwerk ein – sie bleibt und wirft Junge',
    reusen: 'flicht einen Korb mit enger Öffnung und legt ihn ins Wasser – am Morgen zappeln Fische darin',
    weben: 'dreht Ziegenhaar zu einem Faden und kreuzt die Fäden zu einem festen Stoff',
    floss: 'bindet am Ufer Stämme mit Fasern zusammen – und treibt hinüber ans andere Ufer',
    steinbau: 'schichtet gebrochene Felsbrocken zu einer Mauer, die keinem Sturm weicht',
  }[k] || TECH[k].how || `kommt auf die Idee: ${TECH[k].desc.replace(/\.$/, '')}`;
  if (first) W.discovered[k] = { t: W.tick, by: n.id, byName: n.name, tribe: T.id };
  const tribeHad = T.members.some(id => id !== n.id && NPC.get(id)?.know[k]);
  if (tribeHad) { memo(n, `kam selbst auf ${TECH[k].name}`); n.prestige -= 20; if (k === 'zaehmung') tameWolf(n); return; }
  chron(3, `${fullName(n)} (${T.name}) ${how}. ${first ? 'Zum ersten Mal in der Welt: ' : 'Die Sippe entdeckt: '}${TECH[k].name}!`, { npc: n.id, tribe: T.id, tech: k, quiet: !first });
  memo(n, `hat ${TECH[k].name} entdeckt`);
  if (k === 'zaehmung') tameWolf(n);
}
function teach(teacher, learner, inTribe = true) {
  for (const k of TECH_IDS) {
    if (!teacher.know[k] || learner.know[k]) continue;
    if (!TECH[k].req.every(r => learner.know[r])) continue;
    let p = 0.05 * (0.4 + teacher.tr.charisma) * (1.25 - learner.tr.stur) * (0.5 + learner.tr.neugier);
    if (!inTribe) p *= teacher.tr.gier > 0.65 ? 0.2 : 0.6;
    if (ageY(learner) < 14) p *= 1.8;
    if (teacher.whisper?.type === 'teach') p *= 3;
    if (rnd() < p) {
      learner.know[k] = 1; teacher.prestige += 1;
      memo(learner, `hat von ${teacher.name} ${TECH[k].name} gelernt`);
      if (!inTribe) chron(2, `${learner.name} (${tribeOf(learner).name}) lernt von ${teacher.name} (${tribeOf(teacher).name}) das Wissen um ${TECH[k].name}.`, { npc: learner.id, tribe: learner.tribe });
      return true;
    }
  }
  // halbfertige Ideen weitergeben (Enkel greift die Idee auf)
  for (const k in teacher.insight) {
    if (learner.know[k] || teacher.know[k]) continue;
    const d = teacher.insight[k] - (learner.insight[k] || 0);
    if (d > 0) learner.insight[k] = (learner.insight[k] || 0) + d * 0.04 * (1 - learner.tr.stur * 0.5);
  }
  return false;
}

// =====================================================================
//  Glauben & Bräuche
// =====================================================================
function beliefName(key) { return W.beliefs[key]?.name || key; }
function makeBelief(kind, n, name, desc) {
  const key = kind + ':' + (W.nextId++);
  W.beliefs[key] = { key, kind, name, desc, founder: n.id, founderName: n.name, tribe: n.tribe, t: W.tick };
  n.beliefs[key] = 0.9;
  return key;
}
function spreadBeliefs(a, b) {
  for (const key in a.beliefs) {
    const s = a.beliefs[key]; if (s < 0.4) continue;
    let p = 0.05 * s * (0.3 + a.tr.charisma) * (0.3 + b.tr.fromm) * (1.15 - b.tr.skepsis);
    if (a.act?.type === 'preach') p *= 2;
    if (rnd() < p) {
      const before = b.beliefs[key] || 0;
      b.beliefs[key] = clamp(before + 0.25, 0, 1);
      if (before < 0.5 && b.beliefs[key] >= 0.5) memo(b, `glaubt nun an: ${beliefName(key)}`);
    }
  }
}
function tribeBeliefShare(T, key) {
  const ad = adults(T); if (!ad.length) return 0;
  return ad.filter(n => (n.beliefs[key] || 0) >= 0.5).length / ad.length;
}

// =====================================================================
//  Entscheiden (Nutzen-KI: Bedürfnis × Persönlichkeit × Erfahrung)
// =====================================================================
function decide(n) {
  const T = tribeOf(n), age = ageY(n), tr = n.tr, night = isNight(), season = seasonNow();
  const pop = T.members.length || 1, perCap = T.store.food / pop;
  const opts = [];
  const add = (type, score, extra) => { if (score > 0) opts.push({ type, score: score + rnd() * 0.12, ...extra }); };
  const dCamp = dist(n.x, n.y, T.cx, T.cy);

  if (night || n.energy < 18) add('sleep', (night ? 1.3 : 0) + (100 - n.energy) / 90);
  if (n.sick > 0 || n.injured > 0) add('rest', 0.9 + (n.injured > 4 || n.health < 50 ? 0.9 : 0));
  const food = n.inv.food + n.inv.meat;
  if (n.hunger > 35) { const urgent = n.hunger > 80 ? 2.5 : 0; if (food > 0) add('eat', n.hunger / 45 + 0.3 + urgent); else if (T.store.food >= 1) add('eat', n.hunger / 50 + 0.25 - dCamp / 80 + (dCamp < 9 || inTown(T, n.x, n.y) ? 0.4 : 0) + urgent); }
  if (n.warmth < 40) add('warm', (40 - n.warmth) / 20 + 0.3);
  if (n.inv.food + n.inv.meat + n.inv.wood + n.inv.hide + n.inv.stone + n.inv.fiber + n.inv.clay + n.inv.herbs + (n.inv.ore || 0) > 0 && dCamp > 3) add('deliver', 0.35 + (n.inv.food + n.inv.meat) / 15);
  if (n.carryFire) add('deliver', 3);
  // Not macht erfinderisch – und skrupellos
  if (n.hunger > 75 && food <= 0 && T.store.food < 1 && age >= 13) {
    const ruthless = n.tr.gier * 0.6 + (1 - n.tr.mitgefuehl) * 0.6;
    const victim = T.members.map(id => NPC.get(id)).find(m => m && m !== n && m.inv.food + m.inv.meat > 1 && dist(m.x, m.y, n.x, n.y) < 10);
    if (victim && ruthless > 0.55) add('theft', ruthless + n.hunger / 100, { victim: victim.id });
    if (age >= 16 && n.tr.mut > 0.45) {
      const O = W.tribes.find(o => o.alive && o !== T && o.store.food > 20 && (T.rel[o.id] ?? 0) < 25 && dist(o.cx, o.cy, T.cx, T.cy) < 45 && reachable(T, o.cx, o.cy));
      if (O) add('steal', ruthless * 0.8 + n.tr.mut * 0.5 + n.hunger / 150, { target: O.id });
    }
  }

  if (age < 7) { add('play', 0.7); return choose(n, opts); }
  const target = season >= 2 ? T.winterTarget : 8;
  const provNeed = clamp(1.15 - perCap / target, 0.05, 1.2) + n.hunger / 250 + (season === 2 ? 0.15 : 0);
  const workMul = age < 13 ? 0.5 : age > 55 ? 0.6 : 1;

  if (!night) {
    // Nahrung – Erwartung stammt aus eigener Erfahrung und Erzählungen
    const eg = n.exp.gather, eh = n.exp.hunt;
    add('gather', provNeed * workMul * (0.35 + eg / 12) * (1.1 - tr.mut * 0.3));
    if (age >= 14) add('hunt', provNeed * workMul * (0.15 + eh / 14) * (0.5 + tr.mut * 0.9) * (n.injured ? 0.2 : 1));
    if (n.know.fischen && age >= 12 && season !== 3) add('fish', provNeed * workMul * (0.4 + n.exp.fish / 9) + (nearWater(T) ? 0.12 : 0));
    // Feuer
    const fuelWant = season >= 2 ? 120 : 45;
    if (T.fire.lit && T.fire.fuel < fuelWant) add('wood', (fuelWant - T.fire.fuel) / fuelWant * (0.6 + tr.mitgefuehl * 0.6) * workMul + (T.fire.fuel < 25 ? 0.9 : 0) + (T.fire.fuel < 8 ? 1.2 : 0));
    if (!T.fire.lit) {
      if (n.know.feuer_machen) add('lightfire', 1.5);
      const lf = W.fires.find(f => dist(f.x, f.y, n.x, n.y) < 30);
      if (lf && age >= 14) add('fetchfire', 0.8 + tr.mut * 0.6, { fire: lf });
      else if (age >= 16 && tr.mut > 0.35) {
        const friend = W.tribes.find(o => o.alive && o.id !== T.id && o.fire.lit && T.rel[o.id] !== undefined && T.rel[o.id] > -30 && dist(o.cx, o.cy, T.cx, T.cy) < 70);
        if (friend) add('fetchfire', 0.6 + tr.mut * 0.4, { from: friend.id });
      }
    }
    // Werkzeuge
    if (age >= 13) {
      if (n.know.faustkeil && n.tools.faustkeil <= 0) add('craft', 0.55 + tr.geschick * 0.3, { what: 'faustkeil' });
      if (n.know.speer && n.tools.speer <= 0 && n.tools.faustkeil > 0) add('craft', 0.5 + tr.mut * 0.3, { what: 'speer' });
      if (n.know.fellkleidung && n.tools.kleidung <= 0 && season >= 2) add('craft', 0.6 + (season === 3 ? 0.5 : 0), { what: 'kleidung' });
      if (n.know.weben && (n.tools.kleidung <= 0 || n.clothType === 'fur')) add('craft', 0.45, { what: 'tuch' });
      if (n.know.flechten && n.tools.korb <= 0) add('craft', 0.4, { what: 'korb' });
      if (n.know.bogen && !(n.tools.bogen > 0) && age >= 14) add('craft', 0.55 + tr.mut * 0.3, { what: 'bogen' });
      if (n.know.toepfern && T.pots < pop / 3 && T.fire.lit) add('craft', 0.35 + tr.geschick * 0.3, { what: 'topf' });
      if (n.know.huette && age >= 15 && busyBuilders(T) < 1 + Math.floor(pop / 10)) { const site = T.town && Object.values(T.town.lots).some(L => L.kind === 'bau' && lotFree(L, n)), furn = T.huts.some(h => (h.furn !== undefined && h.furn < FURN_MAX) || h.worn); if (T.huts.length < Math.ceil(pop / 6) || site || (n.know.steinbau && T.huts.some(h => !h.stone))) add('build', 0.45 + (season >= 2 ? 0.4 : 0) + tr.mitgefuehl * 0.2 + (site ? 0.25 : 0)); else if (furn) add('build', 0.3 + tr.geschick * 0.2); }
    }
    // Sesshaftigkeit: Felder, Vieh, Reusen, Bauten
    if (age >= 13 && n.know.ackerbau) { const fw = fieldWork(T); if (fw) add('farm', provNeed * 0.9 + 0.35 + (season === 2 ? 0.4 : 0)); }
    if (age >= 14 && n.know.viehzucht && herdSize(T) < Math.max(4, pop * 0.6) && season !== 3) add('herd', 0.35 + tr.geschick * 0.3);
    if (age >= 13 && n.know.reusen && (T.traps || []).length < 3 && season !== 3) add('trap', 0.45);
    if (age >= 15 && n.know.huette && !T.storehouse && T.huts.length >= 2) add('construct', 0.55 + tr.mitgefuehl * 0.3, { what: 'store' });
    if (age >= 15) for (const b of buildWants(T)) add('construct', (b === 'wall' ? 0.3 : 0.4) + tr.mitgefuehl * 0.15 + (b === 'temple' ? tr.fromm * 0.3 : 0), { what: b });
    if (age >= 16 && n.know.kupfer_haemmern && (T.store.ore || 0) < 30 && season !== 3) { const o = oreNear(T.cx, T.cy, 60); if (o) add('mine', 0.3 + tr.mut * 0.1 + tr.geschick * 0.15 - dist(o.x, o.y, T.cx, T.cy) / 300, { ore: o.id }); }
    if (age >= 16 && n.know.kupfer_guss && (T.store.ore || 0) >= 3 && T.store.wood >= 2 && (T.bld?.kiln || 0) >= BUILD_NEED.kiln && (T.cu || 0) < T.members.length * 0.4) add('smelt', 0.4 + tr.geschick * 0.2);
    if (age >= 15 && T.roadQ && T.roadQ.length && TK(T, 'wegebau')) add('road', 0.3 + tr.mitgefuehl * 0.15 + tr.geschick * 0.1);
    if (age >= 25 && hallDone(T) && (T.leader === n.id || n.prestige > 18 || age > 50) && !night && rnd() < 0.5) add('council', 0.35 + n.tr.gesellig * 0.3 + (T.leader === n.id ? 0.2 : 0));
    if (age >= 15 && n.know.palisade && (T.pal || 0) < 24 && !((T.bld?.wall || 0) > 0)) add('construct', 0.35 + tr.mitgefuehl * 0.2 + (W.tick - (T.lastRaided || -1e9) < C.TPY * 2 ? 0.7 : 0), { what: 'pal' });
    // Besuch bei befreundeten Nachbarn
    if (age >= 16 && season !== 3 && tr.gesellig > 0.45 && rnd() < 0.3) { const F = W.tribes.find(o => o.alive && o !== T && (T.rel[o.id] ?? -99) > 12 && dist(o.cx, o.cy, T.cx, T.cy) < 90 && reachable(T, o.cx, o.cy)); if (F) add('visit', tr.gesellig * 0.35 + (n.partner ? 0 : 0.15) - provNeed * 0.2, { target: F.id }); }
    // Sozial
    add('social', (1 - n.social / 100) * (0.25 + tr.gesellig * 0.8) - provNeed * 0.15);
    if (age >= 15) add('explore', tr.neugier * tr.mut * 0.75 * (1.2 - provNeed * 0.6) - dCamp / 200);
    if (age >= 12) add('experiment', tr.neugier * 0.33 * (1.1 - provNeed * 0.7));
    let maxB = 0; for (const k in n.beliefs) maxB = Math.max(maxB, n.beliefs[k]);
    if (maxB > 0.4) add('ritual', maxB * tr.fromm * 0.5);
    if (n.know.malerei && T.paintings.length < 8 && age >= 14) add('paint', (tr.fromm + tr.neugier) * 0.17);
    if (age >= 14 && W.corpses && W.corpses.length && !W.raids.some(r => r.to === T.id)) { const cb = corpseFor(n, T); if (cb) add('bury', cb.score, { corpse: cb.c.id }); }
    if (n.know.heilkraeuter && T.members.some(id => { const m = NPC.get(id); return m && (m.sick > 0 || m.injured > 0); })) add('heal', 0.5 + tr.mitgefuehl * 0.6);
  } else if (dCamp > 4) add('sleep', 1.0);
  if (age >= 13) warriorOpts(n, T, add, night);

  // Eingeflüsterte Ideen
  if (n.whisper) {
    if (W.tick > n.whisper.until) n.whisper = null;
    else if (!night) {
      const w = n.whisper.type;
      if (w === 'experiment') add('experiment', 2.2);
      else if (w === 'explore') add('explore', 2.2);
      else if (w === 'teach') add('social', 2.0);
      else if (w === 'preach') add('preach', 2.2);
      else if (w === 'hunt') add('hunt', 2.2);
    }
  }
  return choose(n, opts);
}
function choose(n, opts) {
  { const T = tribeOf(n); if (T) { itemsAdjust(n, T, opts); jobAdjust(n, T, opts); } }
  cultureAdjust(n, opts);
  let best = null; for (const o of opts) if (!best || o.score > best.score) best = o;
  if (!best) best = { type: 'idle' };
  startAct(n, best);
}

// =====================================================================
//  Handlungen
// =====================================================================
// Jeder hat sein Bett: der Reihe nach auf die Häuser verteilt, je fünf Schlafplätze; wer keinen hat, schläft im Haupthaus oder am Feuer
function bedOf(n, T) {
  const i = T.members.indexOf(n.id); if (i < 0) return null;
  const hs = T.huts.filter(h => h.lx !== undefined); if (!hs.length) return null;
  const h = hs[Math.floor(i / 5)];
  if (h) return bedsOf(h)[i % 5];
  if (hallDone(T)) { const H = hallOf(T); if (H) return [H.lx + 1 + (i % 8) * (H.w - 2) / 8, H.ly + (i % 2 ? 1.1 : H.h - 1)]; }
  return null;
}
// Wo man sich trifft: vor dem eigenen Haus, beim Nachbarn, im Haupthaus, auf dem Platz
function socialSpot(n, T) {
  const hs = T.huts.filter(h => h.lx !== undefined), r = rnd();
  if (hs.length && r < 0.35) { const h = hs[Math.floor(Math.max(0, T.members.indexOf(n.id)) / 5) % hs.length], d = doorOut(h); return [d[0] + (rnd() - 0.5) * 2.5, d[1] + 0.3 + rnd() * 0.6]; }
  if (hs.length && r < 0.6) { const h = pick(hs), d = doorOut(h); return [d[0] + (rnd() - 0.5) * 2.5, d[1] + 0.3 + rnd() * 0.6]; }
  if (r < 0.75 && hallDone(T)) { const s = hallSeat(T, n.id + (W.tick >> 6)); if (s) return s; }
  return [T.cx + (rnd() - 0.5) * 6, T.cy + (rnd() - 0.5) * 6];
}
// Ablageplätze: Holzstapel und Steinhaufen neben dem Feuer, Essen ins Vorratshaus
function stockSpot(T, kind) {
  if (kind === 'wood') return [T.cx - 2.2, T.cy + 1.2];
  if (kind === 'stone') return [T.cx - 2.4, T.cy - 1.6];
  if (T.storehouse && T.storehouse.lx !== undefined) return doorOut(T.storehouse);
  return [T.cx + 2, T.cy - 0.6];
}
const BUSY_ACT = { raid: 1, defend: 1, hide: 1, down: 1, };
const AWAY = { gather: 1, hunt: 1, explore: 1, wood: 1, fish: 1, craft: 1, build: 1, paint: 1, heal: 1, fetchfire: 1, raid: 1, diplo: 1, herd: 1, visit: 1 };
function startAct(n, o) {
  const T = tribeOf(n);
  (n.actLog || (n.actLog = {}))[o.type] = (n.actLog[o.type] || 0) + 1;
  if (o.type === 'gather' || o.type === 'hunt' || o.type === 'fish' || o.type === 'farm' || o.type === 'trap') n.lw = o.type;
  // Proviant mitnehmen
  if (AWAY[o.type] && (dist(n.x, n.y, T.cx, T.cy) < 6 || inTown(T, n.x, n.y)) && n.inv.food < 2 && T.store.food >= 3) {
    const take = o.type === 'explore' || o.type === 'raid' || o.type === 'fetchfire' ? 3 : 2;
    T.store.food -= take; n.inv.food += take;
  }
  const a = { type: o.type, stage: 0, t: 0, tx: n.x, ty: n.y };
  switch (o.type) {
    case 'sleep': case 'rest': case 'warm': case 'deliver': case 'lightfire': case 'craft': case 'experiment': case 'ritual': case 'preach': {
      let hx = T.cx, hy = T.cy;
      let bed = null; if ((o.type === 'sleep' || o.type === 'warm' || o.type === 'rest') && T.huts.length) { const b = bedOf(n, T); if (b) { bed = b; hx = b[0]; hy = b[1]; } }
      const spread = o.type === 'sleep' && !T.huts.length ? 7 : 3.5;
      if (bed) { a.tx = bed[0] + (rnd() - 0.5) * 0.3; a.ty = bed[1]; } else { a.tx = hx + (rnd() - 0.5) * spread; a.ty = hy + (rnd() - 0.5) * spread; } a.what = o.what; a.forStore = o.forStore;
      if (o.type === 'deliver' && !n.carryFire) { const food = n.inv.food + n.inv.meat > 0, p = stockSpot(T, food ? 'food' : n.inv.wood > 0 ? 'wood' : n.inv.stone > 0 || n.inv.ore > 0 ? 'stone' : 'food'); a.tx = p[0] + (rnd() - 0.5) * 0.5; a.ty = p[1] + (rnd() - 0.5) * 0.3; }
      break;
    }
    case 'fetch': { a.what = o.what; const p = itemSpot(T); a.tx = p[0] + (rnd() - 0.5) * 0.6; a.ty = p[1]; break; }
    case 'eat': {
      if (n.inv.food + n.inv.meat > 0) { a.tx = n.x; a.ty = n.y; } else {
        a.tx = T.cx + (rnd() - 0.5) * 3; a.ty = T.cy + (rnd() - 0.5) * 3;
        // im eigenen Haus am Herd essen, wenn das näher ist
        const h = T.huts.length ? T.huts[n.id % T.huts.length] : null;
        if (h && h.lx !== undefined) { const hx = h.lx + 1.5 + rnd(), hy = h.ly + 2.2; if (dist(n.x, n.y, hx, hy) < dist(n.x, n.y, a.tx, a.ty)) { a.tx = hx; a.ty = hy; } }
      }
      break;
    }
    case 'play': { const m = NPC.get(n.parents[0]); const mh = m && m.tribe === n.tribe && dist(m.x, m.y, T.cx, T.cy) < 7; const bx = mh ? m.x : T.cx, by = mh ? m.y : T.cy; a.tx = bx + (rnd() - 0.5) * 4; a.ty = by + (rnd() - 0.5) * 4; a.t = rint(4, 10); break; }
    case 'gather': {
      const radius = ageY(n) < 13 ? 10 : 22;
      let best = null, bs = -1;
      const desperate = n.hunger > 70 || T.store.food / Math.max(1, T.members.length) < 1;
      for (const s of n.spots) { const b = s.b; const d = dist(n.x, n.y, b.x, b.y); if (d > radius * 1.6) continue; const sc = s.f / (4 + d); if (sc > bs && okToForage(n, T, b.x, b.y, desperate)) { bs = sc; best = b; } }
      if (best && bs > 0.08) { a.bush = best.id; a.tx = best.x; a.ty = best.y; }
      else { for (let k = 0; k < 4; k++) { const ang = rnd() * 6.283, r = 4 + rnd() * Math.max(radius, (T.R || 14) * 0.9); a.tx = clamp(T.cx + Math.cos(ang) * r, 1, C.MW - 2); a.ty = clamp(T.cy + Math.sin(ang) * r, 1, C.MH - 2); if (okToForage(n, T, a.tx, a.ty, desperate)) break; } a.search = true; }
      break;
    }
    case 'hunt': {
      let best = null, bd = 1e9;
      const desperate = n.hunger > 70 || T.store.food / Math.max(1, T.members.length) < 1;
      for (const an of W.animals) { if (an.k !== 'deer') continue; const d = dist(n.x, n.y, an.x, an.y); if (d < bd && d < 30 && okToForage(n, T, an.x, an.y, desperate)) { bd = d; best = an; } }
      if (best) { a.prey = best.id; a.tx = best.x; a.ty = best.y; } else { const ang = rnd() * 6.283; a.tx = clamp(T.cx + Math.cos(ang) * 20, 1, C.MW - 2); a.ty = clamp(T.cy + Math.sin(ang) * 20, 1, C.MH - 2); a.search = true; }
      a.t = 0; a.ritual = false;
      break;
    }
    case 'fish': { const shore = (x, y) => W.t[y * C.MW + x] >= T_SHORE && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => W.t[(y + dy) * C.MW + x + dx] <= T_SHALLOW); const p = nearestTile(n.x, n.y, 18, shore) || [T.cx, T.cy]; a.tx = p[0]; a.ty = p[1]; break; }
    case 'wood': { const fr = (x, y) => W.t[y * C.MW + x] === T_FOREST && reachable(T, x, y) && okToForage(n, T, x, y, false); const p = nearestTile(T.cx, T.cy, 14, fr) || nearestTile(T.cx, T.cy, 30, fr) || nearestTile(T.cx, T.cy, 50, fr); if (p) { a.tree = treeOf(p); [a.tx, a.ty] = besideTile(p); } else { const b = bushesNear(T.cx, T.cy, 15).find(b => reachable(T, b.x, b.y)); a.tx = b ? b.x : T.cx + 3; a.ty = b ? b.y : T.cy; a.brush = 1; } break; }
    case 'social': {
      const cands = T.members.map(id => NPC.get(id)).filter(m => m && m !== n && !(m.act && m.act.type === 'sleep') && dist(m.x, m.y, n.x, n.y) < 10);
      const single = c => !n.partner && !c.partner && c.sex !== n.sex && ageY(n) >= 16 && ageY(c) >= 16 ? 25 : 0;
      const m = cands.length ? cands.reduce((b, c) => ((n.rel[c.id] || 0) + single(c) + rnd() * 40 > (n.rel[b.id] || 0) + single(b) + rnd() * 40 ? c : b)) : null;
      if (m) { a.with = m.id; a.tx = m.x; a.ty = m.y; } else { const p = socialSpot(n, T); a.tx = p[0]; a.ty = p[1]; }
      break;
    }
    case 'explore': {
      const ang = rnd() * 6.283, r = 18 + rnd() * 30;
      a.tx = clamp(n.x + Math.cos(ang) * r, 2, C.MW - 3); a.ty = clamp(n.y + Math.sin(ang) * r, 2, C.MH - 3);
      if (!passable(a.tx, a.ty)) { a.tx = T.cx; a.ty = T.cy; }
      { const O = ownerAt(a.tx, a.ty, T.id); if (O && stance(O, T) === 'feindlich' && n.tr.mut < 0.75) { a.tx = (a.tx + T.cx) / 2; a.ty = (a.ty + T.cy) / 2; } }
      break;
    }
    case 'paint': { const p = nearestTile(T.cx, T.cy, 14, (x, y) => W.t[y * C.MW + x] >= T_HILLS) || [T.cx + 2, T.cy + 2]; a.tx = p[0]; a.ty = p[1]; break; }
    case 'heal': { a.stage = 0; const p = nearestTile(n.x, n.y, 12, (x, y) => W.t[y * C.MW + x] === T_FOREST) || [T.cx, T.cy]; a.tx = p[0]; a.ty = p[1]; break; }
    case 'build': { a.stage = 0; break; }
    case 'fetchfire': { if (o.fire) { a.tx = o.fire.x; a.ty = o.fire.y; a.fire = 1; } else { const F = TRIBE.get(o.from); a.tx = F.cx; a.ty = F.cy; a.from = o.from; } break; }
    case 'raid': case 'return': { a.tx = o.tx; a.ty = o.ty; a.raid = o.raid; break; }
    case 'theft': { a.victim = o.victim; break; }
    case 'defend': case 'hide': case 'down': { a.raid = o.raid; a.tx = n.x; a.ty = n.y; break; }
    case 'bury': { a.corpse = o.corpse; break; }
    case 'council': case 'road': case 'train': case 'guard': case 'smelt': break;
    case 'mine': { a.ore = o.ore; break; }
    case 'farm': { const f = fieldWork(T); if (!f) { a.t = 99; break; } a.fi = f.i; a.job = f.job; a.tx = (f.i % C.MW) + 0.5; a.ty = ((f.i / C.MW) | 0) + 0.5; break; }
    case 'herd': { let best = null, bd = 40; for (const g of W.animals) if (HERD_K[g.k] && !g.tribe && n.know[HERD_K[g.k]]) { const d = dist(g.x, g.y, T.cx, T.cy); if (d < bd && reachable(T, g.x, g.y)) { bd = d; best = g; } } if (!best) { a.t = 99; break; } a.goat = best.id; a.tx = best.x; a.ty = best.y; break; }
    case 'trap': { const shore = (x, y) => W.t[y * C.MW + x] >= T_SHORE && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => W.t[(y + dy) * C.MW + x + dx] === T_SHALLOW) && reachable(T, x, y); const p = nearestTile(T.cx, T.cy, 16, shore) || nearestTile(T.cx, T.cy, 30, shore); if (!p) { a.t = 99; T.noTrap = W.tick; break; } a.tx = p[0]; a.ty = p[1]; break; }
    case 'construct': { a.what = o.what; break; }
    case 'visit': { a.target = o.target; const O = TRIBE.get(o.target); a.tx = O.cx + (rnd() - 0.5) * 5; a.ty = O.cy + (rnd() - 0.5) * 5; break; }
    case 'diplo': { a.target = o.target; a.kind = o.kind; const O = TRIBE.get(o.target); a.tx = O.cx; a.ty = O.cy; break; }
    case 'steal': { const O = TRIBE.get(o.target); a.target = o.target; a.tx = O.cx + (rnd() - 0.5) * 4; a.ty = O.cy + (rnd() - 0.5) * 4; break; }
    default: a.t = 4;
  }
  n.act = a;
}

function stepNpc(n) {
  const T = tribeOf(n), a = n.act, age = ageY(n);
  const speed = (age < 12 ? 0.7 : 1) * (n.injured > 0 ? 0.5 : 1) * (n.sick > 0 ? 0.7 : 1) * (riding(n, T) ? 1.7 : 1);
  // Bedürfnisse
  n.hunger = Math.min(100, n.hunger + (seasonNow() === 3 ? 0.72 : 0.9));
  if (!(a && a.type === 'sleep' && a.stage === 1)) n.energy = Math.max(0, n.energy - 1.35);
  n.social = Math.max(0, n.social - 0.35);
  const season = seasonNow();
  let loss = [0.2, -0.6, 0.4, W.hardWinter ? 1.7 : 1.15][season] + (isNight() ? 0.35 : season < 3 ? -0.45 : 0);
  if (n.tools.kleidung > 0) loss *= TK(T, 'nadel') || TK(T, 'webstuhl') ? 0.3 : 0.4;
  if (loss > 0 && a && (a.type === 'sleep' || a.type === 'warm') && a.stage === 1) loss *= 0.55; // aneinanderkuscheln
  const dc = dist(n.x, n.y, T.cx, T.cy);
  if (T.fire.lit && dc < 4) loss -= 3;
  if (T.huts.length) { const h = houseAt(n.x, n.y) || T.huts.find(h => h.lx === undefined && dist(h.x, h.y, n.x, n.y) < 1.6); if (h) loss -= h.stone || h.mud ? 2.3 : 1.6; }
  n.warmth = clamp(n.warmth - loss, 0, 100);
  if (n.hunger >= 100) n.health -= 0.15;
  if (n.warmth <= 8) n.health -= 0.35;
  if (n.sick > 0) n.health -= 0.06;
  if (n.injured > 0) n.health -= 0.03;
  if (n.hunger < 70 && n.warmth > 20 && n.sick <= 0) n.health = Math.min(100, n.health + (TK(T, 'backofen') ? 0.2 : 0.15));
  if (n.health <= 0) { const cause = n.hunger >= 100 ? 'verhungert' : n.warmth <= 8 ? 'erfroren' : n.sick > 0 ? 'an einer Krankheit gestorben' : 'an Verletzungen gestorben'; return die(n, cause); }

  if (!a) return decide(n);
  if (n.hunger > 55 && n.inv.food + n.inv.meat > 0 && a.type !== 'eat') { if (n.inv.food > 0) { n.inv.food--; n.hunger -= 40; } else { n.inv.meat--; n.hunger -= 42; } }
  // Bei Hunger-Notfall abbrechen
  if (n.hunger > 72 && a.type !== 'eat' && (n.inv.food + n.inv.meat > 0 || T.store.food >= 1) && !BUSY_ACT[a.type] && !a.hungry) { a.hungry = 1; return decide(n); }
  if (n.warmth < 30 && a.type !== 'warm' && a.type !== 'sleep' && a.type !== 'eat' && !n.carryFire && !BUSY_ACT[a.type] && !a.cold) { a.cold = 1; return decide(n); }

  if ((W.tick + n.id) % 6 === 0 && age >= 13 && a && (a.type === 'gather' || a.type === 'hunt' || a.type === 'wood' || a.type === 'fish' || a.type === 'explore' || a.type === 'craft' || a.type === 'build')) { borderCheck(n, T); if (n.alive === false || n.act !== a) return; }
  const at = () => {
    const r = moveHome(n, T, a.tx, a.ty, speed);
    const d = dist(n.x, n.y, a.tx, a.ty);
    if (a.bd === undefined || d < a.bd - 0.3) { a.bd = d; a.nb = 0; } else if (++a.nb > 30) { a.nb = 0; a.bd = undefined; if (d > 2) { if (tileAt(a.tx, a.ty) === T_SHALLOW || nearestTile(n.x, n.y, 2, (x, y) => W.t[y * C.MW + x] === T_SHALLOW)) insightCtx(n, 'waterblock', 2); n.act = null; n.stuckN = (n.stuckN || 0) + 1; } return true; }
    return r;
  };
  switch (a.type) {
    case 'sleep': {
      if (a.stage === 0) { if (dist(n.x, n.y, a.tx, a.ty) < 0.8 || at()) a.stage = 1; else if (!n.act) break; else if (++a.t > 400) a.stage = 1; }
      else { n.energy = Math.min(100, n.energy + 6.5); if (n.warmth < 50 && (W.tick + n.id) % 8 === 0) insightCtx(n, 'coldcamp', 0.3); if (n.energy >= 99 && !isNight()) n.act = null; }
      break;
    }
    case 'rest': { if (a.stage === 0) { if (at()) a.stage = 1; } else { n.energy = Math.min(100, n.energy + 2); if (++a.t > 16) n.act = null; } break; }
    case 'warm': { if (a.stage === 0) { if (at()) a.stage = 1; } else { if (a.t % 4 === 0 && seasonNow() >= 2) insightCtx(n, 'coldcamp', 0.6); if (n.warmth > 85 || ++a.t > 20) n.act = null; } break; }
    case 'eat': {
      if (a.stage === 0) { if (at()) a.stage = 1; break; }
      eat(n, T); n.act = null; break;
    }
    case 'deliver': {
      if (at()) {
        const keep = n.tr.gier > 0.6 ? 0.3 : 0;
        const fd = Math.floor(n.inv.food * (1 - keep)), mt = Math.floor(n.inv.meat * (1 - keep));
        T.store.food += (fd + mt) * yieldMul(T, n.lw); n.inv.food -= fd; n.inv.meat -= mt;
        if (mt > 0 && T.fire.lit) insightCtx(n, 'eatfire', 0.5);
        if (n.inv.ore > 0) { T.store.ore = (T.store.ore || 0) + n.inv.ore; n.inv.ore = 0; }
        if (n.inv.wood > 0) insightCtx(n, 'firework', 0.5);
        if (T.fire.lit) { const add = n.inv.wood * 4, room = Math.max(0, 160 - T.fire.fuel); T.fire.fuel += Math.min(add, room); T.store.wood += Math.floor(Math.max(0, add - room) / 4); } else T.store.wood += n.inv.wood; n.inv.wood = 0;
        for (const k of ['hide', 'stone', 'fiber', 'clay', 'herbs']) { T.store[k] += n.inv[k]; n.inv[k] = 0; }
        if (n.carryFire) { n.carryFire = false; if (!T.fire.lit) { T.fire.lit = true; T.fire.fuel = 30; chron(3, `${fullName(n)} bringt das Feuer zurück zu den ${T.name}!`, { npc: n.id, tribe: T.id }); n.prestige += 20; n.notable = true; memo(n, 'hat das Feuer zurückgebracht'); } }
        n.act = null;
      }
      break;
    }
    case 'play': { if (at() || ++a.t > 30) n.act = null; n.social = Math.min(100, n.social + 0.8); break; }
    case 'gather': stepGather(n, T, a, at); break;
    case 'hunt': stepHunt(n, T, a, speed); break;
    case 'fish': {
      if (a.stage === 0) { if (at()) a.stage = 1; else if (++a.t > 80) n.act = null; break; }
      if (++a.t > 8) {
        const p = 0.45 + n.tr.geschick * 0.35 + (n.tools.speer > 0 ? 0.1 : 0) + (TK(T, 'netz') ? 0.15 : 0);
        const got = rnd() < p * jobSkill(n, 'fischer') ? Math.round((rint(3, 6) + (TK(T, 'netz') ? 2 : 0)) * jobSkill(n, 'fischer')) : 0; n.inv.food += got; n.exp.fish = n.exp.fish * 0.8 + got * 0.2 * 3; insightCtx(n, 'water', 0.6);
        a.stage = 2; a.tx = T.cx; a.ty = T.cy; n.act = null; if (got) startAct(n, { type: 'deliver' });
      } else insightCtx(n, 'water', 0.12);
      break;
    }
    case 'wood': {
      if (a.stage === 0) { if (at()) a.stage = 1; break; }
      if (a.tree && W.t[a.tree[1] * C.MW + a.tree[0]] !== T_FOREST) a.tree = null;
      if (a.tree ? !chopAt(n, a, a.tree[0], a.tree[1], axeTicks(n, T)) : ++a.t <= 7) break;
      n.inv.wood += a.brush ? 1 : 3; if (n.tools.faustkeil > 0) n.tools.faustkeil -= 1; if (a.tree) harvestTile(a.tree[0], a.tree[1], n.tools.faustkeil > 0 || TK(T, 'steinbeil') ? 0.6 : 0.3, T); insightCtx(n, 'wood', 0.5); startAct(n, { type: 'deliver' });
      break;
    }
    case 'social': {
      const m = a.with ? NPC.get(a.with) : null;
      if (a.stage === 0) { if (m) { a.tx = m.x; a.ty = m.y; } if (at() || dist(n.x, n.y, a.tx, a.ty) < 1.3) a.stage = 1; else if (++a.t > 40) n.act = null; break; }
      a.t++;
      if (m && m.alive !== false && dist(n.x, n.y, m.x, m.y) < 2.5) {
        if (a.t % 3 === 0) talk(n, m);
      }
      insightCtx(n, 'rest', 0.05);
      if (a.t > 10) n.act = null;
      break;
    }
    case 'explore': stepExplore(n, T, a, at); break;
    case 'experiment': {
      if (a.stage === 0) { if (at()) a.stage = 1; break; }
      if (++a.t > 10) {
        insightCtx(n, 'experiment', n.whisper?.type === 'experiment' ? 4 : 1.6);
        if (T.fire.lit && n.know.faustkeil) insightCtx(n, 'knap', 0.6);
        if (T.fire.lit && W.clay[((n.y | 0) * C.MW) + (n.x | 0)]) insightCtx(n, 'clayfire', 1);
        n.act = null;
      }
      break;
    }
    case 'craft': stepCraft(n, T, a, at); break;
    case 'fetch': stepFetch(n, T, a, at); break;
    case 'build': stepBuild(n, T, a, at); break;
    case 'ritual': case 'preach': {
      if (a.stage === 0) { if (at()) a.stage = 1; break; }
      a.t++;
      n.social = Math.min(100, n.social + 1.5);
      if (a.t % 3 === 0) {
        for (const id of T.members) { const m = NPC.get(id); if (m && m !== n && dist(m.x, m.y, n.x, n.y) < 5) { spreadBeliefs(n, m); if (a.type === 'preach') addRel(m, n, (m.beliefs[preachKey(n)] || 0) > 0.5 ? 1 : -0.5); } }
        insightCtx(n, 'ritual', 0.3);
      }
      if (a.t > (a.type === 'preach' ? 14 : 8)) { n.act = null; if (a.type === 'preach') n.prestige += 0.5; }
      break;
    }
    case 'paint': {
      if (a.stage === 0) { if (at()) a.stage = 1; break; }
      if (++a.t > 14) {
        const ks = TECH_IDS.filter(k => n.know[k] && k !== 'malerei');
        const k = ks.length ? pick(ks) : null;
        const b = Object.keys(n.beliefs).find(x => n.beliefs[x] > 0.6);
        T.paintings.push({ x: n.x, y: n.y, k, belief: b || null, by: n.name, t: W.tick, tribe: T.id });
        W.paintAll = W.paintAll || []; W.paintAll.push({ x: n.x, y: n.y, k, by: n.name, t: W.tick, tribe: T.id, tname: T.name });
        if (W.paintAll.length > 300) W.paintAll.shift();
        memo(n, k ? `hat ${TECH[k].name} an eine Felswand gemalt` : 'hat eine Felswand bemalt');
        if (T.paintings.length === 1) chron(2, `${fullName(n)} hinterlässt das erste Felsbild der ${T.name}${k ? ` – es zeigt ${TECH[k].name}` : ''}.`, { npc: n.id, tribe: T.id });
        n.act = null;
      }
      break;
    }
    case 'heal': {
      if (a.stage === 0) { if (at()) { a.stage = 1; a.t = 0; } break; }
      if (a.stage === 1) { if (++a.t > 5) { a.stage = 2; a.tx = T.cx; a.ty = T.cy; } break; }
      if (at()) {
        const sick = T.members.map(id => NPC.get(id)).filter(m => m && (m.sick > 0 || m.injured > 0));
        for (const m of sick.slice(0, 3)) { m.sick = Math.max(0, m.sick - 4); m.injured = Math.max(0, m.injured - 4); m.health = Math.min(100, m.health + 15); addRel(m, n, 5); }
        n.prestige += 1; n.act = null;
      }
      break;
    }
    case 'lightfire': {
      if (a.stage === 0) { if (at()) a.stage = 1; break; }
      if (++a.t > 6) { if (!T.fire.lit && rnd() < 0.3 + n.tr.geschick * 0.5) { T.fire.lit = true; T.fire.fuel = 25; chron(2, `${n.name} entfacht das Feuer der ${T.name} neu.`, { npc: n.id, tribe: T.id }); } n.act = null; }
      break;
    }
    case 'fetchfire': {
      if (T.fire.lit) { n.act = null; break; }
      if (a.stage === 0) {
        if (a.fire && !W.fires.includes(W.fires.find(f => dist(f.x, f.y, a.tx, a.ty) < 2))) { n.act = null; break; }
        if (at()) {
          if (a.from) { const F = TRIBE.get(a.from); const welcome = (F.rel[T.id] || 0) > -20 || rnd() < 0.4; if (!welcome) { memo(n, `wurde bei den ${F.name} abgewiesen`); n.act = null; break; } F.rel[T.id] = (F.rel[T.id] || 0) + 5; memo(n, `erhielt Glut von den ${F.name}`); }
          else memo(n, 'hat Glut aus einem Blitzfeuer genommen');
          n.carryFire = true; startAct(n, { type: 'deliver' });
        } else if (++a.t > 300) n.act = null;
      }
      break;
    }
    case 'raid': stepRaid(n, T, a, at); break;
    case 'theft': stepTheft(n, T, a); break;
    case 'defend': stepDefend(n, T, a); break;
    case 'hide': stepHide(n, T, a); break;
    case 'down': stepDown(n, T, a); break;
    case 'bury': stepBury(n, T, a); break;
    case 'council': stepCouncil(n, T, a); break;
    case 'train': stepTrain(n, T, a); break;
    case 'mine': stepMine(n, T, a); break;
    case 'smelt': stepSmelt(n, T, a); break;
    case 'guard': stepGuard(n, T, a); break;
    case 'road': stepRoad(n, T, a); break;
    case 'watch': stepWatch(n, a); break;
    case 'farm': stepFarm(n, T, a, at); break;
    case 'herd': stepHerd(n, T, a); break;
    case 'trap': { if (a.t === 99) { n.act = null; break; } if (a.stage === 0) { if (at()) { a.stage = 1; a.t = 0; } break; } if (++a.t > 8) { const fib = Math.min(3, n.inv.fiber + T.store.fiber); if (fib < 3) { n.inv.fiber += 3; } else { const f1 = Math.min(3, n.inv.fiber); n.inv.fiber -= f1; T.store.fiber -= 3 - f1; if ((T.traps = T.traps || []).length < 3) T.traps.push({ x: n.x, y: n.y }); if (T.traps.length === 1) chron(2, `${n.name} legt die ersten Fischreusen der ${T.name} aus.`, { tribe: T.id, npc: n.id }); } n.act = null; } break; }
    case 'construct': stepConstruct(n, T, a, at); break;
    case 'visit': stepVisit(n, T, a); break;
    case 'diplo': stepDiplo(n, T, a, at); break;
    case 'steal': stepSteal(n, T, a, at); break;
    case 'return': { if (moveHome(n, T, T.cx, T.cy, 1) || dist(n.x, n.y, T.cx, T.cy) < 3) { if (a.loot) { T.store.food += a.loot; } n.act = null; } else if (++a.t > 500) n.act = null; break; }
    case 'idle': default: if (++a.t > 4) n.act = null;
  }
}

function preachKey(n) { return Object.keys(n.beliefs).find(k => k.startsWith('kult:') && W.beliefs[k]?.founder === n.id) || ''; }

function nearWater(T) { if (T._wetC === undefined || T._wetX !== T.cx) { T._wetX = T.cx; T._wetC = !!nearestTile(T.cx, T.cy, 14, (x, y) => W.t[y * C.MW + x] === T_SHALLOW); } return T._wetC; }
function eat(n, T) {
  let fullness = 0;
  const home = houseAt(n.x, n.y), cooked = n.know.kochen && T.fire.lit && (dist(n.x, n.y, T.cx, T.cy) < 6 || (home && T.huts.includes(home)));
  while (n.hunger > 25) {
    if (n.inv.meat > 0) { n.inv.meat--; n.hunger -= cooked ? 55 : 42; if (!cooked && rnd() < 0.015) n.sick = rint(4, 12); }
    else if (n.inv.food > 0) { n.inv.food--; n.hunger -= 40; }
    else if (T.store.food >= 1 && (dist(n.x, n.y, T.cx, T.cy) < 10 || inTown(T, n.x, n.y))) { T.store.food -= 1; STAT.es++; n.hunger -= cooked ? 48 : 40; }
    else break;
    fullness++;
  }
  n.hunger = Math.max(0, n.hunger);
  if (fullness && T.fire.lit && dist(n.x, n.y, T.cx, T.cy) < 6) insightCtx(n, 'eatfire', 0.4);
}

function talk(n, m) {
  const chem = 3 + n.tr.gesellig * 2 + m.tr.charisma * 2 - Math.abs(n.tr.fromm - m.tr.fromm) * 3 - Math.abs(n.tr.ehrgeiz - m.tr.ehrgeiz) * 2;
  if (rnd() < 0.06 * (n.tr.gier + m.tr.ehrgeiz) && (n.rel[m.id] || 0) < 30) { addRel(n, m, -8); addRel(m, n, -6); }
  else { addRel(n, m, chem * 0.6); addRel(m, n, chem * 0.5); }
  n.social = Math.min(100, n.social + 9); m.social = Math.min(100, m.social + 6);
  teach(n, m, n.tribe === m.tribe); if (rnd() < 0.5) teach(m, n, n.tribe === m.tribe);
  spreadBeliefs(n, m); spreadBeliefs(m, n);
  if (n.tribe !== m.tribe) { valueContact(n, m); valueContact(m, n); }
  // Erzählungen: Erfahrungen mischen sich
  for (const k of ['hunt', 'gather', 'fish']) { if (k === 'fish' && !m.know.fischen) continue; m.exp[k] = m.exp[k] * 0.9 + n.exp[k] * 0.1; }
  // Gute Sammelstellen weitererzählen
  if (n.spots.length && rnd() < 0.3) { const s = pick(n.spots); rememberBush(m, s.b, s.f * 0.8); }
  // Ansteckung
  if (n.sick > 0 && m.sick <= 0 && rnd() < 0.04) m.sick = rint(4, 10);
  if (m.sick > 0 && n.sick <= 0 && rnd() < 0.04) n.sick = rint(4, 10);
  // Vielehe: angesehene Männer nehmen eine weitere Frau
  if (n.tribe === m.tribe && ageY(n) >= 16 && ageY(m) >= 16 && n.sex !== m.sex) {
    const man = n.sex === 'm' ? n : m, wom = n.sex === 'f' ? n : m, T = tribeOf(man);
    if (T && (T.poly || 0) >= 0.5 && cvOf(T, 'ehe') < 0.4 && man.partner && !wom.partner && man.prestige > 15 && (wom.rel[man.id] || 0) > 30 && (man.rel[wom.id] || 0) > 30 && !man.parents.includes(wom.id) && !wom.parents.includes(man.id)) {
      const wives = T.members.filter(id => NPC.get(id)?.partner === man.id).length;
      if (wives < 3) { wom.partner = man.id; memo(wom, `ist nun ${man.name}s ${wives + 1}. Frau`); memo(man, `hat ${wom.name} als weitere Frau genommen`); const first = NPC.get(man.partner); if (first) { addRel(first, wom, -15); memo(first, `ist eifersüchtig auf ${wom.name}`); } return; }
    }
  }
  // Paarbildung
  // Werben: wer gefallen will, schmückt sich – daraus entsteht Schmuck
  if (n.sex !== m.sex && !n.partner && !m.partner && ageY(n) >= 14 && ageY(m) >= 14) { insightCtx(n, 'court', 1.5); insightCtx(m, 'court', 1); }
  const adorn = (n.know.schmuck ? 4 : 0) + (m.know.schmuck ? 4 : 0);
  if (n.sex !== m.sex && !n.partner && !m.partner && ageY(n) >= 16 && ageY(m) >= 16 && n.tribe === m.tribe && !n.parents.includes(m.id) && !m.parents.includes(n.id) && !(n.parents[0] && n.parents[0] === m.parents[0]) && (n.rel[m.id] || 0) > 22 - adorn && (m.rel[n.id] || 0) > 18 - adorn) {
    n.partner = m.id; m.partner = n.id; memo(n, `ist nun mit ${m.name} zusammen`); memo(m, `ist nun mit ${n.name} zusammen`);
  }
}

function rememberBush(n, b, f) {
  const s = n.spots.find(s => s.b === b);
  if (!s) { const T = tribeOf(n); if (T && !reachable(T, b.x, b.y)) return; }
  if (s) s.f = f; else { n.spots.push({ b, f }); if (n.spots.length > 10) { n.spots.sort((a, c) => c.f - a.f); n.spots.length = 10; } }
}

function stepGather(n, T, a, at) {
  if (a.stage === 0) {
    if (a.search) {
      if (at() || ++a.t > 60) {
        const bs = bushesNear(n.x, n.y, 7);
        for (const b of bs) rememberBush(n, b, b.f);
        const best = bs.filter(b => b.f > 0).sort((x, y) => y.f - x.f)[0];
        if (best) { a.bush = best.id; a.tx = best.x; a.ty = best.y; a.search = false; a.t = 0; }
        else { const roots = (W.t[((n.y | 0) * C.MW) + (n.x | 0)] === T_GRASS || W.t[((n.y | 0) * C.MW) + (n.x | 0)] === T_FOREST) && rnd() < 0.7 ? rint(2, 5) : 0; STAT.roots += roots; STAT.emptyTrips++; n.inv.food += roots; n.exp.gather = n.exp.gather * 0.9 + roots * 0.1; if (roots) startAct(n, { type: 'deliver' }); else n.act = null; }
      }
      return;
    }
    if (at() || ++a.t > 90) { a.stage = 1; a.t = 0; }
    return;
  }
  if (a.stage === 1) {
    if (++a.t < 4) return;
    const b = n.spots.find(s => s.b.id === a.bush)?.b || W.bushes.find(b => b.id === a.bush);
    const cap = Math.round((n.tools.korb > 0 ? 20 : 12) * jobSkill(n, 'sammler'));
    let got = 0;
    if (b) { territoryClash(n, T, b.x, b.y); if (!n.act || n.alive === false) return; got = Math.min(b.f, cap - n.inv.food); b.f -= got; rememberBush(n, b, b.f); }
    n.inv.food += got; STAT.g += got; STAT.trips++; if (!got) STAT.emptyTrips++;
    if (n.tools.korb > 0) n.tools.korb -= 0.5;
    n.exp.gather = n.exp.gather * 0.85 + got * 0.15;
    insightCtx(n, 'gather', 0.6);
    if (n.sick > 0 || T.members.some(id => NPC.get(id)?.sick > 0)) insightCtx(n, 'sickgather', 0.5);
    if (b && dist(b.x, b.y, T.cx, T.cy) < 8) insightCtx(n, 'gathercamp', 0.5);
    if (W.t[((n.y | 0) * C.MW) + (n.x | 0)] === T_FOREST || rnd() < 0.3) { n.inv.fiber += 1; }
    if (W.flint[((n.y | 0) * C.MW) + (n.x | 0)] || W.t[((n.y | 0) * C.MW) + (n.x | 0)] === T_HILLS) { n.inv.stone += 1; insightCtx(n, 'stone', 1); }
    // nahe weitere Büsche?
    if (n.inv.food < cap * 0.6) {
      const nb = bushesNear(n.x, n.y, 5).filter(x => x.f > 1);
      for (const x of nb) rememberBush(n, x, x.f);
      if (nb.length) { const x = nb[0]; a.bush = x.id; a.tx = x.x; a.ty = x.y; a.stage = 0; a.t = 0; return; }
    }
    startAct(n, { type: 'deliver' });
  }
}

function stepHunt(n, T, a, speed) {
  const prey = a.prey ? W.animals.find(x => x.id === a.prey) : null;
  if (!a.ritual) {
    a.ritual = true;
    const rk = Object.keys(n.beliefs).find(k => k.startsWith('ritual:') && n.beliefs[k] > 0.5);
    if (rk) { a.rk = rk; a.wait = 3; }
  }
  if (a.wait > 0) { a.wait--; return; }
  if (!prey) {
    if (moveToward(n, a.tx, a.ty, speed) || ++a.t > 70) {
      let best = null, bd = 14;
      for (const an of W.animals) if (an.k === 'deer' && !tabooAnimal(T, 'deer')) { const d = dist(n.x, n.y, an.x, an.y); if (d < bd) { bd = d; best = an; } }
      if (best && a.t < 140) { a.prey = best.id; a.t = 0; return; }
      n.exp.hunt *= 0.85; n.act = null;
    }
    insightCtx(n, 'hunt', 0.05);
    return;
  }
  a.t++;
  const d = dist(n.x, n.y, prey.x, prey.y);
  const range = n.tools.bogen > 0 ? 6 : n.tools.speer > 0 ? 2.4 : 1.2;
  if (d > range) { moveToward(n, prey.x, prey.y, speed * 1.05); if (a.t > 70) huntFail(n, a); return; }
  // Angriff (nur wenige Versuche, dann flieht das Tier)
  if (!a.tries) { territoryClash(n, T, prey.x, prey.y); if (n.alive === false || n.act !== a) return; }
  a.tries = (a.tries || 0) + 1;
  if (a.tries > 3) { huntFail(n, a); return; }
  let partners = 0;
  for (const id of T.members) { const m = NPC.get(id); if (m && m !== n && m.act?.type === 'hunt' && dist(m.x, m.y, n.x, n.y) < 4) partners++; }
  const dog = W.animals.some(x => x.k === 'wolf' && x.owner === n.id);
  const p = (seasonNow() === 3 ? 1.5 : 1) * (0.035 + n.tr.geschick * 0.05 + n.tr.mut * 0.03 + (n.tools.bogen > 0 ? 0.13 : n.tools.speer > 0 ? 0.07 : 0) + (n.tools.faustkeil > 0 ? 0.02 : 0) + Math.min(3, partners) * 0.04 + (dog ? 0.06 : 0)) * jobSkill(n, 'jaeger');
  insightCtx(n, 'hunt', 0.5);
  if (W.animals.some(x => x.k === 'wolf' && !x.owner && dist(x.x, x.y, n.x, n.y) < 8)) insightCtx(n, 'wolfnear', 1);
  if (!n.know.viehzucht && W.animals.some(x => x.k === 'goat' && !x.tribe && dist(x.x, x.y, n.x, n.y) < 10)) insightCtx(n, 'goatnear', 1.5);
  if (rnd() < p) {
    W.animals.splice(W.animals.indexOf(prey), 1);
    n.inv.meat += 12; n.inv.hide += 1; STAT.h += 12; n.prestige += 2;
    n.exp.hunt = n.exp.hunt * 0.75 + 12 * 0.25;
    if (n.tools.bogen > 0) n.tools.bogen -= 1; else if (n.tools.speer > 0) n.tools.speer -= 1;
    if (n.warmth < 50) insightCtx(n, 'coldhide', 2);
    if (seasonNow() >= 2) insightCtx(n, 'coldhide', 1);
    // Aberglaube entsteht
    if (!a.rk && rnd() < 0.012 * (1.2 - n.tr.skepsis) * (0.4 + n.tr.fromm)) {
      const name = pick(RITUALS);
      const k = makeBelief('ritual', n, `Jagdbrauch: ${name}`, `${n.name} glaubt, dass die Jagd gelingt, wenn man ${name}.`);
      memo(n, `glaubt, das Jagdglück hängt davon ab, ${name}`);
    }
    if (a.rk) n.beliefs[a.rk] = Math.min(1, n.beliefs[a.rk] + 0.05);
    if (rnd() < 0.3) memo(n, 'hat einen Hirsch erlegt');
    startAct(n, { type: 'deliver' });
    // Jagdpartner bekommen Anteil
    for (const id of T.members) { const m = NPC.get(id); if (m && m !== n && m.act?.type === 'hunt' && dist(m.x, m.y, n.x, n.y) < 4) { m.inv.meat += 2; m.exp.hunt = m.exp.hunt * 0.8 + 8 * 0.2; startAct(m, { type: 'deliver' }); } }
  } else {
    prey.flee = 10; prey.fx = n.x; prey.fy = n.y;
    if (rnd() < 0.012 * (0.5 + n.tr.mut) * (1.2 - n.tr.geschick)) { n.injured = rint(5, 15); memo(n, 'wurde bei der Jagd verletzt'); n.act = null; return; }
    if (a.t > 70) huntFail(n, a);
  }
}
function huntFail(n, a) {
  n.exp.hunt *= 0.85;
  if (a.rk && rnd() < n.tr.skepsis * 0.4) { n.beliefs[a.rk] = Math.max(0, n.beliefs[a.rk] - 0.15 * n.tr.skepsis); }
  n.act = null;
}

function stepExplore(n, T, a, at) {
  const arrived = at();
  a.t++;
  if (a.t % 6 === 0) {
    for (const b of bushesNear(n.x, n.y, 6)) rememberBush(n, b, b.f);
    // andere Sippen entdecken
    for (const O of W.tribes) {
      if (!O.alive || O.id === T.id) continue;
      if (dist(O.cx, O.cy, n.x, n.y) < 9 && T.rel[O.id] === undefined) makeContact(n, T, O);
      if (dist(O.cx, O.cy, n.x, n.y) < 6 && (O.rel[T.id] || 0) > -10 && rnd() < 0.3) {
        // Besuch: Wissen austauschen
        const hosts = O.members.map(id => NPC.get(id)).filter(m => m && dist(m.x, m.y, n.x, n.y) < 6);
        if (hosts.length) { const h = pick(hosts); teach(h, n, false); teach(n, h, false); spreadBeliefs(h, n); spreadBeliefs(n, h); O.rel[T.id] = (O.rel[T.id] || 0) + 1; T.rel[O.id] = (T.rel[O.id] || 0) + 1; }
      }
    }
    // Felsbilder fremder Zeiten
    for (const p of (W.paintAll || [])) if (p.k && !n.know[p.k] && dist(p.x, p.y, n.x, n.y) < 3 && TECH[p.k].req.every(r => n.know[r]) && rnd() < 0.01 + n.tr.neugier * 0.04) {
      const tribeHad = tribeKnows(T, p.k);
      n.know[p.k] = 1; n.prestige += 10; n.notable = true;
      const old = W.tick - p.t > C.TPY * 30;
      if (!tribeHad) chron(old ? 3 : 2, `${fullName(n)} (${T.name}) betrachtet ein ${old ? 'uraltes ' : ''}Felsbild von ${p.by} (${p.tname}) – und versteht, was es zeigt: ${TECH[p.k].name}!`, { npc: n.id, tribe: T.id });
      memo(n, `hat ${TECH[p.k].name} von einem alten Felsbild gelernt`);
    }
    // Blitzfeuer
    for (const f of W.fires) if (dist(f.x, f.y, n.x, n.y) < 8 && !f.seen?.includes(n.id)) {
      (f.seen = f.seen || []).push(n.id);
      if (n.tr.fromm > 0.6 && rnd() < 0.3 && !n.beliefs['geist:donner']) {
        if (!W.beliefs['geist:donner']) W.beliefs['geist:donner'] = { key: 'geist:donner', kind: 'geist', name: 'Der Donnergeist', desc: 'Der Blitz bringt Feuer vom Himmel – ein mächtiger Geist wohnt in den Wolken.', founder: n.id, founderName: n.name, tribe: n.tribe, t: W.tick };
        n.beliefs['geist:donner'] = 0.9;
        memo(n, 'verehrt seit dem Blitz den Donnergeist');
      }
      if (!T.fire.lit) { n.carryFire = true; startAct(n, { type: 'deliver' }); return; }
    }
  }
  if (a.t % 10 === 0 && !n.know.floss && nearestTile(n.x, n.y, 1.5, (x, y) => W.t[y * C.MW + x] === T_SHALLOW)) insightCtx(n, 'waterblock', 0.6);
  // Gefahr: Wölfe
  if (isNight() && rnd() < 0.0008) wolfAttack(n);
  if (arrived || a.t > 160) { n.prestige += 0.5; startAct(n, { type: 'deliver' }); }
}

// ---------- Gegenstände: anlegen, im Lager aufbewahren, von dort holen ----------
const ITEM_NAME = { faustkeil: 'ein Steinwerkzeug', speer: 'einen Speer', bogen: 'Pfeil und Bogen', korb: 'einen Korb', kleidung: 'Fellkleidung', tuch: 'Kleidung aus Stoff' };
function equip(n, T, what) {
  if (what === 'faustkeil') n.tools.faustkeil = 40;
  else if (what === 'speer') n.tools.speer = 25;
  else if (what === 'kleidung') { n.tools.kleidung = C.DPY * 2; n.clothType = 'fur'; }
  else if (what === 'tuch') { n.tools.kleidung = C.DPY * (TK(T, 'webstuhl') ? 4 : 3); n.clothType = TK(T, 'schaf') && TK(T, 'spindel') ? 'wool' : TK(T, 'webstuhl') ? 'linen' : 'woven'; }
  else if (what === 'korb') n.tools.korb = 40;
  else if (what === 'bogen') n.tools.bogen = 40;
}
// Wo liegen die Sachen? Im Vorratshaus – sonst am Werkzeuggestell beim Feuer
const itemSpot = T => T.storehouse && T.storehouse.lx !== undefined ? [T.storehouse.lx + 2.5, T.storehouse.ly + 2] : [T.cx + 2.2, T.cy - 1.6];
// Wer etwas braucht, holt es aus dem Lager, statt es selbst zu machen; geschickte Leute fertigen auf Vorrat
function itemsAdjust(n, T, opts) {
  const I = T.items || {};
  for (const o of opts) if (o.type === 'craft' && ITEM_NAME[o.what] && !o.forStore && (I[o.what] || 0) > 0) { o.type = 'fetch'; o.score += 0.2; }
  if (ageY(n) < 15 || isNight()) return;
  const settled = T.huts.length > 0 || !!T.storehouse, skill = n.tr.geschick + (TK(T, 'handwerker') ? 0.25 : 0);
  if (!settled || skill < 0.55) return;
  const want = Math.max(1, Math.ceil(T.members.length / 6));
  const can = { faustkeil: n.know.faustkeil, speer: n.know.speer, bogen: n.know.bogen, korb: n.know.flechten, kleidung: n.know.fellkleidung && T.store.hide >= 2, tuch: n.know.weben && T.store.fiber >= 4 };
  for (const w in can) if (can[w] && (I[w] || 0) < want) { opts.push({ type: 'craft', what: w, forStore: true, score: 0.22 + skill * 0.25 + rnd() * 0.12 }); break; }
}
function stepFetch(n, T, a, at) {
  if (a.stage === 0) { if (at() || ++a.t > 200) { a.stage = 1; a.t = 0; } return; }
  if (++a.t < 3) return;
  const I = T.items || {};
  if ((I[a.what] || 0) > 0) { I[a.what]--; equip(n, T, a.what); memo(n, `hat ${ITEM_NAME[a.what]} aus dem Lager geholt`); }
  n.act = null;
}
function stepCraft(n, T, a, at) {
  const need = { tuch: { fiber: 4 }, faustkeil: { stone: 1 }, speer: { wood: 1 }, kleidung: { hide: 2 }, korb: { fiber: 3 }, topf: { clay: 2 }, bogen: { wood: 1, fiber: 2 } }[a.what];
  if (a.stage === 0) {
    // Material besorgen
    for (const k in need) {
      if (n.inv[k] + T.store[k] < need[k]) {
        if (k === 'hide') { n.act = null; return; } // Felle gibt's nur von der Jagd
        const test = k === 'stone' ? (x, y) => W.flint[y * C.MW + x] || W.t[y * C.MW + x] === T_HILLS : k === 'wood' || k === 'fiber' ? (x, y) => W.t[y * C.MW + x] === T_FOREST : (x, y) => W.clay[y * C.MW + x];
        const p = nearestTile(n.x, n.y, 18, test) || nearestTile(n.x, n.y, 35, test);
        if (!p) { n.act = null; return; }
        a.stage = 1; a.mat = k; a.tree = treeOf(p); [a.tx, a.ty] = k === 'wood' || k === 'stone' ? besideTile(p) : [p[0] + 0.5, p[1] + 0.5]; a.t = 0; return;
      }
    }
    a.stage = 2; a.tx = T.cx + (rnd() - 0.5) * 3; a.ty = T.cy + (rnd() - 0.5) * 3; return;
  }
  if (a.stage === 1) {
    if (a.t < 999) { if (at() || ++a.t > 150) a.t = 999; else return; }
    if (!chopAt(n, a, a.tree[0], a.tree[1], a.mat === 'stone' ? 9 : a.mat === 'wood' ? axeTicks(n, T) : 6)) return;
    {
      const k = a.mat, i = a.tree[1] * C.MW + a.tree[0];
      n.inv[k] += k === 'fiber' ? 3 : k === 'clay' ? 2 : 1;
      if (k === 'stone') { insightCtx(n, 'stone', 1); if (W.flint[i]) insightCtx(n, 'knap', 0.5); }
      if (k === 'clay' && T.fire.lit) insightCtx(n, 'clayfire', 0.3);
      a.stage = 0;
    }
    return;
  }
  if (a.stage === 2) { if (at() || ++a.t > 60) { a.stage = 3; a.w = 0; } return; }
  if (++a.w < craftTime(T, a.what) / jobSkill(n, 'handwerker')) return; // die eigentliche Arbeit
  {
    for (const k in need) { const fromInv = Math.min(n.inv[k], need[k]); n.inv[k] -= fromInv; T.store[k] -= need[k] - fromInv; }
    if (a.what === 'faustkeil') insightCtx(n, 'knap', 1);
    if (a.what === 'topf') { T.pots += TK(T, 'toepferscheibe') ? 2 : 1; }
    else if (a.forStore) { const I = T.items || (T.items = {}); I[a.what] = (I[a.what] || 0) + 1; memo(n, `hat ${ITEM_NAME[a.what] || a.what} für das Lager gefertigt`); }
    else equip(n, T, a.what);
    n.act = null;
  }
}

// ---------------------------------------------------------------- Bauen: Schritt für Schritt
// Pflöcke stecken · Boden stampfen (2) · vier Wände · Dach (2) · Tür – danach die Einrichtung, Stück für Stück
const HUT_STEPS = 10, FURN_MAX = 7;
const HUT_WOOD = [1, 0, 0, 1, 1, 1, 1, 1, 0, 0], STONE_WOOD = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0];
const HUT_STEP_TXT = ['steckt die Ecken der neuen Hütte ab', 'stampft den Boden der neuen Hütte', 'stampft den Boden der neuen Hütte', 'baut die Rückwand', 'baut die linke Wand', 'baut die rechte Wand', 'baut die Vorderwand', 'deckt das Dach', 'deckt das Dach', 'setzt die Tür ein'];
// Wo am Bauplatz wird gerade gearbeitet?
function sitePos(P, step) {
  const x0 = P.x0, y0 = P.y0, w = P.w, h = P.h;
  return [[x0 + 0.4, y0 + h - 0.4], [x0 + 1.2, y0 + 1.5], [x0 + w - 1.2, y0 + 2.6], [x0 + w / 2, y0 + 0.9], [x0 + 0.8, y0 + h / 2], [x0 + w - 0.8, y0 + h / 2], [x0 + 1, y0 + h - 0.7], [x0 + w / 2, y0 + h + 0.4], [x0 + w / 2, y0 + h + 0.4], [x0 + 2.5, y0 + h + 0.4]][step] || [P.cx, P.cy];
}
// Am Baum hauen oder am Fels klopfen: dauert ein paar Schläge
function chopAt(n, a, x, y, ticks) {
  if (!a.wkT) { a.wkT = 1; a.chop = (y | 0) * C.MW + (x | 0); n.flip = x + 0.5 < n.x; }
  a.wk = 1;
  if (++a.wkT < ticks) return false;
  a.wkT = 0; a.wk = 0; a.chop = 0; return true;
}
// Baum oder Fels neben sich ansteuern (nicht mitten hinein – man steht am Stamm)
const treeOf = p => [p[0] | 0, p[1] | 0], besideTile = p => [(p[0] | 0) + 0.15, (p[1] | 0) + 0.95];
function axeTicks(n, T) { return Math.round((copperFor(n) ? 4 : TK(T, 'steinbeil') ? 5 : n.tools.faustkeil > 0 ? 6 : 9) / jobSkill(n, 'holz')); }
function hutNeeds(T, P, stoneHut, replacing) {
  if (replacing) return { wood: stoneHut ? 2 : 6, stone: stoneHut ? 8 : 0 };
  const st = P.prog || 0;
  return { wood: (stoneHut ? STONE_WOOD : HUT_WOOD)[st] || 0, stone: stoneHut && st >= 3 && st <= 6 ? 2 : 0 };
}
function busyBuilders(T) { const k = W.tick >> 3; if (T._nbT !== k) { T._nbT = k; let c = 0; for (const id of T.members) { const m = NPC.get(id); if (m && m.act && m.act.type === 'build') c++; } T._nb = c; } return T._nb; }
function lotFree(L, n) { if (!L.busy || L.busy === n.id) return true; const o = NPC.get(L.busy); return !(o && o.act && o.act.type === 'build' && o.act.lot === L.i + ',' + L.j); }
function stepBuild(n, T, a, at) {
  const stoneHut = !!n.know.steinbau;
  const O = townOrigin(T);
  if (a.stage === 0) {
    let P = a.lot ? O.lots[a.lot] : null;
    if (!P && !a.furnish && !a.repair) { const hw = T.huts.find(h => h.worn && h.lx !== undefined && (!h.fb || h.fb === n.id || !NPC.get(h.fb))); if (hw) { hw.fb = n.id; a.repair = hw.lot; } }
    if (!P && !a.furnish && !a.repair) {
      // Einrichtung fehlt in einem fertigen Haus?
      const hf = T.huts.find(h => h.lx !== undefined && h.furn !== undefined && h.furn < FURN_MAX && (!h.fb || h.fb === n.id || !NPC.get(h.fb)));
      const enough = T.huts.length >= Math.ceil(T.members.length / 6) && !Object.values(O.lots).some(L => L.kind === 'bau' && lotFree(L, n));
      if (hf && (enough || rnd() < 0.4)) { hf.fb = n.id; a.furnish = hf.lot; a.stage = 0; }
      else {
        if (T.huts.length >= Math.ceil(T.members.length / 5)) { const old = T.huts.find(h => !h.stone && !h.mud && h.lot && stoneHut); if (old) P = O.lots[old.lot]; }
        if (!P) P = Object.values(O.lots).find(L => L.kind === 'bau' && lotFree(L, n));
        if (!P && T.huts.length < Math.ceil(T.members.length / 5) + 1 && Object.values(O.lots).filter(L => L.kind === 'bau').length < 1 + Math.floor(T.members.length / 20)) P = allocLot(T, 'bau');
        if (!P) { n.act = null; return; }
        P.busy = n.id; a.lot = P.i + ',' + P.j;
      }
    }
    // Material besorgen
    const replacing = !!a.lot && T.huts.some(h => h.lot === a.lot);
    const need = a.repair ? { wood: 2, stone: 0 } : a.furnish ? { wood: 1, stone: 0 } : hutNeeds(T, P, stoneHut, replacing);
    if (n.inv.stone + T.store.stone < need.stone) {
      let p = null;
      if (T.quarry) { const [qx, qy] = T.quarry; if (W.t[(qy | 0) * C.MW + (qx | 0)] >= T_HILLS) p = T.quarry; else { // Steinbruch wandert weiter
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (W.t[((qy | 0) + dy) * C.MW + (qx | 0) + dx] >= T_HILLS) { p = [qx + dx, qy + dy]; break; } } }
      if (!p) p = nearestTile(T.cx, T.cy, 20, (x, y) => W.t[y * C.MW + x] >= T_HILLS) || nearestTile(T.cx, T.cy, 45, (x, y) => W.t[y * C.MW + x] >= T_HILLS);
      if (!p) { n.act = null; return; }
      if (!T.quarry) chron(1, `Die ${T.name} beginnen, Stein aus dem Fels zu brechen.`, { tribe: T.id });
      T.quarry = p; a.rock = treeOf(p); [a.tx, a.ty] = besideTile(p); a.stage = 4; a.t = 0; return;
    }
    if (n.inv.wood + T.store.wood < need.wood) {
      const p = nearestTile(n.x, n.y, 16, (x, y) => W.t[y * C.MW + x] === T_FOREST) || nearestTile(n.x, n.y, 35, (x, y) => W.t[y * C.MW + x] === T_FOREST);
      if (!p) { n.act = null; return; }
      a.tree = treeOf(p); [a.tx, a.ty] = besideTile(p); a.stage = 1; a.t = 0; return;
    }
    if (a.repair) { const h = T.huts.find(h => h.lot === a.repair); if (!h) { n.act = null; return; } a.tx = h.lx + 2.5; a.ty = h.ly + h.h + 0.4; a.stage = 7; a.t = 0; return; }
    if (a.furnish) { const h = T.huts.find(h => h.lot === a.furnish); if (!h) { n.act = null; return; } const B = bedsOf(h), b = B[Math.min(B.length - 1, Math.max(0, (h.furn || 0) - 1))]; a.tx = b[0]; a.ty = b[1]; a.stage = 6; a.t = 0; return; }
    if (!P) { n.act = null; return; }
    [a.tx, a.ty] = replacing ? [P.cx, P.cy + 1.5] : sitePos(P, P.prog || 0);
    a.stage = 2; return;
  }
  // Holz schlagen – der Baum wackelt, bis er fällt
  if (a.stage === 1) {
    if (a.t < 999 && !(moveToward(n, a.tx, a.ty, 1) || ++a.t > 150)) return;
    a.t = 999;
    if (W.t[a.tree[1] * C.MW + a.tree[0]] !== T_FOREST) { a.stage = 0; a.wkT = 0; a.wk = 0; return; }
    if (!chopAt(n, a, a.tree[0], a.tree[1], axeTicks(n, T))) return;
    n.inv.wood += TK(T, 'steinbeil') ? 4 : 3; harvestTile(a.tree[0], a.tree[1], 3, T); insightCtx(n, 'wood', 0.3); a.stage = 0; return;
  }
  if (a.stage === 2) { if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.6) { a.stage = 3; a.t = 0; } else if (++a.t > 300) n.act = null; return; }
  // Stein brechen
  if (a.stage === 4) { if (moveToward(n, a.tx, a.ty, 1) || ++a.t > 150) { a.stage = 5; a.t = 0; } return; }
  if (a.stage === 5) { if (!chopAt(n, a, a.rock[0], a.rock[1], 9)) return; n.inv.stone += 4; harvestTile(a.rock[0], a.rock[1], 4, T); insightCtx(n, 'stone', 0.5); a.stage = 0; return; }
  // Einrichten: Bett, Lager, Feuerstelle, Matten
  if (a.stage === 6) {
    const h = T.huts.find(h => h.lot === a.furnish); if (!h) { n.act = null; return; }
    if (a.t < 999) { if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.7) a.t = 999; else return; }
    a.wk = 1; if (++a.t < 999 + 10) return;
    const w = Math.min(1, n.inv.wood); n.inv.wood -= w; T.store.wood = Math.max(0, T.store.wood - (1 - w));
    h.furn = Math.min(FURN_MAX, (h.furn || 0) + 1); h.fb = 0; insightCtx(n, 'build', 0.3);
    n.act = null; return;
  }
  // Ausbessern: Dach flicken, Wände verstärken
  if (a.stage === 7) {
    const h = T.huts.find(h => h.lot === a.repair); if (!h) { n.act = null; return; }
    if (a.t < 999) { if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.7) a.t = 999; else if (++a.t > 300) { n.act = null; } return; }
    a.wk = 1; if (++a.t < 999 + 14) return;
    const w = Math.min(2, n.inv.wood); n.inv.wood -= w; T.store.wood = Math.max(0, T.store.wood - (2 - w));
    h.worn = 0; h.fb = 0; n.act = null; return;
  }
  // stage 3: am Bauplatz arbeiten
  const P = O.lots[a.lot];
  if (!P) { n.act = null; return; }
  const wi = T.huts.findIndex(h => h.lot === a.lot);
  if (wi >= 0) {
    // ein altes Haus durch ein besseres ersetzen
    a.wk = 1;
    if (++a.t <= (TK(T, 'wagen') ? 15 : 24)) return;
    P.busy = 0;
    const wn = stoneHut ? 2 : 6, w = Math.min(wn, n.inv.wood); n.inv.wood -= w; T.store.wood = Math.max(0, T.store.wood - (wn - w));
    if (stoneHut) { const st = Math.min(8, n.inv.stone); n.inv.stone -= st; T.store.stone = Math.max(0, T.store.stone - (8 - st)); }
    const old = T.huts[wi]; T.huts.splice(wi, 1);
    T.huts.push(houseFromLot(P, { by: n.name, t: W.tick, stone: stoneHut && !TK(T, 'lehmziegel'), mud: TK(T, 'lehmziegel'), furn: old.furn })); W.hutVer = (W.hutVer || 0) + 1;
    if (stoneHut && T.huts.filter(h => h.stone).length === 1) chron(2, `${n.name} errichtet das erste Steinhaus der ${T.name}.`, { npc: n.id, tribe: T.id });
    n.act = null; return;
  }
  const st = P.prog || 0;
  P.stone = stoneHut && !TK(T, 'lehmziegel'); P.mud = TK(T, 'lehmziegel'); P.by = P.by || n.name;
  { const [sx, sy] = sitePos(P, st); if (dist(n.x, n.y, sx, sy) > 0.7) { moveToward(n, sx, sy, 1); return; } }
  a.wk = 1; a.step = st;
  if (++a.t < (TK(T, 'wagen') ? 8 : 12) / jobSkill(n, 'baumeister')) return;
  a.t = 0;
  const need = hutNeeds(T, P, stoneHut, false);
  if (n.inv.wood + T.store.wood < need.wood || n.inv.stone + T.store.stone < need.stone) { a.stage = 0; a.wk = 0; return; }
  const w = Math.min(need.wood, n.inv.wood); n.inv.wood -= w; T.store.wood = Math.max(0, T.store.wood - (need.wood - w));
  const s2 = Math.min(need.stone, n.inv.stone); n.inv.stone -= s2; T.store.stone = Math.max(0, T.store.stone - (need.stone - s2));
  P.prog = st + 1; insightCtx(n, 'build', 0.15);
  if (P.prog < HUT_STEPS) { a.wk = 0; if (rnd() < 0.5 || n.hunger > 50) { P.busy = 0; n.act = null; } else a.stage = 0; return; } // nächster Schritt – oder erst einmal etwas anderes tun
  // fertig
  P.busy = 0; P.kind = 'house'; delete P.prog;
  T.huts.push(houseFromLot(P, { by: P.by || n.name, t: W.tick, stone: P.stone, mud: P.mud, furn: P.prog0 ? 2 : 0 })); W.hutVer = (W.hutVer || 0) + 1;
  insightCtx(n, 'build', 1);
  if (stoneHut && T.huts.filter(h => h.stone).length === 1) chron(2, `${n.name} errichtet das erste Steinhaus der ${T.name}.`, { npc: n.id, tribe: T.id });
  else if (T.huts.length === 1) chron(2, `${n.name} errichtet die erste Hütte der ${T.name}.`, { npc: n.id, tribe: T.id });
  memo(n, 'hat eine Hütte fertig gebaut');
  n.act = null;
}

function wolfAttack(n) {
  const wolf = W.animals.find(x => x.k === 'wolf' && !x.owner && dist(x.x, x.y, n.x, n.y) < 10);
  if (!wolf) return;
  const defend = n.tr.mut * 0.3 + (n.tools.speer > 0 ? 0.35 : 0) + n.tr.geschick * 0.2;
  if (rnd() < defend) { memo(n, 'hat einen Wolf vertrieben'); n.prestige += 3; wolf.flee = 10; wolf.fx = n.x; wolf.fy = n.y; return; }
  if (rnd() < 0.3) return die(n, 'von Wölfen getötet');
  n.injured = rint(8, 20); memo(n, 'wurde von einem Wolf verletzt');
}
function tameWolf(n) {
  const w = W.animals.filter(x => x.k === 'wolf' && !x.owner).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
  if (w) { w.owner = n.id; w.born = W.tick; memo(n, 'hat einen Wolf gezähmt'); }
}

// ---------- Diebstahl, Diebeszüge, Streit ----------
function palBonus(m) { const T = tribeOf(m); if (T && (T.bld?.wall || 0) >= 28 && dist(m.x, m.y, T.cx, T.cy) < 14) return 0.8; return T && (T.pal || 0) >= 12 && dist(m.x, m.y, T.cx, T.cy) < 11 ? 0.45 : 0; }
function fight(a, b, cause) {
  const pa = a.tr.mut + a.tr.geschick * 0.6 + (a.tools.bogen > 0 ? 0.55 : a.tools.speer > 0 ? 0.4 : 0) + rnd() + (a.injured ? -0.3 : 0) + palBonus(a);
  const pb = b.tr.mut + b.tr.geschick * 0.6 + (b.tools.bogen > 0 ? 0.55 : b.tools.speer > 0 ? 0.4 : 0) + rnd() + (b.injured ? -0.3 : 0) + palBonus(b);
  const loser = pa > pb ? b : a, winner = loser === a ? b : a;
  winner.prestige += 2; addRel(loser, winner, -30); addRel(winner, loser, -15);
  if (rnd() < 0.12) { die(loser, cause, winner); return { winner, loser, dead: true }; }
  loser.injured = Math.max(loser.injured, rint(4, 12));
  return { winner, loser, dead: false };
}
function stepTheft(n, T, a) {
  const v = NPC.get(a.victim);
  if (!v || v.inv.food + v.inv.meat <= 0) { n.act = null; return; }
  if (!moveToward(n, v.x, v.y, 1) && dist(n.x, n.y, v.x, v.y) > 1.2) { if (++a.t > 30) n.act = null; return; }
  const take = Math.ceil((v.inv.food + v.inv.meat) / 2);
  const tf = Math.min(v.inv.food, take); v.inv.food -= tf; v.inv.meat -= take - tf; n.inv.food += take;
  n.thefts = (n.thefts || 0) + 1;
  const caught = rnd() < 0.35 + v.tr.skepsis * 0.3;
  if (caught) {
    addRel(v, n, -35); memo(v, `hat ${n.name} beim Stehlen erwischt`); memo(n, `wurde beim Stehlen von ${v.name} erwischt`);
    if (v.tr.mut > 0.45 && rnd() < (TK(T, 'gerichte') ? 0.15 : 0.6)) { const r = fight(v, n, `im Streit um Essen von ${v.name} erschlagen`); if (r.dead) chron(2, `Hunger bei den ${T.name}: ${r.winner.name} erschlägt ${r.loser.name} im Streit um Essen.`, { tribe: T.id, npc: r.winner.id }); }
    nudge(v, 'eigentum', 0.05); nudge(v, 'strafe', 0.03);
    // Strafe nach den Sitten der Sippe
    const L = NPC.get(T.leader), harsh = cvOf(T, 'strafe') + (hasRule(T, 'eigentum', 1) ? 0.5 : 0);
    if (n.alive !== false && cvOf(T, 'strafe') < -0.3 && n.inv.food > 0) { const g = Math.min(n.inv.food, take); n.inv.food -= g; v.inv.food += g; addRel(v, n, 20); memo(n, `musste ${v.name} das Essen zurückgeben und sich versöhnen`); }
    else if (n.alive !== false && n.thefts >= (harsh > 0.4 ? 1 : 3) && L && L !== n && (L.tr.mitgefuehl < 0.65 || harsh > 0.4) && rnd() < 0.5 + harsh * 0.3) banish(n, T, L);
  } else { addRel(v, n, -5); memo(n, `hat heimlich Essen von ${v.name} genommen`); }
  n.act = null;
}
function banish(n, T, L) {
  const fam = [NPC.get(n.partner), ...n.kids.map(id => NPC.get(id)).filter(k => k && ageY(k) < 14)].filter(m => m && m.tribe === T.id && (m.rel[n.id] || 0) > 20);
  chron(2, `${fullName(L)} verbannt den Dieb ${n.name} aus der Sippe der ${T.name}${fam.length ? ` – ${fam.length} Angehörige folgen ${n.sex === 'f' ? 'ihr' : 'ihm'}` : ''}.`, { tribe: T.id, npc: n.id });
  memo(n, `wurde von ${L.name} verbannt`);
  const H = W.tribes.filter(o => o.alive && o !== T && (o.rel[T.id] ?? 0) > -30 && reachable(T, o.cx, o.cy)).sort((a, b) => dist(a.cx, a.cy, T.cx, T.cy) - dist(b.cx, b.cy, T.cx, T.cy))[0];
  if (H && rnd() < 0.6 + (H.rel[T.id] ?? 0) / 100) { moveMembers([n, ...fam], T, H, `wurde verbannt und fand Aufnahme bei den ${H.name}`); chron(1, `Die ${H.name} nehmen den Verbannten ${n.name} auf.`, { tribe: H.id, npc: n.id }); }
  else if (fam.length >= 3 && freeLandNear(T)) { const N = foundTribe(n, fam, 'verbannt'); if (N) { N.rel[T.id] = -50; T.rel[N.id] = -50; } }
  else { memo(n, 'irrt allein durch die Wildnis'); die(n, 'allein in der Wildnis umgekommen'); for (const m of fam) memo(m, `hat ${n.name} nie wiedergesehen`); }
}
function stepSteal(n, T, a, at) {
  const O = TRIBE.get(a.target);
  if (!O || !O.alive) { n.act = null; return; }
  if (a.stage === 0) { if (!isNight() && dist(n.x, n.y, O.cx, O.cy) < 14) { a.wait = (a.wait || 0) + 1; if (a.wait > 200) n.act = null; return; } // im Dunkeln anschleichen
    if (moveVia(n, O, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 1) a.stage = 1; else if (++a.t > 300) n.act = null; return; }
  if (a.stage === 1) {
    const guard = O.members.map(id => NPC.get(id)).find(m => m && ageY(m) >= 15 && !(m.act?.type === 'sleep' && m.act.stage === 1) && dist(m.x, m.y, n.x, n.y) < 6);
    const secure = ((O.pal || 0) >= 12 ? 0.25 : 0) + (O.storehouse ? 0.15 : 0);
    if ((guard && rnd() < 0.5 + guard.tr.skepsis * 0.3 + secure) || (!guard && rnd() < secure)) {
      if (!guard) { memo(n, `kam nicht über die Palisade der ${O.name}`); startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); return; }
      O.rel[T.id] = (O.rel[T.id] ?? 0) - 15; T.rel[O.id] = (T.rel[O.id] ?? 0) - 10;
      const r = fight(guard, n, `beim Diebeszug bei den ${O.name} erschlagen`);
      chron(r.dead ? 3 : 2, `${n.name} (${T.name}) wird beim Stehlen von Vorräten der ${O.name} erwischt${r.dead ? (r.loser === n ? ' und erschlagen' : ` und erschlägt ${guard.name}`) : ' – es kommt zum Kampf'}.`, { tribe: T.id, npc: n.id });
      if (n.alive === false) return;
      startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); return;
    }
    const take = Math.min(O.store.food, 10); O.store.food -= take; n.inv.food += take;
    O.thefts = (O.thefts || 0) + 1; if (O.thefts % 3 === 0) { O.rel[T.id] = (O.rel[T.id] ?? 0) - 10; }
    memo(n, `hat nachts Vorräte bei den ${O.name} gestohlen`);
    startAct(n, { type: 'deliver' });
  }
}
// Streit um Jagdgründe und Sammelplätze
function territoryClash(n, T, x, y) {
  if (rnd() > 0.25) return;
  for (const m of W.npcs) {
    if (m.tribe === T.id || ageY(m) < 15 || dist(m.x, m.y, x, y) > 3 || !m.act || (m.act.type !== 'gather' && m.act.type !== 'hunt')) continue;
    const O = tribeOf(m); if (!O) continue;
    const rel = T.rel[O.id];
    if (rel === undefined) continue;
    const scarce = T.store.food / Math.max(1, T.members.length) < 6 || seasonNow() >= 2;
    const temper = (n.tr.mut + m.tr.mut) * 0.3 + (n.tr.gier + m.tr.gier) * 0.25 - (n.tr.mitgefuehl + m.tr.mitgefuehl) * 0.25 - rel / 100 + (scarce ? 0.2 : -0.2);
    if (rnd() > temper) { if (rel > -10 && rnd() < 0.3) { T.rel[O.id] = rel + 1; O.rel[T.id] = (O.rel[T.id] ?? 0) + 1; } return; }
    T.rel[O.id] = rel - 6; O.rel[T.id] = (O.rel[T.id] ?? 0) - 6;
    const r = fight(n, m, `im Streit um Jagdgründe getötet`);
    memo(n, `geriet mit ${m.name} (${O.name}) in Streit um ${n.act?.type === 'hunt' ? 'Wild' : 'Beeren'}`);
    memo(m, `geriet mit ${n.name} (${T.name}) in Streit`);
    chron(r.dead ? 3 : 1, `${r.winner.name} (${tribeOf(r.winner)?.name}) und ${r.loser.name} (${tribeOf(r.loser)?.name || '?'}) geraten im Streit um ${n.act?.type === 'hunt' ? 'Jagdbeute' : 'Sammelplätze'} aneinander${r.dead ? ` – ${r.loser.name} stirbt` : ''}.`, { tribe: T.id, npc: r.winner.id });
    if (r.dead) { T.rel[O.id] -= 15; O.rel[T.id] -= 25; }
    return;
  }
}
// Partnersuche bei anderen Sippen
function partnerMigration(T) {
  const ad = adults(T);
  for (const n of ad) {
    if (n.partner || ageY(n) < 17 || ageY(n) > 34) continue;
    const opp = ad.some(m => m.sex !== n.sex && !m.partner && ageY(m) >= 16 && ageY(m) < 40);
    if (opp) continue;
    T.lonely = (T.lonely || 0) + 1;
    if (rnd() > 0.12 + n.tr.mut * 0.15) continue;
    const O = W.tribes.filter(o => o.alive && o !== T && (T.rel[o.id] ?? -99) > -10 && reachable(T, o.cx, o.cy) && adults(o).some(m => m.sex !== n.sex && !m.partner && ageY(m) >= 16 && ageY(m) < 40)).sort((a, b) => dist(a.cx, a.cy, T.cx, T.cy) - dist(b.cx, b.cy, T.cx, T.cy))[0];
    if (!O) continue;
    const i = T.members.indexOf(n.id); T.members.splice(i, 1); O.members.push(n.id); n.tribe = O.id; n.act = null;
    if (T.leader === n.id) { T.leader = 0; chooseLeader(T); }
    O.rel[T.id] = (O.rel[T.id] ?? 0) + 5; T.rel[O.id] = (T.rel[O.id] ?? 0) + 5;
    memo(n, `hat die ${T.name} verlassen, um bei den ${O.name} ${n.sex === 'm' ? 'eine Gefährtin' : 'einen Gefährten'} zu finden`);
    chron(1, `${n.name} verlässt die ${T.name}, um bei den ${O.name} ${n.sex === 'm' ? 'eine Gefährtin' : 'einen Gefährten'} zu finden.`, { tribe: O.id, npc: n.id });
    if (!T.members.length && T.alive) { T.alive = false; chron(3, `Die ${T.name} existieren nicht mehr.`, { tribe: T.id }); }
    return;
  }
}

// =====================================================================
//  Sesshaftigkeit: Felder, Vieh, Bauten
// =====================================================================
let FCACHE = { tick: -1, map: null };
function tribeFields(T) {
  if (FCACHE.tick !== W.tick || !FCACHE.map) { const m = new Map(); for (const k in W.fields) { const tr = W.fields[k].tr; if (!m.has(tr)) m.set(tr, []); m.get(tr).push(+k); } FCACHE = { tick: W.tick, map: m }; }
  return FCACHE.map.get(T.id) || [];
}
function fieldWork(T) {
  const season = seasonNow(), fs = tribeFields(T);
  if (season === 0) {
    for (const i of fs) if (W.fields[i].st === 0) return { i, job: 'sow' };
    if (fs.length < Math.ceil(T.members.length / 4)) {
      for (let k = 0; k < 30; k++) {
        const ang = rnd() * 6.283, r = 5 + rnd() * Math.max(4, (T.R || 14) * 0.45);
        const x = Math.floor(T.cx + Math.cos(ang) * r), y = Math.floor(T.cy + Math.sin(ang) * r), i = y * C.MW + x;
        if (x < 1 || y < 1 || x >= C.MW - 1 || y >= C.MH - 1 || W.fields[i] || W.t[i] !== T_GRASS || !reachable(T, x, y)) continue;
        if (T.huts.some(h => dist(h.x, h.y, x + 0.5, y + 0.5) < 2)) continue;
        { const R = T.town && townRect(T); if (R && x >= R.x0 - 1 && x <= R.x1 && y >= R.y0 - 1 && y <= R.y1) continue; }
        return { i, job: 'new' };
      }
    }
  }
  if (season === 1) for (const i of fs) if (W.fields[i].st === 1) return { i, job: 'tend' };
  if (season === 2) for (const i of fs) if (W.fields[i].st === 3) return { i, job: 'harvest' };
  return null;
}
function stepFarm(n, T, a, at) {
  if (a.t === 99) { n.act = null; return; }
  if (a.stage === 0) { if (at()) { a.stage = 1; a.t = 0; } return; }
  if (++a.t < (a.job === 'harvest' ? 8 : 10)) return;
  const f = W.fields[a.fi];
  if (a.job === 'new' && !f) { W.fields[a.fi] = { tr: T.id, st: 1, y: 0 }; FCACHE.tick = -1; if (tribeFields(T).length === 1) chron(2, `${n.name} bricht bei den ${T.name} das erste Feld auf und bringt Samen in die Erde.`, { tribe: T.id, npc: n.id }); }
  else if (f && f.tr === T.id) {
    if (a.job === 'sow' && f.st === 0) f.st = 1;
    else if (a.job === 'tend' && f.st === 1) f.st = 2;
    else if (a.job === 'harvest' && f.st === 3) { n.inv.food += Math.round(f.y * jobSkill(n, 'bauer')); f.st = 0; f.y = 0; startAct(n, { type: 'deliver' }); return; }
  }
  n.act = null;
}
let HCACHE = { tick: -1, map: null };
function herdSize(T) {
  if (HCACHE.tick !== W.tick || !HCACHE.map) { const m = new Map(); for (const g of W.animals) if (HERD_K[g.k] && g.tribe) m.set(g.tribe, (m.get(g.tribe) || 0) + 1); HCACHE = { tick: W.tick, map: m }; }
  return HCACHE.map.get(T.id) || 0;
}
function penOf(T) {
  if (T.pen && T.penR && dist(T.pen[0], T.pen[1], T.cx, T.cy) < 25) return T.pen;
  { const P = allocLot(T, 'pen', 2, 1) || allocLot(T, 'pen'); if (P) { T.pen = [P.cx, P.cy]; T.penR = { x0: P.x0, y0: P.y0, w: P.w, h: P.h, lot: P.i + ',' + P.j }; return T.pen; } }
  for (let k = 0; k < 30; k++) { const ang = rnd() * 6.283, x = T.cx + Math.cos(ang) * 6.5, y = T.cy + Math.sin(ang) * 6.5; if (tileAt(x, y) >= T_SHORE && tileAt(x, y) <= T_FOREST && reachable(T, x, y)) { T.pen = [x, y]; return T.pen; } }
  T.pen = [T.cx + 5, T.cy]; return T.pen;
}
function stepHerd(n, T, a) {
  if (a.t === 99) { n.act = null; return; }
  const g = W.animals.find(x => x.id === a.goat);
  if (!g || g.tribe) { n.act = null; return; }
  if (dist(n.x, n.y, g.x, g.y) > 1.5) { moveToward(n, g.x, g.y, 1.05); if (++a.t > 160) n.act = null; return; }
  a.tries = (a.tries || 0) + 1;
  if (rnd() < 0.25 + n.tr.geschick * 0.3) {
    g.tribe = T.id; penOf(T); HCACHE.tick = -1;
    const first = herdSize(T) === 1;
    if (first) chron(2, `${n.name} treibt die erste Ziege in das neue Gehege der ${T.name}.`, { tribe: T.id, npc: n.id });
    memo(n, 'hat ' + ({ goat: 'eine Wildziege', sheep: 'ein Mufflon', cattle: 'einen Auerochsen', pig: 'ein Wildschwein', donkey: 'einen Wildesel' })[g.k] + ' eingefangen'); n.act = null;
  } else { g.flee = 8; g.fx = n.x; g.fy = n.y; if (a.tries > 3) n.act = null; }
}
function stepConstruct(n, T, a, at) {
  const need = a.what === 'store' ? 10 : 3;
  if (BUILD_NEED[a.what] && (T.bld?.[a.what] || 0) >= BUILD_NEED[a.what]) { n.act = null; return; }
  if (a.what === 'store' && T.storehouse) { n.act = null; return; }
  if (a.what === 'pal' && (T.pal || 0) >= 24) { n.act = null; return; }
  if (a.stage === 0) {
    if (n.inv.wood + T.store.wood >= need) {
      if (a.what === 'store') { const O = townOrigin(T); let P = Object.values(O.lots).find(L => L.kind === 'store'); if (!P) P = allocLot(T, 'store'); if (!P) { n.act = null; return; } a.lot = P.i + ',' + P.j; a.tx = P.cx; a.ty = P.cy + 1.5; }
      else if (BUILD_NEED[a.what]) { const p = placeBuild(T, a.what); if (p) { a.tx = p[0]; a.ty = p[1]; } else { const k = T.bld?.wall || 0, ang = k / 28 * 6.283; a.tx = T.cx + Math.cos(ang) * 13; a.ty = T.cy + Math.sin(ang) * 13; } }
      else { const k = T.pal || 0, WL = T.town ? townWall(T) : null, per = WL ? WL.tiles : null;
        if (per && per.length) { const q = per[Math.min(per.length - 1, Math.floor(k / 24 * per.length))]; const dx = T.cx - q[0], dy = T.cy - q[1], l = Math.hypot(dx, dy) || 1; a.tx = q[0] + 0.5 + dx / l * 1.2; a.ty = q[1] + 0.5 + dy / l * 1.2; }
        else { const ang = k / 24 * 6.283; a.tx = T.cx + Math.cos(ang) * 10; a.ty = T.cy + Math.sin(ang) * 10; } }
      a.stage = 2; a.t = 0; return;
    }
    const fr = (x, y) => W.t[y * C.MW + x] === T_FOREST && reachable(T, x, y);
    const p = nearestTile(T.cx, T.cy, 16, fr) || nearestTile(T.cx, T.cy, 35, fr); if (!p) { n.act = null; return; }
    a.tree = treeOf(p); [a.tx, a.ty] = besideTile(p); a.stage = 1; a.t = 0; return;
  }
  if (a.stage === 1) { if (a.t < 999) { if (at() || ++a.t > 150) a.t = 999; else return; } if (W.t[a.tree[1] * C.MW + a.tree[0]] === T_FOREST && !chopAt(n, a, a.tree[0], a.tree[1], axeTicks(n, T))) return; n.inv.wood += TK(T, 'steinbeil') ? 4 : 3; harvestTile(a.tree[0], a.tree[1], 1, T); a.stage = 0; return; }
  if (a.stage === 2 || a.stage === 3) a.wk = a.stage === 3 ? 1 : 0;
  if (a.stage === 2) { if (at() || dist(n.x, n.y, a.tx, a.ty) < 1.2) { a.stage = 3; a.t = 0; } return; }
  if (++a.t < (TK(T, 'wagen') ? 7 : 12)) return;
  const w = Math.min(need, n.inv.wood); n.inv.wood -= w; T.store.wood = Math.max(0, T.store.wood - (need - w));
  if (BUILD_NEED[a.what]) {
    T.bld = T.bld || {}; const v = T.bld[a.what] = (T.bld[a.what] || 0) + 1; 
    if (v === BUILD_NEED[a.what]) chron(a.what === 'temple' || a.what === 'wall' ? 3 : 2, `Die ${T.name} haben ${BUILD_NAME[a.what]} fertiggestellt.`, { tribe: T.id, npc: n.id });
    else if (v === 1 && (a.what === 'temple' || a.what === 'wall')) chron(2, `Die ${T.name} beginnen mit dem Bau ${a.what === 'temple' ? 'eines Tempels' : 'einer Stadtmauer aus Lehmziegeln'}.`, { tribe: T.id });
  }
  else if (a.what === 'store') { const P = T.town && T.town.lots[a.lot]; T.storehouse = P ? { x: P.cx, y: P.cy, lot: a.lot, lx: P.x0, ly: P.y0, w: P.w, h: P.h } : { x: a.tx, y: a.ty }; chron(2, `${n.name} baut ein Vorratshaus für die ${T.name}. Die Vorräte liegen nun trocken und sicher.`, { tribe: T.id, npc: n.id }); }
  else { T.pal = (T.pal || 0) + 1; if (T.pal === 6) chron(2, `Die ${T.name} beginnen, ihr Lager mit einer Palisade zu umgeben.`, { tribe: T.id }); if (T.pal === 24) chron(3, `Die Palisade der ${T.name} ist geschlossen. Ihr Lager ist nun eine Festung.`, { tribe: T.id, npc: n.id }); }
  insightCtx(n, 'build', 0.6);
  n.act = null;
}
function stepVisit(n, T, a) {
  const O = TRIBE.get(a.target);
  if (!O || !O.alive || (O.rel[T.id] ?? 0) < 0) { startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); return; }
  if (a.stage === 0) { if (moveVia(n, O, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 1.5) { a.stage = 1; a.t = 0; } else if (++a.t > 400) n.act = null; return; }
  if (++a.t % 3 === 0) {
    const hosts = O.members.map(id => NPC.get(id)).filter(m => m && dist(m.x, m.y, n.x, n.y) < 6);
    if (hosts.length) { const h = pick(hosts); talk(n, h); O.rel[T.id] = Math.min(60, (O.rel[T.id] ?? 0) + 0.3); T.rel[O.id] = Math.min(60, (T.rel[O.id] ?? 0) + 0.3);
      // Tausch: Felle gegen Stein usw.
      if (rnd() < 0.2) { for (const [k, j] of [['hide', 'stone'], ['stone', 'hide'], ['fiber', 'hide']]) if (T.store[k] > 6 && O.store[j] > 6) { T.store[k] -= 2; O.store[k] += 2; O.store[j] -= 2; T.store[j] += 2; if (!T.traded) { T.traded = 1; chron(2, `Erster Tauschhandel: ${n.name} (${T.name}) tauscht bei den ${O.name} ${k === 'hide' ? 'Felle' : k === 'stone' ? 'Steine' : 'Fasern'} gegen ${j === 'hide' ? 'Felle' : 'Steine'}.`, { tribe: T.id, npc: n.id }); } break; } }
    }
  }
  if (a.t > 18) { memo(n, `hat die ${O.name} besucht`); startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); }
}

// =====================================================================
//  Reviere & Diplomatie
// =====================================================================
function makeContact(n, T, O) {
  const L = NPC.get(O.leader);
  const mood = L ? (L.tr.mitgefuehl + L.tr.gesellig - L.tr.ehrgeiz * 0.7 - L.tr.gier * 0.5) : 0.3;
  const r = Math.round(clamp((mood - 0.3) * 40 + (n.tr.charisma - 0.5) * 20 + (rnd() - 0.5) * 20, -40, 40));
  T.rel[O.id] = r; O.rel[T.id] = r;
  n.prestige += 5;
  chron(2, `Erster Kontakt: ${fullName(n)} von den ${T.name} trifft auf die ${O.name}. ${r > 10 ? 'Die Begegnung ist freundlich.' : r < -10 ? 'Man begegnet sich mit Misstrauen.' : 'Man beäugt sich vorsichtig.'}`, { npc: n.id, tribe: T.id });
  memo(n, `hat die ${O.name} entdeckt`);
}
function territoryRadius(T) {
  const pop = T.members.length, stone = T.huts.filter(h => h.stone).length;
  return clamp(9 + Math.sqrt(pop) * 3 + (T.huts.length - stone) * 0.7 + stone * 1.2 + Math.min(40, T.cleared || 0) * 0.08 + (W.tick - T.founded) / C.TPY * 0.04, 8, 46);
}
// Reviere als Kachel-Areal: jede Kachel gehört der Sippe, die sie (über begehbare Wege) am leichtesten erreicht
let OWN = null;
function computeTerritory() {
  const N = C.MW * C.MH, own = new Int32Array(N), best = new Float32Array(N).fill(1);
  for (const T of W.tribes) {
    if (!T.alive) continue;
    const F = flowFor(T), R = (T.R || 14) * 10;
    for (let ly = 0; ly < F.h; ly++) for (let lx = 0; lx < F.w; lx++) { const v = F.d[ly * F.w + lx] / R; if (v >= 1) continue; const i = (ly + F.y0) * C.MW + lx + F.x0; if (v < best[i]) { best[i] = v; own[i] = T.id; } }
  }
  const area = {}; for (let i = 0; i < N; i++) if (own[i]) area[own[i]] = (area[own[i]] || 0) + 1;
  for (const T of W.tribes) T.area = area[T.id] || 0;
  OWN = own; if (HOOKS.onTerritory) HOOKS.onTerritory();
}
// Wem gehört dieser Ort? (die eigene Sippe ausgenommen)
function ownerAt(x, y, exceptId) {
  if (OWN) { const id = OWN[(y | 0) * C.MW + (x | 0)]; if (!id || id === exceptId) return null; const T = TRIBE.get(id); return T && T.alive ? T : null; }
  let best = null, bv = 1;
  for (const T of W.tribes) {
    if (!T.alive || T.id === exceptId) continue;
    const v = dist(T.cx, T.cy, x, y) / (T.R || 14);
    if (v < bv) { bv = v; best = T; }
  }
  return best;
}
// Haltung: wie behandelt O Leute aus T in ihrem Revier?
function stance(O, T) {
  if ((O.access[T.id] || 0) > W.tick) return 'erlaubt';
  const r = O.rel[T.id];
  if (r === undefined) return cvOf(O, 'gast') > 0.5 ? 'gastlich' : 'fremd';
  if (r > 25) return 'verbündet';
  if (r > -15 && cvOf(O, 'gast') > 0.5) return 'gastlich';
  if (r < 5 && cvOf(O, 'gast') < -0.5) return 'feindlich';
  if (r < -15) return 'feindlich';
  return 'fremd';
}
const STANCE_TXT = { gastlich: 'Gast – wird bewirtet und geduldet', erlaubt: 'darf das Revier nutzen', verbündet: 'befreundet – geduldet', fremd: 'fremd – wird beobachtet', feindlich: 'verfeindet – wird angegriffen' };
// darf/will n an diesem Ort sammeln oder jagen?
function okToForage(n, T, x, y, desperate) {
  const O = ownerAt(x, y, T.id); if (!O) return true;
  if (!OWN && dist(T.cx, T.cy, x, y) < (T.R || 14) * 0.8) return true; // im Kernland der eigenen Sippe
  const st = stance(O, T);
  if (st === 'erlaubt' || st === 'verbündet' || st === 'gastlich') return true;
  if (st === 'feindlich') return desperate && n.tr.mut > 0.6;
  return desperate || n.tr.mut + n.tr.gier > 1.25 || rnd() < 0.15;
}
// Grenzwächter: Wer im fremden Revier gesehen wird, wird beobachtet, verjagt oder angegriffen
function borderCheck(n, T) {
  if ((n.borderCd || 0) > W.tick) return;
  const O = ownerAt(n.x, n.y, T.id); if (!O) return;
  if (!OWN) { if (dist(T.cx, T.cy, n.x, n.y) < (T.R || 14) * 0.8) return; if (dist(O.cx, O.cy, n.x, n.y) / O.R > dist(T.cx, T.cy, n.x, n.y) / (T.R || 14)) return; }
  if (O.rel[T.id] === undefined) { makeContact(n, T, O); return; }
  const st = stance(O, T);
  if (st === 'erlaubt' || st === 'verbündet') { if (rnd() < 0.05) { O.rel[T.id] += 0.5; T.rel[O.id] = (T.rel[O.id] ?? 0) + 0.5; } return; }
  let guard = null;
  for (const id of O.members) { const m = NPC.get(id); if (m && ageY(m) >= 15 && dist(m.x, m.y, n.x, n.y) < 9 && !(m.act && (m.act.type === 'sleep' || m.act.type === 'raid' || m.act.type === 'diplo'))) { guard = m; break; } }
  if (!guard) return;
  n.borderCd = W.tick + C.TPD;
  O.trespass[T.id] = (O.trespass[T.id] || 0) + 1;
  const LO = NPC.get(O.leader);
  const hard = LO ? LO.tr.ehrgeiz * 0.4 + LO.tr.gier * 0.3 + (1 - LO.tr.mitgefuehl) * 0.3 : 0.5;
  const scarce = O.store.food / Math.max(1, O.members.length) < (seasonNow() >= 2 ? O.winterTarget * 0.6 : 6);
  if (st === 'feindlich') {
    const pf = 0.1 + (guard.tr.mut - 0.5) * 0.25 + (n.tr.mut - 0.5) * 0.25 + (scarce ? 0.1 : 0) + hard * 0.1;
    if (rnd() < pf) {
      const r = fight(guard, n, `in einem Grenzkampf zwischen den ${O.name} und den ${T.name} getötet`);
      O.rel[T.id] -= 2; T.rel[O.id] = (T.rel[O.id] ?? 0) - 3;
      chron(r.dead ? 2 : 1, `Grenzkampf: ${guard.name} (${O.name}) stellt ${n.name} (${T.name}) im eigenen Revier${r.dead ? ` – ${r.loser.name} stirbt` : r.loser === n ? ` – ${n.name} flieht verletzt` : ` – ${n.name} wehrt sich, ${guard.name} wird verletzt`}.`, { tribe: O.id, npc: guard.id });
      if (n.alive !== false && n.act) startAct(n, { type: 'return', tx: T.cx, ty: T.cy });
    } else if (n.act) { O.rel[T.id] -= 0.5; memo(n, `ist vor ${guard.name} (${O.name}) geflohen`); startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); }
    return;
  }
  // fremd: beobachten, bei Wiederholung verjagen
  if (!guard.act || guard.act.type !== 'watch') { guard.act = { type: 'watch', target: n.id, t: 0, stage: 0, tx: n.x, ty: n.y }; if (rnd() < 0.3) memo(guard, `hat ${n.name} von den ${T.name} in unserem Revier beobachtet`); }
  const limit = (scarce ? 3 : 8) * (1.4 - hard);
  if (O.trespass[T.id] > limit && n.act && rnd() < 0.5) {
    O.rel[T.id] -= scarce ? 4 : 2; T.rel[O.id] = (T.rel[O.id] ?? 0) - 2;
    memo(n, `wurde von ${guard.name} aus dem Revier der ${O.name} verjagt`);
    if (rnd() < 0.25) chron(1, `${guard.name} (${O.name}) verjagt ${n.name} (${T.name}) aus dem eigenen Revier.`, { tribe: O.id, npc: guard.id });
    if (n.tr.mut + n.tr.ehrgeiz > 1.4 && guard.tr.mut > 0.5 && rnd() < 0.35) {
      const r = fight(guard, n, `bei einem Grenzstreit zwischen den ${O.name} und den ${T.name} getötet`);
      O.rel[T.id] -= 8; T.rel[O.id] -= 10;
      chron(r.dead ? 3 : 2, `Ein Streit an der Grenze zwischen ${n.name} (${T.name}) und ${guard.name} (${O.name}) eskaliert${r.dead ? ` – ${r.loser.name} wird getötet` : ''}.`, { tribe: O.id, npc: guard.id });
      if (n.alive === false) return;
    }
    startAct(n, { type: 'return', tx: T.cx, ty: T.cy });
  }
}
function stepWatch(n, a) {
  const t = NPC.get(a.target);
  if (!t || ++a.t > 14) { n.act = null; return; }
  if (dist(n.x, n.y, t.x, t.y) > 3) moveToward(n, t.x, t.y, 1); // folgt in Sichtweite
}

// ---------- Gesandte ----------
function goods(T) { return T.store.hide * 3 + T.store.stone + T.store.wood * 0.5 + T.pots * 2; }
function payGoods(from, to, value) {
  let left = value;
  for (const [k, v] of [['hide', 3], ['stone', 1], ['wood', 0.5]]) { const n = Math.min(from.store[k], Math.ceil(left / v)); from.store[k] -= n; to.store[k] += n; left -= n * v; if (left <= 0) break; }
  return value - Math.max(0, left);
}
function planDiplomacy(T, L) {
  if (!L || L.injured || L.sick || ageY(L) > 65 || (L.act && L.act.type === 'diplo')) return;
  if (W.tick - (T.lastDiplo || -1e9) < C.TPY * 0.35) return;
  const pop = Math.max(1, T.members.length), perCap = T.store.food / pop;
  const target = seasonNow() >= 2 ? T.winterTarget : 8;
  const known = W.tribes.filter(O => O.alive && O !== T && T.rel[O.id] !== undefined && reachable(T, O.cx, O.cy) && dist(O.cx, O.cy, T.cx, T.cy) < 120);
  if (!known.length) return;
  const opts = [];
  // 1) Hunger: um Nahrung bitten
  if (perCap < target * 0.35) for (const O of known) { const op = O.store.food / Math.max(1, O.members.length); if (op > 12 && T.rel[O.id] > -40) opts.push({ O, kind: 'nahrung', score: 1 + op / 30 + T.rel[O.id] / 60 }); }
  // 2) Karges Land: um Zugang zu Jagd- und Sammelgründen bitten
  const own = bushesNear(T.cx, T.cy, T.R).reduce((a, b) => a + b.max, 0) / pop;
  if (own < 18) for (const O of known) { if (dist(O.cx, O.cy, T.cx, T.cy) < T.R + O.R + 15 && stance(O, T) !== 'erlaubt' && stance(O, T) !== 'verbündet' && T.rel[O.id] > -30) opts.push({ O, kind: 'zugang', score: 0.7 + (18 - own) / 20 }); }
  // 3) Fehde beenden – wenn der Anführer versöhnlich ist oder die Sippe schwächer
  for (const O of known) { if (T.rel[O.id] < -25) { const weaker = pop < O.members.length * 0.8; const will = L.tr.mitgefuehl * 0.6 + (weaker ? 0.4 : 0) - L.tr.stur * 0.4 - L.tr.ehrgeiz * 0.3 + (T.grudge[O.id] ? -0.3 : 0); if (will > 0.25) opts.push({ O, kind: 'frieden', score: 0.6 + will }); } }
  // 4) Bündnis mit Freunden – besonders gegen einen gemeinsamen Feind
  for (const O of known) { if (T.rel[O.id] > 20 && (O.rel[T.id] ?? 0) > 15 && !T.treaties.some(t => t.with === O.id && t.kind === 'buendnis')) { const common = W.tribes.some(X => X.alive && X !== T && X !== O && (T.rel[X.id] ?? 0) < -20 && (O.rel[X.id] ?? 0) < -20); opts.push({ O, kind: 'buendnis', score: 0.3 + L.tr.gesellig * 0.4 + (common ? 0.7 : 0) }); } }
  T.asked = T.asked || {};
  for (const o of opts) if ((T.asked[o.O.id + o.kind] || -1e9) > W.tick) o.score -= 5;
  if (!opts.length) return;
  const o = opts.sort((a, b) => b.score - a.score)[0];
  if (o.score <= 0) return;
  T.asked[o.O.id + o.kind] = W.tick + C.TPY * (o.kind === 'nahrung' ? 0.5 : 2);
  if (o.score < 0.7 && rnd() < 0.6) return;
  T.lastDiplo = W.tick;
  startAct(L, { type: 'diplo', target: o.O.id, kind: o.kind });
}
const DIPLO_TXT = { nahrung: 'um Nahrung zu bitten', zugang: 'um Zugang zu ihren Jagd- und Sammelgründen zu bitten', frieden: 'um Frieden zu bitten', buendnis: 'um ein Bündnis anzubieten' };
function stepDiplo(n, T, a, at) {
  const O = TRIBE.get(a.target);
  if (!O || !O.alive) { n.act = null; return; }
  if (a.stage === 0) {
    if (!a.announced) { a.announced = 1; chron(1, `${fullName(n)}, Oberhaupt der ${T.name}, bricht zu den ${O.name} auf, ${DIPLO_TXT[a.kind]}.`, { tribe: T.id, npc: n.id }); }
    const HS = hallDone(O) ? hallSeat(O, 3) : null; a.tx = HS ? HS[0] : O.cx; a.ty = HS ? HS[1] : O.cy;
    if (dist(n.x, n.y, a.tx, a.ty) < (HS ? 1 : 3.5)) { a.stage = 1; a.t = 0; if (HS && !a.hallMsg) { a.hallMsg = 1; chron(1, `${n.name} wird im Haupthaus der ${O.name} empfangen.`, { tribe: O.id, npc: n.id }); } return; }
    if (!moveVia(n, O, a.tx, a.ty, 1) && ++a.t > 400) n.act = null;
    return;
  }
  if (a.stage === 1) { if (++a.t < 8) return; negotiate(n, T, O, a.kind); if (n.alive !== false && n.act === a) startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); }
}
function negotiate(L, T, O, kind) {
  const H = NPC.get(O.leader) || adults(O)[0];
  if (!H) return;
  const relO = O.rel[T.id] ?? 0, opop = Math.max(1, O.members.length), pop = Math.max(1, T.members.length);
  const oPer = O.store.food / opop, oNeed = seasonNow() >= 2 ? O.winterTarget : 8;
  const fear = pop > opop * 1.4 ? 0.25 * (L.tr.mut + L.tr.ehrgeiz) : 0;
  const owed = (O.debt[T.id] || 0) > 0 ? 0.35 : 0;    // "Ihr habt uns damals geholfen"
  const hurt = (O.grudge[T.id] || 0) > 0 ? 0.4 : 0;    // alte Wunden
  let will = H.tr.mitgefuehl * 0.55 + H.tr.gesellig * 0.25 - H.tr.gier * 0.4 - H.tr.ehrgeiz * 0.15 + relO / 70 + L.tr.charisma * 0.35 + fear + owed - hurt + (rnd() - 0.5) * 0.3;
  const say = (imp, txt) => chron(imp, txt, { tribe: T.id, npc: L.id });
  // Der Gesandte eines Todfeindes ist in Gefahr
  if (relO < -55 && H.tr.mitgefuehl < 0.3 && H.tr.ehrgeiz > 0.6 && rnd() < 0.3) {
    say(3, `Die ${O.name} empfangen ${L.name} nicht – ${H.name} lässt den Gesandten der ${T.name} erschlagen. Das wird nicht vergessen werden.`);
    T.grudge[O.id] = (T.grudge[O.id] || 0) + 3; T.rel[O.id] = -90;
    die(L, `als Gesandter bei den ${O.name} erschlagen`, H); return;
  }
  if (kind === 'nahrung') {
    const spare = Math.max(0, O.store.food - opop * oNeed * 0.8);
    const amount = Math.floor(Math.min(spare, pop * 6));
    if (amount < 5) { say(2, `${H.name} (${O.name}) kann den hungernden ${T.name} nichts geben – die eigenen Vorräte reichen kaum.`); T.rel[O.id] = (T.rel[O.id] ?? 0) - 2; return; }
    if (will > 0.55) {
      O.store.food -= amount; T.store.food += amount;
      O.debt[T.id] = 0; T.debt[O.id] = (T.debt[O.id] || 0) + amount;
      T.rel[O.id] = (T.rel[O.id] ?? 0) + 25; O.rel[T.id] = relO + 6;
      say(3, `${H.name} (${O.name}) hat Mitleid mit den hungernden ${T.name} und schenkt ihnen ${amount} Vorräte. ${L.name} verspricht, das nie zu vergessen.`);
    } else if (will > 0.2 && goods(T) > 6) {
      const paid = payGoods(T, O, Math.min(goods(T), amount * 0.8));
      const got = Math.floor(Math.min(amount, paid * 1.4)); O.store.food -= got; T.store.food += got;
      T.rel[O.id] = (T.rel[O.id] ?? 0) + 5; O.rel[T.id] = relO + 3;
      say(2, `${H.name} (${O.name}) gibt den ${T.name} ${got} Vorräte – aber nur gegen Felle und Steine.`);
    } else {
      T.rel[O.id] = (T.rel[O.id] ?? 0) - (L.tr.stur > 0.5 ? 15 : 7);
      if (L.tr.ehrgeiz + L.tr.stur > 1.2) T.grudge[O.id] = (T.grudge[O.id] || 0) + 1;
      say(2, `${H.name} (${O.name}) weist ${L.name} ab. Die ${T.name} müssen hungrig heimkehren${L.tr.ehrgeiz + L.tr.stur > 1.2 ? ' – und ' + L.name + ' schwört, sich zu holen, was man ihm verweigert hat' : ''}.`);
    }
    return;
  }
  if (kind === 'zugang') {
    const crowded = bushesNear(O.cx, O.cy, O.R).reduce((a, b) => a + b.max, 0) / opop < 25;
    if (crowded) will -= 0.3;
    if (will > 0.5) {
      O.access[T.id] = W.tick + C.TPY * 2; O.rel[T.id] = relO + 4; T.rel[O.id] = (T.rel[O.id] ?? 0) + 10;
      say(2, `${H.name} (${O.name}) erlaubt den ${T.name}, zwei Jahre lang in ihrem Revier zu jagen und zu sammeln.`);
    } else if (will > 0.15 && goods(T) > 8) {
      const paid = payGoods(T, O, Math.min(goods(T), 20));
      O.access[T.id] = W.tick + C.TPY; O.rel[T.id] = relO + 2;
      say(2, `${H.name} (${O.name}) gewährt den ${T.name} für ein Jahr Zugang zu den Jagdgründen – gegen Abgaben im Wert von ${Math.round(paid)}.`);
    } else {
      T.rel[O.id] = (T.rel[O.id] ?? 0) - 6; O.rel[T.id] = relO - 2;
      say(2, `${H.name} (${O.name}) verweigert den ${T.name} den Zugang zu ihrem Land.`);
    }
    return;
  }
  if (kind === 'frieden') {
    const weary = (W.dead.filter(d => d.tribe === O.id && W.tick - d.died < C.TPY * 3 && /Überfall|Grenz/.test(d.cause)).length) * 0.05;
    will += 0.15 + H.tr.mitgefuehl * 0.2 - H.tr.stur * 0.2 + (opop < pop ? 0.25 : 0) + Math.min(0.4, weary) - (O.grudge[T.id] || 0) * 0.12;
    if (will > 0.4) {
      T.rel[O.id] = Math.max(T.rel[O.id] ?? 0, 0); O.rel[T.id] = Math.max(relO, -5);
      T.grudge[O.id] = 0; O.grudge[T.id] = Math.max(0, (O.grudge[T.id] || 0) - 1);
      T.treaties.push({ with: O.id, kind: 'frieden', t: W.tick }); O.treaties.push({ with: T.id, kind: 'frieden', t: W.tick });
      say(3, `Frieden: ${L.name} (${T.name}) und ${H.name} (${O.name}) teilen am Feuer Fleisch und begraben ihre Fehde.`);
    } else { O.rel[T.id] = relO - 3; say(2, `${H.name} (${O.name}) lehnt den Frieden mit den ${T.name} ab. ${(O.grudge[T.id] || 0) > 1 ? 'Zu viel Blut ist geflossen.' : H.tr.skepsis > 0.6 ? `${H.sex === 'f' ? 'Sie' : 'Er'} traut ihnen nicht.` : H.tr.ehrgeiz > 0.6 ? `${H.sex === 'f' ? 'Sie' : 'Er'} will kein Zeichen von Schwäche zeigen.` : 'Die Wunden sind noch zu frisch.'}`); }
    return;
  }
  if (kind === 'buendnis') {
    if (will > 0.5) {
      T.rel[O.id] = Math.min(100, (T.rel[O.id] ?? 0) + 25); O.rel[T.id] = Math.min(100, relO + 25);
      T.treaties.push({ with: O.id, kind: 'buendnis', t: W.tick }); O.treaties.push({ with: T.id, kind: 'buendnis', t: W.tick });
      // Heiraten besiegeln Bündnisse
      say(3, `Bündnis: ${L.name} (${T.name}) und ${H.name} (${O.name}) schließen einen Bund. Ihre Sippen wollen einander beistehen.`);
    } else { T.rel[O.id] = (T.rel[O.id] ?? 0) - 3; say(1, `${H.name} (${O.name}) will sich nicht an die ${T.name} binden.`); }
  }
}
// Verbündete stehen einander bei
function alliesOutraged(E, attacker) {
  for (const t of E.treaties) {
    if (t.kind !== 'buendnis') continue;
    const A = TRIBE.get(t.with); if (!A || !A.alive || A === attacker) continue;
    A.rel[attacker.id] = Math.min(A.rel[attacker.id] ?? 0, -30) - 10;
    if (rnd() < 0.5) chron(2, `Die ${A.name} sind empört über den Angriff auf ihre Verbündeten, die ${E.name}.`, { tribe: A.id });
  }
}

// ---------- Überfälle ----------
// ---------- Eroberung: Belagerung und Schlacht statt Raubzug ----------
function warPower(m) { const T = tribeOf(m); return (copperFor(m) ? 0.35 : 0) + (TK(T, 'heer') ? 0.25 : 0) + 0.6 + m.tr.mut * 0.8 + m.tr.geschick * 0.5 + (m.tools.bogen > 0 ? 0.6 : m.tools.speer > 0 ? 0.4 : 0) - (m.injured > 0 ? 0.5 : 0) + (ageY(m) > 50 ? -0.3 : 0); }
function resolveConquest(R) {
  const T = TRIBE.get(R.from), E = TRIBE.get(R.to);
  const raiders = raidersOf(R);
  for (const m of raiders) startAct(m, { type: 'return', tx: T ? T.cx : m.x, ty: T ? T.cy : m.y });
  for (const id of (E ? E.members : [])) { const m = NPC.get(id); if (m && m.act && (m.act.type === 'defend' || m.act.type === 'hide')) m.act = null; }
  if (!T || !E || !T.alive || !E.alive) return;
  const atk = raiders.filter(m => fitToFight(m) && dist(m.x, m.y, E.cx, E.cy) < warZone(E) + 4).reduce((a, m) => a + warPower(m), 0);
  const defenders = E.members.map(id => NPC.get(id)).filter(m => m && ageY(m) >= 15 && ageY(m) < 60 && fitToFight(m) && m.tr.mut > 0.25 && dist(m.x, m.y, E.cx, E.cy) < warZone(E));
  let def = defenders.reduce((a, m) => a + warPower(m), 0) * ((E.bld?.wall || 0) >= 28 ? 2.1 : (E.pal || 0) >= 12 ? 1.5 : 1);
  R.atk = atk; R.def = def;
  const LE = NPC.get(E.leader);
  const morale = R.kills - R.deaths + ((R.wounded || 0) - (R.hurt || 0)) * 0.5;
  if (R.won || (!R.retreat && (atk > def * 0.95 || (atk > def * 0.7 && morale >= 3)))) {
    // Sieg: die Unterlegenen werden Teil der Sieger – nicht alle fügen sich
    const proud = E.members.map(id => NPC.get(id)).filter(m => m && ageY(m) >= 15 && m.tr.stur + m.tr.mut > 1.35 && (m.rel[T.leader] || 0) < 20);
    const flee = W.tribes.filter(o => o.alive && o !== T && o !== E && (o.rel[E.id] ?? -99) > 0 && reachable(E, o.cx, o.cy)).sort((a, b) => dist(a.cx, a.cy, E.cx, E.cy) - dist(b.cx, b.cy, E.cx, E.cy))[0];
    let fled = 0;
    if (flee && proud.length) { const fam = new Set(); for (const p of proud) { fam.add(p); for (const k of p.kids) { const c = NPC.get(k); if (c && c.tribe === E.id && ageY(c) < 15) fam.add(c); } if (p.partner) { const q = NPC.get(p.partner); if (q && q.tribe === E.id) fam.add(q); } } fled = fam.size; moveMembers([...fam], E, flee, `floh vor den ${T.name} zu den ${flee.name}`); }
    const rest = E.members.map(id => NPC.get(id)).filter(Boolean);
    T.store.food += E.store.food; E.store.food = 0; for (const k of ['hide', 'stone', 'wood', 'fiber', 'clay']) { T.store[k] += E.store[k]; E.store[k] = 0; }
    for (const g of W.animals) if (HERD_K[g.k] && g.tribe === E.id) g.tribe = T.id;
    for (const m of rest) { addRel(m, NPC.get(T.leader) || m, -20); }
    if (cvOf(T, 'unfreiheit') > 0.35) for (const m of rest) if (ageY(m) >= 12 && rnd() < 0.5 + cvOf(T, 'unfreiheit') * 0.4 && m.id !== E.leader) m.unfrei = { t: W.tick, from: E.id };
    for (const m of rest) { nudge(m, 'freiheit', 0.08); nudge(m, 'rache', 0.05); }
    nudgeTribe(T, 'krieger', 0.04); nudgeTribe(T, 'ruhm', 0.03); nudgeTribe(T, 'gleichheit', -0.03);
    let held = null;
    if (rest.length >= 8 && E.town && E.huts.length >= 2) held = holdConquered(T, E, rest, raiders);
    if (!held && rest.length) moveMembers(rest, E, T, `wurde von den ${T.name} unterworfen`);
    if (E.alive) { E.alive = false; E.died = W.tick; }
    const L = NPC.get(T.leader); if (L) { L.prestige += 30; L.notable = true; memo(L, `hat die ${E.name} unterworfen`); }
    chron(3, `Eroberung! Die ${T.name} besiegen die ${E.name}${LE && LE.alive !== false ? ` – ${LE.name} ${fled && LE.tribe !== T.id ? 'flieht' : 'beugt sich'}` : ''}. ${rest.length} Menschen werden Teil der ${T.name}${fled ? `, ${fled} fliehen zu den ${flee.name}` : ''}. Das Land der ${E.name} gehört nun den Siegern.`, { tribe: T.id, npc: L?.id });
    if (flee) { flee.rel[T.id] = (flee.rel[T.id] ?? 0) - 30; }
  } else {
    E.grudge[T.id] = (E.grudge[T.id] || 0) + 2; T.rel[E.id] = (T.rel[E.id] ?? 0) - 10;
    if (LE) { LE.prestige += 15; memo(LE, `hat die Eroberung durch die ${T.name} abgewehrt`); }
    chron(3, `Der Eroberungszug der ${T.name} scheitert. Die ${E.name} halten stand${(E.pal || 0) >= 12 ? ' hinter ihrer Palisade' : ''} – ${R.kills} Verteidiger und ${R.deaths} Angreifer sind gefallen.`, { tribe: E.id });
  }
}
function stepRaid(n, T, a, at) {
  const R = W.raids.find(r => r.id === a.raid);
  if (!R) { n.act = null; return; }
  const E = TRIBE.get(R.to);
  if (!E || !E.alive || R.retreat) { startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); return; }
  a.tx = E.cx; a.ty = E.cy;
  if (!R.arrived && dist(n.x, n.y, E.cx, E.cy) > warZone(E) * 0.7) { moveVia(n, E, a.tx, a.ty, 1); if (++a.t > 300) startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); return; }
  if (R.arrived && dist(n.x, n.y, E.cx, E.cy) > warZone(E) + 6 && !a.foe) { moveVia(n, E, a.tx, a.ty, 1); return; }
  for (const id of E.members) { const d = NPC.get(id); if (d && rnd() < 0.01 && dist(d.x, d.y, n.x, n.y) < 7) insightCtx(d, 'raided', 1); }
  raidAtTarget(n, T, E, R, a);
}

// =====================================================================
//  Leben & Tod
// =====================================================================
function die(n, cause, killer) {
  const T = tribeOf(n);
  n.alive = false; n.deathCause = cause; n.died = W.tick;
  if (T && ageY(n) >= 14) { const I = T.items || (T.items = {}); for (const k of ['speer', 'bogen', 'korb', 'faustkeil']) if (n.tools[k] > 8) I[k] = (I[k] || 0) + 1; }
  const i = W.npcs.indexOf(n); if (i >= 0) W.npcs.splice(i, 1);
  NPC.delete(n.id);
  if (T) { const j = T.members.indexOf(n.id); if (j >= 0) T.members.splice(j, 1); }
  W.dead.push({ id: n.id, name: n.name, full: fullName(n), sex: n.sex, tribe: n.tribe, born: n.born, died: W.tick, cause, notable: n.notable });
  if (W.dead.length > 3000) W.dead.splice(0, 500);
  if (n.partner) { const p = NPC.get(n.partner); if (p && p.partner === n.id) { p.partner = 0; memo(p, `trauert um ${n.name}`); } }
  if (T) for (const id of T.members) { const p = NPC.get(id); if (p && p.partner === n.id) { p.partner = 0; if (rnd() < 0.5) memo(p, `trauert um ${n.name}`); } }
  for (const w of W.animals) if (w.owner === n.id) { const heir = n.kids.map(id => NPC.get(id)).find(Boolean) || (n.partner && NPC.get(n.partner)); w.owner = heir ? heir.id : 0; }
  if (killer) { addRel(killer, n, -50); for (const id of n.kids.concat(n.partner ? [n.partner] : [])) { const k = NPC.get(id); if (k) { addRel(k, killer, -80); memo(k, `wird ${killer.name} nie verzeihen`); } } }
  // Trauer -> Bestattung
  const mourners = [...n.kids, n.partner, ...n.parents].map(id => NPC.get(id)).filter(m => m && m.tribe === n.tribe);
  for (const m of mourners) { insightCtx(m, 'grief', 160 * (0.5 + m.tr.fromm)); if (rnd() < 0.5) memo(m, `trauert um ${n.name}`); }
  addCorpse(n, killer);
  const age = Math.floor(ageY(n));
  if (T && (cause === 'verhungert' || cause === 'erfroren')) { T.winterDeaths++; T.winterDeathsY = (T.winterDeathsY || 0) + 1; }
  if (T && cause === 'an einer Krankheit gestorben') { nudgeTribe(T, 'heilig', 0.012); nudgeTribe(T, 'reinheit', 0.015); }
  const important = n.notable || (T && T.leader === n.id);
  chron(important ? 2 : 1, `${fullName(n)} (${T ? T.name : '?'}, ${age} J.) ist ${cause}.`, { npc: n.id, tribe: n.tribe, dead: true });
  // Wissensverlust prüfen
  if (T) {
    for (const k in n.know) {
      if (!T.members.some(id => NPC.get(id)?.know[k])) {
        const anywhere = W.npcs.some(m => m.know[k]);
        if (T.members.length) chron(3, `Mit ${n.name} stirbt das Wissen um ${TECH[k].name} bei den ${T.name}.${anywhere ? '' : ' Niemand auf der Welt beherrscht es mehr.'}`, { tribe: T.id, tech: k });
        else if (!anywhere) chron(3, `Das Wissen um ${TECH[k].name} ist von der Welt verschwunden.`, { tech: k });
      }
    }
    if (T.leader === n.id) { T.leader = 0; chooseLeader(T); }
    if (!T.members.length && T.alive) { T.alive = false; T.died = W.tick; chron(3, `Die Sippe der ${T.name} ist untergegangen. Niemand ist übrig.`, { tribe: T.id }); }
  }
}

function birth(mother) {
  const T = tribeOf(mother), father = NPC.get(mother.partner);
  const k = makeNpc(rnd() < 0.5 ? 'f' : 'm', T, mother, father, 0);
  k.x = mother.x; k.y = mother.y; k.parents = [mother.id, father ? father.id : 0];
  mother.kids.push(k.id); if (father) father.kids.push(k.id);
  childValues(k, mother, father, T);
  mother.lastBirth = W.tick;
  setRel(k, mother, 80); setRel(mother, k, 90); if (father) { setRel(k, father, 60); setRel(father, k, 80); }
  // Glauben der Eltern übernehmen
  for (const b in mother.beliefs) k.beliefs[b] = mother.beliefs[b] * 0.7;
  if (father) for (const b in father.beliefs) k.beliefs[b] = Math.max(k.beliefs[b] || 0, father.beliefs[b] * 0.6);
  memo(mother, `hat ${k.name} geboren`);
  if (mother.notable || T.leader === mother.id || (father && T.leader === father.id)) chron(1, `${mother.name} (${T.name}) bringt ${k.sex === 'f' ? 'eine Tochter' : 'einen Sohn'} zur Welt: ${k.name}.`, { npc: k.id, tribe: T.id });
}

function chooseLeader(T, silent) {
  const ad = adults(T); if (!ad.length) return;
  const L = pickLeader(T, ad) || ad[0];
  T.prevLeader = T.leader || T.prevLeader; T.leader = L.id; L.notable = true;
  const how = { thing: 'wird von der Versammlung gewählt und ist nun', aelteste: 'wird vom Rat der Alten bestimmt zum', muetter: 'wird von den Müttern bestimmt zur', erbhaeupt: 'erbt die Würde und ist nun', koenig: 'besteigt den Thron und ist nun', krieger: 'setzt sich mit Gewalt durch und ist nun', geister: 'wird durch die Zeichen der Geister erwählt zum' }[T.gov] || 'wird zum neuen Oberhaupt';
  if (!silent) chron(2, `${fullName(L)} ${how}${how.endsWith('Oberhaupt') ? '' : ' ' + leaderTitle(T, L)} der ${T.name}.`, { npc: L.id, tribe: T.id });
  memo(L, `ist Oberhaupt der ${T.name}`);
}

// ---------- Neue Sippe gründen ----------
function foundTribe(founder, followers, reason) {
  const O = tribeOf(founder);
  // Ort suchen: aus Erinnerung (Büsche) oder Zufall
  let best = null, bs = -1;
  for (let k = 0; k < 300; k++) {
    const ang = rnd() * 6.283, r = 22 + rnd() * 28;
    const x = O.cx + Math.cos(ang) * r, y = O.cy + Math.sin(ang) * r;
    if (x < 6 || y < 6 || x > C.MW - 7 || y > C.MH - 7) continue;
    const t = tileAt(x, y); if (t !== T_GRASS && t !== T_FOREST) continue;
    if (W.tribes.some(T => T.alive && dist(T.cx, T.cy, x, y) < Math.max(15, (T.R || 14) + 6))) continue;
    if (!reachable(O, x, y)) continue;
    let s = bushesNear(x, y, 10).reduce((a, b) => a + b.max, 0);
    const w = nearestTile(x, y, 6, (tx, ty) => W.t[ty * C.MW + tx] <= T_SHALLOW); if (w) s += 30;
    if (W.ghosts && ghostsNear(x, y, 10).length) s += 80; // verlassene Häuser locken
    if (s > bs) { bs = s; best = [x, y]; }
  }
  if (!best) return null;
  const T = makeTribe(best[0], best[1], O);
  T.fire.lit = O.fire.lit; T.fire.fuel = 30;
  { const G = (W.ghosts ? ghostsNear(T.cx, T.cy, 12) : [])[0]; if (G && !W.tribes.some(X => X.alive && X !== T && dist(X.cx, X.cy, G.cx, G.cy) < 15)) T.adoptG = G; }
  const share = Math.floor(O.store.food * followers.length / Math.max(1, O.members.length)); O.store.food -= share; T.store.food += share;
  for (const m of [founder, ...followers]) {
    const i = O.members.indexOf(m.id); if (i >= 0) O.members.splice(i, 1);
    T.members.push(m.id); m.tribe = T.id; m.act = null; m.whisper = null;
    memo(m, `ist mit ${founder.name} zu neuem Land aufgebrochen`);
  }
  T.leader = founder.id; founder.notable = true; founder.prestige += 15;
  T.cv = memberMean(T); T.rules = (O.rules || []).filter(r => Math.sign(T.cv[VI[r.k]]) === r.pole).map(r => ({ ...r })); T.gov = bestGov(T).key; T.govSince = W.tick;
  T.rel[O.id] = reason === 'streit' ? -30 : 15; O.rel[T.id] = T.rel[O.id];
  for (const k in O.rel) if (k != T.id) { T.rel[k] = Math.round(O.rel[k] * 0.5); const X = TRIBE.get(+k); if (X) X.rel[T.id] = T.rel[k]; }
  if (reason !== 'werte') chron(3, `${fullName(founder)} verlässt mit ${followers.length} Gefährten die ${O.name}${reason === 'streit' ? ' im Streit' : reason === 'kult' ? ' – gemeinsam mit den Anhängern des neuen Glaubens' : ''} und gründet die Sippe der ${T.name}.`, { npc: founder.id, tribe: T.id });
  if (!O.members.length && O.alive) { O.alive = false; chron(3, `Die ${O.name} existieren nicht mehr – alle sind fortgezogen.`, { tribe: O.id }); }
  if (O.leader === founder.id || !NPC.get(O.leader) || NPC.get(O.leader).tribe !== O.id) { O.leader = 0; chooseLeader(O); }
  if (T.adoptG) { const G = T.adoptG; delete T.adoptG; adoptGhost(T, G); }
  return T;
}
function gatherFollowers(founder, fraction, filter) {
  const O = tribeOf(founder);
  const fam = new Set([founder.partner, ...founder.kids].filter(Boolean));
  const L = NPC.get(O.leader);
  const out = [];
  for (const id of O.members) {
    const m = NPC.get(id); if (!m || m === founder || m.id === O.leader) continue;
    if (fam.has(id) || (m.parents.length && (fam.has(m.parents[0]) || m.parents[0] === founder.id))) { out.push(m); continue; }
    if (filter && !filter(m)) continue;
    const pro = (m.rel[founder.id] || 0) - (L ? (m.rel[L.id] || 0) : 0) + m.tr.mut * 20 + rnd() * 30 - 25;
    if (pro > 0 && rnd() < fraction * 2) out.push(m);
  }
  // Kinder mitnehmen
  for (const m of [...out]) for (const kid of m.kids) { const k = NPC.get(kid); if (k && ageY(k) < 15 && k.tribe === O.id && !out.includes(k) && k !== founder) out.push(k); }
  return out;
}

// ---------- Sippen-Politik (alle paar Tage) ----------
function tribeTick(T) {
  if (!T.alive) return;
  const ad = adults(T), pop = T.members.length;
  if (!T.leader || !NPC.get(T.leader) || NPC.get(T.leader).tribe !== T.id) chooseLeader(T);
  const L = NPC.get(T.leader);
  neighborPressure(T); if (!T.alive) return;
  T.R = territoryRadius(T);
  for (const k in T.trespass) T.trespass[k] *= 0.85;
  planDiplomacy(T, L);
  // Machtkampf
  for (const c of ad) {
    if (!L || c === L) continue;
    const wants = c.tr.ehrgeiz > 0.7 && c.prestige > L.prestige * 0.75 && (c.rel[L.id] || 0) < 20;
    const forced = c.whisper?.type === 'challenge';
    const gm = { haeuptling: 1, krieger: 2.2, horde: 0.6, thing: 0.4, aelteste: 0.3, muetter: 0.3, geister: 0.5, erbhaeupt: 0.35, tempel: 0.3, koenig: 0.25 }[T.gov] ?? 1;
    if ((wants && rnd() < 0.0008 * gm) || forced) {
      if (forced) c.whisper = null;
      const sc = x => x.prestige * 0.5 + x.tr.charisma * 30 + x.tr.mut * 20 + rnd() * 30 + T.members.filter(id => { const m = NPC.get(id); return m && (m.rel[x.id] || 0) > (m.rel[(x === c ? L : c).id] || 0); }).length * 2;
      const sw = sc(c), sl = sc(L);
      if (sw > sl) {
        T.leader = c.id; c.notable = true; c.prestige += 10; L.prestige *= 0.6;
        chron(3, `Machtkampf bei den ${T.name}: ${fullName(c)} stürzt ${L.name} und wird Oberhaupt.`, { npc: c.id, tribe: T.id });
        memo(c, `hat ${L.name} gestürzt`); memo(L, `wurde von ${c.name} gestürzt`); addRel(L, c, -60);
        if (L.tr.stur + L.tr.ehrgeiz > 1.3 && ad.length > 18 && rnd() < 0.3 && freeLandNear(T)) { const f = gatherFollowers(L, 0.3); if (f.length >= 10) foundTribe(L, f, 'streit'); }
      } else {
        chron(2, `${fullName(c)} fordert ${L.name} heraus – und unterliegt.`, { npc: c.id, tribe: T.id });
        c.prestige *= 0.5; addRel(c, L, -40); memo(c, `ist im Machtkampf gegen ${L.name} unterlegen`);
        if (c.tr.stur + c.tr.ehrgeiz > 1.4 && ad.length > 18 && rnd() < 0.25 && freeLandNear(T)) { const f = gatherFollowers(c, 0.25); if (f.length >= 10) foundTribe(c, f, 'streit'); }
      }
      break;
    }
  }
  // Weiterziehen, wenn das Land karg ist
  const settled = tribeFields(T).length >= 3 || T.storehouse || (T.pal || 0) >= 8;
  if (settled) {} else if (season() !== 3 && T.store.food / Math.max(1, pop) < 3 && pop >= 3 && W.tick - (T.moved || T.founded) > C.TPY * 0.4) {
    const near = bushesNear(T.cx, T.cy, 20).reduce((a, b) => a + b.f, 0) / pop;
    if ((near < 6 || T.store.food / pop < 1.5) && rnd() < 0.35 * (1 - Math.max(0, cvOf(T, 'heim')) * 0.6)) relocate(T, pop);
  } else if (season() === 2 && pop >= 3 && T.store.food / pop < T.winterTarget * 0.35 && W.tick - (T.moved || T.founded) > C.TPY * 0.4) {
    const near = bushesNear(T.cx, T.cy, 20).reduce((a, b) => a + b.f, 0) / pop;
    if (near < 10 && rnd() < 0.4) relocate(T, pop);
  }
  // Abwanderung bei Enge
  const perCap = T.store.food / Math.max(1, pop);
  if (pop > cohesion(T) && rnd() < (perCap < 2 ? 0.02 : 0.005) && freeLandNear(T)) {
    const cand = ad.filter(m => m.id !== T.leader && m.tr.mut + m.tr.ehrgeiz + m.tr.neugier > 1.6 && ageY(m) < 45).sort((a, b) => b.prestige - a.prestige)[0];
    if (cand) { const f = gatherFollowers(cand, 0.3); if (f.length >= 14) foundTribe(cand, f, 'enge'); }
  }
  // Kulte
  for (const key in W.beliefs) {
    const B = W.beliefs[key]; if (B.kind !== 'kult') continue;
    const F = NPC.get(B.founder); if (!F || F.tribe !== T.id) continue;
    const share = tribeBeliefShare(T, key);
    if (share > 0.5 && !T.customs.includes(key)) { T.customs.push(key); chron(3, `Der Glaube an „${B.name}“ wird zum Glauben der ${T.name}.`, { tribe: T.id, npc: F.id }); }
    if (L && F !== L && share > 0.2 && (L.beliefs[key] || 0) < 0.4 && (L.tr.skepsis + L.tr.stur > 1.0)) {
      T.tension[key] = (T.tension[key] || 0) + 1;
      if (T.tension[key] === 2) chron(2, `${L.name}, Oberhaupt der ${T.name}, verbietet den Glauben an „${B.name}“. Unruhe breitet sich aus.`, { tribe: T.id });
      if (T.tension[key] >= 5) {
        T.tension[key] = 0;
        const f = gatherFollowers(F, 1, m => (m.beliefs[key] || 0) >= 0.5);
        if (f.length >= 8 && freeLandNear(T)) { const N = foundTribe(F, f, 'kult'); if (N) { N.customs.push(key); N.name = 'Kinder d. ' + B.name.replace(/^(Der|Die|Das) /, ''); } }
      }
    }
  }
  // Bräuche
  for (const key in W.beliefs) {
    const B = W.beliefs[key]; if (B.kind === 'kult' || T.customs.includes(key)) continue;
    if (B.tribe !== T.id && !ad.some(m => m.beliefs[key])) continue;
    if (ad.length >= 6 && tribeBeliefShare(T, key) > 0.5) { T.customs.push(key); chron(2, `Bei den ${T.name} wird ein Brauch: ${B.name}.`, { tribe: T.id }); }
  }
  // Spontaner Kult (sehr selten)
  for (const c of ad) {
    if (c.tr.fromm > 0.72 && c.tr.charisma > 0.6 && c.tr.ehrgeiz > 0.55 && !preachKey(c) && rnd() < 0.0006) startCult(c);
  }
  // Überfälle
  const target = seasonNow() >= 2 ? T.winterTarget : 8;
  const desperation = clamp(1 - perCap / (target * 0.5), 0, 1) + Math.min(0.3, (T.lonely || 0) * 0.05);
  T.lonely = 0;
  if (L && ad.length >= 6 && desperation > 0.25) {
    const A = authority(T), la = L.tr.ehrgeiz * 0.5 + L.tr.mut * 0.3 + (1 - L.tr.mitgefuehl) * 0.45 + L.tr.gier * 0.3, ca = 0.75 + cvOf(T, 'krieger') * 0.5 + cvOf(T, 'ruhm') * 0.15 - cvOf(T, 'fuersorge') * 0.15;
    const aggr = la * A + ca * (1 - A) + desperation * 0.4;
    if (aggr > 0.95 && rnd() < 0.035) {
      const targets = W.tribes.filter(O => O.alive && O.id !== T.id && T.rel[O.id] !== undefined && (!T.treaties.some(t => t.with === O.id) || (cvOf(T, 'ehrlichkeit') < -0.45 && rnd() < 0.25)) && T.rel[O.id] < 10 + desperation * 20 - (T.debt[O.id] ? 30 : 0) && dist(O.cx, O.cy, T.cx, T.cy) < 60 && O.store.food > 10 && reachable(T, O.cx, O.cy));
      if (targets.length) launchRaid(T, targets.sort((a, b) => b.store.food - a.store.food)[0]);
    }
  }
  // Wer uns verweigert hat, was wir zum Leben brauchten
  for (const k in T.grudge) { const O = TRIBE.get(+k); if (O && O.alive && T.grudge[k] > 0 && L && desperation > 0.4 && L.tr.ehrgeiz + L.tr.mut > 1.1 && rnd() < 0.05 && ad.length >= 6 && reachable(T, O.cx, O.cy)) { launchRaid(T, O); T.grudge[k] = Math.max(0, T.grudge[k] - 1); break; } }
  // Rache-Feldzug nach Überfall
  for (const k in T.rel) {
    const O = TRIBE.get(+k);
    if (O && O.alive && T.rel[k] < -50 && L && L.tr.mut + L.tr.ehrgeiz + cvOf(T, 'rache') * 0.6 > 1.2 && rnd() < 0.008 * (1 + Math.max(0, cvOf(T, 'rache')) * 2.5) && ad.length >= 6) { launchRaid(T, O); break; }
  }
  partnerMigration(T);
  // Flucht aus dem Hunger
  if (pop >= 3 && T.store.food / pop < 0.5) {
    const avgH = T.members.reduce((a, id) => a + (NPC.get(id)?.hunger || 0), 0) / pop;
    if (avgH > 65 && rnd() < 0.35) {
      const H = W.tribes.filter(o => o.alive && o !== T && (T.rel[o.id] ?? 0) > -25 && o.store.food > o.members.length * 4 && reachable(T, o.cx, o.cy) && dist(o.cx, o.cy, T.cx, T.cy) < 90).sort((a, b) => dist(a.cx, a.cy, T.cx, T.cy) - dist(b.cx, b.cy, T.cx, T.cy))[0];
      if (H) {
        const fam = new Set(); const leaderId = T.leader;
        for (const id of T.members) { if (fam.size >= Math.ceil(pop * 0.35)) break; const m = NPC.get(id); if (!m || id === leaderId || (m.tr.stur > 0.7 && rnd() < 0.7)) continue; fam.add(m); if (m.partner) { const p = NPC.get(m.partner); if (p && p.tribe === T.id && p.id !== leaderId) fam.add(p); } for (const k of m.kids) { const c = NPC.get(k); if (c && c.tribe === T.id && ageY(c) < 15) fam.add(c); } }
        if (fam.size) {
          for (const m of fam) { T.members.splice(T.members.indexOf(m.id), 1); H.members.push(m.id); m.tribe = H.id; m.act = null; memo(m, `ist vor dem Hunger zu den ${H.name} geflohen`); }
          const welcome = (H.rel[T.id] ?? 0) > 10 || rnd() < 0.5 + cvOf(H, 'gast') * 0.4 - cvOf(H, 'blut') * 0.2;
          if (welcome) { nudgeTribe(H, 'gast', 0.02); for (const m of fam) nudge(m, 'gast', 0.06); }
          H.rel[T.id] = (H.rel[T.id] ?? 0) + (welcome ? 5 : -10);
          chron(2, `Hunger bei den ${T.name}: ${fam.size} Menschen fliehen zu den ${H.name}${welcome ? ', die sie aufnehmen' : ', die sie nur widerwillig dulden'}.`, { tribe: H.id });
          if (!T.members.length && T.alive) { T.alive = false; chron(3, `Die ${T.name} haben sich aufgelöst.`, { tribe: T.id }); }
          else if (!NPC.get(T.leader) || NPC.get(T.leader).tribe !== T.id) chooseLeader(T);
        }
      }
    }
  }
  // Unterwerfung: eine schwache, oft überfallene Sippe beugt sich dem Stärkeren
  for (const k in T.grudge) {
    const A = TRIBE.get(+k);
    if (!A || !A.alive || T.grudge[k] < 2 || A.members.length < pop * 3 || pop > 25) continue;
    const LT = NPC.get(T.leader);
    const proud = LT ? LT.tr.stur * 0.5 + LT.tr.ehrgeiz * 0.4 + LT.tr.mut * 0.3 : 0.5;
    if (rnd() < 0.15 * (1.4 - proud)) {
      chron(3, `Nach Jahren der Überfälle beugen sich die ${T.name} den mächtigen ${A.name} und gehen in ihnen auf.`, { tribe: A.id });
      A.store.food += T.store.food; moveMembers(T.members.map(id => NPC.get(id)).filter(Boolean), T, A, `musste sich mit der Sippe den ${A.name} unterwerfen`);
      for (const id of A.members) { const m = NPC.get(id); if (m && m.tribe === A.id) {} }
      return;
    }
  }
  // Zu kleine Sippe schließt sich an
  if (pop > 0 && pop < 10) {
    const host = W.tribes.filter(O => O.alive && O !== T && (T.rel[O.id] ?? -99) > (pop < 4 ? -45 : -10) && O.members.length > pop && reachable(T, O.cx, O.cy)).sort((a, b) => (b.rel[T.id] ?? 0) - (a.rel[T.id] ?? 0) + (dist(a.cx, a.cy, T.cx, T.cy) - dist(b.cx, b.cy, T.cx, T.cy)) / 20)[0];
    if (host && rnd() < (pop < 4 ? 0.5 : pop < 6 ? 0.3 : 0.08)) {
      for (const id of [...T.members]) { const m = NPC.get(id); m.tribe = host.id; host.members.push(id); m.act = null; memo(m, `hat sich den ${host.name} angeschlossen`); }
      T.members = []; T.alive = false; host.store.food += T.store.food;
      chron(3, `Die letzten ${pop} der ${T.name} schließen sich den ${host.name} an.`, { tribe: host.id });
    }
  }
}
function season() { return seasonNow(); }
function moveMembers(list, from, to, why) {
  for (const m of list) { const i = from.members.indexOf(m.id); if (i >= 0) from.members.splice(i, 1); if (!to.members.includes(m.id)) to.members.push(m.id); m.tribe = to.id; m.act = null; if (why) memo(m, why); }
  if (!from.members.length && from.alive) { from.alive = false; from.died = W.tick; }
  else if (!NPC.get(from.leader) || NPC.get(from.leader).tribe !== from.id) chooseLeader(from, true);
}
// Gibt es überhaupt noch freies Land für eine neue Sippe?
function freeLandNear(O) {
  for (let k = 0; k < 120; k++) {
    const ang = rnd() * 6.283, r = 25 + rnd() * 35, x = O.cx + Math.cos(ang) * r, y = O.cy + Math.sin(ang) * r;
    if (x < 8 || y < 8 || x > C.MW - 9 || y > C.MH - 9) continue;
    const t = tileAt(x, y); if (t !== T_GRASS && t !== T_FOREST) continue;
    if (W.tribes.some(T => T.alive && dist(T.cx, T.cy, x, y) < (T.R || 14) + 12)) continue;
    if (reachable(O, x, y)) return true;
  }
  return false;
}
function relocate(T, pop) {
  let best = null, bs = bushesNear(T.cx, T.cy, 20).reduce((a, b) => a + b.max, 0);
  for (let k = 0; k < 200; k++) {
    const ang = rnd() * 6.283, r = 12 + rnd() * 30;
    const x = T.cx + Math.cos(ang) * r, y = T.cy + Math.sin(ang) * r;
    if (x < 6 || y < 6 || x > C.MW - 7 || y > C.MH - 7) continue;
    const t = tileAt(x, y); if (t !== T_GRASS && t !== T_FOREST) continue;
    if (W.tribes.some(O => O.alive && O !== T && dist(O.cx, O.cy, x, y) < Math.max(16, (O.R || 14) + 6))) continue;
    const F = flowFor(T); if (F.at((y | 0) * C.MW + (x | 0)) >= 1e9) continue;
    let s = bushesNear(x, y, 20).reduce((a, b) => a + b.max, 0) - r * 2;
    if (nearestTile(x, y, 6, (tx, ty) => W.t[ty * C.MW + tx] <= T_SHALLOW)) s += 40;
    if (s > bs * 1.3) { bs = s; best = [x, y]; }
  }
  if (!best) return;
  abandonTown(T, 'fort'); const G0 = ghostsNear(best[0], best[1], 14).find(G => G.id !== T.id);
  T.cx = best[0]; T.cy = best[1]; T.moved = W.tick; T.huts = []; T.town = null; T.penR = null; T.bld = null; T.bpos = null; W.hutVer = (W.hutVer || 0) + 1; T.cem = null; T.quarry = null; T.storehouse = null; T.pal = 0; T.pen = null; T.traps = [];
  T.ghosted = 0;
  for (const id of T.members) { const m = NPC.get(id); if (m) m.act = null; }
  chron(2, `Das Land gibt nicht mehr genug her: Die ${T.name} ziehen weiter und schlagen ein neues Lager auf.`, { tribe: T.id });
  if (G0) adoptGhost(T, G0);
}
function startCult(c, forced) {
  const T = tribeOf(c);
  const name = pick(SPIRITS);
  const key = makeBelief('kult', c, name, `${c.name} verkündet: Alles Glück und Unglück kommt von „${name}“.`);
  W.beliefs[key].kind = 'kult'; c.beliefs[key] = 1;
  c.whisper = { type: 'preach', until: W.tick + C.TPD * 40 };
  c.notable = true;
  chron(3, `${fullName(c)} (${T.name}) hat eine Eingebung und beginnt, den Glauben an „${name}“ zu predigen.`, { npc: c.id, tribe: T.id });
  memo(c, `predigt den Glauben an „${name}“`);
}
function launchRaid(T, E, opts = {}) {
  const fighters = adults(T).filter(m => (m.tr.mut > (opts.conquest ? 0.2 : 0.35)) && !m.injured && ageY(m) < (opts.conquest ? 55 : 50)).sort((a, b) => (b.job === 'krieger') - (a.job === 'krieger') || b.tr.mut - a.tr.mut).slice(0, Math.max(3, Math.round(T.members.length * (opts.conquest ? 0.5 : 0.3))));
  if (fighters.length < 3) return false;
  const R = { id: W.nextId++, from: T.id, to: E.id, t: W.tick, kills: 0, deaths: 0, loot: 0, n: fighters.length, conquest: !!opts.conquest };
  W.raids.push(R);
  for (const m of fighters) startAct(m, { type: 'raid', raid: R.id, tx: E.cx, ty: E.cy });
  T.rel[E.id] = Math.min(T.rel[E.id] || 0, -40); E.rel[T.id] = Math.min(E.rel[T.id] || 0, -60);
  E.grudge[T.id] = (E.grudge[T.id] || 0) + 1;
  T.treaties = T.treaties.filter(t => t.with !== E.id); E.treaties = E.treaties.filter(t => t.with !== T.id);
  alliesOutraged(E, T);
  E.lastRaided = W.tick; T.lastRaid = W.tick;
  const L = NPC.get(T.leader);
  chron(3, `${L ? fullName(L) : 'Das Oberhaupt'} führt ${fighters.length} Krieger der ${T.name} ${opts.conquest ? 'in einen Eroberungszug gegen' : 'zu einem Überfall auf'} die ${E.name}!`, { tribe: T.id, npc: L?.id });
  return true;
}

// =====================================================================
//  Weltschritt
// =====================================================================
function campNear(x, y, r) { for (const T of W.tribes) if (T.alive && Math.abs(T.cx - x) < r && Math.abs(T.cy - y) < r && dist(T.cx, T.cy, x, y) < r) return T; return null; }
function stepAnimals() {
  const season = seasonNow();
  for (let i = W.animals.length - 1; i >= 0; i--) {
    const a = W.animals[i];
    if (a.k === 'wolf' && a.owner) {
      const o = NPC.get(a.owner);
      if (!o) { a.owner = 0; continue; }
      moveToward(a, o.x + 0.8 * (o.dir || 1), o.y + 0.5, 2.5);
      continue;
    }
    if (HERD_K[a.k] && a.tribe) {
      const T = TRIBE.get(a.tribe);
      if (!T || !T.alive) { a.tribe = 0; continue; }
      const p = penOf(T);
      const PR = T.penR; if (PR) { if (a.x < PR.x0 + 0.5 || a.x > PR.x0 + PR.w - 0.5 || a.y < PR.y0 + 0.6 || a.y > PR.y0 + PR.h - 0.4 || rnd() < 0.05) { a.tx = PR.x0 + 0.8 + rnd() * (PR.w - 1.6); a.ty = PR.y0 + 1 + rnd() * (PR.h - 1.6); } }
      else if (dist(a.x, a.y, p[0], p[1]) > 3 || rnd() < 0.05) { a.tx = p[0] + (rnd() - 0.5) * 3; a.ty = p[1] + (rnd() - 0.5) * 3; }
      moveToward(a, a.tx, a.ty, 0.5); continue;
    }
    if (a.flee > 0) { a.flee--; const ang = Math.atan2(a.y - a.fy, a.x - a.fx); moveToward(a, a.x + Math.cos(ang) * 3, a.y + Math.sin(ang) * 3, a.k === 'deer' ? 2.4 : 2.6); a.flee -= 2; continue; }
    if ((W.tick + a.id) % 30 === 0 && a.k !== 'wolf') { const c = campNear(a.x, a.y, 16); if (c) { const ang = Math.atan2(a.y - c.cy, a.x - c.cx); a.tx = clamp(a.x + Math.cos(ang) * 10, 1, C.MW - 2); a.ty = clamp(a.y + Math.sin(ang) * 10, 1, C.MH - 2); } } // Wild meidet die Menschen
    if (dist(a.x, a.y, a.tx, a.ty) < 0.5 || rnd() < 0.01) {
      const r = a.k === 'wolf' ? 10 : 5;
      const nx = clamp(a.x + (rnd() - 0.5) * r * 2, 1, C.MW - 2), ny = clamp(a.y + (rnd() - 0.5) * r * 2, 1, C.MH - 2);
      const t = tileAt(nx, ny); if (t >= T_SHORE && t <= T_HILLS) { a.tx = nx; a.ty = ny; }
    }
    moveToward(a, a.tx, a.ty, a.k === 'wolf' ? 0.75 : 0.38);
  }
}
function dailyTick() {
  const day = dayNum(), season = seasonNow(), dayOfYear = day % C.DPY;
  corpseDaily(); villageDaily(); for (const T of W.tribes) if (T.alive) { jobDaily(T); oreDaily(T); inspireDaily(T); }
  // Büsche wachsen
  for (const b of W.bushes) { if (b.gone) continue; const P = PLANT[b.k] || PLANT.berry, grow = P.grow[season]; b.f = Math.min(b.max, b.f + Math.floor(grow) + (rnd() < grow % 1 ? 1 : 0)); if (season === 3 && rnd() < P.winter) b.f = Math.max(0, b.f - 1); }
  // Vorräte verderben
  for (const T of W.tribes) if (T.alive) {
    const spoil = (T.storehouse ? 0.45 : 1) * (season === 3 ? 0.004 : 0.008) * (T.huts.length >= T.members.length / 8 ? 0.6 : 1) * (T.pots > 0 ? Math.max(0.3, 1 - T.pots / Math.max(1, T.members.length) * 1.5) : 1);
    T.store.food = Math.max(0, T.store.food * (1 - spoil * spoilMul(T)));
    if (T.fire.lit) { T.fire.fuel -= season === 3 ? (W.hardWinter ? 9 : 7) : 5; if (T.fire.fuel <= 0 && T.store.wood > 0) { const w = Math.min(T.store.wood, 10); T.store.wood -= w; T.fire.fuel += w * 4; } if (T.fire.fuel <= -15) { T.fire.lit = false; T.fire.fuel = 0; T.fireLostT = W.tick; chron(tribeKnows(T, 'feuer_machen') ? 2 : 3, `Das Feuer der ${T.name} ist erloschen!${tribeKnows(T, 'feuer_machen') ? '' : ' Niemand dort weiß, wie man es neu entfacht.'}`, { tribe: T.id }); } }
    // Hütten nutzen sich ab: siehe villageDaily
  }
  if (dayOfYear === SEASON_LEN[0] + SEASON_LEN[1] + SEASON_LEN[2]) {
    W.hardWinter = rnd() < 0.22;
    if (W.hardWinter) chron(3, 'Ein strenger Winter bricht herein. Die Kälte ist bitter, und nichts wächst mehr.', {});
  }
  if (dayOfYear === 0) { W.hardWinter = false; decayPaths(); }
  if (day % 10 === 0) for (const T of W.tribes) if (T.alive) T.raft = T.members.some(id => { const m = NPC.get(id); return m && (m.know.floss || m.know.einbaum); });
  // Lehren aus dem Winter
  if (dayOfYear === 1) for (const T of W.tribes) if (T.alive) {
    if (T.winterDeaths >= 2) { T.winterTarget = Math.min(75, T.winterTarget + 6 + T.winterDeaths); chron(2, `Nach einem Hungerwinter mit ${T.winterDeaths} Toten beschließen die ${T.name}, im Herbst größere Vorräte anzulegen.`, { tribe: T.id }); }
    else if (T.winterTarget > 24 && rnd() < 0.15) T.winterTarget -= 2; // langsam vergessen
    T.winterDeaths = 0;
  }
  // Felder reifen zum Herbst, Unbestelltes verkümmert im Winter
  if (dayOfYear === SEASON_LEN[0] + SEASON_LEN[1]) for (const k in W.fields) { const f = W.fields[k]; if (f.st === 2) { f.st = 3; f.y = rint(22, 34); } else if (f.st === 1) { f.st = 3; f.y = rint(6, 12); } }
  if (dayOfYear === C.DPY - 1) for (const k in W.fields) { const f = W.fields[k]; f.st = 0; f.y = 0; const T = TRIBE.get(f.tr); if (!T || !T.alive || dist(T.cx, T.cy, k % C.MW, (k / C.MW) | 0) > 30) delete W.fields[k]; }
  // Vieh, Reusen
  for (const T of W.tribes) if (T.alive) {
    const herd = W.animals.filter(g => HERD_K[g.k] && g.tribe === T.id);
    if (herd.length) {
      const milk = TK(T, 'milch') ? 1.6 : 1;
      if (season !== 3) for (const g of herd) T.store.food += (g.k === 'goat' || g.k === 'sheep' ? 0.3 : g.k === 'cattle' ? 0.6 : 0) * milk; // Milch
      const sheep = herd.filter(g => g.k === 'sheep').length; if (sheep && season === 1) T.store.fiber += sheep * 0.15; // Wolle
      const pigs = herd.filter(g => g.k === 'pig').length; if (pigs) T.store.food += pigs * 0.15; // Schweine fressen Abfälle
      if (season === 3 && T.store.food / Math.max(1, T.members.length) < 2 && herd.length > 2) { const cand = herd.filter(g => g.k !== 'donkey'); const g = cand.find(g => (W.tick - g.born) / C.TPY > 1) || cand[0]; if (g) { W.animals.splice(W.animals.indexOf(g), 1); T.store.food += { cattle: 40, pig: 20 }[g.k] || 12; T.store.hide += 1; } }
    }
    if (T.traps && T.traps.length) { T.store.food += T.traps.length * (season === 3 ? 0.6 : 2.2); if (rnd() < 0.004) T.traps.shift(); }
  }
  // Ehe-Sitten: Einehe oder Vielehe (alle 30 Tage)
  if (day % 30 === 0) for (const T of W.tribes) if (T.alive) {
    const ad = adults(T), sw = ad.filter(m => m.sex === 'f' && !m.partner && ageY(m) < 40).length, sm = ad.filter(m => m.sex === 'm' && !m.partner && ageY(m) < 45).length;
    const L = NPC.get(T.leader); T.poly = T.poly || 0;
    const push = sw > sm + 2 ? 0.08 * (0.5 + (L ? L.tr.ehrgeiz * 0.5 + L.tr.gier * 0.5 - L.tr.mitgefuehl * 0.4 : 0)) : -0.03 - (L ? L.tr.mitgefuehl * 0.02 : 0);
    const before = T.poly; T.poly = clamp(T.poly + push, 0, 1);
    if (before < 0.5 && T.poly >= 0.5) chron(2, `Bei den ${T.name} gibt es mehr Frauen als Männer. Angesehene Männer dürfen nun mehrere Frauen haben.`, { tribe: T.id });
    if (before >= 0.5 && T.poly < 0.5) chron(2, `Die ${T.name} kehren zur Einehe zurück.`, { tribe: T.id });
  }
  // Tiere vermehren sich (Frühlingsanfang)
  if (dayOfYear === 5) {
    const deer = W.animals.filter(a => a.k === 'deer');
    const cap = Math.round(110 * C.MW * C.MH / 108000); let born = 0;
    for (const d of deer) if (deer.length + born < cap && rnd() < 0.42) { W.animals.push({ id: W.nextId++, k: 'deer', x: d.x, y: d.y, tx: d.x, ty: d.y, born: W.tick }); born++; }
    const horses = W.animals.filter(a => a.k === 'horse' && !a.tribe); for (const h of horses) if (horses.length < 25 * C.MW * C.MH / 108000 && rnd() < 0.2) W.animals.push({ id: W.nextId++, k: 'horse', x: h.x, y: h.y, tx: h.x, ty: h.y, born: W.tick });
    const AR = C.MW * C.MH / 108000;
    for (const K in HERD_K) { const all = W.animals.filter(a => a.k === K), cnt = {}; let wild = 0; for (const g of all) { if (g.tribe) cnt[g.tribe] = (cnt[g.tribe] || 0) + 1; else wild++; }
      const cap = (K === 'goat' ? 18 : 12) * AR, pb = { goat: 0.55, sheep: 0.55, cattle: 0.32, pig: 0.75, donkey: 0.3 }[K];
      for (const g of all) { if (g.tribe) { const T = TRIBE.get(g.tribe); if (T && rnd() < pb && cnt[g.tribe] < (K === 'donkey' ? Math.min(6, T.members.length * 0.1) : T.members.length * 0.6 / Math.max(1, Object.keys(T.tc?.herd || { goat: 1 }).length))) { W.animals.push({ id: W.nextId++, k: K, x: g.x, y: g.y, tx: g.x, ty: g.y, born: W.tick, tribe: g.tribe }); cnt[g.tribe]++; } } else if (wild < cap && rnd() < 0.3) { W.animals.push({ id: W.nextId++, k: K, x: g.x, y: g.y, tx: g.x, ty: g.y, born: W.tick, tribe: 0 }); wild++; } } }
    const wolves = W.animals.filter(a => a.k === 'wolf' && !a.owner); for (const w of wolves) if (wolves.length < 14 * C.MW * C.MH / 108000 && rnd() < 0.25) W.animals.push({ id: W.nextId++, k: 'wolf', x: w.x, y: w.y, tx: w.x, ty: w.y, born: W.tick, owner: 0 });
  }
  // Wölfe reißen Hirsche, Tiere sterben an Alter
  if (rnd() < 0.3) { const deer = W.animals.filter(a => a.k === 'deer'); if (deer.length > 40 * C.MW * C.MH / 108000) { const d = pick(deer); W.animals.splice(W.animals.indexOf(d), 1); } }
  for (let i = W.animals.length - 1; i >= 0; i--) { const a = W.animals[i]; const age = (W.tick - a.born) / C.TPY; if (age > (a.k === 'horse' ? 22 : a.k === 'wolf' ? 11 : 14) && rnd() < 0.01) W.animals.splice(i, 1); }
  // Winterverluste bei Hirschen
  if (season === 3) { const deer = W.animals.filter(a => a.k === 'deer'); for (const d of deer) if (rnd() < (W.hardWinter ? 0.005 : 0.0015)) W.animals.splice(W.animals.indexOf(d), 1); }
  if (season !== 3) regrowForest();
  // Blitze
  if (season === 1 && rnd() < 0.05) {
    const p = nearestTile(rint(10, C.MW - 10), rint(10, C.MH - 10), 10, (x, y) => W.t[y * C.MW + x] === T_FOREST || W.t[y * C.MW + x] === T_GRASS);
    if (p) { W.fires.push({ x: p[0], y: p[1], ttl: rint(2, 5), seen: [] }); }
  }
  for (let i = W.fires.length - 1; i >= 0; i--) if (--W.fires[i].ttl <= 0) W.fires.splice(i, 1);

  // Menschen: Alter, Geburt, Krankheit
  for (const n of [...W.npcs]) {
    const age = ageY(n);
    const T = tribeOf(n);
    if (n.sick > 0) n.sick--; if (n.injured > 0) n.injured--;
    if (n.tools.kleidung > 0) n.tools.kleidung--;
    if (n.sick <= 0 && rnd() < (season === 3 ? 0.0012 : 0.0004)) n.sick = rint(4, 12);
    let p = 0.000015 * Math.exp((age - 28) / 6.5) + (age < 3 ? 0.00012 * (TK(T, 'milch') ? 0.6 : 1) : 0);
    if (rnd() < p) { die(n, age < 3 ? 'als Kind gestorben' : 'an Altersschwäche gestorben'); continue; }
    if (n.sex === 'f' && n.partner && age >= 16 && age <= 42 && W.tick - n.lastBirth > C.TPY * 1.3) {
      const f = NPC.get(n.partner);
      if (f && f.tribe === n.tribe) {
        const perCap = T.store.food / Math.max(1, T.members.length);
        const pb = cultBirth(n) * 0.0052 * (perCap > 3 ? 1.1 : perCap > 1 ? 0.7 : 0.3) * (n.hunger < 70 ? 1 : 0.3) * (season === 3 ? 0.6 : 1);
        if (rnd() < pb) birth(n);
      }
    }
    // Kinder lernen von Eltern
    if (age < 15 && n.parents.length) for (const pid of n.parents) { const pp = NPC.get(pid); if (pp && pp.tribe === n.tribe && rnd() < 0.08) teach(pp, n, true); }
    if (age >= 12 && age < 12 + 1 / C.DPY) memo(n, 'gilt nun als erwachsen');
    n.prestige *= 0.999;
  }
  // Sippen-Politik
  if (day % 5 === 0) { for (const T of [...W.tribes]) tribeTick(T); if (day % 10 === 0) computeTerritory(); }
  for (const T of W.tribes) if ((day + T.id) % 6 === 0) cultureTick(T);
  for (const T of W.tribes) if (T.alive) { techDaily(T); for (const id of T.members) { const n = NPC.get(id); if (n && ageY(n) >= 10) techTick(n, T); } }
  if (day % C.DPY === 1) for (const T of [...W.tribes]) cultureYear(T);
  // Überfälle abschließen
  for (let i = W.raids.length - 1; i >= 0; i--) {
    const R = W.raids[i];
    if (R.conquest) {
      if (R.won || (R.retreat && !raidersOf(R).length) || (R.arrived && W.tick - R.arrived > C.TPD * 4) || W.tick - R.t > C.TPD * 16) { resolveConquest(R); W.raids.splice(i, 1); }
      continue;
    }
    if (W.tick - R.t > C.TPD * 12 || (W.tick - R.t > C.TPD && !raidersOf(R).length)) {
      const T = TRIBE.get(R.from), E = TRIBE.get(R.to);
      chron(3, `Der Überfall der ${T?.name} auf die ${E?.name} ist vorbei: ${R.kills} Verteidiger und ${R.deaths} Angreifer fielen, ${R.wounded ? R.wounded + ' Verwundete, ' : ''}${Math.round(R.loot)} Vorräte wurden geplündert${R.goats ? `, ${R.goats} Ziegen weggetrieben` : ''}${R.captives ? `, ${R.captives} Menschen verschleppt` : ''}.`, { tribe: R.from });
      W.raids.splice(i, 1);
    }
  }
  // Statistik
  if (dayOfYear === 0) {
    const s = { y: yearNow(), pop: W.npcs.length, deer: W.animals.filter(a => a.k === 'deer').length, tribes: {} };
    for (const T of W.tribes) if (T.alive) s.tribes[T.id] = T.members.length;
    s.know = TECH_IDS.filter(k => W.npcs.some(n => n.know[k])).length;
    W.stats.push(s); if (W.stats.length > 2000) W.stats.shift();
  }
}

function stepWorld() {
  for (const n of W.npcs) { n.px = n.x; n.py = n.y; }
  W.tick++;
  if (W.tick % C.TPD === 0) dailyTick();
  if (W.tick % 3 === 0) { for (const a of W.animals) { a.px = a.x; a.py = a.y; } stepAnimals(); }
  for (let i = W.npcs.length - 1; i >= 0; i--) { const n = W.npcs[i]; if (n) stepNpc(n); }
  corpseTick();
}

// ---------- Eingriffe des Beobachters ----------
function whisper(n, type) {
  const T = tribeOf(n);
  if (type === 'found') {
    const f = gatherFollowers(n, 0.3);
    const N = foundTribe(n, f, 'eigen');
    memo(n, 'hatte die Eingebung, eine eigene Sippe zu gründen');
    return !!N;
  }
  if (type === 'cult') { startCult(n, true); return true; }
  if (type === 'challenge') { n.whisper = { type, until: W.tick + C.TPD * 10 }; tribeTick(T); return true; }
  n.whisper = { type, until: W.tick + C.TPD * (type === 'explore' ? 3 : 15) };
  n.act = null;
  memo(n, { experiment: 'hat plötzlich Lust, herumzutüfteln', explore: 'will unbedingt sehen, was hinter dem Horizont liegt', teach: 'will sein Wissen weitergeben', hunt: 'hat das Jagdfieber gepackt', preach: 'will seinen Glauben verbreiten' }[type] || 'hat eine neue Idee');
  return true;
}

// ---------- Einflüsterungen an Oberhäupter ----------
// Der Anführer entscheidet nach seinem Charakter, ob er dem Gedanken folgt
function whisperLeader(L, kind, targetId) {
  const T = tribeOf(L), O = TRIBE.get(targetId);
  if (!T || T.leader !== L.id) return 'Nur ein Oberhaupt kann so etwas entscheiden.';
  if (!O || !O.alive || O === T) return 'Diese Sippe gibt es nicht (mehr).';
  if (!reachable(T, O.cx, O.cy)) return `Die ${O.name} sind für die ${T.name} nicht zu erreichen – Wasser liegt dazwischen.`;
  const rel = T.rel[O.id] ?? 0, tr = L.tr;
  if (kind === 'raid' || kind === 'conquer') {
    // Ein gütiges Oberhaupt greift keine Freunde an, ein vorsichtiges keine Übermacht
    const reluct = tr.mitgefuehl * 0.6 + (rel > 25 ? 0.5 : rel > 0 ? 0.2 : 0) + (O.members.length > T.members.length * 1.3 ? 0.4 * (1 - tr.mut) : 0) - tr.ehrgeiz * 0.3 - tr.gier * (kind === 'raid' ? 0.3 : 0) - (T.grudge[O.id] ? 0.3 : 0);
    if (reluct > 0.65) { memo(L, `weigerte sich, die ${O.name} anzugreifen`); return `${L.name} weist den Gedanken von sich: ${rel > 25 ? `Die ${O.name} sind Freunde.` : O.members.length > T.members.length * 1.3 ? `Die ${O.name} sind zu stark.` : 'Blutvergießen ist nicht ' + (L.sex === 'f' ? 'ihre' : 'seine') + ' Art.'}`; }
    const ok = launchRaid(T, O, { conquest: kind === 'conquer' });
    if (!ok) return `Es finden sich nicht genug Krieger bei den ${T.name}.`;
    memo(L, kind === 'conquer' ? `will die ${O.name} unterwerfen` : `hat beschlossen, die ${O.name} zu plündern`);
    return reluct > 0.35 ? `${L.name} zögert lange – und zieht dann doch los.` : `${L.name} ruft die Krieger zusammen.`;
  }
  const kmap = { ally: 'buendnis', peace: 'frieden', food: 'nahrung', access: 'zugang' };
  const k = kmap[kind]; if (!k) return '?';
  if (L.injured || L.sick) return `${L.name} ist zu schwach für eine Reise.`;
  if (k === 'buendnis' && rel < -15) { if (tr.stur > 0.6) return `${L.name} will sich nicht mit Feinden verbünden.`; }
  if (O.rel[T.id] === undefined) { O.rel[T.id] = 0; T.rel[O.id] = 0; }
  T.lastDiplo = W.tick; startAct(L, { type: 'diplo', target: O.id, kind: k });
  memo(L, `hat beschlossen, zu den ${O.name} zu reisen`);
  return `${L.name} macht sich auf den Weg zu den ${O.name}. Wie die Verhandlung ausgeht, hängt von beiden ab.`;
}

// ---------- Speichern ----------
function serialize() {
  return JSON.stringify(W, (k, v) => {
    if (k === 'b' && v && v.id && v.max) return { id: v.id };
    if ((k === 'wall' || k === 'reach') && v && typeof v === 'object' && !Array.isArray(v)) return undefined; // Büsche in Erinnerungen per ID
    if ((k === 't' || k === 'clay' || k === 'flint') && Array.isArray(v) && v.length === C.MW * C.MH) return v.join('');
    if ((k === 'pv' || k === 'cv' || k === 'core') && Array.isArray(v)) return v.map(x => Math.round(x * 1000) / 1000);
    if (k === 'foot' && v && typeof v === 'object') { const o = {}; for (const i in v) if (v[i] >= 3) o[i] = Math.round(v[i]); return o; }
    return v;
  });
}
function deserialize(str) {
  W = JSON.parse(str);
  for (const k of ['t', 'clay', 'flint']) if (typeof W[k] === 'string') W[k] = Array.from(W[k], Number);
  if (!W.ore) makeOres(C.MW, C.MH, C.MW * C.MH / 108000);
  for (const b of W.bushes) if (!b.k) b.k = W.t[(b.y | 0) * C.MW + (b.x | 0)] === T_FOREST ? plantKind(T_FOREST, hash3(b.id, 3, 7)) : plantKind(T_GRASS, hash3(b.id, 3, 7));
  if (!W.fauna2) { W.fauna2 = 1; const keep = { deer: 0.3, horse: 0.3, wolf: 0.5, goat: 0.3, sheep: 0.3, cattle: 0.3, pig: 0.3, donkey: 0.3 }; W.animals = W.animals.filter(a => a.tribe || a.owner || rnd() < (keep[a.k] ?? 1)); }
  W.corpses = W.corpses || []; W.ghosts = W.ghosts || []; W.road = W.road || {}; W.res = W.res || {}; W.cut = W.cut || {}; W.foot = W.foot || {}; W.path = W.path || {}; W.pathVer = W.pathVer || 0; W.fields = W.fields || {};
  for (const T of W.tribes) { T.traps = T.traps || []; T.access = T.access || {}; T.trespass = T.trespass || {}; T.debt = T.debt || {}; T.grudge = T.grudge || {}; T.treaties = T.treaties || []; T.R = T.R || 14; }
  if (W.MW) { C.MW = W.MW; C.MH = W.MH; } else { C.MW = 400; C.MH = 270; W.MW = 400; W.MH = 270; }
  if (W.t.length !== C.MW * C.MH) throw new Error('Spielstand passt nicht zur Kartengröße');
  buildIndex();
  for (const T of W.tribes) if (T.alive) { initCulture(T); ensureTown(T); }
  W.hutVer = (W.hutVer || 0) + 1;
  const byId = new Map(W.bushes.map(b => [b.id, b]));
  for (const n of W.npcs) n.spots = n.spots.map(s => ({ b: byId.get(s.b.id), f: s.f })).filter(s => s.b);
  computeTerritory();
}

if (typeof module !== 'undefined') module.exports = { whisperLeader, STAT, C, TECH, TRAITS, newWorld, stepWorld, get W() { return W; }, NPC, TRIBE, dateStr, ageY, serialize, deserialize, whisper, HOOKS, fullName, yearNow };
