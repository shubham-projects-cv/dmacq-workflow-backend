import {
  defineSignal,
  setHandler,
  proxyActivities,
  workflowInfo,
  sleep,
} from "@temporalio/workflow";

import type * as Events from "../activities/event.activity";
import type * as Email from "../activities/email.activity";

/* ================= ACTIVITIES ================= */

const { sendApprovalEmail, sendFinalEmail } = proxyActivities<typeof Email>({
  startToCloseTimeout: "1 minute",
});

const { emitEvent } = proxyActivities<typeof Events>({
  startToCloseTimeout: "1 minute",
});

/* ================= SIGNAL ================= */

export const approvalSignal = defineSignal<[string]>("approvalSignal");

/* ================= WORKFLOW ================= */

export async function mainWorkflow(
  approver: string,
  approveUser: string,
  denyUser: string,
) {
  let decision: string | null = null;

  setHandler(approvalSignal, (v) => {
    decision = v;
  });

  const wid = workflowInfo().workflowId;

  /* ---------- START ---------- */

  await emitEvent(wid, "STARTED");

  /* ---------- SEND APPROVAL ---------- */

  await sendApprovalEmail(approver, approveUser, denyUser, wid);

  await emitEvent(wid, "WAITING", "Waiting for approval");

  /* ---------- WAIT ---------- */

  while (!decision) {
    await sleep(1000);
  }

  /* ---------- DECISION ---------- */

  await emitEvent(wid, "DECISION", decision);

  /* ---------- FINAL EMAIL ---------- */

  if (decision === "approve") {
    await sendFinalEmail(approveUser, "approved");
  } else {
    await sendFinalEmail(denyUser, "denied");
  }

  /* ---------- COMPLETE ---------- */

  await emitEvent(wid, "COMPLETED");
}
