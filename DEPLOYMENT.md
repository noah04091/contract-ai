# 🚀 PRODUCTION DEPLOYMENT GUIDE - V2 Contract Generation

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Code & Tests ✅
- [x] V2 System implementiert und getestet
- [x] Repair-Pass System aktiv
- [x] Alle 12 Contract-Typen getestet (43 Tests, 97.4% avg score)
- [x] Smoke-Tests bestanden (individuell & darlehen: 100% scores)
- [x] Darlehen threshold auf 0.93 optimiert
- [x] ENCRYPTION_KEY in .env gesetzt

### 2. Server-Vorbereitung ⚠️

**Auf dem Production-Server ausführen:**

```bash
# 1. Repository klonen / Code hochladen
git clone <your-repo-url>
cd contract-ai

# 2. Dependencies installieren
cd backend
npm install

cd ../frontend
npm install

# 3. Production ENV einrichten
cd ../backend
cp .env.production.template .env
# WICHTIG: .env mit echten Production-Keys ausfüllen!
nano .env  # oder vi/vim

# 4. Encryption Key generieren
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output in .env als ENCRYPTION_KEY UND ENCRYPTION_SECRET_KEY eintragen!

# 5. MongoDB Indexes erstellen
node create-secure-indexes.js

# 6. Server testen (lokal)
node server.js
# Sollte starten mit: "Server läuft auf Port 5000"
```

### 3. Environment Variables Validierung ⚠️

**KRITISCH - Diese MÜSSEN in Production .env gesetzt sein:**

```bash
# Auf Production-Server prüfen:
cd backend
node -e "
require('dotenv').config();
const required = [
  'MONGO_URI',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY',
  'ENCRYPTION_SECRET_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_NAME',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS'
];

let missing = [];
required.forEach(key => {
  if (!process.env[key]) missing.push(key);
});

if (missing.length > 0) {
  console.log('❌ FEHLEN:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ Alle kritischen ENV Variables gesetzt!');
}
"
```

### 4. Database Setup ⚠️

**MongoDB Collections & Indexes:**

```bash
# Auf Production-Server:
cd backend
node create-secure-indexes.js

# Erwartete Output:
# ✅ MongoDB verbunden
# ✅ Index erstellt: generationId_1
# ✅ Index erstellt: userId_1_createdAt_-1
# ✅ Index erstellt: contractType_1_createdAt_-1
# ✅ Index erstellt: createdAt_-1
# 🎉 Alle Indexes erfolgreich erstellt!
```

### 5. Production Build 🏗️

**Frontend Build:**

```bash
cd frontend
npm run build

# Build-Output sollte in frontend/dist/ landen
# Wird dann vom Backend unter /api/* serviert
```

### 6. Process Manager Setup (PM2) 🔄

**Installation & Start:**

```bash
# PM2 global installieren (falls noch nicht vorhanden)
npm install -g pm2

# Backend starten
cd backend
pm2 start server.js --name "contract-ai-backend"

# Auto-Restart bei Server-Reboot
pm2 startup
pm2 save

# Status prüfen
pm2 status
pm2 logs contract-ai-backend --lines 50
```

### 7. Nginx Reverse Proxy (Optional) 🌐

**Nginx Config für SSL & Domain:**

```nginx
# /etc/nginx/sites-available/contract-ai
server {
    listen 80;
    server_name api.contract-ai.de;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.contract-ai.de;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.contract-ai.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.contract-ai.de/privkey.pem;

    # Proxy to Node.js Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts für lange AI-Generierungen (bis 120s)
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Frontend Static Files
    location / {
        root /var/www/contract-ai/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**SSL Certificate (Let's Encrypt):**

```bash
# Certbot installieren
sudo apt-get install certbot python3-certbot-nginx

# Zertifikat erstellen
sudo certbot --nginx -d api.contract-ai.de
```

---

## 🚀 DEPLOYMENT EXECUTION

### Quick Start (Minimale Production)

```bash
# 1. ENV Setup
cd backend
cp .env.production.template .env
# .env ausfüllen mit Production-Keys!

# 2. MongoDB Indexes
node create-secure-indexes.js

# 3. Server starten
node server.js
# Oder mit PM2:
pm2 start server.js --name contract-ai-backend
```

### Monitoring (Erste 24h) 📊

**Nach Deployment überwachen:**

```bash
# 1. Server Logs
pm2 logs contract-ai-backend --lines 100

# 2. MongoDB Monitor
# Erste 50 Generierungen in MongoDB prüfen:
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function monitor() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();

  const recent = await db.collection('contract_generations')
    .find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const reviewRequired = recent.filter(r => r.phase2?.selfCheck?.reviewRequired);
  const avgScore = recent.reduce((sum, r) => sum + r.phase2?.selfCheck?.finalScore, 0) / recent.length;

  console.log('📊 LIVE MONITORING (letzte 50 Generierungen)');
  console.log('Avg Score:', avgScore.toFixed(3));
  console.log('Review Required:', reviewRequired.length, '/', recent.length);
  console.log('Review Rate:', (reviewRequired.length / recent.length * 100).toFixed(1) + '%');

  await client.close();
}

monitor().catch(console.error);
"

# 3. Error Rate prüfen
pm2 logs contract-ai-backend --err --lines 100
```

---

## ⚠️ BEKANNTE ISSUES & WORKAROUNDS

### Issue 1: Lizenzvertrag Review-Rate (33%)

**Problem:** Lizenzvertrag hat in Tests 33% Review-Rate (höher als andere Typen)

**Monitoring:**
```bash
# Lizenzvertrag-Generierungen tracken
node -e "
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkLizenz() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();

  const lizenz = await db.collection('contract_generations')
    .find({ contractType: 'lizenzvertrag' })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  const reviewNeeded = lizenz.filter(l => l.phase2?.selfCheck?.reviewRequired);

  console.log('📊 Lizenzvertrag Stats (letzte 20):');
  console.log('Review Rate:', (reviewNeeded.length / lizenz.length * 100).toFixed(1) + '%');
  console.log('Avg Score:', (lizenz.reduce((s, l) => s + l.phase2?.selfCheck?.finalScore, 0) / lizenz.length).toFixed(3));

  await client.close();
}

checkLizenz().catch(console.error);
"
```

**Fallback:** Wenn Lizenzvertrag-Review-Rate über 40% bleibt, threshold von 0.93 auf 0.90 senken.

---

## 🎯 SUCCESS CRITERIA

**Nach 24h Live-Betrieb prüfen:**

- [ ] ✅ Avg Final Score ≥ 0.94
- [ ] ✅ Review Required ≤ 5%
- [ ] ✅ Keine kritischen Fehler in Logs
- [ ] ✅ User-Feedback positiv
- [ ] ✅ OpenAI Budget im grünen Bereich

**Falls ALLE Kriterien erfüllt:** 🎉 **PRODUCTION SUCCESS!**

---

## 📞 SUPPORT & ROLLBACK

### Rollback zu V1 (falls nötig)

```bash
# V2 deaktivieren im Code (backend/routes/generateV2.js):
# Zeile 2 ändern:
const FEATURE_ENABLED = false;

# Server neu starten
pm2 restart contract-ai-backend
```

### Monitoring Tools (empfohlen)

- **Sentry**: Error Tracking (sentry.io)
- **DataDog**: Performance Monitoring
- **MongoDB Atlas**: Database Monitoring

---

## ✅ DEPLOYMENT COMPLETE!

**Nach erfolgreichem Deployment:**

```bash
# Status-Check
pm2 status
curl http://localhost:5000/api/health  # (falls health endpoint existiert)

# Erste Test-Generierung
# Über Frontend: Contract generieren und prüfen
```

**Backend live - V2 aktiv!** 🚀

---

Generated with [Claude Code](https://claude.com/claude-code)
