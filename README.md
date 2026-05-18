# AulaFlow

Monorepo inicial para un SaaS multi-institucion de asignacion automatica y semi-automatica de aulas escolares.

## Estructura

```text
apps/
  web/          Next.js + TypeScript + Tailwind + componentes estilo shadcn/ui
  solver-api/   FastAPI + motor minimo de asignacion
packages/
  shared/       Tipos TypeScript compartidos entre web y contratos
docs/           Roadmap, arquitectura, reglas y modelo de datos
```

## Comandos previstos

```bash
npm install
npm run dev:web
npm run dev:solver
npm run test:solver
```

En Windows, los scripts usan el lanzador `py`. La primera version usa datos semilla en la UI y llama al solver Python mediante `SOLVER_API_URL`.
