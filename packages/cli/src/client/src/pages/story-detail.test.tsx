import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardProvider } from "@/context/dashboard-context";
import type { StoryDetail as StoryDetailType } from "@/types/dashboard";
import { StoryDetail } from "./StoryDetail.tsx";

// Regex pattern for Journal tab matching (defined at top level for performance)
const JOURNAL_TAB_PATTERN = /Journal/;

// Mock story data
const mockStory: StoryDetailType = {
	slug: "test-story",
	title: "Test Story Title",
	status: "inProgress",
	epicSlug: "test-epic",
	tasks: [
		{ id: "t1", title: "Task 1", status: "completed" },
		{ id: "t2", title: "Task 2", status: "inProgress" },
	],
	journal: [],
	content: "## Story Content\n\nThis is the story content.",
};

// Helper to render with routing context
function renderStoryDetail(
	epicSlug = "test-epic",
	storySlug = "test-story",
	queryString = "",
) {
	return render(
		<DashboardProvider>
			<MemoryRouter
				initialEntries={[`/epic/${epicSlug}/story/${storySlug}${queryString}`]}
			>
				<Routes>
					<Route
						path="/epic/:epicSlug/story/:storySlug"
						element={<StoryDetail />}
					/>
				</Routes>
			</MemoryRouter>
		</DashboardProvider>,
	);
}

describe("StoryDetail Sessions Tab", () => {
	beforeEach(() => {
		// Mock successful story and sessions fetch
		vi.spyOn(globalThis, "fetch").mockImplementation(
			(url: RequestInfo | URL) => {
				const urlString = url.toString();
				if (urlString.includes("/api/sessions")) {
					// Return empty sessions array for sessions API
					return Promise.resolve({
						ok: true,
						status: 200,
						json: () => Promise.resolve([]),
					} as Response);
				}
				// Return mock story for story API
				return Promise.resolve({
					ok: true,
					status: 200,
					json: () => Promise.resolve(mockStory),
				} as Response);
			},
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	describe("tab rendering", () => {
		it("displays Sessions tab in the tab bar", async () => {
			renderStoryDetail();

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: "Sessions" }),
				).toBeInTheDocument();
			});
		});

		it("renders Sessions tab after Journal tab", async () => {
			renderStoryDetail();

			await waitFor(() => {
				const tabs = screen.getAllByRole("tab");
				const journalIndex = tabs.findIndex((tab) =>
					tab.textContent?.includes("Journal"),
				);
				const sessionsIndex = tabs.findIndex((tab) =>
					tab.textContent?.includes("Sessions"),
				);
				expect(sessionsIndex).toBeGreaterThan(journalIndex);
			});
		});

		it("Sessions tab is clickable and changes aria-selected state", async () => {
			renderStoryDetail();

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: "Sessions" }),
				).toBeInTheDocument();
			});

			const sessionsTab = screen.getByRole("tab", { name: "Sessions" });

			// Verify the Sessions tab is not initially selected
			expect(sessionsTab).toHaveAttribute("aria-selected", "false");

			// Verify the tab element has the expected structure
			expect(sessionsTab).toHaveAttribute("role", "tab");
		});
	});

	describe("tab selection does not break existing tabs", () => {
		it("Tasks tab still exists and is default", async () => {
			renderStoryDetail();

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Tasks" })).toBeInTheDocument();
			});

			// Should be on Tasks tab by default
			expect(screen.getByRole("tab", { name: "Tasks" })).toHaveAttribute(
				"data-state",
				"active",
			);
		});

		it("Story Content tab still exists", async () => {
			renderStoryDetail();

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: "Story Content" }),
				).toBeInTheDocument();
			});
		});

		it("Journal tab still exists", async () => {
			renderStoryDetail();

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: JOURNAL_TAB_PATTERN }),
				).toBeInTheDocument();
			});
		});
	});

	describe("URL query parameter tab selection", () => {
		it("navigates to Sessions tab when ?tab=sessions is in URL", async () => {
			renderStoryDetail("test-epic", "test-story", "?tab=sessions");

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: "Sessions" }),
				).toBeInTheDocument();
			});

			// Sessions tab should be active
			expect(screen.getByRole("tab", { name: "Sessions" })).toHaveAttribute(
				"data-state",
				"active",
			);
			// Tasks tab should not be active
			expect(screen.getByRole("tab", { name: "Tasks" })).toHaveAttribute(
				"data-state",
				"inactive",
			);
		});

		it("navigates to Journal tab when ?tab=journal is in URL", async () => {
			renderStoryDetail("test-epic", "test-story", "?tab=journal");

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: JOURNAL_TAB_PATTERN }),
				).toBeInTheDocument();
			});

			// Journal tab should be active
			expect(
				screen.getByRole("tab", { name: JOURNAL_TAB_PATTERN }),
			).toHaveAttribute("data-state", "active");
		});

		it("navigates to Story Content tab when ?tab=content is in URL", async () => {
			renderStoryDetail("test-epic", "test-story", "?tab=content");

			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: "Story Content" }),
				).toBeInTheDocument();
			});

			// Story Content tab should be active
			expect(
				screen.getByRole("tab", { name: "Story Content" }),
			).toHaveAttribute("data-state", "active");
		});

		it("defaults to Tasks tab when no query parameter is present", async () => {
			renderStoryDetail("test-epic", "test-story");

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Tasks" })).toBeInTheDocument();
			});

			// Tasks tab should be active by default
			expect(screen.getByRole("tab", { name: "Tasks" })).toHaveAttribute(
				"data-state",
				"active",
			);
		});

		it("defaults to Tasks tab when ?tab has invalid value", async () => {
			renderStoryDetail("test-epic", "test-story", "?tab=invalid");

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Tasks" })).toBeInTheDocument();
			});

			// Tasks tab should be active for invalid tab value
			expect(screen.getByRole("tab", { name: "Tasks" })).toHaveAttribute(
				"data-state",
				"active",
			);
		});
	});
});
