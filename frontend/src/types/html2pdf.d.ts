declare module "html2pdf.js" {
  const html2pdf: {
    (): {
      from: (el: HTMLElement) => {
        set: (options: Record<string, unknown>) => unknown;
        save: () => Promise<void>;
      };
    };
  };
  export default html2pdf;
}