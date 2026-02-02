import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import { expect, within } from "storybook/test";
import { EpicCard } from "@/pages/EpicList";
import type {
	EpicPreset,
	EpicSummaryOverrides,
} from "@/test-utils/mock-factories";
import {
	createMockEpicSummary,
	resetMockCounters,
} from "@/test-utils/mock-factories";
import {
	matchDomSnapshot,
	matchPixelSnapshot,
} from "@/test-utils/visual-snapshot";

// ============================================================================
// Constants
// ============================================================================

/** Total number of epic cards in Showcase (6 presets + 2 edge cases) */
const SHOWCASE_CARD_COUNT = 8;

/** Available epic presets for Playground */
const epicPresets: EpicPreset[] = [
	"typical",
	"just-started",
	"in-progress",
	"has-blockers",
	"almost-done",
	"completed",
];

// ============================================================================
// Story Meta
// ============================================================================

/**
 * Epic card component displaying an epic's title, progress bar, and story
 * status breakdown. Clickable to navigate to epic detail page.
 *
 * Features:
 * - Progress bar showing completion percentage
 * - Status badges showing story counts (only visible when count > 0)
 * - Hover state with primary border
 * - Navigation link to `/epic/{slug}`
 */
const meta: Meta<{ preset: EpicPreset; title?: string; isArchived?: boolean }> =
	{
		title: "Components/EpicCard",
		decorators: [
			(Story) => (
				<MemoryRouter>
					<Story />
				</MemoryRouter>
			),
		],
		argTypes: {
			preset: {
				control: "select",
				options: epicPresets,
				description: "Epic preset determining story counts and progress state",
			},
			title: {
				control: "text",
				description: "Override the epic title",
			},
			isArchived: {
				control: "boolean",
				description: "Whether the epic is archived",
			},
		},
		args: {
			preset: "typical",
			isArchived: false,
		},
		parameters: {
			docs: {
				description: {
					component:
						"Card component for displaying a single epic with title, progress bar, and status badges. Clickable to navigate to epic detail.",
				},
			},
			a11y: {
				test: "error",
			},
		},
	};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Curated display of EpicCard showing all 6 preset states:
 * - Typical: Mixed progress with all status types
 * - Just Started: All stories ready, none completed
 * - In Progress: Active work with some completion
 * - Has Blockers: Stories blocked requiring attention
 * - Almost Done: Most stories completed, one in progress
 * - Completed: All stories done
 */
const Showcase: Story = {
	render: () => {
		resetMockCounters();
		return (
			<div className="space-y-8">
				{/* Main States Section */}
				<section>
					<h3 className="text-sm font-medium text-text-muted mb-4">
						Epic States
					</h3>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div className="space-y-2">
							<span className="text-xs text-text-muted">Typical</span>
							<EpicCard
								epic={createMockEpicSummary("typical", {
									title: "Dashboard Restructure",
									slug: "dashboard-restructure",
								})}
							/>
						</div>
						<div className="space-y-2">
							<span className="text-xs text-text-muted">Just Started</span>
							<EpicCard
								epic={createMockEpicSummary("just-started", {
									title: "New Feature Implementation",
									slug: "new-feature",
								})}
							/>
						</div>
						<div className="space-y-2">
							<span className="text-xs text-text-muted">In Progress</span>
							<EpicCard
								epic={createMockEpicSummary("in-progress", {
									title: "API Integration",
									slug: "api-integration",
								})}
							/>
						</div>
						<div className="space-y-2">
							<span className="text-xs text-text-muted">Has Blockers</span>
							<EpicCard
								epic={createMockEpicSummary("has-blockers", {
									title: "Database Migration",
									slug: "db-migration",
								})}
							/>
						</div>
						<div className="space-y-2">
							<span className="text-xs text-text-muted">Almost Done</span>
							<EpicCard
								epic={createMockEpicSummary("almost-done", {
									title: "Authentication System",
									slug: "auth-system",
								})}
							/>
						</div>
						<div className="space-y-2">
							<span className="text-xs text-text-muted">Completed</span>
							<EpicCard
								epic={createMockEpicSummary("completed", {
									title: "Legacy Cleanup",
									slug: "legacy-cleanup",
								})}
							/>
						</div>
					</div>
				</section>

				{/* Edge Cases Section */}
				<section>
					<h3 className="text-sm font-medium text-text-muted mb-4">
						Edge Cases
					</h3>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<span className="text-xs text-text-muted">Long Title</span>
							<EpicCard
								epic={createMockEpicSummary("typical", {
									title:
										"This Is a Very Long Epic Title That Demonstrates How Text Wrapping Works in the Card Component",
									slug: "long-title-epic",
								})}
							/>
						</div>
						<div className="space-y-2">
							<span className="text-xs text-text-muted">Archived</span>
							<EpicCard
								epic={createMockEpicSummary("completed", {
									title: "Archived Feature",
									slug: "archived-feature",
									isArchived: true,
								})}
							/>
						</div>
					</div>
				</section>
			</div>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Verify section headers
		await expect(canvas.getByText("Epic States")).toBeInTheDocument();
		await expect(canvas.getByText("Edge Cases")).toBeInTheDocument();

		// Verify all preset labels are present
		await expect(canvas.getByText("Typical")).toBeInTheDocument();
		await expect(canvas.getByText("Just Started")).toBeInTheDocument();
		await expect(canvas.getByText("In Progress")).toBeInTheDocument();
		await expect(canvas.getByText("Has Blockers")).toBeInTheDocument();
		await expect(canvas.getByText("Almost Done")).toBeInTheDocument();
		await expect(canvas.getByText("Completed")).toBeInTheDocument();

		// Verify epic titles
		await expect(canvas.getByText("Dashboard Restructure")).toBeInTheDocument();
		await expect(
			canvas.getByText("New Feature Implementation"),
		).toBeInTheDocument();
		await expect(canvas.getByText("API Integration")).toBeInTheDocument();
		await expect(canvas.getByText("Database Migration")).toBeInTheDocument();
		await expect(canvas.getByText("Authentication System")).toBeInTheDocument();
		await expect(canvas.getByText("Legacy Cleanup")).toBeInTheDocument();

		// Verify edge cases
		await expect(
			canvas.getByText(
				"This Is a Very Long Epic Title That Demonstrates How Text Wrapping Works in the Card Component",
			),
		).toBeInTheDocument();
		await expect(canvas.getByText("Archived Feature")).toBeInTheDocument();

		// Verify links are present (6 presets + 2 edge cases)
		const links = canvas.getAllByRole("link");
		await expect(links.length).toBe(SHOWCASE_CARD_COUNT);

		// Verify all links have accessible names
		await Promise.all(links.map((link) => expect(link).toHaveAccessibleName()));

		// Visual snapshot tests
		await matchDomSnapshot(canvasElement, "epic-card-showcase");
		await matchPixelSnapshot(canvasElement, "epic-card-showcase");
	},
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring EpicCard with different presets.
 * Use the controls to change the epic preset and customize title/archived state.
 */
const Playground: Story = {
	render: (args) => {
		resetMockCounters();
		const overrides: EpicSummaryOverrides = {
			slug: "playground-epic",
		};
		if (args.title) {
			overrides.title = args.title;
		}
		if (args.isArchived !== undefined) {
			overrides.isArchived = args.isArchived;
		}
		const epic = createMockEpicSummary(args.preset, overrides);

		return (
			<div className="space-y-4">
				<div className="text-sm text-text-muted">
					<span className="font-medium">Preset:</span> {args.preset}
					{args.isArchived && <span className="ml-2">(Archived)</span>}
				</div>
				<div className="max-w-md">
					<EpicCard epic={epic} />
				</div>
				<div className="text-xs text-text-muted/70 space-y-1">
					<div>
						Story counts: Ready: {epic.storyCounts.ready}, In Progress:{" "}
						{epic.storyCounts.inProgress}, Blocked: {epic.storyCounts.blocked},
						Completed: {epic.storyCounts.completed}
					</div>
					<div>Total: {epic.storyCounts.total} stories</div>
				</div>
			</div>
		);
	},
	args: {
		preset: "typical",
		title: "",
		isArchived: false,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Verify preset is displayed
		await expect(canvas.getByText("Preset:")).toBeInTheDocument();

		// Verify card is rendered with a link
		const link = canvas.getByRole("link");
		await expect(link).toBeInTheDocument();
		await expect(link).toHaveAttribute("href", "/epic/playground-epic");

		// Verify Progress text is present
		await expect(canvas.getByText("Progress")).toBeInTheDocument();

		// Verify link has accessible name
		await expect(link).toHaveAccessibleName();
	},
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground };
