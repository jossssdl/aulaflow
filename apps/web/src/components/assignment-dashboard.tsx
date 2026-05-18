"use client";

import type { Assignment, DayOfWeek, SolveResponse } from "@aulas/shared";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  FileJson,
  Loader2,
  Play,
  Settings2,
  Users,
  type LucideIcon,
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
import { demoPayload } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Mode = "basic" | "config" | "technical";

const modeLabels: Record<Mode, string> = {
  basic: "Basico",
  config: "Configuracion",
  technical: "Tecnico",
};

const dayLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
};

export function AssignmentDashboard() {
  const [mode, setMode] = useState<Mode>("basic");
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const groupById = useMemo(
    () => new Map(demoPayload.groups.map((group) => [group.id, group])),
    [],
  );
  const roomById = useMemo(
    () => new Map(demoPayload.rooms.map((room) => [room.id, room])),
    [],
  );

  async function runAssignment() {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/assignments/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(demoPayload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo ejecutar la asignacion.");
      }

      setResult(data as SolveResponse);
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "No se pudo ejecutar la asignacion.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  function exportResult() {
    if (!result) {
      return;
    }

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asignacion-demo.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Institucion demo</span>
              <Badge variant="outline">V1 base</Badge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                AulaFlow
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Periodo 2026-1 · {demoPayload.schedules.length} bloques por evaluar
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 rounded-lg border border-border bg-card p-1">
              {(Object.keys(modeLabels) as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors",
                    mode === item && "bg-secondary text-foreground",
                  )}
                >
                  {modeLabels[item]}
                </button>
              ))}
            </div>

            <Button onClick={runAssignment} disabled={isRunning}>
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Ejecutar
            </Button>
          </div>
        </header>

        {mode === "basic" && (
          <BasicMode
            result={result}
            error={error}
            onExport={exportResult}
            groupById={groupById}
            roomById={roomById}
          />
        )}

        {mode === "config" && <ConfigMode />}

        {mode === "technical" && (
          <TechnicalMode result={result} error={error} isRunning={isRunning} />
        )}
      </div>
    </main>
  );
}

function BasicMode({
  result,
  error,
  onExport,
  groupById,
  roomById,
}: {
  result: SolveResponse | null;
  error: string | null;
  onExport: () => void;
  groupById: Map<string, (typeof demoPayload.groups)[number]>;
  roomById: Map<string, (typeof demoPayload.rooms)[number]>;
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Grupos"
          value={demoPayload.groups.length.toString()}
        />
        <MetricCard
          icon={Building2}
          label="Aulas"
          value={demoPayload.rooms.length.toString()}
        />
        <MetricCard
          icon={BookOpen}
          label="Bloques"
          value={demoPayload.schedules.length.toString()}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Conflictos"
          value={(result?.conflicts.length ?? 0).toString()}
          tone={result?.conflicts.length ? "warning" : "default"}
        />
      </section>

      {error && (
        <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <GroupsTable />
        <RoomsTable />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AssignmentsTable
          assignments={result?.assignments ?? []}
          groupById={groupById}
          roomById={roomById}
          onExport={onExport}
          canExport={Boolean(result)}
        />
        <FindingsPanel result={result} />
      </section>
    </>
  );
}

function ConfigMode() {
  const activeRules = [
    "Capacidad suficiente",
    "Sin traslape de aula",
    "Sin traslape de grupo",
    "Compatibilidad de tipo",
    "Accesibilidad operativa",
    "Bloqueos y reservas",
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Reglas activas
          </CardTitle>
          <CardDescription>Perfil base del periodo 2026-1</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {activeRules.map((rule) => (
            <Badge key={rule} variant="secondary">
              {rule}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distancias entre edificios</CardTitle>
          <CardDescription>Matriz operativa inicial</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Metros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(demoPayload.constraints?.building_distances ?? []).map((distance) => (
                <TableRow
                  key={`${distance.from_building_id}-${distance.to_building_id}`}
                >
                  <TableCell>{distance.from_building_id}</TableCell>
                  <TableCell>{distance.to_building_id}</TableCell>
                  <TableCell className="text-right font-mono">
                    {distance.distance_meters}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function TechnicalMode({
  result,
  error,
  isRunning,
}: {
  result: SolveResponse | null;
  error: string | null;
  isRunning: boolean;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <JsonPanel title="Payload" data={demoPayload} />
      <JsonPanel
        title="Respuesta"
        data={
          result ?? {
            status: isRunning ? "running" : "idle",
            error,
          }
        }
      />
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
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

function GroupsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupos</CardTitle>
        <CardDescription>Demanda academica inicial</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Alumnos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoPayload.groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <div className="font-medium">{group.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.program_id} · Semestre {group.semester}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {group.required_room_type ?? "normal"}
                  </Badge>
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

function RoomsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aulas</CardTitle>
        <CardDescription>Inventario operativo</CardDescription>
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
            {demoPayload.rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Piso {room.floor}
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

function AssignmentsTable({
  assignments,
  groupById,
  roomById,
  onExport,
  canExport,
}: {
  assignments: Assignment[];
  groupById: Map<string, (typeof demoPayload.groups)[number]>;
  roomById: Map<string, (typeof demoPayload.rooms)[number]>;
  onExport: () => void;
  canExport: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Asignaciones</CardTitle>
          <CardDescription>Resultado propuesto por el solver</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!canExport}
          aria-label="Exportar resultado"
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Sin ejecucion"
            text="Ejecuta el solver para ver asignaciones."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Aula</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead className="text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const group = groupById.get(assignment.group_id);
                const room = roomById.get(assignment.room_id);

                return (
                  <TableRow key={assignment.schedule_id}>
                    <TableCell>{group?.name ?? assignment.group_id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{room?.name ?? assignment.room_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {room?.building_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dayLabels[assignment.day]} · {assignment.start_time}-
                      {assignment.end_time}
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
        <CardTitle>Conflictos y sugerencias</CardTitle>
        <CardDescription>Salida explicable del motor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result && (
          <EmptyState
            icon={AlertTriangle}
            title="Sin validacion"
            text="Los hallazgos apareceran al ejecutar."
          />
        )}

        {result?.conflicts.map((conflict) => (
          <FindingItem
            key={`${conflict.code}-${conflict.schedule_id}`}
            tone="danger"
            title={conflict.code}
            text={conflict.message}
          />
        ))}

        {result?.warnings.map((warning) => (
          <FindingItem
            key={`${warning.code}-${warning.schedule_id}-${warning.room_id}`}
            tone="warning"
            title={warning.code}
            text={warning.message}
          />
        ))}

        {result && result.conflicts.length === 0 && result.warnings.length === 0 && (
          <FindingItem
            tone="success"
            title="Sin hallazgos"
            text="La corrida no regreso conflictos ni advertencias."
          />
        )}
      </CardContent>
    </Card>
  );
}

function FindingItem({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "danger" | "warning" | "success";
}) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : AlertTriangle;

  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-accent",
          tone === "success" && "text-primary",
        )}
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function JsonPanel({ title, data }: { title: string; data: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[620px] overflow-auto rounded-lg border border-border bg-background p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
