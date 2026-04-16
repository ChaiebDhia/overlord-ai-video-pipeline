import OpenAI from 'openai';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { withRetry } from '../utils/retry';
dotenv.config();

export async function generateAudio(text: string, outputPath: string, voice: string = 'onyx'): Promise<string> {
  return withRetry(async () => {
    // Si ElevenLabs est configuré (Totalement gratuit pour 10 000 chars/mois sans carte bancaire)
    if (process.env.ELEVENLABS_API_KEY) {
        console.log("Utilisation de ElevenLabs TTS (Gratuit)");
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb', { 
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`ElevenLabs Error: ${response.statusText} - ${errText}`);
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength < 100) {
            throw new Error('ElevenLabs generated audio is suspiciously small.');
        }
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
    }

    // Sinon Fallback vers OpenAI (Si facturé / compte premium)
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("Aucune clé TTS disponible (Ni ELEVENLABS_API_KEY ni OPENAI_API_KEY).");
    }
    
    console.log("Utilisation de OpenAI TTS");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.audio.speech.create({
      model: 'tts-1', // Remplacé hd par normal (plus tolérant)
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