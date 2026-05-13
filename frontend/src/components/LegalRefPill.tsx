// Legal-Reference-Pille — klickbare Pille bei jedem Finding mit legalBasis.
// Klick öffnet externe offizielle Quelle (gesetze-im-internet.de) in neuem Tab.
//
// Anti-Halluzinations-Verhalten:
// - Wenn Parser den String nicht versteht → render Plain-Text-Fallback (oder children)
// - Wenn Werk nicht in Slug-Map → render Plain-Text-Fallback (kein Fake-Link)
// - Slug-Map noch nicht geladen → render Plain-Text-Fallback (Hook lädt im Hintergrund)

import { ExternalLink } from "lucide-react";
import { parseLegalRef, useLegalSlugMap } from "../utils/legalReferenceParser";

interface Props {
  /** Der legalBasis-String aus der Analyse, z.B. „§ 309 Nr. 7 BGB" */
  reference: string | null | undefined;
  /** Optionaler className um Style des umgebenden Tags zu übernehmen */
  className?: string;
  /** Plain-Text-Fallback-Klassenname (wenn keine Pille gerendert werden kann) */
  fallbackClassName?: string;
}

export default function LegalRefPill({ reference, className, fallbackClassName }: Props) {
  const slugMap = useLegalSlugMap();
  const parsed = parseLegalRef(reference, slugMap);

  // Anti-Halluzination: bei null einfach Plain-Text rendern (oder gar nichts wenn auch das fehlt)
  if (!parsed || !parsed.url) {
    if (!reference) return null;
    return <span className={fallbackClassName || className}>{reference}</span>;
  }

  const ariaLabel = parsed.fullTitle
    ? `Externer Link zu § ${parsed.paragraph} ${parsed.abbreviation} — ${parsed.fullTitle}, öffnet in neuem Tab`
    : `Externer Link zu ${parsed.raw}, öffnet in neuem Tab`;

  return (
    <a
      href={parsed.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel}
      title={parsed.fullTitle || parsed.raw}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 5,
        color: "#2563eb",
        fontSize: "11.5px",
        fontWeight: 600,
        textDecoration: "none",
        fontFamily: "ui-monospace, monospace",
        letterSpacing: "0.2px",
        transition: "background 150ms ease, border-color 150ms ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#dbeafe";
        e.currentTarget.style.borderColor = "#93c5fd";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#eff6ff";
        e.currentTarget.style.borderColor = "#bfdbfe";
      }}
    >
      <span>{reference}</span>
      <ExternalLink size={10} aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }} />
    </a>
  );
}
