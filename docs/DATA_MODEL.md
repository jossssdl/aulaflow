# Modelo de Datos Inicial

La fuente ejecutable del esquema esta en:

- `supabase/migrations/20260518120000_initial_schema.sql`
- `supabase/seed.sql`

## Principios

- Cada tabla operativa incluye `institution_id`.
- Las relaciones clave usan FKs compuestas con `institution_id` para evitar cruces entre instituciones.
- Se guardan restricciones operativas, no diagnosticos medicos.
- Las ejecuciones del solver son auditables con payload, respuesta y logs en `assignment_runs`.
- La autenticacion avanzada y las politicas RLS se implementaran en una fase posterior.

## Entidades

### institutions

Instituciones o escuelas que usan el SaaS.

Campos principales: `id`, `name`, `slug`, `status`, `settings`, `created_at`, `updated_at`.

### campuses

Sedes o campus dentro de una institucion.

Campos principales: `id`, `institution_id`, `name`, `code`, `address`, `timezone`.

### buildings

Edificios dentro de un campus.

Campos principales: `id`, `institution_id`, `campus_id`, `name`, `code`, `floor_count`, `has_elevator`.

### rooms

Aulas y espacios asignables.

Campos principales: `id`, `institution_id`, `building_id`, `name`, `code`, `capacity`, `room_type`, `floor`, `has_elevator_access`, `is_active`, `is_reservable`, `reserved_for_room_types`.

`reserved_for_room_types` permite modelar aulas especiales reservadas para usos como `ingles`, `maestria` o `camara_gesell`.

### room_features

Caracteristicas o equipo del aula.

Campos principales: `id`, `institution_id`, `room_id`, `feature_key`, `feature_label`, `quantity`, `metadata`.

Ejemplos: `proyector`, `audio`, `computadoras`, `camara`, `mesa_directiva`.

### room_blocks

Bloqueos operativos de aulas por periodo, dia y horario.

Campos principales: `id`, `institution_id`, `room_id`, `academic_period_id`, `day_of_week`, `start_time`, `end_time`, `reason`, `is_active`.

Se usa para mantenimiento, eventos, uso administrativo o cualquier causa que impida asignar un aula.

### academic_periods

Periodos escolares.

Campos principales: `id`, `institution_id`, `name`, `code`, `starts_on`, `ends_on`, `status`.

Estados: `draft`, `active`, `closed`.

### programs

Carreras, areas academicas o programas.

Campos principales: `id`, `institution_id`, `campus_id`, `name`, `code`.

### groups

Grupos escolares por periodo.

Campos principales: `id`, `institution_id`, `academic_period_id`, `program_id`, `name`, `code`, `semester`, `shift`, `expected_students`, `required_room_type`, `required_features`, `preferred_building_id`.

Turnos: `morning`, `evening`, `mixed`.

### teachers

Profesores.

Campos principales: `id`, `institution_id`, `display_name`, `code`, `email`, `home_building_id`, `is_active`.

### teacher_constraints

Restricciones operativas de profesores. No guardan diagnosticos.

Campos principales: `id`, `institution_id`, `teacher_id`, `requires_ground_floor`, `requires_elevator`, `avoid_long_transfers`, `max_transfer_distance_meters`, `required_room_features`, `notes`.

### schedules

Bloques horarios por grupo.

Campos principales: `id`, `institution_id`, `academic_period_id`, `group_id`, `teacher_id`, `course_name`, `day_of_week`, `start_time`, `end_time`, `expected_students`, `required_room_type`, `required_features`, `preferred_building_id`, `status`.

`day_of_week` usa valores `monday` a `sunday`.

### assignment_rules

Reglas configurables por institucion.

Campos principales: `id`, `institution_id`, `code`, `name`, `description`, `rule_type`, `severity`, `is_enabled`, `weight`, `config`.

Tipos: `mandatory`, `preference`.

### assignment_runs

Ejecuciones del motor.

Campos principales: `id`, `institution_id`, `academic_period_id`, `status`, `mode`, `solver_version`, `request_payload`, `response_payload`, `logs`, `started_at`, `finished_at`.

Estados: `queued`, `running`, `completed`, `failed`.

Modos: `automatic`, `semi_automatic`, `validation_only`.

### assignments

Asignaciones propuestas o aceptadas.

Campos principales: `id`, `institution_id`, `assignment_run_id`, `schedule_id`, `group_id`, `room_id`, `status`, `score`, `explanation`, `locked_by_user`.

Estados: `proposed`, `accepted`, `rejected`, `locked`.

### assignment_conflicts

Conflictos duros devueltos por el solver.

Campos principales: `id`, `institution_id`, `assignment_run_id`, `schedule_id`, `group_id`, `room_id`, `code`, `severity`, `message`, `details`.

### assignment_warnings

Advertencias de preferencias incumplidas.

Campos principales: `id`, `institution_id`, `assignment_run_id`, `schedule_id`, `group_id`, `room_id`, `code`, `severity`, `message`, `details`.

## Indices iniciales

El esquema incluye indices para:

- Aulas por institucion, edificio, tipo y capacidad.
- Bloqueos de aulas por institucion, aula, dia y rango horario.
- Grupos por institucion, periodo y programa.
- Horarios por institucion, periodo, dia y rango horario.
- Corridas por institucion y periodo.
- Asignaciones por corrida, aula y horario.
- Conflictos y advertencias por corrida.
- Reglas activas por institucion.

## Seed

El seed crea una escuela demo con:

- 1 institucion.
- 1 campus.
- Edificios A, B y C.
- Aulas de capacidad 40 y 60.
- Aulas reservadas para `ingles`, `maestria` y `camara_gesell`.
- Bloqueos de aulas por evento y mantenimiento.
- Grupos matutinos y vespertinos.
- Horarios de lunes a viernes.
- Grupos con distintas cantidades de alumnos.
- Restricciones operativas de profesores sin datos medicos sensibles.
- Reglas obligatorias y preferencias iniciales.
- Conflictos y advertencias explicables de ejemplo.
- Una corrida de asignacion de ejemplo.

## RLS futuro

Cuando se implemente autenticacion, las tablas con `institution_id` deberan habilitar RLS y validar membresia por institucion. La politica base sera:

```sql
exists (
  select 1
  from institution_members m
  where m.institution_id = <table>.institution_id
    and m.user_id = auth.uid()
)
```

La tabla `institution_members` se agregara junto con autenticacion avanzada.
