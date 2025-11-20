// 📁 frontend/src/pages/ApiDocs.tsx
// REST API-Dokumentation (öffentlich zugänglich)

import { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Code, Copy, CheckCircle, Key, Lock, Zap } from "lucide-react";
import styles from "../styles/ApiDocs.module.css";

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.language}>{language}</span>
        <button className={styles.copyButton} onClick={copyCode}>
          {copied ? (
            <>
              <CheckCircle size={14} />
              Kopiert!
            </>
          ) : (
            <>
              <Copy size={14} />
              Kopieren
            </>
          )}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
};

export default function ApiDocs() {
  return (
    <>
      <Helmet>
        <title>REST API-Dokumentation - Contract AI</title>
        <meta
          name="description"
          content="Contract AI REST API-Dokumentation für Enterprise-Kunden"
        />
      </Helmet>

      <div className={styles.container}>
        <div className={styles.sidebar}>
          <h3>Inhaltsverzeichnis</h3>
          <ul>
            <li><a href="#introduction">Einführung</a></li>
            <li><a href="#authentication">Authentifizierung</a></li>
            <li><a href="#rate-limiting">Rate Limiting</a></li>
            <li><a href="#endpoints">Endpoints</a>
              <ul>
                <li><a href="#get-contracts">Liste Verträge</a></li>
                <li><a href="#post-contracts">Vertrag hochladen</a></li>
                <li><a href="#get-contract">Vertrag abrufen</a></li>
                <li><a href="#delete-contract">Vertrag löschen</a></li>
                <li><a href="#get-analysis">Analyse abrufen</a></li>
              </ul>
            </li>
            <li><a href="#errors">Fehlerbehandlung</a></li>
          </ul>
        </div>

        <div className={styles.content}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <Code size={48} className={styles.headerIcon} />
              <h1 className={styles.title}>Contract AI REST API</h1>
              <p className={styles.subtitle}>
                Dokumentation für Enterprise-Kunden • Version 1.0.0
              </p>
            </div>

            {/* Enterprise Badge */}
            <div className={styles.enterpriseBadge}>
              <Lock size={16} />
              <span>Enterprise-Feature • Erfordert API-Key</span>
            </div>

            {/* Introduction */}
            <section id="introduction" className={styles.section}>
              <h2>Einführung</h2>
              <p>
                Die Contract AI REST API ermöglicht es Enterprise-Kunden, Contract AI
                programmatisch zu nutzen. Automatisiere Vertrags-Uploads, Analysen und
                integriere Contract AI in deine bestehenden Workflows.
              </p>

              <div className={styles.infoBox}>
                <Zap size={20} />
                <div>
                  <strong>Base URL:</strong>
                  <code>https://api.contract-ai.de/api/v1</code>
                </div>
              </div>

              <h3>Features</h3>
              <ul className={styles.featureList}>
                <li>🔒 Sichere API-Key Authentifizierung</li>
                <li>📤 Automatischer Vertrag-Upload & Analyse</li>
                <li>📊 Zugriff auf alle Analysen & Daten</li>
                <li>⚡ Rate Limiting: 1000 Requests/Stunde (Enterprise)</li>
                <li>🔄 RESTful Design & JSON Responses</li>
              </ul>
            </section>

            {/* Authentication */}
            <section id="authentication" className={styles.section}>
              <h2>Authentifizierung</h2>
              <p>
                Alle API-Requests benötigen einen gültigen API-Key. Erstelle einen API-Key
                in deinem <a href="/api-keys" className={styles.link}>API-Keys Dashboard</a>.
              </p>

              <h3>Authorization Header</h3>
              <CodeBlock
                language="HTTP"
                code={`Authorization: Bearer sk_live_your_api_key_here`}
              />

              <h3>Beispiel-Request (cURL)</h3>
              <CodeBlock
                language="bash"
                code={`curl https://api.contract-ai.de/api/v1/contracts \\
  -H "Authorization: Bearer sk_live_your_api_key_here"`}
              />

              <div className={styles.warningBox}>
                <strong>⚠️ Wichtig:</strong> Teile deinen API-Key niemals öffentlich.
                Behandle ihn wie ein Passwort!
              </div>
            </section>

            {/* Rate Limiting */}
            <section id="rate-limiting" className={styles.section}>
              <h2>Rate Limiting</h2>
              <p>
                API-Requests sind limitiert basierend auf deinem Subscription-Plan:
              </p>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Requests/Stunde</th>
                    <th>Max API-Keys</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Business</strong></td>
                    <td>100</td>
                    <td>3</td>
                  </tr>
                  <tr>
                    <td><strong>Enterprise</strong></td>
                    <td>1000</td>
                    <td>5</td>
                  </tr>
                </tbody>
              </table>

              <h3>Rate Limit Headers</h3>
              <CodeBlock
                language="HTTP"
                code={`RateLimit-Limit: 1000
RateLimit-Remaining: 999
RateLimit-Reset: 1640995200`}
              />
            </section>

            {/* Endpoints */}
            <section id="endpoints" className={styles.section}>
              <h2>Endpoints</h2>

              {/* GET /contracts */}
              <div id="get-contracts" className={styles.endpoint}>
                <div className={styles.endpointHeader}>
                  <span className={styles.method}>GET</span>
                  <code className={styles.path}>/contracts</code>
                </div>
                <p>Listet alle Verträge des authentifizierten Users.</p>

                <h4>Query Parameter</h4>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Typ</th>
                      <th>Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>limit</code></td>
                      <td>integer</td>
                      <td>Anzahl Ergebnisse (default: 50, max: 100)</td>
                    </tr>
                    <tr>
                      <td><code>offset</code></td>
                      <td>integer</td>
                      <td>Pagination Offset (default: 0)</td>
                    </tr>
                    <tr>
                      <td><code>folder</code></td>
                      <td>string</td>
                      <td>Filter nach Ordner-ID (optional)</td>
                    </tr>
                  </tbody>
                </table>

                <h4>Beispiel-Request</h4>
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.contract-ai.de/api/v1/contracts?limit=10" \\
  -H "Authorization: Bearer sk_live_your_api_key_here"`}
                />

                <h4>Response</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "contracts": [
    {
      "id": "507f1f77bcf86cd799439011",
      "filename": "Mietvertrag.pdf",
      "contractType": "Mietvertrag",
      "createdAt": "2025-01-20T12:00:00.000Z",
      "folderId": null
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}`}
                />
              </div>

              {/* POST /contracts */}
              <div id="post-contracts" className={styles.endpoint}>
                <div className={styles.endpointHeader}>
                  <span className={`${styles.method} ${styles.post}`}>POST</span>
                  <code className={styles.path}>/contracts</code>
                </div>
                <p>Lädt einen neuen Vertrag hoch und analysiert ihn optional.</p>

                <h4>Request Body (multipart/form-data)</h4>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Typ</th>
                      <th>Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>file</code></td>
                      <td>file</td>
                      <td><strong>Required:</strong> PDF-Datei (max 10MB)</td>
                    </tr>
                    <tr>
                      <td><code>folderId</code></td>
                      <td>string</td>
                      <td>Optional: Ordner-ID</td>
                    </tr>
                    <tr>
                      <td><code>analyze</code></td>
                      <td>boolean</td>
                      <td>Automatische Analyse (default: true)</td>
                    </tr>
                  </tbody>
                </table>

                <h4>Beispiel-Request</h4>
                <CodeBlock
                  language="bash"
                  code={`curl -X POST "https://api.contract-ai.de/api/v1/contracts" \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -F "file=@/path/to/contract.pdf" \\
  -F "analyze=true"`}
                />

                <h4>Response</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "message": "Vertrag erfolgreich hochgeladen",
  "contract": {
    "id": "507f1f77bcf86cd799439011",
    "filename": "contract.pdf",
    "createdAt": "2025-01-20T12:00:00.000Z"
  },
  "analysis": {
    "contractType": "Kaufvertrag",
    "overallScore": 85,
    "summary": "Der Vertrag regelt den Kauf..."
  }
}`}
                />
              </div>

              {/* GET /contracts/:id */}
              <div id="get-contract" className={styles.endpoint}>
                <div className={styles.endpointHeader}>
                  <span className={styles.method}>GET</span>
                  <code className={styles.path}>/contracts/:id</code>
                </div>
                <p>Ruft einen einzelnen Vertrag ab.</p>

                <h4>Beispiel-Request</h4>
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.contract-ai.de/api/v1/contracts/507f1f77bcf86cd799439011" \\
  -H "Authorization: Bearer sk_live_your_api_key_here"`}
                />
              </div>

              {/* DELETE /contracts/:id */}
              <div id="delete-contract" className={styles.endpoint}>
                <div className={styles.endpointHeader}>
                  <span className={`${styles.method} ${styles.delete}`}>DELETE</span>
                  <code className={styles.path}>/contracts/:id</code>
                </div>
                <p>Löscht einen Vertrag.</p>

                <h4>Beispiel-Request</h4>
                <CodeBlock
                  language="bash"
                  code={`curl -X DELETE "https://api.contract-ai.de/api/v1/contracts/507f1f77bcf86cd799439011" \\
  -H "Authorization: Bearer sk_live_your_api_key_here"`}
                />
              </div>

              {/* GET /contracts/:id/analysis */}
              <div id="get-analysis" className={styles.endpoint}>
                <div className={styles.endpointHeader}>
                  <span className={styles.method}>GET</span>
                  <code className={styles.path}>/contracts/:id/analysis</code>
                </div>
                <p>Ruft die Analyse eines Vertrags ab.</p>

                <h4>Response</h4>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "analysis": {
    "contractType": "Kaufvertrag",
    "overallScore": 85,
    "risks": ["Keine Kündigungsfrist definiert"],
    "suggestions": ["Klare Kündigungsklausel hinzufügen"],
    "parties": ["Max Mustermann", "Firma GmbH"],
    "keyTerms": ["Kaufpreis", "Lieferung", "Gewährleistung"],
    "summary": "Der Vertrag regelt den Kauf..."
  }
}`}
                />
              </div>
            </section>

            {/* Error Handling */}
            <section id="errors" className={styles.section}>
              <h2>Fehlerbehandlung</h2>
              <p>
                Die API verwendet Standard-HTTP-Statuscodes und gibt JSON-Fehler zurück:
              </p>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Bedeutung</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>200</code></td>
                    <td>Erfolg</td>
                  </tr>
                  <tr>
                    <td><code>400</code></td>
                    <td>Ungültige Anfrage</td>
                  </tr>
                  <tr>
                    <td><code>401</code></td>
                    <td>Unauthorized (ungültiger API-Key)</td>
                  </tr>
                  <tr>
                    <td><code>403</code></td>
                    <td>Forbidden (kein Enterprise-Plan)</td>
                  </tr>
                  <tr>
                    <td><code>404</code></td>
                    <td>Nicht gefunden</td>
                  </tr>
                  <tr>
                    <td><code>429</code></td>
                    <td>Rate Limit überschritten</td>
                  </tr>
                  <tr>
                    <td><code>500</code></td>
                    <td>Server-Fehler</td>
                  </tr>
                </tbody>
              </table>

              <h4>Beispiel-Error Response</h4>
              <CodeBlock
                language="json"
                code={`{
  "success": false,
  "message": "API-Key ungültig oder deaktiviert",
  "error": "UNAUTHORIZED",
  "docs": "/api-docs"
}`}
              />
            </section>

            {/* CTA */}
            <div className={styles.cta}>
              <Key size={32} />
              <h3>Bereit loszulegen?</h3>
              <p>Erstelle deinen ersten API-Key im Dashboard</p>
              <a href="/api-keys" className={styles.ctaButton}>
                Zum API-Keys Dashboard
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
