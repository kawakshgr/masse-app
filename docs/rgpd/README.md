# RGPD — Masse

Brouillons rédigés le 29 septembre 2026. **À faire relire par un juriste avant
d'ouvrir Masse à des clients.** Les passages `[À compléter]` attendent
l'identité de l'éditeur (voir `guide-editeur.md`).

| Document | Pour quoi |
|---|---|
| `registre.md` | Registre des traitements (article 30) — obligatoire |
| `aipd.md` | Analyse d'impact (article 35) — données de santé |
| `sous-traitants.md` | Qui traite quoi, où, sous quel contrat |
| `contrat-coach.md` | Contrat de sous-traitance Masse ↔ coach (article 28) |
| `guide-editeur.md` | Ce que l'éditeur doit faire lui-même, pas à pas |

## Ce que l'app fait déjà

- Consentement explicite aux données de santé à l'inscription, daté (`clients.health_consent_at`) ; retrait et nouveau don dans Réglages → Mes données (`withdraw_health_consent`, `give_health_consent`).
- Suppression du compte par le client (`delete_my_account`) et par le coach (`erase_my_client`) : photos effacées du stockage, puis tout le reste via la suppression du compte de connexion. Les factures restent (10 ans), avec le nom facturé (`invoices.billed_to`).
- Export de toutes ses données en JSON : `/reglages/donnees`.
- Conservation : un client archivé perd ses photos après 3 mois et est effacé après 12 (`/api/retention`, Vercel Cron chaque nuit à 3 h).
- Réservé aux 18 ans et plus (`claim_invite`).
- Hébergement UE (Supabase Francfort, fonctions Vercel `fra1`), RLS sur chaque table, journal des accès administrateur, notes de symptômes jamais envoyées au serveur.
- Pages publiques : `/confidentialite`, `/mentions-legales`, `/conditions`.
