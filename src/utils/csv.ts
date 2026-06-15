import type { PatientRow } from "../types";

function esc(v: string): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCSV(rows: PatientRow[]): string {
  const header = [
    "sr_no",
    "patient_name",
    "age",
    "sex",
    "contact_number",
    "remarks",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.sr_no, r.patient_name, r.age, r.sex, r.contact_number, r.remarks]
        .map(esc)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCSV(rows: PatientRow[], filename = "patients.csv") {
  const blob = new Blob([rowsToCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
