# Supabase

Migraciones y datos semilla para PostgreSQL/Supabase.

## Orden sugerido

```bash
supabase db reset
```

O, en una base PostgreSQL local:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260518120000_initial_schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

La autenticacion avanzada y las politicas RLS quedan para una fase posterior. El esquema ya incluye `institution_id`, relaciones compuestas para preparar el multi-tenant, bloqueos de aulas en `room_blocks` y reservas especiales en `rooms.reserved_for_room_types`.
