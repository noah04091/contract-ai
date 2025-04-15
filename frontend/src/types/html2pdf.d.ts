declare module "html2pdf.js" {
  const html2pdf: {
    (): {
      from: (el: HTMLElement) => {
        set: (options: object) => any;
        save: () => Promise<void>;
      };
    };
  };
  export default html2pdf;
}
