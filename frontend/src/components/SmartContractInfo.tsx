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
  contractType?: 'recurring' | 'one-time';
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
 * NEUE LOGIK (mit doppeltem Tracker für Rechnungen):
 * 1. Filename enthält "Rechnung"/"Invoice" → BEIDE Tracker (Payment + Cost)
 * 2. contractType = 'one-time' → Nur PaymentTracker
 * 3. contractType = 'recurring' → Nur CostTracker
 * 4. Default: PaymentTracker (sicherer für Rechnungen!)
 */
export default function SmartContractInfo({ contract, onPaymentUpdate }: SmartContractInfoProps) {
  // 🧠 Intelligente Detection
  const contractName = contract.name?.toLowerCase() || '';
  const isInvoice = contractName.includes('rechnung') || contractName.includes('invoice');
  const isOneTimeContract = contract.contractType === 'one-time';
  const isRecurringContract = contract.contractType === 'recurring';

  // Decision Logic
  // 1. Rechnung im Namen → BEIDE Tracker (Payment Status + Kostenübersicht)
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

  // 2. Explizit als one-time markiert
  if (isOneTimeContract) {
    console.log('💳 Showing Payment Tracker (one-time contract)');
    return <PaymentTracker contract={contract} onPaymentUpdate={onPaymentUpdate} />;
  }

  // 3. NUR wenn explizit recurring → Cost Tracker
  if (isRecurringContract) {
    console.log('💰 Showing Cost Tracker (recurring contract)');
    return <CostTracker contract={contract} />;
  }

  // 4. Default: Payment Tracker (sicherer für Rechnungen)
  console.log('💳 Showing Payment Tracker (default - safer for invoices)');
  return <PaymentTracker contract={contract} onPaymentUpdate={onPaymentUpdate} />;
}
