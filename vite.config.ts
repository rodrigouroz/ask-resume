import { createHash } from "node:crypto";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import type { Plugin } from "vite";
import { profile, theme } from "./src/profile.ts";
import { profileSchema, themeSchema } from "./src/profileSchema.ts";
import { profileStructuredData, renderProfileHtml, robotsText, sitemapXml } from "./src/seo.ts";
import { workerRuntimeConfig } from "./src/workerRuntimeConfig.ts";

profileSchema.parse(profile);
themeSchema.parse(theme);

function headersText(): string {
  const structuredData = JSON.stringify(profileStructuredData).replaceAll("<", "\\u003c");
  const inlineScript = `\n      ${structuredData}\n    `;
  const scriptHash = createHash("sha256").update(inlineScript).digest("base64");
  return [
    "/*",
    `  Content-Security-Policy: default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self' 'sha256-${scriptHash}' https://static.cloudflareinsights.com; style-src 'self'; upgrade-insecure-requests`,
    "  Cross-Origin-Opener-Policy: same-origin",
    "  Cross-Origin-Resource-Policy: same-origin",
    "  Permissions-Policy: camera=(), geolocation=(), microphone=()",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "",
    `/${profile.pdf.visualFileName}`,
    `  Content-Disposition: attachment; filename="${profile.pdf.visualFileName}"`,
    "",
    `/${profile.pdf.atsFileName}`,
    `  Content-Disposition: attachment; filename="${profile.pdf.atsFileName}"`,
    "",
  ].join("\n");
}

const profileAssetsPlugin: Plugin = {
  name: "profile-assets",
  transformIndexHtml: renderProfileHtml,
  configureServer(server) {
    const generated = new Map<string, readonly [string, string]>([
      ["/robots.txt", ["text/plain; charset=utf-8", robotsText()]],
      ["/sitemap.xml", ["application/xml; charset=utf-8", sitemapXml()]],
      ["/_headers", ["text/plain; charset=utf-8", headersText()]],
    ]);
    server.middlewares.use((request, response, next) => {
      const asset = generated.get(request.url?.split("?")[0] ?? "");
      if (!asset) return next();
      response.setHeader("content-type", asset[0]);
      response.end(asset[1]);
    });
  },
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsText() });
    this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml() });
    this.emitFile({ type: "asset", fileName: "_headers", source: headersText() });
  },
};

export default defineConfig(({ mode }) => ({
  build: { assetsInlineLimit: 0 },
  publicDir: "profile/assets",
  plugins: [
    profileAssetsPlugin,
    react(),
    ...(mode === "e2e"
      ? []
      : [
          cloudflare({
            viteEnvironment: { name: profile.identity.slug.replaceAll("-", "_") },
            config: {
              name: profile.deployment.workerName,
              routes: [],
              workers_dev: true,
              ...workerRuntimeConfig(profile),
            },
          }),
        ]),
  ],
  test: { coverage: { reporter: ["text", "html", "json"] } },
}));
