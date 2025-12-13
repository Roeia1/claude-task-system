# Task 004: Implement feature counts scanning

## Git References

- **Branch**: task-004-feature
- **PR**: https://github.com/Roeia1/claude-task-system/pull/13
- **Base Branch**: main

## Current Phase: Phase 2 - Testing

## Progress Log

### 2025-12-13 20:45 - Phase 1: Analysis Started

Initiated Phase 1 analysis for task 004: Implement feature counts scanning. This task extends the statusline script to detect and count features by their status.

**Requirements Summary**:
- Scan `task-system/features/*/feature.md` files to extract status values
- Count features by status categories: Draft, Planned, In Progress, Complete
- Append feature counts to `--counts` output in the statusline script
- Handle edge cases gracefully (missing files, malformed status, empty directories)

**Dependency Verified**:
- Task 001 (foundation script) must be completed first - provides argument parsing, help flags, context detection
- Foundation script with `--counts` flag support must already exist in packages/statusline/bin/task-status

**Next Phase**: Detailed code analysis - examine existing task-status script structure, understand current --counts implementation, identify integration points for feature counting functionality.

**Next:** Examine the existing task-status script to understand the current --counts output structure and planning points for feature counting integration.

### 2025-12-13 20:47 - Phase 1: Detailed Code Analysis Complete

Completed comprehensive analysis of the existing task-status script structure to understand integration points for feature counting functionality.

**Key Findings**:
1. **Solid Foundation Exists**: The script already implements task counting with:
   - Directory scanning (`find` command)
   - Status extraction using `grep -m1` for efficiency
   - Status normalization (pending, in_progress, completed)
   - Proper error handling for missing directories

2. **Count Structure Identified**:
   - Task counts stored in: `pending_count`, `in_progress_count`, `completed_count` variables
   - Formatted as: `P:2 A:1 C:0` (ASCII mode) with Unicode icon equivalents
   - Integration point: `build_output()` function appends task counts to final output

3. **Feature Status Values** (from feature.md files):
   - "Draft" - Initial/planning stage
   - "Planned" - Planned but not started
   - "In Progress" / "Active" - Currently being worked on
   - "Complete" / "Completed" - Finished

4. **Status Normalization Strategy Defined**:
   - "In Progress" → "Active" (matches task naming convention)
   - "Draft", "Planned" → "Draft" (group initial stages together)
   - "Complete", "Completed" → "Complete"
   - Unknown values: gracefully skip or count as "other"

**Integration Plan Confirmed**:
1. Add feature icon definitions to icon mapping section
2. Create `count_features_by_status()` function (mirrors task counting logic)
3. Create `format_feature_counts()` function for Unicode/ASCII output formatting
4. Integrate feature counts into `build_output()` after task counts
5. Use powerline separator between task and feature counts in output

**Implementation Strategy**:
- Use `grep -m1` pattern for performance (read-once efficiency)
- Handle missing `task-system/features/` directory gracefully (return zeros)
- Normalize status values case-insensitively
- Maintain consistent error handling with task counting logic

**Design Decisions Documented**:
- Feature count format: Follow same pattern as task counts (icon + number)
- Scanning approach: `find task-system/features -name "feature.md"` for consistency
- Performance optimization: Use `head -20` to limit file reads for status extraction
- Error handling: Log to stderr, continue processing other files on errors

**Next:** Write comprehensive unit tests before implementation (TDD approach) for:
- Feature directory scanning
- Status extraction from feature.md files
- Status normalization and aggregation
- Output formatting (Unicode and ASCII modes)
