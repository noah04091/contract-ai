import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForecastTab from '../ForecastTab';
import { mockContract, mockContractNoAnalysis, mockForecastData } from '../__fixtures__/testData';

const mockNavigate = jest.fn();
const mockFetchForecast = jest.fn();

const defaultProps = {
  selectedContract: mockContract,
  onNavigate: mockNavigate as unknown as import('react-router-dom').NavigateFunction,
  forecastData: mockForecastData,
  forecastLoading: false,
  forecastError: null,
  fetchForecast: mockFetchForecast,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ForecastTab', () => {
  describe('No Analysis State', () => {
    it('shows no-analysis message when legalPulse is missing', () => {
      render(<ForecastTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('ML-Prognose benötigt Analyse-Daten')).toBeInTheDocument();
    });

    it('shows feature descriptions', () => {
      render(<ForecastTab {...defaultProps} selectedContract={mockContractNoAnalysis} />);
      expect(screen.getByText('6-Monats-Prognose')).toBeInTheDocument();
      expect(screen.getByText('Risiko-Trends')).toBeInTheDocument();
      expect(screen.getByText('KI-Konfidenzwerte')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<ForecastTab {...defaultProps} forecastData={null} forecastLoading={true} />);
      expect(screen.getByText('Prognose wird berechnet...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message', () => {
      render(<ForecastTab {...defaultProps} forecastData={null} forecastError="Server nicht erreichbar" />);
      expect(screen.getByText('Prognose nicht verfügbar')).toBeInTheDocument();
      expect(screen.getByText('Server nicht erreichbar')).toBeInTheDocument();
    });

    it('calls fetchForecast on retry click', async () => {
      const user = userEvent.setup();
      render(<ForecastTab {...defaultProps} forecastData={null} forecastError="Fehler" />);
      await user.click(screen.getByText('Erneut versuchen'));
      expect(mockFetchForecast).toHaveBeenCalledWith(mockContract._id);
    });
  });

  describe('With Forecast Data', () => {
    it('renders section header', () => {
      render(<ForecastTab {...defaultProps} />);
      expect(screen.getByText('ML-Prognose')).toBeInTheDocument();
    });

    it('renders forecast overview cards', () => {
      render(<ForecastTab {...defaultProps} />);
      expect(screen.getByText('Risiko-Trend (6 Monate)')).toBeInTheDocument();
      expect(screen.getByText('Kritische Monate')).toBeInTheDocument();
      expect(screen.getByText('Modell-Typ')).toBeInTheDocument();
    });

    it('shows correct trend direction', () => {
      render(<ForecastTab {...defaultProps} />);
      expect(screen.getByText(/Steigend/)).toBeInTheDocument();
    });

    it('shows critical months count', () => {
      render(<ForecastTab {...defaultProps} />);
      expect(screen.getByText('1 von 6')).toBeInTheDocument();
    });

    it('shows recommendation box', () => {
      render(<ForecastTab {...defaultProps} />);
      expect(screen.getByText('Empfehlung')).toBeInTheDocument();
      expect(screen.getByText(mockForecastData.summary.recommendation)).toBeInTheDocument();
    });

    it('renders forecast chart (mocked)', () => {
      render(<ForecastTab {...defaultProps} />);
      expect(screen.getByTestId('mock-ResponsiveContainer')).toBeInTheDocument();
    });

    it('renders predicted events timeline', () => {
      render(<ForecastTab {...defaultProps} />);
      expect(screen.getByText(/Vorhergesagte Events/)).toBeInTheDocument();
      expect(screen.getByText(/Neue DSGVO-Richtlinie erwartet/)).toBeInTheDocument();
      expect(screen.getByText(/Kündigungsfrist endet/)).toBeInTheDocument();
    });
  });
});
