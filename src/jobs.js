// =====================================================================
//  BERUFE
//  Alle paar Tage verteilt jede Sippe ihre Erwachsenen neu auf Berufe –
//  nach Dringlichkeit (Hunger, Gefahr, Kälte, Baubedarf) und nach Eignung
//  (Wesen, Erfahrung, Wissen, Werkzeug). Wer einen Beruf hat, bleibt dabei,
//  solange er gebraucht wird, und wird mit der Zeit besser darin.
// =====================================================================
const JOBS = {
  sammler:    { m: 'Sammler',     f: 'Sammlerin',     icon: '🧺', acts: { gather: 2.0, trap: 1.3 } },
  jaeger:     { m: 'Jäger',       f: 'Jägerin',       icon: '🏹', acts: { hunt: 2.3 } },
  fischer:    { m: 'Fischer',     f: 'Fischerin',     icon: '🐟', acts: { fish: 2.3, trap: 1.6 }, need: 'fischen' },
  bauer:      { m: 'Bauer',       f: 'Bäuerin',       icon: '🌾', acts: { farm: 2.4, gather: 1.1 }, need: 'ackerbau' },
  hirte:      { m: 'Hirte',       f: 'Hirtin',        icon: '🐐', acts: { herd: 2.4 }, need: 'viehzucht' },
  holz:       { m: 'Holzfäller',  f: 'Holzfällerin',  icon: '🪓', acts: { wood: 2.4 } },
  baumeister: { m: 'Baumeister',  f: 'Baumeisterin',  icon: '🔨', acts: { build: 2.2, construct: 2.2, road: 2.0 }, need: 'huette' },
  handwerker: { m: 'Handwerker',  f: 'Handwerkerin',  icon: '🛠', acts: { craft: 2.2, experiment: 1.4, smelt: 2.2 }, need: 'faustkeil' },
  heiler:     { m: 'Heiler',      f: 'Heilerin',      icon: '🌿', acts: { heal: 2.6, gather: 1.2 }, need: 'heilkraeuter' },
  krieger:    { m: 'Krieger',     f: 'Kriegerin',     icon: '⚔', acts: { train: 2.0, guard: 2.0, hunt: 1.4 } },
  priester:   { m: 'Schamane',    f: 'Schamanin',     icon: '✨', acts: { ritual: 2.6, preach: 2.0, paint: 1.6, bury: 1.6 } },
  bergmann:   { m: 'Bergmann',    f: 'Bergfrau',      icon: '⛏', acts: { mine: 2.6, smelt: 1.5 }, need: 'kupfer_haemmern' },
  kundschafter: { m: 'Kundschafter', f: 'Kundschafterin', icon: '🧭', acts: { explore: 2.4, hunt: 1.2 } },
};
// Tätigkeiten, die Arbeit sind (werden für Leute mit anderem Beruf etwas seltener)
const JOB_WORK = { mine: 1, smelt: 1, gather: 1, hunt: 1, fish: 1, farm: 1, herd: 1, trap: 1, wood: 1, build: 1, construct: 1, road: 1, craft: 1, heal: 1, explore: 1, paint: 1, ritual: 1, experiment: 1 };
const jobName = n => { const J = JOBS[n.job]; return J ? (n.sex === 'f' ? J.f : J.m) : ''; };
function jobTitle(n, T) {
  if (T && T.leader === n.id) return 'Oberhaupt';
  const a = ageY(n); if (a < 7) return 'Kleinkind'; if (a < 13) return 'Kind';
  if (!n.job) return a >= 62 ? (n.sex === 'f' ? 'Alte' : 'Alter') : '';
  return jobName(n) + (n.job === 'priester' && T && (T.bld?.temple || 0) >= BUILD_NEED.temple ? (n.sex === 'f' ? ' (Priesterin)' : ' (Priester)') : '');
}
// Bedrohung: Überfälle, Feinde in der Nähe, Groll, kriegerische Werte
function threatOf(T) {
  let t = 0;
  if (W.tick - (T.lastRaided || -1e9) < C.TPY * 2) t += 0.5;
  for (const O of W.tribes) if (O.alive && O !== T && Math.abs(O.cx - T.cx) < 70 && Math.abs(O.cy - T.cy) < 70) { const r = T.rel[O.id] ?? 0; if (r < -30) t += 0.25 + (O.members.length > T.members.length ? 0.15 : 0); if ((T.grudge[O.id] || 0) > 2) t += 0.15; }
  t += Math.max(0, cvOf(T, 'krieger')) * 0.5 + (TK(T, 'heer') ? 0.4 : 0);
  return Math.min(1.5, t);
}
// Wie viele werden in welchem Beruf gebraucht?
function jobDemand(T, adultsN) {
  const pop = T.members.length, season = seasonNow(), target = season >= 2 ? T.winterTarget : 8;
  const perCap = T.store.food / Math.max(1, pop), hunger = clamp(1.25 - perCap / target, 0.25, 1.4);
  const D = {}, K = k => TK(T, k);
  // Nahrung zuerst: ein großer Teil der Erwachsenen, mehr bei Not
  const foodN = Math.max(2, Math.round(adultsN * clamp(0.32 + hunger * 0.3, 0.35, 0.8)));
  let game = 0; for (const a of W.animals) if (!a.tribe && !a.owner && a.k !== 'wolf' && Math.abs(a.x - T.cx) < 40 && Math.abs(a.y - T.cy) < 40) game++;
  const w = { sammler: season === 3 ? 0.5 : 1.1, jaeger: Math.min(0.75, game / 14) + (season === 3 && game > 4 ? 0.2 : 0), fischer: K('fischen') && nearWater(T) && season !== 3 ? 0.8 : 0, bauer: K('ackerbau') ? (season === 3 ? 0.1 : 0.4 + Math.min(1.6, tribeFields(T).length / 10)) : 0, hirte: K('viehzucht') && herdSize(T) > 0 ? Math.min(0.8, 0.2 + herdSize(T) / 25) : 0 };
  const ws = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k in w) if (w[k] > 0) D[k] = Math.max(k === 'sammler' || k === 'jaeger' ? 1 : 0, Math.round(foodN * w[k] / ws));
  D.holz = Math.max(1, Math.round(adultsN / (season >= 2 ? 9 : 14)));
  if (K('huette')) { const lack = Math.max(0, Math.ceil(pop / 5) - T.huts.length), sites = T.town ? Object.values(T.town.lots).filter(L => L.kind === 'bau').length : 0; D.baumeister = Math.min(Math.ceil(adultsN / 6), (lack || sites || buildWants(T).length || (T.roadQ && T.roadQ.length) || T.huts.some(h => h.worn) ? 1 : 0) + Math.ceil(lack / 3) + (buildWants(T).length ? 1 : 0)); }
  if (K('faustkeil')) D.handwerker = Math.max(1, Math.round(adultsN / (K('handwerker') ? 7 : 12)));
  if (K('heilkraeuter') && pop >= 10) D.heiler = 1 + Math.floor(pop / 40);
  const th = threatOf(T); if (th > 0.15 && adultsN >= 6) D.krieger = Math.round(adultsN * Math.min(0.3, 0.05 + th * 0.15));
  const fromm = Object.keys(T.beliefs || {}).length || Object.values(W.cults || {}).some(c => c && c.tribe === T.id);
  if ((fromm || K('bestattung')) && pop >= 12) D.priester = 1 + ((T.bld?.temple || 0) >= BUILD_NEED.temple ? Math.floor(pop / 35) : 0);
  if (K('kupfer_haemmern') && oreNear(T.cx, T.cy, 60) && (T.store.ore || 0) < 30) D.bergmann = 1 + Math.floor(adultsN / 20);
  if (pop >= 15) D.kundschafter = 1;
  return D;
}
// Eignung: Wesen, Erfahrung im Beruf, Werkzeug, Alter – und was die Kultur den Geschlechtern zutraut
function jobApt(n, T, j) {
  const t = n.tr, a = ageY(n), x = (n.jx && n.jx[j]) || 0, babies = n.sex === 'f' && n.kids.some(id => { const c = NPC.get(id); return c && ageY(c) < 2; });
  const men = -(cvOf(T, 'geschlecht') || 0); // >0: Männer führen
  let s = Math.min(0.6, x / 400) + (n.job === j ? 0.35 : 0) + rnd() * 0.05;
  switch (j) {
    case 'sammler': s += t.geschick * 0.2 + (1 - t.mut) * 0.25 + (n.exp.gather || 0) / 30 + (babies ? 0.3 : 0); break;
    case 'jaeger': s += t.mut * 0.5 + t.geschick * 0.3 + (n.exp.hunt || 0) / 25 + (n.tools.bogen > 0 ? 0.2 : 0) + (n.tools.speer > 0 ? 0.15 : 0) - (babies ? 0.8 : 0) - (a > 50 ? 0.4 : 0) - (n.sex === 'f' ? Math.max(0, men) * 0.6 : 0); break;
    case 'fischer': s += t.geschick * 0.4 + (n.exp.fish || 0) / 25 + (1 - t.gesellig) * 0.15; break;
    case 'bauer': s += t.stur * 0.2 + t.mitgefuehl * 0.15 + t.geschick * 0.2 + (a > 30 ? 0.1 : 0); break;
    case 'hirte': s += t.mitgefuehl * 0.25 + (1 - t.gesellig) * 0.2 + (a < 20 ? 0.15 : 0); break;
    case 'holz': s += t.mut * 0.15 + (a < 45 ? 0.2 : -0.2) + t.mitgefuehl * 0.1; break;
    case 'baumeister': s += t.geschick * 0.45 + t.stur * 0.15 + (a > 25 ? 0.15 : 0); break;
    case 'handwerker': s += t.geschick * 0.55 + t.neugier * 0.25 - (a < 18 ? 0.2 : 0); break;
    case 'heiler': s += t.mitgefuehl * 0.6 + t.neugier * 0.2 + (a > 35 ? 0.2 : 0) + (n.know.heilkraeuter ? 0.3 : -1); break;
    case 'krieger': s += t.mut * 0.7 + (1 - t.mitgefuehl) * 0.15 + t.ehrgeiz * 0.15 + (n.kills ? 0.2 : 0) - (babies ? 1 : 0) - (a > 45 || a < 16 ? 0.6 : 0) - (n.sex === 'f' ? 0.15 + Math.max(0, men) * 0.8 : 0) + (n.unfrei ? -1 : 0); break;
    case 'priester': { let b = 0; for (const k in n.beliefs) b = Math.max(b, n.beliefs[k]); s += t.fromm * 0.7 + b * 0.4 + (a > 35 ? 0.2 : 0) + (n.prophet ? 0.5 : 0); break; }
    case 'bergmann': s += t.mut * 0.2 + t.stur * 0.2 + t.geschick * 0.2 + (a < 45 ? 0.15 : -0.3); break;
    case 'kundschafter': s += t.neugier * 0.5 + t.mut * 0.35 - (a > 45 ? 0.4 : 0) - (babies ? 0.8 : 0); break;
  }
  if (JOBS[j].need && !n.know[JOBS[j].need] && j !== 'sammler') s -= 0.4;
  return s;
}
function assignJobs(T) {
  const ad = T.members.map(id => NPC.get(id)).filter(m => m && ageY(m) >= 13 && ageY(m) < 62 && m.id !== T.leader);
  for (const id of T.members) { const m = NPC.get(id); if (m && (ageY(m) < 13 || ageY(m) >= 62 || m.id === T.leader)) m.job = null; }
  if (!ad.length) return;
  const D = jobDemand(T, ad.length), slots = Object.assign({}, D), pairs = [];
  for (const m of ad) for (const j in slots) if (slots[j] > 0) pairs.push([jobApt(m, T, j), m, j]);
  pairs.sort((a, b) => b[0] - a[0]);
  const done = new Set(), before = {};
  for (const m of ad) before[m.id] = m.job;
  for (const [s, m, j] of pairs) { if (done.has(m.id) || slots[j] <= 0) continue; m.job = j; slots[j]--; done.add(m.id); }
  for (const m of ad) if (!done.has(m.id)) m.job = 'sammler'; // wer übrig ist, sammelt
  T.jobs = {}; for (const m of ad) T.jobs[m.job] = (T.jobs[m.job] || 0) + 1;
  for (const m of ad) if (before[m.id] !== m.job && m.job && before[m.id]) memo(m, `ist jetzt ${jobName(m)}`);
  if (D.krieger && !T.hadWarriors) { T.hadWarriors = 1; chron(2, `Die ${T.name} stellen ${D.krieger} Krieger auf, die das Lager schützen sollen.`, { tribe: T.id }); }
}
// Erfahrung wächst mit jedem Tag im Beruf
function jobDaily(T) {
  if (!T.jobT || W.tick - T.jobT >= C.TPD * 3) { T.jobT = W.tick; assignJobs(T); }
  for (const id of T.members) { const m = NPC.get(id); if (m && m.job) { const J = m.jx || (m.jx = {}); J[m.job] = Math.min(600, (J[m.job] || 0) + 1); } }
}
// Geübte arbeiten schneller und besser: bis zu +35 %
const jobSkill = (n, j) => n.job === j ? 1 + Math.min(0.35, ((n.jx && n.jx[j]) || 0) / 600) : 1;
// Beruf wirkt auf die Wahl der Tätigkeit
function jobAdjust(n, T, opts) {
  const J = n.job && JOBS[n.job]; if (!J) return;
  // Gibt es gerade nichts in seinem Beruf zu tun (Winter, kein Feld) oder hungert die Sippe, packt jeder mit an
  const own = opts.some(o => J.acts[o.type]), need = T.store.food / Math.max(1, T.members.length) < (seasonNow() >= 2 ? 6 : 3);
  for (const o of opts) { const m = J.acts[o.type]; if (m) o.score *= m; else if (JOB_WORK[o.type] && own && !(need && (o.type === 'gather' || o.type === 'hunt' || o.type === 'fish'))) o.score *= 0.7; }
}
// Krieger üben und halten Wache
function warriorOpts(n, T, add, night) {
  if (n.job !== 'krieger') return;
  if (!night) add('train', 0.28 + n.tr.mut * 0.2);
  add('guard', (night ? 0.55 : 0.2) + n.tr.stur * 0.1 + (threatOf(T) > 0.6 ? 0.4 : 0));
}
function stepTrain(n, T, a) {
  if (a.stage === 0) { a.tx = T.cx + 3.5 + (n.id % 3) * 1.4; a.ty = T.cy + 3.2 + (n.id % 2) * 1.2; if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.6) { a.stage = 1; a.t = 0; } else if (++a.t > 200) n.act = null; return; }
  // Übungskampf mit einem anderen Krieger – oder Speerwürfe allein
  const p = T.members.map(id => NPC.get(id)).find(m => m && m !== n && m.act && m.act.type === 'train' && m.act.stage === 1 && dist(m.x, m.y, n.x, n.y) < 3);
  a.wk = 1; if (p) { a.foe = p.id; n.flip = p.x < n.x; } else a.foe = 0;
  if (++a.t > 30) { const J = n.jx || (n.jx = {}); J.krieger = Math.min(600, (J.krieger || 0) + 3); n.energy -= 3; n.act = null; }
}
function stepGuard(n, T, a) {
  if (a.stage === 0) {
    const g = T.town && ((T.pal || 0) > 0 || (T.bld?.wall || 0) > 0) ? townWall(T).gates : [];
    if (g.length) { const G = g[n.id % g.length], [nx, ny] = GATE_N[G[2]]; a.tx = G[0] - nx * 1.8 + (nx ? 0 : 1); a.ty = G[1] - ny * 1.8 + (ny ? 0 : 1); }
    else { const ang = (n.id % 8) / 8 * 6.283; a.tx = T.cx + Math.cos(ang) * 9; a.ty = T.cy + Math.sin(ang) * 9; if (!passable(a.tx, a.ty)) { a.tx = T.cx + 2; a.ty = T.cy + 2; } }
    a.stage = 1; a.t = 0; return;
  }
  if (a.stage === 1) { if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.6) { a.stage = 2; a.t = 0; } else if (++a.t > 250) n.act = null; return; }
  if (++a.t > (isNight() ? 80 : 40)) n.act = null;
}

// =====================================================================
//  GÖTTLICHE EINGEBUNG
//  Der Beobachter lenkt die Gedanken einer Sippe auf eine Entdeckung.
//  Die Klügsten und Neugierigsten grübeln nun gezielt darüber – es geht
//  deutlich schneller, aber nicht sofort, und nur, wenn das Vorwissen da ist.
// =====================================================================
function inspireTribe(T, k) {
  if (!TECH[k] || !T.alive) return;
  T.inspire = { k, t: W.tick, until: W.tick + C.TPY * 2 };
  const L = NPC.get(T.leader), seer = T.members.map(id => NPC.get(id)).filter(Boolean).sort((a, b) => (b.tr.neugier + b.tr.fromm) - (a.tr.neugier + a.tr.fromm))[0];
  chron(2, `${seer ? seer.name : 'Jemand'} von den ${T.name} hat einen seltsamen Traum – die Gedanken der Sippe kreisen nun um ${TECH[k].name}.`, { tribe: T.id, npc: seer?.id });
  if (seer) memo(seer, `träumte von ${TECH[k].name}`);
}
function inspireDaily(T) {
  const I = T.inspire; if (!I) return;
  const k = I.k, tc = TECH[k];
  if (!tc || W.tick > I.until || T.members.some(id => NPC.get(id)?.know[k])) { if (tc && T.members.some(id => NPC.get(id)?.know[k])) chron(2, `Die Eingebung der ${T.name} hat sich erfüllt: ${tc.name}.`, { tribe: T.id }); T.inspire = null; return; }
  if (!tc.req.every(r => tribeKnows(T, r)) || (tc.cond && !tc.cond(T))) return; // Vorwissen oder Lage fehlen noch
  // die Neugierigsten grübeln: etwa ein halbes bis ein Jahr bis zur Entdeckung
  const ms = T.members.map(id => NPC.get(id)).filter(m => m && ageY(m) >= 14 && tc.req.every(r => m.know[r] || tribeKnows(T, r))).sort((a, b) => b.tr.neugier - a.tr.neugier).slice(0, 4);
  for (const m of ms) { const thr = m.thr[k] || (m.thr[k] = tc.D * (0.7 + rnd() * 0.6)); m.insight[k] = (m.insight[k] || 0) + thr / (C.DPY * (0.6 + (1 - m.tr.neugier) * 0.6)); if (m.insight[k] >= thr) { discover(m, k); break; } }
}
