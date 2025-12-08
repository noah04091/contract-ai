// 📁 backend/services/integrations/SAPService.js
// SAP ERP Integration (Business One & S/4HANA)
// Unterstützt: Sales Orders, Business Partners, Contracts

const BaseIntegrationService = require('./BaseIntegrationService');
const { ObjectId } = require('mongodb');

class SAPService extends BaseIntegrationService {
  constructor(sapType = 'sap') {
    super(sapType);
    this.sapType = sapType; // 'sap_business_one' oder 'sap_s4hana'
  }

  // ==========================================
  // CONNECTION & AUTHENTICATION
  // ==========================================

  /**
   * Login zu SAP (Session-Based Authentication)
   * SAP Business One Service Layer verwendet Session Authentication
   */
  async login(credentials) {
    const baseUrl = credentials.settings?.baseUrl;

    if (!baseUrl) {
      throw new Error('SAP Base URL not configured');
    }

    const IntegrationCredential = require('../../models/IntegrationCredential');
    const username = IntegrationCredential.decrypt(credentials.basicAuth.username);
    const password = IntegrationCredential.decrypt(credentials.basicAuth.password);
    const companyDB = credentials.settings?.companyDB || 'SBODemoDE';

    const response = await fetch(`${baseUrl}/b1s/v1/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        CompanyDB: companyDB,
        UserName: username,
        Password: password
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(`SAP Login error: ${error.error?.message?.value || error.message}`);
    }

    const data = await response.json();

    // Session ID aus Cookies extrahieren
    const cookies = response.headers.get('set-cookie');
    const sessionId = cookies?.match(/B1SESSION=([^;]+)/)?.[1];
    const routeId = cookies?.match(/ROUTEID=([^;]+)/)?.[1];

    return {
      sessionId,
      routeId,
      sessionTimeout: data.SessionTimeout,
      version: data.Version
    };
  }

  /**
   * OAuth Token für S/4HANA (OData)
   */
  async getS4HANAToken(credentials) {
    const IntegrationCredential = require('../../models/IntegrationCredential');
    const clientId = IntegrationCredential.decrypt(credentials.apiKey.key);
    const clientSecret = IntegrationCredential.decrypt(credentials.apiKey.secret);
    const tokenUrl = credentials.settings?.tokenUrl;

    if (!tokenUrl) {
      throw new Error('S/4HANA Token URL not configured');
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error_description: 'Token request failed' }));
      throw new Error(`S/4HANA OAuth error: ${error.error_description}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    };
  }

  /**
   * Refresh Token / Session
   */
  async refreshToken(credentials) {
    if (this.sapType === 'sap_s4hana') {
      const tokenData = await this.getS4HANAToken(credentials);

      await this.credentialsCollection.updateOne(
        { _id: credentials._id },
        {
          $set: {
            'oauth.accessToken': tokenData.accessToken,
            'oauth.expiresAt': tokenData.expiresAt,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Business One: Neuer Login
      const sessionData = await this.login(credentials);

      await this.credentialsCollection.updateOne(
        { _id: credentials._id },
        {
          $set: {
            'oauth.accessToken': sessionData.sessionId,
            'oauth.refreshToken': sessionData.routeId,
            'oauth.expiresAt': new Date(Date.now() + (sessionData.sessionTimeout || 30) * 60 * 1000),
            updatedAt: new Date()
          }
        }
      );
    }

    return await this.credentialsCollection.findOne({ _id: credentials._id });
  }

  // ==========================================
  // API CALLS
  // ==========================================

  /**
   * SAP API Call
   */
  async apiCall(method, endpoint, data = null, credentials = null) {
    if (!credentials) {
      throw new Error('Credentials required for SAP API call');
    }

    const baseUrl = credentials.settings?.baseUrl;
    const IntegrationCredential = require('../../models/IntegrationCredential');

    let url;
    let headers = {
      'Content-Type': 'application/json'
    };

    if (this.sapType === 'sap_s4hana') {
      // S/4HANA OData API
      const accessToken = IntegrationCredential.decrypt(credentials.oauth.accessToken);
      url = `${baseUrl}${endpoint}`;
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // Business One Service Layer
      const sessionId = IntegrationCredential.decrypt(credentials.oauth.accessToken);
      const routeId = IntegrationCredential.decrypt(credentials.oauth.refreshToken);
      url = `${baseUrl}/b1s/v1${endpoint}`;
      headers['Cookie'] = `B1SESSION=${sessionId}; ROUTEID=${routeId}`;
    }

    const options = {
      method,
      headers
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
        responseData?.error?.message?.value ||
        responseData?.error?.message ||
        `SAP API error: ${response.status}`
      );
      error.statusCode = response.status;
      error.sapError = responseData?.error;
      throw error;
    }

    return responseData;
  }

  // ==========================================
  // DATA MAPPING
  // ==========================================

  /**
   * Contract AI -> SAP Sales Order (Business One)
   */
  mapContractToExternal(contract) {
    // SAP Business One Sales Order Format
    if (this.sapType === 'sap_business_one') {
      const mapping = {
        CardCode: contract.dealInfo?.company?.externalId || 'C00001', // Business Partner Code
        DocDate: new Date().toISOString().split('T')[0],
        DocDueDate: contract.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        Comments: `Contract AI: ${contract.name}\n${contract.analysis?.summary || ''}`,
        // User-Defined Fields (wenn konfiguriert)
        U_ContractAI_ID: contract._id?.toString(),
        U_ContractType: contract.contractType,
        U_RiskScore: contract.legalPulse?.riskScore,
        // Document Lines
        DocumentLines: this.mapLineItems(contract)
      };

      // Reference
      if (contract.contractNumber) {
        mapping.NumAtCard = contract.contractNumber;
      }

      return mapping;
    }

    // S/4HANA Sales Order (OData)
    return {
      SalesOrderType: 'OR', // Standard Order
      SalesOrganization: credentials?.settings?.salesOrg || '1000',
      DistributionChannel: credentials?.settings?.distChannel || '10',
      OrganizationDivision: credentials?.settings?.division || '00',
      SoldToParty: contract.dealInfo?.company?.externalId,
      RequestedDeliveryDate: contract.expiryDate,
      PurchaseOrderByCustomer: contract.contractNumber,
      // Custom Fields Extension
      YY1_ContractAI_ID_SDH: contract._id?.toString(),
      // Items
      to_Item: {
        results: this.mapLineItemsS4(contract)
      }
    };
  }

  /**
   * Map Line Items für Business One
   */
  mapLineItems(contract) {
    // Wenn Quote Data vorhanden
    if (contract.quoteData?.lineItems?.length > 0) {
      return contract.quoteData.lineItems.map(item => ({
        ItemCode: item.sku || item.productId,
        ItemDescription: item.productName,
        Quantity: item.quantity || 1,
        UnitPrice: item.unitPrice,
        DiscountPercent: item.discount || 0
      }));
    }

    // Fallback: Einfacher Service-Posten
    return [{
      ItemCode: 'SERVICE',
      ItemDescription: contract.name || 'Contract Service',
      Quantity: 1,
      UnitPrice: contract.amount || 0
    }];
  }

  /**
   * Map Line Items für S/4HANA
   */
  mapLineItemsS4(contract) {
    if (contract.quoteData?.lineItems?.length > 0) {
      return contract.quoteData.lineItems.map((item, index) => ({
        SalesOrderItem: String((index + 1) * 10).padStart(6, '0'),
        Material: item.sku || item.productId,
        SalesOrderItemText: item.productName,
        RequestedQuantity: String(item.quantity || 1),
        NetAmount: String(item.totalPrice || item.unitPrice)
      }));
    }

    return [{
      SalesOrderItem: '000010',
      Material: 'SERVICE',
      SalesOrderItemText: contract.name,
      RequestedQuantity: '1',
      NetAmount: String(contract.amount || 0)
    }];
  }

  /**
   * SAP Sales Order -> Contract AI
   */
  mapExternalToContract(salesOrder) {
    // Business One Format
    if (this.sapType === 'sap_business_one') {
      return {
        name: salesOrder.Comments?.split('\n')[0]?.replace('Contract AI: ', '') ||
          `SAP Order ${salesOrder.DocNum}`,
        status: this.mapSAPStatusToContract(salesOrder.DocumentStatus),
        amount: salesOrder.DocTotal,
        expiryDate: salesOrder.DocDueDate,
        contractNumber: salesOrder.NumAtCard || salesOrder.DocNum?.toString(),

        externalIds: {
          sap: {
            salesOrderId: salesOrder.DocEntry?.toString(),
            documentNumber: salesOrder.DocNum?.toString(),
            customerId: salesOrder.CardCode
          }
        },

        dealInfo: {
          dealName: `SAP Order ${salesOrder.DocNum}`,
          dealValue: salesOrder.DocTotal,
          currency: salesOrder.DocCurrency || 'EUR',
          company: {
            externalId: salesOrder.CardCode,
            name: salesOrder.CardName
          }
        },

        quoteData: {
          totalValue: salesOrder.DocTotal,
          netAmount: salesOrder.DocTotalSys,
          currency: salesOrder.DocCurrency || 'EUR',
          lineItems: (salesOrder.DocumentLines || []).map(line => ({
            productId: line.ItemCode,
            productName: line.ItemDescription,
            sku: line.ItemCode,
            quantity: line.Quantity,
            unitPrice: line.UnitPrice,
            discount: line.DiscountPercent,
            totalPrice: line.LineTotal
          }))
        },

        source: {
          type: 'sap',
          externalSystem: this.sapType,
          importedAt: new Date(),
          originalPayload: salesOrder
        }
      };
    }

    // S/4HANA Format
    return {
      name: `SAP Order ${salesOrder.SalesOrder}`,
      status: this.mapS4StatusToContract(salesOrder.OverallSDProcessStatus),
      amount: parseFloat(salesOrder.TotalNetAmount) || 0,
      expiryDate: salesOrder.RequestedDeliveryDate,

      externalIds: {
        sap: {
          salesOrderId: salesOrder.SalesOrder,
          customerId: salesOrder.SoldToParty
        }
      },

      dealInfo: {
        dealName: `SAP Order ${salesOrder.SalesOrder}`,
        dealValue: parseFloat(salesOrder.TotalNetAmount) || 0,
        currency: salesOrder.TransactionCurrency,
        company: {
          externalId: salesOrder.SoldToParty,
          name: salesOrder._SoldToParty?.CustomerName
        }
      },

      source: {
        type: 'sap',
        externalSystem: 'sap_s4hana',
        importedAt: new Date(),
        originalPayload: salesOrder
      }
    };
  }

  /**
   * SAP Business One Status Mapping
   */
  mapSAPStatusToContract(status) {
    const mapping = {
      'bost_Open': 'Aktiv',
      'bost_Close': 'Abgelaufen',
      'bost_Paid': 'Aktiv',
      'bost_Delivered': 'Aktiv'
    };
    return mapping[status] || 'Unbekannt';
  }

  /**
   * S/4HANA Status Mapping
   */
  mapS4StatusToContract(status) {
    const mapping = {
      'A': 'Aktiv',      // Open
      'B': 'Aktiv',      // In Process
      'C': 'Abgelaufen'  // Completed
    };
    return mapping[status] || 'Unbekannt';
  }

  /**
   * Contract Status -> SAP Status
   */
  mapContractStatusToSAP(status) {
    return status === 'Abgelaufen' || status === 'Expired' ? 'bost_Close' : 'bost_Open';
  }

  // ==========================================
  // SYNC OPERATIONS
  // ==========================================

  /**
   * Sync Contract zu SAP
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

      // Custom Field Mappings
      if (credentials.settings?.fieldMappings) {
        mappedData = this.applyFieldMappings(mappedData, credentials.settings.fieldMappings);
      }

      let result;
      const existingOrderId = contract.externalIds?.sap?.salesOrderId;

      if (existingOrderId) {
        // UPDATE existierende Order
        this.log('info', `Updating Sales Order ${existingOrderId}`);

        if (this.sapType === 'sap_business_one') {
          await this.apiCallWithRetry(
            'PATCH',
            `/Orders(${existingOrderId})`,
            mappedData,
            credentials
          );
        } else {
          await this.apiCallWithRetry(
            'PATCH',
            `/API_SALES_ORDER_SRV/A_SalesOrder('${existingOrderId}')`,
            mappedData,
            credentials
          );
        }
        result = { id: existingOrderId, created: false };
      } else {
        // CREATE neue Order
        this.log('info', `Creating new Sales Order for contract ${contractId}`);

        let createResult;
        if (this.sapType === 'sap_business_one') {
          createResult = await this.apiCallWithRetry(
            'POST',
            '/Orders',
            mappedData,
            credentials
          );
          result = { id: createResult.DocEntry?.toString(), docNum: createResult.DocNum, created: true };
        } else {
          createResult = await this.apiCallWithRetry(
            'POST',
            '/API_SALES_ORDER_SRV/A_SalesOrder',
            mappedData,
            credentials
          );
          result = { id: createResult.SalesOrder, created: true };
        }

        // Speichere External ID
        await this.contractsCollection.updateOne(
          { _id: new ObjectId(contractId) },
          {
            $set: {
              'externalIds.sap.salesOrderId': result.id,
              'externalIds.sap.documentNumber': result.docNum || result.id
            }
          }
        );
      }

      await this.updateSyncStatus(contractId, 'synced', 'outbound');
      await this.logAuditEvent(userId, 'sync_to_sap', {
        contractId,
        salesOrderId: result.id,
        created: result.created
      });

      this.emit('sync:complete', { contractId, externalId: result.id, direction: 'outbound' });

      return { success: true, externalId: result.id, created: result.created };

    } catch (error) {
      await this.updateSyncStatus(contractId, 'error', 'outbound', error.message);
      await this.logAuditEvent(userId, 'sync_to_sap', { contractId, error: error.message }, false);
      this.log('error', `Sync failed for contract ${contractId}`, error.message);
      throw error;
    }
  }

  /**
   * Sync SAP Sales Order zu Contract AI
   */
  async syncExternalToContract(salesOrderId, userId) {
    try {
      const credentials = await this.ensureValidCredentials(userId);

      let salesOrder;
      if (this.sapType === 'sap_business_one') {
        salesOrder = await this.apiCallWithRetry(
          'GET',
          `/Orders(${salesOrderId})`,
          null,
          credentials
        );
      } else {
        salesOrder = await this.apiCallWithRetry(
          'GET',
          `/API_SALES_ORDER_SRV/A_SalesOrder('${salesOrderId}')?$expand=to_Item`,
          null,
          credentials
        );
      }

      const contractData = this.mapExternalToContract(salesOrder);

      // Business Partner Details holen
      const customerId = this.sapType === 'sap_business_one'
        ? salesOrder.CardCode
        : salesOrder.SoldToParty;

      if (customerId) {
        try {
          const customer = await this.getBusinessPartner(customerId, credentials);
          if (customer) {
            contractData.dealInfo.company = {
              name: customer.CardName || customer.CustomerName,
              externalId: customerId
            };
            contractData.provider = {
              name: customer.CardName || customer.CustomerName,
              email: customer.EmailAddress,
              phone: customer.Phone1 || customer.Phone
            };
          }
        } catch (e) {
          this.log('warn', `Could not fetch Business Partner ${customerId}`, e.message);
        }
      }

      // Prüfe ob Contract bereits existiert
      const existingContract = await this.findContractByExternalId(salesOrderId, userId);

      let result;
      if (existingContract) {
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
        const insertResult = await this.contractsCollection.insertOne({
          ...contractData,
          userId: new ObjectId(userId),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        result = { contractId: insertResult.insertedId.toString(), created: true };
      }

      await this.logAuditEvent(userId, 'sync_from_sap', {
        salesOrderId,
        contractId: result.contractId,
        created: result.created
      });

      this.emit('sync:complete', {
        contractId: result.contractId,
        externalId: salesOrderId,
        direction: 'inbound'
      });

      return { success: true, ...result };

    } catch (error) {
      await this.logAuditEvent(userId, 'sync_from_sap', {
        salesOrderId,
        error: error.message
      }, false);
      this.log('error', `Sync from SAP failed for ${salesOrderId}`, error.message);
      throw error;
    }
  }

  // ==========================================
  // WEBHOOK HANDLING
  // ==========================================

  /**
   * Verarbeitet SAP Webhooks/Events
   * SAP nutzt oft Alert Notifications oder Integration Suite
   */
  async handleWebhook(eventType, payload, userId) {
    this.log('info', `Handling SAP webhook: ${eventType}`);

    switch (eventType) {
      case 'SalesOrder.Created':
      case 'sales_order_created':
        return await this.handleSalesOrderCreated(payload, userId);

      case 'SalesOrder.Updated':
      case 'sales_order_updated':
        return await this.handleSalesOrderUpdated(payload, userId);

      case 'SalesOrder.Cancelled':
      case 'sales_order_cancelled':
        return await this.handleSalesOrderCancelled(payload, userId);

      case 'BusinessPartner.Created':
      case 'business_partner_created':
        return await this.handleBusinessPartnerCreated(payload, userId);

      case 'Invoice.Created':
      case 'invoice_created':
        return await this.handleInvoiceCreated(payload, userId);

      default:
        this.log('warn', `Unknown SAP event type: ${eventType}`);
        return { handled: false, reason: 'Unknown event type' };
    }
  }

  /**
   * Handle: Sales Order erstellt
   */
  async handleSalesOrderCreated(payload, userId) {
    const salesOrderId = payload.DocEntry || payload.SalesOrder;
    const credentials = await this.getCredentials(userId);

    // Filter: Mindestbetrag?
    if (credentials.settings?.filters?.minDealValue) {
      const amount = payload.DocTotal || payload.TotalNetAmount || 0;
      if (amount < credentials.settings.filters.minDealValue) {
        return { handled: false, reason: 'Below minimum deal value' };
      }
    }

    const result = await this.syncExternalToContract(salesOrderId, userId);

    return {
      handled: true,
      action: 'contract_created',
      contractId: result.contractId
    };
  }

  /**
   * Handle: Sales Order aktualisiert
   */
  async handleSalesOrderUpdated(payload, userId) {
    const salesOrderId = payload.DocEntry || payload.SalesOrder;
    const contract = await this.findContractByExternalId(salesOrderId.toString(), userId);

    if (!contract) {
      return await this.handleSalesOrderCreated(payload, userId);
    }

    // Sync aktualisierte Daten
    await this.syncExternalToContract(salesOrderId, userId);

    return {
      handled: true,
      action: 'contract_updated',
      contractId: contract._id.toString()
    };
  }

  /**
   * Handle: Sales Order storniert
   */
  async handleSalesOrderCancelled(payload, userId) {
    const salesOrderId = payload.DocEntry || payload.SalesOrder;
    const contract = await this.findContractByExternalId(salesOrderId.toString(), userId);

    if (!contract) {
      return { handled: false, reason: 'Contract not found' };
    }

    await this.contractsCollection.updateOne(
      { _id: contract._id },
      {
        $set: {
          status: 'Abgelaufen',
          'integrationSync.sap.status': 'synced',
          updatedAt: new Date()
        }
      }
    );

    return {
      handled: true,
      action: 'contract_cancelled',
      contractId: contract._id.toString()
    };
  }

  /**
   * Handle: Business Partner erstellt
   */
  async handleBusinessPartnerCreated(payload, userId) {
    // Speichere für spätere Referenz
    this.log('info', `New Business Partner: ${payload.CardCode || payload.BusinessPartner}`);
    return { handled: true, action: 'business_partner_logged' };
  }

  /**
   * Handle: Rechnung erstellt (für Contract Linking)
   */
  async handleInvoiceCreated(payload, userId) {
    const salesOrderId = payload.BaseEntry || payload.ReferenceSalesOrder;

    if (!salesOrderId) {
      return { handled: false, reason: 'No linked Sales Order' };
    }

    const contract = await this.findContractByExternalId(salesOrderId.toString(), userId);

    if (!contract) {
      return { handled: false, reason: 'Contract not found' };
    }

    // Speichere Invoice-Referenz
    await this.contractsCollection.updateOne(
      { _id: contract._id },
      {
        $set: {
          'externalIds.sap.invoiceId': payload.DocEntry || payload.BillingDocument,
          paymentStatus: 'unpaid', // Initial
          updatedAt: new Date()
        }
      }
    );

    return {
      handled: true,
      action: 'invoice_linked',
      contractId: contract._id.toString(),
      invoiceId: payload.DocEntry || payload.BillingDocument
    };
  }

  // ==========================================
  // SAP-SPEZIFISCHE METHODEN
  // ==========================================

  /**
   * Holt Business Partner Details
   */
  async getBusinessPartner(cardCode, credentials) {
    if (this.sapType === 'sap_business_one') {
      return await this.apiCallWithRetry(
        'GET',
        `/BusinessPartners('${cardCode}')`,
        null,
        credentials
      );
    } else {
      return await this.apiCallWithRetry(
        'GET',
        `/API_BUSINESS_PARTNER/A_BusinessPartner('${cardCode}')`,
        null,
        credentials
      );
    }
  }

  /**
   * Sucht Business Partners
   */
  async searchBusinessPartners(searchTerm, userId) {
    const credentials = await this.ensureValidCredentials(userId);

    if (this.sapType === 'sap_business_one') {
      const response = await this.apiCallWithRetry(
        'GET',
        `/BusinessPartners?$filter=contains(CardName,'${searchTerm}')&$top=20`,
        null,
        credentials
      );
      return response.value || [];
    } else {
      const response = await this.apiCallWithRetry(
        'GET',
        `/API_BUSINESS_PARTNER/A_BusinessPartner?$filter=substringof('${searchTerm}',CustomerName)&$top=20`,
        null,
        credentials
      );
      return response.d?.results || [];
    }
  }

  /**
   * Holt Sales Orders eines Business Partners
   */
  async getSalesOrdersByCustomer(cardCode, userId) {
    const credentials = await this.ensureValidCredentials(userId);

    if (this.sapType === 'sap_business_one') {
      const response = await this.apiCallWithRetry(
        'GET',
        `/Orders?$filter=CardCode eq '${cardCode}'&$orderby=DocDate desc&$top=50`,
        null,
        credentials
      );
      return response.value || [];
    } else {
      const response = await this.apiCallWithRetry(
        'GET',
        `/API_SALES_ORDER_SRV/A_SalesOrder?$filter=SoldToParty eq '${cardCode}'&$orderby=CreationDate desc&$top=50`,
        null,
        credentials
      );
      return response.d?.results || [];
    }
  }

  /**
   * Holt verfügbare Items/Produkte
   */
  async getItems(userId, limit = 100) {
    const credentials = await this.ensureValidCredentials(userId);

    if (this.sapType === 'sap_business_one') {
      const response = await this.apiCallWithRetry(
        'GET',
        `/Items?$filter=ItemType eq 'itItems' and Valid eq 'tYES'&$top=${limit}`,
        null,
        credentials
      );
      return response.value || [];
    } else {
      const response = await this.apiCallWithRetry(
        'GET',
        `/API_PRODUCT_SRV/A_Product?$top=${limit}`,
        null,
        credentials
      );
      return response.d?.results || [];
    }
  }

  /**
   * Testet die Verbindung
   */
  async testConnection(userId) {
    try {
      const credentials = await this.ensureValidCredentials(userId);

      // Einfacher API Call
      if (this.sapType === 'sap_business_one') {
        await this.apiCallWithRetry('GET', '/CompanyService_GetCompanyInfo', null, credentials);
      } else {
        await this.apiCallWithRetry('GET', '/API_SALES_ORDER_SRV/$metadata', null, credentials);
      }

      return {
        success: true,
        message: 'SAP connection successful',
        sapType: this.sapType
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Erstellt einen Business Partner aus Contract Daten
   */
  async createBusinessPartner(contract, userId) {
    const credentials = await this.ensureValidCredentials(userId);

    const bpData = {
      CardName: contract.dealInfo?.company?.name || contract.provider?.name,
      CardType: 'cCustomer',
      EmailAddress: contract.dealInfo?.contacts?.[0]?.email || contract.provider?.email,
      Phone1: contract.dealInfo?.contacts?.[0]?.phone || contract.provider?.phone,
      // Weitere Felder nach Bedarf
    };

    const result = await this.apiCallWithRetry(
      'POST',
      '/BusinessPartners',
      bpData,
      credentials
    );

    return result.CardCode;
  }
}

// Factory für verschiedene SAP Typen
const instances = {};

module.exports = {
  getInstance: async (sapType = 'sap') => {
    if (!instances[sapType]) {
      instances[sapType] = new SAPService(sapType);
      await instances[sapType].initialize();
    }
    return instances[sapType];
  },
  SAPService
};
