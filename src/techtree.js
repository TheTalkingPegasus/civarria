// =====================================================================
//  ZIVILISATIONSBAUM · der Weg aus der Steinzeit bis zu den ersten Städten
//  Jede Entdeckung braucht Vorwissen, eine passende Lage (cond) und
//  Erfahrungen im Alltag (ctx), aus denen die Idee erwächst.
// =====================================================================
// Kategorie = Zeile im Baum
const TCAT = { nahrung: 'Nahrung', tiere: 'Tiere', handwerk: 'Handwerk', bauen: 'Bauen', wasser: 'Wasser & Wege', geist: 'Glaube & Wissen', ordnung: 'Ordnung & Macht' };
// bestehende Entdeckungen einsortieren
Object.assign(TECH.faustkeil, { cat: 'handwerk' }); Object.assign(TECH.speer, { cat: 'nahrung' }); Object.assign(TECH.feuer_machen, { cat: 'handwerk' });
Object.assign(TECH.kochen, { cat: 'nahrung' }); Object.assign(TECH.fellkleidung, { cat: 'handwerk' }); Object.assign(TECH.flechten, { cat: 'handwerk' });
Object.assign(TECH.fischen, { cat: 'wasser' }); Object.assign(TECH.huette, { cat: 'bauen' }); Object.assign(TECH.heilkraeuter, { cat: 'geist' });
Object.assign(TECH.bestattung, { cat: 'geist' }); Object.assign(TECH.malerei, { cat: 'geist' }); Object.assign(TECH.toepfern, { cat: 'handwerk' });
Object.assign(TECH.zaehmung, { cat: 'tiere' }); Object.assign(TECH.bogen, { cat: 'nahrung' }); Object.assign(TECH.palisade, { cat: 'bauen' });
Object.assign(TECH.viehzucht, { cat: 'tiere' }); Object.assign(TECH.reusen, { cat: 'wasser' }); Object.assign(TECH.weben, { cat: 'handwerk' });
Object.assign(TECH.floss, { cat: 'wasser' }); Object.assign(TECH.steinbau, { cat: 'bauen' }); Object.assign(TECH.ackerbau, { cat: 'nahrung' });

const HERD_K = { goat: 'viehzucht', sheep: 'schaf', cattle: 'rind', pig: 'schwein', donkey: 'esel' };
const tPop = (T, n) => T.members.length >= n;
// Lage der Sippe – einmal am Tag zwischengespeichert (T.tc), sonst wird es teuer
const tSettled = T => T.tc ? T.tc.settled : tribeFields(T).length >= 3 || !!T.storehouse;
const tContacts = T => T.tc ? T.tc.contacts : Object.keys(T.rel).filter(k => TRIBE.get(+k)?.alive).length;
const tRiverFields = T => T.tc ? T.tc.river : riverFields(T);
const riverFields = T => tribeFields(T).some(i => { const x = i % C.MW, y = (i / C.MW) | 0; for (let d = -3; d <= 3; d++) if (tileAt(x + d, y) === T_SHALLOW || tileAt(x, y + d) === T_SHALLOW) return true; return false; });
const tHerd = (T, k) => T.tc ? !!T.tc.herd[k] : W.animals.some(a => a.k === k && a.tribe === T.id);

const NEW_TECH = {
  // ---- späte Jäger und Sammler
  nadel:      { cat: 'handwerk', name: 'Nähnadel', icon: '🪡', req: ['fellkleidung', 'faustkeil'], D: 7000, ctx: { craft: 1, coldhide: 0.6 }, desc: 'Eine Knochennadel mit Öhr. Genähte Kleidung sitzt eng und wärmt viel besser.', eff: 'Kleidung wärmt besser' },
  netz:       { cat: 'wasser', name: 'Netze', icon: '🕸', req: ['flechten', 'fischen'], D: 7500, ctx: { fishing: 1, craft: 0.3 }, desc: 'Geknüpfte Netze fangen ganze Schwärme statt einzelner Fische.', eff: 'Fischfang +35 %' },
  mahlstein:  { cat: 'nahrung', name: 'Mahlstein', icon: '🪨', req: ['faustkeil'], D: 6500, ctx: { gather: 0.8, cook: 0.3 }, desc: 'Samen und Nüsse zwischen zwei Steinen zerreiben. Aus Hartem wird Essbares.', eff: 'Sammeln +15 %' },
  einbaum:    { cat: 'wasser', name: 'Einbaum', icon: '🛶', req: ['floss', 'faustkeil'], D: 9000, ctx: { waterblock: 0.8, woodcut: 0.4, fishing: 0.3 }, desc: 'Ein ausgehöhlter Baumstamm – schneller und sicherer als ein Floß.', eff: 'Fischfang +20 %, Wasser überqueren' },
  vorratsgrube: { cat: 'nahrung', name: 'Vorratsgruben', icon: '🕳', req: ['flechten'], D: 6000, ctx: { store: 1, winter: 0.5 }, desc: 'Ausgekleidete Erdgruben halten Vorräte kühl und trocken.', eff: 'Vorräte verderben 20 % langsamer' },
  sichel:     { cat: 'nahrung', name: 'Feuersteinsichel', icon: '🌙', req: ['faustkeil', 'flechten'], D: 7500, ctx: { gather: 0.7 }, desc: 'Feuersteinklingen in einem gebogenen Griff. Wildgräser lassen sich bündelweise schneiden.', eff: 'Sammeln +10 %, Ernte schneller' },
  schmuck:    { cat: 'geist', name: 'Schmuck & Tausch', icon: '📿', req: ['malerei'], D: 6000, ctx: { paint: 0.6, trade: 1, talk: 0.15 }, desc: 'Perlen, Muscheln und Zähne werden getragen – und gegen anderes getauscht.', eff: 'Freundschaft mit Nachbarn wächst' },
  // ---- Jungsteinzeit
  saatgut:    { cat: 'nahrung', name: 'Saatgut auslesen', icon: '🌾', req: ['ackerbau'], D: 12000, ctx: { farm: 1 }, desc: 'Die besten Körner werden nicht gegessen, sondern wieder gesät. Das Korn wird von Jahr zu Jahr größer.', eff: 'Ernte +30 %' },
  huelsen:    { cat: 'nahrung', name: 'Hülsenfrüchte', icon: '🫘', req: ['ackerbau'], D: 10000, ctx: { farm: 0.7, gather: 0.2 }, desc: 'Linsen und Erbsen zwischen dem Korn. Sie machen satt und den Boden fruchtbar.', eff: 'Ernte +15 %' },
  schaf:      { cat: 'tiere', name: 'Schafzucht', icon: '🐑', req: ['viehzucht'], D: 12000, ctx: { sheepnear: 1, herd: 0.4 }, desc: 'Wilde Mufflons werden gezähmt. Ihr Fell wird zu Wolle.', eff: 'Schafe: Wolle und Fleisch' },
  rind:       { cat: 'tiere', name: 'Rinderzucht', icon: '🐂', req: ['viehzucht'], D: 16000, ctx: { cattlenear: 1, herd: 0.4 }, cond: tSettled, condTxt: 'sesshafte Sippe', desc: 'Der gewaltige Auerochse wird über Generationen zum zahmen Rind.', eff: 'Rinder: viel Fleisch, später Zugkraft' },
  schwein:    { cat: 'tiere', name: 'Schweinezucht', icon: '🐖', req: ['viehzucht'], D: 11000, ctx: { pignear: 1, herd: 0.3 }, cond: tSettled, condTxt: 'sesshafte Sippe', desc: 'Wildschweine fressen Abfälle am Dorfrand – bis sie bleiben.', eff: 'Schweine: Fleisch aus Abfall' },
  lehmziegel: { cat: 'bauen', name: 'Lehmziegel', icon: '🧱', req: ['toepfern', 'huette'], D: 11000, ctx: { build: 0.8, clayfire: 0.4 }, desc: 'Lehm mit Stroh in Formen pressen und in der Sonne trocknen. Häuser ohne Steinbruch.', eff: 'Feste, warme Lehmhäuser' },
  steinbeil:  { cat: 'handwerk', name: 'Geschliffenes Steinbeil', icon: '🪓', req: ['faustkeil', 'mahlstein'], D: 9000, ctx: { woodcut: 1, craft: 0.3 }, desc: 'Ein Beil, geschliffen statt geschlagen. Bäume fallen in einem Bruchteil der Zeit.', eff: 'Holz und Roden schneller' },
  backofen:   { cat: 'nahrung', name: 'Backofen & Brot', icon: '🍞', req: ['toepfern', 'mahlstein', 'ackerbau'], D: 12000, ctx: { cook: 1, farm: 0.2 }, desc: 'Gemahlenes Korn mit Wasser zu Fladen backen. Brot hält sich und nährt.', eff: 'Gesünder, Getreide nährt mehr', build: 'oven' },
  bier:       { cat: 'nahrung', name: 'Bier', icon: '🍺', req: ['ackerbau', 'toepfern'], D: 10000, ctx: { store: 0.5, cook: 0.4 }, desc: 'Nasses Getreide gärt im Topf. Das Getränk ist nahrhaft, sauber – und macht fröhlich.', eff: 'Geselliger, weniger Krankheit' },
  spindel:    { cat: 'handwerk', name: 'Spindel', icon: '🧵', req: ['weben'], D: 8000, ctx: { spin: 1, craft: 0.3 }, desc: 'Ein Stab mit Schwunggewicht dreht Fasern zu langem, gleichmäßigem Garn.', eff: 'Stoff schneller herstellen' },
  webstuhl:   { cat: 'handwerk', name: 'Webstuhl', icon: '🪢', req: ['spindel'], D: 11000, ctx: { spin: 0.8, craft: 0.4 }, desc: 'Kettfäden, gespannt durch Gewichte. Breite Tuchbahnen entstehen.', eff: 'Bessere Kleidung' },
  milch:      { cat: 'tiere', name: 'Milch & Käse', icon: '🧀', req: ['viehzucht', 'toepfern'], D: 10000, ctx: { herd: 1, store: 0.2 }, desc: 'Melken, säuern, pressen. Käse hält den Winter über.', eff: 'Vieh gibt +60 % Nahrung, weniger Kindersterben' },
  // ---- Kupferzeit
  bewaesserung: { cat: 'nahrung', name: 'Bewässerungskanäle', icon: '💧', req: ['saatgut', 'steinbeil'], D: 20000, ctx: { farm: 0.8, irrigate: 1.4 }, cond: tRiverFields, condTxt: 'Felder nahe am Fluss', desc: 'Gräben leiten Flusswasser auf die Felder. Wo der Regen fehlt, wächst trotzdem Korn.', eff: 'Ernte +50 %' },
  hakenpflug: { cat: 'nahrung', name: 'Hakenpflug', icon: '⛏', req: ['saatgut', 'steinbeil'], D: 16000, ctx: { farm: 1 }, desc: 'Ein Haken aus hartem Holz reißt den Boden auf – schneller als jede Hacke.', eff: 'Ernte +25 %, der Pflug ist auf dem Feld zu sehen' },
  ochsen:     { cat: 'tiere', name: 'Ochsengespann', icon: '🐃', req: ['rind', 'hakenpflug'], D: 15000, ctx: { farm: 0.6, herd: 0.6 }, cond: T => tHerd(T, 'cattle'), condTxt: 'eigene Rinder', desc: 'Ein Ochse zieht den Pflug. Ein Mensch bestellt nun ein Vielfaches an Land.', eff: 'Ernte +20 %' },
  brennofen:  { cat: 'handwerk', name: 'Brennofen', icon: '🔥', req: ['toepfern', 'lehmziegel'], D: 13000, ctx: { potter: 1, clayfire: 0.5 }, desc: 'Ein geschlossener Ofen wird viel heißer als ein offenes Feuer. Die Töpfe klingen hart.', eff: 'Vorräte verderben 15 % langsamer', build: 'kiln' },
  toepferscheibe: { cat: 'handwerk', name: 'Töpferscheibe', icon: '🏺', req: ['brennofen'], D: 14000, ctx: { potter: 1 }, desc: 'Eine drehende Scheibe formt Gefäße in wenigen Augenblicken.', eff: 'Töpfern 2,5× so schnell, doppelt so viele Töpfe' },
  kupfer_haemmern: { cat: 'handwerk', name: 'Kupfer hämmern', icon: '🟤', req: ['schmuck', 'steinbeil'], D: 15000, ctx: { stone: 0.6, craft: 0.5 }, desc: 'Ein grünlich schimmernder Stein lässt sich kalt zu Perlen und Ahlen hämmern.', eff: 'Kupferschmuck für Angesehene, wertvolle Tauschware' },
  kupfer_guss: { cat: 'handwerk', name: 'Kupfer schmelzen & gießen', icon: '⚒', req: ['kupfer_haemmern', 'brennofen'], D: 22000, ctx: { potter: 0.6, craft: 0.6 }, desc: 'Im heißen Ofen fließt das Erz. In Formen gegossen entstehen Beile, Dolche, Speerspitzen.', eff: 'Kupferwaffen und -werkzeug' },
  esel:       { cat: 'tiere', name: 'Esel als Lasttier', icon: '🫏', req: ['viehzucht'], D: 13000, ctx: { donkeynear: 1, trade: 0.4 }, desc: 'Der genügsame Wildesel trägt schwere Lasten über weite Strecken.', eff: 'Handel reicht weiter' },
  segelboot:  { cat: 'wasser', name: 'Schilfboot mit Segel', icon: '⛵', req: ['einbaum', 'webstuhl'], D: 15000, ctx: { fishing: 0.5, waterblock: 0.6, trade: 0.4 }, desc: 'Gebündeltes Schilf trägt ein Tuchsegel. Der Wind arbeitet nun für den Menschen.', eff: 'Schneller übers Wasser, Handel' },
  rad:        { cat: 'wasser', name: 'Rad', icon: '☸', req: ['toepferscheibe', 'steinbeil'], D: 22000, ctx: { potter: 0.4, build: 0.4, carry: 1 }, desc: 'Eine Scheibe auf einer Achse – aus der Töpferscheibe wird ein Wagenrad.', eff: 'Scheibenräder – Grundlage für den Wagen' },
  wagen:      { cat: 'wasser', name: 'Wagen', icon: '🛞', req: ['rad', 'ochsen'], D: 16000, ctx: { carry: 1, trade: 0.5 }, desc: 'Zwei Räder, eine Deichsel, ein Ochse davor. Lasten rollen statt getragen zu werden.', eff: 'Sammeln +10 %, Bauen schneller (Material wird gefahren), Handel reicht weiter' },
  dattel:     { cat: 'nahrung', name: 'Dattelpalmen', icon: '🌴', req: ['saatgut'], D: 12000, ctx: { farm: 0.5, gather: 0.3 }, cond: tRiverFields, condTxt: 'Felder nahe am Fluss', desc: 'Palmen am Kanalrand – Früchte, Schatten, Holz und Fasern zugleich.', eff: 'Ernte +10 %' },
  // ---- Wissen und Verwaltung
  zaehlsteine: { cat: 'geist', name: 'Zählsteine', icon: '🔢', req: ['toepfern', 'vorratsgrube'], D: 14000, ctx: { count: 1, store: 0.4 }, cond: T => tSettled(T) && tPop(T, 30), condTxt: 'sesshaft, mind. 30 Menschen', desc: 'Kleine Tonmarken stehen für Krüge, Schafe, Körbe. Was man besitzt, kann man nun zählen.', eff: 'Größere Sippen halten zusammen' },
  siegel:     { cat: 'geist', name: 'Siegel', icon: '🔏', req: ['zaehlsteine', 'schmuck'], D: 13000, ctx: { count: 0.6, trade: 0.6 }, desc: 'Ein geschnitzter Stein drückt ein Zeichen in den Ton: Das gehört mir.', eff: 'Weniger Diebstahl' },
  masse:      { cat: 'geist', name: 'Maße & Gewichte', icon: '⚖', req: ['zaehlsteine'], D: 14000, ctx: { trade: 0.8, build: 0.4, count: 0.4 }, desc: 'Eine Elle, ein Krug, ein Gewichtsstein – überall gleich. Tausch wird gerecht.', eff: 'Handel lohnt mehr' },
  kalender:   { cat: 'geist', name: 'Kalender', icon: '🌒', req: ['ackerbau', 'malerei'], D: 15000, ctx: { sky: 1, farm: 0.3 }, desc: 'Monde und Sterne werden gezählt. Man weiß, wann gesät und wann geerntet wird.', eff: 'Ernte +10 %, bessere Wintervorsorge' },
  zahlen:     { cat: 'geist', name: 'Zahlensystem', icon: '➗', req: ['zaehlsteine', 'kalender'], D: 18000, ctx: { count: 1, sky: 0.3 }, desc: 'Zählen in Sechzigern: zu Ende gedacht für Jahre, Kreise und Krüge.', eff: 'Grundlage für Schrift' },
  rationen:   { cat: 'ordnung', name: 'Rationenverwaltung', icon: '📋', req: ['zaehlsteine', 'vorratsgrube'], D: 16000, ctx: { store: 1, count: 0.5 }, cond: T => tSettled(T) && tPop(T, 50), condTxt: 'sesshaft, mind. 50 Menschen', desc: 'Jeder bekommt zugeteilt, was ihm zusteht. Nichts geht verloren, niemand hortet.', eff: 'Vorräte verderben 20 % langsamer, größere Siedlungen' },
  tempelbau:  { cat: 'geist', name: 'Tempel', icon: '🛕', req: ['lehmziegel', 'bestattung'], D: 16000, ctx: { temple: 1, ritual: 0.4 }, cond: T => tSettled(T) && tPop(T, 40), condTxt: 'sesshaft, mind. 40 Menschen', desc: 'Ein erhöhtes Haus für die Götter, aus Ziegeln auf einer Plattform.', eff: 'Heiliger Mittelpunkt der Siedlung', build: 'temple' },
  schrift:    { cat: 'geist', name: 'Schrift', icon: '📜', req: ['siegel', 'zahlen', 'rationen'], D: 30000, ctx: { count: 1, store: 0.4 }, cond: T => tPop(T, 70), condTxt: 'mind. 70 Menschen', desc: 'Zeichen auf Tontafeln halten fest, was kein Gedächtnis fassen kann. Wissen überdauert die Menschen.', eff: 'Wissen geht nicht mehr verloren' },
  schule:     { cat: 'geist', name: 'Schreiberschule', icon: '🎓', req: ['schrift'], D: 15000, ctx: { talk: 0.8, count: 0.3 }, desc: 'Kinder lernen Zeichen und Zahlen im „Tafelhaus“.', eff: 'Kinder lernen viel schneller' },
  // ---- Gesellschaft
  fernhandel: { cat: 'ordnung', name: 'Fernhandel', icon: '🐪', req: ['schmuck', 'masse'], D: 15000, ctx: { trade: 1 }, cond: T => tContacts(T) >= 2, condTxt: 'Kontakt zu mind. 2 Sippen', desc: 'Händler ziehen von Sippe zu Sippe. Waren – und Ideen – reisen weit.', eff: 'Güter und Wissen werden getauscht' },
  handwerker: { cat: 'ordnung', name: 'Handwerkerstand', icon: '🔨', req: ['toepferscheibe', 'kupfer_haemmern'], D: 16000, ctx: { craft: 0.8, crowd: 0.4 }, cond: T => tPop(T, 50), condTxt: 'mind. 50 Menschen', desc: 'Manche arbeiten nicht mehr auf dem Feld, sondern nur noch in der Werkstatt.', eff: 'Alle Werkstattarbeit 40 % schneller' },
  tempelwirtschaft: { cat: 'ordnung', name: 'Tempelwirtschaft', icon: '⛩', req: ['tempelbau', 'rationen'], D: 18000, ctx: { temple: 1, store: 0.5 }, cond: T => tPop(T, 60), condTxt: 'mind. 60 Menschen', desc: 'Der Tempel sammelt die Ernte, verteilt sie und lässt für sich arbeiten.', eff: 'Priesterherrschaft möglich, sichere Vorräte' },
  stadtplanung: { cat: 'bauen', name: 'Stadt & Mauer', icon: '🏙', req: ['lehmziegel', 'masse', 'bewaesserung'], D: 22000, ctx: { build: 0.6, crowd: 1 }, cond: T => tPop(T, 90), condTxt: 'mind. 90 Menschen', desc: 'Gassen, Viertel und eine Mauer aus Ziegeln. Aus dem Dorf wird eine Stadt.', eff: 'Stadtmauer, sehr große Siedlungen', build: 'wall' },
  gerichte:   { cat: 'ordnung', name: 'Gerichte', icon: '🏛', req: ['rationen'], D: 15000, ctx: { crowd: 0.8, theft: 1 }, cond: T => tPop(T, 45), condTxt: 'mind. 45 Menschen', desc: 'Streit wird nicht mehr mit der Faust entschieden, sondern vor Ältesten oder Richtern.', eff: 'Weniger Gewalt bei Streit' },
  heer:       { cat: 'ordnung', name: 'Heer', icon: '🛡', req: ['kupfer_guss', 'bogen'], D: 18000, ctx: { war: 1 }, cond: T => tPop(T, 60), condTxt: 'mind. 60 Menschen', desc: 'Bewaffnete, die nur für den Kampf da sind – geübt, geordnet, gefürchtet.', eff: 'Stärker im Krieg' },
  koenigtum:  { cat: 'ordnung', name: 'Königtum', icon: '👑', req: ['heer', 'tempelwirtschaft'], D: 20000, ctx: { war: 0.5, crowd: 0.6, temple: 0.3 }, cond: T => tPop(T, 100), condTxt: 'mind. 100 Menschen', desc: 'Ein Herrscher, eingesetzt von den Göttern, gestützt vom Heer.', eff: 'Königtum als Herrschaftsform möglich' },
  schuldknechtschaft: { cat: 'ordnung', name: 'Schuldknechtschaft', icon: '⛓', req: ['rationen', 'gerichte'], D: 14000, ctx: { store: 0.4, crowd: 0.4 }, desc: 'Wer seine Schulden nicht zahlen kann, zahlt mit seiner Arbeit.', eff: 'Knechtschaft wird denkbar' },
};
Object.assign(TECH, NEW_TECH);
TECH_IDS = Object.keys(TECH);
// Steinzeit-Wissen braucht nun auch Lage: Viehzucht nur, wenn man schon länger an einem Ort lebt usw. (bestehende ctx bleiben)
// Was Menschen tun, nährt bestimmte Ideen
function techTick(n, T) {
  const L = n.actLog; if (!L) return; n.actLog = null;
  const pop = T.members.length, big = pop >= 30;
  const add = (c, v) => insightCtx(n, c, v);
  for (const t in L) {
    const c = L[t] * 18;
    switch (t) {
      case 'gather': add('gather', c * 0.15); if (rnd() < 0.3 && T.store.food > pop * 4) add('store', c * 0.3); break;
      case 'farm': add('farm', c); if (tRiverFields(T)) add('irrigate', c * 0.6); break;
      case 'herd': add('herd', c); break;
      case 'fish': case 'trap': add('fishing', c); break;
      case 'craft': add('craft', c); if (T.pots > 2) add('potter', c * 0.6); if (n.know.weben) add('spin', c * 0.6); break;
      case 'build': case 'construct': add('build', c * 0.6); add('carry', c * 0.2); break;
      case 'wood': add('woodcut', c); add('carry', c * 0.2); break;
      case 'deliver': if (T.store.food > pop * 6) add('store', c * 0.5); if (big && T.store.food > pop * 8) add('count', c * 0.6); if (n.inv.stone > 0) add('carry', c * 0.3); break;
      case 'visit': case 'diplo': add('trade', c * 1.5); break;
      case 'ritual': case 'preach': if (tSettled(T) && big) add('temple', c); break;
      case 'social': if (pop >= 45) add('crowd', c * 0.5); add('talk', c * 0.3); break;
      case 'eat': if (T.fire.lit) add('cook', c * 0.2); break;
      case 'raid': case 'defend': add('war', c); break;
      case 'paint': add('paint', c); break;
      case 'sleep': if (n.tr.neugier + n.tr.fromm > 1.1) add('sky', c * 0.15); break;
      case 'theft': add('theft', c); break;
    }
  }
  if (seasonNow() === 3) add('winter', 2);
  // wilde Tiere in der Nähe wecken Ideen
  for (const [k, cx] of [['sheep', 'sheepnear'], ['cattle', 'cattlenear'], ['pig', 'pignear'], ['donkey', 'donkeynear']]) if (n.know.viehzucht && W.animals.some(a => a.k === k && !a.tribe && dist(a.x, a.y, n.x, n.y) < 12)) add(cx, 8);
}
// Wissen der Sippe (für Wirkungen) – einmal am Tag
function updateTribeKnow(T) { const k = {}; for (const id of T.members) { const m = NPC.get(id); if (m) for (const t in m.know) k[t] = 1; } T.kn = k; }
const TK = (T, k) => !!(T && T.kn && T.kn[k]);
// Ertrag je nach Arbeit und Wissen
function yieldMul(T, src) {
  let m = 1;
  if (src === 'gather') m *= (TK(T, 'mahlstein') ? 1.15 : 1) * (TK(T, 'sichel') ? 1.1 : 1) * (TK(T, 'wagen') ? 1.1 : 1);
  else if (src === 'fish' || src === 'trap') m *= (TK(T, 'netz') ? 1.35 : 1) * (TK(T, 'einbaum') ? 1.2 : 1) * (TK(T, 'segelboot') ? 1.1 : 1);
  else if (src === 'farm') m *= (TK(T, 'saatgut') ? 1.3 : 1) * (TK(T, 'huelsen') ? 1.15 : 1) * (TK(T, 'bewaesserung') && tRiverFields(T) ? 1.5 : 1) * (TK(T, 'hakenpflug') ? 1.25 : 1) * (TK(T, 'ochsen') ? 1.2 : 1) * (TK(T, 'dattel') ? 1.1 : 1) * (TK(T, 'kalender') ? 1.1 : 1) * (TK(T, 'backofen') ? 1.1 : 1);
  else if (src === 'hunt') m *= TK(T, 'kupfer_guss') ? 1.1 : 1;
  return m;
}
const spoilMul = T => (TK(T, 'vorratsgrube') ? 0.8 : 1) * (TK(T, 'brennofen') ? 0.85 : 1) * (TK(T, 'rationen') ? 0.8 : 1) * (TK(T, 'tempelwirtschaft') ? 0.9 : 1);
// Wie groß eine Siedlung werden kann, bevor sie zerfällt
const cohesion = T => 60 + (TK(T, 'zaehlsteine') ? 30 : 0) + (TK(T, 'rationen') ? 50 : 0) + (TK(T, 'gerichte') ? 30 : 0) + (TK(T, 'schrift') ? 80 : 0) + (TK(T, 'tempelwirtschaft') ? 60 : 0) + (TK(T, 'stadtplanung') ? 150 : 0) + (TK(T, 'koenigtum') ? 150 : 0);
const settlementName = T => T.members.length >= 150 && TK(T, 'stadtplanung') ? 'Stadt' : T.members.length >= 60 && tSettled(T) ? 'Dorf' : tSettled(T) ? 'Weiler' : 'Lager';
// Bauten, die durch Wissen möglich werden
const BUILD_NEED = { oven: 3, kiln: 4, temple: 14, wall: 28 };
const BUILD_NAME = { oven: 'einen Backofen', kiln: 'einen Brennofen', temple: 'einen Tempel', wall: 'eine Stadtmauer' };
function buildWants(T) {
  const out = [];
  for (const k of TECH_IDS) { const b = TECH[k].build; if (b && TK(T, k) && (T.bld?.[b] || 0) < BUILD_NEED[b]) out.push(b); }
  return out;
}
// Tägliche Wirkungen des Wissens
function techDaily(T) {
  updateTribeKnow(T);
  if (TK(T, 'kupfer_haemmern') && rnd() < 0.05) for (const id of T.members) { const m = NPC.get(id); if (m && m.prestige > 30 && !m.copper) { m.copper = 1; m.prestige += 5; memo(m, 'trägt nun Kupferschmuck'); } }
  const herd = {}; for (const a of W.animals) if (a.tribe === T.id && HERD_K[a.k]) herd[a.k] = (herd[a.k] || 0) + 1;
  T.tc = { settled: tribeFields(T).length >= 3 || !!T.storehouse, contacts: Object.keys(T.rel).filter(k => TRIBE.get(+k)?.alive).length, river: riverFields(T), herd };
  // Schrift: Wer lesen kann, vergisst nichts – Junge lernen aus den Tafeln
  if (TK(T, 'schrift')) for (const id of T.members) { const m = NPC.get(id); if (!m || ageY(m) < 10) continue; if (rnd() < (TK(T, 'schule') ? 0.05 : 0.015)) { const miss = Object.keys(T.kn).filter(k => !m.know[k] && TECH[k].req.every(r => m.know[r])); if (miss.length) m.know[pick(miss)] = 1; } }
  else if (TK(T, 'schule')) {}
  // Fernhandel: Waren und Ideen mit befreundeten Sippen
  if (TK(T, 'fernhandel') && rnd() < 0.08) {
    const range = 90 + (TK(T, 'esel') ? 60 : 0) + (TK(T, 'wagen') ? 60 : 0) + (TK(T, 'segelboot') ? 40 : 0);
    const O = W.tribes.filter(o => o.alive && o !== T && (T.rel[o.id] ?? -99) > -5 && dist(o.cx, o.cy, T.cx, T.cy) < range).sort(() => rnd() - 0.5)[0];
    if (O) {
      const gain = 4 + (TK(T, 'masse') ? 4 : 0) + (TK(T, 'kupfer_haemmern') ? 3 : 0); T.store.food += gain; O.store.food += gain * 0.7;
      T.rel[O.id] = (T.rel[O.id] ?? 0) + 2; O.rel[T.id] = (O.rel[T.id] ?? 0) + 2;
      const a = NPC.get(pick(T.members)), b = NPC.get(pick(O.members)); if (a && b) { teach(a, b, false); teach(b, a, false); valueContact(a, b); valueContact(b, a); }
      if (!T.tradeWith || T.tradeWith[O.id] === undefined) { T.tradeWith = T.tradeWith || {}; T.tradeWith[O.id] = W.tick; chron(2, `Händler der ${T.name} erreichen die ${O.name}. Ein Handelsweg entsteht.`, { tribe: T.id }); }
    }
  }
  // neue Haustiere: Die Entdecker fangen die ersten wilden Tiere ein
  for (const [k, kind] of [['schaf', 'sheep'], ['rind', 'cattle'], ['schwein', 'pig'], ['esel', 'donkey']]) {
    if (TK(T, k) && !tHerd(T, kind) && rnd() < 0.05) { const p = penOf(T); const c = kind === 'cattle' ? 2 : 3; for (let i = 0; i < c; i++) W.animals.push({ id: W.nextId++, k: kind, x: p[0] + rnd() * 2, y: p[1] + rnd() * 2, tx: p[0], ty: p[1], born: W.tick - C.TPY, tribe: T.id }); chron(1, `Die ${T.name} halten nun ${{ sheep: 'Schafe', cattle: 'Rinder', pig: 'Schweine', donkey: 'Esel' }[kind]}.`, { tribe: T.id }); }
  }
}
// Die Bauten im Lager
function placeBuild(T, b) {
  // Werkhof (Backofen + Brennofen teilen sich eine Parzelle), Tempel auf vier Parzellen
  if (b !== 'oven' && b !== 'kiln' && b !== 'temple') return null;
  const O = townOrigin(T), kind = b === 'temple' ? 'temple' : 'werk';
  let P = Object.values(O.lots).find(L => L.kind === kind);
  if (!P) P = kind === 'temple' ? allocLot(T, 'temple', 2, 2) : allocLot(T, 'werk');
  if (!P) return [T.cx + 4, T.cy + 4];
  if (b === 'oven') return [P.x0 + 1.2, P.y0 + 1.5];
  if (b === 'kiln') return [P.x0 + P.w - 1.2, P.y0 + 1.5];
  return [P.cx, P.cy];
}

// Wie lange die Werkbank-Arbeit dauert (Takte): Handwerker und Töpferscheibe machen es schneller
function craftTime(T, what) {
  let d = 10;
  if (TK(T, 'handwerker')) d *= 0.6;
  if (what === 'topf' && TK(T, 'toepferscheibe')) d *= 0.4;
  if (what === 'tuch') d *= (TK(T, 'spindel') ? 0.75 : 1) * (TK(T, 'webstuhl') ? 0.75 : 1);
  return Math.max(2, Math.round(d));
}

const TECH_SEE = {"faustkeil": "Steinwerkzeug in der Hand beim Holzen, Bauen und Herstellen", "speer": "Speer bei Jagd und Kampf", "feuer_machen": "Das Lagerfeuer wird neu entfacht, wenn es erlischt", "kochen": "Bratspieß über dem Lagerfeuer", "fellkleidung": "Fellkleidung im Herbst und Winter", "flechten": "Körbe am Lager und beim Sammeln", "fischen": "Fischgestell am Ufer, Fischer mit Speer", "huette": "Hütten aus Ästen und Rinde", "heilkraeuter": "Kräuter-Trockengestell am Lager, Heiler mit Kräutern", "bestattung": "Grabhügel", "malerei": "Felsbilder", "toepfern": "Tontöpfe am Lager und in den Häusern", "zaehmung": "Hunde begleiten ihre Menschen", "bogen": "Pfeil und Bogen bei Jagd und Kampf", "palisade": "Palisade rund ums Dorf", "viehzucht": "Gehege mit Ziegen", "reusen": "Reusen im seichten Wasser", "weben": "Gewebte Kleidung, Webstuhl in den Häusern", "floss": "Flöße auf dem Wasser", "steinbau": "Steinhäuser", "ackerbau": "Felder rund ums Dorf", "nadel": "Knochennadel beim Nähen von Kleidung", "netz": "Fischer mit Netz, Netz-Trockengestell am Ufer", "mahlstein": "Mahlstein am Lager und in den Häusern", "einbaum": "Einbaum am Ufer und auf dem Wasser", "vorratsgrube": "Abgedeckte Vorratsgruben am Lager – je mehr Vorrat, desto mehr", "sichel": "Sichel bei der Ernte", "schmuck": "Angesehene tragen Ketten aus Muscheln und Zähnen", "saatgut": "Kräftigere Ernte (nur in den Zahlen)", "huelsen": "Felder mit Linsen und Erbsen zwischen dem Korn", "schaf": "Schafe im Gehege", "rind": "Rinder im Gehege", "schwein": "Schweine im Gehege", "lehmziegel": "Lehmhäuser mit Flachdach, Ziegel trocknen im Werkhof", "steinbeil": "Geschliffenes Beil beim Holzen und Bauen", "backofen": "Backofen im Werkhof", "bier": "Große Krüge am Lager", "spindel": "Spindel beim Weben", "webstuhl": "Leinenkleidung", "milch": "Milchkrüge am Gehege", "bewaesserung": "Kanäle an den Feldern", "hakenpflug": "Pflug auf dem Feld", "ochsen": "Ochse zieht den Pflug", "brennofen": "Brennofen mit Rauch im Werkhof", "toepferscheibe": "Töpferscheibe im Werkhof", "kupfer_haemmern": "Kupferschmuck an Angesehenen", "kupfer_guss": "Kupferbeil und Kupferspeer", "esel": "Esel im Gehege, Händler mit Packesel", "segelboot": "Schilfboot mit Segel", "rad": "Scheibenräder im Werkhof", "wagen": "Karren am Vorratshaus, Händler mit Wagen", "dattel": "Dattelpalmen an den Feldern", "zaehlsteine": "Schale mit Zählsteinen im Vorratshaus", "siegel": "Gesiegelte Kisten im Vorratshaus", "masse": "Gerechterer Handel (nur in den Zahlen)", "kalender": "Steinkreis am Dorfrand", "zahlen": "Grundlage der Schrift (nur in den Zahlen)", "rationen": "Tontafel im Vorratshaus", "tempelbau": "Stufentempel", "schrift": "Tontafeln mit Zeichen im Vorratshaus", "schule": "Kinder lernen schneller (nur in den Zahlen)", "fernhandel": "Marktstand im Dorf, Händler unterwegs", "handwerker": "Schnellere Werkstattarbeit (nur in den Zahlen)", "tempelwirtschaft": "Priesterherrschaft wird möglich", "stadtplanung": "Stadtmauer aus Ziegeln", "gerichte": "Weniger Streit (nur in der Chronik)", "heer": "Kämpfer mit Kupferhelm und Schild", "koenigtum": "Krone auf dem Haupt des Herrschers", "schuldknechtschaft": "Unfreie im Dorf (Menschen-Ansicht)"};
for (const k in TECH_SEE) if (TECH[k]) TECH[k].see = TECH_SEE[k];

const TECH_HOW = {"nadel": "bohrt ein Loch in einen Knochensplitter und fädelt eine Sehne hindurch", "netz": "knüpft Schnüre zu einem Gitter und zieht damit einen ganzen Schwarm an Land", "mahlstein": "zerreibt Körner zwischen zwei Steinen zu Mehl", "einbaum": "höhlt einen Baumstamm mit Feuer und Stein aus und setzt sich hinein", "vorratsgrube": "gräbt eine Grube, legt sie mit Rinde aus und deckt die Vorräte zu", "sichel": "setzt Feuersteinklingen in ein gebogenes Holz und schneidet damit Gras im Bündel", "schmuck": "reiht Muscheln und Zähne auf eine Schnur und trägt sie um den Hals", "saatgut": "legt die dicksten Körner beiseite, statt sie zu essen", "huelsen": "sät Linsen zwischen das Korn", "schaf": "treibt ein Mufflon in den Pferch", "rind": "zähmt ein junges Auerochsenkalb", "schwein": "lockt ein Wildschwein mit Abfällen an, bis es bleibt", "lehmziegel": "presst Lehm mit Stroh in eine Holzform und lässt ihn in der Sonne trocknen", "steinbeil": "schleift einen Stein so lange, bis seine Schneide glänzt", "backofen": "formt eine Kuppel aus Lehm und backt darin Fladen", "bier": "vergisst einen Topf mit nassem Korn – und findet ein schäumendes Getränk", "spindel": "steckt einen Stein auf einen Stab und dreht damit Garn", "webstuhl": "spannt Fäden mit Steingewichten zwischen zwei Balken", "milch": "melkt eine Ziege und lässt die Milch säuern", "bewaesserung": "gräbt einen Graben vom Fluss zum Feld", "hakenpflug": "zieht einen gebogenen Ast durch die Erde", "ochsen": "spannt einen Ochsen vor den Pflug", "brennofen": "mauert um das Feuer eine Kammer aus Lehm", "toepferscheibe": "setzt eine Scheibe auf einen Zapfen und dreht sie beim Töpfern", "kupfer_haemmern": "hämmert einen grün schimmernden Stein zu einer Perle", "kupfer_guss": "sieht flüssiges Metall aus dem Ofen rinnen und gießt es in eine Form", "esel": "lädt einem Wildesel Säcke auf", "segelboot": "spannt ein Tuch auf ein Schilfboot und lässt sich vom Wind treiben", "rad": "nimmt die Scheibe von der Töpferachse und rollt sie über den Boden", "wagen": "baut zwei Räder unter einen Kasten und spannt einen Ochsen davor", "dattel": "pflanzt Dattelkerne an den Rand des Kanals", "zaehlsteine": "formt für jeden Krug eine kleine Tonmarke", "siegel": "schnitzt ein Zeichen in einen Stein und drückt es in Ton", "masse": "legt fest, wie viel ein Krug fasst und ein Stein wiegt", "kalender": "zählt die Monde zwischen zwei Sonnenwenden", "zahlen": "bündelt die Zählsteine in Sechzigern", "rationen": "teilt jedem genau zu, was ihm zusteht", "tempelbau": "errichtet den Göttern ein Haus auf einer Plattform", "schrift": "ritzt Zeichen in eine Tontafel, die jeder lesen kann, der sie gelernt hat", "schule": "versammelt Kinder um sich und lehrt sie die Zeichen", "fernhandel": "zieht mit Waren zu fernen Sippen", "handwerker": "arbeitet nur noch in der Werkstatt und tauscht seine Ware gegen Essen", "tempelwirtschaft": "lässt die Ernte im Tempel sammeln und verteilen", "stadtplanung": "zieht Gassen und eine Mauer um die Siedlung", "gerichte": "lässt Streit vor den Alten verhandeln", "heer": "stellt Kämpfer auf, die nur für den Krieg da sind", "koenigtum": "lässt sich als König ausrufen", "schuldknechtschaft": "verlangt Arbeit für eine Schuld, die nicht bezahlt wird"};
for (const k in TECH_HOW) if (TECH[k]) TECH[k].how = TECH_HOW[k];
