# Reglas de Asignacion

## Tipos de reglas

### Obligatorias

Si una regla obligatoria falla, el solver no debe generar asignacion para ese bloque.

### Preferencias

Si una preferencia falla, el solver puede asignar aula, pero debe aumentar el costo y devolver una advertencia.

## Reglas obligatorias V1

| Codigo | Regla | Resultado si falla |
| --- | --- | --- |
| room_time_conflict | Un aula no puede tener dos grupos al mismo tiempo | conflicto |
| group_time_conflict | Un grupo no puede tener dos aulas al mismo tiempo | conflicto |
| capacity_required | El aula debe tener capacidad suficiente | conflicto |
| teacher_accessibility | El aula debe cumplir restricciones operativas del profesor | conflicto |
| room_type_required | Si el grupo requiere aula especial, el aula debe ser compatible | conflicto |
| room_blocked | Un aula bloqueada no se puede usar | conflicto |
| reservation_mismatch | Un aula reservada solo se usa si el grupo cumple la condicion | conflicto |

## Preferencias V1

| Codigo | Preferencia | Efecto |
| --- | --- | --- |
| capacity_fit | Usar aulas cercanas a la capacidad real | baja el costo |
| avoid_large_room_waste | Evitar aulas grandes con grupos pequenos | sube el costo y advierte |
| nearby_buildings | Preferir edificios cercanos | sube el costo por distancia |
| teacher_transfer | Evitar traslados largos para profesores | sube el costo y advierte |
| cohort_zone | Mantener carrera/semestre en zonas cercanas | sube el costo si se aleja |
| large_groups_first | Priorizar grupos grandes | orden de asignacion |

## Contrato de entrada del solver

```json
{
  "institution_id": "inst_demo",
  "academic_period_id": "period_2026_1",
  "groups": [],
  "rooms": [],
  "schedules": [],
  "current_assignments": [],
  "rules": [],
  "teacher_constraints": [],
  "room_blocks": [],
  "constraints": {
    "room_reservations": [],
    "building_distances": []
  }
}
```

Nota de persistencia V1:

- Los bloqueos por horario se guardan en `room_blocks`.
- Las reservas permanentes de aulas especiales se guardan en `rooms.reserved_for_room_types`.
- `room_reservations` queda como restriccion transitoria del payload del solver para reservas por horario mas especificas en fases posteriores.

## Contrato de salida del solver

```json
{
  "assignments": [],
  "conflicts": [],
  "warnings": [],
  "explanations": [],
  "summary": {
    "total_schedules": 0,
    "current_assignments_checked": 0,
    "current_assignments_kept": 0,
    "assignments_generated": 0,
    "alternatives_suggested": 0,
    "unassigned": 0,
    "conflicts": 0,
    "warnings": 0
  }
}
```

## Motor MVP Fase 3

El solver realiza dos tareas:

- Valida asignaciones existentes en `current_assignments`.
- Propone aula alternativa cuando la asignacion actual falla una regla obligatoria o cuando no existe asignacion actual.

Las sugerencias se ordenan por:

1. Cumplimiento de reglas obligatorias.
2. Capacidad mas cercana al grupo.
3. Menor desperdicio de lugares.
4. Preferencia por edificio cercano o preferido.
5. Nombre de aula para mantener determinismo.

Ejemplos de mensajes:

- `El grupo LAM 2 M tiene 47 alumnos, pero Aula 1 C tiene capacidad maxima de 40.`
- `Se sugiere Aula 3 C para LAM 2 M porque esta disponible.`
- `No se puede usar Aula 10 B porque esta reservada para ingles.`
- `No se encontro aula disponible que cumpla capacidad, horario y restricciones.`

## Severidad

- `hard`: bloquea asignacion.
- `warning`: asignacion posible, pero hay preferencia incumplida.
- `info`: dato tecnico o explicacion.

## Criterio de desempate inicial

1. Menor costo total.
2. Menor desperdicio de capacidad.
3. Nombre de aula para mantener determinismo.

## Datos sensibles

Las restricciones de accesibilidad se modelan como condiciones operativas:

- `requires_ground_floor`
- `requires_elevator`
- `avoid_long_transfers`
- `required_room_features`

No se deben almacenar diagnosticos, documentos medicos ni explicaciones clinicas.
