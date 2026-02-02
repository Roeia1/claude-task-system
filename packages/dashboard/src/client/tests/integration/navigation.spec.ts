import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import {
	createMockEpic,
	createMockEpicSummary,
	createMockStoryDetail,
	createMockTask,
	mockEpicDetail,
	mockEpicList,
	mockStoryDetail,
} from "../utils/mock-api.ts";

/**
 * Navigation tests for the dashboard.
 * Tests navigation between epic list, epic detail, and story detail pages.
 */
test.describe("Navigation", () => {
	test.describe("Epic List to Epic Detail", () => {
		test("should navigate from epic list to epic detail when clicking an epic card", async ({
			page,
		}) => {
			// Setup mock data
			const epic = createMockEpicSummary({
				slug: "test-epic",
				title: "Test Epic",
				storyCounts: {
					ready: 1,
					inProgress: 1,
					blocked: 0,
					completed: 2,
					total: 4,
				},
			});
			const epicDetail = createMockEpic({
				slug: "test-epic",
				title: "Test Epic",
				stories: [
					createMockStoryDetail({
						slug: "story-1",
						title: "Story One",
						status: "ready",
						epicSlug: "test-epic",
					}),
				],
			});

			await mockEpicList(page, [epic]);
			await mockEpicDetail(page, epicDetail);

			// Navigate to epic list
			await page.goto("/");
			await expect(page.getByTestId("epic-card-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await expect(page.getByRole("heading", { name: "Epics" })).toBeVisible();
			await expect(page.getByText("Test Epic")).toBeVisible();

			// Click on the epic card to navigate
			await page.getByText("Test Epic").click();

			// Verify we're on the epic detail page
			await expect(page).toHaveURL("/epic/test-epic");
			await expect(
				page.getByRole("heading", { name: "Test Epic" }),
			).toBeVisible();
		});

		test("should display epic progress after navigation", async ({ page }) => {
			const epic = createMockEpicSummary({
				slug: "progress-epic",
				title: "Progress Epic",
				storyCounts: {
					ready: 1,
					inProgress: 2,
					blocked: 0,
					completed: 3,
					total: 6,
				},
			});
			const epicDetail = createMockEpic({
				slug: "progress-epic",
				title: "Progress Epic",
				storyCounts: {
					ready: 1,
					inProgress: 2,
					blocked: 0,
					completed: 3,
					total: 6,
				},
				stories: [],
			});

			await mockEpicList(page, [epic]);
			await mockEpicDetail(page, epicDetail);

			await page.goto("/");
			await expect(page.getByTestId("epic-card-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await page.getByText("Progress Epic").click();
			await expect(page.getByTestId("epic-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Verify progress information is displayed
			await expect(page.getByText("3/6 stories completed")).toBeVisible();
		});

		test("should navigate to correct epic when multiple epics exist", async ({
			page,
		}) => {
			const epics = [
				createMockEpicSummary({ slug: "epic-alpha", title: "Epic Alpha" }),
				createMockEpicSummary({ slug: "epic-beta", title: "Epic Beta" }),
				createMockEpicSummary({ slug: "epic-gamma", title: "Epic Gamma" }),
			];

			await mockEpicList(page, epics);
			await mockEpicDetail(
				page,
				createMockEpic({ slug: "epic-beta", title: "Epic Beta", stories: [] }),
			);

			await page.goto("/");
			await expect(page.getByTestId("epic-card-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Click on the middle epic
			await page.getByText("Epic Beta").click();

			// Verify correct URL
			await expect(page).toHaveURL("/epic/epic-beta");
		});
	});

	test.describe("Epic Detail to Story Detail", () => {
		test("should navigate from epic detail to story detail when clicking a story card", async ({
			page,
		}) => {
			const epicDetail = createMockEpic({
				slug: "test-epic",
				title: "Test Epic",
				stories: [
					createMockStoryDetail({
						slug: "my-story",
						title: "My Story",
						status: "in_progress",
						epicSlug: "test-epic",
						tasks: [
							createMockTask({
								id: "t1",
								title: "Task 1",
								status: "completed",
							}),
						],
					}),
				],
			});
			const storyDetail = createMockStoryDetail({
				slug: "my-story",
				title: "My Story",
				status: "in_progress",
				epicSlug: "test-epic",
				tasks: [
					createMockTask({ id: "t1", title: "Task 1", status: "completed" }),
				],
			});

			await mockEpicDetail(page, epicDetail);
			await mockStoryDetail(page, storyDetail);

			// Navigate directly to epic detail
			await page.goto("/epic/test-epic");
			await expect(page.getByTestId("epic-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await expect(page.getByText("My Story")).toBeVisible();

			// Click on the story card
			await page.getByText("My Story").click();

			// Verify navigation to story detail
			await expect(page).toHaveURL("/epic/test-epic/story/my-story");
			await expect(
				page.getByRole("heading", { name: "My Story" }),
			).toBeVisible();
		});

		test("should show story status badge after navigation", async ({
			page,
		}) => {
			const epicDetail = createMockEpic({
				slug: "epic-1",
				title: "Epic One",
				stories: [
					createMockStoryDetail({
						slug: "blocked-story",
						title: "Blocked Story",
						status: "blocked",
						epicSlug: "epic-1",
					}),
				],
			});
			const storyDetail = createMockStoryDetail({
				slug: "blocked-story",
				title: "Blocked Story",
				status: "blocked",
				epicSlug: "epic-1",
			});

			await mockEpicDetail(page, epicDetail);
			await mockStoryDetail(page, storyDetail);

			await page.goto("/epic/epic-1");
			await expect(page.getByTestId("epic-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await page.getByText("Blocked Story").click();
			await expect(page.getByTestId("story-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Verify the status badge shows "Blocked"
			await expect(page.getByText("Blocked", { exact: true })).toBeVisible();
		});
	});

	test.describe("Breadcrumb Navigation", () => {
		test("should show breadcrumb on epic detail page", async ({ page }) => {
			const epicDetail = createMockEpic({
				slug: "my-epic",
				title: "My Epic",
				stories: [],
			});

			await mockEpicDetail(page, epicDetail);

			await page.goto("/epic/my-epic");
			await expect(page.getByTestId("epic-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Verify breadcrumb shows "Epics" link and current epic
			const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
			await expect(breadcrumb).toBeVisible();
			await expect(breadcrumb.getByText("Epics")).toBeVisible();
			await expect(breadcrumb.getByText("my-epic")).toBeVisible();
		});

		test("should navigate back to epic list via breadcrumb", async ({
			page,
		}) => {
			const epics = [
				createMockEpicSummary({ slug: "test-epic", title: "Test Epic" }),
			];
			const epicDetail = createMockEpic({
				slug: "test-epic",
				title: "Test Epic",
				stories: [],
			});

			await mockEpicList(page, epics);
			await mockEpicDetail(page, epicDetail);

			await page.goto("/epic/test-epic");
			await expect(page.getByTestId("epic-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Click on "Epics" in breadcrumb
			const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
			await breadcrumb.getByText("Epics").click();

			// Verify navigation back to home
			await expect(page).toHaveURL("/");
			await expect(page.getByRole("heading", { name: "Epics" })).toBeVisible();
		});

		test("should show full breadcrumb path on story detail page", async ({
			page,
		}) => {
			const epicDetail = createMockEpic({
				slug: "parent-epic",
				title: "Parent Epic",
				stories: [
					createMockStoryDetail({
						slug: "child-story",
						title: "Child Story",
						status: "ready",
						epicSlug: "parent-epic",
					}),
				],
			});
			const storyDetail = createMockStoryDetail({
				slug: "child-story",
				title: "Child Story",
				status: "ready",
				epicSlug: "parent-epic",
			});

			await mockEpicDetail(page, epicDetail);
			await mockStoryDetail(page, storyDetail);

			await page.goto("/epic/parent-epic/story/child-story");
			await expect(page.getByTestId("story-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Verify breadcrumb shows full path
			const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
			await expect(breadcrumb).toBeVisible();
			await expect(breadcrumb.getByText("Epics")).toBeVisible();
			await expect(breadcrumb.getByText("parent-epic")).toBeVisible();
			await expect(breadcrumb.getByText("child-story")).toBeVisible();
		});

		test("should navigate to epic detail via breadcrumb from story detail", async ({
			page,
		}) => {
			const epicDetail = createMockEpic({
				slug: "nav-epic",
				title: "Navigation Epic",
				stories: [
					createMockStoryDetail({
						slug: "nav-story",
						title: "Navigation Story",
						status: "ready",
						epicSlug: "nav-epic",
					}),
				],
			});
			const storyDetail = createMockStoryDetail({
				slug: "nav-story",
				title: "Navigation Story",
				status: "ready",
				epicSlug: "nav-epic",
			});

			await mockEpicDetail(page, epicDetail);
			await mockStoryDetail(page, storyDetail);

			await page.goto("/epic/nav-epic/story/nav-story");
			await expect(page.getByTestId("story-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// Click on the epic name in breadcrumb
			const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
			await breadcrumb.getByText("nav-epic").click();

			// Verify navigation to epic detail
			await expect(page).toHaveURL("/epic/nav-epic");
		});
	});

	test.describe("Full Navigation Flow", () => {
		test("should complete full navigation flow: list -> epic -> story -> back to epic -> back to list", async ({
			page,
		}) => {
			const epics = [
				createMockEpicSummary({
					slug: "flow-epic",
					title: "Flow Epic",
					storyCounts: {
						ready: 1,
						inProgress: 0,
						blocked: 0,
						completed: 0,
						total: 1,
					},
				}),
			];
			const epicDetail = createMockEpic({
				slug: "flow-epic",
				title: "Flow Epic",
				stories: [
					createMockStoryDetail({
						slug: "flow-story",
						title: "Flow Story",
						status: "ready",
						epicSlug: "flow-epic",
					}),
				],
			});
			const storyDetail = createMockStoryDetail({
				slug: "flow-story",
				title: "Flow Story",
				status: "ready",
				epicSlug: "flow-epic",
				tasks: [
					createMockTask({ id: "t1", title: "Flow Task", status: "pending" }),
				],
			});

			await mockEpicList(page, epics);
			await mockEpicDetail(page, epicDetail);
			await mockStoryDetail(page, storyDetail);

			// Start at epic list
			await page.goto("/");
			await expect(page.getByTestId("epic-card-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await expect(page.getByRole("heading", { name: "Epics" })).toBeVisible();

			// Navigate to epic detail
			await page.getByText("Flow Epic").click();
			await expect(page.getByTestId("epic-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await expect(page).toHaveURL("/epic/flow-epic");
			await expect(
				page.getByRole("heading", { name: "Flow Epic" }),
			).toBeVisible();

			// Navigate to story detail
			await page.getByText("Flow Story").click();
			await expect(page.getByTestId("story-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await expect(page).toHaveURL("/epic/flow-epic/story/flow-story");
			await expect(
				page.getByRole("heading", { name: "Flow Story" }),
			).toBeVisible();
			await expect(page.getByText("Flow Task")).toBeVisible();

			// Navigate back to epic via breadcrumb
			const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
			await breadcrumb.getByText("flow-epic").click();
			await expect(page).toHaveURL("/epic/flow-epic");

			// Navigate back to list via breadcrumb
			await breadcrumb.getByText("Epics").click();
			await expect(page).toHaveURL("/");
			await expect(page.getByRole("heading", { name: "Epics" })).toBeVisible();
		});

		test("should handle browser back/forward navigation", async ({ page }) => {
			const epics = [
				createMockEpicSummary({ slug: "nav-epic", title: "Nav Epic" }),
			];
			const epicDetail = createMockEpic({
				slug: "nav-epic",
				title: "Nav Epic",
				stories: [
					createMockStoryDetail({
						slug: "nav-story",
						title: "Nav Story",
						status: "ready",
						epicSlug: "nav-epic",
					}),
				],
			});
			const storyDetail = createMockStoryDetail({
				slug: "nav-story",
				title: "Nav Story",
				status: "ready",
				epicSlug: "nav-epic",
			});

			await mockEpicList(page, epics);
			await mockEpicDetail(page, epicDetail);
			await mockStoryDetail(page, storyDetail);

			// Navigate forward through app
			await page.goto("/");
			await expect(page.getByTestId("epic-card-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await page.getByText("Nav Epic").click();
			await expect(page.getByTestId("epic-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await page.getByText("Nav Story").click();
			await expect(page.getByTestId("story-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});
			await expect(page).toHaveURL("/epic/nav-epic/story/nav-story");

			// Go back to epic
			await page.goBack();
			await expect(page).toHaveURL("/epic/nav-epic");

			// Go back to list
			await page.goBack();
			await expect(page).toHaveURL("/");

			// Go forward to epic
			await page.goForward();
			await expect(page).toHaveURL("/epic/nav-epic");

			// Go forward to story
			await page.goForward();
			await expect(page).toHaveURL("/epic/nav-epic/story/nav-story");
		});

		test("should navigate correctly via links in story header", async ({
			page,
		}) => {
			const epicDetail = createMockEpic({
				slug: "link-epic",
				title: "Link Epic",
				stories: [
					createMockStoryDetail({
						slug: "link-story",
						title: "Link Story",
						status: "in_progress",
						epicSlug: "link-epic",
					}),
				],
			});
			const storyDetail = createMockStoryDetail({
				slug: "link-story",
				title: "Link Story",
				status: "in_progress",
				epicSlug: "link-epic",
			});

			await mockEpicDetail(page, epicDetail);
			await mockStoryDetail(page, storyDetail);

			await page.goto("/epic/link-epic/story/link-story");
			await expect(page.getByTestId("story-header-skeleton")).toHaveCount(0, {
				timeout: 10_000,
			});

			// The story detail page has an inline link to the epic in the header
			// Find and click the epic link in the story header (in main content, not breadcrumb)
			const epicLink = page
				.getByRole("main")
				.getByRole("link", { name: "link-epic" });
			await epicLink.click();

			// Verify navigation to epic detail
			await expect(page).toHaveURL("/epic/link-epic");
		});
	});
});
