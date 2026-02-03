import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryTab from '../HistoryTab';
import { mockContract, mockContractNoAnalysis, mockScoreHistory, mockRiskLevel, mockGetRiskScoreColor } from '../__fixtures__/testData';

const mockNavigate = jest.fn();

const defaultProps = {
  selectedContract: mockContract,
  onNavigate: mockNavigate as unknown as import('react-router-dom').NavigateFunction,
  scoreHistory: mockScoreHistory,
  riskLevel: mockRiskLevel,
  getRiskScoreColor: mockGetRiskScoreColor,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HistoryTab', () => {
  describe('No Analysis State', () => {
    it('shows no-analysis message when legalPulse is missing', () => {
      render(<HistoryTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Noch keine Analyse-Historie')).toBeInTheDocument();
    });

    it('shows feature descriptions', () => {
      render(<HistoryTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Score-Verlauf über Zeit')).toBeInTheDocument();
      expect(screen.getByText('Trend-Erkennung')).toBeInTheDocument();
      expect(screen.getByText('Fortschritts-Tracking')).toBeInTheDocument();
    });

    it('navigates to contracts on CTA click', async () => {
      const user = userEvent.setup();
      render(<HistoryTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      await user.click(screen.getByText('Vertrag analysieren'));
      expect(mockNavigate).toHaveBeenCalledWith('/contracts');
    });
  });

  describe('Single Point State', () => {
    it('shows single-point message when only 1 data point', () => {
      render(<HistoryTab {...defaultProps} scoreHistory={[{ date: '2024-12-01', score: 65 }]} />);
      expect(screen.getByText('Erste Analyse durchgeführt')).toBeInTheDocument();
    });

    it('shows current risk score', () => {
      render(<HistoryTab {...defaultProps} scoreHistory={[{ date: '2024-12-01', score: 65 }]} />);
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByText('/100 Risiko-Score')).toBeInTheDocument();
    });

    it('shows risk level indicator', () => {
      render(<HistoryTab {...defaultProps} scoreHistory={[{ date: '2024-12-01', score: 65 }]} />);
      expect(screen.getByText(/Mittel/)).toBeInTheDocument();
    });
  });

  describe('Chart State (multiple data points)', () => {
    it('renders section header', () => {
      render(<HistoryTab {...defaultProps} />);
      expect(screen.getByText('Analyse-Historie')).toBeInTheDocument();
    });

    it('renders chart legend', () => {
      render(<HistoryTab {...defaultProps} />);
      expect(screen.getByText(/Zeitverlauf des Risiko-Scores/)).toBeInTheDocument();
    });

    it('renders mocked recharts components', () => {
      render(<HistoryTab {...defaultProps} />);
      expect(screen.getByTestId('mock-ResponsiveContainer')).toBeInTheDocument();
      expect(screen.getByTestId('mock-AreaChart')).toBeInTheDocument();
    });
  });
});
