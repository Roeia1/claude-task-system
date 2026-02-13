import { showApiErrorToast } from '@/lib/toast-utils';
import type { Epic, StoryDetail } from '@/types/dashboard';

/** HTTP 404 Not Found status code */
const HTTP_NOT_FOUND = 404;

/** Result type for fetch response processing */
type FetchResult = { type: 'notFound' } | { type: 'error' } | { type: 'success'; data: unknown };

/** Process fetch response into a result type */
async function processFetchResponse(response: Response): Promise<FetchResult> {
  if (response.status === HTTP_NOT_FOUND) {
    return { type: 'notFound' };
  }
  if (!response.ok) {
    return { type: 'error' };
  }
  return { type: 'success', data: await response.json() };
}

/** Handle fetch error with toast notification */
function handleFetchError(
  url: string,
  label: string,
  err: unknown,
  setError: (e: string) => void,
): void {
  setError(`Failed to load ${label}`);
  showApiErrorToast(url, err instanceof Error ? err.message : 'Unknown error');
}

/** Type assertion for StoryDetail API response */
function assertStoryDetail(data: unknown): asserts data is StoryDetail {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid story data: expected an object');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') {
    throw new Error('Invalid story data: missing required fields (id, title)');
  }
}

/** Type assertion for Epic API response */
function assertEpic(data: unknown): asserts data is Epic {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid epic data: expected an object');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') {
    throw new Error('Invalid epic data: missing required fields (id, title)');
  }
}

export { processFetchResponse, handleFetchError, assertStoryDetail, assertEpic };
export type { FetchResult };
