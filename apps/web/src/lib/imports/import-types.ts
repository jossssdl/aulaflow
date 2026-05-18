import type { CurrentAssignment, DayOfWeek, SolvePayload } from "@aulas/shared";

export type ImportColumnKey =
  | "groupName"
  | "totalStudents"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "roomName"
  | "roomCapacity"
  | "observation";

export type ImportColumnMapping = Partial<Record<ImportColumnKey, string>>;

export type RawImportRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export type ImportIssueSeverity = "error" | "warning";

export type ImportIssue = {
  code: string;
  severity: ImportIssueSeverity;
  rowNumber?: number;
  field?: ImportColumnKey | DayOfWeek | "room";
  message: string;
};

export type ImportEditableRow = {
  id: string;
  rowNumber: number;
  groupName: string;
  totalStudents: number | null;
  roomName: string;
  roomCapacity: number | null;
  observation: string;
  schedules: Partial<Record<DayOfWeek, string>>;
};

export type ImportParseResult = {
  rows: ImportEditableRow[];
  issues: ImportIssue[];
  payload: SolvePayload;
  detected: {
    groups: number;
    rooms: number;
    schedules: number;
    currentAssignments: number;
  };
};

export type ImportSession = {
  id: string;
  fileName: string;
  createdAt: string;
  headers: string[];
  rawRows: RawImportRow[];
  mapping: ImportColumnMapping;
  editableRows: ImportEditableRow[];
  issues: ImportIssue[];
  payload: SolvePayload;
  approvedAt?: string;
  solverResponse?: unknown;
};

export type AssignmentEditStatus = {
  ok: boolean;
  messages: string[];
};

export type CurrentAssignmentWithRoomName = CurrentAssignment & {
  roomName?: string;
};

