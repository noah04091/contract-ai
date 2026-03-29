/**
 * Legal Lens - Clause Preprocessor Service
 *
 * Führt GPT-basiertes Klausel-Parsing im Hintergrund aus.
 * Wird nach Contract-Upload automatisch gestartet.
 *
 * @version 1.0.0
 */

const { ObjectId } = require('mongodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const pdfParse = require('pdf-parse');
const { clauseParser } = require('./index');
const { getDb } = require('../../config/database');

// S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Extrahiert Text aus einem Contract (S3 oder DB)
 */
async function extractContractText(contract) {
  // Priorität 1: Bereits extrahierter Text
  if (contract.extractedText && contract.extractedText.length > 100) {
    console.log(`📄 [Preprocessor] Verwende existierenden extractedText (${contract.extractedText.length} Zeichen)`);
    return contract.extractedText;
  }

  // Priorität 2: Content-Feld (bei generierten Verträgen)
  if (contract.content && contract.content.length > 100) {
    console.log(`📄 [Preprocessor] Verwende content-Feld (${contract.content.length} Zeichen)`);
    return contract.content;
  }

  // Priorität 3: S3 PDF extrahieren
  if (contract.s3Key) {
    console.log(`📄 [Preprocessor] Extrahiere aus S3: ${contract.s3Key}`);
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: contract.s3Key
      });

      const s3Response = await s3Client.send(command);
      const chunks = [];
      for await (const chunk of s3Response.Body) {
        chunks.push(chunk);
      }
      const pdfBuffer = Buffer.concat(chunks);
      const pdfData = await pdfParse(pdfBuffer);

      console.log(`✅ [Preprocessor] PDF extrahiert: ${pdfData.text.length} Zeichen`);
      return pdfData.text;
    } catch (s3Error) {
      console.error(`❌ [Preprocessor] S3-Extraktion fehlgeschlagen:`, s3Error.message);
      return null;
    }
  }

  console.warn(`⚠️ [Preprocessor] Keine Textquelle gefunden für Contract ${contract._id}`);
  return null;
}

/**
 * Führt GPT-Klausel-Parsing für einen Contract durch und speichert das Ergebnis.
 *
 * @param {string} contractId - MongoDB ObjectId des Contracts
 * @param {Object} options - Optionen
 * @returns {Promise<Object>} Ergebnis mit success, clauseCount, etc.
 */
async function preprocessContract(contractId, options = {}) {
  const startTime = Date.now();
  console.log(`\n🧠 [Preprocessor] Starte Legal Lens Vorverarbeitung für Contract: ${contractId}`);

  try {
    const db = await getDb();
    const contractsCollection = db.collection('contracts');

    // Contract laden
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId)
    });

    if (!contract) {
      console.error(`❌ [Preprocessor] Contract nicht gefunden: ${contractId}`);
      return { success: false, error: 'Contract nicht gefunden' };
    }

    // Prüfen ob bereits vorverarbeitet
    if (contract.legalLens?.preParsedClauses && !options.force) {
      console.log(`ℹ️ [Preprocessor] Contract bereits vorverarbeitet (${contract.legalLens.preParsedClauses.length} Klauseln)`);
      return {
        success: true,
        alreadyProcessed: true,
        clauseCount: contract.legalLens.preParsedClauses.length
      };
    }

    // Text extrahieren
    const text = await extractContractText(contract);
    if (!text || text.length < 50) {
      console.error(`❌ [Preprocessor] Kein ausreichender Text für Contract: ${contractId}`);

      // Status in DB speichern
      await contractsCollection.updateOne(
        { _id: new ObjectId(contractId) },
        {
          $set: {
            'legalLens.preprocessStatus': 'failed',
            'legalLens.preprocessError': 'Kein ausreichender Text',
            'legalLens.preprocessedAt': new Date()
          }
        }
      );

      return { success: false, error: 'Kein ausreichender Text' };
    }

    // Status auf "processing" setzen
    await contractsCollection.updateOne(
      { _id: new ObjectId(contractId) },
      {
        $set: {
          'legalLens.preprocessStatus': 'processing',
          'legalLens.preprocessStartedAt': new Date()
        }
      }
    );

    // GPT-basiertes Parsing durchführen
    console.log(`🧠 [Preprocessor] Starte GPT-Parsing für ${text.length} Zeichen...`);
    const parseResult = await clauseParser.parseContractIntelligent(text, {
      detectRisk: true,
      contractName: contract.name || contract.title || ''
    });

    if (!parseResult.success) {
      console.error(`❌ [Preprocessor] Parsing fehlgeschlagen für Contract: ${contractId}`);

      await contractsCollection.updateOne(
        { _id: new ObjectId(contractId) },
        {
          $set: {
            'legalLens.preprocessStatus': 'failed',
            'legalLens.preprocessError': 'Parsing fehlgeschlagen',
            'legalLens.preprocessedAt': new Date()
          }
        }
      );

      return { success: false, error: 'Parsing fehlgeschlagen' };
    }

    // Ergebnis in DB speichern
    const duration = Date.now() - startTime;
    console.log(`✅ [Preprocessor] Parsing erfolgreich: ${parseResult.clauses.length} Klauseln in ${duration}ms`);

    await contractsCollection.updateOne(
      { _id: new ObjectId(contractId) },
      {
        $set: {
          'legalLens.preParsedClauses': parseResult.clauses,
          'legalLens.riskSummary': parseResult.riskSummary,
          'legalLens.metadata': parseResult.metadata,
          'legalLens.preprocessStatus': 'completed',
          'legalLens.preprocessedAt': new Date(),
          'legalLens.preprocessDuration': duration,
          // Auch extractedText speichern falls noch nicht vorhanden
          ...(contract.extractedText ? {} : { extractedText: text })
        }
      }
    );

    console.log(`💾 [Preprocessor] Ergebnis gespeichert für Contract: ${contractId}`);

    return {
      success: true,
      clauseCount: parseResult.clauses.length,
      duration,
      riskSummary: parseResult.riskSummary
    };

  } catch (error) {
    console.error(`❌ [Preprocessor] Fehler bei Vorverarbeitung:`, error);

    // Fehler in DB speichern
    try {
      const db = await getDb();
      await db.collection('contracts').updateOne(
        { _id: new ObjectId(contractId) },
        {
          $set: {
            'legalLens.preprocessStatus': 'failed',
            'legalLens.preprocessError': error.message,
            'legalLens.preprocessedAt': new Date()
          }
        }
      );
    } catch (dbError) {
      console.error(`❌ [Preprocessor] Konnte Fehler nicht in DB speichern:`, dbError);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Batch-Vorverarbeitung für mehrere Contracts
 * Nützlich für Migration bestehender Verträge
 */
async function batchPreprocess(contractIds, options = {}) {
  console.log(`\n🚀 [Preprocessor] Batch-Verarbeitung für ${contractIds.length} Contracts...`);

  const results = {
    total: contractIds.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (const contractId of contractIds) {
    try {
      const result = await preprocessContract(contractId, options);

      if (result.success) {
        if (result.alreadyProcessed) {
          results.skipped++;
        } else {
          results.successful++;
        }
      } else {
        results.failed++;
      }

      results.details.push({
        contractId,
        ...result
      });

      // Kurze Pause zwischen Contracts um API nicht zu überlasten
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      results.failed++;
      results.details.push({
        contractId,
        success: false,
        error: error.message
      });
    }
  }

  console.log(`\n📊 [Preprocessor] Batch-Ergebnis: ${results.successful} erfolgreich, ${results.failed} fehlgeschlagen, ${results.skipped} übersprungen`);
  return results;
}

module.exports = {
  preprocessContract,
  batchPreprocess,
  extractContractText
};
