import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

import { WorkflowEvent } from "shared";
import { getTemporalClient } from "./temporalClient";

const app = express();

/* ================= CONFIG ================= */

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

const PORT = 4000;

/* ================= TYPES ================= */

type WorkflowNode = {
  id: string;
  type: string;
  data?: {
    email?: string;
  };
};

type WorkflowEdge = {
  source: string;
  target: string;
  data?: {
    condition?: "approve" | "deny";
  };
};

type WorkflowPayload = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

/* ================= SSE ================= */

type Client = {
  id: string;
  res: express.Response;
};

const clients: Client[] = [];

/* ================= BROADCAST ================= */

function broadcast(event: WorkflowEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;

  clients.forEach((c) => {
    c.res.write(data);
  });
}

/* ================= STREAM ================= */

app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  const id = uuidv4();

  clients.push({
    id,
    res,
  });

  console.log("SSE Connected:", id);

  req.on("close", () => {
    const i = clients.findIndex((c) => c.id === id);

    if (i !== -1) clients.splice(i, 1);

    console.log("SSE Disconnected:", id);
  });
});

/* ================= PUBLISH ================= */

app.post("/workflow/publish", async (req, res) => {
  try {
    const payload = req.body;

    // Support both formats
    const workflow: WorkflowPayload = payload.workflow ?? payload;

    if (!workflow?.nodes || !workflow?.edges) {
      return res.status(400).json({
        success: false,
        error: "Invalid workflow data",
      });
    }

    /* ---------- Approval Node ---------- */

    const approvalNode = workflow.nodes.find((n) => n.type === "approval");

    const approverEmail = approvalNode?.data?.email;

    if (!approverEmail) {
      return res.status(400).json({
        success: false,
        error: "Approval email missing",
      });
    }

    /* ---------- Email Nodes Map ---------- */

    const emailMap = new Map<string, string>();

    for (const node of workflow.nodes) {
      if (node.type === "email" && node.data?.email) {
        emailMap.set(node.id, node.data.email);
      }
    }

    /* ---------- Find Targets ---------- */

    let approveUser = "";
    let denyUser = "";

    for (const edge of workflow.edges) {
      if (edge.data?.condition === "approve") {
        approveUser = emailMap.get(edge.target) ?? "";
      }

      if (edge.data?.condition === "deny") {
        denyUser = emailMap.get(edge.target) ?? "";
      }
    }

    if (!approveUser || !denyUser) {
      return res.status(400).json({
        success: false,
        error: "Approve/Deny emails missing",
      });
    }

    /* ---------- Start Temporal ---------- */

    const temporal = await getTemporalClient();

    const workflowId = crypto.randomUUID();

    await temporal.workflow.start("mainWorkflow", {
      taskQueue: "workflow-task-queue",
      workflowId,

      args: [approverEmail, approveUser, denyUser],
    });

    console.log("Workflow started:", workflowId);

    return res.json({
      success: true,
      workflowId,
    });
  } catch (err) {
    console.error("Publish error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to publish workflow",
    });
  }
});

/* ================= RESPOND ================= */

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

    console.log("Signal:", workflowId, result);

    return res.json({ success: true });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: "Signal failed",
    });
  }
});

/* ================= EMAIL LINKS ================= */

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

/* ================= INTERNAL EVENT ================= */

app.post("/internal/event", (req, res) => {
  const { workflowId, status, message } = req.body;

  const event: WorkflowEvent = {
    workflowId,
    status,
    message,
    timestamp: new Date().toISOString(),
  };

  broadcast(event);

  res.json({ success: true });
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
