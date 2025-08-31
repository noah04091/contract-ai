// 📁 backend/utils/contractTemplates.js
// Template-Engine für rechtssichere, deterministische Vertragsgenerierung
// ✅ ERWEITERT das bestehende System - ersetzt NICHTS!

/**
 * Markdown-basierte Vertragsvorlagen mit Handlebars-ähnlicher Syntax
 * Diese Templates werden VOR der GPT-Veredelung verwendet für maximale Rechtssicherheit
 */

const contractTemplates = {
  freelancer: {
    jurisdiction: 'DE',
    requiredClauses: [
      'parties', 'services', 'compensation', 'duration', 'termination', 
      'liability', 'intellectual_property', 'confidentiality', 'governing_law'
    ],
    template: `{{#if companyHeader}}
<div style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #0A84FF;">
  {{#if companyHeader.logoUrl}}
  <div style="text-align: center; margin-bottom: 20px;">
    <img src="{{companyHeader.logoUrl}}" alt="Firmenlogo" style="max-width: 180px; max-height: 100px; object-fit: contain;" />
  </div>
  {{/if}}
  <div style="text-align: right;">
    <h2 style="margin: 0; color: #1d1d1f; font-size: 18px; font-weight: bold;">{{companyHeader.companyName}}</h2>
    {{#if companyHeader.legalForm}}<p style="margin: 2px 0; color: #666; font-size: 12px;">{{companyHeader.legalForm}}</p>{{/if}}
    <p style="margin: 2px 0; color: #666; font-size: 11px;">{{companyHeader.street}}</p>
    <p style="margin: 2px 0; color: #666; font-size: 11px;">{{companyHeader.postalCode}} {{companyHeader.city}}</p>
    {{#if companyHeader.contactEmail}}<p style="margin: 2px 0; color: #0A84FF; font-size: 11px;">{{companyHeader.contactEmail}}</p>{{/if}}
    {{#if companyHeader.contactPhone}}<p style="margin: 2px 0; color: #666; font-size: 11px;">Tel: {{companyHeader.contactPhone}}</p>{{/if}}
    {{#if companyHeader.vatId}}<p style="margin: 5px 0 2px 0; color: #666; font-size: 10px;">USt-IdNr.: {{companyHeader.vatId}}</p>{{/if}}
    {{#if companyHeader.tradeRegister}}<p style="margin: 2px 0; color: #666; font-size: 10px;">{{companyHeader.tradeRegister}}</p>{{/if}}
  </div>
</div>
{{/if}}

# FREELANCER-DIENSTLEISTUNGSVERTRAG

## § 1 VERTRAGSPARTEIEN

**Auftraggeber:**
{{partyA.name}}{{#if partyA.legalForm}} ({{partyA.legalForm}}){{/if}}
{{partyA.street}}
{{partyA.postalCode}} {{partyA.city}}, {{partyA.country}}
{{#if partyA.vatId}}USt-IdNr.: {{partyA.vatId}}{{/if}}
{{#if partyA.contactEmail}}E-Mail: {{partyA.contactEmail}}{{/if}}
{{#if partyA.contactPhone}}Tel: {{partyA.contactPhone}}{{/if}}

**Auftragnehmer (Freelancer):**
{{partyB.name}}
{{partyB.address}}
{{#if partyB.taxId}}Steuer-ID: {{partyB.taxId}}{{/if}}

## § 2 VERTRAGSGEGENSTAND

Der Auftragnehmer verpflichtet sich, folgende Dienstleistungen zu erbringen:

{{services.description}}

**Projektdauer:** {{services.timeframe}}
**Arbeitsort:** {{services.workLocation}}

## § 3 VERGÜTUNG UND ZAHLUNGSBEDINGUNGEN

**Vergütung:** {{compensation.amount}}
**Zahlungsbedingungen:** {{compensation.paymentTerms}}
**Rechnungsstellung:** {{compensation.invoiceInterval}}

Alle Preise verstehen sich zzgl. der gesetzlichen Umsatzsteuer, soweit diese anfällt.

## § 4 RECHTE AN ARBEITSERGEBNISSEN

{{#if intellectualProperty}}
{{intellectualProperty.ownership}}
{{else}}
Alle im Rahmen dieses Vertrages erstellten Arbeitsergebnisse gehen mit vollständiger Bezahlung in das Eigentum des Auftraggebers über.
{{/if}}

## § 5 VERTRAULICHKEIT

{{#if confidentiality.level}}
Beide Parteien verpflichten sich zur {{confidentiality.level}} aller im Rahmen der Zusammenarbeit erhaltenen Informationen.
{{/if}}

Die Vertraulichkeitspflicht gilt auch nach Beendigung dieses Vertrages fort.

## § 6 HAFTUNG

{{#if liability.limitation}}
Die Haftung wird {{liability.limitation}}.
{{else}}
Die Haftung des Auftragnehmers ist auf den Auftragswert begrenzt, außer bei Vorsatz und grober Fahrlässigkeit.
{{/if}}

## § 7 KÜNDIGUNG

{{#if termination.notice}}
Dieser Vertrag kann von beiden Seiten mit einer Frist von {{termination.notice}} gekündigt werden.
{{else}}
Dieser Vertrag kann von beiden Seiten mit einer Frist von 14 Tagen zum Monatsende gekündigt werden.
{{/if}}

## § 8 SCHLUSSBESTIMMUNGEN

**Anwendbares Recht:** {{governingLaw}}
**Gerichtsstand:** {{jurisdiction}}

Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.

---

**Ort, Datum:** {{contract.place}}, {{contract.date}}

**Unterschriften:**

_____________________  
{{partyA.name}}  
(Auftraggeber)

_____________________  
{{partyB.name}}  
(Auftragnehmer)`
  },

  // Weitere Templates können hier hinzugefügt werden
  nda: {
    jurisdiction: 'DE',
    requiredClauses: ['parties', 'purpose', 'confidentiality', 'duration', 'governing_law'],
    template: `{{#if companyHeader}}
<div style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #0A84FF;">
  {{#if companyHeader.logoUrl}}
  <div style="text-align: center; margin-bottom: 20px;">
    <img src="{{companyHeader.logoUrl}}" alt="Firmenlogo" style="max-width: 180px; max-height: 100px; object-fit: contain;" />
  </div>
  {{/if}}
  <div style="text-align: right;">
    <h2 style="margin: 0; color: #1d1d1f; font-size: 18px; font-weight: bold;">{{companyHeader.companyName}}</h2>
    {{#if companyHeader.legalForm}}<p style="margin: 2px 0; color: #666; font-size: 12px;">{{companyHeader.legalForm}}</p>{{/if}}
    <p style="margin: 2px 0; color: #666; font-size: 11px;">{{companyHeader.street}}</p>
    <p style="margin: 2px 0; color: #666; font-size: 11px;">{{companyHeader.postalCode}} {{companyHeader.city}}</p>
    {{#if companyHeader.contactEmail}}<p style="margin: 2px 0; color: #0A84FF; font-size: 11px;">{{companyHeader.contactEmail}}</p>{{/if}}
    {{#if companyHeader.contactPhone}}<p style="margin: 2px 0; color: #666; font-size: 11px;">Tel: {{companyHeader.contactPhone}}</p>{{/if}}
    {{#if companyHeader.vatId}}<p style="margin: 5px 0 2px 0; color: #666; font-size: 10px;">USt-IdNr.: {{companyHeader.vatId}}</p>{{/if}}
    {{#if companyHeader.tradeRegister}}<p style="margin: 2px 0; color: #666; font-size: 10px;">{{companyHeader.tradeRegister}}</p>{{/if}}
  </div>
</div>
{{/if}}

# GEHEIMHALTUNGSVEREINBARUNG (NDA)

## § 1 VERTRAGSPARTEIEN

**Partei A:**
{{partyA.name}}
{{partyA.address}}
{{#if partyA.contactEmail}}E-Mail: {{partyA.contactEmail}}{{/if}}

**Partei B:**
{{partyB.name}}
{{partyB.address}}

## § 2 GEGENSTAND UND ZWECK

Zweck dieser Vereinbarung: {{purpose}}

## § 3 VERTRAULICHKEITSPFLICHT

Beide Parteien verpflichten sich, alle erhaltenen vertraulichen Informationen streng geheim zu halten.

## § 4 LAUFZEIT

Diese Vereinbarung gilt für {{duration}}.

## § 5 SCHLUSSBESTIMMUNGEN

**Anwendbares Recht:** Deutsches Recht
**Gerichtsstand:** {{jurisdiction}}

---

**Ort, Datum:** {{contract.place}}, {{contract.date}}

**Unterschriften:**

_____________________  
{{partyA.name}}

_____________________  
{{partyB.name}}`
  }
};

/**
 * Einfache Template-Engine (Handlebars-like)
 * Unterstützt: {{variable}}, {{#if condition}}, {{#each array}}
 */
class TemplateEngine {
  static render(template, data) {
    let result = template;

    // Replace simple variables {{variable}}
    result = result.replace(/\{\{([^#\/\}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? value : '';
    });

    // Handle {{#if condition}} blocks
    result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      const value = this.getNestedValue(data, condition.trim());
      return value ? content : '';
    });

    // Handle {{#if condition}}content{{else}}alternative{{/if}} blocks
    result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, truthy, falsy) => {
      const value = this.getNestedValue(data, condition.trim());
      return value ? truthy : falsy;
    });

    return result;
  }

  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

/**
 * Clause-Bibliothek für wiederverwendbare Vertragsbausteine
 */
const clauseLibrary = {
  confidentiality: {
    standard: "zur Vertraulichkeit bezüglich aller geschäftlichen Informationen",
    enhanced: "zur strengen Vertraulichkeit und Geheimhaltung aller Informationen",
    strict: "zur absoluten Vertraulichkeit mit erweiterten Sicherheitsmaßnahmen"
  },
  liability: {
    limited_to_contract_value: "auf den Auftragswert begrenzt",
    limited_to_double_value: "auf den doppelten Auftragswert begrenzt", 
    intent_and_gross_negligence: "beschränkt auf Vorsatz und grobe Fahrlässigkeit",
    statutory: "entsprechend den gesetzlichen Bestimmungen"
  },
  intellectual_property: {
    full_transfer: "Alle Rechte gehen vollständig an den Auftraggeber über",
    shared_rights: "Gemeinsame Nutzungsrechte für beide Parteien",
    license_only: "Der Auftraggeber erhält ein unbefristetes Nutzungsrecht",
    custom: "Nach individueller Vereinbarung"
  }
};

/**
 * Validator für Pflichtfelder je Vertragstyp
 */
function validateRequiredFields(contractType, formData) {
  const template = contractTemplates[contractType];
  if (!template) {
    throw new Error(`Unbekannter Vertragstyp: ${contractType}`);
  }

  const errors = [];
  const required = template.requiredClauses;

  // Basic validation - kann erweitert werden
  if (required.includes('parties') && (!formData.partyA || !formData.partyB)) {
    errors.push('Vertragsparteien sind unvollständig');
  }

  if (required.includes('services') && !formData.services) {
    errors.push('Leistungsbeschreibung fehlt');
  }

  if (required.includes('compensation') && !formData.compensation) {
    errors.push('Vergütungsangaben fehlen');
  }

  return errors;
}

/**
 * Template-Daten aus Form-Daten vorbereiten
 */
function prepareTemplateData(contractType, formData, companyProfile = null) {
  const baseData = {
    contract: {
      date: new Date().toLocaleDateString('de-DE'),
      place: companyProfile?.city || 'Berlin'
    }
  };

  // Company Header für professionelle Darstellung
  if (companyProfile) {
    baseData.companyHeader = {
      companyName: companyProfile.companyName,
      legalForm: companyProfile.legalForm,
      street: companyProfile.street,
      postalCode: companyProfile.postalCode,
      city: companyProfile.city,
      country: companyProfile.country,
      vatId: companyProfile.vatId,
      tradeRegister: companyProfile.tradeRegister,
      contactEmail: companyProfile.contactEmail,
      contactPhone: companyProfile.contactPhone,
      logoUrl: companyProfile.logoUrl
    };
  }

  // Mapping je nach Vertragstyp
  switch (contractType) {
    case 'freelancer':
      return {
        ...baseData,
        partyA: {
          name: formData.nameClient || companyProfile?.companyName,
          legalForm: companyProfile?.legalForm,
          street: companyProfile?.street,
          postalCode: companyProfile?.postalCode,
          city: companyProfile?.city,
          country: companyProfile?.country || 'Deutschland',
          vatId: companyProfile?.vatId,
          contactEmail: companyProfile?.contactEmail,
          contactPhone: companyProfile?.contactPhone,
          tradeRegister: companyProfile?.tradeRegister
        },
        partyB: {
          name: formData.nameFreelancer,
          address: formData.freelancerAddress,
          taxId: formData.freelancerTaxId
        },
        services: {
          description: formData.description,
          timeframe: formData.timeframe,
          workLocation: formData.workLocation
        },
        compensation: {
          amount: formData.payment,
          paymentTerms: formData.paymentTerms,
          invoiceInterval: formData.invoiceInterval
        },
        intellectualProperty: {
          ownership: clauseLibrary.intellectual_property[formData.ipOwnership?.toLowerCase().replace(/[^a-z]/g, '_')] || clauseLibrary.intellectual_property.full_transfer
        },
        confidentiality: {
          level: clauseLibrary.confidentiality[formData.confidentiality?.toLowerCase().replace(/[^a-z]/g, '_')] || clauseLibrary.confidentiality.standard
        },
        liability: {
          limitation: clauseLibrary.liability[formData.liability?.toLowerCase().replace(/[^a-z]/g, '_')] || clauseLibrary.liability.limited_to_contract_value
        },
        termination: {
          notice: formData.terminationClause
        },
        governingLaw: formData.governingLaw || 'Deutsches Recht',
        jurisdiction: formData.jurisdiction || companyProfile?.city || 'Berlin'
      };

    case 'nda':
      return {
        ...baseData,
        partyA: {
          name: formData.partyA || companyProfile?.companyName,
          address: companyProfile ? `${companyProfile.street}, ${companyProfile.postalCode} ${companyProfile.city}` : formData.partyAAddress,
          contactEmail: companyProfile?.contactEmail
        },
        partyB: {
          name: formData.partyB,
          address: formData.partyBAddress
        },
        purpose: formData.purpose,
        duration: formData.duration,
        jurisdiction: formData.jurisdiction || companyProfile?.city || 'Berlin'
      };

    default:
      return baseData;
  }
}

module.exports = {
  contractTemplates,
  TemplateEngine,
  clauseLibrary,
  validateRequiredFields,
  prepareTemplateData
};