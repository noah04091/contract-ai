import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecommendationCard from '../RecommendationCard';
import { mockRecommendationObject } from '../LegalPulse/__fixtures__/testData';

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

const mockMarkComplete = jest.fn();
const mockImplement = jest.fn();
const mockSaveToLibrary = jest.fn();
const mockFeedback = jest.fn();

const defaultProps = {
  recommendation: mockRecommendationObject,
  index: 0,
  contractId: 'contract-123',
  isCompleted: false,
  onMarkComplete: mockMarkComplete,
  onImplement: mockImplement,
  onSaveToLibrary: mockSaveToLibrary,
  onFeedback: mockFeedback,
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});

describe('RecommendationCard', () => {
  describe('Rendering', () => {
    it('renders recommendation title', () => {
      render(<RecommendationCard {...defaultProps} />);
      expect(screen.getByText('Kündigungsfrist anpassen')).toBeInTheDocument();
    });

    it('renders priority badge', () => {
      render(<RecommendationCard {...defaultProps} />);
      expect(screen.getByText('Hoch')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<RecommendationCard {...defaultProps} />);
      expect(screen.getByText(/Kündigungsfrist sollte auf 3 Monate/)).toBeInTheDocument();
    });

    it('renders effort tag', () => {
      render(<RecommendationCard {...defaultProps} />);
      expect(screen.getByText(/Aufwand: niedrig/)).toBeInTheDocument();
    });

    it('renders impact tag', () => {
      render(<RecommendationCard {...defaultProps} />);
      expect(screen.getByText(/Wirkung: Besserer Schutz/)).toBeInTheDocument();
    });

    it('renders legal basis tag', () => {
      render(<RecommendationCard {...defaultProps} />);
      expect(screen.getByText('BGB §622')).toBeInTheDocument();
    });
  });

  describe('Completed State', () => {
    it('shows completed badge when isCompleted is true', () => {
      render(<RecommendationCard {...defaultProps} isCompleted={true} />);
      const erledigtElements = screen.getAllByText(/Erledigt/);
      expect(erledigtElements.length).toBeGreaterThanOrEqual(1);
      // Priority badge shows "Erledigt" when completed
      expect(erledigtElements[0]).toBeInTheDocument();
    });
  });

  describe('String Recommendation', () => {
    it('renders string recommendation as title', () => {
      render(<RecommendationCard {...defaultProps} recommendation="String-Empfehlung" />);
      expect(screen.getByText('String-Empfehlung')).toBeInTheDocument();
    });

    it('does not show save button for string recommendations', () => {
      render(<RecommendationCard {...defaultProps} recommendation="String rec" />);
      expect(screen.queryByText('Speichern')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('shows expand button when steps exist', () => {
      render(<RecommendationCard {...defaultProps} />);
      expect(screen.getByText(/Umsetzungsschritte & Details/)).toBeInTheDocument();
    });

    it('shows steps when expanded', async () => {
      const user = userEvent.setup();
      render(<RecommendationCard {...defaultProps} />);
      await user.click(screen.getByText(/Umsetzungsschritte & Details/));
      expect(screen.getByText('Klausel §5 überarbeiten')).toBeInTheDocument();
      expect(screen.getByText('Gegenseite informieren')).toBeInTheDocument();
    });

    it('toggles back to collapsed', async () => {
      const user = userEvent.setup();
      render(<RecommendationCard {...defaultProps} />);
      await user.click(screen.getByText(/Umsetzungsschritte & Details/));
      await user.click(screen.getByText('Weniger anzeigen'));
      expect(screen.getByText(/Umsetzungsschritte & Details/)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls onMarkComplete when mark-complete button is clicked', async () => {
      const user = userEvent.setup();
      render(<RecommendationCard {...defaultProps} />);
      await user.click(screen.getByText('Als erledigt'));
      expect(mockMarkComplete).toHaveBeenCalledWith(0);
    });

    it('calls onImplement when implement button is clicked', async () => {
      const user = userEvent.setup();
      render(<RecommendationCard {...defaultProps} />);
      await user.click(screen.getByText('Jetzt umsetzen'));
      expect(mockImplement).toHaveBeenCalledWith(mockRecommendationObject);
    });

    it('calls onSaveToLibrary when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<RecommendationCard {...defaultProps} />);
      await user.click(screen.getByText('Speichern'));
      expect(mockSaveToLibrary).toHaveBeenCalledWith(mockRecommendationObject);
    });
  });
});
