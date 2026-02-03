import axios from "axios";

/* ================= Types ================= */

type EventPayload = {
  workflowId: string;
  status: string;
  message?: string;
  meta?: Record<string, string>;
};

/* ================= Emit ================= */

export async function emitEvent(
  workflowId: string,
  status: string,
  message?: string,
  meta?: Record<string, string>,
): Promise<void> {
  const payload: EventPayload = {
    workflowId,
    status,
    message,
    meta,
  };

  await axios.post("http://api:4000/internal/event", payload);
}
