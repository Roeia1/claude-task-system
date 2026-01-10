#!/usr/bin/env python3
"""
Implementation orchestration script for the Claude Task System.

This script spawns worker Claude instances in a loop to autonomously execute
task objectives. Workers read task.json and journal.md themselves - the
orchestrator only validates files exist and provides the worker prompt.

Usage:
    python implement.py /path/to/task/worktree [options]

The script continues spawning workers until:
    - FINISH: All objectives completed
    - BLOCKED: Human input needed
    - TIMEOUT: Max time exceeded
    - MAX_CYCLES: Max spawns reached
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional


# ============================================================================
# Constants
# ============================================================================

DEFAULT_MAX_CYCLES = 10
DEFAULT_MAX_TIME = 60  # minutes
DEFAULT_MODEL = "opus"

# Valid worker exit statuses
VALID_STATUSES = {"ONGOING", "FINISH", "BLOCKED"}

# Worker prompt path relative to plugin root
WORKER_PROMPT_RELATIVE = "instructions/orchestration/worker-prompt.md"

# JSON schema for worker output validation (used with --json-schema flag)
WORKER_OUTPUT_SCHEMA = {
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


# ============================================================================
# Custom Exceptions
# ============================================================================

class TaskFileError(Exception):
    """Raised when task files are missing or invalid."""
    pass


class WorkerPromptError(Exception):
    """Raised when the worker prompt template cannot be loaded."""
    pass


class WorkerOutputError(Exception):
    """Raised when worker output is invalid or cannot be parsed."""
    pass


class WorkerSpawnError(Exception):
    """Raised when spawning a worker process fails."""
    pass


# ============================================================================
# CLI Argument Parsing
# ============================================================================

def create_argument_parser() -> argparse.ArgumentParser:
    """Create and configure the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Orchestrate task implementation by spawning worker Claude instances."
    )

    parser.add_argument(
        "task_path",
        help="Path to task worktree"
    )

    parser.add_argument(
        "--max-cycles",
        type=int,
        default=DEFAULT_MAX_CYCLES,
        dest="max_cycles",
        help=f"Maximum worker spawns (default: {DEFAULT_MAX_CYCLES})"
    )

    parser.add_argument(
        "--max-time",
        type=int,
        default=DEFAULT_MAX_TIME,
        dest="max_time",
        help=f"Maximum execution time in minutes (default: {DEFAULT_MAX_TIME})"
    )

    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Model for workers (default: {DEFAULT_MODEL})"
    )

    parser.add_argument(
        "--mcp-config",
        dest="mcp_config",
        default=None,
        help="Path to MCP server config"
    )

    parser.add_argument(
        "--tools",
        default=None,
        help="Comma-separated allowed tools"
    )

    return parser


# ============================================================================
# Task File Validation
# ============================================================================

def validate_task_files(task_path: str) -> Dict[str, Any]:
    """
    Validate that task.json exists in the task worktree.

    The orchestrator does NOT read task.json content - workers read files
    themselves. This function only validates existence.

    Args:
        task_path: Path to the task worktree root

    Returns:
        Dict with:
            - valid: bool indicating if task.json exists
            - task_json_path: Path to task.json if found
            - task_id: Task ID extracted from folder name
            - error: Error message if validation failed
    """
    path = Path(task_path)

    # Check if the path exists
    if not path.exists():
        return {
            "valid": False,
            "task_json_path": None,
            "task_id": None,
            "error": f"Path does not exist: {task_path}"
        }

    # Look for task-system/task-NNN folder
    task_system_dir = path / "task-system"
    if not task_system_dir.exists():
        return {
            "valid": False,
            "task_json_path": None,
            "task_id": None,
            "error": f"task-system directory not found in {task_path}"
        }

    # Find task-NNN folder
    task_folders = list(task_system_dir.glob("task-*"))
    if not task_folders:
        return {
            "valid": False,
            "task_json_path": None,
            "task_id": None,
            "error": "No task-NNN folder found in task-system directory"
        }

    task_folder = task_folders[0]

    # Extract task ID from folder name
    folder_name = task_folder.name
    task_id = folder_name.replace("task-", "")

    # Check for task.json
    task_json_path = task_folder / "task.json"
    if not task_json_path.exists():
        return {
            "valid": False,
            "task_json_path": None,
            "task_id": task_id,
            "error": f"task.json not found in {task_folder}"
        }

    return {
        "valid": True,
        "task_json_path": str(task_json_path),
        "task_id": task_id,
        "error": None
    }


# ============================================================================
# Worker Prompt Loading
# ============================================================================

def get_worker_prompt_path() -> Path:
    """
    Get the worker prompt path using CLAUDE_PLUGIN_ROOT environment variable.

    Returns:
        Path to the worker prompt file.

    Raises:
        WorkerPromptError: If CLAUDE_PLUGIN_ROOT is not set.
    """
    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
    if not plugin_root:
        raise WorkerPromptError(
            "CLAUDE_PLUGIN_ROOT environment variable is not set. "
            "This script must be run in a Claude Code plugin context."
        )
    return Path(plugin_root) / WORKER_PROMPT_RELATIVE


def load_worker_prompt() -> str:
    """
    Load the worker prompt template.

    Returns:
        The worker prompt content as a string.

    Raises:
        WorkerPromptError: If CLAUDE_PLUGIN_ROOT is not set or the prompt file
                          cannot be found or read.
    """
    prompt_path = get_worker_prompt_path()
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise WorkerPromptError(f"Worker prompt not found at {prompt_path}")
    except IOError as e:
        raise WorkerPromptError(f"Failed to read worker prompt: {e}")


# ============================================================================
# Worker Output Parsing
# ============================================================================

def parse_worker_output(output: str) -> Dict[str, Any]:
    """
    Parse and validate worker JSON output.

    The output is from claude CLI with --output-format json, which wraps
    the structured_output in a response envelope.

    Args:
        output: Raw stdout from the worker process (claude CLI JSON format)

    Returns:
        Parsed and validated worker output dict with status, summary, and blocker.

    Raises:
        WorkerOutputError: If output is invalid, missing required fields, or
                          has an invalid status value.
    """
    if not output or not output.strip():
        raise WorkerOutputError("Worker output is empty")

    # Parse the claude CLI JSON response
    try:
        cli_response = json.loads(output.strip())
    except json.JSONDecodeError as e:
        raise WorkerOutputError(f"Invalid JSON in worker output: {e}")

    # Extract structured_output from the CLI response
    if "structured_output" not in cli_response:
        # Check if this is an error response
        if cli_response.get("is_error"):
            error_msg = cli_response.get("result", "Unknown error")
            raise WorkerOutputError(f"Worker failed: {error_msg}")
        raise WorkerOutputError(
            "Worker output missing structured_output field. "
            f"Got keys: {list(cli_response.keys())}"
        )

    parsed = cli_response["structured_output"]

    # Validate required fields
    if "status" not in parsed:
        raise WorkerOutputError("Worker output missing required field: status")

    if "summary" not in parsed:
        raise WorkerOutputError("Worker output missing required field: summary")

    # Validate status value
    if parsed["status"] not in VALID_STATUSES:
        raise WorkerOutputError(
            f"Invalid status value: {parsed['status']}. "
            f"Must be one of: {', '.join(VALID_STATUSES)}"
        )

    # Ensure blocker field exists (defaults to None)
    if "blocker" not in parsed:
        parsed["blocker"] = None

    return parsed


# ============================================================================
# Worker Spawning
# ============================================================================

def spawn_worker(
    prompt: str,
    model: str,
    mcp_config: Optional[str],
    tools: Optional[str],
    working_dir: str
) -> str:
    """
    Spawn a worker Claude instance.

    Args:
        prompt: The worker prompt to send
        model: The model to use (e.g., "sonnet", "opus")
        mcp_config: Optional path to MCP server config
        tools: Optional comma-separated list of allowed tools
        working_dir: Working directory for the subprocess

    Returns:
        The worker's stdout output.

    Raises:
        WorkerSpawnError: If the subprocess fails to spawn or crashes.
    """
    # Build command with JSON schema for validated output
    cmd = [
        "claude",
        "-p", prompt,
        "--model", model,
        "--output-format", "json",
        "--json-schema", json.dumps(WORKER_OUTPUT_SCHEMA),
        "--dangerously-skip-permissions"
    ]

    # Add optional arguments
    if mcp_config:
        cmd.extend(["--mcp-config", mcp_config])

    if tools:
        cmd.extend(["--allowedTools", tools])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=working_dir,
            shell=False
        )

        # Return stdout even if exit code is non-zero
        # Worker might have output before failing
        return result.stdout

    except subprocess.SubprocessError as e:
        raise WorkerSpawnError(f"Failed to spawn worker: {e}")
    except OSError as e:
        raise WorkerSpawnError(f"Failed to spawn worker process: {e}")


# ============================================================================
# Main Orchestration Loop
# ============================================================================

def run_loop(args: argparse.Namespace) -> Dict[str, Any]:
    """
    Main orchestration loop that spawns workers until completion.

    Args:
        args: Parsed CLI arguments

    Returns:
        Final result dict with status, summary, cycles, elapsed_minutes, blocker.

    Raises:
        TaskFileError: If task.json is not found.
    """
    # Validate task files
    validation = validate_task_files(args.task_path)
    if not validation["valid"]:
        raise TaskFileError(validation["error"])

    # Load worker prompt
    worker_prompt = load_worker_prompt()

    # Initialize loop state
    start_time = time.time()
    cycles = 0
    summaries = []
    last_blocker = None
    final_status = None
    elapsed_seconds = 0  # Track for final calculation

    # Compute max time in seconds
    max_time_seconds = args.max_time * 60

    while cycles < args.max_cycles:
        # Check time limit
        elapsed_seconds = time.time() - start_time
        if elapsed_seconds >= max_time_seconds:
            final_status = "TIMEOUT"
            break

        # Spawn worker
        cycles += 1
        output = spawn_worker(
            prompt=worker_prompt,
            model=args.model,
            mcp_config=args.mcp_config,
            tools=args.tools,
            working_dir=args.task_path
        )

        # Parse worker output
        parsed = parse_worker_output(output)
        summaries.append(parsed["summary"])

        status = parsed["status"]

        if status == "FINISH":
            final_status = "FINISH"
            break
        elif status == "BLOCKED":
            final_status = "BLOCKED"
            last_blocker = parsed.get("blocker")
            break
        # ONGOING: continue loop

    # Check if we hit max cycles
    if final_status is None:
        final_status = "MAX_CYCLES"

    # Calculate elapsed minutes (use last elapsed_seconds from loop)
    elapsed_minutes = elapsed_seconds / 60

    # Combine summaries
    if len(summaries) == 1:
        combined_summary = summaries[0]
    else:
        combined_summary = " | ".join(summaries)

    return {
        "status": final_status,
        "summary": combined_summary,
        "cycles": cycles,
        "elapsed_minutes": round(elapsed_minutes, 2),
        "blocker": last_blocker
    }


# ============================================================================
# Entry Point
# ============================================================================

def main():
    """Entry point for the implementation script."""
    parser = create_argument_parser()
    args = parser.parse_args()

    try:
        result = run_loop(args)
        print(json.dumps(result, indent=2))
        sys.exit(0)
    except TaskFileError as e:
        error_result = {
            "status": "ERROR",
            "summary": str(e),
            "cycles": 0,
            "elapsed_minutes": 0,
            "blocker": None
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
    except WorkerPromptError as e:
        error_result = {
            "status": "ERROR",
            "summary": str(e),
            "cycles": 0,
            "elapsed_minutes": 0,
            "blocker": None
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
    except Exception as e:
        error_result = {
            "status": "ERROR",
            "summary": f"Unexpected error: {e}",
            "cycles": 0,
            "elapsed_minutes": 0,
            "blocker": None
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
