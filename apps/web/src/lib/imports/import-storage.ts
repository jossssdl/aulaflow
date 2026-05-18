import type { ImportSession } from "@/lib/imports/import-types";

const STORAGE_PREFIX = "aulaflow-import:";

export function saveImportSession(session: ImportSession) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${session.id}`, JSON.stringify(session));
}

export function loadImportSession(id: string) {
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${id}`);
  return raw ? (JSON.parse(raw) as ImportSession) : null;
}

