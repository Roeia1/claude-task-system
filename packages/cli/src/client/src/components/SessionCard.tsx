import type { SessionInfo } from '@/types/dashboard';

/**
 * Formats a duration in seconds to human-readable format
 * Examples: "30s", "2m 34s", "1h 15m", "1d 0h"
 */
export function formatDuration(_seconds: number): string {
  // Stub implementation - will be implemented in t5
  return '0s';
}

/**
 * Component to display a single session card with live duration updates.
 * Shows story title, epic title, duration timer, and output preview.
 */
export function SessionCard({ session: _session }: { session: SessionInfo }) {
  // Stub implementation - will be implemented in t5
  return null;
}
