import { describe, expect, it } from 'vitest';
import { type Session, SessionSchema, type SessionStatus, SessionStatusSchema } from './session.ts';

describe('SessionStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses: SessionStatus[] = ['running', 'completed'];
    for (const status of validStatuses) {
      expect(SessionStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid status values', () => {
    expect(() => SessionStatusSchema.parse('invalid')).toThrow();
    expect(() => SessionStatusSchema.parse('stopped')).toThrow(); // old value, no longer valid
    expect(() => SessionStatusSchema.parse('unknown')).toThrow(); // old value, no longer valid
    expect(() => SessionStatusSchema.parse('')).toThrow();
    expect(() => SessionStatusSchema.parse(null)).toThrow();
  });
});

describe('SessionSchema', () => {
  const validRunningSession: Session = {
    name: 'saga__my-epic__my-story__12345',
    epicSlug: 'my-epic',
    storySlug: 'my-story',
    status: 'running',
    outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
    outputAvailable: true,
    startTime: '2026-02-02T12:00:00Z',
  };

  it('parses a running session', () => {
    expect(SessionSchema.parse(validRunningSession)).toEqual(validRunningSession);
  });

  it('parses a completed session with endTime', () => {
    const completedSession: Session = {
      ...validRunningSession,
      status: 'completed',
      endTime: '2026-02-02T12:30:00Z',
    };
    expect(SessionSchema.parse(completedSession)).toEqual(completedSession);
  });

  it('parses a session with output preview', () => {
    const sessionWithPreview: Session = {
      ...validRunningSession,
      outputPreview: 'Last few lines of output...\nMore output here.',
    };
    expect(SessionSchema.parse(sessionWithPreview)).toEqual(sessionWithPreview);
  });

  it('parses a session with output not available', () => {
    const sessionNoOutput: Session = {
      ...validRunningSession,
      outputAvailable: false,
    };
    expect(SessionSchema.parse(sessionNoOutput)).toEqual(sessionNoOutput);
  });

  it('requires all mandatory fields', () => {
    // missing name
    expect(() =>
      SessionSchema.parse({
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/output.out',
        outputAvailable: true,
        startTime: '2026-02-02T12:00:00Z',
      }),
    ).toThrow();

    // missing epicSlug
    expect(() =>
      SessionSchema.parse({
        name: 'saga__my-epic__my-story__12345',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/output.out',
        outputAvailable: true,
        startTime: '2026-02-02T12:00:00Z',
      }),
    ).toThrow();

    // missing storySlug
    expect(() =>
      SessionSchema.parse({
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        status: 'running',
        outputFile: '/tmp/output.out',
        outputAvailable: true,
        startTime: '2026-02-02T12:00:00Z',
      }),
    ).toThrow();

    // missing status
    expect(() =>
      SessionSchema.parse({
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        outputFile: '/tmp/output.out',
        outputAvailable: true,
        startTime: '2026-02-02T12:00:00Z',
      }),
    ).toThrow();

    // missing outputFile
    expect(() =>
      SessionSchema.parse({
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputAvailable: true,
        startTime: '2026-02-02T12:00:00Z',
      }),
    ).toThrow();

    // missing outputAvailable
    expect(() =>
      SessionSchema.parse({
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/output.out',
        startTime: '2026-02-02T12:00:00Z',
      }),
    ).toThrow();

    // missing startTime
    expect(() =>
      SessionSchema.parse({
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/output.out',
        outputAvailable: true,
      }),
    ).toThrow();
  });
});
