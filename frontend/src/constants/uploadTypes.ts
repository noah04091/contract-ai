// 📁 frontend/src/constants/uploadTypes.ts
// 🎯 EINE Quelle für die Frage "welche Datei darf hochgeladen werden?"
//
// Warum es diese Datei gibt (24.08.2026):
// Der erste Upload eines neuen Nutzers war an ZWEI Stellen unabhängig
// implementiert — im Onboarding-Fenster und im Erststart auf dem Dashboard.
// Beide führten eigene Listen, und die Listen sind auseinandergelaufen:
// Das Onboarding erlaubte nur PDF und neues Word, der Erststart zusätzlich
// Fotos und altes .doc. Wer seinen Vertrag mit dem Handy fotografiert hat,
// wurde ausgerechnet beim allerersten Schritt abgewiesen, obwohl das übrige
// Produkt Fotos annimmt.
//
// Maßgeblich ist das Backend: POST /api/upload hat KEINEN Typfilter, nur ein
// Größenlimit von 50 MB (routes/upload.js). Die Analyse verarbeitet PDF, Word
// und Bilder (Bilder über OCR).
//
// ⚠️ NICHT verwechseln mit SUPPORTED_MIMETYPES in backend/services/textExtractor.js.
// Die Liste ist zwischen Compare, LegalLens, Optimizer und Builder geteilt und darf
// NIEMALS für Bilder geöffnet werden, sonst zerschellen diese Wege an pdf-parse.
// Hier geht es ausschließlich um die Vorprüfung im Browser.

export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB, wie im Backend

/** MIME-Typen, die der Browser für erlaubte Dateien meldet. */
export const ACCEPTED_UPLOAD_MIMETYPES = [
  'application/pdf',
  'application/msword',                                                      // altes .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const;

/** Dateiendungen als Rückfallebene und für das accept-Attribut. */
export const ACCEPTED_UPLOAD_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp',
] as const;

/** Fertiger Wert für <input type="file" accept="…"> */
export const UPLOAD_ACCEPT_ATTR = ACCEPTED_UPLOAD_EXTENSIONS.join(',');

/**
 * Prüft eine Datei vor dem Upload.
 *
 * ⚠️ Die Endungs-Rückfallebene ist kein Schönheitswerk: Für HEIC und HEIF liefert
 * `file.type` je nach Browser einen leeren String. Eine reine MIME-Prüfung hätte
 * damit genau die iPhone-Fotos abgewiesen, für die der Foto-Upload gebaut wurde.
 *
 * Gibt null zurück, wenn alles in Ordnung ist, sonst den fertigen Fehlertext.
 */
export function checkUploadFile(file: File): string | null {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  const typeOk = (ACCEPTED_UPLOAD_MIMETYPES as readonly string[]).includes(type);
  const extOk = (ACCEPTED_UPLOAD_EXTENSIONS as readonly string[]).some((ext) => name.endsWith(ext));

  if (!typeOk && !extOk) {
    return 'Bitte eine PDF-, Word- oder Bilddatei auswählen.';
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return 'Die Datei ist größer als 50 MB.';
  }

  if (file.size === 0) {
    return 'Die Datei ist leer.';
  }

  return null;
}
