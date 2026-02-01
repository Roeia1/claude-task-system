/**
 * SessionsPanel - Displays sessions for a specific story in the story detail page.
 * This is a placeholder component that will be implemented in task t2.
 */

interface SessionsPanelProps {
  epicSlug: string;
  storySlug: string;
}

export function SessionsPanel({ epicSlug, storySlug }: SessionsPanelProps) {
  return (
    <div data-testid="sessions-panel">
      <p className="text-text-muted text-center py-4">
        Sessions for {epicSlug}/{storySlug}
      </p>
    </div>
  );
}
