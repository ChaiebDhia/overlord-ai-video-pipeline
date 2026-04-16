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
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,2,2,10,10,200,1
Style: Highlight,Arial,65,&H0000FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,2,2,10,10,200,1

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

    words.forEach(w => {
        const start = formatTime(w.start);
        const end = formatTime(w.end);
        events += `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\c&H00FFFF&}${w.word}\n`;
    });

    const assFilePath = path.join(context.workDir, 'subtitles.ass').replace(/\\/g, '/');
    fs.writeFileSync(assFilePath, assContent.trim() + '\n' + events);

    context.subtitles = {
        entries: words,
        assFilePath
    };
    
    console.log(`\t✓ Subtitles generated (${words.length} subtitle entries)`);
}