import type {
  CurrentAssignment,
  DayOfWeek,
  Group,
  Room,
  ScheduleBlock,
  SolvePayload,
} from "@aulas/shared";

import type {
  AssignmentEditStatus,
  ImportColumnKey,
  ImportColumnMapping,
  ImportEditableRow,
  ImportIssue,
  ImportParseResult,
  RawImportRow,
} from "@/lib/imports/import-types";

const DAY_COLUMNS: Array<{ key: ImportColumnKey; day: DayOfWeek; label: string }> = [
  { key: "monday", day: "monday", label: "Lunes" },
  { key: "tuesday", day: "tuesday", label: "Martes" },
  { key: "wednesday", day: "wednesday", label: "Miercoles" },
  { key: "thursday", day: "thursday", label: "Jueves" },
  { key: "friday", day: "friday", label: "Viernes" },
];

const DEFAULT_INSTITUTION_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_ACADEMIC_PERIOD_ID = "21000000-0000-0000-0000-000000000001";

export function parseCsvText(text: string): RawImportRow[] {
  const matrix = parseCsvMatrix(text);
  return matrixToRawRows(matrix);
}

export function matrixToRawRows(matrix: unknown[][]): RawImportRow[] {
  const [headerRow, ...dataRows] = matrix;
  const headers = (headerRow ?? []).map((value, index) =>
    normalizeCell(value) || `Columna ${index + 1}`,
  );

  return dataRows
    .map((row, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(
        headers.map((header, cellIndex) => [header, normalizeCell(row[cellIndex])]),
      ),
    }))
    .filter((row) => Object.values(row.values).some(Boolean));
}

export function getHeaders(rows: RawImportRow[]) {
  return rows[0] ? Object.keys(rows[0].values) : [];
}

export function detectColumnMapping(headers: string[]): ImportColumnMapping {
  return {
    groupName: findHeader(headers, ["grupo semestre", "grupo", "semestre"]),
    totalStudents: findHeader(headers, ["total alumnos", "alumnos", "total"]),
    monday: findHeader(headers, ["lunes"]),
    tuesday: findHeader(headers, ["martes"]),
    wednesday: findHeader(headers, ["miercoles", "miércoles"]),
    thursday: findHeader(headers, ["jueves"]),
    friday: findHeader(headers, ["viernes"]),
    roomName: findHeader(headers, ["aula", "salon", "salón"]),
    roomCapacity: findHeader(headers, ["capacidad maxima", "capacidad máxima", "capacidad"]),
    observation: findHeader(headers, ["observacion", "observación", "nota"]),
  };
}

export function parseImportedRows({
  rows,
  mapping,
  institutionId = DEFAULT_INSTITUTION_ID,
  academicPeriodId = DEFAULT_ACADEMIC_PERIOD_ID,
  registeredRoomNames = [],
}: {
  rows: RawImportRow[];
  mapping: ImportColumnMapping;
  institutionId?: string;
  academicPeriodId?: string;
  registeredRoomNames?: string[];
}): ImportParseResult {
  const editableRows = rows.map((row) => toEditableRow(row, mapping));
  return buildImportPayload({
    rows: editableRows,
    institutionId,
    academicPeriodId,
    registeredRoomNames,
  });
}

export function buildImportPayload({
  rows,
  institutionId = DEFAULT_INSTITUTION_ID,
  academicPeriodId = DEFAULT_ACADEMIC_PERIOD_ID,
  registeredRoomNames = [],
}: {
  rows: ImportEditableRow[];
  institutionId?: string;
  academicPeriodId?: string;
  registeredRoomNames?: string[];
}): ImportParseResult {
  const issues: ImportIssue[] = [];
  const groups: Group[] = [];
  const roomsByName = new Map<string, Room>();
  const schedules: ScheduleBlock[] = [];
  const currentAssignments: CurrentAssignment[] = [];
  const registered = new Set(registeredRoomNames.map(normalizeKey));

  for (const row of rows) {
    if (!row.groupName.trim()) {
      issues.push({
        code: "missing_group",
        severity: "error",
        rowNumber: row.rowNumber,
        field: "groupName",
        message: "La fila no tiene nombre de grupo.",
      });
    }

    if (!row.totalStudents || row.totalStudents <= 0) {
      issues.push({
        code: "missing_students",
        severity: "error",
        rowNumber: row.rowNumber,
        field: "totalStudents",
        message: "La fila no tiene total de alumnos valido.",
      });
    }

    if (!row.roomName.trim()) {
      issues.push({
        code: "missing_room",
        severity: "error",
        rowNumber: row.rowNumber,
        field: "roomName",
        message: "La fila no tiene aula asignada.",
      });
    }

    if (!row.roomCapacity || row.roomCapacity <= 0) {
      issues.push({
        code: "missing_capacity",
        severity: "error",
        rowNumber: row.rowNumber,
        field: "roomCapacity",
        message: "La fila no tiene capacidad maxima valida.",
      });
    }

    if (row.roomName && registered.size > 0 && !registered.has(normalizeKey(row.roomName))) {
      issues.push({
        code: "unknown_room",
        severity: "warning",
        rowNumber: row.rowNumber,
        field: "room",
        message: `${row.roomName} no existe en el catalogo actual; se creara como aula nueva al aprobar.`,
      });
    }

    if (row.totalStudents && row.roomCapacity && row.totalStudents > row.roomCapacity) {
      issues.push({
        code: "insufficient_capacity",
        severity: "warning",
        rowNumber: row.rowNumber,
        field: "roomCapacity",
        message: `${row.groupName} tiene ${row.totalStudents} alumnos, pero ${row.roomName} tiene capacidad ${row.roomCapacity}.`,
      });
    }

    const groupId = stableId("group", row.id);
    groups.push({
      id: groupId,
      institution_id: institutionId,
      academic_period_id: academicPeriodId,
      name: row.groupName || `Grupo fila ${row.rowNumber}`,
      size: row.totalStudents || 1,
      required_room_type: inferRoomType(row.roomName, row.observation),
      required_features: inferRequiredFeatures(row.roomName, row.observation),
      shift: inferShift(row.schedules),
    });

    const roomType = inferRoomType(row.roomName, row.observation);
    const roomId = stableId("room", normalizeKey(row.roomName || `room-row-${row.rowNumber}`));
    if (row.roomName && !roomsByName.has(normalizeKey(row.roomName))) {
      roomsByName.set(normalizeKey(row.roomName), {
        id: roomId,
        institution_id: institutionId,
        name: row.roomName,
        capacity: row.roomCapacity || 1,
        building_id: inferBuildingId(row.roomName),
        floor: 0,
        room_type: roomType,
        compatible_room_types: [roomType],
        features: inferRoomFeatures(row.roomName, row.observation),
        has_elevator_access: true,
        is_active: true,
        is_reservable: true,
        reserved_for_room_types: roomType === "normal" ? [] : [roomType],
      });
    }

    for (const day of DAY_COLUMNS) {
      const value = row.schedules[day.day];
      if (!value) {
        continue;
      }

      const parsedTime = parseTimeRange(value);
      if (!parsedTime) {
        issues.push({
          code: "invalid_schedule_time",
          severity: "error",
          rowNumber: row.rowNumber,
          field: day.day,
          message: `El horario "${value}" de ${day.label} no tiene formato valido.`,
        });
        continue;
      }

      const scheduleId = stableId("schedule", `${row.id}-${day.day}`);
      schedules.push({
        id: scheduleId,
        institution_id: institutionId,
        academic_period_id: academicPeriodId,
        group_id: groupId,
        day: day.day,
        start_time: parsedTime.startTime,
        end_time: parsedTime.endTime,
        expected_students: row.totalStudents || undefined,
        required_room_type: roomType,
        required_features: inferRequiredFeatures(row.roomName, row.observation),
      });
      if (row.roomName) {
        currentAssignments.push({
          institution_id: institutionId,
          schedule_id: scheduleId,
          group_id: groupId,
          room_id: roomId,
          status: "imported",
        });
      }
    }
  }

  const payload: SolvePayload = {
    institution_id: institutionId,
    academic_period_id: academicPeriodId,
    groups,
    rooms: Array.from(roomsByName.values()),
    schedules,
    current_assignments: currentAssignments,
    rules: [
      { code: "room_time_conflict", rule_type: "mandatory", severity: "hard" },
      { code: "group_time_conflict", rule_type: "mandatory", severity: "hard" },
      { code: "capacity_required", rule_type: "mandatory", severity: "hard" },
      { code: "room_blocked", rule_type: "mandatory", severity: "hard" },
      { code: "reservation_mismatch", rule_type: "mandatory", severity: "hard" },
    ],
    teacher_constraints: [],
    room_blocks: [],
    constraints: {
      capacity_waste_warning_ratio: 0.45,
      large_room_waste_ratio: 0.72,
      default_max_transfer_distance_meters: 350,
    },
  };

  return {
    rows,
    issues,
    payload,
    detected: {
      groups: groups.length,
      rooms: payload.rooms.length,
      schedules: schedules.length,
      currentAssignments: currentAssignments.length,
    },
  };
}

export function parseTimeRange(value: string) {
  const cleaned = normalizeCell(value)
    .replace(/\s+/g, " ")
    .replace(/\s*(a|A|-|–|—)\s*/u, " A ");
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*A\s*(\d{1,2})(?::(\d{2}))?$/i);

  if (!match) {
    return null;
  }

  const startHour = Number(match[1]);
  const startMinute = Number(match[2] ?? "00");
  const endHour = Number(match[3]);
  const endMinute = Number(match[4] ?? "00");

  if (
    startHour > 23 ||
    endHour > 23 ||
    startMinute > 59 ||
    endMinute > 59 ||
    startHour * 60 + startMinute >= endHour * 60 + endMinute
  ) {
    return null;
  }

  return {
    startTime: `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
    endTime: `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`,
  };
}

export function validateAssignmentEdit({
  payload,
  scheduleId,
  roomId,
}: {
  payload: SolvePayload;
  scheduleId: string;
  roomId: string;
}): AssignmentEditStatus {
  const schedule = payload.schedules.find((item) => item.id === scheduleId);
  const group = payload.groups.find((item) => item.id === schedule?.group_id);
  const room = payload.rooms.find((item) => item.id === roomId);
  const messages: string[] = [];

  if (!schedule || !group || !room) {
    return {
      ok: false,
      messages: ["No se encontro horario, grupo o aula."],
    };
  }

  const size = schedule.expected_students ?? group.size;
  if (room.capacity < size) {
    messages.push(`${room.name} tiene capacidad ${room.capacity}; el grupo tiene ${size}.`);
  }

  const requiredType = schedule.required_room_type ?? group.required_room_type;
  if (room.reserved_for_room_types?.length && !room.reserved_for_room_types.includes(requiredType ?? "")) {
    messages.push(`${room.name} esta reservada para ${room.reserved_for_room_types.join(", ")}.`);
  }

  const roomConflict = payload.current_assignments?.some((assignment) => {
    if (assignment.schedule_id === scheduleId || assignment.room_id !== roomId) {
      return false;
    }
    const other = payload.schedules.find((item) => item.id === assignment.schedule_id);
    return Boolean(other && overlaps(schedule, other));
  });

  if (roomConflict) {
    messages.push(`${room.name} ya esta ocupada en ese horario.`);
  }

  return {
    ok: messages.length === 0,
    messages: messages.length ? messages : ["Cambio disponible para guardar."],
  };
}

export function updateCurrentAssignment(
  payload: SolvePayload,
  scheduleId: string,
  roomId: string,
): SolvePayload {
  const schedule = payload.schedules.find((item) => item.id === scheduleId);
  if (!schedule) {
    return payload;
  }

  const nextAssignments = [...(payload.current_assignments ?? [])];
  const index = nextAssignments.findIndex((item) => item.schedule_id === scheduleId);
  const assignment: CurrentAssignment = {
    institution_id: payload.institution_id,
    schedule_id: scheduleId,
    group_id: schedule.group_id,
    room_id: roomId,
    status: "manual",
  };

  if (index >= 0) {
    nextAssignments[index] = { ...nextAssignments[index], ...assignment };
  } else {
    nextAssignments.push(assignment);
  }

  return {
    ...payload,
    current_assignments: nextAssignments,
  };
}

function toEditableRow(row: RawImportRow, mapping: ImportColumnMapping): ImportEditableRow {
  return {
    id: stableId("row", `${row.rowNumber}-${JSON.stringify(row.values)}`),
    rowNumber: row.rowNumber,
    groupName: getMappedValue(row, mapping.groupName),
    totalStudents: parseInteger(getMappedValue(row, mapping.totalStudents)),
    roomName: getMappedValue(row, mapping.roomName),
    roomCapacity: parseInteger(getMappedValue(row, mapping.roomCapacity)),
    observation: getMappedValue(row, mapping.observation),
    schedules: Object.fromEntries(
      DAY_COLUMNS.map((day) => [day.day, getMappedValue(row, mapping[day.key])]),
    ),
  };
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function getMappedValue(row: RawImportRow, header?: string) {
  return header ? normalizeCell(row.values[header]) : "";
}

function findHeader(headers: string[], candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeKey);
  return headers.find((header) => normalizedCandidates.includes(normalizeKey(header)));
}

function normalizeCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferRoomType(roomName: string, observation: string) {
  const value = normalizeKey(`${roomName} ${observation}`);
  if (value.includes("ingles")) return "ingles";
  if (value.includes("maestria")) return "maestria";
  if (value.includes("gesell")) return "camara_gesell";
  if (value.includes("computo") || value.includes("laboratorio")) return "computo";
  return "normal";
}

function inferRoomFeatures(roomName: string, observation: string) {
  const value = normalizeKey(`${roomName} ${observation}`);
  const features = new Set<string>(["proyector"]);
  if (value.includes("ingles")) features.add("audio");
  if (value.includes("gesell")) {
    features.add("camara");
    features.add("audio");
  }
  if (value.includes("computo")) features.add("computadoras");
  return Array.from(features);
}

function inferRequiredFeatures(roomName: string, observation: string) {
  const type = inferRoomType(roomName, observation);
  if (type === "ingles") return ["audio"];
  if (type === "camara_gesell") return ["camara"];
  if (type === "computo") return ["computadoras"];
  return [];
}

function inferBuildingId(roomName: string) {
  const key = normalizeKey(roomName);
  if (/\ba\b/.test(key)) return "building_a";
  if (/\bb\b/.test(key)) return "building_b";
  if (/\bc\b/.test(key)) return "building_c";
  return "building_imported";
}

function inferShift(schedules: Partial<Record<DayOfWeek, string>>) {
  const ranges = Object.values(schedules).filter(Boolean);
  const first = ranges.map((value) => parseTimeRange(value ?? "")).find(Boolean);
  if (!first) return "mixed";
  return Number(first.startTime.slice(0, 2)) >= 13 ? "evening" : "morning";
}

function stableId(prefix: string, seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `${prefix}_${hash.toString(16)}`;
}

function overlaps(left: ScheduleBlock, right: ScheduleBlock) {
  return (
    left.day === right.day &&
    toMinutes(left.start_time) < toMinutes(right.end_time) &&
    toMinutes(right.start_time) < toMinutes(left.end_time)
  );
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

