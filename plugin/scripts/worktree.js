#!/usr/bin/env node

// src/worktree.ts
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
function resolveProjectPath(explicitPath) {
  const targetPath = explicitPath ?? process.cwd();
  const sagaDir = join(targetPath, ".saga");
  if (!existsSync(sagaDir)) {
    throw new Error(
      `No .saga/ directory found at specified path: ${targetPath}
Make sure the path points to a SAGA project root.`
    );
  }
  return targetPath;
}
function runGitCommand(args, cwd) {
  try {
    const output = execSync(`git ${args.join(" ")}`, {
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
function createWorktree(projectPath, epicSlug, storySlug) {
  const branchName = `story-${storySlug}-epic-${epicSlug}`;
  const worktreePath = join(projectPath, ".saga", "worktrees", epicSlug, storySlug);
  if (branchExists(branchName, projectPath)) {
    return {
      success: false,
      error: `Branch already exists: ${branchName}`
    };
  }
  if (existsSync(worktreePath)) {
    return {
      success: false,
      error: `Worktree directory already exists: ${worktreePath}`
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
  const worktreeParent = join(projectPath, ".saga", "worktrees", epicSlug);
  mkdirSync(worktreeParent, { recursive: true });
  const createWorktreeResult = runGitCommand(
    ["worktree", "add", worktreePath, branchName],
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
    worktreePath,
    branch: branchName
  };
}
function printHelp() {
  console.log(`Usage: worktree <epic-slug> <story-slug> [options]

Create a git worktree for story isolation.

Arguments:
  epic-slug    The epic identifier
  story-slug   The story identifier

Options:
  --path <path>  Path to the SAGA project (defaults to current directory)
  --help         Show this help message

Output (JSON):
  { "success": true, "worktreePath": "...", "branch": "..." }
  { "success": false, "error": "..." }

Examples:
  worktree my-epic my-story
  worktree my-epic my-story --path /path/to/project
`);
}
function parseArgs(args) {
  const result = { help: false };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--path") {
      result.path = args[++i];
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }
  if (positional.length >= 1) result.epicSlug = positional[0];
  if (positional.length >= 2) result.storySlug = positional[1];
  return result;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (!args.epicSlug || !args.storySlug) {
    console.error("Error: Both epic-slug and story-slug are required.\n");
    printHelp();
    process.exit(1);
  }
  let projectPath;
  try {
    projectPath = resolveProjectPath(args.path);
  } catch (error) {
    const result2 = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    console.log(JSON.stringify(result2, null, 2));
    process.exit(1);
  }
  const result = createWorktree(projectPath, args.epicSlug, args.storySlug);
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) {
    process.exit(1);
  }
}
main();
