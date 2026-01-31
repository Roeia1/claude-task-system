# Storybook Restructure Plan

## Problems with Current Structure

1. **Too many stories** - 50+ stories cluttering the sidebar
2. **Duplicate components** - StatusBadge appears in 4 different places
3. **Granular sub-components** - Skeletons, icons have their own entries
4. **Pages missing Layout** - Page stories don't show header/breadcrumb
5. **Prop-focused, not use-case focused** - Individual stories for each prop value

---

## New Approach: Showcase + Playground with Presets & Overrides

Each component gets **2 stories**:

| Story | Purpose |
|-------|---------|
| **Showcase** | 3-6 representative examples displayed together |
| **Playground** | Preset dropdown + individual prop overrides |

### Showcase
- Curated, scannable examples
- Shows the main variations you'll encounter
- NOT every permutation

### Playground with Presets + Overrides
- **Preset dropdown** generates realistic base data
- **Override controls** let you tweak individual props
- Best of both worlds: realistic defaults + full Storybook control power

```tsx
// Example: StoryCard Playground
export const Playground: Story = {
  args: {
    preset: 'in-progress',
    // Overrides (undefined = use preset value)
    title: undefined,
    status: undefined,
    taskCount: undefined,
  },
  argTypes: {
    preset: {
      control: 'select',
      options: ['just-started', 'in-progress', 'blocked', 'almost-done', 'completed'],
      description: 'Base scenario - generates realistic mock data',
    },
    title: {
      control: 'text',
      description: 'Override the story title',
    },
    status: {
      control: 'select',
      options: [undefined, 'ready', 'inProgress', 'blocked', 'completed'],
      description: 'Override the status',
    },
    taskCount: {
      control: 'number',
      description: 'Override number of tasks',
    },
  },
  render: ({ preset, title, status, taskCount }) => {
    // Start with realistic preset data
    const story = createMockStory(preset);

    // Apply overrides if provided
    if (title !== undefined) story.title = title;
    if (status !== undefined) story.status = status;
    if (taskCount !== undefined) story.tasks = generateTasks(taskCount, story.status);

    return <StoryCard story={story} epicSlug="my-epic" />;
  },
};
```

**Storybook Controls Panel:**
```
┌─────────────────────────────────┐
│ Preset: [In Progress ▼]        │
│                                 │
│ ─── Overrides ───               │
│ Title: [___________________]    │
│ Status: [── use preset ── ▼]   │
│ Task Count: [5]                 │
└─────────────────────────────────┘
```

### Benefits
- Start with realistic data (preset ensures valid combinations)
- Tweak individual props for edge cases (long titles, specific counts)
- Full Storybook controls, actions, docs still work
- Can test visual edge cases without breaking data consistency

---

## Target Structure

```
📁 Foundation
   └─ Theme & Colors              → Showcase only (no playground needed)

📁 Atoms
   └─ StatusBadge                 → Showcase + Playground

📁 Components
   ├─ Breadcrumb                  → Showcase + Playground
   ├─ EpicCard                    → Showcase + Playground
   ├─ StoryCard                   → Showcase + Playground
   ├─ SessionCard                 → Showcase + Playground
   ├─ TaskItem                    → Showcase + Playground
   ├─ JournalEntry                → Showcase + Playground
   ├─ EpicContent                 → Showcase + Playground
   ├─ LogViewer                   → Showcase + Playground
   └─ ActiveSessions              → Showcase + Playground

📁 Pages (with full Layout wrapper)
   ├─ Epic List                   → Showcase + Playground
   ├─ Epic Detail                 → Showcase + Playground
   └─ Story Detail                → Showcase + Playground
```

**Total: ~25 stories** (down from 50+)

---

## Presets & Overrides per Component

### StatusBadge
**Presets:**
| Preset | Description |
|--------|-------------|
| ready | Gray badge |
| in-progress | Blue badge |
| blocked | Red badge |
| completed | Green badge |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| showCount | boolean | Toggle count display |
| count | number | Count value when shown |

---

### EpicCard
**Presets:**
| Preset | Description |
|--------|-------------|
| typical | Mixed statuses, 40% complete |
| just-started | All stories ready, 0% complete |
| in-progress | Some in progress, some ready |
| has-blockers | Multiple blocked stories |
| almost-done | 80% complete |
| completed | 100% complete |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| title | text | Epic title |
| totalStories | number | Total story count |
| isArchived | boolean | Archived state |

---

### StoryCard
**Presets:**
| Preset | Description |
|--------|-------------|
| ready | Not started, all tasks pending |
| in-progress | Some tasks done, some in progress |
| blocked | Status blocked |
| almost-done | Most tasks complete |
| completed | All tasks done |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| title | text | Story title |
| taskCount | number | Number of tasks |

---

### SessionCard
**Presets:**
| Preset | Description |
|--------|-------------|
| just-started | Running for ~15 seconds |
| running | Running for a few minutes with output |
| long-running | Running for over an hour |
| no-output | Output not yet available |
| output-unavailable | Output file missing |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| storySlug | text | Story slug displayed |
| epicSlug | text | Epic slug displayed |
| durationSeconds | number | Session duration |

---

### TaskItem
**Presets:**
| Preset | Description |
|--------|-------------|
| pending | Not started |
| in-progress | Currently active |
| completed | Done |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| title | text | Task title |

---

### JournalEntry
**Presets:**
| Preset | Description |
|--------|-------------|
| session | Normal work session |
| blocker | Blocked with details |
| resolution | Blocker resolved |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| title | text | Entry title |
| defaultOpen | boolean | Expanded by default |

---

### LogViewer
**Presets:**
| Preset | Description |
|--------|-------------|
| streaming | Active session with live output |
| complete | Finished session |
| large | 10,000+ lines (performance test) |
| unavailable | Output file missing |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| lineCount | number | Number of log lines |
| autoScroll | boolean | Auto-scroll enabled |

---

### Breadcrumb
**Presets:**
| Preset | Description |
|--------|-------------|
| root | At epic list (/) |
| epic | At epic detail (/epic/slug) |
| story | At story detail (/epic/slug/story/slug) |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| epicSlug | text | Epic slug in path |
| storySlug | text | Story slug in path |

---

### EpicContent
**Presets:**
| Preset | Description |
|--------|-------------|
| simple | Plain text |
| full-markdown | Headers, lists, code, tables |
| empty | No content |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| content | text | Raw markdown content |
| defaultOpen | boolean | Expanded by default |

---

### ActiveSessions
**Presets:**
| Preset | Description |
|--------|-------------|
| single | One running session |
| multiple | Several sessions |
| mixed-states | Sessions with various output states |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| sessionCount | number | Number of sessions |

---

## Page Presets & Overrides

### Epic List
**Presets:**
| Preset | Description |
|--------|-------------|
| empty | No epics created yet |
| populated | Several epics with various progress |
| with-archived | Includes archived epics |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| epicCount | number | Number of epics to show |
| showArchived | boolean | Show archived toggle state |

---

### Epic Detail
**Presets:**
| Preset | Description |
|--------|-------------|
| empty | Epic exists but no stories |
| populated | Epic with stories in various states |
| all-completed | 100% complete epic |
| has-blockers | Multiple blocked stories |
| not-found | 404 state |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| epicTitle | text | Epic title |
| storyCount | number | Number of stories |
| showContent | boolean | Show epic documentation |

---

### Story Detail
**Presets:**
| Preset | Description |
|--------|-------------|
| tasks-tab | Default view showing tasks |
| content-tab | Showing story markdown content |
| journal-tab | Showing session history |
| blocked | Story with active blocker |
| completed | All tasks done |
| not-found | 404 state |

**Overrides:**
| Control | Type | Description |
|---------|------|-------------|
| storyTitle | text | Story title |
| activeTab | select | Active tab (tasks/content/journal) |
| taskCount | number | Number of tasks |
| journalEntryCount | number | Number of journal entries |

---

## Implementation Steps

### Step 1: Create Mock Data Factories

Location: `packages/cli/src/client/src/test-utils/mock-factories.ts`

```tsx
// Types for presets and overrides
type EpicPreset = 'typical' | 'just-started' | 'in-progress' | 'has-blockers' | 'almost-done' | 'completed';
type StoryPreset = 'ready' | 'in-progress' | 'blocked' | 'almost-done' | 'completed';
type SessionPreset = 'just-started' | 'running' | 'long-running' | 'no-output' | 'output-unavailable';
type JournalPreset = 'session' | 'blocker' | 'resolution';
type TaskPreset = 'pending' | 'in-progress' | 'completed';

// Override types (all optional)
interface EpicOverrides {
  title?: string;
  totalStories?: number;
  isArchived?: boolean;
}

interface StoryOverrides {
  title?: string;
  taskCount?: number;
}

// Factory functions that accept preset + optional overrides
export function createMockEpic(preset: EpicPreset, overrides?: EpicOverrides): EpicSummary {
  const base = epicPresets[preset];
  return { ...base, ...overrides };
}

export function createMockStory(preset: StoryPreset, overrides?: StoryOverrides): StoryDetail {
  const base = storyPresets[preset];
  const result = { ...base };
  if (overrides?.title) result.title = overrides.title;
  if (overrides?.taskCount) result.tasks = generateTasks(overrides.taskCount, base.status);
  return result;
}

export function createMockSession(preset: SessionPreset, overrides?: SessionOverrides): SessionInfo { ... }

export function createMockJournalEntry(preset: JournalPreset, overrides?: JournalOverrides): JournalEntry { ... }

export function createMockTask(preset: TaskPreset, overrides?: TaskOverrides): Task { ... }

// Helper to generate consistent task lists
export function generateTasks(count: number, storyStatus: StoryStatus): Task[] { ... }
```

### Step 2: Create Page Wrapper

Location: `packages/cli/src/client/src/test-utils/storybook-page-wrapper.tsx`

```tsx
export function PageWrapper({
  children,
  route
}: {
  children: React.ReactNode;
  route: string;
}) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <DashboardProvider logic={dashboardMachine}>
        <div className="min-h-screen bg-bg">
          <header className="border-b border-border-muted bg-bg-dark">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-xl font-bold text-text">
                <span className="text-primary">SAGA</span> Dashboard
              </h1>
              <div className="mt-2">
                <Breadcrumb />
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </DashboardProvider>
    </MemoryRouter>
  );
}
```

### Step 3: Rewrite Story Files

For each component, create new story file with:
1. Showcase story with 3-6 representative examples
2. Playground story with scenario dropdown

### Step 4: Update Titles

| File | New Title |
|------|-----------|
| `theme-test.stories.tsx` | `Foundation/Theme & Colors` |
| `status-badge.stories.tsx` | `Atoms/StatusBadge` |
| `breadcrumb.stories.tsx` | `Components/Breadcrumb` |
| `epic-card.stories.tsx` | `Components/EpicCard` |
| `story-card.stories.tsx` | `Components/StoryCard` |
| `session-card.stories.tsx` | `Components/SessionCard` |
| `task-item.stories.tsx` | `Components/TaskItem` |
| `journal-entry.stories.tsx` | `Components/JournalEntry` |
| `epic-content.stories.tsx` | `Components/EpicContent` |
| `log-viewer.stories.tsx` | `Components/LogViewer` |
| `active-sessions.stories.tsx` | `Components/ActiveSessions` |
| `epic-list.stories.tsx` | `Pages/Epic List` |
| `epic-detail.stories.tsx` | `Pages/Epic Detail` |
| `story-detail.stories.tsx` | `Pages/Story Detail` |

### Step 5: Delete Obsolete Files

- `layout.stories.tsx` (Layout shown via Pages)

### Step 6: Clean Up Exports

Each story file exports only:
- `default` (meta)
- `Showcase`
- `Playground`

No more multiple meta objects or dozens of named exports.

---

## File Changes Summary

### New Files
- `src/test-utils/mock-factories.ts`
- `src/test-utils/storybook-page-wrapper.tsx`
- `src/components/epic-card.stories.tsx`
- `src/components/story-card.stories.tsx`
- `src/components/task-item.stories.tsx`
- `src/components/journal-entry.stories.tsx`

### Rewritten Files
- `src/components/status-badge.stories.tsx`
- `src/components/breadcrumb.stories.tsx`
- `src/components/epic-content.stories.tsx`
- `src/components/session-card.stories.tsx`
- `src/components/active-sessions.stories.tsx`
- `src/components/log-viewer.stories.tsx`
- `src/pages/epic-list.stories.tsx`
- `src/pages/epic-detail.stories.tsx`
- `src/pages/story-detail.stories.tsx`

### Deleted Files
- `src/components/layout.stories.tsx`

---

## Final Sidebar Structure

```
Foundation
  └─ Theme & Colors
Atoms
  └─ StatusBadge
      ├─ Showcase
      └─ Playground
Components
  ├─ ActiveSessions
  │   ├─ Showcase
  │   └─ Playground
  ├─ Breadcrumb
  │   ├─ Showcase
  │   └─ Playground
  ├─ EpicCard
  │   ├─ Showcase
  │   └─ Playground
  ├─ EpicContent
  │   ├─ Showcase
  │   └─ Playground
  ├─ JournalEntry
  │   ├─ Showcase
  │   └─ Playground
  ├─ LogViewer
  │   ├─ Showcase
  │   └─ Playground
  ├─ SessionCard
  │   ├─ Showcase
  │   └─ Playground
  ├─ StoryCard
  │   ├─ Showcase
  │   └─ Playground
  └─ TaskItem
      ├─ Showcase
      └─ Playground
Pages
  ├─ Epic Detail
  │   ├─ Showcase
  │   └─ Playground
  ├─ Epic List
  │   ├─ Showcase
  │   └─ Playground
  └─ Story Detail
      ├─ Showcase
      └─ Playground
```
