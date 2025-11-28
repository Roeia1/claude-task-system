# Test Modification Protocol

## When Tests Need Changing After Phase 3

After Phase 3, if a test needs modification:

1. **STOP all work immediately**
2. **Explain to user** with clear reasoning:
   - Which test needs changing
   - Why it needs changing
   - What the change would be
3. **Wait for explicit permission**
4. **Only proceed with test changes after approval**

## Rationale

Tests written in Phase 3 represent the agreed-upon requirements and expected behavior. Changing them without permission could:

- Alter the scope or requirements
- Hide implementation issues
- Bypass the TDD discipline
- Invalidate the original design

## Valid Reasons for Test Modification

- Discovered ambiguity in requirements
- Found edge case not considered in Phase 2
- Requirements changed based on implementation insights
- Test has a bug (incorrect assertion, wrong setup, etc.)

## Invalid Reasons

- Implementation is harder than expected
- Want to reduce test coverage
- Tests are "too strict"
- Prefer different API than what was tested
