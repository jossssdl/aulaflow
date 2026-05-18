# Importacion de Datos

## Objetivo

Permitir que una escuela cargue datos escolares desde Excel o CSV, revise la informacion, corrija errores manualmente y ejecute validacion antes de guardar o aprobar asignaciones.

PDF y OCR quedan fuera de esta fase. Un PDF puede servir como referencia visual futura, pero el flujo productivo inicial debe usar `.xlsx` o `.csv`.

## Formatos soportados

- `.xlsx`
- `.csv`

Columnas esperadas o mapeables:

- `Grupo/Semestre`
- `Total alumnos`
- `Lunes`
- `Martes`
- `Miercoles`
- `Jueves`
- `Viernes`
- `Aula`
- `Capacidad maxima`
- `Observacion`

## Horarios soportados

El parser acepta rangos en texto:

- `7:00 A 13:00`
- `9:00 A 13:00`
- `13:00 A 19:00`

Celdas vacias en dias de la semana significan que no hay clase ese dia.

## Flujo

1. El usuario abre `/imports`.
2. Carga un archivo `.xlsx` o `.csv`.
3. AulaFlow detecta encabezados y propone un mapeo de columnas.
4. El usuario ajusta el mapeo si hace falta.
5. AulaFlow previsualiza filas y marca errores o advertencias.
6. Se crea una sesion local de revision en `/imports/[id]/review`.
7. El usuario corrige manualmente grupo, alumnos, horario, aula, capacidad u observacion.
8. Al confirmar, la importacion queda aprobada en la sesion local.
9. El usuario puede ejecutar `Ejecutar validacion con estos datos`.
10. La pantalla envia el payload importado a `solver-api`.

## Transformacion interna

El parser transforma filas importadas en:

- `groups`
- `rooms`
- `schedules`
- `current_assignments`

Tambien infiere:

- Tipo de aula: `normal`, `ingles`, `maestria`, `camara_gesell`, `computo`.
- Caracteristicas requeridas: `audio`, `camara`, `computadoras`.
- Reservas especiales de aula cuando el nombre u observacion lo sugieren.

## Validaciones iniciales

Errores:

- Grupo faltante.
- Total de alumnos faltante o invalido.
- Aula faltante.
- Capacidad faltante o invalida.
- Horario con formato invalido.

Advertencias:

- Aula no registrada en catalogo conocido.
- Capacidad insuficiente para el grupo.

## Edicion manual

La pantalla de revision permite:

- Corregir nombre de grupo.
- Corregir total de alumnos.
- Corregir aula.
- Corregir capacidad.
- Corregir horarios de lunes a viernes.
- Agregar o corregir observacion.
- Cambiar aula asignada por horario.
- Ver si el cambio genera conflicto de capacidad, reserva o disponibilidad.

## Persistencia

La persistencia de la Fase 4 ha sido completamente desarrollada e integrada mediante el endpoint `/api/imports/approve`. El flujo opera de la siguiente manera:

1. **Guardado Temporal**: Mientras el administrador realiza ediciones y correcciones en caliente, los cambios se retienen reactivamente en el `localStorage` del navegador.
2. **Confirmación y Envío**: Al hacer clic en "Confirmar importación", el cliente realiza una petición `POST` al endpoint `/api/imports/approve` enviando el payload completo con los cambios del usuario.
3. **Persistencia Relacional (PostgreSQL)**:
   - Si no hay una base de datos conectada (modo local/demo), el sistema responde indicando el modo demostración y mantiene los datos locales sin interrupciones.
   - Si la base de datos está disponible (`getDbPool`), se inicia una **transacción SQL** explícita (`BEGIN` / `COMMIT` / `ROLLBACK`).
   - Se realiza la conversión determinista y estable de IDs temporales a formato estándar UUID (`uuid`) para evitar colisiones de tipos en PostgreSQL.
   - Se insertan o actualizan aulas (`rooms`) con su tipo y capacidad.
   - Se insertan o actualizan grupos (`groups`).
   - Se registran los horarios académicos (`schedules`).
   - Se genera un registro maestro de la corrida de asignación (`assignment_runs`) con el estado `completed`, y se guardan las asignaciones actuales de los estudiantes en la tabla `assignments`.
4. **Respuesta en UI**: El sistema actualiza el estado de la importación a "Aprobada" y despliega badges contextuales dinámicos.

## Pruebas

El parser incluye pruebas para:

- Parsear horarios correctamente.
- Ignorar celdas vacias de dias sin clase.
- Detectar aula insuficiente.
- Detectar aula no registrada.
- Generar payload valido para el solver.
