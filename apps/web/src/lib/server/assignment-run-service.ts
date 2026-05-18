import type {
  AssignmentRule,
  CurrentAssignment,
  Group,
  Room,
  RoomBlock,
  ScheduleBlock,
  SolvePayload,
  SolveResponse,
  TeacherOperationalConstraint,
} from "@aulas/shared";
import { randomUUID } from "node:crypto";

import { assignmentRunDemoPayload } from "@/lib/assignment-run-demo-data";
import { getDbPool } from "@/lib/server/db";

const DEFAULT_SOLVER_URL = "http://127.0.0.1:8000";
const DEFAULT_INSTITUTION_ID = "00000000-0000-0000-0000-000000000001";

export type AssignmentRunInput = {
  payload: SolvePayload;
  dataSource: "database" | "mock";
};

export type AssignmentRunExecution = AssignmentRunInput & {
  response: SolveResponse;
  persisted: boolean;
  runId?: string;
};

export async function getAssignmentRunInput(): Promise<AssignmentRunInput> {
  const pool = getDbPool();

  if (!pool) {
    return {
      payload: assignmentRunDemoPayload,
      dataSource: "mock",
    };
  }

  try {
    const payload = await buildPayloadFromDatabase();
    return {
      payload,
      dataSource: "database",
    };
  } catch (error) {
    console.warn("Falling back to assignment run mock data", error);
    return {
      payload: assignmentRunDemoPayload,
      dataSource: "mock",
    };
  }
}

export async function executeAssignmentRun(): Promise<AssignmentRunExecution> {
  const input = await getAssignmentRunInput();
  const response = await callSolver(input.payload);
  const persistResult =
    input.dataSource === "database"
      ? await persistAssignmentRun(input.payload, response)
      : { persisted: false, runId: undefined };

  return {
    ...input,
    response,
    persisted: persistResult.persisted,
    runId: persistResult.runId,
  };
}

async function callSolver(payload: SolvePayload): Promise<SolveResponse> {
  const solverUrl = process.env.SOLVER_API_URL ?? DEFAULT_SOLVER_URL;
  const response = await fetch(`${solverUrl}/solve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "El solver rechazo el payload.");
  }

  return data as SolveResponse;
}

async function buildPayloadFromDatabase(): Promise<SolvePayload> {
  const pool = getDbPool();
  if (!pool) {
    return assignmentRunDemoPayload;
  }

  const institutionId = process.env.AULAFLOW_INSTITUTION_ID ?? DEFAULT_INSTITUTION_ID;
  const periodResult = await pool.query<{ id: string }>(
    `
      select id
      from public.academic_periods
      where institution_id = $1
      order by (status = 'active') desc, starts_on desc
      limit 1
    `,
    [institutionId],
  );
  const academicPeriodId = periodResult.rows[0]?.id;

  if (!academicPeriodId) {
    return assignmentRunDemoPayload;
  }

  const [
    groupsResult,
    roomsResult,
    schedulesResult,
    currentAssignmentsResult,
    rulesResult,
    teacherConstraintsResult,
    roomBlocksResult,
  ] = await Promise.all([
    pool.query<Group>(
      `
        select
          id::text,
          institution_id::text,
          academic_period_id::text,
          name,
          expected_students as size,
          program_id::text,
          semester,
          shift,
          required_room_type,
          required_features,
          preferred_building_id::text
        from public.groups
        where institution_id = $1 and academic_period_id = $2
        order by shift, name
      `,
      [institutionId, academicPeriodId],
    ),
    pool.query<Room>(
      `
        select
          r.id::text,
          r.institution_id::text,
          r.name,
          r.capacity,
          r.building_id::text,
          r.floor,
          r.room_type,
          array[r.room_type] as compatible_room_types,
          coalesce(array_remove(array_agg(rf.feature_key), null), '{}'::text[]) as features,
          r.has_elevator_access,
          r.is_active,
          r.is_reservable,
          r.reserved_for_room_types
        from public.rooms r
        left join public.room_features rf
          on rf.institution_id = r.institution_id and rf.room_id = r.id
        where r.institution_id = $1 and r.is_active = true
        group by r.id
        order by r.name
      `,
      [institutionId],
    ),
    pool.query<ScheduleBlock>(
      `
        select
          id::text,
          institution_id::text,
          academic_period_id::text,
          group_id::text,
          teacher_id::text,
          course_name,
          day_of_week as day,
          to_char(start_time, 'HH24:MI') as start_time,
          to_char(end_time, 'HH24:MI') as end_time,
          expected_students,
          required_room_type,
          required_features,
          preferred_building_id::text
        from public.schedules
        where institution_id = $1 and academic_period_id = $2 and status = 'active'
        order by day_of_week, start_time
      `,
      [institutionId, academicPeriodId],
    ),
    pool.query<CurrentAssignment>(
      `
        select distinct on (a.schedule_id)
          a.id::text,
          a.institution_id::text,
          a.schedule_id::text,
          a.group_id::text,
          a.room_id::text,
          a.status,
          a.locked_by_user
        from public.assignments a
        join public.assignment_runs ar
          on ar.institution_id = a.institution_id and ar.id = a.assignment_run_id
        where a.institution_id = $1
          and ar.academic_period_id = $2
          and a.status in ('accepted', 'locked', 'proposed')
        order by a.schedule_id, a.created_at desc
      `,
      [institutionId, academicPeriodId],
    ),
    pool.query<AssignmentRule>(
      `
        select
          code,
          name,
          rule_type,
          severity,
          is_enabled,
          weight::float,
          config
        from public.assignment_rules
        where institution_id = $1 and is_enabled = true
        order by rule_type, code
      `,
      [institutionId],
    ),
    pool.query<TeacherOperationalConstraint>(
      `
        select
          teacher_id::text,
          requires_ground_floor,
          requires_elevator,
          avoid_long_transfers,
          max_transfer_distance_meters,
          required_room_features
        from public.teacher_constraints
        where institution_id = $1
      `,
      [institutionId],
    ),
    pool.query<RoomBlock>(
      `
        select
          room_id::text,
          academic_period_id::text,
          day_of_week as day,
          to_char(start_time, 'HH24:MI') as start_time,
          to_char(end_time, 'HH24:MI') as end_time,
          reason,
          is_active
        from public.room_blocks
        where institution_id = $1 and (academic_period_id is null or academic_period_id = $2)
      `,
      [institutionId, academicPeriodId],
    ),
  ]);

  return {
    institution_id: institutionId,
    academic_period_id: academicPeriodId,
    groups: groupsResult.rows,
    rooms: roomsResult.rows,
    schedules: schedulesResult.rows,
    current_assignments: currentAssignmentsResult.rows,
    rules: rulesResult.rows,
    teacher_constraints: teacherConstraintsResult.rows,
    room_blocks: roomBlocksResult.rows,
    constraints: {
      capacity_waste_warning_ratio: 0.45,
      large_room_waste_ratio: 0.72,
      default_max_transfer_distance_meters: 350,
    },
  };
}

async function persistAssignmentRun(
  payload: SolvePayload,
  response: SolveResponse,
): Promise<{ persisted: boolean; runId?: string }> {
  const pool = getDbPool();
  if (!pool || !payload.academic_period_id) {
    return { persisted: false };
  }

  const client = await pool.connect();
  const runId = randomUUID();

  try {
    await client.query("begin");
    await client.query(
      `
        insert into public.assignment_runs (
          id,
          institution_id,
          academic_period_id,
          status,
          mode,
          solver_version,
          request_payload,
          response_payload,
          logs,
          started_at,
          finished_at
        )
        values ($1, $2, $3, 'completed', 'semi_automatic', 'solver-api-v0.2', $4, $5, $6, now(), now())
      `,
      [
        runId,
        payload.institution_id,
        payload.academic_period_id,
        JSON.stringify(payload),
        JSON.stringify(response),
        JSON.stringify([
          {
            level: "info",
            message: "Assignment run executed from web backend",
          },
        ]),
      ],
    );

    for (const assignment of response.assignments) {
      await client.query(
        `
          insert into public.assignments (
            id,
            institution_id,
            assignment_run_id,
            schedule_id,
            group_id,
            room_id,
            status,
            score,
            explanation,
            locked_by_user
          )
          values ($1, $2, $3, $4, $5, $6, 'proposed', $7, $8, false)
        `,
        [
          randomUUID(),
          payload.institution_id,
          runId,
          assignment.schedule_id,
          assignment.group_id,
          assignment.room_id,
          assignment.score,
          assignment.explanation,
        ],
      );
    }

    for (const conflict of response.conflicts) {
      await client.query(
        `
          insert into public.assignment_conflicts (
            id,
            institution_id,
            assignment_run_id,
            schedule_id,
            group_id,
            room_id,
            code,
            severity,
            message,
            details
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          payload.institution_id,
          runId,
          conflict.schedule_id,
          conflict.group_id,
          conflict.room_id,
          conflict.code,
          conflict.severity,
          conflict.message,
          JSON.stringify(conflict.details ?? {}),
        ],
      );
    }

    for (const warning of response.warnings) {
      await client.query(
        `
          insert into public.assignment_warnings (
            id,
            institution_id,
            assignment_run_id,
            schedule_id,
            group_id,
            room_id,
            code,
            severity,
            message,
            details
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          payload.institution_id,
          runId,
          warning.schedule_id,
          warning.group_id,
          warning.room_id,
          warning.code,
          warning.severity,
          warning.message,
          JSON.stringify(warning.details ?? {}),
        ],
      );
    }

    await client.query("commit");
    return { persisted: true, runId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

