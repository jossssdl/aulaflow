create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_status_check check (status in ('active', 'inactive')),
  constraint institutions_slug_check check (slug = lower(slug) and slug <> '')
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_institution_id_id_key unique (institution_id, id),
  constraint campuses_institution_code_key unique (institution_id, code),
  constraint campuses_code_check check (code <> '')
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  campus_id uuid not null,
  name text not null,
  code text not null,
  floor_count integer not null default 1,
  has_elevator boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buildings_institution_id_id_key unique (institution_id, id),
  constraint buildings_institution_campus_code_key unique (institution_id, campus_id, code),
  constraint buildings_campus_fk foreign key (institution_id, campus_id)
    references public.campuses (institution_id, id) on delete cascade,
  constraint buildings_floor_count_check check (floor_count >= 1),
  constraint buildings_code_check check (code <> '')
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  building_id uuid not null,
  name text not null,
  code text not null,
  capacity integer not null,
  room_type text not null default 'normal',
  floor integer not null default 0,
  has_elevator_access boolean not null default false,
  is_active boolean not null default true,
  is_reservable boolean not null default true,
  reserved_for_room_types text[] not null default '{}'::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_institution_id_id_key unique (institution_id, id),
  constraint rooms_institution_code_key unique (institution_id, code),
  constraint rooms_building_fk foreign key (institution_id, building_id)
    references public.buildings (institution_id, id) on delete cascade,
  constraint rooms_capacity_check check (capacity > 0),
  constraint rooms_floor_check check (floor >= 0),
  constraint rooms_room_type_check check (room_type <> ''),
  constraint rooms_code_check check (code <> '')
);

create table public.room_features (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  room_id uuid not null,
  feature_key text not null,
  feature_label text not null,
  quantity integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint room_features_institution_id_id_key unique (institution_id, id),
  constraint room_features_room_feature_key unique (institution_id, room_id, feature_key),
  constraint room_features_room_fk foreign key (institution_id, room_id)
    references public.rooms (institution_id, id) on delete cascade,
  constraint room_features_feature_key_check check (feature_key <> ''),
  constraint room_features_quantity_check check (quantity is null or quantity >= 0)
);

create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,
  code text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_periods_institution_id_id_key unique (institution_id, id),
  constraint academic_periods_institution_code_key unique (institution_id, code),
  constraint academic_periods_status_check check (status in ('draft', 'active', 'closed')),
  constraint academic_periods_dates_check check (ends_on >= starts_on)
);

create table public.room_blocks (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  room_id uuid not null,
  academic_period_id uuid,
  day_of_week text not null,
  start_time time not null,
  end_time time not null,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_blocks_institution_id_id_key unique (institution_id, id),
  constraint room_blocks_room_fk foreign key (institution_id, room_id)
    references public.rooms (institution_id, id) on delete cascade,
  constraint room_blocks_academic_period_fk foreign key (institution_id, academic_period_id)
    references public.academic_periods (institution_id, id) on delete cascade,
  constraint room_blocks_day_of_week_check check (
    day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ),
  constraint room_blocks_time_check check (end_time > start_time)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  campus_id uuid,
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_institution_id_id_key unique (institution_id, id),
  constraint programs_institution_code_key unique (institution_id, code),
  constraint programs_campus_fk foreign key (institution_id, campus_id)
    references public.campuses (institution_id, id),
  constraint programs_code_check check (code <> '')
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  academic_period_id uuid not null,
  program_id uuid,
  name text not null,
  code text not null,
  semester integer,
  shift text not null default 'morning',
  expected_students integer not null,
  required_room_type text,
  required_features text[] not null default '{}'::text[],
  preferred_building_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_institution_id_id_key unique (institution_id, id),
  constraint groups_institution_period_id_key unique (institution_id, id, academic_period_id),
  constraint groups_institution_period_code_key unique (institution_id, academic_period_id, code),
  constraint groups_academic_period_fk foreign key (institution_id, academic_period_id)
    references public.academic_periods (institution_id, id) on delete cascade,
  constraint groups_program_fk foreign key (institution_id, program_id)
    references public.programs (institution_id, id),
  constraint groups_preferred_building_fk foreign key (institution_id, preferred_building_id)
    references public.buildings (institution_id, id),
  constraint groups_expected_students_check check (expected_students > 0),
  constraint groups_semester_check check (semester is null or semester > 0),
  constraint groups_shift_check check (shift in ('morning', 'evening', 'mixed')),
  constraint groups_code_check check (code <> '')
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  display_name text not null,
  code text,
  email text,
  home_building_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teachers_institution_id_id_key unique (institution_id, id),
  constraint teachers_institution_code_key unique (institution_id, code),
  constraint teachers_home_building_fk foreign key (institution_id, home_building_id)
    references public.buildings (institution_id, id),
  constraint teachers_code_check check (code is null or code <> '')
);

create table public.teacher_constraints (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  teacher_id uuid not null,
  requires_ground_floor boolean not null default false,
  requires_elevator boolean not null default false,
  avoid_long_transfers boolean not null default false,
  max_transfer_distance_meters integer,
  required_room_features text[] not null default '{}'::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_constraints_institution_id_id_key unique (institution_id, id),
  constraint teacher_constraints_teacher_key unique (institution_id, teacher_id),
  constraint teacher_constraints_teacher_fk foreign key (institution_id, teacher_id)
    references public.teachers (institution_id, id) on delete cascade,
  constraint teacher_constraints_max_transfer_check
    check (max_transfer_distance_meters is null or max_transfer_distance_meters >= 0)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  academic_period_id uuid not null,
  group_id uuid not null,
  teacher_id uuid,
  course_name text,
  day_of_week text not null,
  start_time time not null,
  end_time time not null,
  expected_students integer,
  required_room_type text,
  required_features text[] not null default '{}'::text[],
  preferred_building_id uuid,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_institution_id_id_key unique (institution_id, id),
  constraint schedules_institution_id_group_key unique (institution_id, id, group_id),
  constraint schedules_institution_group_period_key unique (institution_id, id, group_id, academic_period_id),
  constraint schedules_academic_period_fk foreign key (institution_id, academic_period_id)
    references public.academic_periods (institution_id, id) on delete cascade,
  constraint schedules_group_period_fk foreign key (institution_id, group_id, academic_period_id)
    references public.groups (institution_id, id, academic_period_id) on delete cascade,
  constraint schedules_teacher_fk foreign key (institution_id, teacher_id)
    references public.teachers (institution_id, id),
  constraint schedules_preferred_building_fk foreign key (institution_id, preferred_building_id)
    references public.buildings (institution_id, id),
  constraint schedules_day_of_week_check check (
    day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ),
  constraint schedules_time_check check (end_time > start_time),
  constraint schedules_expected_students_check check (expected_students is null or expected_students > 0),
  constraint schedules_status_check check (status in ('active', 'cancelled'))
);

create table public.assignment_rules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  rule_type text not null,
  severity text not null,
  is_enabled boolean not null default true,
  weight numeric(10, 2) not null default 1,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_rules_institution_id_id_key unique (institution_id, id),
  constraint assignment_rules_institution_code_key unique (institution_id, code),
  constraint assignment_rules_type_check check (rule_type in ('mandatory', 'preference')),
  constraint assignment_rules_severity_check check (severity in ('hard', 'warning', 'info')),
  constraint assignment_rules_weight_check check (weight >= 0),
  constraint assignment_rules_code_check check (code <> '')
);

create table public.assignment_runs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  academic_period_id uuid not null,
  status text not null default 'queued',
  mode text not null default 'automatic',
  solver_version text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  logs jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_runs_institution_id_id_key unique (institution_id, id),
  constraint assignment_runs_academic_period_fk foreign key (institution_id, academic_period_id)
    references public.academic_periods (institution_id, id) on delete cascade,
  constraint assignment_runs_status_check check (status in ('queued', 'running', 'completed', 'failed')),
  constraint assignment_runs_mode_check check (mode in ('automatic', 'semi_automatic', 'validation_only')),
  constraint assignment_runs_finished_check check (finished_at is null or started_at is null or finished_at >= started_at)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  assignment_run_id uuid not null,
  schedule_id uuid not null,
  group_id uuid not null,
  room_id uuid not null,
  status text not null default 'proposed',
  score numeric(12, 2),
  explanation text,
  locked_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_institution_id_id_key unique (institution_id, id),
  constraint assignments_run_schedule_key unique (institution_id, assignment_run_id, schedule_id),
  constraint assignments_assignment_run_fk foreign key (institution_id, assignment_run_id)
    references public.assignment_runs (institution_id, id) on delete cascade,
  constraint assignments_schedule_group_period_fk foreign key (institution_id, schedule_id, group_id)
    references public.schedules (institution_id, id, group_id) on delete cascade,
  constraint assignments_group_fk foreign key (institution_id, group_id)
    references public.groups (institution_id, id),
  constraint assignments_room_fk foreign key (institution_id, room_id)
    references public.rooms (institution_id, id),
  constraint assignments_status_check check (status in ('proposed', 'accepted', 'rejected', 'locked')),
  constraint assignments_score_check check (score is null or score >= 0)
);

create table public.assignment_conflicts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  assignment_run_id uuid not null,
  schedule_id uuid,
  group_id uuid,
  room_id uuid,
  code text not null,
  severity text not null default 'hard',
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint assignment_conflicts_institution_id_id_key unique (institution_id, id),
  constraint assignment_conflicts_assignment_run_fk foreign key (institution_id, assignment_run_id)
    references public.assignment_runs (institution_id, id) on delete cascade,
  constraint assignment_conflicts_schedule_fk foreign key (institution_id, schedule_id)
    references public.schedules (institution_id, id),
  constraint assignment_conflicts_group_fk foreign key (institution_id, group_id)
    references public.groups (institution_id, id),
  constraint assignment_conflicts_room_fk foreign key (institution_id, room_id)
    references public.rooms (institution_id, id),
  constraint assignment_conflicts_severity_check check (severity in ('hard', 'warning', 'info')),
  constraint assignment_conflicts_code_check check (code <> '')
);

create table public.assignment_warnings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null,
  assignment_run_id uuid not null,
  schedule_id uuid,
  group_id uuid,
  room_id uuid,
  code text not null,
  severity text not null default 'warning',
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint assignment_warnings_institution_id_id_key unique (institution_id, id),
  constraint assignment_warnings_assignment_run_fk foreign key (institution_id, assignment_run_id)
    references public.assignment_runs (institution_id, id) on delete cascade,
  constraint assignment_warnings_schedule_fk foreign key (institution_id, schedule_id)
    references public.schedules (institution_id, id),
  constraint assignment_warnings_group_fk foreign key (institution_id, group_id)
    references public.groups (institution_id, id),
  constraint assignment_warnings_room_fk foreign key (institution_id, room_id)
    references public.rooms (institution_id, id),
  constraint assignment_warnings_severity_check check (severity in ('warning', 'info')),
  constraint assignment_warnings_code_check check (code <> '')
);

create index campuses_institution_idx on public.campuses (institution_id);
create index buildings_institution_campus_idx on public.buildings (institution_id, campus_id);
create index rooms_institution_building_type_idx on public.rooms (institution_id, building_id, room_type);
create index rooms_institution_capacity_idx on public.rooms (institution_id, capacity);
create index room_features_institution_room_idx on public.room_features (institution_id, room_id);
create index room_blocks_institution_room_time_idx on public.room_blocks (
  institution_id,
  room_id,
  day_of_week,
  start_time,
  end_time
);
create index academic_periods_institution_status_idx on public.academic_periods (institution_id, status);
create index programs_institution_idx on public.programs (institution_id);
create index groups_institution_period_program_idx on public.groups (institution_id, academic_period_id, program_id);
create index teachers_institution_active_idx on public.teachers (institution_id, is_active);
create index schedules_institution_period_time_idx on public.schedules (
  institution_id,
  academic_period_id,
  day_of_week,
  start_time,
  end_time
);
create index schedules_institution_group_idx on public.schedules (institution_id, group_id);
create index assignment_runs_institution_period_idx on public.assignment_runs (institution_id, academic_period_id, created_at desc);
create index assignments_institution_run_room_idx on public.assignments (institution_id, assignment_run_id, room_id);
create index assignments_institution_schedule_idx on public.assignments (institution_id, schedule_id);
create index assignment_conflicts_institution_run_idx on public.assignment_conflicts (institution_id, assignment_run_id);
create index assignment_warnings_institution_run_idx on public.assignment_warnings (institution_id, assignment_run_id);
create index assignment_rules_institution_enabled_idx on public.assignment_rules (institution_id, is_enabled, rule_type);

create trigger set_institutions_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

create trigger set_campuses_updated_at
before update on public.campuses
for each row execute function public.set_updated_at();

create trigger set_buildings_updated_at
before update on public.buildings
for each row execute function public.set_updated_at();

create trigger set_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

create trigger set_room_blocks_updated_at
before update on public.room_blocks
for each row execute function public.set_updated_at();

create trigger set_academic_periods_updated_at
before update on public.academic_periods
for each row execute function public.set_updated_at();

create trigger set_programs_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

create trigger set_groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create trigger set_teachers_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

create trigger set_teacher_constraints_updated_at
before update on public.teacher_constraints
for each row execute function public.set_updated_at();

create trigger set_schedules_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

create trigger set_assignment_rules_updated_at
before update on public.assignment_rules
for each row execute function public.set_updated_at();

create trigger set_assignment_runs_updated_at
before update on public.assignment_runs
for each row execute function public.set_updated_at();

create trigger set_assignments_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

comment on table public.teacher_constraints is
  'Restricciones operativas de profesores. No almacenar diagnosticos medicos.';

comment on column public.teacher_constraints.required_room_features is
  'Caracteristicas operativas requeridas en aula, sin datos medicos sensibles.';

comment on table public.room_blocks is
  'Bloqueos de aulas por dia y horario para mantenimiento, eventos u otras indisponibilidades.';

comment on column public.rooms.reserved_for_room_types is
  'Si contiene valores, el aula queda reservada para esos tipos de clase o grupo.';
