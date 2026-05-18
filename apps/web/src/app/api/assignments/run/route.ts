import { type SolvePayload, type SolveResponse } from "@aulas/shared";
import { NextResponse } from "next/server";

const DEFAULT_SOLVER_URL = "http://127.0.0.1:8000";

export async function POST(request: Request) {
  const payload = (await request.json()) as SolvePayload;
  const solverUrl = process.env.SOLVER_API_URL ?? DEFAULT_SOLVER_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${solverUrl}/solve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await response.json()) as SolveResponse | { detail?: unknown };

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "El solver rechazo el payload.",
          detail: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "No se pudo conectar con solver-api.",
        detail: error instanceof Error ? error.message : "Unknown error",
        solverUrl,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

