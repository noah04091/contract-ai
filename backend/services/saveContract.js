// 📁 backend/services/saveContract.js - ✅ ERWEITERT mit fileHash für Dublettenerkennung
const { ObjectId } = require("mongodb");
const database = require("../config/database");

async function saveContract({
  userId,
  fileName,
  toolUsed,
  filePath,
  fileHash, // ✅ NEU: Hash für Dublettenerkennung
  extraRefs = {},
  legalPulse = null
}) {
  try {
    // ✅ Validierung des fileHash
    if (!fileHash || typeof fileHash !== 'string') {
      console.warn("⚠️ Kein fileHash bereitgestellt - Dublettenerkennung nicht möglich");
    }

    const contractDoc = {
      userId: new ObjectId(userId),
      name: fileName,
      toolUsed,
      filePath,
      fileHash: fileHash || null, // ✅ NEU: Hash für Duplikat-Erkennung speichern
      createdAt: new Date(),
      uploadedAt: new Date(), // ✅ Backup-Timestamp
      status: "aktiv",
      expiryDate: null,
      
      // 🔗 Legal Pulse Integration
      legalPulse: legalPulse || {
        riskScore: null,
        riskSummary: '',
        lastChecked: null,
        lawInsights: [],
        marketSuggestions: []
      },
      
      // ✅ NEU: Zusätzliche Metadaten für bessere Verwaltung
      metadata: {
        fileSize: extraRefs.fileSize || null,
        originalExtension: fileName.split('.').pop()?.toLowerCase() || null,
        uploadSource: toolUsed || 'unknown',
        processingVersion: '2.0', // Für zukünftige Migrations
      },
      
      // ⬇️ Extra-Felder direkt anhängen (z. B. content, isGenerated, analysisId)
      ...extraRefs
    };

    // ✅ NEU: Zusätzliche Validierung für wichtige Felder
    if (!userId || !fileName) {
      throw new Error("Fehlende Pflichtfelder: userId und fileName sind erforderlich");
    }

    // ✅ Vertrag in DB speichern
    const result = await database.insertOne('contracts', contractDoc);
    
    console.log("📁 Vertrag gespeichert:", {
      insertedId: result.insertedId,
      fileName: fileName,
      fileHash: fileHash ? `${fileHash.substring(0, 12)}...` : 'none',
      userId: userId,
      toolUsed: toolUsed
    });
    
    return result;
    
  } catch (err) {
    console.error("❌ Fehler beim Speichern des Vertrags:", {
      error: err.message,
      fileName: fileName,
      userId: userId,
      fileHash: fileHash ? `${fileHash.substring(0, 12)}...` : 'none'
    });
    throw err;
  }
}

// ✅ NEU: Hilfsfunktion zum Prüfen auf Duplikate
async function checkDuplicateContract(userId, fileHash) {
  try {
    if (!fileHash) {
      console.warn("⚠️ Kein fileHash für Duplikat-Check bereitgestellt");
      return null;
    }

    const existingContract = await database.findOne('contracts', {
      userId: new ObjectId(userId),
      fileHash: fileHash
    });

    if (existingContract) {
      console.log("🔄 Duplikat gefunden:", {
        existingId: existingContract._id,
        fileName: existingContract.name,
        uploadedAt: existingContract.createdAt
      });
    }

    return existingContract;
  } catch (err) {
    console.error("❌ Fehler beim Duplikat-Check:", err.message);
    return null; // Bei Fehler null zurückgeben, um normalen Ablauf fortzusetzen
  }
}

// ✅ NEU: Funktion zum Aktualisieren eines bestehenden Vertrags (bei Re-Analyse)
async function updateContractAnalysis(contractId, analysisData) {
  try {
    const updateData = {
      lastAnalyzed: new Date(),
      analyzeCount: { $inc: 1 }, // Counter erhöhen
      ...analysisData
    };

    const result = await database.updateOne('contracts', 
      { _id: new ObjectId(contractId) },
      { $set: updateData, $inc: { analyzeCount: 1 } }
    );

    console.log("🔄 Vertrag-Analyse aktualisiert:", {
      contractId: contractId,
      modifiedCount: result.modifiedCount
    });

    return result;
  } catch (err) {
    console.error("❌ Fehler beim Aktualisieren der Vertrag-Analyse:", err.message);
    throw err;
  }
}

// ✅ NEU: Funktion zum Abrufen von Verträgen mit Paginierung
async function getContractsByUser(userId, options = {}) {
  try {
    const {
      limit = 20,
      skip = 0,
      sortBy = 'createdAt',
      sortOrder = -1,
      includeDeleted = false
    } = options;

    const query = {
      userId: new ObjectId(userId)
    };

    if (!includeDeleted) {
      query.status = { $ne: 'deleted' };
    }

    const contracts = await database.find('contracts', query, {
      sort: { [sortBy]: sortOrder },
      limit: limit,
      skip: skip
    });

    const total = await database.countDocuments('contracts', query);

    console.log("📚 Verträge abgerufen:", {
      userId: userId,
      count: contracts.length,
      total: total,
      page: Math.floor(skip / limit) + 1
    });

    return {
      contracts: contracts,
      pagination: {
        total: total,
        page: Math.floor(skip / limit) + 1,
        pageSize: limit,
        hasMore: skip + limit < total
      }
    };
  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Verträge:", err.message);
    throw err;
  }
}

// ✅ NEU: Funktion zum Löschen eines Vertrags (Soft Delete)
async function deleteContract(contractId, userId) {
  try {
    const result = await database.updateOne('contracts',
      { 
        _id: new ObjectId(contractId),
        userId: new ObjectId(userId) // Sicherheitscheck
      },
      { 
        $set: { 
          status: 'deleted',
          deletedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Vertrag nicht gefunden oder nicht berechtigt");
    }

    console.log("🗑️ Vertrag gelöscht:", {
      contractId: contractId,
      userId: userId
    });

    return result;
  } catch (err) {
    console.error("❌ Fehler beim Löschen des Vertrags:", err.message);
    throw err;
  }
}

// ✅ NEU: Hilfsfunktion für Database Health Check
async function getDatabaseStats() {
  try {
    const contractsCount = await database.countDocuments('contracts');
    const analysesCount = await database.countDocuments('analyses');
    const usersCount = await database.countDocuments('users');

    return {
      contracts: contractsCount,
      analyses: analysesCount,
      users: usersCount,
      timestamp: new Date()
    };
  } catch (err) {
    console.error("❌ Fehler beim Abrufen der DB-Statistiken:", err.message);
    return null;
  }
}

module.exports = {
  saveContract,
  checkDuplicateContract, // ✅ NEU
  updateContractAnalysis, // ✅ NEU
  getContractsByUser, // ✅ NEU
  deleteContract, // ✅ NEU
  getDatabaseStats // ✅ NEU
};