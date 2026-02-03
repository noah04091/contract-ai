import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchSidebar from '../SearchSidebar';
import { mockSearchResults } from '../__fixtures__/testData';

const mockClose = jest.fn();
const mockNotification = jest.fn();

const defaultProps = {
  onClose: mockClose,
  onNotification: mockNotification,
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SearchSidebar', () => {
  describe('Initial State', () => {
    it('renders search input', () => {
      render(<SearchSidebar {...defaultProps} />);
      expect(screen.getByPlaceholderText(/Suchbegriff eingeben/)).toBeInTheDocument();
    });

    it('renders source checkboxes', () => {
      render(<SearchSidebar {...defaultProps} />);
      expect(screen.getByText(/EU-Lex/)).toBeInTheDocument();
      expect(screen.getByText(/Bundesanzeiger/)).toBeInTheDocument();
      expect(screen.getByText(/GovData/)).toBeInTheDocument();
    });

    it('renders area filter dropdown', () => {
      render(<SearchSidebar {...defaultProps} />);
      expect(screen.getByText('Alle Bereiche')).toBeInTheDocument();
    });

    it('shows empty state message', () => {
      render(<SearchSidebar {...defaultProps} />);
      expect(screen.getByText('Noch keine Suche durchgeführt')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchSidebar {...defaultProps} />);
      await user.click(screen.getByText('\u00D7'));
      expect(mockClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<SearchSidebar {...defaultProps} />);
      // Click the overlay (first child)
      const overlay = container.firstElementChild!;
      await user.click(overlay);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Search', () => {
    it('shows error when searching with empty query', async () => {
      const user = userEvent.setup();
      render(<SearchSidebar {...defaultProps} />);
      await user.click(screen.getByText('Suchen'));
      expect(mockNotification).toHaveBeenCalledWith({
        message: 'Bitte geben Sie einen Suchbegriff ein',
        type: 'error',
      });
    });

    it('performs search on button click', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: mockSearchResults }),
      });

      render(<SearchSidebar {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/Suchbegriff eingeben/), 'DSGVO');
      await user.click(screen.getByText('Suchen'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/external-legal/search?'),
          expect.objectContaining({ credentials: 'include' }),
        );
      });
    });

    it('performs search on Enter key', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: mockSearchResults }),
      });

      render(<SearchSidebar {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Suchbegriff eingeben/);
      await user.type(input, 'DSGVO{enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('displays search results', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: mockSearchResults }),
      });

      render(<SearchSidebar {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/Suchbegriff eingeben/), 'DSGVO');
      await user.click(screen.getByText('Suchen'));

      await waitFor(() => {
        expect(screen.getByText(/Verordnung \(EU\) 2024\/1234 zum Datenschutz/)).toBeInTheDocument();
        expect(screen.getByText(/Bekanntmachung zum Arbeitszeitgesetz/)).toBeInTheDocument();
      });
    });

    it('shows notification on successful search', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, results: mockSearchResults }),
      });

      render(<SearchSidebar {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/Suchbegriff eingeben/), 'DSGVO');
      await user.click(screen.getByText('Suchen'));

      await waitFor(() => {
        expect(mockNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success' }),
        );
      });
    });

    it('shows error notification on API failure', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<SearchSidebar {...defaultProps} />);
      await user.type(screen.getByPlaceholderText(/Suchbegriff eingeben/), 'DSGVO');
      await user.click(screen.getByText('Suchen'));

      await waitFor(() => {
        expect(mockNotification).toHaveBeenCalledWith({
          message: 'Fehler bei der externen Suche',
          type: 'error',
        });
      });
    });
  });

  describe('Source Toggle', () => {
    it('toggles source checkboxes', async () => {
      const user = userEvent.setup();
      render(<SearchSidebar {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // All 3 should be checked initially
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();

      // Uncheck first one
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
    });
  });
});
