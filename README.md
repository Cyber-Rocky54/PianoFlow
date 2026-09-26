# PianoFlow

Prototype web PianoFlow : import d'une partition imprimée (image/PDF), titre libre, reconnaissance OMR par Audiveris puis export MusicXML.

## Déploiement

Le dépôt contient un `Dockerfile` qui installe Audiveris 5.11.0 dans le serveur. `render.yaml` demande à Render de construire ce conteneur Docker puis de lancer `server.js`.

Le serveur utilise Audiveris en mode batch : `-batch -transcribe -export`. La reconnaissance est asynchrone côté web afin d'éviter de garder une requête HTTP ouverte pendant toute l'analyse.

Audiveris n'est pas infaillible : PianoFlow doit toujours permettre de comparer le résultat à l'original puis de corriger la partition avant l'entraînement.
