# Médias dans la campagne

Application **0.18.2**, backend 1.6.0 · 12 octobre 2026.

La section **Médias** propose trois cases, comme les catégories de texte : **Image**, **Vidéo**, **Audio**. Cocher les médias souhaités puis utiliser le bouton principal **Lancer le benchmark**. Ils font partie de la même campagne, du même historique et des mêmes exports. Il est possible de lancer uniquement des médias en décochant les catégories textuelles dans le mode Pro ; une campagne multimodale seule n’ajoute aucune chauffe textuelle.

## Sans prompt

Chaque média est envoyé **seul** au modèle : pas de champ de consigne, pas de prompt caché, pas de texte ajouté aux images vidéo. Les APIs reçoivent uniquement les parties média ; Ollama reçoit les images et un contenu textuel vide. La réponse est donc libre, selon le modèle. Une API qui exige une consigne peut refuser : le système conserve cet échec et arrête la campagne plutôt que d’inventer une instruction.

Le protocole interne `media-input-only-1.0.0` distingue ces mesures des anciens essais avec consigne ; l’empreinte du jeu de données sépare leurs podiums. Les anciens champs `prompt` dans un `cases.json` personnel sont ignorés dans cette campagne.

## Emplacements fixes

Chemins depuis la racine du dépôt :

| Média | Fichier | Format réel |
|---|---|---|
| Image | `benchmarks/media/image.png` | PNG |
| Vidéo | `benchmarks/media/video.mp4` | MP4 |
| Audio | `benchmarks/media/audio.wav` | WAV |

Maximum **20 Mio par fichier**. Vidéo échantillonnée : maximum **120 secondes**, huit images chronologiques redimensionnées à 1024 pixels maximum et encodées en JPEG qualité 0,85, **sans piste audio**. Le mode natif envoie le fichier vidéo complet à Gemini compatible. Les deux modes restent comparés séparément.

Vous fournissez vos propres médias ; aucun fichier fictif ne remplace un média manquant. Une erreur de fichier/configuration arrête avant l’inférence de cette modalité et n’est pas transformée en échec de compréhension du modèle. Les médias personnels sont ignorés par Git et préservés lors des mises à jour. Ils restent accessibles via votre serveur de fichiers ; pour des enregistrements privés, conserver son écoute sur `127.0.0.1`.

## Références facultatives, aucune consigne

Le fichier personnel `benchmarks/media/cases.json` permet seulement de régler la réponse attendue et le traitement vidéo. Pour le créer une première fois, après `git pull` :

```bash
cp -n benchmarks/media/cases.example.json benchmarks/media/cases.json
```

Exemple :

```json
{
  "version": "1.0.0",
  "cases": {
    "image": {"expected": "", "representation": "native"},
    "video": {"expected": "", "representation": "frames"},
    "audio": {"expected": "Bonjour, ceci est mon enregistrement.", "representation": "native"}
  }
}
```

`expected` est une référence d’évaluation **jamais envoyée au modèle**. Vide, elle laisse la qualité non évaluée ; aucune réussite de compréhension n’est certifiée. Avec référence, le score compare la réponse après normalisation Unicode NFKC, casse et espaces. Une paraphrase peut échouer au comparateur exact, et sans consigne la forme de réponse varie selon le modèle : choisir les références en connaissance de cette limite. Changer média, référence ou traitement change l’empreinte et sépare les podiums.

Si `cases.json` manque, références vides et traitement vidéo `frames` par défaut. Un fichier présent mais invalide bloque l’essai. Vos fichiers ne sont pas réécrits par cette mise à jour.

## Runners et arrêts

| Runner | Image | Vidéo | Audio |
|---|---|---|---|
| Ollama vision | Native | Huit images sans audio | Adaptateur non compatible |
| LM Studio / llama.cpp / MLX / API personnalisée | `image_url`, si compatible | Huit images | `input_audio` WAV, si compatible |
| OpenAI | Vision compatible | Huit images | Chat audio compatible WAV |
| Claude | Images natives | Huit images | Adaptateur non compatible |
| Gemini | Native | Native ou huit images | Native |
| Mistral | Vision compatible | Huit images | Adaptateur non compatible |

Consentement explicite requis avant tout envoi distant. Sélection et médias sont verrouillés pendant la campagne. Les cases Médias sont sauvegardées dans les profils ; le consentement distant doit être redonné après chargement d’un profil. Les comparaisons contrôlées de deux contextes sont réservées au texte/agentique : désactiver cette option pour inclure les médias.

Un adaptateur incompatible est distingué d’un refus déclaré du modèle. Refus explicite, erreur HTTP, réponse vide, délai dépassé, troncature ou référence incorrecte arrêtent la campagne et conservent les résultats déjà obtenus. Une référence incorrecte garde son **score zéro**, utile pour comparer ; une erreur d’exécution n’obtient aucun score. En batch, le choix existant « continuer après erreur » détermine si le modèle suivant est exécuté.

La détection de refus couvre des déclarations usuelles en début de réponse en français/anglais. Sans référence, une réponse plausible mais incorrecte ne peut pas toujours être reconnue comme échec. Aucun score n’est inventé. Le débit de génération et le TTFT restent inconnus pour ces requêtes non-streaming ; la durée de requête et les tokens déclarés par le fournisseur sont conservés séparément.

Les exports communautaires excluent octets/nom des médias, références et réponses ; SQLite conserve les résultats locaux sans dupliquer les fichiers médias. NVNC 0.5.0 accepte les rapports 2.4.0 existants ; aucun déploiement NVNC ni nouvelle migration n’est requis pour cette évolution.

## Vérification

`npm run test:multimodal` teste le véritable moteur de campagne avec médias seuls ou avec texte, tous les transports sans prompt, les arrêts et l’export réel avec fichiers/moteurs simulés. Tests profils, campagnes, agentique, contextes, cloud et schémas relancés. Les essais visuels et les moteurs réels restent à vérifier sur votre installation.
