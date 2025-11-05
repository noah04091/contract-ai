# 🔐 Security & Privacy - Contract AI V2 System

## Übersicht

Das V2 Meta-Prompt System implementiert strikte **DSGVO-konforme Datentrennung** zwischen öffentlichen Logs/Metadaten und sensiblen Artefakten (Vertr agstexte, Prompts).

---

## Architektur

### 1. Öffentliche Collection (`contract_generations`)
**Zugriff:** Application Server, Analytics, Monitoring

**Inhalt:** Nur sanitierte Metadaten
- ✅ User ID, Contract Type, Timestamps
- ✅ Scores (hybridScore, validatorScore, llmScore)
- ✅ Retries, Duration, Token Counts
- ✅ Validator Checks (passed/failed), Errors/Warnings Counts
- ❌ KEINE Namen, Adressen, Vertragstexte, Prompts

**Zweck:** Performance-Monitoring, Qualitätssicherung, Analytics

### 2. Sichere Collection (`contract_generation_secure`)
**Zugriff:** Server-Side Only, Admin-Tools, Audit-Prozesse

**Inhalt:** Verschlüsselte Artefakte (AES-256-GCM)
- 🔐 `phase1PromptEncrypted` - Meta-Prompt (verschlüsselt)
- 🔐 `contractTextEncrypted` - Vertragstext (verschlüsselt)
- 🔗 `generationId` - Referenz auf öffentliches Dokument
- 📅 `createdAt`, `encryptionVersion`

**Zweck:** Audit/Regeneration, Qualitätsprüfung, Compliance-Reviews

---

## Encryption

### Algorithmus
**AES-256-GCM** (Galois/Counter Mode)
- Symmetrische Verschlüsselung mit Authenticated Encryption
- IV (Initialization Vector): 16 Bytes (zufällig pro Verschlüsselung)
- Auth Tag: 16 Bytes (Integritätsschutz)

### Key Management

**Development/Testing:**
```bash
# Key generieren
node backend/security/encryption.js --generate-key

# In .env hinzufügen
ENCRYPTION_SECRET_KEY=<generated-hex-key>
```

**Production (Empfehlung):**
- ⚠️ **AWS KMS**, Azure Key Vault oder Google Cloud KMS nutzen!
- Aktuell: Stub-Implementierung mit `.env`-basiertem Key
- TODO: KMS-Integration implementieren (siehe `backend/security/encryption.js`)

### Encryption Format
```
<iv_base64>:<authTag_base64>:<ciphertext_base64>
```

Beispiel:
```
fFhT5VgjkQqbrYSeSqxNGQ==:Le2/cy2lJeddIWw3OB36TQ==:abcd1234...
```

---

## PII-Protection Policy

### Was wird NIEMALS geloggt/gespeichert (unverschlüsselt):
❌ Namen (Partei A, Partei B)
❌ Adressen
❌ Vertragstexte (vollständig)
❌ Meta-Prompts (enthalten User-Input)
❌ Custom Requirements (können PII enthalten)

### Was wird geloggt/gespeichert (sanitiert):
✅ User IDs (nur erste 8 Zeichen in Logs)
✅ Contract Type, Timestamps
✅ Scores, Retries, Duration, Token Counts
✅ Validator Checks (boolean), Error/Warning Counts
✅ Contract Text Metadata: `{ length, paragraphCount, preview (mit [NAME] masking) }`

---

## Zugriffs-Regeln

| Collection | Zugriff | Zweck |
|------------|---------|--------|
| `contract_generations` | Application Server, Analytics, Monitoring | Performance-Tracking, Alerts |
| `contract_generation_secure` | **Server-Side Only**, Admin-Tools (manuell) | Audit, Regeneration, Compliance |

**WICHTIG:** `contract_generation_secure` darf NIEMALS direkt von der Application API erreichbar sein!

---

## Compliance

### DSGVO-Konformität
✅ **Datensparsamkeit:** Nur notwendige Metadaten in öffentlicher Collection
✅ **Zweckbindung:** Verschlüsselte Artefakte nur für Audit/Regeneration
✅ **Technische Maßnahmen:** AES-256-GCM Encryption
✅ **Zugriffskontrolle:** Separate Collection mit restriktivem Zugriff

### Retention Policy (Empfehlung)
- **Öffentliche Metadaten:** 90 Tage (anpassbar)
- **Verschlüsselte Artefakte:** 30 Tage (Audit-Window), dann löschen
- **Cleanup-Script:** TODO (siehe `backend/cleanup-old-generations.js`)

---

## API Usage

### Generierung mit runLabel (Telemetrie)
```javascript
const { generateContractV2 } = require('./routes/generateV2');

const result = await generateContractV2(
  input,
  contractType,
  userId,
  db,
  'staging-2025-11-05' // runLabel (optional)
);

// Result enthält:
// - contractText (für Rückgabe an User)
// - artifacts (sanitiert)
// - reviewRequired (boolean)
// - generationDoc (sanitiert, wurde in DB gespeichert)
```

### Sichere Artefakte abrufen (Admin/Audit)
```javascript
const { decrypt } = require('./security/encryption');

// 1. Öffentliches Dokument holen
const generation = await db.collection('contract_generations')
  .findOne({ _id: generationId });

// 2. Verschlüsseltes Artefakt holen
const secureDoc = await db.collection('contract_generation_secure')
  .findOne({ generationId: generationId });

// 3. Entschlüsseln
const contractText = decrypt(secureDoc.contractTextEncrypted);
const phase1Prompt = decrypt(secureDoc.phase1PromptEncrypted);
```

---

## Monitoring & Alerts

### Empfohlene Metrics (ohne PII):
- **Hybrid Score Distribution** (Histogram)
- **reviewRequired Quote** (Percentage)
- **Retries Distribution** (Histogram)
- **Duration** (P50, P90, P99)
- **Contract Types** (Distribution)

### Alert-Bedingungen:
⚠️ `hybridScore < 0.90` Rate > 5%
⚠️ `reviewRequired = true` Rate > 10%
⚠️ `retriesUsed >=2` Rate > 15%
⚠️ Duration P99 > 60s

---

## Security Best Practices

1. **Encryption Key Rotation:**
   - Regelmäßig (alle 90 Tage) neuen Key generieren
   - Alte Keys für Decryption behalten (Key-Versioning)
   - Migration-Script für Re-Encryption

2. **Access Control:**
   - MongoDB User Roles: Separate Rollen für `contract_generations` (ReadWrite) und `contract_generation_secure` (Admin-Only)
   - Network Isolation: `contract_generation_secure` nur über VPN/Bastion erreichbar

3. **Audit Logging:**
   - Alle Zugriffe auf `contract_generation_secure` loggen
   - Wer, Wann, Welches Dokument

4. **Backup:**
   - Verschlüsselte Backups für beide Collections
   - Separate Backup-Encryption (zusätzlich zu AES-256-GCM)

---

## Testing

```bash
# Encryption Test
node backend/security/encryption.js --test

# Generate Test Key
node backend/security/encryption.js --generate-key

# MongoDB Indexes erstellen
node backend/create-secure-indexes.js
```

---

## TODO: Production Readiness

- [ ] KMS-Integration (AWS KMS, Azure Key Vault)
- [ ] Key Rotation Script
- [ ] Cleanup/Retention Script (30 Tage TTL)
- [ ] Audit Logging für `contract_generation_secure` Zugriffe
- [ ] MongoDB User Roles & Access Control
- [ ] Backup & Disaster Recovery Plan

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
