import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface Interval {
    start: number;
    end: number;
}

export function getMouthOpenIntervals(audioPath: string, workDir: string, fps: number = 30): Interval[] {
    const pcmPath = path.join(workDir, 'audio.pcm');
    
    // Extract raw audio via ffmpeg
    const result = spawnSync('ffmpeg', ['-y', '-i', audioPath, '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '1', pcmPath]);
    
    if (result.error || !fs.existsSync(pcmPath)) {
        console.warn('Failed to extract PCM audio for lip sync. Relying on fallback animation.');
        return []; // return empty intervals
    }
    
    const buffer = fs.readFileSync(pcmPath);
    const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    
    const samplesPerFrame = Math.floor(44100 / fps);
    const frames = Math.floor(int16Array.length / samplesPerFrame);
    
    const rmsValues: number[] = [];
    let sumRms = 0;
    
    for (let i = 0; i < frames; i++) {
        let sumSq = 0;
        for (let j = 0; j < samplesPerFrame; j++) {
            const val = int16Array[i * samplesPerFrame + j] / 32768.0;
            sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / samplesPerFrame);
        rmsValues.push(rms);
        sumRms += rms;
    }
    
    const avgRms = sumRms / (frames || 1);
    // Adaptive threshold (e.g. 1.2x the average RMS to capture peaks)
    const threshold = avgRms * 1.2;
    
    const intervals: Interval[] = [];
    let inOpen = false;
    let pOpenStart = 0;
    
    for (let i = 0; i < frames; i++) {
        const isOpen = rmsValues[i] > threshold;
        if (isOpen && !inOpen) {
            inOpen = true;
            pOpenStart = i / fps;
        } else if (!isOpen && inOpen) {
            inOpen = false;
            // Skip tiny glitches
            const duration = (i / fps) - pOpenStart;
            if (duration >= 0.05) { 
                intervals.push({start: parseFloat(pOpenStart.toFixed(3)), end: parseFloat((i / fps).toFixed(3))});
            }
        }
    }
    
    if (inOpen) {
        intervals.push({start: parseFloat(pOpenStart.toFixed(3)), end: parseFloat((frames / fps).toFixed(3))});
    }

    try { fs.unlinkSync(pcmPath); } catch (e) {} // cleanup
    
    return intervals;
}
