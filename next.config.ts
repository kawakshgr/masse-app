import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // CLAUDE.md is a curated handoff document. Next appends its own block to it on
  // every `next dev` otherwise.
  agentRules: false,
  turbopack: {
    // A stray package-lock.json in the home directory otherwise wins the root
    // inference and Next ignores ours.
    root: __dirname,
  },
};

export default withNextIntl(nextConfig);
