import { PipelineContext } from '../types/pipeline';
import path from 'path';
import fs from 'fs';

export async function runStep04(context: PipelineContext): Promise<void> {
    console.log('[4/5] Generating subtitles...');
    
    if (!context.voice) throw new Error('Voice timestamps are missing');
    
    const words = context.voice.words;
    
    const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,90,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,6,0,2,10,10,400,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let events = '';
    
    const formatTime = (timeSeconds: number) => {
        const d = new Date(timeSeconds * 1000);
        const h = String(d.getUTCHours()).padStart(1, '0');
        const m = String(d.getUTCMinutes()).padStart(2, '0');
        const s = String(d.getUTCSeconds()).padStart(2, '0');
        const ms = String(d.getUTCMilliseconds()).padStart(3, '0').substring(0,2);
        return `${h}:${m}:${s}.${ms}`;
    };

    // Make subtitles uppercase like Hormozi, add bold yellow highlight per word
    words.forEach(w => {
        const start = formatTime(w.start);
        const end = formatTime(w.end);
        const uppercaseWord = w.word.toUpperCase();
        events += `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\c&H0000D7FF&}{\\3c&H00000000&}${uppercaseWord}\n`;
    });

    const assFilePath = path.join(context.workDir, 'subtitles.ass').replace(/\\/g, '/');
    fs.writeFileSync(assFilePath, assContent.trim() + '\n' + events);

    context.subtitles = {
        entries: words,
        assFilePath
    };
    
    console.log(`\t✓ Subtitles generated (${words.length} subtitle entries)`);
}