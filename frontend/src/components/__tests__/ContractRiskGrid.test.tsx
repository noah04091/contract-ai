import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractRiskGrid, { ContractRiskGridEmptyState } from '../ContractRiskGrid';
import { mockContract, mockGetRiskLevel } from '../LegalPulse/__fixtures__/testData';
import type { Contract } from '../../types/legalPulse';

// Mock fixUtf8Display
jest.mock('../../utils/textUtils', () => ({
  fixUtf8Display: (str: string) => str,
}));

const mockContractClick = jest.fn();
const mockMouseEnter = jest.fn();
const mockMouseLeave = jest.fn();
const mockLoadMore = jest.fn();
const mockResetFilters = jest.fn();

const secondContract: Contract = {
  _id: 'contract-789',
  name: 'Mietvertrag Büro Berlin',
  laufzeit: 'unbefristet',
  kuendigung: '6 Monate',
  legalPulse: {
    riskScore: 30,
    lastAnalysis: '2024-11-15T10:00:00Z',
  },
};

const defaultProps = {
  contracts: [mockContract, secondContract],
  pagination: { hasMore: false, total: 2 },
  isLoadingMore: false,
  loadMoreRef: React.createRef<HTMLDivElement>(),
  showTooltip: {},
  getRiskLevel: mockGetRiskLevel,
  onContractClick: mockContractClick,
  onMouseEnter: mockMouseEnter,
  onMouseLeave: mockMouseLeave,
  onLoadMore: mockLoadMore,
  canAccessLegalPulse: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ContractRiskGrid', () => {
  describe('Card Rendering', () => {
    it('renders contract cards', () => {
      render(<ContractRiskGrid {...defaultProps} />);
      expect(screen.getByText('Arbeitsvertrag Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('Mietvertrag Büro Berlin')).toBeInTheDocument();
    });

    it('shows risk scores', () => {
      render(<ContractRiskGrid {...defaultProps} />);
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('shows risk level status', () => {
      render(<ContractRiskGrid {...defaultProps} />);
      expect(screen.getByText('Mittel')).toBeInTheDocument();
      expect(screen.getByText('Niedrig')).toBeInTheDocument();
    });

    it('shows last scan date', () => {
      render(<ContractRiskGrid {...defaultProps} />);
      const dates = screen.getAllByText(/\d{1,2}\.\d{1,2}\.\d{4}/);
      expect(dates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Click Handling', () => {
    it('calls onContractClick when card is clicked', async () => {
      const user = userEvent.setup();
      render(<ContractRiskGrid {...defaultProps} />);
      await user.click(screen.getByText('Arbeitsvertrag Max Mustermann'));
      expect(mockContractClick).toHaveBeenCalledWith(mockContract);
    });
  });

  describe('Load More', () => {
    it('shows load more button when hasMore is true', () => {
      render(<ContractRiskGrid {...defaultProps} pagination={{ hasMore: true, total: 10 }} />);
      expect(screen.getByText(/Mehr laden/)).toBeInTheDocument();
    });

    it('hides load more when hasMore is false', () => {
      render(<ContractRiskGrid {...defaultProps} />);
      expect(screen.queryByText(/Mehr laden/)).not.toBeInTheDocument();
    });

    it('calls onLoadMore when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ContractRiskGrid {...defaultProps} pagination={{ hasMore: true, total: 10 }} />);
      await user.click(screen.getByText(/Mehr laden/));
      expect(mockLoadMore).toHaveBeenCalled();
    });

    it('shows loading spinner when loading more', () => {
      render(
        <ContractRiskGrid
          {...defaultProps}
          pagination={{ hasMore: true, total: 10 }}
          isLoadingMore={true}
        />
      );
      expect(screen.getByText('Lade weitere Verträge...')).toBeInTheDocument();
    });
  });

  describe('Premium Locked', () => {
    it('shows premium badge when canAccessLegalPulse is false', () => {
      render(<ContractRiskGrid {...defaultProps} canAccessLegalPulse={false} />);
      const premiumBadges = screen.getAllByText('Premium');
      expect(premiumBadges.length).toBe(2);
    });

    it('shows upgrade button text when locked', () => {
      render(<ContractRiskGrid {...defaultProps} canAccessLegalPulse={false} />);
      const upgradeButtons = screen.getAllByText('Jetzt upgraden');
      expect(upgradeButtons.length).toBe(2);
    });
  });
});

describe('ContractRiskGridEmptyState', () => {
  describe('With Filters', () => {
    it('shows filter empty state', () => {
      render(
        <ContractRiskGridEmptyState
          hasFilters={true}
          searchQuery="Test"
          onResetFilters={mockResetFilters}
        />
      );
      expect(screen.getByText('Keine Verträge gefunden')).toBeInTheDocument();
      expect(screen.getByText(/Test/)).toBeInTheDocument();
    });

    it('calls onResetFilters when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ContractRiskGridEmptyState
          hasFilters={true}
          searchQuery="Test"
          onResetFilters={mockResetFilters}
        />
      );
      await user.click(screen.getByText('Filter zurücksetzen'));
      expect(mockResetFilters).toHaveBeenCalled();
    });
  });

  describe('Without Filters', () => {
    it('shows no-contracts empty state', () => {
      render(
        <ContractRiskGridEmptyState
          hasFilters={false}
          searchQuery=""
          onResetFilters={mockResetFilters}
        />
      );
      expect(screen.getByText('Noch keine Verträge vorhanden')).toBeInTheDocument();
    });

    it('does not show reset button without filters', () => {
      render(
        <ContractRiskGridEmptyState
          hasFilters={false}
          searchQuery=""
          onResetFilters={mockResetFilters}
        />
      );
      expect(screen.queryByText('Filter zurücksetzen')).not.toBeInTheDocument();
    });
  });
});
