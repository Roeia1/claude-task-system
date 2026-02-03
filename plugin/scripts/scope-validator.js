#!/usr/bin/env node

// src/scope-validator.ts
import { relative, resolve } from "node:path";
import process from "node:process";
var EXIT_ALLOWED = 0;
var EXIT_BLOCKED = 2;
var FILE_PATH_WIDTH = 50;
var EPIC_STORY_WIDTH = 43;
var REASON_WIDTH = 56;
function getFilePathFromInput(hookInput) {
  try {
    const data = JSON.parse(hookInput);
    const toolInput = data.tool_input || {};
    return toolInput.file_path || toolInput.path || null;
  } catch {
    return null;
  }
}
function normalizePath(path) {
  if (path.startsWith("./")) {
    return path.slice(2);
  }
  return path;
}
function isArchiveAccess(path) {
  return path.includes(".saga/archive");
}
function isWithinWorktree(filePath, worktreePath) {
  const absoluteFilePath = resolve(filePath);
  const absoluteWorktree = resolve(worktreePath);
  const relativePath = relative(absoluteWorktree, absoluteFilePath);
  if (relativePath.startsWith("..") || resolve(relativePath) === relativePath) {
    return false;
  }
  return true;
}
function checkStoryAccess(path, allowedEpic, allowedStory) {
  if (!path.includes(".saga/epics/")) {
    return true;
  }
  const parts = path.split("/");
  const epicsIdx = parts.indexOf("epics");
  if (epicsIdx === -1) {
    return true;
  }
  if (parts.length <= epicsIdx + 1) {
    return true;
  }
  const pathEpic = parts[epicsIdx + 1];
  const storiesFolderIndex = 2;
  const storySlugIndex = 3;
  if (parts.length > epicsIdx + storySlugIndex && parts[epicsIdx + storiesFolderIndex] === "stories") {
    const pathStory = parts[epicsIdx + storySlugIndex];
    return pathEpic === allowedEpic && pathStory === allowedStory;
  }
  return pathEpic === allowedEpic;
}
function printScopeViolation(filePath, epicSlug, storySlug, worktreePath, reason) {
  const message = [
    "",
    "\u256D\u2500 Scope Violation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E",
    "\u2502                                                           \u2502",
    `\u2502  File: ${filePath.slice(0, FILE_PATH_WIDTH).padEnd(FILE_PATH_WIDTH)}\u2502`,
    "\u2502                                                           \u2502",
    `\u2502  ${reason.split("\n")[0].padEnd(REASON_WIDTH)}\u2502`,
    "\u2502                                                           \u2502",
    "\u2502  Current scope:                                           \u2502",
    `\u2502    Epic:     ${epicSlug.slice(0, EPIC_STORY_WIDTH).padEnd(EPIC_STORY_WIDTH)}\u2502`,
    `\u2502    Story:    ${storySlug.slice(0, EPIC_STORY_WIDTH).padEnd(EPIC_STORY_WIDTH)}\u2502`,
    `\u2502    Worktree: ${worktreePath.slice(0, EPIC_STORY_WIDTH).padEnd(EPIC_STORY_WIDTH)}\u2502`,
    "\u2502                                                           \u2502",
    "\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F",
    ""
  ].join("\n");
  process.stderr.write(message);
}
async function readStdinInput() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
function getScopeEnvironment() {
  const worktreePath = process.env.SAGA_PROJECT_DIR || "";
  const epicSlug = process.env.SAGA_EPIC_SLUG || "";
  const storySlug = process.env.SAGA_STORY_SLUG || "";
  const missing = [];
  if (!worktreePath) {
    missing.push("SAGA_PROJECT_DIR");
  }
  if (!epicSlug) {
    missing.push("SAGA_EPIC_SLUG");
  }
  if (!storySlug) {
    missing.push("SAGA_STORY_SLUG");
  }
  if (missing.length > 0) {
    process.stderr.write(
      `scope-validator: Missing required environment variables: ${missing.join(", ")}

The scope validator cannot verify file access without these variables.
This is a configuration error - the orchestrator should set these variables.

You MUST exit with status BLOCKED and set blocker to:
"Scope validator misconfigured: missing ${missing.join(", ")}"
`
    );
    return null;
  }
  return { worktreePath, epicSlug, storySlug };
}
function validatePath(filePath, worktreePath, epicSlug, storySlug) {
  const normPath = normalizePath(filePath);
  if (!isWithinWorktree(normPath, worktreePath)) {
    return "Access outside worktree blocked\nReason: Workers can only access files within their assigned worktree directory.";
  }
  if (isArchiveAccess(normPath)) {
    return "Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution.";
  }
  if (!checkStoryAccess(normPath, epicSlug, storySlug)) {
    return "Access to other story blocked\nReason: Workers can only access their assigned story's files.";
  }
  return null;
}
async function main() {
  const env = getScopeEnvironment();
  if (!env) {
    process.exit(EXIT_BLOCKED);
  }
  const toolInput = await readStdinInput();
  const filePath = getFilePathFromInput(toolInput);
  if (!filePath) {
    process.exit(EXIT_ALLOWED);
  }
  const violation = validatePath(
    filePath,
    env.worktreePath,
    env.epicSlug,
    env.storySlug
  );
  if (violation) {
    printScopeViolation(
      filePath,
      env.epicSlug,
      env.storySlug,
      env.worktreePath,
      violation
    );
    process.exit(EXIT_BLOCKED);
  }
  process.exit(EXIT_ALLOWED);
}
var isDirectExecution = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectExecution) {
  main();
}
export {
  checkStoryAccess,
  getFilePathFromInput,
  isArchiveAccess,
  isWithinWorktree,
  normalizePath,
  validatePath
};
