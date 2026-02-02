import axios from "axios";

export async function emitEvent(
  workflowId: string,
  status: string,
  message?: string,
) {
  await axios.post("http://localhost:4000/internal/event", {
    workflowId,
    status,
    message,
  });
}
