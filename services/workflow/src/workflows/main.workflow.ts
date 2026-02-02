// services/workflow/src/workflows/main.workflow.ts

import { defineSignal, setHandler, sleep } from "@temporalio/workflow";

/* ================= SIGNAL ================= */

export const approvalSignal = defineSignal<[string]>("approvalSignal");

/* ================= WORKFLOW ================= */

export async function mainWorkflow(): Promise<void> {
  let decision: string | null = null;

  /* Listen for signal */
  setHandler(approvalSignal, (result: string) => {
    decision = result;
  });

  console.log("Workflow: STARTED");

  /* Simulate sending approval mail */
  console.log("Workflow: Sending approval email");

  await sleep(2000);

  console.log("Workflow: WAITING FOR APPROVAL");

  /* Wait until decision comes */
  while (decision === null) {
    await sleep(1000);
  }

  console.log("Workflow: Decision =", decision);

  /* Simulate final mail */
  console.log("Workflow: Sending final email");

  await sleep(2000);

  console.log("Workflow: COMPLETED");
}
