export type DiagnosticSeverity = "info" | "warning" | "error";

export type DiagnosticSubjectRef =
  | { kind: "project" }
  | { kind: "site"; sitePresetId: string }
  | { kind: "node"; nodeId: string }
  | { kind: "edge"; edgeId: string }
  | { kind: "port"; nodeId: string; portId: string };

export type Diagnostic = {
  id: string;
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  subjectRefs: DiagnosticSubjectRef[];
  remediation?: string;
};

export type DiagnosticFactoryInput = Omit<Diagnostic, "id">;

export function createDiagnosticId(code: string, index: number) {
  return `${code}:${index}`;
}
