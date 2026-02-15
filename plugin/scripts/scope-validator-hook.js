#!/usr/bin/env node

// src/scripts/scope-validator.ts
import { relative, resolve } from "node:path";
var WRITE_TOOLS = /* @__PURE__ */ new Set(["Write", "Edit"]);
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
function validatePath(filePath, worktreePath, scope, toolName) {
  const normPath = normalizePath(filePath);
  if (!isWithinWorktree(normPath, worktreePath)) {
    return "Access outside worktree blocked\nReason: Workers can only access files within their assigned worktree directory.";
  }
  if (isArchiveAccess(normPath)) {
    return "Access to archive folder blocked\nReason: The archive folder contains completed stories and is read-only during execution.";
  }
  const relPath = relative(resolve(worktreePath), resolve(normPath));
  if (!checkStoryAccessById(relPath, scope.storyId)) {
    return "Access to other story blocked\nReason: Workers can only access their assigned story's files.";
  }
  if (toolName && WRITE_TOOLS.has(toolName) && isSagaPath(normPath, worktreePath) && !isJournalPath(normPath, worktreePath, scope.storyId)) {
    return ".saga write blocked\nReason: Only journal.md is writable inside the .saga directory. All other .saga files are immutable during execution.";
  }
  return null;
}

// src/scripts/scope-validator-hook.ts
function createScopeValidatorHook(worktreePath, storyId) {
  return (_input, _toolUseID, _options) => {
    const hookInput = _input;
    const toolName = hookInput.tool_name;
    const toolInput = hookInput.tool_input ?? {};
    const filePath = toolInput.file_path || toolInput.path;
    if (!filePath) {
      return Promise.resolve({ continue: true });
    }
    const violation = validatePath(filePath, worktreePath, { storyId }, toolName);
    if (violation) {
      return Promise.resolve({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          // SDK hook output expects a single-line reason; take only the first line
          permissionDecisionReason: violation.split("\n")[0]
        }
      });
    }
    return Promise.resolve({ continue: true });
  };
}
export {
  createScopeValidatorHook
};
