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

function getEmailMap(nodes: Node[]) {
  const map = new Map<string, string>();

  for (const n of nodes) {
    if (n.type === "email" && n.data?.email) {
      map.set(n.id, n.data.email);
    }
  }

  return map;
}

function findApprovalNode(nodes: Node[]) {
  return nodes.find((n) => n.type === "approval");
}

function resolveTargetEmail(
  workflow: WorkflowJSON,
  condition: "approve" | "deny",
) {
  const emailMap = getEmailMap(workflow.nodes);

  for (const e of workflow.edges) {
    if (e.data?.condition === condition) {
      return emailMap.get(e.target);
    }
  }

  return null;
}

/* ================= WORKFLOW ================= */

export async function mainWorkflow(workflow: WorkflowJSON) {
  let decision: "approve" | "deny" | null = null;

  setHandler(approvalSignal, (v) => {
    decision = v;
  });

  const wid = workflowInfo().workflowId;

  /* ---------- START ---------- */

  await emitEvent(wid, "STARTED");

  /* ---------- FIND APPROVER ---------- */

  const approvalNode = findApprovalNode(workflow.nodes);

  const approver = approvalNode?.data?.email;

  if (!approver) {
    throw new Error("Approval email missing");
  }

  /* ---------- SEND APPROVAL EMAIL ---------- */

  await emitEvent(wid, "EMAIL_SENT", "approval", {
    to: approver,
  });

  await sendApprovalEmail(approver, "Approve Path", "Deny Path", wid);

  await emitEvent(wid, "WAITING");

  /* ---------- WAIT ---------- */

  await condition(() => decision !== null);

  if (!decision) {
    throw new Error("Decision missing");
  }

  /* ---------- DECISION ---------- */

  await emitEvent(wid, "DECISION", decision);

  /* ---------- RESOLVE USER ---------- */

  const targetEmail = resolveTargetEmail(workflow, decision);

  if (!targetEmail) {
    throw new Error("Target email missing");
  }

  /* ---------- FINAL EMAIL ---------- */

  await emitEvent(wid, "EMAIL_SENT", "final", {
    to: targetEmail,
  });

  await sendFinalEmail(
    targetEmail,
    decision === "approve" ? "approved" : "denied",
  );

  /* ---------- COMPLETE ---------- */

  await emitEvent(wid, "COMPLETED");
}
