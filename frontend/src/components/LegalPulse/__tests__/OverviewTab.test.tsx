import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OverviewTab from '../OverviewTab';
import { mockContract, mockContractNoAnalysis } from '../__fixtures__/testData';

const mockNavigate = jest.fn();
const mockSetActiveTab = jest.fn();

const defaultProps = {
  selectedContract: mockContract,
  onNavigate: mockNavigate as unknown as import('react-router-dom').NavigateFunction,
  onSetActiveTab: mockSetActiveTab,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OverviewTab', () => {
  describe('No Analysis State', () => {
    it('shows no-analysis message when legalPulse is missing', () => {
      render(<OverviewTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Legal Pulse Analyse ausstehend')).toBeInTheDocument();
    });

    it('shows step-by-step instructions', () => {
      render(<OverviewTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('Vertrag analysieren')).toBeInTheDocument();
      expect(screen.getByText('Legal Pulse startet automatisch')).toBeInTheDocument();
      expect(screen.getByText('Laufende Überwachung')).toBeInTheDocument();
    });

    it('navigates to contracts on CTA click', async () => {
      const user = userEvent.setup();
      render(<OverviewTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      await user.click(screen.getByText('Zur Vertragsanalyse'));
      expect(mockNavigate).toHaveBeenCalledWith('/contracts');
    });
  });

  describe('With Analysis Data', () => {
    it('renders risk distribution section', () => {
      render(<OverviewTab {...defaultProps} />);
      expect(screen.getByText('Risikoverteilung')).toBeInTheDocument();
    });

    it('renders top risks preview', () => {
      render(<OverviewTab {...defaultProps} />);
      expect(screen.getByText('Top-Risiken')).toBeInTheDocument();
      expect(screen.getByText('Fehlende Datenschutzklausel')).toBeInTheDocument();
    });

    it('renders top recommendations preview', () => {
      render(<OverviewTab {...defaultProps} />);
      expect(screen.getByText('Top-Empfehlungen')).toBeInTheDocument();
      expect(screen.getByText('Kündigungsfrist anpassen')).toBeInTheDocument();
    });

    it('shows quick action buttons', () => {
      render(<OverviewTab {...defaultProps} />);
      expect(screen.getByText('Risiken im Detail ansehen')).toBeInTheDocument();
      expect(screen.getByText('Empfehlungen umsetzen')).toBeInTheDocument();
      expect(screen.getByText('Vertrag vergleichen')).toBeInTheDocument();
    });

    it('clicking "Alle anzeigen" on risks navigates to risks tab', async () => {
      const user = userEvent.setup();
      render(<OverviewTab {...defaultProps} />);
      const buttons = screen.getAllByText(/Alle anzeigen/);
      await user.click(buttons[0]);
      expect(mockSetActiveTab).toHaveBeenCalledWith('risks');
    });

    it('clicking "Alle anzeigen" on recommendations navigates to recommendations tab', async () => {
      const user = userEvent.setup();
      render(<OverviewTab {...defaultProps} />);
      const buttons = screen.getAllByText(/Alle anzeigen/);
      await user.click(buttons[1]);
      expect(mockSetActiveTab).toHaveBeenCalledWith('recommendations');
    });

    it('clicking action button navigates to risks tab', async () => {
      const user = userEvent.setup();
      render(<OverviewTab {...defaultProps} />);
      await user.click(screen.getByText('Risiken im Detail ansehen'));
      expect(mockSetActiveTab).toHaveBeenCalledWith('risks');
    });

    it('clicking compare navigates to compare page', async () => {
      const user = userEvent.setup();
      render(<OverviewTab {...defaultProps} />);
      await user.click(screen.getByText('Vertrag vergleichen'));
      expect(mockNavigate).toHaveBeenCalledWith(`/compare?contractId=${mockContract._id}`);
    });
  });
});
