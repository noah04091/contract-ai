// 20.08.2026: Noah meldet, dass die Ladeanzeige bei einem Foto weiss bleibt.
// Dieser Test klaert, ob die ANZEIGE-LOGIK schuld ist oder die Daten.

import { render, fireEvent } from '@testing-library/react';
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

describe('Selbstheilende Bildquelle (21.08.2026)', () => {
  test('faellt auf die zweite Quelle zurueck, wenn die erste nicht laedt', () => {
    const { baseElement } = render(
      <AnalysisOverlay show contractName="x.png" progress={41}
        pdfFile={bild()} pdfSrcUrl="https://example.invalid/echt.png" mimetype="image/png" />
    );
    const ersteQuelle = baseElement.querySelector('img')!.getAttribute('src');
    expect(ersteQuelle).toBe('blob:test');

    fireEvent.error(baseElement.querySelector('img')!);

    const zweiteQuelle = baseElement.querySelector('img')!.getAttribute('src');
    expect(zweiteQuelle).toBe('https://example.invalid/echt.png');
  });

  test('kein kaputtes Bild-Symbol: versagen ALLE Quellen, kommt das Platzhalter-Muster', () => {
    const { baseElement, queryByTestId } = render(
      <AnalysisOverlay show contractName="x.png" progress={41} pdfFile={bild()} />
    );
    fireEvent.error(baseElement.querySelector('img')!);
    expect(baseElement.querySelector('img')).not.toBeInTheDocument();
    expect(queryByTestId('pdf-leser')).not.toBeInTheDocument(); // NIE der PDF-Leser bei einem Bild
  });
});

describe('Word in der Ladeanzeige (21.08.2026, Noahs Klicktest)', () => {
  const word = () => new File([new Uint8Array([1, 2, 3])], 'Mietvertrag.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  test('⚠️ eine Word-Datei landet NICHT mehr im PDF-Leser (dort blieb der Rahmen leer)', () => {
    const { queryByTestId } = render(
      <AnalysisOverlay show contractName="Mietvertrag.docx" progress={40} pdfFile={word()} />
    );
    expect(queryByTestId('pdf-leser')).not.toBeInTheDocument();
    expect(queryByTestId('pdf-seite')).not.toBeInTheDocument();
  });

  test('stattdessen erscheint das Platzhalter-Muster', () => {
    const { baseElement } = render(
      <AnalysisOverlay show contractName="Mietvertrag.docx" progress={40} pdfFile={word()} />
    );
    // Die grauen Zeilen tragen eine eigene Klasse aus dem CSS-Modul.
    const zeilen = baseElement.querySelectorAll('[class*="placeholderLine"]');
    expect(zeilen.length).toBeGreaterThan(5);
  });

  test('⚠️ Regression: eine PDF geht weiterhin in den PDF-Leser', () => {
    const { queryByTestId } = render(
      <AnalysisOverlay show contractName="Vertrag.pdf" progress={40} pdfFile={pdf()} />
    );
    expect(queryByTestId('pdf-leser')).toBeInTheDocument();
  });
});
