import {
  defineSignal,
  setHandler,
  proxyActivities,
  workflowInfo,
  sleep,
} from "@temporalio/workflow";

import type * as Email from "../activities/email.activity";

const { sendApprovalEmail, sendFinalEmail } = proxyActivities<typeof Email>({
  startToCloseTimeout: "1 minute",
});

export const approvalSignal = defineSignal<[string]>("approvalSignal");

export async function mainWorkflow(approver: string, user: string) {
  let decision: string | null = null;

  setHandler(approvalSignal, (v) => {
    decision = v;
  });

  // Send approval mail
  const wid = workflowInfo().workflowId;

  await sendApprovalEmail(approver, wid);

  // Wait
  while (!decision) {
    await sleep(1000);
  }

  // Final mail
  await sendFinalEmail(user, decision);
}
