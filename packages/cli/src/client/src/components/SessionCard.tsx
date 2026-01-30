import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SessionInfo } from '@/types/dashboard';

/**
 * Formats a duration in seconds to human-readable format
 * Examples: "30s", "2m 34s", "1h 15m", "1d 0h"
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Truncates output preview to last 5 lines and max 500 characters
 */
function truncateOutput(output: string | undefined): string {
  if (!output) return '';

  // Get last 5 lines
  const lines = output.split('\n');
  const last5Lines = lines.slice(-5).join('\n');

  // Truncate to max 500 characters
  if (last5Lines.length > 500) {
    return last5Lines.slice(-500);
  }

  return last5Lines;
}

/**
 * Component to display a single session card with live duration updates.
 * Shows story title, epic title, duration timer, and output preview.
 */
export function SessionCard({ session }: { session: SessionInfo }) {
  const [duration, setDuration] = useState(() => {
    const startTime = new Date(session.startTime).getTime();
    const now = Date.now();
    return Math.floor((now - startTime) / 1000);
  });

  // Update duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = new Date(session.startTime).getTime();
      const now = Date.now();
      setDuration(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [session.startTime]);

  const truncatedOutput = truncateOutput(session.outputPreview);

  return (
    <Link
      to={`/epic/${session.epicSlug}/story/${session.storySlug}?tab=sessions`}
      className="block"
    >
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{session.storySlug}</CardTitle>
          <div className="text-sm text-text-muted">{session.epicSlug}</div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-text-muted">
            {formatDuration(duration)}
          </div>
          {session.outputAvailable ? (
            truncatedOutput ? (
              <pre
                className="font-mono bg-bg-dark text-xs p-2 rounded overflow-hidden whitespace-pre-wrap"
                role="presentation"
              >
                {truncatedOutput}
              </pre>
            ) : null
          ) : (
            <div className="text-text-muted text-sm italic">
              Output unavailable
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
