// 📄 src/components/StructuredData.tsx
import { useEffect } from "react";

interface StructuredDataProps {
  type: "Organization" | "WebSite" | "SoftwareApplication" | "Article" | "FAQPage";
  data?: Record<string, unknown>;
}

/**
 * Schema.org Structured Data für bessere Google Rich Results
 * Verbessert Sichtbarkeit in der Google Search Console
 */
export default function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    const existingScript = document.getElementById(`structured-data-${type}`);
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = `structured-data-${type}`;
    script.type = "application/ld+json";

    let structuredData: Record<string, unknown> = {};

    switch (type) {
      case "Organization":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Contract AI",
          description: "KI-gestützte Vertragsanalyse und -optimierung für Unternehmen und Privatpersonen",
          url: "https://www.contract-ai.de",
          logo: "https://contract-ai.de/logo.png",
          sameAs: [
            "https://www.linkedin.com/company/contract-ai",
            "https://twitter.com/contract_ai",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "Customer Support",
            email: "support@contract-ai.de",
            availableLanguage: ["German"],
          },
          ...data,
        };
        break;

      case "WebSite":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Contract AI",
          url: "https://www.contract-ai.de",
          description: "Verträge analysieren, optimieren und verwalten mit KI",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://www.contract-ai.de/blog?search={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
          ...data,
        };
        break;

      case "SoftwareApplication":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Contract AI",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "127",
          },
          description: "KI-gestützte Vertragsanalyse, Optimierung und Vertragsmanagement-Software",
          ...data,
        };
        break;

      case "Article":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Article",
          publisher: {
            "@type": "Organization",
            name: "Contract AI",
            logo: {
              "@type": "ImageObject",
              url: "https://contract-ai.de/logo.png",
            },
          },
          ...data,
        };
        break;

      case "FAQPage":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          ...data,
        };
        break;

      default:
        break;
    }

    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById(`structured-data-${type}`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type, data]);

  return null;
}
