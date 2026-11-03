# COUNTr

Compteur local autonome : onglets colorables, objectifs, historique, thèmes et sauvegardes JSON.

## Utiliser

- Version actuelle : `docs/app/index.html`
- GitHub Pages : contenu sous `docs/`

## Sous-pages

- `/` : présentation
- `/app/` : application
- `/historique/` : évolution du produit
- `/documentation/` : documentation

## Historique

Le dépôt conserve les étapes du projet dans des commits séparés : TallyCounter V2, placement fixe, configurations et thèmes, renommage COUNTr, rappels, export automatique, outliner et menus à double action.

## Skin commun

Toutes les versions autonomes chargent `docs/versions/COUNTr-skin.css`. Toute nouvelle version doit partir de `docs/app/index.html` afin de conserver automatiquement le bouton « M’offrir un ☕ » et le skin COUNTr.

## Données

COUNTr fonctionne sans serveur ni compte : aucune donnée ne quitte le navigateur, aucun traceur, aucun envoi réseau. Les données sont enregistrées dans le stockage local du navigateur et peuvent être exportées en JSON.

## Licence

Usage non commercial, gratuité totale (voir `LICENSE`) : l'outil est offert sans rétribution aux personnes qui souffrent. La marque blanche est possible sous conditions : la version rebrandée doit rester intégralement gratuite, conserver le stockage local sans traceur, n'ajouter aucune prétention médicale et transmettre la présente licence. Il est interdit de modifier le code pour y intégrer la moindre métadonnée (télémétrie, identifiant, empreinte, collecte de données). La vente ou l'accès payant est interdit.

## Bipo V2 : les compteurs COUNTr

GitHub Pages : `/Bipo-V2/`. La V2 reprend l’interface et le moteur de `docs/app/index.html` : tuiles colorées, clic, onglets, verrouillage, annulation, thèmes, historique et exports.

20 compteurs de départ, répartis dans Quotidien, Traitement, Ressentis et Rythme. Les tuiles se personnalisent via leur menu ⋮.

- Valeurs par jour, saisie de nombres décimaux et échelles avec minimum/maximum. Une absence de saisie reste inconnue.
- Un clic incrémente un compteur ou confirme une prise ; une seconde confirmation ne double pas la prise.
- Le bouton ✎ permet de corriger la valeur, déclarer une non prise et ajouter une note.
- Note quotidienne, repères convenus avec le soignant et échéances cochables dans Suivi.
- Bilan 7/30/90 jours : valeurs par date et moyennes sur les seuls jours renseignés. Notes et contacts exclus par défaut. Export texte et sauvegarde JSON.
- Copie facultative de l’onglet Bipo V1, sans modifier son stockage. Les anciens logs incrémentaux se relisent par jour.

Stockage distinct : `countr_bipo_tiles_v2` et `countr_bipo_tiles_tab_v2`. La première ébauche de journal séparé utilisait `countr-bipo-v2` ; cette clé n’est pas effacée. La V1 reste sur `tallycounter_v2`. Pas de synchronisation, chiffrement applicatif, diagnostic ou modification de prescription. Les rappels nécessitent une page ouverte.

Vérifications métier : `TZ=Europe/Paris node --test tests/bipo-v2.test.mjs tests/counter-v2.test.mjs`.

## Bibliothèque de tableaux et éditeur de modèles

- `/` : tableaux par maladie ou besoin ; recherche, création, duplication, import/export du modèle et archivage réversible.
- `/config/?id=bipo` : éditeur du modèle Bipo. `/config/?new=1` crée un tableau vierge.
- `/Bipo-V2/?board=<id>` : moteur de tuiles partagé. Sans paramètre, il ouvre Bipo comme auparavant.
- `/archives/` : ancien catalogue de versions conservé en accès secondaire.

La bibliothèque `countr-board-library-v1` stocke les modèles canoniques (onglets, tuiles, unités, limites, types, largeurs). Les exports de modèles excluent observations, notes et prescriptions du suivi. Un import crée toujours un nouvel identifiant de tableau.

Bipo garde `countr_bipo_tiles_v2`. Les autres tableaux utilisent `countr-board-data-<id>` et `countr-board-tab-<id>`. Un changement de révision fusionne la configuration avec le suivi sans effacer ses logs, notes ou prescriptions ; les définitions des tuiles retirées restent dans `retiredTallies` pour les sauvegardes. Les réglages rapides ne sont repris dans le modèle qu’à son enregistrement dans l’éditeur.

Application locale au navigateur, sans base partagée, comptes patients ou synchronisation. Aucun modèle clinique autre que le POC Bipo n’est fourni ; les tableaux supplémentaires sont créés/configurés par l’utilisateur.

Vérifications : `TZ=Europe/Paris node --test tests/*.test.mjs` (Node.js seul, sans installation).
