// src/types/html2pdf.d.ts
declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { 
      type?: string; 
      quality?: number 
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      letterRendering?: boolean;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
    };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    save(): Promise<void>;
    outputPdf(): Promise<Blob>;
  }

  function html2pdf(): Html2Pdf;
  function html2pdf(element: HTMLElement | string, options?: Html2PdfOptions): Html2Pdf;

  export default html2pdf;
}