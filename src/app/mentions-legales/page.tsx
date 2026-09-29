import type { Metadata } from "next";
import { LegalPage, ToComplete } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Mentions légales — Masse" };

/** Draft, 29 Sep 2026 — the publisher's identity is Kevin's to fill in. */
export default function LegalNoticePage() {
  return (
    <LegalPage kicker="Masse" title="Mentions légales" updated="29 septembre 2026">
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
