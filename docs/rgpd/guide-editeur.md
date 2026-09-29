# Ce qu'il reste à faire — pas à pas

## 1. Choisir un statut (si Masse est payant)
- Le plus simple : **micro-entreprise**, sur formalites.entreprises.gouv.fr
  (gratuit, SIRET en 1 à 2 semaines). Activité : prestation de services
  informatiques / logiciel en ligne.
- Tant que Masse reste gratuit entre toi et Lucie, tu peux publier en ton nom.
- Un expert-comptable ou la CCI confirme en un rendez-vous.

## 2. Remplir les `[À compléter]`
Envoie-moi : nom (ou entreprise), statut + SIRET, adresse postale, e-mail de
contact. Je les mets dans `/mentions-legales`, `/confidentialite`,
`/conditions` et dans les documents de ce dossier.

## 3. Accepter les contrats des prestataires (DPA)
- **Supabase** : dashboard → ton organisation → *Legal Documents* → DPA.
- **Vercel** : le DPA fait partie des conditions ; vérifie dans *Team
  Settings* s'il y a une étape de signature.
- **Brevo** : dans ton compte, section conformité / RGPD.

## 4. Activer la purge automatique
Sur Vercel (projet `masse-app` → Settings → Environment Variables) :
- `SUPABASE_SERVICE_ROLE_KEY` : Supabase → Project Settings → API → clé
  *service_role* (secrète : jamais dans le code, jamais partagée).
- `CRON_SECRET` : une longue chaîne aléatoire de ton choix.
Puis redéploie. La tâche tourne chaque nuit à 3 h.

## 5. Contrat avec chaque coach
Imprime ou signe électroniquement `contrat-coach.md` avec Lucie (et chaque
futur coach).

## 6. Relecture
Fais relire les trois pages publiques et ce dossier par un juriste avant
d'ouvrir Masse à des clients réels.
