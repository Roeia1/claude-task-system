# Verification & Reflection Checklist

## Phase 6: Verification & Polish

### Acceptance Criteria Verification

- [ ] All acceptance criteria from task file verified
- [ ] All sub-tasks are checked off
- [ ] Implementation matches all objectives

### Code Quality Checks

- [ ] Edge cases handled appropriately
- [ ] Error handling is comprehensive
- [ ] Code follows project conventions
- [ ] Documentation is updated (if needed)

### Testing & Quality Gates

- [ ] All tests passing
- [ ] Run final code quality checks: `pnpm check` (or equivalent)
- [ ] No linting errors
- [ ] No type errors (for TypeScript projects)

### Polish & Cleanup

- [ ] Remove debug code and console logs
- [ ] Remove commented-out code
- [ ] Remove unused imports
- [ ] Ensure consistent formatting

### PR Preparation

- [ ] **Commit and push final polish**: `git add . && git commit -m "docs(task-XXX): final verification and polish" && git push`
- [ ] **Mark PR ready for review**: Convert from draft to ready for review
- [ ] **Proactive review request**: Ask user to review for final approval

### Phase 6 Exit Criteria

- All criteria verified
- Code polished and quality checks pass
- PR ready for review

**Request permission to proceed to Phase 7**

---

## Phase 7: Reflection & Documentation

### Task Journey Review

Review the entire task execution from start to finish:

- What were the key challenges?
- How did the solution evolve?
- What worked well?
- What could be improved?

### Update Task File

Document discoveries in the task file:

1. **New Risks Discovered**
   - What new risks did you encounter?
   - How were they mitigated?
   - What should future developers watch for?

2. **Additional Resources Found**
   - Helpful documentation discovered
   - Relevant code examples
   - External references

3. **Lessons Learned**
   - Technical insights gained
   - Patterns that worked well
   - Approaches to avoid

### Final Journal Entry

Write a comprehensive reflection in journal.md:

```markdown
### [Timestamp] - Phase 7: Final Reflection

**What was accomplished:**
- [Summary of delivered functionality]
- [Key features implemented]

**Key decisions and why:**
- [Major technical decisions made]
- [Rationale for each choice]

**Challenges overcome:**
- [Significant obstacles encountered]
- [How they were resolved]

**Future considerations:**
- [Technical debt identified]
- [Potential improvements]
- [Related work needed]
```

### Phase 7 Exit Criteria

- Complete reflection documented in journal
- Task file updated with learnings
- Ready for task completion

**Request permission to complete task (proceed to Phase 8)**
