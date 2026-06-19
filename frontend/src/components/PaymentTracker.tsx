// ✨ PaymentTracker.tsx - Smart Payment Status Tracker for One-Time Contracts
import { useState, useMemo, useEffect, useRef } from 'react';
import styles from '../styles/PaymentTracker.module.css';
import { formatEuro, formatDate } from '../utils/formatters'; // 🛡️ verhindert "NaN€"/"Invalid Date"

interface Contract {
  _id: string;
  name: string;
  amount?: number;
  createdAt: string;
  uploadedAt?: string;

  // ✨ Payment Tracking Fields
  contractType?: 'recurring' | 'one-time' | null;
  contractTypeConfidence?: 'high' | 'medium' | 'low';
  paymentStatus?: 'paid' | 'unpaid';
  paymentDate?: string;
  paymentDueDate?: string;
  paymentAmount?: number;
  paymentMethod?: string;
}

interface PaymentTrackerProps {
  contract: Contract;
  onPaymentUpdate?: () => void; // Callback nach erfolgreichem Save
}

export default function PaymentTracker({ contract, onPaymentUpdate }: PaymentTrackerProps) {
  // 🤖 Auto-Paid Detection: Wenn Status=paid UND paymentMethod vorhanden
  const isAutoPaid = contract.paymentStatus === 'paid' && !!contract.paymentMethod;

  // State
  const [isPaid, setIsPaid] = useState(contract.paymentStatus === 'paid');
  const [paymentDate, setPaymentDate] = useState(contract.paymentDate || '');
  const [paymentAmount, setPaymentAmount] = useState(
    contract.paymentAmount !== undefined && contract.paymentAmount !== null
      ? contract.paymentAmount
      : (contract.amount || 0)
  );
  const [isSaving, setIsSaving] = useState(false);

  // Synchronisiere State mit Contract Props (wenn Contract neu geladen wird)
  useEffect(() => {
    setIsPaid(contract.paymentStatus === 'paid');
  }, [contract.paymentStatus]);

  useEffect(() => {
    setPaymentDate(contract.paymentDate || '');
  }, [contract.paymentDate]);

  useEffect(() => {
    const newAmount = contract.paymentAmount !== undefined && contract.paymentAmount !== null
      ? contract.paymentAmount
      : (contract.amount || 0);
    setPaymentAmount(newAmount);
  }, [contract.paymentAmount, contract.amount]);

  // 💰 Berechne Zahlungsinformationen
  const paymentInfo = useMemo(() => {
    const amount = paymentAmount;
    const uploadDate = new Date(contract.createdAt || contract.uploadedAt || Date.now());
    const dueDate = contract.paymentDueDate ? new Date(contract.paymentDueDate) : null;
    const paidDate = paymentDate ? new Date(paymentDate) : null;

    // Berechne Tage seit Upload
    const now = new Date();
    const daysSinceUpload = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));

    // Berechne Tage bis Fälligkeit
    let daysUntilDue = null;
    let isOverdue = false;
    if (dueDate && !isPaid) {
      daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isOverdue = daysUntilDue < 0;
    }

    return {
      amount: formatEuro(amount),
      uploadDate: formatDate(uploadDate),
      // dueDate bleibt undefined wenn keins/ungültig → der bedingte Block wird (wie bisher) ausgeblendet
      dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate.toLocaleDateString('de-DE') : undefined,
      paidDate: formatDate(paidDate),
      daysSinceUpload,
      daysUntilDue,
      isOverdue,
      hasAutoDetection: contract.paymentStatus !== undefined
    };
  }, [contract, isPaid, paymentDate, paymentAmount]);

  // Toggle Payment Status
  const handleToggle = async (newStatus: boolean) => {
    setIsPaid(newStatus);
    if (newStatus && !paymentDate) {
      // Auto-fill mit heute
      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
    }
    await savePaymentStatus(newStatus);
  };

  // Save Payment Date
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setPaymentDate(newDate);
    await savePaymentStatus(isPaid, newDate);
  };

  // Debounce Timer für Amount-Änderungen
  const amountDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle Amount Input (nur State ändern, nicht sofort speichern)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setPaymentAmount(newAmount);

    // Clear existing timer
    if (amountDebounceTimer.current) {
      clearTimeout(amountDebounceTimer.current);
    }

    // Set new timer - speichere erst nach 1 Sekunde ohne Änderung
    amountDebounceTimer.current = setTimeout(() => {
      savePaymentAmount(newAmount);
    }, 1000);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (amountDebounceTimer.current) {
        clearTimeout(amountDebounceTimer.current);
      }
    };
  }, []);

  // API Call zum Speichern
  const savePaymentStatus = async (paid: boolean, date?: string) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Nicht angemeldet');
      }

      const response = await fetch(`/api/contracts/${contract._id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: paid ? 'paid' : 'unpaid',
          paymentDate: date || paymentDate || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Speichern');
      }

      const result = await response.json();
      console.log('✅ Payment status saved:', result);

      // Callback aufrufen um Parent zu informieren
      if (onPaymentUpdate) {
        onPaymentUpdate();
      }
    } catch (error) {
      console.error('❌ Error saving payment status:', error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
      // Rollback state on error
      setIsPaid(contract.paymentStatus === 'paid');
      setPaymentDate(contract.paymentDate || '');
    } finally {
      setIsSaving(false);
    }
  };

  // API Call zum Speichern des Betrags
  const savePaymentAmount = async (amount: number) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Nicht angemeldet');
      }

      const response = await fetch(`/api/contracts/${contract._id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentAmount: amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Speichern');
      }

      const result = await response.json();
      console.log('✅ Payment amount saved:', result);

      // Callback aufrufen um Parent zu informieren
      if (onPaymentUpdate) {
        onPaymentUpdate();
      }
    } catch (error) {
      console.error('❌ Error saving payment amount:', error);
      alert('Fehler beim Speichern des Betrags. Bitte versuche es erneut.');
      // Rollback
      setPaymentAmount(
        contract.paymentAmount !== undefined && contract.paymentAmount !== null
          ? contract.paymentAmount
          : (contract.amount || 0)
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.paymentTracker}>
      <h4 className={styles.title}>
        <span className={styles.icon}>💳</span>
        Zahlungs-Status
      </h4>

      {/* Auto-Detection Badge */}
      {paymentInfo.hasAutoDetection && (
        <div className={styles.autoDetectedBadge}>
          🤖 Automatisch erkannt
        </div>
      )}

      {/* Payment Amount - Premium Editierbar */}
      <div className={styles.amountSection}>
        <div className={styles.amountWrapper}>
          <span className={styles.amountLabel}>Betrag</span>
          <div className={styles.amountInputWrapper}>
            <input
              type="number"
              className={styles.amountInput}
              value={paymentAmount}
              onChange={handleAmountChange}
              disabled={isSaving}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <span className={styles.currencySymbol}>€</span>
          </div>
        </div>
      </div>

      {/* Status Toggle OR Auto-Paid Info Banner */}
      {isAutoPaid ? (
        /* AUTO-PAID INFO BANNER - Keine Interaktion nötig */
        <div className={styles.autoPaidBanner}>
          <span className={styles.autoPaidIcon}>✅</span>
          <div className={styles.autoPaidContent}>
            <strong>Bereits bezahlt</strong>
            <p className={styles.autoPaidMethod}>
              Zahlungsmethode: {contract.paymentMethod}
            </p>
            {paymentDate && (
              <p className={styles.autoPaidDate}>
                Bezahlt am: {formatDate(paymentDate)}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* NORMAL STATUS TOGGLE - Manuelle Verwaltung */
        <div className={styles.statusToggle}>
          <button
            className={`${styles.toggleBtn} ${!isPaid ? styles.active : ''}`}
            onClick={() => handleToggle(false)}
            disabled={isSaving}
          >
            <span className={styles.toggleIcon}>○</span>
            Nicht bezahlt
          </button>
          <button
            className={`${styles.toggleBtn} ${isPaid ? styles.active : ''}`}
            onClick={() => handleToggle(true)}
            disabled={isSaving}
          >
            <span className={styles.toggleIcon}>●</span>
            Bezahlt
          </button>
        </div>
      )}

      {/* Conditional Content based on Status */}
      {!isAutoPaid && !isPaid ? (
        /* UNPAID STATE */
        <div className={styles.unpaidSection}>
          <div className={styles.warningBox}>
            <span className={styles.warningIcon}>⚠️</span>
            <div>
              <strong>Offener Betrag: {paymentInfo.amount}</strong>
              {paymentInfo.dueDate && (
                <p className={styles.dueInfo}>
                  {paymentInfo.isOverdue ? (
                    <span className={styles.overdue}>
                      Überfällig seit {Math.abs(paymentInfo.daysUntilDue!)} Tagen!
                    </span>
                  ) : (
                    <span className={styles.due}>
                      Fällig am {paymentInfo.dueDate} ({paymentInfo.daysUntilDue} Tage)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* TODO: Payment Reminder (Phase 2) */}
          <div className={styles.reminderHint}>
            💡 Tipp: Setze eine Zahlungserinnerung im Kalender
          </div>
        </div>
      ) : !isAutoPaid && isPaid ? (
        /* PAID STATE - Nur bei manueller Verwaltung */
        <div className={styles.paidSection}>
          <div className={styles.successBox}>
            <span className={styles.successIcon}>✅</span>
            <div>
              <strong>Bezahlung abgeschlossen</strong>

              {/* Payment Date Picker */}
              <div className={styles.datePickerWrapper}>
                <label htmlFor="paymentDate" className={styles.dateLabel}>
                  Bezahlt am:
                </label>
                <input
                  id="paymentDate"
                  type="date"
                  className={styles.datePicker}
                  value={paymentDate}
                  onChange={handleDateChange}
                  disabled={isSaving}
                />
              </div>

              {paymentDate && (
                <p className={styles.paidInfo}>
                  Status: Abgeschlossen am {paymentInfo.paidDate}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Document Info */}
      <div className={styles.documentInfo}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Hochgeladen</span>
          <span className={styles.infoValue}>{paymentInfo.uploadDate}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Typ</span>
          <span className={styles.infoValue}>
            {contract.contractType === 'one-time' ? 'Einmalvertrag' : 'Kaufvertrag'}
          </span>
        </div>
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className={styles.savingIndicator}>
          💾 Speichern...
        </div>
      )}
    </div>
  );
}
