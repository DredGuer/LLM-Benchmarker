# Tester une image, une vidéo ou un audio

Application 0.18.1 · 12 octobre 2026. Il s’agit de compréhension multimodale, avec réponse textuelle, pas de génération de médias.

1. Choisir le runner et un modèle réellement compatible.
2. Ouvrir **Tests image, vidéo et audio**, choisir la catégorie. Le mode par défaut utilise votre fichier fixe (maximum 20 Mio). Le mode « Fichier personnalisé » permet encore une sélection manuelle.
3. En mode fixe, régler les consignes dans `benchmarks/media/cases.json` ; elles sont ensuite identiques pour tous les modèles et affichées en lecture seule. En mode personnalisé, indiquer une consigne précise. Pour un score reproductible, fournir une réponse de référence courte : « combien d’objets rouges ? réponds uniquement avec le nombre », référence « 3 ».
4. Pour une vidéo, choisir huit images chronologiques sans audio, ou l’entrée native avec Gemini. Les images sont redimensionnées à 1024 pixels au maximum et encodées en JPEG qualité 0,85 ; vidéos échantillonnées limitées à 120 secondes.
5. Autoriser explicitement l’envoi si le runner est distant, puis lancer. Le bouton Arrêter annule les requêtes. Température 0, budget de sortie et nombre de répétitions pris dans la configuration (1 à 20 essais).
6. Consulter les résultats/statistiques multimodales et exporter le JSON communautaire. Importer manuellement ce fichier dans NVNC Tech 0.5.0. Aucun compte NVNC ni lien automatique n’est nécessaire dans LLMB.

| Runner | Image | Vidéo | Audio |
|---|---|---|---|
| Ollama vision | Native | Huit images, sans audio | Non pris en charge par cet adaptateur |
| LM Studio / llama.cpp / MLX / API chat personnalisée | `image_url`, si serveur/modèle compatible | Huit images via `image_url` | `input_audio` WAV/MP3, si serveur compatible |
| OpenAI | API chat vision compatible | Huit images | API chat audio compatible WAV/MP3 |
| Claude | Images natives | Huit images | Non pris en charge par cet adaptateur |
| Gemini | Native | Native ou huit images | Native |
| Mistral | API chat vision compatible | Huit images | Non pris en charge par cet adaptateur |

Formats : PNG/JPEG/WebP ; MP4/WebM ; WAV/MP3/OGG/FLAC (OGG/FLAC via Gemini). Le support dépend du modèle et de l’API effectivement choisis ; un refus HTTP est affiché et conservé comme échec, sans conversion en réussite.

Le score compare la réponse et la référence après normalisation Unicode NFKC, casse et espaces. Une paraphrase correcte peut donc être refusée : choisir une consigne à sortie déterminée. Sans référence, le résultat reste consultable mais ne participe pas aux podiums. La durée mesure la requête complète ; TTFT et débit de génération restent inconnus en mode non-streaming. Les tokens sont comptés uniquement si le fournisseur déclare leur nombre.

Les médias restent en mémoire pendant l’essai et sont transmis uniquement au runner choisi. SQLite conserve consigne/réponse/résultat, sans fichier média ni nom de fichier ; garder le fichier source pour reproduire le test. L’export public conserve seulement les empreintes, le descripteur, les scores et les conditions. Le consentement de partage vers NVNC est distinct de l’envoi au moteur.

Voir le [contrat d’évaluation](../schemas/EVALUATION-CONTRACT.md). Les tests automatiques simulent les moteurs ; vérifier les trois modalités sur les modèles et serveurs réellement installés avant de constituer un podium.

## Vos fichiers fixes (0.18.1)

Chemins relatifs à la racine du dépôt LLM-Benchmarker :

| Média | Fichier à déposer | Format réel |
|---|---|---|
| Image | `benchmarks/media/image.png` | PNG |
| Vidéo | `benchmarks/media/video.mp4` | MP4 ; maximum 120 s pour l’échantillonnage |
| Audio | `benchmarks/media/audio.wav` | WAV |

Ces fichiers ne sont pas fournis : utilisez vos propres enregistrements/images. Un fichier absent ou trop volumineux bloque le lancement avant tout appel modèle. Les fichiers sont ignorés par Git ; une mise à jour ne les remplace pas. Ils sont servis par votre serveur de fichiers local : gardez son écoute sur `127.0.0.1` si ces enregistrements sont privés.

Pour fixer également les consignes et références, lors du premier paramétrage :

```bash
cp benchmarks/media/cases.example.json benchmarks/media/cases.json
```

Ne pas refaire cette copie si vous avez déjà personnalisé `cases.json`. Exemple d’entrée à modifier dans `cases` :

```json
"audio": {
  "prompt": "Transcris uniquement les paroles de cet audio, sans commentaire.",
  "expected": "Bonjour, ceci est mon enregistrement de référence.",
  "representation": "native"
}
```

Changer `expected` pour correspondre à votre enregistrement ; pour une image/vidéo, privilégier une question à réponse courte et vérifiable. `expected: ""` laisse la qualité non évaluée. `representation` est `native` pour image/audio, `frames` ou `native` pour vidéo. En absence de `cases.json`, les consignes par défaut sont utilisées ; un fichier présent mais invalide bloque le test. Le nom des trois fichiers est fixe et ne vient pas du JSON.

Le lanceur relit les fichiers sans cache à chaque campagne, puis conserve les mêmes octets/consigne/référence pendant ses répétitions. Modifier un fichier ou la consigne/référence change l’empreinte du jeu de données et sépare les podiums. Il ne sauvegarde pas une seconde copie du média en base.

## Arrêt et résultat explicite

- Adaptateur sans support de la modalité : résultat « Non pris en charge par cet adaptateur — modèle non testé », aucun appel d’inférence et répétitions arrêtées. Cela ne prouve pas une limite du modèle lui-même.
- Refus explicite du modèle de lire/voir/entendre le média : résultat d’exécution échoué, historique/export conservés, répétitions arrêtées. Détection limitée aux déclarations usuelles en début de réponse en français/anglais.
- Erreur HTTP, délai dépassé ou réponse vide : résultat échoué, aucune réussite ni score inventé, répétitions arrêtées.
- Réponse tronquée : résultat partiel, non évalué, répétitions arrêtées.
- Réponse différente de la référence : score 0/100 conservé pour comparer honnêtement les modèles, répétitions arrêtées. Une paraphrase peut échouer au comparateur exact.

Un modèle peut produire une réponse plausible alors qu’il n’a pas compris le média. Sans référence correcte, le système ne peut pas détecter toutes ces réponses ; il n’annonce donc aucune justesse vérifiée. Les résultats sont conservés localement, l’export communautaire reste expurgé des médias, noms, références, prompts et réponses. Les fichiers personnels étant servis localement, ceci diffère de leur absence du JSON public.

Tests : `npm run test:multimodal`. Le véritable lanceur a été testé avec fichiers/configuration et moteurs simulés : répétitions réussies, absence de fichier, configuration invalide, adaptateur audio incompatible, refus du modèle, réponse vide, erreur HTTP, troncature et score zéro. Essais visuels et modèles réels à effectuer sur l’installation cible.
