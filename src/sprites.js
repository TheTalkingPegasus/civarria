// =====================================================================
//  CIVARRIA · Pixel-Figuren (16×16), werden beim Start aus Vorlagen gemalt
// =====================================================================
// Zeichen: o Umriss · s Haut · S Hautschatten · e Auge · h Haar · H Haar dunkel · b Bart
//          c Kleidung · C Kleidung dunkel · f Füße · . leer
const SP = {};
SP.adult = {
  head: {
    down: ['.oooooo.', 'ohhhhhho', 'ohhhhhho', 'ohssssho', 'osesseso', 'osssssso', '.oSSSSo.'],
    up:   ['.oooooo.', 'ohhhhhho', 'ohhhhhho', 'ohhhhhho', 'ohhhhhho', 'oHhhhhHo', '.oSSSSo.'],
    side: ['.ooooo..', 'ohhhhho.', 'ohhhhsho', 'ohhsssso', 'ohhssseo', 'ohssssso', '.oSSSo..'],
  },
  beard: { down: [null, null, null, null, null, 'osbbbbso', '.obbbbo.'], side: [null, null, null, null, null, 'ohsssbbo', '.oSbbo..'] },
  longHair: { // Frauen: Haar fällt über die Schultern
    down: { x: 3, y: 4, g: ['h........h', 'h........h', 'h........h', 'H........H', '.H......H.'] },
    up:   { x: 3, y: 4, g: ['.hhhhhhhh.', 'hhhhhhhhhh', 'hhhhhhhhhh', 'HhhhhhhhhH', '.HHhhhhHH.'] },
    side: { x: 3, y: 3, g: ['h.......', 'hh......', 'hh......', 'hh......', 'Hh......', '.H......'] },
  },
  torso: { // 10 breit, ab y=7
    down: {
      idle:  ['.occcccco.', 'osccccccso', 'osccccccso', 'osCCCCCCso', '.oCCCCCCo.'],
      workA: ['so.cccc.os', '.occcccco.', '.occcccco.', '.oCCCCCCo.', '.oCCCCCCo.'],
      workB: ['.occcccco.', 'osccccccso', 'occsccscco', '.oCssssCo.', '.oCCCCCCo.'],
      talk:  ['.occccccos', 'osccccccso', 'osccccccso', 'osCCCCCCo.', '.oCCCCCCo.'],
    },
    up: {
      idle:  ['.occcccco.', 'osccccccso', 'osccccccso', 'osCCCCCCso', '.oCCCCCCo.'],
      workA: ['so.cccc.os', '.occcccco.', '.occcccco.', '.oCCCCCCo.', '.oCCCCCCo.'],
      workB: ['.occcccco.', 'osccccccso', 'osccccccso', 'oSCCCCCCSo', '.oCCCCCCo.'],
    },
    side: {
      idle:  ['...occco..', '...occcso.', '...occcso.', '...oCCCso.', '...oCCCCo.'],
      workA: ['...occcoss', '...occco..', '...occco..', '...oCCCo..', '...oCCCCo.'],
      workB: ['...occco..', '...occcsss', '...occco..', '...oCCCo..', '...oCCCCo.'],
    },
  },
  legs: { // ab y=12
    down: { idle: ['ossoosso', 'offooffo', '........'], w0: ['ossoosso', 'offoosso', '....offo'], w2: ['ossoosso', 'ossooffo', 'offo....'] },
    side: { idle: ['.osso.', '.offo.', '......'], w0: ['os.oso', 'of.off', '......'], w2: ['.osso.', '.osso.', '.offo.'] },
  },
};
SP.child = {
  head: {
    down: ['.oooo.', 'ohhhho', 'oesseo', 'osssso', '.oSSo.'],
    up:   ['.oooo.', 'ohhhho', 'ohhhho', 'oHhhHo', '.oSSo.'],
    side: ['.ooo..', 'ohhho.', 'ohssso', 'ohsseo', '.oSSo.'],
  },
  longHair: { down: { x: 4, y: 7, g: ['h......h', 'H......H'] }, up: { x: 4, y: 7, g: ['hhhhhhhh', 'HhhhhhhH'] }, side: { x: 4, y: 7, g: ['hh', 'H.'] } },
  torso: {
    down: { idle: ['.occcco.', 'osccccso', '.oCCCCo.'], workA: ['so.cc.os', '.occcco.', '.oCCCCo.'], workB: ['.occcco.', 'occsscco', '.oCCCCo.'], talk: ['.occccos', 'osccccoo', '.oCCCCo.'] },
    up: { idle: ['.occcco.', 'osccccso', '.oCCCCo.'], workA: ['so.cc.os', '.occcco.', '.oCCCCo.'], workB: ['.occcco.', 'osccccso', '.oCCCCo.'] },
    side: { idle: ['..occo..', '..occso.', '..oCCo..'], workA: ['..occoss', '..occo..', '..oCCo..'], workB: ['..occo..', '..occsss', '..oCCo..'] },
  },
  legs: {
    down: { idle: ['.oso.so'.slice(0, 6), '.f..f.'], w0: ['.os.so', '.f..s.', '....f.'], w2: ['.os.so', '.s..f.', '.f....'] },
    side: { idle: ['.oso.', '.ofo.'], w0: ['os.so', 'f..of'], w2: ['.oso.', '.ofo.'] },
  },
};
// Die vier Grundtypen
const LOOKS = [
  { sex: 'm', skin: ['#d9a07a', '#b57f5c'], hair: ['#4a2f1d', '#2e1c11'], beard: false },
  { sex: 'm', skin: ['#e8bc96', '#c99a74'], hair: ['#1f1b19', '#0e0c0b'], beard: true },
  { sex: 'f', skin: ['#c48a62', '#a06c48'], hair: ['#6b3b22', '#4a2715'] },
  { sex: 'f', skin: ['#f0c8a0', '#d4a880'], hair: ['#c9902f', '#9a6a1c'] },
];
// Kleidung je nach Entwicklung (spätere Epochen schon vorbereitet)
const CLOTHES = {
  loin:    { c: ['#8a5a34', '#6a4224'], bare: true },           // Lendenschurz (Frauen mit Brusttuch)
  fur:     { c: ['#b8956a', '#8a6a44'], spots: true },          // Fellkleidung
  woven:   { c: ['#d8cfb0', '#b5aa86'], trim: true },           // gewebte Tunika mit Zierstreifen
  // spätere Epochen:
  leather: { c: ['#7a4a2a', '#5a341c'] },
  linen:   { c: ['#e8e2d0', '#c8c0a8'], trim: true },
  wool:    { c: ['#a8865c', '#866844'], trim: true },
};

function spriteGrid(look, child, dir, pose, legF) {
  const P = child ? SP.child : SP.adult, g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const put = (rows, x0, y0, transparentDots = true) => rows.forEach((r, y) => { if (!r) return; for (let x = 0; x < r.length; x++) { const ch = r[x]; if (ch === '.' && transparentDots) continue; const X = x0 + x, Y = y0 + y; if (X >= 0 && X < 16 && Y >= 0 && Y < 16) g[Y][X] = ch; } });
  const hy = child ? 5 : 1, hx = child ? 5 : 4, ty = child ? 10 : 8, tx = child ? 4 : 3, ly = child ? 13 : 13;
  const d = dir === 'up' ? 'up' : dir;
  // Haar hinten (Frauen, Rückansicht zuerst)
  const female = look.sex === 'f';
  if (female && d === 'up') { const L = P.longHair.up; put(L.g, L.x, L.y); }
  const T = P.torso[d] || P.torso.down; put(T[pose] || T.idle, tx, ty);
  const LG = P.legs[d === 'side' ? 'side' : 'down']; put(LG[legF] || LG.idle, d === 'side' ? (child ? 6 : 5) : (child ? 5 : 4), ly);
  put(P.head[d], hx, hy);
  if (!child && look.beard && P === SP.adult && SP.adult.beard[d]) put(SP.adult.beard[d], hx, hy);
  if (female && d !== 'up') { const L = P.longHair[d]; put(L.g, L.x, L.y); }
  return g;
}
function dress(g, CL, look, hips, chest) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ch = g[y][x]; if (ch !== 'c' && ch !== 'C') continue;
    if (CL.bare && y < hips && !(look.sex === 'f' && y === chest)) g[y][x] = ch === 'c' ? 's' : 'S';
    else if (CL.spots && (x * 3 + y * 2) % 5 === 0) g[y][x] = 'C';
    else if (CL.trim && y === hips - 1) g[y][x] = 't';
  }
}
function paintGrid(c, ox, oy, g, pal) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const ch = g[y][x]; if (ch === '.' || !pal[ch]) continue; c.fillStyle = pal[ch]; c.fillRect(ox + x, oy + y, 1, 1); }
}
// Bildfolgen: Zeilen = Richtung (unten, oben, seitlich), Spalten = Animationsbilder
const FRAMES = [
  ['idle', 'idle'], ['idle', 'w0'], ['idle', 'idle'], ['idle', 'w2'], // 0 stehen, 1-3 gehen
  ['workA', 'idle'], ['workB', 'idle'], ['talk', 'idle'],              // 4-5 arbeiten, 6 reden
];
const SHEETS = new Map();
function spriteSheet(lookIdx, child, cloth, gray, trim) {
  const key = lookIdx + (child ? 'k' : 'a') + cloth + (gray ? 'g' : '') + (trim || '');
  let sh = SHEETS.get(key); if (sh) return sh;
  const look = LOOKS[lookIdx], CL = CLOTHES[cloth] || CLOTHES.loin, cl = CL.c;
  const hair = gray ? ['#bdb6aa', '#948d82'] : look.hair;
  const pal = { o: '#2a1e1a', s: look.skin[0], S: look.skin[1], e: '#1a1410', h: hair[0], H: hair[1], b: hair[1], c: cl[0], C: cl[1], f: '#3b2a1c', t: trim || '#8a3a2a' };
  const hips = child ? 12 : 11, chest = child ? -1 : 9;
  sh = document.createElement('canvas'); sh.width = 16 * FRAMES.length; sh.height = 16 * 4;
  const c = sh.getContext('2d');
  ['down', 'up', 'side'].forEach((dir, row) => FRAMES.forEach(([pose, leg], col) => {
    const g = spriteGrid(look, child, dir, pose, leg);
    dress(g, CL, look, hips, chest);
    paintGrid(c, col * 16, row * 16, g, pal);
  }));
  // Schlafen: liegende Figur (Vorderansicht um 90° gedreht, Augen zu)
  const g = spriteGrid(look, child, 'down', 'idle', 'idle'); dress(g, CL, look, hips, chest);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g[y][x] === 'e') g[y][x] = 'S';
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 16; paintGrid(tmp.getContext('2d'), 0, 0, g, pal);
  c.save(); c.translate(8, 48 + 8); c.rotate(-Math.PI / 2); c.drawImage(tmp, -8, -8); c.restore();
  SHEETS.set(key, sh); return sh;
}
// Welches Bild zeigt eine Figur gerade?
const WORK_ACTS = { gather: 1, wood: 1, craft: 1, build: 1, farm: 1, construct: 1, trap: 1, paint: 1, heal: 1, lightfire: 1, experiment: 1, fish: 1, theft: 1 };
const TALK_ACTS = { social: 1, ritual: 1, preach: 1, visit: 1, diplo: 1, play: 1 };
function spriteFrame(n, moving, t) {
  const a = n.act;
  if (a && a.type === 'sleep' && a.stage === 1) return { row: 3, col: 0, sleep: true };
  const row = n.face === 'up' ? 1 : n.face === 'side' ? 2 : 0;
  if (moving) return { row, col: [1, 0, 3, 2][Math.floor(t * 7 + n.id) % 4] };
  if (a && WORK_ACTS[a.type] && a.stage >= 1) return { row, col: 4 + (Math.floor(t * 3.5 + n.id) % 2) };
  if (a && (a.type === 'hunt' || a.type === 'raid') && a.tries) return { row, col: 4 + (Math.floor(t * 5) % 2) };
  if (a && TALK_ACTS[a.type] && a.stage >= 1 && row === 0) return { row, col: Math.floor(t * 2 + n.id) % 3 === 0 ? 6 : 0 };
  return { row, col: 0 };
}

// =====================================================================
//  Pixel-Werkzeuge (Griff = Punkt g, an dem die Hand hält)
// =====================================================================
// o Umriss · w Holz · W Holz dunkel · r Stein · R Stein dunkel · x Sehne/Schnur · g grün · G grün dunkel · p Farbe · l hell · b Bronze · i Eisen
const TOOL_PAL = { c: '#d0803e', C: '#9a5426', o: '#2a1e1a', w: '#9a6a3c', W: '#6a4424', r: '#a19d96', R: '#6e6a64', x: '#e8e0c8', g: '#5fae45', G: '#3d7a2c', p: '#c0392b', l: '#efe6cc', f: '#e0b03c', b: '#c8893a', i: '#c3c8d0' };
const TOOLS = {
  keule:     { g: [1, 7], px: ['.....oo.', '....oWWo', '...oWwWo', '...owWo.', '..owo...', '.owo....', 'owo.....', 'oo......'] },
  faustkeil: { g: [1, 5], px: ['...oo.', '..orro', '.orrRo', 'orrRo.', 'oRRo..', 'oo....'] },
  speer:     { g: [3, 9], px: ['.........oo', '........oro', '.......orRo', '......owRo.', '.....owo...', '....owo....', '...owo.....', '..owo......', '.owo.......', 'owo........', 'oo.........'] },
  bogen:     { g: [2, 5], px: ['..ooo...', '.oWo.x..', '.oWo..x.', 'oWo....x', 'oWo....x', 'oWo....x', '.oWo..x.', '.oWo.x..', '..ooo...'] },
  korb:      { g: [3, 0], px: ['..oo...', '.o..o..', 'owwwwwo', 'oWwWwWo', 'owWwWwo', '.oWWWo.'] },
  hacke:     { g: [1, 8], px: ['....ooo.', '...orrRo', '...owoo.', '..owo...', '..owo...', '.owo....', '.owo....', 'owo.....', 'oo......'] },
  pinsel:    { g: [1, 5], px: ['....op', '...owp', '..owo.', '.owo..', 'owo...', 'oo....'] },
  kraeuter:  { g: [2, 5], px: ['.g.G..', 'gGgGg.', '.gGgG.', '..ox..', '..ow..', '..oo..'] },
  stab:      { g: [1, 12], px: ['..ol.', '.oll.', '.ofo.', '.owo.', '.owo.', '.owo.', '.owo.', '.owo.', '.owo.', '.owo.', '.owo.', '.owo.', '.oo..'] },
  sichel:    { g: [1, 7], px: ['..ooo..', '.orrro.', 'or..oo.', 'o......', 'or.....', '.oo....', '..owo..', '..owo..', '..oo...'] },
  beil:      { g: [1, 7], px: ['....ooo', '...orRo', '...oRRo', '....ow.', '...owo.', '..owo..', '.owo...', 'oo.....'] },
  kupferaxt: { g: [1, 7], px: ['....ooo', '...occo', '..occCo', '....ow.', '...owo.', '..owo..', '.owo...', 'oo.....'] },
  kspeer:    { g: [3, 9], px: ['.........oo', '........oco', '.......occo', '......owCo.', '.....owo...', '....owo....', '...owo.....', '..owo......', '.owo.......', 'owo........', 'oo.........'] },
  pflug:     { g: [8, 2], px: ['oo..........', 'owo.........', '.owo........', '..owwo......', '...owwwo....', '....oWWwwo..', '.....oWWWwwo', '......ooooRo', '..........oo'] },
  spindel:   { g: [1, 4], px: ['..x..', '..x..', '.oxo.', 'owxwo', '.owo.', '..o..'] },
  // spätere Epochen (vorbereitet):
  bronzeaxt: { g: [1, 7], px: ['....obbo', '...obbbo', '....owo.', '...owo..', '..owo...', '.owo....', 'owo.....', 'oo......'] },
  schwert:   { g: [1, 8], px: ['.......oo', '......oio', '.....oio.', '....oio..', '...oio...', '.ooio....', '..ooo....', '.owo.....', 'oo.......'] },
};
const TOOL_CV = {};
function toolCanvas(name) {
  if (TOOL_CV[name]) return TOOL_CV[name];
  const T = TOOLS[name], h = T.px.length, w = Math.max(...T.px.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  T.px.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = TOOL_PAL[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
  return TOOL_CV[name] = c;
}
// Welches Werkzeug hält die Figur gerade?
function heldTool(n, a) {
  if (!a) return null;
  const t = a.type;
  if (t === 'hunt' || t === 'raid' || t === 'defend' || t === 'watch') return n.tools.bogen > 0 ? 'bogen' : n.tools.speer > 0 ? (TK(tribeOf(n), 'kupfer_guss') ? 'kspeer' : 'speer') : (ageY(n) >= 13 ? 'keule' : null);
  if (t === 'fish') return n.tools.speer > 0 ? 'speer' : null;
  const Tn = typeof tribeOf === 'function' ? tribeOf(n) : null;
  if (t === 'wood' || t === 'build' || t === 'construct') return TK(Tn, 'kupfer_guss') ? 'kupferaxt' : TK(Tn, 'steinbeil') ? 'beil' : n.tools.faustkeil > 0 ? 'faustkeil' : null;
  if (t === 'craft') return a.what === 'tuch' && TK(Tn, 'spindel') ? 'spindel' : n.tools.faustkeil > 0 ? 'faustkeil' : null;
  if (t === 'farm') return a.job === 'harvest' && TK(Tn, 'sichel') ? 'sichel' : a.job !== 'harvest' && TK(Tn, 'hakenpflug') ? 'pflug' : 'hacke';
  if (t === 'gather') return n.tools.korb > 0 ? 'korb' : null;
  if (t === 'paint') return 'pinsel';
  if (t === 'heal') return 'kraeuter';
  if (t === 'diplo') return 'stab';
  if (t === 'herd') return 'keule';
  return null;
}

// =====================================================================
//  Neue Pixelkunst: Haustiere, Öfen, Tempel, Boote, Wagen
// =====================================================================
const PXC = {};
function pxCanvas(key, rows, pal) {
  if (PXC[key]) return PXC[key];
  const w = Math.max(...rows.map(r => r.length)), h = rows.length, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = pal[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
  return PXC[key] = c;
}
// Seitenansicht, Blick nach rechts
const ANIM_PX = {
  sheep: ['....oooooo......', '..oowwwwwwoo....', '.owwwWwwwwwwokko.', 'owwwwwwwwWwwokeko', 'owwWwwwwwwwwokkko', '.owwwwwwwwwwoo...', '..owwooooowwo....', '..oko.....oko....', '..oko.....oko....'],
  cattle: ['...............h...h', '..ooooooooooo..ohooh', '.occcccccccccoocccco', 'occcCcccccccccccceco', 'occccccccCccccccccco', 'occcccccccccccoccnno', '.occcccccccccco.ooo.', '..oCCooooooCCo......', '..oCo......oCo......', '..oCo......oCo......', '..ofo......ofo......'],
  pig: ['..............o.', '..oooooooooo.opo', '.opppppppppppppo', 'oppPppppppppppeo', 'opppppppppppppsso', '.oppppppppppppso', '..oPPoooooPPoo..', '..opo.....opo...'],
  donkey: ['.............o.o..', '............ogogo.', '............oggo..', '..ooooooooooogggo.', '.ogggggggggkkggego', 'ogGggggggggggggggo', 'ogglllllllllgo.olo', '.oggggggggggo..oo.', '..oGo.....oGo.....', '..oGo.....oGo.....', '..oko.....oko.....'],
};
const ANIM_PAL = {
  sheep: [{ o: '#2a1e1a', w: '#eeeae0', W: '#d4cfc2', k: '#3a3330', e: '#000' }, { o: '#2a1e1a', w: '#8a5a34', W: '#6a4224', k: '#3a2a20', e: '#000' }],
  cattle: [{ o: '#2a1e1a', c: '#a0683c', C: '#7a4a28', h: '#e8dcc0', n: '#d99a8a', e: '#000', f: '#2a1e1a' }, { o: '#1a1410', c: '#3a2c24', C: '#2a201a', h: '#f0e6d0', n: '#4a3a30', e: '#000', f: '#1a1410' }],
  pig: [{ o: '#2a1e1a', p: '#e8a8a0', P: '#c88880', s: '#d07070', e: '#000' }, { o: '#1a1410', p: '#5a4636', P: '#3e3026', s: '#2a201a', e: '#000' }],
  donkey: [{ o: '#2a1e1a', g: '#9a948c', G: '#7a746c', l: '#d8d2c8', k: '#3a3634', e: '#000' }, { o: '#2a1e1a', g: '#b8a080', G: '#9a8466', l: '#e8dcc6', k: '#5a4a3a', e: '#000' }],
};
function animalCanvas(k, wild) { return pxCanvas('a' + k + (wild ? 'w' : ''), ANIM_PX[k], ANIM_PAL[k][wild ? 1 : 0]); }
const MUD = { b: '#c48a5a', B: '#a86e44', k: '#2a1810', o: '#4a2e1e' };
const OVEN_PX = ['....oooooo....', '..oobbbbbboo..', '.obbBbbbbbbbo.', 'obbbbbbbbbBbbo', 'obBbbbbbbbbbbo', 'obbbbokkkobbbo', 'obbbokkkkkobbo', 'obbbokkgkkobbo', 'oooooooooooooo'];
const KILN_PX = ['.....oooo.....', '.....obbo.....', '.....oBbo.....', '...oooBBooo...', '..obbbbbbbbo..', '.obbBbbbbbbbo.', 'obbbbbbbbbbbbo', 'obbbbbbbBbbbbo', 'obbbbokkkobbbo', 'obbbokgggkobbo', 'oooooooooooooo'];
const DUGOUT_PX = ['.oooooooooooooo.', 'owwkkkkkkkkkkwwo', '.oWWWWWWWWWWWWo.', '..oooooooooooo..'];
const REED_PX = ['o..............o', 'yo............oy', 'oyyoooooooooyyyo', '.oyyYyyYyyYyyyo.', '..oooooooooooo..'];
const RAFT_PX = ['oooooooooooooo', 'owWwWwWwWwWwWo', 'owWwWwWwWwWwWo', 'oooooooooooooo'];
const BOAT_PAL = { o: '#2a1e1a', w: '#8a5a34', W: '#6a4224', k: '#3a2418', y: '#d8b860', Y: '#b8963e' };
const CART_PX = ['..oooooooo..', '.owwwwwwwwo.', '.oWWWWWWWWoooo', '..oooooooo....', '.ooo....ooo..', 'orRro..orRro.', 'oRoRo..oRoRo.', 'orRro..orRro.', '.ooo....ooo..'];

// Einrichtung (JRPG-Draufsicht)
const BED_PX = ['.oooooooooo.', 'ohhhhhhhhhho', 'ohwwwwwwwwho', 'ohwWwwwwwWho', 'ohffffffffho', 'ohfFfffFffho', 'ohffffffffho', 'ohfffFffffho', 'ohffffffFfho', 'ohfFffffffho', 'ohffffffffho', 'ohfffffFffho', 'ohffffffffho', 'ohhhhhhhhhho', '.oooooooooo.'];
const BED_PAL = [{ o: '#4a3420', h: '#c8a860', w: '#e8dcc0', W: '#cfc2a2', f: '#9a6a44', F: '#7a5030' }, { o: '#4a3420', h: '#c8a860', w: '#e8dcc0', W: '#cfc2a2', f: '#b0603e', F: '#8a4628' }, { o: '#3a2a1c', h: '#a8865a', w: '#efe8d8', W: '#d6ccb4', f: '#7a6a9a', F: '#5a4c78' }];
const MAT_PX = ['oooooooooo', 'oyYyYyYyYo', 'oYyYyYyYyo', 'oyYyYyYyYo', 'oYyYyYyYyo', 'oooooooooo'];
const POTS_PX = ['..ooo....', '.obbbo.oo', 'obbBbboBo', 'obBbbbobo', 'obbbbbobo', '.obbbo.oo', '..ooo....'];
const LOOM_PX = ['oooooooooooo', 'owWWWWWWWWwo', 'ow.x.x.x.xwo', 'owx.x.x.x.wo', 'ow.x.x.x.xwo', 'owcccccccc wo', 'owcCcCcCccwo', 'owccccccccwo', 'oooooooooooo'];
const QUERN_PX = ['..oooooo..', '.orrrrrro.', 'orrRRRRrro', 'orRRggRRro', 'orrRRRRrro', '.orrrrrro.', '..oooooo..'];
const SHELF_PX = ['oooooooooooooo', 'owwwwwwwwwwwwo', 'oWbbWkkWyyWbbo', 'owwwwwwwwwwwwo', 'oooooooooooooo'];
const FURN_PAL = { o: '#2a1e1a', w: '#9a6a3c', W: '#6a4424', x: '#e8dcc0', c: '#b5482e', C: '#8a3020', b: '#a0583a', B: '#c47a50', r: '#a19d96', R: '#7e7a74', g: '#e8d8a0', y: '#c8a860', Y: '#a8884a', k: '#5a4a3a' };

const WHEEL_PX = ['..oooo..', '.owwwwo.', 'owwWWwwo', 'owWooWwo', 'owWooWwo', 'owwWWwwo', '.owwwwo.', '..oooo..'];
