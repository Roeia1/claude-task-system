import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import { expect, within } from "storybook/test";
import {
	createMockSession,
	resetMockCounters,
	type SessionPreset,
} from "@/test-utils/mock-factories";
import {
	matchDomSnapshot,
	matchPixelSnapshot,
} from "@/test-utils/visual-snapshot";
import { formatDuration } from "@/utils/formatDuration";
import { SessionCard } from "./session-card.tsx";

// ============================================================================
// Constants
// ============================================================================

const SESSION_PRESETS: SessionPreset[] = [
	"just-started",
	"running",
	"long-running",
	"no-output",
	"output-unavailable",
];

// Duration test constants in seconds
const DURATION_0_SECONDS = 0;
const DURATION_30_SECONDS = 30;
const DURATION_59_SECONDS = 59;
const DURATION_1_MINUTE = 60;
const DURATION_2M_34S = 154;
const DURATION_1_HOUR = 3600;
const DURATION_1H_15M = 4500;
const DURATION_1_DAY = 86_400;
const DURATION_2D_3H = 183_600;

// Count constants
const SHOWCASE_SESSION_COUNT = 5;

// Regex patterns for tests
const DURATION_PATTERN = /\d+[smhd]/;
const HOURS_MINUTES_PATTERN = /\d+h \d+m/;

// ============================================================================
// Helper Functions
// ============================================================================

/** Convert preset name to display label */
function presetToLabel(preset: SessionPreset): string {
	return preset
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// ============================================================================
// Helper Components
// ============================================================================

/** Wrapper component providing MemoryRouter context for SessionCard */
function SessionCardWithRouter({
	preset,
	epicSlug,
	storySlug,
	outputPreview,
}: {
	preset: SessionPreset;
	epicSlug?: string;
	storySlug?: string;
	outputPreview?: string;
}) {
	const session = createMockSession(preset, {
		epicSlug,
		storySlug,
		outputPreview,
	});
	return (
		<MemoryRouter>
			<SessionCard session={session} />
		</MemoryRouter>
	);
}

// ============================================================================
// Meta Configuration
// ============================================================================

/**
 * SessionCard displays a single running session with live duration updates,
 * output preview, and navigation to the story detail page.
 *
 * - **Showcase**: Displays all 5 session presets plus formatDuration utility examples
 * - **Playground**: Interactive controls for exploring session states
 */
const meta: Meta<{
	preset: SessionPreset;
	epicSlug: string;
	storySlug: string;
}> = {
	title: "Components/SessionCard",
	parameters: {
		docs: {
			description: {
				component:
					"Card component for displaying a running session with story/epic titles, live duration counter, and output preview. Clicking navigates to the story detail Sessions tab.",
			},
		},
	},
	argTypes: {
		preset: {
			control: "select",
			options: SESSION_PRESETS,
			description: "Session preset determining duration and output state",
		},
		epicSlug: {
			control: "text",
			description: "Epic slug for the session",
		},
		storySlug: {
			control: "text",
			description: "Story slug for the session",
		},
	},
	args: {
		preset: "running",
		epicSlug: "test-epic",
		storySlug: "test-story",
	},
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displaying all session states and formatDuration examples.
 */
const Showcase: Story = {
	render: () => {
		resetMockCounters();

		return (
			<div className="space-y-8">
				{/* Session States */}
				<section>
					<h2 className="text-lg font-semibold text-text mb-4">
						Session States
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{SESSION_PRESETS.map((preset) => (
							<div key={preset} className="space-y-2">
								<div className="text-sm text-text-muted">
									{presetToLabel(preset)}
								</div>
								<div className="w-[300px]">
									<SessionCardWithRouter
										preset={preset}
										epicSlug="feature-epic"
										storySlug={`${preset}-session`}
									/>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* Edge Cases */}
				<section>
					<h2 className="text-lg font-semibold text-text mb-4">Edge Cases</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<div className="text-sm text-text-muted">
								Long Epic/Story Slugs
							</div>
							<div className="w-[300px]">
								<SessionCardWithRouter
									preset="running"
									epicSlug="very-long-epic-slug-that-might-overflow"
									storySlug="another-very-long-story-slug-for-testing"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<div className="text-sm text-text-muted">Long Output Preview</div>
							<div className="w-[300px]">
								<SessionCardWithRouter
									preset="running"
									epicSlug="test-epic"
									storySlug="long-output"
									outputPreview={Array.from(
										{ length: 20 },
										(_, i) =>
											`Line ${i + 1}: This is a log line with content demonstrating truncation`,
									).join("\n")}
								/>
							</div>
						</div>
					</div>
				</section>

				{/* formatDuration Utility */}
				<section>
					<h2 className="text-lg font-semibold text-text mb-4">
						formatDuration Utility
					</h2>
					<div className="bg-bg-dark rounded p-4">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="text-text-muted">0 seconds:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_0_SECONDS)}
							</div>
							<div className="text-text-muted">30 seconds:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_30_SECONDS)}
							</div>
							<div className="text-text-muted">59 seconds:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_59_SECONDS)}
							</div>
							<div className="text-text-muted">1 minute:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_1_MINUTE)}
							</div>
							<div className="text-text-muted">2m 34s:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_2M_34S)}
							</div>
							<div className="text-text-muted">1 hour:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_1_HOUR)}
							</div>
							<div className="text-text-muted">1h 15m:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_1H_15M)}
							</div>
							<div className="text-text-muted">1 day:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_1_DAY)}
							</div>
							<div className="text-text-muted">2d 3h:</div>
							<div className="text-text font-mono">
								{formatDuration(DURATION_2D_3H)}
							</div>
						</div>
					</div>
				</section>
			</div>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Verify all 5 session presets are displayed
		await expect(canvas.getAllByRole("link").length).toBeGreaterThanOrEqual(
			SHOWCASE_SESSION_COUNT,
		);

		// Verify session states section
		await expect(canvas.getByText("Just Started")).toBeInTheDocument();
		await expect(canvas.getByText("Running")).toBeInTheDocument();
		await expect(canvas.getByText("Long Running")).toBeInTheDocument();
		await expect(canvas.getByText("No Output")).toBeInTheDocument();
		await expect(canvas.getByText("Output Unavailable")).toBeInTheDocument();

		// Verify output unavailable message appears for that preset
		await expect(canvas.getByText("Output unavailable")).toBeInTheDocument();

		// Verify edge cases section
		await expect(canvas.getByText("Long Epic/Story Slugs")).toBeInTheDocument();
		await expect(canvas.getByText("Long Output Preview")).toBeInTheDocument();

		// Verify formatDuration utility section
		await expect(
			canvas.getByText("formatDuration Utility"),
		).toBeInTheDocument();
		await expect(canvas.getByText("0s")).toBeInTheDocument();
		await expect(canvas.getByText("30s")).toBeInTheDocument();
		await expect(canvas.getByText("1h 0m")).toBeInTheDocument();

		// Visual snapshot tests
		await matchDomSnapshot(canvasElement, "session-card-showcase");
		await matchPixelSnapshot(canvasElement, "session-card-showcase");
	},
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring SessionCard with different configurations.
 */
const Playground: Story = {
	render: (args) => {
		resetMockCounters();

		return (
			<div className="space-y-4">
				<div className="text-sm text-text-muted">
					<span className="font-medium">Preset:</span>{" "}
					{presetToLabel(args.preset)}
				</div>
				<div className="w-[350px]">
					<SessionCardWithRouter
						preset={args.preset}
						epicSlug={args.epicSlug}
						storySlug={args.storySlug}
					/>
				</div>
			</div>
		);
	},
	args: {
		preset: "running",
		epicSlug: "feature-epic",
		storySlug: "active-session",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		// Verify preset label is displayed
		await expect(
			canvas.getByText(presetToLabel(args.preset)),
		).toBeInTheDocument();

		// Verify story slug is displayed
		await expect(canvas.getByText(args.storySlug)).toBeInTheDocument();

		// Verify epic slug is displayed
		await expect(canvas.getByText(args.epicSlug)).toBeInTheDocument();

		// Verify duration is displayed
		const durationElement = canvas.getByText(DURATION_PATTERN);
		await expect(durationElement).toBeInTheDocument();

		// Verify link exists with correct format
		const link = canvas.getByRole("link");
		await expect(link).toHaveAttribute(
			"href",
			`/epic/${args.epicSlug}/story/${args.storySlug}?tab=sessions`,
		);

		// Handle preset-specific checks
		if (args.preset === "output-unavailable") {
			await expect(canvas.getByText("Output unavailable")).toBeInTheDocument();
		} else if (args.preset === "long-running") {
			const hoursMinutes = canvas.getByText(HOURS_MINUTES_PATTERN);
			await expect(hoursMinutes).toBeInTheDocument();
		}
	},
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground };
