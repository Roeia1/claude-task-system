/**
 * SAGA worker message types for JSONL output.
 *
 * These messages use `type: 'saga_worker'` to cleanly separate from
 * Agent SDK message types ('assistant', 'result', 'system', etc.).
 * The `subtype` field discriminates between different worker events.
 */

export type SagaWorkerMessage =
  | {
      type: 'saga_worker';
      subtype: 'pipeline_start';
      timestamp: string;
      storyId: string;
    }
  | {
      type: 'saga_worker';
      subtype: 'pipeline_step';
      timestamp: string;
      step: number;
      message: string;
    }
  | {
      type: 'saga_worker';
      subtype: 'pipeline_end';
      timestamp: string;
      storyId: string;
      status: 'completed' | 'incomplete';
      exitCode: number;
      cycles: number;
      elapsedMinutes: number;
    }
  | {
      type: 'saga_worker';
      subtype: 'cycle_start';
      timestamp: string;
      cycle: number;
      maxCycles: number;
    }
  | {
      type: 'saga_worker';
      subtype: 'cycle_end';
      timestamp: string;
      cycle: number;
      exitCode: number | null;
    };
