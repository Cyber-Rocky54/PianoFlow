# PianoFlow

Prototype web PianoFlow : import d'une partition imprimée (image/PDF), titre libre, reconnaissance OMR par Audiveris puis export MusicXML.

## Déploiement Render — V5 diagnostic

Cette version conserve Audiveris 5.11.0 mais sépare chaque opération importante du `Dockerfile` en une étape distincte : dépendances de base, téléchargement du paquet officiel, lecture des métadonnées, dépendances Audiveris, extraction, copie, vérification du lanceur, test de version, puis installation de PianoFlow.

Le but est double : permettre le déploiement si toutes les étapes sont compatibles avec Render et, en cas d'échec, obtenir immédiatement dans les logs le nom exact de l'étape fautive au lieu d'un simple `exit status 1` sur une longue commande.
