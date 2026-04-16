# Picsou Parle - Shorts Video Generator Pipeline

## Vision globale de l'architecture

Ce projet implémente un générateur automatique de vidéos au format Shorts/Reels (1080x1920) avec une animation de style "lip-sync" (bouche ouverte/fermée), des sous-titres dynamiques synchronisés mot à mot, et une voix off générée par IA. Le langage utilisé est **TypeScript** via **Node.js**. 

**Pourquoi Node.js/TypeScript ?**
- **Orchestration fluide :** La génération de vidéos implique beaucoup d'I/O asynchrones (appels HTTP vers les API IA pour LLM/TTS/Whisper, exécution de scripts enfants avec FFmpeg, lecture/écriture système volumineuses). L'event loop de Node est particulièrement adaptée pour scripter ces processus efficacement en parallèle sans bloquer.
- **Typage fort :** L'usage de TypeScript permet de structurer le "PipelineContext" passant l'état d'une étape à l'autre de manière rigoureuse, en évitant les erreurs de runtime sur des propriétés manquantes.
- **Écosystème florissant :** `fluent-ffmpeg` permet une intégration plus déclarative et modulaire des filtres FFmpeg complexes complexes que l'assemblage de commandes sous forme de strings géantes.

## Découpage du Pipeline

Le pipeline de rendu est architecturé de manière séquentielle mais découplée, suivant le pattern du Pipeline Processing :
Chaque script (`0X-*.ts`) prend un object de contexte (`PipelineContext`), l'enrichit avec le résultat de sa tâche, et passe la main. Si une étape échoue ou doit être retentée, les artefacts temporaires (`tmp/gen_TIMESTAMP/`) permettent une reprise fluide.

1. **`01-script.ts` (LLM Scripting)**
   - Utilise l'API d'OpenAI (ou Anthropic) avec un *System Prompt* pour injecter le persona (Picsou : avare, cynique, donneur de leçons de finance).
   - Produit une sortie JSON forçant du contenu structuré : texte du monologue, description de fond (optionnel pour la v2 d'incorporer Dall-E), durée estimée, et émotion.
   
2. **`02-voice.ts` (TTS & Timestamps)**
   - Transmet le script à l'API OpenAI `tts-1-hd` avec une voix choisie (`onyx` convient parfaitement pour un ton dramatique / grave comme Picsou).
   - Utilise ensuite OpenAI `Whisper-1` avec `timestamp_granularities=word` afin de remonter le timing de chaque mot pour une synchro précise des sous-titres, plutôt qu'une approximation linéaire (durée / temps).

3. **`03-visuals.ts` (Visual Prep)**
   - Valide la présence des assets génériques (fond et personnages). Prépare la chaîne d'image. Gère le Fallback si le fond n'existe pas en demandant un rendering unifié (couleur de fond `color=c=yellow`) nativement sous FFmpeg.

4. **`04-subtitles.ts` (Subtitle Synchronization)**
   - Traduit la sortie JSON riche de Whisper en un fichier de sous-titres ASS (Advanced SubStation Alpha).
   - L'intérêt de l'ASS est la puissante balise `{\c&H00FFFF&}` qui permet de générer un highlight de la couleur du mot en cours de syntaxe nativement compris par FFmpeg, sans avoir à générer des milliers de PNG statiques par canvas!

5. **`05-compose.ts` (FFmpeg Composition)**
   - Assemble le fichier video + audio + sous-titres + images via un complexe filter graph.
   - Injecte les frames pour la bouche. Note: En production lourde on parserait les amplitudes RMS via l'audio pour cycliquement swapper open/closed, ici on fait un compositing de base solide qui garantit une vidéo fluide avec superposition + subtitles.

## Coûts et Performances Estimés

**Pour une vidéo typique de ~30 secondes (environ 90-100 mots) :**
- **LLM/GPT-4o:** Prompt d'environ 150 tokens, Completion de ~100 tokens -> ~$0.001
- **TTS-HD (tts-1-hd):** ~$0.03 par millier de caractères (ici on est souvent à moins de 600 caractères) -> ~$0.015
- **Whisper:** $0.006 / minute (arrondi à 30 secondes -> ~$0.003
- **Total API Cost / Video :** Environ **~0.02$** par rendu.
- **Temps Gen:** ~5 secondes d'API, ~10s de rendu FFmpeg (dépend de la puissance CPU car encodage logiciel x264 par défaut) -> Temps total < 15 secondes.

## Limites et Améliorations Futures (Bonus)

- Actuellement l'itération de la bouche (lip-sync via FFmpeg) nécessiterait un script Python tiers ou une boucle NodeJS qui créerait les frames intermédiaires en fonction d'une analyse locale audio (ex: `meyda` en js).
- Des musiques d'arrière plan pourraient s'ajouter rapidement en mixant un stream audio supplémentaire.
- Générer l'image du personnage à la volée. 

## Commandes pour Exécuter

1. Copier le fichier `.env.example` vers `.env` et ajouter vos clés d'API.
    - **Note sur la gratuité :** Vous pouvez utiliser l'API **AI Studio de Google (Gemini)** qui offre un [plan gratuit généreux](https://aistudio.google.com/) pour le LLM.
    - Pour TTS gratuit, utilisez **Google Cloud Synthesize** via le plan gratuit (limité à 1M caractères), ou bien créez un compte [OpenAI](https://platform.openai.com/) pour leurs premiers crédits cadeaux.
    - Pour la retranscription Word-Level gratuite, Whisper d'OpenAI nécessite une carte bleue. Une alternative est **Groq Whisper** gratuit ou **local whisper**.
2. Lancer la compilation : `npx tsc`
3. Lancer l'interface Web (Bonus) : `node dist/server.js` 
   - Visitez **http://localhost:3000**
4. Ou exécuter en ligne de commande :
   ```bash
   node dist/index.js --prompt "Explique pourquoi il ne faut jamais prêter d'argent à ses amis."
   ```