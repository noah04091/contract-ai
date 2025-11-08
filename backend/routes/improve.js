// Contract Improvement Endpoint
// Nimmt einen bestehenden Vertrag und Verbesserungswünsche und generiert eine verbesserte Version

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/contracts/improve
 * Body: {
 *   originalContract: string,  // Der aktuelle Vertragstext
 *   improvements: string,      // Verbesserungswünsche vom Nutzer
 *   contractType: string       // Optional: Vertragstyp für Kontext
 * }
 */
router.post('/improve', async (req, res) => {
  try {
    const { originalContract, improvements, contractType } = req.body;

    console.log('🔄 Contract Improvement Request:', {
      originalLength: originalContract?.length,
      improvementsLength: improvements?.length,
      contractType
    });

    // Validierung
    if (!originalContract || !improvements) {
      return res.status(400).json({
        success: false,
        error: 'Vertrag und Verbesserungswünsche sind erforderlich'
      });
    }

    if (originalContract.length < 100) {
      return res.status(400).json({
        success: false,
        error: 'Der Vertrag scheint zu kurz zu sein'
      });
    }

    if (improvements.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Bitte geben Sie spezifischere Verbesserungswünsche an'
      });
    }

    // GPT-4 Call für Verbesserung
    const systemPrompt = `Du bist Experte für deutsches Vertragsrecht und passt Verträge präzise an Nutzerwünsche an.

WICHTIGE REGELN:
1. Behalte die EXAKTE STRUKTUR des Originalvertrags bei (Paragraphen, Nummerierung, Format)
2. Nimm NUR die vom Nutzer gewünschten Änderungen vor
3. Ändere NICHTS, was nicht explizit gewünscht wurde
4. Behalte die professionelle juristische Sprache bei
5. Gib NUR den verbesserten Vertragstext zurück (kein Kommentar, keine Erklärungen)
6. Behalte die gleiche Länge und Ausführlichkeit bei
7. Wenn Platzhalter wie [NAME] geändert werden sollen, ersetze sie konsequent im gesamten Vertrag

BEISPIELE für Änderungen:
- "Verkäufer sitzt in München statt Berlin" → Ändere alle Adressen-Erwähnungen
- "Käufer heißt Schmidt" → Ersetze Platzhalter/Namen durch "Schmidt"
- "Gewährleistung 2 Jahre statt 1 Jahr" → Ändere nur § Gewährleistung
- "Preis 1000€ statt 500€" → Ändere nur Vergütungs-Paragraph

Gib AUSSCHLIESSLICH den finalen verbesserten Vertragstext zurück!`;

    const userPrompt = `ORIGINALVERTRAG:
<<<
${originalContract}
>>>

GEWÜNSCHTE ÄNDERUNGEN:
${improvements}

Bitte passe den Vertrag exakt nach diesen Wünschen an und gib NUR den verbesserten Vertragstext zurück.`;

    console.log('🤖 Starte GPT-4 Verbesserung...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3, // Niedrig für präzise Änderungen
      max_tokens: 8000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const improvedContract = completion.choices[0].message.content.trim();

    console.log('✅ Vertrag verbessert:', {
      originalLength: originalContract.length,
      improvedLength: improvedContract.length,
      tokensUsed: completion.usage.total_tokens
    });

    // Erfolgreiche Response
    res.json({
      success: true,
      improvedContract,
      metadata: {
        originalLength: originalContract.length,
        improvedLength: improvedContract.length,
        tokensUsed: completion.usage.total_tokens,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error improving contract:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Vertragsverbesserung',
      details: error.message
    });
  }
});

module.exports = router;
