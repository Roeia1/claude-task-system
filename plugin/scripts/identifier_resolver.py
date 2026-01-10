#!/usr/bin/env python3
"""
Identifier resolution module for the /implement command.

This module resolves flexible identifiers (task ID, task name, feature name)
to a specific task worktree path. Used by the /implement command before
spawning implement.py.

Resolution Priority:
1. Task ID - direct path lookup in task-system/tasks/{id}/
2. Task name - search task.json meta.title fields
3. Feature name - lookup feature, list associated tasks

Usage:
    from identifier_resolver import resolve_identifier

    result = resolve_identifier("015", project_root)
    if result["resolved"]:
        worktree_path = result["worktree_path"]
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


# ============================================================================
# Task ID Resolution
# ============================================================================

def resolve_task_id(identifier: str, project_root: Path) -> Dict[str, Any]:
    """
    Resolve an identifier as a task ID (direct path lookup).

    Handles various task ID formats:
    - "015" (3-digit)
    - "15" (without leading zeros)
    - "0015" (4-digit)

    Args:
        identifier: The identifier to resolve (potential task ID)
        project_root: Path to the project root directory

    Returns:
        Dict with:
            - found: bool indicating if task was found
            - task_id: normalized task ID (3-digit format)
            - worktree_path: path to task worktree if found
            - error: error message if not found
    """
    project_root = Path(project_root)

    # Check if identifier looks like a task ID (numeric)
    if not identifier.isdigit():
        return {
            "found": False,
            "task_id": None,
            "worktree_path": None,
            "error": f"'{identifier}' is not a valid task ID format (must be numeric)"
        }

    # Normalize to 3-digit format
    task_id = identifier.lstrip("0") or "0"
    task_id_padded = task_id.zfill(3)

    # Check both formats in case directory uses different padding
    tasks_dir = project_root / "task-system" / "tasks"

    # Try exact match first
    for try_id in [task_id_padded, task_id, identifier]:
        task_path = tasks_dir / try_id
        if task_path.exists() and task_path.is_dir():
            return {
                "found": True,
                "task_id": try_id,
                "worktree_path": str(task_path),
                "error": None
            }

    return {
        "found": False,
        "task_id": task_id_padded,
        "worktree_path": None,
        "error": f"No task worktree found for task ID '{identifier}' (looked for {task_id_padded})"
    }


# ============================================================================
# Task Name Resolution
# ============================================================================

def resolve_task_name(identifier: str, project_root: Path) -> Dict[str, Any]:
    """
    Resolve an identifier as a task name by searching task.json meta.title fields.

    Search is case-insensitive and supports partial matching.

    Args:
        identifier: The identifier to resolve (potential task name)
        project_root: Path to the project root directory

    Returns:
        Dict with:
            - found: bool indicating if unique task was found
            - task_id: task ID if unique match found
            - worktree_path: path to task worktree if found
            - multiple_matches: True if multiple tasks match
            - matches: list of matching tasks if multiple
            - error: error message if not found
    """
    project_root = Path(project_root)
    tasks_dir = project_root / "task-system" / "tasks"

    if not tasks_dir.exists():
        return {
            "found": False,
            "task_id": None,
            "worktree_path": None,
            "multiple_matches": False,
            "matches": [],
            "error": "No task-system/tasks directory found"
        }

    # Normalize search term for comparison
    search_term = identifier.lower().replace("-", " ").replace("_", " ")

    matches = []

    # Search all task worktrees
    for task_dir in tasks_dir.iterdir():
        if not task_dir.is_dir():
            continue

        task_id = task_dir.name

        # Find task.json in the task-system/task-{id} folder within worktree
        task_json_path = task_dir / "task-system" / f"task-{task_id}" / "task.json"

        if not task_json_path.exists():
            continue

        try:
            with open(task_json_path, "r", encoding="utf-8") as f:
                task_data = json.load(f)

            title = task_data.get("meta", {}).get("title", "")
            title_normalized = title.lower().replace("-", " ").replace("_", " ")

            # Check for match (exact or partial)
            if search_term in title_normalized or title_normalized in search_term:
                matches.append({
                    "task_id": task_id,
                    "title": title,
                    "worktree_path": str(task_dir)
                })
        except (json.JSONDecodeError, IOError):
            continue

    if len(matches) == 1:
        return {
            "found": True,
            "task_id": matches[0]["task_id"],
            "worktree_path": matches[0]["worktree_path"],
            "multiple_matches": False,
            "matches": matches,
            "error": None
        }
    elif len(matches) > 1:
        return {
            "found": False,
            "task_id": None,
            "worktree_path": None,
            "multiple_matches": True,
            "matches": matches,
            "error": f"Multiple tasks match '{identifier}'"
        }
    else:
        return {
            "found": False,
            "task_id": None,
            "worktree_path": None,
            "multiple_matches": False,
            "matches": [],
            "error": f"No task found with name matching '{identifier}'"
        }


# ============================================================================
# Feature Name Resolution
# ============================================================================

def resolve_feature_name(identifier: str, project_root: Path) -> Dict[str, Any]:
    """
    Resolve an identifier as a feature name, returning associated tasks.

    Handles formats:
    - "007" (feature ID only)
    - "007-user-auth" (feature ID with slug)

    Args:
        identifier: The identifier to resolve (potential feature name)
        project_root: Path to the project root directory

    Returns:
        Dict with:
            - found: bool indicating if feature was found
            - is_feature: True (indicates this is a feature resolution)
            - feature_id: the feature ID
            - tasks: list of tasks belonging to this feature
            - message: additional information
            - error: error message if not found
    """
    project_root = Path(project_root)

    # Extract feature ID from identifier (e.g., "007" from "007-user-auth")
    feature_id_match = re.match(r'^(\d{3})', identifier)
    if not feature_id_match:
        return {
            "found": False,
            "is_feature": False,
            "feature_id": None,
            "tasks": [],
            "message": None,
            "error": f"'{identifier}' does not match feature ID format"
        }

    feature_id = feature_id_match.group(1)

    # Check if feature directory exists
    features_dir = project_root / "task-system" / "features"
    feature_dir = None

    if features_dir.exists():
        for d in features_dir.iterdir():
            if d.is_dir() and d.name.startswith(feature_id):
                feature_dir = d
                break

    # Find tasks that belong to this feature
    tasks_dir = project_root / "task-system" / "tasks"
    tasks = []

    if tasks_dir.exists():
        for task_dir in tasks_dir.iterdir():
            if not task_dir.is_dir():
                continue

            task_id = task_dir.name
            task_json_path = task_dir / "task-system" / f"task-{task_id}" / "task.json"

            if not task_json_path.exists():
                continue

            try:
                with open(task_json_path, "r", encoding="utf-8") as f:
                    task_data = json.load(f)

                task_feature = task_data.get("meta", {}).get("feature", "")

                if task_feature == feature_id:
                    tasks.append({
                        "task_id": task_id,
                        "title": task_data.get("meta", {}).get("title", "Unknown"),
                        "worktree_path": str(task_dir)
                    })
            except (json.JSONDecodeError, IOError):
                continue

    # Build response
    message = None
    if len(tasks) == 0:
        message = f"Feature {feature_id} has no tasks generated yet"

    return {
        "found": True,
        "is_feature": True,
        "feature_id": feature_id,
        "tasks": tasks,
        "message": message,
        "error": None
    }


# ============================================================================
# Worktree Validation
# ============================================================================

def validate_worktree(worktree_path: str) -> Dict[str, Any]:
    """
    Validate that a path exists and is a valid directory.

    Args:
        worktree_path: Path to the task worktree

    Returns:
        Dict with:
            - valid: bool indicating if path is valid
            - error: error message if invalid
    """
    path = Path(worktree_path)

    if not path.exists():
        return {
            "valid": False,
            "error": f"Path does not exist: {worktree_path}"
        }

    if not path.is_dir():
        return {
            "valid": False,
            "error": f"Path is not a directory: {worktree_path}"
        }

    return {
        "valid": True,
        "error": None
    }


# ============================================================================
# task.json Validation
# ============================================================================

def validate_task_json(worktree_path: str) -> Dict[str, Any]:
    """
    Validate that task.json exists in the worktree and is valid JSON.

    Args:
        worktree_path: Path to the task worktree

    Returns:
        Dict with:
            - valid: bool indicating if task.json is valid
            - task_json_path: path to task.json if found
            - task_id: task ID extracted from folder name
            - error: error message if invalid
    """
    path = Path(worktree_path)

    # Look for task-system/task-NNN folder
    task_system_dir = path / "task-system"
    if not task_system_dir.exists():
        return {
            "valid": False,
            "task_json_path": None,
            "task_id": None,
            "error": f"task-system directory not found in {worktree_path}"
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
    task_id = task_folder.name.replace("task-", "")

    # Check for task.json
    task_json_path = task_folder / "task.json"
    if not task_json_path.exists():
        return {
            "valid": False,
            "task_json_path": None,
            "task_id": task_id,
            "error": f"task.json not found in {task_folder}"
        }

    # Validate JSON
    try:
        with open(task_json_path, "r", encoding="utf-8") as f:
            json.load(f)
    except json.JSONDecodeError as e:
        return {
            "valid": False,
            "task_json_path": str(task_json_path),
            "task_id": task_id,
            "error": f"Invalid JSON in task.json: {e}"
        }
    except IOError as e:
        return {
            "valid": False,
            "task_json_path": str(task_json_path),
            "task_id": task_id,
            "error": f"Failed to read task.json: {e}"
        }

    return {
        "valid": True,
        "task_json_path": str(task_json_path),
        "task_id": task_id,
        "error": None
    }


# ============================================================================
# Blocker Detection
# ============================================================================

def check_blocked_status(worktree_path: str) -> Dict[str, Any]:
    """
    Check if a task has an unresolved blocker in journal.md.

    A blocker is unresolved if there's a "## Blocker:" section without
    a corresponding "## Resolution:" section.

    Args:
        worktree_path: Path to the task worktree

    Returns:
        Dict with:
            - blocked: bool indicating if task is blocked
            - blocker_title: title of the blocker if blocked
            - error: error message if check failed
    """
    path = Path(worktree_path)

    # Find journal.md
    task_system_dir = path / "task-system"
    if not task_system_dir.exists():
        return {
            "blocked": False,
            "blocker_title": None,
            "error": None
        }

    task_folders = list(task_system_dir.glob("task-*"))
    if not task_folders:
        return {
            "blocked": False,
            "blocker_title": None,
            "error": None
        }

    journal_path = task_folders[0] / "journal.md"
    if not journal_path.exists():
        return {
            "blocked": False,
            "blocker_title": None,
            "error": None
        }

    try:
        with open(journal_path, "r", encoding="utf-8") as f:
            content = f.read()
    except IOError:
        return {
            "blocked": False,
            "blocker_title": None,
            "error": "Failed to read journal.md"
        }

    # Find all blockers
    blocker_pattern = r'## Blocker:\s*(.+?)(?:\n|$)'
    blockers = re.findall(blocker_pattern, content)

    # Find all resolutions
    resolution_pattern = r'## Resolution:\s*(.+?)(?:\n|$)'
    resolutions = re.findall(resolution_pattern, content)

    # A blocker is unresolved if it doesn't have a matching resolution
    for blocker in blockers:
        blocker_normalized = blocker.strip().lower()
        has_resolution = any(
            res.strip().lower() == blocker_normalized
            for res in resolutions
        )
        if not has_resolution:
            return {
                "blocked": True,
                "blocker_title": blocker.strip(),
                "error": None
            }

    return {
        "blocked": False,
        "blocker_title": None,
        "error": None
    }


# ============================================================================
# Full Resolution Flow
# ============================================================================

def resolve_identifier(identifier: str, project_root: Path) -> Dict[str, Any]:
    """
    Resolve a flexible identifier to a task worktree path.

    Resolution priority:
    1. Task ID - direct path lookup
    2. Task name - search task.json meta.title
    3. Feature name - list associated tasks

    Args:
        identifier: The identifier to resolve
        project_root: Path to the project root directory

    Returns:
        Dict with:
            - resolved: bool indicating if identifier was resolved
            - resolution_type: "task_id", "task_name", or "feature"
            - task_id: resolved task ID
            - worktree_path: path to task worktree
            - tasks: list of tasks (for feature resolution)
            - error: error message if not resolved
    """
    project_root = Path(project_root)

    # Priority 1: Try as task ID
    if identifier.isdigit():
        result = resolve_task_id(identifier, project_root)
        if result["found"]:
            return {
                "resolved": True,
                "resolution_type": "task_id",
                "task_id": result["task_id"],
                "worktree_path": result["worktree_path"],
                "tasks": None,
                "error": None
            }

    # Priority 2: Try as task name
    name_result = resolve_task_name(identifier, project_root)
    if name_result["found"]:
        return {
            "resolved": True,
            "resolution_type": "task_name",
            "task_id": name_result["task_id"],
            "worktree_path": name_result["worktree_path"],
            "tasks": None,
            "error": None
        }

    if name_result["multiple_matches"]:
        return {
            "resolved": False,
            "resolution_type": "task_name",
            "task_id": None,
            "worktree_path": None,
            "tasks": name_result["matches"],
            "multiple_matches": True,
            "error": name_result["error"]
        }

    # Priority 3: Try as feature name
    feature_result = resolve_feature_name(identifier, project_root)
    if feature_result["found"] and feature_result["is_feature"]:
        return {
            "resolved": True,
            "resolution_type": "feature",
            "task_id": None,
            "worktree_path": None,
            "tasks": feature_result["tasks"],
            "feature_id": feature_result["feature_id"],
            "message": feature_result["message"],
            "error": None
        }

    # Not found anywhere
    return {
        "resolved": False,
        "resolution_type": None,
        "task_id": None,
        "worktree_path": None,
        "tasks": None,
        "error": f"No task found for '{identifier}'. Use 'list tasks' to see available tasks."
    }


# ============================================================================
# Available Tasks Listing
# ============================================================================

def list_available_tasks(project_root: Path) -> List[Dict[str, Any]]:
    """
    List all available tasks with their status.

    Status is determined by:
    - PENDING: worktree exists, no journal.md
    - IN_PROGRESS: worktree exists, journal.md present

    Args:
        project_root: Path to the project root directory

    Returns:
        List of task dictionaries with id, title, status, worktree_path
    """
    project_root = Path(project_root)
    tasks_dir = project_root / "task-system" / "tasks"

    if not tasks_dir.exists():
        return []

    tasks = []

    for task_dir in sorted(tasks_dir.iterdir()):
        if not task_dir.is_dir():
            continue

        task_id = task_dir.name

        # Find task.json
        task_json_path = task_dir / "task-system" / f"task-{task_id}" / "task.json"
        journal_path = task_dir / "task-system" / f"task-{task_id}" / "journal.md"

        title = "Unknown"
        if task_json_path.exists():
            try:
                with open(task_json_path, "r", encoding="utf-8") as f:
                    task_data = json.load(f)
                title = task_data.get("meta", {}).get("title", "Unknown")
            except (json.JSONDecodeError, IOError):
                pass

        # Determine status
        status = "in_progress" if journal_path.exists() else "pending"

        tasks.append({
            "task_id": task_id,
            "title": title,
            "status": status,
            "worktree_path": str(task_dir)
        })

    return tasks


# ============================================================================
# Entry Point (for CLI usage)
# ============================================================================

def main():
    """CLI entry point for testing."""
    import argparse

    parser = argparse.ArgumentParser(description="Resolve task identifiers")
    parser.add_argument("identifier", help="Task ID, name, or feature name")
    parser.add_argument("--project-root", default=".", help="Project root directory")

    args = parser.parse_args()

    result = resolve_identifier(args.identifier, Path(args.project_root))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
