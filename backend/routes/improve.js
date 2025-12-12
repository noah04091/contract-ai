// Contract Improvement Endpoint
// Nimmt einen bestehenden Vertrag und Verbesserungswünsche und generiert eine verbesserte Version
// WICHTIG: Unterstützt jetzt auch Deckblatt-Änderungen (Titel, Parteien, Datum)

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
 *   contractType: string,      // Optional: Vertragstyp für Kontext
 *   currentFormData: object    // Optional: Aktuelle Deckblatt-Daten (title, partyA, partyB, etc.)
 * }
 *
 * Response: {
 *   success: boolean,
 *   improvedContract: string,           // Verbesserter Vertragstext
 *   formDataChanges: object | null,     // Änderungen an Deckblatt-Feldern (falls gewünscht)
 *   metadata: object
 * }
 */
router.post('/improve', async (req, res) => {
  try {
    const { originalContract, improvements, contractType, currentFormData } = req.body;

    console.log('🔄 Contract Improvement Request:', {
      originalLength: originalContract?.length,
      improvementsLength: improvements?.length,
      contractType,
      hasFormData: !!currentFormData,
      formDataKeys: currentFormData ? Object.keys(currentFormData) : []
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

    // Prüfen ob Deckblatt-Änderungen gewünscht sind
    const deckblattKeywords = [
      'titel', 'überschrift', 'vertragsüberschrift', 'name des vertrags',
      'partei a', 'partei b', 'vertragspartner', 'auftraggeber', 'auftragnehmer',
      'käufer', 'verkäufer', 'arbeitnehmer', 'arbeitgeber', 'mieter', 'vermieter',
      'datum', 'vertragsdatum', 'abschlussdatum', 'unterschriftsdatum',
      'deckblatt', 'titelseite', 'erste seite', 'letzte seite', 'unterschrift'
    ];

    const improvementsLower = improvements.toLowerCase();
    const wantsDeckblattChange = deckblattKeywords.some(keyword => improvementsLower.includes(keyword));

    console.log('🎯 Deckblatt-Änderung erkannt:', wantsDeckblattChange);

    // GPT-4 Call für Verbesserung
    let systemPrompt, userPrompt;

    if (wantsDeckblattChange) {
      // Erweiterter Prompt mit Deckblatt-Änderungen
      systemPrompt = `Du bist Experte für deutsches Vertragsrecht und passt Verträge präzise an Nutzerwünsche an.

WICHTIGE REGELN:
1. Behalte die EXAKTE STRUKTUR des Originalvertrags bei (Paragraphen, Nummerierung, Format)
2. Nimm NUR die vom Nutzer gewünschten Änderungen vor
3. Ändere NICHTS, was nicht explizit gewünscht wurde
4. Behalte die professionelle juristische Sprache bei
5. Wenn Platzhalter wie [NAME] geändert werden sollen, ersetze sie konsequent im gesamten Vertrag

DECKBLATT-ÄNDERUNGEN:
Der Nutzer möchte möglicherweise Änderungen am Deckblatt (Titel, Parteien, Datum).
Diese werden SEPARAT verwaltet und müssen als JSON zurückgegeben werden.

Mögliche Deckblatt-Felder:
- title: Vertragsüberschrift/-titel
- partyA: Name/Firma von Partei A (Auftraggeber/Verkäufer/Arbeitgeber/Vermieter)
- partyB: Name/Firma von Partei B (Auftragnehmer/Käufer/Arbeitnehmer/Mieter)
- partyAAddress: Adresse von Partei A
- partyBAddress: Adresse von Partei B
- contractDate: Vertragsdatum

ANTWORT-FORMAT (WICHTIG!):
Gib deine Antwort EXAKT in diesem Format:

---VERTRAGSTEXT---
[Der komplette verbesserte Vertragstext hier]
---ENDE-VERTRAGSTEXT---

---DECKBLATT-AENDERUNGEN---
{
  "title": "Neuer Titel falls geändert",
  "partyA": "Neuer Name falls geändert",
  "partyB": "Neuer Name falls geändert",
  "partyAAddress": "Neue Adresse falls geändert",
  "partyBAddress": "Neue Adresse falls geändert",
  "contractDate": "Neues Datum falls geändert"
}
---ENDE-DECKBLATT---

WICHTIG:
- Gib im JSON NUR die Felder an, die tatsächlich geändert werden sollen!
- Wenn keine Deckblatt-Änderungen nötig sind, gib ein leeres Objekt {} zurück
- Das Datum im Format "TT. Monat JJJJ" (z.B. "15. Januar 2025")`;

      userPrompt = `ORIGINALVERTRAG:
<<<
${originalContract}
>>>

${currentFormData ? `AKTUELLE DECKBLATT-DATEN:
- Titel: ${currentFormData.title || 'Nicht gesetzt'}
- Partei A: ${currentFormData.partyA || 'Nicht gesetzt'}
- Partei B: ${currentFormData.partyB || 'Nicht gesetzt'}
- Adresse Partei A: ${currentFormData.partyAAddress || 'Nicht gesetzt'}
- Adresse Partei B: ${currentFormData.partyBAddress || 'Nicht gesetzt'}
- Datum: ${currentFormData.contractDate || 'Nicht gesetzt'}
` : ''}

GEWÜNSCHTE ÄNDERUNGEN:
${improvements}

Bitte passe den Vertrag exakt nach diesen Wünschen an. Denke daran:
1. Gib den KOMPLETTEN verbesserten Vertragstext zurück
2. Gib Deckblatt-Änderungen als separates JSON zurück (nur geänderte Felder!)
3. Verwende das exakte Format wie oben beschrieben`;

    } else {
      // Standard-Prompt ohne Deckblatt (schneller)
      systemPrompt = `Du bist Experte für deutsches Vertragsrecht und passt Verträge präzise an Nutzerwünsche an.

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

      userPrompt = `ORIGINALVERTRAG:
<<<
${originalContract}
>>>

GEWÜNSCHTE ÄNDERUNGEN:
${improvements}

Bitte passe den Vertrag exakt nach diesen Wünschen an und gib NUR den verbesserten Vertragstext zurück.`;
    }

    console.log('🤖 Starte GPT-4 Verbesserung...', { wantsDeckblattChange });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3, // Niedrig für präzise Änderungen
      max_tokens: 8000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const rawResponse = completion.choices[0].message.content.trim();

    let improvedContract = rawResponse;
    let formDataChanges = null;

    // Parse Response wenn Deckblatt-Änderungen erwartet werden
    if (wantsDeckblattChange) {
      console.log('📝 Parse Deckblatt-Response...');

      // Vertragstext extrahieren
      const textMatch = rawResponse.match(/---VERTRAGSTEXT---([\s\S]*?)---ENDE-VERTRAGSTEXT---/);
      if (textMatch) {
        improvedContract = textMatch[1].trim();
      } else {
        // Fallback: Wenn kein Format erkannt, nehme alles vor dem JSON
        const jsonStart = rawResponse.indexOf('---DECKBLATT-AENDERUNGEN---');
        if (jsonStart > 0) {
          improvedContract = rawResponse.substring(0, jsonStart).trim();
        }
      }

      // Deckblatt-Änderungen extrahieren
      const deckblattMatch = rawResponse.match(/---DECKBLATT-AENDERUNGEN---([\s\S]*?)---ENDE-DECKBLATT---/);
      if (deckblattMatch) {
        try {
          const jsonStr = deckblattMatch[1].trim();
          formDataChanges = JSON.parse(jsonStr);

          // Leere Werte entfernen
          Object.keys(formDataChanges).forEach(key => {
            if (!formDataChanges[key] || formDataChanges[key] === 'Nicht gesetzt') {
              delete formDataChanges[key];
            }
          });

          // Prüfen ob noch Änderungen übrig sind
          if (Object.keys(formDataChanges).length === 0) {
            formDataChanges = null;
          }

          console.log('✅ Deckblatt-Änderungen geparst:', formDataChanges);
        } catch (parseError) {
          console.error('⚠️ Fehler beim Parsen der Deckblatt-Änderungen:', parseError.message);
          formDataChanges = null;
        }
      } else {
        console.log('ℹ️ Keine Deckblatt-Änderungen im Response gefunden');
      }
    }

    console.log('✅ Vertrag verbessert:', {
      originalLength: originalContract.length,
      improvedLength: improvedContract.length,
      hasFormDataChanges: !!formDataChanges,
      formDataChanges: formDataChanges,
      tokensUsed: completion.usage.total_tokens
    });

    // Erfolgreiche Response
    res.json({
      success: true,
      improvedContract,
      formDataChanges, // NEU: Deckblatt-Änderungen
      metadata: {
        originalLength: originalContract.length,
        improvedLength: improvedContract.length,
        tokensUsed: completion.usage.total_tokens,
        hadDeckblattChanges: !!formDataChanges,
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
