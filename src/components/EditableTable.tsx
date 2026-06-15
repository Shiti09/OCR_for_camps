import { useMemo } from "react";
import type { PatientRow, Sex } from "../types";
import { REMARK_OPTIONS, SEX_OPTIONS } from "../types";
import {
  validateAge,
  validateName,
  validatePhone,
  countIssues,
} from "../utils/validation";

interface Props {
  rows: PatientRow[];
  onChange: (rows: PatientRow[]) => void;
}

export function EditableTable({ rows, onChange }: Props) {
  const issues = useMemo(() => countIssues(rows), [rows]);

  const updateRow = (id: string, patch: Partial<PatientRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const deleteRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };
  const addRow = () => {
    const nextSr = String(rows.length + 1);
    onChange([
      ...rows,
      {
        id: Math.random().toString(36).slice(2, 10),
        sr_no: nextSr,
        patient_name: "",
        age: "",
        sex: "",
        contact_number: "",
        diabetes: "No",
        camp_location: "",
        camp_date: "",
        remarks: "",
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats strip */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Stat label="Rows" value={rows.length} tone="cyan" />
        <Stat label="Errors" value={issues.errors} tone={issues.errors ? "red" : "muted"} />
        <Stat label="Warnings" value={issues.warnings} tone={issues.warnings ? "amber" : "muted"} />
        <div className="flex-1" />
        <button
          onClick={addRow}
          className="btn-ghost rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5"
        >
          <span className="text-base leading-none">＋</span> Add Row
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0e1422] backdrop-blur">
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400">
              <Th className="w-[60px]">Sr No</Th>
              <Th className="min-w-[180px]">Patient Name</Th>
              <Th className="w-[80px]">Age</Th>
              <Th className="w-[100px]">Sex</Th>
              <Th className="w-[160px]">Contact Number</Th>
              <Th className="w-[100px]">Diabetes</Th>
              <Th className="min-w-[180px]">Camp Location</Th>
              <Th className="min-w-[160px]">Remarks</Th>
              <Th className="w-[50px]"></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-16 text-gray-500 text-sm">
                  No rows yet. Upload an image and run OCR, or
                  <button
                    onClick={addRow}
                    className="text-cyan-300 hover:underline mx-1"
                  >
                    add a row manually
                  </button>
                  .
                </td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const nameState = validateName(r.patient_name);
              const ageState = validateAge(r.age);
              const phoneState = validatePhone(r.contact_number);
              return (
                <tr
                  key={r.id}
                  className="border-t border-white/5 hover:bg-white/[0.02] transition"
                >
                  <Td>
                    <input
                      className="input-cell"
                      value={r.sr_no}
                      onChange={(e) => updateRow(r.id, { sr_no: e.target.value })}
                      placeholder={String(idx + 1)}
                    />
                  </Td>
                  <Td>
                    <input
                      className={`input-cell ${nameState === "invalid" ? "invalid" : ""}`}
                      value={r.patient_name}
                      onChange={(e) =>
                        updateRow(r.id, { patient_name: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  </Td>
                  <Td>
                    <input
                      className={`input-cell ${
                        ageState === "invalid"
                          ? "invalid"
                          : ageState === "warning"
                          ? "warning"
                          : ""
                      }`}
                      value={r.age}
                      onChange={(e) => updateRow(r.id, { age: e.target.value })}
                      placeholder="—"
                      inputMode="numeric"
                    />
                  </Td>
                  <Td>
                    <select
                      className="input-cell appearance-none cursor-pointer"
                      value={r.sex}
                      onChange={(e) =>
                        updateRow(r.id, { sex: e.target.value as Sex })
                      }
                    >
                      <option value="" className="bg-[#0e1422]">—</option>
                      {SEX_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[#0e1422]">
                          {s}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <input
                      className={`input-cell ${phoneState === "invalid" ? "invalid" : ""}`}
                      value={r.contact_number}
                      onChange={(e) =>
                        updateRow(r.id, { contact_number: e.target.value })
                      }
                      placeholder="10-digit"
                      inputMode="numeric"
                    />
                  </Td>
                  <Td>
                    <select
                      className="input-cell appearance-none cursor-pointer"
                      value={r.diabetes || "No"}
                      onChange={(e) =>
                        updateRow(r.id, { diabetes: e.target.value })
                      }
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </Td>
                  <Td>
                    <input
                      className="input-cell"
                      value={r.camp_location || ""}
                      onChange={(e) =>
                        updateRow(r.id, {
                          camp_location: e.target.value,
                        })
                      }
                      placeholder="Camp Location"
                    />
                  </Td>
                  <Td>
                    <input
                      list={`remarks-${r.id}`}
                      className="input-cell"
                      value={r.remarks}
                      onChange={(e) =>
                        updateRow(r.id, { remarks: e.target.value })
                      }
                      placeholder="—"
                    />
                    <datalist id={`remarks-${r.id}`}>
                      {REMARK_OPTIONS.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={() => deleteRow(r.id)}
                      className="opacity-50 hover:opacity-100 hover:text-red-400 transition px-2 py-1 text-base"
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1 align-middle ${className}`}>{children}</td>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "red" | "amber" | "muted";
}) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-500/30 text-cyan-200 bg-cyan-500/5",
    red: "border-red-500/30 text-red-200 bg-red-500/5",
    amber: "border-amber-500/30 text-amber-200 bg-amber-500/5",
    muted: "border-white/10 text-gray-400 bg-white/[0.02]",
  };
  return (
    <div
      className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${colors[tone]}`}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
