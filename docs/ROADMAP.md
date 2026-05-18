# Roadmap

## Fase 0 - Base tecnica

- Monorepo con `apps/web`, `apps/solver-api` y `packages/shared`.
- Documentacion inicial de arquitectura, reglas, roadmap y datos.
- Contrato JSON estable para el solver.
- UI inicial con datos semilla.
- Solver heuristico minimo con conflictos, advertencias y explicaciones.

## Fase 1 - Modo basico

- CRUD de aulas.
- CRUD de grupos.
- CRUD de horarios.
- Validacion de conflictos antes de asignar.
- Ejecucion manual del solver.
- Exportacion CSV/XLSX.
- Persistencia de corridas en PostgreSQL/Supabase.

## Fase 2 - Modelo de datos y configuracion

- Migraciones SQL iniciales para PostgreSQL/Supabase.
- Seed de escuela demo con edificios, aulas, grupos, horarios, reglas, bloqueos y reservas especiales.
- Modelo multi-institucion preparado con `institution_id`.
- Restricciones operativas de profesores sin datos medicos sensibles.
- Administracion de edificios.
- Matriz de distancias entre edificios.
- Catalogo de tipos de aula.
- Restricciones de aulas.
- Restricciones operativas de profesores.
- Pesos configurables para preferencias.
- Versionado de reglas por periodo academico.

## Fase 3 - Motor de validacion y asignacion basica

- Endpoint `POST /solve` con validacion de asignaciones actuales.
- Propuestas de aulas alternativas cuando hay capacidad insuficiente, reserva incompatible, bloqueo o traslape.
- Pantalla `/assignment-runs` para ejecutar el solver y revisar resultados.
- Backend web que construye payload desde PostgreSQL/Supabase o mock.
- Persistencia de corridas en `assignment_runs`, `assignments`, `assignment_conflicts` y `assignment_warnings` cuando hay `DATABASE_URL`.
- Resumen final con asignaciones conservadas, generadas, sugeridas, conflictos y advertencias.

## Fase 4 - Importación y edición manual (COMPLETADO)

- [x] Pantalla `/imports` para cargar `.xlsx` y `.csv`.
- [x] Detección y mapeo de columnas.
- [x] Parser de horarios en texto como `7:00 A 13:00`.
- [x] Revisión en `/imports/[id]/review`.
- [x] Corrección manual de grupos, alumnos, horarios, aulas, capacidad y observaciones.
- [x] Edición manual de aula asignada por horario.
- [x] Validación de cambios contra capacidad, reserva y disponibilidad.
- [x] Ejecución del solver con datos importados.
- [x] Pruebas básicas del parser (con suite de vitest automatizada y activa).
- [x] Persistencia transaccional en PostgreSQL de aulas, grupos, horarios y asignaciones.
- [x] PDF/OCR queda como mejora futura.

## Fase 5 - Modo tecnico

- Historial de ejecuciones.
- Payload enviado al solver.
- Respuesta del solver.
- Logs por corrida.
- Comparacion entre corridas.
- Diagnostico de restricciones imposibles.

## Fase 6 - SaaS multi-institucion

- Autenticacion.
- Organizaciones e invitaciones.
- Roles por institucion.
- RLS completo en Supabase.
- Importadores CSV/XLSX por institucion.
- Auditoria de cambios.

## Fase 7 - Solver avanzado

- Modo semi-automatico con aulas bloqueadas manualmente.
- Reasignacion parcial.
- Pesos por institucion.
- Optimizacion por lotes.
- Explicaciones por regla.
- Simulaciones por variacion de alumnos.

## Fase 8 - Automatizaciones externas

- n8n para notificaciones, sincronizaciones y reportes.
- Webhooks de asignacion aprobada.
- Integraciones con calendarios y sistemas escolares.
