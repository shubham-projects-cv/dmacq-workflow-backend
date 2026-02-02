// services/workflow/src/workflows/main.workflow.ts

import { proxyActivities, sleep } from "@temporalio/workflow";

export async function mainWorkflow(): Promise<void> {
  console.log("Workflow: STARTED");

  await sleep(2000);

  console.log("Workflow: STEP 1");

  await sleep(2000);

  console.log("Workflow: COMPLETED");
}
