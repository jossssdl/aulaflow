from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

Severity = Literal["hard", "warning", "info"]
AssignmentSource = Literal["current", "generated", "suggested"]


class Group(BaseModel):
    id: str
    institution_id: str
    name: str
    size: int = Field(ge=1)
    academic_period_id: str | None = None
    program_id: str | None = None
    semester: int | None = None
    shift: str | None = None
    required_room_type: str | None = None
    required_features: list[str] = Field(default_factory=list)
    preferred_buildings: list[str] = Field(default_factory=list)
    preferred_building_id: str | None = None

    @model_validator(mode="after")
    def include_preferred_building_id(self) -> "Group":
        if self.preferred_building_id and self.preferred_building_id not in self.preferred_buildings:
            self.preferred_buildings.append(self.preferred_building_id)
        return self


class Room(BaseModel):
    id: str
    institution_id: str
    name: str
    capacity: int = Field(ge=1)
    building_id: str
    floor: int = 0
    room_type: str = "normal"
    compatible_room_types: list[str] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    has_elevator_access: bool = False
    is_active: bool = True
    is_reservable: bool = True
    reserved_for_room_types: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def include_own_type(self) -> "Room":
        if not self.compatible_room_types:
            self.compatible_room_types = [self.room_type]
        elif self.room_type not in self.compatible_room_types:
            self.compatible_room_types.append(self.room_type)
        return self


class ScheduleBlock(BaseModel):
    id: str
    institution_id: str
    academic_period_id: str | None = None
    group_id: str
    day: str
    start_time: str
    end_time: str
    teacher_id: str | None = None
    course_name: str | None = None
    expected_students: int | None = Field(default=None, ge=1)
    required_room_type: str | None = None
    required_features: list[str] = Field(default_factory=list)
    preferred_buildings: list[str] = Field(default_factory=list)
    preferred_building_id: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_day_of_week(cls, data: Any) -> Any:
        if isinstance(data, dict) and "day" not in data and "day_of_week" in data:
            data = {**data, "day": data["day_of_week"]}
        return data

    @model_validator(mode="after")
    def include_preferred_building_id(self) -> "ScheduleBlock":
        if self.preferred_building_id and self.preferred_building_id not in self.preferred_buildings:
            self.preferred_buildings.append(self.preferred_building_id)
        return self


class TeacherOperationalConstraint(BaseModel):
    teacher_id: str
    requires_ground_floor: bool = False
    requires_elevator: bool = False
    avoid_long_transfers: bool = False
    max_transfer_distance_meters: int | None = None
    required_room_features: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_required_features(cls, data: Any) -> Any:
        if (
            isinstance(data, dict)
            and "required_room_features" not in data
            and "required_features" in data
        ):
            data = {**data, "required_room_features": data["required_features"]}
        return data


class TimeBoundRoomRule(BaseModel):
    room_id: str
    day: str
    start_time: str
    end_time: str
    academic_period_id: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_day_of_week(cls, data: Any) -> Any:
        if isinstance(data, dict) and "day" not in data and "day_of_week" in data:
            data = {**data, "day": data["day_of_week"]}
        return data


class RoomBlock(TimeBoundRoomRule):
    reason: str | None = None
    is_active: bool = True


class RoomReservation(TimeBoundRoomRule):
    reserved_for_room_types: list[str] = Field(default_factory=list)
    reserved_for_program_ids: list[str] = Field(default_factory=list)
    note: str | None = None


class BuildingDistance(BaseModel):
    from_building_id: str
    to_building_id: str
    distance_meters: int = Field(ge=0)


class AssignmentRule(BaseModel):
    code: str
    name: str | None = None
    rule_type: Literal["mandatory", "preference"] = "mandatory"
    severity: Severity = "hard"
    is_enabled: bool = True
    weight: float = Field(default=1, ge=0)
    config: dict[str, Any] = Field(default_factory=dict)


class CurrentAssignment(BaseModel):
    id: str | None = None
    institution_id: str | None = None
    schedule_id: str
    group_id: str | None = None
    room_id: str
    status: str = "current"
    locked_by_user: bool = False


class SolverConstraints(BaseModel):
    teacher_constraints: list[TeacherOperationalConstraint] = Field(default_factory=list)
    room_blocks: list[RoomBlock] = Field(default_factory=list)
    room_reservations: list[RoomReservation] = Field(default_factory=list)
    building_distances: list[BuildingDistance] = Field(default_factory=list)
    capacity_waste_warning_ratio: float = 0.5
    large_room_waste_ratio: float = 0.75
    default_max_transfer_distance_meters: int = 350


class SolveRequest(BaseModel):
    institution_id: str
    academic_period_id: str | None = None
    groups: list[Group]
    rooms: list[Room]
    schedules: list[ScheduleBlock]
    current_assignments: list[CurrentAssignment] = Field(default_factory=list)
    rules: list[AssignmentRule] = Field(default_factory=list)
    teacher_constraints: list[TeacherOperationalConstraint] = Field(default_factory=list)
    room_blocks: list[RoomBlock] = Field(default_factory=list)
    room_reservations: list[RoomReservation] = Field(default_factory=list)
    building_distances: list[BuildingDistance] = Field(default_factory=list)
    constraints: SolverConstraints = Field(default_factory=SolverConstraints)


class Assignment(BaseModel):
    schedule_id: str
    group_id: str
    room_id: str
    day: str
    start_time: str
    end_time: str
    score: float
    explanation: str
    warnings: list[str] = Field(default_factory=list)
    source: AssignmentSource = "generated"
    replaces_room_id: str | None = None


class Conflict(BaseModel):
    code: str
    severity: Severity = "hard"
    schedule_id: str | None = None
    group_id: str | None = None
    room_id: str | None = None
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class WarningMessage(BaseModel):
    code: str
    severity: Severity = "warning"
    schedule_id: str | None = None
    group_id: str | None = None
    room_id: str | None = None
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class Explanation(BaseModel):
    schedule_id: str
    selected_room_id: str | None = None
    considered_rooms: int = 0
    rejected_rooms: list[dict[str, Any]] = Field(default_factory=list)
    message: str


class SolveSummary(BaseModel):
    total_schedules: int
    current_assignments_checked: int
    current_assignments_kept: int
    assignments_generated: int
    alternatives_suggested: int
    unassigned: int
    conflicts: int
    warnings: int


class SolveResponse(BaseModel):
    assignments: list[Assignment]
    conflicts: list[Conflict]
    warnings: list[WarningMessage]
    explanations: list[Explanation]
    summary: SolveSummary

