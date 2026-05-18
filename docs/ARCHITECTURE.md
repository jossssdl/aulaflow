# Arquitectura

## Objetivo

Construir una plataforma SaaS multi-institucion para registrar aulas, grupos, horarios y restricciones, ejecutar un solver de asignacion y auditar los resultados.

La primera version opera con una sola escuela, pero todos los contratos, tablas y payloads incluyen `institution_id` para habilitar multi-tenancy sin reescrituras.

## Monorepo

```text
apps/web
  Next.js App Router
  API route puente hacia solver-api
  Pantallas de modo basico, configuracion y tecnico

apps/solver-api
  FastAPI
  Pydantic como contrato de entrada/salida
  Motor heuristico inicial

packages/shared
  Tipos TypeScript del contrato de asignacion
  Utilidades ligeras compartidas por la UI

docs
  Modelo, reglas, roadmap y arquitectura
```

## Flujo de asignacion

1. El usuario carga o edita grupos, aulas, horarios y restricciones en `apps/web`.
2. La web prepara un payload normalizado con `institution_id`.
3. `apps/web` llama a `POST /api/assignments/run`.
4. La API route valida el request y lo reenvia a `apps/solver-api` (`POST /solve`).
5. El solver responde con `assignments`, `conflicts`, `warnings` y `explanations`.
6. La web muestra resultados, conflictos, sugerencias y datos tecnicos de ejecucion.
7. En fases posteriores se persiste cada corrida en PostgreSQL/Supabase.

## Flujo de corridas Fase 3

La ruta `/assignment-runs` usa un flujo server-side mas cercano al producto final:

1. `apps/web` intenta leer `groups`, `rooms`, `schedules`, `current_assignments`, `assignment_rules`, `teacher_constraints` y `room_blocks` desde PostgreSQL/Supabase.
2. Si `DATABASE_URL` no existe o la lectura falla, usa datos mock de Fase 3.
3. `apps/web` construye el payload normalizado con `institution_id` y `academic_period_id`.
4. `apps/web` llama a `apps/solver-api` mediante `POST /solve`.
5. El solver valida asignaciones actuales y propone alternativas.
6. Si la fuente fue base de datos, la web guarda la corrida en:
   - `assignment_runs`
   - `assignments`
   - `assignment_conflicts`
   - `assignment_warnings`
7. La pantalla muestra resumen, asignaciones, conflictos, advertencias y explicaciones.

## Flujo de importacion Fase 4 (Completado)

1. `/imports` recibe un archivo `.xlsx` o `.csv`.
2. El parser del frontend lee filas, detecta encabezados y permite mapear columnas.
3. El archivo se transforma a entidades internas: `groups`, `rooms`, `schedules` y `current_assignments`.
4. `/imports/[id]/review` permite corregir datos en caliente antes de aprobar.
5. La revisión se mantiene en almacenamiento local del navegador (`localStorage`) para soportar edición reactiva en tiempo real.
6. El botón `Ejecutar validacion con estos datos` llama a `POST /api/imports/solve` para previsualizar los resultados del solver.
7. El botón `Confirmar importación` llama al endpoint transactional `/api/imports/approve` para persistir los datos de manera atómica e íntegra directamente en PostgreSQL.
8. La API de Next.js realiza la inserción segura en base de datos (`rooms`, `groups`, `schedules`, `assignments`, `assignment_runs`) resolviendo el formateo a UUID compatible.
9. El usuario visualiza la insignia de "Aprobada" y los cambios persistidos.

## Multi-institucion

Principios iniciales:

- Todas las entidades persistentes llevan `institution_id`.
- Las consultas de la web siempre filtran por la institucion activa.
- Supabase debe usar Row Level Security por `institution_id`.
- El solver no debe mezclar entidades de distintas instituciones dentro de una corrida.
- Los usuarios pueden pertenecer a una o mas instituciones mediante una tabla de membresias.

## Servicios

### Web

Responsabilidades:

- Autenticacion y seleccion de institucion activa.
- CRUD de catalogos.
- Validacion ligera de formularios.
- Envio de payloads al solver.
- Presentacion de conflictos, advertencias y explicaciones.

### Solver API

Responsabilidades:

- Validar reglas obligatorias.
- Validar asignaciones actuales.
- Evaluar preferencias mediante una funcion de costo sencilla.
- Generar o sugerir asignaciones explicables.
- Devolver conflictos cuando no existe solucion.
- Producir advertencias cuando se incumplen preferencias.
- Devolver `summary` para la corrida.

### Base de datos

Responsabilidades:

- Persistir catalogos, reglas, restricciones y horarios.
- Persistir ejecuciones del motor.
- Persistir payload y respuesta para auditoria tecnica.

## n8n

n8n queda fuera del motor principal. Se puede integrar despues para automatizaciones externas como:

- Notificar asignaciones finales.
- Sincronizar calendarios.
- Importar archivos recurrentes.
- Enviar reportes a direccion academica.

## Decisiones iniciales

- El solver comienza como heuristica determinista, no como optimizacion matematica completa.
- Las reglas obligatorias bloquean asignaciones.
- Las preferencias suman costo y generan advertencias.
- La UI inicial usa datos semilla y el contrato real del solver.
- El modelo de datos separa reglas operativas de datos sensibles; no se guardan diagnosticos medicos.
