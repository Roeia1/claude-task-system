import { describe, expectTypeOf, it } from 'vitest';
import type { SagaWorkerMessage } from './worker-message.ts';

describe('SagaWorkerMessage', () => {
  it('should have saga_worker as type discriminant', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'pipeline_start',
      timestamp: '2026-02-11T00:00:00Z',
      storyId: 'auth-setup-db',
    };
    expectTypeOf(msg.type).toEqualTypeOf<'saga_worker'>();
  });

  it('should support pipeline_start subtype', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'pipeline_start',
      timestamp: '2026-02-11T00:00:00Z',
      storyId: 'auth-setup-db',
    };
    expectTypeOf(msg).toMatchTypeOf<SagaWorkerMessage>();
  });

  it('should support pipeline_step subtype', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'pipeline_step',
      timestamp: '2026-02-11T00:00:00Z',
      step: 1,
      message: 'Setup worktree',
    };
    expectTypeOf(msg).toMatchTypeOf<SagaWorkerMessage>();
  });

  it('should support pipeline_end subtype', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'pipeline_end',
      timestamp: '2026-02-11T00:00:00Z',
      storyId: 'auth-setup-db',
      status: 'completed',
      exitCode: 0,
      cycles: 3,
      elapsedMinutes: 12.5,
    };
    expectTypeOf(msg).toMatchTypeOf<SagaWorkerMessage>();
  });

  it('should support cycle_start subtype', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'cycle_start',
      timestamp: '2026-02-11T00:00:00Z',
      cycle: 1,
      maxCycles: 10,
    };
    expectTypeOf(msg).toMatchTypeOf<SagaWorkerMessage>();
  });

  it('should support cycle_end subtype', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'cycle_end',
      timestamp: '2026-02-11T00:00:00Z',
      cycle: 1,
      exitCode: 0,
    };
    expectTypeOf(msg).toMatchTypeOf<SagaWorkerMessage>();
  });

  it('should allow null exitCode in cycle_end', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'cycle_end',
      timestamp: '2026-02-11T00:00:00Z',
      cycle: 1,
      exitCode: null,
    };
    expectTypeOf(msg).toMatchTypeOf<SagaWorkerMessage>();
  });

  it('should allow incomplete status in pipeline_end', () => {
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'pipeline_end',
      timestamp: '2026-02-11T00:00:00Z',
      storyId: 'auth-setup-db',
      status: 'incomplete',
      exitCode: 2,
      cycles: 10,
      elapsedMinutes: 60.0,
    };
    expectTypeOf(msg).toMatchTypeOf<SagaWorkerMessage>();
  });
});
