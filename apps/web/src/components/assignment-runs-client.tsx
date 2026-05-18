"use client";

import type { SolvePayload, SolveResponse } from "@aulas/shared";
import { dayLabels } from "@aulas/shared";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

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
import { cn } from "@/lib/utils";

type ExecutionResponse = {
  payload: SolvePayload;
  response: SolveResponse;
  dataSource: "database" | "mock";
  persisted: boolean;
  runId?: string;
};

export function AssignmentRunsClient({
  initialPayload,
  initialDataSource,
}: {
  initialPayload: SolvePayload;
  initialDataSource: "database" | "mock";
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [dataSource, setDataSource] = useState(initialDataSource);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [runId, setRunId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const groupsById = useMemo(
    () => new Map(payload.groups.map((group) => [group.id, group])),
    [payload.groups],
  );
  const roomsById = useMemo(
    () => new Map(payload.rooms.map((room) => [room.id, room])),
    [payload.rooms],
  );

  async function runSolver() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/assignment-runs", {
        method: "POST",
      });
      const data = (await response.json()) as ExecutionResponse | { error?: string; detail?: string };

      if (!response.ok || !("response" in data)) {
        const message =
          "error" in data && data.error
            ? data.error
            : "No se pudo ejecutar el solver.";
        throw new Error(message);
      }

      setPayload(data.payload);
      setDataSource(data.dataSource);
      setResult(data.response);
      setPersisted(data.persisted);
      setRunId(data.runId);
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "No se pudo ejecutar el solver.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Fase 3 · motor basico</span>
              <Badge variant={dataSource === "database" ? "default" : "outline"}>
                {dataSource === "database" ? "Base de datos" : "Mock"}
              </Badge>
              {persisted && <Badge variant="secondary">Guardado</Badge>}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                Corridas de asignacion
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium mt-2">
                <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
                <span className="text-muted-foreground/50">·</span>
                <a href="/imports" className="text-muted-foreground hover:text-foreground transition-colors">Importar Datos</a>
                <span className="text-muted-foreground/50">·</span>
                <a href="/assignment-runs" className="text-primary hover:text-primary/80 transition-colors">Corridas de Asignación</a>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Valida asignaciones actuales, propone alternativas y explica conflictos.
              </p>
            </div>
          </div>

          <Button onClick={runSolver} disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Ejecutar solver
          </Button>
        </header>

        {error && (
          <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={Users} label="Grupos" value={payload.groups.length} />
          <MetricCard icon={Building2} label="Aulas" value={payload.rooms.length} />
          <MetricCard icon={FileText} label="Horarios" value={payload.schedules.length} />
          <MetricCard
            icon={AlertTriangle}
            label="Conflictos"
            value={result?.summary.conflicts ?? 0}
            tone={(result?.summary.conflicts ?? 0) > 0 ? "warning" : "default"}
          />
        </section>

        {result?.summary && (
          <section className="grid gap-4 md:grid-cols-5">
            <SummaryItem label="Actuales revisadas" value={result.summary.current_assignments_checked} />
            <SummaryItem label="Actuales conservadas" value={result.summary.current_assignments_kept} />
            <SummaryItem label="Generadas" value={result.summary.assignments_generated} />
            <SummaryItem label="Alternativas" value={result.summary.alternatives_suggested} />
            <SummaryItem label="Sin aula" value={result.summary.unassigned} />
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-2">
          <GroupsTable payload={payload} />
          <RoomsTable payload={payload} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <ResultsTable result={result} groupsById={groupsById} roomsById={roomsById} />
          <FindingsPanel result={result} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <ExplanationsPanel result={result} />
          <TechnicalPanel
            payload={payload}
            result={result}
            runId={runId}
            persisted={persisted}
          />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        <div
          className={cn(
            "rounded-md border p-2",
            tone === "warning"
              ? "border-accent/50 text-accent"
              : "border-primary/40 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function GroupsTable({ payload }: { payload: SolvePayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupos cargados</CardTitle>
        <CardDescription>Demanda academica enviada al solver</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Alumnos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payload.groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <div className="font-medium">{group.name}</div>
                  <div className="text-xs text-muted-foreground">{group.program_id}</div>
                </TableCell>
                <TableCell>{group.shift ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{group.required_room_type ?? "normal"}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{group.size}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RoomsTable({ payload }: { payload: SolvePayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aulas disponibles</CardTitle>
        <CardDescription>Inventario y reservas especiales</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aula</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Edificio</TableHead>
              <TableHead className="text-right">Cap.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payload.rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(room.reserved_for_room_types ?? []).length
                      ? `Reservada: ${room.reserved_for_room_types?.join(", ")}`
                      : "Uso general"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{room.room_type}</Badge>
                </TableCell>
                <TableCell>{room.building_id}</TableCell>
                <TableCell className="text-right font-mono">
                  {room.capacity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ResultsTable({
  result,
  groupsById,
  roomsById,
}: {
  result: SolveResponse | null;
  groupsById: Map<string, SolvePayload["groups"][number]>;
  roomsById: Map<string, SolvePayload["rooms"][number]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados</CardTitle>
        <CardDescription>Asignaciones conservadas, generadas o sugeridas</CardDescription>
      </CardHeader>
      <CardContent>
        {!result ? (
          <EmptyState text="Ejecuta el solver para ver resultados." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Aula</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.assignments.map((assignment) => {
                const group = groupsById.get(assignment.group_id);
                const room = roomsById.get(assignment.room_id);

                return (
                  <TableRow key={assignment.schedule_id}>
                    <TableCell>{group?.name ?? assignment.group_id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{room?.name ?? assignment.room_id}</div>
                      {assignment.replaces_room_id && (
                        <div className="text-xs text-muted-foreground">
                          Reemplaza {roomsById.get(assignment.replaces_room_id)?.name ?? assignment.replaces_room_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {dayLabels[assignment.day]} · {assignment.start_time}-{assignment.end_time}
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.source === "suggested" ? "warning" : "secondary"}>
                        {assignment.source ?? "generated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {assignment.score}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FindingsPanel({ result }: { result: SolveResponse | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conflictos y advertencias</CardTitle>
        <CardDescription>Hallazgos explicables del motor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result && <EmptyState text="Aun no hay hallazgos." />}
        {result?.conflicts.map((conflict) => (
          <FindingItem
            key={`conflict-${conflict.code}-${conflict.schedule_id}-${conflict.room_id}`}
            icon="conflict"
            title={conflict.code}
            text={conflict.message}
          />
        ))}
        {result?.warnings.map((warning) => (
          <FindingItem
            key={`warning-${warning.code}-${warning.schedule_id}-${warning.room_id}`}
            icon="warning"
            title={warning.code}
            text={warning.message}
          />
        ))}
        {result && result.conflicts.length === 0 && result.warnings.length === 0 && (
          <FindingItem icon="ok" title="Sin hallazgos" text="No se detectaron conflictos ni advertencias." />
        )}
      </CardContent>
    </Card>
  );
}

function ExplanationsPanel({ result }: { result: SolveResponse | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Explicaciones</CardTitle>
        <CardDescription>Razonamiento breve por horario</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result && <EmptyState text="Las explicaciones apareceran al ejecutar." />}
        {result?.explanations.map((explanation) => (
          <div
            key={explanation.schedule_id}
            className="rounded-lg border border-border p-3"
          >
            <p className="text-sm">{explanation.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Aulas evaluadas: {explanation.considered_rooms}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TechnicalPanel({
  payload,
  result,
  runId,
  persisted,
}: {
  payload: SolvePayload;
  result: SolveResponse | null;
  runId?: string;
  persisted: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Resumen tecnico
        </CardTitle>
        <CardDescription>
          {persisted ? `Guardado como ${runId}` : "Sin persistencia activa"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[360px] overflow-auto rounded-lg border border-border bg-background p-4 font-mono text-xs text-muted-foreground">
          {JSON.stringify({ payload, summary: result?.summary }, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function FindingItem({
  icon,
  title,
  text,
}: {
  icon: "conflict" | "warning" | "ok";
  title: string;
  text: string;
}) {
  const Icon = icon === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          icon === "conflict" && "text-destructive",
          icon === "warning" && "text-accent",
          icon === "ok" && "text-primary",
        )}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
