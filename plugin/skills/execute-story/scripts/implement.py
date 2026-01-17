#!/usr/bin/env python3
"""
Story implementation orchestration script for the Claude Task System V2.

This script spawns worker Claude instances in a loop to autonomously execute
story tasks. Workers read story.md and journal.md themselves - the orchestrator
only validates files exist, provides the worker prompt, and enforces scope.

Usage:
    python implement.py <epic_slug> <story_slug> [options]

Environment Variables:
    CLAUDE_PLUGIN_ROOT - Path to the plugin root directory
    CLAUDE_PROJECT_DIR - Path to the project root directory

The script continues spawning workers until:
    - FINISH: All tasks completed
    - BLOCKED: Human input needed
    - TIMEOUT: Max time exceeded
    - MAX_CYCLES: Max spawns reached
"""

import argparse
import json
import os
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

# Worker prompt path relative to skill root
WORKER_PROMPT_RELATIVE = "worker-prompt.md"

# JSON schema for worker output validation
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

class StoryFileError(Exception):
    """Raised when story files are missing or invalid."""
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


class EnvironmentError(Exception):
    """Raised when required environment variables are missing."""
    pass


# ============================================================================
# CLI Argument Parsing
# ============================================================================

def create_argument_parser() -> argparse.ArgumentParser:
    """Create and configure the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Orchestrate story implementation by spawning worker Claude instances."
    )

    parser.add_argument(
        "epic_slug",
        help="The epic slug (e.g., 'auth-system')"
    )

    parser.add_argument(
        "story_slug",
        help="The story slug (e.g., 'user-login')"
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

    return parser


# ============================================================================
# Environment and Path Resolution
# ============================================================================

def get_environment_vars() -> Dict[str, str]:
    """
    Get required environment variables.

    Returns:
        Dict with CLAUDE_PLUGIN_ROOT and CLAUDE_PROJECT_DIR.

    Raises:
        EnvironmentError: If required variables are not set.
    """
    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR")

    if not plugin_root:
        raise EnvironmentError("CLAUDE_PLUGIN_ROOT environment variable not set")
    if not project_dir:
        raise EnvironmentError("CLAUDE_PROJECT_DIR environment variable not set")

    return {
        "plugin_root": plugin_root,
        "project_dir": project_dir
    }


def compute_worktree_path(project_dir: str, epic_slug: str, story_slug: str) -> Path:
    """
    Compute the worktree path for a story.

    Args:
        project_dir: Project root directory
        epic_slug: The epic slug
        story_slug: The story slug

    Returns:
        Path to the story worktree
    """
    return Path(project_dir) / ".claude-tasks" / "worktrees" / epic_slug / story_slug


def compute_story_path(worktree: Path, epic_slug: str, story_slug: str) -> Path:
    """
    Compute the path to story.md within a worktree.

    Args:
        worktree: Path to the worktree root
        epic_slug: The epic slug
        story_slug: The story slug

    Returns:
        Path to story.md
    """
    return worktree / ".claude-tasks" / "epics" / epic_slug / "stories" / story_slug / "story.md"


# ============================================================================
# Story File Validation
# ============================================================================

def validate_story_files(
    worktree: Path,
    epic_slug: str,
    story_slug: str
) -> Dict[str, Any]:
    """
    Validate that the worktree and story.md exist.

    Args:
        worktree: Path to the story worktree
        epic_slug: The epic slug
        story_slug: The story slug

    Returns:
        Dict with:
            - valid: bool indicating if files exist
            - worktree_path: Path to worktree
            - story_path: Path to story.md
            - error: Error message if validation failed
    """
    # Check worktree exists
    if not worktree.exists():
        return {
            "valid": False,
            "worktree_path": str(worktree),
            "story_path": None,
            "error": f"Worktree does not exist: {worktree}"
        }

    # Check story.md exists
    story_path = compute_story_path(worktree, epic_slug, story_slug)
    if not story_path.exists():
        return {
            "valid": False,
            "worktree_path": str(worktree),
            "story_path": str(story_path),
            "error": f"story.md not found: {story_path}"
        }

    return {
        "valid": True,
        "worktree_path": str(worktree),
        "story_path": str(story_path),
        "error": None
    }


# ============================================================================
# Worker Prompt Loading
# ============================================================================

def get_skill_root(plugin_root: str) -> Path:
    """Get the execute-story skill root directory."""
    return Path(plugin_root) / "skills" / "execute-story"


def load_worker_prompt(plugin_root: str) -> str:
    """
    Load the worker prompt template.

    Args:
        plugin_root: Path to the plugin root directory.

    Returns:
        The worker prompt content as a string.

    Raises:
        WorkerPromptError: If the prompt file cannot be found or read.
    """
    skill_root = get_skill_root(plugin_root)
    prompt_path = skill_root / WORKER_PROMPT_RELATIVE

    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise WorkerPromptError(f"Worker prompt not found at {prompt_path}")
    except IOError as e:
        raise WorkerPromptError(f"Failed to read worker prompt: {e}")


def prepend_context_to_prompt(
    prompt: str,
    worktree: Path,
    plugin_root: str,
    project_dir: str,
    epic_slug: str,
    story_slug: str
) -> str:
    """
    Prepend context variables to the worker prompt.

    Args:
        prompt: The base worker prompt template
        worktree: Path to the worktree
        plugin_root: Path to plugin root
        project_dir: Path to project root
        epic_slug: The epic slug
        story_slug: The story slug

    Returns:
        The prompt with context variables prepended.
    """
    story_dir = f".claude-tasks/epics/{epic_slug}/stories/{story_slug}"

    context = f"""# Story Worker Context

**Worktree Root:** {worktree}
**Plugin Root:** {plugin_root}
**Project Dir:** {project_dir}
**Epic:** {epic_slug}
**Story:** {story_slug}
**Story Dir:** {story_dir}

---

"""
    return context + prompt


# ============================================================================
# Scope Enforcement Settings
# ============================================================================

def build_scope_settings(
    plugin_root: str,
    epic_slug: str,
    story_slug: str
) -> Dict[str, Any]:
    """
    Build the settings JSON for scope enforcement hooks.

    Args:
        plugin_root: Path to the plugin root
        epic_slug: The epic slug
        story_slug: The story slug

    Returns:
        Settings dict with hooks configuration
    """
    skill_root = get_skill_root(plugin_root)
    validator_path = skill_root / "scripts" / "scope_validator.sh"

    # Build the hook command
    hook_command = f"bash {validator_path} {epic_slug} {story_slug}"

    return {
        "hooks": {
            "PreToolUse": [
                {
                    "matcher": "Read|Write|Edit",
                    "hooks": [hook_command]
                }
            ]
        }
    }


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
    settings: Dict[str, Any],
    working_dir: str
) -> str:
    """
    Spawn a worker Claude instance.

    Args:
        prompt: The worker prompt to send
        model: The model to use (e.g., "sonnet", "opus")
        settings: Settings dict with hooks configuration
        working_dir: Working directory for the subprocess (worktree root)

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
        "--settings", json.dumps(settings),
        "--dangerously-skip-permissions"
    ]

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

def run_loop(
    epic_slug: str,
    story_slug: str,
    max_cycles: int,
    max_time: int,
    model: str
) -> Dict[str, Any]:
    """
    Main orchestration loop that spawns workers until completion.

    Args:
        epic_slug: The epic slug
        story_slug: The story slug
        max_cycles: Maximum number of worker spawns
        max_time: Maximum execution time in minutes
        model: Model to use for workers

    Returns:
        Final result dict with status, summary, cycles, elapsed_minutes, blocker.

    Raises:
        EnvironmentError: If environment variables are missing.
        StoryFileError: If story files are not found.
    """
    # Get environment
    env = get_environment_vars()
    plugin_root = env["plugin_root"]
    project_dir = env["project_dir"]

    # Compute paths
    worktree = compute_worktree_path(project_dir, epic_slug, story_slug)

    # Validate story files
    validation = validate_story_files(worktree, epic_slug, story_slug)
    if not validation["valid"]:
        raise StoryFileError(validation["error"])

    # Load worker prompt
    base_prompt = load_worker_prompt(plugin_root)
    worker_prompt = prepend_context_to_prompt(
        base_prompt, worktree, plugin_root, project_dir, epic_slug, story_slug
    )

    # Build scope settings
    settings = build_scope_settings(plugin_root, epic_slug, story_slug)

    # Initialize loop state
    start_time = time.time()
    cycles = 0
    summaries = []
    last_blocker = None
    final_status = None
    elapsed_seconds = 0

    # Compute max time in seconds
    max_time_seconds = max_time * 60

    while cycles < max_cycles:
        # Check time limit
        elapsed_seconds = time.time() - start_time
        if elapsed_seconds >= max_time_seconds:
            final_status = "TIMEOUT"
            break

        # Spawn worker
        cycles += 1
        output = spawn_worker(
            prompt=worker_prompt,
            model=model,
            settings=settings,
            working_dir=str(worktree)
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

    # Calculate elapsed minutes
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
        "blocker": last_blocker,
        "epic_slug": epic_slug,
        "story_slug": story_slug
    }


# ============================================================================
# Entry Point
# ============================================================================

def main():
    """Entry point for the story implementation script."""
    parser = create_argument_parser()
    args = parser.parse_args()

    try:
        result = run_loop(
            epic_slug=args.epic_slug,
            story_slug=args.story_slug,
            max_cycles=args.max_cycles,
            max_time=args.max_time,
            model=args.model
        )
        print(json.dumps(result, indent=2))
        sys.exit(0)

    except EnvironmentError as e:
        error_result = {
            "status": "ERROR",
            "summary": str(e),
            "cycles": 0,
            "elapsed_minutes": 0,
            "blocker": None,
            "epic_slug": args.epic_slug,
            "story_slug": args.story_slug
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

    except StoryFileError as e:
        error_result = {
            "status": "ERROR",
            "summary": str(e),
            "cycles": 0,
            "elapsed_minutes": 0,
            "blocker": None,
            "epic_slug": args.epic_slug,
            "story_slug": args.story_slug
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

    except WorkerPromptError as e:
        error_result = {
            "status": "ERROR",
            "summary": str(e),
            "cycles": 0,
            "elapsed_minutes": 0,
            "blocker": None,
            "epic_slug": args.epic_slug,
            "story_slug": args.story_slug
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

    except Exception as e:
        error_result = {
            "status": "ERROR",
            "summary": f"Unexpected error: {e}",
            "cycles": 0,
            "elapsed_minutes": 0,
            "blocker": None,
            "epic_slug": args.epic_slug,
            "story_slug": args.story_slug
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
