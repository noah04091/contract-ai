/**
 * Tolerantes JSON-Parsen für abgeschnittene KI-Antworten (14.06.2026, Robustheit C).
 * ──────────────────────────────────────────────────────────────────────────────
 * Sehr große Verträge können dazu führen, dass die KI-Antwort am Token-Limit
 * abgeschnitten wird (finish_reason=length) → unvollständiges JSON → JSON.parse wirft
 * → bisher 500-Fehler statt Ergebnis.
 *
 * tryParseLenient versucht:
 *   1. normales JSON.parse (Erfolgsfall unverändert),
 *   2. bei Fehler eine KONSERVATIVE Reparatur: offene Strings/Arrays/Objekte schließen,
 *      ggf. die letzte unvollständige Property abschneiden. Es werden NIE Werte erfunden —
 *      nur die bereits vorhandene (valide) Teilstruktur wird sauber abgeschlossen.
 *
 * Liefert { ok, value, repaired }. Ist ok=false, war nichts Sinnvolles zu retten.
 * Rein deterministisch, keine Seiteneffekte. Das gerettete Teil-Ergebnis durchläuft
 * im Aufrufer die normale Validierung (render-if-present) — kein Daten-Erfinden.
 */

function closeOpenStructures(s) {
  let inStr = false, esc = false;
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }
  let out = s;
  if (inStr) out += '"';                 // offene Zeichenkette schließen
  out = out.replace(/,\s*$/, '');         // hängendes Komma entfernen
  for (let i = stack.length - 1; i >= 0; i--) {
    out += stack[i] === '{' ? '}' : ']';  // offene Container schließen (LIFO)
  }
  return out;
}

function tryParse(s) {
  try { return { ok: true, value: JSON.parse(s) }; }
  catch { return { ok: false }; }
}

function tryParseLenient(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false };

  // 1) normal
  const direct = tryParse(raw);
  if (direct.ok) return { ok: true, value: direct.value, repaired: false };

  // 2) konservativ reparieren: offene Strukturen schließen
  const a = tryParse(closeOpenStructures(raw));
  if (a.ok) return { ok: true, value: a.value, repaired: true };

  // 3) letzte (unvollständige) Property abschneiden, dann schließen
  //    Schneidet am letzten Komma der obersten/letzten Ebene ab — entfernt nur einen
  //    angefangenen, nicht abgeschlossenen Eintrag, keine validen Daten.
  const lastComma = raw.lastIndexOf(',');
  if (lastComma > 0) {
    const b = tryParse(closeOpenStructures(raw.slice(0, lastComma)));
    if (b.ok) return { ok: true, value: b.value, repaired: true };
  }

  return { ok: false };
}

module.exports = { tryParseLenient, closeOpenStructures };
