# 👁 OcuScribe — Ophthalmology Camp Register Digitizer

A lightweight, correction-first workflow for digitizing handwritten ophthalmology
camp patient tables.

> **Upload → Correct → Save.** Not a perfect-OCR project, not an EMR.

---

## Architecture

```
project/
├── src/                  # React + Vite + Tailwind frontend
├── backend/              # FastAPI + GLM-OCR + Supabase
│   ├── app/
│   │   ├── main.py        # FastAPI routes (/api/ocr, /api/save, /api/export)
│   │   ├── ocr.py         # GLM-OCR wrapper (lazy load, JSON-array prompt)
│   │   ├── preprocessing.py  # OpenCV: grayscale → denoise → adaptive threshold
│   │   └── db.py          # Supabase client
│   ├── supabase_schema.sql
│   ├── requirements.txt
│   └── .env.example
├── uploads/              # raw camera images
├── processed/            # preprocessed binarized images
└── outputs/              # CSV dumps / dev save logs
```

---

## 1. Frontend (this project)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # produces dist/
```

The frontend ships with a **simulated OCR mode** so the entire
correction workflow works without any backend running — perfect for demos.

To wire the real backend, set this anywhere before the app loads
(e.g. in `index.html`):

```html
<script>window.__BACKEND_URL__ = "http://localhost:8000";</script>
```

---

## 2. Backend (FastAPI + GLM-OCR)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# For CPU-only / 4GB-RAM laptops, install torch CPU wheel first:
# pip install torch==2.4.1 --index-url https://download.pytorch.org/whl/cpu

cp .env.example .env   # fill in SUPABASE_URL + SUPABASE_KEY
uvicorn app.main:app --reload --port 8000
```

### Endpoints

| Method | Path           | Purpose                                |
| ------ | -------------- | -------------------------------------- |
| POST   | `/api/ocr`     | multipart image → extracted JSON rows  |
| POST   | `/api/save`    | persist corrected rows to Supabase     |
| POST   | `/api/export`  | rows → CSV download                    |
| GET    | `/api/health`  | liveness                               |

### OCR pipeline

1. Save raw upload → `uploads/`
2. OpenCV preprocess (grayscale → bilateral denoise → adaptive threshold → resize to ≤1600px) → `processed/`
3. GLM-OCR (`zai-org/GLM-OCR`) with prompt:
   > *"Extract this handwritten table accurately while preserving rows and columns."*
4. Parse first JSON array from the model output, normalize to 6 columns.
5. Return `{ rows, meta: { engine, elapsed_ms, confidence } }`.

`max_new_tokens` defaults to **512** to keep memory low on 4 GB systems.

---

## 3. Supabase

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor** and run `backend/supabase_schema.sql`.
3. Copy the project URL + anon key into `backend/.env`.

Schema:

| column         | type        |
| -------------- | ----------- |
| id             | bigserial PK|
| sr_no          | text        |
| patient_name   | text        |
| age            | int         |
| sex            | text (M/F/Other) |
| contact_number | text        |
| remarks        | text        |
| created_at     | timestamptz |

---

## 4. Product philosophy

- **Human correction is expected.** OCR is a *first draft*, never ground truth.
- The editable table is the centerpiece — inline editing, dropdowns for
  Sex and Remarks, live validation (10-digit phone, numeric age, >120 warning).
- Save & Export are one click each.

---

## Environment variables

| Variable             | Default                  | Notes                          |
| -------------------- | ------------------------ | ------------------------------ |
| `SUPABASE_URL`       | —                        | required for real saves        |
| `SUPABASE_KEY`       | —                        | anon or service-role key       |
| `OCR_MODEL_ID`       | `zai-org/GLM-OCR`        |                                |
| `OCR_DEVICE`         | `cpu`                    | `cuda` if GPU                  |
| `OCR_MAX_NEW_TOKENS` | `512`                    | lower = less RAM               |
| `UPLOAD_DIR`         | `./uploads`              |                                |
| `PROCESSED_DIR`      | `./processed`            |                                |
| `OUTPUT_DIR`         | `./outputs`              |                                |
| `ALLOWED_ORIGINS`    | `http://localhost:5173`  | comma-separated                |
# OCR_for_camps
An OCR web app for handwritten text to excel sheet or pushing to database after human intervention
