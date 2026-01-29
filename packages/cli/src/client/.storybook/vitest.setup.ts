import { beforeAll, expect } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';
import * as previewAnnotations from './preview';

// Types are declared in src/types/vitest-globals.d.ts

// Set expect globally for visual snapshot tests
globalThis.__vitest_expect__ = expect;

const annotations = setProjectAnnotations([previewAnnotations]);

// Run Storybook's beforeAll hook
if (annotations.beforeAll) {
  beforeAll(annotations.beforeAll);
}
