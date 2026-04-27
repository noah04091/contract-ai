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

  // If S3 key exists, try to download and extract (PDF + DOCX)
  if (contract.s3Key) {
    try {
      const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
      const { extractTextFromBuffer } = require("../textExtractor");
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
      const mimetype = contract.s3Key.toLowerCase().endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';
      const { text } = await extractTextFromBuffer(buffer, mimetype);
      if (text && text.length > 100) return text;
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

    // ── OCR Quality Gate (tiered) ──
    // < 25: Block — too poor for reliable analysis
    // 25-40: Warn — limited quality, results may be incomplete
    // > 40: Normal
    if (docMeta.qualityScore < 25) {
      await LegalPulseV2Result.updateOne(
        { _id: record._id },
        {
          $set: {
            status: "failed",
            document: docMeta,
            error: `Dokumentqualität zu niedrig für eine zuverlässige Analyse (Score: ${docMeta.qualityScore}/100). Bitte laden Sie eine bessere PDF-Version hoch.`,
            qualityGate: { blocked: true, score: docMeta.qualityScore, reason: "quality_too_low" },
          },
        }
      );
      onProgress(100, "Analyse abgebrochen: Dokumentqualität zu niedrig", {
        stage: 0,
        stageName: "Document Intelligence",
        error: true,
        qualityScore: docMeta.qualityScore,
        qualityGate: "blocked",
      });
      return {
        resultId: record._id.toString(),
        blocked: true,
        reason: "quality_too_low",
        qualityScore: docMeta.qualityScore,
      };
    }

    const qualityWarning = docMeta.qualityScore < 40 ? {
      limited: true,
      score: docMeta.qualityScore,
      message: "Eingeschränkte Dokumentqualität — Ergebnisse können unvollständig sein",
    } : null;

    await LegalPulseV2Result.updateOne(
      { _id: record._id },
      { $set: { currentStage: 2, document: docMeta, ...(qualityWarning && { qualityWarning }) } }
    );

    onProgress(20, `Dokument bereinigt (${docMeta.cleanedTextLength} Zeichen, Typ: ${docMeta.contractType})${qualityWarning ? ' — Eingeschränkte Qualität' : ''}`, {
      stage: 0,
      stageName: "Document Intelligence",
      complete: true,
      contractType: docMeta.contractType,
      qualityScore: docMeta.qualityScore,
      qualityWarning,
    });

    // Use detected type if not in context
    if (!context.contractType && docMeta.contractType !== "unbekannt") {
      context.contractType = docMeta.contractType;
    }

    // Propagate detected language to downstream stages.
    // Default "de" preserves existing behavior for any path where docMeta is missing the field.
    context.language = docMeta.language || "de";

    // ═══════════════════════════════════════════
    // STAGE 2: Deep Analysis (GPT-4o)
    // ═══════════════════════════════════════════
    onProgress(22, "Starte tiefgehende Klauselanalyse...", {
      stage: 2,
      stageName: "Deep Analysis",
      // Send context early so frontend can show header while analyzing
      contractName: context.contractName,
      contractType: context.contractType || docMeta.contractType,
    });

    const analysisResult = await runDeepAnalysis(cleanedText, context, onProgress);

    // ─── Document-Gate: AI rejected this as a non-contract ───────────
    // If Stage 2 reports that the document is not actually a contract
    // (invoice, offer, quote, form, etc.) we stop the pipeline here.
    // The result is persisted with status "rejected_not_contract" so
    // the frontend can show a clear message and the radar query can
    // filter out junk entries.
    if (analysisResult.rejectedAsNotContract) {
      const reason = analysisResult.aiContractTypeReasoning || "Dokument ist kein Vertrag";
      console.log(`[PulseV2] Document rejected as non-contract: ${reason}`);

      await LegalPulseV2Result.updateOne(
        { _id: record._id },
        {
          $set: {
            status: "rejected_not_contract",
            rejectionReason: reason,
            document: {
              ...docMeta,
              contractType: "nicht_vertrag",
              contractTypeSource: "ai",
              contractTypeReasoning: reason,
              contractTypeConfidence: 95,
            },
            completedAt: new Date(),
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

      onProgress(100, `Analyse abgebrochen: ${reason}`, {
        stage: 2,
        stageName: "Document Gate",
        complete: true,
        error: true,
        rejectedNotContract: true,
        rejectionReason: reason,
      });

      return {
        resultId: record._id.toString(),
        rejectedNotContract: true,
        rejectionReason: reason,
      };
    }

    // Use AI-detected contract type if available (more reliable than keyword classifier)
    if (analysisResult.aiDetectedContractType) {
      const aiType = analysisResult.aiDetectedContractType;
      const stage0Type = docMeta.contractType;
      if (aiType.toLowerCase().replace(/[-\s]/g, "") !== stage0Type.toLowerCase().replace(/[-\s]/g, "")) {
        console.log(`[PulseV2] AI corrected contract type: "${stage0Type}" → "${aiType}" (${analysisResult.aiContractTypeReasoning})`);
      }
      // Update for downstream stages (3, 4, 5) and DB storage
      context.contractType = aiType;
      docMeta.contractType = aiType;
      docMeta.contractTypeSource = "ai";
      docMeta.contractTypeReasoning = analysisResult.aiContractTypeReasoning;
      docMeta.contractTypeConfidence = 95; // AI-confirmed = high confidence
    }

    // Soft-logic: when contract type is uncertain, be more conservative
    // Downgrade medium/high findings to low when we can't reliably assess branchenstandard
    // (Skipped when AI has confirmed/corrected the type — confidence is already 95)
    if (docMeta.contractTypeConfidence < 50) {
      console.log(`[PulseV2] Low contractType confidence (${docMeta.contractTypeConfidence}) — downgrading uncertain findings`);
      for (const f of analysisResult.clauseFindings) {
        if (f.severity === 'high' && f.confidence < 85) {
          f.severity = 'medium';
        }
        if (f.severity === 'medium' && f.confidence < 80) {
          f.severity = 'low';
        }
      }
    }

    await LegalPulseV2Result.updateOne(
      { _id: record._id },
      {
        $set: {
          currentStage: 5,
          clauses: analysisResult.clauses,
          clauseFindings: analysisResult.clauseFindings,
          coverage: analysisResult.coverage,
          // Store AI-corrected document metadata (contract type, source, reasoning)
          document: docMeta,
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

    const coverageMsg = analysisResult.coverage.percentage < 100
      ? ` (${analysisResult.coverage.analyzed}/${analysisResult.coverage.total} Klauseln analysiert)`
      : "";

    onProgress(70, `${analysisResult.clauseFindings.length} Befunde identifiziert${coverageMsg}`, {
      stage: 2,
      stageName: "Deep Analysis",
      complete: true,
      findingsCount: analysisResult.clauseFindings.length,
      coverage: analysisResult.coverage,
    });

    // ═══════════════════════════════════════════
    // STAGE 3: Cross-Contract Intelligence (GPT-4o-mini)
    // ═══════════════════════════════════════════
    let portfolioInsights = [];
    try {
      onProgress(71, "Starte Portfolio-Analyse...", { stage: 3, stageName: "Portfolio Intelligence" });
      const crossResult = await runCrossContractIntelligence(userId, onProgress, context.language);
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
      onProgress(78, "Portfolio-Analyse nicht verfügbar", {
        stage: 3, stageName: "Portfolio Intelligence", complete: true,
        stageError: true, errorMessage: "Portfolio-Analyse konnte nicht durchgeführt werden",
      });
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
      onProgress(88, "Empfehlungen nicht verfügbar", {
        stage: 4, stageName: "Action Engine", complete: true,
        stageError: true, errorMessage: "Handlungsempfehlungen konnten nicht generiert werden",
      });
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

    console.log(`[PulseV2] Pipeline completed for contract ${contractId}: Score ${scores.overall}, ${analysisResult.clauseFindings.length} findings, coverage ${analysisResult.coverage.percentage}%, $${analysisResult.costs.costUSD.toFixed(4)}`);

    return {
      resultId: record._id.toString(),
      scores,
      findingsCount: analysisResult.clauseFindings.length,
      clauseCount: analysisResult.clauses.length,
      coverage: analysisResult.coverage,
      qualityWarning,
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
