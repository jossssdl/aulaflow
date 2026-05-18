"use client";

import type { ImportColumnKey, ImportColumnMapping, RawImportRow } from "@/lib/imports/import-types";
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  detectColumnMapping,
  getHeaders,
  matrixToRawRows,
  parseCsvText,
  parseImportedRows,
} from "@/lib/imports/import-parser";
import { saveImportSession } from "@/lib/imports/import-storage";

const mappingFields: Array<{ key: ImportColumnKey; label: string }> = [
  { key: "groupName", label: "Grupo/Semestre" },
  { key: "totalStudents", label: "Total alumnos" },
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miercoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "roomName", label: "Aula" },
  { key: "roomCapacity", label: "Capacidad maxima" },
  { key: "observation", label: "Observacion" },
];

export function ImportsClient() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [mapping, setMapping] = useState<ImportColumnMapping>({});
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => getHeaders(rows), [rows]);
  const parseResult = useMemo(() => {
    if (!rows.length) {
      return null;
    }

    return parseImportedRows({
      rows,
      mapping,
      registeredRoomNames: ["Aula 1 C", "Aula 3 C", "Aula 10 B"],
    });
  }, [mapping, rows]);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsReading(true);
    setError(null);
    setFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let parsedRows: RawImportRow[] = [];

      if (extension === "csv") {
        parsedRows = parseCsvText(await file.text());
      } else if (extension === "xlsx") {
        const { readSheet } = await import("read-excel-file/browser");
        const matrix = await readSheet(file);
        parsedRows = matrixToRawRows(
          matrix.map((row) =>
            row.map((cell) => (cell === null || cell === undefined ? "" : String(cell))),
          ),
        );
      } else {
        throw new Error("Formato no soportado. Usa .xlsx o .csv.");
      }

      const detectedMapping = detectColumnMapping(getHeaders(parsedRows));
      setRows(parsedRows);
      setMapping(detectedMapping);
    } catch (readError) {
      setRows([]);
      setMapping({});
      setError(
        readError instanceof Error
          ? readError.message
          : "No se pudo leer el archivo.",
      );
    } finally {
      setIsReading(false);
    }
  }

  function createReviewSession() {
    if (!parseResult) {
      return;
    }

    const id = crypto.randomUUID();
    saveImportSession({
      id,
      fileName,
      createdAt: new Date().toISOString(),
      headers,
      rawRows: rows,
      mapping,
      editableRows: parseResult.rows,
      issues: parseResult.issues,
      payload: parseResult.payload,
    });
    router.push(`/imports/${id}/review`);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="border-b border-border pb-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span>Fase 4 · importacion</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
            Importar datos escolares
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium mt-2">
            <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
            <span className="text-muted-foreground/50">·</span>
            <a href="/imports" className="text-primary hover:text-primary/80 transition-colors">Importar Datos</a>
            <span className="text-muted-foreground/50">·</span>
            <a href="/assignment-runs" className="text-muted-foreground hover:text-foreground transition-colors">Corridas de Asignación</a>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Carga Excel o CSV, revisa columnas y valida antes de guardar.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Archivo</CardTitle>
              <CardDescription>.xlsx o .csv con grupos, horarios y aulas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center hover:bg-secondary/40">
                {isReading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-primary" />
                )}
                <span className="text-sm font-medium">
                  {fileName || "Seleccionar archivo"}
                </span>
                <input
                  className="hidden"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </label>

              {error && (
                <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-sm">
                  {error}
                </div>
              )}

              {parseResult && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <SummaryPill label="Grupos" value={parseResult.detected.groups} />
                  <SummaryPill label="Aulas" value={parseResult.detected.rooms} />
                  <SummaryPill label="Horarios" value={parseResult.detected.schedules} />
                  <SummaryPill label="Hallazgos" value={parseResult.issues.length} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapeo de columnas</CardTitle>
              <CardDescription>Ajusta columnas antes de revisar el detalle</CardDescription>
            </CardHeader>
            <CardContent>
              {!headers.length ? (
                <EmptyState text="Carga un archivo para detectar columnas." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {mappingFields.map((field) => (
                    <label key={field.key} className="space-y-1 text-sm">
                      <span className="text-muted-foreground">{field.label}</span>
                      <select
                        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                        value={mapping[field.key] ?? ""}
                        onChange={(event) =>
                          setMapping((current) => ({
                            ...current,
                            [field.key]: event.target.value || undefined,
                          }))
                        }
                      >
                        <option value="">Sin mapear</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {parseResult && (
          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <PreviewTable rows={rows} headers={headers} />
            <IssuesPanel issues={parseResult.issues} />
          </section>
        )}

        <div className="flex justify-end">
          <Button disabled={!parseResult} onClick={createReviewSession}>
            Revisar importacion
          </Button>
        </div>
      </div>
    </main>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function PreviewTable({
  rows,
  headers,
}: {
  rows: RawImportRow[];
  headers: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previsualizacion</CardTitle>
        <CardDescription>Primeras filas detectadas</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.slice(0, 8).map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 8).map((row) => (
              <TableRow key={row.rowNumber}>
                {headers.slice(0, 8).map((header) => (
                  <TableCell key={header}>{row.values[header]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IssuesPanel({ issues }: { issues: Array<{ code: string; severity: string; message: string }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Validacion inicial</CardTitle>
        <CardDescription>Errores y advertencias detectadas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!issues.length && <EmptyState text="No hay errores en la prevalidacion." />}
        {issues.map((issue, index) => (
          <div key={`${issue.code}-${index}`} className="flex gap-3 rounded-lg border border-border p-3">
            <AlertTriangle className={issue.severity === "error" ? "mt-0.5 h-4 w-4 text-destructive" : "mt-0.5 h-4 w-4 text-accent"} />
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
