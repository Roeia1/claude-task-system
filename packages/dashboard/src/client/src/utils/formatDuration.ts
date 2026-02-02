// Time constants
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

/**
 * Formats a duration in seconds to human-readable format
 * Examples: "30s", "2m 34s", "1h 15m", "1d 0h"
 */
export function formatDuration(seconds: number): string {
	const days = Math.floor(seconds / SECONDS_PER_DAY);
	const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
	const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
	const secs = seconds % SECONDS_PER_MINUTE;

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
