#!/usr/bin/env python3
"""
init_structure.py - Initialize .saga/ directory structure

Usage: python init_structure.py <project_root>

Creates:
  .saga/epics/
  .saga/archive/
  .saga/worktrees/

Updates .gitignore to ignore worktrees/
"""

import sys
from pathlib import Path


def main():
    # Validate arguments
    if len(sys.argv) < 2:
        print("Usage: init_structure.py <project_root>", file=sys.stderr)
        sys.exit(1)

    project_root = Path(sys.argv[1])

    if not project_root.is_dir():
        print(f"Error: Project root '{project_root}' does not exist", file=sys.stderr)
        sys.exit(1)

    claude_tasks_dir = project_root / ".saga"
    gitignore = project_root / ".gitignore"
    worktrees_pattern = ".saga/worktrees/"

    # Create directory structure
    (claude_tasks_dir / "epics").mkdir(parents=True, exist_ok=True)
    (claude_tasks_dir / "archive").mkdir(parents=True, exist_ok=True)
    (claude_tasks_dir / "worktrees").mkdir(parents=True, exist_ok=True)

    print("Created .saga/ directory structure")

    # Update .gitignore
    if gitignore.exists():
        content = gitignore.read_text()
        if worktrees_pattern in content:
            print(".gitignore already contains worktrees pattern")
        else:
            with gitignore.open("a") as f:
                f.write("\n# Claude Tasks - Worktrees (git worktree isolation for stories)\n")
                f.write(f"{worktrees_pattern}\n")
            print("Updated .gitignore with worktrees pattern")
    else:
        gitignore.write_text(
            "# Claude Tasks - Worktrees (git worktree isolation for stories)\n"
            f"{worktrees_pattern}\n"
        )
        print("Created .gitignore with worktrees pattern")

    print(f"Initialized .saga/ at {project_root}")


if __name__ == "__main__":
    main()
