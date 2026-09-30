import type { Metadata } from "next";
import { ContactEmail, LegalPage, legalLang } from "@/components/legal/LegalPage";

type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return {
    title: (await legalLang(searchParams)) === "en" ? "Privacy policy — Masse" : "Politique de confidentialité — Masse",
  };
}

/** Draft, 29 Sep 2026 — to be reviewed by a lawyer before clients join. English added 30 Sep 2026. */
export default async function PrivacyPage({ searchParams }: Props) {
  const lang = await legalLang(searchParams);

  if (lang === "en") {
    return (
      <LegalPage lang="en" path="/confidentialite" kicker="Masse" title="Privacy policy" updated="30 September 2026">
        <section>
          <h2>1. Who is responsible for your data?</h2>
          <p>
            Masse is coaching software. <strong>Your coach</strong> is the controller of the data of your
            coaching: they decide what is asked and why. <strong>Masse</strong>, published by Kevin
            Cordeiro, hosts and processes it on the coach’s behalf, as a processor (article 28 of the GDPR).
            For the coaches’ own accounts, Masse is the controller.
          </p>
        </section>

        <section>
          <h2>2. Which data?</h2>
          <ul>
            <li><strong>Identity and contact</strong>: first name, last name, date of birth, e-mail, WhatsApp number, Instagram account if you give it.</li>
            <li><strong>Intake questionnaire</strong>: training experience, sessions per week, goal, what has held you back, motivation, time available.</li>
            <li><strong>Video calls</strong>: the slot you book with your coach, and its cancellation if any.</li>
            <li><strong>Training</strong>: the programme you receive, the sets, reps and loads you log.</li>
            <li><strong>Check-ins</strong>: weight, measurements, answers, and three photos per check-in.</li>
            <li><strong>Nutrition</strong>: plan, meals logged, supplements.</li>
            <li><strong>Health data, with your explicit consent</strong>: injuries and contraindications, pain you report during a session, cycle dates (never symptoms), sleep. Steps are typed by hand.</li>
            <li><strong>Invoicing</strong>: amounts, invoices issued by your coach.</li>
          </ul>
          <p className="mt-2">
            Your <strong>symptom notes</strong> never leave your phone: they are stored on the device only.
          </p>
        </section>

        <section>
          <h2>3. Why, and on what basis?</h2>
          <ul>
            <li><strong>Providing your coaching</strong> (programme, check-ins, nutrition): performance of the coaching contract (article 6.1.b).</li>
            <li><strong>Health data</strong>: your explicit consent (article 9.2.a), which you can withdraw at any time.</li>
            <li><strong>Invoicing</strong>: legal obligation (article 6.1.c).</li>
          </ul>
          <p className="mt-2">No advertising, no resale, no trackers, no profiling.</p>
        </section>

        <section>
          <h2>4. Who has access?</h2>
          <p>
            <strong>Your coach, and no one else.</strong> The database itself enforces it: a coach sees only
            their clients, a client sees only their own data. The technical providers that run Masse:
          </p>
          <ul>
            <li><strong>Supabase</strong> — database, photo storage, sign-in — servers in the European Union (Frankfurt, Germany).</li>
            <li><strong>Vercel</strong> — hosting of the application — run in Europe (Frankfurt). Vercel Inc. is a US company: any transfers are covered by the Data Privacy Framework and the European Commission’s standard contractual clauses.</li>
            <li><strong>Brevo</strong> — sending of sign-in e-mails and invoices — a French company.</li>
          </ul>
        </section>

        <section>
          <h2>5. For how long?</h2>
          <ul>
            <li>For as long as your coaching lasts.</li>
            <li>When your coach archives your file: <strong>photos erased after 3 months</strong>, <strong>everything else after 12 months</strong>, automatically.</li>
            <li>If your sign-up is a request your coach has to approve: <strong>everything is erased at once</strong> if your coach refuses it or if you withdraw it.</li>
            <li>If you delete your account: everything is erased at once.</li>
            <li><strong>Exception: invoices</strong> are kept for 10 years by your coach, as French law requires (Commercial Code, article L123-22).</li>
          </ul>
        </section>

        <section>
          <h2>6. Your rights</h2>
          <p>
            You can access your data, correct it, erase it, get it back in a file (portability), object to
            or ask to restrict a processing, and withdraw your consent for your health data. Almost all of
            it can be done on your own, in the app: <strong>Settings → My data</strong> (download, withdraw
            consent, delete the account) and <strong>Settings → My details</strong>. For anything else,
            write to your coach or to <ContactEmail />.
          </p>
          <p className="mt-2">
            If you believe your rights are not respected, you can lodge a complaint with the French data
            protection authority, the CNIL (cnil.fr), or with the authority of your own country.
          </p>
        </section>

        <section>
          <h2>7. Security</h2>
          <p>
            Data hosted in Europe, encrypted connections, photos in a private space only you and your coach
            can reach, access limited by the database itself. Every reading of client data by a platform
            administrator is logged, with a reason.
          </p>
        </section>

        <section>
          <h2>8. Cookies and local storage</h2>
          <p>
            Masse uses only what it needs to work: the sign-in cookie and the language cookie. Your phone
            also keeps locally your theme, the sets you log offline and your symptom notes. No advertising
            cookie, no audience measurement: so no banner is needed.
          </p>
        </section>

        <section>
          <h2>9. Age</h2>
          <p>Masse is reserved for people aged <strong>18 and over</strong>.</p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage lang="fr" path="/confidentialite" kicker="Masse" title="Politique de confidentialité" updated="30 septembre 2026">
      <section>
        <h2>1. Qui est responsable de tes données ?</h2>
        <p>
          Masse est un logiciel de coaching. <strong>Ton coach</strong> est responsable des données de son
          suivi : c’est lui qui décide de ce qui est demandé et pourquoi. <strong>Masse</strong>, édité par{" "}
          Kevin Cordeiro, les héberge et les traite pour son compte, comme
          sous-traitant (article 28 du RGPD). Pour les comptes des coachs eux-mêmes, Masse est responsable
          du traitement.
        </p>
      </section>

      <section>
        <h2>2. Quelles données ?</h2>
        <ul>
          <li><strong>Identité et contact</strong> : prénom, nom, date de naissance, e-mail, numéro WhatsApp, compte Instagram si tu le donnes.</li>
          <li><strong>Questionnaire d’arrivée</strong> : ancienneté d’entraînement, séances par semaine, objectif, ce qui t’a freiné, motivation, temps disponible.</li>
          <li><strong>Rendez-vous visio</strong> : le créneau que tu réserves avec ton coach, et son annulation éventuelle.</li>
          <li><strong>Entraînement</strong> : programme reçu, séries, répétitions et charges saisies.</li>
          <li><strong>Bilans</strong> : poids, mensurations, réponses, et trois photos par bilan.</li>
          <li><strong>Nutrition</strong> : plan, repas saisis, compléments.</li>
          <li><strong>Données de santé, avec ton accord explicite</strong> : blessures et contre-indications, douleurs que tu signales pendant une séance, dates de cycle (jamais de symptômes), sommeil. Les pas sont saisis à la main.</li>
          <li><strong>Facturation</strong> : montants, factures émises par ton coach.</li>
        </ul>
        <p className="mt-2">
          Tes <strong>notes de symptômes</strong> ne quittent jamais ton téléphone : elles ne sont stockées que sur l’appareil.
        </p>
      </section>

      <section>
        <h2>3. Pourquoi, et sur quelle base ?</h2>
        <ul>
          <li><strong>Assurer ton suivi</strong> (programme, bilans, nutrition) : exécution du contrat de coaching (article 6.1.b).</li>
          <li><strong>Données de santé</strong> : ton consentement explicite (article 9.2.a), que tu peux retirer à tout moment.</li>
          <li><strong>Facturation</strong> : obligation légale (article 6.1.c).</li>
        </ul>
        <p className="mt-2">Aucune publicité, aucune revente, aucun traceur, aucun profilage.</p>
      </section>

      <section>
        <h2>4. Qui y a accès ?</h2>
        <p>
          <strong>Ton coach, et lui seul.</strong> La base de données elle-même l’impose : un coach ne voit que ses
          clients, un client ne voit que ses données. Les prestataires techniques qui font tourner Masse :
        </p>
        <ul>
          <li><strong>Supabase</strong> — base de données, stockage des photos, connexion — serveurs dans l’Union européenne (Francfort, Allemagne).</li>
          <li><strong>Vercel</strong> — hébergement de l’application — exécution en Europe (Francfort). Vercel Inc. est une société américaine : les transferts éventuels sont encadrés par le Data Privacy Framework et les clauses contractuelles types de la Commission européenne.</li>
          <li><strong>Brevo</strong> — envoi des e-mails de connexion et des factures — société française.</li>
        </ul>
      </section>

      <section>
        <h2>5. Combien de temps ?</h2>
        <ul>
          <li>Pendant toute la durée de ton suivi.</li>
          <li>Quand ton coach archive ton suivi : <strong>photos effacées après 3 mois</strong>, <strong>tout le reste après 12 mois</strong>, automatiquement.</li>
          <li>Si ton inscription est une demande que ton coach doit valider : <strong>tout est effacé immédiatement</strong> si ton coach la refuse ou si tu la retires.</li>
          <li>Si tu supprimes ton compte : tout est effacé immédiatement.</li>
          <li><strong>Exception : les factures</strong> sont conservées 10 ans par ton coach, comme la loi l’impose (Code de commerce, article L123-22).</li>
        </ul>
      </section>

      <section>
        <h2>6. Tes droits</h2>
        <p>
          Tu peux accéder à tes données, les corriger, les effacer, les récupérer dans un fichier
          (portabilité), t’opposer à un traitement ou en demander la limitation, et retirer ton accord pour
          tes données de santé. Presque tout se fait seul, dans l’app : <strong>Réglages → Mes données</strong>{" "}
          (télécharger, retirer l’accord, supprimer le compte) et <strong>Réglages → Mes infos</strong>. Pour le
          reste, écris à ton coach ou à <ContactEmail />.
        </p>
        <p className="mt-2">
          Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la CNIL (cnil.fr).
        </p>
      </section>

      <section>
        <h2>7. Sécurité</h2>
        <p>
          Données hébergées en Europe, connexions chiffrées, photos dans un espace privé accessible
          seulement à toi et à ton coach, accès limités par la base de données elle-même. Chaque lecture
          de données client par un administrateur de la plateforme est tracée, avec un motif.
        </p>
      </section>

      <section>
        <h2>8. Cookies et stockage local</h2>
        <p>
          Masse n’utilise que ce qui est nécessaire à son fonctionnement : le cookie de connexion et celui
          de la langue. Ton téléphone garde aussi localement ton thème, tes séries saisies hors ligne et tes
          notes de symptômes. Pas de cookie publicitaire ni de mesure d’audience : aucun bandeau n’est donc
          nécessaire.
        </p>
      </section>

      <section>
        <h2>9. Âge</h2>
        <p>Masse est réservé aux personnes de <strong>18 ans et plus</strong>.</p>
      </section>
    </LegalPage>
  );
}
