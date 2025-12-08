// 📁 backend/services/integrations/index.js
// Zentrale Export-Datei für alle Integration Services

const BaseIntegrationService = require('./BaseIntegrationService');
const { SalesforceService, getInstance: getSalesforceInstance } = require('./SalesforceService');
const { HubSpotService, getInstance: getHubSpotInstance } = require('./HubSpotService');
const { SAPService, getInstance: getSAPInstance } = require('./SAPService');

/**
 * Factory-Funktion zum Abrufen des richtigen Service
 * @param {string} integrationType - Typ der Integration
 * @returns {Promise<BaseIntegrationService>} - Initialisierter Service
 */
async function getIntegrationService(integrationType) {
  switch (integrationType) {
    case 'salesforce':
      return await getSalesforceInstance();

    case 'hubspot':
      return await getHubSpotInstance();

    case 'sap':
    case 'sap_business_one':
      return await getSAPInstance('sap_business_one');

    case 'sap_s4hana':
      return await getSAPInstance('sap_s4hana');

    default:
      throw new Error(`Unknown integration type: ${integrationType}`);
  }
}

/**
 * Prüft welche Integrationen konfiguriert sind
 */
function getConfiguredIntegrations() {
  const configured = [];

  // Salesforce
  if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET) {
    configured.push({
      type: 'salesforce',
      name: 'Salesforce',
      authMethod: 'oauth2'
    });
  }

  // HubSpot
  if (process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET) {
    configured.push({
      type: 'hubspot',
      name: 'HubSpot',
      authMethod: 'oauth2'
    });
  }

  // SAP (benötigt keine Client Credentials, nur URL)
  configured.push({
    type: 'sap_business_one',
    name: 'SAP Business One',
    authMethod: 'session'
  });

  configured.push({
    type: 'sap_s4hana',
    name: 'SAP S/4HANA',
    authMethod: 'oauth2'
  });

  return configured;
}

/**
 * Integration Typen und deren Eigenschaften
 */
const INTEGRATION_TYPES = {
  // CRM Systems
  salesforce: {
    name: 'Salesforce',
    category: 'CRM',
    authMethods: ['oauth2'],
    objects: ['Opportunity', 'Account', 'Contact', 'Contract', 'Quote'],
    webhookSupport: true,
    bidirectionalSync: true
  },
  hubspot: {
    name: 'HubSpot',
    category: 'CRM',
    authMethods: ['oauth2'],
    objects: ['Deal', 'Company', 'Contact'],
    webhookSupport: true,
    bidirectionalSync: true
  },
  pipedrive: {
    name: 'Pipedrive',
    category: 'CRM',
    authMethods: ['oauth2', 'api_key'],
    objects: ['Deal', 'Organization', 'Person'],
    webhookSupport: true,
    bidirectionalSync: true,
    comingSoon: true
  },
  zoho: {
    name: 'Zoho CRM',
    category: 'CRM',
    authMethods: ['oauth2'],
    objects: ['Deal', 'Account', 'Contact'],
    webhookSupport: true,
    bidirectionalSync: true,
    comingSoon: true
  },

  // ERP Systems
  sap_business_one: {
    name: 'SAP Business One',
    category: 'ERP',
    authMethods: ['session', 'basic'],
    objects: ['SalesOrder', 'BusinessPartner', 'Invoice', 'Item'],
    webhookSupport: false, // Nutzt Alerts oder Integration Suite
    bidirectionalSync: true
  },
  sap_s4hana: {
    name: 'SAP S/4HANA',
    category: 'ERP',
    authMethods: ['oauth2', 'basic'],
    objects: ['SalesOrder', 'BusinessPartner', 'Contract'],
    webhookSupport: true, // Via Event Mesh
    bidirectionalSync: true
  },
  netsuite: {
    name: 'NetSuite',
    category: 'ERP',
    authMethods: ['oauth2', 'token'],
    objects: ['SalesOrder', 'Customer', 'Invoice'],
    webhookSupport: false,
    bidirectionalSync: true,
    comingSoon: true
  },
  odoo: {
    name: 'Odoo',
    category: 'ERP',
    authMethods: ['api_key', 'basic'],
    objects: ['SaleOrder', 'Partner', 'Invoice'],
    webhookSupport: false,
    bidirectionalSync: true,
    comingSoon: true
  },

  // CPQ Systems
  salesforce_cpq: {
    name: 'Salesforce CPQ',
    category: 'CPQ',
    authMethods: ['oauth2'],
    objects: ['Quote', 'QuoteLine', 'Product'],
    webhookSupport: true,
    bidirectionalSync: true,
    requiresIntegration: 'salesforce'
  },
  conga_cpq: {
    name: 'Conga CPQ',
    category: 'CPQ',
    authMethods: ['oauth2'],
    objects: ['Quote', 'Configuration'],
    webhookSupport: true,
    bidirectionalSync: true,
    comingSoon: true
  },
  pandadoc: {
    name: 'PandaDoc',
    category: 'CPQ',
    authMethods: ['oauth2', 'api_key'],
    objects: ['Document', 'Template'],
    webhookSupport: true,
    bidirectionalSync: false,
    comingSoon: true
  }
};

/**
 * Standard Field Mappings für häufige Felder
 */
const DEFAULT_FIELD_MAPPINGS = {
  salesforce: {
    contractToExternal: {
      name: 'Name',
      amount: 'Amount',
      status: 'StageName',
      expiryDate: 'CloseDate'
    },
    externalToContract: {
      Name: 'name',
      Amount: 'amount',
      StageName: 'status',
      CloseDate: 'expiryDate'
    }
  },
  hubspot: {
    contractToExternal: {
      name: 'dealname',
      amount: 'amount',
      status: 'dealstage',
      expiryDate: 'closedate'
    },
    externalToContract: {
      dealname: 'name',
      amount: 'amount',
      dealstage: 'status',
      closedate: 'expiryDate'
    }
  },
  sap: {
    contractToExternal: {
      name: 'Comments',
      amount: 'DocTotal',
      expiryDate: 'DocDueDate'
    },
    externalToContract: {
      DocNum: 'contractNumber',
      DocTotal: 'amount',
      DocDueDate: 'expiryDate'
    }
  }
};

module.exports = {
  // Services
  BaseIntegrationService,
  SalesforceService,
  HubSpotService,
  SAPService,

  // Factory
  getIntegrationService,
  getConfiguredIntegrations,

  // Constants
  INTEGRATION_TYPES,
  DEFAULT_FIELD_MAPPINGS,

  // Instance Getters
  getSalesforceInstance,
  getHubSpotInstance,
  getSAPInstance
};
