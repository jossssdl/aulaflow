import { type SolvePayload } from "@aulas/shared";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDbPool } from "@/lib/server/db";

// Constantes por defecto del sistema AulaFlow
const DEFAULT_INSTITUTION_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_ACADEMIC_PERIOD_ID = "21000000-0000-0000-0000-000000000001";

// Mapeo estable de edificios a UUIDs reales de la base de datos (según seed.sql)
const BUILDING_MAP: Record<string, string> = {
  building_a: "20000000-0000-0000-0000-00000000000a",
  building_b: "20000000-0000-0000-0000-00000000000b",
  building_c: "20000000-0000-0000-0000-00000000000c",
  building_imported: "20000000-0000-0000-0000-00000000000a", // Edificio A por defecto
};

/**
 * Función robusta para convertir IDs con prefijos personalizados (ej: 'group_...')
 * en UUIDs válidos para PostgreSQL de forma estable.
 */
function toUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id.toLowerCase();
  }
  
  // Hashing simple y estable para producir un UUID único basado en la semilla
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `e0000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SolvePayload;
    const pool = getDbPool();

    // Si no hay conexión de base de datos activa (modo demo/mock)
    if (!pool) {
      return NextResponse.json({
        success: true,
        persisted: false,
        message: "Modo de demostración: Los datos se guardaron localmente en el navegador.",
      });
    }

    const client = await pool.connect();

    try {
      // Iniciar transacción de base de datos
      await client.query("BEGIN");

      const institutionId = payload.institution_id || DEFAULT_INSTITUTION_ID;
      const academicPeriodId = payload.academic_period_id || DEFAULT_ACADEMIC_PERIOD_ID;

      // 1. Insertar o actualizar aulas (rooms)
      for (const room of payload.rooms) {
        const roomId = toUuid(room.id);
        const rawBuilding = room.building_id || "building_imported";
        const buildingId = BUILDING_MAP[rawBuilding] || BUILDING_MAP.building_imported;
        const normalizedCode = room.name.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();

        await client.query(
          `
          INSERT INTO public.rooms (
            id, institution_id, building_id, name, code, capacity, 
            room_type, floor, has_elevator_access, is_active, 
            is_reservable, reserved_for_room_types, notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET 
            capacity = EXCLUDED.capacity,
            room_type = EXCLUDED.room_type,
            updated_at = NOW()
          `,
          [
            roomId,
            institutionId,
            buildingId,
            room.name,
            normalizedCode || room.name,
            room.capacity,
            room.room_type || "normal",
            room.floor || 0,
            room.has_elevator_access ?? true,
            room.is_active ?? true,
            room.is_reservable ?? true,
            room.reserved_for_room_types || [],
            room.notes || "Aula importada vía panel de administración",
          ]
        );
      }

      // 2. Insertar o actualizar grupos (groups)
      for (const group of payload.groups) {
        const groupId = toUuid(group.id);
        const normalizedCode = group.name.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();

        await client.query(
          `
          INSERT INTO public.groups (
            id, institution_id, academic_period_id, name, code, 
            semester, shift, expected_students, required_room_type, 
            required_features
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET 
            expected_students = EXCLUDED.expected_students,
            required_room_type = EXCLUDED.required_room_type,
            updated_at = NOW()
          `,
          [
            groupId,
            institutionId,
            academicPeriodId,
            group.name,
            normalizedCode || group.name,
            group.semester || 1,
            group.shift || "morning",
            group.size || 30,
            group.required_room_type || "normal",
            group.required_features || [],
          ]
        );
      }

      // 3. Insertar horarios (schedules)
      for (const schedule of payload.schedules) {
        const scheduleId = toUuid(schedule.id);
        const groupId = toUuid(schedule.group_id);

        await client.query(
          `
          INSERT INTO public.schedules (
            id, institution_id, academic_period_id, group_id, 
            course_name, day_of_week, start_time, end_time, 
            expected_students, required_room_type, required_features, 
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::time, $8::time, $9, $10, $11, 'active')
          ON CONFLICT (id) DO UPDATE SET 
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            updated_at = NOW()
          `,
          [
            scheduleId,
            institutionId,
            academicPeriodId,
            groupId,
            schedule.course_name || "Curso General",
            schedule.day,
            schedule.start_time,
            schedule.end_time,
            schedule.expected_students || null,
            schedule.required_room_type || "normal",
            schedule.required_features || [],
          ]
        );
      }

      // 4. Crear una corrida de asignación (assignment run) para guardar los cambios y asignaciones actuales
      const runId = randomUUID();
      await client.query(
        `
        INSERT INTO public.assignment_runs (
          id, institution_id, academic_period_id, status, mode, 
          solver_version, request_payload, response_payload, logs, 
          started_at, finished_at
        )
        VALUES ($1, $2, $3, 'completed', 'semi_automatic', 'excel-import-v1', $4, $5, $6, NOW(), NOW())
        `,
        [
          runId,
          institutionId,
          academicPeriodId,
          JSON.stringify(payload),
          JSON.stringify({ status: "success", assignments_count: payload.current_assignments?.length ?? 0 }),
          JSON.stringify([{ level: "info", message: "Importación de datos escolares aprobada exitosamente." }]),
        ]
      );

      // 5. Insertar asignaciones actuales de la importación (current assignments)
      if (payload.current_assignments && payload.current_assignments.length > 0) {
        for (const assignment of payload.current_assignments) {
          const assignmentId = randomUUID();
          const scheduleId = toUuid(assignment.schedule_id);
          const groupId = toUuid(assignment.group_id);
          const roomId = toUuid(assignment.room_id);

          await client.query(
            `
            INSERT INTO public.assignments (
              id, institution_id, assignment_run_id, schedule_id, 
              group_id, room_id, status, score, explanation, locked_by_user
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT ON CONSTRAINT assignments_run_schedule_key 
            DO UPDATE SET room_id = EXCLUDED.room_id, updated_at = NOW()
            `,
            [
              assignmentId,
              institutionId,
              runId,
              scheduleId,
              groupId,
              roomId,
              assignment.status || "proposed",
              2.0, // Puntaje de asignación inicial por defecto
              "Asignación importada manualmente por el administrador.",
              assignment.status === "locked",
            ]
          );
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        persisted: true,
        runId,
        message: "¡Los datos importados se guardaron exitosamente en la base de datos de AulaFlow!",
      });

    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Error al aprobar importación:", error);
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo guardar la importación en la base de datos.",
        detail: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
