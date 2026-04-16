import OpenAI from 'openai';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { withRetry } from '../utils/retry';
dotenv.config();

export async function generateAudio(text: string, outputPath: string, voice: string = 'onyx'): Promise<string> {
  return withRetry(async () => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: voice as any,
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 100) {
        throw new Error('Generated audio is suspiciously small.');
    }
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  });
}