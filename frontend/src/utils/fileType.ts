// 📁 src/utils/fileType.ts
// 📄 20.08.2026 (Stufe 5 der Dateityp-Kette): EINE Stelle, die bestimmt, was für eine
// Datei ein Vertrag ist. Vorher lag eine halbe Variante davon lokal in ContractsV2
// (`getFileType`, kannte nur PDF und DOC) und der Rest der Oberfläche nahm einfach an,
// alles sei eine PDF.
//
// Warum das nötig war: 136 von 843 Verträgen sind gar keine PDF (102 Word, 32 Bilder,
// 1 ZIP, 1 ODT), also jeder sechste. Die Oberfläche zeigte trotzdem überall ein
// PDF-Symbol, „PDF anzeigen" und öffnete einen PDF-Betrachter, der dann zwangsläufig
// mit „Fehler beim Laden des PDF-Dokuments" abbrach.
//
// Quelle der Wahrheit ist `contract.mimetype`. Das Feld wird seit dem 19.08. beim
// Hochladen aus dem Datei-INHALT bestimmt (Magic Bytes, nicht der Dateiname) und
// wurde am 20.08. für den Bestand nachgezogen: 808 von 850 Verträgen tragen es.
// Für die restlichen (alte Dateien ohne lesbaren Inhalt) fällt der Helfer auf die
// Dateiendung zurück.
//
// ⚠️ WICHTIGSTE REGEL — FAIL-SAFE IN RICHTUNG PDF:
// Wenn wir den Typ NICHT sicher bestimmen können, gilt die Datei als PDF. Grund:
// 79 % aller Verträge SIND PDFs. Eine Datei fälschlich als „keine PDF" einzustufen
// würde eine heute funktionierende Ansicht aussperren — das wäre eine echte
// Verschlechterung. Eine Datei fälschlich als PDF einzustufen lässt nur den bereits
// bekannten Fehler stehen. Deshalb ist die unsichere Richtung immer „PDF".

export type FileVariant = 'pdf' | 'doc' | 'image' | 'other';

export interface FileTypeInfo {
  /** Kurzes Kennzeichen für Listen-Badges: PDF / DOC / BILD / DATEI */
  label: string;
  variant: FileVariant;
  /** Der entscheidende Wert: Nur bei true darf ein PDF-Betrachter geöffnet werden. */
  isPdf: boolean;
  /** Beschriftung für den Öffnen-Knopf, statt des früheren festen „PDF anzeigen". */
  actionLabel: string;
}

const PDF_MIME = 'application/pdf';
const WORD_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const INFO: Record<FileVariant, Omit<FileTypeInfo, 'isPdf'>> = {
  pdf:   { label: 'PDF',   variant: 'pdf',   actionLabel: 'PDF anzeigen' },
  doc:   { label: 'DOC',   variant: 'doc',   actionLabel: 'Dokument öffnen' },
  image: { label: 'BILD',  variant: 'image', actionLabel: 'Bild anzeigen' },
  other: { label: 'DATEI', variant: 'other', actionLabel: 'Datei öffnen' },
};

const bauen = (v: FileVariant): FileTypeInfo => ({ ...INFO[v], isPdf: v === 'pdf' });

/** Endung → Variante. Unbekannt ergibt null, damit der Aufrufer fail-safe entscheiden kann. */
function ausEndung(name?: string | null): FileVariant | null {
  if (!name || typeof name !== 'string') return null;
  const punkt = name.trim().lastIndexOf('.');
  if (punkt <= 0 || punkt === name.trim().length - 1) return null;
  const e = name.trim().slice(punkt + 1).toLowerCase();
  if (e === 'pdf') return 'pdf';
  if (e === 'doc' || e === 'docx' || e === 'odt' || e === 'rtf') return 'doc';
  if (e === 'png' || e === 'jpg' || e === 'jpeg' || e === 'gif' || e === 'webp' || e === 'heic') return 'image';
  if (e === 'zip') return 'other';
  return null;
}

/** MIME-Typ → Variante. Unbekannt ergibt null. */
function ausMime(mime?: string | null): FileVariant | null {
  if (!mime || typeof mime !== 'string') return null;
  const m = mime.trim().toLowerCase();
  if (m === PDF_MIME) return 'pdf';
  if (WORD_MIMES.includes(m)) return 'doc';
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/zip' || m.startsWith('application/vnd.oasis.opendocument')) return 'other';
  return null;
}

/**
 * Bestimmt den Dateityp eines Vertrags.
 * Reihenfolge: gespeicherter MIME-Typ (aus dem Datei-Inhalt) → Dateiendung → PDF.
 */
export function getFileTypeInfo(
  contract?: { mimetype?: string | null; name?: string | null } | null
): FileTypeInfo {
  if (!contract) return bauen('pdf'); // fail-safe, siehe Kopf
  return bauen(ausMime(contract.mimetype) ?? ausEndung(contract.name) ?? 'pdf');
}

/**
 * Kurzform für die Viewer-Sperre. Genau dieser Aufruf gehört VOR jedes Öffnen eines
 * PDF-Betrachters (Modal, iframe, react-pdf).
 *
 * ⚠️ Nur für die ORIGINAL-Datei des Vertrags verwenden. Erzeugte PDFs (optimierter
 * Vertrag, signiertes Dokument, generierter Vertrag) sind IMMER echte PDFs — dort
 * darf diese Prüfung NICHT davorgeschaltet werden, sonst sperrt man eine heute
 * funktionierende Ansicht aus.
 */
export function canOpenInPdfViewer(
  contract?: { mimetype?: string | null; name?: string | null } | null
): boolean {
  return getFileTypeInfo(contract).isPdf;
}

/**
 * Kann der BROWSER diese Datei selbst anzeigen?
 *
 * Hintergrund (20.08.2026, Etappe 2a): `openSmartPDF` in ContractsV2 oeffnet aus
 * Pop-up-Gruenden SOFORT ein leeres Fenster und leitet es danach auf die Datei um.
 * Bei einer Word-Datei zeigt der Browser sie aber nicht an, er LAEDT SIE HERUNTER —
 * die Umleitung passiert nie und das Fenster haengt fuer immer auf "PDF wird
 * geladen...". Genau das hat Noah im Test gesehen.
 *
 * PDF und Bilder stellt jeder Browser selbst dar. Word, ZIP und Unbekanntes nicht.
 *
 * ⚠️ Wie bei canOpenInPdfViewer gilt: nur fuer die ORIGINAL-Datei. Ein signiertes
 * oder erzeugtes PDF ist IMMER eine echte PDF, auch wenn das Original Word war —
 * dort darf diese Pruefung nicht davor.
 */
export function canDisplayInBrowser(
  contract?: { mimetype?: string | null; name?: string | null } | null
): boolean {
  const v = getFileTypeInfo(contract).variant;
  return v === 'pdf' || v === 'image';
}
