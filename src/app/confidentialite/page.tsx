import type { Metadata } from "next";
import { LegalPage, ToComplete } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité — Masse" };

/** Draft, 29 Sep 2026 — to be reviewed by a lawyer before clients join. */
export default function PrivacyPage() {
  return (
    <LegalPage kicker="Masse" title="Politique de confidentialité" updated="29 septembre 2026">
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
          <li><strong>Questionnaire d’arrivée</strong> : ancienneté d’entraînement, séances par semaine, objectif, ce qui t’a freiné, motivation, temps disponible, créneaux d’appel.</li>
          <li><strong>Entraînement</strong> : programme reçu, séries, répétitions et charges saisies.</li>
          <li><strong>Bilans</strong> : poids, mensurations, réponses, et trois photos par bilan.</li>
          <li><strong>Nutrition</strong> : plan, repas saisis, compléments.</li>
          <li><strong>Données de santé, avec ton accord explicite</strong> : blessures et contre-indications, dates de cycle (jamais de symptômes), sommeil. Les pas sont saisis à la main.</li>
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
          reste, écris à ton coach ou à <ToComplete>e-mail de contact</ToComplete>.
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
