import type { Metadata } from "next";
import { LegalPage, ToComplete, legalLang } from "@/components/legal/LegalPage";

type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: (await legalLang(searchParams)) === "en" ? "Legal notice — Masse" : "Mentions légales — Masse" };
}

/** Draft, 29 Sep 2026 — the contact e-mail is Kevin's to fill in. English added 30 Sep 2026. */
export default async function LegalNoticePage({ searchParams }: Props) {
  const lang = await legalLang(searchParams);

  if (lang === "en") {
    return (
      <LegalPage lang="en" path="/mentions-legales" kicker="Masse" title="Legal notice" updated="30 September 2026">
        <section>
          <h2>Publisher</h2>
          <p>
            Masse is published free of charge, on a non-professional basis, by a private individual:{" "}
            Kevin Cordeiro.
            <br />
            Contact: <ToComplete lang="en">contact e-mail</ToComplete>
          </p>
          <p className="mt-2">Publication director: Kevin Cordeiro</p>
          <p className="mt-2 text-[13px] text-[var(--ink3)]">
            In accordance with article 6-III-2 of the French law on confidence in the digital economy
            (LCEN), the publisher’s postal address has been given to the host.
          </p>
        </section>
        <section>
          <h2>Hosting</h2>
          <p>
            Application: Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States — run in
            Europe (Frankfurt).
            <br />
            Data: Supabase Inc., database hosted in the European Union (Frankfurt, Germany).
          </p>
        </section>
        <section>
          <h2>Intellectual property</h2>
          <p>
            The Masse software, its name and its interface belong to its publisher. The programmes, plans
            and content written by a coach remain the coach’s; a client’s photos and data remain the
            client’s.
          </p>
        </section>
        <section>
          <h2>Personal data</h2>
          <p>
            See the <a href="/confidentialite?lang=en" className="text-[var(--accent)] underline">privacy policy</a>.
          </p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage lang="fr" path="/mentions-legales" kicker="Masse" title="Mentions légales" updated="29 septembre 2026">
      <section>
        <h2>Éditeur</h2>
        <p>
          Masse est édité à titre non professionnel, gratuitement, par un particulier :{" "}
          Kevin Cordeiro.
          <br />
          Contact : <ToComplete>e-mail de contact</ToComplete>
        </p>
        <p className="mt-2">
          Directeur de la publication : Kevin Cordeiro
        </p>
        <p className="mt-2 text-[13px] text-[var(--ink3)]">
          Conformément à l’article 6-III-2 de la loi pour la confiance dans l’économie numérique, les
          coordonnées postales de l’éditeur ont été communiquées à l’hébergeur.
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          Application : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis — exécution
          en Europe (Francfort).
          <br />
          Données : Supabase Inc., base de données hébergée dans l’Union européenne (Francfort, Allemagne).
        </p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le logiciel Masse, son nom et son interface appartiennent à son éditeur. Les programmes, plans et
          contenus rédigés par un coach restent les siens ; les photos et données d’un client restent les
          siennes.
        </p>
      </section>
      <section>
        <h2>Données personnelles</h2>
        <p>
          Voir la <a href="/confidentialite" className="text-[var(--accent)] underline">politique de confidentialité</a>.
        </p>
      </section>
    </LegalPage>
  );
}
