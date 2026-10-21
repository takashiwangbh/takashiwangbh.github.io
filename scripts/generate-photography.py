#!/usr/bin/env python3
"""Build the photography collection from source files in photograph/.

Install scripts/photography-requirements.txt, then run this script from any
directory. Source files are never changed. ARW files use their camera-rendered
embedded preview, so their web images may be smaller than the requested limit.
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

from PIL import Image, ImageCms, ImageOps


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".arw"}
SRGB_PROFILE = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB"))
SRGB_BYTES = SRGB_PROFILE.tobytes()


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


def load_photo(path: Path) -> tuple[Image.Image, Image.Exif]:
    if path.suffix.lower() != ".arw":
        with Image.open(path) as original:
            original.load()
            # TIFF may lazily read EXIF from the source handle. Detach it while
            # that handle is open so metadata remains available afterwards.
            exif = Image.Exif()
            exif.load(original.getexif().tobytes())
            return original.copy(), exif

    # Pillow can read the TIFF-based EXIF in ARW even though it does not decode
    # the raw pixels. Let rawpy/LibRaw handle the proprietary preview format.
    exif = Image.Exif()
    try:
        exif.load(path.read_bytes())
    except (OSError, SyntaxError, TypeError, ValueError):
        exif = Image.Exif()

    try:
        import rawpy
    except ImportError as error:
        raise RuntimeError(
            "ARW support requires rawpy; install scripts/photography-requirements.txt"
        ) from error

    with rawpy.imread(str(path)) as raw:
        thumbnail = raw.extract_thumb()
        if thumbnail.format == rawpy.ThumbFormat.JPEG:
            with Image.open(BytesIO(thumbnail.data)) as preview:
                preview.load()
                image = preview.copy()
        elif thumbnail.format == rawpy.ThumbFormat.BITMAP:
            image = Image.fromarray(thumbnail.data.copy())
        else:
            raise ValueError("RAW preview is neither JPEG nor bitmap")

    preview_exif = image.getexif()
    if 274 not in preview_exif and exif.get(274) is not None:
        preview_exif[274] = exif[274]
        image.info["exif"] = preview_exif.tobytes()
    return image, exif


def web_rgb(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    profile = image.info.get("icc_profile")
    transparent = "A" in image.getbands() or "transparency" in image.info
    if transparent:
        image = image.convert("RGBA")
    elif image.mode not in {"RGB", "CMYK", "L", "LAB"}:
        image = image.convert("RGB")

    if profile:
        # An invalid color profile should fail this build, rather than silently
        # publish colors that differ from the source photograph.
        source_profile = ImageCms.ImageCmsProfile(BytesIO(profile))
        output_mode = "RGBA" if transparent else "RGB"
        image = ImageCms.profileToProfile(
            image, source_profile, SRGB_PROFILE, outputMode=output_mode
        )

    if transparent:
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        return background
    return image.convert("RGB")


def write_variant(image: Image.Image, path: Path, limit: int, quality: int) -> tuple[int, int]:
    resized = image.copy()
    resized.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    # Supply only the display color profile. In particular, never copy EXIF,
    # GPS, XMP, camera serial numbers, or source comments to the public JPEGs.
    resized.info.clear()
    resized.save(
        path, "JPEG", quality=quality, optimize=True, progressive=True,
        icc_profile=SRGB_BYTES, exif=b"",
    )
    return resized.size


def javascript_data(photos: list[dict]) -> str:
    payload = json.dumps(photos, ensure_ascii=False, indent=2, allow_nan=False)
    for character, escape in (
        ("<", "\\u003c"), (">", "\\u003e"), ("&", "\\u0026"),
        ("\u2028", "\\u2028"), ("\u2029", "\\u2029"),
    ):
        payload = payload.replace(character, escape)
    return "// Generated by scripts/generate-photography.py. Do not edit.\nwindow.PHOTOGRAPHS = " + payload + ";\n"


def build(root: Path) -> tuple[int, int]:
    source_directory = root / "photograph"
    generated_directory = source_directory / "generated"
    manifest_path = root / "js" / "photographs-data.js"
    source_directory.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    photos = []

    # Conversion failures leave the previous public collection intact. Only
    # publish the staged files after every source has converted successfully.
    with tempfile.TemporaryDirectory(prefix=".photography-build-", dir=root) as temporary:
        staging = Path(temporary)
        for path in source_photos(source_directory):
            filename = path.relative_to(source_directory).as_posix()
            identity = hashlib.sha256(filename.encode("utf-8")).hexdigest()
            try:
                image, exif = load_photo(path)
                metadata = exif_fields(exif)
                image = web_rgb(image)
                width, height = write_variant(image, staging / f"{identity}-thumb.jpg", 1200, 82)
                full_width, full_height = write_variant(image, staging / f"{identity}-large.jpg", 2560, 88)
            except Exception as error:
                raise RuntimeError(f"Cannot build {filename}: {error}") from error
            photos.append({
                "id": identity,
                "filename": filename,
                "src": f"../photograph/generated/{identity}-thumb.jpg",
                "fullSrc": f"../photograph/generated/{identity}-large.jpg",
                "width": width,
                "height": height,
                "fullWidth": full_width,
                "fullHeight": full_height,
                "alt": path.stem,
                "title": path.stem,
                **metadata,
            })

        # Stable filename order breaks ties, then stable date sorting puts the
        # newest capture first and missing dates at the end. Never use mtime.
        photos.sort(key=lambda photo: photo["filename"])
        photos.sort(key=lambda photo: photo["date"] or "", reverse=True)
        staged_manifest = staging / "photographs-data.js"
        staged_manifest.write_text(javascript_data(photos), encoding="utf-8")

        generated_directory.mkdir(parents=True, exist_ok=True)
        expected_names = {path.name for path in staging.glob("*.jpg")}
        for path in sorted(staging.glob("*.jpg")):
            path.replace(generated_directory / path.name)
        staged_manifest.replace(manifest_path)
        # Remove only files owned by this generator; leave unrelated files alone.
        for path in generated_directory.iterdir():
            if re.fullmatch(r"[0-9a-f]{64}-(?:thumb|large)\.jpg", path.name):
                if path.name not in expected_names:
                    path.unlink()

    size = sum((generated_directory / name).stat().st_size for name in expected_names)
    return len(photos), size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parents[1],
        help="repository root containing photograph/ and js/",
    )
    arguments = parser.parse_args()
    root = arguments.root.resolve()
    if not root.is_dir():
        parser.error(f"root directory does not exist: {root}")
    try:
        count, size = build(root)
    except Exception as error:
        print(f"Photography build failed: {error}", file=sys.stderr)
        return 1
    print(f"Built {count} photographs ({size / 1_000_000:.2f} MB of web images).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
