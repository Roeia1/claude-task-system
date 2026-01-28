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
import { scopeValidatorCommand } from './commands/scope-validator.js';
import { findCommand } from './commands/find.js';
import { worktreeCommand } from './commands/worktree.js';
import {
  sessionsListCommand,
  sessionsStatusCommand,
  sessionsLogsCommand,
  sessionsKillCommand,
} from './commands/sessions/index.js';

// Read version from package.json
// In the bundled CJS output, __dirname will be available
declare const __dirname: string;
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('saga')
  .description('CLI for SAGA - Structured Autonomous Goal Achievement')
  .version(packageJson.version)
  .addHelpCommand('help [command]', 'Display help for a command');

// Global --path option
program.option('-p, --path <dir>', 'Path to SAGA project directory (overrides auto-discovery)');

// init command
program
  .command('init')
  .description('Initialize .saga/ directory structure')
  .option('--dry-run', 'Show what would be created without making changes')
  .action(async (options: { dryRun?: boolean }) => {
    const globalOpts = program.opts();
    await initCommand({ path: globalOpts.path, dryRun: options.dryRun });
  });

// implement command
program
  .command('implement <story-slug>')
  .description('Run story implementation')
  .option('--max-cycles <n>', 'Maximum number of implementation cycles', parseInt)
  .option('--max-time <n>', 'Maximum time in minutes', parseInt)
  .option('--model <name>', 'Model to use for implementation')
  .option('--dry-run', 'Validate dependencies without running implementation')
  .option('--attached', 'internal: run synchronously inside tmux session')
  .action(async (storySlug: string, options: { maxCycles?: number; maxTime?: number; model?: string; dryRun?: boolean; attached?: boolean }) => {
    const globalOpts = program.opts();
    await implementCommand(storySlug, {
      path: globalOpts.path,
      maxCycles: options.maxCycles,
      maxTime: options.maxTime,
      model: options.model,
      dryRun: options.dryRun,
      attached: options.attached,
    });
  });

// find command
program
  .command('find <query>')
  .description('Find an epic or story by slug/title')
  .option('--type <type>', 'Type to search for: epic or story (default: story)')
  .option('--status <status>', 'Filter stories by status (e.g., ready, in-progress, completed)')
  .action(async (query: string, options: { type?: 'epic' | 'story'; status?: string }) => {
    const globalOpts = program.opts();
    await findCommand(query, {
      path: globalOpts.path,
      type: options.type,
      status: options.status,
    });
  });

// worktree command
program
  .command('worktree <epic-slug> <story-slug>')
  .description('Create git worktree for a story')
  .action(async (epicSlug: string, storySlug: string) => {
    const globalOpts = program.opts();
    await worktreeCommand(epicSlug, storySlug, { path: globalOpts.path });
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

// scope-validator command (internal - used by implement command's hook system)
program
  .command('scope-validator')
  .description('Validate file operations against story scope (internal)')
  .action(async () => {
    await scopeValidatorCommand();
  });

// sessions command group
const sessionsCommand = program
  .command('sessions')
  .description('Manage SAGA tmux sessions');

sessionsCommand
  .command('list')
  .description('List all SAGA sessions')
  .action(async () => {
    await sessionsListCommand();
  });

sessionsCommand
  .command('status <name>')
  .description('Show session status')
  .action(async (name: string) => {
    await sessionsStatusCommand(name);
  });

sessionsCommand
  .command('logs <name>')
  .description('Stream session output')
  .action(async (name: string) => {
    await sessionsLogsCommand(name);
  });

sessionsCommand
  .command('kill <name>')
  .description('Terminate a session')
  .action(async (name: string) => {
    await sessionsKillCommand(name);
  });

// Error handling for unknown commands
program.on('command:*', (operands) => {
  console.error(`error: unknown command '${operands[0]}'`);
  process.exit(1);
});

program.parse();
