# MongoDB Collection: `contract_generations`

## Zweck
Speichert alle Artefakte der V2 Zwei-Phasen-Vertragsgenerierung für Auditierbarkeit, Debugging und Qualitätssicherung.

## Collection Name
```javascript
db.contract_generations
```

## Index-Strategie
```javascript
// Primär-Index
{ "_id": 1 }

// Sekundär-Indizes für Performance
{ "userId": 1, "meta.createdAt": -1 }  // User-History (neueste zuerst)
{ "contractType": 1 }                   // Typ-basierte Analysen
{ "phase2.selfCheck.score": 1 }         // Qualitäts-Monitoring
{ "meta.featureFlag": 1 }               // V1 vs V2 Vergleiche
```

## Schema-Struktur

```javascript
{
  // ===== IDENTIFIKATION =====
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),              // Referenz zu users Collection
  "contractType": "mietvertrag",          // "mietvertrag" | "freelancer" | "kaufvertrag" | ...

  // ===== EINGABEDATEN (Raw Input) =====
  "input": {
    // Rohformular-Daten, unverändert wie vom Frontend gesendet
    "title": "Mietvertrag Wohnung Musterstraße",
    "parteiA": {
      "name": "Max Mustermann GmbH",
      "address": "Musterstraße 1, 12345 Musterstadt",
      "details": "HRB 12345, USt-IdNr. DE123456789"
    },
    "parteiB": {
      "name": "Erika Musterfrau",
      "address": "Beispielweg 2, 54321 Beispielstadt"
    },
    "mietobjekt": "3-Zimmer-Wohnung, 2. OG, 85 qm",
    "mietbeginn": "2025-01-01",
    "miete": "950.00",
    "nebenkosten": "200.00",
    "kaution": "2850.00",
    "customRequirements": "Haustiere nach Absprache erlaubt",
    // ... weitere Felder je nach Vertragstyp
  },

  // ===== PHASE 1: META-PROMPT GENERATION =====
  "phase1": {
    "generatedPrompt": "Erstelle einen vollständigen Mietvertrag...",  // VOLLSTÄNDIGER Prompt-Text für Phase 2

    "snapshot": {
      "roles": {
        "A": "Vermieter",
        "B": "Mieter"
      },
      "mustClauses": [
        "§ 1 Mietgegenstand",
        "§ 2 Mietzeit",
        "§ 3 Miete und Nebenkosten",
        "§ 4 Kaution",
        "§ 5 Gebrauch der Mietsache",
        "§ 6 Instandhaltung und Instandsetzung",
        "§ 7 Untervermietung",
        "§ 8 Schönheitsreparaturen",
        "§ 9 Kündigung",
        "§ 10 Rückgabe der Mietsache",
        "§ 11 Schlussbestimmungen"
      ],
      "forbiddenTopics": [
        "Garten",
        "Balkon",
        "Stellplatz"
        // Haustiere NICHT in Liste, da in customRequirements genannt!
      ],
      "customRequirements": [
        "Haustiere nach Absprache erlaubt"
      ]
    },

    "timingMs": 2341,                      // Dauer Phase 1 in Millisekunden
    "model": "gpt-4o-mini",                   // Verwendetes Modell
    "temperature": 0.25,                   // Temperature-Setting
    "tokenCount": {
      "prompt": 856,
      "completion": 1243,
      "total": 2099
    }
  },

  // ===== PHASE 2: CONTRACT TEXT GENERATION =====
  "phase2": {
    "contractText": "=================================\nMIETVERTRAG\n=================================\n\nzwischen...",  // Vollständiger Vertragstext

    "selfCheck": {
      "conforms": true,                    // true = Vertrag entspricht Vorgaben
      "score": 0.97,                       // 0.0 - 1.0 (Threshold: 0.93)
      "notes": [
        "Alle Must-Clauses vorhanden",
        "Forbidden Topics vermieden",
        "Rollen korrekt verwendet (Vermieter/Mieter)",
        "CustomRequirements integriert (Haustiere-Klausel in § 5)"
      ]
    },

    "retries": 0,                          // Anzahl Retries (0 = erfolgreich beim ersten Mal)
    "timingMs": 4567,                      // Dauer Phase 2 in Millisekunden
    "model": "gpt-4o",                     // Verwendetes Modell
    "temperature": 0.05,                   // Temperature-Setting (sehr deterministisch!)
    "tokenCount": {
      "prompt": 1243,
      "completion": 3456,
      "total": 4699
    }
  },

  // ===== VALIDATOR (Deterministisch, JS-basiert) =====
  "validator": {
    "passed": true,                        // true = alle Checks bestanden
    "checks": {
      "rolesCorrect": true,                // Nur "Vermieter"/"Mieter" gefunden
      "paragraphsSequential": true,        // § 1, § 2, ... § 11 lückenlos
      "forbiddenTopicsAbsent": true,       // Keine "Garten", "Balkon", "Stellplatz"
      "dateFormatValid": true,             // Datum im Format YYYY-MM-DD
      "currencyFormatValid": true          // EUR-Beträge erkennbar
    },
    "warnings": [],                        // Leere Liste = keine Warnungen
    "errors": []                           // Leere Liste = keine Fehler
  },

  // ===== METADATEN =====
  "meta": {
    "model": "gpt-4o",                     // Primary model für Phase 2
    "temperature": 0.05,                   // Primary temperature
    "createdAt": ISODate("2025-11-05T15:30:45.123Z"),
    "durationMs": 6908,                    // Gesamt-Dauer (Phase 1 + Phase 2 + Self-Check)
    "featureFlag": true,                   // GENERATE_V2_META_PROMPT war aktiv
    "version": "v2.0.0",                   // Version des V2-Systems
    "ip": "185.123.45.67",                 // Client IP (für Abuse-Detection)
    "userAgent": "Mozilla/5.0..."          // Browser-Info (optional)
  }
}
```

## Beispiel-Query: Qualitäts-Monitoring

```javascript
// Finde alle Generierungen mit niedrigem Self-Check Score
db.contract_generations.find({
  "phase2.selfCheck.score": { $lt: 0.93 }
}).sort({ "meta.createdAt": -1 })

// Durchschnittlicher Score pro Vertragstyp
db.contract_generations.aggregate([
  { $group: {
    _id: "$contractType",
    avgScore: { $avg: "$phase2.selfCheck.score" },
    count: { $sum: 1 }
  }},
  { $sort: { avgScore: -1 } }
])

// Retries analysieren
db.contract_generations.find({
  "phase2.retries": { $gt: 0 }
}).count()
```

## Retention Policy

- **Production:** 90 Tage (nach DSGVO Art. 17)
- **Staging:** 30 Tage
- **Development:** 7 Tage

Auto-Cleanup via TTL-Index:
```javascript
db.contract_generations.createIndex(
  { "meta.createdAt": 1 },
  { expireAfterSeconds: 7776000 }  // 90 Tage
)
```

## Datenschutz (DSGVO)

- **Personenbezogene Daten:** In `input` Feld (Namen, Adressen)
- **Anonymisierung:** Bei User-Löschung → `userId` auf `null` setzen, `input` Feld anonymisieren
- **Right to be Forgotten:** User kann Löschung aller `contract_generations` anfragen

```javascript
// Anonymisierung bei User-Löschung
db.contract_generations.updateMany(
  { userId: ObjectId("USER_ID") },
  {
    $set: {
      userId: null,
      "input.parteiA.name": "[ANONYMISIERT]",
      "input.parteiB.name": "[ANONYMISIERT]",
      // ... weitere PII-Felder
    }
  }
)
```
