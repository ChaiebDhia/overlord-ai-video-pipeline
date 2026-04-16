import { PipelineContext } from '../types/pipeline';
import { generateAudio } from '../services/tts';
import { getTimestamps } from '../services/whisper';
import path from 'path';

export async function runStep02(context: PipelineContext): Promise<void> {
    console.log('[2/5] Generating voice...');
    if (!context.script) throw new Error('Script is missing');

    const audioPath = path.join(context.workDir, 'voice.mp3');
    await generateAudio(context.script.text, audioPath);

    const words = await getTimestamps(audioPath);
    
    context.voice = {
        audioPath,
        durationSeconds: words[words.length - 1].end,
        words
    };
    
    console.log(`\t✓ Voice generated (${path.basename(audioPath)}, duration: ${context.voice.durationSeconds.toFixed(1)}s)`);
}