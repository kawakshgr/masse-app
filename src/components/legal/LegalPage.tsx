import Link from "next/link";

/**
 * The shape of the three legal pages: public, readable signed out, in the
 * app's own grammar — a kicker, a title in capitals, numbered sections in
 * one glass panel. French: they are the version that binds.
 */
export function LegalPage({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="atmosphere" aria-hidden />
      <article className="glass lift mx-auto max-w-[760px] rounded-r4 p-6 sm:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent)]">{kicker}</p>
        <h1 className="mt-2 font-display text-[30px] font-extrabold uppercase leading-none tracking-[-.01em]">{title}</h1>
        <p className="mt-3 text-[12.5px] text-[var(--ink3)]">Dernière mise à jour : {updated}</p>
        <div className="mt-8 space-y-7 text-[14px] leading-[1.65] text-[var(--ink2)] [&_h2]:mb-2 [&_h2]:text-[12px] [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-[.12em] [&_h2]:text-[var(--ink)] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--ink)]">
          {children}
        </div>
        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--hair)] pt-5 text-[12.5px]">
          <Link href="/confidentialite" className="text-[var(--accent)]">Confidentialité</Link>
          <Link href="/mentions-legales" className="text-[var(--accent)]">Mentions légales</Link>
          <Link href="/conditions" className="text-[var(--accent)]">Conditions d’utilisation</Link>
          <Link href="/connexion" className="text-[var(--ink3)]">Retour à Masse</Link>
        </nav>
      </article>
    </main>
  );
}

/** Where the publisher's identity goes once it exists. Shown, never hidden:
 *  a legal page with a gap should say so, not paper over it. */
export function ToComplete({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-r1 bg-[color-mix(in_oklab,var(--a3)_18%,transparent)] px-1.5 py-0.5 font-semibold text-[var(--a3)]">
      [À compléter : {children}]
    </span>
  );
}
