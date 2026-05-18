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

En esta fase, la revision usa almacenamiento local del navegador para no bloquear el flujo cuando no hay base configurada.

La estructura queda preparada para persistir en PostgreSQL/Supabase:

- Guardar grupos nuevos.
- Guardar aulas nuevas si no existen.
- Guardar horarios.
- Guardar asignaciones actuales.
- Asociar todo a `institution_id` y `academic_period_id`.

## Pruebas

El parser incluye pruebas para:

- Parsear horarios correctamente.
- Ignorar celdas vacias de dias sin clase.
- Detectar aula insuficiente.
- Detectar aula no registrada.
- Generar payload valido para el solver.
