# PianoFlow

Prototype web PianoFlow : import d'une partition imprimée (image/PDF), titre libre, reconnaissance OMR par Audiveris puis export MusicXML.

## Déploiement Render — V4

Le conteneur utilise Ubuntu 24.04 et télécharge le paquet officiel Audiveris 5.11.0 pour Ubuntu 24.04.

Pour un serveur Docker sans bureau graphique, la V4 n'exécute plus les scripts d'installation « bureau » du paquet `.deb`. Elle installe les dépendances déclarées puis extrait directement les fichiers officiels d'Audiveris sous `/opt/audiveris`. Le build vérifie ensuite que `/opt/audiveris/bin/Audiveris` est exécutable et affiche sa version.

PianoFlow lance Audiveris en mode batch (`-batch -transcribe -export`). La reconnaissance est asynchrone côté web. Audiveris n'est pas infaillible : le résultat doit pouvoir être comparé à l'original et corrigé avant l'entraînement.
