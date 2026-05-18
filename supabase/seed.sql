insert into public.institutions (id, name, slug, status, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  'Escuela Demo San Rafael',
  'escuela-demo-san-rafael',
  'active',
  '{"default_timezone":"America/Mexico_City"}'::jsonb
)
on conflict (id) do nothing;

insert into public.campuses (id, institution_id, name, code, address, timezone)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Campus Central',
  'CENTRAL',
  'Av. Universidad 100',
  'America/Mexico_City'
)
on conflict (id) do nothing;

insert into public.buildings (id, institution_id, campus_id, name, code, floor_count, has_elevator, notes)
values
  (
    '20000000-0000-0000-0000-00000000000a',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Edificio A',
    'A',
    2,
    false,
    'Zona academica principal'
  ),
  (
    '20000000-0000-0000-0000-00000000000b',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Edificio B',
    'B',
    2,
    true,
    'Zona de laboratorios y computo'
  ),
  (
    '20000000-0000-0000-0000-00000000000c',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Edificio C',
    'C',
    1,
    true,
    'Zona de practicas especiales'
  )
on conflict (id) do nothing;

insert into public.academic_periods (id, institution_id, name, code, starts_on, ends_on, status)
values (
  '21000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Periodo 2026-1',
  '2026-1',
  '2026-01-12',
  '2026-06-19',
  'active'
)
on conflict (id) do nothing;

insert into public.programs (id, institution_id, campus_id, name, code)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Derecho',
    'DER'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Sistemas',
    'SIS'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Ingles',
    'ING'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Psicologia',
    'PSI'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Maestria Ejecutiva',
    'MAE'
  )
on conflict (id) do nothing;

insert into public.rooms (
  id,
  institution_id,
  building_id,
  name,
  code,
  capacity,
  room_type,
  floor,
  has_elevator_access,
  is_active,
  is_reservable,
  reserved_for_room_types,
  notes
)
values
  (
    '30000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-00000000000a',
    'A-101',
    'A-101',
    40,
    'normal',
    0,
    true,
    true,
    true,
    '{}'::text[],
    'Aula normal de planta baja'
  ),
  (
    '30000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-00000000000a',
    'A-102 Ingles',
    'A-102',
    40,
    'ingles',
    0,
    true,
    true,
    true,
    array['ingles']::text[],
    'Aula reservada para clases de ingles'
  ),
  (
    '30000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-00000000000a',
    'A-201',
    'A-201',
    60,
    'normal',
    1,
    false,
    true,
    true,
    '{}'::text[],
    'Aula amplia sin elevador'
  ),
  (
    '30000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-00000000000b',
    'B-101 Computo',
    'B-101',
    40,
    'computo',
    0,
    true,
    true,
    true,
    array['computo']::text[],
    'Laboratorio de computo'
  ),
  (
    '30000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-00000000000b',
    'B-202 Maestria',
    'B-202',
    40,
    'maestria',
    1,
    true,
    true,
    true,
    array['maestria']::text[],
    'Aula reservada para maestria'
  ),
  (
    '30000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-00000000000c',
    'C-010 Camara Gesell',
    'C-010',
    40,
    'camara_gesell',
    0,
    true,
    true,
    true,
    array['camara_gesell']::text[],
    'Aula especial reservada para camara Gesell'
  ),
  (
    '30000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-00000000000c',
    'C-101',
    'C-101',
    60,
    'normal',
    0,
    true,
    true,
    true,
    '{}'::text[],
    'Aula grande de planta baja'
  )
on conflict (id) do nothing;

insert into public.room_features (id, institution_id, room_id, feature_key, feature_label, quantity, metadata)
values
  ('31000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000101', 'proyector', 'Proyector', 1, '{}'::jsonb),
  ('31000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000102', 'audio', 'Audio para idiomas', 1, '{}'::jsonb),
  ('31000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000102', 'proyector', 'Proyector', 1, '{}'::jsonb),
  ('31000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000301', 'computadoras', 'Computadoras', 40, '{}'::jsonb),
  ('31000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000302', 'mesa_directiva', 'Mesa directiva', 1, '{}'::jsonb),
  ('31000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000401', 'camara', 'Sistema de camara', 1, '{}'::jsonb),
  ('31000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000401', 'audio', 'Audio bidireccional', 1, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.room_blocks (
  id,
  institution_id,
  room_id,
  academic_period_id,
  day_of_week,
  start_time,
  end_time,
  reason,
  is_active
)
values
  (
    '32000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000201',
    '21000000-0000-0000-0000-000000000001',
    'monday',
    '08:00',
    '12:00',
    'Evento institucional',
    true
  ),
  (
    '32000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000301',
    '21000000-0000-0000-0000-000000000001',
    'friday',
    '08:00',
    '10:00',
    'Mantenimiento preventivo',
    true
  )
on conflict (id) do nothing;

insert into public.teachers (id, institution_id, display_name, code, email, home_building_id)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Ana Torres',
    'T-ANA',
    'ana.torres@example.edu',
    '20000000-0000-0000-0000-00000000000a'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Omar Ruiz',
    'T-OMAR',
    'omar.ruiz@example.edu',
    '20000000-0000-0000-0000-00000000000b'
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Lucia Medina',
    'T-LUCIA',
    'lucia.medina@example.edu',
    '20000000-0000-0000-0000-00000000000c'
  ),
  (
    '60000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'Victor Salas',
    'T-VICTOR',
    'victor.salas@example.edu',
    '20000000-0000-0000-0000-00000000000a'
  )
on conflict (id) do nothing;

insert into public.teacher_constraints (
  id,
  institution_id,
  teacher_id,
  requires_ground_floor,
  requires_elevator,
  avoid_long_transfers,
  max_transfer_distance_meters,
  required_room_features,
  notes
)
values
  (
    '61000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    true,
    false,
    true,
    250,
    '{}'::text[],
    'Restriccion operativa: requiere planta baja y traslados cortos'
  ),
  (
    '61000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000003',
    true,
    false,
    false,
    null,
    '{}'::text[],
    'Restriccion operativa: requiere planta baja'
  )
on conflict (id) do nothing;

insert into public.groups (
  id,
  institution_id,
  academic_period_id,
  program_id,
  name,
  code,
  semester,
  shift,
  expected_students,
  required_room_type,
  required_features,
  preferred_building_id
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Derecho 1A Matutino',
    'DER-1A-M',
    1,
    'morning',
    38,
    'normal',
    '{}'::text[],
    '20000000-0000-0000-0000-00000000000a'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    'Sistemas 3B Matutino',
    'SIS-3B-M',
    3,
    'morning',
    36,
    'computo',
    array['computadoras']::text[],
    '20000000-0000-0000-0000-00000000000b'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'Ingles 2A Matutino',
    'ING-2A-M',
    2,
    'morning',
    30,
    'ingles',
    array['audio']::text[],
    '20000000-0000-0000-0000-00000000000a'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',
    'Psicologia 5A Matutino',
    'PSI-5A-M',
    5,
    'morning',
    24,
    'camara_gesell',
    array['camara']::text[],
    '20000000-0000-0000-0000-00000000000c'
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Derecho 1B Vespertino',
    'DER-1B-V',
    1,
    'evening',
    44,
    'normal',
    '{}'::text[],
    '20000000-0000-0000-0000-00000000000a'
  ),
  (
    '50000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000005',
    'Maestria Ejecutiva 1 Vespertino',
    'MAE-1-V',
    1,
    'evening',
    28,
    'maestria',
    '{}'::text[],
    '20000000-0000-0000-0000-00000000000b'
  ),
  (
    '50000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    'Ingles 1 Vespertino',
    'ING-1-V',
    1,
    'evening',
    32,
    'ingles',
    array['audio']::text[],
    '20000000-0000-0000-0000-00000000000a'
  ),
  (
    '50000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000004',
    'Psicologia 5B Vespertino',
    'PSI-5B-V',
    5,
    'evening',
    20,
    'camara_gesell',
    array['camara']::text[],
    '20000000-0000-0000-0000-00000000000c'
  )
on conflict (id) do nothing;

insert into public.schedules (
  id,
  institution_id,
  academic_period_id,
  group_id,
  teacher_id,
  course_name,
  day_of_week,
  start_time,
  end_time,
  expected_students,
  required_room_type,
  required_features,
  preferred_building_id
)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Introduccion al Derecho', 'monday', '08:00', '10:00', 38, 'normal', '{}'::text[], '20000000-0000-0000-0000-00000000000a'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Introduccion al Derecho', 'wednesday', '08:00', '10:00', 38, 'normal', '{}'::text[], '20000000-0000-0000-0000-00000000000a'),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'Programacion III', 'monday', '10:00', '12:00', 36, 'computo', array['computadoras']::text[], '20000000-0000-0000-0000-00000000000b'),
  ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'Programacion III', 'wednesday', '10:00', '12:00', 36, 'computo', array['computadoras']::text[], '20000000-0000-0000-0000-00000000000b'),
  ('70000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', 'Ingles II', 'tuesday', '08:00', '10:00', 30, 'ingles', array['audio']::text[], '20000000-0000-0000-0000-00000000000a'),
  ('70000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', 'Ingles II', 'thursday', '08:00', '10:00', 30, 'ingles', array['audio']::text[], '20000000-0000-0000-0000-00000000000a'),
  ('70000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000003', 'Practica de Entrevista', 'friday', '10:00', '12:00', 24, 'camara_gesell', array['camara']::text[], '20000000-0000-0000-0000-00000000000c'),
  ('70000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000001', 'Derecho Civil', 'tuesday', '18:00', '20:00', 44, 'normal', '{}'::text[], '20000000-0000-0000-0000-00000000000a'),
  ('70000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000001', 'Derecho Civil', 'thursday', '18:00', '20:00', 44, 'normal', '{}'::text[], '20000000-0000-0000-0000-00000000000a'),
  ('70000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000004', 'Seminario Directivo', 'monday', '18:00', '20:00', 28, 'maestria', '{}'::text[], '20000000-0000-0000-0000-00000000000b'),
  ('70000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000004', 'Seminario Directivo', 'wednesday', '18:00', '20:00', 28, 'maestria', '{}'::text[], '20000000-0000-0000-0000-00000000000b'),
  ('70000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000004', 'Ingles I', 'friday', '18:00', '20:00', 32, 'ingles', array['audio']::text[], '20000000-0000-0000-0000-00000000000a'),
  ('70000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000003', 'Practica de Observacion', 'friday', '16:00', '18:00', 20, 'camara_gesell', array['camara']::text[], '20000000-0000-0000-0000-00000000000c')
on conflict (id) do nothing;

insert into public.assignment_rules (
  id,
  institution_id,
  code,
  name,
  description,
  rule_type,
  severity,
  is_enabled,
  weight,
  config
)
values
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'room_time_conflict', 'Sin doble uso de aula', 'Un aula no puede tener dos grupos al mismo tiempo.', 'mandatory', 'hard', true, 1, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'group_time_conflict', 'Sin doble aula por grupo', 'Un grupo no puede tener dos aulas al mismo tiempo.', 'mandatory', 'hard', true, 1, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'capacity_required', 'Capacidad suficiente', 'El aula debe tener capacidad suficiente para el grupo.', 'mandatory', 'hard', true, 1, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'teacher_accessibility', 'Accesibilidad operativa', 'El aula debe cumplir restricciones operativas del profesor.', 'mandatory', 'hard', true, 1, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'room_type_required', 'Tipo de aula compatible', 'El aula debe ser compatible con el tipo requerido.', 'mandatory', 'hard', true, 1, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'room_blocked', 'Aula bloqueada', 'Las aulas bloqueadas por horario no pueden asignarse.', 'mandatory', 'hard', true, 1, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'room_reserved', 'Reserva de aula especial', 'Las aulas reservadas solo se usan con grupos compatibles.', 'mandatory', 'hard', true, 1, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'capacity_fit', 'Ajuste de capacidad', 'Preferir aulas cercanas al tamano real del grupo.', 'preference', 'warning', true, 10, '{"warning_ratio":0.45}'::jsonb),
  ('b0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'avoid_large_room_waste', 'Evitar desperdicio de aulas grandes', 'Penalizar aulas grandes con grupos pequenos.', 'preference', 'warning', true, 20, '{"large_room_waste_ratio":0.72}'::jsonb),
  ('b0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'nearby_buildings', 'Preferir edificios cercanos', 'Penalizar cambios de edificio innecesarios.', 'preference', 'warning', true, 15, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'teacher_transfer', 'Evitar traslados largos', 'Penalizar traslados largos para profesores.', 'preference', 'warning', true, 15, '{"default_max_transfer_distance_meters":350}'::jsonb),
  ('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'large_groups_first', 'Priorizar grupos grandes', 'Ordenar la asignacion por grupos de mayor demanda.', 'preference', 'info', true, 5, '{}'::jsonb)
on conflict (id) do nothing;

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
values (
  '80000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  'completed',
  'automatic',
  'seed-v1',
  '{"source":"seed","note":"Caso base de escuela demo"}'::jsonb,
  '{"assignments":13,"conflicts":1,"warnings":1}'::jsonb,
  '[{"level":"info","message":"Seed run loaded"}]'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.assignments (
  id,
  institution_id,
  assignment_run_id,
  schedule_id,
  group_id,
  room_id,
  status,
  score,
  explanation
)
values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000101', 'proposed', 2, 'Aula normal cercana y con capacidad suficiente.'),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000101', 'proposed', 2, 'Aula normal cercana y con capacidad suficiente.'),
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000301', 'proposed', 4, 'Laboratorio de computo compatible.'),
  ('90000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000301', 'proposed', 4, 'Laboratorio de computo compatible.'),
  ('90000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000102', 'proposed', 10, 'Aula reservada para ingles.'),
  ('90000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000102', 'proposed', 10, 'Aula reservada para ingles.'),
  ('90000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000401', 'proposed', 16, 'Aula especial de camara Gesell.'),
  ('90000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000402', 'proposed', 16, 'Aula grande disponible para grupo vespertino.'),
  ('90000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000402', 'proposed', 16, 'Aula grande disponible para grupo vespertino.'),
  ('90000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000302', 'proposed', 12, 'Aula reservada para maestria.'),
  ('90000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000302', 'proposed', 12, 'Aula reservada para maestria.'),
  ('90000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000102', 'proposed', 8, 'Aula reservada para ingles.'),
  ('90000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000401', 'proposed', 20, 'Aula especial de camara Gesell.')
on conflict (id) do nothing;

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
values (
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000201',
  'room_blocked',
  'hard',
  'El aula A-201 esta bloqueada durante el horario solicitado.',
  '{"reason":"Evento institucional","day_of_week":"monday","start_time":"08:00","end_time":"12:00"}'::jsonb
)
on conflict (id) do nothing;

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
values (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000013',
  '50000000-0000-0000-0000-000000000008',
  '30000000-0000-0000-0000-000000000401',
  'capacity_fit',
  'warning',
  'El aula cumple capacidad, pero queda con espacio libre relevante.',
  '{"room_capacity":40,"group_size":20,"spare_capacity":20}'::jsonb
)
on conflict (id) do nothing;
