import ffmpeg from 'fluent-ffmpeg';

export function runFFmpegCommand(options: {
    inputs: string[],
    complexFilter: string[],
    outputOptions: string[],
    outputPath: string
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const cmd = ffmpeg();
        options.inputs.forEach(input => {
            if (input.endsWith('.png') || input.endsWith('.jpg') || input.endsWith('.jpeg')) {
                cmd.input(input).inputOptions(['-loop', '1', '-framerate', '30']);
            } else {
                cmd.input(input);
            }
        });
        
        cmd.complexFilter(options.complexFilter)
           .outputOptions(options.outputOptions)
           .output(options.outputPath)
           .on('end', () => resolve())
           .on('error', (err) => reject(err))
           .run();
    });
}