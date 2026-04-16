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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
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