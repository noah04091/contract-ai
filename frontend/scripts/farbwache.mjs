#!/usr/bin/env node
/**
 * Farbwache — findet zwei Fehlerklassen, bevor sie live gehen.
 *
 * 1) GETEILTE VARIABLEN MIT VERSCHIEDENEN WERTEN
 *    `:root { ... }` in einer *.module.css ist NICHT modul-lokal. CSS-Module
 *    hashen Klassennamen, aber `:root` bleibt `:root` und wirkt global.
 *    Definieren zwei Dateien dieselbe Variable mit verschiedenen Werten,
 *    entscheidet allein die Reihenfolge der Baubloecke, welche gewinnt.
 *    Genau so war --apple-blue in sieben Dateien mit zwei Werten definiert
 *    und die Farbe der Navigationsleiste nicht festgelegt (Sep 2026).
 *
 * 2) FARBWERTE UNTER DER KONTRASTNORM
 *    Statisch pruefbar ist nur der Wert selbst, nicht seine Verwendung.
 *    Deshalb wird eine Sperrliste gefuehrt: Werte, die in diesem Projekt
 *    nachweislich als Text- oder Knopffarbe gedient haben und dort unter
 *    4,5:1 lagen. Kein Ersatz fuer eine Messung am gerenderten Bild,
 *    sondern ein Schnelltest gegen Rueckfaelle.
 *
 * Aufruf:  node scripts/farbwache.mjs [--strict]
 *          --strict beendet mit Code 1, sobald ein Befund vorliegt.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src');
const STRENG = process.argv.includes('--strict');

/** Werte, die in diesem Projekt als Text-/Knopffarbe unter der Norm lagen.
 *  Bei jedem Eintrag steht, wodurch er ersetzt wurde. */
const GESPERRT = {
  // rolle 'text'   → nur melden, wo der Wert als Schriftfarbe steht
  // rolle 'beides' → auch als Flaeche melden, weil weisse Schrift darauf
  //                  denselben zu geringen Abstand hat
  '#3b82f6': { wert: '3,68:1', statt: '#1D4ED8 (6,70:1)', rolle: 'beides' },
  '#71717a': { wert: '4,40:1 auf #f4f4f7', statt: '#52525B (7,04:1)', rolle: 'text' },
  '#f59e0b': { wert: '2,15:1 auf Weiss', statt: '#B45309 (5,02:1)', rolle: 'text' },
  '#9aa0b0': { wert: '2,80:1 auf Weiss', statt: 'einen Ton der Palette', rolle: 'text' },
};

/** Steht der Wert in dieser Zeile als Schriftfarbe?
 *  Das fuehrende [^-\w] schliesst `background-color:` und `border-color:` aus. */
const alsText = (zeile, farbe) => new RegExp(`(^|[^-\\w])color\\s*:\\s*${farbe}\\b`, 'i').test(zeile);
/** … oder als Flaeche? */
const alsFlaeche = (zeile, farbe) => new RegExp(`background(-color)?\\s*:[^;]*${farbe}\\b`, 'i').test(zeile);

/** Diese Pfade sind Entwuerfe und keine ausgelieferte Oberflaeche. */
const AUSGENOMMEN = [/[\\/]mockups[\\/]/, /[\\/]__tests__[\\/]/, /\.test\./];

/** Die Sperrliste gilt nur fuer die OEFFENTLICHEN Bauteile.
 *  Ungefiltert meldet sie ueber 2000 Vorkommen, groesstenteils aus dem
 *  eingeloggten Bereich, wo dieselben Werte oft auf anderem Grund sitzen und
 *  die Norm erfuellen. Eine Warnung, die 2000 Zeilen ausgibt, wird nicht
 *  gelesen. Der eingeloggte Bereich ist ein eigenes Paket und braucht eine
 *  eigene Messung mit Zugang. */
const OEFFENTLICH = [
  /components[\\/](LandingFooter|SkipNavigation|Navbar)/i,
  /styles[\\/](Navbar|landing|LegalPages|BlogPages|BlogPostPage|ApiDocsPage|FeaturePage|Features|Pricing)/i,
  /pages[\\/](HomeRedesign|Pricing|Features|Blog|BlogPost|Datenschutz|AGB|Impressum|About|ApiDocs)/i,
];

const dateien = [];
(function sammeln(ordner) {
  for (const name of readdirSync(ordner)) {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) { sammeln(pfad); continue; }
    if (!/\.(css|tsx|ts)$/.test(name)) continue;
    if (AUSGENOMMEN.some(r => r.test(pfad))) continue;
    dateien.push(pfad);
  }
})(WURZEL);

// ---------- 1) global definierte Variablen einsammeln ----------
const global = new Map();          // name -> [{ wert, datei, zeile }]
for (const pfad of dateien) {
  if (!pfad.endsWith('.css')) continue;
  const zeilen = readFileSync(pfad, 'utf8').split(/\r?\n/);
  let inRoot = false, tiefe = 0;
  zeilen.forEach((zeile, i) => {
    if (!inRoot && /^\s*:root\b[^{]*\{/.test(zeile)) { inRoot = true; tiefe = 1; return; }
    if (!inRoot) return;
    tiefe += (zeile.match(/\{/g) || []).length - (zeile.match(/\}/g) || []).length;
    if (tiefe <= 0) { inRoot = false; return; }
    const m = zeile.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
    if (!m) return;
    const [, name, roh] = m;
    if (!global.has(name)) global.set(name, []);
    global.get(name).push({ wert: roh.trim().toLowerCase(), datei: relative(WURZEL, pfad), zeile: i + 1 });
  });
}

const kollisionen = [...global.entries()]
  .map(([name, vorkommen]) => ({ name, vorkommen, werte: [...new Set(vorkommen.map(v => v.wert))] }))
  .filter(x => x.werte.length > 1);

// ---------- 2) gesperrte Farbwerte suchen ----------
const gesperrt = [];
let anderswo = 0;
for (const pfad of dateien) {
  const oeffentlich = OEFFENTLICH.some(r => r.test(pfad));
  readFileSync(pfad, 'utf8').split(/\r?\n/).forEach((zeile, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(zeile)) return;     // Kommentare erklaeren die Werte oft
    for (const [farbe, info] of Object.entries(GESPERRT)) {
      const text = alsText(zeile, farbe);
      const flaeche = info.rolle === 'beides' && alsFlaeche(zeile, farbe);
      if (!text && !flaeche) continue;
      if (oeffentlich) gesperrt.push({ farbe, info, rolle: text ? 'Schrift' : 'Flaeche', datei: relative(WURZEL, pfad), zeile: i + 1 });
      else anderswo++;
    }
  });
}

// ---------- Bericht ----------
console.log(`Farbwache — ${dateien.length} Dateien geprueft\n`);

if (kollisionen.length) {
  console.log(`🔴 ${kollisionen.length} global definierte Variable(n) mit widerspruechlichen Werten:\n`);
  for (const k of kollisionen) {
    console.log(`   ${k.name}  —  ${k.werte.length} verschiedene Werte`);
    for (const v of k.vorkommen) console.log(`      ${v.wert.padEnd(24)} ${v.datei}:${v.zeile}`);
    console.log('      → welcher gewinnt, entscheidet die Reihenfolge der Baubloecke.');
    console.log('        Einen Namen pro Bauteil vergeben oder auf eine Definition zusammenfuehren.\n');
  }
} else {
  console.log('🟢 keine global definierte Variable mit widerspruechlichen Werten\n');
}

if (gesperrt.length) {
  const nachFarbe = new Map();
  for (const g of gesperrt) { if (!nachFarbe.has(g.farbe)) nachFarbe.set(g.farbe, []); nachFarbe.get(g.farbe).push(g); }
  console.log(`🟡 ${gesperrt.length} Vorkommen von Farbwerten, die hier schon unter der Norm lagen:\n`);
  for (const [farbe, treffer] of nachFarbe) {
    const info = GESPERRT[farbe];
    console.log(`   ${farbe}  (${info.wert})  →  ${info.statt}`);
    for (const t of treffer.slice(0, 8)) console.log(`      als ${t.rolle.padEnd(8)} ${t.datei}:${t.zeile}`);
    if (treffer.length > 8) console.log(`      … und ${treffer.length - 8} weitere`);
    console.log('');
  }
  console.log('   ⚠️ Ob eine Stelle wirklich unter der Norm liegt, haengt vom Grund ab,');
  console.log('      auf dem sie sitzt. Diese Liste ist ein Hinweis, kein Urteil:');
  console.log('      am gerenderten Bild nachmessen, bevor etwas geaendert wird.\n');
} else {
  console.log('🟢 kein gesperrter Farbwert in den oeffentlichen Bauteilen\n');
}
if (anderswo) {
  console.log(`ℹ️  ${anderswo} weitere Vorkommen ausserhalb der oeffentlichen Bauteile`);
  console.log('   (eingeloggter Bereich). Dort sitzen dieselben Werte oft auf anderem');
  console.log('   Grund und erfuellen die Norm. Eigenes Paket, eigene Messung mit Zugang.\n');
}

const befunde = kollisionen.length + (gesperrt.length ? 1 : 0);
if (STRENG && befunde) process.exit(1);
