// services/api/src/server.ts

import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

import { WorkflowJSON, WorkflowEvent } from "shared";

const app = express();

app.use(cors());
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

app.post("/workflow/publish", (req, res) => {
  const workflow: WorkflowJSON = req.body;

  const workflowId = uuidv4();

  console.log("Workflow published:", workflowId);

  const event: WorkflowEvent = {
    workflowId,
    status: "STARTED",
    message: "Workflow started",
    timestamp: new Date().toISOString(),
  };

  broadcast(event);

  res.json({
    success: true,
    workflowId,
  });
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
