import React from 'react';
import { render, screen } from '@testing-library/react';
import LegalChangesTab from '../LegalChangesTab';
import { mockWeeklyCheck } from '../__fixtures__/testData';

const defaultProps = {
  contractWeeklyCheck: mockWeeklyCheck.latestCheck,
  contractWeeklyCheckLoading: false,
};

describe('LegalChangesTab', () => {
  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<LegalChangesTab contractWeeklyCheck={null} contractWeeklyCheckLoading={true} />);
      expect(screen.getByText('Lade Rechtsänderungs-Prüfung...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no check data', () => {
      render(<LegalChangesTab contractWeeklyCheck={null} contractWeeklyCheckLoading={false} />);
      expect(screen.getByText('Noch keine Prüfung durchgeführt')).toBeInTheDocument();
    });
  });

  describe('With Check Data', () => {
    it('renders section header', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText(/Rechtsänderungs-Überwachung/)).toBeInTheDocument();
    });

    it('shows overall status badge', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText('Handlungsbedarf')).toBeInTheDocument();
    });

    it('shows findings count', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText(/1 Befund/)).toBeInTheDocument();
    });

    it('shows summary text', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText('Es wurden relevante Gesetzesänderungen gefunden.')).toBeInTheDocument();
    });

    it('renders findings with severity badges', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText('Warnung')).toBeInTheDocument();
      expect(screen.getByText('Änderung der Arbeitszeitverordnung')).toBeInTheDocument();
    });

    it('shows finding details', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText(/Betroffene Klausel:/)).toBeInTheDocument();
      expect(screen.getByText(/§4 Arbeitszeit/)).toBeInTheDocument();
      expect(screen.getByText(/Rechtsgrundlage:/)).toBeInTheDocument();
    });

    it('shows relevant law changes from stage 1', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText(/Arbeitszeitgesetz §3/)).toBeInTheDocument();
      expect(screen.getByText(/DSGVO Art. 28/)).toBeInTheDocument();
    });

    it('shows metadata when available', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText(/Vertrag analysiert: 95%/)).toBeInTheDocument();
    });

    it('shows disclaimer', () => {
      render(<LegalChangesTab {...defaultProps} />);
      expect(screen.getByText(/Diese Analyse prüft erkannte Rechtsänderungen/)).toBeInTheDocument();
    });
  });
});
