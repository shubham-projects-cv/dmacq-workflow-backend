// shared/src/types/events.ts

export type WorkflowStatus =
  | "STARTED"
  | "WAITING"
  | "DECISION"
  | "EMAIL_SENT"
  | "COMPLETED"
  | "FAILED";

export type WorkflowEvent = {
  workflowId: string;
  status: WorkflowStatus;
  message?: string;

  // ✅ Added
  meta?: {
    to?: string;
  };

  timestamp: string;
};
