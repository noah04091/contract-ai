# 🧪 Smart Default Tests - Stufe 1

## Test-Szenarien zum Verifizieren

### ✅ Rechnungen (sollten BEIDE Tracker zeigen)

| Dateiname | Erwartung | Grund |
|-----------|-----------|-------|
| `Rechnung_Amazon.pdf` | 💳💰 BEIDE | "Rechnung" im Namen |
| `Invoice_PayPal.pdf` | 💳💰 BEIDE | "Invoice" im Namen |
| `Monatsrechnung_Telekom.pdf` | 💳💰 BEIDE | "Rechnung" im Namen |

---

### 💰 Abo-Verträge (sollten NUR Cost Tracker zeigen)

| Dateiname | Erwartung | Grund |
|-----------|-----------|-------|
| `Netflix_Abo.pdf` | 💰 NUR COST | "netflix" = sehr stark |
| `Spotify_Premium.pdf` | 💰 NUR COST | "spotify" = sehr stark |
| `Disney_Plus_Vertrag.pdf` | 💰 NUR COST | "disney" = sehr stark |
| `Mietvertrag_Wohnung.pdf` | 💰 NUR COST | "mietvertrag" = sehr stark |
| `Versicherung_KFZ.pdf` | 💰 NUR COST (wenn GPT recurring) | "versicherung" + GPT |
| `Telekom_Handyvertrag.pdf` | 💰 NUR COST (wenn GPT recurring) | "telekom" + GPT |
| `Fitnessstudio_McFit.pdf` | 💰 NUR COST (wenn GPT recurring) | "fitness" + GPT |

---

### 💳 Einmalige Verträge (sollten NUR Payment Tracker zeigen)

| Dateiname | Erwartung | Grund |
|-----------|-----------|-------|
| `Werkvertrag_Webdesign.pdf` | 💳 NUR PAYMENT (wenn GPT one-time) | "werkvertrag" + GPT |
| `Kaufvertrag_Auto.pdf` | 💳 NUR PAYMENT (wenn GPT one-time) | "kaufvertrag" + GPT |

---

### 💳💰 Fallback (sollten BEIDE Tracker zeigen)

| Dateiname | Erwartung | Grund |
|-----------|-----------|-------|
| `Vertrag_2024.pdf` | 💳💰 BEIDE | Keine Keywords, Default |
| `Dokument_XYZ.pdf` | 💳💰 BEIDE | Keine Keywords, Default |
| `Arbeitsvertrag_2024.pdf` | 💳💰 BEIDE | Keine passenden Keywords |

---

## 🎯 Wichtige Edge Cases

### Edge Case 1: Rechnung überschreibt ALLES
```
Dateiname: "Rechnung_Netflix_Abo.pdf"
Erwartung: 💳💰 BEIDE Tracker
Grund: "Rechnung" hat höchste Priorität, überschreibt "Netflix"
```

### Edge Case 2: Sehr starke Keywords ohne GPT
```
Dateiname: "Netflix_Vertrag.pdf"
GPT erkennt: null (unklar)
Erwartung: 💰 NUR COST
Grund: "netflix" ist so stark, dass es auch ohne GPT funktioniert
```

### Edge Case 3: Keyword + falscher GPT-Typ
```
Dateiname: "Netflix_Abo.pdf"
GPT erkennt: one-time (falsch!)
Erwartung: 💳💰 BEIDE
Grund: GPT sagt "one-time", aber kein oneTimeKeyword → Fallback
```

---

## ✅ Test-Checkliste

Teste diese Szenarien nach Deploy:

- [ ] Rechnung hochladen → Beide Tracker ✅
- [ ] Netflix-Abo hochladen → Nur Cost Tracker ✅
- [ ] Mietvertrag hochladen → Nur Cost Tracker ✅
- [ ] Unklares Dokument → Beide Tracker (Fallback) ✅
- [ ] Werkvertrag hochladen → Prüfen was passiert
- [ ] Console-Logs checken: Richtige Entscheidungen?

---

## 📊 Erwartete Verbesserungen

**Vorher:**
- Alle unklar → Beide Tracker (zu viel Info)

**Nachher:**
- Netflix → Nur Cost (optimal! ✅)
- Spotify → Nur Cost (optimal! ✅)
- Mietvertrag → Nur Cost (optimal! ✅)
- Rechnung → Beide (richtig! ✅)
- Unbekannt → Beide (sicher! ✅)

**Geschätzte Optimierung:** 40-50% der Fälle jetzt optimal statt Fallback!
