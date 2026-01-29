import { beforeAll, expect } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';
import * as previewAnnotations from './preview';

// Declare globals for visual snapshot testing
// These will be populated by vitest.visual.setup.ts when running visual tests
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __vitest_page__: any;
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __vitest_expect__: any;
}

// Set expect globally for visual snapshot tests
globalThis.__vitest_expect__ = expect;

const annotations = setProjectAnnotations([previewAnnotations]);

// Run Storybook's beforeAll hook
if (annotations.beforeAll) {
  beforeAll(annotations.beforeAll);
}
