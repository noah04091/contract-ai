// 📁 backend/routes/optimizedContract.js - PHASE 3: Smart Contract Generator
const express = require("express");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const PDFDocument = require("pdfkit");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// ✅ File Storage Integration (S3 + Local)
const getContractFile = async (contract) => {
  try {
    // S3 File
    if (contract.s3Key) {
      console.log("📁 Loading S3 file:", contract.s3Key);
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });
      
      const s3Object = await s3.getObject({
        Bucket: contract.s3Bucket || process.env.AWS_S3_BUCKET,
        Key: contract.s3Key
      }).promise();
      
      return s3Object.Body;
    }
    
    // Local File
    if (contract.filename || contract.filePath) {
      const filename = contract.filename || contract.filePath.replace('/uploads/', '');
      const localPath = path.join(__dirname, '..', 'uploads', filename);
      
      console.log("📁 Loading local file:", localPath);
      
      if (fsSync.existsSync(localPath)) {
        return await fs.readFile(localPath);
      }
    }
    
    throw new Error("Contract file not found");
  } catch (error) {
    console.error("❌ Error loading contract file:", error.message);
    throw new Error(`File access error: ${error.message}`);
  }
};

// ✅ Text Replacement Engine
const applyOptimizations = (originalText, optimizations) => {
  let optimizedText = originalText;
  const appliedChanges = [];
  
  console.log(`🔧 Applying ${optimizations.length} optimizations to text...`);
  
  optimizations.forEach((opt, index) => {
    try {
      // Simple text replacement - original text with improved text
      if (opt.originalText && opt.improvedText) {
        // Clean up texts for better matching
        const cleanOriginal = opt.originalText.trim().substring(0, 200);
        const cleanImproved = opt.improvedText.trim();
        
        // Try to find and replace similar text patterns
        const regex = new RegExp(cleanOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = optimizedText.match(regex);
        
        if (matches && matches.length > 0) {
          optimizedText = optimizedText.replace(regex, cleanImproved);
          appliedChanges.push({
            index: index + 1,
            category: opt.category || 'general',
            originalLength: cleanOriginal.length,
            improvedLength: cleanImproved.length,
            applied: true
          });
          console.log(`✅ Applied optimization ${index + 1}: ${opt.category}`);
        } else {
          // If exact match not found, append as additional clause
          optimizedText += `\n\n--- OPTIMIERUNG ${index + 1} (${opt.category?.toUpperCase()}) ---\n${cleanImproved}`;
          appliedChanges.push({
            index: index + 1,
            category: opt.category || 'general',
            applied: true,
            method: 'appended'
          });
          console.log(`➕ Appended optimization ${index + 1}: ${opt.category}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to apply optimization ${index + 1}:`, error.message);
      appliedChanges.push({
        index: index + 1,
        category: opt.category || 'general',
        applied: false,
        error: error.message
      });
    }
  });
  
  return { optimizedText, appliedChanges };
};

// ✅ PDF Generator with PDFKit
const generateOptimizedPDF = async (contractData, optimizedText, appliedChanges) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("📄 Generating optimized PDF...");
      
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .text('OPTIMIERTER VERTRAG', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12).font('Helvetica')
         .text(`Original: ${contractData.name}`, { align: 'center' })
         .text(`Optimiert am: ${new Date().toLocaleDateString('de-DE')}`, { align: 'center' });
      
      doc.moveDown(2);
      
      // Summary Box
      doc.rect(50, doc.y, 495, 80).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold')
         .text('OPTIMIERUNGSÜBERSICHT', 60, doc.y);
      
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
         .text(`✅ ${appliedChanges.filter(c => c.applied).length} Optimierungen erfolgreich angewendet`, 60, doc.y)
         .text(`📊 Vertragsqualität verbessert durch KI-Analyse`, 60, doc.y + 12)
         .text(`🔧 Kategorien: ${[...new Set(appliedChanges.map(c => c.category))].join(', ')}`, 60, doc.y + 12);
      
      doc.moveDown(3);
      
      // Optimized Contract Text
      doc.fontSize(14).font('Helvetica-Bold')
         .text('OPTIMIERTER VERTRAGSTEXT:', { underline: true });
      
      doc.moveDown();
      
      // Split text into manageable chunks and handle page breaks
      const paragraphs = optimizedText.split('\n\n');
      doc.fontSize(10).font('Helvetica');
      
      paragraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }
          
          // Highlight optimization sections
          if (paragraph.includes('--- OPTIMIERUNG')) {
            doc.fontSize(11).font('Helvetica-Bold')
               .fillColor('blue')
               .text(paragraph, { continued: false });
            doc.fillColor('black').font('Helvetica');
          } else {
            doc.fontSize(10).text(paragraph, { 
              align: 'justify',
              continued: false 
            });
          }
          
          doc.moveDown(0.5);
        }
      });
      
      // Footer on last page
      doc.addPage();
      doc.fontSize(12).font('Helvetica-Bold')
         .text('ANGEWANDTE OPTIMIERUNGEN:', { underline: true });
      
      doc.moveDown();
      
      appliedChanges.forEach((change, index) => {
        if (change.applied) {
          doc.fontSize(10).font('Helvetica')
             .text(`${index + 1}. ${change.category?.toUpperCase() || 'ALLGEMEIN'}: ${change.method === 'appended' ? 'Als neue Klausel hinzugefügt' : 'Bestehenden Text optimiert'}`, {
               continued: false
             });
          doc.moveDown(0.3);
        }
      });
      
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica')
         .text('Generiert durch Contract AI - KI-Vertragsoptimierung', { align: 'center' })
         .text(`Erstellt am: ${new Date().toLocaleString('de-DE')}`, { align: 'center' });
      
      doc.end();
      
    } catch (error) {
      console.error("❌ PDF generation error:", error);
      reject(error);
    }
  });
};

// ✅ MAIN ROUTE: Generate Optimized Contract
router.post("/:contractId/generate-optimized", verifyToken, async (req, res) => {
  const requestId = `gen_opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🪄 [${requestId}] Smart Contract Generation Request:`, {
    contractId: req.params.contractId,
    userId: req.user?.userId,
    hasOptimizations: !!req.body?.optimizations,
    optimizationCount: req.body?.optimizations?.length || 0
  });

  try {
    const { contractId } = req.params;
    const { optimizations = [], options = {} } = req.body;
    
    // ✅ Validation
    if (!contractId || !ObjectId.isValid(contractId)) {
      return res.status(400).json({
        success: false,
        message: "❌ Ungültige Contract ID",
        error: "INVALID_CONTRACT_ID"
      });
    }
    
    if (!optimizations || optimizations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "❌ Keine Optimierungen ausgewählt",
        error: "NO_OPTIMIZATIONS"
      });
    }
    
    // ✅ Load Contract from Database
    console.log(`📋 [${requestId}] Loading contract from database...`);
    const contractsCollection = req.db.collection("contracts");
    
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      userId: req.user.userId // Security: Only user's own contracts
    });
    
    if (!contract) {
      console.warn(`❌ [${requestId}] Contract not found: ${contractId}`);
      return res.status(404).json({
        success: false,
        message: "❌ Vertrag nicht gefunden",
        error: "CONTRACT_NOT_FOUND"
      });
    }
    
    console.log(`✅ [${requestId}] Contract loaded: ${contract.name}`);
    
    // ✅ Extract Original Text
    let originalText = '';
    
    try {
      if (contract.content) {
        // Use stored content if available
        originalText = contract.content;
        console.log(`📄 [${requestId}] Using stored content: ${originalText.length} chars`);
      } else if (contract.fullText) {
        // Use fullText from analysis
        originalText = contract.fullText;
        console.log(`📄 [${requestId}] Using fullText: ${originalText.length} chars`);
      } else {
        // Extract from file
        console.log(`📁 [${requestId}] Extracting text from file...`);
        const fileBuffer = await getContractFile(contract);
        const parsed = await pdfParse(fileBuffer);
        originalText = parsed.text || '';
        console.log(`📄 [${requestId}] Extracted text: ${originalText.length} chars`);
      }
      
      if (!originalText.trim()) {
        throw new Error("No readable text found in contract");
      }
      
    } catch (fileError) {
      console.error(`❌ [${requestId}] Text extraction failed:`, fileError.message);
      return res.status(400).json({
        success: false,
        message: "❌ Vertragstext konnte nicht extrahiert werden",
        error: "TEXT_EXTRACTION_FAILED",
        details: fileError.message
      });
    }
    
    // ✅ Apply Optimizations
    console.log(`🔧 [${requestId}] Applying optimizations...`);
    const { optimizedText, appliedChanges } = applyOptimizations(originalText, optimizations);
    
    const successfulOptimizations = appliedChanges.filter(c => c.applied).length;
    console.log(`✅ [${requestId}] Applied ${successfulOptimizations}/${optimizations.length} optimizations`);
    
    // ✅ Generate PDF
    console.log(`📄 [${requestId}] Generating optimized PDF...`);
    const pdfBuffer = await generateOptimizedPDF(contract, optimizedText, appliedChanges);
    
    // ✅ Save Generated Contract (Optional)
    const optimizedContractData = {
      userId: req.user.userId,
      name: `${contract.name} (Optimiert)`,
      content: optimizedText,
      originalContractId: new ObjectId(contractId),
      optimizations: optimizations,
      appliedChanges: appliedChanges,
      isGenerated: true,
      isOptimized: true,
      generatedAt: new Date(),
      status: "optimiert",
      metadata: {
        originalTextLength: originalText.length,
        optimizedTextLength: optimizedText.length,
        optimizationCount: optimizations.length,
        successfulOptimizations: successfulOptimizations,
        generationMethod: "smart-replacement",
        requestId: requestId
      }
    };
    
    try {
      const saveResult = await contractsCollection.insertOne(optimizedContractData);
      console.log(`💾 [${requestId}] Optimized contract saved: ${saveResult.insertedId}`);
    } catch (saveError) {
      console.warn(`⚠️ [${requestId}] Failed to save optimized contract:`, saveError.message);
      // Non-blocking - PDF generation was successful
    }
    
    // ✅ Send PDF as Download
    const filename = `${contract.name.replace(/[^a-zA-Z0-9]/g, '_')}_optimiert_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    
    console.log(`✅ [${requestId}] Smart Contract Generation completed successfully`);
    console.log(`📤 [${requestId}] Sending PDF: ${filename} (${pdfBuffer.length} bytes)`);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error(`❌ [${requestId}] Smart Contract Generation failed:`, {
      message: error.message,
      stack: error.stack,
      contractId: req.params.contractId,
      userId: req.user?.userId
    });
    
    // ✅ Intelligent Error Messages
    let errorMessage = "Fehler bei der Vertragsgenerierung.";
    let errorCode = "GENERATION_ERROR";
    let statusCode = 500;
    
    if (error.message.includes("not found") || error.message.includes("not readable")) {
      errorMessage = "📄 Vertragsdatei konnte nicht gelesen werden.";
      errorCode = "FILE_READ_ERROR";
      statusCode = 400;
    } else if (error.message.includes("PDF") || error.message.includes("parse")) {
      errorMessage = "📄 PDF-Verarbeitung fehlgeschlagen. Prüfe das Dateiformat.";
      errorCode = "PDF_ERROR";
      statusCode = 400;
    } else if (error.message.includes("S3") || error.message.includes("AWS")) {
      errorMessage = "☁️ Dateizugriff fehlgeschlagen. Versuche es erneut.";
      errorCode = "FILE_ACCESS_ERROR";
      statusCode = 503;
    } else if (error.message.includes("Database") || error.message.includes("MongoDB")) {
      errorMessage = "💾 Datenbank-Fehler. Versuche es erneut.";
      errorCode = "DATABASE_ERROR";
      statusCode = 503;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      help: "Kontaktiere den Support falls das Problem weiterhin besteht."
    });
  }
});

// ✅ Health Check
router.get("/health", (req, res) => {
  const checks = {
    service: "Smart Contract Generator",
    status: "online",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    features: {
      textReplacement: true,
      pdfGeneration: true,
      s3Integration: !!process.env.AWS_ACCESS_KEY_ID,
      localFiles: true
    },
    dependencies: {
      pdfkit: true,
      pdfParse: true,
      mongodb: !!req.db
    }
  };
  
  const isHealthy = checks.dependencies.mongodb && checks.dependencies.pdfkit;
  
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    ...checks
  });
});

// ✅ Get Contract Optimization History
router.get("/:contractId/history", verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const contractsCollection = req.db.collection("contracts");
    
    const optimizedVersions = await contractsCollection
      .find({
        originalContractId: new ObjectId(contractId),
        userId: req.user.userId,
        isOptimized: true
      })
      .sort({ generatedAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      contractId: contractId,
      optimizedVersions: optimizedVersions,
      count: optimizedVersions.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching optimization history:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen der Optimierung-Historie",
      error: "HISTORY_ERROR"
    });
  }
});

module.exports = router;