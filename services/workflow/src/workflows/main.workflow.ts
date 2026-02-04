import {
  defineSignal,
  setHandler,
  proxyActivities,
  workflowInfo,
  condition,
} from "@temporalio/workflow";

import type * as Email from "../activities/email.activity";
import type * as Events from "../activities/event.activity";

/* ================= ACTIVITIES ================= */

const { sendApprovalEmail, sendFinalEmail } = proxyActivities<typeof Email>({
  startToCloseTimeout: "1 minute",
});

const { emitEvent } = proxyActivities<typeof Events>({
  startToCloseTimeout: "1 minute",
});

/* ================= SIGNAL ================= */

export const approvalSignal =
  defineSignal<["approve" | "deny"]>("approvalSignal");

/* ================= TYPES ================= */

type Node = {
  id: string;
  type: string;
  data?: {
    email?: string;
  };
};

type Edge = {
  id: string; // ✅ FIX: added id
  source: string;
  target: string;
  data?: {
    condition?: "approve" | "deny";
  };
};

type WorkflowJSON = {
  nodes: Node[];
  edges: Edge[];
};

/* ================= HELPERS ================= */

function findStartNode(nodes: Node[]) {
  return nodes.find((n) => n.type === "start");
}

function findNextEdge(
  edges: Edge[],
  fromId: string,
  condition: "approve" | "deny",
) {
  return edges.find(
    (e) => e.source === fromId && e.data?.condition === condition,
  );
}

/* ================= WORKFLOW ================= */

export async function mainWorkflow(workflow: WorkflowJSON) {
  let decision: "approve" | "deny" | null = null;

  setHandler(approvalSignal, (v) => {
    decision = v;
  });

  const wid = workflowInfo().workflowId;

  const completedApproverIds: string[] = [];
  const completedEdgeIds: string[] = [];

  // ✅ Track waiting times
  const waitStartedAt: Record<string, string> = {};
  const waitDurations: Record<string, number> = {};

  /* ---------- START ---------- */

  await emitEvent(wid, "STARTED");

  const startNode = findStartNode(workflow.nodes);

  if (!startNode) {
    throw new Error("Start node missing");
  }

  let currentNode = workflow.nodes.find(
    (n) =>
      n.id === workflow.edges.find((e) => e.source === startNode.id)?.target,
  );

  if (!currentNode || currentNode.type !== "approval") {
    throw new Error("First approval missing");
  }

  /* ---------- LOOP ---------- */

  while (currentNode && currentNode.type === "approval") {
    const approverEmail = currentNode.data?.email;

    if (!approverEmail) {
      throw new Error("Approval email missing");
    }

    /* ---- Send Approval Email ---- */

    await emitEvent(wid, "EMAIL_SENT", "approval", {
      to: approverEmail,
    });

    await sendApprovalEmail(approverEmail, "Approve Path", "Deny Path", wid);

    /* ---- WAITING ---- */

    const waitStart = new Date().toISOString();

    waitStartedAt[currentNode.id] = waitStart;

    await emitEvent(wid, "WAITING", undefined, {
      to: approverEmail,
      currentApproverId: currentNode.id,
      waitStartedAt: waitStart,
    });

    decision = null;

    await condition(() => decision !== null);

    if (!decision) {
      throw new Error("Decision missing");
    }

    /* ---- Calculate Wait Time ---- */

    const waitEnd = Date.now();
    const start = new Date(waitStartedAt[currentNode.id]).getTime();

    waitDurations[currentNode.id] = waitEnd - start;

    /* ---- DECISION ---- */

    const edge = findNextEdge(workflow.edges, currentNode.id, decision);

    if (!edge) {
      throw new Error("Decision edge missing");
    }

    completedApproverIds.push(currentNode.id);
    completedEdgeIds.push(edge.id);

    await emitEvent(wid, "DECISION", decision, {
      currentEdgeId: edge.id,
      completedApproverIds,
      completedEdgeIds,
      waitDurations,
    });

    /* ---- NEXT NODE ---- */

    const nextNode = workflow.nodes.find((n) => n.id === edge.target);

    if (!nextNode) {
      throw new Error("Next node missing");
    }

    /* ---- Continue if Approval ---- */

    if (nextNode.type === "approval") {
      currentNode = nextNode;
      continue;
    }

    /* ---- Final Email ---- */

    if (nextNode.type === "email") {
      const finalEmail = nextNode.data?.email;

      if (!finalEmail) {
        throw new Error("Final email missing");
      }

      await emitEvent(wid, "EMAIL_SENT", "final", {
        to: finalEmail,
      });

      await sendFinalEmail(
        finalEmail,
        decision === "approve" ? "approved" : "denied",
      );

      break;
    }

    throw new Error("Invalid workflow path");
  }

  /* ---------- COMPLETE ---------- */

  await emitEvent(wid, "COMPLETED", undefined, {
    currentApproverId: null,
    currentEdgeId: null,
    completedApproverIds,
    completedEdgeIds,
    waitDurations,
  });
}
