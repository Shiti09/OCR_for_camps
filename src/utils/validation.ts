import type { PatientRow } from "../types";

export type CellState = "ok" | "invalid" | "warning";

export function validatePhone(v: string): CellState {
  if (!v) return "ok";
  const digits = v.replace(/\D/g, "");
  if (digits.length !== 10) return "invalid";
  return "ok";
}

export function validateAge(v: string): CellState {
  if (!v) return "ok";
  if (!/^\d+$/.test(v)) return "invalid";
  const n = parseInt(v, 10);
  if (n <= 0) return "invalid";
  if (n > 120) return "warning";
  return "ok";
}

export function validateName(v: string): CellState {
  if (!v.trim()) return "invalid";
  return "ok";
}

export function rowHasErrors(r: PatientRow): boolean {
  return (
    validateName(r.patient_name) === "invalid" ||
    validateAge(r.age) === "invalid" ||
    validatePhone(r.contact_number) === "invalid"
  );
}

export function countIssues(rows: PatientRow[]) {
  let errors = 0;
  let warnings = 0;
  for (const r of rows) {
    if (validateName(r.patient_name) === "invalid") errors++;
    if (validateAge(r.age) === "invalid") errors++;
    if (validateAge(r.age) === "warning") warnings++;
    if (validatePhone(r.contact_number) === "invalid") errors++;
  }
  return { errors, warnings };
}
