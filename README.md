# PianoFlow

Prototype web PianoFlow : import d'une partition imprimée (image/PDF), titre libre, reconnaissance OMR par Audiveris, puis export MusicXML.

## Déploiement Render

Le `Dockerfile` utilise Ubuntu 24.04 et installe le paquet officiel Audiveris 5.11.0 prévu pour Ubuntu 24.04. Le serveur Node lance ensuite Audiveris en mode batch pour la retranscription.

La reconnaissance OMR n'est pas infaillible : PianoFlow doit permettre de comparer le résultat à l'original et, à terme, de le corriger avant l'entraînement.
