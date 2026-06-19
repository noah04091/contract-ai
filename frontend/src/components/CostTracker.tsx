// ✨ CostTracker.tsx - Premium Cost Overview Component
import { useState, useMemo, useEffect } from 'react';
import styles from '../styles/CostTracker.module.css';
import { formatEuro } from '../utils/formatters'; // 🛡️ verhindert "NaN€"

interface Contract {
  _id: string;
  name: string;
  amount?: number;
  createdAt: string;
  uploadedAt?: string;

  // 💰 Cost Tracking Fields
  contractType?: 'recurring' | 'one-time' | null;
  contractTypeConfidence?: 'high' | 'medium' | 'low';
  // 🆕 A3 (29.05.2026): String statt enum — Backend speichert deutsche Werte
  // ("Monatlich", "Jährlich") via A3-KI-Extraktion + Phase-B-Edit-Modal-Eingabe.
  // Alt-Daten können noch englisch ('monthly' etc.) sein.
  paymentFrequency?: string;
  subscriptionStartDate?: string;
  paymentAmount?: number;
}

interface CostTrackerProps {
  contract: Contract;
  onCostUpdate?: () => void; // Callback nach erfolgreichem Save
}

// 🆕 A3 (29.05.2026) Side-Bug-Fix: Mapping deutsch→englisch für paymentFrequency.
// Backend speichert "Monatlich"/"Vierteljährlich"/"Halbjährlich"/"Jährlich"/"Einmalig"
// (A3-KI-Whitelist + Phase-B-Dropdown). CostTracker rechnet intern mit
// 'monthly' | 'yearly' | 'weekly'. Ohne Mapping wurden alle Berechnungen 0.
function normalizeFrequency(input: string | undefined): 'monthly' | 'yearly' | 'weekly' {
  if (!input) return 'monthly';
  const lower = input.toLowerCase();
  if (lower.includes('jähr') || lower.includes('jahr') || lower === 'yearly') return 'yearly';
  if (lower.includes('wöch') || lower.includes('woch') || lower === 'weekly') return 'weekly';
  // Default: Monatlich / Vierteljährlich / Halbjährlich / Einmalig — alle als 'monthly' rechnen
  // (vier/halbjährlich = mehrere Monate, Einmalig = irrelevant für Recurring-View)
  return 'monthly';
}

export default function CostTracker({ contract, onCostUpdate }: CostTrackerProps) {
  // State
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>(
    normalizeFrequency(contract.paymentFrequency)
  );
  const [startDate, setStartDate] = useState(contract.subscriptionStartDate || '');
  const [baseAmount, setBaseAmount] = useState(
    contract.paymentAmount || contract.amount || 0
  );
  const [isSaving, setIsSaving] = useState(false);

  // Synchronisiere State mit Contract Props
  useEffect(() => {
    setFrequency(normalizeFrequency(contract.paymentFrequency));
  }, [contract.paymentFrequency]);

  useEffect(() => {
    setStartDate(contract.subscriptionStartDate || '');
  }, [contract.subscriptionStartDate]);

  useEffect(() => {
    const newAmount = contract.paymentAmount || contract.amount || 0;
    setBaseAmount(newAmount);
  }, [contract.paymentAmount, contract.amount]);

  // 💰 Berechne Kosten basierend auf Frequenz
  const costs = useMemo(() => {
    // ✅ Nutze baseAmount aus State (editierbar!)
    let monthlyPrice = 0;
    let yearlyPrice = 0;

    if (frequency === 'monthly') {
      monthlyPrice = baseAmount;
      yearlyPrice = baseAmount * 12;
    } else if (frequency === 'yearly') {
      monthlyPrice = baseAmount / 12;
      yearlyPrice = baseAmount;
    } else if (frequency === 'weekly') {
      monthlyPrice = (baseAmount * 52) / 12;
      yearlyPrice = baseAmount * 52;
    }

    // Berechne Gesamtkosten seit Start-Datum
    let totalCost = 0;
    let monthsSinceStart = 0;

    if (startDate) {
      const start = new Date(startDate);
      const now = new Date();
      monthsSinceStart = Math.max(1,
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth())
      );
      totalCost = monthlyPrice * monthsSinceStart;
    } else {
      // Fallback: seit Upload
      const createdDate = new Date(contract.createdAt || contract.uploadedAt || Date.now());
      const now = new Date();
      monthsSinceStart = Math.max(1,
        (now.getFullYear() - createdDate.getFullYear()) * 12 +
        (now.getMonth() - createdDate.getMonth())
      );
      totalCost = monthlyPrice * monthsSinceStart;
    }

    return {
      monthly: monthlyPrice,
      yearly: yearlyPrice,
      total: totalCost,
      months: monthsSinceStart
    };
  }, [baseAmount, frequency, startDate, contract.createdAt, contract.uploadedAt]);

  // Handle Frequency Change
  const handleFrequencyChange = async (newFrequency: 'monthly' | 'yearly' | 'weekly') => {
    setFrequency(newFrequency);
    await saveCostData({ paymentFrequency: newFrequency });
  };

  // Handle Start Date Change
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setStartDate(newDate);
  };

  // Handle Start Date Blur (nur beim Verlassen speichern)
  const handleStartDateBlur = () => {
    if (startDate !== contract.subscriptionStartDate) {
      saveCostData({ subscriptionStartDate: startDate });
    }
  };

  // Handle Base Amount Change
  const handleBaseAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setBaseAmount(newAmount);
  };

  // Handle Base Amount Blur (nur beim Verlassen des Felds speichern)
  const handleBaseAmountBlur = () => {
    saveCostData({ baseAmount });
  };

  // API Call zum Speichern
  const saveCostData = async (data: { paymentFrequency?: string; subscriptionStartDate?: string; baseAmount?: number }) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Nicht angemeldet');
      }

      const response = await fetch(`/api/contracts/${contract._id}/costs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Speichern');
      }

      const result = await response.json();
      console.log('✅ Cost data saved:', result);

      // Callback aufrufen um Parent zu informieren
      if (onCostUpdate) {
        onCostUpdate();
      }
    } catch (error) {
      console.error('❌ Error saving cost data:', error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
      // Rollback state on error
      setFrequency(normalizeFrequency(contract.paymentFrequency));
      setStartDate(contract.subscriptionStartDate || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompare = () => {
    // TODO: Navigation zu Compare-Feature
    console.log('🔍 Navigate to Compare feature for contract:', contract._id);
    alert('Compare-Feature coming soon! 🚀');
  };

  return (
    <div className={styles.costTracker}>
      <h4 className={styles.title}>
        <span className={styles.icon}>💰</span>
        Kosten-Übersicht
      </h4>

      {/* Frequenz-Auswahl */}
      <div className={styles.frequencySection}>
        <span className={styles.frequencyLabel}>Zahlungsrhythmus</span>
        <div className={styles.frequencyToggle}>
          <button
            className={`${styles.frequencyBtn} ${frequency === 'weekly' ? styles.active : ''}`}
            onClick={() => handleFrequencyChange('weekly')}
            disabled={isSaving}
          >
            Wöchentlich
          </button>
          <button
            className={`${styles.frequencyBtn} ${frequency === 'monthly' ? styles.active : ''}`}
            onClick={() => handleFrequencyChange('monthly')}
            disabled={isSaving}
          >
            Monatlich
          </button>
          <button
            className={`${styles.frequencyBtn} ${frequency === 'yearly' ? styles.active : ''}`}
            onClick={() => handleFrequencyChange('yearly')}
            disabled={isSaving}
          >
            Jährlich
          </button>
        </div>
      </div>

      {/* Base Amount Input */}
      <div className={styles.baseAmountSection}>
        <span className={styles.baseAmountLabel}>Basisbetrag ({frequency === 'monthly' ? 'pro Monat' : frequency === 'yearly' ? 'pro Jahr' : 'pro Woche'})</span>
        <div className={styles.baseAmountInputWrapper}>
          <input
            type="number"
            className={styles.baseAmountInput}
            value={baseAmount}
            onChange={handleBaseAmountChange}
            onBlur={handleBaseAmountBlur}
            disabled={isSaving}
            step="0.01"
            min="0"
            placeholder="0.00"
          />
          <span className={styles.currencySymbol}>€</span>
        </div>
      </div>

      {/* Abo-Start-Datum */}
      <div className={styles.startDateSection}>
        <label htmlFor="subscriptionStart" className={styles.startDateLabel}>
          Abo seit
        </label>
        <input
          id="subscriptionStart"
          type="date"
          className={styles.startDateInput}
          value={startDate}
          onChange={handleStartDateChange}
          onBlur={handleStartDateBlur}
          disabled={isSaving}
          placeholder="Wähle Start-Datum"
        />
      </div>

      <div className={styles.costGrid}>
        <div className={styles.costItem}>
          <span className={styles.costLabel}>Monatlich</span>
          <strong className={styles.costValue}>{formatEuro(costs.monthly)}</strong>
        </div>

        <div className={styles.costItem}>
          <span className={styles.costLabel}>Jährlich</span>
          <strong className={styles.costValue}>{formatEuro(costs.yearly)}</strong>
        </div>

        <div className={styles.costItem}>
          <span className={styles.costLabel}>
            {startDate ? `Seit Abo-Start (${costs.months}M)` : `Seit Upload (${costs.months}M)`}
          </span>
          <strong className={styles.costValue}>{formatEuro(costs.total)}</strong>
        </div>
      </div>

      {contract.amount && contract.amount > 0 && (
        <button
          className={styles.compareBtn}
          onClick={handleCompare}
          title="Vergleiche Preise und finde günstigere Alternativen"
        >
          <span>Einsparpotenzial prüfen</span>
          <span className={styles.arrow}>→</span>
        </button>
      )}

      {(!contract.amount || contract.amount === 0) && (
        <p className={styles.noCostHint}>
          💡 Tipp: Füge einen Preis hinzu, um Kosten zu tracken
        </p>
      )}

      {/* Saving Indicator */}
      {isSaving && (
        <div className={styles.savingIndicator}>
          💾 Speichern...
        </div>
      )}
    </div>
  );
}
