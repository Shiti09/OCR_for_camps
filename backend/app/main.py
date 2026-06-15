"""FastAPI entry point — OcuScribe backend.

Endpoints:
    POST /api/ocr      — upload image, returns extracted rows
    POST /api/save     — persist corrected rows to Supabase
    POST /api/export   — return CSV of submitted rows
    GET  /api/health   — liveness check
"""
from __future__ import annotations

import io
import os
import uuid
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .db import insert_patients
from .ocr import run_ocr
from .preprocessing import preprocess_image

load_dotenv()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
PROCESSED_DIR = Path(os.getenv("PROCESSED_DIR", "./processed"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./outputs"))
for d in (UPLOAD_DIR, PROCESSED_DIR, OUTPUT_DIR):
    d.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="OcuScribe API", version="1.0.0")

allowed = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed] if allowed != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PatientRow(BaseModel):
    sr_no: str = ""
    patient_name: str = ""
    age: str = ""
    sex: str = ""
    contact_number: str = ""
    diabetes: str = ""
    camp_location: str = ""
    camp_date: str = ""
    remarks: str = ""


class SavePayload(BaseModel):
    camp_date: str
    rows: list[PatientRow]


@app.get("/api/health")
def health():
    return {"ok": True, "service": "ocuscribe"}


@app.post("/api/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
        raise HTTPException(415, "Unsupported file type")

    uid = uuid.uuid4().hex[:10]
    ext = Path(file.filename or "img").suffix.lower() or ".jpg"
    raw_path = UPLOAD_DIR / f"{uid}{ext}"
    processed_path = PROCESSED_DIR / f"{uid}.png"

    raw_path.write_bytes(await file.read())
    preprocess_image(raw_path, processed_path)

    result = run_ocr(str(processed_path))
    return result


@app.post("/api/save")
def save_endpoint(payload: SavePayload):
    rows = [r.model_dump() for r in payload.rows]
    saved = insert_patients(rows, payload.camp_date)
    return {"saved": saved}


@app.post("/api/export")
def export_endpoint(payload: SavePayload):
    rows = [r.model_dump() for r in payload.rows]
    df = pd.DataFrame(
        rows,
        columns=["sr_no", "patient_name", "age", "sex", "contact_number", "remarks"],
    )
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="patients.csv"'},
    )
