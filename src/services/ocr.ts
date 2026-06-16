import type { OCRResponse, PatientRow } from "../types";

/**
 * OCR service — frontend client.
 *
 * In production, this POSTs the image to the FastAPI backend at:
 *   POST /api/ocr   (multipart/form-data, field: "file")
 *
 * The backend runs the GLM-OCR pipeline (zai-org/GLM-OCR) on the
 * preprocessed image and returns structured JSON.
 *
 * For the frontend demo build, we fall back to a deterministic
 * simulated extraction so the correction workflow is fully usable
 * end-to-end without a backend running.
 */

const BACKEND_URL =  import.meta.env.VITE_BACKEND_URL || "";
  

const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export function emptyRow(sr?: number): PatientRow {
  return {
    id: uid(),
    sr_no: sr ? String(sr) : "",
    patient_name: "",
    age: "",
    sex: "",
    contact_number: "",
    diabetes: "No",
    camp_location: "",
    camp_date: "",
    remarks: "",
  };
}

/** Realistic mock dataset mimicking a noisy GLM-OCR pass on a handwritten camp register. */
const MOCK_NAMES = [
  "Ramesh Kumar",
  "Sunita Devi",
  "Mohammed Iqbal",
  "Priya Sharma",
  "Arjun Patel",
  "Lakshmi Nair",
  "Vikram Singh",
  "Anjali Reddy",
  "Suresh Yadav",
  "Fatima Bano",
  "Ganesh Rao",
  "Meera Joshi",
];
const REMARKS = ["Cataract", "Glasses", "Normal", "Diabetic", "Retina", "Referral"];
const SEX: Array<"M" | "F"> = ["M", "F"];

/** Inject typical OCR errors so the user has something to correct. */
function noisify(s: string, rate = 0.18): string {
  if (Math.random() > rate) return s;
  const swaps: Record<string, string> = { o: "0", l: "1", i: "1", s: "5", a: "@" };
  return s
    .split("")
    .map((c) =>
      Math.random() < 0.15 && swaps[c.toLowerCase()] ? swaps[c.toLowerCase()] : c,
    )
    .join("");
}

function noisyPhone(): string {
  // Sometimes missing a digit, sometimes 10 perfect digits.
  const base = "98765" + Math.floor(10000 + Math.random() * 89999);
  if (Math.random() < 0.25) return base.slice(0, 9); // intentionally 9 digits
  return base;
}

function simulatedOCR(rowCount = 8): PatientRow[] {
  const rows: PatientRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
    rows.push({
      id: uid(),
      sr_no: String(i + 1),
      patient_name: noisify(name),
      age: String(20 + Math.floor(Math.random() * 70)),
      sex: SEX[Math.floor(Math.random() * SEX.length)],
      contact_number: noisyPhone(),
      diabetes: Math.random() > 0.5 ? "Yes" : "No",
      camp_location: "",
      camp_date: "",
      remarks: REMARKS[Math.floor(Math.random() * REMARKS.length)],
    });
  }
  return rows;
}

export async function runOCR(file: File): Promise<OCRResponse> {
  // If a backend URL is configured, hit the real GLM-OCR endpoint.
  if (BACKEND_URL) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BACKEND_URL}/api/ocr`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
    return (await res.json()) as OCRResponse;
  }

  // Demo mode: simulate latency and return a noisy register.
  const t0 = performance.now();
  await new Promise((r) => setTimeout(r, 1600));
  const rows = simulatedOCR(6 + Math.floor(Math.random() * 5));
  return {
    rows,
    meta: {
      engine: "GLM-OCR (simulated)",
      elapsed_ms: Math.round(performance.now() - t0),
      confidence: 0.78,
    },
  };
}

export async function saveToDatabase(
  rows: PatientRow[],
  campDate: string
): Promise<{ saved: number }> {
  if (BACKEND_URL) {
    const res = await fetch(`${BACKEND_URL}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camp_date: campDate,
        rows,
      }),
    });

    if (!res.ok) throw new Error(`Save failed: ${res.status}`);

    return await res.json();
  }

  await new Promise((r) => setTimeout(r, 700));

  const key = "ocuscribe.saved";
  const existing = JSON.parse(localStorage.getItem(key) || "[]");

  const stamped = rows.map((r) => ({
    ...r,
    camp_date: campDate,
    created_at: new Date().toISOString(),
  }));

  localStorage.setItem(key, JSON.stringify([...existing, ...stamped]));

  return { saved: rows.length };
}
