# PianoFlow — Render V7

V7 corrige le blocage observé au démarrage d’Audiveris sur Render :

`UnsatisfiedLinkError: libgtk-3.so: cannot open shared object file`

Le conteneur installe désormais `libgtk-3-0t64` (Ubuntu 24.04), qui fournit la bibliothèque GTK 3 attendue par Audiveris. Le test `xvfb-run -a /opt/audiveris/bin/Audiveris -version` reste volontairement dans le build : s’il passe, on sait qu’Audiveris peut réellement démarrer dans le conteneur.

## Déploiement

Remplacer les fichiers du dépôt GitHub par le contenu de cette archive puis valider le commit. Render devrait lancer l’Auto-Deploy. Sinon : **Manual Deploy → Deploy latest commit**.
