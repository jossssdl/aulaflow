from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import SolveRequest, SolveResponse
from app.solver import solve

app = FastAPI(
    title="AulaFlow Solver API",
    version="0.1.0",
    description="Motor de asignación de aulas heurístico para la plataforma AulaFlow desarrollada por EINNOVACION MX.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "solver-api"}


@app.post("/solve", response_model=SolveResponse)
def solve_assignment(request: SolveRequest) -> SolveResponse:
    return solve(request)

