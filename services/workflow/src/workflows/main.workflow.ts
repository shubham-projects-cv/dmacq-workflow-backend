import {
  defineSignal,
  setHandler,
  proxyActivities,
  workflowInfo,
  sleep,
} from "@temporalio/workflow";
import type * as Events from "../activities/event.activity";
import type * as Email from "../activities/email.activity";

const { sendApprovalEmail, sendFinalEmail } = proxyActivities<typeof Email>({
  startToCloseTimeout: "1 minute",
});

const { emitEvent } = proxyActivities<typeof Events>({
  startToCloseTimeout: "1 minute",
});

export const approvalSignal = defineSignal<[string]>("approvalSignal");

export async function mainWorkflow(approver: string, user: string) {
  let decision: string | null = null;

  setHandler(approvalSignal, (v) => {
    decision = v;
  });

  const wid = workflowInfo().workflowId;

  await emitEvent(wid, "STARTED");

  await sendApprovalEmail(approver, wid);

  await emitEvent(wid, "WAITING", "Waiting for approval");

  while (!decision) {
    await sleep(1000);
  }

  await emitEvent(wid, "DECISION", decision);

  await sendFinalEmail(user, decision);

  await emitEvent(wid, "COMPLETED");
}
