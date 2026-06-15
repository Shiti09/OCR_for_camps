"""Supabase client wrapper for the `patients` table."""

from __future__ import annotations
from dotenv import load_dotenv
load_dotenv()

import os
from typing import Any

from supabase import Client, create_client

_client: Client | None = None


def get_client() -> Client | None:
    global _client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    print("URL:", url)
    print("KEY exists:", bool(key))
    if not url or not key:
        return None
    if _client is None:
        _client = create_client(url, key)
    return _client


def insert_patients(rows: list[dict[str, Any]], camp_date: str) -> int:
    """Insert corrected rows into the `patients` table. Returns inserted count."""
    client = get_client()
    payload = [
        {
            "sr_no": str(r.get("sr_no", "")),
            "patient_name": str(r.get("patient_name", "")),
            "age": int(r["age"]) if str(r.get("age", "")).isdigit() else None,
            "sex": str(r.get("sex", "")),
            "contact_number": str(r.get("contact_number", "")),
            "diabetes": str(r.get("diabetes", "")),
            "camp_location": str(r.get("camp_location", "")),
            "camp_date": camp_date,
            "remarks": str(r.get("remarks", "")),
            
        }
        for r in rows
    ]
    if client is None:
        # Dev fallback — log to outputs/ so devs can verify the call path.
        out_dir = os.getenv("OUTPUT_DIR", "./outputs")
        os.makedirs(out_dir, exist_ok=True)
        import json, time
        ts = time.strftime("%Y%m%d-%H%M%S")
        with open(os.path.join(out_dir, f"saved-{ts}.json"), "w") as f:
            json.dump(payload, f, indent=2)
        return len(payload)

    res = client.table("patients").insert(payload).execute()
    return len(res.data or [])
