// =====================================================================
//  ERZ
//  Kupfererz liegt sichtbar als grüne Adern im Fels. Wer Kupfer will, muss
//  hingehen und es herausschlagen. Erst geschmolzenes Kupfer macht Äxte,
//  Speere und Schmuck aus Metall möglich – ohne Erz kein Kupfer.
// =====================================================================
function makeOres(MW, MH, AREA) {
  W.ore = [];
  const n = Math.round(9 * AREA);
  for (let g = 0; g < n; g++) {
    for (let k = 0; k < 600; k++) {
      const x = rint(3, MW - 4), y = rint(3, MH - 4), t = W.t[y * MW + x];
      if (t !== T_HILLS && t !== T_MOUNT) continue;
      // an Felsrändern und in Hügeln, nicht zu dicht beieinander
      if (W.ore.some(o => Math.abs(o.x - x) < 12 && Math.abs(o.y - y) < 12)) continue;
      W.ore.push({ id: W.nextId++, x: x + 0.5, y: y + 0.5, k: 'copper', amt: rint(120, 320), max: 0 });
      W.ore[W.ore.length - 1].max = W.ore[W.ore.length - 1].amt;
      break;
    }
  }
}
// Kupfer im Lager (geschmolzen): wie viele haben Kupferwerkzeug?
const hasCopper = T => !!(T && TK(T, 'kupfer_guss') && (T.cu || 0) > 0);
const copperFor = n => { const T = tribeOf(n); if (!hasCopper(T)) return false; const share = Math.min(1, T.cu / Math.max(1, T.members.length * 0.35)); return hash3(n.id, 17, 3) < share; };
function oreNear(x, y, r) { let b = null, bd = r; for (const o of (W.ore || [])) { if (o.amt <= 0) continue; const d = dist(o.x, o.y, x, y); if (d < bd) { bd = d; b = o; } } return b; }
// Bergbau: zur Erzader gehen, schlagen, Erz heimtragen
function stepMine(n, T, a) {
  const o = (W.ore || []).find(o => o.id === a.ore);
  if (!o || o.amt <= 0) { n.act = null; return; }
  if (a.stage === 0) { a.tx = o.x - 0.35; a.ty = o.y + 0.45; if (moveVia(n, T, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.6) { a.stage = 1; a.t = 0; } else if (++a.t > 500) n.act = null; return; }
  if (!chopAt(n, a, o.x, o.y, Math.round(14 / jobSkill(n, 'bergmann')))) return;
  const got = Math.min(o.amt, 3 + (TK(T, 'kupfer_guss') ? 1 : 0)); o.amt -= got; n.inv.ore = (n.inv.ore || 0) + got;
  insightCtx(n, 'ore', 2);
  if (!T.mined) { T.mined = 1; chron(2, `${n.name} schlägt bei den ${T.name} zum ersten Mal grünes Erz aus dem Fels.`, { tribe: T.id, npc: n.id }); }
  if (o.amt <= 0) chron(1, `Die Erzader bei den ${T.name} ist erschöpft.`, { tribe: T.id });
  if (n.inv.ore >= 8 || rnd() < 0.4) startAct(n, { type: 'deliver' }); else { a.wkT = 0; }
}
// Schmelzen am Brennofen: aus Erz wird Kupfer
function stepSmelt(n, T, a) {
  const p = placeBuild(T, 'kiln'); if (!p) { n.act = null; return; }
  if (a.stage === 0) { a.tx = p[0]; a.ty = p[1] + 0.8; if (moveToward(n, a.tx, a.ty, 1) || dist(n.x, n.y, a.tx, a.ty) < 0.7) { a.stage = 1; a.t = 0; } else if (++a.t > 300) n.act = null; return; }
  a.wk = 1; if (++a.t < Math.round(22 / jobSkill(n, 'handwerker'))) return;
  if ((T.store.ore || 0) < 3 || T.store.wood < 2) { n.act = null; return; }
  T.store.ore -= 3; T.store.wood -= 2; T.cu = (T.cu || 0) + 1;
  if (T.cu === 1) chron(2, `Die ${T.name} gießen ihr erstes Kupfer.`, { tribe: T.id, npc: n.id });
  n.act = null;
}
// Kupfer nutzt sich ab
function oreDaily(T) { if ((T.cu || 0) > 0 && rnd() < 0.02) T.cu--; }
