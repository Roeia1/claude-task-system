/**
 * SAGA Dashboard - Standalone dashboard and session monitoring
 *
 * Commands:
 *   saga dashboard              Start the dashboard server
 *   saga sessions list          List all SAGA sessions
 *   saga sessions status <name> Show session status
 *   saga sessions logs <name>   Stream session output
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import { dashboardCommand } from './commands/dashboard.ts';
import {
  sessionsListCommand,
  sessionsLogsCommand,
  sessionsStatusCommand,
} from './commands/sessions/index.ts';

// Read version from package.json
// In the bundled CJS output, __dirname will be available
declare const __dirname: string;
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

const program = new Command();

program
  .name('saga')
  .description('Dashboard and session monitoring for SAGA - Structured Autonomous Goal Achievement')
  .version(packageJson.version)
  .addHelpCommand('help [command]', 'Display help for a command');

// Global --path option
program.option(
	"-p, --path <dir>",
	"Path to SAGA project directory (overrides auto-discovery)",
);

// dashboard command
program
	.command("dashboard")
	.description("Start the dashboard server")
	.option(
		"--port <n>",
		"Port to run the server on (default: 3847)",
		Number.parseInt,
	)
	.action(async (options: { port?: number }) => {
		const globalOpts = program.opts();
		await dashboardCommand({
			path: globalOpts.path,
			port: options.port,
		});
	});

// sessions command group
const sessionsCommand = program
	.command("sessions")
	.description("Manage SAGA tmux sessions");

sessionsCommand
	.command("list")
	.description("List all SAGA sessions")
	.action(async () => {
		await sessionsListCommand();
	});

sessionsCommand
	.command("status <name>")
	.description("Show session status")
	.action(async (name: string) => {
		await sessionsStatusCommand(name);
	});

sessionsCommand
	.command("logs <name>")
	.description("Stream session output")
	.action(async (name: string) => {
		await sessionsLogsCommand(name);
	});

// Error handling for unknown commands
program.on("command:*", (operands) => {
	console.error(`error: unknown command '${operands[0]}'`);
	process.exit(1);
});

program.parse();
