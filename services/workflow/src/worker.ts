import { Worker, NativeConnection } from "@temporalio/worker";

import * as emailActivities from "./activities/email.activity";
import * as workflows from "./workflows";
import * as eventActivities from "./activities/event.activity";

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || "temporal:7233",
  });

  const worker = await Worker.create({
    connection,

    workflowsPath: require.resolve("./workflows"),

    activities: {
      ...emailActivities,
      ...eventActivities,
    },

    taskQueue: "workflow-task-queue",
  });

  console.log("Worker started");

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
