// Unit-Tests für die Ehrlichkeits-Wache im Mail-Trichter (19.08.2026, Noahs AVV-Befund):
// "läuft heute ab" darf nur dann in einer Mail stehen, wenn sie auch AM Stichtag rausgeht.
// Lookahead-Frühwarnungen (nackte Stichtage, bis zu 7 Tage früher) bekommen das echte Datum.
const { neutralizeRelativeDayWords } = require('../../services/calendarNotifier');

const NOW = new Date('2026-08-19T15:00:00Z'); // 17:00 Berlin — der reale Versandzeitpunkt des Befunds

describe('neutralizeRelativeDayWords', () => {
  test('Frühwarnung (7 Tage vorher): "heute" wird zum echten Datum — der AVV-Fall', () => {
    expect(neutralizeRelativeDayWords(
      '"AVV_Contract-AI_v2.1.pdf" läuft heute ab.',
      new Date('2026-08-26T12:00:00Z'), NOW
    )).toBe('"AVV_Contract-AI_v2.1.pdf" läuft am 26.08.2026 ab.');
  });

  test('am eigenen Tag bleibt "heute" unangetastet (dort stimmt es)', () => {
    expect(neutralizeRelativeDayWords(
      '"Vertrag.pdf" läuft heute ab.',
      new Date('2026-08-19T12:00:00Z'), NOW
    )).toBe('"Vertrag.pdf" läuft heute ab.');
  });

  test('überfällig (Vergangenheit) bleibt unangetastet — keine Rück-Datierung', () => {
    expect(neutralizeRelativeDayWords(
      'Heute ist die letzte Chance.',
      new Date('2026-08-10T12:00:00Z'), NOW
    )).toBe('Heute ist die letzte Chance.');
  });

  test('Satzanfang "Heute" wird großgeschrieben ersetzt ("Am …")', () => {
    expect(neutralizeRelativeDayWords(
      'Heute ist die letzte Chance, "X.pdf" zu kündigen.',
      new Date('2026-08-25T12:00:00Z'), NOW
    )).toBe('Am 25.08.2026 ist die letzte Chance, "X.pdf" zu kündigen.');
  });

  test('nur ganze Wörter: "heutzutage" bleibt unberührt', () => {
    expect(neutralizeRelativeDayWords(
      'Verträge sind heutzutage komplex.',
      new Date('2026-08-26T12:00:00Z'), NOW
    )).toBe('Verträge sind heutzutage komplex.');
  });

  test('mehrere Vorkommen werden alle ersetzt', () => {
    expect(neutralizeRelativeDayWords(
      'Heute passiert es: der Vertrag endet heute.',
      new Date('2026-08-26T12:00:00Z'), NOW
    )).toBe('Am 26.08.2026 passiert es: der Vertrag endet am 26.08.2026.');
  });

  test('robust bei fehlendem Text/Datum (nie werfen, Original zurück)', () => {
    expect(neutralizeRelativeDayWords(null, new Date(), NOW)).toBeNull();
    expect(neutralizeRelativeDayWords(undefined, new Date(), NOW)).toBeUndefined();
    expect(neutralizeRelativeDayWords('läuft heute ab', null, NOW)).toBe('läuft heute ab');
    expect(neutralizeRelativeDayWords('läuft heute ab', 'kein-datum', NOW)).toBe('läuft heute ab');
  });

  test('morgen/andere Wörter werden bewusst NICHT angefasst (kein Kollateralschaden)', () => {
    expect(neutralizeRelativeDayWords(
      'Guten Morgen! Ab morgen gilt der neue Tarif.',
      new Date('2026-08-26T12:00:00Z'), NOW
    )).toBe('Guten Morgen! Ab morgen gilt der neue Tarif.');
  });
});
