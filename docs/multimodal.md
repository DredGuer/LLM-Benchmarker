# Tester une image, une vidéo ou un audio

Application 0.18.0 · 12 octobre 2026. Il s’agit de compréhension multimodale, avec réponse textuelle, pas de génération de médias.

1. Choisir le runner et un modèle réellement compatible.
2. Ouvrir **Tests image, vidéo et audio**, choisir la catégorie et le fichier (maximum 20 Mio).
3. Indiquer une consigne précise. Pour un score reproductible, fournir une réponse de référence courte : « combien d’objets rouges ? réponds uniquement avec le nombre », référence « 3 ».
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
