import type { SolvePayload, SolveResponse } from "@aulas/shared";
import { NextResponse } from "next/server";

const DEFAULT_SOLVER_URL = "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const payload = (await request.json()) as SolvePayload;
  const solverUrl = process.env.SOLVER_API_URL ?? DEFAULT_SOLVER_URL;

  try {
    const response = await fetch(`${solverUrl}/solve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = (await response.json()) as SolveResponse | { detail?: unknown };

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "El solver rechazo los datos importados.",
          detail: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      response: data,
      persisted: false,
      runId: `import-${Date.now()}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "No se pudo conectar con solver-api.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

