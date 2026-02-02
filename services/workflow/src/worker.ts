// services/workflow/src/worker.ts

import { Worker } from "@temporalio/worker";
import * as workflows from "./workflows";

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities: {},
    taskQueue: "workflow-task-queue",
  });

  console.log("Temporal worker started");

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
