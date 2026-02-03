import axios from "axios";

/* ================= TYPES ================= */

type ApprovalEmailPayload = {
  to: string;
  approveUser: string;
  denyUser: string;
  workflowId: string;
  subject: string;
  html: string;
};

type FinalEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

/* ================= CONFIG ================= */

const EMAIL_SERVICE_URL = "http://email:5000/send";

/* ================= APPROVAL ================= */

export async function sendApprovalEmail(
  approver: string,
  approveUser: string,
  denyUser: string,
  workflowId: string,
): Promise<void> {
  const html = `
    <h2>Approval Needed</h2>

    <p>Please choose:</p>

    <a href="http://localhost:4000/workflow/approve?wid=${workflowId}">
      ✅ Approve
    </a>

    <br/><br/>

    <a href="http://localhost:4000/workflow/deny?wid=${workflowId}">
      ❌ Deny
    </a>

    <hr/>

    <p>If approved → ${approveUser}</p>
    <p>If denied → ${denyUser}</p>
  `;

  const payload: ApprovalEmailPayload = {
    to: approver,
    approveUser,
    denyUser,
    workflowId,

    subject: "Workflow Approval Required",
    html,
  };

  await axios.post(EMAIL_SERVICE_URL, payload);
}

/* ================= FINAL ================= */

export async function sendFinalEmail(
  to: string,
  result: string,
): Promise<void> {
  const html = `
    <h2>Workflow ${result}</h2>

    <p>Your workflow was ${result}.</p>
  `;

  const payload: FinalEmailPayload = {
    to,
    subject: "Workflow Result",
    html,
  };

  await axios.post(EMAIL_SERVICE_URL, payload);
}
