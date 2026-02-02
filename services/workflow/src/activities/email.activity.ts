import axios from "axios";

export async function sendApprovalEmail(to: string, workflowId: string) {
  const approveUrl = `http://localhost:4000/workflow/approve?wid=${workflowId}`;
  const denyUrl = `http://localhost:4000/workflow/deny?wid=${workflowId}`;

  const html = `
    <h2>Approval Needed</h2>
    <p>Please choose:</p>
    <a href="${approveUrl}">✅ Approve</a>
    <br/><br/>
    <a href="${denyUrl}">❌ Deny</a>
  `;

  console.log("ACTIVITY → sending to:", to); // ADD THIS

  await axios.post("http://localhost:5000/send", {
    to, // ← MUST BE HERE
    subject: "Workflow Approval",
    html,
  });
}

export async function sendFinalEmail(to: string, result: string) {
  await axios.post("http://localhost:5000/send", {
    to,
    subject: "Workflow Result",
    html: `<h2>Workflow ${result}</h2>`,
  });
}
