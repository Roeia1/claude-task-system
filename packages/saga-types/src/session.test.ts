import { describe, expect, it } from 'vitest';
import {
  SessionStatusSchema,
  SessionSchema,
  type SessionStatus,
  type Session,
} from './session';

describe('SessionStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses: SessionStatus[] = ['running', 'stopped', 'unknown'];
    for (const status of validStatuses) {
      expect(SessionStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid status values', () => {
    expect(() => SessionStatusSchema.parse('invalid')).toThrow();
    expect(() => SessionStatusSchema.parse('')).toThrow();
    expect(() => SessionStatusSchema.parse(null)).toThrow();
  });
});

describe('SessionSchema', () => {
  it('parses minimal valid session', () => {
    const session: Session = {
      name: 'saga-worker-123',
      status: 'running',
    };
    expect(SessionSchema.parse(session)).toEqual(session);
  });

  it('parses session with all optional fields', () => {
    const session: Session = {
      name: 'saga-worker-456',
      status: 'stopped',
      createdAt: '2026-02-02T12:00:00Z',
      epicSlug: 'my-epic',
      storySlug: 'my-story',
    };
    expect(SessionSchema.parse(session)).toEqual(session);
  });

  it('requires name and status', () => {
    expect(() => SessionSchema.parse({ status: 'running' })).toThrow();
    expect(() => SessionSchema.parse({ name: 'test' })).toThrow();
    expect(() => SessionSchema.parse({})).toThrow();
  });
});
