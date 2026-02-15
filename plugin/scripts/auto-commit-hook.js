#!/usr/bin/env node

// src/scripts/auto-commit-hook.ts
import { execFileSync } from "node:child_process";
import process from "node:process";
function runGit(args, cwd) {
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
function runGitPipeline(steps, cwd) {
  for (const step of steps) {
    const result = runGit(step.args, cwd);
    if (!result.success) {
      process.stderr.write(`[worker] Auto-commit failed at ${step.name}: ${result.output}
`);
      return `Auto-commit failed at \`git ${step.name}\`. Error output:
${result.output}

${step.recoveryHint}`;
    }
  }
  return void 0;
}
function createAutoCommitHook(worktreePath, storyId) {
  return (_input, _toolUseID, _options) => {
    const hookInput = _input;
    const toolInput = hookInput.tool_input ?? {};
    const taskId = toolInput.taskId;
    const status = toolInput.status;
    if (!(taskId && status) || status !== "completed") {
      return Promise.resolve({ continue: true });
    }
    const commitMessage = `feat(${storyId}): complete ${taskId}`;
    const fullCommitHint = "Please fix the issues and run `git add . && git commit && git push` manually.";
    try {
      const error = runGitPipeline(
        [
          { name: "add", args: ["add", "."], recoveryHint: fullCommitHint },
          { name: "commit", args: ["commit", "-m", commitMessage], recoveryHint: fullCommitHint },
          {
            name: "push",
            args: ["push"],
            recoveryHint: "Please fix the issues and run `git push` manually."
          }
        ],
        worktreePath
      );
      if (error) {
        return Promise.resolve({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: error
          }
        });
      }
      return Promise.resolve({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: "Changes committed and pushed."
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[worker] Auto-commit git error: ${errorMessage}
`);
      return Promise.resolve({ continue: true });
    }
  };
}
export {
  createAutoCommitHook
};
