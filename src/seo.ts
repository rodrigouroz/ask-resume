import { evidenceConfig } from "./evidence.ts";
import { profile } from "./profile.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const canonicalUrl = new URL("/", profile.seo.baseUrl).toString();
const socialImageUrl = new URL(profile.assets.socialImage, canonicalUrl).toString();

export const profileStructuredData = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: canonicalUrl,
  name: profile.seo.title,
  description: profile.seo.profileDescription,
  mainEntity: {
    "@type": "Person",
    "@id": `${canonicalUrl}#${profile.identity.slug}`,
    name: profile.identity.name,
    url: canonicalUrl,
    jobTitle: profile.identity.jobTitle,
    description: profile.seo.profileDescription,
    sameAs: profile.seo.sameAs,
    worksFor: {
      "@type": "Organization",
      name: profile.seo.worksFor.name,
      url: profile.seo.worksFor.url,
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: profile.seo.alumniOf,
    },
    knowsLanguage: profile.seo.knowsLanguage,
  },
};

const replacements: Readonly<Record<string, string>> = {
  "{{PROFILE_TITLE}}": profile.seo.title,
  "{{PROFILE_DESCRIPTION}}": profile.seo.description,
  "{{PROFILE_AUTHOR}}": profile.identity.name,
  "{{PROFILE_CANONICAL_URL}}": canonicalUrl,
  "{{PROFILE_FAVICON}}": `/${profile.assets.favicon}`,
  "{{PROFILE_SOCIAL_DESCRIPTION}}": profile.seo.socialDescription,
  "{{PROFILE_SITE_NAME}}": profile.seo.siteName,
  "{{PROFILE_LOCALE}}": profile.seo.locale,
  "{{PROFILE_FIRST_NAME}}": profile.identity.firstName,
  "{{PROFILE_LAST_NAME}}": profile.identity.lastName,
  "{{PROFILE_SOCIAL_IMAGE}}": socialImageUrl,
  "{{PROFILE_SOCIAL_IMAGE_WIDTH}}": String(profile.assets.socialImageWidth),
  "{{PROFILE_SOCIAL_IMAGE_HEIGHT}}": String(profile.assets.socialImageHeight),
  "{{PROFILE_SOCIAL_IMAGE_ALT}}": profile.assets.socialImageAlt,
};

export function renderProfileHtml(template: string): string {
  let html = template;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, escapeHtml(value));
  }
  return html.replace(
    "{{PROFILE_STRUCTURED_DATA}}",
    JSON.stringify(profileStructuredData).replaceAll("<", "\\u003c"),
  );
}

export function robotsText(): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${new URL("sitemap.xml", canonicalUrl)}\n`;
}

export function sitemapXml(): string {
  const reviewedDates = evidenceConfig.items.flatMap(({ facts }) =>
    facts.map(({ reviewedAt }) => reviewedAt),
  );
  const lastModified = reviewedDates.toSorted().at(-1);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${canonicalUrl}</loc>`,
    ...(lastModified ? [`    <lastmod>${lastModified}</lastmod>`] : []),
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}
