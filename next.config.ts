import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // CLAUDE.md is a curated handoff document. Next appends its own block to it on
  // every `next dev` otherwise.
  agentRules: false,
  // The PDF renderer reads the vendored font files off disk. That path is built
  // at runtime, so tracing cannot see it and the deployed function would ship
  // without them — the invoice would render, in the wrong typeface or not at
  // all. Naming the folder here puts it in the bundle.
  outputFileTracingIncludes: {
    "/facturation/**": ["./assets/fonts/**"],
  },
  turbopack: {
    // A stray package-lock.json in the home directory otherwise wins the root
    // inference and Next ignores ours.
    root: __dirname,
  },
};

export default withNextIntl(nextConfig);
