import { setProjectAnnotations } from "@storybook/react-vite";
import { beforeAll, expect } from "vitest";
import previewAnnotations from "./preview.tsx";

// Types are declared in src/types/vitest-globals.d.ts

const annotations = setProjectAnnotations([previewAnnotations]);

// Set expect globally for visual snapshot tests and run Storybook's beforeAll hook
beforeAll(async () => {
	globalThis.__vitest_expect__ = expect;
	if (annotations.beforeAll) {
		await annotations.beforeAll();
	}
});
