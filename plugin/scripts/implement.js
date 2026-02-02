#!/usr/bin/env node

// src/implement.ts
import process3 from "node:process";

// src/implement/index.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { existsSync as existsSync4 } from "node:fs";
import { join as join4 } from "node:path";
import process2 from "node:process";

// src/implement/types.ts
var DEFAULT_MAX_CYCLES = 10;
var DEFAULT_MAX_TIME = 60;
var DEFAULT_MODEL = "opus";
var MS_PER_SECOND = 1e3;
var MS_PER_MINUTE = 6e4;
var SECONDS_PER_MINUTE = 60;
var ROUNDING_PRECISION = 100;
var WORKER_PROMPT_RELATIVE = "worker-prompt.md";

// src/implement/orchestrator.ts
import { existsSync as existsSync2, readFileSync } from "node:fs";
import { join as join2 } from "node:path";

// src/implement/scope-config.ts
var SCOPE_VALIDATED_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep"];
var HOOK_PRE_TOOL_USE = "PreToolUse";
function buildScopeSettings() {
  const hookCommand = "npx @saga-ai/cli scope-validator";
  return {
    hooks: {
      [HOOK_PRE_TOOL_USE]: [
        {
          matcher: SCOPE_VALIDATED_TOOLS.join("|"),
          hooks: [hookCommand]
        }
      ]
    }
  };
}

// src/implement/session-manager.ts
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

// src/implement/output-parser.ts
var VALID_STATUSES = /* @__PURE__ */ new Set(["ONGOING", "FINISH", "BLOCKED"]);
var WORKER_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["ONGOING", "FINISH", "BLOCKED"]
    },
    summary: {
      type: "string",
      description: "What was accomplished this session"
    },
    blocker: {
      type: ["string", "null"],
      description: "Brief description if BLOCKED, null otherwise"
    }
  },
  required: ["status", "summary"]
};
function truncateString(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}...`;
}
function formatInputValue(value, maxLength) {
  if (value === null || value === void 0) {
    return "null";
  }
  if (typeof value === "string") {
    const singleLine = value.replace(/\n/g, " ").replace(/\s+/g, " ");
    return truncateString(singleLine, maxLength);
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return truncateString(JSON.stringify(value), maxLength);
  }
  if (typeof value === "object") {
    return truncateString(JSON.stringify(value), maxLength);
  }
  return String(value);
}
function formatAllInputFields(input) {
  const maxValueLength = 100;
  const entries = Object.entries(input);
  if (entries.length === 0) {
    return "";
  }
  return entries.map(([key, value]) => `${key}=${formatInputValue(value, maxValueLength)}`).join(", ");
}
function formatToolUsage(name, input) {
  try {
    const safeInput = input || {};
    const maxLength = 100;
    switch (name) {
      // File operations - show path
      case "Read": {
        const path = safeInput.file_path || "unknown";
        const extras = [];
        if (safeInput.offset) {
          extras.push(`offset=${safeInput.offset}`);
        }
        if (safeInput.limit) {
          extras.push(`limit=${safeInput.limit}`);
        }
        const suffix = extras.length > 0 ? ` (${extras.join(", ")})` : "";
        return `[Tool Used: Read] ${path}${suffix}`;
      }
      case "Write":
        return `[Tool Used: Write] ${safeInput.file_path || "unknown"}`;
      case "Edit": {
        const file = safeInput.file_path || "unknown";
        const replaceAll = safeInput.replace_all ? " (replace_all)" : "";
        return `[Tool Used: Edit] ${file}${replaceAll}`;
      }
      // Shell command - show command and description
      case "Bash": {
        const cmd = truncateString(String(safeInput.command || ""), maxLength);
        const desc = safeInput.description ? ` - ${truncateString(String(safeInput.description), 60)}` : "";
        return `[Tool Used: Bash] ${cmd}${desc}`;
      }
      // Search operations - show pattern and path
      case "Glob": {
        const pattern = safeInput.pattern || "unknown";
        const path = safeInput.path ? ` in ${safeInput.path}` : "";
        return `[Tool Used: Glob] ${pattern}${path}`;
      }
      case "Grep": {
        const pattern = truncateString(String(safeInput.pattern || ""), 60);
        const path = safeInput.path ? ` in ${safeInput.path}` : "";
        const mode = safeInput.output_mode ? ` (${safeInput.output_mode})` : "";
        return `[Tool Used: Grep] "${pattern}"${path}${mode}`;
      }
      // Agent task - show description and type
      case "Task": {
        const desc = truncateString(
          String(safeInput.description || safeInput.prompt || ""),
          maxLength
        );
        const agentType = safeInput.subagent_type ? ` [${safeInput.subagent_type}]` : "";
        return `[Tool Used: Task]${agentType} ${desc}`;
      }
      // Todo operations
      case "TodoWrite": {
        const todos = safeInput.todos;
        if (todos && Array.isArray(todos)) {
          const subjects = todos.map((t) => {
            if (t && typeof t === "object" && "subject" in t) {
              return String(t.subject || "untitled");
            }
            return "untitled";
          }).join(", ");
          return `[Tool Used: TodoWrite] ${truncateString(subjects, maxLength)}`;
        }
        return "[Tool Used: TodoWrite]";
      }
      // Structured output - show status
      case "StructuredOutput": {
        const status = safeInput.status || "unknown";
        const summary = safeInput.summary ? ` - ${truncateString(String(safeInput.summary), maxLength)}` : "";
        return `[Tool Used: StructuredOutput] ${status}${summary}`;
      }
      // Unknown tools - show all fields
      default: {
        const fields = formatAllInputFields(safeInput);
        return fields ? `[Tool Used: ${name}] ${fields}` : `[Tool Used: ${name}]`;
      }
    }
  } catch {
    return `[Tool Used: ${name}]`;
  }
}
function formatAssistantContent(content) {
  try {
    if (!(content && Array.isArray(content))) {
      return null;
    }
    for (const block of content) {
      if (!block || typeof block !== "object") {
        continue;
      }
      const blockData = block;
      if (blockData.type === "text" && blockData.text) {
        return `${blockData.text}
`;
      }
      if (blockData.type === "tool_use" && blockData.name) {
        return `${formatToolUsage(blockData.name, blockData.input || {})}
`;
      }
    }
    return null;
  } catch {
    return null;
  }
}
function formatStreamLine(line) {
  try {
    const data = JSON.parse(line);
    if (data.type === "assistant" && data.message?.content) {
      return formatAssistantContent(data.message.content);
    }
    if (data.type === "system" && data.subtype === "init") {
      return `[Session started: ${data.session_id}]`;
    }
    if (data.type === "result") {
      const status = data.subtype === "success" ? "completed" : "failed";
      return `
[Worker ${status} in ${Math.round(data.duration_ms / MS_PER_SECOND)}s]`;
    }
    return null;
  } catch {
    return null;
  }
}
function extractStructuredOutputFromToolCall(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(lines[i]);
      if (data.type === "assistant" && data.message?.content) {
        for (const block of data.message.content) {
          if (block.type === "tool_use" && block.name === "StructuredOutput") {
            return block.input;
          }
        }
      }
    } catch {
    }
  }
  return null;
}
function validateAndExtractOutput(output) {
  if (!VALID_STATUSES.has(output.status)) {
    throw new Error(`Invalid status: ${output.status}`);
  }
  return {
    status: output.status,
    summary: output.summary || "",
    blocker: output.blocker ?? null
  };
}
function processResultLine(data, lines) {
  if (data.is_error) {
    throw new Error(`Worker failed: ${data.result || "Unknown error"}`);
  }
  let output = data.structured_output;
  if (!output) {
    output = extractStructuredOutputFromToolCall(lines) ?? void 0;
  }
  if (!output) {
    throw new Error("Worker result missing structured_output");
  }
  return validateAndExtractOutput(output);
}
function parseStreamingResult(buffer) {
  const lines = buffer.split("\n").filter((line) => line.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(lines[i]);
      if (data.type === "result") {
        return processResultLine(data, lines);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Worker")) {
        throw e;
      }
    }
  }
  throw new Error("No result found in worker output");
}

// src/implement/session-manager.ts
var OUTPUT_DIR = "/tmp/saga-sessions";
var SLUG_PATTERN = /^[a-z0-9-]+$/;
function shellEscape(str) {
  return `'${str.replace(/'/g, "'\\''")}'`;
}
function shellEscapeArgs(args) {
  return args.map(shellEscape).join(" ");
}
function validateSlug(slug) {
  if (typeof slug !== "string" || slug.length === 0) {
    return false;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return false;
  }
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return false;
  }
  return true;
}
function checkTmuxAvailable() {
  const result = spawnSync("which", ["tmux"], { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error("tmux is not installed or not found in PATH");
  }
}
function generateWrapperScript(commandFilePath, outputFile, wrapperScriptPath) {
  return `#!/bin/bash
# Auto-generated wrapper script for SAGA session
set -e

# Mark this as an internal SAGA session (used by CLI to detect it's running inside tmux)
export SAGA_INTERNAL_SESSION=1

COMMAND_FILE="${commandFilePath}"
OUTPUT_FILE="${outputFile}"
SCRIPT_FILE="${wrapperScriptPath}"

# Read the command from file
COMMAND="$(cat "$COMMAND_FILE")"

# Cleanup temporary files on exit
cleanup() {
  rm -f "$COMMAND_FILE" "$SCRIPT_FILE"
}
trap cleanup EXIT

# Execute the command with output capture
# script syntax differs between macOS and Linux:
#   macOS (Darwin): script -q <file> <shell> -c <command>
#   Linux:          script -q -c <command> <file>
if [[ "$(uname)" == "Darwin" ]]; then
  # -F: flush output after each write (ensures immediate visibility)
  exec script -qF "$OUTPUT_FILE" /bin/bash -c "$COMMAND"
else
  exec script -q -c "$COMMAND" "$OUTPUT_FILE"
fi
`;
}
function validateSessionSlugs(epicSlug, storySlug) {
  if (!validateSlug(epicSlug)) {
    throw new Error(
      `Invalid epic slug: '${epicSlug}'. Must contain only [a-z0-9-] and not start/end with hyphen.`
    );
  }
  if (!validateSlug(storySlug)) {
    throw new Error(
      `Invalid story slug: '${storySlug}'. Must contain only [a-z0-9-] and not start/end with hyphen.`
    );
  }
}
function createSessionFiles(sessionName, command) {
  const outputFile = join(OUTPUT_DIR, `${sessionName}.out`);
  const commandFilePath = join(OUTPUT_DIR, `${sessionName}.cmd`);
  const wrapperScriptPath = join(OUTPUT_DIR, `${sessionName}.sh`);
  writeFileSync(commandFilePath, command, { mode: 384 });
  const wrapperScriptContent = generateWrapperScript(
    commandFilePath,
    outputFile,
    wrapperScriptPath
  );
  writeFileSync(wrapperScriptPath, wrapperScriptContent, { mode: 448 });
  return { wrapperScriptPath, outputFile };
}
function createSession(epicSlug, storySlug, command) {
  validateSessionSlugs(epicSlug, storySlug);
  checkTmuxAvailable();
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const timestamp = Date.now();
  const sessionName = `saga__${epicSlug}__${storySlug}__${timestamp}`;
  const { wrapperScriptPath, outputFile } = createSessionFiles(sessionName, command);
  const createResult = spawnSync(
    "tmux",
    ["new-session", "-d", "-s", sessionName, wrapperScriptPath],
    { encoding: "utf-8" }
  );
  if (createResult.status !== 0) {
    throw new Error(`Failed to create tmux session: ${createResult.stderr || "unknown error"}`);
  }
  return { sessionName, outputFile };
}
function spawnWorkerAsync(prompt, model, settings, workingDir) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const args = [
      "-p",
      prompt,
      "--model",
      model,
      "--output-format",
      "stream-json",
      "--verbose",
      "--json-schema",
      JSON.stringify(WORKER_OUTPUT_SCHEMA),
      "--settings",
      JSON.stringify(settings),
      "--dangerously-skip-permissions"
    ];
    const child = spawn("claude", args, {
      cwd: workingDir,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      buffer += text;
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          const formatted = formatStreamLine(line);
          if (formatted) {
            process.stdout.write(formatted);
          }
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    child.on("error", (err) => {
      reject(new Error(`Failed to spawn worker: ${err.message}`));
    });
    child.on("close", (_code) => {
      process.stdout.write("\n");
      try {
        const result = parseStreamingResult(buffer);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}
function buildDetachedCommand(storySlug, projectPath, options) {
  const parts = ["saga", "implement", storySlug];
  parts.push("--path", projectPath);
  if (options.maxCycles !== void 0) {
    parts.push("--max-cycles", String(options.maxCycles));
  }
  if (options.maxTime !== void 0) {
    parts.push("--max-time", String(options.maxTime));
  }
  if (options.model !== void 0) {
    parts.push("--model", options.model);
  }
  return shellEscapeArgs(parts);
}

// src/implement/orchestrator.ts
function getSkillRoot(pluginRoot) {
  return join2(pluginRoot, "skills", "execute-story");
}
function computeStoryPath(worktree, epicSlug, storySlug) {
  return join2(worktree, ".saga", "epics", epicSlug, "stories", storySlug, "story.md");
}
function validateStoryFiles(worktree, epicSlug, storySlug) {
  if (!existsSync2(worktree)) {
    return {
      valid: false,
      error: `Worktree not found at ${worktree}

The story worktree has not been created yet. This can happen if:
1. The story was generated but the worktree wasn't set up
2. The worktree was deleted or moved

To create the worktree, use: /task-resume ${storySlug}`
    };
  }
  const storyPath = computeStoryPath(worktree, epicSlug, storySlug);
  if (!existsSync2(storyPath)) {
    return {
      valid: false,
      error: `story.md not found in worktree.

Expected location: ${storyPath}

The worktree exists but the story definition file is missing.
This may indicate an incomplete story setup.`
    };
  }
  return { valid: true };
}
function loadWorkerPrompt(pluginRoot) {
  const skillRoot = getSkillRoot(pluginRoot);
  const promptPath = join2(skillRoot, WORKER_PROMPT_RELATIVE);
  if (!existsSync2(promptPath)) {
    throw new Error(`Worker prompt not found at ${promptPath}`);
  }
  return readFileSync(promptPath, "utf-8");
}
function createErrorResult(epicSlug, storySlug, summary, cycles, elapsedMinutes) {
  return {
    status: "ERROR",
    summary,
    cycles,
    elapsedMinutes,
    blocker: null,
    epicSlug,
    storySlug
  };
}
function validateLoopResources(worktree, epicSlug, storySlug, pluginRoot) {
  const validation = validateStoryFiles(worktree, epicSlug, storySlug);
  if (!validation.valid) {
    return { valid: false, error: validation.error || "Story validation failed" };
  }
  try {
    const workerPrompt = loadWorkerPrompt(pluginRoot);
    return { valid: true, workerPrompt };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}
function buildLoopResult(epicSlug, storySlug, finalStatus, summaries, cycles, elapsedMinutes, lastBlocker) {
  const combinedSummary = summaries.length === 1 ? summaries[0] : summaries.join(" | ");
  return {
    status: finalStatus,
    summary: combinedSummary,
    cycles,
    elapsedMinutes: Math.round(elapsedMinutes * ROUNDING_PRECISION) / ROUNDING_PRECISION,
    blocker: lastBlocker,
    epicSlug,
    storySlug
  };
}
async function executeWorkerCycle(config, state) {
  if (Date.now() - config.startTime >= config.maxTimeMs) {
    state.finalStatus = "TIMEOUT";
    return { continue: false };
  }
  if (state.cycles >= config.maxCycles) {
    return { continue: false };
  }
  state.cycles += 1;
  try {
    const parsed = await spawnWorkerAsync(
      config.workerPrompt,
      config.model,
      config.settings,
      config.worktree
    );
    state.summaries.push(parsed.summary);
    if (parsed.status === "FINISH") {
      state.finalStatus = "FINISH";
      return { continue: false };
    }
    if (parsed.status === "BLOCKED") {
      state.finalStatus = "BLOCKED";
      state.lastBlocker = parsed.blocker || null;
      return { continue: false };
    }
    return { continue: true };
  } catch (e) {
    const elapsed = (Date.now() - config.startTime) / MS_PER_MINUTE;
    return {
      continue: false,
      result: createErrorResult(
        config.epicSlug,
        config.storySlug,
        e instanceof Error ? e.message : String(e),
        state.cycles,
        elapsed
      )
    };
  }
}
function executeWorkerLoop(workerPrompt, model, settings, worktree, maxCycles, maxTimeMs, startTime, epicSlug, storySlug) {
  const config = {
    workerPrompt,
    model,
    settings,
    worktree,
    maxCycles,
    maxTimeMs,
    startTime,
    epicSlug,
    storySlug
  };
  const state = { summaries: [], cycles: 0, lastBlocker: null, finalStatus: null };
  const runNextCycle = async () => {
    const cycleResult = await executeWorkerCycle(config, state);
    if (cycleResult.result) {
      return cycleResult.result;
    }
    if (cycleResult.continue) {
      return runNextCycle();
    }
    return state;
  };
  return runNextCycle();
}
async function runLoop(epicSlug, storySlug, maxCycles, maxTime, model, projectDir, pluginRoot) {
  const worktree = join2(projectDir, ".saga", "worktrees", epicSlug, storySlug);
  const resources = validateLoopResources(worktree, epicSlug, storySlug, pluginRoot);
  if (!resources.valid) {
    return createErrorResult(epicSlug, storySlug, resources.error, 0, 0);
  }
  const settings = buildScopeSettings();
  const startTime = Date.now();
  const maxTimeMs = maxTime * SECONDS_PER_MINUTE * MS_PER_SECOND;
  const result = await executeWorkerLoop(
    resources.workerPrompt,
    model,
    settings,
    worktree,
    maxCycles,
    maxTimeMs,
    startTime,
    epicSlug,
    storySlug
  );
  if ("status" in result && result.status === "ERROR") {
    return result;
  }
  const state = result;
  const finalStatus = state.finalStatus ?? "MAX_CYCLES";
  const elapsedMinutes = (Date.now() - startTime) / MS_PER_MINUTE;
  return buildLoopResult(
    epicSlug,
    storySlug,
    finalStatus,
    state.summaries,
    state.cycles,
    elapsedMinutes,
    state.lastBlocker
  );
}

// ../../node_modules/.pnpm/fuse.js@7.1.0/node_modules/fuse.js/dist/fuse.mjs
function isArray(value) {
  return !Array.isArray ? getTag(value) === "[object Array]" : Array.isArray(value);
}
var INFINITY = 1 / 0;
function baseToString(value) {
  if (typeof value == "string") {
    return value;
  }
  let result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
function toString(value) {
  return value == null ? "" : baseToString(value);
}
function isString(value) {
  return typeof value === "string";
}
function isNumber(value) {
  return typeof value === "number";
}
function isBoolean(value) {
  return value === true || value === false || isObjectLike(value) && getTag(value) == "[object Boolean]";
}
function isObject(value) {
  return typeof value === "object";
}
function isObjectLike(value) {
  return isObject(value) && value !== null;
}
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function isBlank(value) {
  return !value.trim().length;
}
function getTag(value) {
  return value == null ? value === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(value);
}
var INCORRECT_INDEX_TYPE = "Incorrect 'index' type";
var LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) => `Invalid value for key ${key}`;
var PATTERN_LENGTH_TOO_LARGE = (max) => `Pattern length exceeds max of ${max}.`;
var MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;
var INVALID_KEY_WEIGHT_VALUE = (key) => `Property 'weight' in key '${key}' must be a positive integer`;
var hasOwn = Object.prototype.hasOwnProperty;
var KeyStore = class {
  constructor(keys) {
    this._keys = [];
    this._keyMap = {};
    let totalWeight = 0;
    keys.forEach((key) => {
      let obj = createKey(key);
      this._keys.push(obj);
      this._keyMap[obj.id] = obj;
      totalWeight += obj.weight;
    });
    this._keys.forEach((key) => {
      key.weight /= totalWeight;
    });
  }
  get(keyId) {
    return this._keyMap[keyId];
  }
  keys() {
    return this._keys;
  }
  toJSON() {
    return JSON.stringify(this._keys);
  }
};
function createKey(key) {
  let path = null;
  let id = null;
  let src = null;
  let weight = 1;
  let getFn = null;
  if (isString(key) || isArray(key)) {
    src = key;
    path = createKeyPath(key);
    id = createKeyId(key);
  } else {
    if (!hasOwn.call(key, "name")) {
      throw new Error(MISSING_KEY_PROPERTY("name"));
    }
    const name = key.name;
    src = name;
    if (hasOwn.call(key, "weight")) {
      weight = key.weight;
      if (weight <= 0) {
        throw new Error(INVALID_KEY_WEIGHT_VALUE(name));
      }
    }
    path = createKeyPath(name);
    id = createKeyId(name);
    getFn = key.getFn;
  }
  return { path, id, weight, src, getFn };
}
function createKeyPath(key) {
  return isArray(key) ? key : key.split(".");
}
function createKeyId(key) {
  return isArray(key) ? key.join(".") : key;
}
function get(obj, path) {
  let list = [];
  let arr = false;
  const deepGet = (obj2, path2, index) => {
    if (!isDefined(obj2)) {
      return;
    }
    if (!path2[index]) {
      list.push(obj2);
    } else {
      let key = path2[index];
      const value = obj2[key];
      if (!isDefined(value)) {
        return;
      }
      if (index === path2.length - 1 && (isString(value) || isNumber(value) || isBoolean(value))) {
        list.push(toString(value));
      } else if (isArray(value)) {
        arr = true;
        for (let i = 0, len = value.length; i < len; i += 1) {
          deepGet(value[i], path2, index + 1);
        }
      } else if (path2.length) {
        deepGet(value, path2, index + 1);
      }
    }
  };
  deepGet(obj, isString(path) ? path.split(".") : path, 0);
  return arr ? list : list[0];
}
var MatchOptions = {
  // Whether the matches should be included in the result set. When `true`, each record in the result
  // set will include the indices of the matched characters.
  // These can consequently be used for highlighting purposes.
  includeMatches: false,
  // When `true`, the matching function will continue to the end of a search pattern even if
  // a perfect match has already been located in the string.
  findAllMatches: false,
  // Minimum number of characters that must be matched before a result is considered a match
  minMatchCharLength: 1
};
var BasicOptions = {
  // When `true`, the algorithm continues searching to the end of the input even if a perfect
  // match is found before the end of the same input.
  isCaseSensitive: false,
  // When `true`, the algorithm will ignore diacritics (accents) in comparisons
  ignoreDiacritics: false,
  // When true, the matching function will continue to the end of a search pattern even if
  includeScore: false,
  // List of properties that will be searched. This also supports nested properties.
  keys: [],
  // Whether to sort the result list, by score
  shouldSort: true,
  // Default sort function: sort by ascending score, ascending index
  sortFn: (a, b) => a.score === b.score ? a.idx < b.idx ? -1 : 1 : a.score < b.score ? -1 : 1
};
var FuzzyOptions = {
  // Approximately where in the text is the pattern expected to be found?
  location: 0,
  // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
  // (of both letters and location), a threshold of '1.0' would match anything.
  threshold: 0.6,
  // Determines how close the match must be to the fuzzy location (specified above).
  // An exact letter match which is 'distance' characters away from the fuzzy location
  // would score as a complete mismatch. A distance of '0' requires the match be at
  // the exact location specified, a threshold of '1000' would require a perfect match
  // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
  distance: 100
};
var AdvancedOptions = {
  // When `true`, it enables the use of unix-like search commands
  useExtendedSearch: false,
  // The get function to use when fetching an object's properties.
  // The default will search nested paths *ie foo.bar.baz*
  getFn: get,
  // When `true`, search will ignore `location` and `distance`, so it won't matter
  // where in the string the pattern appears.
  // More info: https://fusejs.io/concepts/scoring-theory.html#fuzziness-score
  ignoreLocation: false,
  // When `true`, the calculation for the relevance score (used for sorting) will
  // ignore the field-length norm.
  // More info: https://fusejs.io/concepts/scoring-theory.html#field-length-norm
  ignoreFieldNorm: false,
  // The weight to determine how much field length norm effects scoring.
  fieldNormWeight: 1
};
var Config = {
  ...BasicOptions,
  ...MatchOptions,
  ...FuzzyOptions,
  ...AdvancedOptions
};
var SPACE = /[^ ]+/g;
function norm(weight = 1, mantissa = 3) {
  const cache = /* @__PURE__ */ new Map();
  const m = Math.pow(10, mantissa);
  return {
    get(value) {
      const numTokens = value.match(SPACE).length;
      if (cache.has(numTokens)) {
        return cache.get(numTokens);
      }
      const norm2 = 1 / Math.pow(numTokens, 0.5 * weight);
      const n = parseFloat(Math.round(norm2 * m) / m);
      cache.set(numTokens, n);
      return n;
    },
    clear() {
      cache.clear();
    }
  };
}
var FuseIndex = class {
  constructor({
    getFn = Config.getFn,
    fieldNormWeight = Config.fieldNormWeight
  } = {}) {
    this.norm = norm(fieldNormWeight, 3);
    this.getFn = getFn;
    this.isCreated = false;
    this.setIndexRecords();
  }
  setSources(docs = []) {
    this.docs = docs;
  }
  setIndexRecords(records = []) {
    this.records = records;
  }
  setKeys(keys = []) {
    this.keys = keys;
    this._keysMap = {};
    keys.forEach((key, idx) => {
      this._keysMap[key.id] = idx;
    });
  }
  create() {
    if (this.isCreated || !this.docs.length) {
      return;
    }
    this.isCreated = true;
    if (isString(this.docs[0])) {
      this.docs.forEach((doc, docIndex) => {
        this._addString(doc, docIndex);
      });
    } else {
      this.docs.forEach((doc, docIndex) => {
        this._addObject(doc, docIndex);
      });
    }
    this.norm.clear();
  }
  // Adds a doc to the end of the index
  add(doc) {
    const idx = this.size();
    if (isString(doc)) {
      this._addString(doc, idx);
    } else {
      this._addObject(doc, idx);
    }
  }
  // Removes the doc at the specified index of the index
  removeAt(idx) {
    this.records.splice(idx, 1);
    for (let i = idx, len = this.size(); i < len; i += 1) {
      this.records[i].i -= 1;
    }
  }
  getValueForItemAtKeyId(item, keyId) {
    return item[this._keysMap[keyId]];
  }
  size() {
    return this.records.length;
  }
  _addString(doc, docIndex) {
    if (!isDefined(doc) || isBlank(doc)) {
      return;
    }
    let record = {
      v: doc,
      i: docIndex,
      n: this.norm.get(doc)
    };
    this.records.push(record);
  }
  _addObject(doc, docIndex) {
    let record = { i: docIndex, $: {} };
    this.keys.forEach((key, keyIndex) => {
      let value = key.getFn ? key.getFn(doc) : this.getFn(doc, key.path);
      if (!isDefined(value)) {
        return;
      }
      if (isArray(value)) {
        let subRecords = [];
        const stack = [{ nestedArrIndex: -1, value }];
        while (stack.length) {
          const { nestedArrIndex, value: value2 } = stack.pop();
          if (!isDefined(value2)) {
            continue;
          }
          if (isString(value2) && !isBlank(value2)) {
            let subRecord = {
              v: value2,
              i: nestedArrIndex,
              n: this.norm.get(value2)
            };
            subRecords.push(subRecord);
          } else if (isArray(value2)) {
            value2.forEach((item, k) => {
              stack.push({
                nestedArrIndex: k,
                value: item
              });
            });
          } else ;
        }
        record.$[keyIndex] = subRecords;
      } else if (isString(value) && !isBlank(value)) {
        let subRecord = {
          v: value,
          n: this.norm.get(value)
        };
        record.$[keyIndex] = subRecord;
      }
    });
    this.records.push(record);
  }
  toJSON() {
    return {
      keys: this.keys,
      records: this.records
    };
  }
};
function createIndex(keys, docs, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
  const myIndex = new FuseIndex({ getFn, fieldNormWeight });
  myIndex.setKeys(keys.map(createKey));
  myIndex.setSources(docs);
  myIndex.create();
  return myIndex;
}
function parseIndex(data, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
  const { keys, records } = data;
  const myIndex = new FuseIndex({ getFn, fieldNormWeight });
  myIndex.setKeys(keys);
  myIndex.setIndexRecords(records);
  return myIndex;
}
function computeScore$1(pattern, {
  errors = 0,
  currentLocation = 0,
  expectedLocation = 0,
  distance = Config.distance,
  ignoreLocation = Config.ignoreLocation
} = {}) {
  const accuracy = errors / pattern.length;
  if (ignoreLocation) {
    return accuracy;
  }
  const proximity = Math.abs(expectedLocation - currentLocation);
  if (!distance) {
    return proximity ? 1 : accuracy;
  }
  return accuracy + proximity / distance;
}
function convertMaskToIndices(matchmask = [], minMatchCharLength = Config.minMatchCharLength) {
  let indices = [];
  let start = -1;
  let end = -1;
  let i = 0;
  for (let len = matchmask.length; i < len; i += 1) {
    let match = matchmask[i];
    if (match && start === -1) {
      start = i;
    } else if (!match && start !== -1) {
      end = i - 1;
      if (end - start + 1 >= minMatchCharLength) {
        indices.push([start, end]);
      }
      start = -1;
    }
  }
  if (matchmask[i - 1] && i - start >= minMatchCharLength) {
    indices.push([start, i - 1]);
  }
  return indices;
}
var MAX_BITS = 32;
function search(text, pattern, patternAlphabet, {
  location = Config.location,
  distance = Config.distance,
  threshold = Config.threshold,
  findAllMatches = Config.findAllMatches,
  minMatchCharLength = Config.minMatchCharLength,
  includeMatches = Config.includeMatches,
  ignoreLocation = Config.ignoreLocation
} = {}) {
  if (pattern.length > MAX_BITS) {
    throw new Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS));
  }
  const patternLen = pattern.length;
  const textLen = text.length;
  const expectedLocation = Math.max(0, Math.min(location, textLen));
  let currentThreshold = threshold;
  let bestLocation = expectedLocation;
  const computeMatches = minMatchCharLength > 1 || includeMatches;
  const matchMask = computeMatches ? Array(textLen) : [];
  let index;
  while ((index = text.indexOf(pattern, bestLocation)) > -1) {
    let score = computeScore$1(pattern, {
      currentLocation: index,
      expectedLocation,
      distance,
      ignoreLocation
    });
    currentThreshold = Math.min(score, currentThreshold);
    bestLocation = index + patternLen;
    if (computeMatches) {
      let i = 0;
      while (i < patternLen) {
        matchMask[index + i] = 1;
        i += 1;
      }
    }
  }
  bestLocation = -1;
  let lastBitArr = [];
  let finalScore = 1;
  let binMax = patternLen + textLen;
  const mask = 1 << patternLen - 1;
  for (let i = 0; i < patternLen; i += 1) {
    let binMin = 0;
    let binMid = binMax;
    while (binMin < binMid) {
      const score2 = computeScore$1(pattern, {
        errors: i,
        currentLocation: expectedLocation + binMid,
        expectedLocation,
        distance,
        ignoreLocation
      });
      if (score2 <= currentThreshold) {
        binMin = binMid;
      } else {
        binMax = binMid;
      }
      binMid = Math.floor((binMax - binMin) / 2 + binMin);
    }
    binMax = binMid;
    let start = Math.max(1, expectedLocation - binMid + 1);
    let finish = findAllMatches ? textLen : Math.min(expectedLocation + binMid, textLen) + patternLen;
    let bitArr = Array(finish + 2);
    bitArr[finish + 1] = (1 << i) - 1;
    for (let j = finish; j >= start; j -= 1) {
      let currentLocation = j - 1;
      let charMatch = patternAlphabet[text.charAt(currentLocation)];
      if (computeMatches) {
        matchMask[currentLocation] = +!!charMatch;
      }
      bitArr[j] = (bitArr[j + 1] << 1 | 1) & charMatch;
      if (i) {
        bitArr[j] |= (lastBitArr[j + 1] | lastBitArr[j]) << 1 | 1 | lastBitArr[j + 1];
      }
      if (bitArr[j] & mask) {
        finalScore = computeScore$1(pattern, {
          errors: i,
          currentLocation,
          expectedLocation,
          distance,
          ignoreLocation
        });
        if (finalScore <= currentThreshold) {
          currentThreshold = finalScore;
          bestLocation = currentLocation;
          if (bestLocation <= expectedLocation) {
            break;
          }
          start = Math.max(1, 2 * expectedLocation - bestLocation);
        }
      }
    }
    const score = computeScore$1(pattern, {
      errors: i + 1,
      currentLocation: expectedLocation,
      expectedLocation,
      distance,
      ignoreLocation
    });
    if (score > currentThreshold) {
      break;
    }
    lastBitArr = bitArr;
  }
  const result = {
    isMatch: bestLocation >= 0,
    // Count exact matches (those with a score of 0) to be "almost" exact
    score: Math.max(1e-3, finalScore)
  };
  if (computeMatches) {
    const indices = convertMaskToIndices(matchMask, minMatchCharLength);
    if (!indices.length) {
      result.isMatch = false;
    } else if (includeMatches) {
      result.indices = indices;
    }
  }
  return result;
}
function createPatternAlphabet(pattern) {
  let mask = {};
  for (let i = 0, len = pattern.length; i < len; i += 1) {
    const char = pattern.charAt(i);
    mask[char] = (mask[char] || 0) | 1 << len - i - 1;
  }
  return mask;
}
var stripDiacritics = String.prototype.normalize ? ((str) => str.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g, "")) : ((str) => str);
var BitapSearch = class {
  constructor(pattern, {
    location = Config.location,
    threshold = Config.threshold,
    distance = Config.distance,
    includeMatches = Config.includeMatches,
    findAllMatches = Config.findAllMatches,
    minMatchCharLength = Config.minMatchCharLength,
    isCaseSensitive = Config.isCaseSensitive,
    ignoreDiacritics = Config.ignoreDiacritics,
    ignoreLocation = Config.ignoreLocation
  } = {}) {
    this.options = {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreDiacritics,
      ignoreLocation
    };
    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;
    this.chunks = [];
    if (!this.pattern.length) {
      return;
    }
    const addChunk = (pattern2, startIndex) => {
      this.chunks.push({
        pattern: pattern2,
        alphabet: createPatternAlphabet(pattern2),
        startIndex
      });
    };
    const len = this.pattern.length;
    if (len > MAX_BITS) {
      let i = 0;
      const remainder = len % MAX_BITS;
      const end = len - remainder;
      while (i < end) {
        addChunk(this.pattern.substr(i, MAX_BITS), i);
        i += MAX_BITS;
      }
      if (remainder) {
        const startIndex = len - MAX_BITS;
        addChunk(this.pattern.substr(startIndex), startIndex);
      }
    } else {
      addChunk(this.pattern, 0);
    }
  }
  searchIn(text) {
    const { isCaseSensitive, ignoreDiacritics, includeMatches } = this.options;
    text = isCaseSensitive ? text : text.toLowerCase();
    text = ignoreDiacritics ? stripDiacritics(text) : text;
    if (this.pattern === text) {
      let result2 = {
        isMatch: true,
        score: 0
      };
      if (includeMatches) {
        result2.indices = [[0, text.length - 1]];
      }
      return result2;
    }
    const {
      location,
      distance,
      threshold,
      findAllMatches,
      minMatchCharLength,
      ignoreLocation
    } = this.options;
    let allIndices = [];
    let totalScore = 0;
    let hasMatches = false;
    this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
      const { isMatch, score, indices } = search(text, pattern, alphabet, {
        location: location + startIndex,
        distance,
        threshold,
        findAllMatches,
        minMatchCharLength,
        includeMatches,
        ignoreLocation
      });
      if (isMatch) {
        hasMatches = true;
      }
      totalScore += score;
      if (isMatch && indices) {
        allIndices = [...allIndices, ...indices];
      }
    });
    let result = {
      isMatch: hasMatches,
      score: hasMatches ? totalScore / this.chunks.length : 1
    };
    if (hasMatches && includeMatches) {
      result.indices = allIndices;
    }
    return result;
  }
};
var BaseMatch = class {
  constructor(pattern) {
    this.pattern = pattern;
  }
  static isMultiMatch(pattern) {
    return getMatch(pattern, this.multiRegex);
  }
  static isSingleMatch(pattern) {
    return getMatch(pattern, this.singleRegex);
  }
  search() {
  }
};
function getMatch(pattern, exp) {
  const matches = pattern.match(exp);
  return matches ? matches[1] : null;
}
var ExactMatch = class extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "exact";
  }
  static get multiRegex() {
    return /^="(.*)"$/;
  }
  static get singleRegex() {
    return /^=(.*)$/;
  }
  search(text) {
    const isMatch = text === this.pattern;
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    };
  }
};
var InverseExactMatch = class extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "inverse-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"$/;
  }
  static get singleRegex() {
    return /^!(.*)$/;
  }
  search(text) {
    const index = text.indexOf(this.pattern);
    const isMatch = index === -1;
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    };
  }
};
var PrefixExactMatch = class extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "prefix-exact";
  }
  static get multiRegex() {
    return /^\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^\^(.*)$/;
  }
  search(text) {
    const isMatch = text.startsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    };
  }
};
var InversePrefixExactMatch = class extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "inverse-prefix-exact";
  }
  static get multiRegex() {
    return /^!\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^!\^(.*)$/;
  }
  search(text) {
    const isMatch = !text.startsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    };
  }
};
var SuffixExactMatch = class extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "suffix-exact";
  }
  static get multiRegex() {
    return /^"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^(.*)\$$/;
  }
  search(text) {
    const isMatch = text.endsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [text.length - this.pattern.length, text.length - 1]
    };
  }
};
var InverseSuffixExactMatch = class extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "inverse-suffix-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^!(.*)\$$/;
  }
  search(text) {
    const isMatch = !text.endsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    };
  }
};
var FuzzyMatch = class extends BaseMatch {
  constructor(pattern, {
    location = Config.location,
    threshold = Config.threshold,
    distance = Config.distance,
    includeMatches = Config.includeMatches,
    findAllMatches = Config.findAllMatches,
    minMatchCharLength = Config.minMatchCharLength,
    isCaseSensitive = Config.isCaseSensitive,
    ignoreDiacritics = Config.ignoreDiacritics,
    ignoreLocation = Config.ignoreLocation
  } = {}) {
    super(pattern);
    this._bitapSearch = new BitapSearch(pattern, {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreDiacritics,
      ignoreLocation
    });
  }
  static get type() {
    return "fuzzy";
  }
  static get multiRegex() {
    return /^"(.*)"$/;
  }
  static get singleRegex() {
    return /^(.*)$/;
  }
  search(text) {
    return this._bitapSearch.searchIn(text);
  }
};
var IncludeMatch = class extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "include";
  }
  static get multiRegex() {
    return /^'"(.*)"$/;
  }
  static get singleRegex() {
    return /^'(.*)$/;
  }
  search(text) {
    let location = 0;
    let index;
    const indices = [];
    const patternLen = this.pattern.length;
    while ((index = text.indexOf(this.pattern, location)) > -1) {
      location = index + patternLen;
      indices.push([index, location - 1]);
    }
    const isMatch = !!indices.length;
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices
    };
  }
};
var searchers = [
  ExactMatch,
  IncludeMatch,
  PrefixExactMatch,
  InversePrefixExactMatch,
  InverseSuffixExactMatch,
  SuffixExactMatch,
  InverseExactMatch,
  FuzzyMatch
];
var searchersLen = searchers.length;
var SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
var OR_TOKEN = "|";
function parseQuery(pattern, options = {}) {
  return pattern.split(OR_TOKEN).map((item) => {
    let query = item.trim().split(SPACE_RE).filter((item2) => item2 && !!item2.trim());
    let results = [];
    for (let i = 0, len = query.length; i < len; i += 1) {
      const queryItem = query[i];
      let found = false;
      let idx = -1;
      while (!found && ++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isMultiMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          found = true;
        }
      }
      if (found) {
        continue;
      }
      idx = -1;
      while (++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isSingleMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          break;
        }
      }
    }
    return results;
  });
}
var MultiMatchSet = /* @__PURE__ */ new Set([FuzzyMatch.type, IncludeMatch.type]);
var ExtendedSearch = class {
  constructor(pattern, {
    isCaseSensitive = Config.isCaseSensitive,
    ignoreDiacritics = Config.ignoreDiacritics,
    includeMatches = Config.includeMatches,
    minMatchCharLength = Config.minMatchCharLength,
    ignoreLocation = Config.ignoreLocation,
    findAllMatches = Config.findAllMatches,
    location = Config.location,
    threshold = Config.threshold,
    distance = Config.distance
  } = {}) {
    this.query = null;
    this.options = {
      isCaseSensitive,
      ignoreDiacritics,
      includeMatches,
      minMatchCharLength,
      findAllMatches,
      ignoreLocation,
      location,
      threshold,
      distance
    };
    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;
    this.query = parseQuery(this.pattern, this.options);
  }
  static condition(_, options) {
    return options.useExtendedSearch;
  }
  searchIn(text) {
    const query = this.query;
    if (!query) {
      return {
        isMatch: false,
        score: 1
      };
    }
    const { includeMatches, isCaseSensitive, ignoreDiacritics } = this.options;
    text = isCaseSensitive ? text : text.toLowerCase();
    text = ignoreDiacritics ? stripDiacritics(text) : text;
    let numMatches = 0;
    let allIndices = [];
    let totalScore = 0;
    for (let i = 0, qLen = query.length; i < qLen; i += 1) {
      const searchers2 = query[i];
      allIndices.length = 0;
      numMatches = 0;
      for (let j = 0, pLen = searchers2.length; j < pLen; j += 1) {
        const searcher = searchers2[j];
        const { isMatch, indices, score } = searcher.search(text);
        if (isMatch) {
          numMatches += 1;
          totalScore += score;
          if (includeMatches) {
            const type = searcher.constructor.type;
            if (MultiMatchSet.has(type)) {
              allIndices = [...allIndices, ...indices];
            } else {
              allIndices.push(indices);
            }
          }
        } else {
          totalScore = 0;
          numMatches = 0;
          allIndices.length = 0;
          break;
        }
      }
      if (numMatches) {
        let result = {
          isMatch: true,
          score: totalScore / numMatches
        };
        if (includeMatches) {
          result.indices = allIndices;
        }
        return result;
      }
    }
    return {
      isMatch: false,
      score: 1
    };
  }
};
var registeredSearchers = [];
function register(...args) {
  registeredSearchers.push(...args);
}
function createSearcher(pattern, options) {
  for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
    let searcherClass = registeredSearchers[i];
    if (searcherClass.condition(pattern, options)) {
      return new searcherClass(pattern, options);
    }
  }
  return new BitapSearch(pattern, options);
}
var LogicalOperator = {
  AND: "$and",
  OR: "$or"
};
var KeyType = {
  PATH: "$path",
  PATTERN: "$val"
};
var isExpression = (query) => !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);
var isPath = (query) => !!query[KeyType.PATH];
var isLeaf = (query) => !isArray(query) && isObject(query) && !isExpression(query);
var convertToExplicit = (query) => ({
  [LogicalOperator.AND]: Object.keys(query).map((key) => ({
    [key]: query[key]
  }))
});
function parse(query, options, { auto = true } = {}) {
  const next = (query2) => {
    let keys = Object.keys(query2);
    const isQueryPath = isPath(query2);
    if (!isQueryPath && keys.length > 1 && !isExpression(query2)) {
      return next(convertToExplicit(query2));
    }
    if (isLeaf(query2)) {
      const key = isQueryPath ? query2[KeyType.PATH] : keys[0];
      const pattern = isQueryPath ? query2[KeyType.PATTERN] : query2[key];
      if (!isString(pattern)) {
        throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key));
      }
      const obj = {
        keyId: createKeyId(key),
        pattern
      };
      if (auto) {
        obj.searcher = createSearcher(pattern, options);
      }
      return obj;
    }
    let node = {
      children: [],
      operator: keys[0]
    };
    keys.forEach((key) => {
      const value = query2[key];
      if (isArray(value)) {
        value.forEach((item) => {
          node.children.push(next(item));
        });
      }
    });
    return node;
  };
  if (!isExpression(query)) {
    query = convertToExplicit(query);
  }
  return next(query);
}
function computeScore(results, { ignoreFieldNorm = Config.ignoreFieldNorm }) {
  results.forEach((result) => {
    let totalScore = 1;
    result.matches.forEach(({ key, norm: norm2, score }) => {
      const weight = key ? key.weight : null;
      totalScore *= Math.pow(
        score === 0 && weight ? Number.EPSILON : score,
        (weight || 1) * (ignoreFieldNorm ? 1 : norm2)
      );
    });
    result.score = totalScore;
  });
}
function transformMatches(result, data) {
  const matches = result.matches;
  data.matches = [];
  if (!isDefined(matches)) {
    return;
  }
  matches.forEach((match) => {
    if (!isDefined(match.indices) || !match.indices.length) {
      return;
    }
    const { indices, value } = match;
    let obj = {
      indices,
      value
    };
    if (match.key) {
      obj.key = match.key.src;
    }
    if (match.idx > -1) {
      obj.refIndex = match.idx;
    }
    data.matches.push(obj);
  });
}
function transformScore(result, data) {
  data.score = result.score;
}
function format(results, docs, {
  includeMatches = Config.includeMatches,
  includeScore = Config.includeScore
} = {}) {
  const transformers = [];
  if (includeMatches) transformers.push(transformMatches);
  if (includeScore) transformers.push(transformScore);
  return results.map((result) => {
    const { idx } = result;
    const data = {
      item: docs[idx],
      refIndex: idx
    };
    if (transformers.length) {
      transformers.forEach((transformer) => {
        transformer(result, data);
      });
    }
    return data;
  });
}
var Fuse = class {
  constructor(docs, options = {}, index) {
    this.options = { ...Config, ...options };
    if (this.options.useExtendedSearch && false) {
      throw new Error(EXTENDED_SEARCH_UNAVAILABLE);
    }
    this._keyStore = new KeyStore(this.options.keys);
    this.setCollection(docs, index);
  }
  setCollection(docs, index) {
    this._docs = docs;
    if (index && !(index instanceof FuseIndex)) {
      throw new Error(INCORRECT_INDEX_TYPE);
    }
    this._myIndex = index || createIndex(this.options.keys, this._docs, {
      getFn: this.options.getFn,
      fieldNormWeight: this.options.fieldNormWeight
    });
  }
  add(doc) {
    if (!isDefined(doc)) {
      return;
    }
    this._docs.push(doc);
    this._myIndex.add(doc);
  }
  remove(predicate = () => false) {
    const results = [];
    for (let i = 0, len = this._docs.length; i < len; i += 1) {
      const doc = this._docs[i];
      if (predicate(doc, i)) {
        this.removeAt(i);
        i -= 1;
        len -= 1;
        results.push(doc);
      }
    }
    return results;
  }
  removeAt(idx) {
    this._docs.splice(idx, 1);
    this._myIndex.removeAt(idx);
  }
  getIndex() {
    return this._myIndex;
  }
  search(query, { limit = -1 } = {}) {
    const {
      includeMatches,
      includeScore,
      shouldSort,
      sortFn,
      ignoreFieldNorm
    } = this.options;
    let results = isString(query) ? isString(this._docs[0]) ? this._searchStringList(query) : this._searchObjectList(query) : this._searchLogical(query);
    computeScore(results, { ignoreFieldNorm });
    if (shouldSort) {
      results.sort(sortFn);
    }
    if (isNumber(limit) && limit > -1) {
      results = results.slice(0, limit);
    }
    return format(results, this._docs, {
      includeMatches,
      includeScore
    });
  }
  _searchStringList(query) {
    const searcher = createSearcher(query, this.options);
    const { records } = this._myIndex;
    const results = [];
    records.forEach(({ v: text, i: idx, n: norm2 }) => {
      if (!isDefined(text)) {
        return;
      }
      const { isMatch, score, indices } = searcher.searchIn(text);
      if (isMatch) {
        results.push({
          item: text,
          idx,
          matches: [{ score, value: text, norm: norm2, indices }]
        });
      }
    });
    return results;
  }
  _searchLogical(query) {
    const expression = parse(query, this.options);
    const evaluate = (node, item, idx) => {
      if (!node.children) {
        const { keyId, searcher } = node;
        const matches = this._findMatches({
          key: this._keyStore.get(keyId),
          value: this._myIndex.getValueForItemAtKeyId(item, keyId),
          searcher
        });
        if (matches && matches.length) {
          return [
            {
              idx,
              item,
              matches
            }
          ];
        }
        return [];
      }
      const res = [];
      for (let i = 0, len = node.children.length; i < len; i += 1) {
        const child = node.children[i];
        const result = evaluate(child, item, idx);
        if (result.length) {
          res.push(...result);
        } else if (node.operator === LogicalOperator.AND) {
          return [];
        }
      }
      return res;
    };
    const records = this._myIndex.records;
    const resultMap = {};
    const results = [];
    records.forEach(({ $: item, i: idx }) => {
      if (isDefined(item)) {
        let expResults = evaluate(expression, item, idx);
        if (expResults.length) {
          if (!resultMap[idx]) {
            resultMap[idx] = { idx, item, matches: [] };
            results.push(resultMap[idx]);
          }
          expResults.forEach(({ matches }) => {
            resultMap[idx].matches.push(...matches);
          });
        }
      }
    });
    return results;
  }
  _searchObjectList(query) {
    const searcher = createSearcher(query, this.options);
    const { keys, records } = this._myIndex;
    const results = [];
    records.forEach(({ $: item, i: idx }) => {
      if (!isDefined(item)) {
        return;
      }
      let matches = [];
      keys.forEach((key, keyIndex) => {
        matches.push(
          ...this._findMatches({
            key,
            value: item[keyIndex],
            searcher
          })
        );
      });
      if (matches.length) {
        results.push({
          idx,
          item,
          matches
        });
      }
    });
    return results;
  }
  _findMatches({ key, value, searcher }) {
    if (!isDefined(value)) {
      return [];
    }
    let matches = [];
    if (isArray(value)) {
      value.forEach(({ v: text, i: idx, n: norm2 }) => {
        if (!isDefined(text)) {
          return;
        }
        const { isMatch, score, indices } = searcher.searchIn(text);
        if (isMatch) {
          matches.push({
            score,
            key,
            value: text,
            idx,
            norm: norm2,
            indices
          });
        }
      });
    } else {
      const { v: text, n: norm2 } = value;
      const { isMatch, score, indices } = searcher.searchIn(text);
      if (isMatch) {
        matches.push({ score, key, value: text, norm: norm2, indices });
      }
    }
    return matches;
  }
};
Fuse.version = "7.1.0";
Fuse.createIndex = createIndex;
Fuse.parseIndex = parseIndex;
Fuse.config = Config;
{
  Fuse.parseQuery = parse;
}
{
  register(ExtendedSearch);
}

// src/find/saga-scanner.ts
import { existsSync as existsSync3 } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join as join3 } from "node:path";
var FRONTMATTER_START_OFFSET = 3;
var FRONTMATTER_OPEN_LENGTH = 4;
var FRONTMATTER_CLOSE_LENGTH = 4;
var STORY_MD_SUFFIX_PATTERN = /\/story\.md$/;
async function isDirectory(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
function parseFrontmatter(content) {
  if (!content?.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }
  const endIndex = content.indexOf("\n---", FRONTMATTER_START_OFFSET);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }
  const frontmatterBlock = content.slice(FRONTMATTER_OPEN_LENGTH, endIndex);
  const body = content.slice(endIndex + FRONTMATTER_CLOSE_LENGTH).trim();
  const frontmatter = {};
  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();
    if (typeof value === "string" && value.startsWith('"') && value.endsWith('"') || typeof value === "string" && value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body };
}
async function parseStoryFile(storyPath, epicSlug, options = {}) {
  try {
    const content = await readFile(storyPath, "utf-8");
    const storyDir = storyPath.replace(STORY_MD_SUFFIX_PATTERN, "");
    const dirName = storyDir.split("/").pop() || "unknown";
    const parsed = parseFrontmatter(content);
    const frontmatter = parsed.frontmatter;
    const body = parsed.body;
    const journalPath = join3(storyDir, "journal.md");
    const hasJournal = await fileExists(journalPath);
    return {
      slug: frontmatter.id || frontmatter.slug || dirName,
      title: frontmatter.title || dirName,
      status: frontmatter.status || "ready",
      epicSlug,
      storyPath,
      worktreePath: options.worktreePath,
      journalPath: hasJournal ? journalPath : void 0,
      archived: options.archived,
      frontmatter,
      body
    };
  } catch {
    return null;
  }
}
async function scanWorktrees(sagaRoot) {
  const worktreesDir = join3(sagaRoot, ".saga", "worktrees");
  if (!await isDirectory(worktreesDir)) {
    return [];
  }
  const epicEntries = await readdir(worktreesDir);
  const epicPromises = epicEntries.map(async (epicSlug) => {
    const epicWorktreesDir = join3(worktreesDir, epicSlug);
    if (!await isDirectory(epicWorktreesDir)) {
      return [];
    }
    const storyEntries = await readdir(epicWorktreesDir);
    const storyPromises = storyEntries.map(async (storySlug) => {
      const worktreePath = join3(epicWorktreesDir, storySlug);
      if (!await isDirectory(worktreePath)) {
        return null;
      }
      const storyPath = join3(
        worktreePath,
        ".saga",
        "epics",
        epicSlug,
        "stories",
        storySlug,
        "story.md"
      );
      return await parseStoryFile(storyPath, epicSlug, { worktreePath });
    });
    const stories = await Promise.all(storyPromises);
    return stories.filter((story) => story !== null);
  });
  const epicStories = await Promise.all(epicPromises);
  return epicStories.flat();
}
async function scanEpicsStories(sagaRoot) {
  const epicsDir = join3(sagaRoot, ".saga", "epics");
  if (!await isDirectory(epicsDir)) {
    return [];
  }
  const epicEntries = await readdir(epicsDir);
  const epicPromises = epicEntries.map(async (epicSlug) => {
    const storiesDir = join3(epicsDir, epicSlug, "stories");
    if (!await isDirectory(storiesDir)) {
      return [];
    }
    const storyEntries = await readdir(storiesDir);
    const storyPromises = storyEntries.map(async (storySlug) => {
      const storyDir = join3(storiesDir, storySlug);
      if (!await isDirectory(storyDir)) {
        return null;
      }
      const storyPath = join3(storyDir, "story.md");
      return await parseStoryFile(storyPath, epicSlug);
    });
    const stories = await Promise.all(storyPromises);
    return stories.filter((story) => story !== null);
  });
  const epicStories = await Promise.all(epicPromises);
  return epicStories.flat();
}
async function scanArchive(sagaRoot) {
  const archiveDir = join3(sagaRoot, ".saga", "archive");
  if (!await isDirectory(archiveDir)) {
    return [];
  }
  const epicEntries = await readdir(archiveDir);
  const epicPromises = epicEntries.map(async (epicSlug) => {
    const epicArchiveDir = join3(archiveDir, epicSlug);
    if (!await isDirectory(epicArchiveDir)) {
      return [];
    }
    const storyEntries = await readdir(epicArchiveDir);
    const storyPromises = storyEntries.map(async (storySlug) => {
      const storyDir = join3(epicArchiveDir, storySlug);
      if (!await isDirectory(storyDir)) {
        return null;
      }
      const storyPath = join3(storyDir, "story.md");
      return await parseStoryFile(storyPath, epicSlug, { archived: true });
    });
    const stories = await Promise.all(storyPromises);
    return stories.filter((story) => story !== null);
  });
  const epicStories = await Promise.all(epicPromises);
  return epicStories.flat();
}
async function scanAllStories(sagaRoot) {
  const [worktreeStories, epicsStories, archivedStories] = await Promise.all([
    scanWorktrees(sagaRoot),
    scanEpicsStories(sagaRoot),
    scanArchive(sagaRoot)
  ]);
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const story of worktreeStories) {
    const key = `${story.epicSlug}/${story.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(story);
    }
  }
  for (const story of epicsStories) {
    const key = `${story.epicSlug}/${story.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(story);
    }
  }
  for (const story of archivedStories) {
    const key = `${story.epicSlug}/${story.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(story);
    }
  }
  return result;
}
function worktreesDirectoryExists(projectPath) {
  return existsSync3(join3(projectPath, ".saga", "worktrees"));
}
function epicsDirectoryExists(projectPath) {
  return existsSync3(join3(projectPath, ".saga", "epics"));
}

// src/find/finder.ts
var FUZZY_THRESHOLD = 0.3;
var MATCH_THRESHOLD = 0.6;
var SCORE_SIMILARITY_THRESHOLD = 0.1;
var DEFAULT_CONTEXT_MAX_LENGTH = 300;
var ELLIPSIS_LENGTH = 3;
var CONTEXT_SECTION_REGEX = /##\s*Context\s*\n+([\s\S]*?)(?=\n##|Z|$)/i;
function extractContext(body, maxLength = DEFAULT_CONTEXT_MAX_LENGTH) {
  const contextMatch = body.match(CONTEXT_SECTION_REGEX);
  if (!contextMatch) {
    return "";
  }
  const context = contextMatch[1].trim();
  if (context.length > maxLength) {
    return `${context.slice(0, maxLength - ELLIPSIS_LENGTH)}...`;
  }
  return context;
}
function normalize(str) {
  return str.toLowerCase().replace(/[-_]/g, " ");
}
function toStoryInfo(story) {
  return {
    slug: story.slug,
    title: story.title,
    status: story.status,
    context: extractContext(story.body),
    epicSlug: story.epicSlug,
    storyPath: story.storyPath,
    worktreePath: story.worktreePath || ""
  };
}
function processFuzzyResults(results) {
  if (results.length === 1) {
    return { found: true, data: results[0].item };
  }
  const bestScore = results[0].score ?? 0;
  const similarMatches = results.filter(
    (r) => (r.score ?? 0) - bestScore <= SCORE_SIMILARITY_THRESHOLD
  );
  if (similarMatches.length > 1) {
    return { found: false, matches: similarMatches.map((r) => r.item) };
  }
  if (bestScore <= FUZZY_THRESHOLD) {
    return { found: true, data: results[0].item };
  }
  return { found: false, matches: results.map((r) => r.item) };
}
function findExactStoryMatch(allStories, queryNormalized) {
  for (const story of allStories) {
    if (normalize(story.slug) === queryNormalized) {
      return story;
    }
  }
  return null;
}
function fuzzySearchStories(allStories, query) {
  const fuse = new Fuse(allStories, {
    keys: [
      { name: "slug", weight: 2 },
      // Prioritize slug matches
      { name: "title", weight: 1 }
    ],
    threshold: MATCH_THRESHOLD,
    includeScore: true
  });
  const results = fuse.search(query);
  if (results.length === 0) {
    return { found: false, error: `No story found matching '${query}'` };
  }
  return processFuzzyResults(results);
}
async function loadAndFilterStories(projectPath, query, options) {
  const scannedStories = await scanAllStories(projectPath);
  if (scannedStories.length === 0) {
    return { found: false, error: `No story found matching '${query}'` };
  }
  let allStories = scannedStories.map(toStoryInfo);
  if (options.status) {
    allStories = allStories.filter((story) => story.status === options.status);
    if (allStories.length === 0) {
      return {
        found: false,
        error: `No story found matching '${query}' with status '${options.status}'`
      };
    }
  }
  return allStories;
}
async function findStory(projectPath, query, options = {}) {
  if (!(worktreesDirectoryExists(projectPath) || epicsDirectoryExists(projectPath))) {
    return {
      found: false,
      error: "No .saga/worktrees/ or .saga/epics/ directory found. Run /generate-stories first."
    };
  }
  const storiesOrError = await loadAndFilterStories(projectPath, query, options);
  if (!Array.isArray(storiesOrError)) {
    return storiesOrError;
  }
  const allStories = storiesOrError;
  const queryNormalized = normalize(query);
  const exactMatch = findExactStoryMatch(allStories, queryNormalized);
  if (exactMatch) {
    return { found: true, data: exactMatch };
  }
  return fuzzySearchStories(allStories, query);
}

// src/implement/index.ts
function resolveProjectPath(pathOption) {
  if (pathOption) {
    if (!existsSync4(join4(pathOption, ".saga"))) {
      throw new Error(`Not a SAGA project: ${pathOption} (no .saga directory)`);
    }
    return pathOption;
  }
  const envPath = process2.env.SAGA_PROJECT_DIR;
  if (envPath && existsSync4(join4(envPath, ".saga"))) {
    return envPath;
  }
  if (existsSync4(join4(process2.cwd(), ".saga"))) {
    return process2.cwd();
  }
  let dir = process2.cwd();
  while (dir !== "/") {
    if (existsSync4(join4(dir, ".saga"))) {
      return dir;
    }
    dir = join4(dir, "..");
  }
  throw new Error("SAGA project not found. Run saga init first or use --path option.");
}
async function findStory2(projectPath, storySlug) {
  const result = await findStory(projectPath, storySlug);
  if (!result.found) {
    return null;
  }
  return {
    epicSlug: result.data.epicSlug,
    storySlug: result.data.slug,
    storyPath: result.data.storyPath,
    worktreePath: result.data.worktreePath
  };
}
function checkCommandExists(command) {
  try {
    const result = spawnSync2("which", [command], { encoding: "utf-8" });
    if (result.status === 0 && result.stdout.trim()) {
      return { exists: true, path: result.stdout.trim() };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}
function checkPluginRoot(pluginRoot) {
  if (pluginRoot) {
    return { name: "SAGA_PLUGIN_ROOT", path: pluginRoot, passed: true };
  }
  return { name: "SAGA_PLUGIN_ROOT", passed: false, error: "Environment variable not set" };
}
function checkClaudeCli() {
  const claudeCheck = checkCommandExists("claude");
  return {
    name: "claude CLI",
    path: claudeCheck.path,
    passed: claudeCheck.exists,
    error: claudeCheck.exists ? void 0 : "Command not found in PATH"
  };
}
function checkWorkerPrompt(pluginRoot) {
  const skillRoot = getSkillRoot(pluginRoot);
  const workerPromptPath = join4(skillRoot, WORKER_PROMPT_RELATIVE);
  const exists = existsSync4(workerPromptPath);
  return {
    name: "Worker prompt",
    path: workerPromptPath,
    passed: exists,
    error: exists ? void 0 : "File not found"
  };
}
function checkWorktreeExists(worktreePath) {
  const exists = existsSync4(worktreePath);
  return {
    name: "Worktree exists",
    path: worktreePath,
    passed: exists,
    error: exists ? void 0 : "Directory not found"
  };
}
function checkStoryMdExists(storyInfo) {
  if (!existsSync4(storyInfo.worktreePath)) {
    return null;
  }
  const storyMdPath = computeStoryPath(
    storyInfo.worktreePath,
    storyInfo.epicSlug,
    storyInfo.storySlug
  );
  const exists = existsSync4(storyMdPath);
  return {
    name: "story.md in worktree",
    path: storyMdPath,
    passed: exists,
    error: exists ? void 0 : "File not found"
  };
}
function runDryRun(storyInfo, _projectPath, pluginRoot) {
  const checks = [];
  checks.push(checkPluginRoot(pluginRoot));
  checks.push(checkClaudeCli());
  if (pluginRoot) {
    checks.push(checkWorkerPrompt(pluginRoot));
  }
  checks.push({
    name: "Story found",
    path: `${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`,
    passed: true
  });
  checks.push(checkWorktreeExists(storyInfo.worktreePath));
  const storyMdCheck = checkStoryMdExists(storyInfo);
  if (storyMdCheck) {
    checks.push(storyMdCheck);
  }
  const allPassed = checks.every((check) => check.passed);
  return {
    success: allPassed,
    checks,
    story: {
      epicSlug: storyInfo.epicSlug,
      storySlug: storyInfo.storySlug,
      worktreePath: storyInfo.worktreePath
    }
  };
}
function formatCheckResult(check) {
  const icon = check.passed ? "\u2713" : "\u2717";
  const status = check.passed ? "OK" : "FAILED";
  const lines = [];
  if (check.passed) {
    const pathSuffix = check.path ? ` (${check.path})` : "";
    lines.push(`  ${icon} ${check.name}: ${status}${pathSuffix}`);
  } else {
    const errorSuffix = check.error ? ` - ${check.error}` : "";
    lines.push(`  ${icon} ${check.name}: ${status}${errorSuffix}`);
    if (check.path) {
      lines.push(`      Path: ${check.path}`);
    }
  }
  return lines;
}
function printDryRunResults(result) {
  console.log("Dry Run: Implement Story Validation");
  console.log("");
  console.log("Checks:");
  for (const check of result.checks) {
    for (const line of formatCheckResult(check)) {
      console.log(line);
    }
  }
  console.log("");
  const summary = result.success ? "All checks passed. Ready to implement." : "Some checks failed. Please resolve the issues above.";
  console.log(summary);
}
function handleDryRun(storyInfo, projectPath, pluginRoot) {
  const dryRunResult = runDryRun(storyInfo, projectPath, pluginRoot);
  printDryRunResults(dryRunResult);
  process2.exit(dryRunResult.success ? 0 : 1);
}
async function handleDetachedMode(storySlug, storyInfo, projectPath, options) {
  const detachedCommand = buildDetachedCommand(storySlug, projectPath, {
    maxCycles: options.maxCycles,
    maxTime: options.maxTime,
    model: options.model
  });
  try {
    const sessionInfo = createSession(
      storyInfo.epicSlug,
      storyInfo.storySlug,
      detachedCommand
    );
    console.log(JSON.stringify(sessionInfo, null, 2));
  } catch (error) {
    console.error(
      `Error creating session: ${error instanceof Error ? error.message : String(error)}`
    );
    process2.exit(1);
  }
}
async function handleInternalSession(storyInfo, projectPath, pluginRoot, options) {
  const maxCycles = options.maxCycles ?? DEFAULT_MAX_CYCLES;
  const maxTime = options.maxTime ?? DEFAULT_MAX_TIME;
  const model = options.model ?? DEFAULT_MODEL;
  console.log("Starting story implementation...");
  console.log(`Story: ${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`);
  console.log(`Max cycles: ${maxCycles}, Max time: ${maxTime}min, Model: ${model}`);
  console.log("");
  const result = await runLoop(
    storyInfo.epicSlug,
    storyInfo.storySlug,
    maxCycles,
    maxTime,
    model,
    projectPath,
    pluginRoot
  );
  if (result.status === "ERROR") {
    console.error(`Error: ${result.summary}`);
    process2.exit(1);
  }
  console.log(`
Implementation ${result.status}: ${result.summary}`);
}
async function implementCommand(storySlug, options) {
  let projectPath;
  try {
    projectPath = resolveProjectPath(options.path);
  } catch (_error) {
    console.error("Error: SAGA project not found. Run saga init first or use --path option.");
    process2.exit(1);
  }
  const storyInfo = await findStory2(projectPath, storySlug);
  if (!storyInfo) {
    console.error(`Error: Story '${storySlug}' not found in project.`);
    console.error("Use /generate-stories to create stories for an epic first.");
    process2.exit(1);
  }
  const pluginRoot = process2.env.SAGA_PLUGIN_ROOT;
  if (options.dryRun) {
    handleDryRun(storyInfo, projectPath, pluginRoot);
  }
  if (!pluginRoot) {
    console.error("Error: SAGA_PLUGIN_ROOT environment variable is not set.");
    console.error("This is required to find the worker prompt template.");
    process2.exit(1);
  }
  if (!existsSync4(storyInfo.worktreePath)) {
    console.error(`Error: Worktree not found at ${storyInfo.worktreePath}`);
    process2.exit(1);
  }
  const isInternalSession = process2.env.SAGA_INTERNAL_SESSION === "1";
  if (isInternalSession) {
    await handleInternalSession(storyInfo, projectPath, pluginRoot, options);
  } else {
    await handleDetachedMode(storySlug, storyInfo, projectPath, options);
  }
}

// src/implement.ts
function printUsage() {
  const usage = `
Usage: implement <story-slug> [options]

Run story implementation using Claude workers.

Arguments:
  story-slug    The slug of the story to implement

Options:
  --path <path>       Path to SAGA project (default: auto-detect)
  --max-cycles <n>    Maximum worker cycles (default: 10)
  --max-time <n>      Maximum time in minutes (default: 60)
  --model <model>     Model to use (default: opus)
  --dry-run           Validate environment without running
  --help, -h          Show this help message

Examples:
  # Implement a story (runs in detached tmux session)
  node implement.js add-user-auth

  # Dry run to check environment
  node implement.js add-user-auth --dry-run

  # Run with custom options
  node implement.js add-user-auth --max-cycles 5 --model sonnet

  # Specify project path
  node implement.js add-user-auth --path /path/to/project

Environment:
  SAGA_PROJECT_DIR    Project directory (optional if --path provided)
  SAGA_PLUGIN_ROOT    Plugin root directory (required)
  SAGA_INTERNAL_SESSION=1  Indicates running inside tmux session
`.trim();
  console.log(usage);
}
function printError(message) {
  process3.stderr.write(`Error: ${message}
`);
}
function parseArgs(args) {
  const options = {};
  let storySlug;
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process3.exit(0);
    }
    if (arg === "--path") {
      i++;
      if (i >= args.length) {
        printError("--path requires a value");
        return null;
      }
      options.path = args[i];
      i++;
      continue;
    }
    if (arg === "--max-cycles") {
      i++;
      if (i >= args.length) {
        printError("--max-cycles requires a value");
        return null;
      }
      const value = Number.parseInt(args[i], 10);
      if (Number.isNaN(value) || value < 1) {
        printError("--max-cycles must be a positive integer");
        return null;
      }
      options.maxCycles = value;
      i++;
      continue;
    }
    if (arg === "--max-time") {
      i++;
      if (i >= args.length) {
        printError("--max-time requires a value");
        return null;
      }
      const value = Number.parseInt(args[i], 10);
      if (Number.isNaN(value) || value < 1) {
        printError("--max-time must be a positive integer");
        return null;
      }
      options.maxTime = value;
      i++;
      continue;
    }
    if (arg === "--model") {
      i++;
      if (i >= args.length) {
        printError("--model requires a value");
        return null;
      }
      options.model = args[i];
      i++;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      i++;
      continue;
    }
    if (arg.startsWith("--")) {
      printError(`Unknown option: ${arg}`);
      return null;
    }
    if (arg.startsWith("-") && arg !== "-") {
      printError(`Unknown option: ${arg}`);
      return null;
    }
    if (!storySlug) {
      storySlug = arg;
      i++;
      continue;
    }
    printError(`Unexpected argument: ${arg}`);
    return null;
  }
  if (!storySlug) {
    printError("Missing required argument: story-slug");
    printUsage();
    return null;
  }
  return { storySlug, options };
}
async function main() {
  const args = process3.argv.slice(2);
  const parsed = parseArgs(args);
  if (!parsed) {
    process3.exit(1);
  }
  await implementCommand(parsed.storySlug, parsed.options);
}
main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process3.exit(1);
});
