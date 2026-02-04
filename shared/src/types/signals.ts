export type ApprovalResult = "approve" | "deny";

export type ApprovalSignal = {
  workflowId: string;
  result: ApprovalResult;
  decidedAt: string;
};
