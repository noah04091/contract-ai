// 📁 backend/services/aiLegalPulse.js
const { OpenAI } = require("openai");
const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const path = require("path");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
// Graceful imports - Services sind optional
let getLawEmbeddings = null;
let getCostTrackingService = null;

try {
  getLawEmbeddings = require("./lawEmbeddings").getInstance;
} catch (error) {
  // lawEmbeddings not available, RAG disabled
}

try {
  getCostTrackingService = require("./costTracking").getInstance;
} catch (error) {
  // costTracking not available
}

class AILegalPulse {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // RAG Integration (graceful degradation)
    this.lawEmbeddings = null;
    this.useRAG = false;

    try {
      if (getLawEmbeddings) {
        this.lawEmbeddings = getLawEmbeddings();
        this.useRAG = true;
      }
    } catch (error) {
      // RAG init failed, continuing without RAG
    }

    // Legal analysis prompts
    this.prompts = {
      riskAnalysis: `Du bist ein erfahrener Rechtsanwalt, spezialisiert auf Vertragsrecht.
Analysiere den folgenden Vertrag INDIVIDUELL und bewerte das rechtliche Risiko auf einer Skala von 0-100:

- 0-30: Geringes Risiko (gut ausbalanciert, faire Bedingungen)
- 31-60: Mittleres Risiko (einige problematische Klauseln)
- 61-100: Hohes Risiko (unausgewogen, problematische Bedingungen)

WICHTIG:
- Analysiere NUR die TATSÄCHLICH vorhandenen Risiken in DIESEM spezifischen Vertrag
- Wenn keine Risiken vorliegen, gib ein leeres Array zurück
- Sei vertragstyp-spezifisch (Arbeitsvertrag ≠ Mietvertrag ≠ Kaufvertrag)
- KEINE künstlichen Limits - liste ALLE gefundenen Risiken auf (auch wenn es 0, 3 oder 15+ sind)
- Generiere für JEDES Risiko vollständige Details (Beschreibung, Auswirkungen, Lösung, Empfehlung)
- Der riskScore MUSS eine PRÄZISE, INDIVIDUELLE Zahl sein (z.B. 17, 43, 68, 82) - NIEMALS runde Standardwerte wie 30, 50 oder 70 verwenden. Berechne den Score granular anhand der tatsächlich gefundenen Risiken.

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "riskScore": [0-100],
  "riskLevel": "low|medium|high",
  "summary": "Kurze Zusammenfassung der Risikoeinschätzung",
  "riskFactors": ["Liste der identifizierten Risikofaktoren"],
  "topRisks": [
    {
      "title": "Prägnanter Risiko-Titel",
      "description": "Detaillierte Beschreibung des spezifischen Risikos in DIESEM Vertrag",
      "severity": "low|medium|high|critical",
      "impact": "Konkrete Auswirkungen und potenzielle Folgen für DIESEN Vertrag",
      "solution": "Maßgeschneiderter Lösungsvorschlag zur Behebung des Risikos",
      "recommendation": "Spezifische Handlungsempfehlung mit Priorisierung",
      "affectedClauses": ["Betroffene Vertragsklauseln oder Paragraphen"],
      "affectedClauseText": "EXAKTER Wortlaut der betroffenen Klausel aus dem Vertragstext (zitiert). Wenn keine spezifische Klausel identifizierbar: null",
      "replacementText": "Konkreter Formulierungsvorschlag als Ersatz für die problematische Klausel. Vollständiger, rechtssicherer Alternativtext",
      "legalBasis": "Rechtsgrundlage: Welches Gesetz/Paragraph betroffen ist und warum (z.B. '§ 622 BGB - Mindest-Kündigungsfristen nicht eingehalten')"
    }
  ],
  "recommendations": [
    {
      "title": "Empfehlungs-Titel",
      "description": "Detaillierte Beschreibung der Maßnahme",
      "priority": "low|medium|high|critical",
      "effort": "Geschätzter Aufwand (gering/mittel/hoch)",
      "impact": "Erwartete Verbesserung durch Umsetzung",
      "steps": ["Konkrete Umsetzungsschritte"],
      "affectedClauseRef": "Referenz auf die betroffene Vertragsklausel (z.B. '§4 Abs. 2 - Kündigungsfrist' oder 'Abschnitt 3 - Haftung')",
      "suggestedText": "Konkreter neuer Klauseltext zur Umsetzung dieser Empfehlung. Vollständiger, einsetzbarer Formulierungsvorschlag",
      "legalBasis": "Rechtsgrundlage für diese Empfehlung (z.B. '§ 309 Nr. 7 BGB - Haftungsausschluss unwirksam')"
    }
  ]
}`,

      clauseAnalysis: `Analysiere den Vertrag auf problematische Klauseln. Identifiziere:

1. Unwirksame AGB-Klauseln (§§ 305-310 BGB)
2. DSGVO-Verstöße
3. Einseitige Haftungsfreistellungen
4. Problematische Kündigungsklauseln
5. Unverhältnismäßige Vertragsstrafen
6. Fehlende Gewährleistungsrechte

Antworte als JSON mit detaillierter Analyse pro Klausel.`,

      complianceCheck: `Prüfe den Vertrag auf Compliance mit:

1. DSGVO (Datenschutz-Grundverordnung)
2. BGB (Bürgerliches Gesetzbuch) - insbesondere AGB-Recht
3. HGB (Handelsgesetzbuch) bei Handelsgeschäften
4. UWG (Gesetz gegen unlauteren Wettbewerb)
5. Branchenspezifische Regelungen

Bewerte jede Compliance-Kategorie und gib konkrete Verbesserungsvorschläge.`
    };
  }

  /**
   * Determine AI model and token limits based on user tier
   *
   * Smart Chunking (Klausel-für-Klausel): Available for ALL Business+ users
   * Deep Analysis (GPT-4-turbo): ONLY for Enterprise users (optional toggle)
   *
   * - Free: gpt-4o-mini (shouldn't reach here via requirePremium)
   * - Business: gpt-4o-mini + Smart Chunking (standard Legal Pulse)
   * - Enterprise: gpt-4-turbo + Smart Chunking (Deep Analysis, optional toggle)
   */
  determineAnalysisConfig(user) {
    const { isEnterpriseOrHigher } = require('../constants/subscriptionPlans');
    const plan = user?.subscriptionPlan || 'free';

    // Enterprise: GPT-4-turbo Deep Analysis (optional toggle, default ON)
    if (isEnterpriseOrHigher(plan)) {
      const deepEnabled = user?.legalPulseSettings?.deepAnalysis !== false;
      return deepEnabled
        ? { model: 'gpt-4-turbo', maxTokens: 8000, deep: true }
        : { model: 'gpt-4o-mini', maxTokens: 4000, deep: false };
    }

    // Business: Standard analysis with gpt-4o-mini (Smart Chunking still applies!)
    // Smart Chunking is handled separately in performAIAnalysis()
    return { model: 'gpt-4o-mini', maxTokens: 4000, deep: false };
  }

  /**
   * Split contract into logical chunks for clause-by-clause analysis
   */
  splitIntoChunks(text, maxChunkSize = 6000) {
    if (text.length <= maxChunkSize) return [text];

    const chunks = [];
    const sections = text.split(/\n\n+|(?=§\s*\d+)|(?=Artikel\s+\d+)/i);

    let currentChunk = '';
    for (const section of sections) {
      if ((currentChunk + section).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = currentChunk.slice(-200) + section; // 200 char overlap
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + section;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * Analyze contract in chunks and merge results
   * Includes error handling for individual chunks - continues even if one fails
   */
  async analyzeContractChunks(contractText, contractInfo, relevantLaws = []) {
    const chunks = this.splitIntoChunks(contractText);
    console.log(`📊 Analyzing contract in ${chunks.length} chunks`);

    const chunkResults = [];
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        console.log(`   Chunk ${i + 1}/${chunks.length}...`);
        const result = await this.analyzeFullContract(chunks[i], contractInfo, relevantLaws);
        chunkResults.push(result);
      } catch (error) {
        failedChunks++;
        console.error(`   ⚠️ Chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
        // Continue with other chunks instead of failing completely
      }
    }

    // If ALL chunks failed, throw error
    if (chunkResults.length === 0) {
      throw new Error(`All ${chunks.length} chunks failed to analyze`);
    }

    // Log if some chunks failed
    if (failedChunks > 0) {
      console.warn(`   ⚠️ ${failedChunks}/${chunks.length} chunks failed, analysis based on ${chunkResults.length} successful chunks`);
    }

    return this.mergeChunkResults(chunkResults);
  }

  /**
   * Merge and deduplicate results from chunks
   */
  mergeChunkResults(results) {
    const merged = { riskScore: 0, topRisks: [], recommendations: [], summary: '', aiGenerated: true };

    // Dedupe risks by title
    const seenRisks = new Set();
    for (const r of results) {
      for (const risk of (r.topRisks || [])) {
        const key = risk.title?.toLowerCase().substring(0, 50);
        if (!seenRisks.has(key)) { seenRisks.add(key); merged.topRisks.push(risk); }
      }
    }

    // Dedupe recommendations
    const seenRecs = new Set();
    for (const r of results) {
      for (const rec of (r.recommendations || [])) {
        const key = rec.title?.toLowerCase().substring(0, 50);
        if (!seenRecs.has(key)) { seenRecs.add(key); merged.recommendations.push(rec); }
      }
    }

    // Score: Blend of average and max
    const scores = results.map(r => r.riskScore || 50).filter(s => s > 0);
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      merged.riskScore = Math.round((avg + Math.max(...scores)) / 2);
    }

    // Merge other properties from first result
    if (results.length > 0) {
      merged.riskLevel = results[0].riskLevel || 'medium';
      merged.riskFactors = results.flatMap(r => r.riskFactors || []);
      merged.legalRisks = results.flatMap(r => r.legalRisks || []);
    }

    merged.summary = results.map(r => r.summary).filter(Boolean).join(' ');
    return merged;
  }

  // Hauptanalyse-Funktion für einen Vertrag
  async analyzeContract(contract) {
    try {

      // 1. PDF-Text extrahieren (S3 oder lokaler Fallback)
      let contractText = '';
      if (contract.s3Key) {
        contractText = await this.extractTextFromS3(contract.s3Key);
      } else if (contract.filePath) {
        contractText = await this.extractTextFromLocalPDF(contract.filePath);
      }

      // 2. Basis-Informationen sammeln
      const contractInfo = this.gatherContractInfo(contract);

      // 3. KI-Analyse durchführen
      const aiAnalysis = await this.performAIAnalysis(contractText, contractInfo);

      // 4. Risk Score berechnen
      const finalRiskScore = this.calculateFinalRiskScore(aiAnalysis, contract);

      // 5. Legal Pulse Objekt erstellen
      const legalPulse = this.createLegalPulseResult(aiAnalysis, finalRiskScore, contract);

      return legalPulse;

    } catch (error) {
      console.error(`❌ Fehler bei AI-Analyse für ${contract.name}:`, error);
      // Fallback auf Simulation bei Fehlern
      return this.fallbackAnalysis(contract);
    }
  }

  // PDF-Text aus S3 extrahieren
  async extractTextFromS3(s3Key) {
    try {
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
      return pdfData.text.substring(0, 10000);
    } catch (error) {
      console.error(`❌ Fehler beim S3 PDF-Extract (${s3Key}):`, error.message);
      return '';
    }
  }

  // PDF-Text aus lokalem Dateisystem extrahieren (Legacy-Fallback)
  async extractTextFromLocalPDF(filePath) {
    try {
      const cleanPath = filePath.replace('/uploads/', '');
      const fullPath = path.join(__dirname, '../uploads', cleanPath);

      const buffer = await fs.readFile(fullPath);
      const pdfData = await pdfParse(buffer);

      return pdfData.text.substring(0, 10000);
    } catch (error) {
      console.error('❌ Fehler beim lokalen PDF-Text-Extract:', error.message);
      return '';
    }
  }

  // Contract-Basis-Info sammeln
  gatherContractInfo(contract) {
    return {
      name: contract.name || 'Unbekannt',
      laufzeit: contract.laufzeit || 'Unbekannt',
      kuendigung: contract.kuendigung || 'Unbekannt',
      status: contract.status || 'Unbekannt',
      expiryDate: contract.expiryDate || null,
      uploadedAt: contract.uploadedAt || null
    };
  }

  // Haupt-AI-Analyse (Enhanced with RAG + Smart Chunking)
  async performAIAnalysis(contractText, contractInfo) {
    // Wenn kein Text verfügbar, nutze nur Basis-Informationen
    if (!contractText || contractText.length < 100) {
      return await this.analyzeBasicInfo(contractInfo);
    }

    // RAG: Query relevant law sections
    let relevantLaws = [];
    if (this.useRAG) {
      try {
        relevantLaws = await this.lawEmbeddings.queryRelevantSections({
          text: contractText,
          topK: 5
        });
      } catch (error) {
        console.error('[AI-LEGAL-PULSE] RAG query failed, continuing without:', error);
      }
    }

    // Smart Chunking: Use chunked analysis for long contracts (>15k chars)
    if (contractText && contractText.length > 15000) {
      console.log(`📊 [Legal Pulse] Contract is ${contractText.length} chars, using chunked analysis`);
      return await this.analyzeContractChunks(contractText, contractInfo, relevantLaws);
    }

    // Vollanalyse mit Vertragstext + RAG-Kontext
    return await this.analyzeFullContract(contractText, contractInfo, relevantLaws);
  }

  // Analyse nur mit Basis-Informationen
  async analyzeBasicInfo(contractInfo) {
    const prompt = `Analysiere diese Vertragseckdaten:

Name: ${contractInfo.name}
Laufzeit: ${contractInfo.laufzeit}
Kündigungsfrist: ${contractInfo.kuendigung}
Status: ${contractInfo.status}

${this.prompts.riskAnalysis}

Basiere deine Analyse auf typischen Risiken für diese Art von Vertrag.`;

    try {
      // Determine model based on user tier
      const config = this.determineAnalysisConfig(contractInfo.user);
      console.log(`📊 [Legal Pulse] Using ${config.model} (deep: ${config.deep}) for basic analysis`);

      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "Du bist ein Experte für deutsches Vertragsrecht und führst Legal Due Diligence durch."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: config.maxTokens
      });

      // 💰 Track API cost
      if (response.usage) {
        try {
          const costTracker = getCostTrackingService ? getCostTrackingService() : null;
          if (!costTracker) return;
          await costTracker.trackAPICall({
            userId: contractInfo?.userId || null,
            model: 'gpt-4',
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            feature: 'legal-pulse',
            contractId: contractInfo?._id || contractInfo?.contractId || null,
            metadata: {
              contractName: contractInfo?.name,
              contractType: contractInfo?.type
            }
          });
        } catch (costError) {
          console.error(`⚠️ Legal Pulse cost tracking failed (non-critical):`, costError.message);
        }
      }

      return this.parseAIResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('❌ AI-Analyse Fehler:', error);
      throw error;
    }
  }

  // Vollanalyse mit Vertragstext (Enhanced with RAG)
  async analyzeFullContract(contractText, contractInfo, relevantLaws = []) {
    // Build RAG context
    let ragContext = '';
    if (relevantLaws.length > 0) {
      ragContext = '\n\nRELEVANTE GESETZLICHE GRUNDLAGEN (aus Datenbank):\n';
      relevantLaws.forEach((law, index) => {
        ragContext += `\n${index + 1}. ${law.lawId} ${law.sectionId}: ${law.title}\n`;
        ragContext += `   ${law.text.substring(0, 300)}...\n`;
        ragContext += `   Quelle: ${law.sourceUrl}\n`;
        ragContext += `   Relevanz: ${(law.relevance * 100).toFixed(1)}%\n`;
      });
    }

    const prompt = `Analysiere diesen Vertrag:

VERTRAGSECKDATEN:
Name: ${contractInfo.name}
Laufzeit: ${contractInfo.laufzeit}
Kündigungsfrist: ${contractInfo.kuendigung}
Status: ${contractInfo.status}

VERTRAGSTEXT:
${contractText}
${ragContext}

${this.prompts.riskAnalysis}`;

    try {
      // Determine model based on user tier
      const config = this.determineAnalysisConfig(contractInfo.user);
      console.log(`📊 [Legal Pulse] Using ${config.model} (deep: ${config.deep}) for full contract analysis`);

      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "Du bist ein erfahrener Rechtsanwalt für deutsches Vertragsrecht. Analysiere den Vertrag professionell und objektiv. Berücksichtige die bereitgestellten relevanten Gesetzesgrundlagen in deiner Analyse."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: config.maxTokens
      });

      // 💰 Track API cost
      if (response.usage) {
        try {
          const costTracker = getCostTrackingService ? getCostTrackingService() : null;
          if (!costTracker) return;
          await costTracker.trackAPICall({
            userId: contractInfo?.userId || null,
            model: 'gpt-4',
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            feature: 'legal-pulse',
            contractId: contractInfo?._id || contractInfo?.contractId || null,
            metadata: {
              contractName: contractInfo?.name,
              contractType: contractInfo?.type,
              ragEnabled: relevantLaws.length > 0,
              relevantLawsCount: relevantLaws.length
            }
          });
        } catch (costError) {
          console.error(`⚠️ Legal Pulse cost tracking failed (non-critical):`, costError.message);
        }
      }

      return this.parseAIResponse(response.choices[0].message.content);
    } catch (error) {
      console.error('❌ Full AI-Analyse Fehler:', error);
      throw error;
    }
  }

  // AI-Antwort parsen
  parseAIResponse(aiResponse) {
    try {
      // Extrahiere JSON aus der Antwort
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validierung und Defaults
        return {
          riskScore: Math.min(100, Math.max(0, parsed.riskScore || 50)),
          riskLevel: parsed.riskLevel || 'medium',
          summary: parsed.summary || 'Keine Zusammenfassung verfügbar',
          riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
          topRisks: Array.isArray(parsed.topRisks) ? parsed.topRisks : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          // Legacy support (deprecated)
          legalRisks: Array.isArray(parsed.legalRisks) ? parsed.legalRisks : []
        };
      }
    } catch (error) {
      console.error('❌ JSON Parse Fehler:', error);
    }

    // Fallback: Text-basierte Analyse
    return this.parseTextResponse(aiResponse);
  }

  // Fallback für Text-Responses
  parseTextResponse(aiResponse) {
    const lowerResponse = aiResponse.toLowerCase();

    // Gewichtete Keyword-Analyse für granularen Score
    const highRiskKeywords = ['rechtswidrig', 'unwirksam', 'nichtig', 'verboten', 'gesetzeswidrig'];
    const mediumRiskKeywords = ['problematisch', 'bedenklich', 'einseitig', 'nachteilig', 'unfair', 'riskant'];
    const lowRiskKeywords = ['verbesserungswürdig', 'unklar', 'ungenau', 'prüfenswert'];
    const positiveKeywords = ['ausgewogen', 'fair', 'angemessen', 'marktüblich', 'korrekt'];

    const highCount = highRiskKeywords.filter(k => lowerResponse.includes(k)).length;
    const mediumCount = mediumRiskKeywords.filter(k => lowerResponse.includes(k)).length;
    const lowCount = lowRiskKeywords.filter(k => lowerResponse.includes(k)).length;
    const positiveCount = positiveKeywords.filter(k => lowerResponse.includes(k)).length;

    // Granularer Score: Gewichtet nach Schwere + kleine Zufallsvarianz für Individualität
    const baseScore = (highCount * 18) + (mediumCount * 11) + (lowCount * 5) - (positiveCount * 8);
    const variance = Math.floor(Math.random() * 7) - 3; // -3 bis +3
    const riskScore = Math.min(100, Math.max(5, baseScore + 22 + variance));

    return {
      riskScore,
      riskLevel: riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low',
      summary: aiResponse.substring(0, 200) + '...',
      riskFactors: ['Basis-Analyse durchgeführt'],
      topRisks: [],
      legalRisks: ['Detaillierte Analyse erforderlich'],
      recommendations: [{
        title: 'Rechtliche Prüfung empfohlen',
        description: 'Die automatische Textanalyse lieferte kein strukturiertes Ergebnis. Eine manuelle rechtliche Prüfung wird empfohlen.',
        priority: 'high',
        effort: 'mittel',
        impact: 'hoch'
      }]
    };
  }

  // Finalen Risk Score berechnen
  calculateFinalRiskScore(aiAnalysis, contract) {
    let riskScore = aiAnalysis.riskScore;
    
    // Adjustments basierend auf Contract-Status
    if (contract.status === 'Abgelaufen') {
      riskScore = Math.min(100, riskScore + 20);
    } else if (contract.status === 'Bald ablaufend') {
      riskScore = Math.min(100, riskScore + 10);
    }
    
    // Adjustments basierend auf Laufzeit
    if (contract.laufzeit && contract.laufzeit.includes('Jahr')) {
      const years = parseInt(contract.laufzeit.match(/(\d+)/)?.[1] || '1');
      if (years > 5) {
        riskScore = Math.min(100, riskScore + 5); // Langzeitverträge = mehr Risiko
      }
    }
    
    return Math.round(riskScore);
  }

  // Legal Pulse Result erstellen (Enhanced for 2.0)
  createLegalPulseResult(aiAnalysis, finalRiskScore, contract = null) {
    const healthScore = this.calculateHealthScore(finalRiskScore, contract);

    const result = {
      riskScore: finalRiskScore,
      healthScore: healthScore,
      summary: aiAnalysis.summary,
      lastChecked: new Date(),
      lawInsights: this.generateLawInsights(aiAnalysis),
      marketSuggestions: this.generateMarketSuggestions(aiAnalysis),
      riskFactors: aiAnalysis.riskFactors,
      topRisks: aiAnalysis.topRisks || [],
      legalRisks: aiAnalysis.legalRisks || [],
      recommendations: aiAnalysis.recommendations || [],
      analysisDate: new Date(),
      aiGenerated: true,
      scoreHistory: [{ date: new Date(), score: finalRiskScore }]
    };

    // Add to analysis history
    if (!result.analysisHistory) {
      result.analysisHistory = [];
    }

    result.analysisHistory.push({
      date: new Date(),
      riskScore: finalRiskScore,
      healthScore: healthScore,
      changes: ['Initial analysis completed'],
      triggeredBy: 'periodic_scan'
    });

    return result;
  }

  // Calculate Health Score (Legal Pulse 2.0)
  calculateHealthScore(riskScore, contract) {
    // Base health = inverse of risk
    let health = 100 - (riskScore * 0.5);

    // Age penalty (if contract provided)
    if (contract) {
      const uploadDate = contract.uploadedAt || contract.createdAt || new Date();
      const ageInDays = (new Date() - new Date(uploadDate)) / (1000 * 60 * 60 * 24);
      const ageInYears = ageInDays / 365;
      const agePenalty = Math.min(10, ageInYears * 2);
      health -= agePenalty;
    }

    return Math.min(100, Math.max(0, Math.round(health)));
  }

  // Law Insights generieren
  generateLawInsights(aiAnalysis) {
    const insights = [];
    
    if (aiAnalysis.riskFactors.some(factor => factor.includes('AGB'))) {
      insights.push('BGB §§ 305-310: AGB-Kontrolle durchführen');
    }
    
    if (aiAnalysis.riskFactors.some(factor => factor.includes('Datenschutz'))) {
      insights.push('DSGVO Art. 6, 28: Rechtsgrundlage und Auftragsverarbeitung prüfen');
    }
    
    if (aiAnalysis.riskFactors.some(factor => factor.includes('Kündigung'))) {
      insights.push('BGB § 314: Außerordentliche Kündigungsrechte beachten');
    }
    
    if (aiAnalysis.riskFactors.some(factor => factor.includes('Haftung'))) {
      insights.push('BGB § 276: Haftungsausschlüsse auf Wirksamkeit prüfen');
    }
    
    // Default Insights wenn leer
    if (insights.length === 0) {
      insights.push('BGB: Allgemeine Vertragsrechtsprüfung empfohlen');
    }
    
    return insights;
  }

  // Market Suggestions generieren
  generateMarketSuggestions(aiAnalysis) {
    const suggestions = [];
    
    if (aiAnalysis.riskScore > 70) {
      suggestions.push('Branchenvergleich: Bessere Konditionen verfügbar');
      suggestions.push('Nachverhandlung: Einseitige Klauseln anpassen');
    } else if (aiAnalysis.riskScore > 40) {
      suggestions.push('Marktstandard: Einzelne Klauseln optimierbar');
    } else {
      suggestions.push('Marktkonform: Vertrag entspricht Branchenstandards');
    }
    
    // Spezifische Suggestions basierend auf Risikofaktoren
    if (aiAnalysis.riskFactors.some(factor => factor.includes('Zahlungs'))) {
      suggestions.push('Zahlungskonditionen: 30 Tage Zahlungsziel ist Marktstandard');
    }
    
    return suggestions;
  }

  // Fallback-Analyse bei Fehlern
  fallbackAnalysis(contract) {
    
    // Regelbasierte Analyse mit individueller Score-Berechnung
    let riskScore = 35; // Konservativer Basis-Score (ohne AI-Analyse unsicher)

    if (contract.status === 'Abgelaufen') riskScore += 22;
    if (contract.status === 'Bald ablaufend') riskScore += 13;
    if (!contract.expiryDate) riskScore += 8;
    if (!contract.kuendigung) riskScore += 6;
    if (contract.laufzeit && contract.laufzeit.includes('unbefristet')) riskScore += 4;

    // Kleine Varianz für Individualität (+/- 3 Punkte)
    const variance = Math.floor(Math.random() * 7) - 3;
    riskScore = Math.min(100, Math.max(5, riskScore + variance));
    
    const healthScore = this.calculateHealthScore(riskScore, contract);

    return {
      riskScore,
      healthScore,
      summary: `Basis-Analyse für ${contract.name}. Für detaillierte Bewertung ist eine manuelle Prüfung erforderlich.`,
      lastChecked: new Date(),
      lawInsights: ['Detaillierte rechtliche Prüfung empfohlen'],
      marketSuggestions: ['Marktvergleich durchführen'],
      riskFactors: ['Automatische Analyse unvollständig'],
      topRisks: [],
      legalRisks: ['Manuelle Rechtsprüfung erforderlich'],
      recommendations: [{
        title: 'Professionelle Vertragsanalyse beauftragen',
        description: 'Die automatische Analyse konnte nicht vollständig durchgeführt werden. Eine manuelle Prüfung durch einen Rechtsexperten wird empfohlen.',
        priority: 'high',
        effort: 'mittel',
        impact: 'hoch'
      }],
      scoreHistory: [{ date: new Date(), score: riskScore }],
      analysisDate: new Date(),
      aiGenerated: false
    };
  }

  // Batch-Analyse für mehrere Verträge
  async analyzeBatch(contracts, maxConcurrent = 3) {
    const results = [];
    
    // Verarbeite in Batches um API-Limits zu respektieren
    for (let i = 0; i < contracts.length; i += maxConcurrent) {
      const batch = contracts.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(contract => 
        this.analyzeContract(contract).catch(error => {
          console.error(`❌ Batch-Fehler bei ${contract.name}:`, error);
          return this.fallbackAnalysis(contract);
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Pause zwischen Batches (Rate Limiting)
      if (i + maxConcurrent < contracts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}

module.exports = AILegalPulse;