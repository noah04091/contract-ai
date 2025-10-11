// ✨ SmartContractInfo.tsx - Intelligent Switcher zwischen Cost Tracker & Payment Tracker
import CostTracker from './CostTracker';
import PaymentTracker from './PaymentTracker';

interface Contract {
  _id: string;
  name: string;
  amount?: number;
  createdAt: string;
  uploadedAt?: string;

  // Payment Tracking
  contractType?: 'recurring' | 'one-time' | null;
  contractTypeConfidence?: 'high' | 'medium' | 'low';
  paymentStatus?: 'paid' | 'unpaid';
  paymentDate?: string;
  paymentDueDate?: string;
  paymentAmount?: number;
  paymentMethod?: string;
}

interface SmartContractInfoProps {
  contract: Contract;
  onPaymentUpdate?: () => void; // Callback wenn Payment gespeichert wurde
}

/**
 * 🧠 Smart Component: Entscheidet automatisch welcher Tracker angezeigt wird
 *
 * SMART DEFAULT LOGIK (Stufe 1):
 * 1. Rechnung/Invoice im Namen → BEIDE Tracker (Payment + Cost)
 * 2. Recurring + sichere Keywords (Abo/Miete/etc) → NUR Cost Tracker
 * 3. One-Time + sichere Keywords (Werk/Kauf) → NUR Payment Tracker
 * 4. Default: BEIDE Tracker (sicherer Fallback!)
 */
export default function SmartContractInfo({ contract, onPaymentUpdate }: SmartContractInfoProps) {
  // 🧠 Intelligente Detection
  const contractName = contract.name?.toLowerCase() || '';

  // Keyword Detection - Erweitert für mehr Rechnungs-Formate
  const invoiceKeywords = [
    'rechnung', 'invoice',
    're-', 're_', '_re', // RE-2024, email_RE, etc.
    'beleg', 'quittung', 'receipt',
    'zahlungsbeleg', 'kassenbeleg',
    'gutschrift', 'stornorechnung'
  ];
  const isInvoice = invoiceKeywords.some(keyword => contractName.includes(keyword));

  // Recurring Keywords (sehr sichere Signale für Abo/Subscription)
  const recurringKeywords = [
    'abo', 'abonnement', 'subscription',
    'netflix', 'spotify', 'disney', 'amazon prime',
    'miet', 'miete', 'vermietung',
    'versicherung', 'insurance',
    'leasing', 'leasingvertrag',
    'fitness', 'fitnessstudio', 'gym',
    'handy', 'mobilfunk', 'telekom', 'vodafone', 'o2',
    'internet', 'dsl', 'glasfaser',
    'strom', 'gas', 'wasser', 'energie'
  ];

  // One-Time Keywords (sehr sichere Signale für einmalige Verträge)
  const oneTimeKeywords = [
    'werkvertrag', 'werk-vertrag',
    'kaufvertrag', 'kauf-vertrag',
    'dienstleistungsvertrag', 'service'
  ];

  const hasRecurringKeyword = recurringKeywords.some(keyword => contractName.includes(keyword));
  const hasOneTimeKeyword = oneTimeKeywords.some(keyword => contractName.includes(keyword));

  const isOneTimeContract = contract.contractType === 'one-time';
  const isRecurringContract = contract.contractType === 'recurring';

  // Decision Logic
  // 1. Rechnung im Namen → IMMER BEIDE Tracker (überschreibt alles!)
  if (isInvoice) {
    console.log('💳💰 Showing BOTH Trackers (invoice detected in name)');
    return (
      <>
        <PaymentTracker contract={contract} onPaymentUpdate={onPaymentUpdate} />
        <div style={{ marginTop: '1rem' }} />
        <CostTracker contract={contract} />
      </>
    );
  }

  // 2. SEHR SICHER: Recurring + (Keywords ODER high confidence) → Nur Cost Tracker
  const isHighConfidenceRecurring = contract.contractTypeConfidence === 'high';
  if (isRecurringContract && (hasRecurringKeyword || isHighConfidenceRecurring)) {
    console.log('💰 Showing ONLY Cost Tracker (recurring + safe keyword/high confidence)');
    return <CostTracker contract={contract} />;
  }

  // 3. SEHR SICHER: One-Time + (Keywords ODER high confidence) → Nur Payment Tracker
  const isHighConfidenceOneTime = contract.contractTypeConfidence === 'high';
  if (isOneTimeContract && (hasOneTimeKeyword || isHighConfidenceOneTime)) {
    console.log('💳 Showing ONLY Payment Tracker (one-time + safe keyword/high confidence)');
    return <PaymentTracker contract={contract} onPaymentUpdate={onPaymentUpdate} />;
  }

  // 4. NUR Keywords ohne GPT-Typ → Auch nutzen (aber konservativ)
  // 4a. Recurring Keywords SEHR stark (Netflix, Spotify, etc.)
  const veryStrongRecurring = ['netflix', 'spotify', 'disney', 'amazon prime', 'mietvertrag', 'miet-vertrag'];
  if (veryStrongRecurring.some(keyword => contractName.includes(keyword))) {
    console.log('💰 Showing ONLY Cost Tracker (very strong recurring keyword)');
    return <CostTracker contract={contract} />;
  }

  // 5. Default: BEIDE Tracker (sicherer Fallback!)
  console.log('💳💰 Showing BOTH Trackers (default - safe fallback)');
  return (
    <>
      <PaymentTracker contract={contract} onPaymentUpdate={onPaymentUpdate} />
      <div style={{ marginTop: '1rem' }} />
      <CostTracker contract={contract} />
    </>
  );
}
