# 📅 Kalender Features - Test Plan

## Implementierte Features

### ✅ Option 1: Reminder-Einstellungen
### ✅ Option 2: Dashboard-Widget mit kommenden Deadlines
### ✅ Option 3: Woche/Tag-Ansicht für Kalender
### ✅ Option 4: Recurring Events für wiederkehrende Zahlungen

---

## 🧪 Test-Szenarien

### 1. **Reminder-Einstellungen Testen**

#### Test 1.1: Reminder-Modal öffnen
- [ ] Vertrag im Dashboard öffnen
- [ ] "Erinnerungen" Button klicken
- [ ] ReminderSettingsModal öffnet sich

#### Test 1.2: Custom Reminders hinzufügen
- [ ] Tags eingeben: 7, 14, 30, 60
- [ ] Tags werden als Chips angezeigt
- [ ] Speichern klicken
- [ ] Success-Message erscheint

#### Test 1.3: Reminder-Events im Kalender prüfen
- [ ] Kalender öffnen
- [ ] Custom Reminder Events werden angezeigt
- [ ] Filter "Erinnerungen" aktivieren
- [ ] Nur Custom Reminders sichtbar

---

### 2. **Dashboard-Widget Testen**

#### Test 2.1: Widget Anzeige
- [ ] Dashboard öffnen
- [ ] "Kommende Deadlines" Widget ist sichtbar
- [ ] Zeigt nächste 5 Events
- [ ] Events sind nach Datum sortiert

#### Test 2.2: Navigation zum Kalender
- [ ] Event im Widget klicken
- [ ] Wird zum Kalender weitergeleitet
- [ ] Event-Details öffnen sich automatisch

#### Test 2.3: Severity-Farbcodierung
- [ ] Kritische Events haben rote Border
- [ ] Warnung Events haben orange Border
- [ ] Info Events haben blaue Border

---

### 3. **Woche/Tag-Ansicht Testen**

#### Test 3.1: View-Toggle
- [ ] Kalender öffnen (Standard: Monatsansicht)
- [ ] "Woche" Button klicken → Wochenansicht öffnet sich
- [ ] "Tag" Button klicken → Tagesansicht öffnet sich
- [ ] "Monat" Button klicken → Zurück zur Monatsansicht
- [ ] Aktiver Button ist visuell hervorgehoben

#### Test 3.2: Wochenansicht Navigation
- [ ] Wochenansicht öffnen
- [ ] 7 Tage (Mo-So) werden angezeigt
- [ ] Heute ist visuell hervorgehoben
- [ ] Events werden in Tagen angezeigt
- [ ] "Vorherige Woche" Pfeil → Eine Woche zurück
- [ ] "Nächste Woche" Pfeil → Eine Woche vorwärts

#### Test 3.3: Wochenansicht Event-Interaktion
- [ ] Event in Wochenansicht klicken
- [ ] Event-Details Modal öffnet sich
- [ ] Tag in Wochenansicht klicken
- [ ] Wechselt zur Tagesansicht für diesen Tag

#### Test 3.4: Tagesansicht Navigation
- [ ] Tagesansicht öffnen
- [ ] Datum wird angezeigt (z.B. "Montag, 1. Januar 2025")
- [ ] "Heute" Badge wird angezeigt (wenn aktueller Tag)
- [ ] Events werden als Timeline angezeigt
- [ ] Severity-Summary zeigt Breakdown (X Kritisch, Y Warnung, Z Info)
- [ ] "Vorheriger Tag" Pfeil → Ein Tag zurück
- [ ] "Nächster Tag" Pfeil → Ein Tag vorwärts

#### Test 3.5: Tagesansicht Event-Details
- [ ] Jedes Event zeigt Zeit, Titel, Vertrag, Beschreibung
- [ ] Event klicken öffnet Quick Actions Modal
- [ ] Leerer Tag zeigt "Keine Ereignisse" Message

#### Test 3.6: Responsive Design
- [ ] Desktop (>1024px): Alle Views funktionieren
- [ ] Tablet (768-1024px): Layout passt sich an
- [ ] Mobile (<768px):
  - [ ] View-Toggle zeigt nur Icons (ohne Text)
  - [ ] Wochenansicht zeigt 4 Spalten
  - [ ] Tagesansicht zeigt kompakte Event-Cards

---

### 4. **Recurring Payment Events Testen**

#### Test 4.1: Vertrag mit paymentFrequency erstellen
**Backend-Test (MongoDB):**
```javascript
{
  name: "Netflix Abonnement",
  amount: 15.99,
  paymentFrequency: "monthly",
  subscriptionStartDate: "2025-01-01",
  userId: ObjectId("...")
}
```
- [ ] Vertrag in DB erstellen
- [ ] Events regenerieren (`POST /api/calendar/regenerate-all`)
- [ ] RECURRING_PAYMENT Events werden generiert

#### Test 4.2: Event-Generierung für verschiedene Frequenzen
Teste folgende paymentFrequency Werte:
- [ ] "weekly" → Events alle 7 Tage
- [ ] "monthly" → Events jeden Monat am gleichen Tag
- [ ] "quarterly" → Events alle 3 Monate
- [ ] "yearly" → Events jährlich

#### Test 4.3: Payment-Reminders
- [ ] Vertrag mit amount >= 50€ erstellen
- [ ] Prüfen, dass PAYMENT_REMINDER Events 3 Tage vor Zahlung generiert werden
- [ ] Vertrag mit amount < 50€ erstellen
- [ ] Prüfen, dass KEINE Payment-Reminders generiert werden

#### Test 4.4: Kalender-Anzeige
- [ ] Kalender öffnen
- [ ] Filter "Zahlungen" aktivieren
- [ ] Nur RECURRING_PAYMENT Events sichtbar
- [ ] Events zeigen Betrag in Beschreibung
- [ ] Icons sind korrekt (BarChart3 für Zahlungen, Bell für Reminders)

#### Test 4.5: 12-Monats-Limit
- [ ] Vertrag mit "monthly" Frequenz erstellen
- [ ] Prüfen, dass maximal ~12 Payment-Events generiert werden
- [ ] Keine Events für >12 Monate in der Zukunft

#### Test 4.6: Historische Verträge
- [ ] Vertrag mit subscriptionStartDate in Vergangenheit erstellen
- [ ] System sollte nächstes zukünftiges Zahlungsdatum berechnen
- [ ] Events nur für Zukunft generieren

---

### 5. **Filter & Quick Actions Testen**

#### Test 5.1: Severity-Filter
- [ ] "Alle Dringlichkeiten" → Alle Events sichtbar
- [ ] "Kritisch" → Nur critical Events
- [ ] "Warnung" → Nur warning Events
- [ ] "Info" → Nur info Events

#### Test 5.2: Event-Type Filter
- [ ] "Alle Ereignisse" → Alle Types
- [ ] "Kündigungsfenster" → Nur CANCEL_WINDOW_OPEN
- [ ] "Letzte Chance" → Nur LAST_CANCEL_DAY
- [ ] "Preiserhöhung" → Nur PRICE_INCREASE
- [ ] "Verlängerung" → Nur AUTO_RENEWAL
- [ ] "Zahlungen" → Nur RECURRING_PAYMENT
- [ ] "Zahlungserinnerung" → Nur PAYMENT_REMINDER
- [ ] "Erinnerungen" → Nur CUSTOM_REMINDER
- [ ] "Review" → Nur REVIEW

#### Test 5.3: Quick Actions Modal
- [ ] Event klicken öffnet Quick Actions
- [ ] "Vertrag anzeigen" navigiert zu /contracts?view={contractId}
- [ ] "Kündigen" Button nur bei suggestedAction="cancel"
- [ ] "Vergleichen", "Optimieren", "Später" Buttons funktionieren

---

### 6. **Events Regenerieren**

#### Test 6.1: Regenerate Button
- [ ] "Events neu generieren" Button klicken
- [ ] Loading-State wird angezeigt
- [ ] Events werden neu berechnet
- [ ] Success-Message erscheint
- [ ] Kalender zeigt aktualisierte Events

---

### 7. **Edge Cases**

#### Test 7.1: Keine Events
- [ ] User ohne Verträge
- [ ] Kalender zeigt "Keine Ereignisse" Message

#### Test 7.2: Viele Events an einem Tag
- [ ] Tag mit >10 Events erstellen
- [ ] Wochenansicht zeigt "+X weitere"
- [ ] Tagesansicht zeigt alle Events mit Scroll

#### Test 7.3: Timezone-Handling
- [ ] Events werden in lokaler Timezone angezeigt
- [ ] Keine Datum-Verschiebungen durch UTC-Konvertierung

#### Test 7.4: Abgelaufene Verträge
- [ ] Vertrag mit expiryDate in Vergangenheit
- [ ] Keine Events generiert (außer wenn isAutoRenewal=true)

---

## 🐛 Bekannte Bugs (falls gefunden)

### Bug-Tracking
- [ ] Bug 1: ...
- [ ] Bug 2: ...

---

## ✅ Erfolgreiche Tests

### Feature-Completion
- [ ] Alle Option 1 Tests bestanden
- [ ] Alle Option 2 Tests bestanden
- [ ] Alle Option 3 Tests bestanden
- [ ] Alle Option 4 Tests bestanden
- [ ] Filter & Quick Actions funktionieren
- [ ] Responsive Design auf allen Geräten

---

## 📊 Performance-Tests

### Ladezeiten
- [ ] Kalender lädt in <2s (mit 100+ Events)
- [ ] View-Wechsel erfolgt instantan
- [ ] Filter-Anwendung erfolgt ohne Verzögerung

### API-Performance
- [ ] GET /api/calendar/events antwortet in <500ms
- [ ] POST /api/calendar/regenerate-all in <3s (für 50 Verträge)

---

## 🚀 Deployment-Checklist

- [ ] Frontend Build erfolgreich
- [ ] Backend Tests bestanden
- [ ] Alle Features funktional getestet
- [ ] Responsive Design verifiziert
- [ ] Edge Cases behandelt
- [ ] Performance akzeptabel
- [ ] Commit erstellt & gepushed
- [ ] Changelog aktualisiert

---

**Test durchgeführt am:** [DATUM]
**Tester:** [NAME]
**Status:** ✅ Bereit für Production / ⚠️ Bugs gefunden / ❌ Fehlgeschlagen
