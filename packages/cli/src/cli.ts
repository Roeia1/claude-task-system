/**
 * SAGA CLI - Command-line interface for SAGA
 *
 * Commands:
 *   saga init              Initialize .saga/ directory structure
 *   saga implement <slug>  Run story implementation
 *   saga dashboard         Start the dashboard server
 */

import { Command } from 'commander';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { initCommand } from './commands/init.js';
import { implementCommand } from './commands/implement.js';
import { dashboardCommand } from './commands/dashboard.js';

// Read version from package.json
// In the bundled CJS output, __dirname will be available
declare const __dirname: string;
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('saga')
  .description('CLI for SAGA - Structured Autonomous Goal Achievement')
  .version(packageJson.version);

// Global --path option
program.option('-p, --path <dir>', 'Path to SAGA project directory (overrides auto-discovery)');

// init command
program
  .command('init')
  .description('Initialize .saga/ directory structure')
  .action(async () => {
    const globalOpts = program.opts();
    await initCommand({ path: globalOpts.path });
  });

// implement command
program
  .command('implement <story-slug>')
  .description('Run story implementation')
  .option('--max-cycles <n>', 'Maximum number of implementation cycles', parseInt)
  .option('--max-time <n>', 'Maximum time in minutes', parseInt)
  .option('--model <name>', 'Model to use for implementation')
  .action(async (storySlug: string, options: { maxCycles?: number; maxTime?: number; model?: string }) => {
    const globalOpts = program.opts();
    await implementCommand(storySlug, {
      path: globalOpts.path,
      maxCycles: options.maxCycles,
      maxTime: options.maxTime,
      model: options.model,
    });
  });

// dashboard command
program
  .command('dashboard')
  .description('Start the dashboard server')
  .option('--port <n>', 'Port to run the server on (default: 3847)', parseInt)
  .action(async (options: { port?: number }) => {
    const globalOpts = program.opts();
    await dashboardCommand({
      path: globalOpts.path,
      port: options.port,
    });
  });

// Error handling for unknown commands
program.on('command:*', (operands) => {
  console.error(`error: unknown command '${operands[0]}'`);
  process.exit(1);
});

program.parse();
