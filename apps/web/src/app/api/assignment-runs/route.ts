import { executeAssignmentRun, getAssignmentRunInput } from "@/lib/server/assignment-run-service";
import { NextResponse } from "next/server";

export async function GET() {
  const input = await getAssignmentRunInput();
  return NextResponse.json(input);
}

export async function POST() {
  try {
    const execution = await executeAssignmentRun();
    return NextResponse.json(execution);
  } catch (error) {
    return NextResponse.json(
      {
        error: "No se pudo ejecutar la corrida de asignacion.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

