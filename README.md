# PianoFlow V8

V8 corrige le protocole entre le navigateur et le serveur :
- POST /api/transcribe crée une tâche et renvoie un jobId ;
- le navigateur suit ensuite /api/jobs/:id jusqu'à la fin ;
- les fichiers .mxl sont décompressés côté serveur avant envoi à OpenSheetMusicDisplay ;
- Audiveris est lancé via xvfb-run pendant la vraie retranscription ;
- logs HTTP/job détaillés dans Render ;
- toutes les erreurs /api renvoient du JSON ;
- .jpeg est explicitement accepté.
