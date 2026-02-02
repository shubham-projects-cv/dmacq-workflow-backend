// shared/src/types/events.ts

export type WorkflowStatus =
  | "STARTED"
  | "APPROVAL_EMAIL_SENT"
  | "WAITING_FOR_APPROVAL"
  | "APPROVED"
  | "DENIED"
  | "USER_EMAIL_SENT"
  | "COMPLETED"
  | "FAILED";

export type WorkflowEvent = {
  workflowId: string;
  status: WorkflowStatus;
  message?: string;
  timestamp: string;
};
