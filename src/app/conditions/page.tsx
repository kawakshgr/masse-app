import type { Metadata } from "next";
import { LegalPage, ToComplete } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Conditions d’utilisation — Masse" };

/** Draft, 29 Sep 2026 — to be reviewed by a lawyer before clients join. */
export default function TermsPage() {
  return (
    <LegalPage kicker="Masse" title="Conditions d’utilisation" updated="29 septembre 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Masse est un logiciel qui permet à un coach de suivre ses clients : programmes d’entraînement,
          bilans, nutrition, facturation. Ces conditions encadrent son utilisation par les coachs et par
          leurs clients.
        </p>
      </section>
      <section>
        <h2>2. Accès</h2>
        <p>
          Un client rejoint Masse sur invitation de son coach, avec un code à usage unique. L’accès est
          réservé aux personnes de <strong>18 ans et plus</strong>. La connexion se fait par lien ou par code
          envoyé par e-mail : garde l’accès à ta boîte mail pour toi.
        </p>
      </section>
      <section>
        <h2>3. Le coaching n’est pas un avis médical</h2>
        <p>
          Les programmes, plans alimentaires et conseils sont ceux de ton coach, sous sa responsabilité.
          Masse n’est ni un professionnel de santé ni un dispositif médical. En cas de blessure, de douleur
          ou de doute sur ta santé, consulte un médecin avant de t’entraîner.
        </p>
      </section>
      <section>
        <h2>4. Tes contenus</h2>
        <p>
          Tes photos, mesures et saisies restent les tiennes. Tu autorises ton coach et Masse à les
          conserver et les afficher dans le seul but de ton suivi, comme décrit dans la{" "}
          <a href="/confidentialite" className="text-[var(--accent)] underline">politique de confidentialité</a>.
        </p>
      </section>
      <section>
        <h2>5. Disponibilité</h2>
        <p>
          Masse est fourni tel quel ; l’éditeur fait de son mieux pour qu’il soit disponible et sûr, sans
          pouvoir garantir une disponibilité sans interruption. Tes séries saisies hors ligne restent sur
          ton téléphone jusqu’au retour de la connexion.
        </p>
      </section>
      <section>
        <h2>6. Fin du suivi et suppression</h2>
        <p>
          Tu peux supprimer ton compte à tout moment depuis Réglages → Mes données. Ton coach peut archiver
          ou retirer ton suivi. Les durées de conservation sont décrites dans la politique de
          confidentialité.
        </p>
      </section>
      <section>
        <h2>7. Droit applicable</h2>
        <p>
          Ces conditions sont régies par le droit français. Contact : <ToComplete>e-mail de contact</ToComplete>.
        </p>
      </section>
    </LegalPage>
  );
}
