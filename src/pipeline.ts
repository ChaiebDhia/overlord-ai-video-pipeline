import { runStep01 } from './steps/01-script';
import { runStep02 } from './steps/02-voice';
import { runStep03 } from './steps/03-visuals';
import { runStep04 } from './steps/04-subtitles';
import { runStep05 } from './steps/05-compose';
import { PipelineContext } from './types/pipeline';
import path from 'path';
import fs from 'fs';

export async function runPipeline(prompt: string, fromStep: number = 1, keepTmp: boolean = false): Promise<string> {
    const workDir = path.join(process.cwd(), 'tmp', `gen_${Date.now()}`);
    
    if (fromStep === 1) {
        if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });
    }

    const context: PipelineContext = {
        prompt,
        workDir
    };

    try {
        if (fromStep <= 1) await runStep01(context);
        if (fromStep <= 2) await runStep02(context);
        if (fromStep <= 3) await runStep03(context);
        if (fromStep <= 4) await runStep04(context);
        if (fromStep <= 5) await runStep05(context);
        
        console.log('\n✅ Video successfully generated!');
        
        if (!keepTmp) {
            fs.rmSync(workDir, { recursive: true, force: true });
            console.log('\t> Temporary files cleaned up.');
        }

        return context.output!.videoPath;
    } catch (e: any) {
        console.error('\n❌ Pipeline failed:');
        console.error(`\t→ Reason: ${e.message || e}`);
        
        if (!keepTmp && fs.existsSync(workDir)) {
           console.log(`\t> Kept temporary files in ${workDir} for debugging.`);
        }
        
        // In CLI mode, we shouldn't throw a raw Error which causes a nasty stack trace 
        // to the user. We exit gracefully if executing via CLI.
        if (require.main === module || process.env.IS_CLI === 'true') {
            process.exit(1);
        } else {
            throw e;
        }
    }
}