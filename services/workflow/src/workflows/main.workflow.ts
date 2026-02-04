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
  id?: string;
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

function findNode(nodes: Node[], id: string) {
  return nodes.find((n) => n.id === id);
}

function findStart(nodes: Node[]) {
  return nodes.find((n) => n.type === "start");
}

function findDefaultEdge(edges: Edge[], from: string) {
  return edges.find((e) => e.source === from && e.data?.condition == null);
}

function findDecisionEdge(
  edges: Edge[],
  from: string,
  decision: "approve" | "deny",
) {
  return edges.find((e) => e.source === from && e.data?.condition === decision);
}

/* ================= WORKFLOW ================= */

export async function mainWorkflow(workflow: WorkflowJSON) {
  let decision: "approve" | "deny" | null = null;

  setHandler(approvalSignal, (v) => {
    decision = v;
  });

  const wid = workflowInfo().workflowId;

  /* ================= STATE ================= */

  const completedApproverIds: string[] = [];
  const completedEdgeIds: string[] = [];

  let currentApproverId: string | null = null;
  let currentEdgeId: string | null = null;

  /* ================= START ================= */

  await emitEvent(wid, "STARTED");

  const start = findStart(workflow.nodes);

  if (!start) throw new Error("Start node missing");

  let currentNodeId = start.id;

  /* ================= LOOP ================= */

  while (true) {
    const currentNode = findNode(workflow.nodes, currentNodeId);

    if (!currentNode) break;

    /* ---------- APPROVAL ---------- */

    if (currentNode.type === "approval") {
      const approver = currentNode.data?.email;

      if (!approver) throw new Error("Approval email missing");

      currentApproverId = currentNode.id;

      await emitEvent(wid, "WAITING", undefined, {
        currentApproverId,
        currentEdgeId,
        completedApproverIds,
        completedEdgeIds,
      });

      await sendApprovalEmail(approver, "Approve Path", "Deny Path", wid);

      decision = null;

      await condition(() => decision !== null);

      if (!decision) throw new Error("Decision missing");

      completedApproverIds.push(currentNode.id);

      const decisionEdge = findDecisionEdge(
        workflow.edges,
        currentNode.id,
        decision,
      );

      if (!decisionEdge) break;

      if (decisionEdge.id) {
        completedEdgeIds.push(decisionEdge.id);
      }

      currentEdgeId = decisionEdge.id ?? null;

      await emitEvent(wid, "DECISION", decision, {
        currentApproverId,
        currentEdgeId,
        completedApproverIds,
        completedEdgeIds,
      });

      currentNodeId = decisionEdge.target;

      continue;
    }

    /* ---------- NORMAL FLOW ---------- */

    const nextEdge = findDefaultEdge(workflow.edges, currentNodeId);

    if (!nextEdge) break;

    if (nextEdge.id) {
      completedEdgeIds.push(nextEdge.id);
    }

    currentEdgeId = nextEdge.id ?? null;

    const nextNode = findNode(workflow.nodes, nextEdge.target);

    if (!nextNode) break;

    /* ---------- EMAIL ---------- */

    if (nextNode.type === "email") {
      const to = nextNode.data?.email;

      if (!to) throw new Error("Email missing");

      await emitEvent(wid, "EMAIL_SENT", "final", {
        to,
        completedApproverIds,
        completedEdgeIds,
      });

      await sendFinalEmail(to, "completed");

      currentNodeId = nextNode.id;

      continue;
    }

    if (nextNode.type === "end") break;

    currentNodeId = nextNode.id;
  }

  /* ================= COMPLETE ================= */

  await emitEvent(wid, "COMPLETED", undefined, {
    currentApproverId: null,
    currentEdgeId: null,
    completedApproverIds,
    completedEdgeIds,
  });
}
