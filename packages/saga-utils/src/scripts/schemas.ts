/**
 * Schema documentation script
 *
 * Outputs LLM-readable markdown describing SAGA JSON schemas.
 *
 * Usage:
 *   node schemas.js epic
 *   node schemas.js story
 *   node schemas.js task
 *   node schemas.js create-story-input
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
// Field descriptions (prescriptive, not just definitional)
// ============================================================================

const FIELD_DESCRIPTIONS: Record<string, string> = {
  // Epic fields
  'epic.id':
    'Unique identifier (kebab-case, lowercase, 3-5 words). Must be globally unique across all epics.',
  'epic.title': 'Short human-readable title summarizing the epic (5-10 words).',
  'epic.description':
    'Rich markdown capturing the full scope, motivation, technical approach, success criteria, and key decisions. A developer reading only this field should understand the entire initiative.',
  'epic.children': 'Ordered list of child story references with dependency declarations.',

  // Epic child fields
  'children[].id': 'The story ID this child references. Must match a story ID exactly.',
  'children[].blockedBy':
    'Array of sibling story IDs that must complete before this story can start. Use for true data/API dependencies, not just preferred ordering.',

  // Story fields
  'story.id':
    'Unique identifier (kebab-case, lowercase, 3-5 words). Must be globally unique across all stories.',
  'story.title': 'Short human-readable title summarizing the story (5-10 words).',
  'story.description':
    'Rich markdown capturing scope, approach, acceptance criteria, technical details, edge cases, and decisions. A developer reading only this field should fully understand what to build.',
  'story.epic':
    'Parent epic ID. Set when the story belongs to an epic, omit for standalone stories.',
  'story.guidance':
    'Implementation hints, suggested approach, libraries to use, or patterns to follow. Helps the executor make good choices without being overly prescriptive.',
  'story.doneWhen':
    'Concrete acceptance criteria. What must be true for this story to be considered complete.',
  'story.avoid':
    'Anti-patterns, constraints, or things explicitly out of scope. Prevents the executor from going down wrong paths.',
  'story.branch': 'Git branch name (auto-set by create-story.js, do not set manually).',
  'story.pr': 'Pull request URL (auto-set by create-story.js, do not set manually).',
  'story.worktree': 'Worktree path (auto-set by create-story.js, do not set manually).',

  // Task fields
  'task.id':
    'Kebab-case slug describing the task (e.g. `write-auth-tests`, `implement-login`). Unique within the story.',
  'task.subject':
    'Brief imperative title for the task (e.g. "Write auth middleware tests"). 5-10 words.',
  'task.description':
    'Detailed markdown with context, guidance, references, pitfalls, and done-when criteria. Should be self-contained — the executor reads this to know exactly what to do.',
  'task.activeForm':
    'Present-continuous label shown in the UI spinner during execution (e.g. "Writing auth middleware tests"). Must grammatically work as "Currently: <activeForm>".',
  'task.status': 'Current status. Always set to `pending` when generating new tasks.',
  'task.blockedBy':
    'Array of task IDs (within the same story) that must complete before this task can start. Use `[]` for unblocked tasks.',
  'task.guidance':
    'Implementation hints specific to this task. Supplements the description with tactical advice.',
  'task.doneWhen':
    'Concrete acceptance criteria for this task. What must be true for it to be marked complete.',
};

function getFieldDescription(schemaName: string, fieldName: string): string {
  return FIELD_DESCRIPTIONS[`${schemaName}.${fieldName}`] ?? '';
}

// ============================================================================
// Markdown generation
// ============================================================================

function generateFieldTable(schemaName: string, schema: ZodObject<ZodRawShape>): string {
  const shape = schema.shape;
  const lines: string[] = [
    '| Field | Type | Required | Description |',
    '|-------|------|----------|-------------|',
  ];

  for (const [name, zodType] of Object.entries(shape)) {
    const { type, required } = describeZodType(zodType as ZodTypeAny);
    const desc = getFieldDescription(schemaName, name);
    lines.push(`| \`${name}\` | ${type} | ${required ? 'yes' : 'no'} | ${desc} |`);
  }

  return lines.join('\n');
}

// ============================================================================
// Example data (realistic, markdown-heavy)
// ============================================================================

const EPIC_EXAMPLE = {
  id: 'user-authentication',
  title: 'User Authentication System',
  description: [
    '## Overview',
    'Implement a complete authentication system with login, registration, password reset, and session management.',
    '',
    '## Motivation',
    'The app currently has no auth — all endpoints are public. We need user accounts to support personalized features and data isolation.',
    '',
    '## Technical Approach',
    '- Use **bcrypt** for password hashing',
    '- JWT tokens stored in httpOnly cookies',
    '- Middleware-based auth checks on protected routes',
    '- PostgreSQL `users` table with email uniqueness constraint',
    '',
    '## Success Criteria',
    '- Users can register, log in, and log out',
    '- Protected routes reject unauthenticated requests with 401',
    '- Passwords are never stored in plain text',
    '- Sessions expire after 24 hours of inactivity',
  ].join('\n'),
  children: [
    { id: 'auth-data-model', blockedBy: [] },
    { id: 'auth-login-register', blockedBy: ['auth-data-model'] },
    { id: 'auth-session-management', blockedBy: ['auth-login-register'] },
  ],
};

const STORY_EXAMPLE = {
  id: 'auth-login-register',
  title: 'Login and Registration Endpoints',
  description: [
    '## Scope',
    'Build the core authentication endpoints: `POST /api/register` and `POST /api/login`.',
    '',
    '## Technical Details',
    '- **Registration**: Validate email format, check uniqueness, hash password with bcrypt (12 rounds), insert into `users` table, return JWT',
    '- **Login**: Look up user by email, compare password hash, return JWT on success, 401 on failure',
    '- JWT payload: `{ sub: userId, email, iat, exp }`',
    '- Token expiry: 24 hours',
    '',
    '## Acceptance Criteria',
    '- `POST /api/register` creates a user and returns a token',
    '- `POST /api/register` with duplicate email returns 409',
    '- `POST /api/login` with valid credentials returns a token',
    '- `POST /api/login` with invalid credentials returns 401',
    '- All passwords are hashed before storage',
    '',
    '## Edge Cases',
    '- Email normalization (trim, lowercase)',
    '- Concurrent registration with same email (unique constraint handles it)',
    '- Empty or missing fields return 400 with descriptive errors',
  ].join('\n'),
  epic: 'user-authentication',
  guidance:
    'Use the existing Express router pattern in `src/routes/`. Add a new `src/routes/auth.ts` file. Use the `jsonwebtoken` library already in package.json.',
  doneWhen: 'Both endpoints work correctly, all tests pass, and passwords are hashed with bcrypt.',
  avoid:
    'Do not implement OAuth or social login — that is a separate story. Do not add rate limiting yet.',
};

const TASK_EXAMPLE = {
  id: 'write-auth-tests',
  subject: 'Write auth endpoint tests',
  description: [
    'Create test file `src/routes/__tests__/auth.test.ts` covering:',
    '',
    '**Registration tests:**',
    '- Valid registration returns 201 + JWT token',
    '- Duplicate email returns 409',
    '- Missing email returns 400',
    '- Missing password returns 400',
    '- Invalid email format returns 400',
    '',
    '**Login tests:**',
    '- Valid login returns 200 + JWT token',
    '- Wrong password returns 401',
    '- Non-existent email returns 401',
    '- Missing fields return 400',
    '',
    'Use `supertest` for HTTP assertions. Set up a test database with `beforeAll`/`afterAll` hooks.',
  ].join('\n'),
  activeForm: 'Writing auth endpoint tests',
  status: 'pending',
  blockedBy: [],
  guidance: 'Follow the test patterns in `src/routes/__tests__/health.test.ts`.',
  doneWhen: 'All test cases are written and fail with "not implemented" errors (TDD red phase).',
};

const EXAMPLES: Record<string, unknown> = {
  epic: EPIC_EXAMPLE,
  story: STORY_EXAMPLE,
  task: TASK_EXAMPLE,
};

function generateExample(schemaName: string): string {
  return JSON.stringify(EXAMPLES[schemaName] ?? {}, null, 2);
}

// ============================================================================
// Writing guides
// ============================================================================

const WRITING_GUIDES: Record<string, string> = {
  epic: [
    '## Writing Guide',
    '',
    '- The `description` should be **extensive markdown** — multiple sections with headers, bullet lists, and code references',
    '- Think of it as a mini design doc: motivation, approach, success criteria, and scope boundaries',
    '- `children` order matters — it defines the default execution sequence',
    '- Only use `blockedBy` for true dependencies (story B needs an API that story A creates), not just preferred ordering',
    '- Epic IDs should be descriptive and concise: `user-authentication`, `payment-integration`, `dashboard-redesign`',
  ].join('\n'),
  story: [
    '## Writing Guide',
    '',
    '- The `description` should be **extensive markdown** — use headers (`##`), bullet lists, code blocks, and bold for emphasis',
    '- Structure the description with sections like: Scope, Technical Details, Acceptance Criteria, Edge Cases',
    '- A developer reading only the description should fully understand what to build without asking questions',
    '- `guidance` is tactical advice for the executor: which files to look at, which patterns to follow, which libraries to use',
    '- `doneWhen` should be concrete and verifiable, not vague ("works correctly")',
    '- `avoid` prevents the executor from over-scoping or making wrong assumptions',
    '- Do NOT set `branch`, `pr`, or `worktree` — these are auto-populated by `create-story.js`',
  ].join('\n'),
  task: [
    '## Writing Guide',
    '',
    '- Task IDs are kebab-case slugs describing the task: `write-auth-tests`, `implement-login`, `add-validation`',
    '- Always set `status` to `pending` when generating tasks',
    '- `subject` is imperative mood: "Write tests", "Implement endpoint", "Add validation"',
    '- `activeForm` is present-continuous: "Writing tests", "Implementing endpoint", "Adding validation"',
    '- `description` should be self-contained — include what files to create/modify, what the expected behavior is, and how to verify',
    '- Use `blockedBy` to reference other task IDs within the same story (e.g. `["write-auth-tests"]`). Use `[]` for unblocked tasks',
    '- Typical task patterns: write tests (TDD) -> implement -> integrate -> document',
  ].join('\n'),
};

// ============================================================================
// Schema markdown renderer
// ============================================================================

function generateMarkdown(name: string, entry: SchemaEntry): string {
  const lines: string[] = [];

  lines.push(`# ${name.charAt(0).toUpperCase() + name.slice(1)} Schema`);
  lines.push('');
  lines.push(entry.description);
  lines.push('');
  lines.push('## Fields');
  lines.push('');
  lines.push(generateFieldTable(name, entry.schema));

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
      lines.push(generateFieldTable(nestedName, nestedEntry.schema));
    }
  }

  lines.push('');
  lines.push('## Example');
  lines.push('');
  lines.push('```json');
  lines.push(generateExample(name));
  lines.push('```');

  const guide = WRITING_GUIDES[name];
  if (guide) {
    lines.push('');
    lines.push(guide);
  }

  return lines.join('\n');
}

// ============================================================================
// create-story-input: combined format docs
// ============================================================================

const INPUT_FORMAT_SKELETON = {
  story: {
    id: '<story-id>',
    title: '<title>',
    description: '<rich markdown>',
    epic: '<epic-id or omit>',
    guidance: '<optional>',
    doneWhen: '<optional>',
    avoid: '<optional>',
  },
  tasks: [
    {
      id: '<kebab-case-slug>',
      subject: '<imperative title>',
      description: '<detailed markdown>',
      activeForm: '<present-continuous>',
      status: 'pending',
      blockedBy: [],
    },
  ],
};

function generateInputFormatSection(): string {
  const lines: string[] = [];
  lines.push('## Input Format');
  lines.push('');
  lines.push('The input JSON has two top-level fields:');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(INPUT_FORMAT_SKELETON, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('Do NOT include `branch`, `pr`, or `worktree` in the story — these are auto-set.');
  return lines.join('\n');
}

const FULL_INPUT_EXAMPLE = {
  story: STORY_EXAMPLE,
  tasks: [
    {
      id: 'write-auth-tests',
      subject: 'Write auth endpoint tests',
      description: [
        'Create test file `src/routes/__tests__/auth.test.ts` covering:',
        '',
        '**Registration tests:**',
        '- Valid registration returns 201 + JWT token',
        '- Duplicate email returns 409',
        '- Missing email/password returns 400',
        '',
        '**Login tests:**',
        '- Valid login returns 200 + JWT token',
        '- Wrong password returns 401',
        '- Non-existent email returns 401',
        '',
        'Use `supertest` for HTTP assertions.',
      ].join('\n'),
      activeForm: 'Writing auth endpoint tests',
      status: 'pending',
      blockedBy: [],
      guidance: 'Follow the test patterns in `src/routes/__tests__/health.test.ts`.',
      doneWhen: 'All test cases written and fail with "not implemented" errors (TDD red phase).',
    },
    {
      id: 'implement-registration',
      subject: 'Implement registration endpoint',
      description: [
        'Create `POST /api/register` in `src/routes/auth.ts`:',
        '',
        '1. Validate request body (email, password)',
        '2. Check email uniqueness in database',
        '3. Hash password with bcrypt (12 rounds)',
        '4. Insert user record',
        '5. Generate and return JWT token',
      ].join('\n'),
      activeForm: 'Implementing registration endpoint',
      status: 'pending',
      blockedBy: ['write-auth-tests'],
      doneWhen: 'Registration tests pass.',
    },
    {
      id: 'implement-login',
      subject: 'Implement login endpoint',
      description: [
        'Create `POST /api/login` in `src/routes/auth.ts`:',
        '',
        '1. Look up user by email',
        '2. Compare password with bcrypt',
        '3. Return JWT on success, 401 on failure',
      ].join('\n'),
      activeForm: 'Implementing login endpoint',
      status: 'pending',
      blockedBy: ['write-auth-tests'],
      doneWhen: 'Login tests pass.',
    },
  ],
};

function generateFullInputExample(): string {
  const lines: string[] = [];
  lines.push('# Full Example — create-story-input JSON');
  lines.push('');
  lines.push(
    'A complete, realistic example of the JSON you would write to `story-<id>.json` and pass to `create-story.js --input`:',
  );
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(FULL_INPUT_EXAMPLE, null, 2));
  lines.push('```');
  return lines.join('\n');
}

function generateCreateStoryInputDocs(): string {
  const sections = [
    '# create-story-input — Combined Schema Reference',
    '',
    'Complete reference for the JSON input to `create-story.js`. One file per story, containing the story metadata and all its tasks.',
    '',
    generateInputFormatSection(),
    '',
    '---',
    '',
    generateMarkdown('story', SCHEMAS.story),
    '',
    '---',
    '',
    generateMarkdown('task', SCHEMAS.task),
    '',
    '---',
    '',
    generateMarkdown('epic', SCHEMAS.epic),
    '',
    '---',
    '',
    generateFullInputExample(),
  ];
  return sections.join('\n');
}

// ============================================================================
// CLI
// ============================================================================

const AVAILABLE_SCHEMAS = [...Object.keys(SCHEMAS), 'create-story-input'];

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: node schemas.js <${AVAILABLE_SCHEMAS.join('|')}>`);
    console.log('');
    console.log('Outputs LLM-readable schema documentation as markdown.');
    console.log('');
    console.log('Available schemas:');
    for (const name of AVAILABLE_SCHEMAS) {
      console.log(`  ${name}`);
    }
    process.exit(0);
  }

  const schemaName = args[0].toLowerCase();

  if (schemaName === 'create-story-input') {
    console.log(generateCreateStoryInputDocs());
    return;
  }

  const entry = SCHEMAS[schemaName];

  if (!entry) {
    console.error(`Unknown schema: "${schemaName}". Available: ${AVAILABLE_SCHEMAS.join(', ')}`);
    process.exit(1);
  }

  console.log(generateMarkdown(schemaName, entry));
}

main();
