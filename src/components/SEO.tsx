import { useEffect } from "react";

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image";
}

const DEFAULT_OG_IMAGE = "https://traviska.com/favicon-512x512.png";

/**
 * Reusable SEO metadata manager.
 * Updates the document head in-place to guarantee zero duplicate tags.
 */
export function SEO({
  title,
  description,
  canonical,
  robots = "index, follow",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  twitterCard = "summary",
}: SEOProps) {
  useEffect(() => {
    // 1. Document title
    if (title) {
      document.title = title;
    }

    // Helper: Find existing meta tag or create exactly one
    const updateMeta = (
      selector: string,
      attrName: "name" | "property",
      attrVal: string,
      content: string | undefined
    ) => {
      if (content === undefined) return;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // 2. Standard description
    updateMeta('meta[name="description"]', "name", "description", description);

    // 3. Robots indexing directive
    updateMeta('meta[name="robots"]', "name", "robots", robots);

    // 4. Self-referencing canonical link
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute("href", canonical);
    } else if (canonicalEl) {
      canonicalEl.remove();
    }

    // 5. Open Graph tags
    updateMeta('meta[property="og:title"]', "property", "og:title", title);
    updateMeta('meta[property="og:description"]', "property", "og:description", description);
    updateMeta('meta[property="og:type"]', "property", "og:type", ogType);
    updateMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    if (canonical) {
      updateMeta('meta[property="og:url"]', "property", "og:url", canonical);
    }

    // 6. Twitter Card tags
    updateMeta('meta[name="twitter:card"]', "name", "twitter:card", twitterCard);
    updateMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    updateMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    updateMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
  }, [title, description, canonical, robots, ogType, ogImage, twitterCard]);

  return null;
}

export default SEO;

