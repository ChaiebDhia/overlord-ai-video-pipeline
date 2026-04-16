import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { withRetry } from '../utils/retry';
dotenv.config();

export interface LLMResponse {
  script: string;
  background_description: string;
  mood: string;
  estimated_duration_seconds: number;
}

export async function generateScriptLLM(prompt: string, provider: 'openai' | 'anthropic' | 'google' = process.env.LLM_PROVIDER as any || 'openai'): Promise<LLMResponse> {
  const promptPath = path.resolve('prompts', 'script-system.txt');
  const systemPrompt = fs.existsSync(promptPath) 
    ? fs.readFileSync(promptPath, 'utf8') 
    : `Tu es Picsou... (Fallback: fichier prompt non trouvé)`;

  return withRetry(async () => {
    if (provider === 'openai') {
      const useGroq = !!process.env.GROQ_API_KEY;
      const apiKey = useGroq ? process.env.GROQ_API_KEY! : process.env.OPENAI_API_KEY!;
      const openai = new OpenAI({ 
          apiKey: apiKey,
          baseURL: useGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1"
      });
      const response = await openai.chat.completions.create({
        model: useGroq ? 'llama-3.1-8b-instant' : 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
    } else if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      // @ts-ignore
      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid output from Claude");
      return JSON.parse(jsonMatch[0]);
    } else if (provider === 'google') {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-pro', systemInstruction: systemPrompt });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid format from Gemini");
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Provider ${provider} not implemented.`);
    }
  });
}