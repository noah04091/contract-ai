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
}

interface SmartContractInfoProps {
  contract: Contract;
}

/**
 * 🧠 Smart Component: Entscheidet automatisch welcher Tracker angezeigt wird
 *
 * LOGIK:
 * - Wenn contractType = 'one-time' → PaymentTracker
 * - Wenn contractType = 'recurring' → CostTracker
 * - Wenn kein contractType ABER amount vorhanden → CostTracker (Fallback für alte Daten)
 * - Sonst → PaymentTracker (Default für neue Uploads ohne Preis)
 */
export default function SmartContractInfo({ contract }: SmartContractInfoProps) {
  // 🧠 Intelligente Detection
  const isOneTimeContract = contract.contractType === 'one-time';
  const isRecurringContract = contract.contractType === 'recurring';
  const hasRecurringAmount = contract.amount && contract.amount > 0 && !isOneTimeContract;

  // Decision Logic
  if (isOneTimeContract) {
    // Einmalvertrag → Payment Tracker
    console.log('💳 Showing Payment Tracker (one-time contract)');
    return <PaymentTracker contract={contract} />;
  }

  if (isRecurringContract || hasRecurringAmount) {
    // Laufender Vertrag → Cost Tracker
    console.log('💰 Showing Cost Tracker (recurring contract)');
    return <CostTracker contract={contract} />;
  }

  // Default: Payment Tracker (für neue Uploads ohne Analyse)
  console.log('💳 Showing Payment Tracker (default - no type detected)');
  return <PaymentTracker contract={contract} />;
}
