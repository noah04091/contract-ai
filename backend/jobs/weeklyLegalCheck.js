// 📁 backend/jobs/weeklyLegalCheck.js
// Weekly GPT-4 Legal Check - Universelles Vertragsmonitoring
// Stufe 1: Datenbank-Check (RSS/Laws der letzten 7 Tage)
// Stufe 2: GPT-4o-mini Comprehensive Legal Analysis

const { MongoClient, ObjectId } = require("mongodb");
const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

let EmbeddingService = null;
let VectorStore = null;

try { EmbeddingService = require("../services/embeddingService"); } catch (e) { console.warn('[WEEKLY-CHECK] embeddingService nicht verfügbar:', e.message); }
try { VectorStore = require("../services/vectorStore"); } catch (e) { console.warn('[WEEKLY-CHECK] vectorStore nicht verfügbar:', e.message); }

class WeeklyLegalCheck {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.embeddingService = EmbeddingService ? new EmbeddingService() : null;
    this.vectorStore = VectorStore ? new VectorStore() : null;
    this.mongoClient = null;
    this.db = null;
    this.isRunning = false;

    // Rate limiting
    this.maxConcurrent = 3;
    this.batchPauseMs = 2000;
    this.maxTextLength = 8000;
  }

  async init() {
    try {
      this.mongoClient = new MongoClient(process.env.MONGO_URI);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db("contract_ai");

      if (this.vectorStore) {
        await this.vectorStore.init();
      }

      // Create index for efficient queries
      await this.db.collection("weekly_legal_checks").createIndex({ userId: 1, contractId: 1, checkDate: -1 });
      await this.db.collection("weekly_legal_checks").createIndex({ checkDate: -1 });

      console.log("✅ [WEEKLY-CHECK] Initialized");
    } catch (error) {
      console.error("❌ [WEEKLY-CHECK] Initialization error:", error);
      throw error;
    }
  }

  /**
   * Main entry point - run weekly legal check for all users
   */
  async runWeeklyCheck() {
    if (this.isRunning) {
      console.log('⚠️  [WEEKLY-CHECK] Already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log('\n' + '='.repeat(70));
    console.log('🔍 [WEEKLY-CHECK] Starting weekly legal check...');
    console.log('='.repeat(70));

    try {
      // Get all users with Legal Pulse enabled
      const users = await this.getActiveUsers();
      console.log(`👥 Found ${users.length} active users`);

      let totalContracts = 0;
      let totalFindings = 0;
      let totalCost = 0;

      for (const user of users) {
        const result = await this.checkUserContracts(user);
        totalContracts += result.contractsChecked;
        totalFindings += result.findingsCount;
        totalCost += result.estimatedCost;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n' + '='.repeat(70));
      console.log('✅ [WEEKLY-CHECK] Complete!');
      console.log(`📊 Users: ${users.length} | Contracts: ${totalContracts} | Findings: ${totalFindings}`);
      console.log(`💰 Estimated cost: $${totalCost.toFixed(4)}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('='.repeat(70) + '\n');

      // Save health record
      await this.saveHealthRecord({
        status: 'success',
        usersChecked: users.length,
        contractsChecked: totalContracts,
        findingsCount: totalFindings,
        estimatedCost: totalCost,
        duration: parseFloat(duration)
      });

    } catch (error) {
      console.error('❌ [WEEKLY-CHECK] Error:', error);
      await this.saveHealthRecord({
        status: 'error',
        error: error.message,
        duration: ((Date.now() - startTime) / 1000)
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get all users with Legal Pulse enabled and active contracts
   */
  async getActiveUsers() {
    const usersCollection = this.db.collection("users");

    return await usersCollection.find({
      $or: [
        { "legalPulseSettings.enabled": true },
        { "legalPulseSettings": { $exists: false } } // Default: enabled
      ]
    }).toArray();
  }

  /**
   * Check all contracts for a single user
   */
  async checkUserContracts(user) {
    const contractsCollection = this.db.collection("contracts");

    // Get active contracts (exclude inactive statuses)
    const INACTIVE_STATUSES = ['Abgelaufen', 'Gekündigt', 'Beendet', 'Storniert', 'Archiviert'];

    const contracts = await contractsCollection.find({
      userId: user._id.toString(),
      status: { $nin: INACTIVE_STATUSES }
    }).toArray();

    if (contracts.length === 0) {
      return { contractsChecked: 0, findingsCount: 0, estimatedCost: 0 };
    }

    console.log(`\n👤 User: ${user.email} - ${contracts.length} active contracts`);

    let findingsCount = 0;
    let estimatedCost = 0;

    // Process in batches
    for (let i = 0; i < contracts.length; i += this.maxConcurrent) {
      const batch = contracts.slice(i, i + this.maxConcurrent);

      const batchPromises = batch.map(contract =>
        this.checkSingleContract(contract, user).catch(error => {
          console.error(`   ❌ Error checking ${contract.name}: ${error.message}`);
          return { findingsCount: 0, estimatedCost: 0 };
        })
      );

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        findingsCount += result.findingsCount;
        estimatedCost += result.estimatedCost;
      }

      // Pause between batches
      if (i + this.maxConcurrent < contracts.length) {
        await new Promise(resolve => setTimeout(resolve, this.batchPauseMs));
      }
    }

    return {
      contractsChecked: contracts.length,
      findingsCount,
      estimatedCost
    };
  }

  /**
   * 2-Stage check for a single contract
   */
  async checkSingleContract(contract, user) {
    console.log(`   📄 Checking: ${contract.name}`);

    // Extract contract text
    const contractText = await this.extractContractText(contract);
    if (!contractText || contractText.trim().length < 50) {
      console.log(`   ⏭️  Skipping ${contract.name} - insufficient text`);
      return { findingsCount: 0, estimatedCost: 0 };
    }

    // === STUFE 1: Datenbank-Check ===
    const stage1Results = await this.stage1DatabaseCheck(contract, contractText);

    // === STUFE 2: GPT Legal Check ===
    const stage2Results = await this.stage2GptCheck(contractText, contract, stage1Results);

    // Save results
    const checkResult = {
      userId: user._id,
      contractId: contract._id,
      contractName: contract.name || 'Unbekannt',
      checkDate: new Date(),
      stage1Results,
      stage2Results: stage2Results.analysis,
      costEstimate: stage2Results.cost,
      createdAt: new Date()
    };

    await this.db.collection("weekly_legal_checks").insertOne(checkResult);

    // Queue digest alert if there are findings
    if (stage2Results.analysis.hasChanges && stage2Results.analysis.findings.length > 0) {
      await this.queueWeeklyCheckAlert(user._id, contract, stage2Results.analysis);
    }

    const findingsCount = stage2Results.analysis.findings?.length || 0;
    const status = stage2Results.analysis.overallStatus || 'aktuell';
    console.log(`   ✅ ${contract.name}: ${status} (${findingsCount} findings)`);

    return {
      findingsCount,
      estimatedCost: stage2Results.cost.estimatedCost
    };
  }

  /**
   * STUFE 1: Check database for recent law changes relevant to this contract
   */
  async stage1DatabaseCheck(contract, contractText) {
    try {
      const lawsCollection = this.db.collection("laws");
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get recent law changes
      const recentLaws = await lawsCollection
        .find({ updatedAt: { $gte: oneWeekAgo } })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray();

      if (recentLaws.length === 0) {
        return { lawChangesFound: 0, relevantChanges: [] };
      }

      // If embedding service available, use vector similarity
      let relevantChanges = [];

      if (this.embeddingService && this.vectorStore) {
        try {
          // Embed a summary of the contract for matching
          const contractSummary = contractText.substring(0, 2000);
          const contractEmbedding = await this.embeddingService.embedText(contractSummary);

          // Match against law embeddings
          for (const law of recentLaws) {
            const lawText = `${law.title || ''} ${law.summary || law.description || ''}`;
            if (lawText.trim().length < 10) continue;

            const lawEmbedding = await this.embeddingService.embedText(lawText);
            const similarity = this.cosineSimilarity(contractEmbedding, lawEmbedding);

            if (similarity >= 0.60) {
              relevantChanges.push({
                lawId: law.lawId || law._id.toString(),
                title: law.title,
                area: law.area,
                score: similarity,
                summary: (law.summary || law.description || '').substring(0, 200)
              });
            }
          }

          // Sort by relevance
          relevantChanges.sort((a, b) => b.score - a.score);
          relevantChanges = relevantChanges.slice(0, 5); // Top 5
        } catch (embError) {
          console.log(`   ⚠️  Embedding matching failed, using keyword fallback: ${embError.message}`);
          relevantChanges = this.keywordMatchLaws(recentLaws, contractText);
        }
      } else {
        // Fallback: simple keyword matching
        relevantChanges = this.keywordMatchLaws(recentLaws, contractText);
      }

      return {
        lawChangesFound: recentLaws.length,
        relevantChanges
      };
    } catch (error) {
      console.error(`   ❌ Stage 1 error: ${error.message}`);
      return { lawChangesFound: 0, relevantChanges: [] };
    }
  }

  /**
   * Simple keyword matching fallback for Stage 1
   */
  keywordMatchLaws(laws, contractText) {
    const lowerText = contractText.toLowerCase();
    const matches = [];

    for (const law of laws) {
      const lawTitle = (law.title || '').toLowerCase();
      const lawKeywords = lawTitle.split(/\s+/).filter(w => w.length > 4);

      let matchCount = 0;
      for (const keyword of lawKeywords) {
        if (lowerText.includes(keyword)) matchCount++;
      }

      if (matchCount >= 2 || (lawKeywords.length <= 3 && matchCount >= 1)) {
        matches.push({
          lawId: law.lawId || law._id.toString(),
          title: law.title,
          area: law.area,
          score: matchCount / Math.max(lawKeywords.length, 1),
          summary: (law.summary || law.description || '').substring(0, 200)
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5);
  }

  /**
   * STUFE 2: GPT-4o-mini comprehensive legal check
   */
  async stage2GptCheck(contractText, contract, stage1Results) {
    const truncatedText = contractText.substring(0, this.maxTextLength);
    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Build Stage 1 context
    let stage1Context = '';
    if (stage1Results.relevantChanges.length > 0) {
      stage1Context = '\n\nAKTUELLE GESETZESÄNDERUNGEN (letzte 7 Tage):\n';
      for (const change of stage1Results.relevantChanges) {
        stage1Context += `- ${change.title} (Bereich: ${change.area || 'Allgemein'}, Relevanz: ${(change.score * 100).toFixed(0)}%)\n`;
        if (change.summary) {
          stage1Context += `  ${change.summary}\n`;
        }
      }
    }

    const systemPrompt = `Du bist ein erfahrener Rechtsanwalt für deutsches Recht, spezialisiert auf Vertragsrecht, Arbeitsrecht, Mietrecht, Handelsrecht, Datenschutzrecht und Verbraucherrecht.
Du führst eine wöchentliche Rechtsprüfung von Verträgen durch. Deine Aufgabe ist es, den Vertrag gegen den AKTUELLEN deutschen Rechtsstand zu prüfen.
Antworte IMMER auf Deutsch und NUR mit validem JSON.`;

    const userPrompt = `Prüfe den folgenden Vertrag gegen den AKTUELLEN deutschen Rechtsstand (Stand: ${today}).

VERTRAGSNAME: ${contract.name || 'Unbekannt'}
VERTRAGSSTATUS: ${contract.status || 'Aktiv'}
LAUFZEIT: ${contract.laufzeit || 'Nicht angegeben'}
KÜNDIGUNGSFRIST: ${contract.kuendigung || 'Nicht angegeben'}

VERTRAGSTEXT:
${truncatedText}
${stage1Context}

Prüfe folgende Aspekte UNIVERSELL (unabhängig vom Vertragstyp):
1. Sind alle Klauseln nach aktuellem Recht noch wirksam?
2. Gibt es neue gesetzliche Anforderungen die der Vertrag nicht erfüllt?
3. Sind Fristen/Kündigungsrechte nach aktuellem Recht korrekt?
4. Gibt es AGB-rechtliche Probleme (§§ 305-310 BGB)?
5. Ist der DSGVO-Compliance-Status aktuell?
6. Gibt es branchenspezifische Änderungen die relevant sind?
7. Fehlen wichtige Vertragsklauseln die gesetzlich empfohlen/vorgeschrieben sind?

WICHTIG:
- Wenn der Vertrag rechtlich einwandfrei ist, setze hasChanges auf false und findings als leeres Array
- Sei KONKRET: Zitiere die betroffenen Klauseln und nenne die genaue Rechtsgrundlage
- Nur ECHTE, aktuelle rechtliche Probleme melden - keine hypothetischen

Antworte NUR mit diesem JSON-Format:
{
  "hasChanges": true/false,
  "overallStatus": "aktuell" | "handlungsbedarf" | "kritisch",
  "findings": [
    {
      "type": "law_change" | "risk" | "improvement" | "compliance",
      "severity": "info" | "warning" | "critical",
      "title": "Kurzer Titel",
      "description": "Was genau das Problem/die Änderung ist",
      "affectedClause": "Betroffene Klausel im Vertrag (Zitat oder Verweis)",
      "legalBasis": "Rechtsgrundlage (z.B. § 622 BGB)",
      "recommendation": "Konkreter Handlungsvorschlag"
    }
  ],
  "summary": "1-2 Sätze Zusammenfassung des Gesamtstatus"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      });

      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
      const estimatedCost = (inputTokens * 0.00000015) + (outputTokens * 0.0000006);

      const analysis = this.parseGptResponse(response.choices[0].message.content);

      return {
        analysis,
        cost: { inputTokens, outputTokens, estimatedCost }
      };
    } catch (error) {
      console.error(`   ❌ GPT analysis failed: ${error.message}`);
      return {
        analysis: {
          hasChanges: false,
          overallStatus: 'aktuell',
          findings: [],
          summary: 'Analyse konnte nicht durchgeführt werden (API-Fehler).'
        },
        cost: { inputTokens: 0, outputTokens: 0, estimatedCost: 0 }
      };
    }
  }

  /**
   * Parse GPT response JSON
   */
  parseGptResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          hasChanges: !!parsed.hasChanges,
          overallStatus: parsed.overallStatus || 'aktuell',
          findings: Array.isArray(parsed.findings) ? parsed.findings : [],
          summary: parsed.summary || 'Keine Zusammenfassung verfügbar.'
        };
      }
    } catch (parseError) {
      console.error(`   ❌ JSON parse error: ${parseError.message}`);
    }

    return {
      hasChanges: false,
      overallStatus: 'aktuell',
      findings: [],
      summary: 'Analyse-Ergebnis konnte nicht gelesen werden.'
    };
  }

  /**
   * Extract text from contract (S3 or local)
   */
  async extractContractText(contract) {
    try {
      if (contract.s3Key) {
        return await this.extractTextFromS3(contract.s3Key);
      } else if (contract.filePath) {
        return await this.extractTextFromLocal(contract.filePath);
      } else if (contract.content) {
        return contract.content.substring(0, this.maxTextLength);
      }
      return '';
    } catch (error) {
      console.error(`   ❌ Text extraction failed for ${contract.name}: ${error.message}`);
      return '';
    }
  }

  async extractTextFromS3(s3Key) {
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const pdfData = await pdfParse(buffer);
    return pdfData.text.substring(0, this.maxTextLength);
  }

  async extractTextFromLocal(filePath) {
    const fs = require("fs").promises;
    const path = require("path");
    const cleanPath = filePath.replace('/uploads/', '');
    const fullPath = path.join(__dirname, '../uploads', cleanPath);
    const buffer = await fs.readFile(fullPath);
    const pdfData = await pdfParse(buffer);
    return pdfData.text.substring(0, this.maxTextLength);
  }

  /**
   * Queue weekly check results as digest alert
   */
  async queueWeeklyCheckAlert(userId, contract, analysis) {
    try {
      const digestQueueCollection = this.db.collection("digest_queue");

      // Build description from findings
      const findingsSummary = analysis.findings
        .map(f => `[${f.severity.toUpperCase()}] ${f.title}`)
        .join('; ');

      await digestQueueCollection.insertOne({
        userId: new ObjectId(userId),
        contractId: contract._id.toString(),
        contractName: contract.name || 'Unbekannt',
        type: 'weekly_legal_check',
        lawTitle: `Wöchentlicher Rechtscheck: ${analysis.overallStatus === 'kritisch' ? 'Kritische Probleme' : 'Handlungsbedarf'}`,
        lawDescription: analysis.summary,
        lawArea: 'Rechtscheck',
        score: analysis.overallStatus === 'kritisch' ? 0.95 : 0.80,
        findings: analysis.findings,
        findingsSummary,
        digestMode: 'weekly',
        queued: true,
        sent: false,
        queuedAt: new Date()
      });

      console.log(`   📬 Queued weekly check alert for ${contract.name}`);
    } catch (error) {
      console.error(`   ❌ Error queueing weekly check alert: ${error.message}`);
    }
  }

  /**
   * Cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Save health record
   */
  async saveHealthRecord(data) {
    try {
      await this.db.collection("monitoring_health").insertOne({
        service: 'weekly_legal_check',
        lastRunAt: new Date(),
        lastRunStatus: data.status,
        usersChecked: data.usersChecked || 0,
        contractsChecked: data.contractsChecked || 0,
        findingsCount: data.findingsCount || 0,
        estimatedCost: data.estimatedCost || 0,
        duration: data.duration || 0,
        error: data.error || null,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('❌ [WEEKLY-CHECK] Health record save failed:', error.message);
    }
  }

  async close() {
    if (this.vectorStore) await this.vectorStore.close();
    if (this.mongoClient) await this.mongoClient.close();
  }
}

module.exports = WeeklyLegalCheck;
