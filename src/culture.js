// =====================================================================
//  KULTUR · Werte, Gebote, Gesellschafts- und Herrschaftsformen
//  Jeder Mensch trägt eigene Werte (aus Charakter, Erziehung, Erfahrung).
//  Die Sippe hat Normen = das, was sich unter ihren Menschen durchsetzt.
//  Starke Normen werden zu Geboten, Gebote halten die Normen fest.
//  Abweichler reformieren – oder ziehen fort und gründen eine eigene Kultur.
// =====================================================================
// [Schlüssel, negativer Pol, positiver Pol, Eigenschaftswort −, Eigenschaftswort +]
const VALUES = [
  ['gemeinsinn', 'Eigennutz', 'Gemeinsinn', 'eigennützig', 'gemeinschaftlich'],
  ['gleichheit', 'Rangordnung', 'Gleichheit', 'streng geordnet', 'gleichberechtigt'],
  ['tradition', 'Neuerung', 'Tradition', 'neuerungsfreudig', 'traditionsbewusst'],
  ['heilig', 'Weltlichkeit', 'Götterfurcht', 'weltlich', 'gottesfürchtig'],
  ['krieger', 'Friedfertigkeit', 'Kriegerehre', 'friedfertig', 'kriegerisch'],
  ['gast', 'Fremdenscheu', 'Gastfreundschaft', 'fremdenscheu', 'gastfreundlich'],
  ['eigentum', 'Gemeinbesitz', 'Eigentum', 'teilend', 'besitzstolz'],
  ['rache', 'Vergebung', 'Blutrache', 'versöhnlich', 'rachsüchtig'],
  ['alter', 'Jugend zählt', 'Ehrfurcht vor dem Alter', 'jugendlich', 'ältestentreu'],
  ['geschlecht', 'Frauen führen', 'Männer führen', 'mutterrechtlich', 'vaterrechtlich'],
  ['ehe', 'freie Liebe', 'strenge Ehe', 'freizügig', 'sittenstreng'],
  ['ehrlichkeit', 'List', 'Wahrhaftigkeit', 'listig', 'wahrhaftig'],
  ['fleiss', 'Muße', 'Fleiß', 'gemächlich', 'fleißig'],
  ['fuersorge', 'Härte', 'Fürsorge', 'hart', 'fürsorglich'],
  ['natur', 'Naturbeherrschung', 'Ehrfurcht vor der Natur', 'landnehmend', 'naturverbunden'],
  ['ahnen', 'Vergessen', 'Ahnenverehrung', 'gegenwartsnah', 'ahnenverehrend'],
  ['wissen', 'Misstrauen gegen Wissen', 'Wissensdurst', 'wissensscheu', 'wissbegierig'],
  ['freiheit', 'Gehorsam', 'Freiheit', 'gehorsam', 'freiheitsliebend'],
  ['ruhm', 'Bescheidenheit', 'Ruhm & Prunk', 'bescheiden', 'ruhmsüchtig'],
  ['strafe', 'Sühne & Ausgleich', 'harte Strafe', 'ausgleichend', 'strafend'],
  ['blut', 'Wahlverwandtschaft', 'Blutsbande', 'offen für Zugezogene', 'blutstreu'],
  ['kinder', 'wenige Kinder', 'Kinderreichtum', 'kinderarm', 'kinderreich'],
  ['tier', 'Jagdlust', 'Achtung der Tiere', 'jagdfreudig', 'tierachtend'],
  ['schoenheit', 'Schlichtheit', 'Schmuck & Kunst', 'schlicht', 'kunstsinnig'],
  ['mut', 'Vorsicht', 'Wagemut', 'vorsichtig', 'wagemutig'],
  ['reinheit', 'Unbekümmertheit', 'Reinheitsgebote', 'unbekümmert', 'reinheitsbedacht'],
  ['rat', 'Einer entscheidet', 'Alle beraten', 'befehlsgewohnt', 'beratend'],
  ['unfreiheit', 'Ächtung der Knechtschaft', 'Knechtschaft als Recht', 'knechtschaftsfeindlich', 'knechtehaltend'],
  ['handel', 'Selbstgenügsamkeit', 'Handelsgeist', 'selbstgenügsam', 'handelsfreudig'],
  ['schicksal', 'Eigene Hand', 'Schicksalsglaube', 'tatkräftig', 'schicksalsgläubig'],
  ['ehre', 'Nachsicht', 'Ehre & Gesicht', 'nachsichtig', 'ehrversessen'],
  ['heim', 'Wanderlust', 'Heimatverbundenheit', 'wanderlustig', 'heimatverbunden'],
];
const NV = VALUES.length, VI = {}; VALUES.forEach((v, i) => VI[v[0]] = i);
// Charakter → Neigung (Koeffizienten für (Eigenschaft − 0,5) × 2)
const DISPO = {
  gemeinsinn: { mitgefuehl: .5, gesellig: .3, gier: -.5 }, gleichheit: { mitgefuehl: .4, ehrgeiz: -.4, gier: -.3 },
  tradition: { stur: .5, neugier: -.5, fromm: .25 }, heilig: { fromm: .8, skepsis: -.5 }, krieger: { mut: .5, ehrgeiz: .35, mitgefuehl: -.4 },
  gast: { gesellig: .45, mitgefuehl: .35, skepsis: -.25 }, eigentum: { gier: .6, ehrgeiz: .25, mitgefuehl: -.25 }, rache: { stur: .45, mitgefuehl: -.45, mut: .2 },
  alter: { stur: .3, fromm: .3, ehrgeiz: -.3 }, geschlecht: {}, ehe: { fromm: .4, stur: .3, gesellig: -.25 }, ehrlichkeit: { mitgefuehl: .35, gier: -.45, fromm: .2 },
  fleiss: { ehrgeiz: .45, geschick: .35, gesellig: -.2 }, fuersorge: { mitgefuehl: .8 }, natur: { fromm: .45, gier: -.3, neugier: -.15 }, ahnen: { fromm: .55, stur: .3 },
  wissen: { neugier: .7, skepsis: .25, stur: -.3 }, freiheit: { stur: .3, mut: .3, skepsis: .25, fromm: -.25 }, ruhm: { ehrgeiz: .6, charisma: .35, mitgefuehl: -.25 },
  strafe: { mitgefuehl: -.55, stur: .35 }, blut: { stur: .3, gesellig: -.3, neugier: -.25 }, kinder: { gesellig: .3, mitgefuehl: .25 }, tier: { mitgefuehl: .4, fromm: .3, mut: -.3 },
  schoenheit: { geschick: .4, charisma: .3, neugier: .2 }, mut: { mut: .9 }, reinheit: { fromm: .45, skepsis: .2, stur: .2 }, rat: { gesellig: .4, mitgefuehl: .2, ehrgeiz: -.45 },
  unfreiheit: { gier: .4, ehrgeiz: .3, mitgefuehl: -.6 }, handel: { gesellig: .35, gier: .3, neugier: .3, skepsis: -.2 }, schicksal: { fromm: .5, skepsis: -.5 },
  ehre: { stur: .4, ehrgeiz: .35, mut: .25 }, heim: { stur: .4, neugier: -.45, mut: -.2 },
};
function dispo(n) {
  const out = new Array(NV).fill(0);
  VALUES.forEach(([k], i) => { let s = 0; const d = DISPO[k]; for (const t in d) s += d[t] * (n.tr[t] - 0.5) * 2; out[i] = s; });
  out[VI.geschlecht] += n.sex === 'm' ? 0.12 : -0.12;
  return out;
}
const cvOf = (T, k) => T && T.cv ? T.cv[VI[k]] : 0;
const pvOf = (n, k) => n && n.pv ? n.pv[VI[k]] : 0;
const hasRule = (T, k, pole) => !!(T && T.rules && T.rules.some(r => r.k === k && (pole === undefined || r.pole === pole)));
function nudge(n, k, d) { if (!n || !n.pv) return; const i = VI[k], s = d * (1.15 - n.tr.stur * 0.6); n.pv[i] = clamp(n.pv[i] + s, -1, 1); if (n.core) n.core[i] = clamp(n.core[i] + s * 0.7, -1, 1); }
// Ein Erlebnis prägt alle Erwachsenen einer Sippe – je nach Charakter unterschiedlich stark
function nudgeTribe(T, k, d, w) { if (!T) return; for (const id of T.members) { const m = NPC.get(id); if (m && m.pv && ageY(m) >= 12) nudge(m, k, d * (w ? w(m) : 1) * (0.6 + rnd() * 0.8)); } }

// Anfangskultur einer Urzeit-Sippe: zufällig + Landschaft
function initCulture(T) {
  const mem = T.members.map(id => NPC.get(id)).filter(Boolean);
  if (!T.cv) {
    if (mem.some(m => m.pv)) T.cv = memberMean(T);
    else {
      T.cv = VALUES.map(() => clamp((rnd() - 0.5) * 0.9 + (rnd() - 0.5) * 0.35, -0.7, 0.7));
      let water = 0, mount = 0, forest = 0;
      for (let dy = -12; dy <= 12; dy += 3) for (let dx = -12; dx <= 12; dx += 3) { const t = tileAt(T.cx + dx, T.cy + dy); if (t <= T_SHALLOW) water++; else if (t >= T_HILLS) mount++; else if (t === T_FOREST) forest++; }
      const add = (k, v) => T.cv[VI[k]] = clamp(T.cv[VI[k]] + v, -0.9, 0.9);
      if (water > 18) { add('handel', 0.2); add('gast', 0.15); }
      if (mount > 18) { add('heim', 0.25); add('blut', 0.2); add('ehre', 0.15); }
      if (forest > 25) { add('natur', 0.25); add('tier', 0.1); }
      add('unfreiheit', -0.35); add('eigentum', -0.25); add('gleichheit', 0.25); add('rat', 0.1); // Urzeit-Horden sind eher gleich
    }
  }
  for (const m of mem) if (!m.pv) { const d = dispo(m); m.pv = d.map((v, i) => clamp(v * 0.45 + T.cv[i] * 0.65 + (rnd() - 0.5) * 0.3, -1, 1)); if (ageY(m) >= 15) m.core = m.pv.slice(); }
  if (!T.rules) T.rules = [];
  if (!T.gov) { T.gov = bestGov(T).key; T.govSince = W.tick; }
}
function memberMean(T) {
  const s = new Array(NV).fill(0); let w = 0;
  for (const id of T.members) { const m = NPC.get(id); if (!m || !m.pv || ageY(m) < 14) continue; const ww = 1; for (let i = 0; i < NV; i++) s[i] += m.pv[i] * ww; w += ww; }
  return w ? s.map(v => v / w) : new Array(NV).fill(0);
}
// Kind: Charakter + Eltern + Sippe
function childValues(k, mother, father, T) {
  const d = dispo(k), cv = T.cv || new Array(NV).fill(0);
  k.pv = d.map((v, i) => { const par = mother && mother.pv ? (father && father.pv ? (mother.pv[i] + father.pv[i]) / 2 : mother.pv[i]) : cv[i]; return clamp(v * 0.25 + par * 0.4 + cv[i] * 0.35 + (rnd() - 0.5) * 0.2, -1, 1); });
}

// ---------------------------------------------------------------- Gebote
// pole +1 / −1 → Satz; manche Gebote bekommen ein konkretes Ziel (Tier, Speise, Tag …)
const TABOO_ANIMAL = { horse: 'Das Pferd', wolf: 'Der Wolf', goat: 'Die Ziege', deer: 'Der Hirsch' };
const RULES = {
  gemeinsinn: ['Wer sammelt, behält, was er findet.', 'Jede Beute gehört allen.'],
  gleichheit: ['Die Starken befehlen, die Schwachen gehorchen.', 'Niemand steht über dem anderen.'],
  tradition: ['Neues ist willkommen – das Alte muss sich bewähren.', 'Was die Ahnen taten, ist Gesetz.'],
  heilig: ['Die Geister mischen sich nicht ein – der Mensch entscheidet.', 'Vor jeder großen Tat wird {geist} ein Opfer gebracht.'],
  krieger: ['Wer Blut vergießt, ist unrein und muss sich reinigen.', 'Erst wer im Kampf bestand, zählt als Erwachsener.'],
  gast: ['Fremde werden aus dem Land gejagt.', 'Ein Gast ist heilig – Feuer und Essen stehen ihm zu.'],
  eigentum: ['Was einer hat, darf jeder nehmen, der es braucht.', 'Wer stiehlt, wird aus der Sippe gestoßen.'],
  rache: ['Ein Streit endet mit einem Geschenk, nicht mit Blut.', 'Blut verlangt Blut.'],
  alter: ['Die Jungen führen, die Alten ruhen.', 'Die Alten haben das letzte Wort.'],
  geschlecht: ['Die Mütter wählen das Oberhaupt, das Erbe folgt der Mutter.', 'Nur Männer sprechen im Rat.'],
  ehe: ['Liebe kennt keine Fesseln.', 'Wer die Treue bricht, wird verstoßen.'],
  ehrlichkeit: ['Wer sich täuschen lässt, ist selbst schuld.', 'Ein gegebenes Wort ist heilig.'],
  fleiss: ['Jeder {tag}. Tag gehört dem Ruhen und den Liedern.', 'Wer nicht arbeitet, soll nicht essen.'],
  fuersorge: ['Wer nicht mehr gehen kann, bleibt zurück.', 'Die Kranken und Alten werden zuerst versorgt.'],
  natur: ['Das Land ist uns untertan.', 'Kein Baum wird gefällt, ohne den Wald um Erlaubnis zu bitten.'],
  ahnen: ['Die Toten sind fort – man spricht nicht von ihnen.', 'Die Toten werden mit Gaben bestattet und jedes Jahr besucht.'],
  wissen: ['Wer zu viel fragt, fordert die Geister heraus.', 'Wer etwas weiß, muss es den Kindern lehren.'],
  freiheit: ['Das Wort des Oberhaupts ist Gesetz.', 'Niemand muss dem Oberhaupt folgen, wenn er nicht will.'],
  ruhm: ['Prahlen ist eine Schande.', 'Wer Großes vollbringt, trägt {schmuck}.'],
  strafe: ['Wer Unrecht tut, macht es mit Gaben wieder gut.', 'Wer Unrecht tut, wird hart bestraft.'],
  blut: ['Wer mit uns lebt, ist einer von uns.', 'Fremde werden nie Teil der Sippe.'],
  kinder: ['Mehr Münder als Hände bringen den Hunger.', 'Viele Kinder sind ein Segen der Geister.'],
  tier: ['Jedes Tier ist Beute.', '{tier} ist heilig und darf nicht getötet werden.'],
  schoenheit: ['Schmuck macht eitel und schwach.', 'Zu jeder Sonnenwende wird gemalt, getanzt und geschmückt.'],
  mut: ['Wer klug ist, meidet die Gefahr.', 'Wer Angst zeigt, verliert sein Ansehen.'],
  reinheit: ['Gegessen wird, was satt macht.', '{speise} ist unrein und wird nicht gegessen.'],
  rat: ['Einer entscheidet für alle.', 'Alle Erwachsenen beraten gemeinsam am Feuer.'],
  unfreiheit: ['Kein Mensch gehört einem anderen.', 'Gefangene werden Knechte.'],
  handel: ['Wir brauchen niemanden.', 'Mit Fremden wird getauscht und gefeilscht.'],
  schicksal: ['Jeder schmiedet sein eigenes Schicksal.', 'Die Geister bestimmen – jedes Zeichen wird gedeutet.'],
  ehre: ['Eine Beleidigung wird vergessen.', 'Eine Beleidigung muss gesühnt werden.'],
  heim: ['Wir ziehen, wohin das Wild zieht.', 'Wir verlassen das Land der Ahnen nie.'],
};
const SCHMUCK = ['eine Kette aus Wolfszähnen', 'Federn im Haar', 'rote Ockerstreifen', 'einen Knochenreif', 'eine Bärenkralle'];
function makeRule(T, k, pole) {
  let text = RULES[k][pole > 0 ? 1 : 0]; const r = { k, pole, t: W.tick };
  if (text.includes('{tier}')) { const kinds = ['horse', 'wolf', 'goat']; if (tribeKnows(T, 'fischen') || tribeKnows(T, 'viehzucht')) kinds.push('deer'); r.animal = pick(kinds); text = text.replace('{tier}', TABOO_ANIMAL[r.animal]); }
  if (text.includes('{speise}')) { const f = pick(tribeKnows(T, 'fischen') ? ['fisch', 'pferd', 'pilze'] : ['pferd', 'pilze']); r.food = f; text = text.replace('{speise}', { fisch: 'Fisch', pferd: 'Pferdefleisch', pilze: 'Was aus Pilzen wächst' }[f]); }
  if (text.includes('{geist}')) { const B = Object.values(W.beliefs).find(b => b.tribe === T.id && b.kind === 'geist'); text = text.replace('{geist}', B ? B.name : pick(SPIRITS)); }
  if (text.includes('{schmuck}')) text = text.replace('{schmuck}', pick(SCHMUCK));
  if (text.includes('{tag}')) { r.day = pick([5, 7, 9]); text = text.replace('{tag}', r.day); }
  r.text = text; return r;
}
const tabooAnimal = (T, kind) => !!(T && T.rules && T.rules.some(r => r.animal === kind));
const tabooFood = (T, f) => !!(T && T.rules && T.rules.some(r => r.food === f));

// ---------------------------------------------------------------- Herrschaftsformen
// req: ob die Form in der Epoche/Lage der Sippe überhaupt denkbar ist · fit: wie gut sie zu den Werten passt
const settledT = T => tribeFields(T).length >= 3 || !!T.storehouse || T.huts.length >= 4;
const GOV = {
  horde: { name: 'Gleichen-Horde', title: ['Sprecherin', 'Sprecher'], auth: 0.25, desc: 'Niemand herrscht. Entscheidungen fallen im Gespräch, das Oberhaupt ist nur eine Stimme unter vielen.',
    req: T => T.members.length < 70, fit: (c, T) => c.gleichheit * 0.7 + c.freiheit * 0.4 + c.rat * 0.3 - T.members.length / 90 },
  aelteste: { name: 'Ältestenrat', title: ['Älteste', 'Ältester'], auth: 0.45, desc: 'Die Alten beraten und entscheiden. Ihr Wissen gilt mehr als Stärke.',
    req: () => true, fit: c => c.alter * 0.85 + c.tradition * 0.3 + c.rat * 0.2 },
  muetter: { name: 'Mütterrat', title: ['Clanmutter', 'Clanmutter'], auth: 0.5, desc: 'Die Mütter der großen Familien wählen das Oberhaupt – immer eine Frau. Abstammung folgt der Mutter.',
    req: () => true, fit: c => -c.geschlecht * 1.0 + c.blut * 0.25 + c.fuersorge * 0.2 - 0.15 },
  haeuptling: { name: 'Häuptlingstum', title: ['Häuptlingin', 'Häuptling'], auth: 0.6, desc: 'Die angesehenste Person führt, solange sie Erfolg hat. Wer mehr Ansehen gewinnt, kann sie herausfordern.',
    req: () => true, fit: c => 0.18 + c.ruhm * 0.3 - c.gleichheit * 0.3 },
  krieger: { name: 'Kriegerherrschaft', title: ['Kriegsherrin', 'Kriegsherr'], auth: 0.8, desc: 'Die stärkste Kämpferin oder der stärkste Kämpfer herrscht. Macht wird im Kampf gewonnen und verloren.',
    req: () => true, fit: c => c.krieger * 0.9 + c.mut * 0.3 - c.gleichheit * 0.35 - c.rat * 0.2 - 0.1 },
  geister: { name: 'Geisterweisung', title: ['Schamanin', 'Schamane'], auth: 0.65, desc: 'Wer mit den Geistern spricht, führt. Jede Entscheidung wird aus Zeichen gedeutet.',
    req: () => true, fit: c => c.heilig * 0.8 + c.schicksal * 0.4 + c.tradition * 0.15 - 0.15 },
  thing: { name: 'Versammlung', title: ['Thingsprecherin', 'Thingsprecher'], auth: 0.3, desc: 'Alle Erwachsenen versammeln sich am Feuer und stimmen ab. Das Oberhaupt wird gewählt.',
    req: T => T.members.length >= 18, fit: c => c.rat * 0.85 + c.freiheit * 0.4 + c.gleichheit * 0.2 - 0.05 },
  erbhaeupt: { name: 'Erbhäuptlingtum', title: ['Erbhäuptlingin', 'Erbhäuptling'], auth: 0.75, desc: 'Die Führung bleibt in einer Familie und geht auf das älteste Kind über. Die Familie des Oberhaupts steht über den anderen.',
    req: T => settledT(T) && T.members.length >= 28, fit: c => c.blut * 0.5 - c.gleichheit * 0.45 + c.tradition * 0.3 + c.eigentum * 0.2 },
  tempel: { name: 'Priesterherrschaft', title: ['Hohepriesterin', 'Hohepriester'], auth: 0.8, desc: 'Die Priesterschaft hütet die heiligen Orte und spricht im Namen der Götter. Ihr Wort ist Gesetz.',
    req: T => TK(T, 'tempelwirtschaft') || (settledT(T) && T.members.length >= 35 && TK(T, 'bestattung') && TK(T, 'tempelbau')), fit: c => c.heilig * 1.0 - c.freiheit * 0.3 + c.reinheit * 0.2 + c.tradition * 0.2 },
  koenig: { name: 'Königtum', title: ['Königin', 'König'], auth: 0.9, desc: 'Ein Herrscherhaus regiert über Freie und Unfreie. Der Thron wird vererbt, Prunk zeigt die Macht.',
    req: T => TK(T, 'koenigtum') && T.members.length >= 60, fit: c => -c.gleichheit * 0.6 + c.ruhm * 0.5 + c.blut * 0.3 - c.freiheit * 0.3 },
  // spätere Epochen – vorbereitet, werden mit Schrift, Metall, Städten möglich
  stadtrepublik: { name: 'Stadtrepublik', title: ['Konsulin', 'Konsul'], auth: 0.45, later: 'Schrift & Städte', req: T => tribeKnows(T, 'schrift'), fit: c => c.rat * 0.6 + c.handel * 0.5 + c.freiheit * 0.3 },
  feudal: { name: 'Lehnswesen', title: ['Fürstin', 'Fürst'], auth: 0.75, later: 'Eisen & Burgen', req: T => tribeKnows(T, 'eisen'), fit: c => -c.gleichheit * 0.6 + c.ehre * 0.4 + c.heilig * 0.3 },
  imperium: { name: 'Kaiserreich', title: ['Kaiserin', 'Kaiser'], auth: 0.95, later: 'Schrift & Heere', req: T => tribeKnows(T, 'schrift'), fit: c => c.ruhm * 0.6 + c.krieger * 0.4 - c.freiheit * 0.4 },
  demokratie: { name: 'Demokratie', title: ['Präsidentin', 'Präsident'], auth: 0.35, later: 'Buchdruck', req: T => tribeKnows(T, 'buchdruck'), fit: c => c.freiheit * 0.6 + c.gleichheit * 0.5 + c.rat * 0.5 },
  diktatur: { name: 'Diktatur', title: ['Diktatorin', 'Diktator'], auth: 1, later: 'Moderne', req: T => tribeKnows(T, 'buchdruck'), fit: c => -c.freiheit * 0.7 + c.krieger * 0.3 + c.ruhm * 0.3 },
  raete: { name: 'Rätesystem', title: ['Ratsvorsitzende', 'Ratsvorsitzender'], auth: 0.4, later: 'Industrie', req: T => tribeKnows(T, 'dampf'), fit: c => c.gemeinsinn * 0.6 - c.eigentum * 0.6 + c.rat * 0.3 },
};
function cvObj(T) { const o = {}; VALUES.forEach(([k], i) => o[k] = T.cv ? T.cv[i] : 0); return o; }
function pvObj(n) { const o = {}; VALUES.forEach(([k], i) => o[k] = n.pv ? n.pv[i] : 0); return o; }
function bestGov(T, c = cvObj(T)) {
  let best = null;
  for (const key in GOV) { const G = GOV[key]; if (!G.req(T)) continue; const f = G.fit(c, T) + (key === T.gov ? 0.12 : 0); if (!best || f > best.f) best = { key, f }; }
  return best || { key: 'haeuptling', f: 0 };
}
const govOf = T => GOV[T.gov] || GOV.haeuptling;
const leaderTitle = (T, L) => govOf(T).title[L && L.sex === 'f' ? 0 : 1];
// Wie stark das Oberhaupt allein entscheidet (der Rest kommt aus der Haltung aller)
const authority = T => govOf(T).auth * (1 - Math.max(0, cvOf(T, 'freiheit')) * 0.35);

// Oberhaupt nach der Herrschaftsform bestimmen
function pickLeader(T, ad) {
  const g = cvOf(T, 'geschlecht');
  let pool = ad.filter(n => !n.unfrei);
  if (T.gov === 'muetter' || g < -0.5) { const w = pool.filter(n => n.sex === 'f'); if (w.length) pool = w; }
  else if (g > 0.5) { const m = pool.filter(n => n.sex === 'm'); if (m.length) pool = m; }
  if (!pool.length) pool = ad; if (!pool.length) return null;
  const pop = n => T.members.reduce((a, id) => { const m = NPC.get(id); return a + (m && m !== n ? clamp(m.rel[n.id] || 0, -40, 60) : 0); }, 0);
  const know = n => Object.keys(n.know).length;
  const base = n => n.prestige + n.tr.charisma * 25 + know(n) * 1.5;
  const old = NPC.get(T.prevLeader);
  let sc;
  switch (T.gov) {
    case 'horde': sc = n => pop(n) * 0.6 + n.tr.charisma * 30 + n.tr.mitgefuehl * 15; break;
    case 'thing': sc = n => pop(n) + n.tr.charisma * 35 + n.prestige * 0.5 + rnd() * 15; break;
    case 'aelteste': sc = n => Math.min(ageY(n), 70) * 2.2 + know(n) * 3 + n.prestige * 0.4; break;
    case 'muetter': sc = n => n.kids.length * 8 + Math.min(ageY(n), 60) * 1.2 + n.prestige * 0.4 + n.tr.mitgefuehl * 15; break;
    case 'krieger': sc = n => warPower(n) * 40 + n.prestige * 0.6 + n.tr.mut * 20; break;
    case 'geister': case 'tempel': sc = n => n.tr.fromm * 50 + Object.values(n.beliefs).reduce((a, v) => a + v, 0) * 15 + n.prestige * 0.4; break;
    case 'erbhaeupt': case 'koenig': {
      const heirs = old ? old.kids.map(id => NPC.get(id)).filter(k => k && k.tribe === T.id && ageY(k) >= 14 && pool.includes(k)) : [];
      if (heirs.length) return heirs.sort((a, b) => a.born - b.born)[0];
      sc = base; break;
    }
    default: sc = n => base(n) + n.tr.ehrgeiz * 15 + Math.min(ageY(n), 45) * 0.6;
  }
  return pool.reduce((b, c) => sc(c) > sc(b) ? c : b);
}

// ---------------------------------------------------------------- Werte wirken aufs Handeln
const WORK_T = { gather: 1, hunt: 1, fish: 1, wood: 1, farm: 1, herd: 1, trap: 1, construct: 1, build: 1, craft: 1 };
function cultureAdjust(n, opts) {
  if (!n.pv) return; const T = tribeOf(n); const v = k => n.pv[VI[k]];
  for (const o of opts) {
    let m = 1;
    if (WORK_T[o.type]) m *= 1 + v('fleiss') * 0.25 + (n.unfrei ? 0.35 : 0);
    switch (o.type) {
      case 'social': m *= 1 - v('fleiss') * 0.2 + v('gemeinsinn') * 0.12 - (n.unfrei ? 0.35 : 0); if (T && T.rules.some(r => r.day) && dayNum() % T.rules.find(r => r.day).day === 0) m *= 2.2; break;
      case 'explore': m *= 1 + v('wissen') * 0.3 - v('heim') * 0.3 + v('mut') * 0.2; break;
      case 'experiment': m *= 1 + v('wissen') * 0.45 - v('tradition') * 0.4; break;
      case 'ritual': m *= 1 + v('heilig') * 0.7 + v('ahnen') * 0.2; break;
      case 'paint': m *= 1 + v('schoenheit') * 0.6; break;
      case 'heal': m *= 1 + v('fuersorge') * 0.6; break;
      case 'theft': m *= clamp(1 - v('ehrlichkeit') * 0.5 - v('gemeinsinn') * 0.3 - (hasRule(T, 'eigentum', 1) ? 0.4 : 0), 0.05, 2) * (TK(T, 'siegel') ? 0.7 : 1); break;
      case 'steal': m *= clamp(1 + v('krieger') * 0.3 - v('ehrlichkeit') * 0.35, 0.05, 2); break;
      case 'hunt': m *= clamp(1 - v('tier') * 0.35 + v('mut') * 0.15, 0.2, 2) * (tabooAnimal(T, 'deer') ? 0.05 : 1); break;
      case 'fish': if (tabooFood(T, 'fisch')) m = 0; break;
      case 'visit': m *= 1 + v('gast') * 0.3 + v('handel') * 0.4 - v('heim') * 0.15; break;
      case 'eat': if (n.unfrei && T && T.store.food < T.members.length * 2) m *= 0.7; break;
    }
    o.score *= Math.max(0, m);
  }
}
// Ideen: Wissensdurst beflügelt, Traditionstreue bremst
const cultInsight = n => n.pv ? clamp(1 + n.pv[VI.wissen] * 0.3 - n.pv[VI.tradition] * 0.25, 0.5, 1.5) : 1;
const cultBirth = n => n.pv ? clamp(1 + n.pv[VI.kinder] * 0.22, 0.7, 1.25) : 1;

// ---------------------------------------------------------------- Kulturentwicklung (alle paar Tage)
function cultureTick(T) {
  if (!T.alive || !T.members.length) return;
  if (!T.cv) initCulture(T);
  const L = NPC.get(T.leader), A = authority(T), equal = Math.max(0, T.cv[VI.gleichheit]);
  // 1) Normen = gewichtetes Mittel – wer Ansehen hat, prägt mehr; in Gleichheit zählt jede Stimme gleich
  const s = new Array(NV).fill(0); let ws = 0;
  const mem = T.members.map(id => NPC.get(id)).filter(Boolean);
  for (const m of mem) {
    if (!m.pv || ageY(m) < 14) continue;
    let w = 1 + (m.prestige / 40) * (1 - equal) + (m.unfrei ? -0.7 : 0);
    if (m === L) w += A * Math.max(4, mem.length * 0.15);
    w = Math.max(0.15, w);
    for (let i = 0; i < NV; i++) s[i] += m.pv[i] * w; ws += w;
  }
  if (ws > 0) for (let i = 0; i < NV; i++) T.cv[i] += (s[i] / ws - T.cv[i]) * 0.12;
  // Sitten verfestigen sich: was eine Sippe ausmacht, wird Teil ihres Selbstbilds – und manches verschiebt sich unmerklich
  { const ord = T.cv.map((c, i) => [i, Math.abs(c)]).sort((a, b) => b[1] - a[1]);
    for (let r = 0; r < ord.length; r++) { const i = ord[r][0], c = T.cv[i]; if (r < 6) { if (Math.abs(c) > 0.15 && Math.abs(c) < 0.8) T.cv[i] += Math.sign(c) * 0.003; } else T.cv[i] *= 0.996; } }
  { const i = rint(0, NV - 1); T.cv[i] = clamp(T.cv[i] + (rnd() - 0.5) * 0.03, -1, 1); }
  // 2) Anpassungsdruck, Gebote halten fest, Kinder wachsen hinein
  const conf = 0.022 * (1 - Math.max(0, T.cv[VI.freiheit]) * 0.45) * (1 + Math.max(0, T.cv[VI.tradition]) * 0.4);
  for (const m of mem) {
    if (!m.pv) { childValues(m, NPC.get(m.parents[0]), NPC.get(m.parents[1]), T); continue; }
    const age = ageY(m), c = age < 15 ? 0.05 : conf * (1.2 - m.tr.stur * 0.8);
    // Mit dem Erwachsenwerden bildet sich ein eigener Kern: Erziehung + Charakter. Er bleibt, auch wenn man sich anpasst.
    if (age >= 15 && !m.core) { const d = dispo(m); m.core = m.pv.map((v, i) => clamp(v + d[i] * 0.35 + (rnd() - 0.5) * 0.25, -1, 1)); m.pv = m.core.slice(); }
    for (let i = 0; i < NV; i++) m.pv[i] += (T.cv[i] - m.pv[i]) * c + (m.core ? (m.core[i] - m.pv[i]) * 0.014 : 0);
    for (const r of T.rules) { const i = VI[r.k]; m.pv[i] = clamp(m.pv[i] + r.pole * 0.006, -1, 1); }
    if (rnd() < 0.15 * m.tr.neugier) { const i = rint(0, NV - 1); m.pv[i] = clamp(m.pv[i] + (rnd() - 0.5) * 0.15, -1, 1); } // eigene Gedanken
  }
}
// ---------------------------------------------------------------- Jahresrückblick: Erfahrungen, Gebote, Ordnung, Abspaltung
function cultureYear(T) {
  if (!T.alive || !T.cv || T.members.length < 3 || W.tick < C.TPY) return;
  const pop = T.members.length, perCap = T.store.food / pop, ad = adults(T);
  // Erfahrungen des Jahres prägen alle
  if (perCap > T.winterTarget * 0.9) { nudgeTribe(T, 'schoenheit', 0.012); nudgeTribe(T, 'kinder', 0.01); nudgeTribe(T, 'ruhm', 0.008); }
  else if (perCap < T.winterTarget * 0.3) { nudgeTribe(T, 'kinder', -0.02); nudgeTribe(T, 'schoenheit', -0.01); nudgeTribe(T, 'fleiss', 0.015); }
  if ((T.winterDeathsY || 0) > pop * 0.08) { nudgeTribe(T, 'heilig', 0.05); nudgeTribe(T, 'gemeinsinn', 0.04, m => m.tr.mitgefuehl - 0.2); nudgeTribe(T, 'eigentum', 0.04, m => m.tr.gier - 0.3); nudgeTribe(T, 'fleiss', 0.03); }
  T.winterDeathsY = 0;
  if (settledT(T)) { nudgeTribe(T, 'heim', 0.02); nudgeTribe(T, 'eigentum', 0.015); nudgeTribe(T, 'fleiss', 0.01); }
  if (W.tick - (T.lastRaided || -1e9) > C.TPY * 6 && W.tick - (T.lastRaid || -1e9) > C.TPY * 6) nudgeTribe(T, 'krieger', -0.006);
  if (W.tick - (T.lastRaided || -1e9) < C.TPY) { nudgeTribe(T, 'krieger', 0.03, m => m.tr.mut); nudgeTribe(T, 'gast', -0.03); nudgeTribe(T, 'mut', 0.02); }
  // Gebote entstehen und vergehen
  for (let i = 0; i < NV; i++) {
    const k = VALUES[i][0], c = T.cv[i], r = T.rules.find(x => x.k === k);
    if (r && c * r.pole < 0.22) { T.rules.splice(T.rules.indexOf(r), 1); chron(2, `Bei den ${T.name} gilt nicht mehr: „${r.text}“`, { tribe: T.id }); continue; }
    T.rc = T.rc || {}; T.rc[k] = !r && Math.abs(c) > 0.5 ? (T.rc[k] || 0) + 1 : 0;
    if (!r && T.rc[k] >= 3 && ad.length >= 5 && T.rules.length < 10 && rnd() < 0.4) {
      const nr = makeRule(T, k, Math.sign(c)); T.rules.push(nr);
      chron(Math.abs(c) > 0.7 ? 3 : 2, `Neues Gebot bei den ${T.name}: „${nr.text}“`, { tribe: T.id });
    }
  }
  // Gesellschaftsordnung: passt die Herrschaftsform noch zu dem, was die Menschen wollen?
  const b = bestGov(T);
  if (b.key !== T.gov) {
    T.govP = (T.govP || 0) + 1;
    if (T.govP >= 2) govChange(T, b.key);
  } else T.govP = 0;
  // Unfreie: Flucht oder Freilassung
  for (const m of T.members.map(id => NPC.get(id)).filter(x => x && x.unfrei)) {
    const H = TRIBE.get(m.unfrei.from);
    if (cvOf(T, 'unfreiheit') < 0 || (cvOf(T, 'fuersorge') > 0.4 && rnd() < 0.2) || W.tick - m.unfrei.t > C.TPY * 12) { delete m.unfrei; memo(m, `wurde von den ${T.name} freigelassen`); chron(1, `${m.name} ist bei den ${T.name} kein Knecht mehr.`, { npc: m.id, tribe: T.id }); continue; }
    if (H && H.alive && m.tr.mut > 0.5 && rnd() < 0.18) { moveMembers([m], T, H, `ist den ${T.name} entflohen und zu den ${H.name} heimgekehrt`); delete m.unfrei; chron(1, `${m.name} entflieht der Knechtschaft bei den ${T.name}.`, { npc: m.id, tribe: H.id }); }
  }
  if ((T.gov === 'thing' && yearNow() % 4 === 0) || (T.gov === 'horde' && yearNow() % 3 === 0)) { const old = T.leader; chooseLeader(T, true); if (T.leader !== old) chron(2, `${T.gov === 'thing' ? 'Wahl bei den ' + T.name + ': Die Versammlung' : 'Bei den ' + T.name + ' hört man nun auf'} ${T.gov === 'thing' ? 'bestimmt ' : ''}${fullName(NPC.get(T.leader))}${T.gov === 'thing' ? ' zum neuen Oberhaupt' : ''}.`, { tribe: T.id, npc: T.leader }); }
  schism(T);
}
function govChange(T, key) {
  const old = govOf(T), G = GOV[key], L = NPC.get(T.leader);
  const ad = adults(T).filter(n => n.pv);
  const support = ad.filter(n => { const c = pvObj(n); return G.fit(c, T) > old.fit(c, T); }).length / Math.max(1, ad.length);
  T.govP = 0;
  if (support < 0.45) return;
  // Wer Macht verliert, wehrt sich womöglich
  if (L && G.auth < old.auth - 0.15 && L.tr.ehrgeiz > 0.7 && support < 0.7 && rnd() < 0.5) {
    chron(3, `Aufruhr bei den ${T.name}: Die Menschen wollen ${G.name === 'Versammlung' ? 'eine Versammlung' : 'eine neue Ordnung (' + G.name + ')'}, doch ${fullName(L)} klammert sich an die Macht.`, { tribe: T.id, npc: L.id });
    if (rnd() < support) { L.prestige *= 0.4; memo(L, `wurde von den eigenen Leuten entmachtet`); chron(3, `${L.name} wird gestürzt.`, { tribe: T.id, npc: L.id }); }
    else { for (const n of ad) if (GOV[key].fit(pvObj(n), T) > old.fit(pvObj(n), T)) nudge(n, 'freiheit', 0.08); return; }
  }
  T.gov = key; T.govSince = W.tick; T.prevLeader = T.leader;
  chron(3, `Die ${T.name} geben sich eine neue Ordnung: ${G.name}. ${G.desc}`, { tribe: T.id });
  T.leader = 0; chooseLeader(T);
}
// Wer sich nicht mehr zugehörig fühlt, zieht mit Gleichgesinnten fort – oder verändert die Sippe von innen
function schism(T) {
  const ad = adults(T).filter(n => n.pv && !n.unfrei); if (ad.length < 16) return;
  let best = null;
  for (const n of ad) {
    if (n.id === T.leader || n.tr.charisma < 0.45 || n.tr.ehrgeiz + n.tr.stur < 0.85) continue;
    let bi = -1, bd = 0.25; for (let i = 0; i < NV; i++) { const d = Math.abs(n.pv[i] - T.cv[i]); if (d > bd) { bd = d; bi = i; } }
    if (bi >= 0 && (!best || bd * n.tr.charisma > best.d * best.n.tr.charisma)) best = { n, i: bi, d: bd };
  }
  if (!best) return;
  const { n, i } = best, side = Math.sign(n.pv[i] - T.cv[i]), K = VALUES[i];
  const like = ad.filter(m => m !== n && m.id !== T.leader && (m.pv[i] - T.cv[i]) * side > 0.15);
  const share = like.length / ad.length, pole = side > 0 ? K[2] : K[1];
  if (share > 0.33 && rnd() < 0.5) { // Wandel von innen
    T.cv[i] += (n.pv[i] - T.cv[i]) * 0.35; n.prestige += 10;
    chron(2, `Wandel bei den ${T.name}: Angeführt von ${fullName(n)} rücken viele hin zu „${pole}“.`, { tribe: T.id, npc: n.id });
    return;
  }
  if (like.length >= 6 && rnd() < 0.4 && freeLandNear(T)) {
    const f = gatherFollowers(n, 1, m => like.includes(m)); if (f.length < 7) return;
    const N = foundTribe(n, f, 'werte'); if (!N) return;
    N.cv = memberMean(N); N.rules = []; N.gov = bestGov(N).key; N.govSince = W.tick;
    chron(3, `${fullName(n)} und ${f.length} Gleichgesinnte ertragen das Leben bei den ${T.name} nicht mehr – für sie zählt „${pole}“ mehr als alles andere, und sie ziehen fort. Sie nennen sich ${N.name}.`, { tribe: N.id, npc: n.id });
  } else if (rnd() < 0.3) memo(n, `hadert mit den ${T.name}: „${pole}“ gilt dort zu wenig`);
}
// Begegnung über Sippengrenzen: Ideen wandern
function valueContact(a, b) {
  if (!a.pv || !b.pv) return;
  for (let k = 0; k < 2; k++) { const i = rint(0, NV - 1), w = 0.03 * b.tr.charisma * (1.2 - a.tr.stur); a.pv[i] += (b.pv[i] - a.pv[i]) * w; }
}

// ---------------------------------------------------------------- Beschreibung für die Anzeige
function cultureTraits(T, n = 5) {
  if (!T.cv) return [];
  return T.cv.map((v, i) => [i, v]).filter(x => Math.abs(x[1]) > 0.25).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n).map(([i, v]) => VALUES[i][v > 0 ? 4 : 3]);
}
function socialOrder(T) {
  const c = cvOf.bind(null, T), out = [];
  const g = c('geschlecht');
  out.push(['Geschlechter', g < -0.35 ? 'Frauen führen, Erbe in der Mutterlinie' : g > 0.35 ? 'Männer führen, Erbe in der Vaterlinie' : 'Frauen und Männer stehen etwa gleich']);
  const unf = T.members.filter(id => NPC.get(id)?.unfrei).length;
  out.push(['Stände', c('gleichheit') > 0.3 ? 'keine – alle gelten gleich' : (GOV[T.gov]?.auth >= 0.75 && c('gleichheit') < 0 ? 'Herrscherfamilie über den Freien' : 'Ansehen bestimmt den Rang') + (unf ? ` · ${unf} Unfreie` : '')]);
  out.push(['Besitz', c('eigentum') > 0.3 ? 'jede Familie hat ihr Eigentum' : c('eigentum') < -0.3 ? 'alles gehört allen' : 'Werkzeug ist eigen, Nahrung wird geteilt']);
  out.push(['Recht', c('rache') > 0.35 ? 'Blutrache' : c('strafe') > 0.3 ? 'harte Strafen, Verbannung' : c('strafe') < -0.3 ? 'Sühne durch Gaben und Ausgleich' : 'das Oberhaupt schlichtet']);
  out.push(['Ehe', (T.poly || 0) >= 0.5 && c('ehe') < 0.4 ? 'Vielehe – angesehene Männer haben mehrere Frauen' : c('ehe') < -0.35 ? 'lose Verbindungen, Kinder gehören allen' : 'Einehe']);
  out.push(['Fremde', c('gast') > 0.35 ? 'werden bewirtet' : c('gast') < -0.35 ? 'werden vertrieben' : 'werden beobachtet']);
  return out;
}
