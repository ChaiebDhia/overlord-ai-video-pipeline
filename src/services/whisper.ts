import OpenAI from 'openai';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { withRetry } from '../utils/retry';
dotenv.config();

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
}

export async function getTimestamps(audioPath: string): Promise<TranscriptionWord[]> {
  return withRetry(async () => {
    // Si l'utilisateur a configuré Groq (Gratuit & Ultra rapide) on l'utilise à la place d'OpenAI
    const useGroq = !!process.env.GROQ_API_KEY;
    const apiKey = useGroq ? process.env.GROQ_API_KEY! : process.env.OPENAI_API_KEY!;
    
    if (!apiKey) {
      throw new Error("Clé API manquante pour Whisper (GROQ_API_KEY ou OPENAI_API_KEY)");
    }

    const openai = new OpenAI({ 
        apiKey: apiKey,
        baseURL: useGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1"
    });

    const response = await openai.audio.transcriptions.create({
      model: useGroq ? 'whisper-large-v3-turbo' : 'whisper-1',
      file: fs.createReadStream(audioPath),
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    if (!response.words || response.words.length === 0) {
      throw new Error('No words found in transcription. Audio could be corrupt or silent.');
    }

    return response.words.map(w => ({
      word: w.word,
      start: w.start,
      end: w.end
    }));
  });
}