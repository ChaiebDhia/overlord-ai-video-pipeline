import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runPipeline } from './pipeline';

const args = yargs(hideBin(process.argv))
  .option('prompt', {
    alias: 'p',
    type: 'string',
    description: 'The prompt to generate the video from',
    demandOption: true,
  })
  .option('from-step', {
    type: 'number',
    description: 'The step to start from (1-5)',
    default: 1,
  })
  .option('keep-tmp', {
    type: 'boolean',
    description: 'Keep temporary files after generation',
    default: false,
  })
  .parseSync();

console.log(`Starting generation for prompt: "${args.prompt}"`);
runPipeline(args.prompt, args['from-step'], args['keep-tmp']);