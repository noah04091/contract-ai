// 📁 backend/utils/tokenShape.js
// 🔒 01.09.2026 (Kalender-Sync-Audit, Stufe 0): Form-Prüfung für JWT-Payloads.
//
// Alle Token-Familien der App sind mit DEMSELBEN JWT_SECRET signiert. Bis zu diesem
// Fix akzeptierte verifyToken deshalb JEDEN gültig signierten JWT als Login-Session —
// auch den Kalender-Sync-Token (365 Tage, liegt als Feed-URL bei Google/Apple/Outlook)
// und den Mail-Quick-Action-Token (7 Tage, steht im Klartext in jeder Erinnerungs-Mail).
// Beide tragen eine userId und wurden damit zum vollwertigen Konto-Zugriff.
//
// INVARIANTE (am 01.09.2026 gegen ALLE 7 jwt.sign-Stellen des Backends verifiziert):
//   • Session-Tokens tragen IMMER `email` + `userId` und NIE ein `type`-Feld.
//     Erzeuger: routes/auth.js (Login), routes/emailVerification.js,
//     routes/organizations.js (Einladung), middleware/verifyToken.js (Refresh).
//   • Zweck-Tokens tragen NIE `email` und `userId` zusammen:
//     calendar_sync {userId, type, nonce} · Quick-Action {eventId, userId} ·
//     Kampagnen-Tracking {c, r, t}.
// ⚠️ Wer eine NEUE Token-Familie einführt: niemals `email` + `userId` gemeinsam in
// die Payload legen (sonst wird der Token hier zur Login-Session), und diese Datei
// samt tests/unit/tokenShape.test.js ergänzen.

/**
 * Ist die Payload eine Login-Session? (email + userId vorhanden, kein Zweck-Feld `type`)
 * Die Schutzwirkung trägt die email-Pflicht — von den Zweck-Token-Familien hat nur
 * calendar_sync überhaupt ein `type`-Feld; der Ausschluss ist Zukunfts-Absicherung.
 */
function isSessionTokenPayload(decoded) {
  return !!decoded
    && typeof decoded === 'object'
    && !!decoded.email
    && !!decoded.userId
    && decoded.type === undefined;
}

/**
 * Ist die Payload ein Kalender-Sync-Feed-Token?
 * `type: 'calendar_sync'` steht seit dem allerersten Sync-Commit (8840313b) in jedem
 * je ausgegebenen Feed-Token — der Check kann keine Bestands-Abos brechen.
 */
function isCalendarSyncPayload(decoded) {
  return !!decoded
    && typeof decoded === 'object'
    && decoded.type === 'calendar_sync'
    && !!decoded.userId;
}

/**
 * Widerrufs-Abgleich: Der Feed liefert nur, wenn der übergebene Token-String exakt
 * der aktuell im users-Doc gespeicherte ist. Damit macht „Neuen Link generieren"
 * (POST /regenerate-sync-token überschreibt das Feld) alte Links WIRKLICH ungültig —
 * vorher blieb jeder je signierte Token bis zu 365 Tage nutzbar.
 * Null-sicher: fehlendes users-Doc oder fehlendes Feld → false (nie ein TypeError,
 * der als error.message im Kalender-Termin des Nutzers landen könnte).
 */
function isStoredSyncToken(tokenString, user) {
  return typeof tokenString === 'string'
    && tokenString.length > 0
    && !!user
    && typeof user.calendarSyncToken === 'string'
    && user.calendarSyncToken === tokenString;
}

module.exports = { isSessionTokenPayload, isCalendarSyncPayload, isStoredSyncToken };
