import { PipelineContext } from '../types/pipeline';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

export async function runStep03(context: PipelineContext): Promise<void> {
    console.log('[3/5] Preparing visuals...');
    
    let bgAssetPath = path.resolve('assets', 'background.png');
    
    // Enterprise Upgrade: Dynamically generate background with DALL-E 3 if enabled & key attached
    // We try to fetch the asset, or generate a customized one based on the prompt mood !
    if (!fs.existsSync(bgAssetPath) && process.env.OPENAI_API_KEY && process.env.USE_DALLE === 'true') {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log(`\t> Requesting DALL-E 3 for custom vertical background...`);
        try {
            const res = await openai.images.generate({
                model: "dall-e-3",
                prompt: `A beautiful vertical 9:16 background without any text. Context: ${context.script?.backgroundDescription || 'A golden bank vault'}. Pixar 3d style animation, vibrant colors.`,
                size: "1024x1792",
                n: 1,
            });
            if (res.data?.[0]?.url) {
                const imgRes = await fetch(res.data[0].url);
                const arrayBuffer = await imgRes.arrayBuffer();
                bgAssetPath = path.join(context.workDir, 'generated_background.png');
                fs.writeFileSync(bgAssetPath, Buffer.from(arrayBuffer));
                console.log(`\t> Got DALL-E background: ${bgAssetPath}`);
            }
        } catch (e: any) {
            console.warn(`\t> DALL-E generation failed: ${e.message}. Using fallback.`);
        }
    }

    const mClosed = path.resolve('assets', 'picsou_mouth_closed.png');
    const mOpen = path.resolve('assets', 'picsou_mouth_open.png');
    
    [mClosed, mOpen].forEach((p, idx) => {
        if (!fs.existsSync(p)) {
            console.warn(`\t> Dummy character asset missing for ${p}, auto-generating a placeholder with FFmpeg.`);
            const color = idx === 0 ? 'brown' : 'yellow'; // Closed=brown, Open=yellow placeholder cubes
            const text = idx === 0 ? 'Closed' : 'Open';
            spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `color=c=${color}:s=400x500`, '-vf', `drawtext=text='${text}':fontcolor=white:fontsize=80:x=(w-text_w)/2:y=(h-text_h)/2`, '-frames:v', '1', p]);
        }
    });
    
    context.visuals = {
        backgroundPath: fs.existsSync(bgAssetPath) ? bgAssetPath : 'color=c=black:s=1080x1920',
        characterFrames: {
            mouthClosed: mClosed,
            mouthOpen: mOpen,
        }
    };
    
    console.log(`\t✓ Visuals prepared`);
}