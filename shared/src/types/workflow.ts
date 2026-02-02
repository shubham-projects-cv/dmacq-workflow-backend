// shared/src/types/workflow.ts

export type Position = {
  x: number;
  y: number;
};

export type NodeData = {
  label?: string;
  subLabel?: string;
  email?: string;
  approver?: string;
  nodeType?: string;
};

export type EdgeData = {
  condition?: "approve" | "deny";
};

export type WorkflowNode = {
  id: string;
  type: string;
  position: Position;
  data: NodeData;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  data?: EdgeData;
};

export type WorkflowMeta = {
  version: string;
  createdBy: string;
  updatedAt: string;
};

export type WorkflowJSON = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  meta: WorkflowMeta;
};
