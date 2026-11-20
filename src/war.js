// =====================================================================
//  KAMPF, VERWUNDETE, TOTE UND FRIEDHÖFE
//  Bei Überfällen und Eroberungszügen kämpfen die Figuren Mann gegen Mann:
//  Waffen, Rüstung, Geschick und Mut entscheiden. Wer schwer getroffen ist,
//  geht zu Boden oder flieht. Tote bleiben liegen, bis jemand sie wegträgt –
//  auf den Friedhof der Sippe oder, ohne Bestattungsbrauch, vor das Lager.
// =====================================================================
const WEAPONS = {
  faust:     { name: 'bloßen Fäusten', dmg: [3, 7],   reach: 1.1, cd: 6 },
  keule:     { name: 'einer Keule',    dmg: [5, 10],  reach: 1.3, cd: 7 },
  faustkeil: { name: 'einem Faustkeil', dmg: [6, 11], reach: 1.1, cd: 6 },
  beil:      { name: 'einem Steinbeil', dmg: [8, 14], reach: 1.3, cd: 7 },
  kupferaxt: { name: 'einer Kupferaxt', dmg: [11, 18], reach: 1.3, cd: 7 },
  speer:     { name: 'einem Speer',     dmg: [8, 15], reach: 1.8, cd: 7 },
  kspeer:    { name: 'einem Kupferspeer', dmg: [12, 20], reach: 1.8, cd: 7 },
  bogen:     { name: 'Pfeil und Bogen', dmg: [8, 14], range: 6.5, cd: 11 },
};
function weaponOf(n) {
  const T = tribeOf(n), cu = copperFor(n);
  if (n.tools.speer > 0) return cu ? 'kspeer' : 'speer';
  if (cu) return 'kupferaxt';
  if (TK(T, 'steinbeil')) return 'beil';
  if (n.tools.faustkeil > 0) return 'faustkeil';
  return ageY(n) >= 13 ? 'keule' : 'faust';
}
// Schutz: Schild und Helm (stehendes Heer), Fellkleidung, Deckung hinter Palisade oder Mauer
function armorOf(n) { const T = tribeOf(n); return (TK(T, 'heer') ? 0.3 : 0) + (n.tools.kleidung > 0 ? 0.05 : 0); }
function blockOf(n) { const T = tribeOf(n); return (TK(T, 'heer') ? 0.15 : 0) + (palBonus(n) > 0 ? 0.12 : 0); }
// Wie weit reicht der Kampfplatz um ein Lager?
function warZone(E) { const R = E.town && townRect(E); return R ? Math.max(12, Math.max(R.x1 - R.x0, R.y1 - R.y0) / 2 + 6) : 12; }
const fitToFight = m => m && m.alive !== false && !(m.act && (m.act.type === 'down' || m.act.type === 'hide')) && m.health > 25;

// Ein Schlag oder Schuss
function strike(n, foe, R, wk) {
  const Wp = WEAPONS[wk];
  const hit = (jobSkill(n, 'krieger') - 1) * 0.5 + 0.5 + (n.tr.geschick - 0.5) * 0.4 + (n.tr.mut - 0.5) * 0.15 - (foe.tr.geschick - 0.5) * 0.25 - (n.injured > 0 ? 0.15 : 0) - (ageY(n) > 50 ? 0.12 : 0) - blockOf(foe) + (wk === 'bogen' ? -0.08 : 0);
  n.fx = { k: wk === 'bogen' ? 'shoot' : 'swing', t: W.tick, x: foe.x, y: foe.y, hit: 0 };
  if (rnd() > hit) return; // daneben oder abgewehrt
  const dmg = (Wp.dmg[0] + rnd() * (Wp.dmg[1] - Wp.dmg[0])) * (1 + (n.tr.mut - 0.5) * 0.2) * (1 - armorOf(foe));
  foe.health -= dmg; foe.hitT = W.tick; foe.hitDx = Math.sign(foe.x - n.x) || 1; n.fx.hit = 1;
  const E = tribeOf(foe), T = tribeOf(n);
  if (foe.health > 0 && foe.health < 25 && rnd() < 0.25 + dmg / 60) foe.health = 0; // tödlich getroffen
  if (foe.health <= 0) {
    n.prestige += 4; n.kills = (n.kills || 0) + 1;
    if (R) { if (foe.tribe === R.to) R.kills++; else R.deaths++; }
    memo(n, `hat ${foe.name} (${E ? E.name : '?'}) im Kampf mit ${Wp.name} getötet`);
    die(foe, R ? (R.conquest ? `im Krieg zwischen den ${TRIBE.get(R.from)?.name} und den ${TRIBE.get(R.to)?.name} gefallen` : `beim Überfall der ${TRIBE.get(R.from)?.name} auf die ${TRIBE.get(R.to)?.name} getötet`) : 'im Kampf getötet', n);
    return;
  }
  n.prestige += 1;
  if (foe.health < 25) { // zu Boden
    foe.injured = Math.max(foe.injured, rint(12, 24));
    if (R) { if (foe.tribe === R.to) R.wounded = (R.wounded || 0) + 1; else R.hurt = (R.hurt || 0) + 1; }
    memo(foe, `wurde von ${n.name} (${T ? T.name : '?'}) schwer verwundet`);
    startAct(foe, { type: 'down', raid: R ? R.id : 0 });
  } else if (foe.health < 45 && rnd() < 0.3 + (1 - foe.tr.mut) * 0.4) { // verwundet: Flucht
    foe.injured = Math.max(foe.injured, rint(5, 12));
    if (R) { if (foe.tribe === R.to) R.wounded = (R.wounded || 0) + 1; else R.hurt = (R.hurt || 0) + 1; }
    const H = tribeOf(foe);
    if (R && foe.tribe === R.from) startAct(foe, { type: 'return', tx: H.cx, ty: H.cy });
    else startAct(foe, { type: 'hide', raid: R ? R.id : 0 });
  }
}
// Zum Gegner laufen und kämpfen. Gibt true zurück, solange gekämpft wird.
function combat(n, foe, a, R) {
  const d = dist(n.x, n.y, foe.x, foe.y);
  const bow = n.tools.bogen > 0 && d > 2.2 && d <= WEAPONS.bogen.range;
  const wk = bow ? 'bogen' : weaponOf(n), Wp = WEAPONS[wk];
  n.flip = foe.x < n.x;
  if (!bow && d > Wp.reach) { moveToward(n, foe.x, foe.y, 1.05); a.cd = Math.max(a.cd || 0, 2); return; }
  if ((a.cd = (a.cd || 0) - 1) > 0) { // umkreisen, ausweichen
    if (!bow && d < Wp.reach * 0.6) moveToward(n, n.x + (n.x - foe.x), n.y + (n.y - foe.y), 0.3);
    return;
  }
  a.cd = Wp.cd + rint(0, 3);
  strike(n, foe, R, wk);
}
function nearestFoe(n, list, maxD) { let b = null, bd = maxD; for (const m of list) { if (!fitToFight(m)) continue; const d = dist(n.x, n.y, m.x, m.y); if (d < bd) { bd = d; b = m; } } return b; }
function raidersOf(R) { return W.npcs.filter(m => m.act && m.act.type === 'raid' && m.act.raid === R.id); }
function defendersOf(R) { return W.npcs.filter(m => m.tribe === R.to && m.act && m.act.type === 'defend' && m.act.raid === R.id); }

// Alarm im angegriffenen Lager: wer kämpfen kann, greift zu den Waffen, die anderen verstecken sich
function raiseAlarm(E, T, R) {
  const z = warZone(E);
  for (const id of E.members) {
    const m = NPC.get(id); if (!m) continue;
    if (m.act && (m.act.type === 'raid' || m.act.type === 'defend' || m.act.type === 'hide' || m.act.type === 'down' || m.act.type === 'diplo')) continue;
    if (dist(m.x, m.y, E.cx, E.cy) > z + 14) continue;
    const age = ageY(m), brave = m.tr.mut + (cvOf(E, 'krieger') || 0) * 0.3 + (id === E.leader ? 0.5 : 0) + (m.job === 'krieger' ? 1 : 0);
    if (age >= 15 && age < 62 && m.health > 40 && !m.injured && brave > (m.sex === 'm' ? 0.25 : 0.5)) startAct(m, { type: 'defend', raid: R.id });
    else startAct(m, { type: 'hide', raid: R.id });
  }
}
function stepDefend(n, T, a) {
  const R = W.raids.find(r => r.id === a.raid);
  if (!R) { n.act = null; return; }
  const z = warZone(T);
  let foe = a.foe ? NPC.get(a.foe) : null;
  if (!fitToFight(foe) || !foe.act || foe.act.type !== 'raid' || dist(foe.x, foe.y, T.cx, T.cy) > z + 4) foe = null;
  if (!foe && (W.tick + n.id) % 3 === 0) { const rs = raidersOf(R).filter(m => dist(m.x, m.y, T.cx, T.cy) < z + 2); foe = nearestFoe(n, rs, 14); }
  if (foe) { a.foe = foe.id; a.idle = 0; combat(n, foe, a, R); return; }
  a.foe = 0;
  // Wache halten zwischen Lager und Angreifern
  if (a.gx === undefined) { a.gx = T.cx + (rnd() - 0.5) * 6; a.gy = T.cy + (rnd() - 0.5) * 6; }
  moveToward(n, a.gx, a.gy, 0.8);
  if (++a.idle > 60 && !raidersOf(R).some(m => dist(m.x, m.y, T.cx, T.cy) < z + 6)) n.act = null;
}
function stepHide(n, T, a) {
  const R = W.raids.find(r => r.id === a.raid);
  if (!R || ++a.t > C.TPD * 3) { n.act = null; return; }
  if (a.tx === undefined || a.t === 1) {
    const h = T.huts.length ? T.huts[n.id % T.huts.length] : null;
    if (h && h.lx !== undefined) { const B = bedsOf(h); const b = B[n.id % B.length]; a.tx = b[0]; a.ty = b[1]; }
    else { const F = TRIBE.get(R.from), dx = T.cx - (F ? F.cx : T.cx + 1), dy = T.cy - (F ? F.cy : T.cy), l = Math.hypot(dx, dy) || 1; a.tx = T.cx + dx / l * (warZone(T) + 6); a.ty = T.cy + dy / l * (warZone(T) + 6); if (!passable(a.tx, a.ty)) { a.tx = T.cx; a.ty = T.cy; } }
  }
  moveHome(n, T, a.tx, a.ty, 1.1);
}
function stepDown(n, T, a) {
  a.dur = a.dur || rint(18, 40);
  if (++a.t > a.dur) { n.act = null; startAct(n, { type: 'rest' }); }
}
// Moral der Angreifer: zu viele Gefallene, Verwundete oder Geflohene – Rückzug
function raidMorale(R) {
  if (R.retreat) return true;
  const lost = R.deaths + (R.hurt || 0);
  if (lost >= Math.ceil(R.n * 0.45)) {
    R.retreat = true;
    const T = TRIBE.get(R.from), E = TRIBE.get(R.to);
    for (const m of raidersOf(R)) startAct(m, { type: 'return', tx: T ? T.cx : m.x, ty: T ? T.cy : m.y });
    if (T && E) chron(2, `Die Krieger der ${T.name} weichen zurück – die ${E.name} haben sie in die Flucht geschlagen.`, { tribe: E.id });
    return true;
  }
  return false;
}
// Ein Angreifer am Ziel: kämpfen, solange Verteidiger stehen – dann plündern oder (beim Eroberungszug) das Lager einnehmen
function raidAtTarget(n, T, E, R, a) {
  if (!R.arrived) { R.arrived = W.tick; raiseAlarm(E, T, R); chron(2, `Die Krieger der ${T.name} fallen über das Lager der ${E.name} her. Die ${E.name} greifen zu den Waffen.`, { tribe: E.id }); }
  else if ((W.tick - R.arrived) % 20 === 0) raiseAlarm(E, T, R);
  if (raidMorale(R)) return;
  const z = warZone(E);
  let foe = a.foe ? NPC.get(a.foe) : null;
  if (!fitToFight(foe) || foe.tribe !== E.id || dist(foe.x, foe.y, E.cx, E.cy) > z + 4) foe = null;
  if (!foe && (W.tick + n.id) % 3 === 0) foe = nearestFoe(n, defendersOf(R), 12);
  if (foe) { a.foe = foe.id; combat(n, foe, a, R); return; }
  a.foe = 0;
  if (R.conquest) {
    // keine Verteidiger mehr in Sicht: das Lager besetzen
    if (!defendersOf(R).some(fitToFight)) { R.clear = (R.clear || 0) + 1; if (R.clear > 30 * Math.max(1, raidersOf(R).length)) R.won = true; }
    if (a.ax === undefined || dist(n.x, n.y, a.ax, a.ay) < 1) { a.ax = E.cx + (rnd() - 0.5) * 8; a.ay = E.cy + (rnd() - 0.5) * 8; }
    moveToward(n, a.ax, a.ay, 0.7);
    return;
  }
  // Plündern: zum Vorrat, aufladen, zurück
  if (a.loot > 0) { startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); n.act.loot = a.loot; return; }
  const S = E.storehouse && E.storehouse.lx !== undefined ? doorOut(E.storehouse) : [E.cx + 1.5, E.cy - 1];
  if (dist(n.x, n.y, S[0], S[1]) > 1.2) { moveVia(n, E, S[0], S[1], 1); return; }
  a.wk = 1; if (++a.lt < 8) return; a.wk = 0;
  lootStore(n, T, E, R, a);
}
function lootStore(n, T, E, R, a) {
  const take = Math.min(E.store.food, (E.pal || 0) >= 12 ? 8 : 15); E.store.food -= take; R.loot += take; a.loot = take;
  if (!R.felt) { R.felt = 1; nudgeTribe(E, 'rache', 0.04, m => 1 - m.tr.mitgefuehl); nudgeTribe(E, 'krieger', 0.03, m => m.tr.mut); nudgeTribe(E, 'gast', -0.03); nudgeTribe(T, 'krieger', 0.015); nudgeTribe(T, 'ruhm', 0.01); }
  if (rnd() < 0.3) { const g = W.animals.find(x => HERD_K[x.k] && x.tribe === E.id); if (g) { g.tribe = T.id; R.goats = (R.goats || 0) + 1; } }
  for (const k of ['hide', 'stone', 'wood']) { const t2 = Math.min(E.store[k], 3); E.store[k] -= t2; T.store[k] += t2; }
  if (E.items) for (const k in E.items) if (E.items[k] > 0 && rnd() < 0.3) { E.items[k]--; const I = T.items || (T.items = {}); I[k] = (I[k] || 0) + 1; }
  // Menschen verschleppen – wer sich versteckt hat und gefunden wird
  if (R.kills + (R.wounded || 0) > R.deaths && rnd() < 0.25 * (1 + Math.max(0, cvOf(T, 'unfreiheit')) * 1.5)) {
    const cap = E.members.map(id => NPC.get(id)).find(m => m && ageY(m) >= 8 && ageY(m) < 22 && dist(m.x, m.y, n.x, n.y) < 9 && E.leader !== m.id);
    if (cap) {
      E.members.splice(E.members.indexOf(cap.id), 1); T.members.push(cap.id); cap.tribe = T.id; cap.act = null;
      if (cap.partner) { const p = NPC.get(cap.partner); if (p) p.partner = 0; cap.partner = 0; }
      addRel(cap, n, -60); for (const id of cap.parents) { const p = NPC.get(id); if (p) { addRel(p, n, -80); memo(p, `${cap.name} wurde von den ${T.name} verschleppt`); } }
      memo(cap, `wurde von ${n.name} zu den ${T.name} verschleppt`);
      if (cvOf(T, 'unfreiheit') > 0.25 && ageY(cap) >= 12) { cap.unfrei = { t: W.tick, from: E.id }; memo(cap, `muss den ${T.name} als Knecht dienen`); }
      else if (cvOf(T, 'blut') < -0.2) memo(cap, `wurde von den ${T.name} wie ein eigenes Kind aufgenommen`);
      R.captives = (R.captives || 0) + 1;
      startAct(cap, { type: 'return', tx: T.cx, ty: T.cy });
      if (!E.members.length && E.alive) { E.alive = false; chron(3, `Die ${E.name} sind ausgelöscht.`, { tribe: E.id }); }
    }
  }
  startAct(n, { type: 'return', tx: T.cx, ty: T.cy }); n.act.loot = a.loot;
}

// ---------------------------------------------------------------- Tote
function addCorpse(n, killer) {
  if (tileAt(n.x, n.y) <= T_SHALLOW) return; // im Wasser treibt der Leichnam fort
  const age = ageY(n);
  (W.corpses || (W.corpses = [])).push({ id: n.id, x: n.x, y: n.y, name: n.name, full: fullName(n), sex: n.sex, tribe: n.tribe, t: W.tick, child: age < 13, old: age > 55, look: n.sex === 'm' ? n.id % 2 : 2 + (n.id % 2), cloth: n.tools.kleidung > 0 ? (n.clothType === 'woven' || n.clothType === 'linen' || n.clothType === 'wool' ? n.clothType : 'fur') : 'loin', war: !!killer, notable: !!n.notable, carry: 0, by: 0 });
}
function corpseTick() {
  const C2 = W.corpses; if (!C2 || !C2.length) return;
  for (const c of C2) if (c.carry) { const m = NPC.get(c.carry); if (!m || !m.act || m.act.type !== 'bury' || m.act.corpse !== c.id) c.carry = 0; else { c.x = m.x; c.y = m.y; } }
}
function corpseDaily() {
  const C2 = W.corpses; if (!C2) return;
  for (let i = C2.length - 1; i >= 0; i--) {
    const c = C2[i], days = (W.tick - c.t) / C.TPD;
    if (days > 25 && !c.bones) c.bones = 1;
    if (days > 110 && !c.carry) { C2.splice(i, 1); continue; }
    // Verwesung im Lager macht krank
    if (!c.bones && days > 5 && !c.dumped) for (const T of W.tribes) if (T.alive && dist(c.x, c.y, T.cx, T.cy) < 9 && rnd() < 0.04) { const m = NPC.get(pick(T.members)); if (m && !m.sick) { m.sick = rint(4, 10); memo(m, 'ist krank geworden – vom Gestank der Toten'); } }
  }
}
function corpseFor(n, T) {
  const C2 = W.corpses; if (!C2 || !C2.length) return null;
  const z = warZone(T) + 15; let best = null, bs = 0;
  for (const c of C2) {
    if (c.dumped || c.carry || c.bones > 1) continue;
    if (c.by && c.by !== n.id) { const o = NPC.get(c.by); if (o && o.act && o.act.type === 'bury' && o.act.corpse === c.id) continue; }
    const d = dist(c.x, c.y, T.cx, T.cy); if (d > z) continue;
    const kin = n.kids.includes(c.id) || n.parents.includes(c.id) || n.partner === c.id;
    const s = 0.65 + n.tr.mitgefuehl * 0.4 + n.tr.fromm * 0.25 + (kin ? 1.2 : 0) + (c.tribe === T.id ? 0.35 : 0) + Math.min(1, (W.tick - c.t) / C.TPD / 5) * 0.5 - d / 80;
    if (s > bs) { bs = s; best = c; }
  }
  return best ? { c: best, score: bs } : null;
}
function stepBury(n, T, a) {
  const c = (W.corpses || []).find(x => x.id === a.corpse);
  if (!c) { n.act = null; return; }
  if (a.stage === 0) {
    if (c.carry && c.carry !== n.id) { n.act = null; return; }
    c.by = n.id;
    if (moveHome(n, T, c.x, c.y, 1) || dist(n.x, n.y, c.x, c.y) < 0.8) {
      c.carry = n.id; a.stage = 1;
      const ours = c.tribe === T.id, bury = T.members.some(id => NPC.get(id)?.know.bestattung) && (ours || n.tr.mitgefuehl > 0.7);
      const slot = bury ? graveSlot(T, n) : null;
      if (slot) { a.tx = slot.x; a.ty = slot.y + 0.6; a.slot = slot; }
      else { const z = warZone(T) + 5, dx = c.x - T.cx, dy = c.y - T.cy, l = Math.hypot(dx, dy) || 1; a.tx = T.cx + dx / l * z; a.ty = T.cy + dy / l * z; if (!passable(a.tx, a.ty) || l > z) { a.tx = c.x + dx / l * 3; a.ty = c.y + dy / l * 3; } }
      if (n.kids.includes(c.id) || n.parents.includes(c.id) || n.partner === c.id) memo(n, `trägt ${c.name} fort`);
    } else if (++a.t > 300) n.act = null;
    return;
  }
  if (a.stage === 1) {
    c.x = n.x; c.y = n.y;
    if (moveHome(n, T, a.tx, a.ty, 0.65) || dist(n.x, n.y, a.tx, a.ty) < 0.7) {
      if (!a.slot) { c.carry = 0; c.dumped = 1; c.x = n.x; c.y = n.y; n.act = null; return; }
      a.stage = 2; a.t = 0;
    } else if (++a.t > 600) { c.carry = 0; n.act = null; }
    return;
  }
  // Grube ausheben, Leichnam hineinlegen, zuschütten
  a.wk = 1;
  if (++a.t < 18) return;
  const i = W.corpses.indexOf(c); if (i >= 0) W.corpses.splice(i, 1);
  W.graves.push({ x: a.slot.x, y: a.slot.y, name: c.name, full: c.full, t: W.tick, tribe: T.id, war: c.war, child: c.child, notable: c.notable, lot: a.slot.lot, slot: a.slot.i });
  if (W.graves.length > 1500) W.graves.shift();
  n.prestige += 1; insightCtx(n, 'grief', 20);
  for (const id of T.members) { const m = NPC.get(id); if (m && (m.kids.includes(c.id) || m.parents.includes(c.id) || m.partner === c.id)) { addRel(m, n, 6); memo(m, `hat ${c.name} beerdigt gesehen`); } }
  if (c.notable) chron(2, `Die ${T.name} begraben ${c.full}${c.tribe === T.id ? ' mit Gaben' : ''} auf ihrem Totenacker.`, { tribe: T.id, npc: n.id });
  n.act = null;
}

// ---------------------------------------------------------------- Friedhof: Parzellen am Rand, die wachsen
const CEM_SLOTS = 8;
function graveSlot(T, self) {
  if (typeof townOrigin !== 'function') return null;
  const O = townOrigin(T);
  const cem = []; for (const k in O.lots) { const L = O.lots[k]; if (L.kind === 'cem' && k === L.i + ',' + L.j) cem.push(L); }
  // belegt ist, wo ein Grab liegt oder gerade jemand ein Grab aushebt
  const taken = new Set();
  for (const g of W.graves) if (g.tribe === T.id && g.lot) { let u = g.slot; if (u === undefined) { const L = O.lots[g.lot]; if (!L) continue; u = Math.round(g.x - L.x0 - 0.5) + 4 * Math.round((g.y - L.y0 - 0.8) / 2); } taken.add(g.lot + ':' + u); }
  for (const id of T.members) { const m = NPC.get(id); if (m && m !== self && m.act && m.act.type === 'bury' && m.act.slot) taken.add(m.act.slot.lot + ':' + m.act.slot.i); }
  const free = L => { for (let u = 0; u < CEM_SLOTS; u++) if (!taken.has(L.i + ',' + L.j + ':' + u)) return u; return -1; };
  let P = null, u = -1;
  for (const L of cem) { u = free(L); if (u >= 0) { P = L; break; } }
  if (!P) {
    for (const L of cem) { for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = L.i + di, j = L.j + dj; if (!O.lots[i + ',' + j] && lotOK(T, O, i, j)) { P = claimLot(T, O, 'cem', i, j, 1, 1); break; } } if (P) break; }
    if (!P) P = allocLot(T, 'cem', 1, 1, cem.length ? 1 : 2);
    if (P && !cem.length) chron(2, `Die ${T.name} legen einen Totenacker an.`, { tribe: T.id });
    u = 0;
  }
  if (!P) return null;
  P.used = Math.max(P.used || 0, u + 1);
  return { x: P.x0 + 0.5 + (u % 4), y: P.y0 + 0.8 + Math.floor(u / 4) * 2, lot: P.i + ',' + P.j, i: u };
}
// leere Friedhofsparzellen (aus der alten Zählung) wieder freigeben
function tidyCemeteries(T) {
  if (!T.town) return;
  const used = new Set(W.graves.filter(g => g.tribe === T.id && g.lot).map(g => g.lot));
  for (const id of T.members) { const m = NPC.get(id); if (m && m.act && m.act.type === 'bury' && m.act.slot) used.add(m.act.slot.lot); }
  for (const k in T.town.lots) { const L = T.town.lots[k]; if (L.kind === 'cem' && k === L.i + ',' + L.j && !used.has(k) && !W.graves.some(g => g.x >= L.x0 && g.x < L.x0 + L.w && g.y >= L.y0 && g.y < L.y0 + L.h)) { delete T.town.lots[k]; T.townVer = (T.townVer || 0) + 1; } }
}
// Kacheln mit Gräbern: dort wird nie gebaut
let GRV = null, GRVK = '';
function graveTiles() {
  const k = W.graves.length + ':' + (W.graves.length ? W.graves[W.graves.length - 1].t : 0);
  if (k !== GRVK || !GRV) { GRVK = k; GRV = new Set(); for (const g of W.graves) GRV.add((g.y | 0) * C.MW + (g.x | 0)); }
  return GRV;
}

// ---------------------------------------------------------------- Enge Nachbarn: Streit oder Zusammenwachsen
// Liegen zwei Siedlungen dicht beieinander, reiben sie sich an Land, Wasser und Wild.
// Verwandte, befreundete Sippen mit ähnlichen Werten wachsen zusammen, andere geraten in Streit.
function cultureGap(A, B) { if (!A.cv || !B.cv) return 0.5; let s = 0; for (let i = 0; i < A.cv.length; i++) s += Math.abs(A.cv[i] - B.cv[i]); return s / A.cv.length; }
function townGap(A, B) {
  const a = A.town && townRect(A), b = B.town && townRect(B);
  if (!a || !b) return dist(A.cx, A.cy, B.cx, B.cy) - 20;
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1), dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1); return Math.hypot(dx, dy);
}
function neighborPressure(T) {
  if (!T.alive || !T.town) return;
  const pop = T.members.length, L = NPC.get(T.leader);
  for (const O of W.tribes) {
    if (!O.alive || O === T || !O.town || Math.abs(O.cx - T.cx) > 70 || Math.abs(O.cy - T.cy) > 70) continue;
    const gap = townGap(T, O); if (gap > 12) continue;
    const allied = T.treaties.some(t => t.with === O.id && t.kind === 'buendnis'), rel = T.rel[O.id] ?? 0, cg = cultureGap(T, O);
    T.near = T.near || {}; T.near[O.id] = (T.near[O.id] || 0) + 1;
    // Zusammenwachsen: Freunde mit ähnlichen Sitten, die kleinere Sippe geht in der größeren auf
    if (pop <= O.members.length && (allied || rel > 30) && (O.rel[T.id] ?? 0) > 20 && cg < 0.32 && T.near[O.id] > 6 && rnd() < 0.06 * (1.3 - (L ? L.tr.stur : 0.5))) { mergeInto(T, O); return; }
    // Reibung: jeder Streit um Land und Wild verschlechtert das Verhältnis
    if (!allied) {
      const d = (0.8 + cg * 2) * (gap < 5 ? 1.6 : 1) * (1 - Math.max(0, cvOf(T, 'gast')) * 0.5);
      T.rel[O.id] = Math.max(-100, rel - d);
      if (rnd() < 0.05 && T.rel[O.id] < -10) T.grudge[O.id] = (T.grudge[O.id] || 0) + 1;
      // Der Stärkere greift zu: Überfall – oder Eroberung, wenn er weit überlegen ist
      const ad = adults(T);
      if (L && !W.raids.some(r => r.from === T.id) && T.rel[O.id] < -35 && ad.length >= 6 && L.tr.mut + L.tr.ehrgeiz + Math.max(0, cvOf(T, 'krieger')) > 1.1 && rnd() < 0.08) {
        const conquer = pop > O.members.length * 1.6 && L.tr.ehrgeiz > 0.5;
        if (launchRaid(T, O, { conquest: conquer })) { chron(2, `Die ${T.name} und die ${O.name} siedeln zu dicht – der Streit um Land und Wild bricht offen aus.`, { tribe: T.id }); return; }
      }
    }
  }
}
// Zwei Siedlungen werden eine: Menschen, Vorräte, Vieh und Häuser ziehen um
function mergeInto(T, O) {
  const LT = NPC.get(T.leader), LO = NPC.get(O.leader);
  for (const k of Object.keys(T.store)) O.store[k] = (O.store[k] || 0) + T.store[k];
  if (T.items) { const I = O.items || (O.items = {}); for (const k in T.items) I[k] = (I[k] || 0) + T.items[k]; }
  for (const g of W.animals) if (g.tribe === T.id) g.tribe = O.id;
  // Häuser werden im gemeinsamen Dorf neu errichtet, so weit Platz ist
  let moved = 0;
  for (const h of T.huts) { const P = allocLot(O, 'house'); if (!P) break; P.kind = 'house'; O.huts.push(houseFromLot(P, { by: h.by, t: W.tick, stone: h.stone, mud: h.mud, furn: h.furn })); moved++; }
  W.hutVer = (W.hutVer || 0) + 1;
  for (const id of T.members) { const m = NPC.get(id); if (m) { if (LO) addRel(m, LO, 10); nudge(m, 'gast', 0.03); } }
  moveMembers(T.members.map(id => NPC.get(id)).filter(Boolean), T, O, `ist mit den ${T.name} zu den ${O.name} gezogen`);
  T.alive = false; T.died = W.tick; T.huts = [];
  for (const X of W.tribes) if (X.rel && X.rel[T.id] !== undefined && X !== O) X.rel[O.id] = Math.max(X.rel[O.id] ?? -100, X.rel[T.id]);
  nudgeTribe(O, 'gast', 0.02);
  chron(3, `Die ${T.name} und die ${O.name} wachsen zusammen: Sie leben nun als eine Sippe${LO ? ` unter ${LO.name}` : ''}${moved ? `, ${moved} Häuser werden im gemeinsamen Dorf neu errichtet` : ''}.`, { tribe: O.id, npc: LT?.id });
}
