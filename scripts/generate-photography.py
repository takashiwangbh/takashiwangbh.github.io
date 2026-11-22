#!/usr/bin/env python3
"""Index the photography collection without changing or duplicating photos.

Install scripts/photography-requirements.txt, then run this script from any
directory. Only js/photographs-data.js is written. ARW entries describe the
embedded JPEG byte range, which the browser reads directly from the original.
"""

from __future__ import annotations

import argparse
from datetime import date
import hashlib
from io import BytesIO
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import quote

from PIL import Image
from PIL.TiffImagePlugin import ImageFileDirectory_v2


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".arw"}


def source_photos(directory: Path) -> list[Path]:
    """Walk in stable order, excluding hidden and generated directories."""
    paths = []
    for current, directories, filenames in os.walk(directory, followlinks=False):
        directories[:] = sorted(
            name for name in directories
            if not name.startswith(".") and name != "generated"
        )
        for name in sorted(filenames):
            path = Path(current) / name
            if not name.startswith(".") and path.suffix.lower() in {".tif", ".tiff"}:
                raise ValueError(f"Export TIFF photographs as JPG for browser display: {path}")
            if not name.startswith(".") and path.suffix.lower() in SUPPORTED_EXTENSIONS:
                if path.is_symlink():
                    raise ValueError(f"Source photographs must be regular files: {path}")
                paths.append(path)
    return sorted(paths, key=lambda path: path.relative_to(directory).as_posix())


def exif_fields(exif: Image.Exif) -> dict:
    try:
        details = exif.get_ifd(34665)
    except (KeyError, OSError, SyntaxError, TypeError, ValueError):
        details = {}

    def value(tag):
        return details.get(tag, exif.get(tag))

    photographed = None
    # Top-level DateTime is commonly the export/edit time, not capture time.
    for timestamp in (value(36867), value(36868)):
        match = re.match(r"^(\d{4})[:-](\d{2})[:-](\d{2})", str(timestamp or ""))
        if match:
            try:
                photographed = date(*(int(part) for part in match.groups())).isoformat()
                break
            except ValueError:
                pass

    def positive_number(raw):
        if isinstance(raw, (tuple, list)):
            raw = raw[0] if raw else None
        try:
            result = float(raw)
            return result if math.isfinite(result) and result > 0 else None
        except (TypeError, ValueError, ZeroDivisionError):
            return None

    iso = positive_number(value(34855))
    exposure = positive_number(value(33434))
    aperture = positive_number(value(33437))
    shutter = None
    if exposure is not None:
        reciprocal = round(1 / exposure)
        if exposure < 1 and abs(exposure * reciprocal - 1) < 0.015:
            shutter = f"1/{reciprocal} s"
        else:
            shutter = f"{exposure:g} s"

    return {
        "date": photographed,
        "iso": f"{iso:g}" if iso is not None else None,
        "shutter": shutter,
        "aperture": f"f/{aperture:g}" if aperture is not None else None,
        "place": None,
    }


def orientation_value(value) -> int:
    try:
        orientation = int(value)
        return orientation if 1 <= orientation <= 8 else 1
    except (TypeError, ValueError):
        return 1


def display_dimensions(size: tuple[int, int], orientation: int) -> tuple[int, int]:
    width, height = size
    return (height, width) if orientation in {5, 6, 7, 8} else (width, height)


def read_photo(path: Path) -> dict:
    if path.suffix.lower() != ".arw":
        # PNG EXIF lookup may finish loading the file. Verify first with its
        # own handle, because Pillow requires verification immediately on open.
        with Image.open(path) as original:
            original.verify()
        with Image.open(path) as original:
            exif = original.getexif()
            width, height = display_dimensions(
                original.size, orientation_value(exif.get(274, 1))
            )
            metadata = exif_fields(exif)
        return {"width": width, "height": height, **metadata}

    # ARW is a TIFF container. Pillow reads its standard IFD/EXIF entries from
    # the open file, without loading or decoding the raw sensor data.
    with path.open("rb") as source:
        header = source.read(8)
        directory = ImageFileDirectory_v2(header)
        source.seek(directory.next)
        directory.load(source)
        offset, length = directory.get(513), directory.get(514)
        file_size = path.stat().st_size
        if (
            not isinstance(offset, int) or not isinstance(length, int)
            or offset < 0 or length < 4 or offset + length > file_size
        ):
            raise ValueError("ARW has no valid embedded JPEG byte range")

        source.seek(0)
        exif = Image.Exif()
        exif.load_from_fp(source)
        metadata = exif_fields(exif)
        raw_orientation = orientation_value(exif.get(274, 1))

        source.seek(offset)
        jpeg = source.read(length)
        if len(jpeg) != length:
            raise ValueError("ARW embedded JPEG is truncated")
        with Image.open(BytesIO(jpeg)) as preview:
            if preview.format != "JPEG":
                raise ValueError("ARW embedded preview is not JPEG")
            # Browser JPEG decoding applies embedded EXIF first. Use the RAW
            # orientation only when the embedded JPEG does not specify one.
            orientation = orientation_value(preview.getexif().get(274, raw_orientation))
            width, height = display_dimensions(preview.size, orientation)
            preview.load()

    return {
        "width": width,
        "height": height,
        "preview": {"offset": offset, "length": length, "orientation": orientation},
        **metadata,
    }


def javascript_data(photos: list[dict]) -> str:
    payload = json.dumps(photos, ensure_ascii=False, indent=2, allow_nan=False)
    for character, escape in (
        ("<", "\\u003c"), (">", "\\u003e"), ("&", "\\u0026"),
        ("\u2028", "\\u2028"), ("\u2029", "\\u2029"),
    ):
        payload = payload.replace(character, escape)
    return "// Generated by scripts/generate-photography.py. Do not edit.\nwindow.PHOTOGRAPHS = " + payload + ";\n"


def build(root: Path, asset_base: str | None = None) -> int:
    source_directory = root / "photograph"
    manifest_path = root / "js" / "photographs-data.js"
    photos = []
    asset_directory = asset_base.rstrip("/") + "/" if asset_base else "../photograph/"

    for path in source_photos(source_directory):
        relative_path = path.relative_to(source_directory)
        filename = relative_path.as_posix()
        identity = hashlib.sha256(filename.encode("utf-8")).hexdigest()
        try:
            details = read_photo(path)
        except Exception as error:
            raise RuntimeError(f"Cannot index {filename}: {error}") from error
        encoded_path = "/".join(quote(part, safe="") for part in relative_path.parts)
        src = asset_directory + encoded_path
        photos.append({
            "id": identity,
            "filename": filename,
            "src": src,
            "fullSrc": src,
            "fullWidth": details["width"],
            "fullHeight": details["height"],
            "alt": path.stem,
            "title": path.stem,
            **details,
        })

    # Stable filename order breaks ties, then stable date sorting puts the
    # newest capture first and missing dates at the end. Never use mtime.
    photos.sort(key=lambda photo: photo["filename"])
    photos.sort(key=lambda photo: photo["date"] or "", reverse=True)

    # Read/validation failures leave the previous collection intact. Stage only
    # the manifest beside its destination, then replace it atomically.
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", prefix=".photographs-data-", suffix=".js",
            dir=manifest_path.parent, delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            temporary.write(javascript_data(photos))
        temporary_path.replace(manifest_path)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()
    return len(photos)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parents[1],
        help="repository root containing photograph/ and js/",
    )
    parser.add_argument(
        "--asset-base", help="URL directory containing original photos; default: ../photograph/",
    )
    arguments = parser.parse_args()
    root = arguments.root.resolve()
    if not root.is_dir():
        parser.error(f"root directory does not exist: {root}")
    try:
        count = build(root, arguments.asset_base)
    except Exception as error:
        print(f"Photography build failed: {error}", file=sys.stderr)
        return 1
    print(f"Indexed {count} photographs without writing image files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
