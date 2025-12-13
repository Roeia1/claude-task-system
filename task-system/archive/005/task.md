# Task 005: Integration and powerline formatting

## Feature Context

**Feature**: [001-statusline-task-info](../../features/001-statusline-task-info/feature.md)
**Technical Plan**: [plan.md](../../features/001-statusline-task-info/plan.md)
**Feature Tasks**: [tasks.md](../../features/001-statusline-task-info/tasks.md)

## Overview

This task implements the final integration phase for the task-status statusline script. It combines all previously implemented sections (origin indicator from task 001, task information parsing from task 002, task counts from task 003, and feature counts from task 004) into a cohesive output with powerline separators (U+E0B0) and ANSI colors for a dark theme. The task also handles all flag combinations correctly (no flags = all sections, individual flags = specific sections only), implements performance optimizations to meet the <100ms target, and ensures robust edge case handling for missing directories and malformed files.

## Task Type

feature - This is Phase 5 (Integration & Polish) of a new statusline feature

## Priority

P1 - Critical: This is the final integration task that brings all components together. Without this, the statusline script cannot produce its intended output. All dependent components are ready.

## Dependencies

- [002](../002/task-system/task-002/task.md) (Implement task information parsing): Provides the `--task` section output with task title, type icon, and feature name
- [003](../003/task-system/task-003/task.md) (Implement task counts scanning): Provides the task counts portion of `--counts` output (in-progress/pending/remote)
- [004](../004/task-system/task-004/task.md) (Implement feature counts scanning): Provides the feature counts portion of `--counts` output (active/draft)

## Objectives

- [ ] Combine all section outputs (origin, task info, task counts, feature counts) into unified statusline output
- [ ] Implement powerline separators (U+E0B0) between segments with proper ANSI color transitions
- [ ] Apply dark theme ANSI colors to each segment as specified in plan.md
- [ ] Handle all flag combinations correctly (--origin, --task, --counts, and combinations)
- [ ] Ensure script completes in <100ms (95th percentile <50ms)
- [ ] Handle all edge cases gracefully (missing directories, malformed files, no task-system)

## Sub-tasks

1. [ ] Create main output assembly function that orchestrates section combination
2. [ ] Implement ANSI color codes for dark theme (Blue for main origin, Cyan for worktree origin, Gray for task info, Dark gray for counts)
3. [ ] Implement powerline separator function with proper background color transitions
4. [ ] Implement flag combination logic (no flags = all sections, individual flags = only requested sections)
5. [ ] Add segment visibility logic based on parsed flags
6. [ ] Implement graceful fallback when `$CLAUDE_ENV_FILE` is not set (fall back to filesystem detection)
7. [ ] Add edge case handling for missing task-system directory
8. [ ] Add edge case handling for malformed task.md and feature.md files
9. [ ] Performance optimization: minimize subshell invocations
10. [ ] Performance optimization: use built-in bash operations where possible
11. [ ] Add performance timing instrumentation (optional debug mode)
12. [ ] Write comprehensive tests for flag combinations and edge cases

## Technical Approach

### Files to Create/Modify

- `packages/statusline/bin/task-status` - Main script: add output assembly, ANSI colors, powerline separators, flag handling
- `packages/statusline/test/integration.test.sh` - Integration tests for combined output and flag combinations
- `packages/statusline/test/performance.test.sh` - Performance validation tests (<100ms target)
- `packages/statusline/test/fixtures/` - Additional edge case fixtures (malformed files, missing directories)

### Implementation Steps

1. **Define ANSI color constants for dark theme**:
   ```bash
   # Background colors
   BG_BLUE="\e[48;5;25m"      # Origin (main) - #3465a4
   BG_CYAN="\e[48;5;30m"      # Origin (worktree) - #06989a
   BG_GRAY="\e[48;5;240m"     # Task info - #555753
   BG_DARK_GRAY="\e[48;5;235m" # Counts - #2e3436

   # Foreground colors
   FG_WHITE="\e[38;5;15m"
   FG_BLACK="\e[38;5;0m"
   FG_LIGHT_GRAY="\e[38;5;250m"

   # Powerline separator
   SEPARATOR=$'\ue0b0'  # U+E0B0
   RESET="\e[0m"
   ```

2. **Implement powerline segment function**:
   ```bash
   # Outputs a segment with proper color transition
   # Usage: segment "content" "bg_color" "fg_color" "next_bg_color"
   segment() {
     local content="$1" bg="$2" fg="$3" next_bg="$4"
     printf "%b%b %s %b%b%s%b" "$bg" "$fg" "$content" "$RESET" "$next_bg" "$(printf '\ue0b0')" "$RESET"
   }
   ```

3. **Implement flag parsing and section selection**:
   ```bash
   # Parse flags
   show_origin=false
   show_task=false
   show_counts=false
   no_icons=false

   while [[ $# -gt 0 ]]; do
     case "$1" in
       --origin) show_origin=true ;;
       --task) show_task=true ;;
       --counts) show_counts=true ;;
       --no-icons) no_icons=true ;;
       --help) show_help; exit 0 ;;
     esac
     shift
   done

   # No flags = all sections
   if ! $show_origin && ! $show_task && ! $show_counts; then
     show_origin=true
     show_task=true
     show_counts=true
   fi
   ```

4. **Implement main output assembly**:
   ```bash
   main() {
     local output=""
     local last_bg=""

     if $show_origin; then
       output+=$(format_origin)
       last_bg=$origin_bg
     fi

     if $show_task && [[ "$TASK_CONTEXT" == "worktree" ]]; then
       output+=$(format_task_with_separator "$last_bg")
       last_bg=$BG_GRAY
     fi

     if $show_counts; then
       output+=$(format_counts_with_separator "$last_bg")
     fi

     printf "%s%b\n" "$output" "$RESET"
   }
   ```

5. **Add graceful fallback for missing env file**:
   ```bash
   load_context() {
     if [[ -n "$CLAUDE_ENV_FILE" && -f "$CLAUDE_ENV_FILE" ]]; then
       source "$CLAUDE_ENV_FILE"
     else
       # Fall back to filesystem detection
       detect_context_from_filesystem
     fi
   }

   detect_context_from_filesystem() {
     # Check if we're in a task worktree by looking for task-system/task-NNN folder
     local task_dir
     task_dir=$(find_task_dir)
     if [[ -n "$task_dir" ]]; then
       TASK_CONTEXT="worktree"
       CURRENT_TASK_ID=$(basename "$task_dir" | sed 's/task-//')
     else
       TASK_CONTEXT="main"
       CURRENT_TASK_ID=""
     fi
   }
   ```

6. **Add edge case handling**:
   ```bash
   # Handle missing task-system directory
   if [[ ! -d "task-system" ]]; then
     if $show_origin; then
       # Output minimal origin indicator
       if $no_icons; then
         printf "[M] --"
       else
         printf "\\u23C7 --"  # Main icon with placeholder
       fi
     fi
     exit 0
   fi

   # Handle malformed files - skip bad data, continue with others
   parse_task_md() {
     local file="$1"
     [[ ! -f "$file" ]] && return 1

     # Use defensive parsing - if field not found, use empty string
     TASK_TITLE=$(grep -m1 "^# Task" "$file" 2>/dev/null | sed 's/^# Task [0-9]*: //' || echo "")
     TASK_TYPE=$(grep -m1 "^\\*\\*Type:\\*\\*" "$file" 2>/dev/null | sed 's/.*\\*\\*Type:\\*\\* //' || echo "")
     # Continue for other fields...
   }
   ```

7. **Performance optimizations**:
   - Use `[[ ]]` instead of `[ ]` for conditionals (no subshell)
   - Use `printf` instead of `echo` (more portable, no subshell for escapes)
   - Cache results of git commands when possible
   - Use `head -n 50` to limit file reads
   - Avoid pipes where bash built-ins suffice

### Testing Strategy

- **Unit Tests**: Test each function in isolation
  - `test_segment()` - verify ANSI code output
  - `test_flag_parsing()` - verify flag combinations
  - `test_color_transitions()` - verify powerline separator colors

- **Integration Tests**: Full script execution scenarios
  - Run with no flags - verify all sections present
  - Run with --origin only - verify only origin shown
  - Run with --task only - verify only task info shown
  - Run with --counts only - verify only counts shown
  - Run with --origin --task - verify both sections, proper separator
  - Run with --no-icons - verify ASCII fallbacks used
  - Run in main repo - verify origin shows main indicator
  - Run in worktree - verify task info populated

- **Edge Cases**: Specific failure scenarios
  - Missing $CLAUDE_ENV_FILE - falls back to filesystem detection
  - Missing task-system/ directory - outputs minimal "--"
  - Malformed task.md (missing Type field) - continues with available data
  - Empty features/ directory - shows zero counts
  - Git not available - skips remote branch counting

### Edge Cases to Handle

- `$CLAUDE_ENV_FILE` not set or file doesn't exist: Fall back to filesystem-based context detection
- task-system/ directory doesn't exist: Output minimal indicator ("--"), exit 0
- task.md exists but is empty or has missing fields: Use empty strings for missing fields, continue output
- feature.md has unexpected Status value: Group as "other", don't crash
- No git repository (git commands fail): Skip remote branch counting, show only local counts
- Terminal doesn't support ANSI colors: Use --no-icons flag for ASCII output
- Nerd Font not installed: Powerline separator may render as box, document font requirement

## Risks & Concerns

- **ANSI escape codes vary by terminal**: Mitigation: Use standard 256-color codes, test in common terminals (iTerm2, Terminal.app, GNOME Terminal)
- **Powerline font not installed**: Mitigation: Document Nerd Font requirement in README, separator will render as box character if missing
- **Performance regression from color code overhead**: Mitigation: Pre-compute color strings, avoid repeated printf calls for escapes
- **Flag combination complexity**: Mitigation: Use boolean flags with simple if-blocks, comprehensive test coverage

## Resources & Links

- [ANSI Escape Codes Reference](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [Powerline Fonts](https://github.com/powerline/fonts)
- [Nerd Fonts](https://www.nerdfonts.com/)
- [Claude Code Statusline Documentation](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [claude-powerline (visual reference)](https://github.com/Owloops/claude-powerline)

## Acceptance Criteria

- Running `task-status` with no flags outputs all sections (origin, task info, counts) with powerline separators
- Running `task-status --origin` outputs only the origin indicator segment
- Running `task-status --task` outputs only the task information segment (in worktree) or nothing (in main repo)
- Running `task-status --counts` outputs only the counts segments
- Running `task-status --origin --task` outputs origin and task with proper powerline separator between
- Powerline separator (U+E0B0) appears between segments with correct color transitions
- Dark theme colors are applied correctly: Blue bg for main origin, Cyan bg for worktree origin, Gray bg for task, Dark gray bg for counts
- Script completes in under 100ms in normal operation
- Script exits 0 and outputs graceful fallback when task-system directory is missing
- Script handles malformed task.md/feature.md files without crashing
- Script falls back to filesystem detection when $CLAUDE_ENV_FILE is not available
- ASCII fallback works correctly with --no-icons flag
