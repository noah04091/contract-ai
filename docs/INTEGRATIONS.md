# Contract AI - CRM/ERP/CPQ Integration Documentation

## Übersicht

Contract AI unterstützt nahtlose Integration mit führenden CRM-, ERP- und CPQ-Systemen:

| System | Kategorie | Status | Auth-Methode |
|--------|-----------|--------|--------------|
| Salesforce | CRM | ✅ Implementiert | OAuth 2.0 |
| HubSpot | CRM | ✅ Implementiert | OAuth 2.0 |
| SAP Business One | ERP | ✅ Implementiert | Session Auth |
| SAP S/4HANA | ERP | ✅ Implementiert | OAuth 2.0 |
| Pipedrive | CRM | 🔜 Coming Soon | OAuth 2.0 |
| Zoho CRM | CRM | 🔜 Coming Soon | OAuth 2.0 |

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        Contract AI                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                Integration Hub                           │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │    │
│  │  │ Webhook   │  │  OAuth    │  │  Sync Engine      │   │    │
│  │  │ Receiver  │  │  Manager  │  │  (Bi-directional) │   │    │
│  │  └───────────┘  └───────────┘  └───────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
  ┌──────────┐   ┌──────────┐    ┌──────────┐
  │Salesforce│   │ HubSpot  │    │   SAP    │
  └──────────┘   └──────────┘    └──────────┘
```

---

## API Endpoints

### Basis-Endpoints

```
GET  /api/integrations                    # Liste aller Integrationen
GET  /api/integrations/:type              # Details einer Integration
DELETE /api/integrations/:type            # Integration trennen
```

### OAuth Flow

```
GET  /api/integrations/:type/auth         # OAuth Authorization URL
GET  /api/integrations/:type/callback     # OAuth Callback
```

### SAP-spezifisch

```
POST /api/integrations/:type/connect      # SAP mit Username/Password verbinden
```

### Sync Operations

```
POST /api/integrations/:type/sync/contract/:contractId   # Sync Contract → External
POST /api/integrations/:type/sync/external/:externalId   # Sync External → Contract
POST /api/integrations/:type/sync/bulk                   # Bulk Sync
```

### Webhooks

```
POST /api/integrations/webhooks/:type/:userId/:token     # Eingehende Webhooks
```

### Utilities

```
POST /api/integrations/:type/test                        # Verbindungstest
GET  /api/integrations/:type/search/companies            # Company-Suche
PUT  /api/integrations/:type/settings                    # Settings aktualisieren
GET  /api/integrations/:type/events                      # Webhook Event History
GET  /api/integrations/:type/stats                       # Statistiken
```

---

## Environment Variables

```bash
# Salesforce
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_SANDBOX=false

# HubSpot
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_APP_ID=your_app_id

# Security
INTEGRATION_ENCRYPTION_KEY=32_byte_hex_key

# URLs
API_BASE_URL=https://api.contract-ai.de
FRONTEND_URL=https://contract-ai.de
```

---

## Salesforce Integration

### Setup

1. **Connected App erstellen** in Salesforce Setup:
   - Setup → App Manager → New Connected App
   - OAuth Settings aktivieren
   - Callback URL: `https://api.contract-ai.de/api/integrations/salesforce/callback`
   - Scopes: `api`, `refresh_token`, `offline_access`

2. **Environment Variables** setzen:
   ```bash
   SALESFORCE_CLIENT_ID=xxx
   SALESFORCE_CLIENT_SECRET=xxx
   SALESFORCE_SANDBOX=false  # true für Sandbox
   ```

### Unterstützte Objekte

- **Opportunity** ↔ Contract (bidirektional)
- **Account** → Company Info
- **Contact** → Contact Info
- **Quote** → Quote Data

### Webhook Events

| Event | Aktion |
|-------|--------|
| `Opportunity.Created` | Neuer Contract erstellen |
| `Opportunity.Updated` | Contract aktualisieren |
| `Opportunity.Closed` | Status auf Aktiv/Abgelaufen |
| `Quote.Accepted` | Quote-Daten hinzufügen |

### Field Mapping

```javascript
// Contract AI → Salesforce
{
  name: 'Name',
  amount: 'Amount',
  status: 'StageName',
  expiryDate: 'CloseDate'
}

// Salesforce → Contract AI
{
  Name: 'name',
  Amount: 'amount',
  StageName: 'status',
  CloseDate: 'expiryDate'
}
```

---

## HubSpot Integration

### Setup

1. **App erstellen** im HubSpot Developer Account:
   - https://developers.hubspot.com/
   - Neue App erstellen
   - OAuth konfigurieren
   - Redirect URL: `https://api.contract-ai.de/api/integrations/hubspot/callback`

2. **Scopes** auswählen:
   - `crm.objects.contacts.read/write`
   - `crm.objects.companies.read/write`
   - `crm.objects.deals.read/write`
   - `crm.objects.quotes.read`

3. **Environment Variables**:
   ```bash
   HUBSPOT_CLIENT_ID=xxx
   HUBSPOT_CLIENT_SECRET=xxx
   HUBSPOT_APP_ID=xxx
   ```

### Unterstützte Objekte

- **Deal** ↔ Contract (bidirektional)
- **Company** → Company Info
- **Contact** → Contact Info

### Webhook Events

| Event | Aktion |
|-------|--------|
| `deal.creation` | Neuer Contract erstellen |
| `deal.propertyChange` | Contract aktualisieren |
| `deal.deletion` | Contract disconnecten |
| `company.propertyChange` | Company Info updaten |

---

## SAP Integration

### SAP Business One

1. **Service Layer** muss aktiviert sein
2. **Verbindung** über Username/Password:
   ```json
   {
     "baseUrl": "https://your-sap-server:50000",
     "companyDB": "SBODemoDE",
     "username": "manager",
     "password": "secret"
   }
   ```

### SAP S/4HANA

1. **OData API** aktivieren
2. **OAuth 2.0** Client Credentials konfigurieren
3. **API Endpoints** freischalten:
   - `/API_SALES_ORDER_SRV`
   - `/API_BUSINESS_PARTNER`

### Unterstützte Objekte

- **Sales Order** ↔ Contract
- **Business Partner** → Company Info
- **Invoice** → Payment Info

---

## Datenmodell-Erweiterungen

### Contract Model

```javascript
// External IDs
externalIds: {
  salesforce: {
    opportunityId: String,
    accountId: String,
    contactId: String
  },
  hubspot: {
    dealId: String,
    companyId: String,
    contactId: String
  },
  sap: {
    salesOrderId: String,
    customerId: String,
    documentNumber: String
  }
}

// Sync Status
integrationSync: {
  salesforce: {
    status: 'pending' | 'syncing' | 'synced' | 'error',
    lastSyncedAt: Date,
    lastSyncDirection: 'inbound' | 'outbound',
    errorMessage: String
  }
}

// Deal Info (aus CRM)
dealInfo: {
  dealName: String,
  dealStage: String,
  dealValue: Number,
  company: { name, industry, website },
  contacts: [{ name, email, phone, role }]
}

// Quote Data (aus CPQ)
quoteData: {
  quoteNumber: String,
  lineItems: [{
    productName,
    quantity,
    unitPrice,
    totalPrice
  }],
  totalValue: Number,
  status: 'draft' | 'approved' | 'accepted'
}
```

---

## Security

### Token Encryption

Alle OAuth-Tokens und Credentials werden mit AES-256-CBC verschlüsselt:

```javascript
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;
// 32-Byte Key erforderlich
```

### Webhook Signature Verification

| System | Methode |
|--------|---------|
| Salesforce | HMAC-SHA256 |
| HubSpot | HMAC-SHA256 (v3) |
| SAP | Basic Auth / API Key |

### Rate Limiting

- **Webhooks**: 100/Minute pro Integration
- **API Calls**: 60/Minute pro User

---

## Frontend Integration

### Integrations Page

Route: `/integrations`

Funktionen:
- Liste aller verfügbaren Integrationen
- OAuth-Flow starten
- SAP Credentials eingeben
- Verbindung testen
- Integration trennen
- Sync-Statistiken anzeigen

### Contracts Page Enhancement

- **Sync Button** für einzelne Contracts
- **Integration Status** Badge
- **Last Sync** Timestamp

---

## Troubleshooting

### Häufige Probleme

1. **OAuth Token abgelaufen**
   - Automatischer Refresh sollte funktionieren
   - Bei "expired" Status: Neu verbinden

2. **Webhook nicht empfangen**
   - URL öffentlich erreichbar?
   - Firewall/CORS-Settings prüfen
   - Webhook Secret korrekt?

3. **SAP Verbindung fehlgeschlagen**
   - Service Layer URL korrekt?
   - Port 50000 (HTTPS) erreichbar?
   - Company DB Name korrekt?

### Debug-Endpoints

```bash
# Webhook Event History
GET /api/integrations/:type/events?status=failed

# Integration Stats
GET /api/integrations/:type/stats?days=7

# Connection Test
POST /api/integrations/:type/test
```

---

## Roadmap

### Phase 2 (Coming Soon)
- [ ] Pipedrive Integration
- [ ] Zoho CRM Integration
- [ ] NetSuite ERP Integration

### Phase 3 (Geplant)
- [ ] Microsoft Dynamics 365
- [ ] Odoo Integration
- [ ] Custom Webhook Builder
- [ ] Field Mapping UI

---

## Support

Bei Fragen zur Integration:
- Email: integration@contract-ai.de
- API Docs: /api/docs
- Status: status.contract-ai.de
