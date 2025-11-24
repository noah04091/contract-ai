// 📄 src/components/StructuredData.tsx
import { useEffect } from "react";

type SchemaType =
  | "Organization"
  | "WebSite"
  | "SoftwareApplication"
  | "Article"
  | "FAQPage"
  | "BreadcrumbList"
  | "Product"
  | "Service"
  | "LocalBusiness"
  | "HowTo"
  | "Review";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface StructuredDataProps {
  type: SchemaType;
  data?: Record<string, unknown>;
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Schema.org Structured Data für bessere Google Rich Results
 * Verbessert Sichtbarkeit in der Google Search Console
 *
 * Unterstützte Schema-Typen:
 * - Organization: Unternehmensinformationen
 * - WebSite: Website mit Suchfunktion
 * - SoftwareApplication: Software/App Details
 * - Article: Blog-Artikel
 * - FAQPage: FAQ-Seiten
 * - BreadcrumbList: Breadcrumb-Navigation
 * - Product: Produktinformationen
 * - Service: Dienstleistungen
 * - LocalBusiness: Lokales Unternehmen
 * - HowTo: Anleitungen
 * - Review: Bewertungen
 */
export default function StructuredData({ type, data, breadcrumbs }: StructuredDataProps) {
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
          "@id": "https://www.contract-ai.de/#organization",
          name: "Contract AI",
          legalName: "Contract AI GmbH",
          description: "KI-gestützte Vertragsanalyse und -optimierung für Unternehmen und Privatpersonen",
          url: "https://www.contract-ai.de",
          logo: {
            "@type": "ImageObject",
            url: "https://www.contract-ai.de/logo.png",
            width: 512,
            height: 512,
          },
          image: "https://www.contract-ai.de/og-image.jpg",
          sameAs: [
            "https://www.linkedin.com/company/contract-ai",
            "https://twitter.com/contract_ai",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "Customer Support",
            email: "support@contract-ai.de",
            availableLanguage: ["German", "English"],
            areaServed: ["DE", "AT", "CH"],
          },
          foundingDate: "2024",
          slogan: "Verträge analysieren & optimieren mit KI",
          knowsAbout: [
            "Vertragsanalyse",
            "Vertragsoptimierung",
            "Legal Tech",
            "Künstliche Intelligenz",
            "Vertragsmanagement",
            "DSGVO-Compliance",
          ],
          ...data,
        };
        break;

      case "WebSite":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://www.contract-ai.de/#website",
          name: "Contract AI",
          url: "https://www.contract-ai.de",
          description: "Verträge analysieren, optimieren und verwalten mit KI",
          publisher: {
            "@id": "https://www.contract-ai.de/#organization",
          },
          inLanguage: "de-DE",
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
          "@id": "https://www.contract-ai.de/#software",
          name: "Contract AI",
          applicationCategory: "BusinessApplication",
          applicationSubCategory: "Legal Tech Software",
          operatingSystem: "Web, iOS, Android",
          browserRequirements: "Requires JavaScript. Requires HTML5.",
          softwareVersion: "2.0",
          releaseNotes: "https://www.contract-ai.de/blog",
          screenshot: "https://www.contract-ai.de/og-image.jpg",
          featureList: [
            "KI-gestützte Vertragsanalyse",
            "Automatische Risikoerkennung",
            "Vertragsoptimierung",
            "Fristenverwaltung",
            "Vertragsvergleich",
            "Vertragsgenerator",
            "Legal Pulse News",
            "Digitale Signatur",
          ],
          offers: [
            {
              "@type": "Offer",
              name: "Free",
              price: "0",
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
              priceValidUntil: "2025-12-31",
            },
            {
              "@type": "Offer",
              name: "Premium",
              price: "9.90",
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
              priceValidUntil: "2025-12-31",
              billingIncrement: "P1M",
            },
            {
              "@type": "Offer",
              name: "Business",
              price: "19.90",
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
              priceValidUntil: "2025-12-31",
              billingIncrement: "P1M",
            },
          ],
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            bestRating: "5",
            worstRating: "1",
            ratingCount: "127",
            reviewCount: "89",
          },
          description: "KI-gestützte Vertragsanalyse, Optimierung und Vertragsmanagement-Software für Unternehmen und Privatpersonen",
          provider: {
            "@id": "https://www.contract-ai.de/#organization",
          },
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
              url: "https://www.contract-ai.de/logo.png",
              width: 512,
              height: 512,
            },
          },
          author: {
            "@type": "Organization",
            name: "Contract AI Redaktion",
            url: "https://www.contract-ai.de/about",
          },
          isAccessibleForFree: true,
          ...data,
        };
        break;

      case "FAQPage":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: data?.mainEntity || [],
          ...data,
        };
        break;

      case "BreadcrumbList":
        if (breadcrumbs && breadcrumbs.length > 0) {
          structuredData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              item: item.url,
            })),
          };
        }
        break;

      case "Product":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Contract AI",
          description: "KI-gestützte Vertragsanalyse und -optimierung",
          brand: {
            "@type": "Brand",
            name: "Contract AI",
          },
          category: "Software > Legal Tech",
          audience: {
            "@type": "Audience",
            audienceType: "Unternehmen, Freelancer, Privatpersonen",
          },
          ...data,
        };
        break;

      case "Service":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Legal Tech Service",
          provider: {
            "@id": "https://www.contract-ai.de/#organization",
          },
          areaServed: {
            "@type": "Country",
            name: "Germany",
          },
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: "https://www.contract-ai.de",
            servicePhone: "",
            availableLanguage: ["German", "English"],
          },
          ...data,
        };
        break;

      case "LocalBusiness":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://www.contract-ai.de/#localbusiness",
          name: "Contract AI",
          image: "https://www.contract-ai.de/og-image.jpg",
          url: "https://www.contract-ai.de",
          priceRange: "€-€€€",
          ...data,
        };
        break;

      case "HowTo":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "HowTo",
          ...data,
        };
        break;

      case "Review":
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Review",
          itemReviewed: {
            "@type": "SoftwareApplication",
            name: "Contract AI",
          },
          author: {
            "@type": "Person",
          },
          reviewRating: {
            "@type": "Rating",
            bestRating: "5",
            worstRating: "1",
          },
          ...data,
        };
        break;

      default:
        break;
    }

    if (Object.keys(structuredData).length > 0) {
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const scriptToRemove = document.getElementById(`structured-data-${type}`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type, data, breadcrumbs]);

  return null;
}

/**
 * Helper-Komponente für mehrere Schema-Typen auf einer Seite
 */
export function MultipleStructuredData({ schemas }: { schemas: StructuredDataProps[] }) {
  return (
    <>
      {schemas.map((schema, index) => (
        <StructuredData key={`${schema.type}-${index}`} {...schema} />
      ))}
    </>
  );
}
