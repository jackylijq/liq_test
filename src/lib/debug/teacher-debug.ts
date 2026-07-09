export function logTeacherDebug(scope: "import" | "enrich", step: string, payload: unknown) {
  if (process.env.NODE_ENV === "production" && process.env.TEACHER_DEBUG_LOG !== "1") return;

  const prefix = scope === "import" ? "[teacher-import-debug]" : "[teacher-enrich-debug]";
  try {
    console.info(`${prefix} ${step}`, JSON.stringify(payload, null, 2));
  } catch {
    console.info(`${prefix} ${step}`, payload);
  }
}
