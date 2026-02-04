// shared/src/types/events.ts

export type WorkflowStatus =
  | "STARTED"
  | "WAITING"
  | "DECISION"
  | "EMAIL_SENT"
  | "COMPLETED"
  | "DENIED"
  | "FAILED";

export type WorkflowEvent = {
  workflowId: string;
  status: WorkflowStatus;
  message?: string;

  meta?: {
    to?: string;
    approverId?: string;
    level?: number;
  };

  timestamp: string;
};
