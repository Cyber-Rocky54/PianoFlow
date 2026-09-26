# PianoFlow

Prototype web PianoFlow : import d'une partition image/PDF, titre personnel, conservation de l'original et préparation de la retranscription OMR vers MusicXML.

## Déploiement Render
Le dépôt contient `render.yaml`. Le service web Node peut être créé depuis ce dépôt.

> La reconnaissance OMR réelle nécessite encore qu'un moteur compatible soit présent côté serveur et configuré via `AUDIVERIS_CMD`. L'interface n'invente aucune note si le moteur est absent.
