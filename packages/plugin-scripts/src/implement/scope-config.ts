/**
 * Scope configuration builder for worker sessions
 *
 * Builds the settings JSON for scope enforcement hooks.
 * The scope validator hook prevents workers from accessing files
 * outside their assigned story's scope.
 */

// Tool names that require scope validation (file system operations)
const SCOPE_VALIDATED_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

// Claude Code hook API uses PascalCase for hook names
const HOOK_PRE_TOOL_USE = 'PreToolUse';

/**
 * Build the settings JSON for scope enforcement hooks
 *
 * Creates a hook configuration that calls the scope-validator script
 * for file system operations.
 *
 * The hook format follows the Claude Code hooks specification:
 * - Each hook must be an object with `type` and `command` fields
 * - Exit code 0 allows the operation
 * - Exit code 2 blocks the operation (stderr is shown to Claude)
 *
 * @returns Settings object with hook configuration
 */
export function buildScopeSettings(): Record<string, unknown> {
  // Use node to run the scope-validator script from plugin-scripts
  // $SAGA_PLUGIN_ROOT is set by the plugin's SessionStart hook
  const hookCommand = 'node $SAGA_PLUGIN_ROOT/scripts/scope-validator.js';

  return {
    hooks: {
      [HOOK_PRE_TOOL_USE]: [
        {
          matcher: SCOPE_VALIDATED_TOOLS.join('|'),
          hooks: [
            {
              type: 'command',
              command: hookCommand,
            },
          ],
        },
      ],
    },
  };
}
