import Link from "next/link";
import { getLocale } from "next-intl/server";

export type LegalLang = "fr" | "en";

/**
 * Which language a legal page is read in: `?lang=` when the reader asked,
 * otherwise the app's own language. These pages are public, so the choice
 * must work signed out — hence the link, not only the cookie.
 */
export async function legalLang(searchParams: Promise<{ lang?: string }>): Promise<LegalLang> {
  const { lang } = await searchParams;
  if (lang === "en" || lang === "fr") return lang;
  return (await getLocale()) === "en" ? "en" : "fr";
}

const WORDS = {
  fr: {
    updated: "Dernière mise à jour",
    privacy: "Confidentialité",
    legal: "Mentions légales",
    terms: "Conditions d’utilisation",
    back: "Retour à Masse",
    other: "English version",
    toComplete: "À compléter",
    binding: null as string | null,
  },
  en: {
    updated: "Last updated",
    privacy: "Privacy",
    legal: "Legal notice",
    terms: "Terms of use",
    back: "Back to Masse",
    other: "Version française",
    toComplete: "To complete",
    binding:
      "This English version is provided for convenience. If it differs from the French version, the French version prevails.",
  },
} as const;

/**
 * The shape of the three legal pages: public, readable signed out, in the
 * app's own grammar — a kicker, a title in capitals, numbered sections in
 * one glass panel. Written in French and in English; the French binds.
 */
export function LegalPage({
  lang,
  path,
  kicker,
  title,
  updated,
  children,
}: {
  lang: LegalLang;
  /** This page's own path, for the link to its other language. */
  path: string;
  kicker: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const w = WORDS[lang];
  const q = lang === "en" ? "?lang=en" : "";
  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="atmosphere" aria-hidden />
      <article className="glass lift mx-auto max-w-[760px] rounded-r4 p-6 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">{kicker}</p>
          <Link
            href={`${path}?lang=${lang === "en" ? "fr" : "en"}`}
            className="shrink-0 text-[12px] font-semibold text-[var(--accent)]"
          >
            {w.other}
          </Link>
        </div>
        <h1 className="mt-2 font-display text-[30px] font-extrabold uppercase leading-none tracking-[-.01em]">{title}</h1>
        <p className="mt-3 text-[12.5px] text-[var(--ink3)]">
          {w.updated}
          {lang === "fr" ? " : " : ": "}
          {updated}
        </p>
        {w.binding && <p className="mt-2 text-[12.5px] leading-[1.5] text-[var(--ink3)]">{w.binding}</p>}
        <div className="mt-8 space-y-7 text-[14px] leading-[1.65] text-[var(--ink2)] [&_h2]:mb-2 [&_h2]:text-[12px] [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-[.12em] [&_h2]:text-[var(--ink)] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--ink)]">
          {children}
        </div>
        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--hair)] pt-5 text-[12.5px]">
          <Link href={`/confidentialite${q}`} className="text-[var(--accent)]">{w.privacy}</Link>
          <Link href={`/mentions-legales${q}`} className="text-[var(--accent)]">{w.legal}</Link>
          <Link href={`/conditions${q}`} className="text-[var(--accent)]">{w.terms}</Link>
          <Link href="/connexion" className="text-[var(--ink3)]">{w.back}</Link>
        </nav>
      </article>
    </main>
  );
}

/** Where the publisher's identity goes once it exists. Shown, never hidden:
 *  a legal page with a gap should say so, not paper over it. */
export function ToComplete({ children, lang = "fr" }: { children: React.ReactNode; lang?: LegalLang }) {
  return (
    <span className="rounded-r1 bg-[color-mix(in_oklab,var(--a3)_18%,transparent)] px-1.5 py-0.5 font-semibold text-[var(--a3)]">
      [{WORDS[lang].toComplete}
      {lang === "fr" ? " : " : ": "}
      {children}]
    </span>
  );
}
