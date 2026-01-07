# Task 015: Create implementation script (implement.py)

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)
**ADRs**: None

## Overview

Create the Python orchestration script that spawns worker Claude instances in a loop to autonomously execute task objectives. The script is the core execution engine of the task implementation system - it reads task state, builds worker prompts, spawns `claude -p` with JSON schema validation, parses worker output, and manages the loop until completion or blocker.

This task implements Phase 2 (Core - Implementation Script) from the technical plan. The script must integrate with the worker prompt template (Task 013) and task.json schema (Task 014).

## Task Type

feature

## Priority

P1 - This is the core orchestration engine; commands and integration depend on it

## Dependencies

- [013](../013/task.md) (Create worker prompt template): Script loads and uses the worker prompt
- [014](../014/task.md) (Create task.json schema and templates): Script reads and parses task.json

## Objectives

- [ ] Script runs standalone with CLI argument parsing
- [ ] Script builds correct worker prompts from task.json, journal.md, and worker instructions
- [ ] Script spawns claude -p with proper arguments including --json-schema
- [ ] Script parses JSON output correctly and handles all status values
- [ ] Script respects max_cycles and max_time limits
- [ ] Script returns structured final output (JSON)

## Sub-tasks

1. [ ] Create `plugin/scripts/implement.py` with basic structure and imports
2. [ ] Implement CLI argument parsing using argparse (task_path, --max-cycles, --max-time, --model, --mcp-config, --tools)
3. [ ] Implement task file discovery (find task.json, journal.md, worker prompt in worktree)
4. [ ] Implement prompt building function that combines task.json content + journal.md + worker instructions
5. [ ] Implement worker spawning via subprocess with claude -p and --json-schema flag
6. [ ] Implement JSON output parsing with error handling for malformed responses
7. [ ] Implement main loop with cycle counting and status-based flow control (ONGOING/FINISH/BLOCKED)
8. [ ] Implement time limit enforcement using elapsed time tracking
9. [ ] Implement structured final output generation (status, summary, cycles, elapsed_minutes, blocker)
10. [ ] Add cross-platform path handling using pathlib

## Technical Approach

### Files to Create/Modify

- `plugin/scripts/implement.py` - New file: Main orchestration script

### Implementation Steps

1. Create basic script structure with shebang, imports (subprocess, json, argparse, pathlib, time, typing, sys)
2. Define constants: DEFAULT_MAX_CYCLES=10, DEFAULT_MAX_TIME=60, DEFAULT_MODEL="sonnet"
3. Implement argument parser with all CLI options per API contract
4. Implement `find_task_files(task_path)` - locates task.json, journal.md, and returns paths
5. Implement `load_worker_prompt()` - reads worker-prompt.md from plugin instructions
6. Implement `build_prompt(task_json, journal_content, worker_instructions)` - combines into single prompt
7. Implement `spawn_worker(prompt, model, mcp_config, tools)` - builds claude -p command with --json-schema, runs subprocess, returns stdout
8. Implement `parse_worker_output(stdout)` - extracts JSON status object, validates structure
9. Implement `run_loop(args)` - main orchestration loop with cycle/time limits
10. Implement `main()` - entry point that parses args and runs loop

### API Contract

```
usage: implement.py [-h] [--max-cycles N] [--max-time MINUTES]
                    [--model MODEL] [--mcp-config PATH] [--tools TOOLS]
                    task_path

positional arguments:
  task_path             Path to task worktree

optional arguments:
  --max-cycles N        Maximum worker spawns (default: 10)
  --max-time MINUTES    Maximum execution time (default: 60)
  --model MODEL         Model for workers (default: sonnet)
  --mcp-config PATH     Path to MCP server config
  --tools TOOLS         Comma-separated allowed tools
```

**Output (JSON to stdout):**
```json
{
  "status": "FINISH | BLOCKED | TIMEOUT | MAX_CYCLES",
  "summary": "Final summary of all work done",
  "cycles": 5,
  "elapsed_minutes": 23,
  "blocker": null
}
```

### JSON Schema for Worker Output

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["ONGOING", "FINISH", "BLOCKED"]
    },
    "summary": {
      "type": "string",
      "description": "What was accomplished this session"
    },
    "blocker": {
      "type": ["string", "null"],
      "description": "Brief description if BLOCKED, null otherwise"
    }
  },
  "required": ["status", "summary"]
}
```

### Testing Strategy

- **Unit Tests**: Test each helper function in isolation
  - `test_find_task_files` - verifies correct path discovery
  - `test_build_prompt` - verifies prompt assembly
  - `test_parse_worker_output` - verifies JSON parsing and validation
  - `test_argument_parsing` - verifies CLI argument handling
- **Integration Tests**: Mock subprocess to test loop behavior
  - Test ONGOING -> ONGOING -> FINISH flow
  - Test immediate BLOCKED exit
  - Test max_cycles limit reached
  - Test max_time limit reached
- **Edge Cases**:
  - Malformed JSON from worker
  - Missing task.json
  - Worker process crashes
  - Empty journal.md

### Edge Cases to Handle

- Worker returns invalid JSON: Log error, report as script failure
- task.json not found: Exit with clear error message before starting loop
- journal.md missing: Proceed with empty journal context (new task)
- Worker process times out: Kill process, treat as ONGOING (retry on next cycle)
- max_cycles reached mid-progress: Exit with MAX_CYCLES status
- max_time exceeded: Exit with TIMEOUT status after current cycle completes
- Unicode in worker output: Ensure proper encoding handling
- Windows/Unix path differences: Use pathlib.Path throughout

## Risks & Concerns

- **Worker output parsing**: Workers might output extra text before JSON; need robust extraction
  - Mitigation: --json-schema flag should ensure clean JSON output, but add fallback parsing
- **Subprocess management on Windows**: Different process handling
  - Mitigation: Use subprocess with shell=False, test on Windows
- **Path resolution**: Worker prompt location relative to script vs worktree
  - Mitigation: Use CLAUDE_PLUGIN_ROOT or compute relative to script location
- **Large journal.md**: Could exceed prompt size
  - Mitigation: Consider truncating to last N entries if too large (future enhancement)

## Resources & Links

- [Claude CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Python subprocess documentation](https://docs.python.org/3/library/subprocess.html)
- [Python argparse documentation](https://docs.python.org/3/library/argparse.html)

## Acceptance Criteria

- Script accepts all CLI arguments defined in API contract (task_path, --max-cycles, --max-time, --model, --mcp-config, --tools)
- Script locates and reads task.json from provided task_path
- Script builds worker prompt combining task.json content, journal.md, and worker instructions
- Script spawns claude -p with --json-schema flag for structured output
- Script correctly parses worker JSON output and handles ONGOING/FINISH/BLOCKED status
- Script loops on ONGOING, exits on FINISH/BLOCKED
- Script enforces max_cycles limit (default 10)
- Script enforces max_time limit (default 60 minutes)
- Script outputs structured JSON result with status, summary, cycles, elapsed_minutes, blocker
- Script handles missing files gracefully with clear error messages
- Script works on both Windows and Unix (pathlib-based paths)
