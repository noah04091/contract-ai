// 🔄 backend/routes/generate.js - KORRIGIERTE VERSION
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { MongoClient, ObjectId } = require("mongodb");
const https = require("https");
const http = require("http");
const AWS = require("aws-sdk");

// ✅ S3 Setup für frische Logo-URLs
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// ✅ Base64-Konvertierung für S3-Logos (CORS-frei!)
const convertS3ToBase64 = async (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      const chunks = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
        resolve(base64);
      });
      
      response.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// MongoDB Setup
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let usersCollection, contractsCollection, db;

(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("🔄 Generate.js: MongoDB verbunden!");
  } catch (err) {
    console.error("❌ Generate.js MongoDB Fehler:", err);
  }
})();

// 🎯 PROFESSIONELLE VERTRAGSGENERIERUNG
router.post("/", verifyToken, async (req, res) => {
  console.log("🚀 Generate Route aufgerufen!");
  
  const { type, formData, useCompanyProfile = false } = req.body;

  if (!type || !formData || !formData.title) {
    return res.status(400).json({ message: "❌ Fehlende Felder für Vertragserstellung." });
  }

  try {
    // Company Profile laden
    let companyProfile = null;
    if (db) {
      const profileData = await db.collection("company_profiles").findOne({ 
        userId: new ObjectId(req.user.userId) 
      });
      
      if (profileData) {
        companyProfile = profileData;
        console.log("✅ Company Profile gefunden:", companyProfile.companyName);
      }
    }

    // Nutzer & Limit prüfen
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    const plan = user.subscriptionPlan || "free";
    const count = user.analysisCount ?? 0;

    let limit = 10;
    if (plan === "business") limit = 50;
    if (plan === "premium") limit = Infinity;

    if (count >= limit) {
      return res.status(403).json({
        message: "❌ Analyse-Limit erreicht. Bitte Paket upgraden.",
      });
    }

    // 🎯 VERBESSERTE PROMPT-GENERIERUNG
    let systemPrompt = `Du bist ein Experte für deutsches Vertragsrecht und erstellst professionelle, rechtssichere Verträge.

WICHTIGE FORMATIERUNGSREGELN:

1. VERWENDE NUR REINEN TEXT - KEIN HTML!
2. Strukturiere mit klaren Überschriften und Absätzen
3. Nutze folgende Hierarchie:
   - VERTRAGSNAME (Großbuchstaben)
   - § 1 Überschrift
   - (1) Absätze
   - a) Unterpunkte

VERTRAGSSTRUKTUR:

=================================
[VERTRAGSTYP]
=================================

zwischen

[Partei A - vollständige Angaben]
- nachfolgend "[Bezeichnung A]" genannt -

und

[Partei B - vollständige Angaben]  
- nachfolgend "[Bezeichnung B]" genannt -

PRÄAMBEL
[Kurze Einleitung zum Vertragszweck]

§ 1 VERTRAGSGEGENSTAND

(1) [Hauptgegenstand des Vertrags]

(2) [Weitere Details]

§ 2 LEISTUNGEN UND PFLICHTEN

(1) Pflichten [Partei A]:
   a) [Pflicht 1]
   b) [Pflicht 2]

(2) Pflichten [Partei B]:
   a) [Pflicht 1]
   b) [Pflicht 2]

§ 3 VERGÜTUNG UND ZAHLUNGSBEDINGUNGEN

(1) Die Vergütung beträgt [BETRAG] EUR [Zahlungsweise].

(2) Die Zahlung ist fällig [Fälligkeit].

§ 4 LAUFZEIT UND KÜNDIGUNG

(1) Der Vertrag beginnt am [Datum] und läuft [Dauer].

(2) Die Kündigung ist möglich [Kündigungsbedingungen].

§ 5 GEWÄHRLEISTUNG UND HAFTUNG

(1) [Gewährleistungsregelungen]

(2) Die Haftung ist begrenzt auf [Haftungsbegrenzung].

§ 6 VERTRAULICHKEIT

(1) Die Parteien verpflichten sich zur Geheimhaltung aller vertraulichen Informationen.

§ 7 DATENSCHUTZ

(1) Die Parteien verpflichten sich zur Einhaltung der DSGVO.

§ 8 SCHLUSSBESTIMMUNGEN

(1) Änderungen bedürfen der Schriftform.

(2) Sollte eine Bestimmung unwirksam sein, bleibt der übrige Vertrag wirksam.

(3) Gerichtsstand ist [Ort].

(4) Es gilt deutsches Recht.


_______________________     _______________________
Ort, Datum                  Ort, Datum


_______________________     _______________________
[Partei A]                  [Partei B]
[Funktion]                  [Funktion]

WICHTIG:
- Verwende klare, verständliche Sprache
- Füge alle relevanten rechtlichen Klauseln ein
- Achte auf vollständige Angaben
- Keine Platzhalter in eckigen Klammern verwenden - ersetze mit echten Daten`;

    // Detaillierter User-Prompt basierend auf Vertragstyp
    let userPrompt = "";
    
    switch (type) {
      case "freelancer":
        userPrompt = `Erstelle einen professionellen Dienstleistungsvertrag mit folgenden Daten:

VERTRAGSTYP: Dienstleistungsvertrag / Freelancer-Vertrag

AUFTRAGGEBER:
${formData.nameClient}
${formData.clientAddress || '[Adresse des Auftraggebers]'}

AUFTRAGNEHMER (Freelancer):
${formData.nameFreelancer}
${formData.freelancerAddress || '[Adresse des Freelancers]'}
${formData.freelancerTaxId ? `Steuer-ID/USt-IdNr.: ${formData.freelancerTaxId}` : ''}

LEISTUNGSBESCHREIBUNG:
${formData.description}

PROJEKTDAUER:
${formData.timeframe}

VERGÜTUNG:
${formData.payment}
Zahlungsbedingungen: ${formData.paymentTerms || '14 Tage netto'}
Rechnungsstellung: ${formData.invoiceInterval || 'Monatlich'}

ARBEITSORT:
${formData.workLocation || 'Remote/Homeoffice'}

NUTZUNGSRECHTE:
${formData.rights}
Eigentum an Arbeitsergebnissen: ${formData.ipOwnership || 'Vollständig an Auftraggeber'}

VERTRAULICHKEIT:
${formData.confidentiality || 'Standard-Vertraulichkeit'}

HAFTUNG:
${formData.liability || 'Auf Auftragswert begrenzt'}

KÜNDIGUNG:
${formData.terminationClause}

ANWENDBARES RECHT:
${formData.governingLaw || 'Deutsches Recht'}

GERICHTSSTAND:
${formData.jurisdiction || 'Sitz des Auftraggebers'}

Erstelle einen vollständigen, rechtssicheren Vertrag mit allen notwendigen Klauseln.`;
        break;

      case "mietvertrag":
        userPrompt = `Erstelle einen professionellen Mietvertrag mit folgenden Daten:

VERTRAGSTYP: Mietvertrag für Wohnraum

VERMIETER:
${formData.landlord}

MIETER:
${formData.tenant}

MIETOBJEKT:
${formData.address}

MIETBEGINN:
${formData.startDate}

MIETE:
Kaltmiete: ${formData.baseRent}
Nebenkosten: ${formData.extraCosts}

KÜNDIGUNG:
${formData.termination}

Füge alle mietrechtlich relevanten Klauseln ein (Schönheitsreparaturen, Kaution, Hausordnung, etc.).`;
        break;

      case "arbeitsvertrag":
        userPrompt = `Erstelle einen professionellen Arbeitsvertrag mit folgenden Daten:

VERTRAGSTYP: Arbeitsvertrag

ARBEITGEBER:
${formData.employer}

ARBEITNEHMER:
${formData.employee}

POSITION/TÄTIGKEIT:
${formData.position}

ARBEITSBEGINN:
${formData.startDate}

VERGÜTUNG:
${formData.salary}

ARBEITSZEIT:
${formData.workingHours}

Füge alle arbeitsrechtlich relevanten Klauseln ein (Probezeit, Urlaub, Krankheit, Verschwiegenheit, etc.).`;
        break;

      case "kaufvertrag":
        userPrompt = `Erstelle einen professionellen Kaufvertrag mit folgenden Daten:

VERTRAGSTYP: Kaufvertrag

VERKÄUFER:
${formData.seller}

KÄUFER:
${formData.buyer}

KAUFGEGENSTAND:
${formData.item}

KAUFPREIS:
${formData.price}

ÜBERGABE/LIEFERUNG:
${formData.deliveryDate}

Füge alle kaufrechtlich relevanten Klauseln ein (Eigentumsvorbehalt, Gewährleistung, Gefahrübergang, etc.).`;
        break;

      case "nda":
        userPrompt = `Erstelle eine professionelle Geheimhaltungsvereinbarung (NDA) mit folgenden Daten:

VERTRAGSTYP: Geheimhaltungsvereinbarung / Non-Disclosure Agreement (NDA)

PARTEI A (Offenlegender):
${formData.partyA}

PARTEI B (Empfänger):
${formData.partyB}

ZWECK DER VEREINBARUNG:
${formData.purpose}

GÜLTIGKEITSDAUER:
${formData.duration}

Füge alle relevanten Klauseln ein (Definition vertraulicher Informationen, Ausnahmen, Rückgabe von Unterlagen, Vertragsstrafe, etc.).`;
        break;

      case "custom":
        userPrompt = `Erstelle einen professionellen Vertrag mit dem Titel: ${formData.title}

VERTRAGSINHALTE:
${formData.details}

Strukturiere den Vertrag professionell mit allen notwendigen rechtlichen Klauseln.`;
        break;

      default:
        return res.status(400).json({ message: "❌ Unbekannter Vertragstyp." });
    }

    // 🛟 GPT BACKUP & ERROR RECOVERY SYSTEM
    const generateContractWithFallback = async (systemPrompt, userPrompt) => {
      try {
        // Erster Versuch mit GPT-4
        console.log("🚀 Starte GPT-4 Vertragsgenerierung...");
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 3000
        });
        
        let result = completion.choices[0].message.content || "";
        
        // 📝 QUALITÄTSKONTROLLE
        if (result.length < 500) {
          console.warn("⚠️ GPT Antwort zu kurz (" + result.length + " Zeichen), versuche zweiten Versuch...");
          // Zweiter Versuch mit leicht veränderten Parametern
          const retryCompletion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              { role: "system", content: systemPrompt + "\n\nErstelle einen DETAILLIERTEN, vollständigen Vertrag mit mindestens 8 Paragraphen." },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.4,
            max_tokens: 4000
          });
          result = retryCompletion.choices[0].message.content || result;
          console.log("🔄 Zweiter Versuch abgeschlossen, neue Länge:", result.length);
        }
        
        // 📝 STRUKTUR-VALIDATION
        const hasRequiredElements = result.includes('§ 1') && 
                                   result.includes('Unterschrift') && 
                                   result.length > 800;
        
        if (!hasRequiredElements) {
          console.warn("⚠️ Vertrag unvollständig, füge Standard-Klauseln hinzu...");
          
          // Füge fehlende Elemente hinzu
          if (!result.includes('§ 1')) {
            result = "§ 1 VERTRAGSGEGENSTAND\n\n(1) " + result;
          }
          
          if (!result.includes('Schlussbestimmungen')) {
            result += `\n\n§ 8 SCHLUSSBESTIMMUNGEN\n\n(1) Änderungen bedürfen der Schriftform.\n\n(2) Sollte eine Bestimmung unwirksam sein, bleibt der übrige Vertrag wirksam.\n\n(3) Gerichtsstand ist der Sitz des Auftraggebers.\n\n(4) Es gilt deutsches Recht.`;
          }
          
          if (!result.includes('Unterschrift')) {
            result += `\n\n\n_______________________     _______________________\nOrt, Datum                  Ort, Datum\n\n\n_______________________     _______________________\n[Partei A]                  [Partei B]\n[Funktion]                  [Funktion]`;
          }
        }
        
        console.log("✅ Vertragsgenerierung erfolgreich, finale Länge:", result.length);
        return result;
        
      } catch (error) {
        console.error("❌ GPT-Fehler:", error.message);
        throw new Error(`Vertragsgenerierung fehlgeschlagen: ${error.message}. Bitte versuchen Sie es erneut.`);
      }
    };

    // GPT-4 Generierung mit Backup-System
    let contractText = await generateContractWithFallback(systemPrompt, userPrompt);

    // 🛡️ ROBUSTE COMPANY PROFILE INTEGRATION - KORRIGIERT!
    if (companyProfile && useCompanyProfile) {
      const validateAndFormatCompanyData = (profile) => {
        // Minimale Requirements checken
        const hasMinimumData = profile.companyName && profile.street && profile.city;
        
        if (!hasMinimumData) {
          console.warn("⚠️ Company Profile unvollständig, verwende Fallback");
          return null;
        }
        
        // Formatierung mit Fallbacks
        let details = `${profile.companyName}`;
        if (profile.legalForm) details += ` (${profile.legalForm})`;
        details += `\n${profile.street}, ${profile.postalCode || ''} ${profile.city}`;
        if (profile.vatId) details += `\nUSt-IdNr.: ${profile.vatId}`;
        if (profile.tradeRegister) details += `\n${profile.tradeRegister}`;
        return details.trim();
      };

      const companyDetails = validateAndFormatCompanyData(companyProfile);
      
      if (companyDetails) {
        // 📝 ROBUSTE ERSETZUNG mit mehreren Fallback-Patterns - KORRIGIERT!
        const replaceCompanyData = (text, details, contractType) => {
          let result = text;
          
          // WICHTIG: replacement Variable außerhalb definieren!
          let replacement = '';
          
          switch(contractType) {
            case 'freelancer':
              replacement = 'AUFTRAGGEBER';
              break;
            case 'kaufvertrag':
              replacement = 'VERKÄUFER';
              break;
            case 'mietvertrag':
              replacement = 'VERMIETER';
              break;
            case 'arbeitsvertrag':
              replacement = 'ARBEITGEBER';
              break;
            case 'nda':
              replacement = 'PARTEI A (Offenlegender)';
              break;
            default:
              replacement = 'PARTEI A';
          }
          
          // Mehrere Pattern für verschiedene GPT-Formatierungen
          const patterns = {
            freelancer: [
              /AUFTRAGGEBER:\s*\n[^\n]+/,
              /Auftraggeber:\s*\n[^\n]+/,
              /\*\*Auftraggeber:\*\*\s*\n[^\n]+/,
              /AUFTRAGGEBER \([^)]+\):\s*\n[^\n]+/
            ],
            kaufvertrag: [
              /VERKÄUFER:\s*\n[^\n]+/,
              /Verkäufer:\s*\n[^\n]+/,
              /\*\*Verkäufer:\*\*\s*\n[^\n]+/,
              /VERKÄUFER \([^)]+\):\s*\n[^\n]+/
            ],
            mietvertrag: [
              /VERMIETER:\s*\n[^\n]+/,
              /Vermieter:\s*\n[^\n]+/,
              /\*\*Vermieter:\*\*\s*\n[^\n]+/,
              /VERMIETER \([^)]+\):\s*\n[^\n]+/
            ],
            arbeitsvertrag: [
              /ARBEITGEBER:\s*\n[^\n]+/,
              /Arbeitgeber:\s*\n[^\n]+/,
              /\*\*Arbeitgeber:\*\*\s*\n[^\n]+/,
              /ARBEITGEBER \([^)]+\):\s*\n[^\n]+/
            ],
            nda: [
              /PARTEI A[^\n]*:\s*\n[^\n]+/,
              /Partei A[^\n]*:\s*\n[^\n]+/,
              /\*\*Partei A[^\n]*:\*\*\s*\n[^\n]+/,
              /PARTEI A \([^)]+\):\s*\n[^\n]+/
            ]
          };
          
          const typePatterns = patterns[contractType] || [];
          let replaced = false;
          
          // Versuche alle Pattern, nimm das erste was matcht
          for (const pattern of typePatterns) {
            if (pattern.test(result)) {
              result = result.replace(pattern, `${replacement}:\n${details}`);
              replaced = true;
              console.log(`✅ Company data ersetzt für ${contractType} mit Pattern: ${pattern}`);
              break;
            }
          }
          
          if (!replaced) {
            console.warn(`⚠️ Kein Pattern gefunden für ${contractType}, füge Company-Details am Anfang hinzu`);
            // Fallback: Füge am Anfang nach dem Titel hinzu
            const titleMatch = result.match(/^={3,}\n(.+)\n={3,}/m);
            if (titleMatch) {
              const insertPoint = result.indexOf(titleMatch[0]) + titleMatch[0].length;
              // HIER WAR DER FEHLER - replacement ist jetzt definiert!
              const insertion = `\n\n${replacement}:\n${details}\n\nund\n\n`;
              result = result.slice(0, insertPoint) + insertion + result.slice(insertPoint);
            }
          }
          
          return result;
        };

        contractText = replaceCompanyData(contractText, companyDetails, type);
      }
    }

    // Analyse-Zähler hochzählen
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { analysisCount: 1 } }
    );

    // Vertrag in DB speichern
    const contract = {
      userId: req.user.userId,
      name: formData.title,
      content: contractText,
      laufzeit: "Generiert",
      kuendigung: "Generiert", 
      expiryDate: "",
      status: "Aktiv",
      uploadedAt: new Date(),
      isGenerated: true,
      contractType: type,
      hasCompanyProfile: !!companyProfile,
      formData: formData // Speichere Formulardaten für spätere Bearbeitung
    };

    const result = await contractsCollection.insertOne(contract);

    // 📊 CONTRACT ANALYTICS
    const logContractGeneration = (contract, user, companyProfile) => {
      const analytics = {
        contractType: contract.contractType,
        hasCompanyProfile: !!companyProfile,
        userPlan: user.subscriptionPlan || 'free',
        timestamp: new Date(),
        contentLength: contract.content.length,
        generationSource: 'ai_generation_v2_enhanced',
        userId: user._id.toString(),
        success: true
      };
      
      console.log("📊 Contract Generated Analytics:", analytics);
      
      // Hier könnte später Analytics Service eingebaut werden
      // await analyticsService.track('contract_generated', analytics);
    };

    // Analytics loggen
    logContractGeneration(contract, user, companyProfile);

    res.json({
      message: "✅ Vertrag erfolgreich generiert & gespeichert.",
      contractId: result.insertedId,
      contractText: contractText,
      metadata: {
        contractType: type,
        hasCompanyProfile: !!companyProfile,
        contentLength: contractText.length,
        generatedAt: new Date().toISOString(),
        version: 'v2_enhanced'
      }
    });
    
  } catch (err) {
    console.error("❌ Fehler beim Erzeugen/Speichern:", err);
    res.status(500).json({ message: "Serverfehler beim Erzeugen oder Speichern." });
  }
});

module.exports = router;