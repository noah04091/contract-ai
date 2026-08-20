// 20.08.2026: Noah meldet, dass die Ladeanzeige bei einem Foto weiss bleibt.
// Dieser Test klaert, ob die ANZEIGE-LOGIK schuld ist oder die Daten.

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-pdf', () => ({
  Document: ({ children }: { children?: React.ReactNode }) => <div data-testid="pdf-leser">{children}</div>,
  Page: () => <div data-testid="pdf-seite" />,
}));

import AnalysisOverlay from '../components/AnalysisOverlay';

// jsdom kennt createObjectURL nicht
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:test', writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, writable: true });
});

const bild = () => new File([new Uint8Array([1, 2, 3])], 'DHL-Label (2).png', { type: 'image/png' });
const pdf = () => new File([new Uint8Array([1, 2, 3])], 'Vertrag.pdf', { type: 'application/pdf' });

describe('AnalysisOverlay: Foto in der Ladeanzeige', () => {
  test('frisch hochgeladenes Bild wird als Bild gezeigt', () => {
    const { baseElement, queryByTestId } = render(
      <AnalysisOverlay show contractName="DHL-Label (2).png" progress={54} pdfFile={bild()} />
    );
    expect(baseElement.querySelector('img')).toBeInTheDocument();
    expect(queryByTestId('pdf-leser')).not.toBeInTheDocument();
  });

  test('gespeicherter Vertrag: Bild ueber mimetype + Adresse', () => {
    const { baseElement, queryByTestId } = render(
      <AnalysisOverlay show contractName="DHL-Label" progress={54}
        pdfSrcUrl="https://example.invalid/x.png" mimetype="image/png" />
    );
    expect(baseElement.querySelector('img')).toBeInTheDocument();
    expect(queryByTestId('pdf-leser')).not.toBeInTheDocument();
  });

  test('⚠️ Regression: eine PDF geht weiterhin durch den PDF-Leser', () => {
    const { baseElement, queryByTestId } = render(
      <AnalysisOverlay show contractName="Vertrag.pdf" progress={54} pdfFile={pdf()} />
    );
    expect(queryByTestId('pdf-leser')).toBeInTheDocument();
    expect(baseElement.querySelector('img')).not.toBeInTheDocument();
  });

  test('gespeicherter Vertrag OHNE mimetype, Name ohne Endung -> PDF-Leser (Fail-safe)', () => {
    const { queryByTestId } = render(
      <AnalysisOverlay show contractName="DHL-Label" progress={54} pdfSrcUrl="https://example.invalid/x" />
    );
    expect(queryByTestId('pdf-leser')).toBeInTheDocument();
  });
});
