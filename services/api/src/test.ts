import { WorkflowJSON } from "shared";

const test: WorkflowJSON = {
  nodes: [],
  edges: [],
  meta: {
    version: "1",
    createdBy: "me",
    updatedAt: new Date().toISOString(),
  },
};

console.log(test);
