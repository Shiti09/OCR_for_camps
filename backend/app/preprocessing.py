"""Image preprocessing tuned for handwritten notebook camp registers.

Pipeline:
    grayscale -> denoise -> adaptive threshold -> resize if too large

Keeps memory low for 4GB-RAM CPU-only laptops.
"""
from __future__ import annotations

from pathlib import Path
import cv2
import numpy as np
from PIL import Image

MAX_DIM = 1600  # px on the longest side — keeps OCR token count + RAM in check


def preprocess_image(src_path: str | Path, dst_path: str | Path) -> str:
    """Read raw upload, preprocess, write to dst_path. Returns dst_path as str."""
    src_path, dst_path = Path(src_path), Path(dst_path)
    dst_path.parent.mkdir(parents=True, exist_ok=True)

    # Decode safely (handles weird mobile-camera files)
    with Image.open(src_path) as im:
        im = im.convert("RGB")
        img = np.array(im)[:, :, ::-1].copy()  # RGB -> BGR for cv2

    # Resize if too large (preserve aspect ratio)
    h, w = img.shape[:2]
    if max(h, w) > MAX_DIM:
        scale = MAX_DIM / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)),
                         interpolation=cv2.INTER_AREA)

    # Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise (lightweight bilateral keeps strokes crisp)
    den = cv2.bilateralFilter(gray, d=7, sigmaColor=55, sigmaSpace=55)

    # Adaptive threshold — robust to uneven phone-camera lighting
    bin_img = cv2.adaptiveThreshold(
        den, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=10,
    )

    cv2.imwrite(str(dst_path), bin_img)
    return str(dst_path)
