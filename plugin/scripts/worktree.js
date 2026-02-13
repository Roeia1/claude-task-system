#!/usr/bin/env node

// src/scripts/worktree.ts
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import process2 from "node:process";

// src/directory.ts
function normalizeRoot(projectRoot) {
  return projectRoot.endsWith("/") ? projectRoot.slice(0, -1) : projectRoot;
}
function createSagaPaths(projectRoot) {
  const root = normalizeRoot(projectRoot);
  const saga = `${root}/.saga`;
  return {
    root,
    saga,
    epics: `${saga}/epics`,
    stories: `${saga}/stories`,
    worktrees: `${saga}/worktrees`,
    archive: `${saga}/archive`
  };
}
function createWorktreePaths(projectRoot, storyId) {
  const { worktrees } = createSagaPaths(projectRoot);
  return {
    storyId,
    worktreeDir: `${worktrees}/${storyId}`
  };
}

// src/scripts/shared/env.ts
import process from "node:process";
function getProjectDir() {
  const projectDir = process.env.SAGA_PROJECT_DIR;
  if (!projectDir) {
    throw new Error(
      "SAGA_PROJECT_DIR environment variable is not set.\nThis script must be run from a SAGA session where env vars are set."
    );
  }
  return projectDir;
}

// src/scripts/worktree.ts
function getProjectDir2() {
  const projectDir = getProjectDir();
  const sagaPaths = createSagaPaths(projectDir);
  if (!existsSync(sagaPaths.saga)) {
    throw new Error(
      `No .saga/ directory found at SAGA_PROJECT_DIR: ${projectDir}
Make sure SAGA_PROJECT_DIR points to a SAGA project root.`
    );
  }
  return projectDir;
}
function runGitCommand(args, cwd) {
  try {
    const output = execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    const execError = error;
    const stderr = execError.stderr?.toString().trim() || execError.message || String(error);
    return { success: false, output: stderr };
  }
}
function branchExists(branchName, cwd) {
  const result = runGitCommand(["rev-parse", "--verify", branchName], cwd);
  return result.success;
}
function getMainBranch(cwd) {
  const result = runGitCommand(["symbolic-ref", "refs/remotes/origin/HEAD"], cwd);
  if (result.success) {
    return result.output.replace("refs/remotes/origin/", "");
  }
  return "main";
}
function createWorktree(projectPath, storyId) {
  const branchName = `story/${storyId}`;
  const worktreePaths = createWorktreePaths(projectPath, storyId);
  if (branchExists(branchName, projectPath)) {
    return {
      success: false,
      error: `Branch already exists: ${branchName}`
    };
  }
  if (existsSync(worktreePaths.worktreeDir)) {
    return {
      success: false,
      error: `Worktree directory already exists: ${worktreePaths.worktreeDir}`
    };
  }
  const mainBranch = getMainBranch(projectPath);
  runGitCommand(["fetch", "origin", mainBranch], projectPath);
  const createBranchResult = runGitCommand(
    ["branch", branchName, `origin/${mainBranch}`],
    projectPath
  );
  if (!createBranchResult.success) {
    return {
      success: false,
      error: `Failed to create branch: ${createBranchResult.output}`
    };
  }
  const worktreeParent = dirname(worktreePaths.worktreeDir);
  mkdirSync(worktreeParent, { recursive: true });
  const createWorktreeResult = runGitCommand(
    ["worktree", "add", worktreePaths.worktreeDir, branchName],
    projectPath
  );
  if (!createWorktreeResult.success) {
    return {
      success: false,
      error: `Failed to create worktree: ${createWorktreeResult.output}`
    };
  }
  return {
    success: true,
    worktreePath: worktreePaths.worktreeDir,
    branch: branchName
  };
}
function printHelp() {
  console.log(`Usage: worktree <storyId>

Create a git worktree for story isolation.

Arguments:
  storyId      The story identifier

Options:
  --help       Show this help message

Environment (required):
  SAGA_PROJECT_DIR   Project root directory

Output (JSON):
  { "success": true, "worktreePath": "...", "branch": "..." }
  { "success": false, "error": "..." }

Examples:
  worktree my-story-id
`);
}
function parseArgs(args) {
  const result = {
    help: false
  };
  const positional = [];
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }
  if (positional.length > 0) {
    result.storyId = positional[0];
  }
  return result;
}
function main() {
  const args = parseArgs(process2.argv.slice(2));
  if (args.help) {
    printHelp();
    process2.exit(0);
  }
  if (!args.storyId) {
    console.error("Error: storyId is required.\n");
    printHelp();
    process2.exit(1);
  }
  let projectPath;
  try {
    projectPath = getProjectDir2();
  } catch (error) {
    const result2 = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    console.log(JSON.stringify(result2, null, 2));
    process2.exit(1);
  }
  const result = createWorktree(projectPath, args.storyId);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) {
    process2.exit(1);
  }
}
main();
