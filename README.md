# COUNTr

Compteur local autonome : onglets colorables, objectifs, historique, thèmes et sauvegardes JSON.

## Utiliser

- Version actuelle : `public/COUNTr-actions.html`
- GitHub Pages : contenu sous `docs/`
- Application publiée : `docs/app/index.html`

## Sous-pages

- `/` : présentation
- `/app/` : application
- `/historique/` : évolution du produit
- `/documentation/` : documentation

## Historique

Le dépôt conserve les étapes du projet dans des commits séparés : TallyCounter V2, placement fixe, configurations et thèmes, renommage COUNTr, rappels, export automatique, outliner et menus à double action.

## Skin commun

Toutes les versions autonomes chargent `public/COUNTr-skin.css`. Toute nouvelle version doit partir de `public/COUNTr-actions.html` afin de conserver automatiquement le bouton « M’offrir un ☕ » et le skin COUNTr.

## Données

COUNTr fonctionne sans serveur. Les données sont enregistrées dans le stockage local du navigateur et peuvent être exportées en JSON.

## Bipo V2 : Équilibre quotidien

GitHub Pages : `/Bipo-V2/`. Application statique, sans serveur de données ni dépendance externe.

- Journal daté : humeur, énergie, sommeil, repos, observations, effets et bénéfices ressentis.
- Prescriptions quotidiennes à horaires fixes, clôture datée, prises confirmées ou non prises déclarées et motifs. Une absence de saisie reste inconnue.
- Courbes sur 7, 30 et 90 jours, valeurs manquantes conservées, moyennes calculées sur les valeurs renseignées.
- Plan personnel convenu avec le soignant et agenda des consultations/bilans.
- Synthèse par période et rubriques choisies, texte téléchargeable et impression/PDF via le navigateur.
- Sauvegarde JSON complète, restauration validée avec confirmation, effacement ciblé ou total.

Stockage `localStorage` propre à V2 (`countr-bipo-v2`), séparé de la V1. Aucune migration automatique des compteurs V1. Pas de synchronisation, chiffrement applicatif, messagerie soignant, diagnostic, modification automatique de dose ni notification lorsque la page est fermée. Les rappels sont visibles dans la page ouverte. Les exports sont transmis manuellement par l’utilisateur.

Vérifications métier : `TZ=Europe/Paris node --test tests/bipo-v2.test.mjs`.
