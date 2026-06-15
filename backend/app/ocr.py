from __future__ import annotations

import os
import re
import json
import time
import uuid
import base64
from typing import Any

from dotenv import load_dotenv
from zai import ZaiClient

load_dotenv()

API_KEY = os.getenv("ZAI_API_KEY")

client = ZaiClient(api_key=API_KEY)


# -----------------------------
# IMAGE -> BASE64
# -----------------------------
def encode_image(image_path: str):

    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


# -----------------------------
# NORMALIZE OUTPUT
# -----------------------------
def _normalize(rows: list[dict[str, Any]]):

    cols = [
        "sr_no",
        "patient_name",
        "age",
        "sex",
        "contact_number",
        "diabetes",
        "camp_location",
        "camp_date",
        "remarks",
    ]

    out = []

    for i, r in enumerate(rows, start=1):

        norm = {c: str(r.get(c, "")).strip() for c in cols}

        # Auto serial number
        if not norm["sr_no"]:
            norm["sr_no"] = str(i)

        # Normalize diabetes field
        diabetes = norm["diabetes"].lower().strip()

        if diabetes in [
            "yes",
            "y",
            "true",
            "1",
            "✓",
            "✔",
            "/",
            "tick",
        ]:
            norm["diabetes"] = "Yes"
        else:
            norm["diabetes"] = "No"

        norm["id"] = uuid.uuid4().hex[:10]

        out.append(norm)

    return out


# -----------------------------
# CLEAN JSON RESPONSE
# -----------------------------
def clean_json(content: str):

    content = content.replace("```json", "")
    content = content.replace("```", "")
    content = content.strip()

    # Remove accidental leading text
    start = content.find("{")

    if start != -1:
        content = content[start:]

    # Remove accidental trailing text
    end = content.rfind("}")

    if end != -1:
        content = content[: end + 1]

    return content


# -----------------------------
# MAIN OCR FUNCTION
# -----------------------------
def run_ocr(image_path: str):

    t0 = time.time()

    try:

        image_base64 = encode_image(image_path)

        prompt = """
You are a medical camp OCR extraction system.

Extract ALL patient rows from this handwritten medical camp sheet.

Return ONLY VALID JSON.

Format:

{
  "rows": [
    {
      "sr_no": "",
      "patient_name": "",
      "age": "",
      "sex": "",
      "contact_number": "",
      "diabetes": "",
      "remarks": ""
    }
  ]
}

Rules:
- Output ONLY JSON
- No explanations
- No markdown
- Preserve handwritten spelling
- Extract every visible patient row
- If field missing use ""
- IMPORTANT:
There is a Diabetes column.

For every patient row:

If the diabetes box contains a tick, checkmark, slash, ✓, ✔, mark, or handwritten indication:
"diabetes": "Yes"

If the diabetes box is blank:
"diabetes": "No"

Do not skip the diabetes field.
- Do not invent data
"""

        response = client.chat.completions.create(
            model="glm-4.6v-flash",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            thinking={
                "type": "disabled"
            }
        )

        content = response.choices[0].message.content

        print("\n========== RAW OCR RESPONSE ==========\n")
        print(content)
        print("\n======================================\n")

        content = clean_json(content)

        parsed = json.loads(content)

        rows = parsed.get("rows", [])

        rows = _normalize(rows)

        confidence = 0.95 if rows else 0.4

        return {
            "rows": rows,
            "meta": {
                "engine": "GLM-4.6V-Flash",
                "elapsed_ms": int((time.time() - t0) * 1000),
                "confidence": confidence,
            },
        }

    except json.JSONDecodeError as je:

        print("JSON PARSE ERROR")
        print(str(je))

        return {
            "rows": [],
            "meta": {
                "engine": "GLM-4.6V-Flash",
                "elapsed_ms": int((time.time() - t0) * 1000),
                "confidence": 0.0,
                "error": "Invalid JSON returned from OCR model",
            },
        }

    except Exception as e:

        print("OCR ERROR:", str(e))

        raise e