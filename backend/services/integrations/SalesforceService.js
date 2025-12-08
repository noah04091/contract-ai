// 📁 backend/services/integrations/SalesforceService.js
// Vollständige Salesforce CRM Integration
// Unterstützt: Opportunities, Accounts, Contacts, Contracts, Quotes

const BaseIntegrationService = require('./BaseIntegrationService');
const { ObjectId } = require('mongodb');

class SalesforceService extends BaseIntegrationService {
  constructor() {
    super('salesforce');
    this.apiVersion = 'v59.0'; // Aktuelle Salesforce API Version
  }

  // ==========================================
  // OAUTH FLOW
  // ==========================================

  /**
   * Generiert die OAuth Authorization URL
   */
  getAuthorizationUrl(userId, redirectUri) {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const isSandbox = process.env.SALESFORCE_SANDBOX === 'true';
    const baseUrl = isSandbox
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com';

    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now()
    })).toString('base64');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'api refresh_token offline_access',
      state
    });

    return `${baseUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Tauscht Auth Code gegen Access Token
   */
  async exchangeCodeForToken(code, redirectUri) {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const isSandbox = process.env.SALESFORCE_SANDBOX === 'true';
    const tokenUrl = isSandbox
      ? 'https://test.salesforce.com/services/oauth2/token'
      : 'https://login.salesforce.com/services/oauth2/token';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Salesforce OAuth error: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      instanceUrl: data.instance_url,
      tokenType: data.token_type,
      expiresAt: new Date(Date.now() + (data.expires_in || 7200) * 1000),
      scope: data.scope
    };
  }

  /**
   * Refresh Token
   */
  async refreshToken(credentials) {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const isSandbox = process.env.SALESFORCE_SANDBOX === 'true';
    const tokenUrl = isSandbox
      ? 'https://test.salesforce.com/services/oauth2/token'
      : 'https://login.salesforce.com/services/oauth2/token';

    // Decrypt refresh token
    const IntegrationCredential = require('../../models/IntegrationCredential');
    const refreshToken = IntegrationCredential.decrypt(credentials.oauth.refreshToken);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.json();
      // Bei invalid_grant müssen User sich neu authentifizieren
      if (error.error === 'invalid_grant') {
        await this.credentialsCollection.updateOne(
          { _id: credentials._id },
          { $set: { status: 'expired' } }
        );
        throw new Error('Salesforce token expired - re-authentication required');
      }
      throw new Error(`Salesforce token refresh error: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    // Update credentials in DB
    await this.credentialsCollection.updateOne(
      { _id: credentials._id },
      {
        $set: {
          'oauth.accessToken': data.access_token,
          'oauth.expiresAt': new Date(Date.now() + (data.expires_in || 7200) * 1000),
          'oauth.instanceUrl': data.instance_url || credentials.oauth.instanceUrl,
          updatedAt: new Date()
        }
      }
    );

    // Return updated credentials
    return await this.credentialsCollection.findOne({ _id: credentials._id });
  }

  // ==========================================
  // API CALLS
  // ==========================================

  /**
   * Salesforce API Call
   */
  async apiCall(method, endpoint, data = null, credentials = null) {
    if (!credentials) {
      throw new Error('Credentials required for Salesforce API call');
    }

    const IntegrationCredential = require('../../models/IntegrationCredential');
    const accessToken = IntegrationCredential.decrypt(credentials.oauth.accessToken);
    const instanceUrl = credentials.oauth.instanceUrl;

    const url = `${instanceUrl}/services/data/${this.apiVersion}${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && ['POST', 'PATCH', 'PUT'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    // Handle various response codes
    if (response.status === 204) {
      return { success: true }; // No content (DELETE, etc.)
    }

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        responseData?.[0]?.message ||
        responseData?.message ||
        `Salesforce API error: ${response.status}`
      );
      error.statusCode = response.status;
      error.salesforceError = responseData;
      throw error;
    }

    return responseData;
  }

  // ==========================================
  // DATA MAPPING
  // ==========================================

  /**
   * Contract AI -> Salesforce Opportunity
   */
  mapContractToExternal(contract) {
    // Standard Mapping
    const mapping = {
      Name: contract.name || contract.title || 'Contract from Contract AI',
      Description: contract.analysis?.summary || '',
      Amount: contract.amount || contract.dealInfo?.dealValue || 0,
      CloseDate: contract.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      StageName: this.mapContractStatusToStage(contract.status),
      Type: 'Existing Business',
      // Custom Fields (müssen in Salesforce existieren)
      Contract_AI_ID__c: contract._id?.toString(),
      Contract_Type__c: contract.contractType,
      Contract_Score__c: contract.contractScore,
      Risk_Score__c: contract.legalPulse?.riskScore
    };

    // Deal Info
    if (contract.dealInfo) {
      mapping.Probability = contract.dealInfo.probability;
    }

    // Company/Account Info (wenn vorhanden)
    if (contract.dealInfo?.company?.externalId) {
      mapping.AccountId = contract.dealInfo.company.externalId;
    }

    // Contact (wenn vorhanden)
    if (contract.dealInfo?.contacts?.[0]?.externalId) {
      mapping.ContactId = contract.dealInfo.contacts[0].externalId;
    }

    return mapping;
  }

  /**
   * Salesforce Opportunity -> Contract AI
   */
  mapExternalToContract(opportunity) {
    return {
      name: opportunity.Name,
      title: opportunity.Name,
      status: this.mapStageToContractStatus(opportunity.StageName),
      amount: opportunity.Amount,
      expiryDate: opportunity.CloseDate,

      externalIds: {
        salesforce: {
          opportunityId: opportunity.Id,
          accountId: opportunity.AccountId,
          contactId: opportunity.ContactId,
          recordType: 'Opportunity'
        }
      },

      dealInfo: {
        dealName: opportunity.Name,
        dealStage: opportunity.StageName,
        dealValue: opportunity.Amount,
        currency: 'EUR', // TODO: From Salesforce currency
        probability: opportunity.Probability,
        expectedCloseDate: opportunity.CloseDate ? new Date(opportunity.CloseDate) : null,
        dealOwner: {
          externalId: opportunity.OwnerId
        },
        company: {
          externalId: opportunity.AccountId
        }
      },

      source: {
        type: 'salesforce',
        externalSystem: 'salesforce',
        importedAt: new Date(),
        originalPayload: opportunity
      }
    };
  }

  /**
   * Mappt Contract Status zu Salesforce Stage
   */
  mapContractStatusToStage(status) {
    const mapping = {
      'Aktiv': 'Closed Won',
      'Active': 'Closed Won',
      'Abgelaufen': 'Closed Lost',
      'Expired': 'Closed Lost',
      'Bald ablaufend': 'Negotiation/Review',
      'Expiring Soon': 'Negotiation/Review',
      'Entwurf': 'Proposal/Price Quote',
      'Draft': 'Proposal/Price Quote',
      'Unbekannt': 'Qualification'
    };
    return mapping[status] || 'Qualification';
  }

  /**
   * Mappt Salesforce Stage zu Contract Status
   */
  mapStageToContractStatus(stage) {
    const mapping = {
      'Closed Won': 'Aktiv',
      'Closed Lost': 'Abgelaufen',
      'Negotiation/Review': 'Bald ablaufend',
      'Proposal/Price Quote': 'Entwurf'
    };
    return mapping[stage] || 'Unbekannt';
  }

  // ==========================================
  // SYNC OPERATIONS
  // ==========================================

  /**
   * Sync Contract zu Salesforce
   */
  async syncContractToExternal(contractId, userId) {
    await this.updateSyncStatus(contractId, 'syncing', 'outbound');

    try {
      const credentials = await this.ensureValidCredentials(userId);
      const contract = await this.contractsCollection.findOne({
        _id: new ObjectId(contractId),
        userId: new ObjectId(userId)
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Custom Field Mappings anwenden
      let mappedData = this.mapContractToExternal(contract);
      if (credentials.settings?.fieldMappings) {
        mappedData = this.applyFieldMappings(mappedData, credentials.settings.fieldMappings);
      }

      // Entferne custom fields die möglicherweise nicht existieren
      const cleanedData = Object.fromEntries(
        Object.entries(mappedData).filter(([key, value]) =>
          value !== undefined && value !== null && !key.endsWith('__c')
        )
      );

      let result;
      const existingOpportunityId = contract.externalIds?.salesforce?.opportunityId;

      if (existingOpportunityId) {
        // UPDATE existierende Opportunity
        this.log('info', `Updating Opportunity ${existingOpportunityId}`);
        await this.apiCallWithRetry(
          'PATCH',
          `/sobjects/Opportunity/${existingOpportunityId}`,
          cleanedData,
          credentials
        );
        result = { id: existingOpportunityId, created: false };
      } else {
        // CREATE neue Opportunity
        this.log('info', `Creating new Opportunity for contract ${contractId}`);
        const createResult = await this.apiCallWithRetry(
          'POST',
          '/sobjects/Opportunity',
          cleanedData,
          credentials
        );
        result = { id: createResult.id, created: true };

        // Speichere External ID
        await this.contractsCollection.updateOne(
          { _id: new ObjectId(contractId) },
          {
            $set: {
              'externalIds.salesforce.opportunityId': createResult.id,
              'externalIds.salesforce.recordType': 'Opportunity'
            }
          }
        );
      }

      await this.updateSyncStatus(contractId, 'synced', 'outbound');
      await this.logAuditEvent(userId, 'sync_to_salesforce', {
        contractId,
        opportunityId: result.id,
        created: result.created
      });

      this.emit('sync:complete', { contractId, externalId: result.id, direction: 'outbound' });

      return { success: true, externalId: result.id, created: result.created };

    } catch (error) {
      await this.updateSyncStatus(contractId, 'error', 'outbound', error.message);
      await this.logAuditEvent(userId, 'sync_to_salesforce', { contractId, error: error.message }, false);
      this.log('error', `Sync failed for contract ${contractId}`, error.message);
      throw error;
    }
  }

  /**
   * Sync Salesforce Opportunity zu Contract AI
   */
  async syncExternalToContract(opportunityId, userId) {
    try {
      const credentials = await this.ensureValidCredentials(userId);

      // Hole Opportunity Details
      const opportunity = await this.apiCallWithRetry(
        'GET',
        `/sobjects/Opportunity/${opportunityId}`,
        null,
        credentials
      );

      // Hole Account Details (wenn vorhanden)
      let account = null;
      if (opportunity.AccountId) {
        try {
          account = await this.apiCallWithRetry(
            'GET',
            `/sobjects/Account/${opportunity.AccountId}`,
            null,
            credentials
          );
        } catch (e) {
          this.log('warn', `Could not fetch Account ${opportunity.AccountId}`, e.message);
        }
      }

      // Mappe zu Contract Format
      const contractData = this.mapExternalToContract(opportunity);

      // Account Info hinzufügen
      if (account) {
        contractData.dealInfo.company = {
          name: account.Name,
          industry: account.Industry,
          size: account.NumberOfEmployees?.toString(),
          website: account.Website,
          externalId: account.Id
        };
      }

      // Prüfe ob Contract bereits existiert
      const existingContract = await this.findContractByExternalId(opportunityId, userId);

      let result;
      if (existingContract) {
        // UPDATE
        await this.contractsCollection.updateOne(
          { _id: existingContract._id },
          {
            $set: {
              ...contractData,
              updatedAt: new Date()
            }
          }
        );
        result = { contractId: existingContract._id.toString(), created: false };
        await this.updateSyncStatus(existingContract._id.toString(), 'synced', 'inbound');
      } else {
        // CREATE
        const insertResult = await this.contractsCollection.insertOne({
          ...contractData,
          userId: new ObjectId(userId),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        result = { contractId: insertResult.insertedId.toString(), created: true };
      }

      await this.logAuditEvent(userId, 'sync_from_salesforce', {
        opportunityId,
        contractId: result.contractId,
        created: result.created
      });

      this.emit('sync:complete', {
        contractId: result.contractId,
        externalId: opportunityId,
        direction: 'inbound'
      });

      return { success: true, ...result };

    } catch (error) {
      await this.logAuditEvent(userId, 'sync_from_salesforce', {
        opportunityId,
        error: error.message
      }, false);
      this.log('error', `Sync from Salesforce failed for ${opportunityId}`, error.message);
      throw error;
    }
  }

  // ==========================================
  // WEBHOOK HANDLING
  // ==========================================

  /**
   * Verarbeitet Salesforce Webhooks (Platform Events oder Outbound Messages)
   */
  async handleWebhook(eventType, payload, userId) {
    this.log('info', `Handling webhook: ${eventType}`);

    switch (eventType) {
      // Opportunity Events
      case 'Opportunity.Created':
      case 'opportunity_created':
        return await this.handleOpportunityCreated(payload, userId);

      case 'Opportunity.Updated':
      case 'opportunity_updated':
        return await this.handleOpportunityUpdated(payload, userId);

      case 'Opportunity.Closed':
      case 'opportunity_closed':
        return await this.handleOpportunityClosed(payload, userId);

      case 'Opportunity.Deleted':
      case 'opportunity_deleted':
        return await this.handleOpportunityDeleted(payload, userId);

      // Contract Events
      case 'Contract.Created':
      case 'contract_created':
        return await this.handleContractCreated(payload, userId);

      case 'Contract.Activated':
      case 'contract_activated':
        return await this.handleContractActivated(payload, userId);

      // Quote Events
      case 'Quote.Accepted':
      case 'quote_accepted':
        return await this.handleQuoteAccepted(payload, userId);

      default:
        this.log('warn', `Unknown event type: ${eventType}`);
        return { handled: false, reason: 'Unknown event type' };
    }
  }

  /**
   * Handle: Neue Opportunity erstellt
   */
  async handleOpportunityCreated(payload, userId) {
    const credentials = await this.getCredentials(userId);

    // Prüfe Filter (nur bestimmte Stages?)
    if (credentials.settings?.filters?.dealStages?.length > 0) {
      if (!credentials.settings.filters.dealStages.includes(payload.StageName)) {
        return { handled: false, reason: 'Stage not in filter' };
      }
    }

    // Mindest-Deal-Value?
    if (credentials.settings?.filters?.minDealValue) {
      if ((payload.Amount || 0) < credentials.settings.filters.minDealValue) {
        return { handled: false, reason: 'Below minimum deal value' };
      }
    }

    // Sync Opportunity als Contract
    const result = await this.syncExternalToContract(payload.Id, userId);

    return {
      handled: true,
      action: 'contract_created',
      contractId: result.contractId
    };
  }

  /**
   * Handle: Opportunity aktualisiert
   */
  async handleOpportunityUpdated(payload, userId) {
    const opportunityId = payload.Id;

    // Finde zugehörigen Contract
    const contract = await this.findContractByExternalId(opportunityId, userId);

    if (!contract) {
      // Neue Opportunity - erstelle Contract
      return await this.handleOpportunityCreated(payload, userId);
    }

    // Update Contract
    const contractData = this.mapExternalToContract(payload);

    await this.contractsCollection.updateOne(
      { _id: contract._id },
      {
        $set: {
          name: contractData.name,
          status: contractData.status,
          amount: contractData.amount,
          expiryDate: contractData.expiryDate,
          'dealInfo.dealStage': payload.StageName,
          'dealInfo.probability': payload.Probability,
          updatedAt: new Date()
        }
      }
    );

    await this.updateSyncStatus(contract._id.toString(), 'synced', 'inbound');

    return {
      handled: true,
      action: 'contract_updated',
      contractId: contract._id.toString()
    };
  }

  /**
   * Handle: Opportunity geschlossen
   */
  async handleOpportunityClosed(payload, userId) {
    const opportunityId = payload.Id;
    const contract = await this.findContractByExternalId(opportunityId, userId);

    if (!contract) {
      return { handled: false, reason: 'Contract not found' };
    }

    const newStatus = payload.IsWon ? 'Aktiv' : 'Abgelaufen';

    await this.contractsCollection.updateOne(
      { _id: contract._id },
      {
        $set: {
          status: newStatus,
          'dealInfo.dealStage': payload.StageName,
          'dealInfo.actualCloseDate': new Date(),
          updatedAt: new Date()
        }
      }
    );

    return {
      handled: true,
      action: payload.IsWon ? 'opportunity_won' : 'opportunity_lost',
      contractId: contract._id.toString()
    };
  }

  /**
   * Handle: Opportunity gelöscht
   */
  async handleOpportunityDeleted(payload, userId) {
    const opportunityId = payload.Id;
    const contract = await this.findContractByExternalId(opportunityId, userId);

    if (!contract) {
      return { handled: false, reason: 'Contract not found' };
    }

    // Optional: Contract auch löschen oder nur markieren
    const credentials = await this.getCredentials(userId);
    const shouldDelete = credentials.settings?.triggers?.onDelete === 'delete';

    if (shouldDelete) {
      await this.contractsCollection.deleteOne({ _id: contract._id });
      return { handled: true, action: 'contract_deleted', contractId: contract._id.toString() };
    } else {
      // Nur External ID entfernen
      await this.contractsCollection.updateOne(
        { _id: contract._id },
        {
          $unset: { 'externalIds.salesforce': '' },
          $set: {
            'integrationSync.salesforce.status': 'disconnected',
            updatedAt: new Date()
          }
        }
      );
      return { handled: true, action: 'contract_disconnected', contractId: contract._id.toString() };
    }
  }

  /**
   * Handle: Quote akzeptiert -> Vertrag generieren
   */
  async handleQuoteAccepted(payload, userId) {
    const opportunityId = payload.OpportunityId;

    // Finde oder erstelle Contract
    let contract = await this.findContractByExternalId(opportunityId, userId);

    if (!contract) {
      const result = await this.syncExternalToContract(opportunityId, userId);
      contract = await this.contractsCollection.findOne({
        _id: new ObjectId(result.contractId)
      });
    }

    // Quote-Daten hinzufügen
    await this.contractsCollection.updateOne(
      { _id: contract._id },
      {
        $set: {
          'quoteData.quoteNumber': payload.QuoteNumber,
          'quoteData.status': 'accepted',
          'quoteData.totalValue': payload.TotalPrice,
          'quoteData.acceptedAt': new Date(),
          'externalIds.salesforce.quoteId': payload.Id,
          updatedAt: new Date()
        }
      }
    );

    return {
      handled: true,
      action: 'quote_accepted',
      contractId: contract._id.toString(),
      quoteId: payload.Id
    };
  }

  /**
   * Handle: Salesforce Contract erstellt
   */
  async handleContractCreated(payload, userId) {
    // Salesforce Contract != Contract AI Contract
    // Dies ist für Salesforce-native Verträge
    const contractData = {
      name: payload.Name || payload.ContractNumber,
      status: payload.Status === 'Activated' ? 'Aktiv' : 'Entwurf',
      expiryDate: payload.EndDate,
      externalIds: {
        salesforce: {
          contractId: payload.Id,
          accountId: payload.AccountId,
          recordType: 'Contract'
        }
      },
      source: {
        type: 'salesforce',
        externalSystem: 'salesforce',
        importedAt: new Date(),
        originalPayload: payload
      },
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.contractsCollection.insertOne(contractData);

    return {
      handled: true,
      action: 'contract_imported',
      contractId: result.insertedId.toString()
    };
  }

  /**
   * Handle: Salesforce Contract aktiviert
   */
  async handleContractActivated(payload, userId) {
    const sfContractId = payload.Id;

    // Finde Contract über Salesforce Contract ID
    const contract = await this.contractsCollection.findOne({
      userId: new ObjectId(userId),
      'externalIds.salesforce.contractId': sfContractId
    });

    if (!contract) {
      return await this.handleContractCreated(payload, userId);
    }

    await this.contractsCollection.updateOne(
      { _id: contract._id },
      {
        $set: {
          status: 'Aktiv',
          expiryDate: payload.EndDate,
          updatedAt: new Date()
        }
      }
    );

    return {
      handled: true,
      action: 'contract_activated',
      contractId: contract._id.toString()
    };
  }

  // ==========================================
  // SALESFORCE-SPEZIFISCHE METHODEN
  // ==========================================

  /**
   * Holt alle Opportunities eines Accounts
   */
  async getOpportunitiesByAccount(accountId, userId) {
    const credentials = await this.ensureValidCredentials(userId);

    const query = `SELECT Id, Name, StageName, Amount, CloseDate, Probability
                   FROM Opportunity
                   WHERE AccountId = '${accountId}'
                   ORDER BY CloseDate DESC`;

    const result = await this.apiCallWithRetry(
      'GET',
      `/query?q=${encodeURIComponent(query)}`,
      null,
      credentials
    );

    return result.records;
  }

  /**
   * Sucht Accounts
   */
  async searchAccounts(searchTerm, userId) {
    const credentials = await this.ensureValidCredentials(userId);

    const query = `SELECT Id, Name, Industry, Website
                   FROM Account
                   WHERE Name LIKE '%${searchTerm}%'
                   LIMIT 20`;

    const result = await this.apiCallWithRetry(
      'GET',
      `/query?q=${encodeURIComponent(query)}`,
      null,
      credentials
    );

    return result.records;
  }

  /**
   * Testet die Verbindung
   */
  async testConnection(userId) {
    try {
      const credentials = await this.ensureValidCredentials(userId);

      // Einfache Query um Verbindung zu testen
      const result = await this.apiCallWithRetry(
        'GET',
        '/limits',
        null,
        credentials
      );

      return {
        success: true,
        message: 'Connection successful',
        limits: {
          dailyApiRequests: result.DailyApiRequests,
          dailyBulkApiRequests: result.DailyBulkApiRequests
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Singleton Export
let instance = null;
module.exports = {
  getInstance: async () => {
    if (!instance) {
      instance = new SalesforceService();
      await instance.initialize();
    }
    return instance;
  },
  SalesforceService
};
