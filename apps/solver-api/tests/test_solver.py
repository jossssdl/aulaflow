from app.models import (
    CurrentAssignment,
    Group,
    Room,
    RoomBlock,
    ScheduleBlock,
    SolveRequest,
    SolverConstraints,
    TeacherOperationalConstraint,
)
from app.solver import solve


def test_assigns_two_groups_without_room_overlap() -> None:
    request = SolveRequest(
        institution_id="inst_demo",
        groups=[
            Group(id="g1", institution_id="inst_demo", name="Derecho 1A", size=38),
            Group(id="g2", institution_id="inst_demo", name="Computo 2A", size=24),
        ],
        rooms=[
            Room(
                id="r1",
                institution_id="inst_demo",
                name="A-101",
                capacity=40,
                building_id="a",
            ),
            Room(
                id="r2",
                institution_id="inst_demo",
                name="B-201",
                capacity=30,
                building_id="b",
                room_type="computo",
            ),
        ],
        schedules=[
            ScheduleBlock(
                id="s1",
                institution_id="inst_demo",
                group_id="g1",
                day="monday",
                start_time="08:00",
                end_time="10:00",
            ),
            ScheduleBlock(
                id="s2",
                institution_id="inst_demo",
                group_id="g2",
                day="monday",
                start_time="08:00",
                end_time="10:00",
                required_room_type="computo",
            ),
        ],
    )

    response = solve(request)

    assert len(response.assignments) == 2
    assert response.conflicts == []
    assert {assignment.room_id for assignment in response.assignments} == {"r1", "r2"}


def test_reports_conflict_when_only_room_is_blocked() -> None:
    request = SolveRequest(
        institution_id="inst_demo",
        groups=[
            Group(id="g1", institution_id="inst_demo", name="Derecho 1A", size=20),
        ],
        rooms=[
            Room(
                id="r1",
                institution_id="inst_demo",
                name="A-101",
                capacity=30,
                building_id="a",
            ),
        ],
        schedules=[
            ScheduleBlock(
                id="s1",
                institution_id="inst_demo",
                group_id="g1",
                day="tuesday",
                start_time="08:00",
                end_time="10:00",
            )
        ],
        constraints=SolverConstraints(
            room_blocks=[
                RoomBlock(
                    room_id="r1",
                    day="tuesday",
                    start_time="07:00",
                    end_time="11:00",
                    reason="Mantenimiento",
                )
            ]
        ),
    )

    response = solve(request)

    assert response.assignments == []
    assert response.conflicts[0].code == "no_available_room"
    assert "room_blocked" in response.conflicts[0].details["rejected_rooms"][0]["reasons"]


def test_teacher_ground_floor_constraint_is_hard_rule() -> None:
    request = SolveRequest(
        institution_id="inst_demo",
        groups=[
            Group(id="g1", institution_id="inst_demo", name="Maestria", size=18),
        ],
        rooms=[
            Room(
                id="r1",
                institution_id="inst_demo",
                name="C-301",
                capacity=24,
                building_id="c",
                floor=2,
            ),
        ],
        schedules=[
            ScheduleBlock(
                id="s1",
                institution_id="inst_demo",
                group_id="g1",
                teacher_id="t1",
                day="wednesday",
                start_time="18:00",
                end_time="20:00",
            )
        ],
        constraints=SolverConstraints(
            teacher_constraints=[
                TeacherOperationalConstraint(
                    teacher_id="t1",
                    requires_ground_floor=True,
                )
            ]
        ),
    )

    response = solve(request)

    assert response.assignments == []
    rejected = response.conflicts[0].details["rejected_rooms"][0]["reasons"]
    assert "teacher_requires_ground_floor" in rejected


def test_suggests_alternative_when_current_room_lacks_capacity() -> None:
    request = SolveRequest(
        institution_id="inst_demo",
        academic_period_id="period_1",
        groups=[
            Group(
                id="g1",
                institution_id="inst_demo",
                academic_period_id="period_1",
                name="LAM 2 M",
                size=47,
                preferred_buildings=["c"],
            ),
        ],
        rooms=[
            Room(
                id="r_small",
                institution_id="inst_demo",
                name="Aula 1 C",
                capacity=40,
                building_id="c",
            ),
            Room(
                id="r_large",
                institution_id="inst_demo",
                name="Aula 3 C",
                capacity=60,
                building_id="c",
            ),
        ],
        schedules=[
            ScheduleBlock(
                id="s1",
                institution_id="inst_demo",
                academic_period_id="period_1",
                group_id="g1",
                day="monday",
                start_time="08:00",
                end_time="10:00",
            ),
        ],
        current_assignments=[
            CurrentAssignment(
                institution_id="inst_demo",
                schedule_id="s1",
                group_id="g1",
                room_id="r_small",
            )
        ],
    )

    response = solve(request)

    assert response.conflicts[0].code == "capacity_required"
    assert "47 alumnos" in response.conflicts[0].message
    assert response.assignments[0].room_id == "r_large"
    assert response.assignments[0].source == "suggested"
    assert response.assignments[0].replaces_room_id == "r_small"
    assert response.summary.alternatives_suggested == 1
