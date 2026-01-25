#!/usr/bin/env bash
# saga-status: Statusline integration script for SAGA
# Displays task context information for terminal prompts

set -euo pipefail

# Configuration flags (set by argument parsing)
USE_ICONS=true
SHOW_ORIGIN=false
SHOW_TASK=false
SHOW_COUNTS=false
SHOW_ALL=true

# Context variables (populated from CLAUDE_ENV_FILE)
SAGA_TASK_CONTEXT=""
CURRENT_TASK_ID=""

# Icon definitions
readonly ICON_MAIN="⎇"
readonly ICON_WORKTREE="⌂"
readonly ASCII_MAIN="[M]"
readonly ASCII_WORKTREE="[W]"

show_help() {
    cat << 'EOF'
Usage: task-status [OPTIONS]

Display Claude Task System context information for terminal statuslines.

Options:
  --help        Show this help message and exit
  --no-icons    Use ASCII characters instead of Unicode icons
  --origin      Show only the origin indicator (main repo vs worktree)
  --task        Show only the current task ID
  --counts      Show only task counts

If no section flags are specified, all sections are shown.

Environment:
  CLAUDE_ENV_FILE    Path to environment file with pre-detected context variables.
                     Expected variables: SAGA_TASK_CONTEXT, CURRENT_TASK_ID

Examples:
  task-status                    # Show all sections with icons
  task-status --no-icons         # Show all sections with ASCII
  task-status --origin           # Show only origin indicator
  task-status --origin --task    # Show origin and task sections

Exit codes:
  0    Success
  1    Invalid arguments
EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                show_help
                exit 0
                ;;
            --no-icons)
                USE_ICONS=false
                shift
                ;;
            --origin)
                SHOW_ORIGIN=true
                SHOW_ALL=false
                shift
                ;;
            --task)
                SHOW_TASK=true
                SHOW_ALL=false
                shift
                ;;
            --counts)
                SHOW_COUNTS=true
                SHOW_ALL=false
                shift
                ;;
            *)
                echo "Unknown option: $1" >&2
                echo "Use --help for usage information" >&2
                exit 1
                ;;
        esac
    done

    # If no section flags specified, show all
    if [[ "$SHOW_ALL" == "true" ]]; then
        SHOW_ORIGIN=true
        SHOW_TASK=true
        SHOW_COUNTS=true
    fi
}

load_environment() {
    # Only use values from CLAUDE_ENV_FILE, not inherited environment
    SAGA_TASK_CONTEXT=""
    CURRENT_TASK_ID=""

    if [[ -n "${CLAUDE_ENV_FILE:-}" && -f "$CLAUDE_ENV_FILE" && -r "$CLAUDE_ENV_FILE" ]]; then
        # shellcheck disable=SC1090
        source "$CLAUDE_ENV_FILE" 2>/dev/null || true
    fi
}

# Get indicator for context type
# Args: $1 = context ("main" or "worktree")
get_indicator() {
    local context="$1"
    if [[ "$context" == "worktree" ]]; then
        [[ "$USE_ICONS" == "true" ]] && echo -n "$ICON_WORKTREE" || echo -n "$ASCII_WORKTREE"
    else
        [[ "$USE_ICONS" == "true" ]] && echo -n "$ICON_MAIN" || echo -n "$ASCII_MAIN"
    fi
}

build_output() {
    local -a parts=()

    if [[ "$SHOW_ORIGIN" == "true" ]]; then
        parts+=("$(get_indicator "${SAGA_TASK_CONTEXT:-main}")")
    fi

    if [[ "$SHOW_TASK" == "true" && -n "$CURRENT_TASK_ID" ]]; then
        parts+=("$CURRENT_TASK_ID")
    fi

    # SHOW_COUNTS placeholder - will be implemented in future tasks

    # Join parts with space separator
    local IFS=' '
    echo "${parts[*]}"
}

main() {
    parse_args "$@"
    load_environment
    build_output
}

main "$@"
