import { PipelineContext } from '../types/pipeline';
import path from 'path';
import { runFFmpegCommand } from '../services/ffmpeg';
import fs from 'fs';
import { getMouthOpenIntervals } from '../utils/audio';

export async function runStep05(context: PipelineContext): Promise<void> {
    console.log('[5/5] Composing video...');
    
    if (!context.visuals || !context.voice || !context.subtitles) {
        throw new Error('Missing dependencies for final composition');
    }

    const { backgroundPath, characterFrames } = context.visuals;
    const voicePath = context.voice.audioPath;
    const duration = context.voice.durationSeconds;
    // FFmpeg's ass filter on Windows has terrible escaping rules for 'C:/', so we use a relative path
    const absoluteAss = context.subtitles.assFilePath!;
    const subtitlesPath = path.relative(process.cwd(), absoluteAss).replace(/\\/g, '/');
    
    const outputPath = path.join(process.env.OUTPUT_DIR || './output', `video_${Date.now()}.mp4`).replace(/\\/g, '/');
    if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // AI Lip-Sync (Audio Amplitude RMS threshold level 2!)
    const intervals = getMouthOpenIntervals(voicePath, context.workDir);
    let openStr = '';
    if (intervals.length > 0) {
        openStr = intervals.map(interv => `between(t,${interv.start},${interv.end})`).join('+');
    } else {
        openStr = '0'; // fallback, mouth never opens if analysis failed
    }
    
    console.log(`\t> Generated precise AI lipsync array mapping for ${intervals.length} verbal hits.`);

    const isSolidColorBg = backgroundPath.startsWith('color=');
    const inputs = [];
    
    if (!isSolidColorBg) inputs.push(backgroundPath);
    inputs.push(characterFrames.mouthClosed);
    inputs.push(characterFrames.mouthOpen);
    inputs.push(voicePath);

    const complexFilters: string[] = [];
    
    if (isSolidColorBg) {
       complexFilters.push(`color=c=yellow:s=1080x1920:d=${Math.ceil(duration)}[bg]`); 
    } else {
       complexFilters.push(`[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=10,colorchannelmixer=rr=0.4:gg=0.4:bb=0.4[bg]`);
    }

    const closedIdx = isSolidColorBg ? 0 : 1;
    const openIdx = isSolidColorBg ? 1 : 2;
    
    // Lip-Sync Engine: overlaying closed first, then overlay map "open" based on the "ENABLE" timestamps
    complexFilters.push(`[${closedIdx}:v]scale=1000:-1[closed]`);
    complexFilters.push(`[bg][closed]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2+200[v1]`);
    
    complexFilters.push(`[${openIdx}:v]scale=1000:-1[open]`);
    complexFilters.push(`[v1][open]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2+200:enable='${openStr}'[comp_v0]`);
    
    const subtitleFilter = `[comp_v0]ass='${subtitlesPath}'[final_v]`;
    complexFilters.push(subtitleFilter);
    
    // Bonus Feature: Lofi Background Music mixing (if exists)
    const bgmPath = path.resolve('assets', 'music.mp3');
    let finalAudioMap = `${isSolidColorBg ? 2 : 3}:a`;
    if (fs.existsSync(bgmPath)) {
       inputs.push(bgmPath);
       const bgmIndex = inputs.length - 1;
       // Volume reduce bgm by 0.1, mix with voice 1.0
       complexFilters.push(`[${finalAudioMap}]volume=1.0[voice];[${bgmIndex}:a]volume=0.08[bgm];[voice][bgm]amix=inputs=2:duration=shortest[mixed_audio]`);
       finalAudioMap = `[mixed_audio]`;
       console.log(`\t> Mixed background music from assets/music.mp3`);
    }

    await runFFmpegCommand({
        inputs: inputs,
        complexFilter: complexFilters,
        outputOptions: [
            `-map [final_v]`,
            `-map ${finalAudioMap}`,
            `-shortest`,
            `-c:v libx264`,
            `-pix_fmt yuv420p`,
            `-c:a aac`
        ],
        outputPath: outputPath
    }).catch(e => {
        console.error("FFMPEG ERROR", JSON.stringify(complexFilters, null, 2));
        throw e;
    });

    context.output = {
        videoPath: outputPath,
        resolution: '1080x1920',
        durationSeconds: duration
    };

    console.log(`\t✓ Video generated: ${outputPath}`);
}