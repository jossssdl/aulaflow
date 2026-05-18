# Solver API

FastAPI service for classroom assignment.

## Run locally

```bash
py -m venv .venv
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Test

```bash
py -m pytest
```

Main endpoint:

```http
POST /solve
```
