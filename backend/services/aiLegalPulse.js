// 📁 backend/services/aiLegalPulse.js
const { OpenAI } = require("openai");
const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const path = require("path");
const { getInstance: getLawEmbeddings } = require("./lawEmbeddings");

class AILegalPulse {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // RAG Integration
    this.lawEmbeddings = getLawEmbeddings();
    this.useRAG = true; // Enable RAG by default

    // Legal analysis prompts
    this.prompts = {
      riskAnalysis: `Du bist ein erfahrener Rechtsanwalt, spezialisiert auf Vertragsrecht. 
Analysiere den folgenden Vertrag und bewerte das rechtliche Risiko auf einer Skala von 0-100:

- 0-30: Geringes Risiko (gut ausbalanciert, faire Bedingungen)
- 31-70: Mittleres Risiko (einige problematische Klauseln)
- 71-100: Hohes Risiko (unausgewogen, problematische Bedingungen)

Berücksichtige dabei:
1. Einseitige oder unfaire Klauseln
2. Fehlende wichtige Schutzbestimmungen  
3. Haftungsrisiken
4. Kündigungsregelungen
5. Datenschutz-Compliance (DSGVO)
6. AGB-rechtliche Probleme

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "riskScore": [0-100],
  "riskLevel": "low|medium|high",
  "summary": "Kurze Zusammenfassung der Risikoeinschätzung",
  "riskFactors": ["Liste der identifizierten Risikofaktoren"],
  "legalRisks": ["Spezifische rechtliche Risiken"],
  "recommendations": ["Konkrete Empfehlungen zur Risikominimierung"]
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

  // Hauptanalyse-Funktion für einen Vertrag
  async analyzeContract(contract) {
    try {
      console.log(`🧠 Starte AI-Analyse für Vertrag: ${contract.name}`);
      
      // 1. PDF-Text extrahieren (falls vorhanden)
      let contractText = '';
      if (contract.filePath) {
        contractText = await this.extractTextFromPDF(contract.filePath);
      }
      
      // 2. Basis-Informationen sammeln
      const contractInfo = this.gatherContractInfo(contract);
      
      // 3. KI-Analyse durchführen
      const aiAnalysis = await this.performAIAnalysis(contractText, contractInfo);
      
      // 4. Risk Score berechnen
      const finalRiskScore = this.calculateFinalRiskScore(aiAnalysis, contract);
      
      // 5. Legal Pulse Objekt erstellen
      const legalPulse = this.createLegalPulseResult(aiAnalysis, finalRiskScore, contract);

      console.log(`✅ AI-Analyse abgeschlossen für ${contract.name} (Score: ${finalRiskScore}, Health: ${legalPulse.healthScore})`);
      return legalPulse;
      
    } catch (error) {
      console.error(`❌ Fehler bei AI-Analyse für ${contract.name}:`, error);
      // Fallback auf Simulation bei Fehlern
      return this.fallbackAnalysis(contract);
    }
  }

  // PDF-Text extrahieren
  async extractTextFromPDF(filePath) {
    try {
      // Entferne '/uploads/' prefix und erstelle absoluten Pfad
      const cleanPath = filePath.replace('/uploads/', '');
      const fullPath = path.join(__dirname, '../uploads', cleanPath);
      
      const buffer = await fs.readFile(fullPath);
      const pdfData = await pdfParse(buffer);
      
      // Begrenzen auf sinnvolle Textmenge für AI (ca. 10.000 Zeichen)
      return pdfData.text.substring(0, 10000);
    } catch (error) {
      console.error('❌ Fehler beim PDF-Text-Extract:', error);
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

  // Haupt-AI-Analyse (Enhanced with RAG)
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
        console.log(`[AI-LEGAL-PULSE] RAG: Found ${relevantLaws.length} relevant law sections`);
      } catch (error) {
        console.error('[AI-LEGAL-PULSE] RAG query failed, continuing without:', error);
      }
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
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "Du bist ein Experte für deutsches Vertragsrecht und führst Legal Due Diligence durch." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

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
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Du bist ein erfahrener Rechtsanwalt für deutsches Vertragsrecht. Analysiere den Vertrag professionell und objektiv. Berücksichtige die bereitgestellten relevanten Gesetzesgrundlagen in deiner Analyse."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      });

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
          legalRisks: Array.isArray(parsed.legalRisks) ? parsed.legalRisks : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
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
    // Einfache Textanalyse als Fallback
    const riskKeywords = [
      'hohes Risiko', 'problematisch', 'bedenklich', 'unfair', 'einseitig',
      'rechtswidrig', 'unwirksam', 'riskant', 'nachteilig'
    ];
    
    const riskCount = riskKeywords.filter(keyword => 
      aiResponse.toLowerCase().includes(keyword)
    ).length;
    
    const riskScore = Math.min(100, Math.max(20, riskCount * 15 + 30));
    
    return {
      riskScore,
      riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      summary: aiResponse.substring(0, 200) + '...',
      riskFactors: ['Basis-Analyse durchgeführt'],
      legalRisks: ['Detaillierte Analyse erforderlich'],
      recommendations: ['Rechtliche Prüfung empfohlen']
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
      legalRisks: aiAnalysis.legalRisks,
      recommendations: aiAnalysis.recommendations,
      analysisDate: new Date(),
      aiGenerated: true
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
    console.log(`⚠️ Fallback-Analyse für ${contract.name}`);
    
    // Einfache regelbasierte Analyse
    let riskScore = 50; // Basis-Score
    
    if (contract.status === 'Abgelaufen') riskScore += 25;
    if (contract.status === 'Bald ablaufend') riskScore += 15;
    if (!contract.expiryDate) riskScore += 10;
    
    riskScore = Math.min(100, Math.max(0, riskScore));
    
    return {
      riskScore,
      summary: `Basis-Analyse für ${contract.name}. Für detaillierte Bewertung ist eine manuelle Prüfung erforderlich.`,
      lastChecked: new Date(),
      lawInsights: ['Detaillierte rechtliche Prüfung empfohlen'],
      marketSuggestions: ['Marktvergleich durchführen'],
      riskFactors: ['Automatische Analyse unvollständig'],
      legalRisks: ['Manuelle Rechtsprüfung erforderlich'],
      recommendations: ['Professionelle Vertragsanalyse beauftragen'],
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