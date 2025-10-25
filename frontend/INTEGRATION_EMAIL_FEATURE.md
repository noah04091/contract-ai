# 📧 E-Mail-Feature Integration in Contracts.tsx

## 🎯 Ziel

Das EmailInboxWidget in die Contracts-Seite einbauen, damit User ihre persönliche Upload-E-Mail-Adresse sehen und verwalten können.

---

## 🚀 Schritt-für-Schritt Anleitung

### 1. Import hinzufügen

Öffne `frontend/src/pages/Contracts.tsx` und füge am Anfang der Datei hinzu:

```typescript
import EmailInboxWidget from "../components/EmailInboxWidget"; // ← NEU
```

### 2. State für E-Mail-Inbox erweitern

Suche nach der Zeile wo `userInfo` State definiert ist (ca. Zeile 143) und erweitere:

```typescript
// ✅ Erweitere UserInfo Interface (ca. Zeile 111)
interface UserInfo {
  subscriptionPlan: 'free' | 'business' | 'premium';
  isPremium: boolean;
  analysisCount: number;
  analysisLimit: number;
  // ⭐ NEU für E-Mail-Inbox
  emailInboxAddress?: string | null;
  emailInboxEnabled?: boolean;
}
```

### 3. User-Info Fetch anpassen

Suche nach der `fetchUserInfo` Funktion oder dem useEffect, der `/api/auth/me` aufruft (sollte vorhanden sein, da Contracts.tsx den User-Plan anzeigt).

Erweitere die Funktion, um die E-Mail-Inbox Daten zu speichern:

```typescript
const fetchUserInfo = async () => {
  try {
    const response = await apiCall("/api/auth/me");

    setUserInfo({
      subscriptionPlan: response.user.subscriptionPlan || 'free',
      isPremium: response.user.isPremium || false,
      analysisCount: response.user.analysisCount || 0,
      analysisLimit: response.user.analysisLimit || 3,
      // ⭐ NEU
      emailInboxAddress: response.user.emailInboxAddress || null,
      emailInboxEnabled: response.user.emailInboxEnabled ?? true
    });
  } catch (error) {
    console.error("Fehler beim Laden der User-Info:", error);
  }
};
```

**Falls** deine Contracts.tsx noch **keinen** User-Info Fetch hat, füge diesen useEffect hinzu:

```typescript
// Nach den anderen useEffects (ca. Zeile 250+)
useEffect(() => {
  fetchUserInfo();
}, []);
```

### 4. Widget in JSX einbauen

Suche nach dem Upload-Button oder der Upload-Section in der JSX (ca. Zeile 600-800, je nach deiner Datei).

Füge das Widget **VOR** oder **NACH** dem Upload-Bereich ein:

```tsx
{/* ✅ NEU: E-Mail-Inbox Widget */}
{userInfo.emailInboxAddress && (
  <EmailInboxWidget
    emailInboxAddress={userInfo.emailInboxAddress}
    emailInboxEnabled={userInfo.emailInboxEnabled ?? true}
    onUpdate={fetchUserInfo} // Lädt User-Daten neu nach Toggle/Regenerate
  />
)}

{/* Bestehender Upload-Button/Section bleibt unverändert */}
<div className={styles.uploadSection}>
  {/* ... dein bestehender Code ... */}
</div>
```

**Empfohlene Platzierung:**
- **Oben** in der Seite (direkt nach dem Page-Header, vor der Contract-Liste)
- **ODER** in einer Sidebar (falls vorhanden)

---

## 🎨 Alternatives Placement (falls du keine separate Section willst)

Falls du das Widget lieber **IN** einer bestehenden Card/Section haben willst:

```tsx
<div className={styles.actionsBar}>
  {/* Bestehende Actions (Filter, Search, etc.) */}

  {/* ✅ NEU: Kompaktes E-Mail-Widget (inline) */}
  {userInfo.emailInboxAddress && (
    <EmailInboxWidget
      emailInboxAddress={userInfo.emailInboxAddress}
      emailInboxEnabled={userInfo.emailInboxEnabled ?? true}
      onUpdate={fetchUserInfo}
    />
  )}
</div>
```

---

## ✅ Fertig!

Nach diesen Änderungen sollte das E-Mail-Widget auf der Contracts-Seite erscheinen und:

- ✅ E-Mail-Adresse anzeigen
- ✅ Copy-Button funktioniert
- ✅ Regenerate-Button funktioniert
- ✅ Toggle (aktivieren/deaktivieren) funktioniert
- ✅ Tutorial-Modal öffnet sich beim Klick auf das Fragezeichen

---

## 🧪 Testen

1. Starte Frontend: `npm run dev`
2. Navigiere zu `/contracts`
3. Du solltest das lila E-Mail-Widget sehen
4. Klicke auf **Copy** → Adresse sollte kopiert werden
5. Klicke auf **?** → Tutorial-Modal sollte sich öffnen
6. Klicke auf **Power-Icon** → Widget sollte grau werden (deaktiviert)

---

## 🔧 Troubleshooting

**Widget wird nicht angezeigt:**
- Checke ob `userInfo.emailInboxAddress` gesetzt ist
- Öffne DevTools Console → schaue ob `/api/auth/me` die neuen Felder zurückgibt
- Falls nicht: Backend könnte noch nicht gestartet sein oder User-Migration fehlt

**"Cannot read property 'emailInboxAddress' of undefined":**
- Du musst zuerst `fetchUserInfo()` aufrufen, bevor du das Widget renderst
- Nutze `{userInfo.emailInboxAddress && <EmailInboxWidget ... />}` (conditional rendering)

**Toggle/Regenerate funktioniert nicht:**
- Checke Network-Tab: Sollte PUT/POST zu `/api/auth/email-inbox/...` sichtbar sein
- Wenn 401/404: Backend-Route fehlt oder verifyToken Middleware blockt

---

## 📸 Screenshot (Erwartetes Ergebnis)

```
┌────────────────────────────────────────────┐
│ Contracts                         [Upload] │
├────────────────────────────────────────────┤
│                                            │
│ ┌──────────────────────────────────────┐   │
│ │ 📧 E-Mail-Upload              [?]    │   │
│ │                                      │   │
│ │ Leite E-Mails mit Verträgen einfach │   │
│ │ an deine persönliche Adresse weiter:│   │
│ │                                      │   │
│ │ ┌────────────────────────────────┐  │   │
│ │ │ u_abc123.def456@upload.c-a.de │  │   │
│ │ │                    [📋][🔁][⚡]│  │   │
│ │ └────────────────────────────────┘  │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ [Filter] [Search]                         │
│                                            │
│ Vertrag 1                                  │
│ Vertrag 2                                  │
│ ...                                        │
└────────────────────────────────────────────┘
```

---

Fertig! 🎉 Das Feature ist jetzt voll integriert.
