# Analyse d'impact relative à la protection des données (AIPD)

Brouillon du 29 septembre 2026, à compléter et faire relire.

## Pourquoi une AIPD
Masse traite des **données de santé** (blessures, cycle, sommeil) et des
**photos corporelles**, à propos de personnes suivies dans la durée. Deux
critères de la liste du CEPD sont réunis (données sensibles, suivi
systématique) : l'AIPD est recommandée, et prudente.

## Description
Voir `registre.md`, traitement 1.

## Nécessité et proportionnalité
- Chaque donnée sert le coaching : programme, ajustements, suivi de progression.
- Données de santé **minimisées** : cycle = dates seulement, phase calculée à la lecture ; symptômes jamais envoyés au serveur ; lecture Apple Santé abandonnée (PWA).
- Consentement explicite, retirable, qui efface ce qui a été donné sous lui.
- Conservation limitée (3 / 12 mois après archivage), effacement immédiat sur demande, export en un fichier.
- Réservé aux majeurs.

## Risques et mesures

| Risque | Gravité | Vraisemblance | Mesures |
|---|---|---|---|
| Accès d'un coach aux données d'un client qui n'est pas le sien | Importante | Faible | RLS sur chaque table, testée ; fonctions sensibles en `security definer` avec contrôle d'appartenance |
| Fuite des photos de bilan | Importante | Faible | Bucket privé, liens signés de courte durée, dossiers par client |
| Accès administrateur abusif | Importante | Faible | Journal obligatoire avec motif (`admin_access_log`) |
| Perte d'un téléphone connecté | Moyenne | Moyenne | Sessions révocables ; aucune donnée de santé en clair hors de l'app ; [À envisager : délai d'expiration de session] |
| Transfert hors UE (Vercel) | Moyenne | Faible | Exécution en `fra1`, DPF + CCT |
| Conservation excessive | Moyenne | Moyenne | Purge automatique quotidienne |

## Conclusion provisoire
Risques résiduels acceptables sous réserve : relecture juridique, signature
des DPA sous-traitants, contrat article 28 avec chaque coach.
