// 📄 src/components/SEO.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
}

/**
 * SEO Component für dynamische Meta-Tags pro Route
 * Verbessert Google Search Console Performance durch route-spezifische Optimierung
 */
export default function SEO({
  title = "Contract AI – Verträge analysieren & optimieren mit KI",
  description = "Analysiere, optimiere und verwalte deine Verträge mit KI. Contract AI bietet dir volle Kontrolle, rechtliche Sicherheit und smarte Features in einer Plattform.",
  keywords = "Vertragsanalyse, KI, Vertragsoptimierung, Vertragsmanagement, Legal Tech, DSGVO",
  image = "https://www.contract-ai.de/og-image.jpg",
  type = "website",
  noindex = false,
}: SEOProps) {
  const location = useLocation();
  const canonicalUrl = `https://www.contract-ai.de${location.pathname}`;

  useEffect(() => {
    // Title setzen
    document.title = title;

    // Meta-Tags dynamisch updaten
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    // Standard Meta Tags
    updateMetaTag("description", description);
    updateMetaTag("keywords", keywords);
    updateMetaTag("robots", noindex ? "noindex,nofollow" : "index,follow");

    // Open Graph
    updateMetaTag("og:title", title, true);
    updateMetaTag("og:description", description, true);
    updateMetaTag("og:image", image, true);
    updateMetaTag("og:url", canonicalUrl, true);
    updateMetaTag("og:type", type, true);
    updateMetaTag("og:site_name", "Contract AI", true);

    // Twitter Card
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", image);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }, [title, description, keywords, image, type, noindex, canonicalUrl]);

  return null;
}
