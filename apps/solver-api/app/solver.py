from __future__ import annotations

from dataclasses import dataclass
from math import inf

from app.models import (
    Assignment,
    BuildingDistance,
    Conflict,
    CurrentAssignment,
    Explanation,
    Group,
    Room,
    RoomBlock,
    RoomReservation,
    ScheduleBlock,
    SolveRequest,
    SolveResponse,
    SolveSummary,
    SolverConstraints,
    TeacherOperationalConstraint,
    WarningMessage,
)


@dataclass(frozen=True)
class RuntimeAssignment:
    schedule: ScheduleBlock
    group: Group
    room: Room
    source: str


@dataclass(frozen=True)
class Rejection:
    code: str
    message: str
    details: dict[str, object]


@dataclass(frozen=True)
class RuntimeContext:
    constraints: SolverConstraints
    teacher_constraints: dict[str, TeacherOperationalConstraint]
    room_blocks: list[RoomBlock]
    room_reservations: list[RoomReservation]
    building_distances: list[BuildingDistance]


def solve(request: SolveRequest) -> SolveResponse:
    groups = {
        group.id: group
        for group in request.groups
        if group.institution_id == request.institution_id
        and _matches_period(group.academic_period_id, request.academic_period_id)
    }
    rooms = [
        room
        for room in request.rooms
        if room.institution_id == request.institution_id
        and room.is_active
        and room.is_reservable
    ]
    rooms_by_id = {room.id: room for room in rooms}
    schedules = [
        schedule
        for schedule in request.schedules
        if schedule.institution_id == request.institution_id
        and _matches_period(schedule.academic_period_id, request.academic_period_id)
    ]
    schedules_by_id = {schedule.id: schedule for schedule in schedules}
    context = _build_context(request)
    current_by_schedule = {
        assignment.schedule_id: assignment
        for assignment in request.current_assignments
        if _assignment_belongs_to_institution(assignment, request.institution_id)
    }

    assignments: list[Assignment] = []
    runtime_assignments: list[RuntimeAssignment] = []
    conflicts: list[Conflict] = []
    warnings: list[WarningMessage] = []
    explanations: list[Explanation] = []
    cohort_building: dict[tuple[str, int], str] = {}
    current_kept = 0
    generated_count = 0
    suggested_count = 0

    ordered_schedules = sorted(
        schedules,
        key=lambda schedule: (
            -_schedule_size(schedule, groups),
            schedule.day,
            _to_minutes(schedule.start_time),
            schedule.id,
        ),
    )

    for schedule in ordered_schedules:
        group = groups.get(schedule.group_id)
        if group is None:
            conflicts.append(
                Conflict(
                    code="unknown_group",
                    schedule_id=schedule.id,
                    group_id=schedule.group_id,
                    message="El bloque horario referencia un grupo inexistente o de otra institucion.",
                )
            )
            continue

        if _to_minutes(schedule.start_time) >= _to_minutes(schedule.end_time):
            conflicts.append(
                Conflict(
                    code="invalid_schedule_time",
                    schedule_id=schedule.id,
                    group_id=group.id,
                    message="La hora de inicio debe ser menor que la hora de fin.",
                )
            )
            continue

        group_overlap = _find_group_overlap(schedule, group, runtime_assignments)
        if group_overlap is not None:
            conflicts.append(
                Conflict(
                    code="group_time_conflict",
                    schedule_id=schedule.id,
                    group_id=group.id,
                    room_id=group_overlap.room.id,
                    message=(
                        f"El grupo {group.name} ya tiene aula {group_overlap.room.name} "
                        f"asignada en un horario que se traslapa."
                    ),
                    details={"overlapping_schedule_id": group_overlap.schedule.id},
                )
            )
            explanations.append(
                Explanation(
                    schedule_id=schedule.id,
                    considered_rooms=0,
                    message="No se buscaron alternativas porque el problema esta en el horario del grupo.",
                )
            )
            continue

        current = current_by_schedule.get(schedule.id)
        current_room = rooms_by_id.get(current.room_id) if current else None
        current_is_valid = False

        if current is not None and current_room is None:
            conflicts.append(
                Conflict(
                    code="unknown_room",
                    schedule_id=schedule.id,
                    group_id=group.id,
                    room_id=current.room_id,
                    message="La asignacion actual apunta a un aula inexistente o inactiva.",
                )
            )

        if current is not None and current_room is not None:
            rejections = _hard_rejections(
                schedule=schedule,
                group=group,
                room=current_room,
                runtime_assignments=runtime_assignments,
                teacher_constraint=context.teacher_constraints.get(schedule.teacher_id or ""),
                request=request,
                context=context,
            )
            if rejections:
                conflicts.extend(
                    _conflicts_from_rejections(schedule, group, current_room, rejections)
                )
            else:
                score, room_warnings, score_notes = _score_room(
                    schedule=schedule,
                    group=group,
                    room=current_room,
                    runtime_assignments=runtime_assignments,
                    teacher_constraint=context.teacher_constraints.get(schedule.teacher_id or ""),
                    request=request,
                    context=context,
                    cohort_building=cohort_building,
                )
                current_is_valid = True
                current_kept += 1
                assignment = Assignment(
                    schedule_id=schedule.id,
                    group_id=group.id,
                    room_id=current_room.id,
                    day=schedule.day,
                    start_time=schedule.start_time,
                    end_time=schedule.end_time,
                    score=round(score, 2),
                    explanation=(
                        f"Se conserva {current_room.name}; cumple las reglas obligatorias "
                        f"para {group.name} ({', '.join(score_notes)})."
                    ),
                    warnings=[warning.code for warning in room_warnings],
                    source="current",
                )
                assignments.append(assignment)
                runtime_assignments.append(
                    RuntimeAssignment(
                        schedule=schedule,
                        group=group,
                        room=current_room,
                        source="current",
                    )
                )
                warnings.extend(room_warnings)
                explanations.append(
                    Explanation(
                        schedule_id=schedule.id,
                        selected_room_id=current_room.id,
                        considered_rooms=1,
                        message=assignment.explanation,
                    )
                )

        if current_is_valid:
            _remember_cohort_building(cohort_building, group, current_room)
            continue

        assignment, candidate_warnings, explanation = _suggest_assignment(
            request=request,
            context=context,
            schedule=schedule,
            group=group,
            rooms=rooms,
            runtime_assignments=runtime_assignments,
            cohort_building=cohort_building,
            replaces_room_id=current.room_id if current else None,
        )

        explanations.append(explanation)
        if assignment is None:
            conflicts.append(
                Conflict(
                    code="no_available_room",
                    schedule_id=schedule.id,
                    group_id=group.id,
                    message="No se encontro aula disponible que cumpla capacidad, horario y restricciones.",
                    details={"rejected_rooms": explanation.rejected_rooms},
                )
            )
            continue

        assignments.append(assignment)
        runtime_assignments.append(
            RuntimeAssignment(
                schedule=schedule,
                group=group,
                room=rooms_by_id[assignment.room_id],
                source=assignment.source,
            )
        )
        warnings.extend(candidate_warnings)
        if assignment.source == "suggested":
            suggested_count += 1
        else:
            generated_count += 1
        _remember_cohort_building(cohort_building, group, rooms_by_id[assignment.room_id])

    missing_current_schedules = sorted(
        set(current_by_schedule).difference(schedules_by_id)
    )
    for schedule_id in missing_current_schedules:
        current = current_by_schedule[schedule_id]
        conflicts.append(
            Conflict(
                code="unknown_schedule",
                schedule_id=schedule_id,
                room_id=current.room_id,
                message="La asignacion actual referencia un horario que no existe en el payload.",
            )
        )

    summary = SolveSummary(
        total_schedules=len(schedules),
        current_assignments_checked=len(current_by_schedule),
        current_assignments_kept=current_kept,
        assignments_generated=generated_count,
        alternatives_suggested=suggested_count,
        unassigned=len(schedules) - len(assignments),
        conflicts=len(conflicts),
        warnings=len(warnings),
    )

    return SolveResponse(
        assignments=assignments,
        conflicts=conflicts,
        warnings=warnings,
        explanations=explanations,
        summary=summary,
    )


def _build_context(request: SolveRequest) -> RuntimeContext:
    constraints = request.constraints
    teacher_constraints = {
        item.teacher_id: item
        for item in [*constraints.teacher_constraints, *request.teacher_constraints]
    }
    return RuntimeContext(
        constraints=constraints,
        teacher_constraints=teacher_constraints,
        room_blocks=[*constraints.room_blocks, *request.room_blocks],
        room_reservations=[*constraints.room_reservations, *request.room_reservations],
        building_distances=[*constraints.building_distances, *request.building_distances],
    )


def _suggest_assignment(
    *,
    request: SolveRequest,
    context: RuntimeContext,
    schedule: ScheduleBlock,
    group: Group,
    rooms: list[Room],
    runtime_assignments: list[RuntimeAssignment],
    cohort_building: dict[tuple[str, int], str],
    replaces_room_id: str | None,
) -> tuple[Assignment | None, list[WarningMessage], Explanation]:
    candidates: list[tuple[float, Room, list[WarningMessage], list[str]]] = []
    rejected_rooms: list[dict[str, object]] = []

    for room in rooms:
        rejections = _hard_rejections(
            schedule=schedule,
            group=group,
            room=room,
            runtime_assignments=runtime_assignments,
            teacher_constraint=context.teacher_constraints.get(schedule.teacher_id or ""),
            request=request,
            context=context,
        )
        if rejections:
            rejected_rooms.append(
                {
                    "room_id": room.id,
                    "room_name": room.name,
                    "reasons": [rejection.code for rejection in rejections],
                    "messages": [rejection.message for rejection in rejections],
                }
            )
            continue

        score, room_warnings, score_notes = _score_room(
            schedule=schedule,
            group=group,
            room=room,
            runtime_assignments=runtime_assignments,
            teacher_constraint=context.teacher_constraints.get(schedule.teacher_id or ""),
            request=request,
            context=context,
            cohort_building=cohort_building,
        )
        candidates.append((score, room, room_warnings, score_notes))

    if not candidates:
        return (
            None,
            [],
            Explanation(
                schedule_id=schedule.id,
                considered_rooms=len(rooms),
                rejected_rooms=rejected_rooms,
                message="No se encontro aula disponible que cumpla capacidad y horario.",
            ),
        )

    score, selected_room, selected_warnings, score_notes = sorted(
        candidates,
        key=lambda candidate: (
            candidate[0],
            candidate[1].capacity - _schedule_size(schedule, {group.id: group}),
            candidate[1].name,
        ),
    )[0]
    source = "suggested" if replaces_room_id else "generated"
    explanation = _assignment_explanation(
        room=selected_room,
        group=group,
        source=source,
        notes=score_notes,
    )
    assignment = Assignment(
        schedule_id=schedule.id,
        group_id=group.id,
        room_id=selected_room.id,
        day=schedule.day,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        score=round(score, 2),
        explanation=explanation,
        warnings=[warning.code for warning in selected_warnings],
        source=source,
        replaces_room_id=replaces_room_id,
    )
    return (
        assignment,
        selected_warnings,
        Explanation(
            schedule_id=schedule.id,
            selected_room_id=selected_room.id,
            considered_rooms=len(rooms),
            rejected_rooms=rejected_rooms,
            message=explanation,
        ),
    )


def _hard_rejections(
    *,
    schedule: ScheduleBlock,
    group: Group,
    room: Room,
    runtime_assignments: list[RuntimeAssignment],
    teacher_constraint: TeacherOperationalConstraint | None,
    request: SolveRequest,
    context: RuntimeContext,
) -> list[Rejection]:
    rejections: list[Rejection] = []
    required_size = _schedule_size(schedule, {group.id: group})
    required_room_type = schedule.required_room_type or group.required_room_type
    required_features = set(group.required_features + schedule.required_features)

    if room.capacity < required_size:
        rejections.append(
            Rejection(
                code="capacity_required",
                message=(
                    f"El grupo {group.name} tiene {required_size} alumnos, pero "
                    f"{room.name} tiene capacidad maxima de {room.capacity}."
                ),
                details={
                    "group_size": required_size,
                    "room_capacity": room.capacity,
                },
            )
        )

    if room.reserved_for_room_types and (
        required_room_type not in room.reserved_for_room_types
    ):
        rejections.append(
            Rejection(
                code="reservation_mismatch",
                message=(
                    f"No se puede usar {room.name} porque esta reservada para "
                    f"{_join_labels(room.reserved_for_room_types)}."
                ),
                details={"reserved_for_room_types": room.reserved_for_room_types},
            )
        )

    if required_room_type and not _room_supports_type(room, required_room_type):
        rejections.append(
            Rejection(
                code="room_type_required",
                message=(
                    f"El grupo {group.name} requiere aula tipo {required_room_type}, "
                    f"pero {room.name} es tipo {room.room_type}."
                ),
                details={
                    "required_room_type": required_room_type,
                    "room_type": room.room_type,
                },
            )
        )

    missing_features = sorted(required_features.difference(room.features))
    if missing_features:
        rejections.append(
            Rejection(
                code="required_features",
                message=(
                    f"{room.name} no tiene las caracteristicas requeridas: "
                    f"{_join_labels(missing_features)}."
                ),
                details={"missing_features": missing_features},
            )
        )

    room_overlap = _find_room_overlap(schedule, room, runtime_assignments)
    if room_overlap is not None:
        rejections.append(
            Rejection(
                code="room_time_conflict",
                message=(
                    f"{room.name} ya esta asignada a {room_overlap.group.name} "
                    f"en un horario que se traslapa."
                ),
                details={"overlapping_schedule_id": room_overlap.schedule.id},
            )
        )

    block = _matching_room_block(schedule, room, request, context)
    if block is not None:
        rejections.append(
            Rejection(
                code="room_blocked",
                message=(
                    f"No se puede usar {room.name} porque esta bloqueada"
                    f"{f' por {block.reason}' if block.reason else ''}."
                ),
                details={
                    "reason": block.reason,
                    "day": block.day,
                    "start_time": block.start_time,
                    "end_time": block.end_time,
                },
            )
        )

    reservation = _matching_reservation_mismatch(
        schedule,
        group,
        room,
        required_room_type,
        context,
    )
    if reservation is not None:
        rejections.append(
            Rejection(
                code="reservation_mismatch",
                message=(
                    f"No se puede usar {room.name} porque esta reservada para "
                    f"{_join_labels(reservation.reserved_for_room_types)} en ese horario."
                ),
                details={"reserved_for_room_types": reservation.reserved_for_room_types},
            )
        )

    if teacher_constraint is not None:
        if teacher_constraint.requires_ground_floor and room.floor > 0:
            rejections.append(
                Rejection(
                    code="teacher_requires_ground_floor",
                    message=(
                        f"El profesor de {group.name} requiere planta baja y "
                        f"{room.name} esta en el piso {room.floor}."
                    ),
                    details={"room_floor": room.floor},
                )
            )

        if (
            teacher_constraint.requires_elevator
            and room.floor > 0
            and not room.has_elevator_access
        ):
            rejections.append(
                Rejection(
                    code="teacher_requires_elevator",
                    message=(
                        f"El profesor de {group.name} requiere elevador y "
                        f"{room.name} no tiene acceso por elevador."
                    ),
                    details={"room_floor": room.floor},
                )
            )

        missing_teacher_features = sorted(
            set(teacher_constraint.required_room_features).difference(room.features)
        )
        if missing_teacher_features:
            rejections.append(
                Rejection(
                    code="teacher_required_room_features",
                    message=(
                        f"{room.name} no cumple caracteristicas operativas requeridas "
                        f"para el profesor: {_join_labels(missing_teacher_features)}."
                    ),
                    details={"missing_features": missing_teacher_features},
                )
            )

    return rejections


def _score_room(
    *,
    schedule: ScheduleBlock,
    group: Group,
    room: Room,
    runtime_assignments: list[RuntimeAssignment],
    teacher_constraint: TeacherOperationalConstraint | None,
    request: SolveRequest,
    context: RuntimeContext,
    cohort_building: dict[tuple[str, int], str],
) -> tuple[float, list[WarningMessage], list[str]]:
    size = _schedule_size(schedule, {group.id: group})
    spare_capacity = room.capacity - size
    score = float(spare_capacity)
    warnings: list[WarningMessage] = []
    notes = [f"capacidad de {room.capacity} para {size} alumnos"]

    preferred_buildings = schedule.preferred_buildings or group.preferred_buildings
    if preferred_buildings and room.building_id not in preferred_buildings:
        distance = _distance_to_any(room.building_id, preferred_buildings, context.building_distances)
        score += 25 if distance is None else min(50, distance / 12)
        warnings.append(
            WarningMessage(
                code="nearby_buildings",
                schedule_id=schedule.id,
                group_id=group.id,
                room_id=room.id,
                message=(
                    f"{room.name} esta disponible, pero no esta en el edificio preferido "
                    f"para {group.name}."
                ),
                details={
                    "selected_building_id": room.building_id,
                    "preferred_buildings": preferred_buildings,
                    "distance_meters": distance,
                },
            )
        )
    elif preferred_buildings:
        notes.append("mismo edificio preferido")

    waste_ratio = spare_capacity / room.capacity
    if waste_ratio >= context.constraints.capacity_waste_warning_ratio:
        score += 20
        warnings.append(
            WarningMessage(
                code="capacity_fit",
                schedule_id=schedule.id,
                group_id=group.id,
                room_id=room.id,
                message=(
                    f"{room.name} cumple capacidad, pero deja {spare_capacity} lugares libres."
                ),
                details={
                    "room_capacity": room.capacity,
                    "group_size": size,
                    "spare_capacity": spare_capacity,
                },
            )
        )

    if waste_ratio >= context.constraints.large_room_waste_ratio:
        score += 30
        warnings.append(
            WarningMessage(
                code="avoid_large_room_waste",
                schedule_id=schedule.id,
                group_id=group.id,
                room_id=room.id,
                message=(
                    f"Se sugiere revisar {room.name}: es grande para el tamano de {group.name}."
                ),
                details={"waste_ratio": round(waste_ratio, 2)},
            )
        )

    if group.program_id is not None and group.semester is not None:
        cohort_key = (group.program_id, group.semester)
        base_building = cohort_building.get(cohort_key)
        if base_building is not None and base_building != room.building_id:
            distance = _distance_between(base_building, room.building_id, context.building_distances)
            if distance is not None:
                score += min(35, distance / 15)

    if schedule.teacher_id and teacher_constraint and teacher_constraint.avoid_long_transfers:
        transfer_distance = _nearest_teacher_transfer_distance(
            schedule=schedule,
            room=room,
            teacher_id=schedule.teacher_id,
            runtime_assignments=runtime_assignments,
            distances=context.building_distances,
        )
        max_distance = (
            teacher_constraint.max_transfer_distance_meters
            or context.constraints.default_max_transfer_distance_meters
        )
        if transfer_distance is not None and transfer_distance > max_distance:
            score += min(80, transfer_distance / 8)
            warnings.append(
                WarningMessage(
                    code="teacher_transfer",
                    schedule_id=schedule.id,
                    group_id=group.id,
                    room_id=room.id,
                    message=f"{room.name} implica un traslado largo para el profesor.",
                    details={
                        "distance_meters": transfer_distance,
                        "max_distance_meters": max_distance,
                    },
                )
            )

    return score, warnings, notes


def _conflicts_from_rejections(
    schedule: ScheduleBlock,
    group: Group,
    room: Room,
    rejections: list[Rejection],
) -> list[Conflict]:
    return [
        Conflict(
            code=rejection.code,
            schedule_id=schedule.id,
            group_id=group.id,
            room_id=room.id,
            message=rejection.message,
            details=rejection.details,
        )
        for rejection in rejections
    ]


def _schedule_size(schedule: ScheduleBlock, groups: dict[str, Group]) -> int:
    group = groups.get(schedule.group_id)
    return schedule.expected_students or (group.size if group else 1)


def _room_supports_type(room: Room, required_room_type: str) -> bool:
    return required_room_type in set(room.compatible_room_types + [room.room_type])


def _find_group_overlap(
    schedule: ScheduleBlock,
    group: Group,
    runtime_assignments: list[RuntimeAssignment],
) -> RuntimeAssignment | None:
    for assignment in runtime_assignments:
        if assignment.group.id == group.id and _overlaps(schedule, assignment.schedule):
            return assignment
    return None


def _find_room_overlap(
    schedule: ScheduleBlock,
    room: Room,
    runtime_assignments: list[RuntimeAssignment],
) -> RuntimeAssignment | None:
    for assignment in runtime_assignments:
        if assignment.room.id == room.id and _overlaps(schedule, assignment.schedule):
            return assignment
    return None


def _matching_room_block(
    schedule: ScheduleBlock,
    room: Room,
    request: SolveRequest,
    context: RuntimeContext,
) -> RoomBlock | None:
    for block in context.room_blocks:
        if not block.is_active:
            continue
        period_matches = block.academic_period_id in (None, request.academic_period_id, schedule.academic_period_id)
        if block.room_id == room.id and period_matches and _time_rule_overlaps(schedule, block):
            return block
    return None


def _matching_reservation_mismatch(
    schedule: ScheduleBlock,
    group: Group,
    room: Room,
    required_room_type: str | None,
    context: RuntimeContext,
) -> RoomReservation | None:
    for reservation in context.room_reservations:
        if reservation.room_id != room.id or not _time_rule_overlaps(schedule, reservation):
            continue
        if not _reservation_allows(reservation, group, required_room_type):
            return reservation
    return None


def _reservation_allows(
    reservation: RoomReservation,
    group: Group,
    required_room_type: str | None,
) -> bool:
    allowed_by_type = bool(
        required_room_type
        and required_room_type in reservation.reserved_for_room_types
    )
    allowed_by_program = bool(
        group.program_id and group.program_id in reservation.reserved_for_program_ids
    )
    return allowed_by_type or allowed_by_program


def _nearest_teacher_transfer_distance(
    *,
    schedule: ScheduleBlock,
    room: Room,
    teacher_id: str,
    runtime_assignments: list[RuntimeAssignment],
    distances: list[BuildingDistance],
) -> int | None:
    candidate_distances: list[int] = []
    for assignment in runtime_assignments:
        if assignment.schedule.teacher_id != teacher_id:
            continue
        if assignment.schedule.day != schedule.day:
            continue
        if _overlaps(schedule, assignment.schedule):
            continue
        gap = min(
            abs(_to_minutes(schedule.start_time) - _to_minutes(assignment.schedule.end_time)),
            abs(_to_minutes(assignment.schedule.start_time) - _to_minutes(schedule.end_time)),
        )
        if gap > 120:
            continue
        distance = _distance_between(
            assignment.room.building_id,
            room.building_id,
            distances,
        )
        if distance is not None:
            candidate_distances.append(distance)
    return min(candidate_distances) if candidate_distances else None


def _distance_to_any(
    building_id: str,
    preferred_buildings: list[str],
    distances: list[BuildingDistance],
) -> int | None:
    values = [
        _distance_between(building_id, preferred_building, distances)
        for preferred_building in preferred_buildings
    ]
    known_values = [value for value in values if value is not None]
    return min(known_values) if known_values else None


def _distance_between(
    from_building_id: str,
    to_building_id: str,
    distances: list[BuildingDistance],
) -> int | None:
    if from_building_id == to_building_id:
        return 0

    best_distance = inf
    for distance in distances:
        direct = (
            distance.from_building_id == from_building_id
            and distance.to_building_id == to_building_id
        )
        reverse = (
            distance.from_building_id == to_building_id
            and distance.to_building_id == from_building_id
        )
        if direct or reverse:
            best_distance = min(best_distance, distance.distance_meters)

    return None if best_distance == inf else int(best_distance)


def _time_rule_overlaps(schedule: ScheduleBlock, rule: object) -> bool:
    return (
        getattr(rule, "day") == schedule.day
        and max(_to_minutes(getattr(rule, "start_time")), _to_minutes(schedule.start_time))
        < min(_to_minutes(getattr(rule, "end_time")), _to_minutes(schedule.end_time))
    )


def _overlaps(left: ScheduleBlock, right: ScheduleBlock) -> bool:
    return (
        left.day == right.day
        and max(_to_minutes(left.start_time), _to_minutes(right.start_time))
        < min(_to_minutes(left.end_time), _to_minutes(right.end_time))
    )


def _to_minutes(value: str) -> int:
    hours, minutes = value.split(":", 1)
    return int(hours) * 60 + int(minutes)


def _assignment_explanation(
    *,
    room: Room,
    group: Group,
    source: str,
    notes: list[str],
) -> str:
    prefix = "Se sugiere" if source == "suggested" else "Se asigna"
    detail = ", ".join(notes)
    return f"{prefix} {room.name} para {group.name} porque esta disponible ({detail})."


def _remember_cohort_building(
    cohort_building: dict[tuple[str, int], str],
    group: Group,
    room: Room,
) -> None:
    if group.program_id is not None and group.semester is not None:
        cohort_building.setdefault((group.program_id, group.semester), room.building_id)


def _matches_period(value: str | None, academic_period_id: str | None) -> bool:
    return academic_period_id is None or value in (None, academic_period_id)


def _assignment_belongs_to_institution(
    assignment: CurrentAssignment,
    institution_id: str,
) -> bool:
    return assignment.institution_id in (None, institution_id)


def _join_labels(values: list[str]) -> str:
    return ", ".join(values) if values else "uso especial"

