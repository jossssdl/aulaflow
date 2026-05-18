export type Severity = "hard" | "warning" | "info";
export type AssignmentSource = "current" | "generated" | "suggested";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Group = {
  id: string;
  institution_id: string;
  academic_period_id?: string | null;
  name: string;
  size: number;
  program_id?: string | null;
  semester?: number | null;
  shift?: "morning" | "evening" | "mixed" | string | null;
  required_room_type?: string | null;
  required_features?: string[];
  preferred_buildings?: string[];
  preferred_building_id?: string | null;
};

export type Room = {
  id: string;
  institution_id: string;
  name: string;
  capacity: number;
  building_id: string;
  floor: number;
  room_type: string;
  compatible_room_types?: string[];
  features?: string[];
  has_elevator_access?: boolean;
  is_active?: boolean;
  is_reservable?: boolean;
  reserved_for_room_types?: string[];
};

export type ScheduleBlock = {
  id: string;
  institution_id: string;
  academic_period_id?: string | null;
  group_id: string;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  teacher_id?: string | null;
  course_name?: string | null;
  expected_students?: number | null;
  required_room_type?: string | null;
  required_features?: string[];
  preferred_buildings?: string[];
  preferred_building_id?: string | null;
};

export type TeacherOperationalConstraint = {
  teacher_id: string;
  requires_ground_floor?: boolean;
  requires_elevator?: boolean;
  avoid_long_transfers?: boolean;
  max_transfer_distance_meters?: number | null;
  required_room_features?: string[];
};

export type RoomBlock = {
  room_id: string;
  academic_period_id?: string | null;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  reason?: string | null;
  is_active?: boolean;
};

export type RoomReservation = {
  room_id: string;
  academic_period_id?: string | null;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  reserved_for_room_types?: string[];
  reserved_for_program_ids?: string[];
  note?: string | null;
};

export type BuildingDistance = {
  from_building_id: string;
  to_building_id: string;
  distance_meters: number;
};

export type AssignmentRule = {
  code: string;
  name?: string | null;
  rule_type?: "mandatory" | "preference";
  severity?: Severity;
  is_enabled?: boolean;
  weight?: number;
  config?: Record<string, unknown>;
};

export type CurrentAssignment = {
  id?: string | null;
  institution_id?: string | null;
  schedule_id: string;
  group_id?: string | null;
  room_id: string;
  status?: string;
  locked_by_user?: boolean;
};

export type SolverConstraints = {
  teacher_constraints?: TeacherOperationalConstraint[];
  room_blocks?: RoomBlock[];
  room_reservations?: RoomReservation[];
  building_distances?: BuildingDistance[];
  capacity_waste_warning_ratio?: number;
  large_room_waste_ratio?: number;
  default_max_transfer_distance_meters?: number;
};

export type SolvePayload = {
  institution_id: string;
  academic_period_id?: string | null;
  groups: Group[];
  rooms: Room[];
  schedules: ScheduleBlock[];
  current_assignments?: CurrentAssignment[];
  rules?: AssignmentRule[];
  teacher_constraints?: TeacherOperationalConstraint[];
  room_blocks?: RoomBlock[];
  room_reservations?: RoomReservation[];
  building_distances?: BuildingDistance[];
  constraints?: SolverConstraints;
};

export type Assignment = {
  schedule_id: string;
  group_id: string;
  room_id: string;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  score: number;
  explanation: string;
  warnings: string[];
  source?: AssignmentSource;
  replaces_room_id?: string | null;
};

export type Conflict = {
  code: string;
  severity: Severity;
  schedule_id?: string | null;
  group_id?: string | null;
  room_id?: string | null;
  message: string;
  details?: Record<string, unknown>;
};

export type SolverWarning = {
  code: string;
  severity: Severity;
  schedule_id?: string | null;
  group_id?: string | null;
  room_id?: string | null;
  message: string;
  details?: Record<string, unknown>;
};

export type Explanation = {
  schedule_id: string;
  selected_room_id?: string | null;
  considered_rooms: number;
  rejected_rooms: Record<string, unknown>[];
  message: string;
};

export type SolveSummary = {
  total_schedules: number;
  current_assignments_checked: number;
  current_assignments_kept: number;
  assignments_generated: number;
  alternatives_suggested: number;
  unassigned: number;
  conflicts: number;
  warnings: number;
};

export type SolveResponse = {
  assignments: Assignment[];
  conflicts: Conflict[];
  warnings: SolverWarning[];
  explanations: Explanation[];
  summary: SolveSummary;
};

export const dayLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
};

