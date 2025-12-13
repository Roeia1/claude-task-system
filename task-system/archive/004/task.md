# Task 004: Implement feature counts scanning

## Feature Context

**Feature**: [001-statusline-task-info](../../features/001-statusline-task-info/feature.md)
**Technical Plan**: [plan.md](../../features/001-statusline-task-info/plan.md)

## Overview

Implement feature status counting for the statusline script. This task scans `task-system/features/*/feature.md` files to extract status values from each feature definition, groups and counts features by status (Draft, Planned, In Progress, Complete), and appends feature counts to the `--counts` output section. This enables users to see overall feature progress at a glance in their statusline.

## Task Type

feature - New functionality for feature status counting

## Priority

P2 - Important for complete statusline functionality but not blocking core task display features

## Dependencies

- [001](../001/task-system/task-001/task.md) (Create npm package structure and foundation script): Foundation script must exist with argument parsing, help flags, context detection, and origin indicator output before adding feature counting functionality.

## Objectives

- [ ] Implement feature directory scanning to locate all feature.md files
- [ ] Implement status extraction from feature.md files
- [ ] Implement count aggregation by status value
- [ ] Integrate feature counts into `--counts` output section
- [ ] Handle edge cases (missing files, malformed status, no features)

## Sub-tasks

1. [ ] Add feature scanning function that finds all `task-system/features/*/feature.md` files
2. [ ] Implement status extraction using grep/awk to parse `**Status:**` line from feature.md
3. [ ] Create count aggregation logic to group features by status values
4. [ ] Define supported status values and normalization (Draft, Planned, In Progress, Complete)
5. [ ] Add format function for feature counts section (Unicode and ASCII modes)
6. [ ] Integrate feature counts output into `--counts` flag handler
7. [ ] Handle missing features directory gracefully (output "0" counts or skip section)
8. [ ] Handle malformed/missing status lines (skip or count as "Unknown")
9. [ ] Write unit tests for feature scanning function
10. [ ] Write unit tests for status extraction and aggregation

## Technical Approach

### Files to Create/Modify

- `packages/statusline/bin/task-status` - Add feature counting functions and integrate into `--counts` output

### Implementation Steps

1. **Add feature scanning function**
   ```bash
   scan_feature_dirs() {
     # Find all feature.md files under task-system/features/
     # Return list of paths for processing
   }
   ```

2. **Implement status extraction**
   ```bash
   extract_feature_status() {
     # Parse **Status:** line from feature.md
     # Use: grep -m1 "^\*\*Status:\*\*" "$1" | awk -F': ' '{print $2}'
     # Normalize whitespace and case
   }
   ```

3. **Aggregate counts by status**
   ```bash
   count_features_by_status() {
     # Loop through feature dirs
     # Extract status from each
     # Increment counters for: draft, planned, in_progress, complete
   }
   ```

4. **Format feature counts output**
   ```bash
   format_feature_counts() {
     # Unicode mode: " 1  2" (using icons from plan)
     # ASCII mode: "A:1 D:2" or "F:1/2"
   }
   ```

5. **Integrate into counts section**
   - Append feature counts after task counts in `--counts` output
   - Use powerline separator between task and feature counts

### Icon Mapping (from plan.md)

| Status | Unicode | ASCII | Description |
|--------|---------|-------|-------------|
| In Progress | `◨` | `A:` | Features actively being worked on |
| Draft | `◧` | `D:` | Features in draft state |
| Planned | (use draft icon) | `P:` | Features planned but not started |
| Complete | (checkmark or similar) | `C:` | Completed features |

### Testing Strategy

- **Unit Tests**:
  - `scan_feature_dirs()` returns correct paths for mock filesystem
  - `extract_feature_status()` parses various status formats correctly
  - `count_features_by_status()` aggregates counts accurately
  - `format_feature_counts()` outputs correct Unicode/ASCII strings

- **Integration Tests**:
  - Run script with `--counts` against mock filesystem with multiple features
  - Verify counts match expected values for each status
  - Test with empty features directory
  - Test with malformed feature.md files

- **Edge Cases**:
  - Feature.md missing Status line entirely
  - Status value with extra whitespace
  - Status value with unexpected case (e.g., "IN PROGRESS" vs "In Progress")
  - Empty features directory
  - features directory doesn't exist
  - Status value not in known set (should count as "other" or skip)

### Edge Cases to Handle

- **Missing features directory**: Return zeros for all counts, do not error
- **Empty features directory**: Return zeros for all counts
- **Missing Status line in feature.md**: Skip this feature or count as "Unknown"
- **Malformed Status line**: Use regex that handles various formats (with/without colon, extra spaces)
- **Unknown status values**: Group into "other" category or skip
- **Read permission errors**: Log to stderr, continue with other files

## Risks & Concerns

- **Status value inconsistency**: Feature.md files may have inconsistent status values (e.g., "In Progress" vs "InProgress" vs "Active"). Mitigation: Normalize status values with case-insensitive matching and aliases.
- **Performance with many features**: Scanning many files could slow down statusline. Mitigation: Use efficient `find` and limit file reads to first 50 lines with `head`.
- **Feature.md format changes**: If feature.md format changes, parsing may break. Mitigation: Use flexible regex patterns and fail gracefully.

## Resources & Links

- [Claude Code Statusline Documentation](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [Feature Definition Template](../../features/001-statusline-task-info/feature.md)

## Acceptance Criteria

- Feature counts are displayed when running `task-status --counts`
- Counts accurately reflect the number of features in each status category
- Script handles missing or malformed feature.md files without crashing
- Unicode icons are used by default, ASCII fallbacks work with `--no-icons`
- Feature counts appear after task counts in the output, properly separated
- Script completes within performance budget (<100ms total)
- Unit tests pass for all feature counting functions
