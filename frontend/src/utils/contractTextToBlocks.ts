// Konvertiert einen generierten Vertragstext in Contract-Builder-Blocks
// Wird vom Generate-"Als Vorlage"-Flow genutzt, damit Vorlagen im Builder
// Block-für-Block bearbeitbar sind statt nur als großer Textblock.
//
// Aufbau der Blocks:
//   1. header: Vertragstitel
//   2. parties (optional): wenn Partei-Daten in formData verfügbar sind
//   3. clause × N: für jede § X Sektion ein eigener Block
//   4. signature: leerer Signatur-Block am Ende

export type BuilderBlockShape = {
  type: string;
  content: Record<string, unknown>;
  style: Record<string, unknown>;
  locked: boolean;
  aiGenerated: boolean;
};

const PARTY_FIELD_CANDIDATES = {
  partyA: {
    name: ['partyA_name', 'employer', 'landlord', 'seller', 'lender', 'licensor', 'vendorName', 'principalName', 'partyAName', 'company', 'auftraggeber'],
    address: ['partyA_address', 'employerAddress', 'landlordAddress', 'sellerAddress', 'lenderAddress', 'licensorAddress', 'vendorAddress', 'partyAAddress'],
    role: ['partyA_role'],
  },
  partyB: {
    name: ['partyB_name', 'employee', 'tenant', 'buyer', 'borrower', 'licensee', 'resellerName', 'consultantName', 'partyBName', 'auftragnehmer'],
    address: ['partyB_address', 'employeeAddress', 'tenantAddress', 'buyerAddress', 'borrowerAddress', 'licenseeAddress', 'resellerAddress', 'partyBAddress'],
    role: ['partyB_role'],
  },
};

function pickFirst(formData: Record<string, unknown>, candidates: string[]): string {
  for (const key of candidates) {
    const value = formData[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

function extractTitle(contractText: string, fallback: string): string {
  const firstNonEmptyLine = contractText.split('\n').map(l => l.trim()).find(l => l.length > 0);
  if (!firstNonEmptyLine) return fallback;
  // Wenn die erste Zeile schon mit § beginnt, ist da kein Titel
  if (/^§/.test(firstNonEmptyLine)) return fallback;
  return firstNonEmptyLine.replace(/^#+\s*/, '').slice(0, 200);
}

function buildHeaderBlock(title: string, contractType: string): BuilderBlockShape {
  return {
    type: 'header',
    content: {
      title,
      contractType,
      headerLayout: 'centered',
      showDivider: true,
    },
    style: {},
    locked: false,
    aiGenerated: true,
  };
}

function buildPartiesBlock(formData: Record<string, unknown>): BuilderBlockShape | null {
  const aName = pickFirst(formData, PARTY_FIELD_CANDIDATES.partyA.name);
  const bName = pickFirst(formData, PARTY_FIELD_CANDIDATES.partyB.name);
  if (!aName && !bName) return null;
  return {
    type: 'parties',
    content: {
      party1: {
        role: pickFirst(formData, PARTY_FIELD_CANDIDATES.partyA.role) || 'Partei 1',
        name: aName || '',
        address: pickFirst(formData, PARTY_FIELD_CANDIDATES.partyA.address),
      },
      party2: {
        role: pickFirst(formData, PARTY_FIELD_CANDIDATES.partyB.role) || 'Partei 2',
        name: bName || '',
        address: pickFirst(formData, PARTY_FIELD_CANDIDATES.partyB.address),
      },
      partiesLayout: 'modern',
    },
    style: {},
    locked: false,
    aiGenerated: true,
  };
}

function buildClauseBlocks(contractText: string): BuilderBlockShape[] {
  const blocks: BuilderBlockShape[] = [];
  // Regex: erkennt "§ N", "§N", "§  N" — optional gefolgt von Titel auf gleicher Zeile
  const sectionRegex = /(?:^|\n)\s*§\s*(\d+[a-z]?)\s*([^\n]*?)\n([\s\S]*?)(?=\n\s*§\s*\d+[a-z]?\s|$)/g;
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(contractText)) !== null) {
    const number = `§ ${match[1]}`;
    const clauseTitle = match[2].trim().replace(/^[-—:\s]+/, '').replace(/\s+$/, '');
    const body = match[3].trim();
    if (!body && !clauseTitle) continue;
    blocks.push({
      type: 'clause',
      content: {
        number,
        clauseTitle: clauseTitle || `Abschnitt ${match[1]}`,
        body,
        clauseLayout: 'standard',
      },
      style: {},
      locked: false,
      aiGenerated: true,
    });
  }
  return blocks;
}

function buildFallbackClauseBlock(contractText: string): BuilderBlockShape {
  return {
    type: 'clause',
    content: {
      number: '',
      clauseTitle: 'Vertragstext',
      body: contractText.trim(),
      clauseLayout: 'standard',
    },
    style: {},
    locked: false,
    aiGenerated: true,
  };
}

function buildSignatureBlock(): BuilderBlockShape {
  return {
    type: 'signature',
    content: {
      signatureFields: [
        { partyIndex: 0, label: 'Partei 1', showDate: true, showPlace: true },
        { partyIndex: 1, label: 'Partei 2', showDate: true, showPlace: true },
      ],
      signatureLayout: 'modern',
    },
    style: {},
    locked: false,
    aiGenerated: true,
  };
}

export function contractTextToBlocks(
  contractText: string,
  contractType: string,
  contractTypeName: string,
  formData: Record<string, unknown>
): BuilderBlockShape[] {
  const blocks: BuilderBlockShape[] = [];
  const safeText = (contractText || '').trim();
  const title = extractTitle(safeText, contractTypeName || 'Vertrag');

  blocks.push(buildHeaderBlock(title, contractType));

  const partiesBlock = buildPartiesBlock(formData);
  if (partiesBlock) blocks.push(partiesBlock);

  const clauseBlocks = buildClauseBlocks(safeText);
  if (clauseBlocks.length > 0) {
    blocks.push(...clauseBlocks);
  } else if (safeText) {
    blocks.push(buildFallbackClauseBlock(safeText));
  }

  blocks.push(buildSignatureBlock());

  return blocks;
}
