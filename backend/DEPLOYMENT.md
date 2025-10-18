# Backend Deployment Anleitung

## Erforderliche Umgebungsvariablen auf Render.com

Nach dem Deployment müssen folgende Umgebungsvariablen im Render Dashboard gesetzt werden:

### ✅ Neu hinzugefügt (2025-10-18)

```
FRONTEND_URL=https://www.contract-ai.de
```

**Warum wichtig?**
Diese Variable wird für E-Mail-Links verwendet (z.B. Signatur-Links, E-Mail-Verifikation).
Ohne diese Variable fallen die Links auf `http://localhost:5173` zurück.

**Wo setzen?**
1. Render Dashboard öffnen: https://dashboard.render.com
2. Backend-Service auswählen
3. "Environment" Tab
4. "Add Environment Variable"
5. Key: `FRONTEND_URL`, Value: `https://www.contract-ai.de`
6. "Save Changes"
7. Service wird automatisch neu deployt

---

## Alle erforderlichen Umgebungsvariablen

Siehe `backend/.env.example` für die vollständige Liste.

Kritische Variablen:
- `FRONTEND_URL` - Frontend-URL für E-Mail-Links
- `FRONTEND_ORIGIN` - CORS-Konfiguration
- `MONGO_URI` - MongoDB Connection String
- `JWT_SECRET` - JWT Token Secret
- `STRIPE_SECRET_KEY` - Stripe API Key
- `STRIPE_WEBHOOK_SECRET` - Stripe Webhook Secret
- `EMAIL_*` - E-Mail-Konfiguration (Mailgun)
- `AWS_*` - S3 Upload-Konfiguration
- `OPENAI_API_KEY` - OpenAI API Key

---

## Nach Deployment prüfen

Test-E-Mail senden und Link prüfen:
1. Neue Signaturanfrage erstellen
2. E-Mail empfangen
3. Link sollte mit `https://www.contract-ai.de/sign/...` beginnen
4. ❌ NICHT: `http://localhost:5173/sign/...`
