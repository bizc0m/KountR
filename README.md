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
