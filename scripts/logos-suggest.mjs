const [company, domain] = process.argv.slice(2);

if (!company || !domain || !/^[a-z0-9.-]+$/i.test(domain)) {
  throw new Error('Usage: npm run logos:suggest -- "Company name" company.example');
}

const lines = [
  `Logo candidates for ${company}:`,
  `1. Official source: https://${domain}/`,
  `2. Logo.dev preview template: https://img.logo.dev/${domain}?token=YOUR_PUBLISHABLE_KEY`,
  "3. Argentina-focused discovery: https://loguitos.app/docs",
  "",
  "Verify trademark provenance and usage terms, then save an approved SVG/PNG under profile/assets/brands/.",
  "The application never downloads a candidate automatically and never calls these services at runtime.",
];

process.stdout.write(`${lines.join("\n")}\n`);
