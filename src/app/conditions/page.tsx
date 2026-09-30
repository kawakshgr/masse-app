import type { Metadata } from "next";
import { LegalPage, ToComplete, legalLang } from "@/components/legal/LegalPage";

type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: (await legalLang(searchParams)) === "en" ? "Terms of use — Masse" : "Conditions d’utilisation — Masse" };
}

/** Draft, 29 Sep 2026 — to be reviewed by a lawyer before clients join. English added 30 Sep 2026. */
export default async function TermsPage({ searchParams }: Props) {
  const lang = await legalLang(searchParams);

  if (lang === "en") {
    return (
      <LegalPage lang="en" path="/conditions" kicker="Masse" title="Terms of use" updated="30 September 2026">
        <section>
          <h2>1. Purpose</h2>
          <p>
            Masse is software that lets a coach follow their clients: training programmes, check-ins,
            nutrition, invoicing. These terms govern its use by coaches and by their clients.
          </p>
        </section>
        <section>
          <h2>2. Access</h2>
          <p>
            A client joins Masse at their coach’s invitation, with a single-use code. Access is reserved for
            people aged <strong>18 and over</strong>. You sign in with a link or a code sent by e-mail: keep
            access to your mailbox to yourself.
          </p>
        </section>
        <section>
          <h2>3. Coaching is not medical advice</h2>
          <p>
            The programmes, meal plans and advice are your coach’s, under their responsibility. Masse is
            neither a health professional nor a medical device. If you are injured, in pain or unsure about
            your health, see a doctor before training.
          </p>
        </section>
        <section>
          <h2>4. Your content</h2>
          <p>
            Your photos, measurements and entries remain yours. You allow your coach and Masse to keep and
            display them for the sole purpose of your coaching, as described in the{" "}
            <a href="/confidentialite?lang=en" className="text-[var(--accent)] underline">privacy policy</a>.
          </p>
        </section>
        <section>
          <h2>5. Availability</h2>
          <p>
            Masse is provided as is; the publisher does their best to keep it available and secure, without
            being able to guarantee uninterrupted service. Sets you log offline stay on your phone until the
            connection returns.
          </p>
        </section>
        <section>
          <h2>6. End of coaching and deletion</h2>
          <p>
            You can delete your account at any time from Settings → My data. Your coach can archive or
            remove your file. Retention periods are described in the privacy policy.
          </p>
        </section>
        <section>
          <h2>7. Governing law</h2>
          <p>
            These terms are governed by French law. Contact: <ToComplete lang="en">contact e-mail</ToComplete>.
          </p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage lang="fr" path="/conditions" kicker="Masse" title="Conditions d’utilisation" updated="29 septembre 2026">
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
