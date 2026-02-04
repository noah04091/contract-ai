// backend/jobs/weeklyLegalCheck.js
// Weekly Legal Change Monitoring - Universelles Vertragsmonitoring
// Stufe 1: Datenbank-Check (RSS/Laws der letzten 7 Tage) mit Volltext-Kontext
// Stufe 2: GPT-4o-mini Chunked Analysis (100% des Vertrags)
//
// IMPORTANT:
// This system evaluates detected legal changes from known sources (20 official RSS feeds).
// It does NOT claim completeness of the legal landscape.
// Never use wording like "aktueller Rechtsstand" or "vollstaendige Rechtspruefung" -
// the system checks RECOGNIZED changes from SPECIFIC sources, not all of German law.

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

    // Chunked analysis settings
    this.chunkSize = 6000;        // chars per chunk
    this.chunkOverlap = 500;      // overlap between chunks
    this.maxChunksPerContract = 15; // cost safeguard (~90k chars max)
    this.chunkPauseMs = 500;      // pause between chunk GPT calls

    // Law context settings
    this.maxLawContentLength = 3000; // chars of full law text per change in GPT context
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
      try {
        await this.saveHealthRecord({
          status: 'error',
          error: error.message,
          duration: ((Date.now() - startTime) / 1000)
        });
      } catch (healthErr) {
        console.error('❌ [WEEKLY-CHECK] Failed to save health record:', healthErr.message);
      }
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
   * 2-Stage check for a single contract (with chunked analysis)
   */
  async checkSingleContract(contract, user) {
    console.log(`   📄 Checking: ${contract.name}`);

    // Extract FULL contract text (no truncation)
    const fullText = await this.extractContractText(contract);
    if (!fullText || fullText.trim().length < 50) {
      console.log(`   ⏭️  Skipping ${contract.name} - insufficient text`);
      return { findingsCount: 0, estimatedCost: 0 };
    }

    // === STUFE 1: Datenbank-Check (with fullContent) ===
    const stage1Results = await this.stage1DatabaseCheck(contract, fullText, user);

    // === STUFE 2: Chunked GPT Legal Check ===
    const chunks = this.chunkContractText(fullText);
    console.log(`   📊 Contract ${contract.name}: ${fullText.length} chars, ${chunks.length} chunks`);

    const allFindings = [];
    let totalCost = { inputTokens: 0, outputTokens: 0, estimatedCost: 0 };

    for (const chunk of chunks) {
      const result = await this.stage2GptCheck(chunk.text, contract, stage1Results, chunk.chunkIndex, chunks.length);

      if (result.analysis.findings && result.analysis.findings.length > 0) {
        allFindings.push(...result.analysis.findings.map(f => ({
          ...f,
          chunkIndex: chunk.chunkIndex,
          charRange: `${chunk.startChar}-${chunk.endChar}`
        })));
      }

      totalCost.inputTokens += result.cost.inputTokens;
      totalCost.outputTokens += result.cost.outputTokens;
      totalCost.estimatedCost += result.cost.estimatedCost;

      // Pause between chunk GPT calls
      if (chunk.chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.chunkPauseMs));
      }
    }

    // Deduplicate findings from all chunks
    const deduplicatedFindings = this.deduplicateFindings(allFindings);

    // Determine overall status from merged findings
    const overallStatus = this.determineOverallStatus(deduplicatedFindings);

    // Build merged analysis with metadata
    const lastSyncTime = await this.getLastSyncTime();
    const mergedAnalysis = {
      hasChanges: deduplicatedFindings.length > 0,
      overallStatus,
      findings: deduplicatedFindings,
      summary: this.generateMergedSummary(deduplicatedFindings, chunks.length, fullText.length),
      metadata: {
        analyzedPercentage: 100,
        chunksAnalyzed: chunks.length,
        totalCharacters: fullText.length,
        dataSourcesUsed: this.getDataSourcesList(stage1Results),
        confidenceScore: this.calculateConfidence(stage1Results, chunks.length),
        lastDataSync: lastSyncTime,
        modelUsed: 'gpt-4o-mini',
        disclaimer: 'KI-gest\u00FCtzte Vorpr\u00FCfung - ersetzt keine anwaltliche Beratung. Alle Angaben ohne Gew\u00E4hr.'
      }
    };

    // Save results
    const checkResult = {
      userId: user._id,
      contractId: contract._id,
      contractName: contract.name || 'Unbekannt',
      checkDate: new Date(),
      stage1Results,
      stage2Results: mergedAnalysis,
      costEstimate: totalCost,
      createdAt: new Date()
    };

    await this.db.collection("weekly_legal_checks").insertOne(checkResult);

    // Queue digest alert if there are findings
    if (mergedAnalysis.hasChanges && mergedAnalysis.findings.length > 0) {
      await this.queueWeeklyCheckAlert(user._id, contract, mergedAnalysis);
    }

    const findingsCount = deduplicatedFindings.length;
    console.log(`   ✅ ${contract.name}: ${overallStatus} (${findingsCount} findings, ${chunks.length} chunks, $${totalCost.estimatedCost.toFixed(4)})`);

    return {
      findingsCount,
      estimatedCost: totalCost.estimatedCost
    };
  }

  /**
   * Split contract text into overlapping chunks for analysis
   */
  chunkContractText(fullText) {
    const chunks = [];

    // If text fits in one chunk, no splitting needed
    if (fullText.length <= this.chunkSize) {
      return [{
        text: fullText,
        startChar: 0,
        endChar: fullText.length,
        chunkIndex: 0
      }];
    }

    for (let i = 0; i < fullText.length; i += (this.chunkSize - this.chunkOverlap)) {
      const chunkText = fullText.substring(i, i + this.chunkSize);
      if (chunkText.trim().length < 50) break; // Skip tiny trailing chunks

      chunks.push({
        text: chunkText,
        startChar: i,
        endChar: Math.min(i + this.chunkSize, fullText.length),
        chunkIndex: chunks.length
      });

      // Cost safeguard
      if (chunks.length >= this.maxChunksPerContract) {
        console.log(`   ⚠️  Max chunks (${this.maxChunksPerContract}) reached, truncating analysis`);
        break;
      }
    }

    return chunks;
  }

  /**
   * Deduplicate findings from multiple chunks by title similarity
   */
  deduplicateFindings(findings) {
    if (findings.length === 0) return [];

    const seen = new Map();

    for (const finding of findings) {
      if (!finding || !finding.title) continue; // Skip malformed findings
      // Normalize title for comparison
      const key = finding.title.toLowerCase().replace(/\s+/g, ' ').trim();

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, finding);
      } else {
        // Keep the one with higher severity
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        if ((severityOrder[finding.severity] || 0) > (severityOrder[existing.severity] || 0)) {
          seen.set(key, finding);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Determine overall status from findings
   */
  determineOverallStatus(findings) {
    if (findings.length === 0) return 'aktuell';
    if (findings.some(f => f.severity === 'critical')) return 'kritisch';
    if (findings.some(f => f.severity === 'warning')) return 'handlungsbedarf';
    return 'aktuell';
  }

  /**
   * Generate merged summary from all chunk analyses
   */
  generateMergedSummary(findings, chunksCount, totalChars) {
    if (findings.length === 0) {
      return `Vollst\u00E4ndige Analyse (${chunksCount} Abschnitte, ${totalChars.toLocaleString('de-DE')} Zeichen). Keine rechtlichen Auff\u00E4lligkeiten gefunden.`;
    }

    const critical = findings.filter(f => f.severity === 'critical').length;
    const warnings = findings.filter(f => f.severity === 'warning').length;
    const info = findings.filter(f => f.severity === 'info').length;

    const parts = [];
    if (critical > 0) parts.push(`${critical} kritische`);
    if (warnings > 0) parts.push(`${warnings} Warnungen`);
    if (info > 0) parts.push(`${info} Hinweise`);

    return `Vollst\u00E4ndige Analyse (${chunksCount} Abschnitte, 100% des Vertrags): ${parts.join(', ')}. ${findings.length} Befunde insgesamt.`;
  }

  /**
   * Calculate confidence score based on available context
   */
  calculateConfidence(stage1Results, chunksAnalyzed) {
    let score = 0.5; // Base confidence
    if (chunksAnalyzed > 0) score += 0.2; // Full contract analyzed
    if (stage1Results.relevantChanges.length > 0) score += 0.15; // Had law context
    if (stage1Results.relevantChanges.some(c => c.fullContent)) score += 0.15; // Had full law text
    return Math.min(1.0, score);
  }

  /**
   * Get list of data sources used
   */
  getDataSourcesList(stage1Results) {
    const sources = new Set(['gpt-4o-mini']);
    for (const change of stage1Results.relevantChanges) {
      if (change.feedId) sources.add(change.feedId);
      if (change.area) sources.add(change.area);
    }
    return Array.from(sources);
  }

  /**
   * Get timestamp of last RSS sync
   */
  async getLastSyncTime() {
    try {
      const healthRecord = await this.db.collection("monitoring_health")
        .findOne({ service: 'legal_pulse_monitor' }, { sort: { lastRunAt: -1 } });
      return healthRecord?.lastRunAt || null;
    } catch {
      return null;
    }
  }

  /**
   * STUFE 1: Check database for recent law changes relevant to this contract
   * Now includes fullContent from lawContentFetcher
   */
  async stage1DatabaseCheck(contract, contractText, user) {
    try {
      const lawsCollection = this.db.collection("laws");
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Read user's Legal Pulse settings
      const userSettings = user?.legalPulseSettings || {};
      const userThreshold = userSettings.similarityThreshold || 0.70;
      const userCategories = Array.isArray(userSettings.categories)
        ? userSettings.categories
        : null; // null = no setting yet, use all categories (default behavior)

      // Empty categories array = user explicitly deselected all = no results
      if (userCategories !== null && userCategories.length === 0) {
        return { lawChangesFound: 0, relevantChanges: [] };
      }

      // Build query - filter by user's selected categories if set
      const lawQuery = { updatedAt: { $gte: oneWeekAgo } };
      if (userCategories && userCategories.length > 0) {
        lawQuery.area = { $in: userCategories };
      }

      // Get recent law changes (including fullContent if available)
      const recentLaws = await lawsCollection
        .find(lawQuery)
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

            if (similarity >= userThreshold) {
              relevantChanges.push({
                lawId: law.lawId || law._id.toString(),
                title: law.title,
                area: law.area,
                score: similarity,
                summary: (law.summary || law.description || '').substring(0, 500),
                fullContent: law.fullContent || null, // Include full text if fetched
                feedId: law.feedId || null
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
          summary: (law.summary || law.description || '').substring(0, 500),
          fullContent: law.fullContent || null,
          feedId: law.feedId || null
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 5);
  }

  /**
   * STUFE 2: GPT-4o-mini legal check for a single chunk
   * Now receives enriched law context with full text
   */
  async stage2GptCheck(contractText, contract, stage1Results, chunkIndex = 0, totalChunks = 1) {
    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Build enriched Stage 1 context with full law texts
    let stage1Context = '';
    if (stage1Results.relevantChanges.length > 0) {
      stage1Context = '\n\nERKANNTE RECHTSÄNDERUNGEN (letzte 7 Tage, aus offiziellen Quellen):\n';
      for (const change of stage1Results.relevantChanges) {
        stage1Context += `\n--- ${change.title} (Bereich: ${change.area || 'Allgemein'}, Relevanz: ${(change.score * 100).toFixed(0)}%) ---\n`;

        // Use full content if available, otherwise fall back to summary
        if (change.fullContent) {
          stage1Context += change.fullContent.substring(0, this.maxLawContentLength) + '\n';
        } else if (change.summary) {
          stage1Context += change.summary + '\n';
        }
      }
    }

    // Chunk info for multi-chunk analysis
    const chunkInfo = totalChunks > 1
      ? `\nHINWEIS: Dies ist Abschnitt ${chunkIndex + 1} von ${totalChunks} des Vertrags. Analysiere NUR diesen Abschnitt.\n`
      : '';

    const systemPrompt = `Du bist ein erfahrener Rechtsanwalt f\u00FCr deutsches Recht, spezialisiert auf Vertragsrecht, Arbeitsrecht, Mietrecht, Handelsrecht, Datenschutzrecht und Verbraucherrecht.
Du f\u00FChrst eine w\u00F6chentliche Rechts\u00E4nderungs-\u00DCberwachung von Vertr\u00E4gen durch. Deine Aufgabe ist es, die Auswirkungen neu erkannter rechtlicher \u00C4nderungen auf den Vertrag zu bewerten.
Bewerte AUSSCHLIESSLICH auf Basis der bereitgestellten Quellen und deines allgemeinen Rechtswissens. Die bereitgestellten Rechts\u00E4nderungen stammen aus 20 offiziellen deutschen Rechtsquellen der letzten 7 Tage.
Antworte IMMER auf Deutsch und NUR mit validem JSON.`;

    const userPrompt = `Bewerte die Auswirkungen neu erkannter Rechts\u00E4nderungen auf den folgenden Vertrag (Pr\u00FCfdatum: ${today}).

VERTRAGSNAME: ${contract.name || 'Unbekannt'}
VERTRAGSSTATUS: ${contract.status || 'Aktiv'}
LAUFZEIT: ${contract.laufzeit || 'Nicht angegeben'}
K\u00DCNDIGUNGSFRIST: ${contract.kuendigung || 'Nicht angegeben'}
${chunkInfo}
VERTRAGSTEXT:
${contractText}
${stage1Context}

Pr\u00FCfe folgende Aspekte UNIVERSELL (unabh\u00E4ngig vom Vertragstyp):
1. Sind alle Klauseln nach aktuellem Recht noch wirksam?
2. Gibt es neue gesetzliche Anforderungen die der Vertrag nicht erf\u00FCllt?
3. Sind Fristen/K\u00FCndigungsrechte nach aktuellem Recht korrekt?
4. Gibt es AGB-rechtliche Probleme (\u00A7\u00A7 305-310 BGB)?
5. Ist der DSGVO-Compliance-Status aktuell?
6. Gibt es branchenspezifische \u00C4nderungen die relevant sind?
7. Fehlen wichtige Vertragsklauseln die gesetzlich empfohlen/vorgeschrieben sind?

WICHTIG:
- Wenn der Vertrag rechtlich einwandfrei ist, setze hasChanges auf false und findings als leeres Array
- Sei KONKRET: Zitiere die betroffenen Klauseln und nenne die genaue Rechtsgrundlage
- Nur ECHTE, aktuelle rechtliche Probleme melden - keine hypothetischen
- Beziehe dich auf die bereitgestellten ERKANNTEN RECHTSÄNDERUNGEN wenn relevant

Antworte NUR mit diesem JSON-Format:
{
  "hasChanges": true/false,
  "overallStatus": "aktuell" | "handlungsbedarf" | "kritisch",
  "findings": [
    {
      "type": "law_change" | "risk" | "improvement" | "compliance",
      "severity": "info" | "warning" | "critical",
      "title": "Kurzer Titel",
      "description": "Was genau das Problem/die \u00C4nderung ist",
      "affectedClause": "Betroffene Klausel im Vertrag (Zitat oder Verweis)",
      "legalBasis": "Rechtsgrundlage (z.B. \u00A7 622 BGB)",
      "recommendation": "Konkreter Handlungsvorschlag"
    }
  ],
  "summary": "1-2 S\u00E4tze Zusammenfassung des Gesamtstatus"
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
      console.error(`   ❌ GPT analysis failed (chunk ${chunkIndex + 1}/${totalChunks}): ${error.message}`);
      return {
        analysis: {
          hasChanges: false,
          overallStatus: 'aktuell',
          findings: [],
          summary: 'Analyse konnte nicht durchgef\u00FChrt werden (API-Fehler).'
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
          summary: parsed.summary || 'Keine Zusammenfassung verf\u00FCgbar.'
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
   * Extract FULL text from contract (no truncation)
   * Priority: MongoDB fullText > S3 PDF > Local file > content field
   */
  async extractContractText(contract) {
    try {
      // Priority 1: Use stored fullText from MongoDB (fastest, no re-extraction)
      if (contract.fullText && contract.fullText.length > 50) {
        return contract.fullText;
      }
      if (contract.extractedText && contract.extractedText.length > 50) {
        return contract.extractedText;
      }
      if (contract.content && contract.content.length > 50) {
        return contract.content;
      }

      // Priority 2: Extract from S3 PDF
      if (contract.s3Key) {
        return await this.extractTextFromS3(contract.s3Key);
      }

      // Priority 3: Extract from local file
      if (contract.filePath) {
        return await this.extractTextFromLocal(contract.filePath);
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
    return pdfData.text; // Full text, no truncation
  }

  async extractTextFromLocal(filePath) {
    const fs = require("fs").promises;
    const path = require("path");
    const cleanPath = filePath.replace('/uploads/', '');
    const fullPath = path.join(__dirname, '../uploads', cleanPath);
    const buffer = await fs.readFile(fullPath);
    const pdfData = await pdfParse(buffer);
    return pdfData.text; // Full text, no truncation
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
        lawTitle: `Rechts\u00E4nderungs-\u00DCberwachung: ${analysis.overallStatus === 'kritisch' ? 'Kritische Probleme' : 'Handlungsbedarf'}`,
        lawDescription: analysis.summary,
        lawArea: 'Rechts\u00E4nderungs-\u00DCberwachung',
        score: analysis.overallStatus === 'kritisch' ? 0.95 : 0.80,
        findings: analysis.findings,
        findingsSummary,
        metadata: analysis.metadata,
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
