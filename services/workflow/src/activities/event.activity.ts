import axios from "axios";

/* ================= Types ================= */

type EventMeta = {
  to?: string;

  currentApproverId?: string | null;
  currentEdgeId?: string | null;

  completedApproverIds?: string[];
  completedEdgeIds?: string[];

  // ✅ Timing support
  waitStartedAt?: string;
  waitDurations?: Record<string, number>;
};

type EventPayload = {
  workflowId: string;
  status: string;
  message?: string;
  meta?: EventMeta;
};

/* ================= Emit ================= */

export async function emitEvent(
  workflowId: string,
  status: string,
  message?: string,
  meta?: EventMeta,
): Promise<void> {
  const payload: EventPayload = {
    workflowId,
    status,
    message,
    meta,
  };

  await axios.post("http://api:4000/internal/event", payload);
}
