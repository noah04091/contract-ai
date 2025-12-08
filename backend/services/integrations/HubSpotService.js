// 📁 backend/services/integrations/HubSpotService.js
// Vollständige HubSpot CRM Integration
// Unterstützt: Deals, Companies, Contacts, Quotes

const BaseIntegrationService = require('./BaseIntegrationService');
const { ObjectId } = require('mongodb');

class HubSpotService extends BaseIntegrationService {
  constructor() {
    super('hubspot');
    this.apiBaseUrl = 'https://api.hubapi.com';
  }

  // ==========================================
  // OAUTH FLOW
  // ==========================================

  /**
   * Generiert die OAuth Authorization URL
   */
  getAuthorizationUrl(userId, redirectUri) {
    const clientId = process.env.HUBSPOT_CLIENT_ID;

    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now()
    })).toString('base64');

    // HubSpot OAuth Scopes
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.objects.quotes.read'
    ].join('%20');

    return `https://app.hubspot.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scopes}&` +
      `state=${state}`;
  }

  /**
   * Tauscht Auth Code gegen Access Token
   */
  async exchangeCodeForToken(code, redirectUri) {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HubSpot OAuth error: ${error.message || JSON.stringify(error)}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope
    };
  }

  /**
   * Refresh Token
   */
  async refreshToken(credentials) {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    const IntegrationCredential = require('../../models/IntegrationCredential');
    const refreshToken = IntegrationCredential.decrypt(credentials.oauth.refreshToken);

    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.status === 'BAD_REFRESH_TOKEN') {
        await this.credentialsCollection.updateOne(
          { _id: credentials._id },
          { $set: { status: 'expired' } }
        );
        throw new Error('HubSpot token expired - re-authentication required');
      }
      throw new Error(`HubSpot token refresh error: ${error.message || JSON.stringify(error)}`);
    }

    const data = await response.json();

    // Update credentials in DB
    await this.credentialsCollection.updateOne(
      { _id: credentials._id },
      {
        $set: {
          'oauth.accessToken': data.access_token,
          'oauth.refreshToken': data.refresh_token,
          'oauth.expiresAt': new Date(Date.now() + data.expires_in * 1000),
          updatedAt: new Date()
        }
      }
    );

    return await this.credentialsCollection.findOne({ _id: credentials._id });
  }

  // ==========================================
  // API CALLS
  // ==========================================

  /**
   * HubSpot API Call
   */
  async apiCall(method, endpoint, data = null, credentials = null) {
    if (!credentials) {
      throw new Error('Credentials required for HubSpot API call');
    }

    const IntegrationCredential = require('../../models/IntegrationCredential');
    const accessToken = IntegrationCredential.decrypt(credentials.oauth.accessToken);

    const url = `${this.apiBaseUrl}${endpoint}`;

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

    if (response.status === 204) {
      return { success: true };
    }

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        responseData?.message ||
        `HubSpot API error: ${response.status}`
      );
      error.statusCode = response.status;
      error.hubspotError = responseData;

      // Rate Limit Info
      if (response.status === 429) {
        error.retryAfter = parseInt(response.headers.get('Retry-After') || '10') * 1000;
      }

      throw error;
    }

    return responseData;
  }

  // ==========================================
  // DATA MAPPING
  // ==========================================

  /**
   * Contract AI -> HubSpot Deal
   */
  mapContractToExternal(contract) {
    const mapping = {
      properties: {
        dealname: contract.name || contract.title || 'Contract from Contract AI',
        description: contract.analysis?.summary || '',
        amount: String(contract.amount || contract.dealInfo?.dealValue || 0),
        closedate: contract.expiryDate
          ? new Date(contract.expiryDate).getTime()
          : Date.now() + 30 * 24 * 60 * 60 * 1000,
        dealstage: this.mapContractStatusToStage(contract.status),
        pipeline: 'default', // Standard Pipeline
        // Custom Properties (müssen in HubSpot existieren)
        contract_ai_id: contract._id?.toString(),
        contract_type: contract.contractType,
        risk_score: String(contract.legalPulse?.riskScore || 0)
      }
    };

    // Deal Owner
    if (contract.dealInfo?.dealOwner?.externalId) {
      mapping.properties.hubspot_owner_id = contract.dealInfo.dealOwner.externalId;
    }

    return mapping;
  }

  /**
   * HubSpot Deal -> Contract AI
   */
  mapExternalToContract(deal) {
    const properties = deal.properties || deal;

    return {
      name: properties.dealname,
      title: properties.dealname,
      status: this.mapStageToContractStatus(properties.dealstage),
      amount: parseFloat(properties.amount) || 0,
      expiryDate: properties.closedate
        ? new Date(parseInt(properties.closedate)).toISOString().split('T')[0]
        : null,

      externalIds: {
        hubspot: {
          dealId: deal.id || properties.hs_object_id,
          companyId: properties.associations?.companies?.[0]?.id,
          contactId: properties.associations?.contacts?.[0]?.id
        }
      },

      dealInfo: {
        dealName: properties.dealname,
        dealStage: properties.dealstage,
        dealValue: parseFloat(properties.amount) || 0,
        currency: 'EUR',
        probability: parseFloat(properties.hs_deal_stage_probability) || 0,
        expectedCloseDate: properties.closedate
          ? new Date(parseInt(properties.closedate))
          : null,
        dealOwner: {
          externalId: properties.hubspot_owner_id
        }
      },

      source: {
        type: 'hubspot',
        externalSystem: 'hubspot',
        importedAt: new Date(),
        originalPayload: deal
      }
    };
  }

  /**
   * Mappt Contract Status zu HubSpot Deal Stage
   */
  mapContractStatusToStage(status) {
    // HubSpot Standard Deal Stages (pipeline-abhängig)
    const mapping = {
      'Aktiv': 'closedwon',
      'Active': 'closedwon',
      'Abgelaufen': 'closedlost',
      'Expired': 'closedlost',
      'Bald ablaufend': 'contractsent',
      'Expiring Soon': 'contractsent',
      'Entwurf': 'appointmentscheduled',
      'Draft': 'appointmentscheduled',
      'Unbekannt': 'qualifiedtobuy'
    };
    return mapping[status] || 'qualifiedtobuy';
  }

  /**
   * Mappt HubSpot Deal Stage zu Contract Status
   */
  mapStageToContractStatus(stage) {
    const mapping = {
      'closedwon': 'Aktiv',
      'closedlost': 'Abgelaufen',
      'contractsent': 'Bald ablaufend',
      'appointmentscheduled': 'Entwurf',
      'qualifiedtobuy': 'Unbekannt',
      'presentationscheduled': 'Entwurf',
      'decisionmakerboughtin': 'Bald ablaufend'
    };
    return mapping[stage] || 'Unbekannt';
  }

  // ==========================================
  // SYNC OPERATIONS
  // ==========================================

  /**
   * Sync Contract zu HubSpot
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

      let mappedData = this.mapContractToExternal(contract);

      // Custom Field Mappings anwenden
      if (credentials.settings?.fieldMappings) {
        mappedData.properties = this.applyFieldMappings(
          mappedData.properties,
          credentials.settings.fieldMappings
        );
      }

      let result;
      const existingDealId = contract.externalIds?.hubspot?.dealId;

      if (existingDealId) {
        // UPDATE existierendes Deal
        this.log('info', `Updating Deal ${existingDealId}`);
        await this.apiCallWithRetry(
          'PATCH',
          `/crm/v3/objects/deals/${existingDealId}`,
          mappedData,
          credentials
        );
        result = { id: existingDealId, created: false };
      } else {
        // CREATE neues Deal
        this.log('info', `Creating new Deal for contract ${contractId}`);
        const createResult = await this.apiCallWithRetry(
          'POST',
          '/crm/v3/objects/deals',
          mappedData,
          credentials
        );
        result = { id: createResult.id, created: true };

        // Speichere External ID
        await this.contractsCollection.updateOne(
          { _id: new ObjectId(contractId) },
          {
            $set: {
              'externalIds.hubspot.dealId': createResult.id
            }
          }
        );
      }

      // Company/Contact Assoziationen
      if (contract.dealInfo?.company?.externalId && result.id) {
        try {
          await this.apiCallWithRetry(
            'PUT',
            `/crm/v3/objects/deals/${result.id}/associations/companies/${contract.dealInfo.company.externalId}/deal_to_company`,
            null,
            credentials
          );
        } catch (e) {
          this.log('warn', 'Could not associate company', e.message);
        }
      }

      await this.updateSyncStatus(contractId, 'synced', 'outbound');
      await this.logAuditEvent(userId, 'sync_to_hubspot', {
        contractId,
        dealId: result.id,
        created: result.created
      });

      this.emit('sync:complete', { contractId, externalId: result.id, direction: 'outbound' });

      return { success: true, externalId: result.id, created: result.created };

    } catch (error) {
      await this.updateSyncStatus(contractId, 'error', 'outbound', error.message);
      await this.logAuditEvent(userId, 'sync_to_hubspot', { contractId, error: error.message }, false);
      this.log('error', `Sync failed for contract ${contractId}`, error.message);
      throw error;
    }
  }

  /**
   * Sync HubSpot Deal zu Contract AI
   */
  async syncExternalToContract(dealId, userId) {
    try {
      const credentials = await this.ensureValidCredentials(userId);

      // Hole Deal Details mit Assoziationen
      const deal = await this.apiCallWithRetry(
        'GET',
        `/crm/v3/objects/deals/${dealId}?associations=companies,contacts`,
        null,
        credentials
      );

      // Mappe zu Contract Format
      const contractData = this.mapExternalToContract(deal);

      // Company Details holen (wenn assoziiert)
      if (deal.associations?.companies?.results?.[0]) {
        const companyId = deal.associations.companies.results[0].id;
        try {
          const company = await this.apiCallWithRetry(
            'GET',
            `/crm/v3/objects/companies/${companyId}`,
            null,
            credentials
          );
          contractData.dealInfo.company = {
            name: company.properties.name,
            industry: company.properties.industry,
            website: company.properties.website,
            externalId: company.id
          };
          contractData.externalIds.hubspot.companyId = company.id;
        } catch (e) {
          this.log('warn', `Could not fetch Company ${companyId}`, e.message);
        }
      }

      // Contact Details holen
      if (deal.associations?.contacts?.results?.[0]) {
        const contactId = deal.associations.contacts.results[0].id;
        try {
          const contact = await this.apiCallWithRetry(
            'GET',
            `/crm/v3/objects/contacts/${contactId}`,
            null,
            credentials
          );
          contractData.dealInfo.contacts = [{
            name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
            email: contact.properties.email,
            phone: contact.properties.phone,
            externalId: contact.id
          }];
          contractData.externalIds.hubspot.contactId = contact.id;
        } catch (e) {
          this.log('warn', `Could not fetch Contact ${contactId}`, e.message);
        }
      }

      // Prüfe ob Contract bereits existiert
      const existingContract = await this.findContractByExternalId(dealId, userId);

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

      await this.logAuditEvent(userId, 'sync_from_hubspot', {
        dealId,
        contractId: result.contractId,
        created: result.created
      });

      this.emit('sync:complete', {
        contractId: result.contractId,
        externalId: dealId,
        direction: 'inbound'
      });

      return { success: true, ...result };

    } catch (error) {
      await this.logAuditEvent(userId, 'sync_from_hubspot', {
        dealId,
        error: error.message
      }, false);
      this.log('error', `Sync from HubSpot failed for ${dealId}`, error.message);
      throw error;
    }
  }

  // ==========================================
  // WEBHOOK HANDLING
  // ==========================================

  /**
   * Verarbeitet HubSpot Webhooks
   */
  async handleWebhook(eventType, payload, userId) {
    this.log('info', `Handling webhook: ${eventType}`);

    // HubSpot sendet Events in einem Array
    const events = Array.isArray(payload) ? payload : [payload];

    const results = [];

    for (const event of events) {
      const subscriptionType = event.subscriptionType || eventType;
      const objectId = event.objectId;

      switch (subscriptionType) {
        case 'deal.creation':
          results.push(await this.handleDealCreated(event, userId));
          break;

        case 'deal.propertyChange':
          results.push(await this.handleDealUpdated(event, userId));
          break;

        case 'deal.deletion':
          results.push(await this.handleDealDeleted(event, userId));
          break;

        case 'contact.creation':
        case 'contact.propertyChange':
          results.push(await this.handleContactChange(event, userId));
          break;

        case 'company.creation':
        case 'company.propertyChange':
          results.push(await this.handleCompanyChange(event, userId));
          break;

        default:
          results.push({ handled: false, reason: `Unknown event: ${subscriptionType}` });
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  /**
   * Handle: Neues Deal erstellt
   */
  async handleDealCreated(event, userId) {
    const dealId = event.objectId;
    const credentials = await this.getCredentials(userId);

    // Filter prüfen
    if (credentials.settings?.filters?.minDealValue) {
      // Hole Deal für Amount Check
      const deal = await this.apiCallWithRetry(
        'GET',
        `/crm/v3/objects/deals/${dealId}`,
        null,
        credentials
      );
      if (parseFloat(deal.properties.amount || 0) < credentials.settings.filters.minDealValue) {
        return { handled: false, reason: 'Below minimum deal value' };
      }
    }

    const result = await this.syncExternalToContract(dealId, userId);

    return {
      handled: true,
      action: 'contract_created',
      contractId: result.contractId
    };
  }

  /**
   * Handle: Deal aktualisiert
   */
  async handleDealUpdated(event, userId) {
    const dealId = event.objectId;
    const propertyName = event.propertyName;
    const propertyValue = event.propertyValue;

    // Finde zugehörigen Contract
    const contract = await this.findContractByExternalId(dealId, userId);

    if (!contract) {
      // Neues Deal
      return await this.handleDealCreated(event, userId);
    }

    // Property-spezifisches Update
    const updateData = {
      updatedAt: new Date()
    };

    switch (propertyName) {
      case 'dealstage':
        updateData.status = this.mapStageToContractStatus(propertyValue);
        updateData['dealInfo.dealStage'] = propertyValue;
        break;

      case 'amount':
        updateData.amount = parseFloat(propertyValue) || 0;
        updateData['dealInfo.dealValue'] = parseFloat(propertyValue) || 0;
        break;

      case 'dealname':
        updateData.name = propertyValue;
        updateData['dealInfo.dealName'] = propertyValue;
        break;

      case 'closedate':
        updateData.expiryDate = new Date(parseInt(propertyValue)).toISOString().split('T')[0];
        updateData['dealInfo.expectedCloseDate'] = new Date(parseInt(propertyValue));
        break;

      default:
        // Full sync für unbekannte Properties
        return await this.syncExternalToContract(dealId, userId);
    }

    await this.contractsCollection.updateOne(
      { _id: contract._id },
      { $set: updateData }
    );

    await this.updateSyncStatus(contract._id.toString(), 'synced', 'inbound');

    return {
      handled: true,
      action: 'contract_updated',
      contractId: contract._id.toString(),
      updatedProperty: propertyName
    };
  }

  /**
   * Handle: Deal gelöscht
   */
  async handleDealDeleted(event, userId) {
    const dealId = event.objectId;
    const contract = await this.findContractByExternalId(dealId, userId);

    if (!contract) {
      return { handled: false, reason: 'Contract not found' };
    }

    // External ID entfernen
    await this.contractsCollection.updateOne(
      { _id: contract._id },
      {
        $unset: { 'externalIds.hubspot': '' },
        $set: {
          'integrationSync.hubspot.status': 'disconnected',
          updatedAt: new Date()
        }
      }
    );

    return {
      handled: true,
      action: 'contract_disconnected',
      contractId: contract._id.toString()
    };
  }

  /**
   * Handle: Contact erstellt/aktualisiert
   */
  async handleContactChange(event, userId) {
    const contactId = event.objectId;

    // Finde Contracts mit diesem Contact
    const contracts = await this.contractsCollection.find({
      userId: new ObjectId(userId),
      'externalIds.hubspot.contactId': contactId
    }).toArray();

    if (contracts.length === 0) {
      return { handled: false, reason: 'No associated contracts' };
    }

    // Hole aktuelle Contact-Daten
    const credentials = await this.ensureValidCredentials(userId);
    const contact = await this.apiCallWithRetry(
      'GET',
      `/crm/v3/objects/contacts/${contactId}`,
      null,
      credentials
    );

    // Update alle zugehörigen Contracts
    const contactData = {
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      email: contact.properties.email,
      phone: contact.properties.phone,
      externalId: contact.id
    };

    for (const contract of contracts) {
      await this.contractsCollection.updateOne(
        { _id: contract._id },
        {
          $set: {
            'dealInfo.contacts.0': contactData,
            updatedAt: new Date()
          }
        }
      );
    }

    return {
      handled: true,
      action: 'contacts_updated',
      affectedContracts: contracts.length
    };
  }

  /**
   * Handle: Company erstellt/aktualisiert
   */
  async handleCompanyChange(event, userId) {
    const companyId = event.objectId;

    // Finde Contracts mit dieser Company
    const contracts = await this.contractsCollection.find({
      userId: new ObjectId(userId),
      'externalIds.hubspot.companyId': companyId
    }).toArray();

    if (contracts.length === 0) {
      return { handled: false, reason: 'No associated contracts' };
    }

    // Hole aktuelle Company-Daten
    const credentials = await this.ensureValidCredentials(userId);
    const company = await this.apiCallWithRetry(
      'GET',
      `/crm/v3/objects/companies/${companyId}`,
      null,
      credentials
    );

    const companyData = {
      name: company.properties.name,
      industry: company.properties.industry,
      website: company.properties.website,
      externalId: company.id
    };

    for (const contract of contracts) {
      await this.contractsCollection.updateOne(
        { _id: contract._id },
        {
          $set: {
            'dealInfo.company': companyData,
            updatedAt: new Date()
          }
        }
      );
    }

    return {
      handled: true,
      action: 'companies_updated',
      affectedContracts: contracts.length
    };
  }

  // ==========================================
  // HUBSPOT-SPEZIFISCHE METHODEN
  // ==========================================

  /**
   * Holt alle Deals einer Company
   */
  async getDealsByCompany(companyId, userId) {
    const credentials = await this.ensureValidCredentials(userId);

    const response = await this.apiCallWithRetry(
      'GET',
      `/crm/v3/objects/companies/${companyId}/associations/deals`,
      null,
      credentials
    );

    if (!response.results?.length) return [];

    // Hole Deal Details
    const dealIds = response.results.map(r => r.id);
    const deals = await this.apiCallWithRetry(
      'POST',
      '/crm/v3/objects/deals/batch/read',
      {
        inputs: dealIds.map(id => ({ id })),
        properties: ['dealname', 'amount', 'closedate', 'dealstage', 'pipeline']
      },
      credentials
    );

    return deals.results;
  }

  /**
   * Sucht Companies
   */
  async searchCompanies(searchTerm, userId) {
    const credentials = await this.ensureValidCredentials(userId);

    const response = await this.apiCallWithRetry(
      'POST',
      '/crm/v3/objects/companies/search',
      {
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: searchTerm
          }]
        }],
        properties: ['name', 'industry', 'website', 'numberofemployees'],
        limit: 20
      },
      credentials
    );

    return response.results;
  }

  /**
   * Holt Deal Pipelines
   */
  async getPipelines(userId) {
    const credentials = await this.ensureValidCredentials(userId);

    const response = await this.apiCallWithRetry(
      'GET',
      '/crm/v3/pipelines/deals',
      null,
      credentials
    );

    return response.results;
  }

  /**
   * Testet die Verbindung
   */
  async testConnection(userId) {
    try {
      const credentials = await this.ensureValidCredentials(userId);

      // Einfacher API Call um Verbindung zu testen
      const result = await this.apiCallWithRetry(
        'GET',
        '/crm/v3/objects/deals?limit=1',
        null,
        credentials
      );

      return {
        success: true,
        message: 'Connection successful',
        portalId: credentials.oauth?.portalId
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Registriert Webhook Subscriptions bei HubSpot
   */
  async registerWebhooks(userId, callbackUrl) {
    const credentials = await this.ensureValidCredentials(userId);
    const appId = process.env.HUBSPOT_APP_ID;

    if (!appId) {
      throw new Error('HUBSPOT_APP_ID not configured');
    }

    const subscriptions = [
      { eventType: 'deal.creation' },
      { eventType: 'deal.propertyChange', propertyName: 'dealstage' },
      { eventType: 'deal.propertyChange', propertyName: 'amount' },
      { eventType: 'deal.propertyChange', propertyName: 'closedate' },
      { eventType: 'deal.deletion' }
    ];

    const results = [];

    for (const sub of subscriptions) {
      try {
        const result = await this.apiCallWithRetry(
          'POST',
          `/webhooks/v3/${appId}/subscriptions`,
          {
            eventType: sub.eventType,
            propertyName: sub.propertyName,
            active: true
          },
          credentials
        );
        results.push({ ...sub, success: true, id: result.id });
      } catch (error) {
        results.push({ ...sub, success: false, error: error.message });
      }
    }

    return results;
  }
}

// Singleton Export
let instance = null;
module.exports = {
  getInstance: async () => {
    if (!instance) {
      instance = new HubSpotService();
      await instance.initialize();
    }
    return instance;
  },
  HubSpotService
};
