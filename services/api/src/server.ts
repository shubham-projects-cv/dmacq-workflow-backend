// services/api/src/server.ts

import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

import { WorkflowJSON, WorkflowEvent } from "shared";
import { getTemporalClient } from "./temporalClient";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

const PORT = 4000;

/* ================= SSE CLIENTS ================= */

type Client = {
  id: string;
  res: express.Response;
};

const clients: Client[] = [];

/* ================= BROADCAST ================= */

function broadcast(event: WorkflowEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;

  clients.forEach((client) => {
    client.res.write(data);
  });
}

/* ================= STREAM ================= */

app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  const clientId = uuidv4();

  const client: Client = {
    id: clientId,
    res,
  };

  clients.push(client);

  console.log("Client connected:", clientId);

  req.on("close", () => {
    console.log("Client disconnected:", clientId);

    const index = clients.findIndex((c) => c.id === clientId);

    if (index !== -1) clients.splice(index, 1);
  });
});

/* ================= PUBLISH ================= */

app.post("/workflow/publish", async (req, res) => {
  try {
    const { approver, user } = req.body;

    if (!approver || !user) {
      return res.status(400).json({
        success: false,
        error: "approver and user required",
      });
    }

    const client = await getTemporalClient();

    const workflowId = crypto.randomUUID();

    await client.workflow.start("mainWorkflow", {
      args: [approver, user],
      taskQueue: "workflow-task-queue",
      workflowId,
    });

    res.json({
      success: true,
      workflowId,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
    });
  }
});

/* ================= APPROVE / DENY ================= */

app.post("/workflow/respond", async (req, res) => {
  try {
    const { workflowId, result } = req.body;

    if (!workflowId || !result) {
      return res.status(400).json({
        success: false,
        error: "workflowId and result required",
      });
    }

    const temporal = await getTemporalClient();

    const handle = temporal.workflow.getHandle(workflowId);

    await handle.signal("approvalSignal", result);

    console.log("Signal sent:", workflowId, result);

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Failed to signal workflow",
    });
  }
});

app.get("/workflow/approve", async (req, res) => {
  const wid = req.query.wid as string;

  const temporal = await getTemporalClient();
  const h = temporal.workflow.getHandle(wid);

  await h.signal("approvalSignal", "approve");

  res.send("Approved ✅");
});

app.get("/workflow/deny", async (req, res) => {
  const wid = req.query.wid as string;

  const temporal = await getTemporalClient();
  const h = temporal.workflow.getHandle(wid);

  await h.signal("approvalSignal", "deny");

  res.send("Denied ❌");
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
