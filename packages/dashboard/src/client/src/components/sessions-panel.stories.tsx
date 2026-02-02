import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import {
	matchDomSnapshot,
	matchPixelSnapshot,
} from "@/test-utils/visual-snapshot";
import type { SessionInfo } from "@/types/dashboard";
import {
	SessionDetailCard,
	SessionStatusBadge,
	SessionsPanelEmpty,
	SessionsPanelSkeleton,
} from "./SessionsPanel.tsx";

// ============================================================================
// Constants
// ============================================================================

/** Minimum skeleton cards expected in loading state */
const MIN_SKELETON_CARDS = 2;

/** Expected session card count for populated stories */
const EXPECTED_SESSION_CARDS = 3;

// ============================================================================
// Sample Data
// ============================================================================

/** Running session with output available */
const runningSession: SessionInfo = {
	name: "saga__dashboard-epic__auth-story__12345",
	epicSlug: "dashboard-epic",
	storySlug: "auth-story",
	status: "running",
	outputFile: "/tmp/saga/sessions/12345.log",
	outputAvailable: true,
	startTime: "2026-01-30T10:00:00Z",
	outputPreview: "Running tests...\nTest 1 passed\nTest 2 passed",
};

/** Completed session with output available */
const completedSession: SessionInfo = {
	name: "saga__dashboard-epic__auth-story__67890",
	epicSlug: "dashboard-epic",
	storySlug: "auth-story",
	status: "completed",
	outputFile: "/tmp/saga/sessions/67890.log",
	outputAvailable: true,
	startTime: "2026-01-30T08:00:00Z",
	endTime: "2026-01-30T09:30:00Z",
	outputPreview: "All tests passed.\nBuild complete.",
};

/** Session with output unavailable */
const unavailableOutputSession: SessionInfo = {
	name: "saga__dashboard-epic__auth-story__11111",
	epicSlug: "dashboard-epic",
	storySlug: "auth-story",
	status: "completed",
	outputFile: "/tmp/saga/sessions/11111.log",
	outputAvailable: false,
	startTime: "2026-01-30T06:00:00Z",
	endTime: "2026-01-30T07:00:00Z",
};

/** Multiple sessions for list display */
const multipleSessions: SessionInfo[] = [
	runningSession,
	completedSession,
	{
		name: "saga__dashboard-epic__auth-story__33333",
		epicSlug: "dashboard-epic",
		storySlug: "auth-story",
		status: "completed",
		outputFile: "/tmp/saga/sessions/33333.log",
		outputAvailable: true,
		startTime: "2026-01-30T04:00:00Z",
		endTime: "2026-01-30T05:00:00Z",
		outputPreview: "Setup complete.",
	},
];

// ============================================================================
// Showcase Section Components
// ============================================================================

/** Loading state section */
function LoadingStateSection() {
	return (
		<section>
			<h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
				Loading State
			</h3>
			<SessionsPanelSkeleton />
		</section>
	);
}

/** Empty state section */
function EmptyStateSection() {
	return (
		<section>
			<h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
				Empty State
			</h3>
			<SessionsPanelEmpty />
		</section>
	);
}

/** Status badges section */
function StatusBadgesSection() {
	return (
		<section>
			<h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
				Status Badges
			</h3>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<span className="text-sm text-text-muted">Running:</span>
					<SessionStatusBadge status="running" />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-text-muted">Completed:</span>
					<SessionStatusBadge status="completed" />
				</div>
			</div>
		</section>
	);
}

/** Single session cards section */
function SessionCardsSection() {
	return (
		<section>
			<h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
				Session Cards
			</h3>
			<div className="space-y-4">
				<div>
					<p className="text-sm text-text-muted mb-2">
						Running Session (expanded)
					</p>
					<SessionDetailCard session={runningSession} defaultExpanded={true} />
				</div>
				<div>
					<p className="text-sm text-text-muted mb-2">
						Completed Session (collapsed)
					</p>
					<SessionDetailCard
						session={completedSession}
						defaultExpanded={false}
					/>
				</div>
				<div>
					<p className="text-sm text-text-muted mb-2">Output Unavailable</p>
					<SessionDetailCard
						session={unavailableOutputSession}
						defaultExpanded={false}
					/>
				</div>
			</div>
		</section>
	);
}

/** Session list section */
function SessionListSection() {
	return (
		<section>
			<h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
				Session List
			</h3>
			<div className="space-y-4">
				{multipleSessions.map((session, index) => (
					<SessionDetailCard
						key={session.name}
						session={session}
						defaultExpanded={index === 0}
					/>
				))}
			</div>
		</section>
	);
}

// ============================================================================
// Meta Definition
// ============================================================================

/**
 * SessionsPanel displays sessions for a specific story in the story detail page.
 * It shows session cards with status, duration, and collapsible log viewers.
 *
 * Features:
 * - Loading skeleton while fetching sessions
 * - Empty state when no sessions exist
 * - Session cards with running/completed status badges
 * - Collapsible log viewer integration
 * - Auto-expand most recent running session (or most recent completed)
 * - Live duration updates for running sessions
 */
const meta: Meta<typeof SessionDetailCard> = {
	title: "Components/SessionsPanel",
	component: SessionDetailCard,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Panel displaying tmux sessions for a story. Shows session metadata, status badges, and embedded log viewers.",
			},
		},
	},
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displaying all SessionsPanel states and components.
 *
 * Demonstrates:
 * - Loading skeleton state
 * - Empty state (no sessions)
 * - Status badges (running/completed)
 * - Session cards (running, completed, output unavailable)
 * - Session list with auto-expand behavior
 */
export const Showcase: Story = {
	render: () => (
		<div className="space-y-12">
			<LoadingStateSection />
			<EmptyStateSection />
			<StatusBadgesSection />
			<SessionCardsSection />
			<SessionListSection />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// Verify section headings
		await expect(canvas.getByText("Loading State")).toBeInTheDocument();
		await expect(canvas.getByText("Empty State")).toBeInTheDocument();
		await expect(canvas.getByText("Status Badges")).toBeInTheDocument();
		await expect(canvas.getByText("Session Cards")).toBeInTheDocument();
		await expect(canvas.getByText("Session List")).toBeInTheDocument();

		// Verify loading skeleton
		await expect(
			canvas.getByTestId("sessions-panel-skeleton"),
		).toBeInTheDocument();
		const skeletonCards = canvas.getAllByTestId("session-card-skeleton");
		await expect(skeletonCards.length).toBeGreaterThanOrEqual(
			MIN_SKELETON_CARDS,
		);

		// Verify empty state
		await expect(
			canvas.getByTestId("sessions-panel-empty"),
		).toBeInTheDocument();
		await expect(
			canvas.getByText("No sessions found for this story"),
		).toBeInTheDocument();

		// Verify status badges (multiple instances exist)
		const runningBadges = canvas.getAllByText("Running");
		await expect(runningBadges.length).toBeGreaterThanOrEqual(1);
		const completedBadges = canvas.getAllByText("Completed");
		await expect(completedBadges.length).toBeGreaterThanOrEqual(1);

		// Verify session cards
		const sessionCards = canvas.getAllByTestId("session-detail-card");
		await expect(sessionCards.length).toBeGreaterThanOrEqual(
			EXPECTED_SESSION_CARDS,
		);

		// Verify output unavailable message
		await expect(canvas.getByText("Output unavailable")).toBeInTheDocument();

		// Visual snapshots
		await matchDomSnapshot(canvasElement, "sessions-panel-showcase");
		await matchPixelSnapshot(canvasElement, "sessions-panel-showcase");
	},
};

// ============================================================================
// Individual State Stories
// ============================================================================

/**
 * Loading state showing skeleton cards.
 */
export const Loading: Story = {
	render: () => <SessionsPanelSkeleton />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByTestId("sessions-panel-skeleton"),
		).toBeInTheDocument();
		const skeletonCards = canvas.getAllByTestId("session-card-skeleton");
		await expect(skeletonCards.length).toBeGreaterThanOrEqual(
			MIN_SKELETON_CARDS,
		);

		await matchDomSnapshot(canvasElement, "sessions-panel-loading");
		await matchPixelSnapshot(canvasElement, "sessions-panel-loading");
	},
};

/**
 * Empty state when no sessions exist for the story.
 */
export const Empty: Story = {
	render: () => (
		<div data-testid="sessions-panel">
			<SessionsPanelEmpty />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByTestId("sessions-panel-empty"),
		).toBeInTheDocument();
		await expect(
			canvas.getByText("No sessions found for this story"),
		).toBeInTheDocument();

		// Verify terminal icon is present
		const terminalIcon = canvasElement.querySelector(".lucide-terminal");
		await expect(terminalIcon).toBeInTheDocument();

		await matchDomSnapshot(canvasElement, "sessions-panel-empty");
		await matchPixelSnapshot(canvasElement, "sessions-panel-empty");
	},
};

/**
 * Running session with expanded log viewer.
 */
export const RunningSession: Story = {
	render: () => (
		<div className="space-y-4">
			<SessionDetailCard session={runningSession} defaultExpanded={true} />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByTestId("session-detail-card")).toBeInTheDocument();
		await expect(canvas.getByText("Running")).toBeInTheDocument();
		await expect(canvas.getByText(runningSession.name)).toBeInTheDocument();

		// Verify log viewer is rendered (expanded state)
		await expect(canvas.getByTestId("log-viewer")).toBeInTheDocument();

		await matchDomSnapshot(canvasElement, "sessions-panel-running");
		await matchPixelSnapshot(canvasElement, "sessions-panel-running");
	},
};

/**
 * Completed session in collapsed state.
 */
export const CompletedSession: Story = {
	render: () => (
		<div className="space-y-4">
			<SessionDetailCard session={completedSession} defaultExpanded={false} />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByTestId("session-detail-card")).toBeInTheDocument();
		await expect(canvas.getByText("Completed")).toBeInTheDocument();
		await expect(canvas.getByText(completedSession.name)).toBeInTheDocument();

		// Log viewer should not be visible (collapsed state)
		await expect(canvas.queryByTestId("log-viewer")).not.toBeInTheDocument();

		await matchDomSnapshot(canvasElement, "sessions-panel-completed");
		await matchPixelSnapshot(canvasElement, "sessions-panel-completed");
	},
};

/**
 * Session with output file unavailable.
 */
export const OutputUnavailable: Story = {
	render: () => (
		<div className="space-y-4">
			<SessionDetailCard
				session={unavailableOutputSession}
				defaultExpanded={false}
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByTestId("session-detail-card")).toBeInTheDocument();
		await expect(canvas.getByText("Output unavailable")).toBeInTheDocument();

		// Card should have opacity styling
		const card = canvas.getByTestId("session-detail-card");
		await expect(card).toHaveClass("opacity-60");

		await matchDomSnapshot(canvasElement, "sessions-panel-unavailable");
		await matchPixelSnapshot(canvasElement, "sessions-panel-unavailable");
	},
};

/**
 * Multiple sessions list with auto-expand on first (most recent running).
 */
export const SessionList: Story = {
	render: () => (
		<div data-testid="sessions-panel" className="space-y-4">
			{multipleSessions.map((session, index) => (
				<SessionDetailCard
					key={session.name}
					session={session}
					defaultExpanded={index === 0}
				/>
			))}
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByTestId("sessions-panel")).toBeInTheDocument();

		const sessionCards = canvas.getAllByTestId("session-detail-card");
		await expect(sessionCards).toHaveLength(EXPECTED_SESSION_CARDS);

		// First session should be expanded (has log viewer)
		await expect(canvas.getByTestId("log-viewer")).toBeInTheDocument();

		// Should have both running and completed badges
		await expect(canvas.getByText("Running")).toBeInTheDocument();
		await expect(canvas.getAllByText("Completed")).toHaveLength(2);

		await matchDomSnapshot(canvasElement, "sessions-panel-list");
		await matchPixelSnapshot(canvasElement, "sessions-panel-list");
	},
};

/**
 * Interactive playground for exploring session cards.
 */
export const Playground: Story = {
	args: {
		session: runningSession,
		defaultExpanded: true,
	},
	render: (args) => (
		<div className="space-y-4">
			<div className="text-sm text-text-muted mb-4">
				<span className="font-medium">Session:</span> {args.session.name}
				<br />
				<span className="font-medium">Status:</span> {args.session.status}
				<br />
				<span className="font-medium">Output Available:</span>{" "}
				{args.session.outputAvailable ? "Yes" : "No"}
			</div>
			<SessionDetailCard
				session={args.session}
				defaultExpanded={args.defaultExpanded}
			/>
		</div>
	),
	argTypes: {
		session: {
			control: "select",
			options: ["running", "completed", "unavailable"],
			mapping: {
				running: runningSession,
				completed: completedSession,
				unavailable: unavailableOutputSession,
			},
		},
		defaultExpanded: {
			control: "boolean",
		},
	},
};

export default meta;
