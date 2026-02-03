import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecommendationsTab from '../RecommendationsTab';
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
const mockMarkComplete = jest.fn();
const mockImplement = jest.fn();
const mockSaveToLibrary = jest.fn();
const mockSetNotification = jest.fn();

const defaultProps = {
  selectedContract: mockContract,
  onNavigate: mockNavigate as unknown as import('react-router-dom').NavigateFunction,
  completedRecommendations: {},
  onMarkRecommendationComplete: mockMarkComplete,
  onImplementRecommendation: mockImplement,
  onSaveRecommendationToLibrary: mockSaveToLibrary,
  onSetNotification: mockSetNotification,
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});

describe('RecommendationsTab', () => {
  describe('No Analysis State', () => {
    it('shows no-analysis message when legalPulse is missing', () => {
      render(<RecommendationsTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Empfehlungen werden nach Analyse erstellt')).toBeInTheDocument();
    });

    it('shows feature descriptions', () => {
      render(<RecommendationsTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Priorisierte Maßnahmen')).toBeInTheDocument();
      expect(screen.getByText('1-Klick Umsetzung')).toBeInTheDocument();
      expect(screen.getByText('Rechtliche Absicherung')).toBeInTheDocument();
    });
  });

  describe('With Recommendations', () => {
    it('renders section header', () => {
      render(<RecommendationsTab {...defaultProps} />);
      expect(screen.getByText('Empfohlene Maßnahmen')).toBeInTheDocument();
    });

    it('renders recommendation cards', () => {
      render(<RecommendationsTab {...defaultProps} />);
      expect(screen.getByText('Kündigungsfrist anpassen')).toBeInTheDocument();
      expect(screen.getByText('Gerichtsstand festlegen')).toBeInTheDocument();
    });

    it('shows implement buttons', () => {
      render(<RecommendationsTab {...defaultProps} />);
      const implementBtns = screen.getAllByText('Jetzt umsetzen');
      expect(implementBtns.length).toBe(2);
    });

    it('shows mark-complete buttons', () => {
      render(<RecommendationsTab {...defaultProps} />);
      const completeBtns = screen.getAllByText('Als erledigt');
      expect(completeBtns.length).toBe(2);
    });
  });

  describe('Empty Recommendations', () => {
    it('shows no-recommendations message when empty', () => {
      const contractNoRecs: Contract = {
        ...mockContract,
        legalPulse: {
          ...mockContract.legalPulse!,
          recommendations: [],
        },
      };
      render(<RecommendationsTab {...defaultProps} selectedContract={contractNoRecs} />);
      expect(screen.getByText('Keine Empfehlungen notwendig')).toBeInTheDocument();
    });
  });
});
