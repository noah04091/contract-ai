// 📁 backend/services/automatedActionsService.js
// Legal Pulse 2.0 Phase 2 - Automated Actions Orchestrator

const { MongoClient, ObjectId } = require("mongodb");

class AutomatedActionsService {
  constructor() {
    this.maxRetries = 2;
    this.retryDelay = 1000; // 1 second

    console.log('[AUTOMATED-ACTIONS] Service initialized');
  }

  /**
   * Execute automated action based on notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @param {string} actionType - Action type (optimize, generate, sign, review)
   * @returns {Promise<Object>} - Action result
   */
  async executeAction(notificationId, userId, actionType) {
    console.log(`[AUTOMATED-ACTIONS] Executing ${actionType} for notification ${notificationId}`);

    try {
      // Get notification details
      const PulseNotification = require('../models/PulseNotification');
      const notification = await PulseNotification.findOne({
        _id: new ObjectId(notificationId),
        userId: new ObjectId(userId)
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Get contract
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      const contract = await client.db('contract_ai')
        .collection('contracts')
        .findOne({ _id: new ObjectId(notification.contractId) });

      await client.close();

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Execute action based on type
      let result;
      switch (actionType) {
        case 'optimize':
          result = await this.executeOptimizeAction(contract, notification);
          break;
        case 'generate':
          result = await this.executeGenerateAction(contract, notification);
          break;
        case 'sign':
          result = await this.executeSignAction(contract, notification);
          break;
        case 'review':
          result = await this.executeReviewAction(contract, notification);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      // Mark notification action as taken
      await notification.markActionTaken(result.status);

      console.log(`[AUTOMATED-ACTIONS] ✓ ${actionType} completed for ${notificationId}`);

      return {
        success: true,
        actionType,
        result,
        notification: notification._id,
        contract: contract._id
      };

    } catch (error) {
      console.error(`[AUTOMATED-ACTIONS] ✗ Error executing ${actionType}:`, error);
      throw error;
    }
  }

  /**
   * Execute optimize action
   * @param {Object} contract - Contract object
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Optimization result
   */
  async executeOptimizeAction(contract, notification) {
    console.log(`[AUTOMATED-ACTIONS] Optimizing contract ${contract._id}`);

    try {
      // Get contract text
      const contractText = this.extractContractText(contract);

      // Build optimization prompt based on notification
      const optimizationPrompt = this.buildOptimizationPrompt(notification, contract);

      // Call OpenAI for optimization suggestions
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein erfahrener Rechtsanwalt. Analysiere den Vertrag und gib konkrete Optimierungsvorschläge basierend auf dem identifizierten Risiko.'
          },
          {
            role: 'user',
            content: optimizationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const optimizationSuggestions = response.choices[0].message.content;

      // Store optimization result
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      await client.db('contract_ai')
        .collection('contracts')
        .updateOne(
          { _id: contract._id },
          {
            $set: {
              'legalPulse.lastOptimization': new Date(),
              'legalPulse.optimizationSuggestions': optimizationSuggestions
            }
          }
        );

      await client.close();

      return {
        status: 'completed',
        suggestions: optimizationSuggestions,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[AUTOMATED-ACTIONS] Optimize error:', error);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute generate action (create new version of contract)
   * @param {Object} contract - Contract object
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Generation result
   */
  async executeGenerateAction(contract, notification) {
    console.log(`[AUTOMATED-ACTIONS] Generating new version for ${contract._id}`);

    try {
      // First optimize to get suggestions
      const optimizeResult = await this.executeOptimizeAction(contract, notification);

      if (optimizeResult.status !== 'completed') {
        throw new Error('Optimization failed, cannot generate');
      }

      // Generate improved version
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const contractText = this.extractContractText(contract);

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Rechtsanwalt. Erstelle eine verbesserte Version des Vertrags basierend auf den Optimierungsvorschlägen.'
          },
          {
            role: 'user',
            content: `ORIGINAL VERTRAG:\n${contractText}\n\nOPTIMIERUNGEN:\n${optimizeResult.suggestions}\n\nErstelle eine verbesserte Version des Vertrags.`
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      });

      const improvedContract = response.choices[0].message.content;

      // Store as new version
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      const newVersion = {
        originalContractId: contract._id,
        name: `${contract.name} (Optimiert)`,
        content: improvedContract,
        isGenerated: true,
        userId: contract.userId,
        generatedFrom: 'legal_pulse_automation',
        generatedAt: new Date(),
        legalPulse: {
          riskScore: Math.max(0, (contract.legalPulse?.riskScore || 50) - 20), // Improved score
          healthScore: Math.min(100, (contract.legalPulse?.healthScore || 70) + 20),
          lastChecked: new Date()
        }
      };

      const result = await client.db('contract_ai')
        .collection('contracts')
        .insertOne(newVersion);

      await client.close();

      return {
        status: 'completed',
        newContractId: result.insertedId,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[AUTOMATED-ACTIONS] Generate error:', error);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute sign action (prepare for signature)
   * @param {Object} contract - Contract object
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Sign preparation result
   */
  async executeSignAction(contract, notification) {
    console.log(`[AUTOMATED-ACTIONS] Preparing signature for ${contract._id}`);

    try {
      // Create signature envelope (if signature module exists)
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      // Check if contract already has signature envelope
      if (contract.signatureEnvelopeId) {
        await client.close();
        return {
          status: 'already_signed',
          envelopeId: contract.signatureEnvelopeId,
          timestamp: new Date()
        };
      }

      // Create draft envelope
      const envelope = {
        contractId: contract._id,
        userId: contract.userId,
        status: 'draft',
        createdAt: new Date(),
        createdFrom: 'legal_pulse_automation'
      };

      const result = await client.db('contract_ai')
        .collection('envelopes')
        .insertOne(envelope);

      // Update contract
      await client.db('contract_ai')
        .collection('contracts')
        .updateOne(
          { _id: contract._id },
          {
            $set: {
              signatureEnvelopeId: result.insertedId,
              signatureStatus: 'draft'
            }
          }
        );

      await client.close();

      return {
        status: 'completed',
        envelopeId: result.insertedId,
        message: 'Signature envelope created',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[AUTOMATED-ACTIONS] Sign error:', error);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute review action (mark for manual review)
   * @param {Object} contract - Contract object
   * @param {Object} notification - Notification object
   * @returns {Promise<Object>} - Review result
   */
  async executeReviewAction(contract, notification) {
    console.log(`[AUTOMATED-ACTIONS] Marking for review ${contract._id}`);

    try {
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      await client.db('contract_ai')
        .collection('contracts')
        .updateOne(
          { _id: contract._id },
          {
            $set: {
              'legalPulse.reviewRequired': true,
              'legalPulse.reviewRequestedAt': new Date(),
              'legalPulse.reviewReason': notification.description
            }
          }
        );

      await client.close();

      return {
        status: 'completed',
        message: 'Contract marked for review',
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[AUTOMATED-ACTIONS] Review error:', error);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Build optimization prompt based on notification
   * @param {Object} notification - Notification object
   * @param {Object} contract - Contract object
   * @returns {string} - Optimization prompt
   */
  buildOptimizationPrompt(notification, contract) {
    const contractText = this.extractContractText(contract);

    let prompt = `VERTRAG:\n${contractText}\n\n`;

    prompt += `IDENTIFIZIERTES RISIKO:\n`;
    prompt += `Typ: ${notification.type}\n`;
    prompt += `Schwere: ${notification.severity}\n`;
    prompt += `Problem: ${notification.description}\n\n`;

    if (notification.lawReference) {
      prompt += `BETROFFENES GESETZ:\n`;
      prompt += `${notification.lawReference.lawId} ${notification.lawReference.sectionId}\n`;
      prompt += `Rechtsgebiet: ${notification.lawReference.area}\n\n`;
    }

    prompt += `AUFGABE:\n`;
    prompt += `Gib konkrete, umsetzbare Optimierungsvorschläge, um dieses Risiko zu minimieren. `;
    prompt += `Formuliere präzise Klauseln oder Änderungen, die direkt übernommen werden können.`;

    return prompt;
  }

  /**
   * Extract text from contract
   * @param {Object} contract - Contract object
   * @returns {string} - Extracted text
   */
  extractContractText(contract) {
    const parts = [
      contract.name || '',
      contract.title || '',
      contract.content || '',
      contract.extractedText || '',
      contract.fullText || ''
    ].filter(Boolean);

    return parts.join('\n\n').substring(0, 8000);
  }

  /**
   * Execute workflow (multi-step automation)
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @param {Array<string>} workflow - Array of action types
   * @returns {Promise<Object>} - Workflow result
   */
  async executeWorkflow(notificationId, userId, workflow) {
    console.log(`[AUTOMATED-ACTIONS] Executing workflow:`, workflow);

    const results = [];

    for (const actionType of workflow) {
      try {
        const result = await this.executeAction(notificationId, userId, actionType);
        results.push(result);

        // If any step fails, stop workflow
        if (!result.success) {
          console.log(`[AUTOMATED-ACTIONS] Workflow stopped at ${actionType}`);
          break;
        }

        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[AUTOMATED-ACTIONS] Workflow error at ${actionType}:`, error);
        results.push({
          success: false,
          actionType,
          error: error.message
        });
        break;
      }
    }

    return {
      success: results.every(r => r.success),
      workflow,
      results,
      completedSteps: results.filter(r => r.success).length,
      totalSteps: workflow.length
    };
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new AutomatedActionsService();
    }
    return instance;
  },
  AutomatedActionsService
};
