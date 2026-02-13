/**
 * Schema documentation script
 *
 * Outputs LLM-readable markdown describing SAGA JSON schemas.
 *
 * Usage:
 *   node schemas.js epic
 *   node schemas.js story
 *   node schemas.js task
 */

import process from 'node:process';
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';
import { EpicChildSchema, EpicSchema } from '../schemas/epic.ts';
import { StorySchema } from '../schemas/story.ts';
import { TaskSchema, TaskStatusSchema } from '../schemas/task.ts';

// ============================================================================
// Schema registry
// ============================================================================

interface SchemaEntry {
  schema: ZodObject<ZodRawShape>;
  description: string;
  nested?: Record<string, SchemaEntry>;
}

const SCHEMAS: Record<string, SchemaEntry> = {
  epic: {
    schema: EpicSchema as ZodObject<ZodRawShape>,
    description:
      'Epic structure stored at `.saga/epics/<id>.json`. Status is derived at read time.',
    nested: {
      'children[]': {
        schema: EpicChildSchema as ZodObject<ZodRawShape>,
        description: 'A child story reference within an epic.',
      },
    },
  },
  story: {
    schema: StorySchema as ZodObject<ZodRawShape>,
    description:
      'Story metadata stored at `.saga/stories/<id>/story.json`. Status is derived from task statuses.',
  },
  task: {
    schema: TaskSchema as ZodObject<ZodRawShape>,
    description: 'Task stored at `.saga/stories/<storyId>/<id>.json`.',
  },
};

// ============================================================================
// Zod introspection helpers
// ============================================================================

function describeZodType(zodType: ZodTypeAny): { type: string; required: boolean } {
  const def = zodType._def;
  const typeName: string = def.typeName ?? '';

  if (typeName === 'ZodOptional') {
    const inner = describeZodType(def.innerType);
    return { ...inner, required: false };
  }

  if (typeName === 'ZodDefault') {
    const inner = describeZodType(def.innerType);
    return { ...inner, required: false };
  }

  if (typeName === 'ZodString') {
    return { type: 'string', required: true };
  }

  if (typeName === 'ZodNumber') {
    return { type: 'number', required: true };
  }

  if (typeName === 'ZodBoolean') {
    return { type: 'boolean', required: true };
  }

  if (typeName === 'ZodEnum') {
    const values = (def.values as string[]).map((v) => `"${v}"`).join(' | ');
    return { type: `enum(${values})`, required: true };
  }

  if (typeName === 'ZodArray') {
    const inner = describeZodType(def.type);
    return { type: `${inner.type}[]`, required: true };
  }

  if (typeName === 'ZodObject') {
    return { type: 'object', required: true };
  }

  if (typeName === 'ZodRecord') {
    return { type: 'Record<string, unknown>', required: true };
  }

  return { type: 'unknown', required: true };
}

// ============================================================================
// Markdown generation
// ============================================================================

function generateFieldTable(schema: ZodObject<ZodRawShape>): string {
  const shape = schema.shape;
  const lines: string[] = [
    '| Field | Type | Required | Description |',
    '|-------|------|----------|-------------|',
  ];

  for (const [name, zodType] of Object.entries(shape)) {
    const { type, required } = describeZodType(zodType as ZodTypeAny);
    const desc = getFieldDescription(name);
    lines.push(`| \`${name}\` | ${type} | ${required ? 'yes' : 'no'} | ${desc} |`);
  }

  return lines.join('\n');
}

function getFieldDescription(name: string): string {
  const descriptions: Record<string, string> = {
    id: 'Unique identifier (kebab-case)',
    title: 'Human-readable title',
    description: 'Detailed description of scope and goals',
    subject: 'Brief title for the task',
    status: 'Current status',
    epic: 'Parent epic ID (if part of an epic)',
    guidance: 'Implementation hints and approach',
    doneWhen: 'Acceptance criteria',
    avoid: 'Anti-patterns or constraints',
    branch: 'Git branch name',
    pr: 'Pull request URL',
    worktree: 'Worktree path',
    blockedBy: 'IDs of tasks/stories that must complete first',
    children: 'Ordered list of child story references',
    activeForm: 'Present-continuous label shown during execution',
  };
  return descriptions[name] ?? '';
}

function generateExample(schemaName: string): string {
  const examples: Record<string, unknown> = {
    epic: {
      id: 'user-authentication',
      title: 'User Authentication System',
      description: 'Implement login, registration, and session management',
      children: [
        { id: 'auth-login', blockedBy: [] },
        { id: 'auth-registration', blockedBy: ['auth-login'] },
      ],
    },
    story: {
      id: 'auth-login',
      title: 'Login Page',
      description: 'Create login form with email/password authentication',
      epic: 'user-authentication',
      guidance: 'Use existing form components. JWT for tokens.',
      doneWhen: 'Users can log in and receive a session token',
      avoid: 'Do not store passwords in plain text',
    },
    task: {
      id: 'write-login-tests',
      subject: 'Write login endpoint tests',
      description: 'Create unit and integration tests for POST /api/login',
      activeForm: 'Writing login tests',
      status: 'pending',
      blockedBy: [],
      guidance: 'Test both success and error cases',
      doneWhen: 'All tests pass with >90% coverage on login handler',
    },
  };

  return JSON.stringify(examples[schemaName] ?? {}, null, 2);
}

function generateMarkdown(name: string, entry: SchemaEntry): string {
  const lines: string[] = [];

  lines.push(`# ${name.charAt(0).toUpperCase() + name.slice(1)} Schema`);
  lines.push('');
  lines.push(entry.description);
  lines.push('');
  lines.push('## Fields');
  lines.push('');
  lines.push(generateFieldTable(entry.schema));

  if (name === 'task') {
    lines.push('');
    lines.push(`**Status values:** ${TaskStatusSchema.options.map((v) => `\`${v}\``).join(', ')}`);
  }

  if (entry.nested) {
    for (const [nestedName, nestedEntry] of Object.entries(entry.nested)) {
      lines.push('');
      lines.push(`### ${nestedName}`);
      lines.push('');
      lines.push(nestedEntry.description);
      lines.push('');
      lines.push(generateFieldTable(nestedEntry.schema));
    }
  }

  lines.push('');
  lines.push('## Example');
  lines.push('');
  lines.push('```json');
  lines.push(generateExample(name));
  lines.push('```');

  return lines.join('\n');
}

// ============================================================================
// CLI
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    // biome-ignore lint/security/noSecrets: false positive on CLI usage string
    console.log('Usage: node schemas.js <epic|story|task>');
    console.log('');
    console.log('Outputs LLM-readable schema documentation as markdown.');
    console.log('');
    console.log('Available schemas:');
    for (const name of Object.keys(SCHEMAS)) {
      console.log(`  ${name}`);
    }
    process.exit(0);
  }

  const schemaName = args[0].toLowerCase();
  const entry = SCHEMAS[schemaName];

  if (!entry) {
    console.error(`Unknown schema: "${schemaName}". Available: ${Object.keys(SCHEMAS).join(', ')}`);
    process.exit(1);
  }

  console.log(generateMarkdown(schemaName, entry));
}

main();
