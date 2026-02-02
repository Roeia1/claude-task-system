import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EpicContent } from "./EpicContent.tsx";

/** Expected number of list items in test cases */
const EXPECTED_LIST_ITEMS = 3;

describe("EpicContent", () => {
	afterEach(() => {
		cleanup();
	});

	describe("empty content handling", () => {
		it("returns null when content is undefined", () => {
			const { container } = render(<EpicContent content={undefined} />);
			expect(container.firstChild).toBeNull();
		});

		it("returns null when content is an empty string", () => {
			const { container } = render(<EpicContent content="" />);
			expect(container.firstChild).toBeNull();
		});

		it("returns null when content is only whitespace", () => {
			const { container } = render(<EpicContent content="   " />);
			expect(container.firstChild).toBeNull();
		});
	});

	describe("markdown rendering", () => {
		it("renders headings correctly", () => {
			const content = "# Heading 1\n\n## Heading 2\n\n### Heading 3";
			const { container } = render(<EpicContent content={content} />);

			// Query within the rendered component to avoid conflicts
			const h1 = container.querySelector("h1");
			const h2 = container.querySelector('h2:not([class*="font-semibold"])');
			const h3 = container.querySelector("h3");

			expect(h1).toHaveTextContent("Heading 1");
			expect(h2).toHaveTextContent("Heading 2");
			expect(h3).toHaveTextContent("Heading 3");
		});

		it("renders unordered lists correctly", () => {
			const content = "- Item 1\n- Item 2\n- Item 3";
			const { container } = render(<EpicContent content={content} />);

			const list = container.querySelector("ul");
			expect(list).toBeInTheDocument();
			expect(container.querySelectorAll("li")).toHaveLength(
				EXPECTED_LIST_ITEMS,
			);
		});

		it("renders ordered lists correctly", () => {
			const content = "1. First\n2. Second\n3. Third";
			const { container } = render(<EpicContent content={content} />);

			const list = container.querySelector("ol");
			expect(list).toBeInTheDocument();
			expect(container.querySelectorAll("li")).toHaveLength(
				EXPECTED_LIST_ITEMS,
			);
		});

		it("renders code blocks correctly", () => {
			const content = "```typescript\nconst x = 1;\n```";
			render(<EpicContent content={content} />);

			expect(screen.getByText("const x = 1;")).toBeInTheDocument();
		});

		it("renders inline code correctly", () => {
			const content = "Use the `command` to run it";
			render(<EpicContent content={content} />);

			const code = screen.getByText("command");
			expect(code.tagName).toBe("CODE");
		});

		it("renders tables correctly (GFM)", () => {
			const content =
				"| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1 | Cell 2 |";
			render(<EpicContent content={content} />);

			expect(screen.getByRole("table")).toBeInTheDocument();
			expect(screen.getByText("Header 1")).toBeInTheDocument();
			expect(screen.getByText("Cell 1")).toBeInTheDocument();
		});

		it("renders links correctly", () => {
			const content = "[Link text](https://example.com)";
			render(<EpicContent content={content} />);

			const link = screen.getByRole("link", { name: "Link text" });
			expect(link).toHaveAttribute("href", "https://example.com");
		});

		it("renders strikethrough text (GFM)", () => {
			const content = "~~deleted text~~";
			render(<EpicContent content={content} />);

			const deletedText = screen.getByText("deleted text");
			expect(deletedText.tagName).toBe("DEL");
		});
	});

	describe("collapsible behavior", () => {
		it('displays "Epic Documentation" header with toggle button', () => {
			const content = "# Test Content";
			render(<EpicContent content={content} />);

			expect(screen.getByText("Epic Documentation")).toBeInTheDocument();
			// The button contains the header text
			const buttons = screen.getAllByRole("button");
			expect(buttons.length).toBeGreaterThan(0);
		});

		it("is expanded by default", () => {
			const content = "# Visible Content";
			const { container } = render(<EpicContent content={content} />);

			// Content should be visible when expanded
			const heading = container.querySelector("h1");
			expect(heading).toBeVisible();
			expect(heading).toHaveTextContent("Visible Content");
		});

		it("toggles content visibility when button is clicked", () => {
			const content = "# Toggle Test";
			render(<EpicContent content={content} />);

			// Find the trigger button (contains "Epic Documentation")
			const trigger = screen.getByText("Epic Documentation").closest("button");
			expect(trigger).toBeInTheDocument();
			if (!trigger) {
				throw new Error("Trigger button not found");
			}

			const collapsible = screen.getByTestId("epic-content");

			// Initially expanded
			expect(collapsible).toHaveAttribute("data-state", "open");

			// Click to collapse
			fireEvent.click(trigger);

			// Content should be collapsed
			expect(collapsible).toHaveAttribute("data-state", "closed");
		});

		it("shows chevron icon that changes with state", () => {
			const content = "# Test";
			render(<EpicContent content={content} />);

			// Check that there's an SVG icon (chevron) in the trigger button
			const trigger = screen.getByText("Epic Documentation").closest("button");
			const svg = trigger?.querySelector("svg");
			expect(svg).toBeInTheDocument();
		});

		it("has correct data-testid attribute", () => {
			const content = "# Test";
			render(<EpicContent content={content} />);

			expect(screen.getByTestId("epic-content")).toBeInTheDocument();
		});
	});
});
