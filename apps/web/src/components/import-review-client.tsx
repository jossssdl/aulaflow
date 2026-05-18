"use client";

import type { DayOfWeek, SolveResponse } from "@aulas/shared";
import { dayLabels } from "@aulas/shared";
import { AlertTriangle, CheckCircle2, Loader2, Play, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildImportPayload,
  updateCurrentAssignment,
  validateAssignmentEdit,
} from "@/lib/imports/import-parser";
import { loadImportSession, saveImportSession } from "@/lib/imports/import-storage";
import type { ImportEditableRow, ImportSession } from "@/lib/imports/import-types";
import { cn } from "@/lib/utils";

type SolverRunResponse = {
  response: SolveResponse;
  persisted: boolean;
  runId: string;
};

const editableDays: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export function ImportReviewClient() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<ImportSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSession(loadImportSession(params.id));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [params.id]);

  const errorCount = session?.issues.filter((issue) => issue.severity === "error").length ?? 0;
  const warningCount = session?.issues.filter((issue) => issue.severity === "warning").length ?? 0;

  const roomOptions = useMemo(
    () => session?.payload.rooms ?? [],
    [session?.payload.rooms],
  );

  function refreshSession(nextRows: ImportEditableRow[]) {
    if (!session) {
      return;
    }

    const result = buildImportPayload({
      rows: nextRows,
      registeredRoomNames: ["Aula 1 C", "Aula 3 C", "Aula 10 B"],
    });
    const nextSession: ImportSession = {
      ...session,
      editableRows: nextRows,
      issues: result.issues,
      payload: result.payload,
      solverResponse: undefined,
    };
    saveImportSession(nextSession);
    setSession(nextSession);
  }

  function updateRow(rowId: string, updater: (row: ImportEditableRow) => ImportEditableRow) {
    if (!session) {
      return;
    }
    refreshSession(session.editableRows.map((row) => (row.id === rowId ? updater(row) : row)));
  }

  function updateAssignment(scheduleId: string, roomId: string) {
    if (!session) {
      return;
    }
    const nextPayload = updateCurrentAssignment(session.payload, scheduleId, roomId);
    const nextSession = {
      ...session,
      payload: nextPayload,
      solverResponse: undefined,
    };
    saveImportSession(nextSession);
    setSession(nextSession);
  }

  async function approveImport() {
    if (!session || errorCount > 0) {
      return;
    }
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/imports/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(session.payload),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar la importación.");
      }

      const nextSession = {
        ...session,
        approvedAt: new Date().toISOString(),
      };
      saveImportSession(nextSession);
      setSession(nextSession);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Error al intentar guardar la importación en la base de datos.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function runSolver() {
    if (!session) {
      return;
    }
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/imports/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(session.payload),
      });
      const data = (await response.json()) as SolverRunResponse | { error?: string };

      if (!response.ok || !("response" in data)) {
        throw new Error("error" in data && data.error ? data.error : "No se pudo ejecutar la validacion.");
      }

      const nextSession = {
        ...session,
        solverResponse: data.response,
      };
      saveImportSession(nextSession);
      setSession(nextSession);
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "No se pudo ejecutar la validacion.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Importacion no encontrada</CardTitle>
              <CardDescription>Vuelve a cargar el archivo desde /imports.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{session.fileName}</span>
              <Badge variant={session.approvedAt ? "default" : "outline"}>
                {session.approvedAt ? "Aprobada" : "En revision"}
              </Badge>
              <Badge variant={errorCount ? "destructive" : "secondary"}>
                {errorCount} errores
              </Badge>
              <Badge variant={warningCount ? "warning" : "secondary"}>
                {warningCount} advertencias
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
              Revisar importacion
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium mt-2">
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
              <span className="text-muted-foreground/50">·</span>
              <a href="/imports" className="text-primary hover:text-primary/80 transition-colors">Importar Datos</a>
              <span className="text-muted-foreground/50">·</span>
              <a href="/assignment-runs" className="text-muted-foreground hover:text-foreground transition-colors">Corridas de Asignación</a>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Corrige datos antes de aprobar y ejecutar validacion.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={approveImport} disabled={errorCount > 0}>
              <Save className="h-4 w-4" />
              Confirmar importacion
            </Button>
            <Button onClick={runSolver} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Ejecutar validacion con estos datos
            </Button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Summary label="Grupos" value={session.payload.groups.length} />
          <Summary label="Aulas" value={session.payload.rooms.length} />
          <Summary label="Horarios" value={session.payload.schedules.length} />
          <Summary label="Asignaciones" value={session.payload.current_assignments?.length ?? 0} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <EditableRowsTable rows={session.editableRows} onUpdateRow={updateRow} />
          <IssuesPanel issues={session.issues} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <ManualAssignments
            session={session}
            roomOptions={roomOptions}
            onUpdateAssignment={updateAssignment}
          />
          <SolverResults response={session.solverResponse as SolveResponse | undefined} />
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function EditableRowsTable({
  rows,
  onUpdateRow,
}: {
  rows: ImportEditableRow[];
  onUpdateRow: (rowId: string, updater: (row: ImportEditableRow) => ImportEditableRow) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos que necesitan revision</CardTitle>
        <CardDescription>Edita grupo, alumnos, horario, aula, capacidad y observacion</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Alumnos</TableHead>
              <TableHead>Aula</TableHead>
              <TableHead>Cap.</TableHead>
              {editableDays.map((day) => (
                <TableHead key={day}>{dayLabels[day]}</TableHead>
              ))}
              <TableHead>Observacion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <input
                    className="h-8 w-36 rounded-md border border-border bg-background px-2 text-sm"
                    value={row.groupName}
                    onChange={(event) =>
                      onUpdateRow(row.id, (current) => ({
                        ...current,
                        groupName: event.target.value,
                      }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <input
                    className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm"
                    inputMode="numeric"
                    value={row.totalStudents ?? ""}
                    onChange={(event) =>
                      onUpdateRow(row.id, (current) => ({
                        ...current,
                        totalStudents: Number.parseInt(event.target.value, 10) || null,
                      }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <input
                    className="h-8 w-32 rounded-md border border-border bg-background px-2 text-sm"
                    value={row.roomName}
                    onChange={(event) =>
                      onUpdateRow(row.id, (current) => ({
                        ...current,
                        roomName: event.target.value,
                      }))
                    }
                  />
                </TableCell>
                <TableCell>
                  <input
                    className="h-8 w-20 rounded-md border border-border bg-background px-2 text-sm"
                    inputMode="numeric"
                    value={row.roomCapacity ?? ""}
                    onChange={(event) =>
                      onUpdateRow(row.id, (current) => ({
                        ...current,
                        roomCapacity: Number.parseInt(event.target.value, 10) || null,
                      }))
                    }
                  />
                </TableCell>
                {editableDays.map((day) => (
                  <TableCell key={day}>
                    <TimeInput row={row} day={day} onUpdateRow={onUpdateRow} />
                  </TableCell>
                ))}
                <TableCell>
                  <input
                    className="h-8 w-44 rounded-md border border-border bg-background px-2 text-sm"
                    value={row.observation}
                    onChange={(event) =>
                      onUpdateRow(row.id, (current) => ({
                        ...current,
                        observation: event.target.value,
                      }))
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TimeInput({
  row,
  day,
  onUpdateRow,
}: {
  row: ImportEditableRow;
  day: DayOfWeek;
  onUpdateRow: (rowId: string, updater: (row: ImportEditableRow) => ImportEditableRow) => void;
}) {
  return (
    <input
      className="h-8 w-28 rounded-md border border-border bg-background px-2 text-sm"
      placeholder="7:00 A 13:00"
      value={row.schedules[day] ?? ""}
      onChange={(event) =>
        onUpdateRow(row.id, (current) => ({
          ...current,
          schedules: {
            ...current.schedules,
            [day]: event.target.value,
          },
        }))
      }
    />
  );
}

function IssuesPanel({ issues }: { issues: ImportSession["issues"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Errores y advertencias</CardTitle>
        <CardDescription>Corrige errores antes de confirmar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!issues.length && (
          <div className="flex gap-2 rounded-lg border border-border p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Los datos estan listos para confirmar.
          </div>
        )}
        {issues.map((issue, index) => (
          <div key={`${issue.code}-${index}`} className="flex gap-3 rounded-lg border border-border p-3">
            <AlertTriangle
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                issue.severity === "error" ? "text-destructive" : "text-accent",
              )}
            />
            <div>
              <Badge variant={issue.severity === "error" ? "destructive" : "warning"}>
                {issue.code}
              </Badge>
              <p className="mt-2 text-sm text-muted-foreground">{issue.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ManualAssignments({
  session,
  roomOptions,
  onUpdateAssignment,
}: {
  session: ImportSession;
  roomOptions: ImportSession["payload"]["rooms"];
  onUpdateAssignment: (scheduleId: string, roomId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edicion manual de asignaciones</CardTitle>
        <CardDescription>Cambia aula y revisa disponibilidad antes de guardar</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Horario</TableHead>
              <TableHead>Aula</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {session.payload.schedules.map((schedule) => {
              const assignment = session.payload.current_assignments?.find(
                (item) => item.schedule_id === schedule.id,
              );
              const status = validateAssignmentEdit({
                payload: session.payload,
                scheduleId: schedule.id,
                roomId: assignment?.room_id ?? "",
              });

              return (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <div className="font-medium">{dayLabels[schedule.day]}</div>
                    <div className="text-xs text-muted-foreground">
                      {schedule.start_time}-{schedule.end_time}
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 w-44 rounded-md border border-border bg-background px-2 text-sm"
                      value={assignment?.room_id ?? ""}
                      onChange={(event) => onUpdateAssignment(schedule.id, event.target.value)}
                    >
                      <option value="">Sin aula</option>
                      {roomOptions.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} · {room.capacity}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.ok ? "secondary" : "warning"}>
                      {status.ok ? "Disponible" : "Revisar"}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {status.messages[0]}
                    </p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SolverResults({ response }: { response?: SolveResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado del solver</CardTitle>
        <CardDescription>Conflictos, advertencias y resumen final</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!response && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Ejecuta validacion para ver resultados.
          </div>
        )}
        {response && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Summary label="Asignadas" value={response.assignments.length} />
              <Summary label="Conflictos" value={response.conflicts.length} />
              <Summary label="Advert." value={response.warnings.length} />
            </div>
            {response.conflicts.slice(0, 5).map((conflict) => (
              <div key={`${conflict.code}-${conflict.schedule_id}-${conflict.room_id}`} className="rounded-lg border border-border p-3">
                <Badge variant="destructive">{conflict.code}</Badge>
                <p className="mt-2 text-sm text-muted-foreground">{conflict.message}</p>
              </div>
            ))}
            {response.warnings.slice(0, 5).map((warning) => (
              <div key={`${warning.code}-${warning.schedule_id}-${warning.room_id}`} className="rounded-lg border border-border p-3">
                <Badge variant="warning">{warning.code}</Badge>
                <p className="mt-2 text-sm text-muted-foreground">{warning.message}</p>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
