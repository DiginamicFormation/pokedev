# Serveur Pokedev

Petit serveur Java qui permet de créer un compte, de s'y connecter, de le supprimer et d'y sauvegarder son équipe et son PC. Les données sont dans une base SQLite (un simple fichier).

Il n'utilise que le JDK (serveur HTTP intégré, PBKDF2 pour les mots de passe) et le pilote SQLite : tout tient dans [PokedevServer.java](src/main/java/pokedev/PokedevServer.java).

## Prérequis

- Un **JDK 21** ou plus récent, par exemple [Eclipse Temurin](https://adoptium.net/). Vérifiez avec `java -version`.
- Rien d'autre : le script `mvnw` télécharge Maven au premier lancement (connexion Internet nécessaire).

Sous Windows, `java` doit être dans le `PATH`, ou la variable `JAVA_HOME` doit pointer vers le JDK ; l'installeur Temurin propose de s'en charger.

## Lancer le serveur

Depuis ce dossier `serveur` :

```sh
./mvnw compile exec:java      # macOS, Linux, Git Bash
```

```bat
./mvnw.cmd compile exec:java    :: Windows (invite de commandes ou PowerShell)
```

Le serveur affiche `Serveur Pokedev : http://localhost:8080/api` puis attend les requêtes ; `Ctrl+C` l'arrête. La base `pokedev.db` est créée dans ce dossier au premier lancement.

| Variable d'environnement | Rôle               | Valeur par défaut |
| ------------------------ | ------------------ | ----------------- |
| `PORT`                   | Port d'écoute      | `8080`            |
| `DB_PATH`                | Fichier de la base | `pokedev.db`      |

## Utiliser l'application avec le serveur

Le serveur tourne, lancez l'application Angular dans un autre terminal, à la racine du projet :

```sh
npm start
```

Ouvrez http://localhost:4200, puis **Mon compte**. En développement, Angular redirige les appels `/api` vers `http://localhost:8080` (voir [proxy.conf.json](../proxy.conf.json)) : si vous changez `PORT`, changez aussi ce fichier. Un `ng serve` lancé avant l'ajout du proxy doit être relancé.

## Tests

```sh
./mvnw test          # ou mvnw.cmd test sous Windows
```

Les tests démarrent un vrai serveur sur un port libre, avec une base temporaire.

## API

Les identifiants sont envoyés comme un formulaire HTML (`application/x-www-form-urlencoded`, champs `username` et `password`). Les routes marquées 🔒 demandent l'en-tête `Authorization: Bearer <jeton>`.

| Requête                           | Rôle                                  | Réponses                                  |
| --------------------------------- | ------------------------------------- | ----------------------------------------- |
| `POST /api/accounts`              | Créer un compte                       | 201 · 400 invalide · 409 identifiant pris |
| `POST /api/sessions`              | Se connecter                          | 200 `{"token", "username"}` · 401         |
| `DELETE /api/sessions/current` 🔒 | Se déconnecter                        | 204 · 401                                 |
| `DELETE /api/accounts/me` 🔒      | Supprimer son compte et sa sauvegarde | 204 · 401                                 |
| `PUT /api/accounts/me/save` 🔒    | Sauvegarder l'équipe et le PC (JSON)  | 204 · 401 · 413 plus de 256 Ko            |
| `GET /api/accounts/me/save` 🔒    | Relire la sauvegarde                  | 200 JSON · 401 · 404 aucune sauvegarde    |

Règles : identifiant de 3 à 30 caractères (lettres sans accent, chiffres, `.`, `-`, `_`), sans distinction de casse ; mot de passe de 8 à 128 caractères. La sauvegarde est le fichier d'export de l'application, stocké tel quel.

Essai rapide avec `curl` :

```sh
curl -X POST localhost:8080/api/accounts -d username=sacha -d password=pikachu-2026
curl -X POST localhost:8080/api/sessions -d username=sacha -d password=pikachu-2026
curl -H "Authorization: Bearer <jeton>" localhost:8080/api/accounts/me/save
```

## Sécurité et limites

- Les mots de passe sont hachés avec PBKDF2-HMAC-SHA256 (600 000 itérations, sel aléatoire).
- Les jetons de session sont aléatoires et valables 7 jours ; la base n'en garde que l'empreinte SHA-256.
- Le serveur n'écoute que sur `localhost` et parle HTTP sans chiffrement : il est fait pour le développement, pas pour être exposé sur Internet (il faudrait HTTPS et une limitation des tentatives de connexion).
- L'application garde le jeton dans le `localStorage` du navigateur.
