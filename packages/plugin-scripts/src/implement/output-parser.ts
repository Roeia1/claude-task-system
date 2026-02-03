/**
 * Worker output parsing and validation
 *
 * Parses streaming JSON output from Claude workers and extracts
 * structured results. Handles both successful completions and errors.
 */

import type { WorkerOutput } from './types.ts';
import { MS_PER_SECOND } from './types.ts';

// Valid status values for worker output
const VALID_STATUSES = new Set(['ONGOING', 'FINISH', 'BLOCKED']);

// JSON schema for worker output validation (used by claude --json-schema)
export const WORKER_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['ONGOING', 'FINISH', 'BLOCKED'],
    },
    summary: {
      type: 'string',
      description: 'What was accomplished this session',
    },
    blocker: {
      type: ['string', 'null'],
      description: 'Brief description if BLOCKED, null otherwise',
    },
  },
  required: ['status', 'summary'],
};

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Format a single input value for display
 */
function formatInputValue(value: unknown, maxLength: number): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    // Replace newlines with spaces for single-line display
    const singleLine = value.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    return truncateString(singleLine, maxLength);
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return truncateString(JSON.stringify(value), maxLength);
  }
  if (typeof value === 'object') {
    return truncateString(JSON.stringify(value), maxLength);
  }
  return String(value);
}

/**
 * Format all input fields for unknown tools (default fallback)
 */
function formatAllInputFields(input: Record<string, unknown>): string {
  const maxValueLength = 100;

  const entries = Object.entries(input);
  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => `${key}=${formatInputValue(value, maxValueLength)}`)
    .join(', ');
}

/**
 * Format tool usage with curated info for known tools, all fields for unknown
 * Wrapped in try-catch to ensure parsing errors don't crash the process
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: switch statement for tool formatting is inherently complex but readable
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: each case is simple, splitting would reduce readability
export function formatToolUsage(name: string, input: Record<string, unknown>): string {
  try {
    const safeInput = input || {};
    const maxLength = 100;

    switch (name) {
      // File operations - show path
      case 'Read': {
        const path = safeInput.file_path || 'unknown';
        const extras: string[] = [];
        if (safeInput.offset) {
          extras.push(`offset=${safeInput.offset}`);
        }
        if (safeInput.limit) {
          extras.push(`limit=${safeInput.limit}`);
        }
        const suffix = extras.length > 0 ? ` (${extras.join(', ')})` : '';
        return `[Tool Used: Read] ${path}${suffix}`;
      }
      case 'Write':
        return `[Tool Used: Write] ${safeInput.file_path || 'unknown'}`;
      case 'Edit': {
        const file = safeInput.file_path || 'unknown';
        const replaceAll = safeInput.replace_all ? ' (replace_all)' : '';
        return `[Tool Used: Edit] ${file}${replaceAll}`;
      }

      // Shell command - show command and description
      case 'Bash': {
        const cmd = truncateString(String(safeInput.command || ''), maxLength);
        const desc = safeInput.description
          ? ` - ${truncateString(String(safeInput.description), 60)}`
          : '';
        return `[Tool Used: Bash] ${cmd}${desc}`;
      }

      // Search operations - show pattern and path
      case 'Glob': {
        const pattern = safeInput.pattern || 'unknown';
        const path = safeInput.path ? ` in ${safeInput.path}` : '';
        return `[Tool Used: Glob] ${pattern}${path}`;
      }
      case 'Grep': {
        const pattern = truncateString(String(safeInput.pattern || ''), 60);
        const path = safeInput.path ? ` in ${safeInput.path}` : '';
        const mode = safeInput.output_mode ? ` (${safeInput.output_mode})` : '';
        return `[Tool Used: Grep] "${pattern}"${path}${mode}`;
      }

      // Agent task - show description and type
      case 'Task': {
        const desc = truncateString(
          String(safeInput.description || safeInput.prompt || ''),
          maxLength,
        );
        const agentType = safeInput.subagent_type ? ` [${safeInput.subagent_type}]` : '';
        return `[Tool Used: Task]${agentType} ${desc}`;
      }

      // Todo operations
      case 'TodoWrite': {
        const todos = safeInput.todos;
        if (todos && Array.isArray(todos)) {
          const subjects = todos
            .map((t: unknown) => {
              if (t && typeof t === 'object' && 'subject' in t) {
                return String((t as { subject: unknown }).subject || 'untitled');
              }
              return 'untitled';
            })
            .join(', ');
          if (subjects) {
            return `[Tool Used: TodoWrite] ${truncateString(subjects, maxLength)}`;
          }
        }
        return '[Tool Used: TodoWrite]';
      }

      // Structured output - show status
      case 'StructuredOutput': {
        const status = safeInput.status || 'unknown';
        const summary = safeInput.summary
          ? ` - ${truncateString(String(safeInput.summary), maxLength)}`
          : '';
        return `[Tool Used: StructuredOutput] ${status}${summary}`;
      }

      // Unknown tools - show all fields
      default: {
        const fields = formatAllInputFields(safeInput);
        return fields ? `[Tool Used: ${name}] ${fields}` : `[Tool Used: ${name}]`;
      }
    }
  } catch {
    // Fallback if any parsing fails
    return `[Tool Used: ${name}]`;
  }
}

/**
 * Format assistant message content blocks
 * Wrapped in try-catch to ensure malformed content doesn't crash the process
 */
export function formatAssistantContent(content: unknown[]): string | null {
  try {
    if (!(content && Array.isArray(content))) {
      return null;
    }

    for (const block of content) {
      if (!block || typeof block !== 'object') {
        continue;
      }

      const blockData = block as {
        type?: string;
        text?: string;
        name?: string;
        input?: Record<string, unknown>;
      };

      if (blockData.type === 'text' && blockData.text) {
        return `${blockData.text}\n`;
      }
      if (blockData.type === 'tool_use' && blockData.name) {
        return `${formatToolUsage(blockData.name, blockData.input || {})}\n`;
      }
    }
    return null;
  } catch {
    // Silently fail on malformed content
    return null;
  }
}

/**
 * Parse a stream-json line and extract displayable content
 * Returns the text to display, or null if nothing to display
 */
export function formatStreamLine(line: string): string | null {
  try {
    const data = JSON.parse(line);

    // Assistant message with text content
    if (data.type === 'assistant' && data.message?.content) {
      return formatAssistantContent(data.message.content);
    }

    // System init message
    if (data.type === 'system' && data.subtype === 'init') {
      return `[Session started: ${data.session_id}]`;
    }

    // Result message (final)
    if (data.type === 'result') {
      const status = data.subtype === 'success' ? 'completed' : 'failed';
      return `\n[Worker ${status} in ${Math.round(data.duration_ms / MS_PER_SECOND)}s]`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract StructuredOutput tool call input from streaming output
 * Searches for assistant messages containing a StructuredOutput tool_use block
 * Returns the input object if found, null otherwise
 */
export function extractStructuredOutputFromToolCall(lines: string[]): Record<string, unknown> | null {
  // Search backwards to find the most recent StructuredOutput tool call
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(lines[i]);
      if (data.type === 'assistant' && data.message?.content) {
        for (const block of data.message.content) {
          if (block.type === 'tool_use' && block.name === 'StructuredOutput') {
            return block.input as Record<string, unknown>;
          }
        }
      }
    } catch {
      // Not valid JSON, continue
    }
  }
  return null;
}

/**
 * Validate and extract output from structured output data
 */
export function validateAndExtractOutput(output: Record<string, unknown>): WorkerOutput {
  if (!VALID_STATUSES.has(output.status as string)) {
    throw new Error(`Invalid status: ${output.status}`);
  }

  return {
    status: output.status as WorkerOutput['status'],
    summary: (output.summary as string) || '',
    blocker: (output.blocker as string | null) ?? null,
  };
}

/**
 * Process a single result line and extract WorkerOutput
 */
export function processResultLine(data: Record<string, unknown>, lines: string[]): WorkerOutput {
  if (data.is_error) {
    throw new Error(`Worker failed: ${data.result || 'Unknown error'}`);
  }

  // Try to get structured_output from result, fall back to tool call
  let output = data.structured_output as Record<string, unknown> | undefined;
  if (!output) {
    // Fallback: extract from StructuredOutput tool call
    output = extractStructuredOutputFromToolCall(lines) ?? undefined;
  }

  if (!output) {
    throw new Error('Worker result missing structured_output');
  }

  return validateAndExtractOutput(output);
}

/**
 * Parse the final result from stream-json output
 * Looks for the {"type":"result",...} line and extracts structured_output.
 * Falls back to extracting from StructuredOutput tool call if structured_output
 * is missing (can happen with error_during_execution subtype).
 */
export function parseStreamingResult(buffer: string): WorkerOutput {
  const lines = buffer.split('\n').filter((line) => line.trim());

  // Find the result line (should be the last one)
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(lines[i]);
      if (data.type === 'result') {
        return processResultLine(data, lines);
      }
    } catch (e) {
      // Not a valid JSON line or not a result, continue searching
      if (e instanceof Error && e.message.startsWith('Worker')) {
        throw e;
      }
    }
  }

  throw new Error('No result found in worker output');
}
