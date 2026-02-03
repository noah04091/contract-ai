import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RiskCard from '../RiskCard';
import { mockRiskObject } from '../LegalPulse/__fixtures__/testData';

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

const mockSaveToLibrary = jest.fn();
const mockFeedback = jest.fn();

const defaultProps = {
  risk: mockRiskObject,
  index: 0,
  contractId: 'contract-123',
  onSaveToLibrary: mockSaveToLibrary,
  onFeedback: mockFeedback,
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});

describe('RiskCard', () => {
  describe('Rendering', () => {
    it('renders risk title', () => {
      render(<RiskCard {...defaultProps} />);
      expect(screen.getByText('Fehlende Datenschutzklausel')).toBeInTheDocument();
    });

    it('renders severity badge', () => {
      render(<RiskCard {...defaultProps} />);
      expect(screen.getByText('Hoch')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<RiskCard {...defaultProps} />);
      expect(screen.getByText(/DSGVO-konforme Datenschutzklausel/)).toBeInTheDocument();
    });

    it('renders legal basis badge', () => {
      render(<RiskCard {...defaultProps} />);
      expect(screen.getByText('DSGVO Art. 28')).toBeInTheDocument();
    });

    it('renders affected clauses tags', () => {
      render(<RiskCard {...defaultProps} />);
      expect(screen.getByText('§3 Datenschutz')).toBeInTheDocument();
    });
  });

  describe('String Risk', () => {
    it('renders string risk as title', () => {
      render(<RiskCard {...defaultProps} risk="Einfaches Risiko als String" />);
      expect(screen.getByText('Einfaches Risiko als String')).toBeInTheDocument();
    });

    it('shows medium severity for string risks', () => {
      render(<RiskCard {...defaultProps} risk="String risk" />);
      expect(screen.getByText('Mittel')).toBeInTheDocument();
    });

    it('does not show save button for string risks', () => {
      render(<RiskCard {...defaultProps} risk="String risk" />);
      expect(screen.queryByText('Speichern')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('shows expand button when expandable content exists', () => {
      render(<RiskCard {...defaultProps} />);
      expect(screen.getByText(/Details & Lösung anzeigen/)).toBeInTheDocument();
    });

    it('shows expanded content on click', async () => {
      const user = userEvent.setup();
      render(<RiskCard {...defaultProps} />);
      await user.click(screen.getByText(/Details & Lösung anzeigen/));
      expect(screen.getByText('Auswirkung')).toBeInTheDocument();
      expect(screen.getByText(mockRiskObject.impact!)).toBeInTheDocument();
    });

    it('toggles back to collapsed', async () => {
      const user = userEvent.setup();
      render(<RiskCard {...defaultProps} />);
      await user.click(screen.getByText(/Details & Lösung anzeigen/));
      expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument();
      await user.click(screen.getByText('Weniger anzeigen'));
      expect(screen.getByText(/Details & Lösung anzeigen/)).toBeInTheDocument();
    });

    it('shows solution when expanded', async () => {
      const user = userEvent.setup();
      render(<RiskCard {...defaultProps} />);
      await user.click(screen.getByText(/Details & Lösung anzeigen/));
      expect(screen.getByText(mockRiskObject.solution!)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls onSaveToLibrary when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<RiskCard {...defaultProps} />);
      await user.click(screen.getByText('Speichern'));
      expect(mockSaveToLibrary).toHaveBeenCalledWith(mockRiskObject);
    });
  });
});
