import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionInfo } from "@/types/dashboard";
import { formatDuration } from "@/utils/formatDuration";

// Time constants
const MS_PER_SECOND = 1000;
const DURATION_UPDATE_INTERVAL = 1000;

// Output preview constants
const PREVIEW_MAX_LINES = 5;
const PREVIEW_MAX_CHARS = 500;

/**
 * Truncates output preview to last N lines and max characters
 */
function truncateOutput(output: string | undefined): string {
	if (!output) {
		return "";
	}

	// Get last N lines
	const lines = output.split("\n");
	const lastLines = lines.slice(-PREVIEW_MAX_LINES).join("\n");

	// Truncate to max characters
	if (lastLines.length > PREVIEW_MAX_CHARS) {
		return lastLines.slice(-PREVIEW_MAX_CHARS);
	}

	return lastLines;
}

/**
 * Renders the output preview section with auto-scroll to bottom
 */
function OutputPreview({
	truncatedOutput,
	outputAvailable,
}: {
	truncatedOutput: string;
	outputAvailable: boolean;
}) {
	const outputRef = useRef<HTMLPreElement>(null);

	// Auto-scroll output to bottom when content changes
	useLayoutEffect(() => {
		// Only scroll when there's content to scroll to
		if (truncatedOutput && outputRef.current) {
			outputRef.current.scrollTop = outputRef.current.scrollHeight;
		}
	}, [truncatedOutput]);

	if (!outputAvailable) {
		return (
			<div className="text-text-muted text-sm italic">Output unavailable</div>
		);
	}

	if (!truncatedOutput) {
		return null;
	}

	return (
		<pre
			ref={outputRef}
			className="font-mono bg-bg-dark text-xs p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap"
			role="presentation"
		>
			{truncatedOutput}
		</pre>
	);
}

/**
 * Component to display a single session card with live duration updates.
 * Shows story title, epic title, duration timer, and output preview.
 * Output preview auto-scrolls to bottom when content changes.
 */
export function SessionCard({ session }: { session: SessionInfo }) {
	const [duration, setDuration] = useState(() => {
		const startTime = new Date(session.startTime).getTime();
		const now = Date.now();
		return Math.floor((now - startTime) / MS_PER_SECOND);
	});

	const truncatedOutput = truncateOutput(session.outputPreview);

	// Update duration every second
	useEffect(() => {
		const interval = setInterval(() => {
			const startTime = new Date(session.startTime).getTime();
			const now = Date.now();
			setDuration(Math.floor((now - startTime) / MS_PER_SECOND));
		}, DURATION_UPDATE_INTERVAL);

		return () => clearInterval(interval);
	}, [session.startTime]);

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
					<OutputPreview
						truncatedOutput={truncatedOutput}
						outputAvailable={session.outputAvailable}
					/>
				</CardContent>
			</Card>
		</Link>
	);
}
