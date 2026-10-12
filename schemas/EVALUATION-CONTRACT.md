# Contrat d’évaluation commun 1.0.0

12 octobre 2026 · LLM-Benchmarker 0.18.0 / NVNC Tech 0.5.0.

Ce contrat est utilisable par LLM-Benchmarker, ses dérivés et d’autres producteurs. Il ne demande ni compte NVNC dans l’outil, ni connexion entre les services, ni identifiant persistant d’utilisateur ou de machine. Le fichier communautaire constitue l’échange. Les scores sont déclarés : le contrat garantit la structure et la cohérence, pas l’authenticité d’un essai.

## Versions et catégories

Les nouveaux rapports évalués ou multimodaux utilisent `llm-benchmarker.community` **2.4.0**. Les rapports historiques restent en 2.0/2.1/2.2. Le format normalisé optionnel reste **2.3.0**, avec `baseSchemaVersion: "2.4.0"` pour ces nouveaux rapports. Bundles standard 1.0.0 et normalisé 1.1.0. Ces versions sont distinctes de `evaluation.contractVersion: "1.0.0"`.

| Catégorie | Évaluation livrée dans LLMB | Portée |
|---|---|---|
| `conversation` | Deux rappels factuels d’un dialogue fourni, en JSON | Mémoire des informations données, pas tout le dialogue |
| `creative` | Deux récits/titres soumis à des contraintes vérifiables | Respect des contraintes, pas originalité ni esthétique |
| `factual` | Deux extractions de dates/villes d’un document fourni | Lecture factuelle, pas connaissances générales |
| `code` | Deux sorties algorithmiques structurées | Valeurs attendues, pas preuve d’exécution d’un programme |
| `logic` | Deux situations de raisonnement contrôlé | Résolution des cas proposés |
| `math` | Deux calculs de durée contrôlés | Résolution des cas proposés |
| `agentic` | Critères du scénario et objectif fonctionnel | Même scénario/version, outils et budgets |
| `image` | Réponse textuelle de référence facultative | Compréhension du média ; sans référence, aucun podium |
| `video` | Réponse de référence ; vidéo native ou huit images | Les modes sont comparés séparément ; images sans audio |
| `audio` | Réponse textuelle de référence facultative | Compréhension/transcription selon la consigne |

## Une évaluation

Chaque `test.evaluation` contient le contrat, la catégorie, `protocol.{id,version}`, `task.{id,datasetDigest}`, `evaluator.{id,version,method}`, le statut, le score et les critères. Le digest de jeu de données est un SHA-256 de 64 caractères hexadécimaux. Il engage les consignes et les références sans les inclure dans le fichier public.

Méthodes autorisées : `deterministic`, `human`, `model`. LLMB fournit actuellement des évaluateurs déterministes ; aucun juge LLM n’est ajouté. Pour une méthode humaine/modèle, annoncer un protocole et un évaluateur/version distincts : leur score ne rejoint pas un podium déterministe.

Une évaluation `assessed` possède des critères aux identifiants uniques et un score numérique entre 0 et 100, bornes 0/100, direction `higher-is-better`. En méthode déterministe, le score est exactement **100 × critères réussis / critères évalués**. `incomplete` et `not-assessed` portent `score: null` et aucun critère scoré. Les critères LLMB contrôlés doivent correspondre au verdict et à la justesse source ; les critères agentiques reprennent ceux du scénario et l’objectif.

Une batterie peut annoncer `suite.{id,version,datasetDigest,aggregation,tasks}`. Agrégation : `mean-equal-tasks`. Chaque tâche déclare son ID et son digest ; la tâche courante doit y figurer. Les batteries textuelles LLMB ont deux cas par catégorie. Les tâches agentiques restent séparées par scénario ; un média personnalisé reste un podium par tâche.

## Conditions de comparaison dans NVNC

Un podium partage la catégorie, le protocole/version, le jeu de données (ou toute la batterie), l’évaluateur/version/méthode, les critères (pour une tâche seule), le runner/version, la température, le budget de sortie, le contexte observé/demandé et son mode, la configuration de réflexion, seed/top-p/top-k, la concurrence et la politique de cache.

Pour l’agentique : mêmes budgets, orchestrateur, politique d’espace de travail et outils/versions/capacités. Pour les médias : même modalité, représentation, version de traitement, inclusion audio et temps d’échantillonnage pour une tâche seule. La latence et les débits restent des mesures séparées, jamais convertis en qualité. Le matériel est conservé dans la mesure ; ces podiums comparent les scores, pas les performances matérielles.

Chaque variante est séparée par ID original du modèle, format, quantification et digest de révision. La liaison au catalogue n’efface pas cette distinction.

Sont exclus : tests non évalués, chauffe, interruption/erreur d’exécution, troncature, concurrence différente de 1, température/budget inconnus ou incohérents. Une tâche agentique terminée mais échouant à ses critères reste une mesure valide de qualité. Pour une batterie, chaque contributeur doit avoir réalisé tous les cas.

Le calcul moyenne d’abord les répétitions d’un même cas pour un contributeur, puis les cas à poids égal, puis les contributeurs à poids égal. Un auteur très actif n’obtient pas plus de poids. Les ex æquo et l’écart-type entre moyennes de contributeurs sont affichés. Un classement est provisoire avec moins de trois contributeurs, moins de cinq mesures, révision inconnue ou contexte non renseigné. Ce seuil est un indicateur de volume, pas une certification statistique ou anti-fraude.

## Empreintes secondaires et doublons

Deux empreintes SHA-256 sont calculées côté import, sans dépendre du nom de l’outil, des IDs de rapport/test, des IDs locaux de machine, de la date de réexport ou d’un identifiant utilisateur.

- **Événement** (`event-v1`) : date UTC de début, variante, réglages, protocole/jeu de données/évaluateur, traitement média, descriptions matérielles et runner. Exclut les résultats, scores et durée finale.
- **Contenu** (`measurement-v1`) : mêmes faits plus métriques, état de fin, complétion, verdicts et critères. Les ordres de clés, de critères et de tâches sont normalisés ; les timestamps d’observation et métadonnées de réexport ne changent pas la mesure.

Même événement et même contenu : doublon ignoré, même si un autre producteur ou membre le republie. Même événement et contenu modifié : conflit ; toute la transaction du fichier est annulée. Une nouvelle date de début représente une nouvelle exécution. Les imports historiques gardent leur algorithme précédent. L’empreinte ne prouve pas la vérité d’une réponse ni l’identité d’un participant.

## Confidentialité, reproductibilité et essais

L’export exclut prompts, réponses, références, octets/nom des médias, clés API et arguments/contenus d’outils. Les champs sont autorisés explicitement par le schéma et par l’exporteur. La taille/type/empreinte du média et les faits d’évaluation restent publics. Les scripts, consignes et références nécessaires à reproduire un protocole doivent être publiés par son auteur séparément ; une empreinte seule ne les reconstitue pas. Les batteries LLMB sont définies dans `quality.js` et dans les scénarios agentiques.

Pour un média, garder le fichier source, la consigne et la référence : le média ne reste pas sauvegardé dans SQLite, seuls les résultats/consignes/réponses le sont. Ne pas changer silencieusement un protocole ou évaluateur : incrémenter sa version et le digest du jeu de données.

Les tests interop utilisent le véritable exporteur et importeur avec des réponses de moteurs et un pool MySQL simulés. Les fixtures sont synthétiques et refusées par l’import public. Les essais avec moteurs réels et MySQL/MariaDB de production restent à effectuer sur l’installation cible. Aucun ancien résultat ne reçoit rétroactivement un score inventé.
