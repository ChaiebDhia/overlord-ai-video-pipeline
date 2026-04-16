import { PipelineContext } from '../types/pipeline';
import { generateScriptLLM } from '../services/llm';

export async function runStep01(context: PipelineContext): Promise<void> {
    console.log('[1/5] Generating script...');
    const result = await generateScriptLLM(context.prompt);
    
    context.script = {
        text: result.script,
        backgroundDescription: result.background_description,
        mood: result.mood,
        wordCount: result.script.split(' ').length,
        estimatedDurationSeconds: result.estimated_duration_seconds
    };
    
    console.log(`\t✓ Script generated (${context.script.wordCount} words, ~${context.script.estimatedDurationSeconds}s)`);
}