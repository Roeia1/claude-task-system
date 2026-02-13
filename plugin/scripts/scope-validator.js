#!/usr/bin/env node

// src/scripts/scope-validator.ts
import { relative, resolve } from "node:path";
import process from "node:process";
var EXIT_ALLOWED = 0;
var EXIT_BLOCKED = 2;
var FILE_PATH_WIDTH = 50;
var SCOPE_VALUE_WIDTH = 43;
var REASON_WIDTH = 56;
var WRITE_TOOLS = /* @__PURE__ */ new Set(["Write", "Edit"]);
function getFilePathFromInput(hookInput) {
  try {
    const data = JSON.parse(hookInput);
    const toolInput = data.tool_input || {};
    return toolInput.file_path || toolInput.path || null;
  } catch {
    return null;
  }
}
function getToolNameFromInput(hookInput) {
  try {
    const data = JSON.parse(hookInput);
    return data.tool_name || null;
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
function isSagaPath(filePath, worktreePath) {
  const absoluteFilePath = resolve(filePath);
  const absoluteWorktree = resolve(worktreePath);
  const rel = relative(absoluteWorktree, absoluteFilePath);
  return rel === ".saga" || rel.startsWith(".saga/");
}
function isJournalPath(filePath, worktreePath, storyId) {
  const absoluteFilePath = resolve(filePath);
  const absoluteWorktree = resolve(worktreePath);
  const rel = relative(absoluteWorktree, absoluteFilePath);
  return rel === `.saga/stories/${storyId}/journal.md`;
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
function checkStoriesPath(parts, allowedStoryId) {
  const sagaIdx = parts.indexOf(".saga");
  if (sagaIdx === -1) {
    return false;
  }
  const storiesIdx = sagaIdx + 1;
  if (parts[storiesIdx] !== "stories" || parts.length <= storiesIdx + 1) {
    return false;
  }
  const pathStoryId = parts[storiesIdx + 1];
  if (!pathStoryId) {
    return false;
  }
  return pathStoryId === allowedStoryId;
}
function checkEpicsPath(parts) {
  const sagaIdx = parts.indexOf(".saga");
  if (sagaIdx === -1) {
    return true;
  }
  const epicsIdx = sagaIdx + 1;
  if (parts[epicsIdx] !== "epics") {
    return true;
  }
  const storiesFolderIndex = 2;
  if (parts.length > epicsIdx + storiesFolderIndex && parts[epicsIdx + storiesFolderIndex] === "stories") {
    return false;
  }
  return true;
}
function checkStoryAccessById(path, allowedStoryId) {
  if (path.includes(".saga/stories/")) {
    return checkStoriesPath(path.split("/"), allowedStoryId);
  }
  if (path.includes(".saga/epics/")) {
    return checkEpicsPath(path.split("/"));
  }
  return true;
}
function printScopeViolation(filePath, scope, worktreePath, reason) {
  const scopeLines = [
    `\u2502    Story:    ${scope.storyId.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}\u2502`,
    `\u2502    Worktree: ${worktreePath.slice(0, SCOPE_VALUE_WIDTH).padEnd(SCOPE_VALUE_WIDTH)}\u2502`
  ];
  const message = [
    "",
    "\u256D\u2500 Scope Violation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E",
    "\u2502                                                           \u2502",
    `\u2502  File: ${filePath.slice(0, FILE_PATH_WIDTH).padEnd(FILE_PATH_WIDTH)}\u2502`,
    "\u2502                                                           \u2502",
    `\u2502  ${reason.split("\n")[0].padEnd(REASON_WIDTH)}\u2502`,
    "\u2502                                                           \u2502",
    "\u2502  Current scope:                                           \u2502",
    ...scopeLines,
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
  if (!worktreePath) {
    process.stderr.write(
      'scope-validator: Missing required environment variable: SAGA_PROJECT_DIR\n\nThe scope validator cannot verify file access without this variable.\nThis is a configuration error - the orchestrator should set this variable.\n\nYou MUST exit with status BLOCKED and set blocker to:\n"Scope validator misconfigured: missing SAGA_PROJECT_DIR"\n'
    );
    return null;
  }
  const storyId = process.env.SAGA_STORY_ID || "";
  if (!storyId) {
    process.stderr.write(
      'scope-validator: Missing required environment variable: SAGA_STORY_ID\n\nThe scope validator cannot verify file access without this variable.\nThis is a configuration error - the worker should set SAGA_STORY_ID.\n\nYou MUST exit with status BLOCKED and set blocker to:\n"Scope validator misconfigured: missing SAGA_STORY_ID"\n'
    );
    return null;
  }
  return { storyId, worktreePath };
}
function validatePath(filePath, worktreePath, scope, toolName) {
  const normPath = normalizePath(filePath);
  if (!isWithinWorktree(normPath, worktreePath)) {
    return "Access outside worktree blocked\nReason: Workers can only access files within their assigned worktree directory.";
  }
  if (isArchiveAccess(normPath)) {
    return "Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution.";
  }
  if (!checkStoryAccessById(normPath, scope.storyId)) {
    return "Access to other story blocked\nReason: Workers can only access their assigned story's files.";
  }
  if (toolName && WRITE_TOOLS.has(toolName) && isSagaPath(normPath, worktreePath) && !isJournalPath(normPath, worktreePath, scope.storyId)) {
    return ".saga write blocked\nReason: Only journal.md is writable inside the .saga directory. All other .saga files are immutable during execution.";
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
  const toolName = getToolNameFromInput(toolInput);
  const { worktreePath, ...scope } = env;
  const violation = validatePath(filePath, worktreePath, scope, toolName ?? void 0);
  if (violation) {
    printScopeViolation(filePath, scope, worktreePath, violation);
    process.exit(EXIT_BLOCKED);
  }
  process.exit(EXIT_ALLOWED);
}
var isDirectExecution = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectExecution) {
  main();
}
export {
  checkStoryAccessById,
  getFilePathFromInput,
  getScopeEnvironment,
  getToolNameFromInput,
  isArchiveAccess,
  isJournalPath,
  isSagaPath,
  isWithinWorktree,
  normalizePath,
  validatePath
};
