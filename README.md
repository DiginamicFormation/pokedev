# Pokedev

Un Pokédex… de développeurs. L'application Angular (version 22) permet de parcourir les devs, de composer son équipe, de ranger les autres dans son PC, d'en créer ou d'en modifier. Un petit serveur Java, dans le dossier [serveur](serveur/), gère les comptes et la sauvegarde en ligne de l'équipe et du PC.

## Prérequis

- **Node.js** et **npm**, pour l'application Angular.
- Un **JDK 21** ou plus récent, uniquement pour le serveur (voir [Lancer le serveur](#lancer-le-serveur)).

## Installation

À la racine du projet :

```sh
npm install
```

Les commandes `ng` de ce README supposent que l'Angular CLI est installé globalement (`npm install -g @angular/cli`). Sinon, préfixez-les par `npx` (`npx ng serve`) ou passez par les scripts npm :

| Script npm      | Équivaut à |
| --------------- | ---------- |
| `npm start`     | `ng serve` |
| `npm test`      | `ng test`  |
| `npm run build` | `ng build` |
| `npm run lint`  | `ng lint`  |

Pour ajouter des options à un script npm, placez-les après `--` : `npm test -- --coverage`.

## Lancer l'application : `ng serve`

```sh
ng serve
```

Ouvrez ensuite <http://localhost:4200>. L'application se recharge toute seule à chaque modification d'un fichier source ; `Ctrl+C` arrête le serveur de développement.

Options utiles :

- `ng serve --open` (ou `-o`) ouvre le navigateur au démarrage ;
- `ng serve --port 4300` change le port.

En développement, les appels à `/api` sont redirigés vers le serveur Java sur `http://localhost:8080` (voir [proxy.conf.json](proxy.conf.json)). L'application fonctionne sans lui, mais l'espace **Mon compte** a besoin qu'il tourne.

## Tests unitaires : `ng test`

Les tests utilisent [Vitest](https://vitest.dev/) et s'exécutent dans Node.js avec jsdom, sans navigateur.

| Commande                     | Effet                                                                   |
| ---------------------------- | ----------------------------------------------------------------------- |
| `ng test`                    | Lance les tests ; en mode watch par défaut dans un terminal interactif. |
| `ng test --watch`            | Force le mode watch.                                                    |
| `ng test --no-watch`         | Exécute les tests une seule fois puis rend la main (utile en CI).       |
| `ng test --coverage`         | Ajoute la mesure de couverture du code.                                 |
| `ng test --watch --coverage` | Mode watch **et** couverture, recalculée à chaque relance.              |

### Mode watch

En mode watch, les tests restent actifs et sont relancés à chaque enregistrement d'un fichier. `Ctrl+C` les arrête.

### Couverture de code

Avec `--coverage`, un résumé s'affiche dans le terminal à la fin des tests et un rapport détaillé est généré dans le dossier `coverage/` (ignoré par Git). Ouvrez [coverage/pokedev/index.html](coverage/pokedev/index.html) dans un navigateur pour voir, fichier par fichier, les lignes et branches couvertes. La couverture est mesurée avec istanbul (`@vitest/coverage-istanbul`).

### Depuis VS Code

Les tâches `npm: start` et `npm: test` sont déjà configurées ([.vscode/tasks.json](.vscode/tasks.json)) : **Terminal > Exécuter la tâche…**

## Lancer le serveur

Le serveur est écrit en Java avec le seul JDK et une base SQLite. Il n'y a pas besoin d'installer Maven : le script `mvnw` le télécharge au premier lancement (connexion Internet nécessaire). Vérifiez votre JDK avec `java -version` ; sous Windows, `java` doit être dans le `PATH` ou `JAVA_HOME` doit pointer vers le JDK.

Depuis le dossier `serveur` :

```sh
cd serveur
./mvnw compile exec:java        # macOS, Linux, Git Bash
```

```powershell
cd serveur
.\mvnw.cmd compile exec:java    # Windows (PowerShell ou invite de commandes)
```

Le serveur affiche `Serveur Pokedev : http://localhost:8080/api (base pokedev.db)` puis attend les requêtes ; `Ctrl+C` l'arrête. La base `pokedev.db` est créée dans le dossier `serveur` au premier lancement.

| Variable d'environnement | Rôle               | Valeur par défaut |
| ------------------------ | ------------------ | ----------------- |
| `PORT`                   | Port d'écoute      | `8080`            |
| `DB_PATH`                | Fichier de la base | `pokedev.db`      |

Par exemple, pour écouter sur le port 9090 :

```sh
PORT=9090 ./mvnw compile exec:java                 # macOS, Linux, Git Bash
```

```powershell
$env:PORT = 9090; .\mvnw.cmd compile exec:java     # PowerShell
```

Si vous changez le port, mettez aussi à jour `target` dans [proxy.conf.json](proxy.conf.json) et relancez `ng serve`.

Les tests du serveur se lancent avec `./mvnw test` (ou `.\mvnw.cmd test` sous Windows). L'API, ses règles et ses limites de sécurité sont décrites dans [serveur/README.md](serveur/README.md).

## Tout lancer ensemble

1. Dans un premier terminal, lancez le serveur depuis `serveur` : `./mvnw compile exec:java` (ou `.\mvnw.cmd compile exec:java`).
2. Dans un second terminal, à la racine du projet : `ng serve`.
3. Ouvrez <http://localhost:4200>.

## Autres commandes

| Commande                    | Effet                                                             |
| --------------------------- | ----------------------------------------------------------------- |
| `ng build`                  | Compile l'application pour la production dans `dist/`.            |
| `npm run watch`             | Recompile en continu, en configuration de développement.          |
| `ng lint`                   | Analyse le code TypeScript et les templates avec ESLint.          |
| `ng generate component nom` | Crée un composant (`ng generate --help` pour les autres schémas). |

## Organisation du projet

```text
src/app/
  core/       services : données, compte, équipe, PC, sauvegarde, navigation…
  domain/     modèle et règles métier des devs
  features/   une page par dossier (dex, détail, équipe, PC, compte…)
  shared/     composants, directives et pipes réutilisables
  testing/    utilitaires pour les tests
public/data/  données de départ (devs.json)
serveur/      serveur Java des comptes et sauvegardes
```

Pour aller plus loin avec l'Angular CLI : [documentation officielle](https://angular.dev/tools/cli).
