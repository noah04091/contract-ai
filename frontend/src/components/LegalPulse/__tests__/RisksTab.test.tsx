import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RisksTab from '../RisksTab';
import { mockContract, mockContractNoAnalysis } from '../__fixtures__/testData';
import type { Contract } from '../../../types/legalPulse';

// Mock localStorage for FeedbackButtons
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockNavigate = jest.fn();
const mockSaveRiskToLibrary = jest.fn();
const mockSetNotification = jest.fn();

const defaultProps = {
  selectedContract: mockContract,
  onNavigate: mockNavigate as unknown as import('react-router-dom').NavigateFunction,
  onSaveRiskToLibrary: mockSaveRiskToLibrary,
  onSetNotification: mockSetNotification,
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});

describe('RisksTab', () => {
  describe('No Analysis State', () => {
    it('shows no-analysis message when legalPulse is missing', () => {
      render(<RisksTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Risikoanalyse nicht verfügbar')).toBeInTheDocument();
    });

    it('shows feature descriptions', () => {
      render(<RisksTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Automatische Risikoerkennung')).toBeInTheDocument();
      expect(screen.getByText('Schwachstellen-Bewertung')).toBeInTheDocument();
      expect(screen.getByText('Handlungsempfehlungen')).toBeInTheDocument();
    });

    it('navigates to contracts on CTA click', async () => {
      const user = userEvent.setup();
      render(<RisksTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      await user.click(screen.getByText('Vertrag analysieren'));
      expect(mockNavigate).toHaveBeenCalledWith('/contracts');
    });
  });

  describe('With Analysis Data', () => {
    it('renders section header', () => {
      render(<RisksTab {...defaultProps} />);
      expect(screen.getByText('Identifizierte Risiken')).toBeInTheDocument();
    });

    it('renders risk cards for each risk', () => {
      render(<RisksTab {...defaultProps} />);
      expect(screen.getByText('Fehlende Datenschutzklausel')).toBeInTheDocument();
      expect(screen.getByText('Unklare Zahlungsbedingungen')).toBeInTheDocument();
    });

    it('shows severity badges', () => {
      render(<RisksTab {...defaultProps} />);
      expect(screen.getByText('Hoch')).toBeInTheDocument();
      expect(screen.getByText('Niedrig')).toBeInTheDocument();
    });
  });

  describe('Empty Risks', () => {
    it('shows no-risks message when topRisks is empty', () => {
      const contractNoRisks: Contract = {
        ...mockContract,
        legalPulse: {
          ...mockContract.legalPulse!,
          topRisks: [],
        },
      };
      render(<RisksTab {...defaultProps} selectedContract={contractNoRisks} />);
      expect(screen.getByText('Keine Risiken erkannt')).toBeInTheDocument();
    });
  });
});
