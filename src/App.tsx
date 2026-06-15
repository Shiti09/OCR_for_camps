import { useEffect, useMemo, useState } from "react";
import { ToastProvider, useToast } from "./components/Toast";
import { Uploader } from "./components/Uploader";
import { EditableTable } from "./components/EditableTable";
import { runOCR, saveToDatabase } from "./services/ocr";
import { downloadCSV } from "./utils/csv";
import { countIssues } from "./utils/validation";
import type { PatientRow } from "./types";

function Inner() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [ocrMeta, setOcrMeta] = useState<{
    engine: string;
    elapsed_ms: number;
    confidence: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [campLocation, setCampLocation] = useState("");
  const [campDate, setCampDate] = useState("");

  // Preview URL lifecycle
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFile = (f: File | null) => {
    setFile(f);
    if (!f) {
      setRows([]);
      setOcrMeta(null);
    }
  };

  const onRunOCR = async () => {
    if (!file) return;
    setOcrRunning(true);
    try {
      const res = await runOCR(file);
      const updatedRows = res.rows.map((r) => ({
      ...r,
      camp_location: campLocation,
      camp_date: campDate,
      }));
      setRows(updatedRows);
      setOcrMeta(res.meta);
      const issues = countIssues(res.rows);
      toast.push(
        "success",
        `Extracted ${res.rows.length} rows. ${issues.errors} need correction.`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.push("error", `OCR failed: ${msg}`);
    } finally {
      setOcrRunning(false);
    }
  };

  const onSave = async () => {
    if (!rows.length) {
      toast.push("info", "Nothing to save — table is empty.");
      return;
    }
    const issues = countIssues(rows);
    if (issues.errors > 0) {
      const ok = window.confirm(
        `${issues.errors} cell(s) still have validation errors.\nSave anyway?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await saveToDatabase(rows, campDate);
      toast.push("success", `Saved ${res.saved} patients to database.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.push("error", `Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const onExport = () => {
    if (!rows.length) {
      toast.push("info", "Nothing to export.");
      return;
    }
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCSV(rows, `camp-patients-${ts}.csv`);
    toast.push("success", "CSV downloaded.");
  };

  const issues = useMemo(() => countIssues(rows), [rows]);

  return (
    <div className="min-h-screen bg-grid">
      {/* Top bar */}
      <header className="border-b border-white/5 backdrop-blur sticky top-0 z-30 bg-[#07090e]/70">
        <div className="max-w-[1400px] mx-auto px-5 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center font-bold text-black text-sm shadow-lg shadow-cyan-500/20">
            👁
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-gray-100">OcuScribe</div>
            <div className="text-[11px] text-gray-500">
              Ophthalmology Camp Register Digitizer
            </div>
          </div>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            GLM-OCR ready
          </div>
        </div>
      </header>

      {/* Workflow stepper */}
      <div className="max-w-[1400px] mx-auto px-5 pt-5">
        <Stepper
          steps={[
            { label: "Upload", active: !file, done: !!file },
            { label: "Extract", active: !!file && !rows.length, done: rows.length > 0 },
            {
              label: "Correct",
              active: rows.length > 0 && issues.errors > 0,
              done: rows.length > 0 && issues.errors === 0,
            },
            { label: "Save", active: false, done: false },
          ]}
        />
      </div>

      {/* Main grid */}
      <main className="max-w-[1400px] mx-auto px-5 py-5 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
        <section className="animate-in">
          <Uploader
            file={file}
            previewUrl={previewUrl}
            onFile={onFile}
            onRunOCR={onRunOCR}
            ocrRunning={ocrRunning}
            meta={ocrMeta}
          />
        </section>

        <section className="card p-5 flex flex-col animate-in" style={{ minHeight: 560 }}>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="w-full flex flex-col sm:flex-row gap-3 mb-4">
            <input
            type="date"
            value={campDate}
            onChange={(e) => {
              const value = e.target.value;
              setCampDate(value);

              setRows((prev) =>
                prev.map((r) => ({
                  ...r,
                  camp_date: value,
                      })),
                    );
                  }}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full"
            />
            <input
            type="text"
            placeholder="Enter Camp Location (e.g. Dharavi Camp)"
            value={campLocation}
            onChange={(e) => {
            const value = e.target.value;
            setCampLocation(value);

            setRows((prev) =>
            prev.map((r) => ({
            ...r,
            camp_location: value,
            })),
            );
            }}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full"
              />
              </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                Extracted Patient Table
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Click any cell to correct. Validation runs as you type.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onExport}
                disabled={!rows.length}
                className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={onSave}
                disabled={!rows.length || saving}
                className="btn-primary rounded-lg px-4 py-2 text-xs flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full spin-slow" />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save to Database
                  </>
                )}
              </button>
            </div>
          </div>

          {ocrRunning && rows.length === 0 ? (
            <SkeletonTable />
          ) : (
            <EditableTable rows={rows} onChange={setRows} />
          )}
        </section>
      </main>

      <footer className="max-w-[1400px] mx-auto px-5 pb-8 pt-2 text-center text-[11px] text-gray-600">
        OcuScribe · GLM-OCR pipeline · FastAPI · Supabase ·
        <span className="text-gray-500"> Built for fast correction, not perfect OCR.</span>
      </footer>
    </div>
  );
}

function Stepper({
  steps,
}: {
  steps: { label: string; active: boolean; done: boolean }[];
}) {
  return (
    <div className="card px-4 py-3 flex items-center gap-1 sm:gap-3 overflow-x-auto">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border transition-all ${
              s.done
                ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-300"
                : s.active
                ? "bg-cyan-500/15 border-cyan-400/60 text-cyan-200 pulse-ring"
                : "bg-white/[0.03] border-white/10 text-gray-500"
            }`}
          >
            {s.done ? "✓" : i + 1}
          </div>
          <span
            className={`text-xs ${
              s.active ? "text-gray-100" : s.done ? "text-gray-300" : "text-gray-500"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="w-6 sm:w-12 h-px bg-white/10 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="flex-1 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="h-9 shimmer" />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-10 border-t border-white/5 shimmer" style={{ opacity: 0.4 + (i % 3) * 0.15 }} />
      ))}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
