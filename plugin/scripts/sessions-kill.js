#!/usr/bin/env node

// src/sessions-kill.ts
import { spawnSync } from "node:child_process";
import process from "node:process";
function killSession(sessionName) {
  const result = spawnSync("tmux", ["kill-session", "-t", sessionName], {
    encoding: "utf-8"
  });
  return {
    killed: result.status === 0
  };
}
function printUsage() {
  const usage = `
Usage: sessions-kill <session-name>

Terminate a SAGA worker tmux session.

Arguments:
  session-name  The name of the tmux session to kill
                (e.g., saga__my-epic__my-story__1234567890)

Output:
  JSON object with { killed: boolean }

Examples:
  # Kill a specific session
  node sessions-kill.js saga__cli-refactor__dashboard__1234567890

  # Kill session and check result
  node sessions-kill.js saga__epic__story__1234 | jq '.killed'
`.trim();
  console.log(usage);
}
function printError(message) {
  process.stderr.write(`Error: ${message}
`);
}
function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }
  if (args.length === 0) {
    printError("Missing required argument: session-name");
    printUsage();
    process.exit(1);
  }
  const sessionName = args[0];
  const result = killSession(sessionName);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
main();
export {
  killSession
};
