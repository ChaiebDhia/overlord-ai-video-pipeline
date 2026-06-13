<div align="center">

# Overlord AI Video Pipeline

**Text prompt → voiced, subtitled MP4 Short in under 15 seconds**

Multi-LLM orchestration · FFmpeg assembly · Word-level subtitle sync  
Zero proprietary video SaaS — every frame built programmatically

`TypeScript` `Node.js` `OpenAI GPT-4o` `Claude API` `Gemini` 
`Whisper` `ElevenLabs` `GROQ` `FFmpeg` `fluent-ffmpeg`

</div>

---

## What It Does

Takes any text prompt and generates a publication-ready short-form 
video (15–45s) with:

- **AI-generated script** with injected character persona
- **Neural voiceover** — word-level Whisper timestamps for precision sync
- **Animated character** with lip-sync simulation (open/closed frames)
- **Word-by-word subtitle highlight** via ASS format — native FFmpeg, 
  zero PNG frame generation
- **Themed background** — gradient fallback built into FFmpeg filter graph

No HeyGen. No Synthesia. No Runway. No D-ID.  
Every frame assembled with FFmpeg + Sharp.

---

## Architecture

```
Text Prompt
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  01-script.ts — LLM Scripting                       │
│  GPT-4o / Claude API with persona System Prompt     │
│  Output: JSON { monologue, background, duration,    │
│                 emotion }                           │
└─────────────────────────┬───────────────────────────┘
                          │
    ▼
┌─────────────────────────────────────────────────────┐
│  02-voice.ts — TTS + Word Timestamps                │
│  OpenAI tts-1-hd (voice: onyx — dramatic/grave)     │
│  Whisper-1 with timestamp_granularities=word        │
│  Output: audio.mp3 + word_timestamps.json           │
└─────────────────────────┬───────────────────────────┘
                          │
    ▼
┌─────────────────────────────────────────────────────┐
│  03-visuals.ts — Asset Preparation                  │
│  Validates character + background assets            │
│  FFmpeg fallback: color=c=yellow if no background   │
└─────────────────────────┬───────────────────────────┘
                          │
    ▼
┌─────────────────────────────────────────────────────┐
│  04-subtitles.ts — ASS Subtitle Generation          │
│  Whisper JSON → ASS format                          │
│  {\c&H00FFFF&} word highlight — native FFmpeg       │
│  No PNG frame generation — pure ASS filter          │
└─────────────────────────┬───────────────────────────┘
                          │
    ▼
┌─────────────────────────────────────────────────────┐
│  05-compose.ts — FFmpeg Composition                 │
│  Complex filter graph:                              │
│  video + audio + ASS subtitles + character frames   │
│  fluent-ffmpeg declarative filter chaining          │
│  Output: output/video_final.mp4 (1080×1920)         │
└─────────────────────────────────────────────────────┘
```

---

## Key Engineering Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Runtime | TypeScript / Node.js | Async I/O event loop ideal for parallel API calls + FFmpeg child processes |
| State passing | `PipelineContext` typed object | Strong typing prevents missing-property runtime errors across 5 stages |
| FFmpeg integration | `fluent-ffmpeg` | Declarative filter chaining vs assembling giant command strings |
| Subtitle format | ASS (Advanced SubStation Alpha) | `{\c&H00FFFF&}` word highlight natively in FFmpeg — zero frame-by-frame PNG generation |
| TTS timestamps | Whisper word-level | Precision word sync vs linear approximation (duration / word count) |
| Temp artifacts | `tmp/gen_TIMESTAMP/` | Stage-isolated artifacts enable pipeline resume on partial failure |
| LLM persona | System Prompt injection | Persona (tone, style, character voice) decoupled from content prompt |

---

## Free Tier Strategy

Full pipeline runs at zero cost:

```
LLM:       Gemini via AI Studio API (free tier, 1,500 req/day)
           └── Claude / GPT-4o fallback (paid, ~$0.001/video)

TTS:       ElevenLabs free tier
           └── GROQ Whisper (free) for word timestamps

Fallback:  GROQ API (Whisper + LLM) — entirely free
```

Configure in `.env` — see `.env.example` for all keys.

---

## Cost Analysis (Paid Path)

For a typical ~30 second video (~90–100 words):

| Service | Usage | Cost |
|---------|-------|------|
| GPT-4o | ~150 prompt + ~100 completion tokens | ~$0.001 |
| TTS-1-HD | ~600 characters | ~$0.015 |
| Whisper-1 | 30 seconds audio | ~$0.003 |
| **Total** | | **~$0.02 per video** |

Generation time: ~5s API calls + ~10s FFmpeg encode = **< 15 seconds total**

---

## Quick Start

```bash
git clone https://github.com/ChaiebDhia/overlord-ai-video-pipeline
cd overlord-ai-video-pipeline
npm install
cp .env.example .env
# Add your API keys — free tier keys work, see .env.example comments

npx tsc

# CLI mode
node dist/index.js --prompt "Your prompt here"

# Web UI (bonus interface)
node dist/server.js
# Visit http://localhost:3000
```

---

## Output

Input:
```
Explain why you should never lend money to friends,
in a humorous and cynical tone.
```

Output: `output/video_final.mp4`  
— 1080×1920 · voiced · word-highlighted subtitles · ready to upload

---

## Roadmap

- [ ] RMS audio amplitude analysis for frame-accurate lip-sync
- [ ] Background music mixing via additional FFmpeg audio stream  
- [ ] On-the-fly character image generation via DALL-E / Gemini Imagen
