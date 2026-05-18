import { describe, expect, it } from "vitest";

import {
  buildImportPayload,
  detectColumnMapping,
  parseCsvText,
  parseImportedRows,
  parseTimeRange,
} from "@/lib/imports/import-parser";

describe("import parser", () => {
  it("parsea horarios en formato textual", () => {
    expect(parseTimeRange("7:00 A 13:00")).toEqual({
      startTime: "07:00",
      endTime: "13:00",
    });
    expect(parseTimeRange("13:00 A 19:00")).toEqual({
      startTime: "13:00",
      endTime: "19:00",
    });
    expect(parseTimeRange("13:00 A 13:00")).toBeNull();
  });

  it("detecta celdas vacias sin generar horario", () => {
    const rows = parseCsvText("Grupo/Semestre,Total alumnos,Lunes,Martes,Aula,Capacidad máxima\nLAM 2 M,47,7:00 A 13:00,,Aula 3 C,60");
    const mapping = detectColumnMapping(Object.keys(rows[0].values));
    const result = parseImportedRows({ rows, mapping });

    expect(result.payload.schedules).toHaveLength(1);
    expect(result.payload.schedules[0].day).toBe("monday");
  });

  it("detecta aula insuficiente", () => {
    const result = buildImportPayload({
      rows: [
        {
          id: "row-1",
          rowNumber: 2,
          groupName: "LAM 2 M",
          totalStudents: 47,
          roomName: "Aula 1 C",
          roomCapacity: 40,
          observation: "",
          schedules: { monday: "7:00 A 13:00" },
        },
      ],
    });

    expect(result.issues.some((issue) => issue.code === "insufficient_capacity")).toBe(true);
  });

  it("detecta aula no registrada", () => {
    const result = buildImportPayload({
      registeredRoomNames: ["Aula 1 C"],
      rows: [
        {
          id: "row-1",
          rowNumber: 2,
          groupName: "LAM 2 M",
          totalStudents: 30,
          roomName: "Aula Nueva",
          roomCapacity: 40,
          observation: "",
          schedules: { monday: "7:00 A 13:00" },
        },
      ],
    });

    expect(result.issues.some((issue) => issue.code === "unknown_room")).toBe(true);
  });

  it("genera payload valido para el solver", () => {
    const result = buildImportPayload({
      rows: [
        {
          id: "row-1",
          rowNumber: 2,
          groupName: "Ingles 1 M",
          totalStudents: 32,
          roomName: "Aula Ingles A",
          roomCapacity: 40,
          observation: "Reservada para inglés",
          schedules: { friday: "9:00 A 13:00" },
        },
      ],
    });

    expect(result.payload.groups).toHaveLength(1);
    expect(result.payload.rooms[0].reserved_for_room_types).toEqual(["ingles"]);
    expect(result.payload.current_assignments).toHaveLength(1);
  });
});

