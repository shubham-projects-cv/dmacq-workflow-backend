// services/workflow/src/worker.ts

import { Worker } from "@temporalio/worker";
import * as emailActivities from "./activities/email.activity";
import * as workflows from "./workflows";
import * as eventActivities from "./activities/event.activity";

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities: {
      ...emailActivities,
      ...eventActivities,
    },
    taskQueue: "workflow-task-queue",
  });

  console.log("Temporal worker started");

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
