/**
 * Legal Pulse V2 — Pipeline Orchestrator
 * 6-Stage pipeline (Stages 0,1,2,3,4,5) with SSE progress.
 */

const LegalPulseV2Result = require("../../models/LegalPulseV2Result");
const { runDocumentIntelligence } = require("./stages/00-documentIntelligence");
const { runContextGathering } = require("./stages/01-contextGathering");
const { runDeepAnalysis } = require("./stages/02-deepAnalysis");
const { runCrossContractIntelligence } = require("./stages/03-crossContractIntelligence");
const { runActionEngine } = require("./stages/04-actionEngine");
const { runScoreCalculation } = require("./stages/05-scoreCalculation");

const database = require("../../config/database");
const { ObjectId } = require("mongodb");

/**
 * Load contract text from DB/S3
 */
async function loadContractText(contract) {
  // Try extracted text first
  if (contract.extractedText && contract.extractedText.length > 100) {
    return contract.extractedText;
  }

  // Try analysis.extractedText
  if (contract.analysis?.extractedText && contract.analysis.extractedText.length > 100) {
    return contract.analysis.extractedText;
  }

  // Try the contract's text field
  if (contract.text && contract.text.length > 100) {
    return contract.text;
  }

  // Try contractText
  if (contract.contractText && contract.contractText.length > 100) {
    return contract.contractText;
  }

  // If S3 key exists, try to download and extract via pdf-parse
  if (contract.s3Key) {
    try {
      const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
      const pdfParse = require("pdf-parse");
      const s3 = new S3Client({
        region: process.env.AWS_REGION || "eu-central-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: contract.s3Key,
      });
      const response = await s3.send(command);
      const chunks = [];
      for await (const chunk of response.Body) { chunks.push(chunk); }
      const buffer = Buffer.concat(chunks);
      const pdfData = await pdfParse(buffer);
      if (pdfData.text && pdfData.text.length > 100) return pdfData.text;
    } catch (err) {
      console.error("[PulseV2] S3 text extraction failed:", err.message);
    }
  }

  throw new Error("Kein Vertragstext verfügbar. Bitte laden Sie den Vertrag erneut hoch.");
}

/**
 * Run the full Legal Pulse V2 pipeline
 * @param {object} params - { userId, contractId, requestId, triggeredBy }
 * @param {function} onProgress - (progress: number, message: string, data?: object) => void
 * @returns {object} Complete result
 */
async function runPipeline({ userId, contractId, requestId, triggeredBy = "manual" }, onProgress) {
  // Find previous result for linking
  const previousResult = await LegalPulseV2Result.findOne({
    userId,
    contractId,
    status: "completed",
  }).sort({ createdAt: -1 }).lean();

  // Create initial DB record
  const record = await LegalPulseV2Result.create({
    userId,
    contractId,
    requestId,
    status: "running",
    currentStage: 0,
    triggeredBy,
    previousResultId: previousResult?._id || null,
    startedAt: new Date(),
    costs: { totalTokensInput: 0, totalTokensOutput: 0, totalCostUSD: 0, perStage: [] },
  });

  try {
    // ═══════════════════════════════════════════
    // STAGE 1: Context Gathering (DB queries only)
    // ═══════════════════════════════════════════
    onProgress(5, "Sammle Vertragskontext...", { stage: 1, stageName: "Context Gathering" });

    const context = await runContextGathering(userId, contractId);

    await LegalPulseV2Result.updateOne(
      { _id: record._id },
      {
        $set: {
          currentStage: 1,
          context: {
            contractName: context.contractName,
            contractType: context.contractType,
            parties: context.parties,
            duration: context.duration,
            startDate: context.startDate,
            endDate: context.endDate,
            daysUntilExpiry: context.daysUntilExpiry,
            autoRenewal: context.autoRenewal,
            provider: context.provider,
            portfolioSize: context.portfolioSize,
            relatedContracts: context.relatedContracts,
            previousAnalysisCount: context.previousAnalysisCount,
            lastAnalysisDate: context.lastAnalysisDate,
            riskTrend: context.riskTrend,
          },
        },
      }
    );

    onProgress(10, "Kontext gesammelt", { stage: 1, stageName: "Context Gathering", complete: true });

    // ═══════════════════════════════════════════
    // STAGE 0: Document Intelligence (no AI)
    // ═══════════════════════════════════════════
    onProgress(12, "Lade und bereinige Vertragstext...", { stage: 0, stageName: "Document Intelligence" });

    // Load raw text
    const rawText = await loadContractText(context._contract);

    const { cleanedText, document: docMeta } = runDocumentIntelligence(rawText);

    await LegalPulseV2Result.updateOne(
      { _id: record._id },
      { $set: { currentStage: 2, document: docMeta } }
    );

    onProgress(20, `Dokument bereinigt (${docMeta.cleanedTextLength} Zeichen, Typ: ${docMeta.contractType})`, {
      stage: 0,
      stageName: "Document Intelligence",
      complete: true,
      contractType: docMeta.contractType,
      qualityScore: docMeta.qualityScore,
    });

    // Use detected type if not in context
    if (!context.contractType && docMeta.contractType !== "unbekannt") {
      context.contractType = docMeta.contractType;
    }

    // ═══════════════════════════════════════════
    // STAGE 2: Deep Analysis (GPT-4o)
    // ═══════════════════════════════════════════
    onProgress(22, "Starte tiefgehende Klauselanalyse...", { stage: 2, stageName: "Deep Analysis" });

    const analysisResult = await runDeepAnalysis(cleanedText, context, onProgress);

    await LegalPulseV2Result.updateOne(
      { _id: record._id },
      {
        $set: {
          currentStage: 5,
          clauses: analysisResult.clauses,
          clauseFindings: analysisResult.clauseFindings,
        },
        $push: {
          "costs.perStage": analysisResult.costs,
        },
        $inc: {
          "costs.totalTokensInput": analysisResult.costs.inputTokens,
          "costs.totalTokensOutput": analysisResult.costs.outputTokens,
          "costs.totalCostUSD": analysisResult.costs.costUSD,
        },
      }
    );

    onProgress(70, `${analysisResult.clauseFindings.length} Befunde identifiziert`, {
      stage: 2,
      stageName: "Deep Analysis",
      complete: true,
      findingsCount: analysisResult.clauseFindings.length,
    });

    // ═══════════════════════════════════════════
    // STAGE 3: Cross-Contract Intelligence (GPT-4o-mini)
    // ═══════════════════════════════════════════
    let portfolioInsights = [];
    try {
      onProgress(71, "Starte Portfolio-Analyse...", { stage: 3, stageName: "Portfolio Intelligence" });
      const crossResult = await runCrossContractIntelligence(userId, onProgress);
      portfolioInsights = crossResult.portfolioInsights;

      await LegalPulseV2Result.updateOne(
        { _id: record._id },
        {
          $set: { portfolioInsights },
          $push: { "costs.perStage": crossResult.costs },
          $inc: {
            "costs.totalTokensInput": crossResult.costs.inputTokens,
            "costs.totalTokensOutput": crossResult.costs.outputTokens,
            "costs.totalCostUSD": crossResult.costs.costUSD,
          },
        }
      );

      onProgress(78, `${portfolioInsights.length} Portfolio-Insights erkannt`, {
        stage: 3,
        stageName: "Portfolio Intelligence",
        complete: true,
        insightsCount: portfolioInsights.length,
      });
    } catch (err) {
      console.error("[PulseV2] Stage 3 failed (non-critical):", err.message);
      onProgress(78, "Portfolio-Analyse übersprungen", { stage: 3, stageName: "Portfolio Intelligence", complete: true });
    }

    // ═══════════════════════════════════════════
    // STAGE 4: Action Engine (GPT-4o)
    // ═══════════════════════════════════════════
    let actions = [];
    try {
      onProgress(80, "Generiere Handlungsempfehlungen...", { stage: 4, stageName: "Action Engine" });
      const actionResult = await runActionEngine(
        analysisResult.clauseFindings,
        portfolioInsights,
        context,
        onProgress
      );
      actions = actionResult.actions;

      await LegalPulseV2Result.updateOne(
        { _id: record._id },
        {
          $set: { actions },
          $push: { "costs.perStage": actionResult.costs },
          $inc: {
            "costs.totalTokensInput": actionResult.costs.inputTokens,
            "costs.totalTokensOutput": actionResult.costs.outputTokens,
            "costs.totalCostUSD": actionResult.costs.costUSD,
          },
        }
      );

      onProgress(88, `${actions.length} Handlungsempfehlungen generiert`, {
        stage: 4,
        stageName: "Action Engine",
        complete: true,
        actionsCount: actions.length,
      });
    } catch (err) {
      console.error("[PulseV2] Stage 4 failed (non-critical):", err.message);
      onProgress(88, "Empfehlungen übersprungen", { stage: 4, stageName: "Action Engine", complete: true });
    }

    // ═══════════════════════════════════════════
    // STAGE 5: Score Calculation (deterministic)
    // ═══════════════════════════════════════════
    onProgress(90, "Berechne Health Score...", { stage: 5, stageName: "Score Calculation" });

    const scores = runScoreCalculation(
      analysisResult.clauses,
      analysisResult.clauseFindings,
      context
    );

    await LegalPulseV2Result.updateOne(
      { _id: record._id },
      {
        $set: {
          scores,
          status: "completed",
          completedAt: new Date(),
        },
      }
    );

    onProgress(90, `Health Score: ${scores.overall}/100`, {
      stage: 5,
      stageName: "Score Calculation",
      complete: true,
      scores,
    });

    // Update the contract's legalPulse field for backward compat
    try {
      const db = await database.connect();
      await db.collection("contracts").updateOne(
        { _id: new ObjectId(contractId) },
        {
          $set: {
            "legalPulse.healthScore": scores.overall,
            "legalPulse.riskScore": 100 - scores.overall,
            "legalPulse.lastChecked": new Date(),
            "legalPulse.aiGenerated": true,
            "legalPulse.analysisDate": new Date(),
            "legalPulse.riskLevel": scores.overall >= 70 ? "low" : scores.overall >= 40 ? "medium" : "high",
          },
        }
      );
    } catch (err) {
      console.error("[PulseV2] Failed to update contract legalPulse:", err.message);
    }

    // Track cost
    try {
      const { getCostTrackingService } = require("../costTracking");
      const costTracker = getCostTrackingService ? getCostTrackingService() : null;
      if (costTracker) {
        const finalResult = await LegalPulseV2Result.findById(record._id).lean();
        await costTracker.trackAPICall({
          userId,
          model: "gpt-4o",
          inputTokens: finalResult.costs.totalTokensInput,
          outputTokens: finalResult.costs.totalTokensOutput,
          feature: "legal-pulse-v2",
          contractId,
        });
      }
    } catch (err) {
      // Cost tracking is not critical
    }

    console.log(`[PulseV2] Pipeline completed for contract ${contractId}: Score ${scores.overall}, ${analysisResult.clauseFindings.length} findings, $${analysisResult.costs.costUSD.toFixed(4)}`);

    return {
      resultId: record._id.toString(),
      scores,
      findingsCount: analysisResult.clauseFindings.length,
      clauseCount: analysisResult.clauses.length,
    };

  } catch (error) {
    // Mark as failed
    await LegalPulseV2Result.updateOne(
      { _id: record._id },
      { $set: { status: "failed", error: error.message } }
    );
    throw error;
  }
}

module.exports = { runPipeline };
