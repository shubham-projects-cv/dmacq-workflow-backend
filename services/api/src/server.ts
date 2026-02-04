import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { WorkflowStatus } from "shared";
import { WorkflowEvent } from "shared";
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

/* ================= SSE ================= */

type Client = {
  id: string;
  res: express.Response;
};

const clients: Client[] = [];

function broadcast(event: WorkflowEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;

  clients.forEach((c) => c.res.write(data));
}

/* ================= STREAM ================= */

app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  const id = uuidv4();

  clients.push({ id, res });

  req.on("close", () => {
    const i = clients.findIndex((c) => c.id === id);
    if (i !== -1) clients.splice(i, 1);
  });
});

/* ================= PUBLISH ================= */

app.post("/workflow/publish", async (req, res) => {
  try {
    const workflow = req.body.workflow ?? req.body;

    if (!workflow?.nodes || !workflow?.edges) {
      return res.status(400).json({
        success: false,
        error: "Invalid workflow format",
      });
    }

    /* ================= VALIDATION ================= */

    const nodes = workflow.nodes;
    const edges = workflow.edges;

    const startNodes = nodes.filter(
      (n: { type: string }) => n.type === "start",
    );

    const approvalNodes = nodes.filter(
      (n: { type: string }) => n.type === "approval",
    );

    const endNodes = nodes.filter((n: { type: string }) => n.type === "end");

    if (startNodes.length !== 1) {
      return res.status(400).json({
        success: false,
        error: "Workflow must have exactly one Start node",
      });
    }

    if (approvalNodes.length < 1) {
      return res.status(400).json({
        success: false,
        error: "At least one Approval node required",
      });
    }

    if (endNodes.length !== 1) {
      return res.status(400).json({
        success: false,
        error: "Workflow must have exactly one End node",
      });
    }

    for (const n of approvalNodes) {
      if (!n.data?.email) {
        return res.status(400).json({
          success: false,
          error: `Approval node "${n.id}" missing email`,
        });
      }
    }

    for (const e of edges) {
      if (e.data?.condition) {
        if (e.data.condition !== "approve" && e.data.condition !== "deny") {
          return res.status(400).json({
            success: false,
            error: "Invalid edge condition",
          });
        }
      }
    }

    /* ================= START WORKFLOW ================= */

    const temporal = await getTemporalClient();

    const workflowId = crypto.randomUUID();

    await temporal.workflow.start("mainWorkflow", {
      taskQueue: "workflow-task-queue",
      workflowId,
      args: [workflow],
    });

    return res.json({
      success: true,
      workflowId,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: "Publish failed",
    });
  }
});

/* ================= RESPOND ================= */

app.post("/workflow/respond", async (req, res) => {
  try {
    const { workflowId, result } = req.body;

    const temporal = await getTemporalClient();

    const h = temporal.workflow.getHandle(workflowId);

    await h.signal("approvalSignal", result);

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
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

/* ================= EVENTS ================= */

app.post("/internal/event", (req, res) => {
  const {
    workflowId,
    status,
    message,
    meta,
  }: {
    workflowId: string;
    status: WorkflowStatus; // ✅ FIX
    message?: string;
    meta?: {
      to?: string;
      approverId?: string;
      level?: number;
    };
  } = req.body;

  if (!workflowId || !status) {
    return res.status(400).json({
      success: false,
      error: "Invalid event payload",
    });
  }

  broadcast({
    workflowId,
    status,
    message,
    meta,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true });
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log(`API running on ${PORT}`);
});
