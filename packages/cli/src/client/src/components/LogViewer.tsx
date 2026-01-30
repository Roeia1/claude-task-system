import { useMemo } from 'react';

export interface LogViewerProps {
  /** The name of the session to display logs for */
  sessionName: string;
  /** The status of the session: running or completed */
  status: 'running' | 'completed';
  /** Whether the output file is available */
  outputAvailable: boolean;
  /** Initial log content to display */
  initialContent?: string;
}

/**
 * LogViewer component displays streaming logs in a terminal-style interface.
 * Uses monospace font and SAGA theme colors for a familiar terminal experience.
 */
export function LogViewer({
  sessionName: _sessionName,
  status: _status,
  outputAvailable,
  initialContent = '',
}: LogViewerProps) {
  // Split content into lines for rendering
  const lines = useMemo(() => {
    if (!initialContent) return [];
    return initialContent.split('\n');
  }, [initialContent]);

  // Handle unavailable output state
  if (!outputAvailable) {
    return (
      <div
        data-testid="log-viewer"
        className="h-96 bg-bg-dark rounded-md font-mono flex items-center justify-center"
      >
        <span className="text-text-muted">Output unavailable</span>
      </div>
    );
  }

  return (
    <div
      data-testid="log-viewer"
      className="h-96 bg-bg-dark rounded-md font-mono overflow-auto"
    >
      <div className="p-4">
        {lines.map((line, index) => (
          <div key={index} className="text-text leading-relaxed">
            {line || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogViewer;
